'use client';

// The direct beta-tester invite form. Client-side so the operator immediately sees what they need
// to hand over: the generated credentials. The welcome email may carry them too, but the operator
// must be able to copy them from the page either way — "did they get their login?" is the whole
// point of this surface.

import { useState, useTransition } from 'react';

import { inviteBetaTester, type ActionResult } from './actions';

export function BetaTesterForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const firstName = String(data.get('first_name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();

    const confirmed = window.confirm(
      `Create a Kira account for ${firstName} (${email})?\n\nA welcome email with their login will be sent.`,
    );
    if (!confirmed) return;

    setResult(null);
    startTransition(async () => {
      const outcome = await inviteBetaTester(data);
      setResult(outcome);
      if (outcome.ok) form.reset();
    });
  }

  const field =
    'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100';

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
              First name <span className="text-rose-500">*</span>
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              required
              autoComplete="given-name"
              placeholder="Jane"
              className={field}
            />
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
              Last name
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              autoComplete="family-name"
              placeholder="Smith"
              className={field}
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address <span className="text-rose-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="jane@example.com"
            className={field}
          />
        </div>

        <p className="text-xs text-gray-500">
          A strong password is generated for them, and a welcome email with their sign-in details is
          sent to the address you enter. They can sign in straight away at /login — no beta code, no
          magic link.
        </p>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-base font-semibold text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:opacity-50 sm:w-auto"
        >
          {pending ? 'Creating…' : 'Create beta tester'}
        </button>
      </form>

      {result && !result.ok && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {result.message}
        </div>
      )}

      {result?.ok && result.credentials && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="mb-2 text-sm font-semibold text-emerald-800">{result.message}</p>
          <div className="space-y-2 rounded-lg bg-white p-3 text-sm text-gray-800">
            <p>
              <span className="font-medium text-gray-500">Email:</span>{' '}
              <span className="font-mono text-gray-900">{result.credentials.email}</span>
            </p>
            <p>
              <span className="font-medium text-gray-500">Password:</span>{' '}
              <span className="font-mono text-gray-900">{result.credentials.password}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const text = `Kira login\nEmail: ${result.credentials?.email}\nPassword: ${result.credentials?.password}\nSign in at ${window.location.origin}/login`;
              void navigator.clipboard.writeText(text).catch(() => undefined);
            }}
            className="mt-3 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
          >
            Copy login details
          </button>
        </div>
      )}
    </div>
  );
}