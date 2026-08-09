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
import { sectorContext } from './sector-context';

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
  /**
   * Adjusted annual profit / owner earnings, in dollars.
   *
   * SDE = net profit + owner salary & perks + interest + depreciation + one-offs a new owner would
   * not carry. The canonical wording an owner is shown is `lib/valuation/sde-copy.ts`; this comment
   * used to say "net profit + owner salary & perks" and stop, which made it the third statement of
   * SDE in the codebase and the shortest.
   *
   * ⚠️ INTEREST IS THE ONE THAT MATTERS TO THE ARITHMETIC AROUND THIS FIELD. SDE is a PRE-debt-
   * service measure, so `multiple × SDE` is the value of the business regardless of how it is
   * financed. What the owner is left with is that MINUS what the business owes, which is why debt is
   * subtracted at the page (register P7/K7) and NOT here. Fold debt into this figure and it is
   * counted twice.
   */
  annualProfit: number;
  /** Rough value of tangible assets (equipment, vehicles, stock) - feeds the walk-away floor. */
  tangibleAssets: number;
  /**
   * What the business owes: finance, overdraft, ATO debt, leases. OPTIONAL, and deliberately UNUSED
   * by `computeValuation`.
   *
   * ⚠️ NOTHING IN THIS FILE MAY READ IT. Debt converts enterprise value to equity value, which is
   * arithmetic performed at the page on top of a finished valuation (`lib/valuation/net-of-debt.ts`)
   * — exactly like the realisable-asset range (register A6). Reading it here would change what
   * `MODEL_VERSION` means and re-price six stored snapshots that are introducer baselines.
   *
   * Optional rather than required on purpose: `ValuationInputs` has nine required fields and
   * `isUsableInputs` guards four of them (register C5), so a tenth REQUIRED field would start
   * failing writes for any client still holding the old payload shape. Blank behaves exactly as
   * before.
   */
  businessDebt?: number;
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

// Every question has a WORST answer (0), a MEDIAN answer, and an OPTIMUM (1). The median is not
// automatically 0.5: it sits where a buyer's confidence actually sits when he hears that answer,
// and for most of these that is below the midpoint, because a half-answer to "can it run without
// you?" reassures a buyer far less than a full one.

const OWNER_DEPENDENCE_SCORE: Record<OwnerDependence, number> = {
  i_am_the_business: 0, //  he is buying a job
  heavily_involved: 0.2, // "I could step back a bit" — a buyer hears no real change
  mostly_runs: 0.65, //     the first answer that makes him believe a handover is possible
  fully_managed: 1, //      he can own it without working in it
};
// Deliberately below the midpoint: half-documented is far nearer to nothing than to documented,
// because a buyer cannot tell which half is missing until he owns it.
const SYSTEMS_SCORE: Record<Systems, number> = { in_my_head: 0, some: 0.4, documented_team: 1 };
// "Some" recurring revenue genuinely de-risks the first year, so this one sits at the midpoint.
const RECURRING_SCORE: Record<RecurringRevenue, number> = { none: 0, some: 0.5, strong: 1 };
// Moderate concentration is a real improvement on a business leaning on two or three accounts.
const CONCENTRATION_SCORE: Record<ClientConcentration, number> = { concentrated: 0, moderate: 0.55, diversified: 1 };
// FLAT IS NOT HALF-GOOD. A buyer paying for upside wants a line going up; flat earns him nothing to
// leverage and declining actively frightens him, so the median answer scores low rather than middling.
const PROFIT_TREND_SCORE: Record<ProfitTrend, number> = { declining: 0, flat: 0.35, growing: 0.75, growing_strongly: 1 };
const MARGIN_TREND_SCORE: Record<MarginTrend, number> = { shrinking: 0, stable: 0.45, improving: 1 };
const CLIENT_TREND_SCORE: Record<ClientTrend, number> = { shrinking: 0, stable: 0.45, expanding: 1 };

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
export const MODEL_VERSION = '2026-08-08.1';

