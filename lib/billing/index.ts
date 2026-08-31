// lib/billing/index.ts
//
// The single source of Kira's billing configuration. Every route that touches Stripe or the trial
// clock reads its numbers from here — the trial length, the fair-use ceiling, the Stripe client,
// and the subscriber-table adapter. Previously the Stripe client and the trial length were
// duplicated per route, which is how checkout said "7-day trial" while the marketing copy said
// "first month free".
//
// The lifecycle itself is @caistech/subscription-billing (idempotent, ordering-safe); the trial
// clock and the cost cap are @caistech/beta-gate. Neither is re-implemented here.

import { createBetaGate, type BetaGate } from '@caistech/beta-gate';
import {
  createSupabaseIdempotencyStore,
  createSupabaseSubscriptionAdapter,
  type SubscriptionAdapter,
} from '@caistech/subscription-billing';

import { createServiceClient } from '@/lib/supabase/server';

import { syncIntroductionForSubscription } from '@/lib/introducer';

import { reportPeriodIfNew } from './arrears';

/**
 * The fair-use window, in days — how long the voice-cost ceiling below is measured over.
 *
 * This is NOT a billing trial. It was one until the billing model was corrected to arrears (see
 * ./arrears.ts): the month is owed from day one and invoiced when the period closes, so nothing is
 * given away and there is no trial to be in. What survives is the cost guard — a ceiling on what a
 * single owner's voice usage may cost us early on, which beta-gate happens to express as a trial
 * clock.
 *
 * Renamed from TRIAL_DAYS on purpose: a constant called TRIAL_DAYS is how the free month got into
 * the checkout in the first place.
 */
export const FAIR_USE_WINDOW_DAYS = 30;

/**
 * Fair-use ceiling on voice spend per window, in USD of underlying voice/LLM cost. WARN, not hard-cut:
 * the product surfaces usage as it approaches the ceiling rather than cutting an owner off
 * mid-sentence. beta-gate still hard-denies at 100% — the warn band is what makes that fair.
 */
export const VOICE_COST_CAP_USD = 20;

/** Fraction of the cap at which the UI starts warning. */
export const USAGE_WARN_AT = 0.8;

/** The beta-gate action name voice spend accrues against. */
export const VOICE_ACTION = 'voice';

/**
 * Estimated blended cost of a minute of conversation (ElevenLabs ConvAI + the agent's LLM), in USD.
 *
 * It is an ESTIMATE, not a metered actual — ElevenLabs bills per-minute on the workspace, not
 * per-conversation, so nothing on the post-call payload carries a real dollar figure. Override with
 * VOICE_COST_PER_MINUTE_USD once a real month of invoices gives a defensible blended rate. It only
 * ever decides when the fair-use meter fills, never what anyone is charged.
 */
export const VOICE_COST_PER_MINUTE_USD = Number(process.env.VOICE_COST_PER_MINUTE_USD ?? 0.1);

// The Stripe client, the mode switch and the key guards live in ./stripe-mode — re-exported here
// so every existing `import { getStripe } from '@/lib/billing'` keeps working and automatically
// becomes mode-aware. There is exactly one place that decides which keys are in play.
export { getStripe, isLiveMode, stripeMode, stripeWebhookSecret } from './stripe-mode';

// The arrears model — what "owed but unbilled until the period closes" means in code.
export {
  cancelSubscriptionWithWaiver,
  METER_EVENT_NAME,
  PRICE_LOOKUP_PREFIX,
  reportPeriodIfNew,
} from './arrears';

/**
 * The trial clock + fair-use cap.
 *
 * `gate(userId, VOICE_ACTION, { costUsd })` checks the trial and the ceiling, records the spend,
 * and returns `pctUsed` / `warn` for the in-app meter.
 */
export function getBetaGate(): BetaGate {
  return createBetaGate({
    supabase: createServiceClient(),
    config: {
      trialDays: FAIR_USE_WINDOW_DAYS,
      warnAt: USAGE_WARN_AT,
      caps: { [VOICE_ACTION]: { costCap: VOICE_COST_CAP_USD } },
    },
  });
}

