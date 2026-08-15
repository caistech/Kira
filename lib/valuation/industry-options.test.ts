// The industry answer is deterministic, and these are the properties that make it so.
//
// The defect being closed: a free-text box that matched nothing quietly priced the business off the
// 2.5x market average. It failed OPEN, on the single most load-bearing input in the model, and the
// only sign was a grey sentence. A dropdown removes the failure mode — but only if every option it
// offers actually resolves, and only if the "none of these" answer cannot be mistaken for a sector.

import { describe, expect, it } from 'vitest';

import {
  INDUSTRY_NOT_LISTED,
  INDUSTRY_OPTIONS,
  INDUSTRY_OPTION_GROUPS,
  isSelectableIndustry,
} from './industry-options';
import { SECTOR_MULTIPLES, lookupSdeMultiple, AVERAGE_SDE_MULTIPLE } from './sde-multiples';

describe('every option the dropdown offers resolves to a real sector median', () => {
  it('matches on the EXACT branch, never through a fallback', () => {
    // This is the whole point. A listed option that only resolved via the substring fallback would
    // be one rename away from silently becoming a market-average answer again.
    for (const name of INDUSTRY_OPTIONS) {
      const { sde, matched } = lookupSdeMultiple(name);
      expect(matched, `${name} did not match a sector`).toBe(true);
      const expected = SECTOR_MULTIPLES.find((s) => s.name === name)?.sde;
      expect(sde, `${name} resolved to the wrong multiple`).toBe(expected);
    }
  });

  it('offers every sector in the table exactly once', () => {
    // Derived from SECTOR_MULTIPLES rather than hand-listed, so a sector added there appears here
    // with no second edit — which is the class of drift this file exists to end.
    expect([...INDUSTRY_OPTIONS].sort()).toEqual(SECTOR_MULTIPLES.map((s) => s.name).sort());
    expect(new Set(INDUSTRY_OPTIONS).size).toBe(INDUSTRY_OPTIONS.length);
  });
});

describe('the "not listed" answer', () => {
  it('collides with no sector name in either direction', () => {
    // `lookupSdeMultiple`'s fallback does substring matching BOTH ways (`q.includes(n) ||
    // n.includes(q)`), so a short or unlucky sentinel could silently match a sector and price
    // someone's business off a category they explicitly declined to claim.
    const q = INDUSTRY_NOT_LISTED.toLowerCase();
    for (const sector of SECTOR_MULTIPLES) {
      const n = sector.name.toLowerCase();
      expect(q.includes(n) || n.includes(q), `collides with ${sector.name}`).toBe(false);
    }
  });

  it('lands on the market average, and says so by reporting matched: false', () => {
    const { sde, matched } = lookupSdeMultiple(INDUSTRY_NOT_LISTED);
    expect(sde).toBe(AVERAGE_SDE_MULTIPLE);
    // `matched: false` is what lets every downstream surface know the figure is the fallback rather
    // than this owner's sector. It must stay false — a sentinel that reported `matched: true` would
    // be the original defect with a nicer input control.
    expect(matched).toBe(false);
  });
});

describe('grouping', () => {
  it('puts "Other" last', () => {
    // It is a real group in the table, and it is the one a reader looks at last. Between
    // Manufacturing and Retail it reads as a category rather than as a remainder.
    expect(INDUSTRY_OPTION_GROUPS.at(-1)?.group).toBe('Other');
  });

  it('sorts the rest alphabetically', () => {
    // Deliberately NOT by popularity: a guessed order is wrong for half the audience, ages badly,
    // and cannot be defended when someone asks why their industry is at the bottom.
    const rest = INDUSTRY_OPTION_GROUPS.filter((g) => g.group !== 'Other').map((g) => g.group);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));
  });

  it('sorts options alphabetically within each group', () => {
    for (const group of INDUSTRY_OPTION_GROUPS) {
      expect(group.options, group.group).toEqual([...group.options].sort((a, b) => a.localeCompare(b)));
    }
  });
});

describe('isSelectableIndustry — what decides whether a resumed answer is preserved', () => {
  it('accepts a listed sector and the sentinel', () => {
    expect(isSelectableIndustry(INDUSTRY_OPTIONS[0])).toBe(true);
    expect(isSelectableIndustry(INDUSTRY_NOT_LISTED)).toBe(true);
  });

  it('rejects free text typed before this shipped, so it is offered back rather than dropped', () => {
    // "aviation" is the real example that prompted the change. It must read as NOT selectable, which
    // is what puts it in the "Your earlier answer" group instead of vanishing from his form.
    expect(isSelectableIndustry('aviation')).toBe(false);
    expect(isSelectableIndustry('')).toBe(false);
    expect(isSelectableIndustry(null)).toBe(false);
    expect(isSelectableIndustry(undefined)).toBe(false);
  });

  it('is case-sensitive, deliberately', () => {
    // The value round-trips through a <select>, so it is always exactly one of the strings we
    // emitted. Accepting 'plumbing' for 'Plumbing' would only ever paper over a bug elsewhere, and
    // would then send that lower-cased value on to a lookup that does its own casing.
    expect(isSelectableIndustry('plumbing')).toBe(false);
  });
});
