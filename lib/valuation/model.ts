// lib/valuation/model.ts
//
// The Kira business valuation model (SDE basis).
//
// Small, privately-owned businesses change hands on a multiple of SDE (Seller's Discretionary
// Earnings = net profit + the owner's salary and perks), NOT on public-company EBITDA comps. Real
// BizBuySell 2025 data (9,500+ closed deals): the market average is ~2.5x SDE, and sectors range
// ~1.5x-6.6x (see sde-multiples.ts). A given sale lands above or below its sector average based on
// size and quality. This model reproduces that:
//
//   - floor      = a weak, fully owner-dependent business (~half the sector average, min 1x).
//   - sector base= the median SDE multiple the sector actually trades at (a typical business).
//   - ceiling    = a fully systemised, transferable business of that size (sector base x a quality
//                  premium, plus a size premium for larger businesses; capped at 8x SDE, above
//                  which you are in EBITDA / lower-mid-market territory that main-street SDE
//                  multiples don't reach).
//   - applied    = floor + readiness x (ceiling - floor).
//
// Three numbers come out: walk-away (assets), worth-today (applied at current readiness), and
// worth-once-captured (applied with the capturable factors maxed). The gap between the last two is
// the value of the operating knowledge that today lives only in the owner's head, and each
// capturable factor's uplift is costed and sums to that gap.
//
// The readiness drivers (owner-dependence heaviest, then systems, recurring revenue, client
// concentration, growth) match the value drivers brokers actually price on - the research behind
// this: owner-dependence alone is a 1-2x discount; recurring revenue and low client concentration
// lift the multiple.

import { lookupSdeMultiple } from './sde-multiples';

export type ProfitTrend = 'growing_strongly' | 'growing' | 'flat' | 'declining';
export type MarginTrend = 'improving' | 'stable' | 'shrinking';
export type ClientTrend = 'expanding' | 'stable' | 'shrinking';
export type ClientConcentration = 'diversified' | 'moderate' | 'concentrated';
export type OwnerDependence = 'i_am_the_business' | 'heavily_involved' | 'mostly_runs' | 'fully_managed';
export type Systems = 'documented_team' | 'some' | 'in_my_head';
export type RecurringRevenue = 'strong' | 'some' | 'none';

export interface ValuationInputs {
  /** Industry name (matched against the SDE-multiple table; unknown -> market average, flagged). */
  industry: string;
  /**
   * Annual turnover / total sales. Collected to make the profit question unambiguous and to
   * cross-check (implied margin). NOT used in the valuation math - it runs on profit/SDE.
   */
  turnover?: number;
  /** Adjusted annual profit / owner earnings (SDE = net profit + owner salary & perks), in dollars. */
  annualProfit: number;
  /** Rough value of tangible assets (equipment, vehicles, stock) - feeds the walk-away floor. */
  tangibleAssets: number;
  profitTrend: ProfitTrend;
  marginTrend: MarginTrend;
  clientTrend: ClientTrend;
  clientConcentration: ClientConcentration;
  ownerDependence: OwnerDependence;
  systems: Systems;
  recurringRevenue: RecurringRevenue;
}

/** A single driver of the readiness score, and how much value maxing it would unlock. */
export interface ReadinessFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
  capturable: boolean;
  uplift: number;
  reason: string;
}

export interface ValuationResult {
  /** Sector-median SDE multiple (a typical business in the sector). */
  sdeMultiple: number;
  sectorMatched: boolean;
  /** SDE multiple applied to a weak/owner-dependent business (readiness 0). */
  floorMultiple: number;
  /** SDE multiple applied to a fully systemised business of this size (readiness 1). */
  ceilingMultiple: number;
  readiness: number;
  readinessPotential: number;
  appliedMultipleToday: number;
  appliedMultiplePotential: number;
  walkAway: number;
  today: number;
  potential: number;
  gap: number;
  factors: ReadinessFactor[];
}

// --- Sub-score maps (0 = worst / least transferable, 1 = best) -------------------------------

const OWNER_DEPENDENCE_SCORE: Record<OwnerDependence, number> = {
  i_am_the_business: 0,
  heavily_involved: 0.33,
  mostly_runs: 0.7,
  fully_managed: 1,
};
const SYSTEMS_SCORE: Record<Systems, number> = { in_my_head: 0, some: 0.5, documented_team: 1 };
const RECURRING_SCORE: Record<RecurringRevenue, number> = { none: 0, some: 0.5, strong: 1 };
const CONCENTRATION_SCORE: Record<ClientConcentration, number> = { concentrated: 0, moderate: 0.5, diversified: 1 };
const PROFIT_TREND_SCORE: Record<ProfitTrend, number> = { declining: 0, flat: 0.4, growing: 0.75, growing_strongly: 1 };
const MARGIN_TREND_SCORE: Record<MarginTrend, number> = { shrinking: 0, stable: 0.5, improving: 1 };
const CLIENT_TREND_SCORE: Record<ClientTrend, number> = { shrinking: 0, stable: 0.5, expanding: 1 };

