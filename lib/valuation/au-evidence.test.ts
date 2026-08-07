// Does our US sector table survive contact with published Australian guidance?
//
// The register carried "AU bands by niche" as the highest-value outstanding input, on the strength
// of a broker quoting 1–1.5× for Australian trades. If that were right on an SDE basis, our US
// medians would be roughly double the local market. These tests are the check, and they pass —
// which is the finding.
//
// They are deliberately assertions about DATA, not about arithmetic. If someone later edits a
// sector median, or swaps the table for an Australian one, this fails and makes them look at the
// Australian evidence while they do it.

import { describe, expect, it } from 'vitest';

import { AU_PUBLISHED_RANGES, crossCheck } from './au-evidence';
import { SECTOR_MULTIPLES } from './sde-multiples';
import { computeValuation, type ValuationInputs } from './model';

describe('AU cross-check of the US sector table', () => {
  it('checks the sectors it claims to check — no silently-missing sector', () => {
    // A range whose `checks` name a sector that no longer exists would quietly stop checking
    // anything, and the suite would still be green. That is the failure mode this catches.
    const names = new Set(SECTOR_MULTIPLES.map((s) => s.name));
    for (const range of AU_PUBLISHED_RANGES) {
      for (const sector of range.checks) {
        expect(names.has(sector), `${range.family} claims to check "${sector}", which is not in SECTOR_MULTIPLES`).toBe(true);
      }
    }
    expect(crossCheck(SECTOR_MULTIPLES).length).toBeGreaterThanOrEqual(6);
  });

  it('every trades figure falls inside the published Australian range', () => {
    // THE REVERSAL. Plumbing 2.62 against an AU-published 2.0–3.5, electrical 2.94 against 2.5–4.0.
    // The 1–1.5× quote that motivated this work is not supported by any AU source on an SDE basis.
    const trades = crossCheck(SECTOR_MULTIPLES).filter((r) => r.family !== 'Cafés, restaurants & bars');
    for (const r of trades) {
      expect(
        r.inside,
        `${r.sector} is ${r.usMultiple}× but AU guidance for ${r.family} is ${r.low}–${r.high}×`,
      ).toBe(true);
    }
  });

  it('names the one sector that sits outside, rather than hiding it', () => {
    // Bars/Pubs/Taverns at 2.86 against an AU hospitality ceiling of 2.5. Recorded as a known
    // divergence: AU hospitality carries lease risk the US figure does not price. If it is ever
    // corrected downward this test fails and someone re-reads the note — which is the intent.
    const outside = crossCheck(SECTOR_MULTIPLES).filter((r) => !r.inside);
    expect(outside.map((r) => r.sector)).toEqual(['Bars, Pubs & Taverns']);
  });
});

describe('the FLAT band against Australian evidence', () => {
  // ⚠️ THESE TESTS RECORD A KNOWN DIVERGENCE. They are not asserting the model is right; they pin
  // the size of the gap so it cannot widen unnoticed while the decision is open.
  //
  // The model's band is universal — 1.5× floor to 5.0× ceiling, scaled only by profit size, with no
  // sector input at all since 2026-08-04. Australian sources describe sector-SPECIFIC endpoints. For
  // a well-run business in a low-multiple sector the two disagree materially.
  const wellRun = (industry: string, annualProfit: number): ValuationInputs => ({
    industry,
    annualProfit,
    tangibleAssets: 50_000,
    ownerDependence: 'fully_managed',
    systems: 'documented_team',
    recurringRevenue: 'strong',
    clientConcentration: 'diversified',
    profitTrend: 'growing',
    marginTrend: 'stable',
    clientTrend: 'stable',
  });

  it('a well-run café is valued above the top of the published AU hospitality range', () => {
    const r = computeValuation(wellRun('Coffee Shops', 300_000));
    const auCeiling = 2.5;
    expect(r.appliedMultipleToday).toBeGreaterThan(auCeiling);
    // Pinned so the divergence cannot grow silently. ~4.7× against an AU ceiling of 2.5×.
    expect(r.appliedMultipleToday).toBeLessThan(5.01);
  });

  it('a well-run plumbing business is valued above the top of the published AU plumbing range', () => {
    const r = computeValuation(wellRun('Plumbing', 300_000));
    expect(r.appliedMultipleToday).toBeGreaterThan(3.5);
  });

  it('sector currently changes NOTHING in the number — the divergence has one cause', () => {
    // Identical financials, wildly different sectors, identical valuation. This is why the flat band
    // cannot match sector-specific AU evidence: it has thrown the sector away before it starts.
    const cafe = computeValuation(wellRun('Coffee Shops', 300_000));
    const billing = computeValuation(wellRun('Medical Billing', 300_000));
    expect(cafe.today).toBe(billing.today);
    expect(cafe.sdeMultiple).not.toBe(billing.sdeMultiple);
  });
});
