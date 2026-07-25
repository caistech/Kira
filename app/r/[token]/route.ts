// app/r/[token]/route.ts
//
// The introducer's referral link. A broker sends an owner to /r/<token>; this stamps the signed
// first-touch cookie and hands them to the landing page none the wiser.
//
// First touch WINS: if a valid attribution cookie is already present, this does not overwrite it.
// The person who made the introduction is the person who gets paid, not the last link clicked.

import { NextResponse, type NextRequest } from 'next/server';

import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_SCOPE,
  attribution,
  introducerByReferralToken,
  recordClick,
} from '@/lib/introducer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const home = new URL('/', request.url);

  // An unknown or suspended token is not an error the visitor should ever see — they were sent a
  // link by someone they trust. Land them on the site; they simply arrive unattributed.
  const introducer = await introducerByReferralToken(token);
  if (!introducer) {
    return NextResponse.redirect(home);
  }

  const response = NextResponse.redirect(home);
  const existing = request.cookies.get(ATTRIBUTION_COOKIE)?.value;

  if (attribution.shouldWrite(existing)) {
    const touch = {
      scope: ATTRIBUTION_SCOPE,
      referrerId: introducer.id,
      referrerOrgId: null,
      token,
      firstTouchAt: new Date().toISOString(),
    };
    response.cookies.set(ATTRIBUTION_COOKIE, attribution.sign(touch), attribution.cookieOptions());

    // Only record a click when this is a NEW first touch. Re-following the same link shouldn't
    // inflate the introducer's board with duplicates of one person.
    await recordClick(introducer.id);
  }

  return response;
}
