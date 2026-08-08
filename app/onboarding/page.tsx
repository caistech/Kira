'use client';

// app/onboarding/page.tsx
//
// The post-payment landing. The owner has paid via Stripe; here they set a password (their account
// is created already-confirmed on the server), then we sign them in and open their Gap Dashboard.

import { useEffect, useState } from 'react';
import { Loader2, Brain, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { createClient } from '@/lib/supabase/browser';
import { formatMoney } from '@/lib/valuation/currency';

interface SessionSummary {
  paid: boolean;
  email: string | null;
  monthly: number | null;
  currency: string;
  gap: number | null;
}

export default function OnboardingPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('session_id');
    setSessionId(id);
    if (!id) {
      setLoadingSummary(false);
      return;
    }
    fetch(`/api/onboarding/session?session_id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => setSummary(d))
      .catch(() => setError('Could not load your session.'))
      .finally(() => setLoadingSummary(false));
  }, []);

  async function finish(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || password.length < 8) {
      setError('Please choose a password of at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Onboarding failed');

      // Account exists + confirmed; sign in.
      const supabase = createClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: data.email, password });
      if (signInErr) throw signInErr;

      // STRAIGHT INTO SETTING HER UP, not onto the dashboard.
      //
      // Paying does not create an agent — /api/onboarding/complete makes the account, links the
      // users row, writes the valuation and stops. Agents are only ever created from an approved
      // draft (POST /api/kira/create), so an owner who lands on /dashboard has no Kira, and the
      // dashboard's "Talk to Kira" button silently falls back to /start (dashboard:107). Walked
      // 2026-08-08 on a real payment: kira_agents = 0 rows.
      //
      // Every previous attempt at this fixed the ROUTING — which door the button opens — and the
      // door was never the problem: there was nothing behind any of them. So the paid path now
      // leads INTO the flow that makes her, and the fallback stops being how anyone gets there.
      //
      // Deliberately NOT `ensureUserAgent` at this point, though it is the canonical one-agent-per-
      // user call and is used nowhere in this repo. Two reasons: an agent provisioned here has no
      // brief, so she would know nothing about his business on the first screen he sees after
      // paying — and the seeded first message is the thing that made the 2026-08-07 fresh-signup
      // test pass, where she named his trade, his 35 years and his two builders. And
      // /api/kira/create makes a NEW agent per draft (create/route.ts:11), so provisioning here
      // would hand him a second one the moment he finished the brief — the duplicate-agent state
      // D2 recorded, where which agent an owner gets is decided by a name collision.
      window.location.assign('/start?journey=business&from=paid');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 text-stone-800 font-body flex items-center justify-center px-5 py-16">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Outfit:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Outfit', sans-serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }
        .grad-coral { background: linear-gradient(135deg,#fb7185,#f472b6); }
        .grad-genome { background: linear-gradient(135deg,#a78bfa,#8b5cf6 60%,#f472b6); }
      `}</style>

      <div className="w-full max-w-md">
        {loadingSummary ? (
          <div className="text-center text-stone-500"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : !sessionId || (summary && !summary.paid) ? (
          <div className="bg-white rounded-3xl p-8 border border-amber-100 shadow-sm text-center">
            <h1 className="font-display text-xl font-bold mb-2">We couldn&apos;t confirm your payment</h1>
            <p className="text-stone-600 mb-6">If you were charged, please refresh from your receipt link, or start again.</p>
            <a href="/plan" className="grad-coral text-white font-display font-bold px-6 py-3 rounded-full inline-flex items-center gap-2 min-h-[48px]">Back to plan</a>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 border border-amber-100 shadow-sm">
            <div className="grad-genome w-14 h-14 rounded-2xl flex items-center justify-center text-white mx-auto mb-5"><Brain className="h-7 w-7" /></div>
            <div className="inline-flex items-center gap-1.5 text-green-600 text-sm font-semibold justify-center w-full mb-2">
              <CheckCircle2 className="h-4 w-4" /> Payment confirmed
            </div>
            <h1 className="font-display text-2xl font-bold text-center mb-2">You&apos;re in. Let&apos;s meet Kira.</h1>
            <p className="text-stone-600 text-center mb-6">
              {summary?.email ? <>Your account is <strong>{summary.email}</strong>. </> : null}
              {/* Says where he is actually going. This promised the dashboard while the button
                  below now opens the setup conversation — a small lie, told at the one moment he
                  is deciding whether this thing is straight with him. */}
              Set a password and you&apos;ll meet Kira — a short conversation so she learns how the
              business runs. Your dashboard is waiting behind it.
            </p>
            <form onSubmit={finish} className="space-y-4">
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder="Choose a password (8+ characters)"
                autoComplete="new-password"
                id="new-password"
              />
              <button
                type="submit"
                disabled={busy}
                className="grad-coral text-white font-display font-bold px-6 py-3.5 rounded-full w-full inline-flex items-center justify-center gap-2 min-h-[52px] disabled:opacity-60"
              >
                {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> Setting up…</> : <>Meet Kira <ArrowRight className="h-5 w-5" /></>}
              </button>
              {error && <p className="text-rose-600 text-sm">{error}</p>}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
