
'use client';

// @public-route

// app/plan/page.tsx
//
// /plan is the universal organisational identity + initial ownership-claim boundary.
//
// Every acquisition path converges here:
//   - organic signup
//   - direct invitation
//   - system invitation
//   - distributor / consultant invitation
//   - beta
//   - paid
//
// The person's provenance tells us HOW they arrived.
// It does NOT establish ownership.
//
// This page therefore establishes, before beta redemption or paid checkout:
//   1. Person identity: first name + last name
//   2. Organisation identity: organisation_id
//   3. Initial ownership declaration, when explicitly checked
//
// An explicit "I am the Owner of this Business" declaration creates the initial
// SELF_DECLARED ownership claim.
//
// The page deliberately does not infer ownership from:
//   - invitation provenance
//   - beta code
//   - email address
//   - being the first person in the system
//   - user_id
//   - subscription
//   - consultant/distributor relationship
//
// Organisation remains the enduring canonical subject.
//
// Pricing and valuation remain downstream of this identity boundary.

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
  Check,
  Loader2,
  Building2,
  UserRound,
  CircleAlert,
} from 'lucide-react';

import { WHO_CAN_SEE_IT } from '@/lib/privacy';
import { computeValuation } from '@/lib/valuation/model';
import {
  formatMoneyApprox,
  formatPrice,
  taxSuffix,
  DEFAULT_CURRENCY,
} from '@/lib/valuation/currency';
import {
  displayedFigures,
} from '@/lib/valuation/displayed';
import {
  priceForProfit,
  PRICE_TIERS,
  FULL_RATE_PERIOD_CAP,
} from '@/lib/valuation/pricing';

import { BetaRedeem } from '@/components/BetaRedeem';
import { BETA_CODE_STORAGE_KEY } from '@/components/BetaCodeCarrier';
import { TermsAgreement, TERMS_VERSION } from '@/components/TermsAgreement';
import { billingCopy } from '@/lib/billing/copy';

import {
  decodeValuationParam,
  readStoredValuation,
  storeValuation,
  type ValuationPayload,
} from '@/lib/valuation/share';

type OrganisationCandidate = {
  organisationId: string;
  name: string;
  tradingName?: string | null;
};

type IdentityState = {
  firstName: string;
  lastName: string;
  organisationId: string;
  organisationName: string;
  isOwner: boolean;
};

type IdentityResponse = {
  signedIn?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  organisationId?: string | null;
  organisationName?: string | null;
  isOwner?: boolean;
};

