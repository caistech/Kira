// lib/kira/swarm/coordinator.ts
// THE SEAM (Seam 1 in the Gareth/Shah brief). Kira dispatches every "doable" intent through this
// one interface. Today a LOCAL stub (./stub) handles the ~3 owned tasks (quote / follow-up email /
// reminder) end-to-end; when Gareth's swarm is ready, his adapter implements the SAME interface and
// EXPANDS dispatchIntent from ~3 tasks to the whole back-office — with no change on Kira's side.
//
// Design principle from the office-hours session (2026-07-25): the swarm is the EXPANSION of doing,
// not the gate. Kira never waits for Gareth to deliver the first "it got done" moment.
//
// Human-in-the-loop is baked into the states: nothing outbound executes until the owner approves.

/** The canonical business+owner key. Today = the Kira user id (one agent per user). */
export type TenantId = string;

export interface DispatchedIntent {
  tenantId: TenantId;
  /** Idempotency key — one utterance never dispatches twice (retries/dupes are safe). */
  intentId: string;
  /** What the owner said, verbatim. */
  utterance: string;
  /** Optional structured NLU if the caller classified it; the coordinator may also classify. */
  classified?: { kind: string; [k: string]: unknown };
  /** Relevant recent memory Kira already holds (so the coordinator doesn't re-derive it). */
  context?: Record<string, unknown>;
}

export type TaskState =
  | 'queued'             // accepted, work in progress (or handed to the swarm)
  | 'awaiting_approval'  // a draft is ready; nothing sends until the owner approves (HITL)
  | 'scheduled'          // approved, waiting for its due time — NOT yet done (see kira_tasks.due_at)
  | 'done'               // executed (and the owner notified)
  | 'failed'
  | 'unsupported';       // no owned handler + no swarm yet — captured, not silently dropped

/** The six states, at runtime. The type alone cannot check a value that arrived over HTTP. */
export const TASK_STATES = [
  'queued',
  'awaiting_approval',
  'scheduled',
  'done',
  'failed',
  'unsupported',
] as const satisfies readonly TaskState[];

/**
 * The only sanctioned way to turn something that crossed the wire into a TaskState.
 *
 * `x as TaskState` asserts and validates NOTHING, which is how an entire TaskStatus OBJECT was
 * accepted as a status, serialised into `kira_tasks.status` and left there: three tasks — including a
 * client-ready quote — matched no query on any surface for two days, because a row whose status is a
 * JSON blob answers to none of the six names every reader asks for.
 *
 * Returns null rather than a fallback so each call site decides what an unknown status means there.
 * A cast is not a check.
 */
export function asTaskState(value: unknown): TaskState | null {
  return typeof value === 'string' && (TASK_STATES as readonly string[]).includes(value)
    ? (value as TaskState)
    : null;
}

/** A drafted outbound artifact the owner approves before anything leaves the building. */
export interface TaskDraft {
  kind: 'quote' | 'email' | 'reminder' | string;
  /** One-line summary the owner hears/sees ("Follow-up email to Dave re: the Wavecrest quote"). */
  summary: string;
  /** The full drafted content for review (email body, quote text, reminder detail). */
  preview: string;
  /** Structured payload the executor needs (recipient, amounts, due time, …). */
  artifact: Record<string, unknown>;
}

export interface DispatchResult {
  taskGroupId: string;
  status: TaskState;
  /** Present when status = awaiting_approval. */
  draft?: TaskDraft;
  /** Human-facing note ("Drafted — say the word and I'll send it."). */
  message?: string;
}

export interface TaskStatus {
  taskGroupId: string;
  status: TaskState;
  draft?: TaskDraft;
  message?: string;
}

/**
 * The contract Gareth's swarm adapter implements. Kira only ever calls these three; whatever is
 * behind them (the local stub, or the full swarm) is invisible to Kira.
 */
export interface SwarmCoordinator {
  /** Accept an intent. Returns a draft awaiting approval (owned tasks), queued (swarm), or unsupported. */
  dispatchIntent(intent: DispatchedIntent): Promise<DispatchResult>;
  /** Poll a task group's state (the return leg is also pushed via webhook where available). */
  getTaskState(taskGroupId: string, tenantId: TenantId): Promise<TaskStatus>;
  /**
   * The owner's decision on a drafted task. approve=false discards it. On approve, it executes +
   * notifies. `patch` supplies anything the owner gave at approval time that the draft was missing —
   * most importantly a recipient email for a send (the classifier can't invent one), so the send can
   * complete instead of dead-ending. Merged into the task's artifact before execution.
   */
  resolveApproval(
    taskGroupId: string,
    tenantId: TenantId,
    approve: boolean,
    patch?: { recipientEmail?: string },
  ): Promise<DispatchResult>;
}
