'use client';

// @public-route

// app/plan/page.tsx
//
// Universal organisational identity boundary.
//
// Flow:
//
//   Not signed in
//       ↓
//   BetaRedeem (peek → confirm → redeem → Auth session via magic-link)
//       ↓
//   Authenticated Person
//       ↓
//   Organisation
//       ↓
//   Membership
//       ↓
//   Explicit ownership declaration
//       ↓
//   Portal
//
// Beta is an ACCESS GATE, not an identity or ownership mechanism.
//
// BetaRedeem handles the complete redemption flow:
//   1. Validate invitation code (peek — read-only)
//   2. Confirm terms and redeem (the code IS the credential — no password)
//   3. Server mints a magic-link token for the invited identity
//   4. Client redirects to /auth/callback which establishes the session
//      server-side via verifyOtp, guaranteeing the invitation wins over
//      any ambient browser session
//   5. Redirect to /plan (this page)
//
// This page then handles canonical identity establishment via
// /api/identity/plan — the ONLY authority for Person, Organisation,
// Membership, and Ownership.

import React, { FormEvent, useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  CircleAlert,
  Loader2,
  UserRound,
} from 'lucide-react';

import { BetaRedeem } from '@/components/BetaRedeem';
import { BETA_CODE_STORAGE_KEY } from '@/components/BetaCodeCarrier';
import { createClientV2 } from '@/lib/supabase/browser';

type IdentityResponse = {
  ok?: boolean;
  signedIn?: boolean;

  firstName?: string | null;
  lastName?: string | null;

  organisationId?: string | null;
  organisationName?: string | null;

  isOwner?: boolean;
  isSuperadmin?: boolean;

  personId?: string | null;
  membershipId?: string | null;
  role?: string | null;

  identity?: {
    organisationId?: string | null;
    organisationName?: string | null;
    personId?: string | null;
    membershipId?: string | null;
    role?: string | null;
    portalAccess?: string | null;
    isSuperadmin?: boolean;
  };

  boundOrganisation?: {
    organisationId?: string | null;
    organisationName?: string | null;
    boundRole?: 'admin' | 'member' | 'superadmin' | null;
    boundBetaType?: string | null;
    boundFirstName?: string | null;
    boundLastName?: string | null;
  } | null;

  error?: string;
  code?: string;
};

function normaliseString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normaliseEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

type IdentityMismatch = {
  authenticatedEmail: string;
  invitationEmail: string;
};

