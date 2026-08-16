'use client';

// "Somewhere else" — the third answer, which has to be a real one.
//
// An owner who cannot honestly pick either option and finds no third is being told his situation is
// not anticipated, at the exact moment he is deciding whether this product is for people like him.
// So this asks him where, in one box, and says something true back: it is noted, and nothing is
// connected.
//
// ⚠️ IT MUST NOT PROMISE A BUILD. What he writes becomes a captured ask — evidence, not a commitment
// — and `docs/CONNECTOR_POLICY.md` is explicit that demand is what earns a connector. "We'll add it"
// to an owner who mentioned Dropbox once is a promise made by nobody to somebody who will remember.

import { useActionState } from 'react';

import { recordOtherProvider, type OtherProviderState } from '@/app/setup/documents/actions';

export function OtherProviderForm() {
  const [state, formAction, pending] = useActionState<OtherProviderState | null, FormData>(
    recordOtherProvider,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h3 className="text-base font-semibold text-gray-900">Noted — thank you</h3>
        <p className="mt-1 text-base text-gray-700">
          Nothing has been connected. Kira works without it: you can tell her things directly and she
          will remember them, and she can still write documents for you — she just cannot go and read
          your existing ones yet.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-2xl border border-gray-200 bg-white p-6">
      <label className="block">
        <span className="text-base font-medium text-gray-900">Where do your documents live?</span>
        <span className="mt-0.5 block text-base text-gray-600">
          Dropbox, a server in the office, a folder on your computer, a filing cabinet — whatever is
          true. It tells us what to build next, and there is no wrong answer.
        </span>
        <textarea
          name="where"
          rows={3}
          maxLength={500}
          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-base"
          placeholder="Mostly Dropbox, and some of it is only on my laptop."
        />
      </label>

      {state?.error ? (
        <p className="mt-4 text-base font-medium text-rose-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 min-h-[52px] w-full rounded-full border border-gray-900 px-6 py-4 text-base font-semibold text-gray-900 disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Tell us, and skip this for now'}
      </button>
    </form>
  );
}
