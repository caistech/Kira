// app/api/kira/webhooks/file_manual/route.ts
// file_manual tool → writes the owner's operating manual into his OWN document storage.
//
// Guarded by the shared tool secret; identity server-baked as ?uid, never taken from the model —
// this creates files in a named person's account, so the one thing that must not be model-supplied
// is whose account it is.
//
// THE APPROVAL IS ENFORCED HERE, not in the prompt. The tool description tells her to get an
// explicit yes first; this refuses without one. That split is not belt-and-braces, it is the lesson
// this product has already paid for twice — a rule stated in prose is a request, and record_refusal
// logged the prohibition's own example twenty-four minutes after shipping. A model that decides an
// unapproved write "seemed helpful" cannot get past a server that will not do it.

import { NextResponse } from 'next/server';

import { toolSecretOk } from '@/lib/kira/convai';
import { fileManual } from '@/lib/genome/file-manual';
import type { Audience } from '@/lib/genome/render';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!toolSecretOk(req)) return new Response('Unauthorized', { status: 401 });

  let body: { audience?: unknown; approved?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 });
  }

  // Server-baked at provision time. ElevenLabs does not pass the conversation id to tool webhooks,
  // so identity is in the URL — and for a tool that writes into someone's account it could not be
  // anywhere the model can reach.
  const userId = new URL(req.url).searchParams.get('uid') || '';
  if (!userId) {
    console.error('[file_manual] no uid on the request — refusing to write.');
    return NextResponse.json({ ok: false, message: "I can't file it just now — that's a problem at my end." }, { status: 200 });
  }

  const audience = body.audience === 'owner' || body.audience === 'buyer' ? (body.audience as Audience) : null;
  if (!audience) {
    // Said back to her in the words she should use, rather than as an error. She has to ask him.
    return NextResponse.json({
      ok: false,
      message: "Ask him which copy he wants: his own — which includes his plans and his position — or the one for a buyer, which leaves those out.",
    });
  }

  // NOT `!== false`, and not truthy-coercion. An absent field means she did not ask, and the whole
  // point of this gate is that silence is a no.
  if (body.approved !== true) {
    return NextResponse.json({
      ok: false,
      message: "Tell him what you're about to file and which copy it is, and wait for him to say yes. Then call this again.",
    });
  }

  try {
    const result = await fileManual(userId, audience);
    return NextResponse.json(result);
  } catch (error) {
    // Degrade, don't fake. She reads `message` out, so it must never imply the filing happened.
    console.error('[file_manual] failed:', error);
    return NextResponse.json({ ok: false, message: "I couldn't file it just now — nothing has changed in your documents.", written: 0, total: 0 });
  }
}
