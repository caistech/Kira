// lib/kira/recall.ts
// Kira's recall_memory handler — Mnemo-semantic + kira_memory, merged (#7).
//
// The canonical recall is substring-only over kira_memory, so a naturally-worded question ("what
// happened on that job six weeks ago") returns nothing even when the fact is stored. This handler
// adds the Mnemo semantic lane on top:
//   1. Mnemo semantic search (the deep/cross-session layer) — finds differently-worded recurrences.
//   2. kira_memory substring (the near-term layer) — catches facts written THIS session, not yet
//      distilled into Mnemo, and is the fail-soft floor when Mnemo is unconfigured/down.
// Merged + deduped. Identity is derived from the conversation binding (never the agent), exactly as
// the memory tools do — so a caller cannot read another user's memory.

import { createServiceClient } from '@/lib/supabase/server';
import { mnemoSearch, mnemoEnabled } from '@/lib/kira/mnemo';

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export async function handleKiraRecall(req: Request): Promise<Response> {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, error: 'Invalid JSON' });
  }

  const query = String(body.query || '').trim();
  if (!query) {
    return json(400, { success: false, error: 'Missing query' });
  }

  const supabase = createServiceClient();

  // Identity is SERVER-BAKED into the tool URL at provision time (?uid=<user_id>), because
  // ElevenLabs does NOT pass the conversation id to server-tool webhooks — the agent only sends the
  // LLM-filled params (proven from the live conversation record). Kira provisions one agent per
  // user, so the owner is known at provision and baked in; the agent never has to identify anyone.
  // Fall back to the conversation binding for any legacy caller that still sends conversation_id.
  const url = new URL(req.url);
  let userId = url.searchParams.get('uid') || '';
  let agentId: string | null = null;
  if (!userId) {
    const conversationId = String(body.conversation_id || '');
    if (conversationId) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('user_id, agent_id')
        .eq('elevenlabs_conversation_id', conversationId)
        .single();
      userId = (conv?.user_id as string) || '';
      agentId = (conv?.agent_id as string) || null;
    }
  }
  if (!userId) {
    return json(200, { success: false, error: 'No user identity on this request' });
  }
  const conv = { user_id: userId, agent_id: agentId };

  // 1. Mnemo semantic (deep) — the layer that makes cross-session, differently-worded recall work.
  const semantic = mnemoEnabled() ? await mnemoSearch(conv.user_id as string, query, 6) : [];

  // 2. kira_memory substring (near-term + fail-soft floor). Scoped by user (and agent when present).
  let q = supabase
    .from('kira_memory')
    .select('content, importance, created_at')
    .eq('user_id', conv.user_id)
    .eq('active', true)
    .ilike('content', `%${query}%`)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(6);
  if (conv.agent_id) q = q.eq('agent_id', conv.agent_id);
  const { data: nearTerm } = await q;

  // Merge: semantic first (usually the better hits), then any near-term rows not already covered.
  const seen = new Set<string>();
  const memories: { content: string }[] = [];
  for (const content of semantic) {
    const k = norm(content);
    if (k && !seen.has(k)) { seen.add(k); memories.push({ content }); }
  }
  for (const row of nearTerm ?? []) {
    const content = String((row as any).content || '');
    const k = norm(content);
    if (k && !seen.has(k)) { seen.add(k); memories.push({ content }); }
  }

  const capped = memories.slice(0, 8);
  if (capped.length === 0) {
    return json(200, { success: true, found: 0, memories: [], summary: `I don't have anything stored about "${query}" yet.` });
  }
  return json(200, {
    success: true,
    found: capped.length,
    memories: capped,
    summary: `Recalled ${capped.length} relevant thing(s) about "${query}".`,
  });
}
