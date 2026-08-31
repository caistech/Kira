// POST /api/kira/ask — a question typed on the PUBLIC page, by someone with no account.
//
// WHY THIS EXISTS. The landing page carries the voice widget, and the widget falls back to a text
// box whenever voice is not connected — no microphone, permission declined, a browser that will not
// do WebRTC. That fallback is `onTextFallbackSubmit`, which the widget calls with optional chaining
// and then clears the input REGARDLESS. Ship the box without a handler and the question is
// swallowed: input cleared, nothing sent, no answer, no error.
//
// A tester did exactly that, and the question he typed was the one this product exists to answer:
// "Who else can see what I tell you? My staff don't know I'm selling." It went into a hole. For a
// product whose whole promise is that it remembers what you tell it, visibly forgetting the first
// thing a stranger says is the worst available first impression.
//
// SO THIS IS DELIBERATELY NOT AN ANSWERING ENDPOINT. It does not put a model in front of an
// anonymous visitor — that is a prompt-injection surface and a cost centre reachable by anyone with
// the URL. It does the honest thing instead: records the question, alerts the operator, and returns
// a receipt the page shows. "We have this and a human will read it" is true, checkable, and much
// better than a fabricated answer.
//
// @machine-callable

import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { isAutomatedProbe, sendUnansweredRequestAlert } from '@/lib/email/unanswered-request';
import { haltState } from '@/lib/kill-switch';
import { createServiceClientV2 } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Long enough for a real question, short enough that the field is not a paste target. */
const MAX_LENGTH = 1000;

/**
 * GET — a signed URL for the PUBLIC landing agent. The voice half of the same public ask surface.
 *
 * SEPARATE AGENT FROM `/api/kira/start`, and that is the fix. `/start` mints a URL for the SETUP
 * agent, whose job is a two-minute intake — name, location, journey, objective, save the draft. The
 * landing page was calling it, so a sixty-something who clicked "Ask Kira anything" met an agent
 * whose own prompt says "You are NOT a coach, advisor, or problem-solver. You're an intake form with
 * a friendly voice", instructed not to explore his problem and to answer questions with "That's
 * exactly what your Kira is for! Let me just grab your details."
 *
 * The page invited a conversation the agent was told to refuse — worse than silence, because silence
 * reads as a bug and this reads as the product.
 *
 * It was also silent: that agent's `first_message` was EMPTY, so it connected and waited for the
 * visitor to speak. Nothing was ever said, and eight seconds later the text fallback told him his
 * browser had no microphone, which may not have been true.
 *
 * Both routes stay. They are different conversations and now have different agents, so a change to
 * one cannot silently alter the other.
 *
 * NO JOURNEY PARAMETER, unlike `/start`: a visitor asking what this is has not chosen a path yet,
 * and making him choose one before he can ask a question is the same mistake in miniature.
 */
export async function GET() {
  // Same chokepoint as /start: a signed URL is permission to begin talking, so refusing it stops new
  // conversations without a redeploy. The reason is not returned — it can carry operator detail.
  const halt = await haltState('conversations');
  if (halt.halted) {
    console.warn('[kira/ask] kill switch refused a landing conversation:', halt.scope);
    return NextResponse.json({ error: 'Kira is briefly unavailable. Please try again shortly.' }, { status: 503 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.KIRA_LANDING_AGENT_ID;

  // FAIL LOUDLY RATHER THAN FALL BACK TO THE SETUP AGENT. A fallback would be worse than an error:
  // the page would appear to work while serving the intake agent — precisely the state this exists
  // to end, and indistinguishable from working when viewed from outside.
  if (!apiKey || !agentId) {
    console.error('[kira/ask] ELEVENLABS_API_KEY or KIRA_LANDING_AGENT_ID missing — refusing to fall back.');
    return NextResponse.json({ error: 'Voice is not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { 'xi-api-key': apiKey } },
    );
    if (!res.ok) {
      console.error(`[kira/ask] signed URL failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
      return NextResponse.json({ error: 'Could not start the conversation' }, { status: 502 });
    }
    const { signed_url: signedUrl } = (await res.json()) as { signed_url?: string };
    if (!signedUrl) return NextResponse.json({ error: 'Could not start the conversation' }, { status: 502 });

    // no-store: a signed URL is a short-lived credential and must never sit in a shared cache.
    return NextResponse.json({ signedUrl }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[kira/ask] signed URL threw:', error);
    return NextResponse.json({ error: 'Could not start the conversation' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  let question = '';
  try {
    const body = await request.json();
    question = String(body?.question ?? '').trim().slice(0, MAX_LENGTH);
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not read that.' }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json({ ok: false, error: 'No question.' }, { status: 400 });
  }

  // Our own CI probe drives this box twenty times a run against production. It is not a person, so
  // it gets no row in the build queue and no mail to three operators — see isAutomatedProbe.
  if (isAutomatedProbe(question)) {
    return NextResponse.json({ ok: true });
  }

  // RECORDED BEFORE IT IS MAILED, because until 2026-08-10 it was only ever mailed.
  //
  // This endpoint wrote nothing anywhere. The alert email was the entire record — so a question
  // suppressed by the throttle was gone for good, and the email invited the reader to "See the
  // build queue →" for an item that had never been added to it. `kira_tasks.user_id` is now
  // nullable, and NULL means exactly what happened: asked by a visitor with no account.
  //
  // Fail-soft, and ordered first on purpose: if only one of the two can happen, the durable record
  // is worth more than the notification, because the notification can be reconstructed from it and
  // not the other way round.
  try {
    const { error } = await createServiceClientV2().from('kira_tasks').insert({
      user_id: null,
      intent_id: `public-ask:${randomUUID()}`,
      kind: 'unsupported',
      status: 'unsupported',
      utterance: question,
      summary: 'Asked on the public page, by a visitor with no account',
      handled_by: 'public-ask',
    });
    if (error) throw error;
  } catch (error) {
    console.error('[api/kira/ask] could not record the ask, continuing to alert:', error);
  }

  // FAIL-SOFT ON THE ALERT, NOT ON THE RECEIPT. If the mail fails, the visitor still gets told his
  // question landed — because from where he is sitting it did, and a 500 here would reproduce the
  // exact silence this endpoint was built to end. The failure goes to the log, where it belongs.
  try {
    await sendUnansweredRequestAlert({
      utterance: question,
      reason: 'asked on the public page, no account',
      status: 'unsupported',
    });
  } catch (error) {
    console.error('[api/kira/ask] alert failed, receipt still issued:', error);
  }

  return NextResponse.json({ ok: true });
}
