// One figure, one value, and the subtraction on screen is true.
//
// THE DEFECT, found by a tester with a calculator on 7 August 2026. One figure, four values:
//
//     result page          $270,000
//     /plan                $271,000
//     dashboard banner     $271,443
//     dashboard card       $271,000, described as "the difference between $1,570,000 and $1,840,000"
//
// $1,840,000 − $1,570,000 = $270,000. The card contradicted itself in two lines, on a product whose
// pitch is telling him what his business is worth. "If it can't subtract, why would I believe the
// multiple?"
//
// It had ALREADY been fixed once on /business-valuation and never carried to the other screens,
// because rounding lived at each call site rather than in one derivation. This pins the derivation.

import { describe, expect, it } from 'vitest';

import { displayedFigures, displayedUplifts } from './displayed';

describe('displayedFigures', () => {
  it('derives the gap from the ROUNDED pair, never from the stored gap', () => {
    // Ray's actual numbers. Stored gap is 271,443; today/potential round to 1,570,000 / 1,840,000.
    // The gap he must see is 270,000 — the difference of what is on screen — not 271,000.
    const f = displayedFigures({ worthToday: 1_569_557, worthPotential: 1_841_000, gap: 271_443 });
    expect(f.today).toBe(1_570_000);
    expect(f.potential).toBe(1_840_000);
    expect(f.gap).toBe(270_000);
    expect(f.gap).toBe(f.potential - f.today);
  });

  it('the stored gap cannot influence the displayed gap at all', () => {
    // Same figures, an absurd stored gap. If this ever leaks through, the bug is back.
    const sane = displayedFigures({ worthToday: 1_569_557, worthPotential: 1_841_000, gap: 271_443 });
    const mad = displayedFigures({ worthToday: 1_569_557, worthPotential: 1_841_000, gap: 999_999_999 });
    expect(mad.gap).toBe(sane.gap);
  });

  it.each([
    [0, 0],
    [1, 2],
    [999, 1_000],
    [12_345, 67_890],
    [1_569_557, 1_841_000],
    [9_999_999, 10_000_001],
    [123_456_789, 987_654_321],
  ])('holds across the range: today=%i potential=%i', (today, potential) => {
    // The invariant, not a sample: whatever the inputs, the three numbers a reader can subtract
    // must actually subtract.
    const f = displayedFigures({ worthToday: today, worthPotential: potential });
    expect(f.gap).toBe(Math.max(0, f.potential - f.today));
  });

  it('never shows a negative gap', () => {
    const f = displayedFigures({ worthToday: 900_000, worthPotential: 100_000 });
    expect(f.gap).toBe(0);
  });

  it('the text is formatted from the SAME rounded numbers it reports', () => {
    // A screen that renders gapText while computing with a different gap is the original bug in a
    // new costume.
    const f = displayedFigures({ worthToday: 1_569_557, worthPotential: 1_841_000 });
    expect(f.gapText).toContain('270,000');
    expect(f.todayText).toContain('1,570,000');
    expect(f.potentialText).toContain('1,840,000');
  });

  it('handles a missing walk-away without inventing one', () => {
    const f = displayedFigures({ worthToday: 100_000, worthPotential: 200_000 });
    expect(f.walkAway).toBeNull();
    expect(f.walkAwayText).toBeNull();
  });

  it('tolerates junk without throwing, because a broken figure must not break a screen', () => {
    const f = displayedFigures({ worthToday: NaN as unknown as number, worthPotential: 200_000 });
    expect(Number.isFinite(f.today)).toBe(true);
    expect(Number.isFinite(f.gap)).toBe(true);
  });
});

// THE SAME DEFECT ONE LEVEL DOWN, found on the fresh-signup run of 7 August 2026. The headline gap
// and the two figures it is the difference between now agree — but the four itemised contributors
// printed under "Where that value is hiding" were each rounded independently:
//
//     73,800 + 61,500 + 26,900 + 17,300 = 179,500, under a headline of $180,000
//
// Ray added them up, because the paragraph above had just explained why the page rounds.
describe('displayedUplifts', () => {
  it("Ray's four contributors add up to the headline he was shown", () => {
    const factors = [
      { key: 'ownerDependence', uplift: 73_812 },
      { key: 'systems', uplift: 61_486 },
      { key: 'recurringRevenue', uplift: 26_915 },
      { key: 'clientDiversification', uplift: 17_290 },
    ];
    const gap = displayedFigures({ worthToday: 1_040_000, worthPotential: 1_220_000 }).gap;
    expect(gap).toBe(180_000);

    const shown = displayedUplifts(factors, gap);
    expect(shown.reduce((s, f) => s + f.uplift, 0)).toBe(180_000);
    // The remainder lands on the largest line, as computeValuation does with the raw remainder.
    expect(shown[0]!.uplift).toBeGreaterThan(73_800);
    expect(shown.slice(1).map((f) => f.uplift)).toEqual([61_500, 26_900, 17_300]);
  });

  it('the rendered TEXT is the reconciled figure, not a re-rounded one', () => {
    // Re-formatting the reconciled number through the approximate formatter would round the
    // remainder straight back off and restore the bug. The text must come from the same number.
    const shown = displayedUplifts([{ uplift: 73_812 }, { uplift: 61_486 }], 136_000);
    expect(shown.reduce((s, f) => s + f.uplift, 0)).toBe(136_000);
    expect(shown[0]!.upliftText).toContain(shown[0]!.uplift.toLocaleString('en-AU'));
  });

  it.each([
    [[10_000, 20_000, 30_000], 61_000],
    [[1, 2, 3], 7],
    [[999_999, 1], 1_000_000],
    [[123_456, 234_567, 345_678], 700_000],
    [[50_000], 50_000],
  ])('sums to the displayed gap for %j → %i', (uplifts, gap) => {
    const shown = displayedUplifts(uplifts.map((uplift) => ({ uplift })), gap);
    expect(shown.reduce((s, f) => s + f.uplift, 0)).toBe(gap);
  });

  it('never renders a negative contributor when the remainder is negative', () => {
    const shown = displayedUplifts([{ uplift: 100 }, { uplift: 90_000 }], 0);
    expect(shown.every((f) => f.uplift >= 0)).toBe(true);
  });

  it('carries the original fields through untouched', () => {
    const shown = displayedUplifts([{ key: 'systems', label: 'Documented systems', uplift: 10_000 }], 10_000);
    expect(shown[0]!.key).toBe('systems');
    expect(shown[0]!.label).toBe('Documented systems');
  });

  it('handles an empty set without inventing a line to carry the remainder', () => {
    expect(displayedUplifts([], 180_000)).toEqual([]);
  });
});
