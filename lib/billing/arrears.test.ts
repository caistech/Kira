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

vi.mock('@caistech/subscription-billing', () => ({
  reportPeriodOwed: (opts: Record<string, unknown>) => reportPeriodOwed(opts),
  cancelWithWaiver: (opts: Record<string, unknown>) => cancelWithWaiver(opts),
}));

vi.mock('./stripe-mode', () => ({ getStripe: () => ({ __stripe: true }) }));

// ─── a Supabase stub that behaves like the unique constraint ─────────────────

interface Claim {
  stripe_subscription_id: string;
  period_end: string;
  reported_at: string | null;
}

const claims: Claim[] = [];
let insertError: { code: string; message: string } | null = null;

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
  createServiceClient: () => ({ from: () => tableStub() }),
}));

const { cancelSubscriptionWithWaiver, reportPeriodIfNew } = await import('./arrears');

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

beforeEach(() => {
  claims.length = 0;
  insertError = null;
  reportPeriodOwed.mockClear();
  reportPeriodOwed.mockImplementation(async () => ({ identifier: 'ok' }));
  cancelWithWaiver.mockClear();
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
