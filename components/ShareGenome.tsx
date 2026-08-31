'use client';

// components/ShareGenome.tsx
//
// "Share" on the owner's own Genome — to his broker, his accountant, a buyer, a funder.
//
// ⚠️ HE SEES WHAT HE SENDS BEFORE IT GOES. Operator instruction, and it is the right one for this
// audience: a 66-year-old is not going to email a document about his own business to his accountant
// sight-unseen, and he should not be asked to. The preview opens the buyer's copy — the exact
// filtered document the recipient will receive — in a new tab, from the endpoint that already
// produces it.
//
// ⚠️ AND IT IS THE BUYER'S COPY, ALWAYS. Anything he has marked private is stripped by `buyerView`
// server-side; there is no control here to choose otherwise, because the one thing that must never
// leave is the thing he most wants to send this to a broker without.

import { useState } from 'react';
import { Loader2, Send, CheckCircle2 } from 'lucide-react';

import { signatureName } from '@/lib/genome/signature-name';

export function ShareGenome({
  businessName,
  ownerName,
  hasDocument,
  buyerEntries,
}: {
  businessName?: string | null;
  ownerName?: string | null;
  /** False when nothing has been captured — the button explains rather than failing on click. */
  hasDocument: boolean;
  /**
   * ⚠️ HOW MANY ENTRIES SURVIVE INTO THE COPY THAT ACTUALLY GETS SENT — which is not the same
   * number as `hasDocument`.
   *
   * `hasDocument` is "he has told her something". The buyer's copy then drops everything he marked
   * yours-only, so a man whose entire Genome is private has a full record and an empty attachment.
   * The covering note below asserts "a record of how the business actually runs"; sending that over
   * nothing is a claim in his name, to his broker, that he did not make and cannot see.
   *
   * Ray, 2026-08-16, on a version of exactly this: "It is a note in my name making a claim about a
   * file that contains none of it… The one action in this product that reaches another human being
   * is the one with the least protection on it."
   */
  buyerEntries: number;
}) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const business = businessName?.trim();
  const [subject, setSubject] = useState(
    business ? `${business} — how the business runs` : 'How the business runs',
  );
  const [message, setMessage] = useState(
    [
      'Hello,',
      '',
      business
        ? `I have put together a record of how ${business} actually runs — where the work comes from, how it is priced, who does what, and the parts that still depend on me.`
        : 'I have put together a record of how the business actually runs — where the work comes from, how it is priced, who does what, and the parts that still depend on me.',
      '',
      'It is below. Happy to talk through any of it.',
      '',
      // ⚠️ NOT `ownerName` RAW. It is `users.first_name`, which for an account created from a
      // plus-addressed email holds the LOCAL-PART — Ray's broker note was signed "dennis+ray".
      // An unsigned draft he completes himself beats a confident wrong name on the one artefact
      // that reaches another person.
      signatureName(ownerName) ?? '',
    ]
      .join('\n')
      .trimEnd(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<number | null>(null);

  async function share(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/genome/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Split on commas and semicolons — he will paste from a contacts list or type both.
        body: JSON.stringify({
          to: to.split(/[,;]/).map((s) => s.trim()).filter(Boolean),
          subject,
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not send it.');
      setSent(data.sent ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  // Refuses on the count that matters, and says which of the two reasons applies — "nothing
  // captured" and "everything captured is private" need different actions from him.
  const sendable = hasDocument && buyerEntries > 0;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!sendable}
        title={
          sendable
            ? undefined
            : hasDocument
              ? 'Everything Kira holds is marked yours only, so the copy they would receive is empty. Unmark something first.'
              : 'There is nothing to share yet — have a conversation with Kira first.'
        }
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-base font-semibold text-stone-800 hover:border-violet-300 disabled:opacity-50"
      >
        <Send className="h-4 w-4" /> Share
      </button>
    );
  }

  if (sent !== null) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="flex items-center gap-2 text-base font-semibold text-stone-900">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Sent to {sent}{' '}
          {sent === 1 ? 'person' : 'people'}.
        </p>
        {/* WHERE THE REPLY GOES, said now rather than left to be discovered. */}
        <p className="mt-1 text-base text-stone-700">
          If they reply, it comes straight to you — not to us.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={share} className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-stone-900">Share your Operating Manual</h3>
      {/* THE EXPLANATORY HEADER — what it is, what leaves, and what does not. The middle sentence is
          the one that matters to this reader and it is stated before he types an address. */}
      <p className="mt-1 max-w-prose text-base leading-relaxed text-stone-600">
        Sends the buyer&apos;s copy of your Operating Manual — the same document you can read below. Anything
        you have marked private stays out of it. It goes out under our name with your address as the
        reply-to, so replies come to you.
      </p>

      <label htmlFor="share-to" className="mt-5 block text-base font-medium text-stone-800">
        To
      </label>
      <input
        id="share-to"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="accountant@example.com, broker@example.com"
        autoComplete="off"
        className="mt-1.5 w-full rounded-xl border border-stone-300 px-4 py-3 text-base min-h-[48px]"
      />
      {/* ⚠️ SAID UP FRONT RATHER THAN AS A REJECTION. Cc and Bcc cannot be carried by the shared
          sender yet, and offering fields that silently dropped their recipients would be the worst
          version of this feature. Telling him here costs one sentence; finding out by asking his
          accountant why she never replied costs the relationship. */}
      <p className="mt-1.5 text-sm text-stone-500">
        Separate several with commas. Everyone sees who else received it — there is no Bcc yet.
      </p>

      <label htmlFor="share-subject" className="mt-4 block text-base font-medium text-stone-800">
        Subject
      </label>
      <input
        id="share-subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-stone-300 px-4 py-3 text-base min-h-[48px]"
      />

      <label htmlFor="share-message" className="mt-4 block text-base font-medium text-stone-800">
        Message
      </label>
      <textarea
        id="share-message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={8}
        className="mt-1.5 w-full rounded-xl border border-stone-300 px-4 py-3 text-base leading-relaxed"
      />
      <p className="mt-1.5 text-sm text-stone-500">
        Written as you, and yours to change. The document goes underneath it.
      </p>

      {/* ⚠️ WHAT IS ACTUALLY IN THE ATTACHMENT, STATED WHERE HE PRESSES SEND.
          The covering note above is confident by design — "a record of how the business actually
          runs" — and a confident note over a thin document is a claim in his name that he cannot
          see. There is a "Read what they will get" link, and Ray said he would probably have used
          it; probably is not the standard for the one action in this product that reaches another
          human being. A count is not a substitute for reading it, but it is unmissable. */}
      <p className="mt-3 rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-700">
        They will receive <strong>{buyerEntries}</strong>{' '}
        {buyerEntries === 1 ? 'entry' : 'entries'}. Your note above says you have put together a
        record of how the business runs — read what they will get before you send it.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy || !to.trim()}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-base font-bold text-white disabled:opacity-60"
        >
          {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending…</> : <>Send it <Send className="h-4 w-4" /></>}
        </button>
        {/* THE PREVIEW. Opens the exact document the recipient receives, from the endpoint that
            builds it — not a re-render that could drift from what actually goes. */}
        <a
          href="/api/genome/export?format=md"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[48px] items-center text-base font-semibold text-violet-700 underline underline-offset-4"
        >
          Read what they will get
        </a>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex min-h-[48px] items-center rounded-full border border-stone-300 px-5 py-2.5 text-base font-semibold text-stone-700"
        >
          Not now
        </button>
      </div>

      {error && <p className="mt-3 text-base text-rose-700">{error}</p>}
    </form>
  );
}