// --- Factor weights (sum = 10, so readiness = weighted sum / 10) ------------------------------

/**
 * The version of THIS model, stamped onto every valuation snapshot.
 *
 * BUMP IT whenever anything above changes a number: the sub-score maps, the weights, the multiple
 * constants, the size premium. Without it a stored series is uninterpretable — re-weighting would
 * silently rewrite everyone's history, which is the same objection that makes re-weighting unsafe
 * in the first place ("it would re-price valuations already shown to people"). With it, an old
 * snapshot stays readable as what it was: this input, scored by that code.
 *
 * Format: date of the change + a counter for same-day revisions.
 */
export const MODEL_VERSION = '2026-07-24.1';

const WEIGHTS = { ownerDependence: 3, systems: 2, recurringRevenue: 2, clientConcentration: 1.5, growth: 1.5 } as const;
const TOTAL_WEIGHT =
  WEIGHTS.ownerDependence + WEIGHTS.systems + WEIGHTS.recurringRevenue + WEIGHTS.clientConcentration + WEIGHTS.growth;

// --- Multiple-band constants (calibrated to BizBuySell 2025 SDE data) -------------------------

/** A fully owner-dependent business trades at roughly half its sector's average (min 1x SDE). */
const FLOOR_FACTOR = 0.5;
const FLOOR_MIN = 1.0;
/** A top-quality, fully systemised business commands a premium above the sector average. */
const QUALITY_PREMIUM = 1.6;
/** Main-street SDE multiples top out here; above this is EBITDA / lower-mid-market territory. */
const SDE_CAP = 8;
/** Below this SDE, no size premium; it scales in above it. */
const SIZE_PREMIUM_ANCHOR = 250_000;
const SIZE_PREMIUM_MAX = 3;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function round(n: number): number {
  return Math.round(n);
}

/**
 * Larger businesses earn a size premium (more buyers, less key-person risk, management depth).
 * Scales logarithmically with profit above the anchor, capped.
 */
function sizePremium(annualProfit: number): number {
  if (annualProfit <= SIZE_PREMIUM_ANCHOR) return 0;
  return clamp(Math.log10(annualProfit / SIZE_PREMIUM_ANCHOR) * 2, 0, SIZE_PREMIUM_MAX);
}

function earningsValue(annualProfit: number, multiple: number): number {
  if (annualProfit <= 0) return 0;
  return annualProfit * multiple;
}

