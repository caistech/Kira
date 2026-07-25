// app/api/kira/webhooks/save_memory/route.ts
// save_memory tool → canonical handleSaveMemory. Identity + agent binding derived from the
// conversation row. Body: { conversation_id, memory, category? }. See lib/kira/convai.ts.

import { kiraConvaiRoutes, toolSecretOk } from '@/lib/kira/convai';
import { handleKiraSaveMemory } from '@/lib/kira/uid-tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });
  // Server-baked ?uid is the standard; legacy (no uid) falls back to the canonical binding path.
  if (new URL(req.url).searchParams.get('uid')) return handleKiraSaveMemory(req);
  return kiraConvaiRoutes().saveMemory(req);
}
