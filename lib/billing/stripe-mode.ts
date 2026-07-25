// lib/billing/stripe-mode.ts
//
// One switch between Stripe test and live, with guards that make the dangerous mistakes impossible
// rather than merely unlikely.
//
//   STRIPE_LIVE_MODE=false  → test keys   (the default, and the default if the var is missing)
//   STRIPE_LIVE_MODE=true   → live keys   (STRIPE_SECRET_KEY_LIVE + STRIPE_WEBHOOK_SECRET_LIVE)
//
// Both key sets live in the environment at once. Nothing is edited to go live; a single flag is
// flipped, and it can be flipped back just as fast if something looks wrong — which is the whole
// point of doing it this way rather than swapping key values in and out under pressure.
//
// THE TWO FAILURES THIS EXISTS TO PREVENT
//
//   1. Believing you are live when you are not. If the flag is on and a live key is missing or
//      malformed, this THROWS. It never quietly falls back to test — that would take fake payments
//      that look real, and you would find out from the bank statement.
//   2. Believing you are testing when you are live. If the flag is off but a live key is in the
//      test slot, this THROWS. That direction charges real cards belonging to real people during
//      what someone thinks is a rehearsal.
//
// Both are silent in every system that doesn't check. Neither is silent here.
//
// Kira uses Stripe-HOSTED checkout, so there is no publishable key baked into the client bundle and
// no build-time half to this switch: flipping the flag and redeploying is enough.

import Stripe from 'stripe';

export type StripeMode = 'live' | 'test';

/**
 * Which mode we are in.
 *
 * Anything other than the exact string "true" is TEST. A typo, an empty string, a missing variable
 * — all of them mean test. The safe state is the one you fall into by accident.
 */
export function stripeMode(): StripeMode {
  return process.env.STRIPE_LIVE_MODE === 'true' ? 'live' : 'test';
}

export function isLiveMode(): boolean {
  return stripeMode() === 'live';
}

/** The secret key for the current mode, or a loud error explaining exactly what is wrong. */
export function stripeSecretKey(): string {
  const mode = stripeMode();

  if (mode === 'live') {
    const key = process.env.STRIPE_SECRET_KEY_LIVE;
    if (!key) {
      throw new Error(
        'STRIPE_LIVE_MODE is true but STRIPE_SECRET_KEY_LIVE is not set. Refusing to fall back to ' +
          'the test key — that would take payments that look real and are not.',
      );
    }
    if (!key.startsWith('sk_live')) {
      throw new Error(
        'STRIPE_LIVE_MODE is true but STRIPE_SECRET_KEY_LIVE is not a live key (expected sk_live…).',
      );
    }
    return key;
  }

  // Test mode. STRIPE_SECRET_KEY is the historical name and stays the test slot, so nothing had to
  // be renamed to adopt this switch.
  const key = process.env.STRIPE_SECRET_KEY_TEST ?? process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set.');
  }
  if (key.startsWith('sk_live')) {
    throw new Error(
      'A LIVE Stripe key is in the test slot while STRIPE_LIVE_MODE is off. Refusing to run: this ' +
        'charges real cards during what looks like a test. Move it to STRIPE_SECRET_KEY_LIVE.',
    );
  }
  return key;
}

/**
 * The webhook signing secret for the current mode.
 *
 * Test and live endpoints have DIFFERENT signing secrets, and both start `whsec_` — so nothing in
 * the string itself reveals a mismatch. Flipping the key without flipping this is the classic way
 * to go live and have every webhook fail signature verification, silently, while checkout appears
 * to work perfectly.
 */
export function stripeWebhookSecret(): string {
  const mode = stripeMode();

  if (mode === 'live') {
    const secret = process.env.STRIPE_WEBHOOK_SECRET_LIVE;
    if (!secret) {
      throw new Error(
        'STRIPE_LIVE_MODE is true but STRIPE_WEBHOOK_SECRET_LIVE is not set. Register a LIVE ' +
          'webhook endpoint in Stripe and set its signing secret — the test secret cannot verify ' +
          'live events.',
      );
    }
    return secret;
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET_TEST ?? process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set.');
  return secret;
}

// Built lazily and cached per mode. Constructing at module load throws during `next build`
// page-data collection, when no keys are present (CI).
let cached: { mode: StripeMode; client: Stripe } | null = null;

/** The Stripe client for the current mode. */
export function getStripe(): Stripe {
  const mode = stripeMode();
  if (cached && cached.mode === mode) return cached.client;

  const client = new Stripe(stripeSecretKey(), {});
  cached = { mode, client };

  // Log the mode once per process. When something is wrong with billing, "which mode was it in?"
  // is the first question, and it should be answerable from the logs rather than by inspection.
  console.log(`[billing] Stripe client constructed in ${mode.toUpperCase()} mode`);
  return client;
}