export function computeValuation(inputs: ValuationInputs): ValuationResult {
  const { sde: sdeMultiple, matched: sectorMatched } = lookupSdeMultiple(inputs.industry);

  const growthScore = clamp(
    (PROFIT_TREND_SCORE[inputs.profitTrend] +
      MARGIN_TREND_SCORE[inputs.marginTrend] +
      CLIENT_TREND_SCORE[inputs.clientTrend]) /
      3,
    0,
    1,
  );

  const rawFactors: Array<Omit<ReadinessFactor, 'uplift'>> = [
    {
      key: 'ownerDependence',
      label: 'Owner dependence',
      score: OWNER_DEPENDENCE_SCORE[inputs.ownerDependence],
      weight: WEIGHTS.ownerDependence,
      capturable: true,
      reason:
        'The business runs on you. A buyer sees that they are purchasing your job, not an asset that keeps earning without you.',
    },
    {
      key: 'systems',
      label: 'Documented systems & team',
      score: SYSTEMS_SCORE[inputs.systems],
      weight: WEIGHTS.systems,
      capturable: true,
      reason:
        'Your processes, pricing and know-how live in your head. Captured and documented, they transfer to a buyer - and to your own team.',
    },
    {
      key: 'recurringRevenue',
      label: 'Recurring revenue & contracts',
      score: RECURRING_SCORE[inputs.recurringRevenue],
      weight: WEIGHTS.recurringRevenue,
      capturable: true,
      reason:
        'Little locked-in revenue means a buyer inherits uncertainty. Contracts and repeat revenue make future earnings predictable.',
    },
    {
      key: 'clientConcentration',
      label: 'Client diversification',
      score: CONCENTRATION_SCORE[inputs.clientConcentration],
      weight: WEIGHTS.clientConcentration,
      capturable: true,
      reason:
        'Revenue leans on a few key clients (and the relationships you personally hold). Spread and documented, that risk drops.',
    },
    {
      key: 'growth',
      label: 'Profit, margin & client trend',
      score: growthScore,
      weight: WEIGHTS.growth,
      capturable: false,
      reason:
        'Flat or declining trend caps what a buyer will pay. This one is driven by the market, not by capturing knowledge.',
    },
  ];

  const readiness = clamp(rawFactors.reduce((s, f) => s + f.score * f.weight, 0) / TOTAL_WEIGHT, 0, 1);
  const readinessPotential = clamp(
    rawFactors.reduce((s, f) => s + (f.capturable ? 1 : f.score) * f.weight, 0) / TOTAL_WEIGHT,
    0,
    1,
  );

  // Build the realistic SDE multiple band from the sector median, size and quality.
  const floorMultiple = Math.max(FLOOR_MIN, sdeMultiple * FLOOR_FACTOR);
  const ceilingMultiple = Math.min(SDE_CAP, Math.max(floorMultiple + 0.5, sdeMultiple * QUALITY_PREMIUM + sizePremium(inputs.annualProfit)));
  const spread = ceilingMultiple - floorMultiple;

  const appliedMultipleToday = floorMultiple + readiness * spread;
  const appliedMultiplePotential = floorMultiple + readinessPotential * spread;

  const walkAway = round(Math.max(0, inputs.tangibleAssets || 0));
  const today = round(earningsValue(inputs.annualProfit, appliedMultipleToday));
  const potential = round(earningsValue(inputs.annualProfit, appliedMultiplePotential));
  const gap = Math.max(0, potential - today);

  const factors: ReadinessFactor[] = rawFactors
    .map((f) => {
      const uplift =
        f.capturable && inputs.annualProfit > 0
          ? round((inputs.annualProfit * ((1 - f.score) * f.weight)) / TOTAL_WEIGHT * spread)
          : 0;
      return { ...f, uplift };
    })
    .sort((a, b) => b.uplift - a.uplift);

  return {
    sdeMultiple,
    sectorMatched,
    floorMultiple,
    ceilingMultiple,
    readiness,
    readinessPotential,
    appliedMultipleToday,
    appliedMultiplePotential,
    walkAway,
    today,
    potential,
    gap,
    factors,
  };
}

// --- Buyer-risk narrative ---------------------------------------------------------------------
//
// The gap isn't "you're being short-changed" - it's that a buyer prices RISK. The less of the
// business they can see (systems in your head, revenue that depends on you), the more they discount
// for the unknowns, exactly like buying a car sight-unseen on the seller's word. This narrative
// makes that concrete and adapts to the owner's result: a weak, owner-dependent business gets the
// full risk story; a systemised one gets "you've made it visible, so there's little left to discount."

export interface BuyerRationale {
  title: string;
  paragraphs: string[];
}

/**
 * How a shortfall is described, by SEVERITY.
 *
 * These used to be one phrase per factor, chosen whenever the factor scored below 1. That reads
 * back an answer the owner did not give: someone who answered "it would mostly run — a few things
 * would need me" (0.7) was told "the business runs on you", and someone who answered "partly
 * written down" (0.5) was told the know-how "lives in your head, not on paper".
 *
 * Overstating their weakness is not the safe direction to be wrong in. This is a sales page for a
 * product that fixes exactly these things, so exaggerating the problem it sells the cure for is
 * the one error that costs credibility with the owner who knows their own business best — and it
 * is 1 in 14 of all answer combinations, not an edge case.
 */
const WEAKNESS_PHRASE: Record<string, { severe: string; mild: string }> = {
  ownerDependence: {
    severe: 'the business runs on you',
    mild: 'a few things still need you personally',
  },
  systems: {
    severe: 'the know-how lives in your head, not on paper',
    mild: 'some of how it runs is only partly written down',
  },
  recurringRevenue: {
    severe: "there's little locked-in revenue to count on",
    mild: 'only part of the revenue is locked in ahead of time',
  },
  clientConcentration: {
    severe: 'revenue leans on a few relationships you personally hold',
    mild: 'a handful of clients still make up a large share of revenue',
  },
};

/** At or above this, a shortfall is a refinement rather than a risk, and is worded as one. */
const MILD_AT_OR_ABOVE = 0.5;

/**
 * The owner-dependence score at which the "a buyer can see this running without you" story becomes
 * honest. `mostly_runs` (0.7 — "it would mostly run, a few things would need me") clears it;
 * `heavily_involved` (0.33) and `i_am_the_business` (0) do not, however strong everything else is.
 */
const OWNER_INDEPENDENCE_FOR_HIGH = 0.7;

