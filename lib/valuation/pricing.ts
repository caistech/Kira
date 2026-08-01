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
// This module is the ONLY place a price exists - every surface derives its figure from the bands
// below rather than typing one.
//
// THE LANDING PAGE SHOWS A FLOOR, AND THAT IS A REVERSAL. This file used to say there was no
// "from $X" anywhere, on the reasoning that a price without the gap it is a fraction of is just a
// number to flinch at. That reasoning is sound and it lost to a stronger one: a naive-tester pass
// as the 66-year-old owner found a nav item labelled "Pricing" leading to a section containing no
// price, which reads as evasion to exactly the buyer we care about most. A cautious owner will not
// spend three minutes on a valuation to discover the order of magnitude, and the ones who flinch at
// $499 were never going to pay $999.
//
// So the landing quotes PRICE_TIERS[0] as a floor and nothing else. The gap-first sequence survives
// intact: the personalised number still appears only after the valuation, still framed as a fraction
// of what the owner stands to unlock. Do not add a full band table to a public page - the point of
// the floor is to answer "roughly what does this cost", not to invite band-shopping before there is
// a gap to size the band against. (Decided 2026-08-01.)

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
