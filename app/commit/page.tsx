'use client';

// app/commit/page.tsx
// The "put it in writing" letter-of-intent page — the artifact you link a prospect right after they
// feel a wow-Kira moment. Public (no login). Captures a structured, timestamped commitment into
// loi_commitments. Anti-bot: autofill-neutral honeypot (hp_field) + a time-trap. Aligned to the
// fractional-exec framing.

import { useEffect, useRef, useState } from 'react';

const LEVELS: { value: string; label: string; hint: string }[] = [
  { value: 'start_paid', label: 'I’d start a paid plan now', hint: 'Ready to put Kira to work in my business.' },
  { value: 'paid_pilot', label: 'I’d commit to a paid pilot', hint: 'A defined trial with intent to continue if it delivers.' },
  { value: 'refer', label: 'I’d recommend Kira to others', hint: 'I’d introduce peers who’d want this.' },
  { value: 'interested', label: 'Interested — keep me posted', hint: 'Not ready to commit, but I want to follow it.' },
];

export default function CommitPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [role, setRole] = useState('');
  const [level, setLevel] = useState('');
  const [detail, setDetail] = useState('');
  const [monthly, setMonthly] = useState('');
  const [referCount, setReferCount] = useState('');
  const [signature, setSignature] = useState('');
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState(''); // honeypot — must stay empty

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const startedAt = useRef<number>(0);
  const source = useRef<string>('commit_page');
  const agentId = useRef<string | undefined>(undefined);

  useEffect(() => {
    startedAt.current = Date.now();
    const p = new URLSearchParams(window.location.search);
    if (p.get('source')) source.current = p.get('source')!;
    if (p.get('agent')) agentId.current = p.get('agent')!;
  }, []);

  const submit = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !level) {
      setError('Please add your name, email, and choose your commitment.');
      return;
    }
    if (!consent) {
      setError('Please tick the box to record this as a genuine expression of intent.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/loi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          business_name: businessName.trim() || undefined,
          role: role.trim() || undefined,
          commitment_level: level,
          commitment_detail: detail.trim() || undefined,
          monthly_intent: monthly ? Number(monthly.replace(/[^0-9.]/g, '')) : undefined,
          refer_count: referCount ? Number(referCount) : undefined,
          signature: signature.trim() || undefined,
          consent,
          source: source.current,
          agent_id: agentId.current,
          hp_field: hp,
          elapsed_ms: Date.now() - startedAt.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not record your intent.');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
        <div className="max-w-md rounded-3xl bg-white border border-amber-100 shadow-xl p-8 text-center">
          <div className="text-5xl mb-4">🤝</div>
          <h1 className="font-bold text-2xl text-stone-800 mb-2">It’s in writing. Thank you.</h1>
          <p className="text-stone-600">
            Your intent is recorded{name ? `, ${name.split(' ')[0]}` : ''}. Dennis will follow up personally —
            and Kira keeps getting sharper in the meantime.
          </p>
        </div>
      </div>
    );
  }

  const field = 'w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-800 placeholder-stone-400 focus:border-pink-400 focus:outline-none';

  return (
    <div className="min-h-screen bg-amber-50 text-stone-800">
      <div className="max-w-xl mx-auto px-5 py-10 sm:py-14">
        {/* Explanatory header */}
        <header className="mb-8">
          <h1 className="font-bold text-3xl text-stone-800">Put it in writing</h1>
          <p className="mt-2 text-stone-600 leading-relaxed">
            If Kira — your fractional exec — is something you’d actually use, say so here. It’s a quick,
            genuine expression of intent (not a contract, no card). It helps us build the right thing for
            you and back it with the partners who make it real.
          </p>
        </header>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Your name *</label>
              <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email *</label>
              <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Business</label>
              <input className={field} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your business" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Your role</label>
              <input className={field} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Owner / Founder" />
            </div>
          </div>

          {/* Honeypot — autofill-neutral name, off-screen, never blocks a real submit. */}
          <div aria-hidden className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
            <label>
              Leave this field empty
              <input tabIndex={-1} autoComplete="off" name="hp_field" value={hp} onChange={(e) => setHp(e.target.value)} />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Your commitment *</label>
            <div className="space-y-2">
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLevel(l.value)}
                  className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                    level === l.value ? 'border-pink-400 bg-pink-50' : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <span className="block font-semibold text-stone-800">{l.label}</span>
                  <span className="block text-sm text-stone-500">{l.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Monthly you’d commit (optional)</label>
              <input className={field} value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="e.g. 499" inputMode="decimal" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Peers you’d refer (optional)</label>
              <input className={field} value={referCount} onChange={(e) => setReferCount(e.target.value)} placeholder="e.g. 3" inputMode="numeric" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">In your words (optional)</label>
            <textarea
              className={`${field} resize-none`}
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="What you’d use Kira for, and what a win looks like."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Sign it (type your name)</label>
            <input className={field} value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Type your full name" />
          </div>

          <label className="flex items-start gap-3">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 rounded border-stone-300 text-pink-600 focus:ring-pink-500" />
            <span className="text-sm text-stone-600">
              I’m recording this as a genuine expression of intent, and I’m happy for Dennis to follow up.
            </span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-pink-200 transition-transform hover:scale-[1.01] disabled:opacity-60"
          >
            {submitting ? 'Recording…' : 'Put it in writing →'}
          </button>
          <p className="text-center text-xs text-stone-400">No card. No contract. Just your intent, in writing.</p>
        </div>
      </div>
    </div>
  );
}
