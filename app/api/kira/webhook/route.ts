// app/api/kira/webhook/route.ts
//
// RETIRED (2026-08-24) — this path is no longer an active ElevenLabs endpoint.
//
// This route served as the post-call webhook during early beta (as a thin pass-through to
// kiraConvaiRoutes().postCall) and earlier still carried its own — wrong-header, wrong-format —
// signature check that rejected every real delivery (see git history for that saga).
//
// The CANONICAL endpoint is now /api/kira/webhooks/post-call (same handler behind it:
// kiraConvaiRoutes().postCall, same HMAC gate inside). All agents were re-pointed to it via
// scripts/provision-existing-agents.mjs --apply, which created a NEW workspace webhook and a
// NEW signing secret (rotated into ELEVENLABS_WEBHOOK_SECRET on Vercel prod+preview).
//
// Per the ConvAI boundary rule, a retired ElevenLabs endpoint must not silently accept or
// silently vanish: it returns a controlled 410 with a pointer to the canonical path, and logs
// loudly so any caller still aimed here is visible in Vercel logs rather than failing dark.
// If you see hits on this route from User-Agent "ElevenLabs/1.0", an agent escaped the
// re-provision — run scripts/provision-existing-agents.mjs --apply again.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  console.warn(
    '[kira-webhook-retired] POST to legacy /api/kira/webhook — canonical endpoint is ' +
      '/api/kira/webhooks/post-call. ua=',
    req.headers.get('user-agent') ?? 'unknown',
  );
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint has moved.',
      canonical: '/api/kira/webhooks/post-call',
    },
    { status: 410, headers: { Location: '/api/kira/webhooks/post-call' } },
  );
}

// Any other verb gets the same treatment — no half-open door.
export async function GET() { return retired(); }
export async function PUT() { return retired(); }
export async function PATCH() { return retired(); }
export async function DELETE() { return retired(); }

function retired() {
  return NextResponse.json(
    { success: false, error: 'This endpoint has moved.', canonical: '/api/kira/webhooks/post-call' },
    { status: 410 },
  );
}
