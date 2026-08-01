// lib/billing/subscription-price.ts
//
// What this owner is ACTUALLY being billed each month, read from Stripe.
//
// WHY IT IS READ RATHER THAN STORED. Kira's price is chosen from the owner's valuation gap at
// checkout (lib/valuation/pricing.ts) and never persisted against the account, so there is no local
// number to show. Persisting one at checkout was the alternative and it is worse: a stored copy
// drifts the moment a price is changed in Stripe — a discount, a band correction, a negotiated rate
// — and a Settings page that confidently states a figure the card is not charged is precisely the
// failure lib/billing/plan-state.ts exists to prevent. Stripe is the only thing that decides what
// moves; ask it.
//
// DEGRADE, DON'T FAKE. Every failure path here returns null and the caller renders nothing. An
// absent price costs a click through to the billing portal. A wrong one, on a product sold through
// advisors who put their name to the introduction, costs the channel.

import { getCurrency, isSupportedCurrency, taxSuffix } from '@/lib/valuation/currency';

import { getStripe } from './stripe-mode';

export interface SubscriptionPrice {
  /** Whole currency units — dollars, not cents. */
  monthly: number;
  /** ISO code, uppercased (Stripe returns it lowercase). */
  currency: string;
  /** Ready to render, e.g. "$999 + GST". Tax qualifier is mandatory on every displayed price. */
  formatted: string;
}

/**
 * The recurring monthly amount on a subscription, or null when it cannot be established honestly.
 *
 * Null is returned — deliberately, and without throwing — when: there is no subscription; Stripe is
 * unreachable; the subscription has no single recurring item; the price is tiered or usage-graduated
 * so `unit_amount` is absent; or the currency is one whose tax regime we cannot name. That last case
 * is the subtle one: getCurrency falls back to AUD, so an unrecognised currency would render a
 * confident "+ GST" at a buyer in a country that has never heard of it.
 *
 * ONE UNIT IS ONE MONTH. Kira's arrears billing reports a single meter event per closed period
 * (lib/billing/arrears.ts), so the per-unit amount IS the monthly amount. If that ever becomes
 * many-units-per-period, this function starts under-reporting and must change with it.
 */
export async function getSubscriptionPrice(
  subscriptionId: string | null | undefined,
): Promise<SubscriptionPrice | null> {
  if (!subscriptionId) return null;

  try {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);

    const items = subscription.items?.data ?? [];
    // More than one item means the monthly cost is a sum, and a sum of prices with possibly
    // different intervals is not a number this function is entitled to invent.
    if (items.length !== 1) return null;

    const price = items[0].price;
    if (!price || price.recurring?.interval !== 'month') return null;
    if (typeof price.unit_amount !== 'number') return null;

    const currency = (price.currency || '').toUpperCase();
    if (!isSupportedCurrency(currency)) return null;

    // Stripe holds minor units. Every currency Kira supports is 100-to-1, and the ones that are not
    // (JPY, KRW) are not in CURRENCIES — so isSupportedCurrency above is also what makes this safe.
    const monthly = price.unit_amount / 100;

    return {
      monthly,
      currency,
      formatted: `${new Intl.NumberFormat(getCurrency(currency).locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: monthly % 1 === 0 ? 0 : 2,
      }).format(monthly)} ${taxSuffix(currency)}`,
    };
  } catch (error) {
    console.error('[billing] could not read the subscription price:', error);
    return null;
  }
}
