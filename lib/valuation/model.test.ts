// lib/valuation/model.test.ts
import { describe, it, expect } from 'vitest';
import { computeValuation, buildBuyerRationale, type ValuationInputs } from './model';
import { AVERAGE_SDE_MULTIPLE } from './sde-multiples';
import { formatMoney } from './currency';

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

describe('buildBuyerRationale', () => {
  it('gives the full risk narrative (car analogy) for a low-readiness business', () => {
    const r = buildBuyerRationale(computeValuation(base));
    const text = r.paragraphs.join(' ').toLowerCase();
    expect(text).toContain('car'); // the sight-unseen analogy lands at low readiness
    expect(text).toContain('risk');
  });

  it('gives a de-risked narrative for a fully systemised business', () => {
    const systemised = computeValuation({
      ...base,
      profitTrend: 'growing_strongly',
      marginTrend: 'improving',
      clientTrend: 'expanding',
      clientConcentration: 'diversified',
      ownerDependence: 'fully_managed',
      systems: 'documented_team',
      recurringRevenue: 'strong',
    });
    const text = buildBuyerRationale(systemised).paragraphs.join(' ').toLowerCase();
    expect(text).toContain('hard part');
  });

  it('handles a loss-making business without inventing a multiple story', () => {
    const r = buildBuyerRationale(computeValuation({ ...base, annualProfit: -50_000 }));
    expect(r.title).toBe('How a buyer sees it');
    expect(r.paragraphs.join(' ')).toContain('assets');
  });
});

describe('formatMoney', () => {
  it('defaults to USD with no cents', () => {
    expect(formatMoney(1900000)).toBe('$1,900,000');
    expect(formatMoney(0)).toBe('$0');
  });
  it('formats other currencies', () => {
    expect(formatMoney(1900000, 'GBP')).toBe('£1,900,000');
    expect(formatMoney(1900000, 'EUR')).toContain('1,900,000');
  });
});

// ---------------------------------------------------------------------------------------------
// Narrative consistency.
//
// The valuation page previously told some owners two contradictory things on one screen: a
// headline saying "a buyer can largely see how this business runs without you", above a weakness
// line built from the same answers saying "the business runs on you".
//
// These tests are exhaustive rather than illustrative. The defect was found by a human tester on a
// first pass but is only 5 of 3,888 combinations — a hand-picked fixture would very likely have
// missed it, and would certainly miss the next one. Enumerating the whole input space is cheap
// here (it is pure and finite), so it is enumerated.
// ---------------------------------------------------------------------------------------------

const OWNER_DEPENDENCE = ['i_am_the_business', 'heavily_involved', 'mostly_runs', 'fully_managed'] as const;
const SYSTEMS = ['in_my_head', 'some', 'documented_team'] as const;
const RECURRING = ['none', 'some', 'strong'] as const;
const CONCENTRATION = ['concentrated', 'moderate', 'diversified'] as const;
const PROFIT_TREND = ['declining', 'flat', 'growing', 'growing_strongly'] as const;
const MARGIN_TREND = ['shrinking', 'stable', 'improving'] as const;
const CLIENT_TREND = ['shrinking', 'stable', 'expanding'] as const;

interface Narrated {
  inputs: ValuationInputs;
  text: string;
  readiness: number;
}

function everyCombination(): Narrated[] {
  const out: Narrated[] = [];
  for (const ownerDependence of OWNER_DEPENDENCE)
    for (const systems of SYSTEMS)
      for (const recurringRevenue of RECURRING)
        for (const clientConcentration of CONCENTRATION)
          for (const profitTrend of PROFIT_TREND)
            for (const marginTrend of MARGIN_TREND)
              for (const clientTrend of CLIENT_TREND) {
                const inputs: ValuationInputs = {
                  ...base,
                  ownerDependence,
                  systems,
                  recurringRevenue,
                  clientConcentration,
                  profitTrend,
                  marginTrend,
                  clientTrend,
                };
                const result = computeValuation(inputs);
                out.push({
                  inputs,
                  readiness: result.readiness,
                  text: buildBuyerRationale(result).paragraphs.join(' '),
                });
              }
  return out;
}

const CLAIMS_INDEPENDENT = 'can largely see how this business runs without you';
const SAYS_RUNS_ON_YOU = 'the business runs on you';

