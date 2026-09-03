// components/UserShell.tsx
//
// AUTHENTICATED USER PORTAL BOUNDARY
//
// UserShell is the boundary between the public/marketing experience and the
// authenticated Kira user portal.
//
// Its responsibilities are deliberately narrow:
//
//   1. Require an authenticated Supabase user.
//   2. Resolve the canonical Organisation context.
//   3. Resolve the Organisation's display name.
//   4. Render the authenticated portal chrome.
//   5. Provide the authenticated user's email to the chrome.
//
// It does NOT:
//   - establish identity
//   - create Organisations
//   - create Persons
//   - establish memberships
//   - establish ownership
//   - resolve legacy users.id
//   - trust a client-supplied organisation_id
//   - enforce Australian business prerequisites
//   - perform onboarding
//
// Identity establishment belongs to /api/identity/plan.
// The portal begins only after canonical organisational context exists.
//
// CANONICAL AUTHORITY
//
//   Supabase Auth
//        ↓
//   auth_credentials
//        ↓
//   persons
//        ↓
//   organisation_memberships
//        ↓
//   organisations
//
// The Organisation is the enduring subject of the authenticated portal.
// The Person is the authenticated human operating within that Organisation.
//
// ONE KIRA
//
// The portal represents one Kira learning one Organisation over time.
// There is deliberately no "My Kiras" / "+ New Kira" navigation here.
//
// The portal chrome is titled with the Organisation name rather than the
// product name wherever possible. The user should feel that they have entered
// their business's environment, not another generic piece of software.

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import {
  getAuthUser,
  getCurrentOrganisationContext,
  isCurrentUserAdmin,
} from '@/lib/auth';

import { createServiceClientV2 } from '@/lib/supabase/server';
import { PortalShell, type NavItem } from '@/components/PortalShell';
import { ClaimStoredValuation } from '@/components/ClaimStoredValuation';
import { BetaFeedbackButton } from '@/components/BetaFeedbackButton';
import { displayedFigures } from '@/lib/valuation/displayed';
import { DEFAULT_CURRENCY } from '@/lib/valuation/currency';

/**
 * Authenticated user navigation.
 *
 * This is intentionally a single-Kira navigation model.
 *
 * The user is not managing a collection of Kiras.
 * They are entering the environment of the Kira that knows their business.
 */
const USER_NAV: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Overview',
  },
  {
    href: '/my-genome',
    label: 'My Genome',
  },
  {
    href: '/drafts',
    label: 'Drafts',
  },
  {
    href: '/requests',
    label: 'Requests',
  },
  {
    href: '/knowledge',
    label: 'Knowledge',
  },
];

/**
 * Display name for the authenticated Organisation.
 *
 * The canonical Organisation table currently exposes `name`.
 *
 * Keep this function deliberately simple. The Organisation itself is the
 * subject of the portal; do not reintroduce business_identity or users.id
 * merely to obtain presentation data.
 */
function shellTitle(
  organisation: { name?: string | null } | null,
): string {
  const name = organisation?.name?.trim();

  return name || 'Kira';
}

/**
 * Existing valuation baseline shown when a stored valuation is being claimed.
 *
 * The valuation is Organisation-scoped. It must therefore be resolved from
 * the canonical Organisation context rather than from the authenticated
 * person's legacy user row.
 */
type ExistingBaseline = {
  gapText: string;
  takenOn: string;
};

/**
 * Resolve the Organisation's display identity.
 *
 * This is intentionally non-fatal.
 *
 * Failure to resolve the presentation name must not destroy the authenticated
 * portal. The canonical Organisation context has already been established by
 * getCurrentOrganisationContext().
 */
async function resolveOrganisationName(
  organisationId: string,
): Promise<string | null> {
  try {
    const supabase = createServiceClientV2();

    const { data, error } = await supabase
      .from('organisations')
      .select('organisation_id, legal_name')
      .eq('organisation_id', organisationId)
      .maybeSingle();

    if (error) {
      console.error(
        '[user-shell] organisation identity lookup failed:',
        error,
      );

      return null;
    }

    return data?.legal_name?.trim() || null;
  } catch (error) {
    console.error(
      '[user-shell] unexpected organisation identity error:',
      error,
    );

    return null;
  }
}

/**
 * Resolve the Organisation's existing valuation baseline.
 *
 * This is only required when the current surface explicitly asks the shell
 * to mount ClaimStoredValuation.
 *
 * The lookup is Organisation-scoped because business_valuations belongs to
 * the Organisation, not to the authenticated Person.
 *
 * Failure is non-fatal.
 */
