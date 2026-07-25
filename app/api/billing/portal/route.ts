// app/api/billing/portal/route.ts
//
// Opens the Stripe billing portal for the signed-in owner: update the card, see invoices, cancel.
//
// Kira captures a card at signup and charges on day 30, and until now had no self-serve way to
// change or cancel that — which turns "I want to stop paying" into a support email, and a support
// email nobody answers into a chargeback.

import { createBillingPortalSession } from '@caistech/subscription-billing';
import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAppUser } from '@/lib/auth';
import { getStripe } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCurrentAppUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  if (!user.stripe_customer_id) {
    // No Stripe customer means they never checked out — there is nothing to manage, and saying so
    // is more useful than a portal error page.
    return NextResponse.json({ error: 'No subscription to manage' }, { status: 400 });
  }

  const base =
    request.headers.get('origin') ||
    request.nextUrl.origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';

  try {
    const session = await createBillingPortalSession({
      stripe: getStripe(),
      customerId: user.stripe_customer_id,
      returnUrl: `${base}/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[api/billing/portal] Failed to open portal:', error);
    return NextResponse.json({ error: 'Could not open billing portal' }, { status: 500 });
  }
}
