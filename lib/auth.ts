// lib/auth.ts
// Server-side auth helpers shared by the user + admin portals.
//
// Identity model (P0.5 canonical):
//   Supabase Auth → auth_credentials → persons → organisation_memberships → organisations
//
// P0.5 Step 6: Retirement of Legacy Authority
//   - getCurrentOrganisationContext() uses ONLY canonical path (no legacy fallback)
//   - getCurrentAppUser() is DEPRECATED - use canonical functions instead
//   - Legacy users.id is historical/provenance only, NOT authority

import 'server-only';
import { createSessionClientV2 } from '@/lib/supabase/server-session';
import { createServiceClientV2 } from '@/lib/supabase/server';

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/** The authenticated Supabase auth.users identity for this request, or null. */
export async function getAuthUser() {
  const supabase = await createSessionClientV2();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * @deprecated Use getCurrentOrganisationContext() or getCurrentOrganisationId() instead.
 * Retained temporarily for migration compatibility. Will be removed.
 *
 * Self-healing bridge: if nothing joins on auth_user_id, fall back to the email and adopt the orphan.
 * A row created before the bridge existed — or by an import, or by a trigger that did not fire —
 * should not strand someone out of their own data forever.
 *
 * THE TWO GUARDS:
 *  1. Only a CONFIRMED email may claim a row.
 *  2. Only a row whose auth_user_id is already NULL is adopted.
 */
export async function getCurrentAppUser() {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  const svc = createServiceClientV2();

  const { data: bridged } = await svc
    .from('users')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();
  if (bridged) return bridged;

  // GUARD 1 — an unconfirmed address proves nothing about who controls it.
  if (!authUser.email_confirmed_at || !authUser.email) return null;

  const { data: orphan } = await svc
    .from('users')
    .select('*')
    // GUARD 2 — an already-bridged row belongs to someone; it is never re-pointed here.
    .is('auth_user_id', null)
    .ilike('email', authUser.email)
    .maybeSingle();
  if (!orphan) return null;

  const { error } = await svc
    .from('users')
    .update({ auth_user_id: authUser.id })
    .eq('id', orphan.id)
    .is('auth_user_id', null); // re-checked at write time: another request may have adopted it first
  if (error) {
    console.warn('[auth] adopted orphan users row but could not persist the bridge:', error.message);
  }

  return { ...orphan, auth_user_id: authUser.id };
}

/** True when the current session belongs to an operator on the ADMIN_EMAILS allowlist. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const authUser = await getAuthUser();
  return isAdminEmail(authUser?.email);
}

// ---------------------------------------------------------------------------
// P0.5 STEP 1D: CANONICAL IDENTITY FUNCTIONS
// ---------------------------------------------------------------------------
// These functions resolve identity through the canonical model:
//   auth → auth_credentials → persons → organisation_memberships → organisations
//
// They should be preferred over getCurrentAppUser() for new code.
// getCurrentAppUser() is retained for backward compatibility during transition.

export interface OrganisationContext {
  personId: string;
  organisationId: string;
  membershipId: string;
  role: string;
  membershipStatus: string;
  canSpend: boolean;
  validFrom: string;
  validTo: string | null;
  /** Which portal(s) this membership grants: 'admin' | 'user' | 'both'. */
  portalAccess: 'admin' | 'user' | 'both' | null;
}

/**
 * Resolve the full organisational context for the current session.
 *
 * This is the canonical identity resolver. It resolves:
 *   auth session → person → membership → organisation
 *
 * Returns null if no active session, no auth credential, no person, or no active membership.
 *
 * P0.5 Step 6: Retirement of Legacy Authority
 *   - ONLY canonical path: auth_credentials → persons → organisation_memberships
 *   - NO legacy fallback to users.id
 *   - users.id is historical/provenance only
 */
