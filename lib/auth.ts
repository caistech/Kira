// lib/auth.ts
//
// Server-side authentication and canonical organisational identity helpers.
//
// CANONICAL IDENTITY MODEL
// ------------------------
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
// OWNERSHIP IS SEPARATE:
//
//   persons
//        ↓
//   ownership_periods
//
// HARD RULES
// ----------
//
// 1. Supabase Auth user.id is an Auth identity, NOT a Person ID.
// 2. auth_credentials is the ONLY canonical Auth → Person bridge.
// 3. persons.auth_user_id is NOT used.
// 4. users.id is NOT used for canonical identity resolution.
// 5. users.id is NOT used for organisation resolution.
// 6. Existing auth_credentials.person_id is immutable through these helpers.
// 7. An Auth identity must never silently move from Person A to Person B.
// 8. Organisation access requires an active, time-valid organisation membership.
// 9. Client-supplied organisation IDs are never trusted as authority.
// 10. Membership and ownership are separate concepts.
// 11. Ownership is temporal and belongs in ownership_periods.
// 12. role = 'owner' does not by itself prove current ownership.
// 13. role = 'superadmin' is a function/role, not ownership.
// 14. portal_access controls portal eligibility.
// 15. selected_org_id is only honoured when the person has an active,
//     time-valid membership in that organisation.
// 16. If selected_org_id is invalid, resolution falls back to the most
//     recent active, time-valid membership.
// 17. Beta-code data is entitlement/provenance only.
// 18. Beta data cannot establish identity, organisation, membership,
//     ownership, or canonical role.
// 19. No helper in this file creates or repairs legacy users identity links.
// 20. All server-side canonical identity resolution uses the service client
//     because the identity tables may themselves require organisation context.
//
// IMPORTANT
// ---------
//
// This file deliberately contains NO dependency on:
//   users.id
//   users.auth_user_id
//   persons.auth_user_id
//
// The deprecated getCurrentAppUser() compatibility helper resolves through
// the canonical Auth → Person relationship and does NOT consult users.
//

import 'server-only';

import { createSessionClientV2 } from '@/lib/supabase/server-session';
import { createServiceClientV2 } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// ADMIN EMAIL HELPERS
// ---------------------------------------------------------------------------

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

// ---------------------------------------------------------------------------
// AUTH SESSION
// ---------------------------------------------------------------------------

/**
 * Return the authenticated Supabase Auth user for the current request.
 *
 * This is authentication only.
 *
 * It does NOT establish Person, Organisation, Membership, or Ownership
 * authority.
 */

