import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { TERMS_VERSION } from '@/lib/terms';

const VALID_ROLES = ['owner', 'admin', 'consultant', 'employee', 'advisor', 'member'];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const authCtx = await getCurrentOrganisationContext();
  if (!authCtx || !['owner', 'admin'].includes(authCtx.role)) {
    return NextResponse.json({ error: 'Only the owner or an admin can add team members.' }, { status: 403 });
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  const firstName = String(body.firstName ?? '').trim().slice(0, 100);
  const lastName = String(body.lastName ?? '').trim().slice(0, 100);
  const role = String(body.role ?? 'member');
  const canSpend = body.canSpend !== false;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (!firstName) {
    return NextResponse.json({ error: 'First name is required.' }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  }

  const svc = createServiceClient();

  const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-4).toUpperCase();

  const { error: createErr } = await svc.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      terms_accepted: 'true',
      terms_version: TERMS_VERSION,
    },
  });

  if (createErr) {
    const already = /already|registered|exists/i.test(createErr.message);
    if (already) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }
    console.error('[api/members/invite] createUser failed:', createErr);
    return NextResponse.json({ error: 'Could not create account. Please try again.' }, { status: 500 });
  }

  try {
    const { data: credential } = await svc
      .from('auth_credentials')
      .select('person_id')
      .eq('auth_user_id', email)
      .maybeSingle();

    let personId: string;

    if (credential?.person_id) {
      personId = credential.person_id;
    } else {
      personId = crypto.randomUUID();
      await svc.from('persons').insert({
        person_id: personId,
        email,
        first_name: firstName,
        last_name: lastName,
      });
      await svc.from('auth_credentials').insert({
        person_id: personId,
        auth_provider: 'email',
        auth_user_id: email,
      });
    }

    const { error: memErr } = await svc.from('organisation_memberships').insert({
      organisation_id: authCtx.organisationId,
      person_id: personId,
      role,
      can_spend: canSpend,
      status: 'active',
    });

    if (memErr) {
      console.error('[api/members/invite] membership insert failed:', memErr);
      return NextResponse.json({ error: 'Account created but could not assign team role.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, tempPassword });
  } catch (err) {
    console.error('[api/members/invite] wiring failed:', err);
    return NextResponse.json({ error: 'Could not complete invite.' }, { status: 500 });
  }
}
