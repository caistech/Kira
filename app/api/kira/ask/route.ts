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

import { NextResponse } from 'next/server';

import { sendUnansweredRequestAlert } from '@/lib/email/unanswered-request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Long enough for a real question, short enough that the field is not a paste target. */
const MAX_LENGTH = 1000;

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
