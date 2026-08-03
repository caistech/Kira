import { describe, expect, it } from 'vitest';
import { deriveBaseline } from './baseline';

const RAY = {
  industry: 'Plumbing',
  turnover: 2_400_000,
  annualProfit: 340_000,
  tangibleAssets: 380_000,
  profitTrend: 'flat',
  marginTrend: 'shrinking',
  clientTrend: 'stable',
  clientConcentration: 'moderate',
  ownerDependence: 'heavily_involved',
  systems: 'in_my_head',
  recurringRevenue: 'none',
};

describe('deriveBaseline — the eleven answers become a starting Genome', () => {
  it('produces a baseline for the areas the questions actually speak to', () => {
    const areas = deriveBaseline(RAY).map((b) => b.area);
    expect(areas).toContain('operations');
    expect(areas).toContain('pricing');
    expect(areas).toContain('customers');
    expect(areas).toContain('cash');
    expect(areas).toContain('assets');
  });

  it('says NOTHING about people or compliance — the questions do not ask', () => {
    // Returning eight confident lines and one silence is more trustworthy than nine where the ninth
    // was guessed. Inventing a line to avoid a blank is the confident-wrong this model exists to
    // avoid, and a 66-year-old spots it instantly on his own business.
    const areas = deriveBaseline(RAY).map((b) => b.area);
    expect(areas).not.toContain('people');
    expect(areas).not.toContain('compliance');
  });

  it('reads `systems: in_my_head` as the bottom of the location ladder', () => {
    // The single highest-value line: the pre-signup question about where operating knowledge lives
    // maps almost directly onto the ladder, and it was being thrown away.
    const ops = deriveBaseline(RAY).find((b) => b.area === 'operations');
    expect(ops?.location).toBe('head');
    expect(ops?.statement).toContain('in your head');
  });

  it('moves operations up the ladder when the owner says it is documented', () => {
    const ops = deriveBaseline({ ...RAY, systems: 'documented_team' }).find((b) => b.area === 'operations');
    expect(ops?.location).toBe('own-cloud');
    expect(ops?.statement).toContain('documented');
  });

  it('does NOT claim the asset register is in his head', () => {
    // Telling a 66-year-old his depreciation schedule is in his head is confidently wrong, he knows
    // it immediately, and it costs him trust in the parts that are right.
    const assets = deriveBaseline(RAY).find((b) => b.area === 'assets');
    expect(assets?.location).toBe('paper');
    expect(assets?.ownerDependent).toBe(false);
  });

  it('marks areas owner-dependent from the owner-dependence answer, which is the axis', () => {
    const dependent = deriveBaseline(RAY).find((b) => b.area === 'operations');
    expect(dependent?.ownerDependent).toBe(true);

    const managed = deriveBaseline({ ...RAY, ownerDependence: 'fully_managed' }).find(
      (b) => b.area === 'operations',
    );
    expect(managed?.ownerDependent).toBe(false);
  });

  it('carries the real figures he gave, not placeholders', () => {
    const cash = deriveBaseline(RAY).find((b) => b.area === 'cash');
    expect(cash?.statement).toContain('$2,400,000');
    expect(cash?.statement).toContain('$340,000');
  });

  it('returns nothing at all when there are no stored inputs', () => {
    // An owner who never ran the valuation has no baseline, and must not be given an invented one.
    expect(deriveBaseline(null)).toEqual([]);
    expect(deriveBaseline(undefined)).toEqual([]);
    expect(deriveBaseline({})).not.toContainEqual(expect.objectContaining({ area: 'cash' }));
  });
});