describe('buyer rationale — narrative consistency', () => {
  const all = everyCombination();

  it('covers the whole input space', () => {
    expect(all).toHaveLength(3888);
  });

  it('never claims the business runs without the owner AND that it runs on them', () => {
    const contradictory = all.filter(
      (c) => c.text.includes(CLAIMS_INDEPENDENT) && c.text.includes(SAYS_RUNS_ON_YOU),
    );
    expect(contradictory).toHaveLength(0);
  });

  it('never claims independence when the owner said the business would fall apart without them', () => {
    // Readiness is a weighted average, so the other four factors carry 7 of 10 — enough to clear
    // the "high" threshold on their own. Owner-dependence caps the NARRATIVE band so that cannot
    // turn into a claim no broker would make. It caps the story only; no figure moves.
    const wrong = all.filter(
      (c) => c.inputs.ownerDependence === 'i_am_the_business' && c.text.includes(CLAIMS_INDEPENDENT),
    );
    expect(wrong).toHaveLength(0);
  });

  it('does not tell an owner the business runs on them when they said it would mostly run', () => {
    // 'mostly_runs' scores 0.7 — a shortfall, but not the one this phrase describes. Overstating
    // someone's weakness on a page selling the cure for it is the error that costs credibility
    // with the person who knows their own business best.
    const overstated = all.filter(
      (c) => c.inputs.ownerDependence === 'mostly_runs' && c.text.includes(SAYS_RUNS_ON_YOU),
    );
    expect(overstated).toHaveLength(0);
  });

  it('composes every weakness phrase into a readable sentence', () => {
    // The mid-band paragraph used to slot the phrase in as though it were a noun, producing
    // "but the business runs on you is still largely in your head".
    const broken = all.filter((c) => / (runs on you|not on paper) is still largely in your head/.test(c.text));
    expect(broken).toHaveLength(0);
  });

  it('still tells the strongest possible story to an owner who has genuinely earned it', () => {
    // The cap must not swallow the good case: fully managed, documented, recurring, diversified,
    // growing should still read as an asset rather than a job.
    const best = computeValuation({
      ...base,
      ownerDependence: 'fully_managed',
      systems: 'documented_team',
      recurringRevenue: 'strong',
      clientConcentration: 'diversified',
      profitTrend: 'growing_strongly',
      marginTrend: 'improving',
      clientTrend: 'expanding',
    });
    const text = buildBuyerRationale(best).paragraphs.join(' ');
    expect(best.readiness).toBe(1);
    expect(text).toContain(CLAIMS_INDEPENDENT);
    expect(text).toContain('this reads as an asset, not a job');
  });

  it('re-prices deliberately — the 2026-08-04 rubric IS a repricing, and was authorised as one', () => {
    // This test previously asserted 0.1625 readiness under the heading "this was a copy fix, not a
    // repricing", guarding a change that deliberately moved no numbers. It failed the moment the
    // rubric was rebuilt, which is exactly what it was for — so it is updated rather than deleted,
    // and the heading now says what is true.
    //
    // The rubric derives from the two reservation prices that bound a real negotiation rather than
    // from a foreign dataset: a seller will not go below 1.5x (he may as well keep working it) and a
    // buyer will not exceed 5x (and only reaches it when the business is well run, easy to take
    // over, AND has upside he can add). Operator decision, 2026-08-04: rescore everyone.
    const owned = computeValuation({ ...base, ownerDependence: 'i_am_the_business' });
    expect(owned.readiness).toBeCloseTo(0.17875, 4);
    expect(owned.today).toBeGreaterThan(0);
    expect(owned.potential).toBeGreaterThan(owned.today);
  });

  it('honours both reservation prices — nothing below 1.5x, nothing above 5x', () => {
    // The two numbers the whole band is derived from. If either is ever breached the rubric has
    // stopped describing a deal either side would actually sign.
    const worst = computeValuation({
      ...base,
      ownerDependence: 'i_am_the_business',
      systems: 'in_my_head',
      recurringRevenue: 'none',
      clientConcentration: 'concentrated',
      profitTrend: 'declining',
      marginTrend: 'shrinking',
      clientTrend: 'shrinking',
    });
    expect(worst.readiness).toBe(0);
    // ⚠️ UPDATED 2026-08-08 with the sector-scaled band. This used to assert EXACTLY 1.5x, which was
    // a property of the flat band rather than the invariant the test is named for. The floor is now
    // the SECTOR's floor — for HVAC (2.8 median) that is 2.1 — and 1.5x is the hard guard UNDER it,
    // binding only where a sector is cheap enough to fall through. The invariant survives; the
    // equality was incidental, and re-asserting it would have meant reverting the change.
    expect(worst.appliedMultipleToday).toBeGreaterThanOrEqual(1.5);
    expect(worst.appliedMultipleToday).toBeCloseTo(worst.floorMultiple, 4);
    expect(worst.floorMultiple).toBeCloseTo(2.8 * 0.75, 4);

    const bestPossible = computeValuation({
      ...base,
      annualProfit: 500_000,
      ownerDependence: 'fully_managed',
      systems: 'documented_team',
      recurringRevenue: 'strong',
      clientConcentration: 'diversified',
      profitTrend: 'growing_strongly',
      marginTrend: 'improving',
      clientTrend: 'expanding',
    });
    expect(bestPossible.readiness).toBe(1);
    // Same correction at the top end: 5.0x is the hard buyer ceiling OVER the sector ceiling, not
    // the number every perfect business reaches. A perfect HVAC business reaches its own sector's
    // top (~4.06x at $500k), which is inside the 2.5-4.0x published AU range for trades. Only a
    // sector whose median is rich enough pushes into the 5.0x cap.
    expect(bestPossible.appliedMultipleToday).toBeLessThanOrEqual(5.0);
    expect(bestPossible.appliedMultipleToday).toBeCloseTo(bestPossible.ceilingMultiple, 4);

    // The hard cap still binds where the sector is rich enough to reach it.
    const richSector = computeValuation({
      ...base,
      industry: 'Medical Billing', // 4.41 median -> 4.41 x 1.35 = 5.95, above the cap
      annualProfit: 500_000,
      ownerDependence: 'fully_managed',
      systems: 'documented_team',
      recurringRevenue: 'strong',
      clientConcentration: 'diversified',
      profitTrend: 'growing_strongly',
      marginTrend: 'improving',
      clientTrend: 'expanding',
    });
    expect(richSector.appliedMultipleToday).toBeCloseTo(5.0, 4);
  });

  it('reaches near the top of its OWN sector for a well-run business with no growth story', () => {
    // The psychology the band was built from, reproduced by the arithmetic rather than asserted
    // beside it: a buyer pays close to the top of the sector for something he can take over that
    // keeps earning, and the last stretch only comes with upside he believes he can add.
    //
    // ⚠️ RENAMED AND REBASED 2026-08-08. It asserted "> 4x" flat, which under the sector-scaled band
    // asks a 2.8x-median trade business to price like a 4.4x medical-billing business. The property
    // being tested is that excellence-without-growth gets MOST of the way up, not that every sector
    // shares one destination — so it is now expressed as a fraction of that sector's own ceiling.
    // For HVAC this lands ~3.84x against a published AU trades range of 2.5-4.0x.
    const flatButExcellent = computeValuation({
      ...base,
      annualProfit: 500_000,
      ownerDependence: 'fully_managed',
      systems: 'documented_team',
      recurringRevenue: 'strong',
      clientConcentration: 'diversified',
      profitTrend: 'flat',
      marginTrend: 'stable',
      clientTrend: 'stable',
    });
    const share = flatButExcellent.appliedMultipleToday / flatButExcellent.ceilingMultiple;
    expect(share).toBeGreaterThan(0.9);
    expect(share).toBeLessThan(1);
    // And it stays inside what Australian guidance says a top trade business fetches.
    expect(flatButExcellent.appliedMultipleToday).toBeGreaterThan(2.5);
    expect(flatButExcellent.appliedMultipleToday).toBeLessThan(4.0);
  });

  it('itemised drivers sum EXACTLY to the gap they itemise', () => {
    // A tester found four drivers summing to $138,200 beside a headline gap of $138,000 and a
    // result page saying $134,000. The reader this is written for checks it on a calculator.
    const r = computeValuation({ ...base, ownerDependence: 'i_am_the_business', systems: 'in_my_head' });
    const sum = r.factors.reduce((s, f) => s + f.uplift, 0);
    expect(sum).toBe(r.gap);
  });
});
