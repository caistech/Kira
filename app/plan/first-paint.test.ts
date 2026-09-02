import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { stripComments } from '@/lib/source-scan';

// WHY THIS FILE EXISTS — P12.
//
// /plan is the page where the card is asked for, and its server response used to end on "Reading
// your valuation from this device…". His verdict: "of every page on this site, the one that starts
// as a loading message is the one where I'm deciding to pay you."
//
// ⚠️ NO EXISTING CHECK CAN SEE THIS, AND THAT IS THE POINT OF WRITING ONE.
// `portfolio-gate-audit-first-paint` PASSES /plan, correctly — there is real text outside the
// chrome. `public-routes` passes (200, no redirect). `deploy-status` passes. The defect is not
// whether the page says something, nor how long the wait is; it is WHAT it says while it waits, on
// the one page where saying nothing about money costs the sale.
//
// His personalised figure genuinely cannot be server-rendered: it derives from turnover and profit
// held in sessionStorage on purpose, so the numbers never enter a URL, a Referer header or browser
// history. What can be answered without knowing him is what it costs and when he is charged.
//
// ⚠️ THE FLOOR ONLY. pricing.ts:35-39 records that as a decision (2026-08-01) — a full band table
// on a public page invites band-shopping before there is a gap to size it against. This test pins
// that boundary in both directions: the floor must be there, the table must not.

const SRC = stripComments(readFileSync(join(__dirname, 'page.tsx'), 'utf8'));

/** The pre-hydration branch — literally what the server sends. */
const FIRST_PAINT = SRC.slice(SRC.indexOf('if (!ready)'), SRC.indexOf('if (ready && !model)'));

describe('/plan answers the money question before the browser catches up', () => {
  it('finds the pre-hydration branch at all', () => {
    // If the page is restructured so `!ready` no longer exists, this must fail loudly rather than
    // scan an empty string and report green.
    expect(SRC).toContain('if (!ready)');
    expect(FIRST_PAINT.length).toBeGreaterThan(400);
  });

  it('states a price server-side, from the constant that charges it', () => {
    // Read from PRICE_TIERS rather than typed, so the page cannot quote a figure the product has
    // stopped charging — the same discipline the landing already applies.
    expect(FIRST_PAINT).toContain('PRICE_TIERS[0].monthly');
    expect(FIRST_PAINT).toMatch(/formatPrice\(/);
  });

  it('states WHEN he is charged, which is the half that decides whether the price is alarming', () => {
    expect(FIRST_PAINT).toMatch(/after each month has finished/i);
    expect(FIRST_PAINT).toContain('FULL_RATE_PERIOD_CAP');
  });

  it('does not end on a loading message', () => {
    expect(FIRST_PAINT).not.toMatch(/Reading your valuation from this device/i);
  });

  it('does not print the band table (a recorded decision, not an oversight)', () => {
    // Mapping over PRICE_TIERS here would put every tier on a public page. The floor answers
    // "roughly what does this cost"; the table invites a different question.
    expect(FIRST_PAINT).not.toMatch(/PRICE_TIERS\.map/);
  });
});
