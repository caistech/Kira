import { describe, expect, it } from 'vitest';

import { computeValuation, type ValuationInputs } from './model';
import { WHAT_IF_BEST, whatIf } from './what-if';

// "TICK ONE AND WATCH THE FIGURE MOVE" — the demonstration Ray said would close the sale, because
// without it he takes the whole gap on faith.
//
// The assertion that matters is the one about NOT SUMMING. The per-factor uplifts are already on
// screen, so adding the ticked ones is the obvious implementation — and readiness is a weighted sum
// pushed through one interpolation, so two factors fixed together do not move the number by the sum
// of what each moves alone. It errs in the flattering direction, on the screen whose whole argument
// is being straight with him.

const RAY: ValuationInputs = {
  industry: 'Electrical & Mechanical Contracting',
  turnover: 4_200_000,
  annualProfit: 620_000,
  tangibleAssets: 400_000,
  profitTrend: 'flat',
  marginTrend: 'stable',
  clientTrend: 'stable',
  clientConcentration: 'concentrated',
  ownerDependence: 'heavily_involved',
  systems: 'in_my_head',
  recurringRevenue: 'some',
} as unknown as ValuationInputs;

describe('whatIf', () => {
  it('leaves the figure alone when nothing is ticked', () => {
    const base = computeValuation(RAY);
    expect(whatIf(RAY, []).today).toBe(base.today);
  });

  it('moves the figure up when a factor is fixed', () => {
    const base = computeValuation(RAY);
    expect(whatIf(RAY, ['ownerDependence']).today).toBeGreaterThan(base.today);
  });

  it('⚠️ is NOT the sum of the individual moves — which is why it recomputes', () => {
    const base = computeValuation(RAY).today;
    const owner = whatIf(RAY, ['ownerDependence']).today - base;
    const systems = whatIf(RAY, ['systems']).today - base;
    const both = whatIf(RAY, ['ownerDependence', 'systems']).today - base;
    // Both together still beats either alone…
    expect(both).toBeGreaterThan(owner);
    expect(both).toBeGreaterThan(systems);
    // …and adding the two singles is not the same number. If this ever becomes an equality, the
    // model has changed shape and summing would be safe — until then, do not "simplify" this.
    expect(both).not.toBe(owner + systems);
  });

  it('ignores an unknown key rather than throwing', () => {
    // Called from a checkbox list; a stale key from an old tab must not take the result screen down.
    expect(() => whatIf(RAY, ['nonsense'])).not.toThrow();
    expect(whatIf(RAY, ['nonsense']).today).toBe(computeValuation(RAY).today);
  });

  it('⚠️ never claims a fully-managed business — documentation does not hire a manager', () => {
    // `fully_managed` is a different business, bought by hiring rather than by writing anything
    // down. Claiming it here would put a figure on screen the product cannot deliver.
    const owner = WHAT_IF_BEST.find((f) => f.key === 'ownerDependence');
    expect(owner?.best).toBe('mostly_runs');
  });
});
