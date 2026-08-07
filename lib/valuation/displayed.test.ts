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

import { displayedFigures } from './displayed';

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
