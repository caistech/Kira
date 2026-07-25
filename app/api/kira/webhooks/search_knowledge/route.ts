// app/api/kira/webhooks/search_knowledge/route.ts
// search_knowledge tool → owned-RAG retrieval. Guarded by the shared tool secret (same as the memory
// tools); identity is derived from the conversation binding inside the handler, never the agent.

import { toolSecretOk } from '@/lib/kira/convai';
import { handleSearchKnowledge } from '@/lib/kira/knowledge-tool';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });
  return handleSearchKnowledge(req);
}
