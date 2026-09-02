'use client';

// @public-route

// app/plan/page.tsx
//
// /plan is the universal organisational identity + initial ownership boundary.
//
// Canonical rule:
//
//   Authenticated Person
//          ↓
//      Organisation
//          ↓
//      Membership
//          ↓
//   optional ownership
//
// The browser never invents organisation identity.
// The browser may submit an existing organisationId, but the API must prove
// that the authenticated Person already belongs to that Organisation.
//
// If organisationId is absent, the API establishes a new Organisation from the
// explicit organisation name.
//
// Valuation, pricing, billing, Beta and Stripe remain downstream concerns.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Mic,
  Network,
  Users,
  Brain,
  ShieldCheck,
  Clock,
  HeartHandshake,
  Sparkles,
  Loader2,
  Building2,
  UserRound,
  CircleAlert,
  Check,
} from 'lucide-react';

import { WHO_CAN_SEE_IT } from '@/lib/privacy';
import { computeValuation } from '@/lib/valuation/model';
import {
  formatMoneyApprox,
  formatPrice,
  taxSuffix,
  DEFAULT_CURRENCY,
} from '@/lib/valuation/currency';
import { displayedFigures } from '@/lib/valuation/displayed';
import {
  priceForProfit,
  PRICE_TIERS,
  FULL_RATE_PERIOD_CAP,
} from '@/lib/valuation/pricing';

import { BetaRedeem } from '@/components/BetaRedeem';
import { BETA_CODE_STORAGE_KEY } from '@/components/BetaCodeCarrier';
import {
  TermsAgreement,
  TERMS_VERSION,
} from '@/components/TermsAgreement';
import { billingCopy } from '@/lib/billing/copy';

import {
  decodeValuationParam,
  readStoredValuation,
  storeValuation,
  type ValuationPayload,
} from '@/lib/valuation/share';

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
};

type IdentitySaveResponse = {
  ok?: boolean;

  identity?: {
    organisationId?: string | null;
    organisationName?: string | null;
    personId?: string | null;
    membershipId?: string | null;
    role?: string | null;
  };

  firstName?: string | null;
  lastName?: string | null;

  isOwner?: boolean;

  betaCode?: string;
};

