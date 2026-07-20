// app/api/kira/webhooks/start_conversation/route.ts
// get_conversation_context tool → canonical handleStartConversation. Creates/binds the
// conversation row (server-derived identity via resolveSession) and returns returning-user
// context. See lib/kira/convai.ts.

import { kiraConvaiRoutes, toolSecretOk } from '@/lib/kira/convai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });
  return kiraConvaiRoutes().startConversation(req);
}
