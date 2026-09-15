'use client';

// The add-a-distributor form. Client-side only so the operator gets the result of the grant
// inline — granting cross-org access changes the client's trust model, so "did that work?" must be
// answerable on the page.

import { useState, useTransition } from 'react';

import { addDistributor, type ActionResult } from './actions';

type Org = { organisation_id: string; legal_name: string };

export function AddDistributorForm({ organisations }: { organisations: Org[] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const email = String(data.get('email') ?? '').trim();
    const org = organisations.find(
      (o) => o.organisation_id === String(data.get('organisation_id') ?? ''),
    );

    const confirmed = window.confirm(
      org
        ? `Give ${email} visibility over ${org.legal_name}?\n\nThey will be able to see this client organisation's data inside Kira.`
        : 'Grant this distributor access?',
    );
    if (!confirmed) return;

    setResult(null);
    startTransition(async () => {
      const outcome = await addDistributor(data);
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
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input name="email" type="email" required autoComplete="off" className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Client organisation</span>
          <select name="organisation_id" required className={field}>
            <option value="">Choose an organisation…</option>
            {organisations.map((org) => (
              <option key={org.organisation_id} value={org.organisation_id}>
                {org.legal_name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">First name (optional)</span>
          <input name="first_name" type="text" autoComplete="off" className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Last name (optional)</span>
          <input name="last_name" type="text" autoComplete="off" className={field} />
        </label>
      </div>
      <p className="text-sm text-gray-500">
        If this person hasn&apos;t signed in yet, a provisional record is created and their access
        activates on sign-in.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Granting…' : 'Grant access'}
      </button>
      {result && (
        <p
          className={`text-sm ${result.ok ? 'text-green-700' : 'text-red-700'}`}
          role="status"
        >
          {result.message}
        </p>
      )}
    </form>
  );
}