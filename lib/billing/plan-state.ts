// lib/billing/plan-state.ts
//
// What an account's plan ACTUALLY is, derived once, so no surface has to guess.
//
// WHY THIS EXISTS. On 2026-07-27 a naive-tester walked a brand-new account and found the Settings
// page asserting four things at once, sixty seconds after signup, with no card ever taken:
//
//   "Your card is on file and the first payment comes out at the end of it"
//   "$0.00 of $20 used"
//   "Your free month has ended"
//   "You've reached the fair-use ceiling"
//
// Three of those were false and two contradicted each other. None of it was a copy problem. The
// page rendered the card-on-file sentence unconditionally while the button beneath it correctly
// said "You don't have a subscription yet" — the same panel disagreeing with itself — and the meter
// inferred "ended" from a zero and "ceiling reached" from a false, when beta-gate had already said
// the reason was `no_trial`.
//
// The tester's verdict is the reason this is worth a module rather than an inline ternary: "I can
// defend a number I have to caveat. I cannot defend a screen that tells my client they're being
// charged when they aren't." The product is sold through advisors who put their name to the
// introduction; a screen that lies to their client costs the channel, not just the account.
//
// The rule: derive the state from what we actually know, name it, and let each surface render that
// name. Never infer a state from the absence of data.

import type { CapCheck, TrialStatus } from '@caistech/beta-gate';

/** The trial clock, as something a screen can render without inferring. */
export type TrialPresentation = 'not_started' | 'active' | 'ended' | 'converted';

export interface PlanState {
  trial: TrialPresentation;
  daysLeft: number;
  /** True only when Stripe actually holds a card for this account. */
  hasCard: boolean;
  /** The honest one-line description of what happens next, money-wise. */
  billingSentence: string;
}

/**
 * Turn what beta-gate and the users row know into a state a screen can render.
 *
 * `trialStatus` may be null when the gate could not be read — that is NOT "not started", and the
 * caller should omit the panel rather than pass a fabricated status (degrade, don't fake).
 */
export function derivePlanState(args: {
  trialStatus: TrialStatus | null;
  hasCard: boolean;
  subscriptionStatus?: string | null;
}): PlanState {
  const { trialStatus, hasCard, subscriptionStatus } = args;

  const trial: TrialPresentation = (() => {
    if (subscriptionStatus === 'active') return 'converted';
    if (!trialStatus || !trialStatus.exists) return 'not_started';
    if (trialStatus.status === 'converted') return 'converted';
    if (trialStatus.active) return 'active';
    if (trialStatus.expired) return 'ended';
    return 'not_started';
  })();

  const daysLeft = trialStatus?.daysLeft ?? 0;

  // Each sentence is true of exactly one state. The card claim in particular is made ONLY when
  // Stripe holds a customer for this account — that is the fact the old copy assumed.
  const billingSentence = (() => {
    if (trial === 'converted') {
      return 'You’re on a paid plan. You can review or cancel it any time from Manage billing.';
    }
    if (trial === 'active') {
      return hasCard
        ? 'Your first month is free. Your card is on file and the first payment comes out at the end of it — we’ll email you three days before, and you can cancel any time before then.'
        : 'Your first month is free. There’s no card on your account yet, so nothing can be charged — you’ll be asked for one before any paid month starts.';
    }
    if (trial === 'ended') {
      return hasCard
        ? 'Your free month has ended and your paid plan has started. Manage or cancel it any time from Manage billing.'
        : 'Your free month has ended. There’s no card on your account, so nothing has been charged.';
    }
    // not_started
    return hasCard
      ? 'Your first month is free and hasn’t started yet. Your card is on file; nothing is charged until the free month ends.'
      : 'Your first month is free and hasn’t started yet. There’s no card on your account, so nothing can be charged.';
  })();

  return { trial, daysLeft, hasCard, billingSentence };
}

/** Narrow beta-gate's deny reason for the meter, which must never guess which cap was hit. */
export function denyReason(usage: CapCheck | null): UsageMeterReason {
  return usage?.reason ?? null;
}

export type UsageMeterReason =
  | 'no_trial'
  | 'trial_expired'
  | 'daily_cap'
  | 'total_cap'
  | 'cost_cap'
  | null;
