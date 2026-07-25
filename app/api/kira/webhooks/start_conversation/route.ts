// app/api/kira/webhooks/start_conversation/route.ts
// get_conversation_context tool → canonical handleStartConversation. Creates/binds the
// conversation row (server-derived identity via resolveSession) and returns returning-user
// context. See lib/kira/convai.ts.

import { kiraConvaiRoutes, toolSecretOk } from '@/lib/kira/convai';
import { handleKiraContext } from '@/lib/kira/uid-tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });
  // When the tool carries the server-baked ?uid (the standard now), resolve the welcome-back context
  // from it — ElevenLabs doesn't pass the conversation/agent id. Legacy callers (no uid) fall back
  // to the canonical binding path.
  if (new URL(req.url).searchParams.get('uid')) return handleKiraContext(req);
  return kiraConvaiRoutes().startConversation(req);
}
