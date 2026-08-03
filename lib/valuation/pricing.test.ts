// lib/valuation/pricing.test.ts
import { describe, it, expect } from 'vitest';
import { priceForProfit } from './pricing';

describe('priceForProfit', () => {
  it('picks the band by REPORTED PROFIT', () => {
    expect(priceForProfit(100_000).monthly).toBe(499);
    expect(priceForProfit(500_000).monthly).toBe(999);
    expect(priceForProfit(1_000_000).monthly).toBe(1999);
    expect(priceForProfit(3_000_000).monthly).toBe(3499);
    expect(priceForProfit(6_000_000).monthly).toBe(4999);
  });

  it('uses band boundaries inclusively', () => {
    expect(priceForProfit(250_000).monthly).toBe(999);
    expect(priceForProfit(750_000).monthly).toBe(1999);
    expect(priceForProfit(5_000_000).monthly).toBe(4999);
  });

  /**
   * THE POINT OF THE WHOLE CHANGE, pinned.
   *
   * The band must not move when the gap moves. Before this, the gap chose the band, so the tool that
   * computed the number was paid more when the number was bigger — and a tester in the ICP found it
   * in about ninety seconds. If someone ever reconnects them, this goes red.
   */
  it('does NOT change price when the gap changes', () => {
    const small = priceForProfit(400_000, 50_000);
    const huge = priceForProfit(400_000, 20_000_000);
    expect(small.monthly).toBe(999);
    expect(huge.monthly).toBe(999);
    expect(huge.monthly).toBe(small.monthly);
  });

  it('still describes the ask as a fraction of the gap, without pricing on it', () => {
    // $400k profit -> $999/mo -> $11,988/yr. Against a $1M gap that is ~1.2%: worth saying, and
    // saying it costs nothing now that it cannot feed back into what is charged.
    const q = priceForProfit(400_000, 1_000_000);
    expect(q.fractionOfGap).toBeLessThan(0.02);
    expect(q.fractionOfGapPct).toBe('1.2%');
    expect(q.fractionWorthQuoting).toBe(true);
  });

  it('stops quoting the fraction when a year of Kira is a big slice of the gap', () => {
    // A $40k gap against the entry band is ~15% a year - saying "a small fraction" there would be
    // arguing against ourselves, so the surface shows the price without the share.
    expect(priceForProfit(100_000, 40_000).fractionWorthQuoting).toBe(false);
    expect(priceForProfit(100_000, 0).fractionWorthQuoting).toBe(false);
  });

  it('is safe on zero / negative inputs', () => {
    expect(priceForProfit(0).monthly).toBe(499);
    expect(priceForProfit(-5).monthly).toBe(499);
    expect(priceForProfit(100_000, -5).fractionOfGap).toBe(0);
  });
});
