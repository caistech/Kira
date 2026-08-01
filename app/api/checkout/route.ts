// app/api/checkout/route.ts
//
// Creates a Stripe Checkout subscription session for the Kira business plan. The monthly price is
// a dynamic band derived from the owner's valuation GAP - recomputed here server-side from the
// inputs (never trusted from the client). The full valuation rides in session metadata so the
// post-payment onboarding can persist it to the new account.
//
// Session mechanics (trial, card-on-file, price_data shape) come from
// @caistech/subscription-billing so Kira and every other lane-1 product share one billing
// lifecycle. The PRICE stays here - it is Kira's business logic, not the package's.

import { createSubscriptionCheckoutSession } from '@caistech/subscription-billing';
import { NextRequest, NextResponse } from 'next/server';

import { getStripe, METER_EVENT_NAME, PRICE_LOOKUP_PREFIX } from '@/lib/billing';
import { getCurrency, DEFAULT_CURRENCY } from '@/lib/valuation/currency';
import { computeValuation, type ValuationInputs } from '@/lib/valuation/model';
import { priceForGap } from '@/lib/valuation/pricing';

// Derive the redirect base from the REQUEST origin so a checkout started on localhost returns to
// localhost (test) and one from prod returns to prod (live) - never a cross-environment bounce.
function baseUrl(request: NextRequest): string {
  return request.headers.get('origin') || request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inputs = body?.inputs as ValuationInputs | undefined;
    const currencyCode = (body?.currency as string) || DEFAULT_CURRENCY;

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

    // The valuation travels with the session so onboarding can persist it to the new account.
    const valuationMetadata = {
      kira_journey: 'business',
      val_inputs: JSON.stringify(inputs),
      val_currency: currency.code,
      // WHAT HE ASKED TO BE CALLED, from the valuation intro — the only place the product hears his
      // name from HIM. It rides here so the account is created with it instead of with the name on
      // the card, which is what onboarding/complete used to fall back to. The cardholder and the
      // owner are frequently not the same person, and the name is baked into her prompt at provision
      // and never revisited, so getting it from the payment method is wrong once and then wrong for
      // good. Trimmed and bounded: Stripe metadata values are capped at 500 characters.
      val_first_name: String((body?.firstName as string | undefined) ?? '').trim().slice(0, 40),
      val_gap: String(Math.round(result.gap)),
      val_today: String(Math.round(result.today)),
      val_potential: String(Math.round(result.potential)),
      val_walk_away: String(Math.round(result.walkAway)),
      val_sde_multiple: String(result.sdeMultiple),
      val_readiness: String(result.readiness),
      val_industry: inputs.industry.slice(0, 200),
      quoted_monthly: String(quote.monthly),
    };

    const session = await createSubscriptionCheckoutSession({
      stripe: getStripe(),
      // ARREARS, not a trial. The month is owed from day one and invoiced when the period closes;
      // cancel before that bill falls due and the month is waived. See lib/billing/arrears.ts.
      //
      // There is deliberately NO `trialDays` here, and the package throws if one is passed with
      // this shape. Kira ran `trialDays: 30` until this change, which is a different contract
      // wearing the same dates: it gave month one away and then billed a month in advance.
      lineItem: {
        arrears: true,
        meterEventName: METER_EVENT_NAME,
        lookupKeyPrefix: PRICE_LOOKUP_PREFIX,
        currency: currency.code,
        unitAmount: Math.round(quote.monthly * 100),
        interval: 'month',
        productName: `Kira Business Plan — ${quote.label}`,
        productDescription:
          'Your always-on AI partner: talk to Kira and she builds your business systems.',
      },
      // Card captured at signup. `cardAtSignup` defaults true in the package and is stated
      // explicitly because it is a commercial decision, not a default to inherit silently: without
      // it Stripe creates the subscription with no payment method and the first charge fails when
      // the period closes, after a month of use.
      cardAtSignup: true,
      successUrl: `${base}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${base}/plan`,
      metadata: valuationMetadata,
      // Session metadata only rides on checkout.session.completed; subscription metadata rides on
      // every later lifecycle event, which is what the webhook reducer needs to identify the owner.
      subscriptionMetadata: { kira_journey: 'business', quoted_monthly: String(quote.monthly) },
      allowPromotionCodes: true,
      billingAddressCollection: 'auto',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[api/checkout] Failed to create session:', error);
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
  }
}
