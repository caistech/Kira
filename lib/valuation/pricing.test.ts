// lib/valuation/pricing.test.ts
import { describe, it, expect } from 'vitest';
import { priceForGap } from './pricing';

describe('priceForGap', () => {
  it('picks the band by gap magnitude', () => {
    expect(priceForGap(100_000).monthly).toBe(499);
    expect(priceForGap(500_000).monthly).toBe(999);
    expect(priceForGap(2_000_000).monthly).toBe(1999);
    expect(priceForGap(5_000_000).monthly).toBe(3499);
    expect(priceForGap(9_000_000).monthly).toBe(4999);
  });

  it('uses band boundaries inclusively', () => {
    expect(priceForGap(250_000).monthly).toBe(999);
    expect(priceForGap(1_000_000).monthly).toBe(1999);
    expect(priceForGap(7_000_000).monthly).toBe(4999);
  });

  it('keeps the ask a small fraction of the gap on a big number', () => {
    const q = priceForGap(2_000_000);
    expect(q.fractionOfGap).toBeLessThan(0.02); // under 2% of the gap per year
    expect(q.fractionOfGapPct).toBe('1.2%');
    expect(q.fractionWorthQuoting).toBe(true);
  });

  it('stops quoting the fraction when a year of Kira is a big slice of the gap', () => {
    // A $40k gap against the entry band is ~15% a year - saying "a small fraction" there would be
    // arguing against ourselves, so the surface shows the price without the share.
    expect(priceForGap(40_000).fractionWorthQuoting).toBe(false);
    expect(priceForGap(0).fractionWorthQuoting).toBe(false);
  });

  it('is safe on zero / negative gaps', () => {
    expect(priceForGap(0).monthly).toBe(499);
    expect(priceForGap(-5).fractionOfGap).toBe(0);
  });
});
