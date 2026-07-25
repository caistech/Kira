'use client';

// components/ManageBillingButton.tsx
// Opens the Stripe billing portal (update card, invoices, cancel) in the current tab.

import { useState } from 'react';

export function ManageBillingButton({ disabled }: { disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Could not open billing');
      }
      window.location.href = data.url;
    } catch (err) {
      // Say what happened rather than leaving a dead button — this is the path someone takes when
      // they want to cancel, and a silent failure there becomes a chargeback.
      setError(err instanceof Error ? err.message : 'Could not open billing');
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={open}
        disabled={disabled || loading}
        className="min-h-[44px] rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Opening…' : 'Manage billing'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
