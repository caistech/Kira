// lib/billing/tax.ts
//
// AUSTRALIAN GST — the capability behind the "+ GST" that every price surface already prints.
//
// THE DEFECT THIS CLOSES. `lib/valuation/currency.ts` puts a tax qualifier on every displayed price,
// because PRODUCT_STANDARDS §9 requires it and because a business buyer reads an unqualified figure
// as the amount that will leave his account. That was true on the screens and false in the system:
// there was no Stripe tax rate, no tax parameter on the session, and nothing that would ever have
// put a GST line on an invoice. Checkout succeeded, payment succeeded, and only the invoice was
// wrong — a failure with no symptom until an accountant looks for GST to claim back.
//
// THE INVARIANT THIS FILE EXISTS TO HOLD. The copy is DERIVED from the configuration, never written
// alongside it. `gstApplies()` decides both whether Stripe is told to charge GST and whether the
// product is allowed to say it does. They cannot drift, because they are the same call. That is the
// whole design: the previous state of the world was not a missing feature, it was a sentence and a
// system disagreeing, and a second boolean would let it happen again.

import { DEFAULT_CURRENCY, formatMoney, formatPrice } from '@/lib/valuation/currency';

import { stripeMode, type StripeMode } from './stripe-mode';

/** Standard Australian GST. Not a rate we set — it is the statutory one. */
export const GST_PERCENTAGE = 10;

/** ISO country for the rate, and the only jurisdiction this file speaks for. */
export const GST_COUNTRY = 'AU';

/**
 * The currency the GST rate is valid for.
 *
 * `lib/valuation/pricing.ts` is emphatic that the product quotes AUD AND ONLY AUD — the multi-
 * currency selector is archived precisely because switching it relabelled a number rather than
 * converting it. So AUD is not a guess here, it is the product's stated position.
 *
 * It still has to be CHECKED rather than assumed, for one narrow but real reason: the archived
 * selector persisted its choice to `localStorage.kira_currency`, and a returning browser that used
 * it can still carry a non-AUD code into checkout. Charging Australian GST to someone being quoted
 * in pounds would be wrong twice over — the wrong tax, and a tax we are not registered to collect
 * there.
 */
export const GST_CURRENCY = 'AUD';

/**
 * Which env var holds the rate id for a given Stripe mode.
 *
 * PER MODE, because a Stripe Tax Rate belongs to exactly ONE account. A test id does not resolve in
 * live and the failure lands at checkout, in front of a buyer, on the one page where a stumble is
 * expensive. This mirrors the key handling in ./stripe-mode.ts, deliberately: one object, one mode,
 * one variable, no single slot that has to be edited to go live.
 */
export function gstTaxRateEnvVar(mode: StripeMode = stripeMode()): string {
  return mode === 'live' ? 'STRIPE_GST_TAX_RATE_ID_LIVE' : 'STRIPE_GST_TAX_RATE_ID_TEST';
}

/**
 * The configured GST tax rate id for the current mode, or null when it has not been set up.
 *
 * Null is a legitimate state, not an error: the rate is created by `scripts/setup-gst-tax-rate.ts`
 * and there is a window before that has been run in a given mode. What must NOT happen in that
 * window is the product claiming a GST it will not charge — which is why every caller routes
 * through `gstApplies()` rather than reading this and deciding for itself.
 */
export function gstTaxRateId(): string | null {
  const id = process.env[gstTaxRateEnvVar()]?.trim();
  return id ? id : null;
}

/**
 * Is GST actually going to be charged on this checkout?
 *
 * The single source of truth for both the Stripe parameter and the words on the screen.
 */
export function gstApplies(currencyCode: string = DEFAULT_CURRENCY): boolean {
  return currencyCode.toUpperCase() === GST_CURRENCY && gstTaxRateId() !== null;
}

/**
 * The tax rate ids to attach to the subscription, for `@caistech/subscription-billing`.
 *
 * Returns [] rather than throwing when GST is not configured. A throw here would block every sale
 * over a tax-configuration gap, which trades a reconcilable accounting problem for an unreconcilable
 * revenue one. The console.error below is the alarm instead — and in LIVE mode it is deliberately
 * loud, because live selling with no GST rate is a real exposure rather than a setup step.
 */
export function gstTaxRateIds(currencyCode: string = DEFAULT_CURRENCY): string[] {
  const id = gstTaxRateId();

  if (currencyCode.toUpperCase() !== GST_CURRENCY) {
    // Not an error. AUD is the only currency we quote; anything else is a stale persisted choice
    // (see GST_CURRENCY), and the correct behaviour is to charge no Australian GST on it.
    return [];
  }

  if (!id) {
    console.error(
      `[billing] No Australian GST rate configured (${gstTaxRateEnvVar()} is unset), so this ` +
        `subscription will be invoiced WITHOUT GST. Run: npx tsx scripts/setup-gst-tax-rate.ts` +
        (stripeMode() === 'live' ? ' — this is LIVE mode and real invoices are affected.' : ''),
    );
    return [];
  }

  return [id];
}

/**
 * A price for a CHECKOUT surface, carrying "+ GST" only when GST will actually be charged.
 *
 * THIS IS THE INVARIANT, expressed as a function. `formatPrice` always appends the qualifier and is
 * right for the marketing surfaces, where "+ GST" states how we quote. It is wrong on the checkout,
 * where the same words become a statement about THIS transaction — and the transaction is the thing
 * that was silently not taxed.
 *
 * Three cases, one rule:
 *   AUD + rate configured  → "$999 + GST"   (Stripe adds a GST line; the words match the invoice)
 *   AUD + no rate          → "$999"          (no GST is charged, so none is claimed)
 *   non-AUD                → "$999"          (`taxSuffix` would say "+ VAT" — a tax we do not collect)
 *
 * The second case is the one worth being deliberate about. It is tempting to leave "+ GST" on the
 * grounds that the rate is about to be set up. That is exactly how the original defect read to
 * everyone who looked at it.
 */
export function formatCheckoutPrice(n: number, currencyCode: string = DEFAULT_CURRENCY): string {
  return gstApplies(currencyCode) ? formatPrice(n, currencyCode) : formatMoney(n, currencyCode);
}
