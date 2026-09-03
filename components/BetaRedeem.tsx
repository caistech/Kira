'use client';

// components/BetaRedeem.tsx
//
// BETA REDEMPTION
// ---------------
//
// Beta is an acquisition/provisioning path, not a second identity-definition
// path.
//
// The universal identity boundary remains:
//
//   /plan
//      ↓
//   Person
//      ↓
//   Organisation
//      ↓
//   Membership
//      ↓
//   Ownership (when explicitly declared)
//
// This component therefore does NOT establish organisational identity.
//
// Its job is limited to:
//   1. validate/display the invitation code;
//   2. collect the password and Terms acceptance;
//   3. call /api/beta/redeem;
//   4. establish the Auth session for a newly provisioned account;
//   5. converge back onto /plan.
//
// The beta code is provenance/access information.
// It is never treated as ownership authority.
//
// IMPORTANT:
//   - firstName / organisationId / isOwner are display/context props only;
//   - they are NOT sent to /api/beta/redeem as organisational authority;
//   - /plan remains responsible for Person → Organisation → Membership → Ownership.

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

import { PasswordInput } from '@/components/auth/PasswordInput';
import { TermsAgreement, TERMS_VERSION } from '@/components/TermsAgreement';
import { createClient } from '@/lib/supabase/browser';

type Stage = 'code' | 'password' | 'done';

type BetaRedeemResponse =
  | {
      ok: true;
      email: string;
      existing?: false;
    }
  | {
      ok: true;
      email: string;
      existing: true;
    }
  | {
      ok?: false;
      error?: string;
      code?: string;
    };

export function BetaRedeem({
  initialCode = '',
  firstName,
  organisationId,
  isOwner = false,
}: {
  /** From ?code=. The invitation email links directly here. */
  initialCode?: string;

  /**
   * Context already collected by /plan.
   *
   * These values are intentionally NOT sent to /api/beta/redeem.
   * They are retained here only so the component contract remains compatible
   * with the /plan page while the actual identity authority stays at /plan.
   */
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

  /*
   * ---------------------------------------------------------------------------
   * BETA CODE PEEK
   * ---------------------------------------------------------------------------
   *
   * /api/beta/peek is deliberately read-only.
   *
   * It tells the tester which email the invitation is bound to.
   *
   * It does NOT claim the code.
   * It does NOT create an account.
   * It does NOT establish organisational identity.
   */

  const check = useCallback(async (candidate: string) => {
    const normalisedCode = candidate.trim();

    if (!normalisedCode) {
      setError('Enter your invitation code.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/beta/peek?code=${encodeURIComponent(normalisedCode)}`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      );

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; email?: string; error?: string }
        | null;

      if (!response.ok || !data?.ok || !data.email) {
        setError(data?.error || 'That code did not work.');
        return;
      }

      setCode(normalisedCode);
      setEmail(data.email);
      setStage('password');
    } catch {
      setError(
        'We could not reach us just then. Check your connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  }, []);

  /*
   * A code arriving in the URL is checked immediately.
   */
  useEffect(() => {
    if (initialCode.trim()) {
      void check(initialCode);
    }
  }, [initialCode, check]);

  /*
   * ---------------------------------------------------------------------------
   * REDEEM
   * ---------------------------------------------------------------------------
   *
   * The only contract sent to /api/beta/redeem is the provisioning contract:
   *
   *   code
   *   password
   *   termsAccepted
   *   termsVersion
   *
   * No organisation identity is supplied here.
   *
   * /api/beta/redeem creates/provisions the Auth account and beta entitlement.
   * /plan subsequently establishes canonical application identity.
   */

  async function redeem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!code.trim()) {
      setError('Enter your invitation code.');
      return;
    }

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
      const response = await fetch('/api/beta/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.trim(),
          password,
          termsAccepted,
          termsVersion: TERMS_VERSION,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | BetaRedeemResponse
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.error || 'Could not redeem that invitation.',
        );
      }

      /*
       * Existing Auth account.
       *
       * The beta route deliberately does not mutate an existing account.
       * It also does not attempt to change its password.
       *
       * Send the person to login rather than attempting a password sign-in
       * with the newly-entered password.
       */
      if (data.existing) {
        setBusy(false);

        setError(
          'You already have an account with this email. Please sign in with your existing password.',
        );

        window.setTimeout(() => {
          window.location.assign('/login?next=/plan');
        }, 2500);

        return;
      }

      /*
       * Newly provisioned Auth account.
       *
       * Sign in with the password just established by the tester so that the
       * subsequent /plan POST can operate through the normal authenticated
       * canonical identity boundary.
       */
      const supabase = createClient();

      const { data: sessionData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password,
        });

      if (signInError) {
        throw signInError;
      }

      if (!sessionData.session) {
        throw new Error(
          'Your account was created, but we could not establish your login session.',
        );
      }

      setStage('done');

      /*
       * /plan is the canonical convergence point.
       *
       * The browser's existing /plan state may already contain the valuation,
       * names and business information. The beta code is also retained by
       * /plan in sessionStorage, so the person can continue the same funnel.
       *
       * We deliberately do NOT send the person to /dashboard or /start.
       */
      window.setTimeout(() => {
        window.location.assign('/plan');
      }, 250);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while redeeming your invitation.',
      );
      setBusy(false);
    }
  }

  if (stage === 'done') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />

        <p className="mt-2 text-base font-semibold text-stone-900">
          You&apos;re in. Taking you back to your setup…
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-stone-900">
        Redeem your invitation
      </h3>

      {stage === 'code' ? (
        <>
          <p className="mt-1 max-w-prose text-base leading-relaxed text-stone-700">
            Free while we&apos;re in beta — no card, and we&apos;ll ask you
            before we ever charge for anything. In exchange we want to hear
            what doesn&apos;t work.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void check(code);
            }}
            className="mt-4"
          >
            <label
              htmlFor="beta-code"
              className="block text-base font-medium text-stone-800"
            >
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
              className="mt-1.5 min-h-[48px] w-full rounded-xl border border-stone-300 px-4 py-3 text-base tracking-wide"
            />

            <p className="mt-1.5 text-sm text-stone-500">
              It&apos;s in the invitation we sent you. Capitals and dashes
              don&apos;t matter.
            </p>

            <button
              type="submit"
              disabled={busy || !code.trim()}
              className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-3.5 text-base font-bold text-white disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </>
      ) : (
        <form onSubmit={redeem} className="mt-3">
          <p className="max-w-prose text-base leading-relaxed text-stone-700">
            Setting up your account for{' '}
            <strong className="text-stone-900">{email}</strong>. Choose a
            password and we&apos;ll take you back to your business setup.
          </p>

          <div className="mt-4">
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="Choose a password (8+ characters)"
              autoComplete="new-password"
              id="beta-password"
            />
          </div>

          <TermsAgreement
            checked={termsAccepted}
            onChange={setTermsAccepted}
            id="terms-beta"
          />

          <button
            type="submit"
            disabled={busy || !termsAccepted}
            className="mt-2 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-3.5 text-base font-bold text-white disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Setting up…
              </>
            ) : (
              <>
                Continue to setup
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
      )}

      {error && (
        <p className="mt-3 text-base text-rose-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}