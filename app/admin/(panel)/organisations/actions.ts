'use server';

import { revalidatePath } from 'next/cache';
import { isCurrentUserAdmin } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { mintInvitation, sendInvitationEmail } from '@/lib/invitation/invitation-service';

export interface ActionResult {
  ok: boolean;
  message: string;
  organisationId?: string;
}

export async function createOrganisationAction(formData: FormData): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) {
    return { ok: false, message: 'Not authorised' };
  }

  const legalName = String(formData.get('legal_name') || '').trim();
  if (!legalName) {
    return { ok: false, message: 'Business name is required' };
  }

  // org_type is admin-selected (portfolio | project | distributor | client_org).
  // Distinguishing the lane an org occupies drives the portal journey below.
  const ALLOWED_ORG_TYPES = new Set(['portfolio', 'project', 'distributor', 'client_org']);
  const rawOrgType = String(formData.get('org_type') || 'distributor');
  const orgType = ALLOWED_ORG_TYPES.has(rawOrgType) ? rawOrgType : 'distributor';

  // The lane a portal URL must mint: a client org walks the business journey, everything
  // else in the chain (portfolio/project/distributor) walks the consultant journey.
  const inviteJourney = orgType === 'client_org' ? 'business' : 'consultant';

  const supabase = createServiceClientV2();

  const { data: org, error } = await supabase
    .from('organisations')
    .insert({
      legal_name: legalName,
      org_type: orgType,
      status: 'active'
    })
    .select('organisation_id')
    .single();

  if (error || !org) {
    console.error('[admin/organisations/actions] creation failed:', error);
    return { ok: false, message: `Creation failed: ${error?.message ?? 'unknown error'}` };
  }

  // Land a portals row so the org has a canonical /talk URL for the next lane.
  const talkUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiraexec.com').replace(/\/$/, '') + '/talk';
  await supabase.from('portals').upsert(
    {
      organisation_id: org.organisation_id,
      portal_url: `${talkUrl}?journey=${inviteJourney}`,
      portal_level: orgType,
      journey_type: inviteJourney,
    },
    { onConflict: 'organisation_id' },
  );

  revalidatePath('/admin/organisations');
  return {
    ok: true,
    message: `Organisation "${legalName}" created successfully.`,
    organisationId: org.organisation_id
  };
}

/**
 * Mint an invitation into an EXISTING organisation and email it — the missing link between
 * "create the distributor org" and "the partner actually gets a working sign-up link". Mirrors
 * /api/admin/invitations' cross-org path but as a direct server action (this page is already
 * inside the admin layout, so it re-checks isCurrentUserAdmin() itself, same as
 * createOrganisationAction above, rather than round-tripping through the API route).
 */
export async function inviteToOrganisationAction(formData: FormData): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) {
    return { ok: false, message: 'Not authorised' };
  }

  const email = String(formData.get('email') || '').trim().toLowerCase();
  const firstName = String(formData.get('first_name') || '').trim();
  const lastName = String(formData.get('last_name') || '').trim();
  const organisationId = String(formData.get('organisation_id') || '');

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, message: 'Enter a valid email address.' };
  }
  if (!organisationId) {
    return { ok: false, message: 'Choose an organisation to invite them into.' };
  }

  const supabase = createServiceClientV2();
  const { data: org, error: orgError } = await supabase
    .from('organisations')
    .select('legal_name, org_type')
    .eq('organisation_id', organisationId)
    .maybeSingle();

  if (orgError || !org) {
    return { ok: false, message: 'That organisation does not exist.' };
  }

  // Non-client_org lanes (portfolio/project/distributor) are someone joining their OWN org to
  // bring Kira to clients — the "Welcome to the Kira Partnership Team" copy. client_org (or an
  // unset org_type — the legacy CAIS-beta-sandbox rows) keeps the original beta-tester copy.
  const emailVariant = org.org_type && org.org_type !== 'client_org' ? 'partner' : 'beta';

  try {
    const minted = await mintInvitation({
      organisationId,
      email,
      firstName: firstName || null,
      lastName: lastName || null,
      betaType: 'superadmin', // first person into a freshly created org should land as its owner
      label: `${firstName} ${lastName}`.trim() || null,
      createdBy: 'admin',
    });

    let emailStatus: 'sent' | 'failed' = 'sent';
    try {
      await sendInvitationEmail(
        {
          organisationId,
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          betaType: 'superadmin',
          label: minted.invitation.label,
          code: minted.code,
          prettyCode: minted.prettyCode,
        },
        emailVariant,
      );
    } catch (err) {
      emailStatus = 'failed';
      console.error('[admin/organisations/actions] invitation email failed:', err);
    }

    revalidatePath('/admin/organisations');
    return {
      ok: true,
      message:
        emailStatus === 'sent'
          ? `Invitation sent to ${email} for "${org.legal_name}" (code ${minted.prettyCode}).`
          : `Invitation code ${minted.prettyCode} created for "${org.legal_name}", but the email failed to send — share the code directly.`,
      organisationId,
    };
  } catch (error) {
    console.error('[admin/organisations/actions] invite failed:', error);
    return { ok: false, message: `Could not create invitation: ${(error as Error).message}` };
  }
}
