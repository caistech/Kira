// lib/valuation/industry-options.ts
//
// THE INDUSTRY ANSWER, MADE DETERMINISTIC.
//
// It used to be a free-text box with a typeahead over it. Typing something the table did not know —
// "aviation" — matched nothing, and the owner was told he could carry on with "the overall
// market-average multiple". Which is true, and it is also the product quietly abandoning the most
// load-bearing input it has: the sector multiple is the number every other answer scales.
//
// Worse, it failed OPEN and looked fine. He got three confident figures built on 2.5x rather than on
// his sector, with one grey sentence explaining why, on a page whose whole argument is that the
// numbers are honest.
//
// A dropdown cannot do that. Every answer is either a sector we hold a real median for, or an
// explicit "not listed" that says what it costs him. There is no third state.
//
// ⚠️ THE MULTIPLE LOOKUP IS DELIBERATELY UNCHANGED, so no MODEL_VERSION bump and no rescore. Picking
// from this list lands on `lookupSdeMultiple`'s EXACT-match branch, which is the same branch a typed
// exact name hit before; and every historical free-text answer still resolves through the same
// synonym and substring fallbacks it always did. This constrains what new input can be, not how any
// input is priced.
//
// ⚠️ THE LIST ITSELF IS US DATA AND THAT IS THE REAL GAP. `sde-multiples.ts` is BizBuySell
// sold-transaction data with US category names, which is why an Australian owner reaches for a word
// that is not in it. The Melis/LINK guide publishes 29 AUSTRALIAN categories in vocabulary this
// audience actually uses — Trades, NDIS / Disability Services, Allied Health, Managed IT. Adopting
// those is the better fix and it is a different job: new medians means a MODEL_VERSION bump and a
// rescore of every stored baseline. This change makes the input honest today without touching a
// single number.

import { SECTOR_MULTIPLES } from './sde-multiples';

/**
 * What an owner picks when none of them fit.
 *
 * A REAL, RECORDED ANSWER rather than an empty one. "Not listed" tells us the table has a hole and
 * which owner fell in it — an empty string tells us nothing and looks like an abandoned form.
 *
 * It resolves to the market average through `lookupSdeMultiple`'s normal fallback (`matched: false`),
 * exactly as unmatched free text did. Verified against every sector name to collide with none of
 * them: the fallback does substring matching in BOTH directions, so a short sentinel could silently
 * match a sector and price someone's business off a category they never chose.
 */
export const INDUSTRY_NOT_LISTED = 'My industry is not listed';

export interface IndustryOptionGroup {
  group: string;
  options: string[];
}

/**
 * The sectors, grouped, for a native `<select>`.
 *
 * ALPHABETICAL, WITH "Other" LAST. Not ordered by popularity: a guessed popularity order is the kind
 * of thing that is wrong for half the audience, ages badly, and cannot be defended when someone asks
 * why their industry is at the bottom. Alphabetical is predictable, and a native picker lets a phone
 * user jump by first letter.
 *
 * Computed once at module load from the same array the multiples come from, so a sector added to the
 * table appears here with no second edit — the shape of bug this file exists to end.
 */
export const INDUSTRY_OPTION_GROUPS: IndustryOptionGroup[] = (() => {
  const byGroup = new Map<string, string[]>();
  for (const sector of SECTOR_MULTIPLES) {
    const list = byGroup.get(sector.group) ?? [];
    list.push(sector.name);
    byGroup.set(sector.group, list);
  }

  return [...byGroup.entries()]
    .map(([group, options]) => ({ group, options: options.sort((a, b) => a.localeCompare(b)) }))
    .sort((a, b) => {
      // "Other" is a real group in the table and it is the one place a reader looks LAST, so it goes
      // last rather than landing between Manufacturing and Retail.
      if (a.group === 'Other') return 1;
      if (b.group === 'Other') return -1;
      return a.group.localeCompare(b.group);
    });
})();

/** Every selectable sector name, flat. */
export const INDUSTRY_OPTIONS: string[] = INDUSTRY_OPTION_GROUPS.flatMap((g) => g.options);

/**
 * Is this a value the dropdown can represent?
 *
 * Used to decide whether a RESUMED answer — parked in sessionStorage, possibly typed months ago as
 * free text — can be shown as selected. One that cannot is preserved and offered back to him rather
 * than silently dropped or silently rewritten: it is his answer, and quietly replacing it with
 * "not listed" would change his valuation without telling him.
 */
export function isSelectableIndustry(value: string | undefined | null): boolean {
  if (!value) return false;
  return value === INDUSTRY_NOT_LISTED || INDUSTRY_OPTIONS.includes(value);
}
