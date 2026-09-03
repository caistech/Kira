'use client';

// @public-route

// app/plan/page.tsx
//
// Universal organisational identity boundary.
//
// Beta is an ACCESS GATE, not an identity or ownership mechanism.
//
// Flow:
//
//   Beta code
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
// The beta code establishes only:
//   "this person is permitted to enter the beta onboarding path"
//
// It does NOT establish:
//   - Person identity
//   - Organisation identity
//   - Ownership
//   - Membership
//
// The canonical identity API remains the authority for those concerns.

import React, { FormEvent, useEffect, useState } from 'react';
import {
  ArrowRight,
  Brain,
  Building2,
  Check,
  CircleAlert,
  Loader2,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { BETA_CODE_STORAGE_KEY } from '@/components/BetaCodeCarrier';

type IdentityResponse = {
  ok?: boolean;
  signedIn?: boolean;

  firstName?: string | null;
  lastName?: string | null;

  organisationId?: string | null;
  organisationName?: string | null;

  isOwner?: boolean;

  personId?: string | null;
  membershipId?: string | null;
  role?: string | null;

  identity?: {
    organisationId?: string | null;
    organisationName?: string | null;
    personId?: string | null;
    membershipId?: string | null;
    role?: string | null;
  };

  error?: string;
  code?: string;
};

type BetaCheckResponse = {
  ok?: boolean;
  valid?: boolean;
  redeemed?: boolean;
  error?: string;
  code?: string;
};

function normaliseString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export default function PlanPage() {
  // ---------------------------------------------------------------------------
  // BETA ACCESS
  // ---------------------------------------------------------------------------

  const [betaCode, setBetaCode] = useState('');
  const [betaAccepted, setBetaAccepted] = useState(false);
  const [betaChecking, setBetaChecking] = useState(false);
  const [betaError, setBetaError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // IDENTITY
  // ---------------------------------------------------------------------------

  const [identityLoading, setIdentityLoading] = useState(true);
  const [identitySaving, setIdentitySaving] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);

  const [signedIn, setSignedIn] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [organisationId, setOrganisationId] = useState('');
  const [organisationName, setOrganisationName] = useState('');

  const [isOwner, setIsOwner] = useState(false);
  const [ownershipAlreadyEstablished, setOwnershipAlreadyEstablished] =
    useState(false);

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
        setBetaCode(existing);
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
  //
  // This is deliberately independent of beta validation.
  //
  // Beta establishes access.
  // /api/identity/plan establishes canonical identity.
  //
  // The backend, not this page, decides whether the authenticated user is
  // associated with an Organisation.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    setIdentityLoading(true);

    fetch('/api/identity/plan', {
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

        setSignedIn(body.signedIn === true);

        setFirstName(normaliseString(body.firstName));
        setLastName(normaliseString(body.lastName));

        setOrganisationId(existingOrganisationId);
        setOrganisationName(existingOrganisationName);

        setIsOwner(existingOwner);
        setOwnershipAlreadyEstablished(existingOwner);

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
  }, []);

  // ---------------------------------------------------------------------------
  // BETA VALIDATION
  // ---------------------------------------------------------------------------
  //
  // IMPORTANT:
  //
  // Do not manufacture beta validity locally.
  //
  // The page asks the server to validate the supplied code.
  //
  // The endpoint is expected to be the existing beta-code validation boundary.
  // If the application uses a different route name, change ONLY this constant.
  // ---------------------------------------------------------------------------

  async function validateBetaCode(event?: FormEvent) {
    event?.preventDefault();

    const code = normaliseString(betaCode);

    if (!code) {
      setBetaError('Please enter your beta access code.');
      return;
    }

    setBetaChecking(true);
    setBetaError(null);

    try {
      const response = await fetch('/api/beta/peek', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
        }),
      });

      const body = (await response.json()) as BetaCheckResponse;

      if (!response.ok || body.valid !== true) {
        throw new Error(
          body.error || 'That beta access code could not be accepted.',
        );
      }

      try {
        window.sessionStorage.setItem(
          BETA_CODE_STORAGE_KEY,
          code,
        );
      } catch {
        // Best effort only.
      }

      setBetaCode(code);
      setBetaAccepted(true);
      setBetaError(null);
    } catch (error: unknown) {
      setBetaAccepted(false);

      setBetaError(
        error instanceof Error
          ? error.message
          : 'That beta access code could not be accepted.',
      );
    } finally {
      setBetaChecking(false);
    }
  }

  // ---------------------------------------------------------------------------
  // IDENTITY BOUNDARY
  // ---------------------------------------------------------------------------
  //
  // The page submits ONLY explicit identity information.
  //
  // organisationId:
  //   - existing canonical ID when already associated;
  //   - otherwise omitted, allowing the backend to create the Organisation.
  //
  // Never derive organisationId from:
  //   - user.id
  //   - beta code
  //   - email
  //   - browser state
  // ---------------------------------------------------------------------------

  async function saveIdentity(event: FormEvent) {
    event.preventDefault();

    setIdentityError(null);

    const cleanFirstName = normaliseString(firstName);
    const cleanLastName = normaliseString(lastName);
    const cleanOrganisationName = normaliseString(organisationName);
    const cleanOrganisationId = normaliseString(organisationId);
    const cleanBetaCode = normaliseString(betaCode);

    if (!cleanFirstName) {
      setIdentityError('Please enter your first name.');
      return;
    }

    if (!cleanLastName) {
      setIdentityError('Please enter your last name.');
      return;
    }

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

          // Existing canonical organisation only.
          // Empty means "create the organisation from the explicit name".
          organisationId: cleanOrganisationId || undefined,

          // Used only when creating a new organisation.
          organisationName: cleanOrganisationName || undefined,

          // Explicit declaration only.
          isOwner: isOwner === true,

          // Provenance/access context only.
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

      /*
       * The identity API is authoritative.
       *
       * Do not redirect merely because the POST returned 200.
       * Require the canonical organisation identity to be present.
       */

      window.location.assign('/portal');
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
  // BETA GATE
  // ---------------------------------------------------------------------------

  if (!betaAccepted) {
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
          <div className="text-center">
            <div className="grad-genome w-14 h-14 rounded-2xl flex items-center justify-center text-white mx-auto mb-6">
              <ShieldCheck className="h-7 w-7" />
            </div>

            <h1 className="font-display text-3xl font-bold text-stone-900">
              Beta access
            </h1>

            <p className="mt-3 text-stone-600 leading-relaxed">
              Enter your beta access code to continue.
            </p>
          </div>

          <form
            onSubmit={validateBetaCode}
            className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
          >
            <label
              htmlFor="beta-code"
              className="block text-sm font-semibold text-stone-800"
            >
              Beta access code
            </label>

            <input
              id="beta-code"
              name="betaCode"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={betaCode}
              onChange={(event) => {
                setBetaCode(event.target.value);
                setBetaError(null);
              }}
              placeholder="KIRA-XXXX-XXXX"
              className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-lg font-mono tracking-wide text-stone-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              disabled={betaChecking}
            />

            {betaError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex gap-3">
                <CircleAlert className="h-5 w-5 shrink-0" />
                <span>{betaError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={betaChecking || !normaliseString(betaCode)}
              className="mt-5 w-full grad-coral text-white font-display font-bold px-6 py-3 rounded-full inline-flex items-center justify-center gap-2 min-h-[50px] disabled:opacity-60"
            >
              {betaChecking ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Checking code…
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </main>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // IDENTITY / ORGANISATION FORM
  // ---------------------------------------------------------------------------

  const hasCanonicalOrganisation = Boolean(
    normaliseString(organisationId),
  );

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
              Beta access confirmed
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
            Set up your business
          </h1>

          <p className="mt-3 text-stone-600 leading-relaxed max-w-xl mx-auto">
            Before you enter the portal, we need to establish who you are,
            which business you are acting for, and your relationship with it.
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
                  Your business
                </h2>

                <p className="text-sm text-stone-500">
                  The Organisation is the enduring business identity.
                </p>
              </div>
            </div>

            {hasCanonicalOrganisation ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />

                  <div>
                    <p className="font-semibold text-emerald-900">
                      You are already associated with this business
                    </p>

                    <p className="mt-1 text-sm text-emerald-800">
                      {organisationName || 'Your existing organisation'}
                    </p>
                  </div>
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

          {/* OWNERSHIP */}

          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
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
                    : 'This is an explicit ownership declaration. Beta access does not establish ownership.'}
                </p>
              </div>
            </div>
          </section>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={
              identitySaving ||
              !firstName.trim() ||
              !lastName.trim() ||
              (!organisationId && !organisationName.trim()) ||
              (!organisationId && !isOwner)
            }
            className="w-full grad-coral text-white font-display font-bold px-6 py-4 rounded-full inline-flex items-center justify-center gap-2 min-h-[54px] disabled:opacity-60"
          >
            {identitySaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Setting up your business…
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