// components/ManageShell.tsx
//
// ORG SUPERADMIN MANAGEMENT BOUNDARY (/manage/*)
//
// The superadmin is a FUNCTION (role = 'superadmin' in organisation_memberships),
// distinct from the owner. The superadmin governs the organisation, its Kira
// agent(s), and appoints its members. This shell is the boundary between the
// user portal and the org-management surface.
//
// It resolves the current session's superadmin context via
// getSuperadminContext() and redirects to the top of the user experience when
// the caller holds no superadmin membership.
//
// This is deliberately SEPARATE from the CAS platform-operator console
// (/admin/*), which is email-allowlist gated and platform-wide. /manage is the
// CUSTOMER's own org-management surface.

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import {
  getAuthUser,
  getSuperadminContext,
  getUserOrganisations,
} from '@/lib/auth';
import { getAuthorisedPortals } from '@/lib/portal';

import { createServiceClientV2 } from '@/lib/supabase/server';
import { PortalShell, type NavItem } from '@/components/PortalShell';

const MANAGE_NAV: NavItem[] = [
  { href: '/manage', label: 'Overview' },
  { href: '/manage/kira', label: 'Kira' },
  { href: '/manage/members', label: 'Members' },
  { href: '/manage/invitations', label: 'Invitations' },
  { href: '/manage/settings', label: 'Settings' },
];

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
        '[manage-shell] organisation identity lookup failed:',
        error,
      );
      return null;
    }

    return data?.legal_name?.trim() || null;
  } catch (error) {
    console.error(
      '[manage-shell] unexpected organisation identity error:',
      error,
    );
    return null;
  }
}

export async function ManageShell({ children }: { children: ReactNode }) {
  const authUser = await getAuthUser();
  if (!authUser) redirect('/login?from=/manage');

  const ctx = await getSuperadminContext();
  if (!ctx) {
    // A logged-in user with no superadmin function does not manage this org.
    redirect('/dashboard');
  }

  const orgName = await resolveOrganisationName(ctx.organisationId);

  // Orgs this superadmin can switch between (the management portal is multi-org aware).
  const orgOptions = await getUserOrganisations(
    ctx.personId,
    ctx.organisationId,
  );

  const portals = await getAuthorisedPortals();

  return (
    <PortalShell
      title={`${orgName || 'Organisation'} · Manage`}
      homeHref="/manage"
      items={MANAGE_NAV}
      userEmail={authUser.email ?? ''}
      settingsHref="/manage/settings"
      orgOptions={orgOptions}
      portals={portals}
      currentPortalId="org-admin"
    >
      {children}
    </PortalShell>
  );
}
