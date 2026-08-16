'use client';

// What Kira may see in his Microsoft account — asked once, in his words, before anything is connected.
//
// ⚠️ THIS IS A CONSENT SURFACE, NOT A SETTINGS FORM. Whatever is written here is what the owner
// agreed to; the scopes are what he actually granted. When those two disagree the second one wins and
// he has been misled — so every claim below has to be true of the request the orchestrator will build
// (`scopesFor()` in orchestrator/src/connectors/microsoft.ts, asserted by its consent-copy suite).
//
// WHY THIS IS A SEPARATE FORM FROM DriveConnectForm RATHER THAN A SHARED ONE WITH A MAPPING.
//
// The two vendors do not offer the same things, and the differences land exactly where the owner is
// reading:
//
//   * There is NO per-file tier. Google's `drive.file` supports an honest "and only those" because
//     Google enforces it. Microsoft's narrowest delegated grant is his whole OneDrive. A shared
//     vocabulary would have to either drop that option (misdescribing Google) or keep it
//     (misdescribing Microsoft), and the second is the `/setup/drive` defect repeating — a label
//     promising per-file access over a grant covering everything.
//   * There is NO mail section at all. Gmail has `gmail.compose`, which drafts without reading.
//     Graph has no draft-only permission — `Mail.ReadWrite` reads the entire mailbox — so a
//     "just drafts" option here would be a lie the vendor would expose on the very next screen.
//     No mail scope is requested, and the form says so rather than staying silent.
//   * `all` has no Google equivalent, and it is wider than it sounds: inside a tenant with SharePoint
//     it reaches the company's document libraries, not just his own files.
//
// Three options and some prose is cheaper than an abstraction that lies.

import { useActionState } from 'react';

import { connectOneDrive, type OneDriveFormState } from '@/app/setup/onedrive/actions';

interface Option {
  value: string;
  title: string;
  /** What she can now do. */
  gain: string;
  /** What that means she can see, or can no longer do. Never omitted. */
  cost: string;
}

const FILES: Option[] = [
  {
    value: 'readonly',
    title: 'Read everything, change nothing',
    gain: 'Ask for a file by name and she finds it, reads it, and writes in the format your own documents already use.',
    cost: 'She can read every file in that OneDrive. She cannot change anything — which also means she cannot save a finished document back into it.',
  },
  {
    value: 'readwrite',
    title: 'Read, and file things back',
    gain: 'Everything above, plus a finished document — a quote, a handover pack — lands in your OneDrive as a file rather than only in an email. Recommended.',
    cost: 'She can edit and delete files in that OneDrive. She still cannot reach anything outside it.',
  },
  {
    value: 'all',
    title: 'Everything you can reach, including shared files',
    gain: 'Adds files colleagues have shared with you, and your company SharePoint if you have one.',
    cost: 'This is wider than it sounds — it covers your company’s documents, not only yours. Most owners do not need it.',
  },
];

function Choice({
  legend,
  hint,
  name,
  options,
  defaultValue,
}: {
  legend: string;
  hint: string;
  name: string;
  options: Option[];
  defaultValue: string;
}) {
  return (
    <fieldset className="mt-6 first:mt-0">
      <legend className="text-lg font-semibold text-gray-900">{legend}</legend>
      <p className="mt-1 text-base text-gray-600">{hint}</p>
      <div className="mt-3 space-y-3">
        {options.map((option) => (
          // The whole row is the target, not the radio. A 16px tap for a man in his sixties making a
          // decision about privacy is the wrong place to save space.
          <label
            key={option.value}
            className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 hover:border-gray-400"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={option.value === defaultValue}
              className="mt-1 h-5 w-5 shrink-0"
            />
            <span>
              <span className="block text-base font-medium text-gray-900">{option.title}</span>
              <span className="mt-0.5 block text-base text-gray-600">{option.gain}</span>
              <span className="mt-1 block text-base text-gray-500">{option.cost}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function OneDriveConnectForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, formAction, pending] = useActionState<OneDriveFormState | null, FormData>(
    connectOneDrive,
    null,
  );

  return (
    <form action={formAction} className="rounded-2xl border border-gray-200 bg-white p-6">
      <Choice
        legend="How much of your OneDrive can Kira see?"
        hint="You choose this, and Microsoft enforces it — not us. You can change it later by reconnecting."
        name="access"
        options={FILES}
        defaultValue="readwrite"
      />

      {/*
        STATED BECAUSE HE WILL ASSUME OTHERWISE. It is the same Microsoft login as his Outlook, so a
        connection that says nothing about email reads as one that quietly includes it. No mail scope
        is requested at any level, which is a limit Microsoft enforces rather than a promise about our
        conduct — and it is worth him knowing it is deliberate rather than missing.
      */}
      <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <h3 className="text-base font-semibold text-gray-900">Your email is not part of this</h3>
        <p className="mt-1 text-base text-gray-700">
          This is the same Microsoft account you use for Outlook, so it is worth saying plainly: Kira
          asks for <strong>no access to your mailbox at all</strong>. She cannot read it, and she
          cannot send from it. Microsoft will not ask you for it on the next screen.
        </p>
      </section>

      <label className="mt-6 block">
        <span className="text-base font-medium text-gray-900">Which Microsoft account?</span>
        <span className="mt-0.5 block text-base text-gray-600">
          The address whose OneDrive holds your work. If you have a work account and a personal one,
          this is almost always the work one.
        </span>
        <input
          name="microsoft_email"
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
        {pending ? 'Opening Microsoft…' : 'Continue to Microsoft'}
      </button>

      <p className="mt-3 text-center text-base text-gray-500 sm:text-sm">
        Microsoft will ask you to confirm. If your business has an IT administrator, they may need to
        approve it — if that happens Microsoft will tell you on that screen, and nothing is lost.
      </p>
    </form>
  );
}
