// app/api/onboarding/session/route.ts
// Lightweight, read-only summary of a completed Stripe Checkout session, so the onboarding page can
// show the owner their email + plan before they set a password. No secrets returned.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Lazily construct Stripe at request time (module-load construction throws during `next build`
// when STRIPE_SECRET_KEY isn't in the build env, e.g. CI).
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});
  return _stripe;
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!sessionId) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === 'paid' || session.status === 'complete';
    return NextResponse.json({
      paid,
      email: session.customer_details?.email || null,
      monthly: session.metadata?.quoted_monthly ? Number(session.metadata.quoted_monthly) : null,
      currency: session.metadata?.val_currency || 'USD',
      gap: session.metadata?.val_gap ? Number(session.metadata.val_gap) : null,
    });
  } catch (error) {
    console.error('[api/onboarding/session] retrieve failed:', error);
    return NextResponse.json({ error: 'Could not load session' }, { status: 500 });
  }
}
