'use client';

// What may she see? Asked once, in his words, before he connects anything.
//
// WHY THIS EXISTS. The scopes are chosen per tenant and enforced by the grant — a connection on
// 'draft' holds a token that physically cannot read his mail, whatever any module or prompt later
// does. That partition is only worth having if the OWNER makes the choice, and until now nothing
// asked him: every connection took the developer's default.
//
// ⚠️ IT IS A PROMPT, NOT A DOOR, AND THAT IS DELIBERATE. Twice this product has held an owner at a
// setup screen he could not pass — the thirteen-hop /setup loop, and the `canSend` gate that trapped
// every owner outside Australia (Shah, 2026-08-06). Both were the same mistake: a requirement that
// was right, enforced by a redirect. The resolution recorded then was "same requirement, same check,
// different consequence — he reads it and carries on", and this follows it.
//
// The thing that stops it being silently forgotten is NOT this card. It is that Kira opens on it in
// conversation when the connection is absent — a question she asks rather than a screen he is held
// at. See docs/CONNECT_SETUP.md.
//
// CONSEQUENCE CLARITY (PRODUCT_STANDARDS §9): every option says what it lets her do AND what it
// means she can see. An owner deciding what an AI may read in his business is entitled to both
// halves, and the second half is the one usually left out.

import { useState } from 'react';

export type DriveChoice = 'picked' | 'readonly' | 'full';
export type GmailChoice = 'none' | 'draft' | 'read';

interface Option<T> {
  value: T;
  label: string;
  /** What she can now do. */
  gain: string;
  /** What that means she can see. Never omitted — this is the half owners are not usually told. */
  cost: string;
}

const DRIVE: Option<DriveChoice>[] = [
  {
    value: 'picked',
    label: 'Only what she creates',
    gain: 'She can write documents for you — a handover pack, a quote, a summary.',
    cost: 'She cannot open anything already in your Drive, so she cannot find a file you ask for.',
  },
  {
    value: 'readonly',
    label: 'Find and read your files',
    gain: 'Ask for a file by name and she finds it, reads it, and can quote from it.',
    cost: 'She can read every file in that Google account. She cannot change or delete any of it.',
  },
  {
    value: 'full',
    label: 'Read, and file things back',
    gain: 'Everything above, plus she can update documents in place rather than making new ones.',
    cost: 'She can edit and delete files in that account. Most owners do not need this.',
  },
];

const GMAIL: Option<GmailChoice>[] = [
  {
    value: 'none',
    label: 'Not at all',
    gain: 'Nothing changes. She works from what you tell her and what is in your files.',
    cost: 'She cannot answer "did they ever reply?", and cannot prepare an email for you to send.',
  },
  {
    value: 'draft',
    label: 'Write drafts for me',
    gain: 'She prepares the email and leaves it in your drafts. You read it and send it yourself.',
    cost: 'The draft sits in your mailbox until you send it. She never sends anything from your address.',
  },
  {
    value: 'read',
    label: 'Drafts, and read my mail',
    gain: '"Did Roger ever come back to me?" becomes a question she can actually answer.',
    cost: 'She can read your email. She still cannot send from your address, or delete anything.',
  },
];

function Choice<T extends string>({
  legend,
  options,
  value,
  onChange,
  name,
}: {
  legend: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <fieldset className="mt-6">
      <legend className="text-base font-semibold text-stone-900">{legend}</legend>
      <div className="mt-3 space-y-3">
        {options.map((o) => (
          // The whole row is the target — 44px minimum, and a radio on its own is a 16px tap for a
          // reader in his sixties making a decision about privacy.
          <label
            key={o.value}
            className={`flex min-h-[44px] cursor-pointer gap-3 rounded-2xl border p-4 ${
              value === o.value ? 'border-kira-600 bg-kira-50' : 'border-kira-line bg-white'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="mt-1 h-5 w-5 shrink-0"
            />
            <span>
              <span className="block text-base font-medium text-stone-900">{o.label}</span>
              <span className="mt-1 block text-base text-stone-600 sm:text-sm">{o.gain}</span>
              <span className="mt-1 block text-base text-stone-500 sm:text-sm">{o.cost}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ConnectChoices({ action }: { action: string }) {
  // Defaults are the NARROWEST that still does something useful. An owner who clicks straight
  // through grants the least, rather than the most — the opposite of the usual arrangement.
  const [drive, setDrive] = useState<DriveChoice>('readonly');
  const [gmail, setGmail] = useState<GmailChoice>('draft');

  return (
    <form method="POST" action={action}>
      <h2 className="text-xl font-semibold text-stone-900">What should Kira be able to see?</h2>
      <p className="mt-2 max-w-prose text-base text-stone-600">
        You choose this, and Google enforces it — not us. Whatever you pick here is the most she can
        ever do with your account, and you can change it later by reconnecting.
      </p>

      <Choice legend="Your files" name="drive" options={DRIVE} value={drive} onChange={setDrive} />
      <Choice legend="Your email" name="gmail" options={GMAIL} value={gmail} onChange={setGmail} />

      <button
        type="submit"
        className="mt-8 min-h-[48px] w-full rounded-full bg-kira-600 px-8 text-base font-semibold text-white sm:w-auto"
      >
        Continue to Google
      </button>
      <p className="mt-3 text-base text-stone-500 sm:text-sm">
        Google will ask you to confirm. You can untick anything on that screen and Kira will work
        with whatever you allow.
      </p>
    </form>
  );
}
