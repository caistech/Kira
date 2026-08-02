// components/UsageMeter.tsx
//
// Voice usage, made visible: where the fair-use clock stands and how much of the allowance is
// spent. NOT a billing clock — Kira bills in arrears and has no free month (lib/billing/arrears.ts).
//
// Presentational only — the caller reads the numbers server-side from @caistech/beta-gate. It
// exists because "warn, don't hard-cut" is a promise the owner can only rely on if they can SEE
// where they stand; an invisible cap is indistinguishable from the product breaking.
//
// ⚠️ WHY THIS TAKES `trialState` AND `reason` RATHER THAN JUST `allowed`.
// A naive-tester run on 2026-07-27 found a brand-new account being told, on one card, that its free
// month had ENDED and that it had REACHED THE FAIR-USE CEILING — neither true, and mutually
// contradictory. The cause was here: an account with no trial row comes back from the gate as
// daysLeft 0 / allowed false, and this component rendered "ended" off the zero and the cost-cap
// copy off the false. beta-gate distinguishes 'no_trial' from 'trial_expired' from 'cost_cap'
// perfectly well; we were discarding that and guessing.
//
// The rule this now follows: say only what the state actually supports. "Not started" is a real
// state and it reads nothing like "over".

import type { TrialPresentation } from '@/lib/billing/plan-state';

export interface UsageMeterProps {
  /** Where the trial clock actually is — not inferred from a zero. */
  trialState: TrialPresentation;
  /** Whole days remaining in the fair-use window. Only meaningful when trialState is 'active'. */
  daysLeft: number;
  /** Fair-use budget and what's been used of it, in USD. */
  capUsd: number;
  usedUsd: number;
  /** 0..1 — how full the meter is. */
  pctUsed: number;
  /** True once past the soft-warn band. */
  warn: boolean;
  /** False when the ceiling is reached OR the trial isn't running. `reason` says which. */
  allowed: boolean;
  /** Why the gate said no, straight from beta-gate. Never guessed. */
  reason?: 'no_trial' | 'trial_expired' | 'daily_cap' | 'total_cap' | 'cost_cap' | null;
}

function money(amount: number): string {
  return `$${amount.toFixed(amount < 10 ? 2 : 0)}`;
}

/**
 * The clock line. Each branch is a state the account is genuinely in.
 *
 * This is the FAIR-USE window on voice spend, not a billing clock — Kira bills in arrears and has no
 * free month (lib/billing/arrears.ts). The wording says so, because "days left in your free month"
 * next to a paid plan is the kind of contradiction this component exists to prevent.
 */
function clockLabel(trialState: TrialPresentation, daysLeft: number): string {
  switch (trialState) {
    case 'not_started':
      return 'Your included usage hasn’t started counting yet';
    case 'active':
      return `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left in this usage period`;
    case 'ended':
      return 'This usage period has ended';
    case 'converted':
      return 'You’re on a paid plan';
  }
}

export function UsageMeter({
  trialState,
  daysLeft,
  capUsd,
  usedUsd,
  pctUsed,
  warn,
  allowed,
  reason = null,
}: UsageMeterProps) {
  const pct = Math.round(Math.min(1, Math.max(0, pctUsed)) * 100);

  // The bar is only red for a budget denial. A trial that hasn't started isn't an alarm state —
  // colouring it red was part of what made a new account look broken.
  const capReached = !allowed && (reason === 'cost_cap' || reason === 'daily_cap' || reason === 'total_cap');
  const barColour = capReached ? 'bg-red-500' : warn ? 'bg-amber-500' : 'bg-violet-600';

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {/* "$0.00 of $20 used" on a billing page reads as a bill. It is not one — it is the
            allowance included while he is on trial, and he is charged nothing for it.
            Deliberately NOT given a "+ GST" suffix: the tax qualifier belongs on prices, and
            attaching one here would assert he is being charged, which is the opposite of true.
            What was missing was never the tax line, it was what the number IS. */}
        <p className="text-base text-gray-900">
          <span className="font-semibold">{money(usedUsd)}</span>
          <span className="text-gray-500"> of {money(capUsd)} included usage</span>
        </p>
        <p className="text-base text-gray-500">{clockLabel(trialState, daysLeft)}</p>
      </div>

      <div
        className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Fair-use budget used"
      >
        <div className={`h-full rounded-full transition-all ${barColour}`} style={{ width: `${pct}%` }} />
      </div>

      <p className="mt-3 text-base text-gray-600">
        {capReached ? (
          <>
            You&apos;ve reached the fair-use ceiling on voice for this period. Your Kira stays
            here — talk to us and we&apos;ll sort it out.
          </>
        ) : trialState === 'not_started' ? (
          <>
            Your plan includes a fair-use allowance for voice. Nothing is counting yet — the clock
            starts when you begin.
          </>
        ) : warn ? (
          <>
            You&apos;ve used most of this period&apos;s voice allowance. Nothing stops working
            without us telling you first.
          </>
        ) : (
          <>
            Your plan includes a fair-use allowance for voice. Most owners never come close — this
            is here so you always know where you stand.
          </>
        )}
      </p>
    </div>
  );
}
