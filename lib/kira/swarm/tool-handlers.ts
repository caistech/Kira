// lib/kira/swarm/tool-handlers.ts
// The voice-tool entry points into the doing-slice. The agent calls dispatch_task when the owner
// asks for something done; it drafts and returns the summary so the agent can read it back and ask
// for approval. The agent calls approve_task with the returned task_id once the owner says yes.
//
// Identity is server-baked (?uid) exactly like the memory + knowledge tools — ElevenLabs never
// passes the conversation id to a server tool. Nothing is ever sent without the owner's approval:
// dispatch only drafts; approve_task(approve=true) is the only path that executes.

import { sendUnansweredRequestAlert } from '@/lib/email/unanswered-request';
import { getSwarmCoordinator } from '@/lib/kira/swarm';
import { readTaskLedger } from '@/lib/kira/swarm/open-tasks';
import {
  isUnusableRecipient,
  recipientConcern,
  recipientFrom,
  recipientPrompt,
  type RecipientBearingArtifact,
} from '@/lib/kira/swarm/recipient';
import { createServiceClient } from '@/lib/supabase/server';

/** True when dispatch is going to the orchestrator rather than Kira's own local stub. */
function usingRemoteBrain(): boolean {
  const adapter = (process.env.KIRA_SWARM_ADAPTER || 'local').toLowerCase();
  return adapter !== 'local';
}

/**
 * Mirror a dispatched task into KIRA's own table, whatever its status.
 *
 * WHY TWO DATABASES AT ALL. Each product owns its own Supabase and nothing holds another's
 * service-role key — the orchestrator's `connections` table carries Xero refresh tokens, which are
 * standing access to a business's complete financial position, so a leaked Kira env must not be
 * able to reach it. The boundary is crossed over HTTP with a shared secret, and state both sides
 * need is COPIED across it rather than read across it.
 *
 * WHY AT DISPATCH AND NOT AT COMPLETION. The mirror used to happen only when a task finished or
 * failed, so a task waiting on the owner's approval existed in the orchestrator and nowhere else.
 * Measured: 8 tasks at `awaiting_approval` in the orchestrator, 0 of them in kira_tasks. The owner's
 * "Waiting on you" list — the top half of his dashboard — would have shown nothing while eight
 * things waited on him. A surface that looks calm because it queries the wrong database is the same
 * class of failure as a page that says a thing was sent when it wasn't.
 *
 * Writing the row the moment the task exists makes Kira's copy complete by construction, rather
 * than contingent on every later callback arriving.
 *
 * KEYED `orch:<taskGroupId>` — the SAME key the completion callback upserts on. Anything else and
 * the callback creates a second row for the same task instead of updating this one, which is how a
 * mirror turns into two opinions that disagree.
 *
 * AUTHORITY: the orchestrator owns execution state. This table is a READ MODEL for the owner's
 * surfaces and the operator's queue. Nothing may decide an approval or a send from it.
 *
 * Fail-soft: it runs inside a live voice call and is the least important thing happening in one.
 */
