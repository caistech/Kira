// lib/kira/swarm/tool-handlers.ts
// The voice-tool entry points into the doing-slice. The agent calls dispatch_task when the owner
// asks for something done; it drafts and returns the summary so the agent can read it back and ask
// for approval. The agent calls approve_task with the returned task_id once the owner says yes.
//
// Identity is server-baked (?uid) exactly like the memory + knowledge tools — ElevenLabs never
// passes the conversation id to a server tool. Nothing is ever sent without the owner's approval:
// dispatch only drafts; approve_task(approve=true) is the only path that executes.

import { getSwarmCoordinator } from '@/lib/kira/swarm';

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
    return json(200, {
      success: true,
      task_id: result.taskGroupId,
      status: result.status,
      // What the agent reads back to the owner before asking to send.
      summary: result.draft?.summary ?? result.message ?? '',
      preview: result.draft?.preview ?? '',
      message: result.message ?? '',
      needs_approval: result.status === 'awaiting_approval',
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

  try {
    const result = await getSwarmCoordinator().resolveApproval(taskId, userId, approve);
    return json(200, {
      success: true,
      task_id: result.taskGroupId,
      status: result.status,
      message: result.message ?? (result.status === 'done' ? 'Done.' : ''),
      done: result.status === 'done',
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
