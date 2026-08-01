// Tests for the Settings price read.
//
// Every case here is a way to be WRONG about someone's money, which is why they are worth pinning:
// the function's whole job is to return a number only when it is certain, and each degrade path is
// one that a naive implementation would have rendered confidently instead.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const retrieve = vi.fn();

vi.mock('./stripe-mode', () => ({
  getStripe: () => ({ subscriptions: { retrieve } }),
}));

const { getSubscriptionPrice } = await import('./subscription-price');

/** A well-formed monthly subscription, which each test then breaks in exactly one way. */
function subscription(price: Record<string, unknown>) {
  return { items: { data: [{ price }] } };
}

beforeEach(() => {
  retrieve.mockReset();
});

describe('getSubscriptionPrice', () => {
  it('formats the monthly amount with its tax qualifier', async () => {
    retrieve.mockResolvedValue(
      subscription({ unit_amount: 99900, currency: 'aud', recurring: { interval: 'month' } }),
    );

    const price = await getSubscriptionPrice('sub_123');

    expect(price?.monthly).toBe(999);
    expect(price?.currency).toBe('AUD');
    // The qualifier is the point. A bare "$999" is read by a business buyer as the amount leaving
    // their account, and in Australia it is not.
    expect(price?.formatted).toBe('$999 + GST');
  });

  it('names the right tax for the currency actually billed', async () => {
    retrieve.mockResolvedValue(
      subscription({ unit_amount: 99900, currency: 'gbp', recurring: { interval: 'month' } }),
    );

    expect((await getSubscriptionPrice('sub_123'))?.formatted).toContain('+ VAT');
  });

  it('returns null for a currency whose tax regime we cannot name', async () => {
    // The trap this guards: getCurrency falls back to AUD, so without the check a Japanese customer
    // would be shown a confident "+ GST" — and JPY has no minor unit, so /100 would be wrong too.
    retrieve.mockResolvedValue(
      subscription({ unit_amount: 99900, currency: 'jpy', recurring: { interval: 'month' } }),
    );

    expect(await getSubscriptionPrice('sub_123')).toBeNull();
  });

  it('returns null when the price is tiered, rather than inventing a figure', async () => {
    retrieve.mockResolvedValue(
      subscription({ unit_amount: null, currency: 'aud', recurring: { interval: 'month' } }),
    );

    expect(await getSubscriptionPrice('sub_123')).toBeNull();
  });

  it('returns null for a non-monthly interval', async () => {
    retrieve.mockResolvedValue(
      subscription({ unit_amount: 99900, currency: 'aud', recurring: { interval: 'year' } }),
    );

    expect(await getSubscriptionPrice('sub_123')).toBeNull();
  });

  it('returns null when the subscription has more than one item', async () => {
    // The monthly cost would be a SUM, and a sum this function did not compute is not one it may
    // present as the price.
    retrieve.mockResolvedValue({
      items: {
        data: [
          { price: { unit_amount: 99900, currency: 'aud', recurring: { interval: 'month' } } },
          { price: { unit_amount: 10000, currency: 'aud', recurring: { interval: 'month' } } },
        ],
      },
    });

    expect(await getSubscriptionPrice('sub_123')).toBeNull();
  });

  it('returns null without calling Stripe when there is no subscription', async () => {
    expect(await getSubscriptionPrice(null)).toBeNull();
    expect(await getSubscriptionPrice(undefined)).toBeNull();
    expect(await getSubscriptionPrice('')).toBeNull();
    expect(retrieve).not.toHaveBeenCalled();
  });

  it('degrades to null when Stripe is unreachable, and does not throw', async () => {
    // Settings must render. A billing read that takes the whole page down with it turns a vendor
    // blip into "I cannot get into my account".
    retrieve.mockRejectedValue(new Error('connection reset'));

    await expect(getSubscriptionPrice('sub_123')).resolves.toBeNull();
  });
});
