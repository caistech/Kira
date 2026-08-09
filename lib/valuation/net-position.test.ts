// lib/valuation/net-position.test.ts
//
// ⚠️ RENAMED FROM `net-of-debt.test.ts` with the module (register P7). Every assertion about the debt
// leg is carried over unchanged and still passes — the WIP leg is purely additive, and a rename that
// quietly dropped a guard would be worse than no rename.
//
// The netting has one property that makes it safe to ship and one that makes it honest.
//
// SAFE: both legs move `today` and `potential` equally, so the GAP is invariant. The gap drives the
// monthly price and is the origin every introducer's movement column measures from, so a change that
// moved it would silently re-price live quotes and rewrite six stored baselines.
//
// HONEST: walk-away is allowed to go negative. Equipment finance is secured against the very gear
// walk-away counts, so owing more than the assets would fetch is a real state — and the one most
// worth telling an owner about, because it means closing the doors is not available to him.

import { describe, expect, it } from 'vitest';

import { netPosition, type GrossFigures } from './net-position';
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

describe('the debt leg', () => {
  it('takes debt off every figure', () => {
    const n = netPosition(result(), { debt: 380_000 });
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
    const n = netPosition(result(), { debt: 50_000 });
    expect(n.walkAwayLow).toBe(22_000);
    expect(n.walkAwayHigh).toBe(58_000);
  });

  it('shows a negative walk-away rather than flooring it', () => {
    // Operator decision 2026-08-09: "better for him to be clear and walk away than promise
    // something from a not real basis." Gear that would fetch $72k–$108k against $380k of finance
    // is a real position and the tool's job is to say so.
    const n = netPosition(result(), { debt: 380_000 });
    expect(n.walkAwayLow).toBeLessThan(0);
    expect(n.walkAwayHigh).toBeLessThan(0);
    expect(n.walkAwayNegative).toBe(true);
  });

  it('does not flag negative when the gear covers the debt', () => {
    const n = netPosition(result(), { debt: 50_000 });
    expect(n.walkAwayHigh).toBeGreaterThan(0);
    expect(n.walkAwayNegative).toBe(false);
  });

  it('flags only when even the BEST case is under water', () => {
    // $72k–$108k of realisable gear against $90k owed: the low end is negative, the high end is
    // not. He is not certainly under water, so the sentence telling him closing up is unavailable
    // must not fire. Saying it here would be a claim the numbers do not support.
    const n = netPosition(result(), { debt: 90_000 });
    expect(n.walkAwayLow).toBeLessThan(0);
    expect(n.walkAwayHigh).toBeGreaterThan(0);
    expect(n.walkAwayNegative).toBe(false);
  });
});

describe('the work-in-progress leg', () => {
  it('adds work in progress to every figure', () => {
    const n = netPosition(result(), { workInProgress: 95_000 });
    expect(n.walkAwayLow).toBe(72_000 + 95_000);
    expect(n.walkAwayHigh).toBe(108_000 + 95_000);
    expect(n.today).toBe(1_290_000 + 95_000);
    expect(n.potential).toBe(1_490_000 + 95_000);
    expect(n.workInProgress).toBe(95_000);
    expect(n.applied).toBe(true);
  });

  it('can lift a walk-away back out of the red', () => {
    // The reason this leg belongs beside the debt one rather than in a footnote: an owner told
    // "closing up is not an option" on the strength of his finance, who is owed $300k for work he
    // has already done, has been told something false about his own position.
    const owing = netPosition(result(), { debt: 380_000 });
    expect(owing.walkAwayNegative).toBe(true);

    const withWip = netPosition(result(), { debt: 380_000, workInProgress: 300_000 });
    expect(withWip.walkAwayHigh).toBe(108_000 + 300_000 - 380_000);
    expect(withWip.walkAwayNegative).toBe(false);
  });

  it('is not confused with debt when both are given', () => {
    // The failure the options object exists to make impossible: swapping these two positionally
    // would produce the same magnitude with the sign inverted, and no type error.
    const n = netPosition(result(), { debt: 380_000, workInProgress: 95_000 });
    expect(n.today).toBe(1_290_000 - 380_000 + 95_000);
    expect(n.debt).toBe(380_000);
    expect(n.workInProgress).toBe(95_000);
  });
});

// THE LOAD-BEARING ONE. If this ever fails, an answer has started moving the price.
describe('the gap is invariant under both legs', () => {
  it.each([0, 1, 380_000, 5_000_000])('at debt = %i', (debt) => {
    const r = result();
    const n = netPosition(r, { debt });
    expect(n.potential - n.today).toBe(r.potential - r.today);
    expect(n.potential - n.today).toBe(200_000);
  });

  it.each([0, 1, 95_000, 5_000_000])('at work in progress = %i', (workInProgress) => {
    const r = result();
    const n = netPosition(r, { workInProgress });
    expect(n.potential - n.today).toBe(200_000);
  });

  it('under both at once', () => {
    const n = netPosition(result(), { debt: 380_000, workInProgress: 95_000 });
    expect(n.potential - n.today).toBe(200_000);
  });
});

describe('a missing or nonsense answer changes nothing', () => {
  it.each([undefined, null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'treats debt of %s as "he did not tell us"',
    (input) => {
      const r = result();
      const n = netPosition(r, { debt: input as number | undefined | null });
      expect(n.debt).toBe(0);
      expect(n.applied).toBe(false);
      expect(n.walkAwayLow).toBe(r.walkAwayLow);
      expect(n.walkAwayHigh).toBe(r.walkAwayHigh);
      expect(n.today).toBe(r.today);
      expect(n.potential).toBe(r.potential);
    },
  );

  it.each([undefined, null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'treats work in progress of %s as "he did not tell us"',
    (input) => {
      const r = result();
      const n = netPosition(r, { workInProgress: input as number | undefined | null });
      expect(n.workInProgress).toBe(0);
      expect(n.applied).toBe(false);
      expect(n.today).toBe(r.today);
    },
  );

  it('renders nothing at all when neither question was answered', () => {
    expect(netPosition(result()).applied).toBe(false);
    expect(netPosition(result(), {}).applied).toBe(false);
  });

  it('never lets a negative debt INFLATE the figures', () => {
    // The direction that matters: trusting -50,000 would add $50k to everything and read as a
    // better business than he has.
    const n = netPosition(result(), { debt: -50_000 });
    expect(n.today).toBe(1_290_000);
    expect(n.today).not.toBeGreaterThan(1_290_000);
  });

  it('never lets a negative work in progress DEFLATE the figures', () => {
    const n = netPosition(result(), { workInProgress: -50_000 });
    expect(n.today).toBe(1_290_000);
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
// The fix is structural rather than careful — feed `netPosition` the DISPLAYED pair and the
// subtraction closes by construction, for any debt and any work in progress.
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
        const n = netPosition(
          { walkAwayLow: 72_000, walkAwayHigh: 108_000, today: shown.today, potential: shown.potential },
          { debt, workInProgress: 61_437 },
        );
        expect(n.potential - n.today).toBe(shown.gap);
      }
    },
  );
});
