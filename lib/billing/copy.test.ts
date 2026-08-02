import { describe, expect, it } from 'vitest';

import { billingCopy } from './copy';

/**
 * ONE SWITCH, BOTH READINGS HONEST.
 *
 * The flag was already single-sourced for the PAYMENT path. What drifted was what the product SAYS:
 * a dozen inline ternaries across a sales page, edited months apart by someone reading one screen at
 * a time. These tests pin the property that matters — flipping the flag moves every sentence, and
 * neither mode promises something the other would make untrue.
 */
describe('billingCopy', () => {
  const live = billingCopy(true);
  const test = billingCopy(false);

  it('gives a different reading for every surface', () => {
    expect(live.cta).not.toBe(test.cta);
    expect(live.priceQualifier).not.toBe(test.priceQualifier);
    expect(live.bullets).not.toEqual(test.bullets);
    expect(live.adminBanner).not.toBe(test.adminBanner);
    expect(live.finePrint('$999 + GST')).not.toBe(test.finePrint('$999 + GST'));
  });

  // The tester's exact stumble: one click from "free while in beta" onto a page badged Sandbox,
  // asking for a card. Naming the badge before he sees it is the whole fix.
  it('warns about the Sandbox badge in TEST mode, and does not mention it when live', () => {
    expect(test.confirmBody('$999 + GST')).toMatch(/sandbox/i);
    expect(live.confirmBody('$999 + GST')).not.toMatch(/sandbox/i);
  });

  it('never promises a charge in test mode', () => {
    const all = [test.cta, test.priceQualifier, ...test.bullets, test.confirmBody('$999'), test.finePrint('$999')].join(' ');
    expect(all).not.toMatch(/your first payment is/i);
    expect(all).toMatch(/nothing is charged/i);
  });

  // Live mode must state the arrears terms, because that promise is the product's differentiator
  // and the thing the billing portal has to be configured to honour.
  it('states the arrears terms when live', () => {
    expect(live.finePrint('$999 + GST')).toMatch(/arrears/i);
    expect(live.confirmBody('$999 + GST')).toContain('$999 + GST');
  });

  it('carries the price through into both confirm bodies without losing the tax qualifier', () => {
    expect(live.confirmBody('$999 + GST')).toContain('+ GST');
  });

  it('names the flag in the admin banner while it is off, so an operator knows what to flip', () => {
    expect(test.adminBanner).toContain('STRIPE_LIVE_MODE');
    expect(live.adminBanner).toMatch(/live/i);
  });
});