export default function PlanPage() {
  // ---------------------------------------------------------------------------
  // IDENTITY STATE
  // ---------------------------------------------------------------------------

  const [identityLoading, setIdentityLoading] = useState(true);
  const [identitySaving, setIdentitySaving] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);

  const [initialBetaCode, setInitialBetaCode] = useState<string | null>(null);

  const [signedIn, setSignedIn] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [organisationId, setOrganisationId] = useState('');
  const [organisationName, setOrganisationName] = useState('');

  const [isOwner, setIsOwner] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [ownershipAlreadyEstablished, setOwnershipAlreadyEstablished] =
    useState(false);

  const [boundOrganisation, setBoundOrganisation] = useState<{
    organisationId: string | null;
    organisationName: string | null;
    boundRole: 'admin' | 'member' | 'superadmin' | null;
    boundBetaType: string | null;
    boundFirstName: string | null;
    boundLastName: string | null;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // GATE 2 — IDENTITY BOUNDARY
  // A signed-in session must NEVER silently absorb an invitation addressed to a
  // different person. When a code is present and the caller is authenticated, we
  // compare the invitation's email against the authenticated email. If they
  // differ, rendering is HELD (no portal redirect, no BetaRedeem) until the owner
  // makes the explicit decision: CANCEL (abandon the invitation, keep the session)
  // or CONTINUE (terminate the session and restart the invitation unauthenticated).
  // ---------------------------------------------------------------------------

  const [identityMismatch, setIdentityMismatch] =
    useState<IdentityMismatch | null>(null);
  // Starts true so the render-hold gates the portal redirect from the very first
  // render after `signedIn` resolves — closing the one-frame race where an
  // already-onboarded Dennis could be redirected into his dashboard before the
  // invitation check has run.
  const [mismatchChecking, setMismatchChecking] = useState(true);
  const [mismatchBusy, setMismatchBusy] = useState(false);

  // ---------------------------------------------------------------------------
  // LOAD BETA CODE FROM URL / SESSION
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = normaliseString(params.get('code'));

      const fromSession = normaliseString(
        window.sessionStorage.getItem(BETA_CODE_STORAGE_KEY),
      );

      const existing = fromUrl || fromSession;

      if (existing && !cancelled) {
        setInitialBetaCode(existing);
      }
    } catch {
      // Browser storage is best-effort only.
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // CANONICAL IDENTITY LOAD
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    // Block until the URL-read effect has set the initial value from the URL or
    // session storage. `null` means "not yet read" — preventing a stale codeless
    // fetch that would race the identity-boundary hold for an already-onboarded
    // user (Dennis) and silently redirect past the mismatch dialog.
    if (initialBetaCode === null) return;

    setIdentityLoading(true);

    let query = '';
    let storageCode = '';

    try {
      storageCode = normaliseString(
        window.sessionStorage.getItem(BETA_CODE_STORAGE_KEY),
      );
    } catch {
      // Browser storage is best-effort only.
    }

    const codeToUse = normaliseString(initialBetaCode) || storageCode;

    if (codeToUse) {
      query = `?code=${encodeURIComponent(codeToUse)}`;
    }

    fetch(`/api/identity/plan${query}`, {
      method: 'GET',
      cache: 'no-store',
    })
      .then(async (response) => {
        const body = (await response.json()) as IdentityResponse;

        if (!response.ok) {
          throw new Error(
            body.error || 'Unable to load your organisational identity.',
          );
        }

        return body;
      })
      .then((body) => {
        if (cancelled) return;

        const existingOrganisationId =
          normaliseString(body.organisationId) ||
          normaliseString(body.identity?.organisationId);

        const existingOrganisationName =
          normaliseString(body.organisationName) ||
          normaliseString(body.identity?.organisationName);

        const existingOwner = body.isOwner === true;
        const existingSuperadmin =
          body.isSuperadmin === true ||
          body.identity?.isSuperadmin === true;

        setSignedIn(body.signedIn === true);

        // Same-batch hold: if this identity resolution revealed a signed-in session
        // AND a beta code is in play, turn the mismatch-checking hold ON in the same
        // render that turns `signedIn` on. A dedicated effect could only do this a
        // frame later — and in that frame an already-onboarded owner (Dennis) would
        // have hit the portal redirect below and silently abandoned the invitation.
        setMismatchChecking(
          body.signedIn === true && Boolean(normaliseString(codeToUse)),
        );

        setFirstName(normaliseString(body.firstName));
        setLastName(normaliseString(body.lastName));

        setOrganisationId(existingOrganisationId);
        setOrganisationName(existingOrganisationName);

        setIsOwner(existingOwner);
        setOwnershipAlreadyEstablished(existingOwner);
        setIsSuperadmin(existingSuperadmin);

        const bound = body.boundOrganisation;

        if (bound && normaliseString(bound.organisationId)) {
          setBoundOrganisation({
            organisationId: normaliseString(bound.organisationId),
            organisationName: normaliseString(bound.organisationName),
            boundRole: bound.boundRole === 'superadmin' ? 'superadmin' : bound.boundRole === 'admin' ? 'admin' : 'member',
            boundBetaType: normaliseString(bound.boundBetaType),
            boundFirstName: normaliseString(bound.boundFirstName),
            boundLastName: normaliseString(bound.boundLastName),
          });
          // Pre-fill the invitee's name from the operator-minted invitation
          // when the authenticated person has no name on record yet.
          if (!normaliseString(body.firstName) && !normaliseString(body.lastName)) {
            if (normaliseString(bound.boundFirstName)) {
              setFirstName(normaliseString(bound.boundFirstName));
            }
            if (normaliseString(bound.boundLastName)) {
              setLastName(normaliseString(bound.boundLastName));
            }
          }
        } else {
          setBoundOrganisation(null);
        }

        setIdentityLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        setIdentityLoading(false);
        setIdentityError(
          error instanceof Error
            ? error.message
            : 'Unable to load your identity.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [initialBetaCode]);

  // ---------------------------------------------------------------------------
  // GATE 2 — IDENTITY MISMATCH DETECTION
  //
  // Runs only when the caller is authenticated AND holds a beta code. Compares
  // the invitation's intended email (read-only `/api/beta/peek`) against the
  // authenticated session email. `mismatchChecking` holds rendering so the
  // "already onboarded → portal redirect" branch cannot fire before the check
  // finishes — that redirect is exactly what silently swallowed a mismatched
  // invitation for an established owner.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    if (!signedIn || !normaliseString(initialBetaCode)) {
      setIdentityMismatch(null);
      setMismatchChecking(false);
      return;
    }

    setMismatchChecking(true);

    (async () => {
      try {
        const { data: authUserData } = await createClientV2().auth.getUser();
        const authenticatedEmail = normaliseEmail(
          authUserData?.user?.email,
        );

        const peekResponse = await fetch('/api/beta/peek', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ code: initialBetaCode }),
        });

        const peekBody = (await peekResponse.json().catch(() => null)) as {
          ok?: boolean;
          email?: string;
        } | null;

        const invitationEmail = normaliseEmail(peekBody?.ok ? peekBody.email : undefined);

        if (cancelled) return;

        if (authenticatedEmail && invitationEmail && authenticatedEmail !== invitationEmail) {
          setIdentityMismatch({ authenticatedEmail, invitationEmail });
        } else {
          setIdentityMismatch(null);
        }
      } catch {
        // Fail-open: if identity or invitation email cannot be resolved, do not
        // trap the caller — fall through to the existing flow unchanged.
        if (!cancelled) setIdentityMismatch(null);
      } finally {
        if (!cancelled) setMismatchChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signedIn, initialBetaCode]);

  // ---------------------------------------------------------------------------
  // IDENTITY BOUNDARY
  // ---------------------------------------------------------------------------

  async function saveIdentity(event: FormEvent) {
    event.preventDefault();

    setIdentityError(null);

    const cleanFirstName = normaliseString(firstName);
    const cleanLastName = normaliseString(lastName);
    const cleanOrganisationName = normaliseString(organisationName);
    const cleanOrganisationId = normaliseString(organisationId);
    const cleanBetaCode = normaliseString(initialBetaCode);
    const isBoundOrganisation = Boolean(
      boundOrganisation && normaliseString(boundOrganisation.organisationId),
    );

    if (!cleanFirstName) {
      setIdentityError('Please enter your first name.');
      return;
    }

    if (!cleanLastName) {
      setIdentityError('Please enter your last name.');
      return;
    }

    // An operator-minted, org-bound code replaces the business-name step: the
    // organisation is already named by the invitation, so neither a name nor an
    // owner declaration is required from the tester.
    if (!isBoundOrganisation) {
      if (!cleanOrganisationId && !cleanOrganisationName) {
        setIdentityError('Please enter your business name.');
        return;
      }

      if (!cleanOrganisationId && !isOwner) {
        setIdentityError(
          'For beta onboarding, please confirm that you are the owner of this business.',
        );
        return;
      }
    }

    setIdentitySaving(true);

    try {
      const response = await fetch('/api/identity/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: cleanFirstName,
          lastName: cleanLastName,

          organisationId: isBoundOrganisation
            ? undefined
            : cleanOrganisationId || undefined,
          organisationName: isBoundOrganisation
            ? undefined
            : cleanOrganisationName || undefined,
          isOwner: isBoundOrganisation ? false : isOwner === true,
          betaCode: cleanBetaCode || undefined,
        }),
      });

      const body = (await response.json()) as IdentityResponse;

      if (!response.ok) {
        throw new Error(
          body.error || 'Unable to establish your organisational identity.',
        );
      }

      const canonicalOrganisationId =
        normaliseString(body.identity?.organisationId) ||
        normaliseString(body.organisationId);

      if (!canonicalOrganisationId) {
        throw new Error(
          'Identity was saved, but no canonical organisation was returned.',
        );
      }

      const becameSuperadmin =
        body.identity?.isSuperadmin === true ||
        body.isSuperadmin === true;

      // FRESH-USER FIRST SURFACE IS /talk, NOT /dashboard. A brand-new owner has no kira_agents
      // row — and only /talk provisions one (KiraBootstrap → /api/kira/ensure mints the agent on
      // first visit). Landing on /dashboard first left them with zero agents and a Kira that could
      // not be minted, which is why the only working path was manually walking to /talk. /talk is
      // one conversation, then every surface — /dashboard included — resolves that same agent.
      //
      // This applies to BOTH fresh-user paths: a redeem via an org-bound invitation code
      // (boundOrganisation set — the beta-tester case) and a plain self-signup (boundOrganisation
      // null). Returning users never reach this fork — they are caught earlier by
      // hasCanonicalOrganisation and sent to /dashboard.
      window.location.assign(becameSuperadmin ? '/manage' : '/talk');

    } catch (error: unknown) {
      setIdentityError(
        error instanceof Error
          ? error.message
          : 'Unable to establish your organisational identity.',
      );
    } finally {
      setIdentitySaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // GATE 2 — MISMATCH DECISIONS
  // ---------------------------------------------------------------------------

  // CANCEL — abandon the invitation, leave every byte of the signed-in session
  // untouched. Strips the code from the URL and session storage so a refresh
  // cannot silently re-introduce the invitation into Dennis's onboarding.
  function cancelMismatch() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // URL rewrite is best-effort; the state clear below is what matters.
    }

    try {
      window.sessionStorage.removeItem(BETA_CODE_STORAGE_KEY);
    } catch {
      // Browser storage is best-effort only.
    }

    setInitialBetaCode('');
    setIdentityMismatch(null);
    setMismatchChecking(false);
  }

  // CONTINUE — the invitation belongs to someone else, so get out of its way.
  // Terminate the ambient session explicitly (the same browser-client signOut the
  // account UI uses), clear the parked code, and restart the invitation URL as an
  // unauthenticated user. BetaRedeem then runs untouched, for the invited email.
  async function continueMismatch() {
    setMismatchBusy(true);
    const code = normaliseString(initialBetaCode);

    try {
      await createClientV2().auth.signOut();
    } catch {
      // Proceed even if the sign-out call itself errors; the reload below is the
      // authoritative boundary — a fresh page load re-verifies the session.
    }

    try {
      window.sessionStorage.removeItem(BETA_CODE_STORAGE_KEY);
    } catch {
      // Browser storage is best-effort only.
    }

    const target = `/plan?code=${encodeURIComponent(code)}`;
    window.location.assign(target);
  }

  // ---------------------------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------------------------

  if (identityLoading) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center px-5">
        <div className="flex items-center gap-3 text-stone-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading your onboarding session…</span>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // NOT SIGNED IN — SHOW BETA REDEMPTION
  // ---------------------------------------------------------------------------
  //
  // BetaRedeem handles the complete redemption flow:
  //   peek → password → redeem → Auth session → redirect to /plan
  //
  // After redirect, this page re-loads and shows the identity form below.
  // ---------------------------------------------------------------------------

  if (!signedIn) {
    return (
      <main className="min-h-screen bg-stone-50">
        <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
          <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
            <a
              href="/"
              className="font-display font-bold text-xl bg-gradient-to-r from-amber-500 via-pink-500 to-violet-500 bg-clip-text text-transparent"
            >
              Kira
            </a>

            <a
              href="/login"
              className="text-sm text-stone-500 hover:text-pink-500 min-h-[44px] flex items-center"
            >
              Sign in
            </a>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-5 py-20">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-stone-900">
              Beta access
            </h1>

            <p className="mt-3 text-stone-600 leading-relaxed">
              Enter your invitation code to set up your account.
            </p>
          </div>

          <BetaRedeem initialCode={initialBetaCode ?? undefined} />
        </main>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // GATE 2 — IDENTITY BOUNDARY HOLD
  //
  // Holds rendering (NOT the portal redirect) while the mismatch check is still
  // in flight. Without this, an established owner (Dennis) opening someone
  // else's invitation would be redirected into his own dashboard before the check
  // resolved — which is exactly the silent absorption this boundary exists to
  // stop. The hold also defeats the `hasCanonicalOrganisation → redirect` branch,
  // because the code check gates it below.
  // ---------------------------------------------------------------------------

  if (normaliseString(initialBetaCode) && mismatchChecking) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center px-5">
        <div className="flex items-center gap-3 text-stone-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Checking your invitation…</span>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // GATE 2 — IDENTITY MISMATCH DIALOG
  //
  // The authenticated session and the invitation are addressed to different
  // people. This is the ONLY place a decision is forced before the invitation can
  // act on this browser. Two explicit exits:
  //
  //   CANCEL — abandon the invitation, change nothing about the signed-in session.
  //   CONTINUE — sign out the current session and restart the invitation clean.
  //
  // No silent substitution is possible from here: neither button performs an
  // identity transition on its own beyond the explicit sign-out in CONTINUE.
  // ---------------------------------------------------------------------------

  if (identityMismatch) {
    return (
      <main className="min-h-screen bg-stone-50">
        <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
          <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
            <a
              href="/"
              className="font-display font-bold text-xl bg-gradient-to-r from-amber-500 via-pink-500 to-violet-500 bg-clip-text text-transparent"
            >
              Kira
            </a>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-5 py-14">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="h-10 w-10 rounded-xl bg-pink-50 flex items-center justify-center">
              <CircleAlert className="h-5 w-5 text-pink-600" />
            </div>

            <h1 className="mt-5 font-display text-2xl font-bold text-stone-900">
              This invitation is for a different account
            </h1>

            <p className="mt-3 text-base leading-relaxed text-stone-600">
              You&apos;re signed in as{' '}
              <span className="font-semibold text-stone-800">
                {identityMismatch.authenticatedEmail}
              </span>
              , but this invitation was sent to{' '}
              <span className="font-semibold text-stone-800">
                {identityMismatch.invitationEmail}
              </span>
              .
            </p>

            <p className="mt-4 text-sm leading-relaxed text-stone-500">
              Keeping your current account leaves this signed-in session and
              everything it owns exactly as it is, and sets this invitation
              aside. Switching signs you out and restarts this invitation for
              the account it belongs to.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={cancelMismatch}
                disabled={mismatchBusy}
                className="min-h-[44px] rounded-2xl border border-stone-200 bg-white px-5 font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
              >
                Keep my account
              </button>

              <button
                type="button"
                onClick={continueMismatch}
                disabled={mismatchBusy}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
              >
                {mismatchBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Switch to this invitation
              </button>
            </div>
          </div>
        </main>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // SIGNED IN BUT ORGANISATION ALREADY ESTABLISHED — REDIRECT
  // ---------------------------------------------------------------------------

  const hasCanonicalOrganisation = Boolean(
    normaliseString(organisationId),
  );

  if (hasCanonicalOrganisation) {
    // Already fully onboarded — redirect to the right surface.
    // Use effect won't re-fire, so redirect directly.
    if (typeof window !== 'undefined') {
      window.location.assign(isSuperadmin ? '/manage' : '/dashboard');
    }

    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center px-5">
        <div className="flex items-center gap-3 text-stone-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Redirecting to your portal…</span>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // SIGNED IN, NO ORGANISATION — IDENTITY / ORGANISATION FORM
  // ---------------------------------------------------------------------------

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <a
            href="/"
            className="font-display font-bold text-xl bg-gradient-to-r from-amber-500 via-pink-500 to-violet-500 bg-clip-text text-transparent"
          >
            Kira
          </a>

          <div className="flex items-center gap-3 text-sm text-stone-500">
            <span className="hidden sm:inline">
              Account created
            </span>

            <Check className="h-4 w-4 text-emerald-600" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-16">
        <div className="text-center">
          <div className="grad-genome w-14 h-14 rounded-2xl flex items-center justify-center text-white mx-auto mb-6">
            <Building2 className="h-7 w-7" />
          </div>

          <h1 className="font-display text-3xl font-bold text-stone-900">
            {boundOrganisation
              ? "You're joining the Kira beta"
              : 'Set up your business'}
          </h1>

          <p className="mt-3 text-stone-600 leading-relaxed max-w-xl mx-auto">
            {boundOrganisation
              ? 'Your invitation has already named your organisation. Just confirm your details.'
              : 'Before you enter the portal, we need to establish who you are, which business you are acting for, and your relationship with it.'}
          </p>
        </div>

        {identityError && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex gap-3">
            <CircleAlert className="h-5 w-5 shrink-0" />
            <span>{identityError}</span>
          </div>
        )}

        <form
          onSubmit={saveIdentity}
          className="mt-8 space-y-6"
        >
          {/* PERSON */}

          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center">
                <UserRound className="h-5 w-5 text-stone-700" />
              </div>

              <div>
                <h2 className="font-display font-bold text-stone-900">
                  Your details
                </h2>

                <p className="text-sm text-stone-500">
                  This establishes your Person identity.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="first-name"
                  className="block text-sm font-semibold text-stone-800"
                >
                  First name
                </label>

                <input
                  id="first-name"
                  name="firstName"
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(event.target.value)
                  }
                  autoComplete="given-name"
                  className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="last-name"
                  className="block text-sm font-semibold text-stone-800"
                >
                  Last name
                </label>

                <input
                  id="last-name"
                  name="lastName"
                  value={lastName}
                  onChange={(event) =>
                    setLastName(event.target.value)
                  }
                  autoComplete="family-name"
                  className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  required
                />
              </div>
            </div>
          </section>

{/* ORGANISATION */}

          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-stone-700" />
              </div>

              <div>
                <h2 className="font-display font-bold text-stone-900">
                  {boundOrganisation ? 'Your organisation' : 'Your business'}
                </h2>

                <p className="text-sm text-stone-500">
                  {boundOrganisation
                    ? 'Set by your invitation — nothing to enter.'
                    : 'The Organisation is the enduring business identity.'}
                </p>
              </div>
            </div>

            {boundOrganisation ? (
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 flex items-start gap-3">
                <Building2 className="h-5 w-5 mt-0.5 shrink-0 text-violet-600" />

                <div>
                  <p className="font-semibold text-stone-900">
                    You're joining{' '}
                    {boundOrganisation.organisationName || 'your organisation'}
                  </p>

                  <p className="mt-1 text-sm text-stone-600 leading-relaxed">
                    {boundOrganisation.boundRole === 'admin' ? 'Your invitation grants you administrative access to this organisation.' : boundOrganisation.boundRole === 'superadmin' ? 'Your invitation grants you platform administrator access.' : 'Your invitation grants you membership of this organisation.'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="organisation-name"
                  className="block text-sm font-semibold text-stone-800"
                >
                  Business name
                </label>

                <input
                  id="organisation-name"
                  name="organisationName"
                  value={organisationName}
                  onChange={(event) =>
                    setOrganisationName(event.target.value)
                  }
                  autoComplete="organization"
                  placeholder="Your business name"
                  className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  required
                />

                <p className="mt-2 text-xs text-stone-500 leading-relaxed">
                  This creates the canonical Organisation. The beta code
                  itself is never used as the organisation identity.
                </p>
              </div>
            )}
          </section>

          {/* OWNERSHIP (not needed for an org-bound invitation) */}

          {!boundOrganisation && (
            <section
              className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <input
                  id="owner"
                  name="owner"
                  type="checkbox"
                  checked={isOwner || ownershipAlreadyEstablished}
                  disabled={ownershipAlreadyEstablished}
                  onChange={(event) =>
                    setIsOwner(event.target.checked)
                  }
                  className="mt-1 h-5 w-5 rounded border-stone-300"
                />

                <div>
                  <label
                    htmlFor="owner"
                    className="font-semibold text-stone-900 cursor-pointer"
                  >
                    I am the Owner of this Business
                  </label>

                  <p className="mt-1 text-sm text-stone-600 leading-relaxed">
                    {ownershipAlreadyEstablished
                      ? 'Your existing ownership relationship has already been established.'
                      : 'This is an explicit ownership declaration for the business you are entering.'}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={
              identitySaving ||
              !firstName.trim() ||
              !lastName.trim() ||
              (!boundOrganisation &&
                (!organisationName.trim() || !isOwner))
            }
              className="w-full bg-stone-900 text-white font-display font-bold px-6 py-4 rounded-full inline-flex items-center justify-center gap-2 min-h-[54px] disabled:opacity-60"
          >
            {identitySaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Setting up your account…
              </>
            ) : (
              <>
                Continue to Kira
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-stone-500 leading-relaxed">
            Your beta access, Person identity, Organisation, membership
            and ownership are separate concepts. Kira records each through
            its appropriate canonical boundary.
          </p>
        </form>
      </main>
    </main>
  );
}





