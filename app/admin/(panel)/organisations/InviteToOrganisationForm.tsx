'use client';

// Invite someone into an existing organisation — the step that was missing between "create the
// distributor org" and the partner actually having a working sign-up link. Mirrors
// CreateOrganisationForm's pattern (client-side so the result, including whether the email
// actually sent, shows inline).

import { useState, useTransition } from 'react';

import { inviteToOrganisationAction, type ActionResult } from './actions';

type Org = { organisation_id: string; legal_name: string; org_type: string | null };

const ORG_TYPE_LABEL: Record<string, string> = {
  portfolio: 'portfolio',
  project: 'project',
  distributor: 'distributor',
  client_org: 'client org',
};

export function InviteToOrganisationForm({ organisations }: { organisations: Org[] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setResult(null);
    startTransition(async () => {
      const outcome = await inviteToOrganisationAction(data);
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
          <span className="text-sm font-medium text-gray-700">Organisation</span>
          <select name="organisation_id" required defaultValue="" className={field}>
            <option value="" disabled>
              Choose an organisation…
            </option>
            {organisations.map((org) => (
              <option key={org.organisation_id} value={org.organisation_id}>
                {org.legal_name}
                {org.org_type ? ` (${ORG_TYPE_LABEL[org.org_type] ?? org.org_type})` : ''}
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
        A portfolio, project, or distributor organisation sends the partner-welcome email; a client
        org sends the beta-tester email. They land as the organisation&apos;s owner.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Sending…' : 'Send invitation'}
      </button>
      {result && (
        <p className={`text-sm ${result.ok ? 'text-green-700' : 'text-red-700'}`} role="status">
          {result.message}
        </p>
      )}
    </form>
  );
}
