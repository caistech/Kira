'use client';

import { useState, useTransition } from 'react';

import { provisionClientOrganisation, type ActionResult } from './actions';
import { OwnerInviteForm } from '@/app/manage/members/OwnerInviteForm';

export function CreateClientOrgForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [provisionedOrgId, setProvisionedOrgId] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setResult(null);
    setProvisionedOrgId(null);
    startTransition(async () => {
      const outcome = await provisionClientOrganisation(data);
      setResult(outcome);
      if (outcome.ok && outcome.organisationId) {
        setProvisionedOrgId(outcome.organisationId);
        form.reset();
      }
    });
  }

  const field =
    'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100';

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Client Business Legal Name</span>
          <input name="legal_name" type="text" required className={field} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {pending ? 'Provisioning...' : 'Provision Client Organisation'}
        </button>
        {result && (
          <p className={`text-sm ${result.ok ? 'text-green-700' : 'text-red-700'}`}>
            {result.message}
          </p>
        )}
      </form>

      {provisionedOrgId && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
          <h3 className="text-base font-semibold text-violet-900">
            Next: provision the client CEO / Owner
          </h3>
          <p className="mt-1 text-sm text-violet-700">
            Create the CEO account so the client can enter their org portal.
          </p>
          <div className="mt-4">
            <OwnerInviteForm organisationId={provisionedOrgId} />
          </div>
        </div>
      )}
    </div>
  );
}