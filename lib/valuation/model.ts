// lib/valuation/model.ts
//
// The Kira business valuation model.
//
// A privately owned business is worth ~1x its profit when the operating system lives in the
// founder's head, and up to its full industry multiple when that knowledge is captured, documented
// and transferable. This model turns an owner's answers into three honest numbers:
//
//   1. walkAway   - sell the gear and close the doors (the floor).
//   2. today      - what it's realistically worth NOW, given how transferable it currently is.
//   3. potential  - what it's worth once the capturable operating knowledge is captured into a
//                   Business Genome (the transferable-asset number).
//
// The gap between (2) and (3) is the headline: the dollar value of the knowledge that today only
// exists in the owner's head. Each capturable factor that scores below its ceiling becomes a named,
// costed reason for that gap.
//
// The multiple lever is drawn directly from the Empire Worksheet's owner-involvement factors
// (hands-on 0.3 -> involved 0.5 -> fully-under-management 1.0): owner dependence is the heaviest
// weight in the readiness score. Everything here is a pure function of the inputs - no I/O, no
// side effects - so it is unit-testable and deterministic.

import { lookupMultiple } from './industry-multiples';

export type ProfitTrend = 'growing_strongly' | 'growing' | 'flat' | 'declining';
export type MarginTrend = 'improving' | 'stable' | 'shrinking';
export type ClientTrend = 'expanding' | 'stable' | 'shrinking';
export type ClientConcentration = 'diversified' | 'moderate' | 'concentrated';
export type OwnerDependence = 'i_am_the_business' | 'heavily_involved' | 'mostly_runs' | 'fully_managed';
export type Systems = 'documented_team' | 'some' | 'in_my_head';
export type RecurringRevenue = 'strong' | 'some' | 'none';

export interface ValuationInputs {
  /** Industry name (matched against the multiples table; unknown -> median, honestly flagged). */
  industry: string;
  /** Adjusted annual profit / owner earnings (SDE-style), in dollars. */
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
  /** Current normalised sub-score, 0..1. */
  score: number;
  /** Weight in the readiness composite. */
  weight: number;
  /**
   * Whether capturing operating knowledge can lift this factor (owner-dependence, systems,
   * recurring revenue, client concentration) - as opposed to market trend, which it cannot.
   */
  capturable: boolean;
  /** Dollar uplift from lifting this factor to its ceiling (only meaningful when capturable). */
  uplift: number;
  /** Plain-English reason shown to the owner when this factor drags the valuation down. */
  reason: string;
}

export interface ValuationResult {
  industryMultiple: number;
  industryMatched: boolean;
  /** Readiness today, 0..1. */
  readiness: number;
  /** Readiness once all capturable factors are maxed, 0..1. */
  readinessPotential: number;
  /** Effective multiple applied to profit today. */
  appliedMultipleToday: number;
  /** Effective multiple once capturable knowledge is captured. */
  appliedMultiplePotential: number;
  walkAway: number;
  today: number;
  potential: number;
  /** potential - today: the value of the knowledge currently locked in the owner's head. */
  gap: number;
  /** Capturable factors dragging value down, richest uplift first. */
  factors: ReadinessFactor[];
}

// --- Sub-score maps (0 = worst / least transferable, 1 = best) -------------------------------

const OWNER_DEPENDENCE_SCORE: Record<OwnerDependence, number> = {
  i_am_the_business: 0,
  heavily_involved: 0.33,
  mostly_runs: 0.7,
  fully_managed: 1,
};

const SYSTEMS_SCORE: Record<Systems, number> = {
  in_my_head: 0,
  some: 0.5,
  documented_team: 1,
};

const RECURRING_SCORE: Record<RecurringRevenue, number> = {
  none: 0,
  some: 0.5,
  strong: 1,
};

const CONCENTRATION_SCORE: Record<ClientConcentration, number> = {
  concentrated: 0,
  moderate: 0.5,
  diversified: 1,
};

const PROFIT_TREND_SCORE: Record<ProfitTrend, number> = {
  declining: 0,
  flat: 0.4,
  growing: 0.75,
  growing_strongly: 1,
};

const MARGIN_TREND_SCORE: Record<MarginTrend, number> = {
  shrinking: 0,
  stable: 0.5,
  improving: 1,
};

const CLIENT_TREND_SCORE: Record<ClientTrend, number> = {
  shrinking: 0,
  stable: 0.5,
  expanding: 1,
};

// --- Factor weights (sum = 10, so readiness = weighted sum / 10) ------------------------------

const WEIGHTS = {
  ownerDependence: 3,
  systems: 2,
  recurringRevenue: 2,
  clientConcentration: 1.5,
  growth: 1.5,
} as const;

const TOTAL_WEIGHT =
  WEIGHTS.ownerDependence +
  WEIGHTS.systems +
  WEIGHTS.recurringRevenue +
  WEIGHTS.clientConcentration +
  WEIGHTS.growth;

/**
 * The "systemised potential" never claims perfection on market factors it can't control. Capturing
 * knowledge maxes the capturable factors; growth stays at the owner's actual answer.
 */
function round(n: number): number {
  return Math.round(n);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Map profit x multiple, guarding against negative/zero profit (a business losing money has no
 * earnings multiple - it's worth its assets, not a multiple of losses).
 */
function earningsValue(annualProfit: number, multiple: number): number {
  if (annualProfit <= 0) return 0;
  return annualProfit * multiple;
}

export function computeValuation(inputs: ValuationInputs): ValuationResult {
  const { multiple: industryMultiple, matched: industryMatched } = lookupMultiple(inputs.industry);

  const growthScore = clamp01(
    (PROFIT_TREND_SCORE[inputs.profitTrend] +
      MARGIN_TREND_SCORE[inputs.marginTrend] +
      CLIENT_TREND_SCORE[inputs.clientTrend]) /
      3,
  );

  // Build the factor list. capturable factors can be lifted by capturing operating knowledge;
  // growth reflects the market and cannot.
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

  const readiness = clamp01(
    rawFactors.reduce((sum, f) => sum + f.score * f.weight, 0) / TOTAL_WEIGHT,
  );

  // Potential readiness: capturable factors -> 1, market factor stays as answered.
  const readinessPotential = clamp01(
    rawFactors.reduce((sum, f) => sum + (f.capturable ? 1 : f.score) * f.weight, 0) / TOTAL_WEIGHT,
  );

  // Applied multiple ranges from 1x (readiness 0) to the full industry multiple (readiness 1).
  const spread = Math.max(0, industryMultiple - 1);
  const appliedMultipleToday = 1 + readiness * spread;
  const appliedMultiplePotential = 1 + readinessPotential * spread;

  const walkAway = round(Math.max(0, inputs.tangibleAssets || 0));
  const today = round(earningsValue(inputs.annualProfit, appliedMultipleToday));
  const potential = round(earningsValue(inputs.annualProfit, appliedMultiplePotential));
  const gap = Math.max(0, potential - today);

  // Per-factor uplift: value unlocked by lifting each capturable factor to its ceiling. Sum of
  // capturable uplifts equals the gap (same spread, same profit), so the reasons "add up".
  const factors: ReadinessFactor[] = rawFactors
    .map((f) => {
      const uplift =
        f.capturable && inputs.annualProfit > 0
          ? round(inputs.annualProfit * ((1 - f.score) * f.weight) / TOTAL_WEIGHT * spread)
          : 0;
      return { ...f, uplift };
    })
    .sort((a, b) => b.uplift - a.uplift);

  return {
    industryMultiple,
    industryMatched,
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

/** Format a dollar figure the way it appears on the result screen (AUD, no cents). */
export function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}
