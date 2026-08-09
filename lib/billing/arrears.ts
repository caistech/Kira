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

import {
  cancelWithWaiver,
  ensureBillingMeter,
  ensureMeteredPrice,
  reportPeriodOwed,
} from '@caistech/subscription-billing';
import type { SubscriptionState } from '@caistech/subscription-billing';

import { getStripe } from './stripe-mode';
import { FULL_RATE_PERIOD_CAP, maintainPrice } from '@/lib/valuation/pricing';
import { taxSuffix } from '@/lib/valuation/currency';
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
 * THE CAP. Twelve months at the full rate, then the maintain rate regardless.
 *
 * Operator decision 2026-08-09; the reasoning is in `docs/DECISIONS.md` §2, "The trigger — TWO of
 * them". The short version, because the distinction is the whole thing:
 *
 *   · Trigger A — "the manual is built" — is a JUDGEMENT, needs a defensible denominator (register
 *     B4, deactivation), and is still undecided. Nothing here implements it.
 *   · Trigger B — this — is a CEILING. It needs no denominator, only elapsed billed months, which
 *     is why it can ship today and A cannot.
 *
 * What produced it: a 66-year-old electrician doing the sum on the result page. "I'm 66 and I want
 * out inside two years. $999 + GST a month with no stated end is an open cheque, and no man my age
 * signs one of those." The product had been refusing to name a duration on the honest grounds that
 * a forecast we cannot keep is worse than none — correct about forecasts, and it left him with
 * nothing bounding the number.
 *
 * ⚠️ THE COPY AND THIS CODE MUST NEVER SHIP SEPARATELY. A published cap that nothing enforces is
 * exactly the J2 failure — a pricing sentence that went false the moment a flag flipped — except
 * worse, because this one is a promise about money made to someone who is already paying.
 *
 * Re-exported rather than redeclared: the number is defined once, in `lib/valuation/pricing.ts`
 * beside `MAINTAIN_FRACTION`, so the sentence in the FAQ and the swap in this file cannot drift
 * apart. A cap stated in prose and enforced from a second literal is one edit away from being a lie.
 */
export { FULL_RATE_PERIOD_CAP } from '@/lib/valuation/pricing';

/**
 * A separate lookup-key namespace for maintain-rate prices.
 *
 * It is what makes the step-down IDEMPOTENT, and that is not a nicety: without a way to ask "has
 * this subscription already stepped down?", a retried webhook would take a third of a third. Two
 * retries and an owner is paying $37 a month instead of $333, silently, in his favour — the
 * direction nobody audits until an accountant does.
 *
 * Stripe answers the question for us, because `ensureMeteredPrice` writes a deterministic
 * `lookup_key` from this prefix. So the subscription itself records which rate it is on, in a field
 * a human can read in the Stripe dashboard, rather than in a flag we would have to keep in sync.
 */
export const MAINTAIN_LOOKUP_PREFIX = `${PRICE_LOOKUP_PREFIX}-maintain`;

export type StepDownOutcome =
  | 'not_billable'
  | 'within_cap'
  | 'already_stepped_down'
  | 'stepped_down';

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
    // BEFORE reporting, not after. The invoice is cut at period CLOSE from the price on the
    // subscription item at that moment, so the swap has to land at period OPEN to affect the period
    // it is meant to. Doing it after reporting would still work today, but only by accident of
    // ordering — this way the dependency is explicit.
    //
    // Inside the try on purpose: a failure here releases the claim below and Stripe retries, and
    // the retry is safe because the step-down is idempotent (see MAINTAIN_LOOKUP_PREFIX).
    await stepDownIfCapReached(state);

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
 * Move a subscription onto the maintain rate once it has been billed the full rate for the cap.
 *
 * COUNTED FROM OUR OWN LEDGER, NOT FROM STRIPE'S `start_date`, and the choice is the promise. The
 * cap is "never more than twelve months AT THE FULL RATE" — so what must be counted is months
 * actually CHARGED, not months elapsed since signup. A subscription that was paused, or that spent
 * time in a status `BILLABLE_STATUSES` excludes, has not billed those months, and charging the
 * calendar instead of the ledger would step him down early and quietly cost us the difference. The
 * ledger is also already idempotent, which the calendar is not.
 *
 * Periods strictly EARLIER than the one being opened are counted, so this reads the same whether or
 * not the current period's claim row has been written yet. Twelve earlier periods means this is the
 * thirteenth, which is the first one owed at the maintain rate.
 *
 * Returns rather than throws for every "nothing to do" case; throws only when Stripe does, because
 * the caller releases its claim on a throw and a retry is exactly what a failed swap wants.
 */
export async function stepDownIfCapReached(state: SubscriptionState): Promise<StepDownOutcome> {
  const { stripeSubscriptionId, currentPeriodEnd, status } = state;

  if (!stripeSubscriptionId || !currentPeriodEnd) return 'not_billable';
  if (!BILLABLE_STATUSES.has(status)) return 'not_billable';

  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from('billing_periods_reported')
    .select('period_end', { count: 'exact', head: true })
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .lt('period_end', currentPeriodEnd);

  if (error) throw new Error(`billing period count failed: ${error.message}`);
  if ((count ?? 0) < FULL_RATE_PERIOD_CAP) return 'within_cap';

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const item = subscription.items?.data?.[0];
  const price = item?.price;

  // No item, or a price with no amount on it, means this is not a shape we know how to step down.
  // Say so instead of guessing at a number — this function only ever moves money downwards, but a
  // wrong guess here is still a wrong invoice.
  if (!item || !price || typeof price.unit_amount !== 'number') return 'not_billable';

  if (price.lookup_key?.startsWith(MAINTAIN_LOOKUP_PREFIX)) return 'already_stepped_down';

  const currentMonthly = price.unit_amount / 100;
  const maintainMonthly = maintainPrice(currentMonthly);
  // A zero maintain rate would be a free subscription created by arithmetic rather than by anyone
  // deciding it. Leave the price alone and let a human look.
  if (maintainMonthly <= 0) return 'within_cap';

  const currency = (price.currency || 'aud').toUpperCase();
  const meter = await ensureBillingMeter({ stripe, eventName: METER_EVENT_NAME });
  const maintainPriceObject = await ensureMeteredPrice({
    stripe,
    meterId: meter.id,
    currency,
    unitAmount: maintainMonthly * 100,
    interval: 'month',
    // The tax qualifier travels here for the same reason it travels onto checkout: this name is
    // what Stripe renders beside the amount on the invoice he receives.
    productName: `Kira — keeping it current (${taxSuffix(currency)})`,
    lookupKeyPrefix: MAINTAIN_LOOKUP_PREFIX,
  });

  await stripe.subscriptionItems.update(item.id, {
    price: maintainPriceObject.id,
    // No proration. The period being opened is billed in full at the new rate; there is nothing to
    // pro-rate because nothing has been invoiced for it yet, and a proration line here would be a
    // credit or a charge nobody was told about.
    proration_behavior: 'none',
  });

  return 'stepped_down';
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
