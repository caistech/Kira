// lib/billing/arrears.ts
//
// Kira bills in ARREARS. The card is captured on day one and the month is owed from the start; it
// is simply not invoiced until the period closes. If the owner cancels before that bill falls due,
// the month in progress is WAIVED — no proration, no argument.
//
// The operator's words: "one month is not valuable enough in terms of output to make it important
// to grab and run, it's the continual flow... thanks for trying us out and off you go."
//
// WHY THIS IS NOT A TRIAL. A trial gives the first month away and then bills a month AHEAD. Arrears
// charges for every month and always bills BEHIND. They look identical for thirty days and then
// invert — under a trial, an owner who cancels on day 45 has already paid for days 30–60 and gets
// nothing back; under arrears he pays for days 0–30 and the month he is in is written off. Kira ran
// the trial shape until this file existed, which gave month one away to every customer.
//
// The mechanics live in @caistech/subscription-billing (`ensureMeteredPrice`, `reportPeriodOwed`,
// `cancelWithWaiver`). What is here is the part that is Kira's: WHEN a period counts as owed, and
// the durable record that stops one being reported twice.

import { cancelWithWaiver, reportPeriodOwed } from '@caistech/subscription-billing';
import type { SubscriptionState } from '@caistech/subscription-billing';

import { getStripe } from './stripe-mode';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * The meter every Kira subscription period is reported against. Stable forever — it is the join
 * between a price and the usage that bills it, so renaming it orphans every existing subscription.
 */
export const METER_EVENT_NAME = 'kira_subscription_month';

/**
 * Namespace for generated Stripe price lookup keys, so bands are reusable and identifiable.
 *
 * ⚠️ BUMPING THIS IS HOW THE CHECKOUT COPY CHANGES, and it is the only way.
 *
 * `ensureMeteredPrice` is idempotent on the lookup key — correctly, or every checkout would mint a
 * new Price. The consequence nobody had written down is that `productName` and `productDescription`
 * are used ONLY when the Product is first created, and Stripe REFUSES to update a product it
 * auto-created ("The product was created by Stripe automatically and cannot be updated"). So the
 * copy on the checkout page is frozen at whatever the first session set, forever.
 *
 * That is why a commit adding a tax suffix to the product name on 3 August changed nothing: the
 * Growth product had existed since 24 July. A tester recorded "no GST anywhere" against a fix that
 * had shipped and could never apply, and the register carried it as a copy problem for a week.
 *
 * Bumping the prefix mints a fresh Price + Product carrying the current copy. Safe while nobody is
 * subscribed; once someone is, existing subscriptions keep their old price and only NEW checkouts
 * move — which is the correct behaviour anyway, but means the old band must stay alive.
 */
export const PRICE_LOOKUP_PREFIX = 'kira-gst';

/**
 * Statuses that accrue a fee.
 *
 * A cancelled, unpaid or incomplete subscription must not have a period reported against it — that
 * would bill someone who has already left, which is the precise failure the waiver exists to
 * prevent. `past_due` DOES accrue: the owner still has the product, and the debt is real; Stripe's
 * dunning decides what happens to the invoice.
 */
const BILLABLE_STATUSES = new Set(['active', 'trialing', 'past_due']);

export type ReportOutcome = 'reported' | 'already_reported' | 'not_billable';

/**
 * Report the owner's current period as owed, once.
 *
 * Called after subscription state has been written, on every event that could open a new period.
 * The claim row is taken FIRST: if two events for the same period arrive together, exactly one wins
 * the unique constraint and the other returns `already_reported` without touching Stripe.
 *
 * Throws if the meter event fails, deliberately. The caller is inside the Stripe webhook, where a
 * throw means a 500, which means Stripe retries — and a retry is exactly what an unreported period
 * needs. Swallowing it would leave a subscription that invoices $0 while every screen looks fine.
 */
export async function reportPeriodIfNew(state: SubscriptionState): Promise<ReportOutcome> {
  const { stripeSubscriptionId, stripeCustomerId, currentPeriodEnd, status } = state;

  if (!stripeSubscriptionId || !stripeCustomerId || !currentPeriodEnd) return 'not_billable';
  if (!BILLABLE_STATUSES.has(status)) return 'not_billable';

  const supabase = createServiceClient();

  // Claim the period. A duplicate key here is the normal, expected path — most events about a
  // subscription arrive inside a period that has already been reported.
  const { error: claimError } = await supabase.from('billing_periods_reported').insert({
    stripe_subscription_id: stripeSubscriptionId,
    period_end: currentPeriodEnd,
    stripe_customer_id: stripeCustomerId,
  });

  if (claimError) {
    if (claimError.code === '23505') return 'already_reported';
    throw new Error(`billing period claim failed: ${claimError.message}`);
  }

  try {
    await reportPeriodOwed({
      stripe: getStripe(),
      eventName: METER_EVENT_NAME,
      stripeCustomerId,
      identifier: `${stripeSubscriptionId}:${currentPeriodEnd}`,
      // No explicit timestamp: Stripe rejects events older than 35 days, and a webhook replayed
      // long after the fact should land in the period it is processed in, not a closed one.
    });
  } catch (error) {
    // Release the claim so the retry can try again. A claim left behind after a failed send would
    // permanently suppress billing for that period — silently, and in our favour, which is the
    // direction nobody audits.
    await supabase
      .from('billing_periods_reported')
      .delete()
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .eq('period_end', currentPeriodEnd)
      .is('reported_at', null);
    throw error;
  }

  await supabase
    .from('billing_periods_reported')
    .update({ reported_at: new Date().toISOString() })
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .eq('period_end', currentPeriodEnd);

  return 'reported';
}

/**
 * Cancel an owner's subscription and waive the month in progress.
 *
 * This is the promise as code. `cancelWithWaiver` passes `invoice_now: false` so Stripe cuts no
 * final invoice for the accrued period, and `prorate: false` so no pending proration is swept into
 * one instead.
 *
 * It exists as its own path rather than being left to the Stripe billing portal because the
 * portal's cancel does not waive anything — it either ends the subscription at period end (so the
 * period completes and IS invoiced) or cancels immediately and invoices the usage. Either way the
 * owner gets a bill for the month we said was on us.
 */
export async function cancelSubscriptionWithWaiver(subscriptionId: string) {
  return cancelWithWaiver({ stripe: getStripe(), subscriptionId });
}
