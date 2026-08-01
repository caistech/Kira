// app/api/onboarding/session/route.ts
// Lightweight, read-only summary of a completed Stripe Checkout session, so the onboarding page can
// show the owner their email + plan before they set a password. No secrets returned.

import { NextRequest, NextResponse } from 'next/server';

import { getStripe } from '@/lib/billing';
import { DEFAULT_CURRENCY } from '@/lib/valuation/currency';


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
      currency: session.metadata?.val_currency || DEFAULT_CURRENCY,
      gap: session.metadata?.val_gap ? Number(session.metadata.val_gap) : null,
    });
  } catch (error) {
    console.error('[api/onboarding/session] retrieve failed:', error);
    return NextResponse.json({ error: 'Could not load session' }, { status: 500 });
  }
}
