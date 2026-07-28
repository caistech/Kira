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

  const results = { checked: stale?.length ?? 0, updated: 0, unchanged: 0, unreachable: 0 };
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
      if (!live || live === task.status) {
        results.unchanged += 1;
        continue;
      }
      const { error: writeError } = await supabase
        .from('kira_tasks')
        .update({ status: live, updated_at: new Date().toISOString() })
        .eq('id', task.id);
      if (writeError) throw new Error(writeError.message);

      results.updated += 1;
      console.log(`[cron/reconcile-tasks] ${taskGroupId}: ${task.status} → ${live}`);
    } catch (pollError) {
      // One unreachable task must not stop the rest of the batch, and must not be written as
      // anything — an unreachable orchestrator tells us nothing about the task, and guessing here
      // would put a fiction in front of the owner, which is the whole failure being repaired.
      results.unreachable += 1;
      console.error(`[cron/reconcile-tasks] could not read ${taskGroupId}:`, pollError);
    }
  }

  console.log('[cron/reconcile-tasks]', results);
  return NextResponse.json(results);
}
