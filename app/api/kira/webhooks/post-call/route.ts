// app/api/kira/webhooks/post-call/route.ts
//
// CANONICAL ElevenLabs post-call endpoint (ConvAI HTTP/data boundary).
//
// Signature verification does NOT live here on purpose: it lives INSIDE
// kiraConvaiRoutes().postCall (@caistech/elevenlabs-convai routes.ts), which reads the RAW
// request body, verifies the `elevenlabs-signature` envelope (t=<unix>,v0=HMAC-SHA256(
// secret, `${timestamp}.${rawBody}`)) against ELEVENLABS_WEBHOOK_SECRET with a replay
// window, refuses unsigned calls when a secret is configured, and only then dispatches to
// handlePostCallWebhook — which derives user_id/agent_id from the existing conversation
// binding, never from caller-supplied params. See lib/kira/convai.ts.
//
// MIGRATION NOTE (2026-08-24): this is the endpoint ElevenLabs' workspace webhook is bound
// to. The legacy alias /api/kira/webhook served this role during the beta and was retired
// to a controlled 410 once deliveries were confirmed landing here — do not re-point agents
// back to it; re-provision via scripts/provision-existing-agents.mjs instead.

import { kiraConvaiRoutes } from '@/lib/kira/convai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return kiraConvaiRoutes().postCall(req);
}
