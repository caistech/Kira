// app/api/kira/webhooks/recall_memory/route.ts
// recall_memory tool → canonical handleRecallMemory. Whose memory is read is derived from
// the bound conversation row, never from a tool/agent parameter (closes the cross-tenant
// memory-read hole). See lib/kira/convai.ts.

import { kiraConvaiRoutes } from '@/lib/kira/convai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return kiraConvaiRoutes().recallMemory(req);
}
