'use client';

// The advisor's way in. Still short — a broker filling this in between meetings should be done in
// under a minute — but it now asks the things that decide whether we say yes, and the one thing the
// page opposite it promises they confirm.
//
// What was added, and why each earns its place on a form we deliberately keep brief:
//
//   * First/last name separately. Splitting a combined name later is lossy, and the parts are what
//     a payee record needs.
//   * Firm as an ABR LOOKUP rather than free text. One interaction, three verified fields (entity
//     name, ABN, state) — less typing than before, not more, on a form that registers a party we
//     intend to pay. Degrades to a plain text field if the register is unreachable.
//   * Type of practice. The channel's condition means something different for a broker than for an
//     accountant, and we were accepting enquiries without ever asking which we were talking to.
//   * The undertaking. /advisors states the one condition as something they confirm on joining; the
//     form collected nothing. The binding acceptance is still the portal undertaking — this is the
//     earlier record that makes the page's claim true.
//
// It does NOT self-serve an account: an introducer is added by an operator, who checks the practice
// is real before their link starts attributing commission. This is an enquiry, and it says so.

import { useEffect, useRef, useState, useTransition } from 'react';

import { AbnLookupField } from '@/components/AbnLookupField';

const CLIENT_BANDS = ['Under 20', '20–50', '50–200', '200+'];

const ADVISORY_TYPES = [
  { value: 'business_broker', label: 'Business broker' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'bookkeeper', label: 'Bookkeeper' },
  { value: 'financial_adviser', label: 'Financial adviser' },
  { value: 'lawyer', label: 'Lawyer' },
  { value: 'other', label: 'Something else' },
];

export function AdvisorEnquiryForm() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undertaking, setUndertaking] = useState(false);

  // Stamped after mount, not during render — Date.now() in a render body is impure. The server
  // uses it as a time-trap: a form completed implausibly fast was not completed by a person.
  const renderedAt = useRef(0);
  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {
      ...Object.fromEntries(new FormData(form).entries()),
      rendered_at: renderedAt.current,
    };
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch('/api/advisors/enquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not send that');
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not send that');
      }
    });
  }

  if (done) {
    return (
      <div>
        <h3 className="font-display text-lg font-bold text-stone-900">Thanks — that&apos;s with us</h3>
        <p className="mt-2 leading-relaxed text-stone-600">
          We&apos;ll be in touch shortly with your link and a dashboard login. If it&apos;s urgent,
          reply to the confirmation email and it comes straight to us.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/business-valuation"
            className="font-display inline-flex min-h-[44px] items-center rounded-full bg-stone-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-900"
          >
            See what a client sees →
          </a>
          <a
            href="/pricing"
            className="font-display inline-flex min-h-[44px] items-center rounded-full border border-stone-300 px-5 py-2.5 text-sm font-bold text-stone-700 hover:border-stone-400"
          >
            What owners pay
          </a>
        </div>
      </div>
    );
  }

  const field =
    'mt-1 w-full rounded-lg border border-stone-300 px-3 py-3 text-base outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100';

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">First name</span>
          <input name="first_name" required autoComplete="given-name" className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Last name</span>
          <input name="last_name" required autoComplete="family-name" className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Email</span>
          <input name="email" type="email" required autoComplete="email" className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Phone (optional)</span>
          <input name="phone" type="tel" autoComplete="tel" className={field} />
        </label>

        <div className="sm:col-span-2">
          <AbnLookupField
            label="Firm"
            nameField="firm"
            abnField="firm_abn"
            stateField="firm_state"
            hint="Start typing your firm's name and pick it from the business register."
            inputClassName={field}
          />
        </div>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">What kind of practice?</span>
          <select name="advisory_type" required defaultValue="" className={field}>
            <option value="" disabled>
              Choose one
            </option>
            {ADVISORY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            Roughly how many owner clients do you act for?
          </span>
          <select name="client_band" defaultValue="" className={field}>
            <option value="" disabled>
              Choose one
            </option>
            {CLIENT_BANDS.map((band) => (
              <option key={band} value={band}>
                {band}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-stone-700">
            Anything we should know? (optional)
          </span>
          <textarea name="note" rows={3} className={field} />
        </label>
      </div>

      {/* The one condition, confirmed here rather than only implied by the page above it. The
          binding acceptance is still the portal undertaking, which they sign before their link
          goes live — this is the earlier record, and it stops us claiming a confirmation we never
          asked for. */}
      <label className="flex items-start gap-3 rounded-xl bg-amber-50/60 p-4">
        <input
          type="checkbox"
          name="undertaking"
          checked={undertaking}
          onChange={(event) => setUndertaking(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-stone-300 text-pink-600 focus:ring-pink-400"
        />
        <span className="text-sm leading-relaxed text-stone-700">
          I&apos;ll only send my link to owners I already hold a current listing or engagement
          agreement with, and I&apos;ll tell them I&apos;m paid a commission.
        </span>
      </label>

      {/* Anti-bot: a meaningless name browsers won't autofill, plus a time-trap on the server.
          Never named website/company/url — password managers fill those into hidden fields and
          trip the trap on a genuine person. */}
      <input
        type="text"
        name="hp_field"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <button
        type="submit"
        disabled={pending || !undertaking}
        className="font-display min-h-[52px] w-full rounded-full bg-stone-800 px-7 py-3.5 text-base font-bold text-white hover:bg-stone-900 disabled:opacity-60 sm:w-auto"
      >
        {pending ? 'Sending…' : 'Request access'}
      </button>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      <p className="text-sm text-stone-500">
        We&apos;ll only use this to talk to you about the advisor channel.
      </p>
    </form>
  );
}
