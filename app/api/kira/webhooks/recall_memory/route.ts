// app/api/kira/webhooks/recall_memory/route.ts
// recall_memory tool → canonical handleRecallMemory. Whose memory is read is derived from
// the bound conversation row, never from a tool/agent parameter (closes the cross-tenant
// memory-read hole). See lib/kira/convai.ts.

import { kiraConvaiRoutes, toolSecretOk } from '@/lib/kira/convai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });
  return kiraConvaiRoutes().recallMemory(req);
}
