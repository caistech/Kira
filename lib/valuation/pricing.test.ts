// lib/valuation/pricing.test.ts
import { describe, it, expect } from 'vitest';
import { priceForGap } from './pricing';

describe('priceForGap', () => {
  it('picks the band by gap magnitude', () => {
    expect(priceForGap(100_000).monthly).toBe(99);
    expect(priceForGap(500_000).monthly).toBe(249);
    expect(priceForGap(2_000_000).monthly).toBe(499);
    expect(priceForGap(5_000_000).monthly).toBe(999);
    expect(priceForGap(9_000_000).monthly).toBe(1499);
  });

  it('uses band boundaries inclusively', () => {
    expect(priceForGap(250_000).monthly).toBe(249);
    expect(priceForGap(1_000_000).monthly).toBe(499);
    expect(priceForGap(7_000_000).monthly).toBe(1499);
  });

  it('keeps the ask a small fraction of the gap on a big number', () => {
    const q = priceForGap(2_000_000);
    expect(q.fractionOfGap).toBeLessThan(0.01); // under 1% of the gap per year
    expect(q.fractionOfGapPct).toBe('0.3%');
  });

  it('is safe on zero / negative gaps', () => {
    expect(priceForGap(0).monthly).toBe(99);
    expect(priceForGap(-5).fractionOfGap).toBe(0);
  });
});
