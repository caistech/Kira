'use client';

// What Kira may see in his Google account — asked once, in his words, before anything is connected.
//
// ⚠️ THIS IS A CONSENT SURFACE, NOT A SETTINGS FORM. Whatever is written here is what the owner
// agreed to; the scopes are what he actually granted. When those two disagree, the second one wins
// and he has been misled — so every claim below has to be true of the request the orchestrator will
// build from these values (`scopesFor()` in orchestrator/src/connectors/google.ts).
//
// WHAT WAS WRONG BEFORE (2026-08-15, fixed here):
//
//   1. CONTACTS WERE NEVER MENTIONED. `scopesFor()` spreads CONTACTS_SCOPES in UNCONDITIONALLY —
//      including `contacts.other.readonly`, which is every address Google auto-saved from mail he
//      has sent. The page said "Let Kira read your Drive", he pressed Continue, and Google asked
//      for his contact book. There is no interstitial on the far side (the connect route verifies
//      the ticket and redirects straight to Google), so this page was his ONLY description of what
//      he was granting. For an owner thinking about selling who has told nobody, his address book
//      is the most sensitive list in the account, and finding out afterwards reads as concealment
//      even though he ticked it.
//   2. GMAIL COULD NOT BE CHOSEN. The level existed as a type, a signed claim field and an unmounted
//      component; no form asked, so every ticket ever minted carried `gmail: 'none'`.
//   3. READ-ONLY WAS RECOMMENDED WITH ONLY ITS UPSIDE STATED. "She cannot edit, move or delete
//      anything" was written as pure reassurance. The same fact means she can never file a finished
//      handover pack back into his Drive, and that cost was nowhere on the screen.
//
// The `gain` + `cost` shape is lifted from the (now deleted) ConnectChoices component, which was
// written correctly and rendered by nothing. Consequence clarity per PRODUCT_STANDARDS §9: every
// option says what it lets her do AND what it means she can see. The second half is the one usually
// left out and the one he is entitled to.

import { useActionState } from 'react';

import { connectDrive, type DriveFormState } from '@/app/setup/drive/actions';

interface Option {
  value: string;
  title: string;
  /** What she can now do. */
  gain: string;
  /** What that means she can see, or can no longer do. Never omitted. */
  cost: string;
}

const DRIVE: Option[] = [
  {
    value: 'picked',
    title: 'Only the files you hand her',
    gain: 'She can write documents for you — a quote, a summary, a handover pack — and save them into your Drive.',
    cost: 'She cannot open anything already in your Drive unless you pick it, so she cannot learn from the quotes you have already written.',
  },
  {
    value: 'readonly',
    title: 'Read everything, change nothing',
    gain: 'Ask for a file by name and she finds it, reads it, and writes in the format your own documents already use. Recommended.',
    cost: 'She can read every file in that Google account. She cannot change anything — which also means she cannot save a finished document back into your Drive.',
  },
  {
    value: 'full',
    title: 'Read, and file things back',
    gain: 'Everything above, plus a finished document lands in your Drive as a file rather than only in an email.',
    cost: 'She can edit and delete files in that account. Most owners do not need this.',
  },
];

const GMAIL: Option[] = [
  {
    value: 'none',
    title: 'Not at all',
    gain: 'Nothing changes. She works from what you tell her and what is in your files.',
    cost: 'She cannot answer “did they ever reply?”, and cannot prepare an email for you to send.',
  },
  {
    value: 'draft',
    title: 'Write drafts for me',
    gain: 'She writes the message and leaves it in your drafts. You read it and send it yourself, from your own address.',
    cost: 'Google shows this as permission to send. She never sends — nothing leaves your address without you pressing send.',
  },
  {
    value: 'read',
    title: 'Drafts, and read my mail',
    gain: '“Did Roger ever come back to me?” becomes a question she can actually answer.',
    cost: 'She can read your mailbox. She still cannot send from your address, or delete anything.',
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
          // The whole row is the target, not the radio. A 16px tap for a man in his sixties making
          // a decision about privacy is the wrong place to save space.
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

export function DriveConnectForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, formAction, pending] = useActionState<DriveFormState | null, FormData>(
    connectDrive,
    null,
  );

  return (
    <form action={formAction} className="rounded-2xl border border-gray-200 bg-white p-6">
      <Choice
        legend="How much of your Drive can Kira see?"
        hint="You choose this, and Google enforces it — not us. You can change it later by reconnecting."
        name="access"
        options={DRIVE}
        defaultValue="readonly"
      />

      {/*
        Defaulted to 'none', deliberately, and not to the more useful 'draft'. A mailbox is not a
        setting to be pre-ticked: an owner who clicks straight through must grant the least, and
        google-connect.ts makes the same argument on the other side of the seam — omitted means
        'none', never "some", because nobody should meet a consent screen asking for his mail
        because of a default he did not read.
      */}
      <Choice
        legend="Can Kira use your email?"
        hint="Separate from your files, and you can leave it switched off entirely."
        name="gmail"
        options={GMAIL}
        defaultValue="none"
      />

      {/*
        NOT A CHOICE, WHICH IS EXACTLY WHY IT IS STATED. The contacts scopes are unconditional in
        `scopesFor()`, so this sentence is true of every combination above and cannot drift out of
        step with a selection.
      */}
      <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h3 className="text-base font-semibold text-gray-900">Your contacts, whatever you choose</h3>
        <p className="mt-1 text-base text-gray-700">
          Every connection includes your contacts, and Google will ask for them on the next screen.
          That means your saved contacts <em>and</em> the addresses Google kept from people you have
          emailed before — which is how Kira can find who to send something to without you looking it
          up. She can read them. She cannot add, change or delete a contact.
        </p>
      </section>

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

      <p className="mt-3 text-center text-base text-gray-500 sm:text-sm">
        Google will ask you to confirm, and you can untick anything on that screen — Kira works with
        whatever you allow. Nothing is read until you approve it there.
      </p>
    </form>
  );
}
