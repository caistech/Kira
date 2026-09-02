// lib/billing/arrears.test.ts
//
// The arrears model's two dangerous edges, tested from Kira's side:
//
//   1. A period reported twice bills the owner double.
//   2. A period never reported invoices $0 — silently, in our favour, against a subscription that
//      looks perfectly healthy from every screen.
//
// Both are invisible until a real invoice is cut a month later, which is too late to notice by
// looking. The waiver has a test for a different reason: it is the only promise Kira makes about
// money, and until this file existed it was a policy rather than a code path.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubscriptionState } from '@caistech/subscription-billing';

const reportPeriodOwed = vi.fn(async (_opts: Record<string, unknown>) => ({ identifier: 'ok' }));
const cancelWithWaiver = vi.fn(async (_opts: Record<string, unknown>) => ({
  id: 'sub_1',
  status: 'canceled',
}));
const ensureBillingMeter = vi.fn(async () => ({ id: 'mtr_1' }));
const ensureMeteredPrice = vi.fn(async (opts: Record<string, unknown>) => ({
  id: 'price_maintain',
  ...opts,
}));

vi.mock('@caistech/subscription-billing', () => ({
  reportPeriodOwed: (opts: Record<string, unknown>) => reportPeriodOwed(opts),
  cancelWithWaiver: (opts: Record<string, unknown>) => cancelWithWaiver(opts),
  ensureBillingMeter: () => ensureBillingMeter(),
  ensureMeteredPrice: (opts: Record<string, unknown>) => ensureMeteredPrice(opts),
}));

// ─── a Stripe stub that can hold one subscription ────────────────────────────

let subscriptionItem: {
  id: string;
  price: { unit_amount: number | null; currency: string; lookup_key?: string } | null;
} | null = null;
const subscriptionItemsUpdate = vi.fn(async (_id: string, _patch: Record<string, unknown>) => ({}));

vi.mock('./stripe-mode', () => ({
  getStripe: () => ({
    subscriptions: {
      retrieve: async () => ({ items: { data: subscriptionItem ? [subscriptionItem] : [] } }),
    },
    subscriptionItems: {
      update: (id: string, patch: Record<string, unknown>) => subscriptionItemsUpdate(id, patch),
    },
  }),
}));

// ─── a Supabase stub that behaves like the unique constraint ─────────────────

interface Claim {
  stripe_subscription_id: string;
  period_end: string;
  reported_at: string | null;
}

const claims: Claim[] = [];
let insertError: { code: string; message: string } | null = null;
let countError: { message: string } | null = null;

function tableStub() {
  return {
    insert: async (row: Record<string, string>) => {
      if (insertError) return { error: insertError };
      const clash = claims.some(
        (c) =>
          c.stripe_subscription_id === row.stripe_subscription_id &&
          c.period_end === row.period_end,
      );
      // 23505 is Postgres' unique_violation — the normal path when a second event arrives inside
      // a period that has already been reported.
      if (clash) return { error: { code: '23505', message: 'duplicate key' } };
      claims.push({
        stripe_subscription_id: row.stripe_subscription_id,
        period_end: row.period_end,
        reported_at: null,
      });
      return { error: null };
    },
    delete: () => {
      const filters: Record<string, string> = {};
      const chain = {
        eq: (col: string, val: string) => {
          filters[col] = val;
          return chain;
        },
        is: async () => {
          const index = claims.findIndex(
            (c) =>
              c.stripe_subscription_id === filters.stripe_subscription_id &&
              c.period_end === filters.period_end,
          );
          if (index >= 0) claims.splice(index, 1);
          return { error: null };
        },
      };
      return chain;
    },
    // `select(..., { count: 'exact', head: true }).eq(...).lt(...)` — how the cap counts how many
    // periods this subscription has already been billed.
    select: (_cols: string, _opts?: Record<string, unknown>) => {
      const filters: Record<string, string> = {};
      const chain = {
        eq: (col: string, val: string) => {
          filters[col] = val;
          return chain;
        },
        lt: async (col: string, val: string) => {
          if (countError) return { count: null, error: countError };
          const n = claims.filter(
            (c) =>
              c.stripe_subscription_id === filters.stripe_subscription_id &&
              (col === 'period_end' ? c.period_end < val : true),
          ).length;
          return { count: n, error: null };
        },
      };
      return chain;
    },
    update: (patch: Record<string, string>) => {
      const filters: Record<string, string> = {};
      const chain = {
        eq: (col: string, val: string) => {
          filters[col] = val;
          if (Object.keys(filters).length === 2) {
            const claim = claims.find(
              (c) =>
                c.stripe_subscription_id === filters.stripe_subscription_id &&
                c.period_end === filters.period_end,
            );
            if (claim) claim.reported_at = patch.reported_at;
          }
          return chain;
        },
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
      };
      return chain;
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceClientV2: () => ({ from: () => tableStub() }),
}));

