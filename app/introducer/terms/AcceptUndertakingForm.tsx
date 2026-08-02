'use client';

// The checkbox. Deliberately unticked by default and required — a pre-ticked box is not consent,
// and the first clause (they already hold a listing agreement) is the one the whole channel's
// consent position rests on.

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { AbnLookupField } from '@/components/AbnLookupField';

import { accept, type AcceptResult } from './actions';

export function AcceptUndertakingForm({ defaultOrgName = '' }: { defaultOrgName?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AcceptResult | null>(null);
  const [checked, setChecked] = useState(false);
  const [payeeType, setPayeeType] = useState<'individual' | 'entity'>('entity');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setResult(null);
    startTransition(async () => {
      const outcome = await accept(data);
      setResult(outcome);
      if (outcome.ok) router.push('/introducer');
    });
  }

  return (
    <form onSubmit={onSubmit}>
      {/* Who we pay. Asked here rather than at enquiry because this is the one moment an introducer
          is both present and motivated — their link does not go live until they are through this
          screen — and a commission arrangement with no payee on file is a conversation nobody wants
          to have months later when the first payment is due. */}
      <fieldset className="mb-6 border-b border-gray-200 pb-6">
        <legend className="text-base font-semibold text-gray-900">Who we pay</legend>
        <p className="mt-1 text-sm text-gray-600">
          Commission is paid monthly. Tell us whether it goes to you or to your firm.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-4">
          {(
            [
              { value: 'entity', label: 'My firm' },
              { value: 'individual', label: 'Me personally' },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-3 rounded-lg border border-gray-300 px-4 py-2.5 has-[:checked]:border-violet-600 has-[:checked]:bg-violet-50"
            >
              <input
                type="radio"
                name="payee_type"
                value={option.value}
                checked={payeeType === option.value}
                onChange={() => setPayeeType(option.value)}
                className="h-4 w-4 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-base text-gray-900">{option.label}</span>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <AbnLookupField
            label={payeeType === 'entity' ? 'Your firm' : 'Your firm (optional)'}
            nameField="org_name"
            abnField="org_abn"
            defaultValue={defaultOrgName}
            required={payeeType === 'entity'}
            hint="Start typing and pick it from the business register — that way the ABN is right."
            inputClassName="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-base outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
          />
        </div>
      </fieldset>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="confirmed"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
        />
        <span className="text-base text-gray-900">
          I&apos;ve read the above and I agree. In particular, I&apos;ll only send my link to owners
          I already hold a current listing or engagement agreement with.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending || !checked}
        className="mt-5 min-h-[44px] w-full rounded-lg bg-violet-600 px-4 py-3 text-base font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {pending ? 'Saving…' : 'Agree and continue'}
      </button>

      {result && !result.ok && <p className="mt-3 text-sm text-red-600">{result.message}</p>}
    </form>
  );
}