/**
 * Accrue a finished conversation's estimated cost against the owner's free-month fair-use budget.
 *
 * Called from the post-call path, AFTER the conversation has happened — so it records, it never
 * blocks. That is the "warn, don't hard-cut" decision made concrete: an owner mid-sentence is never
 * cut off; the meter fills and the UI warns. Fail-soft: a metering error must never break the
 * post-call path (which also carries the memory distil).
 */
export async function accrueVoiceCost(userId: string, durationSeconds: number): Promise<void> {
  if (!userId || !durationSeconds || durationSeconds <= 0) return;
  const costUsd = (durationSeconds / 60) * VOICE_COST_PER_MINUTE_USD;
  try {
    // record(), not gate(): the spend already happened, so it is accrued unconditionally rather
    // than being subjected to a permission check it could "fail" after the fact.
    await getBetaGate().record(userId, VOICE_ACTION, { costUsd });
  } catch (error) {
    console.error('[billing] voice cost accrual skipped:', error);
  }
}

/**
 * How subscription state lands on Kira's `users` table.
 *
 * Column defaults already match (`subscription_status`, `stripe_customer_id`,
 * `stripe_subscription_id`, `last_stripe_event_at`, `updated_at`), so this is mostly the two
 * product-specific hooks: deactivating agents on cancellation, and tolerating the checkout →
 * onboarding race.
 */
export function getSubscriptionAdapter(): SubscriptionAdapter {
  const supabase = createServiceClient();

  const adapter = createSupabaseSubscriptionAdapter({
    supabase,
    table: 'users',
    columns: {
      currentPeriodEnd: 'subscription_ends_at',
      trialEndsAt: 'trial_ends_at',
    },

    // Cancelling the subscription must actually take the product away, or a cancelled owner keeps
    // a working voice agent (and keeps costing us ElevenLabs minutes).
    onCancelled: async ({ id }) => {
      // Deactivate all agents owned by the organisation that this subscriber belongs to.
      // id is the user_id of the subscriber.
      const { data: membership } = await supabase
        .from('organisation_memberships')
        .select('organisation_id')
        .eq('person_id', id)
        .eq('status', 'active')
        .maybeSingle();

      if (membership?.organisation_id) {
        const { error } = await supabase
          .from('kira_agents')
          .update({ status: 'inactive' })
          .eq('organisation_id', membership.organisation_id);
        if (error) throw new Error(`deactivate agents: ${error.message}`);
      }
    },

    // EXPECTED, not an error: Stripe frequently delivers checkout.session.completed before the
    // buyer has finished setting a password, so the account doesn't exist yet.
    // /api/onboarding/complete writes the same fields from the same Stripe session. Never create a
    // bare users row here — that produced an orphan with no auth_user_id and no way to log in.
    onSubscriberMissing: async (ref) => {
      console.log(
        `[billing] No account yet for ${ref.email ?? ref.stripeCustomerId} — onboarding will record it.`,
      );
    },
  });

  // Arrears reporting rides on `apply`, after the state write, for two reasons that both matter.
  //
  // It has to happen on EVERY event that could open a period — the first one at subscription
  // creation, each later one when an invoice settles and the next period starts — and `apply` is
  // the one place all of those converge with a normalized state in hand.
  //
  // And it has to be able to fail loudly. A throw here propagates to a 500, the reducer releases
  // its idempotency claim, and Stripe retries — which is precisely what an unreported period needs.
  // Reporting somewhere fire-and-forget would leave a subscription that invoices $0 while every
  // screen reports perfect health.
  return {
    ...adapter,
    apply: async (record, state) => {
      await adapter.apply(record, state);
      const outcome = await reportPeriodIfNew(state);
      if (outcome === 'reported') {
        console.log(`[billing] period owed reported for ${state.stripeSubscriptionId}`, {
          periodEnd: state.currentPeriodEnd,
        });
      }
      // The introducer's board reads from `introductions.status`, and nothing was advancing it —
      // so an advisor watching for their commission saw "Signed up" forever. Fail-soft inside.
      await syncIntroductionForSubscription(record.id, state.status);
    },
  };
}

/** Webhook idempotency, backed by `stripe_webhook_events`. */
export function getIdempotencyStore() {
  return createSupabaseIdempotencyStore({ supabase: createServiceClient() });
}