const { cancelSubscriptionWithWaiver, reportPeriodIfNew, stepDownIfCapReached, MAINTAIN_LOOKUP_PREFIX } =
  await import('./arrears');
const { FULL_RATE_PERIOD_CAP } = await import('@/lib/valuation/pricing');

// ─── fixtures ────────────────────────────────────────────────────────────────

function state(over: Partial<SubscriptionState> = {}): SubscriptionState {
  return {
    status: 'active',
    stripeCustomerId: 'cus_1',
    stripeSubscriptionId: 'sub_1',
    priceId: 'price_1',
    currentPeriodEnd: '2026-08-27T00:00:00.000Z',
    trialEndsAt: null,
    eventCreatedAt: '2026-07-28T00:00:00.000Z',
    eventType: 'customer.subscription.created',
    ...over,
  };
}

/** Seed N already-billed periods, all ending BEFORE the period under test. */
function seedBilledPeriods(n: number, subscriptionId = 'sub_1') {
  for (let i = 0; i < n; i += 1) {
    claims.push({
      stripe_subscription_id: subscriptionId,
      // 2025-01-01 … ascending, all well before the fixture's 2026-08-27.
      period_end: `2025-${String((i % 12) + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
      reported_at: '2025-01-01T00:00:00.000Z',
    });
  }
}

beforeEach(() => {
  claims.length = 0;
  insertError = null;
  countError = null;
  reportPeriodOwed.mockClear();
  reportPeriodOwed.mockImplementation(async () => ({ identifier: 'ok' }));
  cancelWithWaiver.mockClear();
  ensureBillingMeter.mockClear();
  ensureMeteredPrice.mockClear();
  subscriptionItemsUpdate.mockClear();
  subscriptionItem = {
    id: 'si_1',
    price: { unit_amount: 99900, currency: 'aud' },
  };
});

// ─── reporting ───────────────────────────────────────────────────────────────

describe('reportPeriodIfNew', () => {
  it('reports a new period once, keyed on the subscription and period end', async () => {
    expect(await reportPeriodIfNew(state())).toBe('reported');

    expect(reportPeriodOwed).toHaveBeenCalledTimes(1);
    expect(reportPeriodOwed.mock.calls[0][0]).toMatchObject({
      eventName: 'kira_subscription_month',
      stripeCustomerId: 'cus_1',
      identifier: 'sub_1:2026-08-27T00:00:00.000Z',
    });
    expect(claims[0].reported_at).toBeTruthy();
  });

  it('does not report the same period twice — a second event inside it is a no-op', async () => {
    await reportPeriodIfNew(state());
    // A different event about the same subscription, same period. Stripe sends several.
    const second = await reportPeriodIfNew(state({ eventType: 'customer.subscription.updated' }));

    expect(second).toBe('already_reported');
    expect(reportPeriodOwed).toHaveBeenCalledTimes(1);
  });

  it('reports the NEXT period when the subscription rolls over', async () => {
    await reportPeriodIfNew(state());
    const renewal = await reportPeriodIfNew(
      state({ eventType: 'invoice.payment_succeeded', currentPeriodEnd: '2026-09-27T00:00:00.000Z' }),
    );

    expect(renewal).toBe('reported');
    expect(reportPeriodOwed).toHaveBeenCalledTimes(2);
  });

  it('releases the claim when the meter rejects the event, so the retry can re-report', async () => {
    reportPeriodOwed.mockImplementation(async () => {
      throw new Error('stripe unavailable');
    });

    // It must THROW: inside the webhook that becomes a 500, the reducer releases its idempotency
    // claim, and Stripe retries. Swallowing it would leave the period unreported and the invoice
    // at $0, with nothing anywhere reporting a problem.
    await expect(reportPeriodIfNew(state())).rejects.toThrow('stripe unavailable');

    // A claim left behind would suppress this period forever.
    expect(claims).toHaveLength(0);

    reportPeriodOwed.mockImplementation(async () => ({ identifier: 'ok' }));
    expect(await reportPeriodIfNew(state())).toBe('reported');
  });

  it.each([
    ['cancelled', 'cancelled'],
    ['incomplete', 'incomplete'],
    ['unpaid', 'unpaid'],
  ] as const)('does not accrue against a %s subscription', async (_label, status) => {
    // Billing someone who has already left is the exact failure the waiver exists to prevent.
    expect(await reportPeriodIfNew(state({ status }))).toBe('not_billable');
    expect(reportPeriodOwed).not.toHaveBeenCalled();
  });

  it('still accrues while past_due — the owner has the product and the debt is real', async () => {
    expect(await reportPeriodIfNew(state({ status: 'past_due' }))).toBe('reported');
  });

  it.each([
    ['no subscription id', { stripeSubscriptionId: null }],
    ['no customer id', { stripeCustomerId: null }],
    ['no period end', { currentPeriodEnd: null }],
  ])('skips an event with %s rather than guessing', async (_label, over) => {
    expect(await reportPeriodIfNew(state(over as Partial<SubscriptionState>))).toBe('not_billable');
    expect(reportPeriodOwed).not.toHaveBeenCalled();
  });

  it('surfaces a claim failure that is not a duplicate', async () => {
    insertError = { code: '42P01', message: 'relation does not exist' };
    // A missing table must not read as "already reported" — that is the silent-$0-invoice path.
    await expect(reportPeriodIfNew(state())).rejects.toThrow(/relation does not exist/);
  });
});

// ─── the waiver ──────────────────────────────────────────────────────────────

describe('cancelSubscriptionWithWaiver', () => {
  it('cancels through the waiving path, not a bare cancel', async () => {
    await cancelSubscriptionWithWaiver('sub_1');

    expect(cancelWithWaiver).toHaveBeenCalledTimes(1);
    expect(cancelWithWaiver.mock.calls[0][0]).toMatchObject({ subscriptionId: 'sub_1' });
  });
});

// ─── the 12-month cap ────────────────────────────────────────────────────────
//
// The promise is "never more than 12 months at the full rate", made on a pricing page to a man who
// said an unbounded monthly fee is an open cheque he would not sign. It is the only statement this
// product makes that binds us for every customer we have not met yet, so it is tested from both
// directions: that it fires, and that it cannot fire twice.

describe('the 12-month cap', () => {
  it('does nothing before the cap is reached', async () => {
    seedBilledPeriods(FULL_RATE_PERIOD_CAP - 1);

    expect(await stepDownIfCapReached(state())).toBe('within_cap');
    expect(subscriptionItemsUpdate).not.toHaveBeenCalled();
    expect(ensureMeteredPrice).not.toHaveBeenCalled();
  });

  it('steps down on the period after the cap, at a third of what he is actually paying', async () => {
    seedBilledPeriods(FULL_RATE_PERIOD_CAP);

    expect(await stepDownIfCapReached(state())).toBe('stepped_down');

    // A THIRD OF THE PRICE ON THE SUBSCRIPTION, not of a recomputed band. If the model or the tiers
    // move, an owner's step-down must still be a third of the number on HIS invoices.
    expect(ensureMeteredPrice).toHaveBeenCalledTimes(1);
    expect(ensureMeteredPrice.mock.calls[0][0]).toMatchObject({
      unitAmount: 33300, // floor(999 / 3) = 333 dollars
      currency: 'AUD',
      interval: 'month',
    });
    // Namespaced so the subscription itself records which rate it is on.
    expect(String(ensureMeteredPrice.mock.calls[0][0].lookupKeyPrefix)).toBe(MAINTAIN_LOOKUP_PREFIX);
    // The tax qualifier travels onto the invoice he receives.
    expect(String(ensureMeteredPrice.mock.calls[0][0].productName)).toContain('GST');

    expect(subscriptionItemsUpdate).toHaveBeenCalledTimes(1);
    expect(subscriptionItemsUpdate.mock.calls[0][0]).toBe('si_1');
    expect(subscriptionItemsUpdate.mock.calls[0][1]).toMatchObject({
      price: 'price_maintain',
      proration_behavior: 'none',
    });
  });

  it('never steps down twice — a third of a third is the failure this guards', async () => {
    // The realistic way in: Stripe retries a webhook whose report leg failed after the swap landed.
    // Without the lookup-key check that retry takes $333 to $111, and two more take it to $12 — all
    // silently, all in the owner's favour, which is the direction nobody audits.
    seedBilledPeriods(FULL_RATE_PERIOD_CAP + 5);
    subscriptionItem = {
      id: 'si_1',
      price: { unit_amount: 33300, currency: 'aud', lookup_key: `${MAINTAIN_LOOKUP_PREFIX}-aud-33300` },
    };

    expect(await stepDownIfCapReached(state())).toBe('already_stepped_down');
    expect(subscriptionItemsUpdate).not.toHaveBeenCalled();
    expect(ensureMeteredPrice).not.toHaveBeenCalled();
  });

  it('does not touch a subscription that is not accruing', async () => {
    seedBilledPeriods(FULL_RATE_PERIOD_CAP);
    // 'cancelled', not Stripe's 'canceled' — @caistech/subscription-billing normalises the American
    // spelling to the portfolio's on the way in, so the American one is a status the adapter never
    // writes and a test using it would pass without exercising the real value.
    expect(await stepDownIfCapReached(state({ status: 'cancelled' }))).toBe('not_billable');
    expect(subscriptionItemsUpdate).not.toHaveBeenCalled();
  });

  it('refuses to guess when the price carries no amount', async () => {
    seedBilledPeriods(FULL_RATE_PERIOD_CAP);
    subscriptionItem = { id: 'si_1', price: { unit_amount: null, currency: 'aud' } };

    expect(await stepDownIfCapReached(state())).toBe('not_billable');
    expect(subscriptionItemsUpdate).not.toHaveBeenCalled();
  });

  it('counts only THIS subscription, so one owner cannot step another down', async () => {
    seedBilledPeriods(FULL_RATE_PERIOD_CAP + 3, 'sub_other');
    seedBilledPeriods(2);

    expect(await stepDownIfCapReached(state())).toBe('within_cap');
    expect(subscriptionItemsUpdate).not.toHaveBeenCalled();
  });

  it('throws rather than silently overcharging when the ledger cannot be read', async () => {
    // A count that failed is not "zero periods so far". Reading it that way keeps an owner on the
    // full rate past the ceiling we promised him, which is the one direction that costs him money.
    seedBilledPeriods(FULL_RATE_PERIOD_CAP);
    countError = { message: 'connection reset' };

    await expect(stepDownIfCapReached(state())).rejects.toThrow(/billing period count failed/i);
  });

  it('runs as part of opening a period, before that period is reported', async () => {
    // The invoice is cut at period CLOSE from whatever price is on the item then, so the swap has
    // to have happened by the time the period is reported. Asserted through call order rather than
    // by reading the source.
    seedBilledPeriods(FULL_RATE_PERIOD_CAP);

    expect(await reportPeriodIfNew(state())).toBe('reported');

    expect(subscriptionItemsUpdate).toHaveBeenCalledTimes(1);
    expect(reportPeriodOwed).toHaveBeenCalledTimes(1);
    expect(subscriptionItemsUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      reportPeriodOwed.mock.invocationCallOrder[0],
    );
  });
});
