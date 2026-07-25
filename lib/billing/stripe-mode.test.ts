import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isLiveMode, stripeMode, stripeSecretKey, stripeWebhookSecret } from './stripe-mode';

// These guards are the whole safety story for going live, so they are tested directly rather than
// trusted. Each case below is a real way to lose money or take none while believing otherwise.

const KEYS = [
  'STRIPE_LIVE_MODE',
  'STRIPE_SECRET_KEY',
  'STRIPE_SECRET_KEY_TEST',
  'STRIPE_SECRET_KEY_LIVE',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_WEBHOOK_SECRET_TEST',
  'STRIPE_WEBHOOK_SECRET_LIVE',
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const key of KEYS) delete process.env[key];
});

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('the mode flag', () => {
  it('is TEST when unset — the safe state is the one you reach by accident', () => {
    expect(stripeMode()).toBe('test');
    expect(isLiveMode()).toBe(false);
  });

  it('is TEST for anything that is not exactly "true"', () => {
    // A typo must not put the product into live billing.
    for (const value of ['', 'false', 'TRUE', 'True', '1', 'yes', 'live']) {
      process.env.STRIPE_LIVE_MODE = value;
      expect(stripeMode(), `"${value}" should be test`).toBe('test');
    }
  });

  it('is LIVE only for the exact string "true"', () => {
    process.env.STRIPE_LIVE_MODE = 'true';
    expect(stripeMode()).toBe('live');
  });
});

describe('live mode never silently degrades to test', () => {
  it('throws when the live key is missing rather than using the test key', () => {
    // The failure this prevents: you believe you are taking payments, the money is fake, and you
    // find out from the bank statement.
    process.env.STRIPE_LIVE_MODE = 'true';
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc';

    expect(() => stripeSecretKey()).toThrow(/STRIPE_SECRET_KEY_LIVE is not set/);
  });

  it('throws when the "live" key is not actually a live key', () => {
    process.env.STRIPE_LIVE_MODE = 'true';
    process.env.STRIPE_SECRET_KEY_LIVE = 'sk_test_pasted_in_the_wrong_box';

    expect(() => stripeSecretKey()).toThrow(/not a live key/);
  });

  it('throws when the live webhook secret is missing', () => {
    // Flipping the key without the webhook secret is the classic go-live failure: checkout looks
    // perfect and every webhook fails signature verification, silently.
    process.env.STRIPE_LIVE_MODE = 'true';
    process.env.STRIPE_SECRET_KEY_LIVE = 'sk_live_abc';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_the_test_one';

    expect(() => stripeWebhookSecret()).toThrow(/STRIPE_WEBHOOK_SECRET_LIVE is not set/);
  });

  it('resolves both when live is configured properly', () => {
    process.env.STRIPE_LIVE_MODE = 'true';
    process.env.STRIPE_SECRET_KEY_LIVE = 'sk_live_abc';
    process.env.STRIPE_WEBHOOK_SECRET_LIVE = 'whsec_live';

    expect(stripeSecretKey()).toBe('sk_live_abc');
    expect(stripeWebhookSecret()).toBe('whsec_live');
  });
});

describe('test mode refuses to hold a live key', () => {
  it('throws when a live key sits in the test slot', () => {
    // The more dangerous direction: real cards charged during what someone thinks is a rehearsal.
    process.env.STRIPE_LIVE_MODE = 'false';
    process.env.STRIPE_SECRET_KEY = 'sk_live_oops';

    expect(() => stripeSecretKey()).toThrow(/charges real cards/);
  });

  it('ignores a configured live key entirely while the flag is off', () => {
    // Both key sets live in the environment at once; only the flag decides. That is what makes
    // going live a flip rather than an edit under pressure.
    process.env.STRIPE_LIVE_MODE = 'false';
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc';
    process.env.STRIPE_SECRET_KEY_LIVE = 'sk_live_abc';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.STRIPE_WEBHOOK_SECRET_LIVE = 'whsec_live';

    expect(stripeSecretKey()).toBe('sk_test_abc');
    expect(stripeWebhookSecret()).toBe('whsec_test');
  });

  it('keeps the historical STRIPE_SECRET_KEY name working as the test slot', () => {
    // Nothing had to be renamed to adopt the switch.
    process.env.STRIPE_SECRET_KEY = 'sk_test_historical';
    expect(stripeSecretKey()).toBe('sk_test_historical');
  });

  it('prefers the explicit test slot when both names are present', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_old';
    process.env.STRIPE_SECRET_KEY_TEST = 'sk_test_explicit';
    expect(stripeSecretKey()).toBe('sk_test_explicit');
  });

  it('throws a plain error when no key is configured at all', () => {
    expect(() => stripeSecretKey()).toThrow(/STRIPE_SECRET_KEY is not set/);
  });
});
