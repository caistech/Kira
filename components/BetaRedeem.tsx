'use client';

// components/BetaRedeem.tsx
//
// BETA REDEMPTION
// ---------------
//
// Beta is an acquisition/provisioning path.
//
// It is NOT a second identity-definition path.
//
// Canonical identity remains:
//
//   Auth
//      ↓
//   Person
//      ↓
//   Organisation
//      ↓
//   Membership
//      ↓
//   Ownership
//
// This component therefore does ONLY:
//
//   1. collect/validate the invitation code;
//   2. display the invitation-bound email;
//   3. collect the password;
//   4. collect Terms acceptance;
//   5. call /api/beta/redeem;
//   6. establish the Auth session for a newly created account;
//   7. converge back onto /plan.
//
// It does NOT send:
//   - organisationId;
//   - isOwner;
//   - firstName;
//   - lastName;
//
// to /api/beta/redeem.
//
// Those belong to /plan.
//
// The beta code is access/provenance information.
// It is never treated as organisational authority.

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ArrowRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

import { PasswordInput } from '@/components/auth/PasswordInput';
import {
  TermsAgreement,
  TERMS_VERSION,
} from '@/components/TermsAgreement';

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

type BetaPeekResponse = {
  ok?: boolean;
  email?: string;
  error?: string;
};

export function BetaRedeem({
  initialCode = '',
  firstName: _firstName,
  organisationId: _organisationId,
  isOwner: _isOwner = false,
}: {
  /**
   * Invitation code supplied by /plan?code=...
   */
  initialCode?: string;

  /**
   * Retained for compatibility with the existing /plan component contract.
   *
   * These values are deliberately NOT used by the beta redemption API.
   *
   * Canonical identity belongs to /plan.
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
   * -------------------------------------------------------------------------
   * PEEK
   * -------------------------------------------------------------------------
   *
   * This is deliberately GET/read-only.
   *
   * /api/beta/peek:
   *
   *   validates the code
   *   ↓
   *   returns bound email
   *   ↓
   *   does NOT consume code
   *   ↓
   *   does NOT create account
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
        `/api/beta/peek?code=${encodeURIComponent(
          normalisedCode,
        )}`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      );

      const data =
        (await response.json().catch(() => null)) as
          | BetaPeekResponse
          | null;

      if (!response.ok || !data?.ok || !data.email) {
        setError(
          data?.error || 'That code did not work.',
        );
        return;
      }

      setCode(normalisedCode);
      setEmail(data.email);
      setStage('password');
    } catch {
      setError(
        'We could not reach Kira just then. Check your connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  }, []);

  /*
   * A code arriving in the URL is checked immediately.
   *
   * Checking does not consume the invitation.
   */
  useEffect(() => {
    const candidate = initialCode.trim();

    if (!candidate) {
      return;
    }

    void check(candidate);
  }, [initialCode, check]);

  /*
   * -------------------------------------------------------------------------
   * REDEEM
   * -------------------------------------------------------------------------
   *
   * The ONLY data sent to /api/beta/redeem is:
   *
   *   code
   *   password
   *   termsAccepted
   *   termsVersion
   *
   * No organisational identity is sent here.
   */
  async function redeem(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!code.trim()) {
      setError('Enter your invitation code.');
      return;
    }

    if (password.length < 8) {
      setError(
        'Please choose a password of at least 8 characters.',
      );
      return;
    }

    if (!termsAccepted) {
      setError(
        'Please agree to the Terms and Privacy Policy to continue.',
      );
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
        cache: 'no-store',
        body: JSON.stringify({
          code: code.trim(),
          password,
          termsAccepted,
          termsVersion: TERMS_VERSION,
        }),
      });

      const data =
        (await response.json().catch(() => null)) as
          | BetaRedeemResponse
          | null;

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.error ||
            'Could not redeem that invitation.',
        );
      }

      /*
       * -----------------------------------------------------------------------
       * EXISTING ACCOUNT
       * -----------------------------------------------------------------------
       *
       * The server did NOT consume the invitation.
       *
       * The existing Auth account is deliberately untouched.
       *
       * We must NOT attempt:
       *
       *   signInWithPassword(email, newlyEnteredPassword)
       *
       * because that password was never applied to the existing account.
       */
      if (data.existing) {
        setBusy(false);

        setError(
          'You already have an account with this email. Please sign in with your existing password.',
        );

        window.setTimeout(() => {
          window.location.assign(
            '/login?next=/plan',
          );
        }, 2500);

        return;
      }

      /*
       * -----------------------------------------------------------------------
       * NEW ACCOUNT
       * -----------------------------------------------------------------------
       *
       * /api/beta/redeem has now:
       *
       *   - atomically claimed the invitation;
       *   - created the Auth account;
       *   - preserved beta provenance.
       *
       * Sign in using the password established by this request.
       */
      const supabase = createClient();

      const {
        data: sessionData,
        error: signInError,
      } =
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
       * -----------------------------------------------------------------------
       * CANONICAL CONVERGENCE
       * -----------------------------------------------------------------------
       *
       * /plan now owns:
       *
       *   Auth
       *     ↓
       *   auth_credentials
       *     ↓
       *   Person
       *     ↓
       *   Organisation
       *     ↓
       *   Membership
       *     ↓
       *   Ownership
       *     ↓
       *   beta entitlement
       *
       * Do NOT redirect to /dashboard or /start.
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
            Free while we&apos;re in beta — no card, and
            we&apos;ll ask you before we ever charge for
            anything. In exchange we want to hear what
            doesn&apos;t work.
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
              onChange={(event) =>
                setCode(event.target.value)
              }
              placeholder="KIRA-0000-0000"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="mt-1.5 min-h-[48px] w-full rounded-xl border border-stone-300 px-4 py-3 text-base tracking-wide"
            />

            <p className="mt-1.5 text-sm text-stone-500">
              It&apos;s in the invitation we sent you.
              Capitals and dashes don&apos;t matter.
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
        <form
          onSubmit={redeem}
          className="mt-3"
        >
          <p className="max-w-prose text-base leading-relaxed text-stone-700">
            Setting up your account for{' '}
            <strong className="text-stone-900">
              {email}
            </strong>
            . Choose a password and we&apos;ll take you
            back to your business setup.
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
        <p
          className="mt-3 text-base text-rose-700"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}