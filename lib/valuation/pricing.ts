// lib/valuation/pricing.ts
//
// Kira's price is a dynamic fraction of the value the owner just saw they could unlock (the gap).
// Tiered bands keep it simple to show and easy to justify - the monthly ask is always a small
// fraction of a percent of what they stand to gain. Numbers are tunable here in one place.
//
// AUD, and only AUD. Every figure is Australian dollars excluding GST, matching the FAQ and the
// landing page.
//
// This comment used to describe a multi-currency product — "a GBP user pays £999/mo, a USD user
// $999/mo", round marketing numbers rather than FX conversions. That was the intent once, and the
// display currency selector it depended on has since been archived (app/business-valuation), because
// changing it relabelled the same scalar instead of converting it: an Australian owner's gap could
// render as £752,919.
//
// Three places disagreed about this at once — this comment, the archived selector, and an FAQ still
// promising a switch — which is how the landing page ended up flipping between $499 + GST and
// £499 + VAT in front of a buyer. The band is chosen by gap MAGNITUDE, and the magnitude is in AUD.
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

// ─────────────────────────────────────────────────────────────────────────────
// THE BAND IS CHOSEN BY REPORTED PROFIT, NOT BY THE GAP WE CALCULATE.
//
// It used to be the gap. That made the same tool both the author of the number and the beneficiary
// of it being large, and the FAQ said so out loud — "a bigger gap means more for her to unlock, so
// the bands move with it." A tester in the exact ICP found it in about ninety seconds:
//
//   "I now have a number I like, that you've told me not to rely on, from a company that gets paid
//    more if the number is bigger."
//
// He arrived already primed — a broker had told him his business was worth less than he thought —
// so the valuation coming back ABOVE the broker's figure made it less credible, not more, because
// the incentive explained why it would. That is the whole product's central artefact losing its
// standing, and no amount of methodology honesty elsewhere recovers it.
//
// It also removed the quiet pressure behind the model overclaiming (register A1-A4: the multiples
// exceed their own cited source). When a bigger number earns more, a model that drifts upward is
// never the thing anyone questions.
//
// SDE rather than turnover, deliberately: a $5M-turnover contractor on 4% margin cannot pay what a
// $2M one on 25% can, and profit is the figure this buyer respects. The load-bearing property is
// not which figure it is — it is that the owner STATES it and we do not COMPUTE it. Self-reporting
// is a real exposure (understate the profit, get a cheaper band) and it is the same exposure the
// valuation already carries on the same field, so it adds nothing new.
// ─────────────────────────────────────────────────────────────────────────────

export interface PriceTier {
  /** Lower bound of the annual profit / SDE band (inclusive), as reported by the owner. */
  min: number;
  /** Monthly price in the owner's currency. */
  monthly: number;
  /** Short label for the band. */
  label: string;
}

export const PRICE_TIERS: PriceTier[] = [
  { min: 0, monthly: 499, label: 'Starter' },
  { min: 250_000, monthly: 999, label: 'Growth' },
  { min: 750_000, monthly: 1999, label: 'Scale' },
  { min: 2_000_000, monthly: 3499, label: 'Enterprise' },
  { min: 5_000_000, monthly: 4999, label: 'Legacy' },
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

/**
 * Pick the price band from the owner's REPORTED annual profit (SDE), and quote it.
 *
 * `gap` is still accepted, and is used for nothing except the descriptive fraction below — so a
 * surface can still say what a year costs relative to what is on the table WITHOUT that
 * relationship setting the price. Reading is not pricing.
 */
export function priceForProfit(annualProfit: number, gap = 0): PriceQuote {
  const p = Math.max(0, annualProfit || 0);
  const g = Math.max(0, gap || 0);
  let tier = PRICE_TIERS[0];
  for (const t of PRICE_TIERS) {
    if (p >= t.min) tier = t;
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

// ─────────────────────────────────────────────────────────────────────────────
// THE MAINTAIN RATE — what it costs once the manual is built.
//
// OPERATOR DECISION, 2026-08-05: one third of the build rate, and NARROW in scope.
//
// WHY THERE IS A STEP-DOWN AT ALL. Kira is sold as a project that finishes: her extraction job is
// to make herself redundant. A product that says that and then bills the same amount forever has
// not made a promise, it has made a sales line — and the owner finds out which one it was in month
// thirteen. Offering the lower rate BEFORE he asks for it is the thing that makes the whole framing
// credible, and it costs less than the trust it buys.
//
// WHY IT IS NOT FREE. The manual is never finished, because the business keeps moving: new staff,
// new clients, a changed process, and the head refills. Keeping it current is real work. It is just
// much less work than building it was, and the price should say so.
//
// NARROW, AND THIS IS THE PART THAT IS EASY TO GET WRONG. Maintenance is keeping the MANUAL current
// — capturing what changed and re-filing it. It is NOT the day-to-day assistant: drafting, chasing,
// looking things up. That does not get cheaper when the manual is finished, because it was never
// about the manual, and it is worth MOST at exactly the moment he would be stepping down.
//
// So the transition is a fork, not a discount:
//   "Keep it current for a third — or keep me, at what you're paying now."
// Both halves are true, one is a step-down and the other is the thing he actually values. Folding
// the assistant into the maintain tier would cut its price by two thirds forever, by accident.
//
// A FRACTION RATHER THAN A FLAT PRICE, because a flat one is wrong at both ends: trivial revenue
// from a $5M business and still steep for a $250k one. One decision covers all five bands.
//
// ⚠️ THE TRIGGER IS NOT DECIDED AND IS NOT HERE. "When the manual is built" needs a defensible
// denominator — register B4, deactivation — and until that exists a percentage is measured against
// an unknown total. Nothing in the product may imply a date or a threshold. What may be said is the
// SHAPE: her job is to make herself redundant, and when she has, this is what it costs.
// ─────────────────────────────────────────────────────────────────────────────

/** One third. The step-down at the transition — see the note above. */
export const MAINTAIN_FRACTION = 1 / 3;

/**
 * The maintain price for a band, rounded to whole dollars.
 *
 * Rounded DOWN to the nearest whole dollar rather than to a marketing number: $166 is a third of
 * $499 and $167 is not, and an owner who checks the arithmetic on a promise about paying less
 * should find it holds exactly.
 */
export function maintainPrice(monthly: number): number {
  return Math.floor(Math.max(0, monthly || 0) * MAINTAIN_FRACTION);
}

/** The maintain rate for a given reported profit — the same band the build rate came from. */
export function maintainPriceForProfit(annualProfit: number): number {
  return maintainPrice(priceForProfit(annualProfit).monthly);
}
