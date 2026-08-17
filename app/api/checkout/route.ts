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
import { TERMS_VERSION } from '@/lib/terms';
import { getCurrentAppUser } from '@/lib/auth';
import { formatPrice, taxSuffix } from '@/lib/valuation/currency';
import { NextRequest, NextResponse } from 'next/server';

import { getStripe, METER_EVENT_NAME, PRICE_LOOKUP_PREFIX } from '@/lib/billing';
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
      // TERMS ACCEPTANCE, CARRIED TO THE PLACE THE ACCOUNT IS ACTUALLY CREATED.
      //
      // The DB trigger reads `terms_accepted` / `terms_version` off auth user_metadata, and the only
      // path that ever set them was the /signup form — so every owner who arrived through checkout
      // ended up with a PAID account and `terms_accepted_at` NULL. Stripe metadata is the one
      // carrier that survives the round trip to /onboarding, which is where createUser runs.
      //
      // The value is the CLIENT'S assertion that he ticked the box, which is what a checkbox is;
      // there is no server-side way to observe a tick. What the server does guarantee is that the
      // version recorded is the one WE are serving, never one the client named — otherwise the
      // record would say he agreed to whatever he claimed to agree to.
      terms_accepted: body?.termsAccepted === true ? 'true' : 'false',
      terms_version: body?.termsAccepted === true ? TERMS_VERSION : '',
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
        // THE TAX QUALIFIER TRAVELS ONTO THE CHECKOUT PAGE.
      //
      // Every price surface in the product carries "+ GST" except the one that actually takes the
      // money: Stripe rendered "A$999.00 per unit" with no qualifier anywhere on the page. A tester
      // flagged it as the single place the number matters, and he is right — this is the figure a
      // business buyer reads as the amount leaving his account.
      //
      // It goes in the PRODUCT NAME because Stripe renders that beside the amount; the alternative
      // is Stripe Tax, which is a real configuration decision rather than a copy fix. The suffix
      // follows the buyer's currency (taxSuffix), so it says GST for an Australian and VAT for
      // someone in London instead of hardcoding the local word.
      productName: `Kira Business Plan — ${quote.label} (${taxSuffix(currencyCode)})`,
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
        productDescription:
          `${formatPrice(quote.monthly, currencyCode)} per month, a fixed amount. Billed at the end of each month and never in advance — cancel before it falls due and that month is waived. Stripe shows "based on usage" because that is how end-of-month billing is set up.`,
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
      // ⚠️ OFF, BECAUSE THE ONLY CODE ANYONE HOLDS IS ONE STRIPE CANNOT VALIDATE.
      //
      // Invited testers carry a beta invitation code. It is a row in our `beta_codes` table, not a
      // Stripe coupon, so Stripe can only ever answer "Invalid promo code" — and with this true,
      // Stripe renders an "Add promotion code" link that is, on the whole journey, the single most
      // code-shaped thing a man holding a code will find. Ours sat behind a text link on the
      // previous page; Stripe's is on the payment form itself, at the exact moment he is looking for
      // somewhere to put it.
      //
      // Shani Shah, Priority 1, asked afterwards where it broke:
      //
      //   "I did not see a standalone or obvious place to enter the promo code when I first reached
      //    the pricing/plan step. The first place I saw the promo code option was in the billing/card
      //    details section. I entered the code there, but it showed 'Invalid promo code.'"
      //
      // So he was told, by the payment page, that his valid invitation was invalid. He never reached
      // our door at all — this one looked better. His code is still unredeemed.
      //
      // Nothing is lost by turning it off: there are no Stripe coupons in this account and none have
      // ever been issued. If real discount codes are ever introduced, this can come back — but the
      // invitation-code collision comes back with it and needs answering first, because the two are
      // indistinguishable to the person typing.
      allowPromotionCodes: false,
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
            `${formatPrice(quote.monthly, currencyCode)} each month. You are charged after the month ` +
            `has finished, never in advance — cancel before then and that month is on us.`,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[api/checkout] Failed to create session:', error);
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
  }
}