/**
 * THE RUBRIC. Ten points, split across the three questions a buyer is actually asking.
 *
 *   CAN I TAKE IT OVER?     ownerDependence 3.0 + systems 2.0 = 5.0
 *     Half of everything, because it is the gate rather than a factor. A business that stops when
 *     the owner stops is not a business a buyer can own; he is bidding for equipment and a customer
 *     list. Owner-dependence outweighs systems because documentation without a team that can act on
 *     it still leaves him buying a job — the paperwork helps him, it does not replace the person.
 *
 *   WILL THE EARNINGS LAST? recurringRevenue 1.75 + clientConcentration 1.25 = 3.0
 *     He is buying next year's profit, not last year's. Locked-in revenue is worth more than spread
 *     revenue because it survives the handover: contracts renew whether or not the new owner has the
 *     relationship. Concentration is the same risk one step removed — three big clients who know the
 *     seller personally is a discount, and both of those are risks the seller can genuinely reduce.
 *
 *   CAN I MAKE IT BETTER?   growth 2.0
 *     The upside that takes a good business to the TOP of the range rather than the middle of it.
 *     Smallest of the three deliberately: a buyer discounts his own optimism, and he will not pay
 *     today for improvements he intends to make himself. It is also the one thing on this list the
 *     seller cannot fix by writing things down, which is why it is scored but not claimable.
 */
const WEIGHTS = { ownerDependence: 3, systems: 2, recurringRevenue: 1.75, clientConcentration: 1.25, growth: 2 } as const;
const TOTAL_WEIGHT =
  WEIGHTS.ownerDependence + WEIGHTS.systems + WEIGHTS.recurringRevenue + WEIGHTS.clientConcentration + WEIGHTS.growth;

// --- Multiple-band constants (calibrated to BizBuySell 2025 SDE data) -------------------------
//
// ⚠️ REBUILT 2026-08-03. The previous band asserted more than its own cited source supports, and the
// source is printed on the results page — so a broker checking one multiple against BizBuySell found
// us above their published range and the whole number lost its standing. Register A1-A4.
//
// WHAT WAS WRONG, in one line each:
//   A1  ceiling = sector x 1.6 + up to 3.0, capped at 8 — above the cited 1.5-6.6 range on size alone.
//   A2  the size adjustment only ever ADDED. Market practice discounts small businesses 20-30% for
//       illiquidity; we did the opposite at the top and nothing at the bottom.
//   A3  it widened the CEILING only, so the GAP — the number the product sells on — grew
//       super-linearly with profit, overclaiming hardest for the businesses a broker would look at.
//   A4  applied = floor + readiness x spread, with a spread of 3-6 turns, made the transferability
//       score BE the valuation rather than sit beside it.
//
// THE CORRECTION RESTS ON ONE FACT IN sde-multiples.ts: the sector figure is the median for a
// TYPICAL business at AVERAGE readiness. It is a CENTRE, not a floor. The old model treated it as a
// floor and then multiplied, which is where every one of A1-A4 came from.
//
// So: centre on the sector median, let transferability move it by SPREAD in total, and let size
// adjust the centre — moving BOTH ends together, which is what stops the gap ballooning.
//
// SPREAD is the whole commercial claim and it is deliberately small. The defensible position is that
// documentation is worth roughly half a turn to a turn, showing up mostly as a discount NOT TAKEN
// and a shorter due diligence. Operator decision 2026-08-03: 0.75, the middle of that.

/**
 * THE 2026-08-04 CORRECTION — why the floor is now absolute.
 *
 * The 08-03 rework fixed the overclaim (A1-A4) by centring on the sector median and letting
 * transferability move you only 0.75 turns around it. That was right about ONE thing and wrong
 * about the other, and the wrong half produced this:
 *
 *   sector median 6.60x  ->  a business ENTIRELY in the owner's head was valued at 6.22x
 *   sector median 5.11x  ->  4.74x
 *   sector median 2.62x  ->  2.33x
 *
 * A business nobody but the owner can run was priced a third of a turn below a typical sold
 * business in its sector. That says total owner-dependence costs 0.375 turns. It costs multiples.
 *
 * THE CONFLATION: the sector median is the median of businesses that ACTUALLY SOLD, at average
 * readiness. A business whose operations live in one man's head is not median — it sits at the
 * bottom of that distribution or outside it, because the buyer is purchasing a job, not an asset.
 * Two different quantities had been collapsed into one narrow band:
 *
 *   WHERE YOU ARE      — the buyer's discount. Must range widely, from barely-sellable up to the
 *                        sector's own ceiling. This is not our claim; it is the market's.
 *   WHAT KIRA MOVES    — modest, and bounded. Documentation is worth a discount NOT TAKEN and a
 *                        shorter due diligence. It does not turn a 1.5x business into a 5x one;
 *                        that needs a manager and recurring contracts, which is a different
 *                        business, not a written-down one.
 *
 * So readiness now interpolates from an ABSOLUTE floor to the sector-scaled ceiling, and Kira's
 * claimed uplift is capped separately. A4's concern — "the transferability score must not BE the
 * valuation" — is answered not by narrowing the band (which made the number indefensible) but by
 * bounding the CLAIM while letting today's number tell the truth.
 *
 * Operator decision, 2026-08-04: rescore everyone rather than freeze existing snapshots.
 */

