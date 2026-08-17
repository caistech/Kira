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

import { readinessOf } from './drafts';

/** Non-terminal: asked for, not yet resolved either way. */
const OPEN_STATES = ['queued', 'awaiting_approval', 'scheduled'] as const;

/** How far back "recently finished" reaches, so she can confirm a send without listing history. */
const RECENT_DAYS = 14;

/**
 * WHOSE MOVE IS IT. The distinction the dashboard got backwards for every row on a real account.
 *
 * The owner's screen headed this list "Waiting on you" and then listed twelve items of which
 * TWELVE were waiting on HER — ten "on her list, not written yet", two "accepted and not finished",
 * none drafted. The heading was not merely imprecise; it was inverted for every row, and the first
 * thing the owner read each morning was his own backlog described as his fault, aged in days.
 *
 * So the split is computed from the same signal `plainState` uses, and no screen decides it by
 * matching the display sentence — a string comparison would silently reclassify everything the day
 * someone improves the wording.
 */
export type WaitingOn = 'owner' | 'kira';

/**
 * When something waiting on HER stops being "in progress" and starts being evidence.
 *
 * Seven days because that is a week: an owner who asked on Monday and sees it again the following
 * Monday has learned something about whether this works. The real account carried items at 17 days.
 * The point is not the number — it is that age must CHANGE something on screen, because a list that
 * ages silently reads as activity while it is actually rot.
 */
export const STALLED_AFTER_DAYS = 7;

export interface OpenTaskSummary {
  id: string;
  kind: string;
  status: string;
  /** Plain language for the status, written to be spoken. */
  state: string;
  summary: string;
  requested: string;
  ageDays: number;
  /** Who has to act next. See WaitingOn. */
  waitingOn: WaitingOn;
  /** Waiting on her, and old enough that saying nothing would be dishonest. */
  stalled: boolean;
}

export interface TaskLedger {
  openCount: number;
  open: OpenTaskSummary[];
  recentlyDone: OpenTaskSummary[];
  /**
   * The same open items, split by whose move it is — computed ONCE, here.
   *
   * Exposed rather than left to each screen because two screens deriving "is this his?" separately
   * is how the dashboard and the Drafts page came to disagree about the same row in the first place.
   */
  waitingOnOwner: OpenTaskSummary[];
  waitingOnKira: OpenTaskSummary[];
  /** Waiting on her past STALLED_AFTER_DAYS. A subset of waitingOnKira, oldest first. */
  stalled: OpenTaskSummary[];
  /** One sentence she can say as-is. Empty when there is nothing outstanding. */
  spoken: string;
}

/**
 * ⚠️ THE STATUS ALONE IS NOT ENOUGH, AND SAYING IT ALONE PRODUCED A FLAT CONTRADICTION.
 *
 * `awaiting_approval` used to read "drafted and waiting on your go-ahead" whatever was behind it. On
 * the same account, at the same moment, the Drafts page read the BODY and said "Nothing written yet.
 * If she has told you it was ready, she was wrong."
 *
 *   "Two screens, one item, opposite states… the dashboard says a draft is 'drafted and waiting on
 *    your go-ahead' and links to a page that says 'nothing written yet'. The link is even labelled
 *    'Read what she has written'." — Ray, 2026-08-17
 *
 * So this reads the same signal the Drafts page reads — `readinessOf` from drafts.ts — rather than
 * guessing from the status column. One source, two screens.
 *
 * ⚠️ AND NO STATUS STRING EVER REACHES HIM RAW. The old default returned the column with its
 * underscores swapped for spaces, which is how "unsupported" arrived on his screen next to
 * "an information task not supported for assistant action". He should never have to work out what
 * an "assistant action" is.
 */
function plainState(row: { status: string; preview?: unknown; artifact?: unknown }): string {
  const readiness = readinessOf(row);
  if (readiness === 'refused') return 'she could not do this one';

  switch (row.status) {
    case 'awaiting_approval':
      return readiness === 'ready' ? 'drafted and waiting on your go-ahead' : 'on her list, not written yet';
    case 'queued':
      return 'accepted and not finished';
    case 'scheduled':
      return 'approved and waiting for its time';
    case 'done':
      return 'sent';
    default:
      // Deliberately vague rather than leaking a column value. If a state matters to him it earns a
      // sentence above; anything else is our bookkeeping.
      return 'in progress';
  }
}

/**
 * CALENDAR days, not elapsed-hours-divided-by-24.
 *
 * A task from Tuesday evening is "two days ago" to the owner on Thursday morning, and 38 hours to
 * `Math.floor`, which reports it as one. Under-stating the age of the thing he is waiting on is the
 * one direction this must not round, since the age is the whole reason to mention it.
 */
