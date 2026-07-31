// app/api/cron/reconcile-tasks/route.ts
//
// The backstop for a lost callback.
//
// Kira and the orchestrator are separate Supabase projects on purpose — the orchestrator's
// `connections` table holds Xero refresh tokens, which are standing access to a business's complete
// financial position, so neither product holds the other's service-role key. They meet over HTTP,
// and state both sides need is COPIED across that boundary rather than read across it.
//
// Copying is only safe if something notices when a copy goes stale. The orchestrator calls back on
// send and on failure, and that callback is fail-soft on its side — so a network blip, a deploy
// mid-flight or a 500 here leaves Kira's row frozen at whatever it last heard, permanently, with
// nothing to correct it. The owner's dashboard would then show a task still waiting on him that was
// sent days ago, or worse, one he thinks is done that never went.
//
// This re-reads anything non-terminal and older than the grace window straight from the
// orchestrator, which is authoritative for execution state. Kira's table is a READ MODEL: it is
// what the owner's surfaces and the operator's queue are built on, and it is never what an approval
// or a send is decided from.
//
// Bounded on purpose: a page at a time, oldest first, so a backlog drains over successive runs
// instead of one invocation trying to reconcile everything and timing out having fixed nothing.

import { NextRequest, NextResponse } from 'next/server';

import { rejectUnauthorisedCron } from '@/lib/cron-auth';
import { getSwarmCoordinator } from '@/lib/kira/swarm';
import { backfillMissingTasks, type MirrorRow } from '@/lib/kira/swarm/backfill';
import { asTaskState } from '@/lib/kira/swarm/coordinator';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Statuses that will never change again — nothing to reconcile. */
const TERMINAL = ['done', 'failed', 'cancelled', 'unsupported'];

/**
 * How long a task is left alone before we go asking.
 *
 * Long enough that the normal callback has had every chance to arrive, so this stays a repair
 * mechanism rather than a second, slower way of doing the same job — and short enough that a
 * stale row is measured in minutes rather than discovered by the owner.
 */
const GRACE_MINUTES = 15;

/** How many to reconcile per run. A backlog drains across runs; one run never stalls on it. */
const BATCH = 25;

/**
 * How many tenants the discovery pass sweeps per run, and how deep into each one it looks.
 *
 * Every Kira user is a tenant, so the sweep is over `users` rather than over tenants Kira already
 * has tasks for — which sounds like the cheaper query and is exactly the bug. A user whose very
 * first dispatch was the one that failed to mirror has no rows at all, so a sweep seeded from
 * existing rows would never look at the person worst affected.
 */
const TENANT_SWEEP = 200;
const PER_TENANT = 50;

export async function GET(request: NextRequest) {
  const unauthorised = rejectUnauthorisedCron(request);
  if (unauthorised) return unauthorised;

  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - GRACE_MINUTES * 60_000).toISOString();

  const { data: stale, error } = await supabase
    .from('kira_tasks')
    .select('id, user_id, intent_id, status, updated_at')
    .eq('handled_by', 'orchestrator')
    .not('status', 'in', `(${TERMINAL.join(',')})`)
    .lt('updated_at', cutoff)
    .order('updated_at', { ascending: true })
    .limit(BATCH);

  if (error) {
    console.error('[cron/reconcile-tasks] query failed:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  const results = { checked: stale?.length ?? 0, updated: 0, unchanged: 0, unreachable: 0, unreadable: 0 };
  const coordinator = getSwarmCoordinator();

  for (const task of stale ?? []) {
    // The mirror is keyed `orch:<taskGroupId>` — the same key the completion callback upserts on,
    // so both write the same row instead of two that disagree. The id to poll is what follows it.
    const taskGroupId = String(task.intent_id ?? '').startsWith('orch:')
      ? String(task.intent_id).slice('orch:'.length)
      : null;
    if (!taskGroupId) continue;

    try {
      const live = await coordinator.getTaskState(taskGroupId, task.user_id as string);
      // getTaskState returns a TaskStatus OBJECT. Reading the STATE off it is the whole job here, and
      // writing the object instead is what corrupted three tasks — one of them a client-ready quote —
      // into rows that answered to none of the six status names, on no page, for two days. The
      // comparison hid it: an object is never equal to a status string, so every row looked changed
      // and every run rewrote the same damage.
      const state = asTaskState(live?.status);
      if (!state) {
        // Authoritative-but-unreadable is not news about the task. Leave the row exactly as it is.
        results.unreadable += 1;
        console.error(
          `[cron/reconcile-tasks] ${taskGroupId}: unusable status ${JSON.stringify(live?.status)} — row left alone.`,
        );
        continue;
      }
      if (state === task.status) {
        results.unchanged += 1;
        continue;
      }
      const { error: writeError } = await supabase
        .from('kira_tasks')
        .update({ status: state, updated_at: new Date().toISOString() })
        .eq('id', task.id);
      if (writeError) throw new Error(writeError.message);

      results.updated += 1;
      console.log(`[cron/reconcile-tasks] ${taskGroupId}: ${task.status} → ${state}`);
    } catch (pollError) {
      // One unreachable task must not stop the rest of the batch, and must not be written as
      // anything — an unreachable orchestrator tells us nothing about the task, and guessing here
      // would put a fiction in front of the owner, which is the whole failure being repaired.
      results.unreachable += 1;
      console.error(`[cron/reconcile-tasks] could not read ${taskGroupId}:`, pollError);
    }
  }

  // ── Discovery ──────────────────────────────────────────────────────────────────────────────
  // Everything above REPAIRS rows Kira already has, which cannot reach a task Kira never recorded.
  // Those exist: the mirror ran as a floating promise on a serverless runtime for a while, so some
  // dispatches were simply never written, and three of the owner's requests sat waiting on his
  // approval while his dashboard showed one. Nothing in the system could find them, because every
  // query started from the rows that were missing.
  const { data: tenants, error: tenantError } = await supabase
    .from('users')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(TENANT_SWEEP);

  if (tenantError) {
    // Reported, not fatal: the repair pass above already succeeded and its result is worth returning.
    console.error('[cron/reconcile-tasks] could not list tenants for discovery:', tenantError);
  }

  const tenantIds = (tenants ?? []).map((t) => t.id as string);
  if (tenantIds.length === TENANT_SWEEP) {
    console.warn(`[cron/reconcile-tasks] tenant sweep hit its cap (${TENANT_SWEEP}) — some were not checked.`);
  }

  const discovered = await backfillMissingTasks(
    coordinator,
    {
      async knownIntentIds(userId: string) {
        const { data, error: knownError } = await supabase
          .from('kira_tasks')
          .select('intent_id')
          .eq('user_id', userId);
        // Throwing is deliberate. An empty list on a failed read would look like "this tenant has
        // nothing", and the caller INSERTS the difference — turning a transient error into duplicate
        // rows for every task he has. Better to skip this tenant and try again in twenty minutes.
        if (knownError) throw new Error(knownError.message);
        return (data ?? []).map((r) => r.intent_id as string);
      },
      async insert(rows: MirrorRow[]) {
        // Upsert on the same key the live mirror and the completion callback both use, so a task
        // that lands here at the same moment a callback arrives ends as one row, not two.
        const { error: insertError } = await supabase
          .from('kira_tasks')
          .upsert(rows, { onConflict: 'user_id,intent_id' });
        if (insertError) throw new Error(insertError.message);
      },
    },
    tenantIds,
    { limit: PER_TENANT },
  );

  console.log('[cron/reconcile-tasks]', { ...results, discovered });
  return NextResponse.json({ ...results, discovered });
}
