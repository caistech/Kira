// app/api/admin/invitations/route.ts
//
// Organisation Invitations — admin API for listing, minting, and revoking codes.
//
// Auth: must be authenticated + organisation admin/owner.
// The admin panel layout already enforces ADMIN_EMAILS; this adds org-level
// membership checks for defence-in-depth.

import { NextRequest, NextResponse } from 'next/server';

import { getAuthUser, getCurrentOrganisationContext, resolveOrganisationForPerson, isCurrentUserAdmin } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';
import {
  listInvitations,
  mintInvitation,
  sendInvitationEmail,
  revokeInvitation,
} from '@/lib/invitation/invitation-service';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const user = await getAuthUser();
  if (!user) return null;
  const org = await getCurrentOrganisationContext();
  if (!org) return null;
  return { user, org };
}

// ── GET /api/admin/invitations ──────────────────────────────────────────────

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  try {
    const invitations = await listInvitations(auth.org.organisationId);
    return NextResponse.json({ ok: true, invitations });
  } catch (error) {
    console.error('[api/admin/invitations] GET error:', error);
    return NextResponse.json({ error: 'Failed to load invitations' }, { status: 500 });
  }
}

// ── POST /api/admin/invitations — mint + email ─────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  let body: {
    email?: string;
    firstName?: string;
    lastName?: string;
    betaType?: string;
    organisationId?: string;
    /**
     * Platform-admin-only override for the email's narrative — the default computed below covers
     * the two ordinary cases (partner / beta). 'founding-beta' is a third, deliberately explicit
     * choice: a named, small cohort, never the default, so an ordinary invite can never drift into
     * founding-beta copy by omission.
     */
    variant?: 'founding-beta';
    /** Per-recipient personal opening, 'founding-beta' only — see sendInvitationEmail's own doc. */
    personalNote?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!body.email || !body.email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  // Default: mint into the caller's own org context (unchanged behaviour).
  // Override: a PLATFORM admin (ADMIN_EMAILS) may target a different org — the case this exists
  // for is inviting a partner into a distributor-lane org created via /admin/organisations, which
  // is never the org the platform admin is themselves "acting as". Gated on isCurrentUserAdmin(),
  // not just requireAdmin()'s org-context check, because an ordinary org owner/admin passing an
  // arbitrary organisationId here would otherwise be able to mint an invitation into ANY other
  // tenant's org — a cross-tenant escalation, not a convenience.
  let targetOrganisationId = auth.org.organisationId;
  if (body.organisationId && body.organisationId !== auth.org.organisationId) {
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ error: 'Not authorised to target another organisation' }, { status: 403 });
    }
    const svc = createServiceClientV2();
    const { data: targetOrg, error: targetOrgError } = await svc
      .from('organisations')
      .select('organisation_id')
      .eq('organisation_id', body.organisationId)
      .maybeSingle();
    if (targetOrgError || !targetOrg) {
      return NextResponse.json({ error: 'Target organisation not found' }, { status: 404 });
    }
    targetOrganisationId = body.organisationId;
  }

  // The email tells a different story depending on what's being joined: a client_org (or an
  // org with no org_type set — the historical CAIS-beta-sandbox rows) gets the beta-tester copy
  // unchanged; anything else (portfolio/project/distributor) is someone joining their OWN live
  // org to bring Kira to clients, which gets the partner copy.
  const svcForType = createServiceClientV2();
  const { data: targetOrgRow } = await svcForType
    .from('organisations')
    .select('org_type')
    .eq('organisation_id', targetOrganisationId)
    .maybeSingle();
  let emailVariant: 'partner' | 'beta' | 'founding-beta' =
    targetOrgRow?.org_type && targetOrgRow.org_type !== 'client_org' ? 'partner' : 'beta';

  // 'founding-beta' is an explicit, platform-admin-only override — same isCurrentUserAdmin() gate
  // as the cross-org targeting above, for the same reason: this is a named, deliberate choice per
  // send, never something an ordinary org admin should be able to trigger on themselves.
  if (body.variant === 'founding-beta') {
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ error: 'Not authorised to use the founding-beta variant' }, { status: 403 });
    }
    emailVariant = 'founding-beta';
  }

  try {
    const minted = await mintInvitation({
      organisationId: targetOrganisationId,
      email: body.email,
      firstName: body.firstName ?? null,
      lastName: body.lastName ?? null,
      betaType: (body.betaType as 'superadmin' | 'user') ?? 'user',
      label: `${body.firstName ?? ''} ${body.lastName ?? ''}`.trim() || null,
      createdBy: auth.user.id,
    });

    // The code is the deliverable — it exists regardless of email outcome. Send
    // the email now and report its real result so the operator is never told
    // "email sent" when the provider rejected it.
    let emailStatus: 'sent' | 'failed' = 'sent';
    try {
      await sendInvitationEmail(
        {
          organisationId: targetOrganisationId,
          email: body.email,
          firstName: body.firstName ?? null,
          lastName: body.lastName ?? null,
          betaType: (body.betaType as 'superadmin' | 'user') ?? 'user',
          label: minted.invitation.label,
          code: minted.code,
          prettyCode: minted.prettyCode,
          ...(emailVariant === 'founding-beta' && body.personalNote ? { personalNote: body.personalNote } : {}),
          ...(emailVariant === 'founding-beta' && body.cc ? { cc: body.cc } : {}),
        },
        emailVariant,
      );
    } catch (err) {
      emailStatus = 'failed';
      console.error('[api/admin/invitations] email send failed:', err);
    }

    return NextResponse.json({
      ok: true,
      code: minted.prettyCode,
      invitation: minted.invitation,
      email: { status: emailStatus },
    });
  } catch (error) {
    console.error('[api/admin/invitations] POST error:', error);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }
}

// ── DELETE /api/admin/invitations?code=XXXX — revoke ───────────────────────

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 });
  }

  try {
    await revokeInvitation(code, auth.org.organisationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/admin/invitations] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 });
  }
}
