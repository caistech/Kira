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
//   BetaRedeem (peek → password → redeem → Auth session)
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
//   2. Create password
//   3. Redeem invitation (creates Auth account)
//   4. Establish Auth session
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
    boundRole?: 'owner' | 'member' | null;
    boundBetaType?: string | null;
  } | null;

  error?: string;
  code?: string;
};

function normaliseString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export default function PlanPage() {
  // ---------------------------------------------------------------------------
  // IDENTITY STATE
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
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [ownershipAlreadyEstablished, setOwnershipAlreadyEstablished] =
    useState(false);

  const [boundOrganisation, setBoundOrganisation] = useState<{
    organisationId: string | null;
    organisationName: string | null;
    boundRole: 'owner' | 'member' | null;
    boundBetaType: string | null;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // BETA CODE (for passing to BetaRedeem as initialCode)
  // ---------------------------------------------------------------------------

  const [initialBetaCode, setInitialBetaCode] = useState('');

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
            boundRole: bound.boundRole === 'owner' ? 'owner' : 'member',
            boundBetaType: normaliseString(bound.boundBetaType),
          });
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

      window.location.assign(becameSuperadmin ? '/manage' : '/dashboard');
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

          <BetaRedeem initialCode={initialBetaCode} />
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
              ? 'You&apos;re joining the Kira beta'
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
                    {boundOrganisation.boundRole === 'owner'
                      ? 'Your invitation grants you owner access to this organisation.'
                      : 'Your invitation grants you membership of this organisation.'}
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
