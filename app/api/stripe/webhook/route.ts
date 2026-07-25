// app/api/stripe/webhook/route.ts
// Stripe webhook handler — reconciles SUBSCRIPTION STATE only.
//
// The lifecycle is @caistech/subscription-billing: signature verify → idempotent claim on
// event.id → out-of-order guard against users.last_stripe_event_at → normalized state → applied
// through the Supabase adapter in lib/billing. What used to live here was a hand-rolled switch
// that was neither idempotent nor ordering-safe, so a Stripe redelivery double-applied and a
// late-arriving event could resurrect cancelled state.
//
// It deliberately does NOT create accounts or provision agents:
//   - Accounts are created by /api/onboarding/complete, which makes a real confirmed auth.users
//     record and lets the handle_new_auth_user trigger link the public.users row. A bare users
//     insert here produced an orphan with no auth_user_id and therefore no way to log in.
//   - Agents are provisioned by /api/kira/create from an approved draft. That is the ONLY path
//     that attaches the memory tools, the continuity prompt, the origin allowlist and the
//     workspace post-call webhook.

import { handleSubscriptionWebhook } from '@caistech/subscription-billing';
import { NextRequest, NextResponse } from 'next/server';

import {
  getIdempotencyStore,
  getStripe,
  getSubscriptionAdapter,
  stripeWebhookSecret,
} from '@/lib/billing';

export async function POST(request: NextRequest) {
  // Must be the RAW body — parsing and re-stringifying fails signature verification.
  const rawBody = await request.text();

  const result = await handleSubscriptionWebhook(
    {
      stripe: getStripe(),
      webhookSecret: stripeWebhookSecret(),
      adapter: getSubscriptionAdapter(),
      idempotency: getIdempotencyStore(),
      log: (message, meta) => console.log(`[stripe/webhook] ${message}`, meta ?? {}),
    },
    rawBody,
    request.headers.get('stripe-signature'),
  );

  return NextResponse.json(result.body, { status: result.status });
}
