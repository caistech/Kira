// lib/valuation/net-position.ts
//
// ENTERPRISE VALUE → WHAT HE WALKS AWAY WITH. The steps between "what the business is worth" and
// "what lands in your pocket".
//
// ⚠️ RENAMED FROM `net-of-debt.ts` ON 2026-08-09, and the rename is the point rather than tidying.
// This used to subtract debt and nothing else, so `netOfDebt` was an exact description. It now also
// ADDS work in progress and retentions (register P7), and a function called `netOfDebt` that quietly
// adds receivables is the "name and behaviour disagree" trap — the one a reader cannot catch by
// reading the call site, because the call site looks right.
//
// THE OPTIONS OBJECT IS ALSO DELIBERATE. Two money figures of the same type, passed positionally,
// can be swapped with no type error and no test failure on symmetric fixtures — and swapping these
// two INVERTS the answer, turning $380k owed into $380k owed to him. Named, that is impossible.
//
// WHY IT IS A SEPARATE MODULE AND NOT PART OF THE MODEL. `computeValuation` produces a valuation of
// the BUSINESS, independent of how it happens to be financed — that is what a multiple of SDE means,
// because SDE is a pre-debt-service measure with interest added back. What an owner keeps is that
// value, less what the business owes, plus what is owed TO it. Three different quantities, and
// collapsing them into one is the mistake this file exists to avoid: it would change what
// MODEL_VERSION means and re-price six stored snapshots that are introducer baselines. Same shape as
// the realisable-asset range, which is likewise derived at the page (register A6).
//
// ⚠️ THE DEBT LEG IS CORRECT ONLY IF THE PROFIT FIGURE IS GENUINELY PRE-DEBT-SERVICE. If an owner
// enters a profit that has already absorbed his interest, this takes his debt off a second time, and
// both errors push the same way. That is why the interest add-back is named in the worked example and
// the confirmation note, not only in the definition — see `sde-copy.ts`.

/**
 * The figures to net, passed EXPLICITLY rather than read off a `ValuationResult`.
 *
 * `result.walkAway` is BOOK value, and the walk-away figure an owner is actually shown is the
 * realisable 40–60c range derived at the page (register A6). Netting off book value and displaying
 * it against the range would silently mix two different quantities — so the caller states which
 * numbers it means, and this module cannot be wrong about it.
 */
export interface GrossFigures {
  /** Low end of the realisable walk-away range. */
  walkAwayLow: number;
  /** High end of the realisable walk-away range. */
  walkAwayHigh: number;
  today: number;
  potential: number;
}

export interface NetPositionInput {
  /** What the business owes: finance, overdraft, ATO, leases. Subtracted from every figure. */
  debt?: number | null;
  /**
   * Work in progress and retentions — work done and not yet in the bank. ADDED to every figure.
   *
   * Justified separately from debt, because "it is the opposite sign" is not a reason. On a going-
   * concern sale, work in progress and debtors are normally settled at completion rather than sold
   * with the business: the seller collects them or the price is adjusted for them, so they land with
   * HIM either way. On a close-up, he collects what he can. Both routes put it in his pocket, which
   * is the question this module answers.
   *
   * ⚠️ It is NOT certain money and the page says so. Retentions on a contract he walks away from may
   * never be released, and whether working capital transfers is a term of the contract of sale, not
   * a law of nature.
   */
  workInProgress?: number | null;
}

export interface NetPosition {
  /** Low end of the realisable range, netted. MAY BE NEGATIVE — see below. */
  walkAwayLow: number;
  /** High end of the realisable range, netted. MAY BE NEGATIVE. */
  walkAwayHigh: number;
  /** The going-concern value today, netted. */
  today: number;
  /** The value with the knowledge captured, netted. */
  potential: number;
  /** The debt actually applied, after coercion. Zero when nothing was entered. */
  debt: number;
  /** The work in progress actually applied, after coercion. Zero when nothing was entered. */
  workInProgress: number;
  /** True when either figure was supplied and is greater than zero — i.e. the block should render. */
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
 * A money answer, or zero.
 *
 * A missing, negative or non-finite answer is treated as "he did not tell us", never as a number.
 * Negative in particular is meaningless from either question and would move every figure the wrong
 * way if it were trusted.
 */
function money(input: number | null | undefined): number {
  const raw = Number(input);
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 0;
}

/**
 * Apply debt and work in progress to all four figures.
 *
 * ALL FOUR, and equally, which is the property that makes this safe: `potential - today` is
 * unchanged, so the GAP is unchanged, so the multiple, `MODEL_VERSION`, every stored snapshot and
 * the monthly price he is quoted are all untouched. These answers change what the valuation MEANS to
 * him, not what the model produced.
 *
 * ⚠️ WALK-AWAY IS NOT FLOORED AT ZERO, BY DECISION (operator, 2026-08-09). Equipment finance is
 * secured against the very gear the walk-away figure counts, so an owner can genuinely owe more than
 * the assets would fetch — and a negative number here is the single most useful thing the tool can
 * tell him, because it means closing the doors is not an option and the business has to be sold or
 * turned around. Flooring it at zero would replace that with a comfortable fiction. The operator's
 * words: "better for him to be clear and walk away than promise something from a not real basis."
 */
export function netPosition(gross: GrossFigures, input: NetPositionInput = {}): NetPosition {
  const debt = money(input.debt);
  const workInProgress = money(input.workInProgress);
  const adjustment = workInProgress - debt;

  const walkAwayHigh = gross.walkAwayHigh + adjustment;

  return {
    walkAwayLow: gross.walkAwayLow + adjustment,
    walkAwayHigh,
    today: gross.today + adjustment,
    potential: gross.potential + adjustment,
    debt,
    workInProgress,
    applied: debt > 0 || workInProgress > 0,
    walkAwayNegative: walkAwayHigh < 0,
  };
}