/**
 * THE BAND IS DERIVED FROM WHAT EACH SIDE WILL ACTUALLY AGREE TO, not from a foreign dataset.
 *
 * Every earlier version anchored on the median of US closed sales and then argued about how far to
 * move from it. That put a number on the page whose defence was "an American website says so",
 * which is a poor answer to an Australian owner and a worse one to his broker. This is our rubric,
 * and it derives from the two reservation prices that actually bound a deal:
 *
 *   THE SELLER'S FLOOR — 1.5x. Below this he does not sell; he keeps working it. A year and a half
 *   of profit is not worth handing over a business he could simply continue to run, and no argument
 *   about market comparables changes that. It is a reservation price, not a computed value, which is
 *   why it is absolute and does not scale with sector.
 *
 *   THE BUYER'S CEILING — 5.0x. No buyer pays more than four or five years of profit for a small
 *   business, and only reaches the top when THREE things are true at once: it is well run, it is
 *   easy to take over, and he believes he can add his own spin and lift the margins. Miss any one
 *   and he is not at the top of the range.
 *
 * That last sentence IS the weighting. The three conditions are what the questions measure, and
 * their relative weight is how much each one governs whether the deal happens at all:
 *
 *   CAN I TAKE IT OVER?      5.0 / 10  — the gate. If it cannot run without him, nothing else
 *                                        matters; there is no price, only an offer for the assets.
 *   WILL THE EARNINGS LAST?  3.0 / 10  — is he buying a proven income or a hopeful one.
 *   CAN I MAKE IT BETTER?    2.0 / 10  — the upside that takes a good business to the top of the
 *                                        range. Real, but the smallest of the three, because a
 *                                        buyer discounts his own optimism.
 *
 * A useful property falls out rather than being tuned in: a well-run, easily transferred business
 * with flat trend reaches 4.3x — a buyer pays four years of profit for something he can take over
 * and that keeps earning. Five only comes with the growth story on top. That is the psychology the
 * band was built from, reproduced by the arithmetic rather than asserted beside it.
 */
const SELLER_RESERVATION_FLOOR = 1.5;
const BUYER_CEILING = 5.0;

/**
 * The sector median's endpoints, as fractions of the median itself.
 *
 * The median is the middle of businesses that ACTUALLY SOLD, at average readiness. These place the
 * bottom and the top of that distribution around it — the "on the tools, one client" end and the
 * "manager-run, contracted, owner off the tools" end.
 *
 * Calibrated against published Australian ranges rather than chosen: 0.75/1.35 on plumbing's 2.62
 * gives 1.97-3.54 where AU guidance says 2.0-3.5, and on electrical's 2.94 gives 2.21-3.97 where it
 * says 2.5-4.0. `au-evidence.test.ts` pins that fit, so moving either ratio without re-reading the
 * evidence fails the suite.
 *
 * ⚠️ Hospitality is the known soft spot: coffee shops land 1.71-3.08 against a published 1.5-2.5,
 * because AU hospitality carries lease risk the US median does not price. Recorded, not tuned away —
 * a per-family correction needs better data than a broker guide.
 */
const SECTOR_FLOOR_RATIO = 0.75;
const SECTOR_CEILING_RATIO = 1.35;

/** Kept for the copy layer's "nothing outside a sane range" clamps. */
const OWNER_DEPENDENT_FLOOR = SELLER_RESERVATION_FLOOR;

/**
 * The most Kira may claim to add, in turns of SDE, however large the gap to the ceiling.
 *
 * This is the whole commercial claim and it is deliberately small — the defensible position is that
 * documentation is worth roughly half a turn to a turn. Unchanged from the 08-03 decision; what
 * changed is that it now bounds the CLAIM rather than the whole band.
 */
