'use client';

// The advisor's way in. Deliberately short — a broker filling this in between meetings should be
// done in under a minute, and everything else can be asked when we actually speak.
//
// It does NOT self-serve an account: an introducer is added by an operator, who checks the practice
// is real before their link starts attributing commission. This is an enquiry, and it says so.

import { useEffect, useRef, useState, useTransition } from 'react';

const CLIENT_BANDS = ['Under 20', '20–50', '50–200', '200+'];

export function AdvisorEnquiryForm() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      </div>
    );
  }

  const field =
    'mt-1 w-full rounded-lg border border-stone-300 px-3 py-3 text-base outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100';

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Your name</span>
          <input name="name" required autoComplete="name" className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Email</span>
          <input name="email" type="email" required autoComplete="email" className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Firm</span>
          <input name="firm" autoComplete="organization" className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Phone (optional)</span>
          <input name="phone" type="tel" autoComplete="tel" className={field} />
        </label>
        <label className="block sm:col-span-2">
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
        disabled={pending}
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
