import { describe, it, expect } from 'vitest';
import { sectorContext } from './sector-context';
import { computeValuation, type ValuationInputs } from './model';

const base: ValuationInputs = {
  industry: 'Electrical & Mechanical Contracting',
  annualProfit: 460_000,
  tangibleAssets: 220_000,
  ownerDependence: 'heavily_involved',
  systems: 'in_my_head',
  recurringRevenue: 'some',
  clientConcentration: 'moderate',
  profitTrend: 'flat',
  marginTrend: 'stable',
  clientTrend: 'stable',
};

describe('sectorContext — the printed figures and the words agree', () => {
  it('states the sector median and the difference, both checkable on screen', () => {
    const c = sectorContext({ sectorMultiple: 2.94, appliedMultiple: 2.81, matched: true });
    expect(c.sentence).toContain('2.9× SDE');
    expect(c.sentence).toContain('2.8×');
    expect(c.direction).toBe('below');
    // 2.9 - 2.8 = 0.1, which is what a reader subtracting the two printed figures gets.
    expect(c.turns).toBe(0.1);
    expect(c.sentence).toContain('0.1 of a turn below');
  });

  it('the stated difference is EXACTLY the subtraction of the two printed figures', () => {
    // The J8 class: comparing raw floats while printing rounded ones puts a difference on screen
    // that does not reconcile with the two numbers beside it.
    for (let sector = 1.5; sector <= 6.6; sector += 0.01) {
      for (const applied of [sector - 0.44, sector - 0.05, sector, sector + 0.05, sector + 0.61]) {
        const c = sectorContext({ sectorMultiple: sector, appliedMultiple: applied, matched: true });
        const subtraction = Math.round(Math.abs(c.appliedMultiple - c.sectorMultiple) * 10) / 10;
        expect(c.turns).toBe(subtraction);
      }
    }
  });

  it('says "level with" rather than a direction when the two print the same', () => {
    // Raw values differ; printed values do not. Asserting a direction here would print
    // "0.0 of a turn below" under two identical figures.
    const c = sectorContext({ sectorMultiple: 2.94, appliedMultiple: 2.91, matched: true });
    expect(c.direction).toBe('at');
    expect(c.turns).toBe(0);
    expect(c.sentence).toContain('level with that');
    expect(c.sentence).not.toContain('below');
    expect(c.sentence).not.toContain('above');
  });

  it('reports ABOVE when he is above, instead of asserting he is below', () => {
    const c = sectorContext({ sectorMultiple: 2.62, appliedMultiple: 3.4, matched: true });
    expect(c.direction).toBe('above');
    expect(c.sentence).toContain('0.8 of a turn above');
  });

  it('never calls the market average "your sector" when no sector matched', () => {
    const c = sectorContext({ sectorMultiple: 2.5, appliedMultiple: 2.2, matched: false });
    expect(c.benchmarkNoun).toBe('the overall market');
    expect(c.sentence).toContain('could not place your sector');
    expect(c.sentence).toContain('overall market average of 2.5× SDE');
    expect(c.sentence).not.toContain('Businesses in your sector');
    expect(c.clause).not.toContain('your sector');
  });
});

// ---------------------------------------------------------------------------------------------
// The claim under test is not the formatting — it is that the DIRECTION is true of every valuation
// this model can produce. The sentence it replaces asserted "below" for the whole low-readiness
// branch, and this is what proves that assertion was reachable-false rather than merely untidy.
// ---------------------------------------------------------------------------------------------

const SECTORS = [
  'Routes (vending/distribution)', // 1.51 — the cheapest sector, floor binds
  'Plumbing', // 2.62
  'Electrical & Mechanical Contracting', // 2.94
  'Marinas & Fishing', // 6.60 — the dearest, buyer ceiling binds
  'something we do not have', // unmatched -> 2.5
];
const PROFITS = [25_000, 120_000, 460_000, 2_000_000];
const DEPENDENCE = ['i_am_the_business', 'heavily_involved', 'mostly_runs', 'fully_managed'] as const;

describe('sectorContext — against every valuation the model can produce', () => {
  const cases = SECTORS.flatMap((industry) =>
    PROFITS.flatMap((annualProfit) =>
      DEPENDENCE.map((ownerDependence) => {
        const result = computeValuation({ ...base, industry, annualProfit, ownerDependence });
        return {
          industry,
          annualProfit,
          ownerDependence,
          result,
          context: sectorContext({
            sectorMultiple: result.sdeMultiple,
            appliedMultiple: result.appliedMultipleToday,
            matched: result.sectorMatched,
          }),
        };
      }),
    ),
  );

  it('never states a direction that contradicts the two figures it prints', () => {
    for (const c of cases) {
      const { sentence, direction, appliedMultiple, sectorMultiple } = c.context;
      if (direction === 'below') expect(appliedMultiple).toBeLessThan(sectorMultiple);
      if (direction === 'above') expect(appliedMultiple).toBeGreaterThan(sectorMultiple);
      if (direction === 'at') expect(appliedMultiple).toBe(sectorMultiple);
      expect(sentence).toContain(`${appliedMultiple.toFixed(1)}×`);
    }
  });

  it('finds at least one real valuation that is NOT below its sector median', () => {
    // If this ever returns zero the replaced sentence was harmless and this module is over-built.
    // It does not: a large business in a cheap sector clears the median on the size adjustment while
    // still scoring badly, which is exactly the case the old wording got wrong.
    const notBelow = cases.filter((c) => c.context.direction !== 'below');
    expect(notBelow.length).toBeGreaterThan(0);
  });
});
