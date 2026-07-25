// app/api/kira/webhooks/recall_memory/route.ts
// recall_memory tool → canonical handleRecallMemory. Whose memory is read is derived from
// the bound conversation row, never from a tool/agent parameter (closes the cross-tenant
// memory-read hole). See lib/kira/convai.ts.

// recall_memory now runs Kira's merged handler: Mnemo semantic (deep/cross-session) + kira_memory
// (near-term, fail-soft floor). Identity is still derived from the conversation binding. See
// lib/kira/recall.ts. The canonical substring-only recall was missing differently-worded queries.
import { toolSecretOk } from '@/lib/kira/convai';
import { handleKiraRecall } from '@/lib/kira/recall';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });
  return handleKiraRecall(req);
}