export async function getCurrentOrganisationContext(): Promise<OrganisationContext | null> {
  try {
    // Authenticate with the user's session, then resolve canonical identity
    // with the service client. RLS on the identity tables can depend on the
    // organisation context that this function is itself trying to discover.
    const session = await createSessionClientV2();
    const { data: { user }, error: authError } = await session.auth.getUser();

    if (authError || !user) return null;

    const supabase = createServiceClientV2();

    // Canonical path ONLY: auth_credentials → persons → organisation_memberships.
    // selected_org_id is the person's explicit "which org am I working in" choice
    // (set by the org switcher). It is authoritative ONLY when they hold an active
    // membership for it — otherwise we fall back to the most-recent active membership.
    const { data: credential, error: credError } = await supabase
      .from('auth_credentials')
      .select('person_id, selected_org_id')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (credError || !credential) return null;
    const personId = credential.person_id;

    // Get membership (role priority: owner > admin > consultant > employee > advisor > member).
    // Build the OrgContext-shaped row from either the selected org (if the person still has an
    // active membership there) or the most-recent active membership.
    const baseQuery = `
      membership_id, organisation_id, role, status, can_spend, valid_from, valid_to, portal_access
    `;
    const activeFilter = { person_id: personId, status: 'active' };

    let membership;
    if (credential.selected_org_id) {
      const now = new Date().toISOString();

      const { data: selected, error: selErr } = await supabase
        .from('organisation_memberships')
        .select(baseQuery)
        .eq('person_id', personId)
        .eq('organisation_id', credential.selected_org_id)
        .eq('status', 'active')
        .or(`valid_to.is.null,valid_to.gt.${now}`)
        .maybeSingle();

      if (!selErr && selected) {
        membership = selected;
      }
    }

    // No valid selected org (or none stored) — fall back to most-recent active membership.
    if (!membership) {
      const { data: fallback } = await supabase
        .from('organisation_memberships')
        .select(baseQuery)
        .eq('person_id', personId)
        .eq('status', 'active')
        .or(`valid_to.is.null,valid_to.gt.${now}`)
        .order('valid_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      membership = fallback;
    }

    if (!membership) return null;

    return {
      personId,
      organisationId: membership.organisation_id,
      membershipId: membership.membership_id,
      role: membership.role,
      membershipStatus: membership.status,
      canSpend: membership.can_spend ?? true,
      validFrom: membership.valid_from,
      validTo: membership.valid_to,
      portalAccess: membership.portal_access ?? null,
    };
  } catch (e) {
    console.error('[lib/auth] Error resolving organisational context:', e);
    return null;
  }
}

/** Convenience: get just the organisation_id for the current session. P0.5 Step 6. */
export async function getCurrentOrganisationId(): Promise<string | null> {
  const ctx = await getCurrentOrganisationContext();
  return ctx?.organisationId ?? null;
}

/** Convenience: get just the person_id for the current session. P0.5 Step 6. */
export async function getCurrentPersonId(): Promise<string | null> {
  const ctx = await getCurrentOrganisationContext();
  return ctx?.personId ?? null;
}

/** A person's selectable organisation, for the org-switcher. */
export interface UserOrganisationOption {
  organisationId: string;
  membershipId: string;
  name: string;
  role: string;
  /** True when this is the person's currently-active selection. */
  isCurrent: boolean;
}

/**
 * List the organisations a person belongs to (active memberships), so the
 * authenticated portal can render the org-switcher and highlight the current one.
 * Returns [] on no memberships. P0.5 Step 6.
 */
export async function getUserOrganisations(
  personId: string,
  currentOrganisationId: string | null,
): Promise<UserOrganisationOption[]> {
  const supabase = createServiceClientV2();

  const now = new Date().toISOString();

  const { data: memberships, error } = await supabase
    .from('organisation_memberships')
    .select('membership_id, organisation_id, role, portal_access')
    .eq('person_id', personId)
    .eq('status', 'active')
    .lte('valid_from', now)
    .or(`valid_to.is.null,valid_to.gt.${now}`)
    .order('valid_from', { ascending: false });

  if (error) {
    console.error('[lib/auth] getUserOrganisations failed:', error);
    return [];
  }

  if (!memberships || memberships.length === 0) return [];

  // Resolve each org's display name in one query.
  const orgIds = memberships.map((m) => m.organisation_id as string);
  const { data: orgRows } = await supabase
    .from('organisations')
    .select('organisation_id, legal_name')
    .in('organisation_id', orgIds);

  const nameByOrgId = new Map<string, string>();
  for (const o of orgRows ?? []) {
    nameByOrgId.set(o.organisation_id as string, (o.legal_name as string)?.trim() || 'Unnamed business');
  }

  return memberships.map((m) => {
    const organisationId = m.organisation_id as string;
    return {
      organisationId,
      membershipId: m.membership_id as string,
      name: nameByOrgId.get(organisationId) || 'Unnamed business',
      role: (m.role as string) || 'member',
      isCurrent: organisationId === currentOrganisationId,
    };
  });
}

/** Check if the current session has a specific role in their organisation. P0.5 Step 6. */
export async function currentUserHasRole(requiredRole: string): Promise<boolean> {
  const ctx = await getCurrentOrganisationContext();
  return ctx?.role === requiredRole;
}

/** Check if the current session is an owner. P0.5 Step 6. */
export async function currentUserIsOwner(): Promise<boolean> {
  return currentUserHasRole('owner');
}

/** Check if the current session is an admin. P0.5 Step 6. */
export async function currentUserIsAdmin(): Promise<boolean> {
  return currentUserHasRole('admin');
}

/**
 * Resolve organisational context from a known user_id (auth_user_id).
 *
 * Used by agent webhook routes that have a trusted user_id (from HMAC-authenticated
 * webhook, conversation binding, or ?uid= parameter) but no browser session JWT.
 *
 * Follows the canonical chain: auth_credentials → persons → organisation_memberships → organisations.
 * Returns null if the user_id cannot be resolved to an active membership.
 */
export async function resolveOrganisationFromUser(
  userId: string,
): Promise<OrganisationContext | null> {
  if (!userId) return null;

  try {
    const supabase = await createServiceClientV2();

    const { data: credential, error: credentialError } = await supabase
      .from('auth_credentials')
      .select('person_id')
      .eq('auth_user_id', userId)
      .limit(1)
      .maybeSingle();

    if (credentialError) {
      console.error(
        '[lib/auth] Error resolving auth credential:',
        credentialError,
      );
      return null;
    }

    if (!credential?.person_id) {
      return null;
    }

    const personId = credential.person_id;

    const { data: membership, error: membershipError } = await supabase
      .from('organisation_memberships')
      .select(
        'membership_id, organisation_id, role, status, can_spend, valid_from, valid_to, portal_access',
      )
      .eq('person_id', personId)
      .eq('status', 'active')
      .or('valid_to.is.null,valid_to.gt.now()')
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error(
        '[lib/auth] Error resolving organisation membership:',
        membershipError,
      );
      return null;
    }

    if (!membership) {
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
      portalAccess: membership.portal_access ?? null,
    };
  } catch (e) {
    console.error(
      '[lib/auth] Error resolving organisation from user:',
      e,
    );
    return null;
  }
}
/**
 * Resolve organisational context from a known person id (persons.person_id).
 *
 * The person-keyed counterpart to `resolveOrganisationFromUser`. Agent webhook routes carry a
 * server-baked identity that IS the person id (`?uid` baked per-agent at provision, never a
 * browser session JWT) — so they skip the auth_credentials hop and resolve through membership
 * directly. Follows the same canonical authority: `organisation_memberships`, never users.id.
 *
 * Returns null when the person cannot be resolved to an active membership.
 */
