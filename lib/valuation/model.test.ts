// lib/valuation/model.test.ts
import { describe, it, expect } from 'vitest';
import { computeValuation, formatMoney, type ValuationInputs } from './model';
import { AVERAGE_SDE_MULTIPLE } from './sde-multiples';

// HVAC trades at a 2.80x sector-median SDE multiple in the BizBuySell 2025 data.
const base: ValuationInputs = {
  industry: 'HVAC',
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

describe('computeValuation (SDE basis)', () => {
  it('matches a known sector to its real SDE multiple', () => {
    const r = computeValuation(base);
    expect(r.sectorMatched).toBe(true);
    expect(r.sdeMultiple).toBe(2.8);
  });

  it('falls back to the market-average SDE multiple for an unknown sector', () => {
    const r = computeValuation({ ...base, industry: 'Interdimensional Widgets' });
    expect(r.sectorMatched).toBe(false);
    expect(r.sdeMultiple).toBe(AVERAGE_SDE_MULTIPLE);
  });

  it('keeps multiples in a realistic SDE band (floor >= 1x, ceiling <= 8x)', () => {
    const r = computeValuation(base);
    expect(r.floorMultiple).toBeGreaterThanOrEqual(1);
    expect(r.ceilingMultiple).toBeLessThanOrEqual(8);
    expect(r.ceilingMultiple).toBeGreaterThan(r.floorMultiple);
  });

  it('prices a typical owner-dependent business low (not a public-comp multiple)', () => {
    const r = computeValuation(base);
    // This is the whole point of the rebuild: a $200k-profit owner-dependent HVAC business must
    // land at a couple of x SDE, NOT 6x+. Today should be well under 3x.
    expect(r.appliedMultipleToday).toBeLessThan(3);
    expect(r.today).toBeLessThan(base.annualProfit * 3);
    expect(r.today).toBeGreaterThan(base.annualProfit); // still above a bare 1x
  });

  it('worst-case (all drivers at floor) prices at exactly the floor multiple', () => {
    const worst = computeValuation({
      ...base,
      profitTrend: 'declining',
      marginTrend: 'shrinking',
      clientTrend: 'shrinking',
      clientConcentration: 'concentrated',
    });
    expect(worst.readiness).toBe(0);
    expect(worst.appliedMultipleToday).toBeCloseTo(worst.floorMultiple, 5);
    expect(worst.today).toBe(Math.round(base.annualProfit * worst.floorMultiple));
  });

  it('fully systemised business reaches the ceiling multiple', () => {
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
    expect(maxed.appliedMultipleToday).toBeCloseTo(maxed.ceilingMultiple, 5);
    expect(maxed.gap).toBe(0);
  });

  it('shows a bigger gap for the owner-dependent business than the systemised one', () => {
    const dependent = computeValuation(base);
    const systemised = computeValuation({
      ...base,
      ownerDependence: 'fully_managed',
      systems: 'documented_team',
      recurringRevenue: 'strong',
      clientConcentration: 'diversified',
    });
    expect(systemised.today).toBeGreaterThan(dependent.today);
    expect(systemised.gap).toBeLessThan(dependent.gap);
  });

  it('makes the capturable uplifts roughly sum to the gap', () => {
    const r = computeValuation(base);
    const capturableUplift = r.factors.filter((f) => f.capturable).reduce((s, f) => s + f.uplift, 0);
    expect(Math.abs(capturableUplift - r.gap)).toBeLessThanOrEqual(r.factors.length);
  });

  it('ranks owner dependence as the biggest lever for a fully-dependent business', () => {
    const r = computeValuation(base);
    expect(r.factors[0].key).toBe('ownerDependence');
    expect(r.factors[0].uplift).toBeGreaterThan(0);
  });

  it('applies a size premium so a larger business earns a higher ceiling', () => {
    const small = computeValuation({ ...base, annualProfit: 150_000 });
    const large = computeValuation({ ...base, annualProfit: 3_000_000 });
    expect(large.ceilingMultiple).toBeGreaterThan(small.ceilingMultiple);
    expect(large.ceilingMultiple).toBeLessThanOrEqual(8);
  });

  it('never invents an earnings multiple on a loss-making business', () => {
    const r = computeValuation({ ...base, annualProfit: -50_000 });
    expect(r.today).toBe(0);
    expect(r.potential).toBe(0);
    expect(r.gap).toBe(0);
    expect(r.walkAway).toBe(150_000);
  });

  it('increases today-value monotonically as owner dependence falls', () => {
    const order = ['i_am_the_business', 'heavily_involved', 'mostly_runs', 'fully_managed'] as const;
    const values = order.map((ownerDependence) => computeValuation({ ...base, ownerDependence }).today);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1]);
  });
});

describe('formatMoney', () => {
  it('formats AUD with no cents', () => {
    expect(formatMoney(1900000)).toBe('$1,900,000');
    expect(formatMoney(0)).toBe('$0');
  });
});
