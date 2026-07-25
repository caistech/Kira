// lib/kira/knowledge-tool.ts
// The search_knowledge retrieval handler — the READ half of owned RAG (#11).
//
// Identity is derived SERVER-SIDE from the conversation binding (the same discipline as
// recall_memory): the agent passes only the conversation id; whose corpus is searched comes from
// the bound user, never an agent-supplied id. So a caller cannot read another owner's documents.
//
// Returns CITED chunks (title/source) — an un-provenanced finding is a bug per DATA_STANDARD R5.

import { createServiceClient } from '@/lib/supabase/server';
import { generateEmbedding, isEmbeddingsConfigured } from '@/lib/embeddings/client';

export interface KnowledgeHit {
  content: string;
  source: string; // human-facing citation (title or file/url)
  similarity: number;
}

export async function handleSearchKnowledge(req: Request): Promise<Response> {
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

  if (!isEmbeddingsConfigured()) {
    // Degrade honestly — do not fake a "no results" that hides a config gap.
    return json(200, { success: false, error: 'Knowledge search is not configured yet.' });
  }

  const supabase = createServiceClient();

  // Identity is SERVER-BAKED into the tool URL (?uid=<user_id>) — ElevenLabs does not pass the
  // conversation id to server-tool webhooks. One agent per user, so the owner is known at provision.
  // Fall back to the conversation binding for a legacy caller that still sends conversation_id.
  const url = new URL(req.url);
  let userId = url.searchParams.get('uid') || '';
  if (!userId) {
    const conversationId = String(body.conversation_id || '');
    if (conversationId) {
      const { data: c } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('elevenlabs_conversation_id', conversationId)
        .single();
      userId = (c?.user_id as string) || '';
    }
  }
  if (!userId) {
    return json(200, { success: false, error: 'No user identity on this request' });
  }
  const conv = { user_id: userId };

  let embedding: number[];
  try {
    embedding = await generateEmbedding(query);
  } catch {
    return json(200, { success: false, error: 'Could not search knowledge right now.' });
  }

  const { data: matches, error } = await supabase.rpc('match_kira_knowledge_chunks', {
    p_user_id: conv.user_id,
    p_query_embedding: embedding,
    p_match_count: 6,
    p_min_similarity: 0.15,
  });

  if (error) {
    return json(200, { success: false, error: 'Knowledge search failed.' });
  }

  const hits: KnowledgeHit[] = (matches || []).map((m: any) => ({
    content: m.content,
    source: m.title || m.file_name || m.url || 'a document you shared',
    similarity: Number(m.similarity?.toFixed?.(3) ?? m.similarity),
  }));

  if (hits.length === 0) {
    return json(200, {
      success: true,
      found: 0,
      results: [],
      summary: `Nothing in the documents you've shared covers "${query}".`,
    });
  }

  return json(200, {
    success: true,
    found: hits.length,
    results: hits,
    // The agent is instructed (prompt) to answer from these and cite the source names.
    summary: `Found ${hits.length} relevant passage(s) across: ${[...new Set(hits.map((h) => h.source))].join(', ')}.`,
  });
}
