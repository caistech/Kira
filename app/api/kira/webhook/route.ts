// app/api/kira/webhook/route.ts
// ElevenLabs POST-CALL webhook (conversation transcription after a call ends).
//
// Thin mount of the canonical @caistech/elevenlabs-convai post-call handler. The previous
// hand-rolled version wrote to phantom `kira_conversations` / `kira_messages` tables (no
// migration → silent write failures) and never distilled anything into memory. The canonical
// handler writes the conversation + messages to the REAL tables (conversations /
// conversation_messages, mapped in lib/kira/convai.ts), verifies the HMAC signature, and
// processes exactly once (processed_at gate). See lib/kira/convai.ts.

import { kiraConvaiRoutes } from '@/lib/kira/convai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return kiraConvaiRoutes().postCall(req);
}
