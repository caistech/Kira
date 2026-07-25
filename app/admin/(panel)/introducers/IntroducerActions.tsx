'use client';

// Per-row operator controls: re-send a sign-in link, suspend or restore access.
//
// Suspending is stated plainly before the click (PRODUCT_STANDARDS §9 consequence clarity) — it
// cuts their access off immediately, and the operator should know that's what the button does
// rather than discover it from a confused broker.

import { useState, useTransition } from 'react';

import { resendInvite, setIntroducerStatus, type ActionResult } from './actions';

export function IntroducerActions({
  introducerId,
  suspended,
}: {
  introducerId: string;
  suspended: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function run(action: (data: FormData) => Promise<ActionResult>, data: FormData) {
    setResult(null);
    startTransition(async () => setResult(await action(data)));
  }

  function onResend() {
    const data = new FormData();
    data.set('introducer_id', introducerId);
    run(resendInvite, data);
  }

  function onToggleStatus() {
    if (!suspended && !confirm('Suspend access? Their sign-in links stop working immediately. Introductions they already made stay theirs.')) {
      return;
    }
    const data = new FormData();
    data.set('introducer_id', introducerId);
    data.set('suspend', String(!suspended));
    run(setIntroducerStatus, data);
  }

  const button =
    'min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onResend}
        disabled={pending || suspended}
        className={`${button} border-gray-300 text-gray-700 hover:bg-gray-50`}
      >
        Re-send link
      </button>
      <button
        type="button"
        onClick={onToggleStatus}
        disabled={pending}
        className={
          suspended
            ? `${button} border-teal-300 text-teal-700 hover:bg-teal-50`
            : `${button} border-red-300 text-red-700 hover:bg-red-50`
        }
      >
        {suspended ? 'Restore access' : 'Suspend'}
      </button>
      {result && (
        <span className={`text-sm ${result.ok ? 'text-teal-700' : 'text-red-600'}`}>
          {result.message}
        </span>
      )}
    </div>
  );
}
