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
import Stripe from 'stripe';

import { createServiceClient } from '@/lib/supabase/server';

/**
 * First month free. The card is captured at signup (card-on-file), the first charge lands on
 * day 30. Locked 2026-07-25 with the broker channel — do not change without changing the landing
 * copy, the checkout, and the reminder email together.
 */
export const TRIAL_DAYS = 30;

/**
 * Fair-use ceiling on the free month, in USD of underlying voice/LLM spend. WARN, not hard-cut:
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
 * ever decides when the free month's fair-use meter fills, never what anyone is charged.
 */
export const VOICE_COST_PER_MINUTE_USD = Number(process.env.VOICE_COST_PER_MINUTE_USD ?? 0.1);

// Lazily construct Stripe at request time. Constructing at module load throws ("Neither apiKey nor
// config.authenticator provided") during `next build` page-data collection, when STRIPE_SECRET_KEY
// isn't in the build env (CI).
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});
  return _stripe;
}

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
      trialDays: TRIAL_DAYS,
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

  return createSupabaseSubscriptionAdapter({
    supabase,
    table: 'users',
    columns: {
      currentPeriodEnd: 'subscription_ends_at',
      trialEndsAt: 'trial_ends_at',
    },

    // Cancelling the subscription must actually take the product away, or a cancelled owner keeps
    // a working voice agent (and keeps costing us ElevenLabs minutes).
    onCancelled: async ({ id }) => {
      const { error } = await supabase
        .from('kira_agents')
        .update({ status: 'inactive' })
        .eq('user_id', id);
      if (error) throw new Error(`deactivate agents: ${error.message}`);
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
}

/** Webhook idempotency, backed by `stripe_webhook_events`. */
export function getIdempotencyStore() {
  return createSupabaseIdempotencyStore({ supabase: createServiceClient() });
}