export async function resolveOrganisationForPerson(personId: string): Promise<OrganisationContext | null> {
  if (!personId) return null;
  try {
    const supabase = await createServiceClientV2();

    const { data: membership, error: memError } = await supabase
      .from('organisation_memberships')
      .select('membership_id, organisation_id, role, status, can_spend, valid_from, valid_to, portal_access')
      .eq('person_id', personId)
      .eq('status', 'active')
      .or('valid_to.is.null,valid_to.gt.now()')
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (memError || !membership) return null;

    return {
      personId,
      organisationId: membership.organisation_id,
      membershipId: membership.membership_id,
      role: membership.role,
      membershipStatus: membership.status,
      canSpend: membership.can_spend ?? true,
      validFrom: membership.valid_from,
      validTo: membership.valid_to,
      portalAccess: membership.portal_access ?? null,
    };
  } catch (e) {
    console.error('[lib/auth] Error resolving org from person:', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// MULTI-KIRA SUPERADMIN FUNCTIONS
// ---------------------------------------------------------------------------
//
// The superadmin is a FUNCTION (a role held in organisation_memberships with
// role = 'superadmin'), distinct from 'owner'. The superadmin governs the org,
// its Kira agent(s), and appoints users. Ownership is a separate relationship
// tracked in ownership_periods; a superadmin may or may not also own the org.

/**
 * Resolve the current session's SUPERADMIN context, if any.
 *
 * Mirrors getCurrentOrganisationContext() but scopes to a membership whose
 * portal_access grants the admin portal ('admin' or 'both'). This is the
 * authoritative check for /admin/* surfaces.
 *
 * Returns null when the user is not a superadmin of any org, is unauthenticated,
 * or has no matching membership.
 */
export async function getSuperadminContext(): Promise<OrganisationContext | null> {
  try {
    const session = await createSessionClientV2();
    const { data: { user }, error: authError } = await session.auth.getUser();
    if (authError || !user) return null;

    const supabase = createServiceClientV2();

    const { data: credential, error: credError } = await supabase
      .from('auth_credentials')
      .select('person_id')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (credError || !credential) return null;
    const personId = credential.person_id;

    const { data: membership } = await supabase
      .from('organisation_memberships')
      .select('membership_id, organisation_id, role, status, can_spend, valid_from, valid_to, portal_access')
      .eq('person_id', personId)
      .eq('role', 'superadmin')
      .eq('status', 'active')
      .in('portal_access', ['admin', 'both'])
      .or('valid_to.is.null,valid_to.gt.now()')
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!membership) return null;

    return {
      personId,
      organisationId: membership.organisation_id,
      membershipId: membership.membership_id,
      role: membership.role,
      membershipStatus: membership.status,
      canSpend: membership.can_spend ?? true,
      validFrom: membership.valid_from,
      validTo: membership.valid_to,
      portalAccess: membership.portal_access ?? null,
    };
  } catch (e) {
    console.error('[lib/auth] Error resolving superadmin context:', e);
    return null;
  }
}

/** Resolve someone's superadmin context from a trusted user_id (webhook / server context). */
export async function resolveSuperadminFromUser(userId: string): Promise<OrganisationContext | null> {
  if (!userId) return null;
  try {
    const supabase = await createServiceClientV2();

    const { data: credential, error: credError } = await supabase
      .from('auth_credentials')
      .select('person_id')
      .eq('auth_user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (credError || !credential) return null;

    const { data: membership } = await supabase
      .from('organisation_memberships')
      .select('membership_id, organisation_id, role, status, can_spend, valid_from, valid_to, portal_access')
      .eq('person_id', credential.person_id)
      .eq('role', 'superadmin')
      .eq('status', 'active')
      .in('portal_access', ['admin', 'both'])
      .or('valid_to.is.null,valid_to.gt.now()')
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!membership) return null;

    return {
      personId: credential.person_id,
      organisationId: membership.organisation_id,
      membershipId: membership.membership_id,
      role: membership.role,
      membershipStatus: membership.status,
      canSpend: membership.can_spend ?? true,
      validFrom: membership.valid_from,
      validTo: membership.valid_to,
      portalAccess: membership.portal_access ?? null,
    };
  } catch (e) {
    console.error('[lib/auth] Error resolving superadmin from user:', e);
    return null;
  }
}

/** True when the current session holds the superadmin function for their org. */
export async function currentUserIsSuperadmin(): Promise<boolean> {
  return (await getSuperadminContext()) !== null;
}

/** Which portal(s) the current session can access: 'admin' | 'user' | 'both' | null. */
export async function currentUserPortalAccess(): Promise<'admin' | 'user' | 'both' | null> {
  const ctx = await getCurrentOrganisationContext();
  return ctx?.portalAccess ?? null;
}

/** True when the current session has any active product (user-portal) membership. */
export async function currentUserHasPortalAccess(): Promise<boolean> {
  const ctx = await getCurrentOrganisationContext();
  return !!ctx?.portalAccess && ctx.portalAccess !== null;
}