export async function getAuthUser() {
  try {
    const supabase = await createSessionClientV2();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    if (
      error instanceof Error &&
      'digest' in error &&
      error.digest === 'DYNAMIC_SERVER_USAGE'
    ) {
      throw error;
    }

    console.error('[lib/auth] getAuthUser failed:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// CANONICAL TYPES
// ---------------------------------------------------------------------------

export interface OrganisationContext {
  personId: string;
  organisationId: string;
  membershipId: string;
  role: string;
  membershipStatus: string;
  canSpend: boolean;
  validFrom: string;
  validTo: string | null;

  /**
   * Which portal(s) this membership grants:
   *
   *   admin
   *   user
   *   both
   *   null
   */
  portalAccess: 'admin' | 'user' | 'both' | null;
}

export interface UserOrganisationOption {
  organisationId: string;
  membershipId: string;
  name: string;
  role: string;
  isCurrent: boolean;
}

// ---------------------------------------------------------------------------
// INTERNAL CANONICAL TYPES
// ---------------------------------------------------------------------------

interface CanonicalCredential {
  auth_credential_id: string;
  person_id: string | null;
  status: string | null;
  selected_org_id?: string | null;
}

interface CanonicalPerson {
  person_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface CanonicalMembership {
  membership_id: string;
  organisation_id: string;
  person_id: string;
  role: string;
  status: string;
  can_spend?: boolean | null;
  valid_from: string;
  valid_to: string | null;
  portal_access?: 'admin' | 'user' | 'both' | null;
}

interface OrganisationRow {
  organisation_id: string;
  legal_name: string | null;
}

// ---------------------------------------------------------------------------
// INTERNAL HELPERS
// ---------------------------------------------------------------------------

function getNowIso(): string {
  return new Date().toISOString();
}

/**
 * Build a canonical OrganisationContext from a membership row.
 */
function membershipToContext(
  membership: CanonicalMembership,
): OrganisationContext {
  return {
    personId: membership.person_id,
    organisationId: membership.organisation_id,
    membershipId: membership.membership_id,
    role: membership.role,
    membershipStatus: membership.status,
    canSpend: membership.can_spend ?? true,
    validFrom: membership.valid_from,
    validTo: membership.valid_to,
    portalAccess: membership.portal_access ?? null,
  };
}

/**
 * Canonical active/time-valid membership predicate.
 *
 * We deliberately generate the timestamp ourselves rather than relying on
 * PostgreSQL expressions such as:
 *
 *   valid_to.gt.now()
 *
 * because PostgREST filters expect an actual comparison value.
 */
function applyActiveMembershipFilter<T extends {
  eq: Function;
  or: Function;
}>(query: T, now: string): T {
  return query
    .eq('status', 'active')
    .lte('valid_from', now)
    .or(`valid_to.is.null,valid_to.gt.${now}`) as T;
}

// ---------------------------------------------------------------------------
// CANONICAL AUTH → PERSON
// ---------------------------------------------------------------------------

/**
 * Read the canonical Auth → Person credential.
 *
 * auth_credentials is the ONLY bridge between Supabase Auth and persons.
 *
 * IMPORTANT:
 * We intentionally do not require status = 'active' here.
 *
 * An inactive credential may still contain the canonical Person relationship.
 * The relationship itself must never silently be changed.
 */
async function getAuthCredential(
  userId: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<CanonicalCredential | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('auth_credentials')
    .select(
      'auth_credential_id, person_id, status, selected_org_id',
    )
    .eq('auth_user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      '[lib/auth] auth_credentials lookup failed:',
      error,
    );
    throw new Error('AUTH_CREDENTIAL_LOOKUP_FAILED');
  }

  return data;
}

/**
 * Resolve a Person from the canonical Auth → Person credential.
 *
 * This function NEVER:
 *
 * - queries users
 * - queries users.id
 * - queries persons.auth_user_id
 * - resolves by legacy user ID
 */
async function resolvePersonFromAuth(
  userId: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<CanonicalPerson | null> {
  const credential = await getAuthCredential(userId, supabase);

  if (!credential?.person_id) {
    return null;
  }

  const { data: person, error } = await supabase
    .from('persons')
    .select(
      'person_id, first_name, last_name, email',
    )
    .eq('person_id', credential.person_id)
    .maybeSingle();

  if (error) {
    console.error(
      '[lib/auth] canonical Person lookup failed:',
      error,
    );
    throw new Error('PERSON_LOOKUP_FAILED');
  }

  if (!person) {
    console.error(
      '[lib/auth] auth_credentials references missing Person:',
      credential.person_id,
    );
    throw new Error('PERSON_NOT_FOUND');
  }

  return person;
}

// ---------------------------------------------------------------------------
// DEPRECATED COMPATIBILITY HELPER
// ---------------------------------------------------------------------------

/**
 * @deprecated
 *
 * Use:
 *
 *   getCurrentOrganisationContext()
 *   getCurrentOrganisationId()
 *   getCurrentPersonId()
 *
 * instead.
 *
 * This function is retained temporarily so old callers do not immediately
 * break during migration.
 *
 * IMPORTANT:
 *
 * This is NO LONGER a legacy users-table resolver.
 *
 * It resolves the canonical Person through:
 *
 *   Supabase Auth
 *        ↓
 *   auth_credentials
 *        ↓
 *   persons
 *
 * It NEVER:
 *
 *   users.id
 *   users.auth_user_id
 *   email → users row
 *   legacy adoption
 *   organisation resolution
 */
export async function getCurrentAppUser(): Promise<CanonicalPerson | null> {
  const authUser = await getAuthUser();

  if (!authUser) {
    return null;
  }

  try {
    const supabase = createServiceClientV2();

    return await resolvePersonFromAuth(
      authUser.id,
      supabase,
    );
  } catch (error) {
    console.error(
      '[lib/auth] getCurrentAppUser is deprecated and canonical Person resolution failed:',
      error,
    );

    return null;
  }
}

// ---------------------------------------------------------------------------
// CURRENT USER ADMIN CHECK
// ---------------------------------------------------------------------------

/**
 * True when the current authenticated Supabase user has an email on the
 * ADMIN_EMAILS allowlist.
 *
 * This is an operator-level email allowlist check.
 *
 * It is intentionally separate from organisational role authority.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const authUser = await getAuthUser();

  return isAdminEmail(authUser?.email);
}

// ---------------------------------------------------------------------------
// CANONICAL MEMBERSHIP RESOLUTION
// ---------------------------------------------------------------------------

const MEMBERSHIP_SELECT = `
  membership_id,
  organisation_id,
  person_id,
  role,
  status,
  can_spend,
  valid_from,
  valid_to,
  portal_access
`;

/**
 * Resolve one active/time-valid membership for a Person.
 *
 * Selection policy:
 *
 *   1. selected organisation, when explicitly supplied and valid
 *   2. otherwise most recent active/time-valid membership
 *
 * No membership is created or modified.
 */
async function resolveMembershipForPerson(
  personId: string,
  selectedOrganisationId: string | null,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<CanonicalMembership | null> {
  if (!personId) {
    return null;
  }

  const now = getNowIso();

  // -------------------------------------------------------------------------
  // Explicit organisation selection
  // -------------------------------------------------------------------------

  if (selectedOrganisationId) {
    const selectedQuery = supabase
      .from('organisation_memberships')
      .select(MEMBERSHIP_SELECT)
      .eq('person_id', personId)
      .eq('organisation_id', selectedOrganisationId);

    const { data: selected, error: selectedError } =
      await applyActiveMembershipFilter(
        selectedQuery,
        now,
      )
        .order('valid_from', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (selectedError) {
      console.error(
        '[lib/auth] selected organisation membership lookup failed:',
        selectedError,
      );
      throw new Error('MEMBERSHIP_LOOKUP_FAILED');
    }

    if (selected) {
      return selected as CanonicalMembership;
    }
  }

  // -------------------------------------------------------------------------
  // Fallback: most recent active/time-valid membership
  // -------------------------------------------------------------------------

  const fallbackQuery = supabase
    .from('organisation_memberships')
    .select(MEMBERSHIP_SELECT)
    .eq('person_id', personId);

  const { data: fallback, error: fallbackError } =
    await applyActiveMembershipFilter(
      fallbackQuery,
      now,
    )
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle();

  if (fallbackError) {
    console.error(
      '[lib/auth] fallback organisation membership lookup failed:',
      fallbackError,
    );
    throw new Error('MEMBERSHIP_LOOKUP_FAILED');
  }

  return fallback as CanonicalMembership | null;
}

/**
 * Resolve a specific active/time-valid membership for a Person and
 * Organisation.
 *
 * This is an AUTHORISATION check.
 *
 * It does not create, update, upsert, promote, or otherwise alter membership.
 */
async function resolveActiveMembership(
  organisationId: string,
  personId: string,
  supabase: ReturnType<typeof createServiceClientV2>,
): Promise<CanonicalMembership | null> {
  if (!organisationId || !personId) {
    return null;
  }

  const now = getNowIso();

  const query = supabase
    .from('organisation_memberships')
    .select(MEMBERSHIP_SELECT)
    .eq('organisation_id', organisationId)
    .eq('person_id', personId);

  const { data, error } = await applyActiveMembershipFilter(
    query,
    now,
  )
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      '[lib/auth] active membership lookup failed:',
      error,
    );
    throw new Error('MEMBERSHIP_LOOKUP_FAILED');
  }

  return data as CanonicalMembership | null;
}

// ---------------------------------------------------------------------------
// CURRENT ORGANISATION CONTEXT
// ---------------------------------------------------------------------------

/**
 * Resolve the full canonical organisational context for the current session.
 *
 * Canonical chain:
 *
 *   Supabase Auth
 *        ↓
 *   auth_credentials
 *        ↓
 *   persons
 *        ↓
 *   organisation_memberships
 *        ↓
 *   organisations
 *
 * No legacy users-table fallback exists.
 *
 * Returns null when:
 *
 * - there is no authenticated user
 * - no canonical Auth → Person credential exists
 * - the credential has no Person
 * - the Person does not exist
 * - the Person has no active/time-valid membership
 */
export async function getCurrentOrganisationContext(role?: string): Promise<OrganisationContext | null> {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return null;
    }

    const supabase = createServiceClientV2();

    // -----------------------------------------------------------------------
    // AUTH → PERSON
    // -----------------------------------------------------------------------

    const credential = await getAuthCredential(
      authUser.id,
      supabase,
    );

    if (!credential?.person_id) {
      return null;
    }

    // A canonical credential may exist but be inactive. Identity relationship
    // remains authoritative, but organisational access still requires an
    // active credential.
    if (credential.status !== 'active') {
      return null;
    }

    const personId = credential.person_id;

    // -----------------------------------------------------------------------
    // PERSON VERIFICATION
    // -----------------------------------------------------------------------

    const { data: person, error: personError } = await supabase
      .from('persons')
      .select('person_id')
      .eq('person_id', personId)
      .maybeSingle();

    if (personError) {
      console.error(
        '[lib/auth] Person verification failed:',
        personError,
      );
      return null;
    }

    if (!person) {
      console.error(
        '[lib/auth] canonical credential references missing Person:',
        personId,
      );
      return null;
    }

    // -----------------------------------------------------------------------
    // PERSON → MEMBERSHIP
    // -----------------------------------------------------------------------

    const memberships = await supabase
      .from('organisation_memberships')
      .select(MEMBERSHIP_SELECT)
      .eq('person_id', personId)
      .in('role', role ? [role, 'superadmin'] : ['superadmin', 'admin', 'member']);
    const membership = memberships.data?.[0];

    if (!membership) {
      return null;
    }

    return membershipToContext(membership);
  } catch (error) {
    console.error(
      '[lib/auth] Error resolving organisational context:',
      error,
    );

    return null;
  }
}

// ---------------------------------------------------------------------------
// CURRENT ORGANISATION / PERSON CONVENIENCE HELPERS
// ---------------------------------------------------------------------------

/**
 * Return the canonical organisation_id for the current session.
 */
export async function getCurrentOrganisationId(): Promise<string | null> {
  const context = await getCurrentOrganisationContext();

  return context?.organisationId ?? null;
}

/**
 * Return the canonical person_id for the current session.
 */
export async function getCurrentPersonId(): Promise<string | null> {
  const context = await getCurrentOrganisationContext();

  return context?.personId ?? null;
}

// ---------------------------------------------------------------------------
// PERSON'S ORGANISATIONS
// ---------------------------------------------------------------------------

/**
 * List all active/time-valid organisations belonging to a Person.
 *
 * This is used by the organisation switcher.
 *
 * IMPORTANT:
 *
 * personId must already have been obtained from canonical identity.
 * This helper does not resolve a Person from users.id or Auth.
 */
export async function getUserOrganisations(
  personId: string,
  currentOrganisationId: string | null,
): Promise<UserOrganisationOption[]> {
  if (!personId) {
    return [];
  }

  try {
    const supabase = createServiceClientV2();
    const now = getNowIso();

    const query = supabase
      .from('organisation_memberships')
      .select(
        'membership_id, organisation_id, role, status, valid_from, valid_to, portal_access',
      )
      .eq('person_id', personId);

    const { data: memberships, error } =
      await applyActiveMembershipFilter(
        query,
        now,
      )
        .order('valid_from', { ascending: false });

    if (error) {
      console.error(
        '[lib/auth] getUserOrganisations membership lookup failed:',
        error,
      );
      return [];
    }

    if (!memberships || memberships.length === 0) {
      return [];
    }

    // -----------------------------------------------------------------------
    // Resolve organisation display names in one query.
    // -----------------------------------------------------------------------

    const organisationIds = Array.from(
      new Set(
        memberships
          .map((membership) => membership.organisation_id)
          .filter(Boolean),
      ),
    );

    if (organisationIds.length === 0) {
      return [];
    }

    const { data: organisations, error: organisationError } =
      await supabase
        .from('organisations')
        .select('organisation_id, legal_name')
        .in('organisation_id', organisationIds);

    if (organisationError) {
      console.error(
        '[lib/auth] getUserOrganisations organisation lookup failed:',
        organisationError,
      );
      return [];
    }

    const nameByOrganisationId = new Map<
      string,
      string
    >();

    for (const organisation of organisations ?? []) {
      const name =
        typeof organisation.legal_name === 'string'
          ? organisation.legal_name.trim()
          : '';

      nameByOrganisationId.set(
        organisation.organisation_id,
        name || 'Unnamed business',
      );
    }

    return memberships.map((membership) => {
      const organisationId =
        membership.organisation_id as string;

      return {
        organisationId,
        membershipId:
          membership.membership_id as string,
        name:
          nameByOrganisationId.get(organisationId) ??
          'Unnamed business',
        role:
          typeof membership.role === 'string' &&
          membership.role.trim()
            ? membership.role
            : 'member',
        isCurrent:
          organisationId === currentOrganisationId,
      };
    });
  } catch (error) {
    console.error(
      '[lib/auth] getUserOrganisations failed:',
      error,
    );

    return [];
  }
}

// ---------------------------------------------------------------------------
// ROLE HELPERS
// ---------------------------------------------------------------------------

/**
 * Check whether the current session has an exact canonical membership role.
 */
export async function currentUserHasRole(
  requiredRole: string,
): Promise<boolean> {
  if (!requiredRole) {
    return false;
  }

  const context =
    await getCurrentOrganisationContext();

  return context?.role === requiredRole;
}

/**
 * True when the current session's active membership role is owner.
 *
 * NOTE:
 * This is a ROLE check.
 *
 * It is NOT the authoritative ownership-period check.
 */
export async function currentUserIsOwner(): Promise<boolean> {
  return currentUserHasRole('owner');
}

/**
 * True when the current session's active membership role is admin.
 */
export async function currentUserIsAdmin(): Promise<boolean> {
  return currentUserHasRole('admin');
}

// ---------------------------------------------------------------------------
// RESOLVE ORGANISATION FROM TRUSTED AUTH USER ID
// ---------------------------------------------------------------------------

/**
 * Resolve organisational context from a known Auth user ID.
 *
 * This is intended for trusted server-side contexts such as:
 *
 * - HMAC-authenticated agent webhooks
 * - trusted conversation bindings
 * - server-generated identity references
 *
 * The supplied userId MUST already be trusted by the caller.
 *
 * Canonical chain:
 *
 *   auth_user_id
 *        ↓
 *   auth_credentials
 *        ↓
 *   persons
 *        ↓
 *   organisation_memberships
 *
 * users.id is never consulted.
 */
export async function resolveOrganisationFromUser(
  userId: string,
): Promise<OrganisationContext | null> {
  if (!userId) {
    return null;
  }

  try {
    const supabase = createServiceClientV2();

    const credential = await getAuthCredential(
      userId,
      supabase,
    );

    if (!credential?.person_id) {
      return null;
    }

    if (credential.status !== 'active') {
      return null;
    }

    const membership =
      await resolveMembershipForPerson(
        credential.person_id,
        credential.selected_org_id ?? null,
        supabase,
      );

    if (!membership) {
      return null;
    }

    return membershipToContext(membership);
  } catch (error) {
    console.error(
      '[lib/auth] Error resolving organisation from Auth user:',
      error,
    );

    return null;
  }
}

// ---------------------------------------------------------------------------
// RESOLVE ORGANISATION FROM PERSON
// ---------------------------------------------------------------------------

/**
 * Resolve organisational context from a known canonical Person ID.
 *
 * This is the person-keyed counterpart to resolveOrganisationFromUser().
 *
 * IMPORTANT:
 *
 * personId must have been obtained from a trusted/canonical server-side
 * source. This function does not resolve or validate an Auth identity.
 *
 * It resolves:
 *
 *   person_id
 *        ↓
 *   organisation_memberships
 *
 * No users-table authority is involved.
 */
export async function resolveOrganisationForPerson(
  personId: string,
): Promise<OrganisationContext | null> {
  if (!personId) {
    return null;
  }

  try {
    const supabase = createServiceClientV2();

    const membership =
      await resolveMembershipForPerson(
        personId,
        null,
        supabase,
      );

    if (!membership) {
      return null;
    }

    return membershipToContext(membership);
  } catch (error) {
    console.error(
      '[lib/auth] Error resolving organisation from Person:',
      error,
    );

    return null;
  }
}

// ---------------------------------------------------------------------------
// SUPERADMIN
// ---------------------------------------------------------------------------
//
// Superadmin is a FUNCTION/ROLE.
//
// It is distinct from ownership.
//
// Ownership:
//   ownership_periods
//
// Superadmin:
//   organisation_memberships.role = 'superadmin'
//
// Portal requirement:
//   portal_access IN ('admin', 'both')
//
// ---------------------------------------------------------------------------

/**
 * Resolve the current session's superadmin context.
 *
 * Requirements:
 *
 * - authenticated Supabase user
 * - canonical active Auth → Person credential
 * - active/time-valid membership
 * - role = superadmin
 * - portal_access = admin OR both
 */
export async function getSuperadminContext(): Promise<OrganisationContext | null> {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return null;
    }

    const supabase = createServiceClientV2();

    const credential = await getAuthCredential(
      authUser.id,
      supabase,
    );

    if (!credential?.person_id) {
      return null;
    }

    if (credential.status !== 'active') {
      return null;
    }

    const personId = credential.person_id;
    const now = getNowIso();

    const query = supabase
      .from('organisation_memberships')
      .select(MEMBERSHIP_SELECT)
      .eq('person_id', personId)
      .eq('role', 'superadmin')
      .in('portal_access', ['admin', 'both']);

    const { data: membership, error } =
      await applyActiveMembershipFilter(
        query,
        now,
      )
        .order('valid_from', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
      console.error(
        '[lib/auth] superadmin membership lookup failed:',
        error,
      );
      return null;
    }

    if (!membership) {
      return null;
    }

    return membershipToContext(
      membership as CanonicalMembership,
    );
  } catch (error) {
    console.error(
      '[lib/auth] Error resolving superadmin context:',
      error,
    );

    return null;
  }
}

