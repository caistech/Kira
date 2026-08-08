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
import { getCurrentAppUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

import { getStripe, METER_EVENT_NAME, PRICE_LOOKUP_PREFIX } from '@/lib/billing';
import { formatCheckoutPrice, gstApplies, gstTaxRateIds } from '@/lib/billing/tax';
import { getCurrency, DEFAULT_CURRENCY } from '@/lib/valuation/currency';
import { computeValuation, type ValuationInputs } from '@/lib/valuation/model';
import { priceForProfit } from '@/lib/valuation/pricing';

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

    // IS THE PERSON BUYING ALREADY SIGNED IN?
    //
    // `/onboarding` is the NEW-ACCOUNT path: it creates the account from the Stripe session and asks
    // him to set a password. Sending an owner who is already signed in through it is why /plan told
    // a tester "you set your password and meet Kira right after" an hour after he had set it, and
    // why coming back from checkout dumped him at a sign-in box rather than his own dashboard.
    //
    // A signed-in buyer has an account already; the only thing checkout has to do for him is take
    // the subscription and put him back where he was.
    const signedInUser = await getCurrentAppUser();

    // Recompute the gap here - the price must not be forgeable by the client.
    const result = computeValuation(inputs);
    const quote = priceForProfit(inputs.annualProfit, result.gap);
    const currency = getCurrency(currencyCode);
    const base = baseUrl(request);

    // GST, and the words about GST, from ONE decision. `gstApplies` is true only when an Australian
    // rate is configured for this Stripe mode AND the buyer is being quoted in AUD, so the copy
    // below cannot promise a tax the session does not carry. See lib/billing/tax.ts for why that is
    // the whole design rather than a convenience.
    const taxRateIds = gstTaxRateIds(currencyCode);
    const taxed = gstApplies(currencyCode);
    const priceLabel = formatCheckoutPrice(quote.monthly, currencyCode);

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
        // THE TAX QUALIFIER TRAVELS ONTO THE CHECKOUT PAGE — AND IS NOW TRUE.
      //
      // Every price surface in the product carried "+ GST" except the one that actually takes the
      // money, so this line was added to put the qualifier where the figure is. It was still a
      // claim: there was no tax rate anywhere in the system, and the invoice would have carried no
      // GST at all. `taxRateIds` below is the half that makes the sentence real, and `taxed` is
      // what stops it being printed when it is not.
      //
      // It goes in the PRODUCT NAME because Stripe renders that beside the amount. The qualifier is
      // only ever "+ GST" here — not `taxSuffix`, which follows the buyer's currency and would say
      // "+ VAT" to someone quoted in pounds, naming a tax we are not registered to collect and do
      // not add to the session.
      productName: `Kira Business Plan — ${quote.label}${taxed ? ' (+ GST)' : ''}`,
        // THE FIGURE, IN WORDS, BESIDE THE FIGURE STRIPE RENDERS.
        //
        // Putting the tax suffix in the product NAME was the first attempt and it did not work,
        // because it answers a question the buyer is not asking. He reads the AMOUNT, and for a
        // metered price Stripe renders "A$999.00 per unit", "based on usage" and "Price varies" —
        // all three literally true (arrears requires a metered price; see lib/billing/arrears.ts)
        // and all three alarming to a man deciding whether to hand over a card. A tester recorded
        // "no GST anywhere" while the suffix was already on screen, in the line-item title.
        //
        // The description renders directly beneath the amount, which is where the confusion is, so
        // it states the fixed monthly plainly and says why "varies" appears at all. This is the fix
        // available WITHOUT a package change: @caistech/subscription-billing does not accept
        // `custom_text`, and adding it means a publish plus every consumer bumped. If this proves
        // insufficient in front of a real buyer, that — or Stripe Tax — is the next step.
        // ⚠️ THIS ONLY REACHES BANDS WHOSE STRIPE PRODUCT DOES NOT EXIST YET. `ensureMeteredPrice`
        // is idempotent on the lookup key, and Stripe refuses to update a Product it auto-created,
        // so the description is frozen at whatever the FIRST session for a band set — see the
        // PRICE_LOOKUP_PREFIX note in lib/billing/arrears.ts, which exists because a tax-suffix fix
        // sat inert for a week and was recorded as a copy problem the whole time.
        //
        // The Growth band already exists under `kira-gst`, so the new GST sentence will NOT appear
        // there. That is deliberate rather than overlooked: the prefix is NOT bumped for this, because
        // the sentence is no longer the thing doing the work. With a real tax rate attached, Stripe
        // renders the GST line itself, on the page and on every invoice — which is better evidence
        // than a sentence claiming it. Bands not yet minted get the fuller wording for free.
        //
        // `productName` above is byte-identical to what it was for a taxed AUD checkout, so nothing
        // is silently diverging from the frozen Product either.
        productDescription:
          `${priceLabel} per month, a fixed amount.` +
          (taxed ? ' GST is added at checkout and shown on every invoice.' : '') +
          ` Billed at the end of each month and never in advance — cancel before it falls due and that month is waived. Stripe shows "based on usage" because that is how end-of-month billing is set up.`,
      },
      // Card captured at signup. `cardAtSignup` defaults true in the package and is stated
      // explicitly because it is a commercial decision, not a default to inherit silently: without
      // it Stripe creates the subscription with no payment method and the first charge fails when
      // the period closes, after a month of use.
      cardAtSignup: true,
      successUrl: signedInUser?.id
        ? `${base}/dashboard?welcome=1`
        : `${base}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${base}/plan`,
      metadata: valuationMetadata,
      // Session metadata only rides on checkout.session.completed; subscription metadata rides on
      // every later lifecycle event, which is what the webhook reducer needs to identify the owner.
      subscriptionMetadata: { kira_journey: 'business', quoted_monthly: String(quote.monthly) },
      allowPromotionCodes: true,
      billingAddressCollection: 'auto',
      // THE FIXED FIGURE, BESIDE THE PAY BUTTON.
      //
      // Everything else on this page is Stripe's and cannot be changed: "Price varies", "billed
      // monthly based on usage", "A$0.00 due today". All three are true — an arrears subscription is
      // priced against a Billing Meter, so the amount genuinely is not known until the month closes
      // — and all three read, to a suspicious 66-year-old at the moment he hands over a card, as a
      // business that will not tell him what it charges. He said so: the card screen is where he
      // stopped.
      //
      // productName and productDescription cannot answer it. Stripe substitutes its own subtitle for
      // metered prices, and refuses to edit a Product it auto-created — which is why a tax-suffix fix
      // sat inert for a week. custom_text is the one surface left that is ours.
      //
      // Kept to the number and the timing. It is not a place for terms.
      customText: {
        submit: {
          message:
            `${priceLabel} each month` +
            (taxed ? ', plus GST' : '') +
            `. You are charged after the month has finished, never in advance — cancel before then ` +
            `and that month is on us.`,
        },
      },
      // THE 10% ITSELF. Without this the three sentences above are decoration: the session is
      // created, the card is taken, the subscription runs, and no invoice it ever generates carries
      // GST. Applied as subscription default tax rates by the package, so RENEWALS are taxed too
      // and not just the first invoice.
      taxRateIds,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[api/checkout] Failed to create session:', error);
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
  }
}
