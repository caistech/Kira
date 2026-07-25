// components/UsageMeter.tsx
//
// The free month, made visible: days left and how much of the fair-use budget is spent.
//
// Presentational only — the caller reads the numbers server-side from @caistech/beta-gate. It
// exists because "warn, don't hard-cut" is a promise the owner can only rely on if they can SEE
// where they stand; an invisible cap is indistinguishable from the product breaking.

export interface UsageMeterProps {
  /** Whole days remaining in the free month. */
  daysLeft: number;
  /** Fair-use budget and what's been used of it, in USD. */
  capUsd: number;
  usedUsd: number;
  /** 0..1 — how full the meter is. */
  pctUsed: number;
  /** True once past the soft-warn band. */
  warn: boolean;
  /** False when the ceiling is reached (or the trial is over). */
  allowed: boolean;
}

function money(amount: number): string {
  return `$${amount.toFixed(amount < 10 ? 2 : 0)}`;
}

export function UsageMeter({ daysLeft, capUsd, usedUsd, pctUsed, warn, allowed }: UsageMeterProps) {
  const pct = Math.round(Math.min(1, Math.max(0, pctUsed)) * 100);
  const barColour = !allowed ? 'bg-red-500' : warn ? 'bg-amber-500' : 'bg-teal-600';

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-base text-gray-900">
          <span className="font-semibold">{money(usedUsd)}</span>
          <span className="text-gray-500"> of {money(capUsd)} used</span>
        </p>
        <p className="text-sm text-gray-500">
          {daysLeft > 0
            ? `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left in your free month`
            : 'Your free month has ended'}
        </p>
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

      <p className="mt-3 text-sm text-gray-600">
        {!allowed ? (
          <>
            You&apos;ve reached the fair-use ceiling for the free month. Your Kira stays here — talk
            to us and we&apos;ll sort it out, or your paid month starts on schedule.
          </>
        ) : warn ? (
          <>
            You&apos;ve used most of your free month&apos;s allowance. Nothing stops working without
            us telling you first.
          </>
        ) : (
          <>
            The free month includes a fair-use allowance for voice. Most owners never come close —
            this is here so you always know where you stand.
          </>
        )}
      </p>
    </div>
  );
}
