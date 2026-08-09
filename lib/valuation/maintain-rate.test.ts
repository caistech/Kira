// The step-down at the transition — one third, narrow scope. Operator decision 2026-08-05.
//
// Tested because it is a PROMISE MADE IN PUBLIC. The landing page and the FAQ both tell an owner
// that keeping the manual current costs a third of his band, and a promise about paying less is the
// one an owner will check with a calculator.

import { describe, expect, it } from 'vitest';
import { FULL_RATE_PERIOD_CAP, MAINTAIN_FRACTION, PRICE_TIERS, maintainPrice, maintainPriceForProfit, priceForProfit } from './pricing';
import { OWNER_FAQ } from '@/lib/faq';

describe('the maintain rate', () => {
  it('is one third', () => {
    expect(MAINTAIN_FRACTION).toBeCloseTo(1 / 3, 10);
  });

  it('is exactly a third of every band, rounded down', () => {
    // Rounded DOWN rather than to a marketing number: $166 is a third of $499 and $167 is not, and
    // an owner who checks the arithmetic on a promise about paying less should find it holds.
    for (const tier of PRICE_TIERS) {
      const maintain = maintainPrice(tier.monthly);
      expect(maintain).toBe(Math.floor(tier.monthly / 3));
      expect(maintain * 3).toBeLessThanOrEqual(tier.monthly);
    }
  });

  it('comes from the SAME band the build rate came from', () => {
    // A step-down that quietly re-banded him would be a different promise. $325k SDE is the landing
    // example's business.
    for (const profit of [0, 100_000, 325_000, 800_000, 3_000_000, 9_000_000]) {
      expect(maintainPriceForProfit(profit)).toBe(maintainPrice(priceForProfit(profit).monthly));
    }
  });

  it('is always cheaper, and never free', () => {
    // Free would be a different product. The manual still needs keeping current.
    for (const tier of PRICE_TIERS) {
      const maintain = maintainPrice(tier.monthly);
      expect(maintain).toBeLessThan(tier.monthly);
      expect(maintain).toBeGreaterThan(0);
    }
  });
});

describe('what the public copy promises', () => {
  const faq = OWNER_FAQ.find((f) => f.q === 'Does this go on forever?');

  it('answers the question at all', () => {
    expect(faq).toBeTruthy();
  });

  it('names the fraction, so the promise is checkable', () => {
    expect(faq?.a).toMatch(/a third of your band/i);
  });

  it('keeps the assistant OUT of the maintain tier', () => {
    // The trap this guards: folding the assistant in cuts its price by two thirds forever, at
    // exactly the moment the owner values it most.
    expect(faq?.a).toMatch(/stays at the rate you're on/i);
  });

  // ⚠️ THIS BLOCK REPLACED A BLANKET "no timeframe anywhere" ASSERTION, DELIBERATELY.
  //
  // The old guard read `not.toMatch(/\d+\s*(months?|weeks?|years?)/)` and was correct for what it
  // was written about: trigger A, "when the manual is built", which needs register B4's denominator
  // and cannot be predicted. Deleting it outright when the cap landed would have dropped the only
  // thing stopping "typically nine to fourteen months" appearing on a pricing page — a forecast we
  // cannot make on six valuations, all of them internal.
  //
  // So the distinction is now the assertion: A CEILING IS ALLOWED, AN ESTIMATE IS NOT. One is a
  // commitment we control; the other is a prediction about a customer we have not met.
  describe('the 12-month cap — a ceiling, and only a ceiling', () => {
    it('states the cap, using the same number the code enforces', () => {
      // Pinned to the constant, not to the digits. The copy and lib/billing/arrears.ts
      // `stepDownIfCapReached` must never be able to disagree about what was promised.
      expect(faq?.a).toMatch(new RegExp(`after ${FULL_RATE_PERIOD_CAP} months`, 'i'));
    });

    it('says the step-down happens whether or not we think the work is done', () => {
      // The half that makes it a ceiling rather than a target. Without it the sentence reads as
      // "about twelve months", which is the forecast this test forbids two cases below.
      expect(faq?.a).toMatch(/whether or not/i);
    });

    it('makes no forecast — no range of months', () => {
      // "nine to fourteen months", "9-14 months", "nine–fourteen months".
      expect(faq?.a).not.toMatch(
        /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen)\s*(?:to|[-–—])\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen)\s*(months?|weeks?|years?)\b/i,
      );
    });

    it('makes no forecast — no hedged duration', () => {
      // "typically 10 months", "usually about a year", "expect around nine months".
      expect(faq?.a).not.toMatch(
        /\b(typically|usually|on average|approximately|roughly|around|expect)\b[^.]{0,30}\b(\d+|a|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(months?|weeks?|years?)\b/i,
      );
    });

    it('still refuses to predict the date the manual is done', () => {
      // Trigger A is unchanged and still undecided. The cap answers "what is the most this can
      // cost me", which is a different question from "when will it be finished".
      expect(faq?.a).toMatch(/won't predict the date/i);
    });
  });
});
