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
//
// REWRITTEN 2026-07-28 for arrears. Every sentence below used to describe a free first month, which
// stopped being true the moment Kira's billing became "owed from day one, invoiced when the period
// closes" (lib/billing/arrears.ts). Leaving them would have reproduced the exact failure this module
// was written to fix — a Settings page confidently telling an advisor's client something about their
// money that is not so. The billing sentence is now derived from the SUBSCRIPTION, not from the
// fair-use clock, which is a cost guard and was never a statement about billing.

import type { CapCheck, TrialStatus } from '@caistech/beta-gate';

/**
 * The fair-use clock, as something a screen can render without inferring.
 *
 * Named for its history, not its meaning: beta-gate expresses the voice-cost window as a trial, and
 * these are its states. It says nothing about whether anyone is being billed.
 */
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

  // Each sentence is true of exactly one state, and it is derived from the SUBSCRIPTION — the only
  // thing that actually decides whether money moves. The card claim in particular is made ONLY when
  // Stripe holds a customer for this account; that is the fact the old copy assumed.
  const billingSentence = (() => {
    if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
      return 'You’re on a paid plan. Each month is billed when it finishes, for the month just gone — and if you cancel, the month you’re in is never billed.';
    }
    if (subscriptionStatus === 'past_due') {
      return 'A payment didn’t go through. Update your card and we’ll try it again — nothing is lost in the meantime.';
    }
    if (subscriptionStatus === 'cancelled') {
      return 'Your plan is cancelled and the month you were in was written off, as promised. Nothing further will be charged.';
    }
    return hasCard
      ? 'Your card is on file and nothing has been charged. Billing starts when your plan does.'
      : 'There’s no card on your account, so nothing can be charged.';
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
