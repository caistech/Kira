// lib/kira/swarm/backfill.ts
// FINDING THE TASKS KIRA NEVER HEARD ABOUT.
//
// The mirror is written at dispatch, inside a live voice call, and for a while it was written with a
// floating promise — so on a serverless runtime it sometimes simply did not happen. That is now
// awaited (tool-handlers.ts), which stops NEW losses and does nothing at all about the old ones:
// every repair path Kira has starts by selecting rows from `kira_tasks`, so a task that never
// mirrored is unreachable by construction. Six of ten were, three of them waiting on the owner's
// approval, and his dashboard read one.
//
// Reconciliation UPDATES what Kira has. This INSERTS what Kira never had. They are different jobs
// and only the second one can close a hole that has no local row to start from.
//
// AUTHORITY IS UNCHANGED: the orchestrator owns execution state and `kira_tasks` stays a read model.
// This copies across the seam; it never decides anything.

import type { SwarmCoordinator, TaskSummary, TenantId } from './coordinator';
import { resolveOrganisationForPerson } from '@/lib/auth';

/**
 * What a rebuilt row looks like. Deliberately the same shape and the same conflict key the live
 * mirror uses (`orch:<taskGroupId>` on `user_id,intent_id`) — anything else and a backfill would
 * race the callback into two rows for one task, which is a mirror turning into two opinions.
 *
 * INV-020: kira_tasks are organisation-owned (organisation_id NOT NULL) and user_id stays provenance
 * of who asked. The owning org is resolved per tenant at insertion time.
 */
export interface MirrorRow {
  user_id: string;
  organisation_id?: string;
  intent_id: string;
  kind: string;
  status: string;
  utterance: string;
  summary: string | null;
  handled_by: 'orchestrator';
}

/**
 * The kind, or an honest admission.
 *
 * `kira_tasks.kind` is NOT NULL, and a column needing a value is the classic pressure to invent one.
 * Two things must not happen: labelling a real request 'unsupported' (the operator's "we could not
 * do this" queue reads exactly that status and kind, so it would appear as a failure that never
 * happened), or guessing 'email' for what was actually a reminder. 'unknown' says what is true.
 */
export function kindFor(task: TaskSummary): string {
  if (task.kind) return task.kind;
  if (task.status === 'unsupported') return 'unsupported';
  return 'unknown';
}

/**
 * Rebuild a row from what the remote end holds.
 *
 * Returns null when the utterance is missing: `utterance` is NOT NULL and it is the owner's own
 * words — the one field in this table that cannot be reconstructed, summarised or approximated. A
 * row invented around a blank utterance would put words in his mouth on his own dashboard.
 */
export function toMirrorRow(
  userId: string,
  task: TaskSummary,
  organisationId?: string | null,
): MirrorRow | null {
  if (!task.taskGroupId) return null;
  const utterance = (task.utterance ?? '').trim();
  if (!utterance) return null;
  return {
    user_id: userId,
    ...(organisationId ? { organisation_id: organisationId } : {}),
    intent_id: `orch:${task.taskGroupId}`,
    kind: kindFor(task),
    status: task.status,
    utterance,
    summary: task.summary,
    handled_by: 'orchestrator',
  };
}

/** Which remote tasks are not represented locally yet. Pure, so the decision itself is testable. */
export function missingRows(
  userId: string,
  remote: TaskSummary[],
  knownIntentIds: Iterable<string>,
  organisationId?: string | null,
): { rows: MirrorRow[]; unusable: number } {
  const known = new Set(knownIntentIds);
  const rows: MirrorRow[] = [];
  let unusable = 0;
  for (const task of remote) {
    if (known.has(`orch:${task.taskGroupId}`)) continue;
    // INV-020: a mirrored task without an owning org is tenantless. kira_tasks.organisation_id is
    // the ownership column (NOT NULL for owned rows; CHECK kira_tasks_owned_has_org rejects a
    // tenantless owned row), so a tenant with no resolvable org contributes NO rows — the task
    // cannot be represented until its owning organisation exists. Count it unusable, never drop it.
    if (!organisationId) {
      unusable += 1;
      continue;
    }
    const row = toMirrorRow(userId, task, organisationId);
    if (row) rows.push(row);
    else unusable += 1;
  }
  return { rows, unusable };
}

/** The narrow slice of Supabase this needs, so a test does not have to stand up a client. */
export interface BackfillStore {
  knownIntentIds(userId: string): Promise<string[]>;
  insert(rows: MirrorRow[]): Promise<void>;
}

export interface BackfillResult {
  tenants: number;
  found: number;
  inserted: number;
  unusable: number;
  failed: number;
}

/**
 * Discover and insert, one tenant at a time.
 *
 * PER-TENANT ISOLATION. One tenant's failure — an unreachable orchestrator, a bad row — must not
 * abort the sweep for everybody else. That is the same lesson the drain learned the expensive way,
 * where a single un-onboarded tenant threw and no customer's mail was sent at all.
 *
 * A coordinator without `listTasks` is a no-op, not an error: the local stub's tasks ARE these rows,
 * so there is nothing to discover and asking would be asking Kira about Kira.
 */
export async function backfillMissingTasks(
  coordinator: SwarmCoordinator,
  store: BackfillStore,
  tenantIds: TenantId[],
  opts: { limit?: number } = {},
): Promise<BackfillResult> {
  const result: BackfillResult = { tenants: 0, found: 0, inserted: 0, unusable: 0, failed: 0 };
  if (typeof coordinator.listTasks !== 'function') return result;

  for (const tenantId of tenantIds) {
    result.tenants += 1;
    try {
      const remote = await coordinator.listTasks(tenantId, { limit: opts.limit ?? 50 });
      if (!remote.length) continue;
      result.found += remote.length;

      // INV-020: kira_tasks are organisation-owned — resolve the owning org so restored rows satisfy
      // the NOT NULL tenant column; user_id remains provenance of who asked.
      const orgContext = await resolveOrganisationForPerson(tenantId);
      const { rows, unusable } = missingRows(
        tenantId,
        remote,
        await store.knownIntentIds(tenantId),
        orgContext?.organisationId ?? null,
      );
      result.unusable += unusable;
      if (!rows.length) continue;

      await store.insert(rows);
      result.inserted += rows.length;
      for (const row of rows) {
        console.log(`[swarm/backfill] recovered ${row.intent_id} (${row.status}) for ${tenantId}`);
      }
    } catch (error) {
      result.failed += 1;
      console.error(`[swarm/backfill] ${tenantId} failed (others continue):`, error);
    }
  }
  return result;
}
