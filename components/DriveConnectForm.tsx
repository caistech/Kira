'use client';

// The access choice, made explicitly.
//
// Three options rather than two. "Only the files you pick" is the least-privilege one and it is not
// only an ethical nicety: full and read-only Drive are RESTRICTED Google scopes, which carry OAuth
// verification and a security assessment before a production app may offer them publicly. The
// narrow option is the one that keeps working for a cautious client either way.
//
// Written for a 60–70 year old owner: every option says what it means in consequences, not in
// permission names, and the recommendation is stated rather than implied by ordering.

import { useActionState } from 'react';
import { connectDrive, type DriveFormState } from '@/app/setup/drive/actions';

const OPTIONS = [
  {
    value: 'readonly',
    title: 'Read everything, change nothing',
    detail:
      'Kira can open and read any file in your Drive. She cannot edit, move or delete anything. Recommended.',
  },
  {
    value: 'picked',
    title: 'Only the files you choose',
    detail:
      'Kira sees nothing until you pick specific files. The safest option, and the slowest — she can only learn from what you hand her.',
  },
  {
    value: 'full',
    title: 'Read and write',
    detail:
      'Everything above, plus Kira can save finished documents back into your Drive — a quote lands as a file, not just an email.',
  },
];

export function DriveConnectForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, formAction, pending] = useActionState<DriveFormState | null, FormData>(connectDrive, null);

  return (
    <form action={formAction} className="rounded-2xl border border-gray-200 bg-white p-6">
      <fieldset>
        <legend className="text-lg font-semibold text-gray-900">How much can Kira see?</legend>
        <div className="mt-4 space-y-3">
          {OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 hover:border-gray-400"
            >
              <input
                type="radio"
                name="access"
                value={option.value}
                defaultChecked={option.value === 'readonly'}
                className="mt-1 h-5 w-5 shrink-0"
              />
              <span>
                <span className="block text-base font-medium text-gray-900">{option.title}</span>
                <span className="mt-0.5 block text-base text-gray-600">{option.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-6 block">
        <span className="text-base font-medium text-gray-900">Which Google account?</span>
        <span className="mt-0.5 block text-base text-gray-600">
          The address whose Drive holds your work. It is often not the one you signed up with.
        </span>
        <input
          name="google_email"
          type="email"
          autoComplete="email"
          defaultValue={defaultEmail}
          className="mt-2 min-h-[48px] w-full rounded-xl border border-gray-300 px-4 py-3 text-base"
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
        className="mt-6 min-h-[52px] w-full rounded-full bg-gray-900 px-6 py-4 text-base font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Opening Google…' : 'Continue to Google'}
      </button>

      <p className="mt-3 text-center text-sm text-gray-500">
        Google will ask you to confirm. Nothing is read until you approve it there.
      </p>
    </form>
  );
}
