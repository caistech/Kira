// app/api/billing/cancel/route.ts
//
// Cancel, and waive the month in progress.
//
// This is the one promise Kira makes about money — "you are never billed for the month you are in"
// — and until this route existed it was a policy nobody had written down as code. Cancellation was
// delegated wholesale to the Stripe billing portal, which does the opposite: it either ends the
// subscription at period end, so the period completes and IS invoiced, or ends it immediately and
// invoices the accrued usage. Either way the owner gets a bill for the month we said was on us.
//
// Why that matters more here than in most products: the customer is a 60-something owner who has
// often told nobody he is selling, and who was introduced by an advisor putting their own name and
// licence behind the referral. An invoice arriving after he cancelled and was told the month was
// waived is not a support ticket — it is the end of that advisor's willingness to refer anyone.

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAppUser } from '@/lib/auth';
import { cancelSubscriptionWithWaiver } from '@/lib/billing';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
  const user = await getCurrentAppUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  if (!user.stripe_subscription_id) {
    // Nothing to cancel. Saying so plainly beats a Stripe error the owner has to interpret.
    return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
  }

  try {
    const subscription = await cancelSubscriptionWithWaiver(user.stripe_subscription_id);

    // Write the outcome immediately rather than waiting for `customer.subscription.deleted`. The
    // webhook is authoritative and will arrive, but the owner is looking at the screen now, and a
    // page that still says "active" after he pressed cancel is how a second cancellation attempt —
    // or a chargeback — starts.
    const supabase = createServiceClient();
    await supabase
      .from('users')
      .update({ subscription_status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', user.id);

    return NextResponse.json({
      cancelled: true,
      // Stated back to the owner in the response so the confirmation screen can quote the promise
      // rather than paraphrasing it.
      waived: true,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error('[api/billing/cancel] Failed to cancel:', error);
    return NextResponse.json({ error: 'Could not cancel the subscription' }, { status: 500 });
  }
}
