'use client';

// The create-organisation form for the corporate operator console. Client-side
// so the operator gets the result inline, mirroring the AddDistributorForm
// pattern on the distributors surface.

import { useState, useTransition } from 'react';

import { createOrganisationAction, type ActionResult } from './actions';

export function CreateOrganisationForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setResult(null);
    startTransition(async () => {
      const outcome = await createOrganisationAction(data);
      setResult(outcome);
      if (outcome.ok) form.reset();
    });
  }

  const field =
    'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100';

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-gray-700">Business Legal Name</span>
        <input name="legal_name" type="text" required className={field} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
      >
        {pending ? 'Creating...' : 'Create Organisation'}
      </button>
      {result && (
        <p className={`text-sm ${result.ok ? 'text-green-700' : 'text-red-700'}`}>
          {result.message}
        </p>
      )}
    </form>
  );
}