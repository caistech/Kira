// app/api/stripe/webhook/route.ts
// Stripe webhook handler — reconciles SUBSCRIPTION STATE only.
//
// It deliberately does NOT create accounts or provision agents:
//   - Accounts are created by /api/onboarding/complete, which makes a real confirmed auth.users
//     record and lets the handle_new_auth_user trigger link the public.users row. A bare users
//     insert here produced an orphan with no auth_user_id and therefore no way to log in.
//   - Agents are provisioned by /api/kira/create from an approved draft. That is the ONLY path
//     that attaches the memory tools, the continuity prompt, the origin allowlist and the
//     workspace post-call webhook.
//
// This file used to mint agents itself via a copy of the provisioning that stopped being updated
// in Jan 2026: no tools attached (so zero memory loop), no llm pinned, the deprecated
// platform_settings.webhook shape ElevenLabs silently ignores, and a hardcoded webhook-secret
// fallback. It had never actually fired — every agent row in prod carries a draft_id — so it was a
// landmine that would have minted a broken duplicate agent on the first real paid checkout.
// Removed rather than repaired: there must be exactly one provisioning path.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/server';

// Lazily construct Stripe at request time (module-load construction throws during `next build`
// when STRIPE_SECRET_KEY isn't in the build env, e.g. CI).
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});
  return _stripe;
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`[stripe/webhook] Received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[stripe/webhook] Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[stripe/webhook] Error handling event:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

// =============================================================================
// CHECKOUT COMPLETE - record the subscription against an existing account
// =============================================================================

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  console.log(`[stripe/webhook] Checkout complete: ${session.id}`);

  const supabase = createServiceClient();

  const customerEmail = session.customer_details?.email?.toLowerCase();
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!customerEmail) {
    console.error('[stripe/webhook] No customer email in session');
    return;
  }

  // This webhook races /api/onboarding/complete — Stripe frequently delivers before the buyer has
  // finished setting their password, so the account may not exist yet. That is EXPECTED, not an
  // error: onboarding/complete writes the same fields from the same Stripe session. Record the
  // state if the account is here, otherwise no-op and let onboarding own it (degrade, don't fake —
  // and never create a bare users row here, which would orphan the account with no auth_user_id).
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', customerEmail)
    .maybeSingle();

  if (!user) {
    console.log(
      `[stripe/webhook] No account yet for ${customerEmail} — onboarding will record the subscription.`,
    );
    return;
  }

  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'active',
      stripe_customer_id: customerId || null,
      stripe_subscription_id: subscriptionId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('[stripe/webhook] Failed to record subscription:', error);
    return;
  }

  console.log(`[stripe/webhook] ✅ Subscription recorded for ${customerEmail}`);
}

// =============================================================================
// SUBSCRIPTION CANCELED - Deactivate Kira
// =============================================================================

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  console.log(`[stripe/webhook] Subscription canceled: ${subscription.id}`);

  const supabase = createServiceClient();
  const customerId = subscription.customer as string;

  // 'cancelled' (two Ls) is the value the rest of the app types + reads — see the AppUser type in
  // lib/supabase/server.ts and the admin panel. This wrote the US spelling, which no reader matches.
  await supabase
    .from('users')
    .update({ subscription_status: 'cancelled' })
    .eq('stripe_customer_id', customerId);

  // Deactivate their Kira agents
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (user) {
    await supabase
      .from('kira_agents')
      .update({ status: 'inactive' })
      .eq('user_id', user.id);
  }

  console.log(`[stripe/webhook] ✅ Deactivated Kira for customer: ${customerId}`);
}

// =============================================================================
// PAYMENT FAILED
// =============================================================================

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`[stripe/webhook] Payment failed: ${invoice.id}`);

  const supabase = createServiceClient();
  const customerId = invoice.customer as string;

  // Update user status to past_due
  await supabase
    .from('users')
    .update({ subscription_status: 'past_due' })
    .eq('stripe_customer_id', customerId);

  // Could also send a "payment failed" email here
}
