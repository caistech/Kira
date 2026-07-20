// app/api/kira/webhooks/save_memory/route.ts
// save_memory tool → canonical handleSaveMemory. Identity + agent binding derived from the
// conversation row. Body: { conversation_id, memory, category? }. See lib/kira/convai.ts.

import { kiraConvaiRoutes } from '@/lib/kira/convai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return kiraConvaiRoutes().saveMemory(req);
}