/**
 * Resolve superadmin context from a trusted Auth user ID.
 *
 * No users-table lookup occurs.
 */
export async function resolveSuperadminFromUser(
  userId: string,
): Promise<OrganisationContext | null> {
  if (!userId) {
    return null;
  }

  try {
    const supabase = createServiceClientV2();

    const credential = await getAuthCredential(
      userId,
      supabase,
    );

    if (!credential?.person_id) {
      return null;
    }

    if (credential.status !== 'active') {
      return null;
    }

    const now = getNowIso();

    const query = supabase
      .from('organisation_memberships')
      .select(MEMBERSHIP_SELECT)
      .eq('person_id', credential.person_id)
      .eq('role', 'superadmin')
      .in('portal_access', ['admin', 'both']);

    const { data: membership, error } =
      await applyActiveMembershipFilter(
        query,
        now,
      )
        .order('valid_from', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
      console.error(
        '[lib/auth] resolveSuperadminFromUser membership lookup failed:',
        error,
      );
      return null;
    }

    if (!membership) {
      return null;
    }

    return membershipToContext(
      membership as CanonicalMembership,
    );
  } catch (error) {
    console.error(
      '[lib/auth] Error resolving superadmin from Auth user:',
      error,
    );

    return null;
  }
}

/**
 * True when the current session has a canonical superadmin membership.
 */
