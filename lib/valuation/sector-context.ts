// lib/valuation/sector-context.ts
//
// P4 — SAY WHAT THE SECTOR'S OWN MULTIPLE IS, beside his.
//
// The result page told an owner his multiple "sits below your sector's average, not at it" and never
// printed the average. His words: "If electrical contracting averages 4.1x and I'm at 2.8x, that's a
// fact I'd chew on for a week. As written it's a claim I can't check, on a page whose whole
// credibility rests on being checkable." The figure was already in `sde-multiples.ts` — we were
// withholding the one number that turns the argument into arithmetic.
//
// ⚠️ THE OLD SENTENCE ASSERTED A DIRECTION IT DID NOT CHECK, AND THE DIRECTION CAN BE WRONG.
// It sat in the LOW-readiness branch, on the assumption that low readiness means below the sector
// median. Since the band was sector-scaled (2026-08-08) that no longer follows: the ceiling carries a
// size adjustment the floor does not, so a large business in a cheap sector clears the median while
// still scoring badly. Worked example, electrical contracting at 2.94x on $460k SDE:
//
//     floor   = max(1.5, 2.94 x 0.75)              = 2.21
//     ceiling = min(5.0, 2.94 x 1.35 x 1.066)      = 4.23
//     low band tops out at 2.21 + 0.34 x 2.02      = 2.90    <- essentially AT the median, not below
//
// ⚠️ THAT WORKED EXAMPLE NO LONGER REPRODUCES, and the derivation is kept anyway. Under the
// 2026-08-14 band (A11: the floor ratio scales with the sector's level) the same business computes
// floor 2.07 / ceiling 4.23, and the low band reaches 2.55 against a 2.94 median — comfortably
// below it. Because the floor is now always `median x ratio` with ratio < 1, a low-readiness owner
// lands under his median far more often than before.
//
// So the specific counterexample is gone. The DISCIPLINE stays, for two reasons: the direction is
// cheap to compute and free to be right, and the band has now been rebuilt four times in eleven days
// — an asserted direction would have been silently wrong through at least one of those. A claim that
// happens to be true today is not the same as a claim that is checked.
//
// Printing the numbers is what makes that visible, so the direction is now DERIVED rather than
// asserted. This is the same discipline as `displayed.ts`: the words are computed from the figures
// the reader is looking at, so the two cannot contradict each other.
//
// PRECISION IS DELIBERATE AND UNIFORM. Both multiples print to one decimal — the precision the
// result cards already use ("~2.8x SDE") — and the comparison is made on those ROUNDED values, so
// the stated difference is exactly the subtraction a reader does on screen. Comparing the raw floats
// and printing the rounded ones is how you get "0.1 of a turn below" printed under "2.9x" and
// "2.9x", which is the J8 defect in a new place.

/** The sector medians' provenance, stated once so every surface citing it cites the same thing. */
export const MULTIPLE_SOURCE = 'BizBuySell 2025 sold-transaction data, 9,500+ closed small-business sales';

export type SectorDirection = 'below' | 'above' | 'at';

export interface SectorContextInput {
  /** The sector-median SDE multiple — `ValuationResult.sdeMultiple`, unadjusted. */
  sectorMultiple: number;
  /** What we applied to him today — `ValuationResult.appliedMultipleToday`. */
  appliedMultiple: number;
  /** `ValuationResult.sectorMatched`. False means this is the market average, NOT his sector. */
  matched: boolean;
}

export interface SectorContext {
  /** Sector median, at printed precision. */
  sectorMultiple: number;
  /** Applied multiple, at printed precision. */
  appliedMultiple: number;
  matched: boolean;
  direction: SectorDirection;
  /** Absolute difference between the two PRINTED figures. Zero when direction is 'at'. */
  turns: number;
  /** What the median is the median OF — never "your sector" when we failed to match one. */
  benchmarkNoun: string;
  /** Standalone sentence for the result page, under the number cards. */
  sentence: string;
  /** Clause for the buyer rationale, continuing "...A buyer does exactly that here — ". */
  clause: string;
  /**
   * Clause for the STRONG-readiness rationale, which had the same defect in the other direction:
   * "which is why you are near the top of what your sector commands" is false wherever the hard
   * buyer ceiling binds before the sector ceiling does. A marina at a 6.6× median tops out at 5.0×,
   * because no buyer pays more than five years of profit for a business this size — so the owner was
   * being told he is near the top of a figure he is a turn and a half short of.
   */
  strongClause: string;
}

function toPrinted(n: number): number {
  return Math.round(n * 10) / 10;
}

function fmt(n: number): string {
  return n.toFixed(1);
}

export function sectorContext(input: SectorContextInput): SectorContext {
  const sectorMultiple = toPrinted(input.sectorMultiple);
  const appliedMultiple = toPrinted(input.appliedMultiple);
  const turns = toPrinted(Math.abs(appliedMultiple - sectorMultiple));
  const direction: SectorDirection =
    turns === 0 ? 'at' : appliedMultiple < sectorMultiple ? 'below' : 'above';

  // WHEN WE DID NOT MATCH A SECTOR, `sectorMultiple` is the overall market average (2.5x) and
  // calling it "your sector" would fabricate a sector-specific figure for a man we just told we
  // could not place. The amber banner above already says we failed; this must agree with it.
  const benchmarkNoun = input.matched ? 'your sector' : 'the overall market';

  // The unmatched wording is deliberately NOT a second "we could not match your sector" — the amber
  // banner at the top of the result already says that and says how to fix it. Repeating it beside
  // the number reads as sloppy; making the failure a subordinate clause keeps the figure honest
  // without saying the same thing twice on one screen.
  const benchmark = input.matched
    ? `Businesses in your sector typically change hands at ${fmt(sectorMultiple)}× SDE.`
    : `Priced off the overall market average of ${fmt(sectorMultiple)}× SDE, since we could not place your sector.`;

  const standing =
    direction === 'at'
      ? `You are at ${fmt(appliedMultiple)}× today — level with that.`
      : `You are at ${fmt(appliedMultiple)}× today — ${fmt(turns)} of a turn ${direction}.`;

  const clause =
    direction === 'below'
      ? `which is why your multiple is ${fmt(appliedMultiple)}× and not the ${fmt(sectorMultiple)}× a typical business in ${benchmarkNoun} fetches.`
      : direction === 'at'
        ? `which is why your multiple is ${fmt(appliedMultiple)}× — level with a typical business in ${benchmarkNoun} rather than above it, despite what you have built.`
        : `and even at ${fmt(appliedMultiple)}× — above the ${fmt(sectorMultiple)}× a typical business in ${benchmarkNoun} fetches, on the size of your earnings — that discount is what stops it going higher.`;

  const strongClause =
    direction === 'below'
      ? `which is why you are near the top of what a buyer will pay for a business this size — ${fmt(appliedMultiple)}×. The ${fmt(sectorMultiple)}× median for ${benchmarkNoun} is reached by much larger deals than this one.`
      : `which is why you are at ${fmt(appliedMultiple)}× — ${direction === 'at' ? 'level with' : `${fmt(turns)} of a turn above`} the ${fmt(sectorMultiple)}× a typical business in ${benchmarkNoun} fetches.`;

  return {
    sectorMultiple,
    appliedMultiple,
    matched: input.matched,
    direction,
    turns,
    benchmarkNoun,
    sentence: `${benchmark} ${standing}`,
    clause,
    strongClause,
  };
}