const DOCUMENTATION_UPLIFT = 0.75;

// SDE_FLOOR (1.5) and SDE_CAP (6.6) — the cited source's own range — were REMOVED on 2026-08-07.
// They clamped `centreMultiple`, a size-adjusted sector median that was computed, immediately
// `void`ed, and used by nothing. Dead since the 08-04 rewrite made the band absolute.
//
// Deleted rather than left harmless because of what it implied to a reader: live code multiplying
// the sector median by the size adjustment reads as though the foreign dataset still feeds the
// number, which is the exact claim the 08-04 rewrite exists to retire. An auditor reads the code
// before the comment above it.
//
// The band it guarded is 1.5x–5.0x, already inside 1.5–6.6, so the clamp could never bind. Sector
// context still reaches the copy layer as the RAW `sdeMultiple` on the result (see the return),
// which is what "a typical business in your sector changes hands around Nx" needs — unadjusted, and
// never an input to the valuation.

/** Below this SDE a business is harder to sell — fewer buyers, more key-person risk. */
const SIZE_ANCHOR = 250_000;
/** Multiplicative adjustment to the CENTRE. Below the anchor it discounts; above, it adds. */
const SIZE_ADJ_MIN = 0.75;
const SIZE_ADJ_MAX = 1.25;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function round(n: number): number {
  return Math.round(n);
}

/**
 * How a business's SIZE moves its multiple, as a factor on the sector median.
 *
 * Both directions, which is the A2 fix: under the anchor it DISCOUNTS (a $120k-SDE business has
 * fewer buyers, thinner management and worse financing options, and the market prices that), over it
 * it adds. Applied to the CENTRE so both floor and ceiling move together — that is the A3 fix, and
 * it is why the gap no longer grows super-linearly with profit.
 */