export default function PlanPage() {
  /*
   * ---------------------------------------------------------------------------
   * VALUATION
   * ---------------------------------------------------------------------------
   */

  const [payload, setPayload] = useState<ValuationPayload | null>(null);
  const [ready, setReady] = useState(false);

  /*
   * ---------------------------------------------------------------------------
   * SESSION / IDENTITY
   * ---------------------------------------------------------------------------
   *
   * /plan must work for both anonymous visitors and already-authenticated
   * visitors.
   *
   * The authenticated account, where available, is authoritative for existing
   * identity. The browser valuation remains useful for an anonymous visitor.
   */

  const [signedIn, setSignedIn] = useState(false);

  const [identityLoading, setIdentityLoading] = useState(true);
  const [identitySaving, setIdentitySaving] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  /*
   * organisationId is NEVER invented here.
   *
   * It may be supplied by the canonical identity endpoint when the person is
   * already associated with an Organisation.
   *
   * For a new person, the identity endpoint is responsible for resolving or
   * creating the Organisation from the explicit Organisation information
   * supplied by the person.
   *
   * This page does not use user_id as organisation identity.
   */

  const [organisationId, setOrganisationId] = useState('');
  const [organisationName, setOrganisationName] = useState('');

  /*
   * Ownership is an explicit declaration.
   *
   * It is NOT inferred from:
   *   - first arrival
   *   - beta invitation
   *   - distributor invitation
   *   - consultant invitation
   *   - email address
   *   - being the only member
   *
   * When persisted, the backend records this as SELF_DECLARED.
   */

  const [isOwner, setIsOwner] = useState(false);

  /*
   * Existing membership/ownership state.
   *
   * This allows an already-established owner to see the page without being
   * treated as though they need to make a second ownership declaration.
   */

  const [ownershipAlreadyEstablished, setOwnershipAlreadyEstablished] =
    useState(false);

  /*
   * ---------------------------------------------------------------------------
   * BILLING
   * ---------------------------------------------------------------------------
   */

  const [billingLive, setBillingLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/billing/mode')
      .then((response) =>
        response.ok ? response.json() : { live: false },
      )
      .then((data) => {
        if (!cancelled) {
          setBillingLive(data?.live === true);
        }
      })
      .catch(() => {
        // Safe default: billing remains non-live.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ---------------------------------------------------------------------------
   * BETA
   * ---------------------------------------------------------------------------
   *
   * Beta provenance survives the valuation round trip in sessionStorage.
   *
   * The existence of a beta code says:
   *
   *   "this person was invited to the beta"
   *
   * It does NOT say:
   *
   *   "this person owns the organisation"
   *
   * Ownership is established independently through the explicit checkbox.
   */

  const BETA_CODE_KEY = BETA_CODE_STORAGE_KEY;

  const [betaCode, setBetaCode] = useState<string | null>(null);
  const [betaOpen, setBetaOpen] = useState(false);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('code');

    if (fromUrl) {
      setBetaCode(fromUrl);
      setBetaOpen(true);

      try {
        window.sessionStorage.setItem(BETA_CODE_KEY, fromUrl);
      } catch {
        // Best effort only.
      }

      return;
    }

    try {
      const kept = window.sessionStorage.getItem(BETA_CODE_KEY);

      if (kept) {
        setBetaCode(kept);
        setBetaOpen(true);
      }
    } catch {
      // Nothing to restore.
    }
  }, []);

  /*
   * ---------------------------------------------------------------------------
   * TERMS
   * ---------------------------------------------------------------------------
   */

  const [termsAccepted, setTermsAccepted] = useState(false);

  /*
   * ---------------------------------------------------------------------------
   * CHECKOUT / GENERAL UI
   * ---------------------------------------------------------------------------
   */

  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * ---------------------------------------------------------------------------
   * VALUATION LOAD
   * ---------------------------------------------------------------------------
   *
   * Account valuation is authoritative where available.
   * Device valuation is fallback only.
   *
   * This follows the existing frozen-baseline behaviour:
   *
   *   account → device → nothing
   */

  useEffect(() => {
    const stored = readStoredValuation();

    const legacy = decodeValuationParam(
      new URLSearchParams(window.location.search).get('v'),
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
        response.ok ? response.json() : null,
      )
      .then((body) => {
        if (cancelled) return;

        setPayload(body?.valuation ?? stored ?? null);
        setSignedIn(Boolean(body?.signedIn));
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

  /*
   * ---------------------------------------------------------------------------
   * CANONICAL IDENTITY LOAD
   * ---------------------------------------------------------------------------
   *
   * This endpoint is intentionally separate from valuation.
   *
   * Valuation answers:
   *   "What is the person's value-gap calculation?"
   *
   * Identity answers:
   *   "Who is this Person and which Organisation are they acting for?"
   *
   * These are separate concerns.
   */

  useEffect(() => {
    let cancelled = false;

    setIdentityLoading(true);

    fetch('/api/identity/plan')
      .then((response) =>
        response.ok ? response.json() : null,
      )
      .then((body: IdentityResponse | null) => {
        if (cancelled) return;

        if (body) {
          setSignedIn(Boolean(body.signedIn));

          setFirstName(body.firstName ?? '');
          setLastName(body.lastName ?? '');

          setOrganisationId(body.organisationId ?? '');
          setOrganisationName(body.organisationName ?? '');

          /*
           * Existing ownership is historical/canonical state.
           *
           * It is not recreated merely because this page is visited again.
           */
          const established = body.isOwner === true;

          setOwnershipAlreadyEstablished(established);

          if (established) {
            setIsOwner(true);
          }
        }
      })
      .catch(() => {
        /*
         * Anonymous visitors are expected to arrive here.
         *
         * Failure to resolve an existing identity is NOT permission to invent
         * an organisation or ownership relationship.
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

  /*
   * ---------------------------------------------------------------------------
   * VALUATION MODEL
   * ---------------------------------------------------------------------------
   */

  const model = useMemo(() => {
    if (!payload) return null;

    const result = computeValuation(payload.inputs);

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
    payload?.currency || DEFAULT_CURRENCY;

  const money = (value: number) =>
    formatMoneyApprox(value, currency);

  const price = (value: number) =>
    formatPrice(value, currency);

  const tax = taxSuffix(currency);

  const copy = billingCopy(billingLive);

  /*
   * ---------------------------------------------------------------------------
   * IDENTITY VALIDATION
   * ---------------------------------------------------------------------------
   */

  const normalisedFirstName = firstName.trim();
  const normalisedLastName = lastName.trim();
  const normalisedOrganisationName =
    organisationName.trim();

  const hasPersonIdentity =
    normalisedFirstName.length > 0 &&
    normalisedLastName.length > 0;

  const hasOrganisation =
    organisationId.trim().length > 0 &&
    normalisedOrganisationName.length > 0;

  /*
   * Ownership is not mandatory merely to view the plan.
   *
   * But before either commercial path proceeds, the person must explicitly
   * declare their relationship to the Organisation.
   *
   * For an already established owner, the declaration is already known.
   */

  const ownershipBoundaryComplete =
    ownershipAlreadyEstablished || isOwner;

  const identityBoundaryComplete =
    hasPersonIdentity &&
    hasOrganisation &&
    ownershipBoundaryComplete;

/*
 * ---------------------------------------------------------------------------
 * SAVE CANONICAL IDENTITY
 * ---------------------------------------------------------------------------
 *
 * The frontend supplies identity facts and the user's explicit ownership
 * declaration.
 *
 * The backend is authoritative for:
 *
 *   Person
 *   Organisation
 *   Organisation Membership
 *   Ownership Period
 *
 * The frontend never manufactures UUIDs and never interprets user_id as
 * organisation_id.
 *
 * An ownership declaration is supplied as a user assertion. The backend
 * determines whether that assertion establishes or changes an Ownership
 * Period and records the appropriate provenance.
 */

async function saveIdentity() {
  setIdentitySaving(true);
  setError(null);

  try {
    const normalisedFirstName = firstName.trim();
    const normalisedLastName = lastName.trim();
    const normalisedOrganisationName = organisationName.trim();

    if (!normalisedFirstName) {
      throw new Error('Please enter your first name.');
    }

    if (!normalisedLastName) {
      throw new Error('Please enter your last name.');
    }

    if (!normalisedOrganisationName) {
      throw new Error('Please enter your organisation name.');
    }

    /*
     * The Plan route is the universal identity / initial ownership boundary.
     *
     * organisationId is deliberately passed explicitly to the identity API.
     * The API is responsible for resolving/validating the canonical
     * organisation context. We never derive organisation identity from
     * auth user_id.
     */
    const response = await fetch('/api/identity/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: normalisedFirstName,
        lastName: normalisedLastName,
        organisationId: organisationId.trim() || null,
        organisationName: normalisedOrganisationName,
        isOwner,
        betaCode: betaCode || undefined,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        result?.error ||
          result?.message ||
          'Unable to save your identity. Please try again.',
      );
    }

    /*
     * The API response is authoritative. If it establishes or confirms
     * the canonical organisation context, retain that organisation ID
     * for subsequent checkout.
     */
    if (result?.organisationId) {
      setOrganisationId(result.organisationId);
    }

    return result;
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unable to save your identity. Please try again.';

    setError(message);
    throw err;
  } finally {
    setIdentitySaving(false);
  }
}

async function startCheckout() {
  setLoading(true);
  setError(null);

  try {
    /*
     * Identity must be persisted before checkout.
     *
     * This ensures the checkout flow is attached to the canonical
     * Organisation rather than implicitly to auth user identity.
     */
    const identity = await saveIdentity();

    const canonicalOrganisationId =
      identity?.organisationId || organisationId.trim();

    if (!canonicalOrganisationId) {
      throw new Error(
        'No organisation context is available for checkout.',
      );
    }

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: payload!.inputs,
        currency: payload?.currency,
        firstName: normalisedFirstName,
        termsAccepted,
      }),
    });

    const result = await response.json().catch(() => null);

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

    window.location.href = result.url;
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

  /*
   * ---------------------------------------------------------------------------
   * FIRST PAINT
   * ---------------------------------------------------------------------------
   */

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
          <h1 className="font-display text-3xl font-bold text-stone-800 mb-4">
            Set free what&apos;s locked in your head
          </h1>

          <p className="font-body text-lg text-stone-600 leading-relaxed">
            Kira is the part-time general manager you
            could never justify hiring. You talk, a few
            minutes at a time; she listens, works out what
            you need, and quietly builds the systems that
            make your business worth more.
          </p>

          <div className="mt-8 rounded-2xl border border-amber-200 bg-white/70 px-5 py-5 text-left">
            <p className="font-body text-stone-700 leading-relaxed">
              <strong className="font-semibold text-stone-900">
                From{' '}
                {formatPrice(
                  PRICE_TIERS[0].monthly,
                  DEFAULT_CURRENCY,
                )}{' '}
                a month
              </strong>
              , priced on the size of your business.
              You are billed{' '}
              <strong className="font-semibold text-stone-900">
                after each month has finished
              </strong>
              , never in advance — cancel before then
              and that month is on us. After{' '}
              {FULL_RATE_PERIOD_CAP} months you move to a
              third of the rate whether or not the work is
              done.
            </p>

            <p className="mt-3 text-sm text-stone-500">
              Your own figure is taken from your account —
              or from this device if you have not signed
              in — and appears in a moment.
            </p>
          </div>
        </main>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------------------------
   * NO VALUATION
   * ---------------------------------------------------------------------------
   */

  if (ready && !model) {
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
                minutes on your business numbers so Kira can
                build everything around them.
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

  /*
   * ---------------------------------------------------------------------------
   * MAIN PAGE
   * ---------------------------------------------------------------------------
   */

  const figures = displayedFigures(
    {
      worthToday: model!.result.today,
      worthPotential: model!.result.potential,
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
            <br className="hidden sm:block" /> Kira helps
            you set it free.
          </h1>

          <p className="font-body text-lg text-stone-600 max-w-2xl mx-auto mt-5 leading-relaxed">
            You don&apos;t do it with spreadsheets and
            consultants. You do it by{' '}
            <span className="font-semibold text-stone-800">
              talking to Kira
            </span>{' '}
            — a few minutes at a time, over the next 4
            weeks and beyond. She listens, works out what
            you need, and quietly builds the systems that
            make your business worth more.
          </p>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* ORGANISATIONAL IDENTITY BOUNDARY                                   */}
        {/* ------------------------------------------------------------------ */}

        <section
          id="organisation"
          className="py-16"
        >
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-violet-600 text-sm font-semibold mb-3">
                <Building2 className="h-4 w-4" />
                First, tell Kira who this is for
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-bold">
                Let&apos;s put your business on the map.
              </h2>

              <p className="text-stone-600 mt-3 leading-relaxed">
                Kira builds a lasting organisational memory,
                so she needs to know the person she is
                speaking with and the Organisation that
                memory belongs to.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-100 shadow-sm">
              <div className="grid sm:grid-cols-2 gap-5">
                <label className="block">
                  <span className="block text-sm font-semibold text-stone-700 mb-2">
                    First name
                  </span>

                  <div className="relative">
                    <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />

                    <input
                      value={firstName}
                      onChange={(event) =>
                        setFirstName(event.target.value)
                      }
                      autoComplete="given-name"
                      placeholder="First name"
                      className="w-full rounded-xl border border-stone-300 bg-white pl-11 pr-4 py-3.5 text-stone-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="block text-sm font-semibold text-stone-700 mb-2">
                    Last name
                  </span>

                  <input
                    value={lastName}
                    onChange={(event) =>
                      setLastName(event.target.value)
                    }
                    autoComplete="family-name"
                    placeholder="Last name"
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3.5 text-stone-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </label>
              </div>

              <label className="block mt-5">
                <span className="block text-sm font-semibold text-stone-700 mb-2">
                  Business / Organisation
                </span>

                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />

                  <input
                    value={organisationName}
                    onChange={(event) => {
                      setOrganisationName(event.target.value);

                      /*
                       * If the person changes the organisation name after an
                       * existing canonical ID was resolved, the old ID must
                       * not silently remain attached to the new name.
                       *
                       * Clearing it forces the backend to resolve the new
                       * organisation explicitly.
                       */
                      if (
                        organisationId &&
                        event.target.value.trim() !==
                          organisationName.trim()
                      ) {
                        setOrganisationId('');
                      }
                    }}
                    autoComplete="organization"
                    placeholder="Your business name"
                    className="w-full rounded-xl border border-stone-300 bg-white pl-11 pr-4 py-3.5 text-stone-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </div>

                <p className="mt-2 text-xs text-stone-500">
                  If your business already exists in Kira,
                  we&apos;ll connect you to the existing
                  Organisation rather than create another one.
                </p>
              </label>

              <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      ownershipAlreadyEstablished ||
                      isOwner
                    }
                    disabled={ownershipAlreadyEstablished}
                    onChange={(event) =>
                      setIsOwner(event.target.checked)
                    }
                    className="mt-1 h-5 w-5 rounded border-stone-300 text-violet-600 focus:ring-violet-500"
                  />

                  <span>
                    <span className="block font-semibold text-stone-900">
                      I am the Owner of this Business
                    </span>

                    <span className="block mt-1 text-sm text-stone-600 leading-relaxed">
                      Check this if you are declaring that
                      you own this Organisation. This creates
                      your initial{' '}
                      <strong>SELF_DECLARED</strong> ownership
                      claim. An invitation or beta code does
                      not establish ownership for you.
                    </span>
                  </span>
                </label>

                {ownershipAlreadyEstablished && (
                  <p className="mt-3 text-xs font-medium text-violet-700">
                    Your ownership relationship is already
                    established for this Organisation.
                  </p>
                )}
              </div>

              {identityError && (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
                  <CircleAlert className="h-5 w-5 mt-0.5 flex-shrink-0" />

                  <p className="text-sm leading-relaxed">
                    {identityError}
                  </p>
                </div>
              )}

              {!identityBoundaryComplete && (
                <div className="mt-5 rounded-2xl bg-stone-50 border border-stone-200 p-4">
                  <p className="text-sm text-stone-600 leading-relaxed">
                    Before you can start Kira, we need your
                    name, your Organisation and your
                    declaration of whether you are its owner.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={saveIdentity}
                disabled={
                  identitySaving ||
                  identityLoading ||
                  !hasPersonIdentity ||
                  !normalisedOrganisationName ||
                  (!ownershipAlreadyEstablished &&
                    !isOwner)
                }
                className="mt-6 grad-genome text-white font-display font-bold px-7 py-3.5 rounded-full inline-flex items-center justify-center gap-2 min-h-[52px] w-full disabled:opacity-50"
              >
                {identitySaving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving your details…
                  </>
                ) : identityBoundaryComplete ? (
                  <>
                    Identity confirmed
                    <Check className="h-5 w-5" />
                  </>
                ) : (
                  <>
                    Confirm my business
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* PROMISE                                                           */}
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
        {/* VALUE + PRICE                                                      */}
        {/* ------------------------------------------------------------------ */}

        <section className="py-16">
          <div className="grad-genome rounded-3xl p-8 sm:p-10 text-white text-center shadow-lg">
            <p className="text-white/80 font-medium">
              You could unlock
            </p>

            <p className="font-display text-4xl sm:text-5xl font-bold mt-1">
              {figures.gapText}
            </p>

            <p className="text-white/90 max-w-lg mx-auto mt-4 leading-relaxed">
              Kira is{' '}
              <span className="font-bold">
                {money(model!.quote.monthly)}
                /month {tax}
              </span>
              {copy.priceQualifier}

              {model!.quote.fractionWorthQuoting ? (
                <>
                  {' '}
                  — about{' '}
                  <span className="font-bold">
                    {model!.quote.fractionOfGapPct}
                  </span>{' '}
                  a year of what you stand to unlock
                </>
              ) : null}
              . It&apos;s the part-time general manager you
              could never justify hiring, at a fraction of
              the cost — plus the time, the calm and the
              handover you can&apos;t put a number on.
            </p>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* COMMERCIAL ACCESS CARD                                           */}
          {/* ---------------------------------------------------------------- */}

          <div className="mt-8 bg-white rounded-3xl p-8 border-2 border-violet-200 shadow-sm max-w-lg mx-auto text-center">
            <span className="text-xs font-body uppercase tracking-wider text-violet-500 font-semibold">
              {model!.quote.label} plan
            </span>

            <p className="font-display text-4xl font-bold text-stone-800 mt-2">
              {money(model!.quote.monthly)}
              <span className="text-lg text-stone-400 font-body">
                /month {tax}
              </span>
            </p>

            {model!.quote.fractionWorthQuoting && (
              <p className="mt-1 text-base text-stone-700">
                <span className="font-semibold text-stone-900">
                  Set by your profit band
                </span>{' '}
                — and about{' '}
                <span className="font-semibold text-violet-700">
                  {model!.quote.fractionOfGapPct}
                </span>{' '}
                a year of what you stand to unlock.
              </p>
            )}

            <p className="text-sm text-stone-500 mt-1">
              {billingLive ? (
                <>
                  Billed at the end of each month, for the
                  month just gone. Cancel any time and the
                  month you are in is on us.
                </>
              ) : (
                <>
                  Free while we are in beta.{' '}
                  {price(model!.quote.monthly)}/month once
                  billing goes live — we will tell you
                  first.
                </>
              )}
            </p>

            {!billingLive && (
              <p className="mt-3 inline-block rounded-full bg-amber-100 text-amber-900 text-xs font-semibold px-3 py-1.5">
                Free while we are in beta — no card charged
              </p>
            )}

            {/* -------------------------------------------------------------- */}
            {/* BENEFITS                                                        */}
            {/* -------------------------------------------------------------- */}

            <ul className="text-left space-y-2.5 my-6 text-stone-700">
              {[
                copy.bullets[0],
                'Always-on Kira — talk anytime, she remembers everything',
                'Kira quietly captures your know-how into an Operating Manual',
                'Your knowledge stays private and yours to keep',
                copy.bullets[1],
                copy.bullets[2],
              ].map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-start gap-2.5 text-sm"
                >
                  <Check className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>

            {/* -------------------------------------------------------------- */}
            {/* IDENTITY GATE                                                   */}
            {/* -------------------------------------------------------------- */}

            {!identityBoundaryComplete && (
              <div className="mb-5 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-left">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-amber-700 mt-0.5 flex-shrink-0" />

                  <div>
                    <p className="font-display font-bold text-stone-900">
                      One last thing before you start
                    </p>

                    <p className="mt-1 text-sm text-stone-600 leading-relaxed">
                      Kira belongs to the Organisation she
                      serves, not to the invitation, email
                      address or person who happened to
                      arrive first. Confirm your name,
                      business and ownership above before
                      choosing beta or paid access.
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

            {/* -------------------------------------------------------------- */}
            {/* PAID CONFIRMATION                                               */}
            {/* -------------------------------------------------------------- */}

            {confirming && (
              <div className="mb-3 rounded-2xl border-2 border-stone-300 bg-white p-4 text-left">
                <p className="font-display font-bold text-stone-900">
                  {copy.confirmTitle}
                </p>

                <p className="mt-1 text-sm text-stone-600 leading-relaxed">
                  {copy.confirmBody(
                    `${money(model!.quote.monthly)} ${tax}`,
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
                    onClick={() => setConfirming(false)}
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

            {/* -------------------------------------------------------------- */}
            {/* PAID CTA                                                        */}
            {/* -------------------------------------------------------------- */}

            <button
              type="button"
              onClick={() => {
                if (!identityBoundaryComplete) {
                  document
                    .getElementById('organisation')
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

            {/* -------------------------------------------------------------- */}
            {/* BETA PATH                                                       */}
            {/* -------------------------------------------------------------- */}

            {betaOpen ? (
              <div className="mt-6">
                <BetaRedeem
                  initialCode={betaCode ?? ''}
                  firstName={normalisedFirstName}
                  organisationId={organisationId.trim()}
                  isOwner={isOwner}
                />
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border-2 border-violet-400 bg-violet-50 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className="h-6 w-6 text-violet-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-stone-900">
                      Been invited to the beta?
                    </h3>

                    <p className="mt-1.5 text-base leading-relaxed text-stone-700">
                      Enter your invitation code below —
                      no card needed, nothing charged.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        if (!identityBoundaryComplete) {
                          document
                            .getElementById('organisation')
                            ?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            });

                          return;
                        }

                        setBetaOpen(true);
                      }}
                      className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-violet-600 px-6 py-3.5 text-base font-bold text-white hover:bg-violet-700 transition-colors sm:w-auto sm:min-w-[240px]"
                    >
                      {identityBoundaryComplete
                        ? 'Enter my invitation code'
                        : 'Confirm my organisation first'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* REQUEST BETA                                                    */}
            {/* -------------------------------------------------------------- */}

            <p className="mt-3 text-sm text-stone-600">
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

            {/* -------------------------------------------------------------- */}
            {/* WHAT SHE DOES                                                   */}
            {/* -------------------------------------------------------------- */}

            <p className="mt-3 text-sm text-stone-500">
              Before you decide:{' '}
              <a
                href="/what-she-does"
                className="font-semibold text-violet-600 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-500"
              >
                what she does, and what she doesn&apos;t
              </a>
              .
            </p>

            {/* -------------------------------------------------------------- */}
            {/* LOGIN                                                           */}
            {/* -------------------------------------------------------------- */}

            <p className="mt-3 text-sm text-stone-500">
              Already have an account?{' '}
              <a
                href="/login"
                className="font-semibold text-violet-600 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-500"
              >
                Sign in
              </a>
              .
            </p>

            <p className="text-xs text-stone-400 mt-3">
              {copy.finePrint(
                `${money(model!.quote.monthly)} ${tax}`,
              )}{' '}
              You set your password and meet Kira right
              after.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* PAGE FOOT                                                          */}
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
 * -----------------------------------------------------------------------------
 * PAGE-SCOPED STYLES
 * -----------------------------------------------------------------------------
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