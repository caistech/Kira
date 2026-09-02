// lib/auth.ts
// Server-side auth helpers shared by the user + admin portals.
//
// Identity model (P0.5 canonical):
//   Supabase Auth
//        → auth_credentials
//        → persons
//        → organisation_memberships
//        → organisations
//
// P0.5 Step 6: Retirement of Legacy Authority
//   - getCurrentOrganisationContext() uses ONLY the canonical path
//   - getCurrentAppUser() is DEPRECATED and retained only for migration compatibility
//   - Legacy users.id is historical/provenance only, NOT authority
//
// IMPORTANT:
//   - createSessionClientV2() is the cookie-aware authenticated session client.
//   - createServiceClientV2() is the privileged service-role client.
//   - Never use users.id to establish organisational authority.

import 'server-only';

import { createSessionClientV2 } from '@/lib/supabase/server-session';
import { createServiceClientV2 } from '@/lib/supabase/server';

/**
 * Canonical organisational context resolved for the current person.
 */
export interface OrganisationContext {
  personId: string;
  organisationId: string;
  membershipId: string;
  role: string;
  membershipStatus: string;
  canSpend: boolean;
  validFrom: string;
  validTo: string | null;
}

/**
 * Return the configured administrator email allowlist.
 */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Check whether an email belongs to the administrator allowlist.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;

  return adminEmails().includes(email.trim().toLowerCase());
}

/**
 * Return the authenticated Supabase Auth user for this request.
 *
 * This function deliberately uses the cookie-aware session client.
 *
 * It does NOT resolve:
 *   - Person
 *   - Organisation
 *   - Membership
 *
 * Those are resolved separately through the canonical identity functions.
 */
