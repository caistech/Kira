// lib/kira/uid-tools.ts
// save_memory + get_conversation_context, resolved from the server-baked ?uid (#6) — the same
// identity model as recall_memory / search_knowledge. ElevenLabs does not pass the conversation id
// to server-tool webhooks, so these two also take the owner from ?uid (baked per-agent at provision)
// rather than a conversation binding the agent can't supply. This makes the agent's OWN mid-call
// context-fetch and fact-saving work, not just the page-rendered welcome-back opener.

import { createServiceClient } from '@/lib/supabase/server';
import { mnemoAdd } from '@/lib/kira/mnemo';

const uidFrom = (req: Request) => new URL(req.url).searchParams.get('uid') || '';
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const VALID_MEMORY_TYPES = ['context', 'preference', 'goal', 'decision', 'insight', 'fact'];

/** save_memory — persist a fact the agent chose to remember mid-call, keyed by the baked uid. */
export async function handleKiraSaveMemory(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { success: false, error: 'Invalid JSON' }); }

  const uid = uidFrom(req);
  const content = String(body.memory || body.content || '').trim();
  if (!uid) return json(200, { success: false, error: 'No user identity on this request' });
  if (!content) return json(400, { success: false, error: 'Missing memory content' });

  const category = String(body.category || body.memory_type || 'context');
  const memoryType = VALID_MEMORY_TYPES.includes(category) ? category : 'context';
  const importance = Number(body.importance) || 6;

  const supabase = createServiceClient();
  // One agent per user — link the fact to it so recall's agent-scoped query finds it.
  const { data: agent } = await supabase
    .from('kira_agents')
    .select('id')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from('kira_memory').insert({
    user_id: uid,
    kira_agent_id: agent?.id ?? null,
    agent_id: agent?.id ?? null,
    memory_type: memoryType,
    content,
    importance,
  });
  if (error) return json(200, { success: false, error: 'Failed to save memory' });

  // Dual-write to Mnemo (the semantic lane) so an explicit mid-call save is deep-recallable too.
  await mnemoAdd(uid, [content]);
  return json(200, { success: true });
}

/** get_conversation_context — return the welcome-back context for the baked uid's owner. */
export async function handleKiraContext(req: Request): Promise<Response> {
  const uid = uidFrom(req);
  if (!uid) return json(200, { has_history: false });

  const supabase = createServiceClient();
  // Find the user's genuinely most-recent conversation ACROSS all their agents (a user can have more
  // than one), and take context from that conversation's agent — otherwise "newest agent" ≠ "agent
  // that holds the last conversation" and we'd report no history when there is some.
  const { data: lastConv } = await supabase
    .from('conversations')
    .select('kira_agent_id, created_at, last_message_at, started_at')
    .eq('user_id', uid)
    .in('status', ['active', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lastConv?.kira_agent_id) return json(200, { has_history: false });

  const { data: ctx } = await supabase.rpc('get_conversation_context', {
    p_agent_id: lastConv.kira_agent_id,
    p_user_id: uid,
    p_message_limit: 10,
  });
  return json(200, ctx || { has_history: false });
}
