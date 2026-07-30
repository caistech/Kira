// lib/kira/swarm/open-tasks.ts
// What this owner has asked for that has not landed — read from Kira's own mirror of the task store.
//
// WHY IT EXISTS. Kira could dispatch a task and approve a task, and had no way to answer "what
// happened to the thing I asked you for on Tuesday?" Three requests — including a $60,000 quote —
// sat drafted and unsent for two days, and she could not have told him even if asked directly,
// because nothing read the non-terminal rows. An assistant that cannot account for its own
// outstanding work is one an owner has to keep a list for, which is the job he was delegating.
//
// SCOPED BY OWNER, always. The same table holds the orchestrator's dev-tenant seed traffic, and a
// count that included it would have her opening with nine things he never asked for.
//
// This is a READ MODEL. The orchestrator owns execution state; nothing here decides an approval or a
// send. If the mirror is behind, the reconcile cron is what corrects it — not this.

import { createServiceClient } from '@/lib/supabase/server';

/** Non-terminal: asked for, not yet resolved either way. */
const OPEN_STATES = ['queued', 'awaiting_approval', 'scheduled'] as const;

/** How far back "recently finished" reaches, so she can confirm a send without listing history. */
const RECENT_DAYS = 14;

export interface OpenTaskSummary {
  id: string;
  kind: string;
  status: string;
  /** Plain language for the status, written to be spoken. */
  state: string;
  summary: string;
  requested: string;
  ageDays: number;
}

export interface TaskLedger {
  openCount: number;
  open: OpenTaskSummary[];
  recentlyDone: OpenTaskSummary[];
  /** One sentence she can say as-is. Empty when there is nothing outstanding. */
  spoken: string;
}

function plainState(status: string): string {
  switch (status) {
    case 'awaiting_approval':
      return 'drafted and waiting on your go-ahead';
    case 'queued':
      return 'accepted and not finished';
    case 'scheduled':
      return 'approved and waiting for its time';
    case 'done':
      return 'sent';
    default:
      return status.replace(/_/g, ' ');
  }
}

function days(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function toSummary(row: {
  id: string;
  kind: string | null;
  status: string;
  summary: string | null;
  utterance: string | null;
  created_at: string;
}): OpenTaskSummary {
  return {
    id: row.id,
    kind: row.kind ?? 'task',
    status: row.status,
    state: plainState(row.status),
    // Her own one-liner if she wrote one, otherwise his words. Never a placeholder.
    summary: row.summary || row.utterance || 'no description recorded',
    requested: row.created_at,
    ageDays: days(row.created_at),
  };
}

/**
 * Everything outstanding for one owner, plus what closed recently.
 *
 * Fail-soft: on a query error it returns an EMPTY ledger with no spoken line, because the alternative
 * — an invented "you're all clear" — is the one answer that must never be guessed. A silent nothing
 * reads as "she didn't mention it"; a wrong all-clear reads as a promise.
 */
export async function readTaskLedger(userId: string): Promise<TaskLedger> {
  const empty: TaskLedger = { openCount: 0, open: [], recentlyDone: [], spoken: '' };
  if (!userId) return empty;

  try {
    const since = new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString();
    const { data, error } = await createServiceClient()
      .from('kira_tasks')
      .select('id, kind, status, summary, utterance, created_at')
      .eq('user_id', userId)
      .or(`status.in.(${OPEN_STATES.join(',')}),and(status.eq.done,created_at.gte.${since})`)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);

    const rows = (data ?? []).map(toSummary);
    const open = rows.filter((r) => (OPEN_STATES as readonly string[]).includes(r.status));
    const recentlyDone = rows.filter((r) => r.status === 'done').reverse();

    return { openCount: open.length, open, recentlyDone, spoken: spokenLine(open) };
  } catch (e) {
    console.error('[swarm] could not read the task ledger:', e);
    return empty;
  }
}

/**
 * The line she opens with. Deliberately names the OLDEST thing rather than counting — "three things
 * are open" invites "which ones?", and the answer he needs is the one that has been waiting longest.
 */
function spokenLine(open: OpenTaskSummary[]): string {
  if (open.length === 0) return '';
  const oldest = open[0];
  const waited =
    oldest.ageDays >= 1 ? ` from ${oldest.ageDays} day${oldest.ageDays === 1 ? '' : 's'} ago` : '';
  const others =
    open.length > 1 ? ` There ${open.length === 2 ? 'is 1 other' : `are ${open.length - 1} others`}.` : '';
  return `Still open${waited}: ${oldest.summary} — ${oldest.state}.${others}`;
}