async function mirrorTask(args: {
  userId: string;
  taskGroupId: string;
  utterance: string;
  status: string;
  kind: string | null;
  summary: string | null;
}): Promise<void> {
  if (!usingRemoteBrain()) return; // the local stub writes its own row — don't double-record
  if (!args.taskGroupId) return; // nothing to key on; the dispatch itself never landed
  try {
    await createServiceClient()
      .from('kira_tasks')
      .upsert(
        {
          user_id: args.userId,
          intent_id: `orch:${args.taskGroupId}`,
          kind: args.kind ?? 'unsupported',
          status: args.status,
          utterance: args.utterance,
          summary: args.summary,
          handled_by: 'orchestrator',
        },
        { onConflict: 'user_id,intent_id' },
      );
  } catch (error) {
    console.error('[swarm] could not mirror a task (ignored):', error);
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function uidFrom(req: Request): string {
  return new URL(req.url).searchParams.get('uid') || '';
}

/** dispatch_task: draft an owned task and hold it for approval. */
export async function handleDispatchTask(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, error: 'Invalid JSON' });
  }

  const userId = uidFrom(req);
  if (!userId) return json(200, { success: false, error: 'No user identity on this request' });

  const utterance = String(body.request || body.task || '').trim();
  if (!utterance) return json(400, { success: false, error: 'Missing request' });

  // Idempotency key: prefer an agent-supplied intent id, else derive a stable one from the utterance
  // so a repeated tool call in the same turn doesn't double-draft. (The agent rarely supplies one.)
  const intentId = String(body.intent_id || `u:${hash(utterance)}`);

  try {
    const result = await getSwarmCoordinator().dispatchIntent({
      tenantId: userId,
      intentId,
      utterance,
    });
    // A send needs a recipient email the classifier can't invent. Tell the agent when it's missing so
    // it asks the owner ("what's Dave's email?") before approving, instead of dead-ending on send.
    // Alert the operator the moment something is asked for that we cannot do. The row was already
    // being written and read by nobody; a build queue you have to remember to open goes stale, and
    // the freshness is the whole value of the signal. Deliberately not awaited into the response
    // path — a mail failure must never delay or break a live voice call.
    // 'failed' belongs here as much as 'unsupported'. They mean opposite things — we never could
    // versus we should have and didn't — and the second is the one that had been landing as an
    // invisible `queued` row while the owner was told his email had gone.
    if (result.status === 'unsupported' || result.status === 'failed') {
      const classify = (result.draft?.artifact as { classify?: { reason_if_unsupported?: string } } | undefined)
        ?.classify;
      void sendUnansweredRequestAlert({
        utterance,
        reason: classify?.reason_if_unsupported ?? result.draft?.summary ?? result.message ?? null,
        ownerUserId: userId,
        status: result.status,
      });
    }

    // Mirror EVERY dispatch, not only the ones that ended badly — awaiting_approval above all,
    // since that is the state the owner's dashboard is built around.
    //
    // AWAITED, not fire-and-forget. This was `void mirrorTask(...)`, and on a serverless runtime a
    // floating promise means "maybe": the response returns, the lambda freezes or terminates, and
    // the write may simply never run. That is why the loss was INTERMITTENT rather than a clean
    // before-and-after — in one conversation 12:08, 12:09, 12:11 and 12:17 mirrored while 12:13,
    // 12:15 and 12:16 did not. Six of ten tasks ended up on no screen, three of them waiting on the
    // owner's approval. It costs one round trip and cannot break the voice path: mirrorTask catches
    // its own failures. Fire-and-forget is a browser idiom; here it is a data-loss bug.
    await mirrorTask({
      userId,
      taskGroupId: result.taskGroupId,
      utterance,
      status: result.status,
      kind: result.draft?.kind ?? null,
      summary: result.draft?.summary ?? result.message ?? null,
    });

    const art = (result.draft?.artifact ?? {}) as Record<string, unknown>;
    const isSend = result.draft?.kind === 'email' || result.draft?.kind === 'quote';
    // Read the recipient out of EITHER shape — the stub writes `recipient_email`, the orchestrator
    // writes `recipients: [address]`. Checking only the first meant an orchestrator draft that had a
    // good address still asked the owner for one.
    const recipient = isSend ? recipientFrom(art as RecipientBearingArtifact) : null;
    const concern = isSend ? recipientConcern(recipient) : null;
    // A spelled-out or malformed address is treated as no address at all: ask again rather than draft
    // against something that cannot be delivered. A plausible-looking one still gets read back —
    // "mcdennis@gmail.com" was one letter off and passes every check a machine can make.
    const needsRecipientEmail = isSend && concern !== null;
    return json(200, {
      success: true,
      task_id: result.taskGroupId,
      status: result.status,
      // What the agent reads back to the owner before asking to send.
      summary: result.draft?.summary ?? result.message ?? '',
      preview: result.draft?.preview ?? '',
      // The address question is appended to what she was going to say anyway, so it works with the
      // agents as currently provisioned rather than waiting on a tool-description change.
      message: [
        result.message ?? '',
        isSend ? recipientPrompt(recipient, concern, result.recipientSource ?? null) : '',
      ]
        .filter(Boolean)
        .join(' '),
      needs_approval: result.status === 'awaiting_approval',
      needs_recipient_email: needsRecipientEmail,
      recipient_email: recipient,
      // Every send, not only the suspicious ones. The near-miss is the case that actually bites.
      confirm_recipient: isSend,
      recipient_name: (art.recipient_name as string) ?? null,
    });
  } catch (e) {
    console.error('[swarm] dispatch_task failed:', e);
    return json(200, { success: false, error: 'Could not start that task right now.' });
  }
}

/**
 * Record that something was NOT done, and why.
 *
 * A refusal is currently words in a call and then nothing. For an owner who is handing an agent his
 * Drive, his contacts and his mail — usually before he has told anyone he is selling — "it declined,
 * and here is the record" is the artifact that distinguishes a boundary that holds from one that is
 * merely claimed. It is also what lets the red team assert on evidence rather than on a transcript.
 *
 * Fail-soft and never awaited into a decision: a refusal that cannot be written must not turn into
 * an action that goes ahead. The failure mode of this function is a missing row, never a send.
 */
