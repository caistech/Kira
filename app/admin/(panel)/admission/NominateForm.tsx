'use client';

import { useState, useTransition } from 'react';
import { nominateAdmission, type ActionResult } from './actions';
import { AREA_KEYS } from '@/lib/genome/areas';

export function NominateForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setResult(null);
    startTransition(async () => {
      const outcome = await nominateAdmission({
        areaKey: String(data.get('areaKey') || ''),
        itemKey: String(data.get('itemKey') || ''),
        buyerItem: String(data.get('buyerItem') || ''),
        ownerPrompt: String(data.get('ownerPrompt') || ''),
        factor: String(data.get('factor') || ''),
        reason: String(data.get('reason') || ''),
      });
      setResult(outcome);
      if (outcome.ok) form.reset();
    });
  }

  const field =
    'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100';

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Census Area</span>
          <select name="areaKey" required className={field}>
            <option value="">Select an area...</option>
            {AREA_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Item Key (kebab-case)</span>
          <input
            name="itemKey"
            type="text"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            maxLength={100}
            autoComplete="off"
            className={field}
            placeholder="demand-lead-response-time"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-gray-700">Buyer Question (Third Person)</span>
          <input
            name="buyerItem"
            type="text"
            required
            autoComplete="off"
            className={field}
            placeholder="How quickly does the business respond to new enquiries?"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-gray-700">Owner Prompt (Second Person)</span>
          <input
            name="ownerPrompt"
            type="text"
            required
            autoComplete="off"
            className={field}
            placeholder="How quickly do you get back to new enquiries?"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Valuation Factor (Optional)</span>
          <select name="factor" className={field}>
            <option value="">None (Document only)</option>
            <option value="ownerDependence">ownerDependence</option>
            <option value="systems">systems</option>
            <option value="recurringRevenue">recurringRevenue</option>
            <option value="clientConcentration">clientConcentration</option>
            <option value="growth">growth</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Journaled Reason (Required)</span>
          <input
            name="reason"
            type="text"
            required
            autoComplete="off"
            className={field}
            placeholder="Broker flagged this after seeing three enquiries go unanswered..."
          />
        </label>
      </div>

      <p className="text-sm text-gray-500">
        This puts the item on the watchlist. It must then be explicitly admitted by the operator.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Nominating…' : 'Nominate to Watchlist'}
      </button>

      {result && (
        <p className={`text-sm ${result.ok ? 'text-violet-700' : 'text-red-600'}`}>
          {result.message}
        </p>
      )}
    </form>
  );
}
