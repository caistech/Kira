// app/api/kira/webhook/route.ts
//
// Thin pass-through to kiraConvaiRoutes().postCall.
//
// ⚠️ WHY THERE IS NO SIGNATURE VERIFICATION HERE — AND THAT IS THE FIX, NOT AN OMISSION.
//
// This route used to verify the post-call webhook itself: it required an
// `X-ElevenLabs-Signature` header and checked `HMAC(secret, rawBody)` against it. Both halves were
// wrong, so EVERY real ElevenLabs post-call delivery was rejected before the real handler ran:
//
//   1. WRONG HEADER. ElevenLabs signs post-call webhooks with `elevenlabs-signature`
//      (see @caistech/elevenlabs-convai dist/routes.js:182, which reads exactly that header).
//      `X-ElevenLabs-Signature` never exists on a real request, so this route returned
//      400 "Missing required headers" on every production call — the memory never saved, the
//      debrief never ran, and the beta tester's conversation vanished. Production logs show a
//      steady stream of these 400s from the User-Agent "ElevenLabs/1.0".
//
//   2. WRONG FORMAT. Even with the right header, the check hashed the bare body, while ElevenLabs'
//      scheme is a signed timestamp envelope: `t=<unix>,v0=<hex>` where v0 =
//      HMAC-SHA256(secret, `${timestamp}.${rawBody}`). A bare-body digest can never match.
//
// The real verification lives INSIDE postCall (@caistech/elevenlabs-convai routes.js): it reads the
// raw body itself, verifies `elevenlabs-signature` against ELEVENLABS_WEBHOOK_SECRET with the
// correct envelope format and replay window (verifyWebhookSignature), refuses unsigned calls when a
// secret is configured, and only then dispatches to handlePostCallWebhook. Duplicating that here
// meant two checks that disagreed; the weaker, wrong one won because it sat in front.
//
// Rule 19 (post-call payloads must carry a valid HMAC signature) is still enforced — by the one
// implementation of it that actually matches what ElevenLabs sends.

import { kiraConvaiRoutes } from '@/lib/kira/convai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return kiraConvaiRoutes().postCall(req);
}