export default function PlanPage() {
  // ---------------------------------------------------------------------------
  // VALUATION
  // ---------------------------------------------------------------------------

  const [payload, setPayload] =
    useState<ValuationPayload | null>(null);

  const [ready, setReady] = useState(false);

  // ---------------------------------------------------------------------------
  // IDENTITY
  // ---------------------------------------------------------------------------

  const [signedIn, setSignedIn] = useState(false);

  const [identityLoading, setIdentityLoading] =
    useState(true);

  const [identitySaving, setIdentitySaving] =
    useState(false);

  const [identityError, setIdentityError] =
    useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  /*
   * IMPORTANT:
   *
   * Empty organisationId means:
   *
   *   "This Person has not yet established an Organisation."
   *
   * It does NOT mean invalid identity.
   *
   * The POST route will create the Organisation when the name is supplied.
   */

  const [organisationId, setOrganisationId] =
    useState('');

  const [organisationName, setOrganisationName] =
    useState('');

  /*
   * Explicit ownership declaration.
   *
   * Never inferred from:
   * - beta
   * - invitation
   * - email
   * - first arrival
   * - membership alone
   */

  const [isOwner, setIsOwner] =
    useState(false);

  const [
    ownershipAlreadyEstablished,
    setOwnershipAlreadyEstablished,
  ] = useState(false);

  // ---------------------------------------------------------------------------
  // BILLING
  // ---------------------------------------------------------------------------

  const [billingLive, setBillingLive] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/billing/mode')
      .then((response) =>
        response.ok
          ? response.json()
          : { live: false },
      )
      .then((data) => {
        if (!cancelled) {
          setBillingLive(data?.live === true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBillingLive(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // BETA
  // ---------------------------------------------------------------------------

  const [betaCode, setBetaCode] =
    useState<string | null>(null);

  const [betaOpen, setBetaOpen] =
    useState(false);

  useEffect(() => {
    const fromUrl =
      new URLSearchParams(window.location.search)
        .get('code');

    if (fromUrl) {
      setBetaCode(fromUrl);
      setBetaOpen(true);

      try {
        window.sessionStorage.setItem(
          BETA_CODE_STORAGE_KEY,
          fromUrl,
        );
      } catch {
        // Best effort only.
      }

      return;
    }

    try {
      const stored =
        window.sessionStorage.getItem(
          BETA_CODE_STORAGE_KEY,
        );

      if (stored) {
        setBetaCode(stored);
        setBetaOpen(true);
      }
    } catch {
      // Best effort only.
    }
  }, []);

  // ---------------------------------------------------------------------------
  // TERMS / CHECKOUT
  // ---------------------------------------------------------------------------

  const [termsAccepted, setTermsAccepted] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [confirming, setConfirming] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // VALUATION LOAD
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const stored = readStoredValuation();

    const legacy = decodeValuationParam(
      new URLSearchParams(window.location.search)
        .get('v'),
    );

    if (legacy) {
      storeValuation(legacy);

      window.history.replaceState(
        null,
        '',
        window.location.pathname,
      );

      setPayload(legacy);
      setReady(true);

      return;
    }

    let cancelled = false;

    fetch('/api/valuation/mine')
      .then((response) =>
        response.ok
          ? response.json()
          : null,
      )
      .then((body) => {
        if (cancelled) return;

        setPayload(
          body?.valuation ??
            stored ??
            null,
        );

        setSignedIn(
          Boolean(body?.signedIn),
        );

        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setPayload(stored ?? null);
          setReady(true);
        }
      });

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

    fetch('/api/identity/plan', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as IdentityResponse;
      })
      .then((body) => {
        if (cancelled || !body) {
          return;
        }

        setSignedIn(
          Boolean(body.signedIn),
        );

        setFirstName(
          body.firstName ?? '',
        );

        setLastName(
          body.lastName ?? '',
        );

        setOrganisationId(
          body.organisationId ?? '',
        );

        setOrganisationName(
          body.organisationName ?? '',
        );

        const established =
          body.isOwner === true;

        setOwnershipAlreadyEstablished(
          established,
        );

        if (established) {
          setIsOwner(true);
        }
      })
      .catch(() => {
        /*
         * GET is intentionally tolerant.
         *
         * Anonymous/public visitors can reach /plan.
         *
         * POST will explicitly report NO_AUTHENTICATED_USER if an unauthenticated
         * browser attempts to establish identity.
         */
      })
      .finally(() => {
        if (!cancelled) {
          setIdentityLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // VALUATION MODEL
  // ---------------------------------------------------------------------------

  const model = useMemo(() => {
    if (!payload) {
      return null;
    }

    const result = computeValuation(
      payload.inputs,
    );

    const quote = priceForProfit(
      payload.inputs.annualProfit,
      result.gap,
    );

    return {
      result,
      quote,
    };
  }, [payload]);

  const currency =
    payload?.currency ||
    DEFAULT_CURRENCY;

  const money = (value: number) =>
    formatMoneyApprox(
      value,
      currency,
    );

  const price = (value: number) =>
    formatPrice(
      value,
      currency,
    );

  const tax =
    taxSuffix(currency);

  const copy =
    billingCopy(billingLive);

  // ---------------------------------------------------------------------------
  // IDENTITY VALIDATION
  // ---------------------------------------------------------------------------

  const normalisedFirstName =
    firstName.trim();

  const normalisedLastName =
    lastName.trim();

  const normalisedOrganisationName =
    organisationName.trim();

  const hasPersonIdentity =
    normalisedFirstName.length > 0 &&
    normalisedLastName.length > 0;

  /*
   * Organisation identity is complete when:
   *
   *   existing canonical organisation ID exists
   *
   * OR
   *
   *   new organisation has an explicit name.
   *
   * We deliberately do NOT require organisationId for a new Organisation.
   */

  const hasOrganisation =
    organisationId.trim().length > 0 ||
    normalisedOrganisationName.length > 0;

  const ownershipBoundaryComplete =
    ownershipAlreadyEstablished ||
    isOwner;

  const identityBoundaryComplete =
    hasPersonIdentity &&
    hasOrganisation &&
    ownershipBoundaryComplete;

  // ---------------------------------------------------------------------------
  // SAVE CANONICAL IDENTITY
  // ---------------------------------------------------------------------------

  async function saveIdentity(): Promise<IdentitySaveResponse> {
    setIdentitySaving(true);
    setIdentityError(null);
    setError(null);

    try {
      if (!normalisedFirstName) {
        throw new Error(
          'Please enter your first name.',
        );
      }

      if (!normalisedLastName) {
        throw new Error(
          'Please enter your last name.',
        );
      }

      if (!normalisedOrganisationName) {
        throw new Error(
          'Please enter your business name.',
        );
      }

      if (!isOwner && !ownershipAlreadyEstablished) {
        throw new Error(
          'Please confirm your relationship to the business.',
        );
      }

      /*
       * The browser submits facts/assertions.
       *
       * The API determines the canonical Organisation.
       *
       * In particular:
       *
       *   organisationId === ''
       *
       * is a valid request for creating a new Organisation.
       */

      const response = await fetch(
        '/api/identity/plan',
        {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            firstName:
              normalisedFirstName,

            lastName:
              normalisedLastName,

            organisationId:
              organisationId.trim() ||
              undefined,

            organisationName:
              normalisedOrganisationName,

            isOwner,

            betaCode:
              betaCode ||
              undefined,
          }),
        },
      );

      const result =
        (await response.json().catch(
          () => null,
        )) as
          | IdentitySaveResponse
          | {
              error?: string;
              message?: string;
              code?: string;
            }
          | null;

      if (!response.ok) {
        const message =
          result &&
          'error' in result
            ? result.error
            : null;

        /*
         * Give the authentication failure a useful UI message.
         *
         * This is the expected result if someone reaches /plan without an
         * authenticated Supabase session.
         */
        if (
          response.status === 401
        ) {
          throw new Error(
            'Your session has expired. Please sign in and return here to continue.',
          );
        }

        throw new Error(
          message ||
            (
              result &&
              'message' in result
                ? result.message
                : null
            ) ||
            'Unable to save your identity. Please try again.',
        );
      }

      if (
        !result ||
        !('identity' in result) ||
        !result.identity
      ) {
        throw new Error(
          'Identity was saved but no canonical organisation was returned.',
        );
      }

      const canonicalOrganisationId =
        result.identity.organisationId;

      if (!canonicalOrganisationId) {
        throw new Error(
          'Identity was saved but no canonical organisation was returned.',
        );
      }

      /*
       * Server response is authoritative.
       *
       * Do not manufacture or derive the Organisation ID locally.
       */

      setOrganisationId(
        canonicalOrganisationId,
      );

      setOrganisationName(
        result.identity
          .organisationName ??
          normalisedOrganisationName,
      );

      setSignedIn(true);

      setIdentityError(null);

      return result;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to save your identity. Please try again.';

      setIdentityError(message);
      setError(message);

      throw err;
    } finally {
      setIdentitySaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // START CHECKOUT
  // ---------------------------------------------------------------------------

  async function startCheckout() {
    if (!identityBoundaryComplete) {
      document
        .getElementById(
          'organisation',
        )
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });

      return;
    }

    setLoading(true);
    setError(null);

    try {
      /*
       * Identity is always persisted immediately before checkout.
       *
       * This guarantees that the commercial flow has a canonical Organisation
       * before it leaves this page.
       */

      const identity =
        await saveIdentity();

      const canonicalOrganisationId =
        identity.identity
          ?.organisationId ||
        organisationId.trim();

      if (!canonicalOrganisationId) {
        throw new Error(
          'No canonical organisation context is available for checkout.',
        );
      }

      const response = await fetch(
        '/api/checkout',
        {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            inputs:
              payload!.inputs,

            currency:
              payload?.currency,

            firstName:
              normalisedFirstName,

            termsAccepted,
          }),
        },
      );

      const result =
        await response.json().catch(
          () => null,
        );

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            'Unable to start checkout. Please try again.',
        );
      }

      if (!result?.url) {
        throw new Error(
          'Checkout could not be started because no checkout URL was returned.',
        );
      }

      window.location.href =
        result.url;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to start checkout. Please try again.';

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // FIRST PAINT
  // ---------------------------------------------------------------------------

  if (!ready) {
    return (
      <div className="min-h-screen bg-amber-50 text-stone-800 font-body">
        <PageStyles />

        <header className="sticky top-0 z-40 bg-amber-50/85 backdrop-blur border-b border-amber-200/60">
          <div className="max-w-4xl mx-auto px-5 py-3">
            <a
              href="/"
              className="font-display font-bold text-xl bg-gradient-to-r from-amber-500 via-pink-500 to-violet-500 bg-clip-text text-transparent"
            >
              Kira
            </a>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-5 py-24 text-center">
          <div className="grad-genome w-14 h-14 rounded-2xl flex items-center justify-center text-white mx-auto mb-6">
            <Brain className="h-7 w-7" />
          </div>

          <h1 className="font-display text-3xl font-bold text-stone-800 mb-4">
            Set free what&apos;s in your head.
          </h1>

          <p className="text-stone-600">
            Loading your plan…
          </p>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // NO VALUATION
  // ---------------------------------------------------------------------------

  if (!model) {
    return (
      <div className="min-h-screen bg-amber-50 text-stone-800 font-body">
        <PageStyles />

        <header className="sticky top-0 z-40 bg-amber-50/85 backdrop-blur border-b border-amber-200/60">
          <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between">
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

        <main className="max-w-2xl mx-auto px-5 py-24 text-center">
          <div className="grad-genome w-14 h-14 rounded-2xl flex items-center justify-center text-white mx-auto mb-6">
            <Brain className="h-7 w-7" />
          </div>

          {betaCode && (
            <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-left">
              <p className="font-semibold text-stone-900">
                Your invitation code is saved
              </p>

              <p className="mt-1 text-base leading-relaxed text-stone-700">
                We have kept{' '}
                <span className="font-mono font-semibold">
                  {betaCode}
                </span>{' '}
                for this visit. First, we need a few
                minutes on your business numbers so Kira
                can build everything around them.
              </p>
            </div>
          )}

          <h1 className="font-display text-2xl font-bold mb-3">
            {betaCode
              ? 'First, your number'
              : signedIn
                ? 'We could not read your number'
                : "Let's find your number first"}
          </h1>

          <p className="text-stone-600 mb-8">
            This page is built around the value gap in
            your business. We could not read one just now —
            if you have run the valuation before, sign in
            and it will be here; otherwise it takes about
            three minutes and brings you right back.
          </p>

          <a
            href="/business-valuation"
            className="grad-coral text-white font-display font-bold px-8 py-4 rounded-full inline-flex items-center gap-2 min-h-[52px]"
          >
            Find my gap
            <ArrowRight className="h-5 w-5" />
          </a>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN PAGE
  // ---------------------------------------------------------------------------

  const figures = displayedFigures(
    {
      worthToday:
        model.result.today,

      worthPotential:
        model.result.potential,
    },
    currency,
  );

  return (
    <div className="min-h-screen bg-amber-50 text-stone-800 font-body">
      <PageStyles />

      <header className="sticky top-0 z-40 bg-amber-50/85 backdrop-blur border-b border-amber-200/60">
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between">
          <a
            href="/"
            className="font-display font-bold text-xl bg-gradient-to-r from-amber-500 via-pink-500 to-violet-500 bg-clip-text text-transparent"
          >
            Kira
          </a>

          <a
            href="/business-valuation"
            className="text-sm text-stone-500 hover:text-pink-500 min-h-[44px] flex items-center"
          >
            Redo my valuation
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5">

        {/* ------------------------------------------------------------------ */}
        {/* HERO                                                               */}
        {/* ------------------------------------------------------------------ */}

        <section className="grad-hero -mx-5 px-5 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 text-pink-600 text-sm font-semibold mb-4">
            <Sparkles className="h-4 w-4" />
            You&apos;ve seen the gap
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-bold text-stone-800 leading-tight max-w-2xl mx-auto">
            There&apos;s{' '}
            <span className="bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">
              {figures.gapText}
            </span>{' '}
            locked in your head.
          </h1>

          <p className="text-stone-600 max-w-2xl mx-auto mt-6 text-base sm:text-lg leading-relaxed">
            Kira turns the knowledge that currently lives
            in your head into the systems, processes and
            operating knowledge your business can rely on.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto mt-10">
            <div className="bg-white/80 rounded-2xl p-5 border border-amber-100">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">
                Worth today
              </p>
              <p className="font-display text-2xl font-bold mt-1">
                {figures.worthTodayText}
              </p>
            </div>

            <div className="bg-white/80 rounded-2xl p-5 border border-amber-100">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">
                Potential
              </p>
              <p className="font-display text-2xl font-bold mt-1">
                {figures.worthPotentialText}
              </p>
            </div>

            <div className="bg-white/80 rounded-2xl p-5 border border-amber-100">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">
                Value gap
              </p>
              <p className="font-display text-2xl font-bold mt-1 text-violet-600">
                {figures.gapText}
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* IDENTITY                                                           */}
        {/* ------------------------------------------------------------------ */}

        <section
          id="organisation"
          className="py-16"
        >
          <div className="max-w-2xl mx-auto">

            <div className="text-center mb-8">
              <div className="grad-genome w-12 h-12 rounded-2xl flex items-center justify-center text-white mx-auto mb-4">
                <Building2 className="h-6 w-6" />
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-bold">
                First, let&apos;s put Kira in the right business.
              </h2>

              <p className="text-stone-600 mt-3 leading-relaxed">
                Kira belongs to the Organisation she serves.
                Your name identifies you as a Person; it does
                not become the identity of the business.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-amber-100 shadow-sm p-6 sm:p-8 space-y-6">

              {/* PERSON */}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <UserRound className="h-5 w-5 text-violet-500" />

                  <h3 className="font-display font-bold">
                    Your name
                  </h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm font-semibold text-stone-700 mb-1.5">
                      First name
                    </span>

                    <input
                      value={firstName}
                      onChange={(event) =>
                        setFirstName(
                          event.target.value,
                        )
                      }
                      autoComplete="given-name"
                      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-semibold text-stone-700 mb-1.5">
                      Last name
                    </span>

                    <input
                      value={lastName}
                      onChange={(event) =>
                        setLastName(
                          event.target.value,
                        )
                      }
                      autoComplete="family-name"
                      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  </label>
                </div>
              </div>

              {/* ORGANISATION */}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-5 w-5 text-pink-500" />

                  <h3 className="font-display font-bold">
                    Your business
                  </h3>
                </div>

                <label className="block">
                  <span className="block text-sm font-semibold text-stone-700 mb-1.5">
                    Business name
                  </span>

                  <input
                    value={organisationName}
                    onChange={(event) =>
                      setOrganisationName(
                        event.target.value,
                      )
                    }
                    disabled={
                      Boolean(
                        organisationId,
                      )
                    }
                    autoComplete="organization"
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-stone-50 disabled:text-stone-500"
                  />
                </label>

                {organisationId && (
                  <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <div className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />

                      <div>
                        <p className="font-semibold text-emerald-800">
                          Organisation confirmed
                        </p>

                        <p className="text-sm text-emerald-700 mt-0.5">
                          {organisationName}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* OWNERSHIP */}

              <div>
                <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <input
                    id="owner-declaration"
                    type="checkbox"
                    checked={isOwner}
                    disabled={
                      ownershipAlreadyEstablished
                    }
                    onChange={(event) =>
                      setIsOwner(
                        event.target.checked,
                      )
                    }
                    className="mt-1 h-5 w-5 rounded border-stone-300 text-violet-600 focus:ring-violet-500"
                  />

                  <label
                    htmlFor="owner-declaration"
                    className="cursor-pointer"
                  >
                    <span className="font-semibold text-stone-900">
                      I am the Owner of this Business
                    </span>

                    <span className="block text-sm text-stone-600 mt-1 leading-relaxed">
                      This is an explicit declaration about
                      your relationship with the Organisation.
                      Kira does not infer ownership from an
                      invitation, beta code, email address or
                      simply being the first person here.
                    </span>
                  </label>
                </div>

                {ownershipAlreadyEstablished && (
                  <p className="mt-2 text-sm text-emerald-700">
                    Your existing ownership relationship is
                    already recorded.
                  </p>
                )}
              </div>

              {/* SAVE */}

              <button
                type="button"
                onClick={async () => {
                  try {
                    await saveIdentity();
                  } catch {
                    // Error already displayed.
                  }
                }}
                disabled={
                  identitySaving ||
                  identityLoading ||
                  !hasPersonIdentity ||
                  !hasOrganisation ||
                  (!isOwner &&
                    !ownershipAlreadyEstablished)
                }
                className="grad-coral text-white font-display font-bold px-7 py-4 rounded-full text-base inline-flex items-center justify-center gap-2 min-h-[52px] w-full disabled:opacity-50"
              >
                {identitySaving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    Confirm my business
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              {identityError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <div className="flex gap-2">
                    <CircleAlert className="h-5 w-5 text-rose-500 flex-shrink-0" />

                    <p className="text-sm text-rose-700 leading-relaxed">
                      {identityError}
                    </p>
                  </div>
                </div>
              )}

              {!signedIn && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-stone-600">
                  <p>
                    You need to be signed in before Kira
                    can establish your business identity.
                  </p>

                  <a
                    href="/login"
                    className="inline-flex items-center gap-1 mt-2 font-semibold text-violet-600 underline underline-offset-4"
                  >
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              )}

            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* HOW KIRA WORKS                                                     */}
        {/* ------------------------------------------------------------------ */}

        <section className="py-16">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-3">
            What happens when you talk to Kira
          </h2>

          <p className="text-center text-stone-600 max-w-2xl mx-auto mb-8">
            You only ever talk to Kira. Behind her is
            software that does the work and keeps the
            record — not a room of people reading
            transcripts. {WHO_CAN_SEE_IT}
          </p>

          <p className="text-center mb-12">
            <a
              href="/sample-genome"
              className="text-violet-600 font-semibold underline decoration-violet-300 underline-offset-4 hover:decoration-violet-500 min-h-[44px] inline-flex items-center"
            >
              See an example of what you end up with →
            </a>
          </p>

          <div className="space-y-4">
            {[
              {
                icon: <Mic className="h-5 w-5" />,
                title: 'Kira listens & clarifies',
                body: 'You talk about a job, a headache, a process. Kira asks the questions a good operator would until she knows exactly what you need.',
              },
              {
                icon: <Network className="h-5 w-5" />,
                title: 'She lines up the work',
                body: 'Kira turns what you said into a clear set of tasks — exactly the pieces of work that actually need doing.',
              },
              {
                icon: <Users className="h-5 w-5" />,
                title: 'The work gets done — and written down',
                body: 'The tasks get completed and recorded, so what you know about your business stops living only in your head.',
              },
              {
                icon: <Brain className="h-5 w-5" />,
                title: 'Kira remembers it — instantly',
                body: 'Everything you tell Kira is remembered, so next time she already knows and picks up right where you left off.',
              },
              {
                icon: <ShieldCheck className="h-5 w-5" />,
                title: 'Your knowledge stays yours',
                body: 'It is never shown to a buyer and never shared with anyone who referred you. The handover document leaves out your own position — your plans, your circumstances, what you would accept.',
              },
            ].map((step, index) => (
              <div
                key={step.title}
                className="flex gap-4 items-start bg-white rounded-2xl p-5 border border-amber-100"
              >
                <div className="grad-coral text-white w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                  {step.icon}
                </div>

                <div>
                  <span className="text-xs font-bold text-stone-400">
                    STEP {index + 1}
                  </span>

                  <h3 className="font-display font-bold text-lg">
                    {step.title}
                  </h3>

                  <p className="text-stone-600 text-sm leading-relaxed mt-1">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* PROMISE                                                            */}
        {/* ------------------------------------------------------------------ */}

        <section className="py-16">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-3">
            Just talk. Kira does the building.
          </h2>

          <p className="text-center text-stone-600 max-w-2xl mx-auto mb-12">
            The knowledge that makes your business run is
            already in your head. Kira&apos;s job is to get it
            out — into documented, transferable systems —
            without you stopping to write any of it down.
          </p>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                icon: <Clock className="h-6 w-6" />,
                title: 'Time back, from week one',
                body: 'The jobs that only you can do start becoming jobs your systems can do. You get hours back before the month is out.',
              },
              {
                icon: <HeartHandshake className="h-6 w-6" />,
                title: 'Less carried in your head',
                body: 'The mental load of being the only one who knows how it all works starts to lift. Less stress, fewer 2am worries.',
              },
              {
                icon: <Users className="h-6 w-6" />,
                title: 'A business, not a job',
                body: 'As the systems build, the business leans on you less — better handovers, a calmer team, and a real asset forming.',
              },
              {
                icon: <Brain className="h-6 w-6" />,
                title: 'A living Operating Manual',
                body: 'Everything Kira captures becomes your Operating Manual: how the business actually runs, yours to keep and hand over.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm"
              >
                <div className="grad-genome w-11 h-11 rounded-xl flex items-center justify-center text-white mb-4">
                  {card.icon}
                </div>

                <h3 className="font-display font-bold text-lg mb-1.5">
                  {card.title}
                </h3>

                <p className="text-stone-600 text-sm leading-relaxed">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* ACCESS                                                             */}
        {/* ------------------------------------------------------------------ */}

        <section className="py-16">
          <div className="max-w-2xl mx-auto">

            <div className="rounded-3xl bg-white border border-amber-100 shadow-sm p-6 sm:p-8">

              <div className="flex items-start gap-4 mb-6">
                <div className="grad-genome w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  <Brain className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold">
                    Your Kira plan
                  </h2>

                  <p className="text-sm text-stone-600 mt-1">
                    {model.quote.periodLabel ??
                      'Your plan'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5 mb-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">
                      Monthly
                    </p>

                    <p className="font-display text-3xl font-bold">
                      {money(
                        model.quote.monthly,
                      )}
                    </p>

                    <p className="text-xs text-stone-500 mt-1">
                      {tax}
                    </p>
                  </div>

                  <div className="text-right text-sm text-stone-500">
                    <p>
                      Based on your valuation
                    </p>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------------ */}
              {/* IDENTITY GATE                                                */}
              {/* ------------------------------------------------------------ */}

              {!identityBoundaryComplete && (
                <div className="mb-5 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <div className="flex items-start gap-3">
                    <CircleAlert className="h-5 w-5 text-violet-600 flex-shrink-0 mt-0.5" />

                    <div>
                      <p className="font-display font-bold text-stone-900">
                        One last thing before you start
                      </p>

                      <p className="mt-1 text-sm text-stone-600 leading-relaxed">
                        Confirm your name, business and
                        ownership above first. Kira needs to
                        know which Organisation she belongs to
                        before beta or paid access begins.
                      </p>

                      <a
                        href="#organisation"
                        className="mt-3 inline-flex items-center gap-2 font-semibold text-violet-600 underline decoration-violet-300 underline-offset-4"
                      >
                        Confirm my organisation
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------ */}
              {/* PAID CONFIRMATION                                            */}
              {/* ------------------------------------------------------------ */}

              {confirming && (
                <div className="mb-3 rounded-2xl border-2 border-stone-300 bg-white p-4 text-left">
                  <p className="font-display font-bold text-stone-900">
                    {copy.confirmTitle}
                  </p>

                  <p className="mt-1 text-sm text-stone-600 leading-relaxed">
                    {copy.confirmBody(
                      `${money(
                        model.quote.monthly,
                      )} ${tax}`,
                    )}
                  </p>

                  <TermsAgreement
                    checked={termsAccepted}
                    onChange={setTermsAccepted}
                    id="terms-paid"
                  />

                  <div className="mt-3 flex flex-wrap gap-2">

                    <button
                      type="button"
                      onClick={startCheckout}
                      disabled={
                        loading ||
                        !termsAccepted ||
                        !identityBoundaryComplete
                      }
                      className="grad-coral text-white font-display font-bold px-6 py-3 rounded-full inline-flex items-center gap-2 min-h-[48px] disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Starting…
                        </>
                      ) : (
                        <>
                          Continue to Stripe
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setConfirming(false)
                      }
                      className="rounded-full border border-stone-300 bg-white px-6 py-3 font-semibold text-stone-700 min-h-[48px]"
                    >
                      Not yet
                    </button>

                  </div>

                  {!termsAccepted && (
                    <p className="mt-2 text-sm text-stone-500">
                      Tick the box above to continue.
                    </p>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------ */}
              {/* PAID CTA                                                     */}
              {/* ------------------------------------------------------------ */}

              <button
                type="button"
                onClick={() => {
                  if (!identityBoundaryComplete) {
                    document
                      .getElementById(
                        'organisation',
                      )
                      ?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });

                    return;
                  }

                  setConfirming(true);
                }}
                disabled={loading}
                className="grad-coral text-white font-display font-bold px-8 py-4 rounded-full text-lg inline-flex items-center gap-2 min-h-[52px] shadow-lg shadow-pink-200 w-full justify-center disabled:opacity-60"
              >
                {copy.cta}
                <ArrowRight className="h-5 w-5" />
              </button>

              {error && (
                <p className="text-rose-600 text-sm mt-3">
                  {error}
                </p>
              )}

              {/* ------------------------------------------------------------ */}
              {/* BETA                                                         */}
              {/* ------------------------------------------------------------ */}

              {betaOpen ? (
                <div className="mt-6">

                  <BetaRedeem
                    initialCode={
                      betaCode ?? ''
                    }
                    onRedeemed={() => {
                      /*
                       * Beta redemption owns the beta transaction.
                       *
                       * Identity has already been established above.
                       */
                      setBetaOpen(false);
                    }}
                  />

                </div>
              ) : (
                <div className="mt-6 text-center">

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !identityBoundaryComplete
                      ) {
                        document
                          .getElementById(
                            'organisation',
                          )
                          ?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                          });

                        return;
                      }

                      setBetaOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-300 bg-white px-6 py-3 font-display font-bold text-violet-700 min-h-[48px] hover:bg-violet-50"
                  >
                    I have an invitation code
                    <ArrowRight className="h-4 w-4" />
                  </button>

                </div>
              )}

              {/* ------------------------------------------------------------ */}
              {/* REQUEST BETA                                                 */}
              {/* ------------------------------------------------------------ */}

              <p className="mt-3 text-sm text-stone-600 text-center">
                No beta tester code but want to try it
                out?{' '}
                <a
                  href="mailto:dennis@corporateaisolutions.com"
                  className="font-semibold text-violet-600 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-500"
                >
                  Email Dennis
                </a>{' '}
                requesting a code, or{' '}
                <a
                  href="https://www.linkedin.com/in/denniskl/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-violet-600 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-500"
                >
                  connect on LinkedIn
                </a>{' '}
                and request one there.
              </p>

              <p className="mt-3 text-sm text-stone-500 text-center">
                Before you decide:{' '}
                <a
                  href="/what-she-does"
                  className="font-semibold text-violet-600 underline decoration-violet-300 underline-offset-4"
                >
                  what she does, and what she doesn&apos;t
                </a>
                .
              </p>

              <p className="mt-3 text-sm text-stone-500 text-center">
                Already have an account?{' '}
                <a
                  href="/login"
                  className="font-semibold text-violet-600 underline decoration-violet-300 underline-offset-4"
                >
                  Sign in
                </a>
                .
              </p>

              <p className="text-xs text-stone-400 mt-3 text-center">
                {copy.finePrint(
                  `${money(
                    model.quote.monthly,
                  )} ${tax}`,
                )}{' '}
                You set your password and meet Kira right
                after.
              </p>

            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* FOOT                                                               */}
        {/* ------------------------------------------------------------------ */}

        <div className="py-10 text-center text-sm text-stone-400 border-t border-amber-100">
          <a
            href="/business-valuation"
            className="hover:text-pink-500"
          >
            Redo my valuation
          </a>
        </div>

      </main>
    </div>
  );
}

/*
 * ---------------------------------------------------------------------------
 * PAGE-SCOPED STYLES
 * ---------------------------------------------------------------------------
 */

function PageStyles() {
  return (
    <style>{`
      .font-display {
        font-family:
          var(--font-display),
          'Outfit',
          ui-sans-serif,
          sans-serif;
      }

      .font-body {
        font-family:
          var(--font-body),
          'DM Sans',
          ui-sans-serif,
          sans-serif;
      }

      .grad-hero {
        background:
          radial-gradient(
            ellipse at 25% 15%,
            rgba(251, 191, 36, .25),
            transparent 55%
          ),
          radial-gradient(
            ellipse at 80% 60%,
            rgba(167, 139, 250, .22),
            transparent 55%
          ),
          linear-gradient(
            135deg,
            #fffbeb,
            #fef3c7 55%,
            #fce7f3
          );
      }

      .grad-coral {
        background:
          linear-gradient(
            135deg,
            #fb7185,
            #f472b6
          );
      }

      .grad-genome {
        background:
          linear-gradient(
            135deg,
            #a78bfa,
            #8b5cf6 60%,
            #f472b6
          );
      }
    `}</style>
  );
}