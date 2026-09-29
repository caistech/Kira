// lib/genome/tasks.ts
//
// TASK DISCOVERY — the operational-completeness layer, merged into the existing checklist surface.
//
// WHY THIS EXISTS. `checklist.ts`'s 50 items + the admission ledger answer "is this business
// sellable" — a buyer's fixed, curated question set. The promise actually made to BBBO owners is
// different and stronger: that every real task making up the business gets mapped and locked into
// an SOP well enough that the owner could take 12 weeks off. That is an open-ended, per-business
// claim — unlike the curated 50, and private to one organisation, unlike the admission ledger's
// portfolio-wide cohort items. See docs/BUILD_REGISTER.md's R2 finding (2026-08-15/16): nothing had
// ever prompted Kira to ask "who could step into your job" as a task-by-task question, only as one
// area-level item (`people.successor`).
//
// HOW IT MERGES RATHER THAN DUPLICATES. `itemsForArea(area, extra)` and `assessAreaEntries(...,
// extraItems)` already accept an `extra: ChecklistItem[]` array — the admission ledger is the only
// caller today. This file is a SECOND source for that same seam. Gate 2's substance tests, gate 4's
// pathways (`pathway.ts`), and `evidenced-readiness.ts` are UNCHANGED — they are already generic
// over "any ChecklistItem, however sourced." A task, once discovered, is assessed, coached, and
// (if it needs one) given a pathway through the exact same code path as `people.successor`.
//
// WHY `factor` IS ALWAYS NULL. A task closes the operational-completeness gap, never the valuation
// gap — conflating the two is the exact failure PRODUCT_MEASURED_SYSTEMISATION.md warns against
// ("do not price a compliance gain as an enterprise-value gain until it is calibrated"). `readiness`
// and `readiness_now` are untouched by anything in this file; `taskCoverageForArea` below is a
// SEPARATE number, and it is not wired into either.
//
// ⚠️ DEGRADE, DON'T FAKE (DATA_STANDARD R4), same discipline as `checklist-assess.ts`. With no model
// configured, `discoverTasks` returns nothing rather than guessing — an unassessed area must read as
// "not looked at yet", never as "no tasks exist".

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { AreaKey } from './areas';
import { isAreaKey } from './areas';
import type { ChecklistItem, SubstanceTest } from './checklist';
import { createOpenAIRunner } from '@/lib/kira/structured-runner';
import type { AssessableEntry } from './checklist-assess';

// ─────────────────────────────────────────────────────────────────────────────
// THE ROW
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskRow {
  id: string;
  organisation_id: string;
  discovered_by_user_id: string;
  area: string;
  item_key: string;
  name: string;
  source_type: 'conversation' | 'owner_input';
  source_conversation_id: string | null;
  created_at: string;
  retired_at: string | null;
  retired_reason: string | null;
}

