'use client';

import { useState, useTransition } from 'react';

type InviteResult = {
  ok: boolean;
  message: string;
};

export function OwnerInviteForm({ organisationId }: { organisationId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<InviteResult | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setResult(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/owner/provision', {
          method: 'POST',
          body: JSON.stringify({
            email: data.get('email'),
            firstName: data.get('firstName'),
            lastName: data.get('lastName'),
            organisationId: organisationId
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error);

        setResult({ ok: true, message: `Provisioned ${data.get('email')} as CEO / Owner.` });
        form.reset();
      } catch (err: any) {
        setResult({ ok: false, message: err.message || 'Failed to provision owner.' });
      }
    });
  }

  const field = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">CEO / Owner Email</span>
          <input name="email" type="email" required className={field} />
        </label>
        <div className="hidden" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">First Name</span>
          <input name="firstName" type="text" required className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Last Name</span>
          <input name="lastName" type="text" required className={field} />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
      >
        {pending ? 'Provisioning...' : 'Provision CEO / Owner'}
      </button>

      {result && (
        <p className={`text-sm font-medium ${result.ok ? 'text-green-700' : 'text-red-700'}`}>
          {result.message}
        </p>
      )}
    </form>
  );
}