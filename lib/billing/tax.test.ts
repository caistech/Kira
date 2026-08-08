import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  formatCheckoutPrice,
  gstApplies,
  gstTaxRateEnvVar,
  gstTaxRateId,
  gstTaxRateIds,
  GST_PERCENTAGE,
} from './tax';

/**
 * The defect these guard is SILENT — a price screen saying "+ GST" over a subscription that will
 * never be invoiced for any. Nothing throws, nothing 500s, checkout completes. So the assertions
 * here are about the two halves agreeing: what Stripe is told, and what the buyer is shown.
 */

const VARS = ['STRIPE_LIVE_MODE', 'STRIPE_GST_TAX_RATE_ID_TEST', 'STRIPE_GST_TAX_RATE_ID_LIVE'];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const v of VARS) {
    saved[v] = process.env[v];
    delete process.env[v];
  }
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  for (const v of VARS) {
    if (saved[v] === undefined) delete process.env[v];
    else process.env[v] = saved[v];
  }
  vi.restoreAllMocks();
});

describe('the rate is per Stripe mode', () => {
  it('reads the TEST variable by default', () => {
    expect(gstTaxRateEnvVar()).toBe('STRIPE_GST_TAX_RATE_ID_TEST');
  });

  it('reads the LIVE variable in live mode', () => {
    process.env.STRIPE_LIVE_MODE = 'true';
    expect(gstTaxRateEnvVar()).toBe('STRIPE_GST_TAX_RATE_ID_LIVE');
  });

  it('does NOT fall back to the test id in live mode', () => {
    // A test-mode tax rate id does not exist in the live account: Stripe rejects the session at
    // checkout, in front of a buyer. Falling back would turn a config gap into a failed sale.
    process.env.STRIPE_GST_TAX_RATE_ID_TEST = 'txr_test';
    process.env.STRIPE_LIVE_MODE = 'true';
    expect(gstTaxRateId()).toBeNull();
  });

  it('treats a whitespace-only value as unset', () => {
    process.env.STRIPE_GST_TAX_RATE_ID_TEST = '   ';
    expect(gstTaxRateId()).toBeNull();
  });
});

describe('gstTaxRateIds', () => {
  it('attaches the configured rate for an AUD checkout', () => {
    process.env.STRIPE_GST_TAX_RATE_ID_TEST = 'txr_gst';
    expect(gstTaxRateIds('AUD')).toEqual(['txr_gst']);
  });

  it('attaches nothing when no rate is configured, and says so loudly', () => {
    expect(gstTaxRateIds('AUD')).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });

  it('returns [] rather than throwing, so a tax gap never blocks a sale', () => {
    expect(() => gstTaxRateIds('AUD')).not.toThrow();
  });

  it('never applies AUSTRALIAN GST to a non-AUD checkout', () => {
    // Reachable today: the archived currency selector persisted `kira_currency` to localStorage, so
    // a returning browser can still carry GBP into checkout.
    process.env.STRIPE_GST_TAX_RATE_ID_TEST = 'txr_gst';
    expect(gstTaxRateIds('GBP')).toEqual([]);
  });

  it('is case-insensitive about the currency code', () => {
    process.env.STRIPE_GST_TAX_RATE_ID_TEST = 'txr_gst';
    expect(gstTaxRateIds('aud')).toEqual(['txr_gst']);
  });
});

describe('the copy can never claim a tax the session does not carry', () => {
  it('says "+ GST" only when the rate is configured AND the currency is AUD', () => {
    process.env.STRIPE_GST_TAX_RATE_ID_TEST = 'txr_gst';
    expect(gstApplies('AUD')).toBe(true);
    expect(formatCheckoutPrice(999, 'AUD')).toContain('+ GST');
  });

  it('drops the qualifier when no rate is configured', () => {
    // THE ORIGINAL DEFECT, as an assertion: "$999 + GST" printed over an untaxed subscription.
    expect(gstApplies('AUD')).toBe(false);
    expect(formatCheckoutPrice(999, 'AUD')).not.toContain('GST');
  });

  it('never says "+ VAT" to a non-AUD buyer, since we do not collect it', () => {
    process.env.STRIPE_GST_TAX_RATE_ID_TEST = 'txr_gst';
    const label = formatCheckoutPrice(999, 'GBP');
    expect(label).not.toContain('VAT');
    expect(label).not.toContain('GST');
  });

  it('ties the words to the parameter — both derive from one decision', () => {
    process.env.STRIPE_GST_TAX_RATE_ID_TEST = 'txr_gst';
    for (const currency of ['AUD', 'GBP', 'USD']) {
      const charged = gstTaxRateIds(currency).length > 0;
      const claimed = formatCheckoutPrice(999, currency).includes('GST');
      expect(claimed, `${currency}: copy and charge must agree`).toBe(charged);
    }
  });
});

describe('the rate itself', () => {
  it('is the statutory Australian 10%', () => {
    expect(GST_PERCENTAGE).toBe(10);
  });
});
