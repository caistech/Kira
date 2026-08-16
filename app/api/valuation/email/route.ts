// POST /api/valuation/email — send the owner his own valuation, to his own address.
//
// ⚠️ HE RAN IT ON THE OFFICE COMPUTER. That sentence is the whole feature.
//
//   "There's a Print button and no way to have it sent to me. I ran it on the office computer. I'd
//    want to read it again at home at nine at night when there's nobody about, and the only copy of
//    it is on the machine my bookkeeper uses." — Ray, 2026-08-16
//
// For a man who has told nobody he is selling, "the only copy is on the machine my bookkeeper uses"
// is not an inconvenience — it is a reason to close the tab and not come back. Print is not an
// answer either: printing it puts it on the office printer.
//
// ⚠️ THE ADDRESS IS TYPED, AND NOTHING IS STORED. This is a cold visitor with no account. He gives
// an address, we send that one message, and no record of him is kept — no list, no profile, no
// follow-up. Anything else would be the exact thing he is afraid of, and the acknowledgement on the
// page says so in those words.
//
// It is TRANSACTIONAL, not commercial: he asked for this specific message about his own figures, so
// it carries the identification footer and needs no unsubscribe (`@caistech/email-compliance`'s
// distinction, applied deliberately rather than by omission).

import { NextResponse } from 'next/server';

import { sendEmail } from '@/lib/email/resend';
import { DEFAULT_CURRENCY } from '@/lib/valuation/currency';
import { displayedFigures } from '@/lib/valuation/displayed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Deliberately loose — the point is to catch a typo, not to police an address. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(request: Request) {
  let body: {
    email?: unknown;
    worthToday?: unknown;
    worthPotential?: unknown;
    industry?: unknown;
    currency?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim();
  if (!looksLikeEmail(email)) {
    return NextResponse.json({ error: 'That does not look like an email address.' }, { status: 400 });
  }

  const worthToday = Number(body.worthToday);
  const worthPotential = Number(body.worthPotential);
  if (!Number.isFinite(worthToday) || !Number.isFinite(worthPotential)) {
    return NextResponse.json({ error: 'No figures to send.' }, { status: 400 });
  }

  // ⚠️ THE SAME ROUNDING AS EVERY SCREEN. `displayedFigures` derives the gap FROM the rounded pair,
  // so the email cannot disagree with the page he is looking at — the defect he found twice on one
  // screen, arriving by post.
  const currency = typeof body.currency === 'string' && body.currency ? body.currency : DEFAULT_CURRENCY;
  const figures = displayedFigures({ worthToday, worthPotential }, currency);
  const industry = String(body.industry ?? '').trim();

  const subject = 'Your business valuation';
  const lines = [
    industry ? `Sector used: ${industry}` : '',
    `Worth today: ${figures.todayText}`,
    `Worth once your knowledge is captured: ${figures.potentialText}`,
    `The difference: ${figures.gapText}`,
  ].filter(Boolean);

  const text = [
    'Here are the figures from the valuation you just ran.',
    '',
    ...lines,
    '',
    'These are indicative and based on the answers you gave. They are not an appraisal, and a buyer',
    'will do his own work on them.',
    '',
    'We have not kept your address. This is the only message you will get from us unless you ask for',
    'another one.',
  ].join('\n');

  const html = [
    '<p>Here are the figures from the valuation you just ran.</p>',
    '<ul>',
    ...lines.map((line) => `<li>${escapeHtml(line)}</li>`),
    '</ul>',
    '<p>These are indicative and based on the answers you gave. They are not an appraisal, and a ',
    'buyer will do his own work on them.</p>',
    '<p>We have not kept your address. This is the only message you will get from us unless you ask ',
    'for another one.</p>',
  ].join('');

  try {
    await sendEmail({ to: email, subject, html, text });
  } catch (error) {
    console.error('[valuation/email] send failed:', error);
    return NextResponse.json({ error: 'Could not send it just now. Print or save the page instead.' }, { status: 502 });
  }

  // ⚠️ NOTHING IS WRITTEN ANYWHERE. No row, no list, no attribution. Stated here because the absence
  // of a write is the feature, and a future session adding "just capture the lead while we're here"
  // would break the promise the page makes on this exact screen.
  return NextResponse.json({ ok: true });
}
