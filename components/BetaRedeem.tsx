'use client';

// components/BetaRedeem.tsx
//
// The beta path — the same funnel, without the card.
//
// A beta tester walks everything a paying owner walks: the same questions, the same result, the same
// /plan. Only the last step differs. That is the whole point of putting it here rather than behind a
// separate door: one funnel means one set of code paths to maintain, one styling, and — the part
// that matters most — a beta tester arrives WITH a baseline valuation, because he answered the
// questions on the way in.
//
// ⚠️ NO "BETA — FREE" CARD ON THE PRICING PAGE, and this component is deliberately not one. An owner
// looking at a real monthly price beside a free column asks why he is not in the free column, and a
// price becomes an opening bid. So the entrance is a line of text under the checkout button, plus a
// URL the invitation email links to directly. The people who need it are told it exists; nobody else
// is shown a discount they can ask for.
//
// ⚠️ HE NEVER TYPES HIS EMAIL. The address is bound to the code when it is minted and comes back
// from the server, so the page shows him WHO the invitation is for. That is kinder — one less thing
// to get wrong — and it is the security property: redemption cannot be aimed at an address we did
// not choose. See app/api/beta/redeem/route.ts.

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

import { PasswordInput } from '@/components/auth/PasswordInput';
import { TermsAgreement, TERMS_VERSION } from '@/components/TermsAgreement';
import { createClient } from '@/lib/supabase/browser';

type Stage = 'code' | 'password' | 'done';

export function BetaRedeem({
  /** From `?code=` — the invitation email links straight here with it filled in. */
  initialCode = '',
  /** His answer to "what should I call you", carried from the valuation. */
  firstName,
  /** Canonical Organisation context established by the /plan identity boundary. */
  organisationId,
  /** His explicit ownership declaration from /plan (SELF_DECLARED when checked). */
  isOwner = false,
}: {
  initialCode?: string;
  firstName?: string;
  organisationId?: string;
  isOwner?: boolean;
}) {
  const [code, setCode] = useState(initialCode);
  const [stage, setStage] = useState<Stage>('code');
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async (candidate: string) => {
    if (!candidate.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/beta/peek?code=${encodeURIComponent(candidate)}`);
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'That code is not valid.');
        return;
      }
      setEmail(data.email);
      setStage('password');
    } catch {
      // NAMES THE NETWORK ONLY WHEN THE NETWORK IS ACTUALLY THE CAUSE. The catch branch is reached
      // when the fetch itself failed; a code the server rejected is handled above with the server's
      // own words. Telling someone to "check your connection" over a typo is the failure that made
      // `mapSupabaseAuthError`'s provider_error fallback a defect in the shared auth package.
      setError('We could not reach us just then. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }, []);

  // A code arriving in the URL is checked immediately — the tester clicked a link from his
  // invitation and should land on "here is your account, choose a password", not on a form with his
  // own code already in it waiting for him to press a button.
  useEffect(() => {
    if (initialCode) void check(initialCode);
  }, [initialCode, check]);

  async function redeem(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError('Please choose a password of at least 8 characters.');
      return;
    }
    if (!termsAccepted) {
      setError('Please agree to the Terms and Privacy Policy to continue.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/beta/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          password,
          firstName,
          organisationId,
          isOwner,
          termsAccepted,
          termsVersion: TERMS_VERSION,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not redeem that code.');

      // ALREADY HAS AN ACCOUNT — the server changed nothing, on purpose. Signing in with the password
      // he just typed would fail with a bare "Invalid login credentials", which is the least useful
      // thing we could say. Same handling as the paid path.
      if (data.existing) {
        setBusy(false);
        setError(
          'You already have an account with this email — your code has been used. Sign in with your ' +
            'existing password, or use "Forgot password" if you need to reset it.',
        );
        setTimeout(() => window.location.assign('/login?next=/dashboard'), 4000);
        return;
      }


      const supabase = createClient();

      const { data: sessionData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password,
        });

      if (signInError) throw signInError;

      if (!sessionData.session) {
        throw new Error(
          'Your account was created, but we could not establish your login session.',
        );
      }

      setStage('done');


      // ⚠️ /dashboard, NOT /start. This used to send him into the brief directly, on the reasoning
      // that the dashboard had no Kira behind it yet — which was true, and the wrong fix. The
      // operator walked it and landed on a page he had not asked for, in a different palette, and
      // said so twice. The dashboard now GATES on state (lib/onboarding/gate.ts) and offers the
      // brief as a step inside its own shell, so there is one destination and the difference between
      // a new owner and an established one is content rather than which page he is on.
      window.location.assign('/dashboard?welcome=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  if (stage === 'done') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />
        <p className="mt-2 text-base font-semibold text-stone-900">You&apos;re in. Taking you to Kira…</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-stone-900">Redeem your invitation</h3>

      {stage === 'code' ? (
        <>
          {/* WHAT THE BETA ACTUALLY IS, said before he commits to it.
              "We'll ask before we ever charge you" rather than "free for N months, then $X": a
              tester who suspects a bill is coming under-reports problems, and candid feedback is the
              entire return on giving the product away. It is also true — no subscription is created
              on this path at all. */}
          <p className="mt-1 max-w-prose text-base leading-relaxed text-stone-700">
            Free while we&apos;re in beta — no card, and we&apos;ll ask you before we ever charge for
            anything. In exchange we want to hear what doesn&apos;t work.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void check(code);
            }}
            className="mt-4"
          >
            <label htmlFor="beta-code" className="block text-base font-medium text-stone-800">
              Your invitation code
            </label>
            <input
              id="beta-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="KIRA-0000-0000"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              /* 16px minimum, or iOS zooms the whole page on focus. `tracking-wide` because this is
                 read off a screen and copied by hand. */
              className="mt-1.5 w-full rounded-xl border border-stone-300 px-4 py-3 text-base tracking-wide min-h-[48px]"
            />
            <p className="mt-1.5 text-sm text-stone-500">
              It&apos;s in the email we sent you. Capitals and dashes don&apos;t matter.
            </p>
            <button
              type="submit"
              disabled={busy || !code.trim()}
              className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-3.5 text-base font-bold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continue <ArrowRight className="h-5 w-5" /></>}
            </button>
          </form>
        </>
      ) : (
        <form onSubmit={redeem} className="mt-3">
          <p className="max-w-prose text-base leading-relaxed text-stone-700">
            Setting up your account for <strong className="text-stone-900">{email}</strong>. Choose a
            password and you&apos;ll meet Kira straight away.
          </p>
          {/* The address is NOT editable, and that is the point rather than an omission — it is
              bound to the code, so it is the one thing here that cannot be got wrong or aimed
              somewhere else. If it is the wrong address, the code is the wrong code. */}
          <div className="mt-4">
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="Choose a password (8+ characters)"
              autoComplete="new-password"
              id="beta-password"
            />
          </div>
          {/* The same control and the same wording as the paid path — one checkbox component, so
              the two cannot drift into agreeing to different things. */}
          <TermsAgreement checked={termsAccepted} onChange={setTermsAccepted} id="terms-beta" />
          <button
            type="submit"
            disabled={busy || !termsAccepted}
            className="mt-2 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-3.5 text-base font-bold text-white disabled:opacity-60"
          >
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> Setting up…</> : <>Meet Kira <ArrowRight className="h-5 w-5" /></>}
          </button>
        </form>
      )}

      {error && <p className="mt-3 text-base text-rose-700">{error}</p>}
    </div>
  );
}
