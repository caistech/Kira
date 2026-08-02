'use client';

// The add-an-introducer form. Client-side only so the operator gets the result of the action
// inline — adding a broker sends them a real email, so "did that work?" must be answerable on the
// page rather than by checking a mailbox.

import { useState, useTransition } from 'react';

import { AbnLookupField } from '@/components/AbnLookupField';

import { addIntroducer, type ActionResult } from './actions';

export function AddIntroducerForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [payeeType, setPayeeType] = useState('individual');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    // NAME THE CONSEQUENCE ON THE BUTTON, not only in the paragraph above it.
    //
    // Submitting puts mail in a real accountant's inbox, immediately and irreversibly. The sentence
    // above the form says so, which a naive tester credited — "the consequence is stated in the
    // paragraph above the form, which is right" — and then said the obvious next thing: "there's no
    // confirmation step on the button itself, and for an action that puts mail in a real
    // accountant's inbox I'd want one."
    //
    // He is right, and this is the operator's own trust at stake rather than ours: an introducer is
    // somebody he knows professionally, and an accidental send is a relationship, not a bug. The
    // recipient is read back so a mistyped address is caught before it leaves, which is the actual
    // failure mode — nobody clicks Add by accident, they click it with the wrong email in the box.
    const recipient = String(data.get('email') ?? '').trim();
    const confirmed = window.confirm(
      recipient
        ? `Email ${recipient} now with their sign-in link and referral link?\n\nThis sends immediately and cannot be recalled.`
        : 'Send their sign-in and referral links now? This sends immediately and cannot be recalled.',
    );
    if (!confirmed) return;

    setResult(null);
    startTransition(async () => {
      const outcome = await addIntroducer(data);
      setResult(outcome);
      if (outcome.ok) form.reset();
    });
  }

  const field =
    'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100';

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input name="email" type="email" required autoComplete="off" className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Name</span>
          <input name="name" type="text" autoComplete="off" className={field} />
        </label>
        {/* Same live ABR lookup the public advisor form uses. It was two plain text boxes here,
            which meant the operator-entered record was the one MORE likely to carry a typo'd or
            invented ABN than the self-serve one — and this is the record a commission is paid
            against. One component, one source of truth for the firm's legal identity. */}
        <AbnLookupField
          label="Firm"
          nameField="org_name"
          abnField="org_abn"
          hint="Start typing the firm's name or ABN — we'll confirm it against the ABR."
          inputClassName={field}
        />
        <label className="block">
          <span className="text-sm font-medium text-gray-700">They call themselves</span>
          <select name="role" defaultValue="introducer" className={field}>
            <option value="introducer">Introducer</option>
            <option value="broker">Broker</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Commission paid to</span>
          <select
            name="payee_type"
            value={payeeType}
            onChange={(e) => setPayeeType(e.target.value)}
            className={field}
          >
            <option value="individual">Them personally</option>
            <option value="entity">Their firm</option>
          </select>
        </label>
      </div>

      <p className="text-sm text-gray-500">
        Adding them sends their sign-in link and their referral link straight away.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Adding…' : 'Add and send their links'}
      </button>

      {result && (
        <p className={`text-sm ${result.ok ? 'text-violet-700' : 'text-red-600'}`}>{result.message}</p>
      )}
    </form>
  );
}