function sizeAdjustment(annualProfit: number): number {
  if (annualProfit <= 0) return SIZE_ADJ_MIN;
  // log10 of the ratio to the anchor: 1/10th the anchor -> -1, 10x the anchor -> +1.
  const decades = Math.log10(annualProfit / SIZE_ANCHOR);
  return clamp(1 + decades * 0.25, SIZE_ADJ_MIN, SIZE_ADJ_MAX);
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
      // QUOTE HIS ANSWER BACK, not the worst case.
      //
      // This sentence was fixed text. A tester answered "Some" locked-in revenue and was told
      // "Little locked-in revenue means a buyer inherits uncertainty." His note was mild — "small
      // thing. But if you're going to quote my own answers at me, quote them" — and he is being
      // generous: this screen's whole job is to show him the maths is reading what he actually
      // said. Being told he answered something he did not is the cheapest possible way to lose that.
      //
      // The other five factors have the same shape and the same latent bug; this is the one that was
      // observed, and the pattern for fixing the rest is here.
      reason:
        inputs.recurringRevenue === 'strong'
          ? 'Locked-in revenue is the strongest thing you have here — contracts and repeat accounts make future earnings predictable, which is exactly what a buyer is paying for.'
          : inputs.recurringRevenue === 'some'
            ? 'Some revenue is locked in ahead of time, and the rest a buyer has to take on trust. Moving more of it onto contracts or repeat accounts is what turns a hopeful year into a predictable one.'
            : 'Almost nothing is locked in ahead of time, so a buyer inherits the uncertainty of starting each month from scratch. Contracts and repeat revenue make future earnings predictable.',
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
  // The sector median IS the centre — see the constants block. Size moves the centre; transferability
  // moves you within a narrow band around it. Both ends are clamped into the cited source's range, so
  // no input combination can produce a multiple BizBuySell's own data does not support.
  // THE BAND: the seller's reservation price up to the buyer's ceiling.
  //
  // Size limits how far up the range a business can reach, and only that — it never lifts the floor,
  // because the seller's "I may as well keep working it" does not soften because the business is
  // small. A smaller business has fewer buyers, no management layer and worse financing, so the top
  // of its range is lower however well run it is. Measured, so the numbers here are the real curve
  // rather than an estimate: $25k profit tops out at 3.75x, $60k at 4.23x, $120k at 4.60x, and from
  // $250k up the full 5.00x is reachable.
  //
  // ⚠️ THE BAND IS SECTOR-SCALED AGAIN, 2026-08-08. Read this before changing either ratio.
  //
  // From 08-04 to 08-08 the band was UNIVERSAL — 1.5x to 5.0x for every sector alike, scaled only by
  // profit. That was a deliberate escape from anchoring on US medians whose only defence was "an
  // American website says so". It bought defensibility at the door and gave away the thing the
  // sector question is for: at $300k SDE a well-run cafe and a well-run medical-billing business
  // were both shown 4.68x — $1,405,500 — while the screen told the owner his sector set the
  // multiple. It did not. Sector fed nothing.
  //
  // WHAT CHANGED IS THE EVIDENCE, not the appetite (lib/valuation/au-evidence.ts). Australian
  // sources publishing on an SDE basis corroborate the US sector medians rather than contradicting
  // them — plumbing 2.62 against a published AU 2.0-3.5, electrical 2.94 against 2.5-4.0,
  // restaurants 2.26 against 1.5-2.5. The premise that sent us looking (a broker's "1-1.5x for AU
  // trades") is not supported on this basis anywhere. So the fix for data we could not defend was
  // never "use no data" — it was corroborated data.
  //
  // And the AU plumbing source describes its range in exactly this model's terms:
  //
  //   "on the tools, one residential builder"           -> anchored at 2.0x
  //   "five vans, never touches a wrench, strata work"  -> buyers happily pay 3.5x
  //
  // A sector floor and a sector ceiling with transferability interpolating between them: our shape,
  // independently arrived at by an Australian broker. A FLAT band cannot reproduce that, because it
  // has discarded the sector before it starts.
  //
  // THE RATIOS ARE CALIBRATED TO REPRODUCE PUBLISHED RANGES, and au-evidence.test.ts fails if they
  // drift out: 0.75 x 2.62 = 1.97 and 1.35 x 2.62 = 3.54, against a published 2.0-3.5.
  //
  // Two guards survive from the universal band because their reasoning is sector-independent:
  //   SELLER_RESERVATION_FLOOR — below ~1.5x he does not sell, he keeps working it. That argument
  //     does not soften because his sector is cheap, so it is a hard floor under the sector floor.
  //   BUYER_CEILING — no buyer pays more than four or five years of profit for a small business,
  //     however rich the sector median. A hard cap over the sector ceiling.
  //
  // Size still limits how far UP the range a business can reach and never lifts the floor: a smaller
  // business has fewer buyers, no management layer and worse financing.
  const sectorFloor = Math.max(SELLER_RESERVATION_FLOOR, sdeMultiple * SECTOR_FLOOR_RATIO);
  const sectorCeiling = Math.min(
    BUYER_CEILING,
    sdeMultiple * SECTOR_CEILING_RATIO * sizeAdjustment(inputs.annualProfit),
  );
  // A cheap sector at a small size can push the scaled ceiling under the hard floor. Order them
  // rather than let `spread` go negative and invert the whole band.
  const floorMultiple = Math.min(sectorFloor, sectorCeiling);
  const ceilingMultiple = Math.max(sectorFloor, sectorCeiling);
  const spread = Math.max(0, ceilingMultiple - floorMultiple);

  // TODAY is the buyer's discount, and it is allowed to be brutal — that is the honest half.
  const appliedMultipleToday = floorMultiple + readiness * spread;

  // POTENTIAL is OUR claim, and it scales with HOW MUCH IS LEFT TO CAPTURE — it is not a flat
  // maximum handed to everyone.
  //
  // This was briefly a hard cap (`min(uncapped, today + 0.75)`), and a dry run against real stored
  // valuations caught what that does: the cap binds for almost every business, so every owner was
  // quoted the full three-quarters of a turn whether he had documented nothing or nearly everything.
  // On the two live rows the claimed gap roughly DOUBLED — and since the monthly price is derived
  // from the gap, that meant charging more off a lower valuation. Exactly backwards.
  //
  // So the claim is proportional: DOCUMENTATION_UPLIFT is what capturing EVERYTHING would be worth,
  // and a business that has already documented half of it can only be offered the other half. An
  // owner who has done the work himself should see a smaller number here, not the same one.
  const captureHeadroom = Math.max(0, readinessPotential - readiness);
  const claimedUplift = DOCUMENTATION_UPLIFT * captureHeadroom;
  const appliedMultiplePotential = Math.min(
    floorMultiple + readinessPotential * spread, // never claim past where the band itself tops out
    appliedMultipleToday + claimedUplift,
  );

  /** Turns of multiple this product actually claims to move — the basis for every per-factor uplift. */
  const claimedSpread = Math.max(0, appliedMultiplePotential - appliedMultipleToday);

  const walkAway = round(Math.max(0, inputs.tangibleAssets || 0));
  const today = round(earningsValue(inputs.annualProfit, appliedMultipleToday));
  const potential = round(earningsValue(inputs.annualProfit, appliedMultiplePotential));
  const gap = Math.max(0, potential - today);

  // THE ITEMISED DRIVERS MUST SUM TO THE GAP THEY ITEMISE.
  //
  // Each capturable factor gets its SHARE of the claimed gap, not its share of the full band. The
  // old formula multiplied each factor's weight by the whole spread, which matched the gap only
  // while the gap WAS the whole spread. Now that the claim is capped, that would over-state every
  // driver and the column would no longer add up to the headline.
  //
  // A tester found precisely this shape on the dashboard — four drivers summing to $138,200 beside
  // a headline gap of $138,000 and a result page saying $134,000. Three numbers for one figure is
  // the fastest way to lose a suspicious reader, because it is the one thing he can check with a
  // calculator.
  const capturableDelta = Math.max(0, readinessPotential - readiness);
  const factors: ReadinessFactor[] = rawFactors
    .map((f) => {
      const share = capturableDelta > 0 ? ((1 - f.score) * f.weight) / TOTAL_WEIGHT / capturableDelta : 0;
      const uplift =
        f.capturable && inputs.annualProfit > 0
          ? round(inputs.annualProfit * claimedSpread * share)
          : 0;
      return { ...f, uplift };
    })
    .sort((a, b) => b.uplift - a.uplift);

  // THE LARGEST DRIVER ABSORBS THE ROUNDING, so the column adds up to the headline EXACTLY.
  //
  // Rounding five shares independently leaves the sum a dollar or two off the gap, and "near enough"
  // is the wrong standard here: the reader this product is written for checks the subtraction on a
  // calculator, said so, and told us that getting a visible two-number sum not-quite-right is worse
  // than being wrong somewhere he cannot see. The largest driver takes the remainder because a $1
  // adjustment is invisible against the biggest number and conspicuous against the smallest.
  const upliftSum = factors.reduce((s, f) => s + f.uplift, 0);
  const remainder = gap - upliftSum;
  if (remainder !== 0 && factors.length > 0 && factors[0]!.uplift > 0) {
    factors[0] = { ...factors[0]!, uplift: factors[0]!.uplift + remainder };
  }

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

  // Both the low and the strong narrative used to make a claim about where his multiple sits
  // RELATIVE TO HIS SECTOR without printing either figure, and both claims are reachably false
  // (see sector-context.ts). Derived once here so the two branches cannot drift apart.
  const sector = sectorContext({
    sectorMultiple: result.sdeMultiple,
    appliedMultiple: result.appliedMultipleToday,
    matched: result.sectorMatched,
  });

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
        // ⚠️ THE DIRECTION IS DERIVED, NOT ASSERTED (P4). This sentence used to end "which is why
        // the multiple sits below your sector's average, not at it" — a claim about a number it did
        // not print and did not check. It is reachably FALSE: an owner who answers "I am the
        // business" in a cheap sector is priced ABOVE his sector median, because the absolute
        // seller's floor (1.5x) sits above that sector's scaled floor. Routes at 1.51x on $120k SDE
        // comes out at 1.6x — the weakest possible business, told it was being marked down below a
        // median it is in fact above. See sector-context.ts.
        `It is the same as buying a car sight unseen on the seller's promises: you would knock the price down to cover the unknown unknowns, because you are the one who wears it if things turn out worse than described. A buyer does exactly that here - ${sector.clause}`,
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
      `You have done the hard part. A buyer can largely see how this business runs without you, so there is little left for them to discount for the unknown - ${sector.strongClause}`,
      weak
        ? `The small remaining gap is ${weak}. Tidy that and there is almost nothing left for a buyer to hold back.`
        : 'There is almost nothing left for a buyer to hold back - this reads as an asset, not a job.',
    ],
  };
}