/** A task, once mapped to the checklist surface. Parallel to `AdmittedChecklistItem` in checklist.ts. */
export interface DiscoveredChecklistItem extends ChecklistItem {
  source: 'discovered';
  taskId: string;
  discoveredAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE / READ / RETIRE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a distinct task for this organisation. Idempotent by (organisation, area, name) — case
 * and whitespace insensitive, since the same task named slightly differently twice must not fork
 * into two items with two independent verdict histories.
 *
 * Registering a task is NOT a claim that it is understood or complete — it makes the task an
 * ASKABLE ITEM, exactly like an admitted checklist question joining the denominator open. Gate 1/2
 * decide, on the next assessment, whether the record actually answers it.
 */
export async function createTask(
  supabase: SupabaseClient,
  input: {
    organisationId: string;
    discoveredByUserId: string;
    area: AreaKey;
    name: string;
    sourceType?: TaskRow['source_type'];
    sourceConversationId?: string | null;
  },
): Promise<TaskRow> {
  const existing = await findTaskByName(supabase, input.organisationId, input.area, input.name);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('genome_tasks')
    .insert({
      organisation_id: input.organisationId,
      discovered_by_user_id: input.discoveredByUserId,
      area: input.area,
      item_key: `task.${input.area}.${crypto.randomUUID()}`,
      name: input.name.trim(),
      source_type: input.sourceType ?? 'conversation',
      source_conversation_id: input.sourceConversationId ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create task: ${error.message}`);
  return data as TaskRow;
}

async function findTaskByName(
  supabase: SupabaseClient,
  organisationId: string,
  area: AreaKey,
  name: string,
): Promise<TaskRow | null> {
  const { data } = await supabase
    .from('genome_tasks')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('area', area)
    .is('retired_at', null);

  const target = name.trim().toLowerCase();
  const match = (data ?? []).find((r) => (r.name as string).trim().toLowerCase() === target);
  return (match as TaskRow) ?? null;
}

/** Active (not retired) tasks for one area. */
export async function listActiveTasks(
  supabase: SupabaseClient,
  organisationId: string,
  area?: AreaKey,
): Promise<TaskRow[]> {
  let query = supabase
    .from('genome_tasks')
    .select('*')
    .eq('organisation_id', organisationId)
    .is('retired_at', null)
    .order('created_at', { ascending: true });

  if (area) query = query.eq('area', area);

  const { data, error } = await query;
  if (error) {
    console.error('[genome_tasks] read failed:', error);
    return [];
  }
  return (data ?? []) as TaskRow[];
}

/** "We don't do that any more" — data, not a failure to hide. Mirrors `pathway.ts`'s abandonment. */
export async function retireTask(
  supabase: SupabaseClient,
  taskId: string,
  organisationId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase
    .from('genome_tasks')
    .update({ retired_at: new Date().toISOString(), retired_reason: reason })
    .eq('id', taskId)
    .eq('organisation_id', organisationId);

  if (error) throw new Error(`Failed to retire task: ${error.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK → CHECKLIST ITEM — the merge point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A generic, task-agnostic substance test — the same rigour as a hand-authored one, applied
 * uniformly since nobody can pre-write weak/strong exemplars for a task that does not exist until
 * an owner describes it. Three tests, deliberately the same shape as `people.successor`'s: names a
 * performer, names a backup (or an honest "nobody yet"), and the steps are pointable-to rather than
 * merely known. `closes: 'document'` — the gap closes when the SOP is written down and filed
 * (`kiraFileManualToolDef` is the existing mechanism for that), not by a business change, unless
 * assessment later shows the honest answer is "nobody could do this but me" — which is exactly what
 * `people.successor` / `operations.owner-only-jobs` already exist to catch at the area level.
 */
function genericTaskSubstance(taskName: string): SubstanceTest {
  return {
    tests: [
      'names who does this today',
      'names someone else who could do it instead, or says plainly that nobody could yet',
      'the steps are written down somewhere she can point to — not just "I know how"',
    ],
    weakExample: `"someone would work it out"`,
    strongExample: `"${taskName} — Mark does it end to end, Sarah could step in and has done it before, and the steps are in the folder Kira filed."`,
    coaching:
      `Knowing how to do "${taskName}" is not the same as someone else being able to do it while ` +
      `you're away. Who does it today, who could stand in, and is there anything written down beyond ` +
      `what's in your head?`,
  };
}

export function taskToChecklistItem(row: TaskRow): DiscoveredChecklistItem {
  return {
    key: row.item_key,
    area: row.area as AreaKey,
    required: true,
    buyerItem: `Whether "${row.name}" runs without the owner`,
    ownerPrompt: `Could someone else actually do "${row.name}" — start to finish — without you?`,
    substance: genericTaskSubstance(row.name),
    factor: null,
    closes: 'document',
    source: 'discovered',
    taskId: row.id,
    discoveredAt: row.created_at,
  };
}

/** All active tasks for an organisation, ready to merge into `itemsForArea`/`assessAreaEntries`. */
export async function fetchTaskItems(
  supabase: SupabaseClient,
  organisationId: string,
  area?: AreaKey,
): Promise<DiscoveredChecklistItem[]> {
  const rows = await listActiveTasks(supabase, organisationId, area);
  return rows.map(taskToChecklistItem);
}

// ─────────────────────────────────────────────────────────────────────────────
// DISCOVERY — noticing a distinct task in the owner's existing record
// ─────────────────────────────────────────────────────────────────────────────

const DiscoverySchema = z.object({
  tasks: z.array(
    z.object({
      name: z.string(),
      /** Why this reads as a distinct, repeatable task rather than a one-off event or a fact. */
      reason: z.string(),
    }),
  ),
});

const DISCOVERY_SYSTEM = `You read a business owner's own record of one part of his business and identify
DISTINCT, REPEATABLE TASKS — things someone in the business does, over and over, as part of running it.

A task is NOT:
- a one-off event ("soil testing scheduled for Lot 109" is an event, not a task)
- a fact about the business ("we use Xero" is a fact, not a task)
- something already obviously covered by an existing tracked item (you will be told the ones already
  tracked — never propose a near-duplicate of one of those)

A task IS something like "quoting a bathroom renovation", "onboarding a new customer", "chasing an
overdue invoice", "scheduling the week's jobs" — a named, repeatable piece of work with steps, that
someone does and someone else could in principle learn to do.

Propose only tasks you can actually see evidence of in the record below — never invent one because a
business like this would probably have it. If the record does not clearly describe someone doing a
repeatable piece of work, propose nothing.`;

function discoveryPrompt(area: AreaKey, entries: AssessableEntry[], existing: string[]): string {
  const entryBlock = entries.length
    ? entries.map((e) => `[${e.id}] ${e.headline ? `${e.headline} — ` : ''}${e.content}`).join('\n')
    : '(nothing on the record for this area)';
  const existingBlock = existing.length
    ? existing.join(', ')
    : '(none tracked yet)';

  return `AREA: ${area}\n\nALREADY TRACKED (do not re-propose these or near-duplicates):\n${existingBlock}\n\nTHE OWNER'S RECORD:\n${entryBlock}\n\nList any distinct repeatable tasks you can see evidence of, not already tracked.`;
}

/**
 * Propose new tasks from an area's existing record. Never throws, never invents without a model —
 * mirrors `assessAreaEntries`'s degrade-don't-fake contract exactly. Returns proposals only; the
 * caller decides whether to `createTask` each one (kept separate so a caller can log/review before
 * writing, same shape as the admission ledger's watchlist step).
 */
export async function discoverTasks(
  area: AreaKey,
  entries: AssessableEntry[],
  existingTaskNames: string[],
  opts: { apiKey?: string; model?: string } = {},
): Promise<Array<{ name: string; reason: string }>> {
  if (!isAreaKey(area)) return [];
  const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY ?? '';
  if (!apiKey || entries.length === 0) return [];

  try {
    const runner = createOpenAIRunner(apiKey);
    const { result } = await runner.run({
      model: { provider: 'openrouter', model: opts.model ?? 'gpt-4.1-mini' },
      system: DISCOVERY_SYSTEM,
      input: discoveryPrompt(area, entries, existingTaskNames),
      schema: DiscoverySchema,
    });
    return result.tasks;
  } catch (error) {
    console.error(`[genome_tasks] discovery failed for ${area}:`, error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONAL COVERAGE — the separate number, never fed into readiness/readiness_now
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskCoverage {
  area: AreaKey;
  task_count: number;
  /** Tasks whose latest verdict (from genome_item_status, read by the caller) is 'answered'. */
  locked_count: number;
  /**
   * Never a percentage claim on its own — see checklist-bands.ts's reasoning for why bands stay
   * bands. `null` when task_count is 0: an area with no discovered tasks has an UNKNOWN denominator,
   * not a complete one, and reporting 100% of zero would be exactly the "precise-looking number on a
   * guess" this whole layer exists to avoid.
   */
  locked_fraction: number | null;
}

/**
 * Roll up task rows against their verdicts into the operational-coverage read for one area.
 * `verdictByItemKey` is supplied by the caller (already reading `genome_item_status` for other
 * reasons at every call site) rather than queried again here.
 */
export function taskCoverageForArea(
  area: AreaKey,
  tasks: TaskRow[],
  verdictByItemKey: Map<string, 'open' | 'weak' | 'answered'>,
): TaskCoverage {
  const inArea = tasks.filter((t) => t.area === area);
  const locked = inArea.filter((t) => verdictByItemKey.get(t.item_key) === 'answered');
  return {
    area,
    task_count: inArea.length,
    locked_count: locked.length,
    locked_fraction: inArea.length > 0 ? locked.length / inArea.length : null,
  };
}
