// app/api/beta/peek/route.ts
//
// "Is this code good, and whose is it?" — asked before a password is chosen, so the tester sees the
// account he is about to create rather than typing an address and hoping.
//
// ⚠️ THIS DOES NOT CONSUME THE CODE. Checking and claiming are separate on purpose: a tester who
// opens his invitation link, reads the page and closes the tab must still have a usable code
// tomorrow. Only POST /api/beta/redeem burns one.
//
// ⚠️ IT RETURNS AN EMAIL ADDRESS, which is worth being deliberate about. The caller must already
// hold a valid code to get one, codes carry ~58 bits of entropy from a confusable-free alphabet, and
// the address returned is the one the code was emailed TO — so the only person who can reach it is,
// in practice, the person who already received it. The alternative (masking to `s****@example.com`)
// costs the recognition this screen exists to provide and buys almost nothing.
//
// Every rejection answers the same sentence, so this cannot be used to learn which codes exist. The
// real reason is logged for an operator helping someone on the phone.

import { NextRequest, NextResponse } from 'next/server';

import { peekBetaCode } from '@/lib/billing/beta-codes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REJECTION_MESSAGE =
  'That code is not valid. Check it against the email we sent you — or reply to it and we will send a new one.';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code') ?? '';
  if (!code.trim()) {
    return NextResponse.json({ ok: false, error: 'Enter your invitation code.' }, { status: 400 });
  }

  const result = await peekBetaCode(code);
  if (!result.ok) {
    console.warn(`[api/beta/peek] rejected a code: reason=${result.reason}`);
    // 200, NOT 4xx. A status code is as much of an oracle as a message, and some clients surface a
    // 400 as a scarier failure than the sentence we actually wrote. The `ok` flag is the contract.
    return NextResponse.json({ ok: false, error: REJECTION_MESSAGE });
  }

  return NextResponse.json({ ok: true, email: result.email });
}
