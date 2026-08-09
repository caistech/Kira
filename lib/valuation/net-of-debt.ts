// lib/valuation/net-of-debt.ts
//
// ENTERPRISE VALUE → EQUITY VALUE. The one step between "what the business is worth" and "what
// lands in your pocket".
//
// WHY IT IS A SEPARATE MODULE AND NOT PART OF THE MODEL. `computeValuation` produces a valuation of
// the BUSINESS, independent of how it happens to be financed — that is what a multiple of SDE means,
// because SDE is a pre-debt-service measure with interest added back. What an owner keeps is that
// value minus what the business owes. Two different quantities, and collapsing them into one is the
// mistake this file exists to avoid: it would change what MODEL_VERSION means and re-price six
// stored snapshots that are introducer baselines. Same shape as the realisable-asset range, which
// is likewise derived at the page (register A6).
//
// THE OWNER'S FRAMING, WHICH IS THE RIGHT ONE. "You could have asked in one box and shown me the
// number I actually care about, which is what lands in my pocket... That's the number I'd screenshot
// and show my wife." He was being handed a disclaimer instructing him to do this subtraction
// himself.
//
// ⚠️ CORRECT ONLY IF THE PROFIT FIGURE IS GENUINELY PRE-DEBT-SERVICE. If an owner enters a profit
// that has already absorbed his interest, this takes his debt off a second time, and both errors
// push the same way. That is why the interest add-back is named in the worked example and the
// confirmation note, not only in the definition — see `sde-copy.ts`.

/**
 * The figures to net down, passed EXPLICITLY rather than read off a `ValuationResult`.
 *
 * `result.walkAway` is BOOK value, and the walk-away figure an owner is actually shown is the
 * realisable 40–60c range derived at the page (register A6). Netting debt off book value and
 * displaying it against the range would silently mix two different quantities — so the caller states
 * which numbers it means, and this module cannot be wrong about it.
 */
export interface GrossFigures {
  /** Low end of the realisable walk-away range. */
  walkAwayLow: number;
  /** High end of the realisable walk-away range. */
  walkAwayHigh: number;
  today: number;
  potential: number;
}

export interface NetOfDebt {
  /** Low end of the realisable range, less what is owed. MAY BE NEGATIVE — see below. */
  walkAwayLow: number;
  /** High end of the realisable range, less what is owed. MAY BE NEGATIVE. */
  walkAwayHigh: number;
  /** The going-concern value today, less what is owed. */
  today: number;
  /** The value with the knowledge captured, less what is owed. */
  potential: number;
  /** The debt actually applied, after coercion. Zero when nothing was entered. */
  debt: number;
  /** True when a debt figure was supplied and is greater than zero. */
  applied: boolean;
  /**
   * True when even the BEST case is under water — the top of the realisable range does not cover
   * what is owed. Deliberately the high end, not the low: this drives a sentence telling him that
   * closing the doors is not available to him, and that should be said when it is certainly true
   * rather than when it might be.
   */
  walkAwayNegative: boolean;
}

/**
 * Subtract debt from all three figures.
 *
 * ALL THREE, and equally, which is the property that makes this safe: `potential - today` is
 * unchanged, so the GAP is unchanged, so the multiple, `MODEL_VERSION`, every stored snapshot and
 * the monthly price he is quoted are all untouched. Debt changes what the valuation MEANS to him,
 * not what the model produced.
 *
 * ⚠️ WALK-AWAY IS NOT FLOORED AT ZERO, BY DECISION (operator, 2026-08-09). Equipment finance is
 * secured against the very gear the walk-away figure counts, so an owner can genuinely owe more than
 * the assets would fetch — and a negative number here is the single most useful thing the tool can
 * tell him, because it means closing the doors is not an option and the business has to be sold or
 * turned around. Flooring it at zero would replace that with a comfortable fiction. The operator's
 * words: "better for him to be clear and walk away than promise something from a not real basis."
 */
export function netOfDebt(gross: GrossFigures, debtInput: number | undefined | null): NetOfDebt {
  // A missing, negative or non-finite answer is treated as "he did not tell us", never as a number.
  // Negative debt in particular is meaningless and would INFLATE every figure if it were trusted.
  const raw = Number(debtInput);
  const debt = Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 0;

  const walkAwayHigh = gross.walkAwayHigh - debt;

  return {
    walkAwayLow: gross.walkAwayLow - debt,
    walkAwayHigh,
    today: gross.today - debt,
    potential: gross.potential - debt,
    debt,
    applied: debt > 0,
    walkAwayNegative: walkAwayHigh < 0,
  };
}
