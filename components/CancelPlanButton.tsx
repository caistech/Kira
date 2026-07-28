'use client';

// components/CancelPlanButton.tsx
//
// Cancelling, in the app, with the waiver honoured.
//
// Kira bills in arrears and promises that the month you are in is never billed. The Stripe billing
// portal cannot keep that promise — its cancel either runs the period out (so it completes and IS
// invoiced) or ends immediately and invoices the accrued month. So cancellation lives here, on our
// own route, where the waiver is part of the call rather than a policy someone remembers.
//
// The confirm step is not decoration. This is irreversible and it turns Kira off, and the person
// clicking it is usually a 60-something owner mid-sale who cannot afford a surprise either way —
// so the consequence is stated before the click, including the part that is good news.

import { useState } from 'react';

export function CancelPlanButton({ disabled }: { disabled?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/cancel', { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.cancelled) {
        throw new Error(data.error || 'Could not cancel');
      }
      setDone(true);
      setConfirming(false);
    } catch (err) {
      // Never leave this button dead. Someone who tried to cancel and could not tell whether it
      // worked is someone who calls their bank instead.
      setError(err instanceof Error ? err.message : 'Could not cancel');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm text-gray-700">
        Cancelled. The month you were in is on us — nothing further will be charged. Kira stays
        available until the end of today, and everything she has captured remains yours to export.
      </p>
    );
  }

  if (!confirming) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={disabled}
          className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel my plan
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
      <p className="text-sm text-gray-800">
        Cancel your plan? <span className="font-semibold">The month you are in will not be billed</span>{' '}
        — no payment, no part-month charge. Kira stops working, and you keep everything she has
        captured about your business.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={cancel}
          disabled={loading}
          className="min-h-[44px] rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? 'Cancelling…' : 'Yes, cancel my plan'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-400"
        >
          Keep my plan
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
