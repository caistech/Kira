// The step-down at the transition — one third, narrow scope. Operator decision 2026-08-05.
//
// Tested because it is a PROMISE MADE IN PUBLIC. The landing page and the FAQ both tell an owner
// that keeping the manual current costs a third of his band, and a promise about paying less is the
// one an owner will check with a calculator.

import { describe, expect, it } from 'vitest';
import { MAINTAIN_FRACTION, PRICE_TIERS, maintainPrice, maintainPriceForProfit, priceForProfit } from './pricing';
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

  it('promises no date and no threshold', () => {
    // "When the manual is built" needs a defensible denominator (register B4). Until that exists,
    // any timeframe is a promise we cannot honour — worse than none.
    expect(faq?.a).toMatch(/don't put a date on it/i);
    expect(faq?.a).not.toMatch(/\b(\d+\s*(months?|weeks?|years?))\b/i);
  });
});
