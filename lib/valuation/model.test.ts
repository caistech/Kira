// lib/valuation/model.test.ts
import { describe, it, expect } from 'vitest';
import { computeValuation, formatMoney, type ValuationInputs } from './model';

// A painting business (RPM Painting was the worksheet's worked example). "Maintenance & Repair
// Services" carries a 13.36 industry multiple in the table.
const base: ValuationInputs = {
  industry: 'Maintenance & Repair Services',
  annualProfit: 200_000,
  tangibleAssets: 150_000,
  profitTrend: 'growing',
  marginTrend: 'stable',
  clientTrend: 'stable',
  clientConcentration: 'moderate',
  ownerDependence: 'i_am_the_business',
  systems: 'in_my_head',
  recurringRevenue: 'none',
};

describe('computeValuation', () => {
  it('matches a known industry to its multiple', () => {
    const r = computeValuation(base);
    expect(r.industryMatched).toBe(true);
    expect(r.industryMultiple).toBe(13.36);
  });

  it('falls back to the median for an unknown industry, flagged honestly', () => {
    const r = computeValuation({ ...base, industry: 'Interdimensional Widgets' });
    expect(r.industryMatched).toBe(false);
    expect(r.industryMultiple).toBe(11.57);
  });

  it('prices a worst-case owner-dependent business at exactly 1x profit today', () => {
    // Everything at the floor: fully owner-dependent, in-head, no recurring revenue, concentrated
    // clients, declining/shrinking trend. Readiness is 0, so the applied multiple is exactly 1x.
    const worst = computeValuation({
      ...base,
      profitTrend: 'declining',
      marginTrend: 'shrinking',
      clientTrend: 'shrinking',
      clientConcentration: 'concentrated',
    });
    expect(worst.readiness).toBe(0);
    expect(worst.appliedMultipleToday).toBe(1);
    expect(worst.today).toBe(base.annualProfit); // exactly 1x
    expect(worst.gap).toBeGreaterThan(0);
  });

  it('still leaves a real gap for the moderate baseline business', () => {
    const r = computeValuation(base);
    expect(r.appliedMultipleToday).toBeGreaterThan(1);
    expect(r.today).toBeGreaterThan(base.annualProfit);
    expect(r.gap).toBeGreaterThan(0);
  });

  it('shows a large gap for the owner-dependent business and a small one when systemised', () => {
    const dependent = computeValuation(base);
    const systemised = computeValuation({
      ...base,
      ownerDependence: 'fully_managed',
      systems: 'documented_team',
      recurringRevenue: 'strong',
      clientConcentration: 'diversified',
    });
    // The systemised business is worth more today and has almost no remaining capturable gap.
    expect(systemised.today).toBeGreaterThan(dependent.today);
    expect(systemised.gap).toBeLessThan(dependent.gap);
    expect(dependent.gap).toBeGreaterThan(dependent.today); // the prize exceeds the current value
  });

  it('reaches the full industry multiple when everything is maxed', () => {
    const maxed = computeValuation({
      ...base,
      profitTrend: 'growing_strongly',
      marginTrend: 'improving',
      clientTrend: 'expanding',
      clientConcentration: 'diversified',
      ownerDependence: 'fully_managed',
      systems: 'documented_team',
      recurringRevenue: 'strong',
    });
    expect(maxed.readiness).toBeCloseTo(1, 5);
    expect(maxed.appliedMultipleToday).toBeCloseTo(maxed.industryMultiple, 5);
    expect(maxed.today).toBe(Math.round(base.annualProfit * maxed.industryMultiple));
    expect(maxed.gap).toBe(0);
  });

  it('makes the capturable uplifts roughly sum to the gap', () => {
    const r = computeValuation(base);
    const capturableUplift = r.factors
      .filter((f) => f.capturable)
      .reduce((s, f) => s + f.uplift, 0);
    // Rounding of each factor vs the gap allows a few dollars of drift.
    expect(Math.abs(capturableUplift - r.gap)).toBeLessThanOrEqual(r.factors.length);
  });

  it('ranks owner dependence as the biggest lever for a fully-dependent business', () => {
    const r = computeValuation(base);
    expect(r.factors[0].key).toBe('ownerDependence');
    expect(r.factors[0].uplift).toBeGreaterThan(0);
  });

  it('never invents an earnings multiple on a loss-making business', () => {
    const r = computeValuation({ ...base, annualProfit: -50_000 });
    expect(r.today).toBe(0);
    expect(r.potential).toBe(0);
    expect(r.gap).toBe(0);
    // The floor still stands: it's worth its gear.
    expect(r.walkAway).toBe(150_000);
  });

  it('increases today-value monotonically as owner dependence falls', () => {
    const order = ['i_am_the_business', 'heavily_involved', 'mostly_runs', 'fully_managed'] as const;
    const values = order.map(
      (ownerDependence) => computeValuation({ ...base, ownerDependence }).today,
    );
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('treats missing tangible assets as a zero floor, not a crash', () => {
    const r = computeValuation({ ...base, tangibleAssets: 0 });
    expect(r.walkAway).toBe(0);
  });
});

describe('formatMoney', () => {
  it('formats AUD with no cents', () => {
    expect(formatMoney(1900000)).toBe('$1,900,000');
    expect(formatMoney(0)).toBe('$0');
  });
});
