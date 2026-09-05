// app/api/admin/invitations/route.ts
//
// Organisation Invitations — admin API for listing, minting, and revoking codes.
//
// Auth: must be authenticated + organisation admin/owner.
// The admin panel layout already enforces ADMIN_EMAILS; this adds org-level
// membership checks for defence-in-depth.

import { NextRequest, NextResponse } from 'next/server';

import { getAuthUser, getCurrentOrganisationContext, resolveOrganisationForPerson } from '@/lib/auth';
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

  let body: { email?: string; firstName?: string; lastName?: string; betaType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!body.email || !body.email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  try {
    const minted = await mintInvitation({
      organisationId: auth.org.organisationId,
      email: body.email,
      firstName: body.firstName ?? null,
      lastName: body.lastName ?? null,
      betaType: (body.betaType as 'superadmin' | 'user') ?? 'user',
      label: `${body.firstName ?? ''} ${body.lastName ?? ''}`.trim() || null,
      createdBy: auth.user.id,
    });

    // Send the invitation email (non-blocking: if it fails, the code still exists)
    sendInvitationEmail({
      organisationId: auth.org.organisationId,
      email: body.email,
      firstName: body.firstName ?? null,
      lastName: body.lastName ?? null,
      betaType: (body.betaType as 'superadmin' | 'user') ?? 'user',
      label: minted.invitation.label,
      code: minted.code,
      prettyCode: minted.prettyCode,
    }).catch((err) => {
      console.error('[api/admin/invitations] email send failed (non-fatal):', err);
    });

    return NextResponse.json({
      ok: true,
      code: minted.prettyCode,
      invitation: minted.invitation,
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
