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

describe('the SECTOR-SCALED band against Australian evidence', () => {
  // ⚠️ REWRITTEN 2026-08-08, hours after being written. These began as three tests PINNING a known
  // divergence — the universal 1.5–5.0 band could not match sector-specific AU endpoints — and the
  // divergence is precisely what the sector-scaled band then closed. They now assert the fix.
  //
  // Recorded rather than quietly replaced, because "the test I wrote to describe the bug now fails"
  // is the one moment where it is easy to edit an assertion until it passes and call it verified.
  // The band changed on evidence; these changed to follow it, and each still fails if the fit to
  // published Australian guidance is lost.
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

  it('a well-run plumbing business now lands INSIDE the published AU plumbing range', () => {
    // The headline result. Was 4.68× against a published ceiling of 3.5×; now ~3.46×, inside
    // 2.0–3.5× — a top-of-market plumbing business, which is exactly what these inputs describe.
    const r = computeValuation(wellRun('Plumbing', 300_000));
    expect(r.appliedMultipleToday).toBeGreaterThan(2.0);
    expect(r.appliedMultipleToday).toBeLessThanOrEqual(3.5);
  });

  it('an owner-dependent trade business lands at the bottom of the AU range, not below it', () => {
    // The other end of the same published sentence: "on the tools, one residential builder →
    // anchored at 2.0×". Under the flat band this owner was shown 1.5×, BELOW anything AU guidance
    // describes — the overclaim had a matching under-claim nobody had looked for.
    const onTheTools = computeValuation({
      ...wellRun('Plumbing', 300_000),
      ownerDependence: 'i_am_the_business',
      systems: 'in_my_head',
      recurringRevenue: 'none',
      clientConcentration: 'concentrated',
      profitTrend: 'declining',
      marginTrend: 'shrinking',
      clientTrend: 'shrinking',
    });
    expect(onTheTools.appliedMultipleToday).toBeGreaterThanOrEqual(1.9);
    expect(onTheTools.appliedMultipleToday).toBeLessThan(2.2);
  });

  it('sector now drives the number — the question is no longer inert', () => {
    // Identical financials, different sectors, materially different valuations. Under the flat band
    // these were IDENTICAL while the screen told the owner his sector set the multiple.
    const cafe = computeValuation(wellRun('Coffee Shops', 300_000));
    const billing = computeValuation(wellRun('Medical Billing', 300_000));
    expect(billing.today).toBeGreaterThan(cafe.today);
    expect(billing.today / cafe.today).toBeGreaterThan(1.4);
  });

  it('hospitality remains ABOVE the published AU ceiling — the known soft spot, pinned', () => {
    // Honest residual. A well-run café lands ~3.05× against a published AU 1.5–2.5×. Sector scaling
    // cut it from 4.68× but did not close it: AU hospitality carries lease risk and thin margins the
    // US median does not price, and a per-family correction needs better data than a broker guide.
    // Pinned so it cannot widen unnoticed, and so it is never mistaken for solved.
    const r = computeValuation(wellRun('Coffee Shops', 300_000));
    expect(r.appliedMultipleToday).toBeGreaterThan(2.5);
    expect(r.appliedMultipleToday).toBeLessThan(3.2);
  });
});
