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
// (`lib/valuation/model.ts`: SDE = net profit + owner salary & perks).
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
 * The worked example. Deliberately shows the two components separately, because the whole failure
 * was an example that quietly folded the owner's pay into "what you kept".
 */
export function sdeExample(symbol: string): string {
  return (
    `If the business kept ${symbol}150k after costs and paid you ${symbol}50k in salary and perks, ` +
    `add them together and enter ${symbol}200,000.`
  );
}

/** Confirmation once a plausible figure is entered. Must not re-describe SDE as net profit. */
export function sdeMarginNote(marginPct: number, turnoverLabel: string): string {
  return (
    `That's a ${marginPct}% margin on the ${turnoverLabel} turnover you entered. Looks right? ` +
    `Remember this figure includes your own salary and perks added back.`
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