export async function getAuthUser() {
  const supabase = await createSessionClientV2();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Creates a short-lived anonymous beta session.
 *
 * This is NOT an authenticated Supabase user session.
 * It is an application-level beta session stored in beta_sessions.
 *
 * @param validation Result of beta-code validation.
 * @returns Session ID and expiration timestamp.
 */
export async function createAnonymousSession(validation: {
  isValid: boolean;
  betaCodeId: string;
}): Promise<{
  id: string;
  expiresAt: string;
}> {
  if (!validation.isValid) {
    throw new Error('Invalid beta code');
  }

  const service = await createServiceClientV2();

  const sessionId = crypto.randomUUID();

  const expiresAt = new Date(
    Date.now() + 15 * 60 * 1000,
  ).toISOString();

  const { error } = await service
    .from('beta_sessions')
    .insert({
      id: sessionId,
      beta_code_id: validation.betaCodeId,
      expires_at: expiresAt,
    });

  if (error) {
    console.error(
      '[auth] Failed to create anonymous beta session:',
      error,
    );

    throw error;
  }

  return {
    id: sessionId,
    expiresAt,
  };
}

/**
 * @deprecated
 *
 * Legacy application-user resolver retained temporarily for migration
 * compatibility only.
 *
 * NEW CODE MUST NOT USE THIS FUNCTION.
 *
 * Canonical authority is:
 *
 *   Supabase Auth
 *        → auth_credentials
 *        → persons
 *        → organisation_memberships
 *        → organisations
 *
 * The legacy users table is historical/provenance data and must not be
 * used to establish organisational authority.
 *
 * This compatibility function intentionally performs no self-healing,
 * email-based adoption, or users.id authority resolution.
 */
export async function getCurrentAppUser() {
  console.warn(
    '[auth] getCurrentAppUser() is deprecated. ' +
      'Use getCurrentOrganisationContext(), getCurrentOrganisationId(), ' +
      'or getCurrentPersonId() instead.',
  );

  return null;
}

/**
 * True when the current authenticated Supabase user belongs to the
 * configured ADMIN_EMAILS allowlist.
 *
 * This is an operator-level check and is intentionally independent of
 * organisation membership.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const authUser = await getAuthUser();

  return isAdminEmail(authUser?.email);
}

// ---------------------------------------------------------------------------
// CANONICAL IDENTITY RESOLUTION
// ---------------------------------------------------------------------------
//
// Canonical authority chain:
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
// No legacy users.id fallback exists here.
// ---------------------------------------------------------------------------

/**
 * Resolve the full organisational context for the current authenticated
 * browser/session user.
 *
 * Canonical path:
 *
 *   auth session
 *        → auth_credentials
 *        → persons
 *        → organisation_memberships
 *        → organisations
 *
 * Returns null when:
 *   - there is no authenticated session
 *   - no active auth credential exists
 *   - no active organisation membership exists
 *   - the membership has expired
 *   - an unexpected database error occurs
 *
 * IMPORTANT:
 * This function does NOT consult users.id.
 */
export async function getCurrentOrganisationContext(): Promise<OrganisationContext | null> {
  try {
    const supabase = await createSessionClientV2();

    // -----------------------------------------------------------------------
    // 1. AUTHENTICATED SUPABASE USER
    // -----------------------------------------------------------------------

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // -----------------------------------------------------------------------
    // 2. AUTH → PERSON
    // -----------------------------------------------------------------------
    //
    // auth_credentials is the canonical bridge between Supabase Auth and
    // the application Person.
    //

    const {
      data: credential,
      error: credentialError,
    } = await supabase
      .from('auth_credentials')
      .select('person_id')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (credentialError || !credential) {
      return null;
    }

    const personId = credential.person_id;

    if (!personId) {
      return null;
    }

    // -----------------------------------------------------------------------
    // 3. PERSON → ACTIVE ORGANISATION MEMBERSHIP
    // -----------------------------------------------------------------------

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from('organisation_memberships')
      .select(
        [
          'membership_id',
          'organisation_id',
          'role',
          'status',
          'can_spend',
          'valid_from',
          'valid_to',
        ].join(', '),
      )
      .eq('person_id', personId)
      .eq('status', 'active')
      .or('valid_to.is.null,valid_to.gt.now()')
      .order('valid_from', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      return null;
    }

    // -----------------------------------------------------------------------
    // 4. CANONICAL CONTEXT
    // -----------------------------------------------------------------------

    return {
      personId,
      organisationId: membership.organisation_id,
      membershipId: membership.membership_id,
      role: membership.role,
      membershipStatus: membership.status,
      canSpend: membership.can_spend ?? true,
      validFrom: membership.valid_from,
      validTo: membership.valid_to,
    };
  } catch (error) {
    console.error(
      '[lib/auth] Error resolving current organisational context:',
      error,
    );

    return null;
  }
}

/**
 * Convenience helper returning only the canonical organisation_id
 * for the current authenticated session.
 */
export async function getCurrentOrganisationId(): Promise<string | null> {
  const context = await getCurrentOrganisationContext();

  return context?.organisationId ?? null;
}

/**
 * Convenience helper returning only the canonical person_id
 * for the current authenticated session.
 */
export async function getCurrentPersonId(): Promise<string | null> {
  const context = await getCurrentOrganisationContext();

  return context?.personId ?? null;
}

/**
 * Check whether the current authenticated person has the specified
 * role in their active organisation membership.
 */
export async function currentUserHasRole(
  requiredRole: string,
): Promise<boolean> {
  const context = await getCurrentOrganisationContext();

  return context?.role === requiredRole;
}

/**
 * Check whether the current authenticated person is an organisation owner.
 */
export async function currentUserIsOwner(): Promise<boolean> {
  return currentUserHasRole('owner');
}

/**
 * Check whether the current authenticated person is an organisation admin.
 */
export async function currentUserIsAdmin(): Promise<boolean> {
  return currentUserHasRole('admin');
}

// ---------------------------------------------------------------------------
// SERVER-TO-SERVER CANONICAL IDENTITY RESOLUTION
// ---------------------------------------------------------------------------

/**
 * Resolve organisational context from a known Supabase Auth user ID.
 *
 * This is intended for trusted server-side flows such as:
 *
 *   - authenticated webhooks
 *   - HMAC-authenticated agent requests
 *   - trusted conversation bindings
 *   - server-side jobs carrying auth_user_id
 *
 * Canonical path:
 *
 *   auth_user_id
 *        → auth_credentials
 *        → persons
 *        → organisation_memberships
 *        → organisations
 *
 * IMPORTANT:
 * The supplied userId must already be trusted by the calling route.
 *
 * This function does not use users.id.
 */
export async function resolveOrganisationFromUser(
  userId: string,
): Promise<OrganisationContext | null> {
  if (!userId?.trim()) {
    return null;
  }

  try {
    const supabase = await createServiceClientV2();

    // -----------------------------------------------------------------------
    // 1. AUTH USER → PERSON
    // -----------------------------------------------------------------------

    const {
      data: credential,
      error: credentialError,
    } = await supabase
      .from('auth_credentials')
      .select('person_id')
      .eq('auth_user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (credentialError || !credential) {
      return null;
    }

    const personId = credential.person_id;

    if (!personId) {
      return null;
    }

    // -----------------------------------------------------------------------
    // 2. PERSON → ACTIVE MEMBERSHIP
    // -----------------------------------------------------------------------

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from('organisation_memberships')
      .select(
        [
          'membership_id',
          'organisation_id',
          'role',
          'status',
          'can_spend',
          'valid_from',
          'valid_to',
        ].join(', '),
      )
      .eq('person_id', personId)
      .eq('status', 'active')
      .or('valid_to.is.null,valid_to.gt.now()')
      .order('valid_from', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      return null;
    }

    return {
      personId,
      organisationId: membership.organisation_id,
      membershipId: membership.membership_id,
      role: membership.role,
      membershipStatus: membership.status,
      canSpend: membership.can_spend ?? true,
      validFrom: membership.valid_from,
      validTo: membership.valid_to,
    };
  } catch (error) {
    console.error(
      '[lib/auth] Error resolving organisation from auth user:',
      error,
    );

    return null;
  }
}

/**
 * Resolve organisational context from a known canonical person_id.
 *
 * This is used by trusted server-side flows where the application already
 * knows the Person identity directly, such as an agent provisioned with a
 * server-side person binding.
 *
 * Canonical path:
 *
 *   person_id
 *        → organisation_memberships
 *        → organisations
 *
 * No auth_credentials lookup is necessary because the caller already has
 * the canonical Person identity.
 *
 * IMPORTANT:
 * The supplied personId must already be trusted by the calling route.
 *
 * This function never uses users.id.
 */
export async function resolveOrganisationForPerson(
  personId: string,
): Promise<OrganisationContext | null> {
  if (!personId?.trim()) {
    return null;
  }

  try {
    const supabase = await createServiceClientV2();

    // -----------------------------------------------------------------------
    // PERSON → ACTIVE MEMBERSHIP
    // -----------------------------------------------------------------------

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from('organisation_memberships')
      .select(
        [
          'membership_id',
          'organisation_id',
          'role',
          'status',
          'can_spend',
          'valid_from',
          'valid_to',
        ].join(', '),
      )
      .eq('person_id', personId)
      .eq('status', 'active')
      .or('valid_to.is.null,valid_to.gt.now()')
      .order('valid_from', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      return null;
    }

    return {
      personId,
      organisationId: membership.organisation_id,
      membershipId: membership.membership_id,
      role: membership.role,
      membershipStatus: membership.status,
      canSpend: membership.can_spend ?? true,
      validFrom: membership.valid_from,
      validTo: membership.valid_to,
    };
  } catch (error) {
    console.error(
      '[lib/auth] Error resolving organisation from person:',
      error,
    );

    return null;
  }
}