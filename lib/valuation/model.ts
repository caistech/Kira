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

/** Format a dollar figure the way it appears on the result screen (AUD, no cents). */
export function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}
