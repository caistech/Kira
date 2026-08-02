'use client';

// The self-serve half of the expired-link page.
//
// Client-side because the outcome replaces the form in place — sending someone to a separate
// "check your inbox" screen loses the context of why they're here, and they'd have to navigate
// back to try a different address.

import { useState } from 'react';

import { requestIntroducerLink } from './actions';

export default function RequestLinkForm() {
  const [sent, setSent] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const result = await requestIntroducerLink(new FormData(event.currentTarget));
      setSent(result.message);
    } catch {
      // The action answers neutrally even on failure, so reaching here means the request itself
      // didn't complete — a dropped connection rather than a rejected address. Say that, instead
      // of the reassuring "it's on its way" that would be a lie.
      setSent(null);
      setPending(false);
      alert('That didn’t go through. Check your connection and try again.');
    }
  }

  if (sent) {
    return (
      <div className="mt-6 rounded-lg border border-violet-200 bg-violet-50 p-4">
        <p className="text-base text-violet-900">{sent}</p>
        <p className="mt-2 text-sm text-violet-800">
          It can take a minute to arrive. Check your spam folder before asking for another.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6">
      <label htmlFor="introducer-email" className="block text-sm font-medium text-gray-900">
        Your email address
      </label>
      <p className="mt-1 text-sm text-gray-500">The address your invitation was sent to.</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="introducer-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@yourfirm.com.au"
          className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] shrink-0 rounded-lg bg-violet-700 px-5 text-base font-semibold text-white hover:bg-violet-800 disabled:opacity-60"
        >
          {pending ? 'Sending…' : 'Send me a link'}
        </button>
      </div>
    </form>
  );
}