async function resolveExistingBaseline(
  organisationId: string,
): Promise<ExistingBaseline | null> {
  try {
    const supabase = createServiceClientV2();

    const { data: row, error } = await supabase
      .from('business_valuations')
      .select(
        'worth_today, worth_potential, currency, created_at',
      )
      .eq('organisation_id', organisationId)
      .maybeSingle();

    if (error) {
      console.error(
        '[user-shell] existing valuation lookup failed:',
        error,
      );

      return null;
    }

    if (!row) {
      return null;
    }

    const figures = displayedFigures(
      {
        worthToday: Number(row.worth_today) || 0,
        worthPotential: Number(row.worth_potential) || 0,
      },
      (row.currency as string) || DEFAULT_CURRENCY,
    );

    return {
      gapText: figures.gapText,
      takenOn: new Date(
        String(row.created_at),
      ).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
      }),
    };
  } catch (error) {
    console.error(
      '[user-shell] unexpected valuation lookup error:',
      error,
    );

    return null;
  }
}

export async function UserShell({
  children,
  claimValuation = false,
}: {
  children: ReactNode;
  claimValuation?: boolean;
}) {
  // ===========================================================================
  // 1. AUTHENTICATION
  // ===========================================================================
  //
  // Supabase Auth is the authentication authority.
  //
  // No legacy users lookup belongs here.
  // No client-supplied identity belongs here.
  // No user.id → organisation inference belongs here.

  const authUser = await getAuthUser();

  if (!authUser) {
    redirect('/login');
  }

  // ===========================================================================
  // 2. CANONICAL ORGANISATION CONTEXT
  // ===========================================================================
  //
  // This is the portal boundary.
  //
  // getCurrentOrganisationContext() is responsible for resolving:
  //
  //   authenticated Supabase user
  //          ↓
  //   canonical Person
  //          ↓
  //   active Organisation membership
  //          ↓
  //   Organisation
  //
  // UserShell does not reproduce that resolution logic.
  //
  // If no Organisation context exists, the person is authenticated but has
  // not yet entered an authenticated Organisation portal.
  //
  // That is an onboarding/plan state, not a portal state.

  const organisationContext =
    await getCurrentOrganisationContext();

  if (!organisationContext) {
    redirect('/plan');
  }

  const { organisationId } = organisationContext;

  // ===========================================================================
  // 3. ORGANISATION PRESENTATION IDENTITY
  // ===========================================================================
  //
  // The Organisation is the subject of the portal.
  //
  // Do not use:
  //   - getCurrentAppUser()
  //   - users.id
  //   - business_identity.user_id
  //   - client-supplied organisation_id
  //
  // The context above is the authority for organisationId.

  const organisationName =
    await resolveOrganisationName(organisationId);

  const identity = organisationName
    ? { name: organisationName }
    : null;

  // ===========================================================================
  // 4. OPTIONAL STORED-VALUATION CLAIM
  // ===========================================================================
  //
  // This is deliberately opt-in.
  //
  // UserShell wraps multiple authenticated surfaces. A valuation claim prompt
  // should therefore only exist on surfaces that explicitly request it.
  //
  // The valuation itself is Organisation-scoped.

  const existingBaseline = claimValuation
    ? await resolveExistingBaseline(organisationId)
    : null;

  // ===========================================================================
  // 5. ADMIN STATUS
  // ===========================================================================
  //
  // An operator may enter the user portal, but ordinary customers must never
  // see a route into the Admin console.

  const isOperator = await isCurrentUserAdmin();

  const navigation: NavItem[] = isOperator
    ? [
        ...USER_NAV,
        {
          href: '/admin',
          label: 'Admin console',
        },
      ]
    : USER_NAV;

  // ===========================================================================
  // 6. PORTAL CHROME
  // ===========================================================================

  return (
    <PortalShell
      title={shellTitle(identity)}
      homeHref="/dashboard"
      items={navigation}
      userEmail={authUser.email ?? ''}
    >
      {claimValuation && (
        <ClaimStoredValuation
          existing={existingBaseline}
        />
      )}

      {/*
       * Bottom gutter.
       *
       * Reserve space beneath page content so fixed-position controls or
       * mobile interaction elements cannot obscure the final actionable
       * content of a portal page.
       */}
      <div className="pb-28">
        {children}
      </div>

      {/*
       * Beta feedback is cohort-controlled by the component itself.
       *
       * UserShell supplies the authenticated user and workflow context.
       */}
      <BetaFeedbackButton
        cohort="beta"
        testerId={authUser.id}
        workflow="authenticated"
      />

      {/*
       * NO FLOATING TALK FAB.
       *
       * Kira's presence belongs in the authenticated surfaces themselves.
       * UserShell is the portal boundary, not a place to compensate for pages
       * that fail to expose Kira inline.
       *
       * TalkFab remains available for surfaces that genuinely require it,
       * but it is intentionally not mounted globally here.
       */}
    </PortalShell>
  );
}