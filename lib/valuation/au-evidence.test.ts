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

import { AU_PUBLISHED_RANGES, MELIS_BAND_RATIOS, crossCheck } from './au-evidence';
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

  it('an owner-dependent trade business lands inside the bracket the AU sources jointly describe', () => {
    // The other end of the same published sentence: "on the tools, one residential builder →
    // anchored at 2.0×". Under the flat band this owner was shown 1.5×, BELOW anything AU guidance
    // describes — the overclaim had a matching under-claim nobody had looked for.
    //
    // ⚠️ THE ASSERTION WAS WIDENED 2026-08-14, and this is the change most worth being suspicious
    // of in this commit, because widening a failing assertion is exactly how a real regression gets
    // waved through. So: what changed is the EVIDENCE, and here is the disagreement in full.
    //
    // Two Australian broker guides do not agree about the floor for a trade business:
    //
    //   businessforsale.com.au   on-the-tools plumber  anchored at 2.00×
    //   Melis / LINK Brisbane    Electrical/Trade Low            1.75×   (common mid 2.625)
    //
    // Our plumbing median (2.62) is almost exactly the centre Melis quotes that 1.75 against, so the
    // two sources genuinely differ by 0.25 of a turn on the same business. Neither is authoritative —
    // no sample size, no method, no date range, and one of them is listing collateral.
    //
    // The A11 floor ratio is FITTED to Melis (he is the only source publishing a three-point range
    // across enough sectors to fit anything), so the model now lands 1.77 — 0.02 from Melis and 0.23
    // under businessforsale. The honest assertion is therefore the BRACKET the two describe, not
    // either endpoint. It still fails on anything outside them, which is what the test is for.
    //
    // If a third AU source lands, this bracket is the thing to re-read.
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
    expect(onTheTools.appliedMultipleToday).toBeGreaterThanOrEqual(1.75);
    expect(onTheTools.appliedMultipleToday).toBeLessThan(2.2);
  });

  it('the floor ratio still reproduces the Melis band it was fitted to', () => {
    // A11's fit, pinned at the two ends of his published spread so a drift in either constant fails.
    // Guards the same property the old flat-0.75 assertion did, against the evidence that replaced it.
    const ratio = (median: number) =>
      MELIS_BAND_RATIOS.floorFitIntercept + MELIS_BAND_RATIOS.floorFitSlope * median;

    // ⚠️ ASSERTED AGAINST THE FIT'S OWN RESIDUAL, NOT AGAINST EACH PUBLISHED POINT. A first version
    // of this test demanded the line pass through the observed ratios to two decimals, and failed —
    // correctly, and on the test rather than the model: a least-squares line through 29 points does
    // not pass through any of them. The measured max residual is 0.034, so that is the tolerance.
    const TOLERANCE = 0.035;

    // Cafe/restaurant: his mid-Common 1.75, Low 1.0 -> published ratio 0.571.
    // ⚠️ This is the WORST-FITTING row in his table, and it misses in the direction that matters:
    // the fit says 0.604 where he publishes 0.571, so our hospitality floor sits slightly ABOVE the
    // shape his own numbers describe. Same direction as the well-run-cafe residual pinned below —
    // two independent signs that this model is a touch generous to hospitality.
    expect(Math.abs(ratio(1.75) - 0.571)).toBeLessThanOrEqual(TOLERANCE);
    // Technology/SaaS: his mid-Common 3.375, Low 2.5 -> published ratio 0.741.
    expect(Math.abs(ratio(3.375) - 0.741)).toBeLessThanOrEqual(TOLERANCE);
    // Electrical/Trade: mid-Common 2.625, Low 1.75 -> published ratio 0.667. The trades row, and the
    // one the plumbing floor above is measured against.
    expect(Math.abs(ratio(2.625) - 0.667)).toBeLessThanOrEqual(TOLERANCE);
    // And the ceiling ratio our model has always used is his mean, independently arrived at.
    expect(MELIS_BAND_RATIOS.ceilingMean).toBeCloseTo(1.35, 1);
  });

  it('no sector\'s band can collapse against the buyer ceiling — A13', () => {
    // Marinas & Fishing (median 6.60) ran floor 4.95 / ceiling 5.00 — a spread of 0.05, so
    // transferability moved the number almost not at all and the gap collapsed with it ($8,756
    // against $131,344 for identical answers). Both ends now derive from a median capped at
    // BUYER_CEILING / CEILING_RATIO. Asserted across EVERY sector at the smallest realistic SDE,
    // because that is where the size adjustment squeezes the ceiling hardest.
    for (const profit of [50_000, 150_000, 300_000]) {
      for (const sector of SECTOR_MULTIPLES) {
        const r = computeValuation(wellRun(sector.name, profit));
        expect(
          r.ceilingMultiple - r.floorMultiple,
          `${sector.name} at $${profit / 1000}k has a band of ${(r.ceilingMultiple - r.floorMultiple).toFixed(3)}`,
        ).toBeGreaterThanOrEqual(0.75);
      }
    }
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
    // Honest residual. A well-run café lands ~2.99× against a published AU 1.5–2.5×. Sector scaling
    // cut it from 4.68× but did not close it, and neither did A11.
    //
    // ⚠️ 2026-08-14 — A11 WAS EXPECTED TO CLOSE THIS AND DID NOT, so the expectation is corrected
    // here rather than left in the register. The scaling floor ratio moved café's FLOOR from 1.71 to
    // 1.48 (a weak café now prices 1.83 -> 1.61, inside the published range), but a WELL-RUN café is
    // priced near the CEILING, and the ceiling ratio was confirmed rather than changed. It moved
    // 3.01 -> 2.99.
    //
    // So what remains is not a band-shape problem at all: it is the MEDIAN. Coffee Shops at 2.28 is
    // a US figure, and closing this means moving that number — which one broker guide is not grounds
    // to do. Same shape as Bars/Pubs at 2.86 against an AU ceiling of 2.5.
    //
    // Pinned so it cannot widen unnoticed, and so it is never mistaken for solved.
    const r = computeValuation(wellRun('Coffee Shops', 300_000));
    expect(r.appliedMultipleToday).toBeGreaterThan(2.5);
    expect(r.appliedMultipleToday).toBeLessThan(3.2);
  });
});