export function days(iso: string, now: Date = new Date()): number {
  const then = new Date(iso);
  const startOfDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000));
}

/**
 * Whose move is it — from the row, not from the sentence.
 *
 * ONE case returns 'owner': she has written something and is holding it for his go-ahead. That is
 * the only state in which he can unblock anything by acting. Everything else — not written yet,
 * accepted and unfinished, refused, scheduled, or a status we do not recognise — is hers.
 *
 * ⚠️ 'refused' IS HERS, and that is deliberate rather than an oversight. "She could not do this one"
 * feels like it needs him, but what it needs is an explanation she owes him; filing it under his
 * column would put a failure of hers on his to-do list, which is the exact inversion this type
 * exists to end.
 */
export function waitingOnFor(row: { status: string; preview?: unknown; artifact?: unknown }): WaitingOn {
  if (readinessOf(row) === 'refused') return 'kira';
  return row.status === 'awaiting_approval' && readinessOf(row) === 'ready' ? 'owner' : 'kira';
}

function toSummary(row: {
  id: string;
  kind: string | null;
  status: string;
  summary: string | null;
  utterance: string | null;
  created_at: string;
  // Read so `plainState` can tell "drafted" from "on her list" — see the note there.
  preview?: unknown;
  artifact?: unknown;
}): OpenTaskSummary {
  const waiting = waitingOnFor(row);
  const ageDays = days(row.created_at);
  return {
    id: row.id,
    kind: row.kind ?? 'task',
    status: row.status,
    state: plainState(row),
    // Her own one-liner if she wrote one, otherwise his words. Never a placeholder.
    summary: row.summary || row.utterance || 'no description recorded',
    requested: row.created_at,
    ageDays,
    waitingOn: waiting,
    // Only HER items can stall. Something held for his go-ahead is waiting by design, and calling
    // that stalled would blame him for a pause he chose.
    stalled: waiting === 'kira' && ageDays >= STALLED_AFTER_DAYS,
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
  const empty: TaskLedger = {
    openCount: 0,
    open: [],
    recentlyDone: [],
    waitingOnOwner: [],
    waitingOnKira: [],
    stalled: [],
    spoken: '',
  };
  if (!userId) return empty;

  try {
    const since = new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString();
    const { data, error } = await createServiceClient()
      .from('kira_tasks')
      .select('id, kind, status, summary, utterance, preview, artifact, created_at')
      .eq('user_id', userId)
      .or(`status.in.(${OPEN_STATES.join(',')}),and(status.eq.done,created_at.gte.${since})`)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);

    const rows = (data ?? []).map(toSummary);
    const open = rows.filter((r) => (OPEN_STATES as readonly string[]).includes(r.status));
    const recentlyDone = rows.filter((r) => r.status === 'done').reverse();

    return {
      openCount: open.length,
      open,
      recentlyDone,
      waitingOnOwner: open.filter((t) => t.waitingOn === 'owner'),
      waitingOnKira: open.filter((t) => t.waitingOn === 'kira'),
      // Oldest first: the worst one leads, because that is the one he would raise.
      stalled: open.filter((t) => t.stalled).sort((a, b) => b.ageDays - a.ageDays),
      spoken: spokenLine(open),
    };
  } catch (e) {
    console.error('[swarm] could not read the task ledger:', e);
    return empty;
  }
}

/**
 * The line she opens with. It names ONE thing rather than a count — "three things are open" only
 * invites "which ones?" — and which one it names is not simply the oldest.
 *
 * Money first, then age. Read strictly oldest-first, the live ledger opened on a throwaway test email
 * while a $60,000 quote to a client sat third in the same list. A quote is the item with a client and
 * a number on the other end of it, so it leads; everything else is ordered by how long it has waited.
 */
export function spokenLine(open: OpenTaskSummary[]): string {
  if (open.length === 0) return '';
  const rank = (t: OpenTaskSummary) => (t.kind === 'quote' ? 0 : 1);
  const lead = [...open].sort((a, b) => rank(a) - rank(b) || b.ageDays - a.ageDays)[0];
  const waited = lead.ageDays >= 1 ? ` from ${lead.ageDays} day${lead.ageDays === 1 ? '' : 's'} ago` : '';
  const others =
    open.length > 1 ? ` There ${open.length === 2 ? 'is 1 other' : `are ${open.length - 1} others`}.` : '';
  return `Still open${waited}: ${lead.summary} — ${lead.state}.${others}`;
}