function weaknessPhrase(key: string, score: number): string | undefined {
  const phrase = WEAKNESS_PHRASE[key];
  if (!phrase) return undefined;
  return score >= MILD_AT_OR_ABOVE ? phrase.mild : phrase.severe;
}

function joinPhrases(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

export function buildBuyerRationale(result: ValuationResult): BuyerRationale {
  if (result.today === 0) {
    return {
      title: 'How a buyer sees it',
      paragraphs: [
        "A buyer pays for profit they can count on continuing after you leave. On the figures you entered there isn't a profit for them to bank yet, so the business is valued on what its assets would fetch.",
        'The opportunity is to build documented, transferable earnings - that is what turns it from an asset sale into a business a buyer will pay a multiple for.',
      ],
    };
  }

  const shortfalls = result.factors.filter((f) => f.capturable && f.score < 1);
  const weak = joinPhrases(
    shortfalls
      .slice(0, 2)
      .map((f) => weaknessPhrase(f.key, f.score))
      .filter((phrase): phrase is string => Boolean(phrase)),
  );

  const ownerDependenceScore =
    result.factors.find((f) => f.key === 'ownerDependence')?.score ?? 1;

  const opener =
    "A buyer isn't really paying for last year's profit - they're paying for how confident they can be it keeps coming in once you're gone. So what they actually price is risk.";

  // WHICH STORY WE TELL. Narrative only — `readiness` still drives every figure on the page, and
  // nothing here moves a number. That distinction is the reason this fix was safe to make and a
  // re-weighting was not: re-weighting would re-price valuations already shown to people.
  //
  // Owner-dependence CAPS the band. Readiness is a weighted average, so the other four factors
  // carry 7 of 10 — meaning someone who answers "it would fall apart, I am the business" can still
  // clear the 0.67 "high" threshold on the strength of systems, recurring revenue, spread and
  // growth, and then be told "a buyer can largely see how this business runs without you" while
  // the weakness line built from the same answer says "the business runs on you". Two sentences,
  // one screen, flatly contradicting each other.
  //
  // A broker would never say it. No amount of recurring revenue compensates for the owner being
  // the business — that IS the discount, and it is the thing this product exists to fix.
  //
  // Arithmetically this is 5 of 3,888 combinations. That understates it badly: it is the
  // SELF-FLATTERING answer pattern — proud of the systems and the client book, blind to their own
  // centrality — which is precisely the owner Kira is for. The tester hit it on a first pass.
  const rawBand = result.readiness < 0.34 ? 'low' : result.readiness < 0.67 ? 'mid' : 'high';
  const band =
    rawBand === 'high' && ownerDependenceScore < OWNER_INDEPENDENCE_FOR_HIGH ? 'mid' : rawBand;

  if (band === 'low') {
    return {
      title: 'Why the number is what it is',
      paragraphs: [
        opener,
        `Right now they would look at your business and see that ${weak}. From the outside most of that is invisible - they are taking your word for how it all holds together.`,
        "It is the same as buying a car sight unseen on the seller's promises: you would knock the price down to cover the unknown unknowns, because you are the one who wears it if things turn out worse than described. A buyer does exactly that here - which is why the multiple sits below your sector's average, not at it.",
        "The more of that you make visible and transferable - documented, systemised, running without you - the less there is to discount for. The gap above isn't extra profit; it's risk you have taken off the buyer's table.",
      ],
    };
  }

  if (band === 'mid') {
    return {
      title: 'Why the number is what it is',
      paragraphs: [
        opener,
        // Composed as a clause, not slotted into a sentence that assumes the phrase is a NOUN.
        // The old form read "but the business runs on you is still largely in your head" whenever
        // owner-dependence was the leading shortfall — already broken, and the band cap above now
        // routes the worst cases here, so it would have been broken far more often.
        `You have made part of the business visible, but ${
          weak ? `a buyer still sees that ${weak}` : 'some of how it runs is still hard to see from the outside'
        }. A buyer can't verify what they can't see, so they hold back part of the multiple as contingency for it.`,
        "Think of buying a car: the more service history and inspection you can show, the closer to full price it goes; the parts you can't prove, the buyer discounts for. Close those remaining gaps and the contingency shrinks - that is the difference between today's number and the captured one.",
      ],
    };
  }

  return {
    title: 'Why the number is what it is',
    paragraphs: [
      opener,
      'You have done the hard part. A buyer can largely see how this business runs without you, so there is little left for them to discount for the unknown - which is why you are near the top of what your sector commands.',
      weak
        ? `The small remaining gap is ${weak}. Tidy that and there is almost nothing left for a buyer to hold back.`
        : 'There is almost nothing left for a buyer to hold back - this reads as an asset, not a job.',
    ],
  };
}
