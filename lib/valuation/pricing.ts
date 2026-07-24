// lib/valuation/pricing.ts
//
// Kira's price is a dynamic fraction of the value the owner just saw they could unlock (the gap).
// Tiered bands keep it simple to show and easy to justify - the monthly ask is always a small
// fraction of a percent of what they stand to gain. Numbers are tunable here in one place.
//
// The amount is charged in the owner's chosen display currency (round marketing numbers, not FX-
// converted): a GBP user pays £249/mo, a USD user $249/mo. The band is chosen by gap MAGNITUDE,
// which is currency-agnostic (a £2M gap and a $2M gap hit the same band).

export interface PriceTier {
  /** Lower bound of the gap band (inclusive). */
  min: number;
  /** Monthly price in the owner's currency. */
  monthly: number;
  /** Short label for the band. */
  label: string;
}

export const PRICE_TIERS: PriceTier[] = [
  { min: 0, monthly: 99, label: 'Starter' },
  { min: 250_000, monthly: 249, label: 'Growth' },
  { min: 1_000_000, monthly: 499, label: 'Scale' },
  { min: 3_000_000, monthly: 999, label: 'Enterprise' },
  { min: 7_000_000, monthly: 1499, label: 'Legacy' },
];

export interface PriceQuote {
  monthly: number;
  annual: number;
  label: string;
  /** Annual cost as a fraction of the gap (e.g. 0.003 = 0.3%). */
  fractionOfGap: number;
  /** That fraction as a rounded percent string, e.g. "0.3%". */
  fractionOfGapPct: string;
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
  return { monthly: tier.monthly, annual, label: tier.label, fractionOfGap, fractionOfGapPct };
}
