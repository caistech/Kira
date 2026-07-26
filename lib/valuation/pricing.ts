// lib/valuation/pricing.ts
//
// Kira's price is a dynamic fraction of the value the owner just saw they could unlock (the gap).
// Tiered bands keep it simple to show and easy to justify - the monthly ask is always a small
// fraction of a percent of what they stand to gain. Numbers are tunable here in one place.
//
// The amount is charged in the owner's chosen display currency (round marketing numbers, not FX-
// converted): a GBP user pays £999/mo, a USD user $999/mo. The band is chosen by gap MAGNITUDE,
// which is currency-agnostic (a £2M gap and a $2M gap hit the same band).
//
// The bands are anchored on what they replace: a fractional exec or chief of staff, which is
// $3-10k/month of a real person's time. The earlier $99 entry band priced Kira like a note-taking
// app and undersold the thing it is being compared to.
//
// This module is the ONLY place a price exists. Nothing quotes a number before the valuation has
// run - there is no pricing page and no "from $X" on the landing page, because a price stated
// without the gap it is a fraction of is just a number to flinch at.

/** GST, as a rate. Australia's is 10% and has been since 2000. */
export const GST_RATE = 0.1;

/**
 * Whether GST is part of the ask, given the currency the owner is being billed in.
 *
 * GST is an Australian tax on an Australian supply, so it rides on the AUD price and nothing else —
 * a UK owner paying £999 is not charged 10% GST on top, and printing "+ GST" at them would be
 * wrong. Every price surface asks this rather than hardcoding the suffix.
 */
export function gstApplies(currencyCode: string): boolean {
  return (currencyCode || '').toUpperCase() === 'AUD';
}

/**
 * The "+ GST" tail to append to a displayed price, or '' where GST does not apply.
 *
 * Every stated price in the product is EXCLUSIVE of GST and says so — a figure that could be read
 * either way is the one an owner argues about on their first invoice.
 */
export function gstSuffix(currencyCode: string): string {
  return gstApplies(currencyCode) ? ' + GST' : '';
}

export interface PriceTier {
  /** Lower bound of the gap band (inclusive). */
  min: number;
  /** Monthly price in the owner's currency. */
  monthly: number;
  /** Short label for the band. */
  label: string;
}

export const PRICE_TIERS: PriceTier[] = [
  { min: 0, monthly: 499, label: 'Starter' },
  { min: 250_000, monthly: 999, label: 'Growth' },
  { min: 1_000_000, monthly: 1999, label: 'Scale' },
  { min: 3_000_000, monthly: 3499, label: 'Enterprise' },
  { min: 7_000_000, monthly: 4999, label: 'Legacy' },
];

export interface PriceQuote {
  monthly: number;
  annual: number;
  label: string;
  /** Annual cost as a fraction of the gap (e.g. 0.003 = 0.3%). */
  fractionOfGap: number;
  /** That fraction as a rounded percent string, e.g. "0.3%". */
  fractionOfGapPct: string;
  /**
   * Whether the fraction is small enough to be worth saying out loud. The whole pitch is "a small
   * fraction of what you unlock", so on a gap so slight that a year of Kira is a fifth of it, the
   * sentence argues against us - the surface shows the price plainly instead of quoting a share.
   */
  fractionWorthQuoting: boolean;
}

/** Pick the price band for a given gap and return the quote. */
export function priceForGap(gap: number): PriceQuote {
  const g = Math.max(0, gap || 0);
  let tier = PRICE_TIERS[0];
  for (const t of PRICE_TIERS) {
    if (g >= t.min) tier = t;
  }
  const annual = tier.monthly * 12;
  const fractionOfGap = g > 0 ? annual / g : 0;
  const pct = fractionOfGap * 100;
  // Show one meaningful digit for small fractions (0.3%), no decimals when >= 10%.
  const fractionOfGapPct = pct >= 10 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`;
  const fractionWorthQuoting = fractionOfGap > 0 && fractionOfGap < 0.1;
  return {
    monthly: tier.monthly,
    annual,
    label: tier.label,
    fractionOfGap,
    fractionOfGapPct,
    fractionWorthQuoting,
  };
}
