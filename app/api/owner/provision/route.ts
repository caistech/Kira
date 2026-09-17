import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSuperadminContext } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { TERMS_VERSION } from '@/lib/terms';

type SupabaseClient = ReturnType<typeof createServiceClientV2>;

/**
 * Paginate auth.admin.listUsers to locate an existing Supabase Auth user by
 * email. Returns null when no match exists. Mirrors the beta-redeem and
 * member-invite lookups.
 */
async function findExistingAuthUser(
  svc: SupabaseClient,
  email: string,
): Promise<{ id: string; email: string } | null> {
  const target = email.trim().toLowerCase();
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Auth lookup failed: ${error.message}`);

    const users = data?.users ?? [];
    const match = users.find(
      (c) =>
        typeof c.email === 'string' &&
        c.email.toLowerCase() === target,
    );

    if (match?.id && match.email) {
      return { id: match.id, email: match.email.toLowerCase() };
    }
    if (users.length < perPage) return null;
    page += 1;
  }
}

/**
 * Return true when the caller is a distributor for the target organisation.
 * Mirrors the RLS fallback used across the app.
 */
async function callerIsDistributorFor(
  svc: SupabaseClient,
  authUserId: string,
  organisationId: string,
): Promise<boolean> {
  const { data: credential } = await svc
    .from('auth_credentials')
    .select('person_id')
    .eq('auth_user_id', authUserId)
    .eq('status', 'active')
    .maybeSingle();

  if (!credential?.person_id) return false;

  const { data } = await svc
    .from('distributor_portfolio')
    .select('id')
    .eq('distributor_person_id', credential.person_id)
    .eq('client_organisation_id', organisationId)
    .eq('status', 'active')
    .is('removed_at', null)
    .limit(1);

  return Boolean(data?.length);
}

/**
 * POST /api/owner/provision
 *
 * Provision a CEO / Owner for a target client organisation from an
 * authorised operator context:
 *
 *   - A superadmin of the organisation (client org admin)
 *   - A distributor with an active portfolio entry over the organisation
 *
 * Canonical identity chain guaranteed after success:
 *
 *   Supabase Auth User
 *         │  auth_user_id
 *         ▼
 *      auth_credentials       UNIQUE (auth_provider, auth_user_id)
 *         │  person_id
 *         ▼
 *       Person                UNIQUE (email)
 *         │  person_id + organisation_id
 *         ▼
 *   organisation_memberships  role='owner' (portal_access 'user')
 *                             role='superadmin' (portal_access 'both')
 *         │  organisation_id + person_id
 *         ▼
 *   ownership_periods         status='current'
 *
 * A freshly created Auth user is deleted best-effort if any later wiring step
 * fails. Existing Auth users are never deleted.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const organisationId = String(body.organisationId ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const firstName = String(body.firstName ?? '').trim().slice(0, 100);
  const lastName = String(body.lastName ?? '').trim().slice(0, 100);

  if (!organisationId) {
    return NextResponse.json(
      { error: 'Organisation is required.' },
      { status: 400 },
    );
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.' },
      { status: 400 },
    );
  }
  if (!firstName) {
    return NextResponse.json(
      { error: 'First name is required.' },
      { status: 400 },
    );
  }

  const svc = createServiceClientV2();

  // ── AUTHORISATION ───────────────────────────────────────────────────────
  // The caller must be either a superadmin of the target org OR a distributor
  // with an active portfolio entry over it. The client-supplied
  // organisationId is never trusted on its own.

  const superadminCtx = await getSuperadminContext();
  const isSuperadminOfTarget =
    superadminCtx?.organisationId === organisationId;

  let isDistributorOfTarget = false;
  if (!isSuperadminOfTarget) {
    try {
      isDistributorOfTarget = await callerIsDistributorFor(
        svc,
        authUser.id,
        organisationId,
      );
    } catch (err) {
      console.error('[api/owner/provision] distributor check failed:', err);
    }
  }

  if (!isSuperadminOfTarget && !isDistributorOfTarget) {
    return NextResponse.json(
      { error: 'Not authorised to provision owners for this organisation.' },
      { status: 403 },
    );
  }

  // ── CREATE OR RESOLVE THE AUTH USER ─────────────────────────────────────

  const tempPassword =
    Math.random().toString(36).slice(-12) +
    Math.random().toString(36).slice(-4).toUpperCase();

  let authUserId: string;
  let newlyCreatedAuthUser = false;

  const { data: createdUser, error: createErr } =
    await svc.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        terms_accepted: 'true',
        terms_version: TERMS_VERSION,
      },
    });

  if (createErr) {
    const already = /already|registered|exists/i.test(createErr.message);
    if (!already) {
      console.error('[api/owner/provision] createUser failed:', createErr);
      return NextResponse.json(
        { error: 'Could not create account. Please try again.' },
        { status: 500 },
      );
    }

    try {
      const existing = await findExistingAuthUser(svc, email);
      if (!existing?.id) {
        return NextResponse.json(
          { error: 'Could not locate the existing account for this email.' },
          { status: 500 },
        );
      }
      authUserId = existing.id;
    } catch (err) {
      console.error('[api/owner/provision] existing Auth lookup failed:', err);
      return NextResponse.json(
        { error: 'Could not locate the existing account for this email.' },
        { status: 500 },
      );
    }
  } else if (createdUser?.user?.id) {
    authUserId = createdUser.user.id;
    newlyCreatedAuthUser = true;
  } else {
    return NextResponse.json(
      { error: 'Could not create account. Please try again.' },
      { status: 500 },
    );
  }

  // ── WIRE PERSON → CREDENTIAL → MEMBERSHIP → OWNERSHIP ───────────────────

  try {
    // Reuse the Person already linked to this Auth identity, if any.
    let personId: string | null = null;

    const { data: credential, error: credentialLookupErr } = await svc
      .from('auth_credentials')
      .select('person_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (credentialLookupErr) {
      throw new Error('CREDENTIAL_LOOKUP_FAILED');
    }
    if (credential?.person_id) {
      personId = credential.person_id as string;
    } else {
      // Match the Person by email; otherwise create exactly one.
      const { data: existingPerson } = await svc
        .from('persons')
        .select('person_id')
        .eq('email', email)
        .limit(1)
        .maybeSingle();

      if (existingPerson?.person_id) {
        personId = existingPerson.person_id as string;
      } else {
        const { data: newPerson, error: personErr } = await svc
          .from('persons')
          .insert({ email, first_name: firstName, last_name: lastName })
          .select('person_id')
          .single();

        if (personErr) {
          // Concurrent insert may have won UNIQUE(email) — re-read.
          const { data: concurrent } = await svc
            .from('persons')
            .select('person_id')
            .eq('email', email)
            .limit(1)
            .maybeSingle();

          if (!concurrent?.person_id) {
            throw new Error('PERSON_CREATE_FAILED');
          }
          personId = concurrent.person_id as string;
        } else {
          personId = newPerson!.person_id as string;
        }
      }
    }

    if (!personId) throw new Error('PERSON_RESOLUTION_FAILED');

    // Upsert the canonical auth_credentials bridge.
    await svc
      .from('auth_credentials')
      .upsert(
        {
          person_id: personId,
          auth_provider: 'email',
          auth_user_id: authUserId,
          status: 'active',
        },
        { onConflict: 'auth_provider,auth_user_id' },
      );

    // Membership: owner (product access) + superadmin (management access).
    const roles: Array<{ role: string; portal_access: string }> = [
      { role: 'owner', portal_access: 'user' },
      { role: 'superadmin', portal_access: 'both' },
    ];

    const now = new Date().toISOString();

    for (const r of roles) {
      const { error: memErr } = await svc
        .from('organisation_memberships')
        .upsert(
          {
            organisation_id: organisationId,
            person_id: personId,
            role: r.role,
            portal_access: r.portal_access,
            status: 'active',
            valid_from: now,
          },
          { onConflict: 'organisation_id,person_id,role' },
        );

      if (memErr) {
        console.error('[api/owner/provision] membership failed:', memErr);
        throw new Error('MEMBERSHIP_CREATE_FAILED');
      }
    }

    // Ownership: exactly one current ownership period.
    const { data: existingOwnership } = await svc
      .from('ownership_periods')
      .select('ownership_period_id')
      .eq('organisation_id', organisationId)
      .eq('person_id', personId)
      .eq('status', 'current')
      .limit(1)
      .maybeSingle();

    if (!existingOwnership) {
      const { error: ownershipErr } = await svc
        .from('ownership_periods')
        .insert({
          organisation_id: organisationId,
          person_id: personId,
          status: 'current',
          valid_from: now,
        });

      if (ownershipErr) {
        console.error('[api/owner/provision] ownership failed:', ownershipErr);
        throw new Error('OWNERSHIP_CREATE_FAILED');
      }
    }

    // Pin the CEO's default org context so they land in this organisation.
    // The canonical selection lives on auth_credentials (see the
    // 20260904090000_auth_credentials_selected_org migration), not on users.
    const { data: credentialRow } = await svc
      .from('auth_credentials')
      .select('auth_credential_id, selected_org_id')
      .eq('auth_user_id', authUserId)
      .limit(1)
      .maybeSingle();

    if (credentialRow?.auth_credential_id && credentialRow.selected_org_id !== organisationId) {
      await svc
        .from('auth_credentials')
        .update({ selected_org_id: organisationId })
        .eq('auth_user_id', authUserId);
    }

    return NextResponse.json({
      ok: true,
      identity: {
        personId,
        authUserId,
        email,
        organisationId,
        roles: roles.map((r) => r.role),
        isOwner: true,
        isSuperadmin: true,
      },
      newAccount: newlyCreatedAuthUser,
      temporaryPassword: newlyCreatedAuthUser ? tempPassword : undefined,
    });
  } catch (err) {
    if (newlyCreatedAuthUser) {
      try {
        await svc.auth.admin.deleteUser(authUserId);
      } catch {
        // Best-effort cleanup; the canonical data must not be left orphaned.
      }
    }
    console.error('[api/owner/provision] wiring failed:', err);
    return NextResponse.json(
      { error: 'Could not provision owner. Please try again.' },
      { status: 500 },
    );
  }
}