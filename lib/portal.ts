// lib/portal.ts
//
// Portal / persona selection — which Kira experience the authenticated person is
// operating as.
//
// A person is a single canonical identity (auth_user_id → auth_credentials →
// person_id → organisation_memberships). One person can legitimately operate in
// several distinct PORTALS:
//
//   user            → the business owner's product experience (overview, genome,
//                     drafts, requests, knowledge). Each route is wrapped by
//                     UserShell. Any holder of an active organisation membership
//                     is eligible.
//
//   org-admin       → the CUSTOMER's own org-management / governance experience
//                     (/manage/*, gated by getSuperadminContext() — the exact
//                     gate the ManageShell uses). See ManageShell.tsx: "the
//                     CUSTOMER's own org-management surface."
//
//   corporate-admin → the Kira corporate operator console (/admin/*, gated by
//                     the ADMIN_EMAILS operator allowlist — the exact gate the
//                     admin layout uses). See ManageShell.tsx: "the CAS
//                     platform-operator console, email-allowlist gated and
//                     platform-wide."
//
// SEPARATE FROM ORGANISATION SELECTION
// ------------------------------------
//
//   Portal  answers  "which experience am I using?"
//   Org     answers  "which organisation am I acting for?"
//
// These are deliberately not collapsed. Portal selection is a navigation
// convenience only — it is stored client-side (sessionStorage) and NEVER grants
// authority. Every portal route independently verifies the caller's authority
// through its existing gate (UserShell, AdminPanelLayout, ManageShell). This
// file therefore returns only portals the caller is genuinely authorised to
// use, derived from the canonical model — never from client-supplied state.

import 'server-only';

import {
  getAuthUser,
  getCurrentOrganisationContext,
  getSuperadminContext,
  isCurrentUserAdmin,
} from '@/lib/auth';

export type PortalId = 'user' | 'org-admin' | 'corporate-admin';

export interface PortalOption {
  id: PortalId;
  label: string;
  /** Short line shown under the label inside the selector. */
  description: string;
  /** Route the portal's home page resolves to. */
  href: string;
}

export const PORTAL_OPTIONS: Record<PortalId, Omit<PortalOption, 'id'>> = {
  user: {
    label: 'User / CEO',
    description: 'Your business — overview, genome, drafts, requests.',
    href: '/dashboard',
  },
  'org-admin': {
    label: 'Organisation Admin',
    description: 'The organisation — Kira, members, settings.',
    href: '/manage',
  },
  'corporate-admin': {
    label: 'Kira Corporate Admin',
    description: 'Kira operator console — Exec, LOIs, introducers, testers.',
    href: '/admin',
  },
};

/**
 * Resolve every portal the current person is genuinely authorised to use.
 *
 * The gate used for each candidate is the SAME function the corresponding
 * portal route uses to authorise itself, so a person can never be offered a
 * portal they could not actually enter by direct URL.
 */
export async function getAuthorisedPortals(): Promise<PortalOption[]> {
  const authorised: PortalOption[] = [];

  const authUser = await getAuthUser();
  if (!authUser) return authorised;

  const [orgContext, superadminContext, isOperator] = await Promise.all([
    getCurrentOrganisationContext(),
    getSuperadminContext(),
    isCurrentUserAdmin(),
  ]);

  // User portal: an active organisation membership is what UserShell requires.
  if (orgContext) {
    authorised.push({ id: 'user', ...PORTAL_OPTIONS.user });
  }

  // Organisation admin: a superadmin membership is what ManageShell requires.
  if (superadminContext) {
    authorised.push({ id: 'org-admin', ...PORTAL_OPTIONS['org-admin'] });
  }

  // Corporate admin: the ADMIN_EMAILS operator allowlist is what the admin
  // layout requires.
  if (isOperator) {
    authorised.push({
      id: 'corporate-admin',
      ...PORTAL_OPTIONS['corporate-admin'],
    });
  }

  return authorised;
}

/**
 * Map a request pathname to the portal that owns it, so the shell can highlight
 * the active portal in the selector.
 */
export function portalForPathname(pathname: string): PortalId | null {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return 'corporate-admin';
  }
  if (pathname === '/manage' || pathname.startsWith('/manage/')) {
    return 'org-admin';
  }
  return 'user';
}