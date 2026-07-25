'use client';

// The add-an-introducer form. Client-side only so the operator gets the result of the action
// inline — adding a broker sends them a real email, so "did that work?" must be answerable on the
// page rather than by checking a mailbox.

import { useState, useTransition } from 'react';

import { addIntroducer, type ActionResult } from './actions';

export function AddIntroducerForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [payeeType, setPayeeType] = useState('individual');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setResult(null);
    startTransition(async () => {
      const outcome = await addIntroducer(data);
      setResult(outcome);
      if (outcome.ok) form.reset();
    });
  }

  const field =
    'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100';

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input name="email" type="email" required autoComplete="off" className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Name</span>
          <input name="name" type="text" autoComplete="off" className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Firm</span>
          <input name="org_name" type="text" autoComplete="off" className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Firm ABN</span>
          <input name="org_abn" type="text" autoComplete="off" className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">They call themselves</span>
          <select name="role" defaultValue="introducer" className={field}>
            <option value="introducer">Introducer</option>
            <option value="broker">Broker</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Commission paid to</span>
          <select
            name="payee_type"
            value={payeeType}
            onChange={(e) => setPayeeType(e.target.value)}
            className={field}
          >
            <option value="individual">Them personally</option>
            <option value="entity">Their firm</option>
          </select>
        </label>
      </div>

      <p className="text-sm text-gray-500">
        Adding them sends their sign-in link and their referral link straight away.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Adding…' : 'Add and send their links'}
      </button>

      {result && (
        <p className={`text-sm ${result.ok ? 'text-teal-700' : 'text-red-600'}`}>{result.message}</p>
      )}
    </form>
  );
}
