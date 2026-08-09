// lib/valuation/net-of-debt.test.ts
//
// The debt subtraction has one property that makes it safe to ship and one that makes it honest.
//
// SAFE: it comes off `today` and `potential` equally, so the GAP is invariant. The gap drives the
// monthly price and is the origin every introducer's movement column measures from, so a change that
// moved it would silently re-price live quotes and rewrite six stored baselines.
//
// HONEST: walk-away is allowed to go negative. Equipment finance is secured against the very gear
// walk-away counts, so owing more than the assets would fetch is a real state — and the one most
// worth telling an owner about, because it means closing the doors is not available to him.

import { describe, expect, it } from 'vitest';

import { netOfDebt, type GrossFigures } from './net-of-debt';
import { displayedFigures } from './displayed';

// The tester's own figures, and the realisable range as the page derives it (40–60c on $180k of
// book-value gear). Using his numbers so a failure here reads against the report.
function result(over: Partial<GrossFigures> = {}): GrossFigures {
  return {
    walkAwayLow: 72_000,
    walkAwayHigh: 108_000,
    today: 1_290_000,
    potential: 1_490_000,
    ...over,
  };
}

describe('netOfDebt', () => {
  it('takes debt off every figure', () => {
    const n = netOfDebt(result(), 380_000);
    expect(n.walkAwayLow).toBe(72_000 - 380_000);
    expect(n.walkAwayHigh).toBe(108_000 - 380_000);
    expect(n.today).toBe(1_290_000 - 380_000);
    expect(n.potential).toBe(1_490_000 - 380_000);
    expect(n.applied).toBe(true);
    expect(n.debt).toBe(380_000);
  });

  it('nets off the REALISABLE range, not book value', () => {
    // The walk-away headline an owner sees is 40–60c of book (register A6). Netting debt off book
    // and printing it against the range would mix two different quantities on one line.
    const n = netOfDebt(result(), 50_000);
    expect(n.walkAwayLow).toBe(22_000);
    expect(n.walkAwayHigh).toBe(58_000);
  });

  // THE LOAD-BEARING ONE. If this ever fails, debt has started moving the price.
  it.each([0, 1, 380_000, 5_000_000])('leaves the gap invariant at debt = %i', (debt) => {
    const r = result();
    const n = netOfDebt(r, debt);
    expect(n.potential - n.today).toBe(r.potential - r.today);
    expect(n.potential - n.today).toBe(200_000);
  });

  it('shows a negative walk-away rather than flooring it', () => {
    // Operator decision 2026-08-09: "better for him to be clear and walk away than promise
    // something from a not real basis." Gear that would fetch $72k–$108k against $380k of finance
    // is a real position and the tool's job is to say so.
    const n = netOfDebt(result(), 380_000);
    expect(n.walkAwayLow).toBeLessThan(0);
    expect(n.walkAwayHigh).toBeLessThan(0);
    expect(n.walkAwayNegative).toBe(true);
  });

  it('does not flag negative when the gear covers the debt', () => {
    const n = netOfDebt(result(), 50_000);
    expect(n.walkAwayHigh).toBeGreaterThan(0);
    expect(n.walkAwayNegative).toBe(false);
  });

  it('flags only when even the BEST case is under water', () => {
    // $72k–$108k of realisable gear against $90k owed: the low end is negative, the high end is
    // not. He is not certainly under water, so the sentence telling him closing up is unavailable
    // must not fire. Saying it here would be a claim the numbers do not support.
    const n = netOfDebt(result(), 90_000);
    expect(n.walkAwayLow).toBeLessThan(0);
    expect(n.walkAwayHigh).toBeGreaterThan(0);
    expect(n.walkAwayNegative).toBe(false);
  });

  describe('a missing or nonsense answer changes nothing', () => {
    it.each([undefined, null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
      'treats %s as "he did not tell us"',
      (input) => {
        const r = result();
        const n = netOfDebt(r, input as number | undefined | null);
        expect(n.debt).toBe(0);
        expect(n.applied).toBe(false);
        expect(n.walkAwayLow).toBe(r.walkAwayLow);
        expect(n.walkAwayHigh).toBe(r.walkAwayHigh);
        expect(n.today).toBe(r.today);
        expect(n.potential).toBe(r.potential);
      },
    );

    it('never lets a negative debt INFLATE the figures', () => {
      // The direction that matters: trusting -50,000 would add $50k to everything and read as a
      // better business than he has.
      const n = netOfDebt(result(), -50_000);
      expect(n.today).toBe(1_290_000);
      expect(n.today).not.toBeGreaterThan(1_290_000);
    });
  });
});

// ─── the reconciliation, pinned ──────────────────────────────────────────────
//
// THIS CAUGHT A REAL DEFECT, ON SCREEN, AFTER THE UNIT TESTS ABOVE WERE ALL GREEN.
//
// Every figure on the result page is rounded to 3 significant figures, and the headline gap is the
// difference between the ROUNDED pair. The first version of this feature subtracted debt from the
// RAW pair, and the page rendered $712,000 and $988,000 under a headline gap of $280,000 — a
// difference of $276,000, four thousand out, in the largest type on the page.
//
// It is exactly the J8 defect returning, and J8's own note says why it matters here more than
// elsewhere: a tester "checked precisely BECAUSE the paragraph above earns that scrutiny by
// explaining why we round." A page that teaches an owner to check its arithmetic must survive being
// checked.
//
// The fix is structural rather than careful — feed `netOfDebt` the DISPLAYED pair and the
// subtraction closes by construction, for any debt.
describe('the two net figures always reconcile to the gap on screen', () => {
  // Deliberately awkward raw values — the ones that round in opposite directions are where a
  // subtraction stops closing. The second pair is Ray's, and the first is the shape that actually
  // produced the $4,000 discrepancy.
  const RAW_FIGURES = [
    { worthToday: 1_092_431, worthPotential: 1_368_902 },
    { worthToday: 1_290_000, worthPotential: 1_490_000 },
    { worthToday: 247_311, worthPotential: 402_884 },
    { worthToday: 1_244_000, worthPotential: 1_446_000 },
  ];

  it.each([0, 1, 5_000, 45_000, 380_000, 1_000_000])(
    'net potential minus net today equals the displayed gap, at debt = %i',
    (debt) => {
      for (const raw of RAW_FIGURES) {
        const shown = displayedFigures(raw, 'AUD');
        const n = netOfDebt(
          { walkAwayLow: 72_000, walkAwayHigh: 108_000, today: shown.today, potential: shown.potential },
          debt,
        );
        expect(n.potential - n.today).toBe(shown.gap);
      }
    },
  );
});
