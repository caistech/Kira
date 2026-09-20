import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { stripComments } from '@/lib/source-scan';

// WHY THIS FILE EXISTS — P12.
//
// /business-valuation is the page where the card is asked for, and it used to end on a loading
// message while the personalised figure resolved. His verdict: "of every page on this site, the
// one that starts as a loading message is the one where I'm deciding to pay you."
//
// (The /plan page this guard originally lived on is now a pricing + identity gate that redirects
// into this page; the money-answer ships here.)
//
// His personalised figure genuinely cannot be server-rendered: it derives from turnover and profit
// held in sessionStorage on purpose. What can be answered without knowing him is what it costs and
// when he is charged — and that must come from the SAME constants that charge him, not typed.
//
// ⚠️ THE FLOOR ONLY. A full band table on a public page invites band-shopping before there is a
// gap to size it against. This test pins that boundary in both directions: the floor must be
// there, the table must not.

const SRC = stripComments(readFileSync(join(__dirname, 'page.tsx'), 'utf8'));

describe('/business-valuation answers the money question without ending on a loader', () => {
  it('states a price from the constant that charges it, not a typed figure', () => {
    // Read from priceForProfit/formatPrice rather than typed, so the page cannot quote a figure
    // the product has stopped charging — the same discipline the landing already applies.
    expect(SRC).toMatch(/priceForProfit\(/);
    expect(SRC).toMatch(/formatPrice\(/);
  });

  it('states WHEN he is charged, which is the half that decides whether the price is alarming', () => {
    expect(SRC).toMatch(/never invoiced for the month you are in/i);
    expect(SRC).toMatch(/FULL_RATE_PERIOD_CAP/);
  });

  it('does not end on a loading message', () => {
    expect(SRC).not.toMatch(/Reading your valuation from this device/i);
  });

  it('does not print the band table (a recorded decision, not an oversight)', () => {
    // Iterating the full tier table here would put every price on the page. The floor answers
    // "roughly what does this cost"; the table invites a different question.
    expect(SRC).not.toMatch(/PRICE_TIERS\.map/);
    expect(SRC).not.toMatch(/priceForProfit\([^)]*\)\.map/);
  });
});