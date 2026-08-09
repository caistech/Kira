// lib/valuation/sde-copy.ts
//
// ONE definition of SDE, used everywhere it is explained to an owner.
//
// WHY THIS IS A MODULE AND NOT A STRING IN A PAGE. On 2026-07-27 a naive-tester — a business
// advisor of 25 years, i.e. exactly the audience — found the profit question contradicting itself
// on a single screen. The label said profit is what's left "after all costs, **plus** the salary
// and perks you pay yourself (often called SDE)". The helper text underneath said the owner "kept
// $200k **after** costs and your own pay".
//
// Those are two different numbers. For an owner-operated SME the difference is the owner's entire
// remuneration, which is frequently the largest single add-back in the calculation — so an owner
// reading the helper rather than the label enters a materially smaller figure, and the valuation
// is not slightly off, it is wrong. This is the ONE input the whole model runs on
// (`lib/valuation/model.ts`: SDE = net profit + owner salary & perks + interest + depreciation +
// one-offs a new owner would not carry).
//
// A definition that appears in four places will drift in four directions. It appears here once.

/** The canonical definition, as shown on the question label. */
export const SDE_DEFINITION =
  "What's left after all costs, plus the salary and perks you pay yourself (often called SDE). " +
  'Also add back interest, depreciation, and any one-off costs that a new owner would not carry. ' +
  'Not turnover - the smaller number you actually keep, with your own pay added back. This is what ' +
  'the valuation runs on.';

/** The short reminder shown under the input before anything is typed. */
export const SDE_SHORT_REMINDER =
  'Profit, not sales - and add back what you pay yourself, plus interest, depreciation and one-offs.';

/**
 * The worked example. Shows the components SEPARATELY, because the original failure was an example
 * that quietly folded the owner's pay into "what you kept".
 *
 * ⚠️ INTEREST IS NOW IN THE EXAMPLE, AND IT IS NOT A DETAIL. Added 2026-08-09 with the debt question
 * (register P7/K7). `SDE_DEFINITION` has always said to add interest back; this example and
 * `sdeMarginNote` did not, and they are the two surfaces an owner actually copies — the definition
 * is read once, the example is worked through. So the definition taught four add-backs and the
 * example taught two, which is the same label-versus-helper split this module exists to end, grown
 * back in a different pair of surfaces.
 *
 * It became a correctness bug rather than an imprecision the moment debt started being subtracted.
 * SDE is a PRE-debt-service measure: the multiple applied to it produces the value of the business
 * irrespective of how it is financed (enterprise value), and equity value is that MINUS what the
 * business owes. That is the only sequence in which subtracting debt is correct rather than a
 * double count. An owner who omits the interest add-back hands us a figure that has already absorbed
 * his debt service; we then multiply it and take the principal off again, and both errors push the
 * same way. A man with $380k of equipment finance is charged for it twice, on the number he said he
 * would screenshot and show his wife.
 */
export function sdeExample(symbol: string): string {
  return (
    `If the business kept ${symbol}120k after costs, paid you ${symbol}50k in salary and perks, ` +
    `and paid ${symbol}30k in interest on its loans, add all three and enter ${symbol}200,000. ` +
    `Interest goes back in because a buyer is valuing the business, not your loans — those are ` +
    `settled separately.`
  );
}

/**
 * Confirmation once a plausible figure is entered. Must not re-describe SDE as net profit.
 *
 * Names interest for the same reason the example does: this is the LAST thing said before the
 * figure is accepted, so it is the last chance to catch an owner who added his own pay back and
 * stopped there.
 */
export function sdeMarginNote(marginPct: number, turnoverLabel: string): string {
  return (
    `That's a ${marginPct}% margin on the ${turnoverLabel} turnover you entered. Looks right? ` +
    `Remember this figure includes your own salary and perks added back, and any interest the ` +
    `business paid on its loans.`
  );
}

/**
 * Phrases that describe NET PROFIT and must never be used to explain SDE.
 *
 * Exported so a test can assert they have not crept back into the valuation copy. This is a
 * regression guard on a correctness bug, not a style preference.
 */
export const NET_PROFIT_PHRASES_BANNED_IN_SDE_COPY = [
  'after costs and your own pay',
  'after all costs and your own pay',
  'after costs and your pay',
];
