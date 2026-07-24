// app/api/checkout/route.ts
//
// Creates a Stripe Checkout subscription session for the Kira business plan. The monthly price is
// a dynamic band derived from the owner's valuation GAP - recomputed here server-side from the
// inputs (never trusted from the client). The full valuation rides in session metadata so the
// post-payment onboarding can persist it to the new account.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { computeValuation, type ValuationInputs } from '@/lib/valuation/model';
import { priceForGap } from '@/lib/valuation/pricing';
import { getCurrency } from '@/lib/valuation/currency';

// Lazily construct Stripe at request time. Constructing at module load throws
// ("Neither apiKey nor config.authenticator provided") during `next build` page-data
// collection when STRIPE_SECRET_KEY isn't present in the build env (e.g. CI).
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});
  return _stripe;
}

// Derive the redirect base from the REQUEST origin so a checkout started on localhost returns to
// localhost (test) and one from prod returns to prod (live) - never a cross-environment bounce.
function baseUrl(request: NextRequest): string {
  return request.headers.get('origin') || request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inputs = body?.inputs as ValuationInputs | undefined;
    const currencyCode = (body?.currency as string) || 'USD';

    if (!inputs || typeof inputs.annualProfit !== 'number' || !inputs.industry) {
      return NextResponse.json({ error: 'Missing valuation inputs' }, { status: 400 });
    }

    // Recompute the gap here - the price must not be forgeable by the client.
    const result = computeValuation(inputs);
    const quote = priceForGap(result.gap);
    const currency = getCurrency(currencyCode);
    const base = baseUrl(request);

    // A gap of zero (or loss-making) has no captured value to price against - send them back.
    if (result.gap <= 0) {
      return NextResponse.json({ error: 'No value gap to price' }, { status: 400 });
    }

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: currency.code.toLowerCase(),
            unit_amount: Math.round(quote.monthly * 100),
            recurring: { interval: 'month' },
            product_data: {
              name: `Kira Business Plan — ${quote.label}`,
              description: 'Your always-on AI partner: talk to Kira and she builds your business systems.',
            },
          },
          quantity: 1,
        },
      ],
      // The valuation travels with the session so onboarding can persist it to the new account.
      metadata: {
        kira_journey: 'business',
        val_inputs: JSON.stringify(inputs),
        val_currency: currency.code,
        val_gap: String(Math.round(result.gap)),
        val_today: String(Math.round(result.today)),
        val_potential: String(Math.round(result.potential)),
        val_walk_away: String(Math.round(result.walkAway)),
        val_sde_multiple: String(result.sdeMultiple),
        val_readiness: String(result.readiness),
        val_industry: inputs.industry.slice(0, 200),
        quoted_monthly: String(quote.monthly),
      },
      subscription_data: {
        // A real free trial so the "start free" promise is honest - no charge today.
        trial_period_days: 7,
        metadata: { kira_journey: 'business' },
      },
      success_url: `${base}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/plan`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[api/checkout] Failed to create session:', error);
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
  }
}
