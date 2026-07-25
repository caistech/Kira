'use client';

// The checkbox. Deliberately unticked by default and required — a pre-ticked box is not consent,
// and the first clause (they already hold a listing agreement) is the one the whole channel's
// consent position rests on.

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { accept, type AcceptResult } from './actions';

export function AcceptUndertakingForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AcceptResult | null>(null);
  const [checked, setChecked] = useState(false);

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
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="confirmed"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
        />
        <span className="text-base text-gray-900">
          I&apos;ve read the above and I agree. In particular, I&apos;ll only send my link to owners
          I already hold a current listing or engagement agreement with.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending || !checked}
        className="mt-5 min-h-[44px] w-full rounded-lg bg-teal-600 px-4 py-3 text-base font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {pending ? 'Saving…' : 'Agree and continue'}
      </button>

      {result && !result.ok && <p className="mt-3 text-sm text-red-600">{result.message}</p>}
    </form>
  );
}