export async function currentUserIsSuperadmin(): Promise<boolean> {
  return (await getSuperadminContext()) !== null;
}

// ---------------------------------------------------------------------------
// PORTAL ACCESS
// ---------------------------------------------------------------------------

/**
 * Return the portal access granted by the current active membership.
 */
export async function currentUserPortalAccess(): Promise<
  'admin' | 'user' | 'both' | null
> {
  const context =
    await getCurrentOrganisationContext();

  return context?.portalAccess ?? null;
}

/**
 * True when the current session has user-portal access.
 *
 * Valid values:
 *
 *   user
 *   both
 *
 * A null portal_access value does NOT grant access.
 */
export async function currentUserHasPortalAccess(): Promise<boolean> {
  const portalAccess =
    await currentUserPortalAccess();

  return (
    portalAccess === 'user' ||
    portalAccess === 'both'
  );
}

/**
 * True when the current session has admin-portal access.
 *
 * This is based on canonical membership portal_access,
 * not the ADMIN_EMAILS operator allowlist.
 */
export async function currentUserHasAdminPortalAccess(): Promise<boolean> {
  const portalAccess =
    await currentUserPortalAccess();

  return (
    portalAccess === 'admin' ||
    portalAccess === 'both'
  );
}

// ---------------------------------------------------------------------------
// OWNERSHIP
// ---------------------------------------------------------------------------

/**
 * Determine whether the current Person is the current owner of the current
 * Organisation.
 *
 * IMPORTANT:
 *
 * Membership role and ownership are separate concepts.
 *
 * This function therefore checks ownership_periods rather than simply
 * checking membership.role === 'owner'.
 */// ---------------------------------------------------------------------------
// ORGANISATION LOOKUP
// ---------------------------------------------------------------------------
//
// This helper is intentionally private.
//
// Organisation existence is NOT authority.
// Membership establishes access.
//

async function getOrganisation(
  organisationId: string,
): Promise<OrganisationRow | null> {
  const supabase = createServiceClientV2();

  const { data, error } = await supabase
    .from('organisations')
    .select('organisation_id, legal_name')
    .eq('organisation_id', organisationId)
    .maybeSingle();

  if (error) {
    console.error(
      '[lib/auth] organisation lookup failed:',
      error,
    );
    throw new Error('ORGANISATION_LOOKUP_FAILED');
  }

  return data as OrganisationRow | null;
}