async function recordRefusal(args: {
  userId: string;
  source: 'approval' | 'agent';
  asked: string;
  reason: string | null;
  taskId?: string | null;
}): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { data: agent } = await supabase
      .from('kira_agents')
      .select('id')
      .eq('user_id', args.userId)
      .limit(1)
      .maybeSingle();
    await supabase.from('kira_refusals').insert({
      user_id: args.userId,
      kira_agent_id: agent?.id ?? null,
      source: args.source,
      asked: args.asked,
      reason: args.reason,
      task_id: args.taskId ?? null,
    });
  } catch (error) {
    console.error('[swarm] could not record a refusal (ignored):', error);
  }
}

/** approve_task: the owner's yes/no on a drafted task. approve=true executes + closes the loop. */
export async function handleApproveTask(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, error: 'Invalid JSON' });
  }

  const userId = uidFrom(req);
  if (!userId) return json(200, { success: false, error: 'No user identity on this request' });

  const taskId = String(body.task_id || '').trim();
  if (!taskId) return json(400, { success: false, error: 'Missing task_id' });
  // Default to NOT sending: approval must be explicit. Only an explicit truthy approve executes.
  const approve = body.approve === true || body.approve === 'true' || body.approve === 'yes';
  // Recipient email the owner gave at approval (the classifier can't invent one) — lets a send finish.
  const recipientEmail = typeof body.recipient_email === 'string' ? body.recipient_email : undefined;

  // Refuse an address that cannot be an address, BEFORE approving. This is the last gate in front of
  // a send, and the owner spelling his address aloud produced `m-c-m-d-e-n-n-i-s@gmail.com` — which
  // would have been approved, marked sent, and delivered nowhere. Not a failure: a question.
  if (approve && recipientEmail && isUnusableRecipient(recipientEmail)) {
    return json(200, {
      success: true,
      task_id: taskId,
      status: 'awaiting_approval',
      message: recipientPrompt(recipientEmail, recipientConcern(recipientEmail)),
      needs_recipient_email: true,
      confirm_recipient: true,
      done: false,
      sent: false,
      failed: false,
    });
  }

  // A "no" is a decision, and the only one of the two that currently leaves no trace anywhere. The
  // yes produces a sent email, a task row and a completion; the no produces nothing at all, which
  // means the boundary working looks identical to the boundary never having been tested.
  // Awaited so the row is written before the response returns — a floating promise on a serverless
  // runtime means "maybe", which is how the task mirror lost six rows.
  if (!approve) {
    await recordRefusal({
      userId,
      source: 'approval',
      asked: `approve and send task ${taskId}`,
      reason: 'the owner did not approve it',
      taskId,
    });
  }

  try {
    const result = await getSwarmCoordinator().resolveApproval(taskId, userId, approve, { recipientEmail });
    return json(200, {
      success: true,
      task_id: result.taskGroupId,
      status: result.status,
      message: result.message ?? (result.status === 'done' ? 'Done.' : ''),
      // The agent must be able to tell "it went" from "it did not" without inferring it from prose.
      // `done` alone was ambiguous when a task ended any other way, and an agent that guesses tells
      // an owner his email was sent when it was not.
      done: result.status === 'done',
      sent: result.status === 'done',
      failed: result.status === 'failed',
    });
  } catch (e) {
    console.error('[swarm] approve_task failed:', e);
    return json(200, { success: false, error: 'Could not complete that just now.' });
  }
}

/**
 * check_tasks: what has this owner asked for that has not landed, and what closed recently.
 *
 * The missing third verb. She could ask her team to do something and tell them it was drafted, and
 * then had no way to answer "did that quote ever go out?" — so the answer came from the owner's own
 * memory, which is the thing he was delegating. Read-only: it accounts for work, it never moves it.
 */
export async function handleCheckTasks(req: Request): Promise<Response> {
  const userId = uidFrom(req);
  if (!userId) return json(200, { success: false, error: 'No user identity on this request' });

  const ledger = await readTaskLedger(userId);
  return json(200, {
    success: true,
    open_count: ledger.openCount,
    open: ledger.open,
    recently_done: ledger.recentlyDone,
    // Ready to say. If it is empty there is genuinely nothing outstanding — say that, don't pad it.
    summary: ledger.spoken || 'Nothing of yours is outstanding — everything you asked for has landed.',
  });
}

// Small stable non-crypto hash for the idempotency fallback key.
function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}
