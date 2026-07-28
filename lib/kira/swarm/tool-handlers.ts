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
import { createServiceClient } from '@/lib/supabase/server';

/** True when dispatch is going to the orchestrator rather than Kira's own local stub. */
function usingRemoteBrain(): boolean {
  const adapter = (process.env.KIRA_SWARM_ADAPTER || 'local').toLowerCase();
  return adapter !== 'local';
}

/**
 * Record a dispatch that could not be done, in KIRA's own table.
 *
 * The local stub writes its own row; the orchestrator writes to a DIFFERENT Supabase project. So
 * the moment dispatch moved to the orchestrator, every operator surface reading kira_tasks went
 * quietly blind — /admin/asked-for would sit showing stale rows while real requests arrived
 * somewhere it never looks, which reads as "nobody is asking for anything" and is the worst
 * possible thing for a queue whose entire job is to tell you what to build.
 *
 * One table serves the owner's and the operator's surfaces whichever brain did the work. Fail-soft:
 * this runs inside a live voice call and is the least important thing happening in it.
 */
async function mirrorUndoneTask(args: {
  userId: string;
  intentId: string;
  utterance: string;
  status: 'unsupported' | 'failed';
  summary: string | null;
  handledBy: string;
}): Promise<void> {
  if (!usingRemoteBrain()) return; // the local stub already wrote it — don't double-record
  try {
    await createServiceClient().from('kira_tasks').insert({
      user_id: args.userId,
      intent_id: args.intentId,
      kind: 'unsupported',
      status: args.status,
      utterance: args.utterance,
      summary: args.summary,
      handled_by: args.handledBy,
    });
  } catch (error) {
    console.error('[swarm] could not mirror an undone task (ignored):', error);
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
    if (result.status === 'unsupported') {
      const classify = (result.draft?.artifact as { classify?: { reason_if_unsupported?: string } } | undefined)
        ?.classify;
      void sendUnansweredRequestAlert({
        utterance,
        reason: classify?.reason_if_unsupported ?? result.draft?.summary ?? null,
        ownerUserId: userId,
        status: 'unsupported',
      });
    }

    const art = (result.draft?.artifact ?? {}) as Record<string, unknown>;
    const isSend = result.draft?.kind === 'email' || result.draft?.kind === 'quote';
    const needsRecipientEmail = isSend && !art.recipient_email;
    return json(200, {
      success: true,
      task_id: result.taskGroupId,
      status: result.status,
      // What the agent reads back to the owner before asking to send.
      summary: result.draft?.summary ?? result.message ?? '',
      preview: result.draft?.preview ?? '',
      message: result.message ?? '',
      needs_approval: result.status === 'awaiting_approval',
      needs_recipient_email: needsRecipientEmail,
      recipient_name: (art.recipient_name as string) ?? null,
    });
  } catch (e) {
    console.error('[swarm] dispatch_task failed:', e);
    return json(200, { success: false, error: 'Could not start that task right now.' });
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

// Small stable non-crypto hash for the idempotency fallback key.
function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}
