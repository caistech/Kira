import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { TERMS_VERSION } from '@/lib/terms';

const VALID_ROLES = ['member', 'admin', 'consultant', 'employee', 'advisor'];

type SupabaseClient = ReturnType<typeof createServiceClientV2>;

/**
 * Paginate auth.admin.listUsers to locate an existing Supabase Auth user by
 * email. Returns null when no match exists. Mirrors the beta-redeem lookup.
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
 * POST /api/members/invite
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
 *   organisation_memberships  UNIQUE (organisation_id, person_id, role)
 *         │  organisation_id
 *         ▼
 *       Organisation          ← authCtx.organisationId (inviter context only)
 *
 * Ordering:
 *   1. organisation resolved from the inviter's authenticated context;
 *   2. Auth user resolved (existing) or created (exactly one);
 *   3. canonical Person resolved by priority:
 *        a. the Person already linked to this Auth user via auth_credentials;
 *        b. the Person matching the invitation email;
 *        c. otherwise exactly one new Person — re-read if a concurrent invite
 *           wins the UNIQUE(email) race;
 *   4. exactly one auth_credentials linkage (upsert);
 *   5. exactly one organisation_memberships row (upsert) in the inviter's org.
 *
 * A newly created Auth user is deleted (best-effort) if any subsequent
 * canonical wiring step fails. Existing Auth users are never deleted.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const authCtx = await getCurrentOrganisationContext();
  if (!authCtx || !['admin', 'superadmin'].includes(authCtx.role)) {
    return NextResponse.json(
      { error: 'Only an admin or superadmin can add team members.' },
      { status: 403 },
    );
  }
  if (!authCtx.organisationId) {
    return NextResponse.json(
      { error: 'Organisation context is required.' },
      { status: 403 },
    );
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  const firstName = String(body.firstName ?? '').trim().slice(0, 100);
  const lastName = String(body.lastName ?? '').trim().slice(0, 100);
  const role = String(body.role ?? 'member');
  const canSpend = body.canSpend !== false;

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
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  }

  const svc = createServiceClientV2();
  const tempPassword =
    Math.random().toString(36).slice(-12) +
    Math.random().toString(36).slice(-4).toUpperCase();

  // ── STEP 2: Create or resolve the Supabase Auth user ────────────────────
  //
  // Exactly one createUser call. If the email already has an Auth user we
  // resolve that existing identity and continue wiring — we never create a
  // second Auth account and we never delete an existing one.

  let authUserId: string;
  let newlyCreatedAuthUser = false;
  let existingAccount = false;

  const { data: createdUser, error: createErr } =
    await svc.auth.admin.createUser({
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
    if (!already) {
      console.error('[api/members/invite] createUser failed:', createErr);
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
      existingAccount = true;
    } catch (err) {
      console.error('[api/members/invite] existing Auth lookup failed:', err);
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

  // ── STEPS 3–5: resolve Person, then wire credential + membership ─────────
  //
  // If anything in here fails and this request created the Auth user
  // (newlyCreatedAuthUser), that user is deleted best-effort so no orphaned
  // Auth identity survives. Existing Auth users are never passed to
  // deleteUser().

  try {
    // STEP 3a: reuse the Person already linked to this Auth identity.
    //
    // Live unique index: auth_credentials_auth_provider_auth_user_id_key
    //   UNIQUE (auth_provider, auth_user_id)

    let personId: string | null = null;

    const { data: credential, error: credentialLookupErr } = await svc
      .from('auth_credentials')
      .select('person_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (credentialLookupErr) throw credentialLookupErr;

    if (credential?.person_id) {
      personId = credential.person_id;
    } else {
      // STEP 3b: resolve the canonical Person by email.
      //
      // persons.email is the canonical unique identity key (persons_email_key).
      // Exact match on the normalised email — no LIKE/ILIKE wildcards, so an
      // underscore or percent in an address can never resolve to a different
      // person.

      const { data: personByEmail, error: personLookupErr } = await svc
        .from('persons')
        .select('person_id')
        .eq('email', email)
        .maybeSingle();

      if (personLookupErr) throw personLookupErr;

      if (personByEmail?.person_id) {
        personId = personByEmail.person_id;
      } else {
        // STEP 3c: create exactly one Person for the invited email.
        //
        // Race-safe: two concurrent invites for the same email can both see
        // absence here. On a UNIQUE(email) violation from the insert we
        // re-read the winner's Person instead of creating a second row.

        const newPersonId = crypto.randomUUID();
        const { error: personInsertErr } = await svc.from('persons').insert({
          person_id: newPersonId,
          email,
          first_name: firstName,
          last_name: lastName,
        });

        if (personInsertErr) {
          const duplicate =
            personInsertErr.code === '23505' ||
            /duplicate key/i.test(personInsertErr.message);
          if (!duplicate) throw personInsertErr;

          const { data: winner, error: winnerErr } = await svc
            .from('persons')
            .select('person_id')
            .eq('email', email)
            .maybeSingle();
          if (winnerErr) throw winnerErr;
          if (!winner?.person_id) throw personInsertErr;

          personId = winner.person_id;
        } else {
          personId = newPersonId;
        }
      }
    }

    if (!personId) {
      throw new Error('Person could not be resolved.');
    }

    // STEP 4: exactly one canonical credential linkage.
    //
    // Live unique index: auth_credentials_auth_provider_auth_user_id_key
    //   UNIQUE (auth_provider, auth_user_id)

    const { error: credErr } = await svc
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
    if (credErr) throw credErr;

    // STEP 5: exactly one organisation membership in the inviter's org.
    //
    // Live unique index: organisation_memberships_organisation_id_person_id_role_key
    //   UNIQUE (organisation_id, person_id, role)
    // organisation_id is ALWAYS authCtx.organisationId — never client-supplied.

    const { error: memErr } = await svc
      .from('organisation_memberships')
      .upsert(
        {
          organisation_id: authCtx.organisationId,
          person_id: personId,
          role,
          can_spend: canSpend,
          status: 'active',
        },
        { onConflict: 'organisation_id,person_id,role' },
      );
    if (memErr) throw memErr;

    if (existingAccount) {
      return NextResponse.json({ ok: true, existing: true });
    }
    return NextResponse.json({ ok: true, tempPassword });
  } catch (err) {
    console.error('[api/members/invite] wiring failed:', err);

    if (newlyCreatedAuthUser) {
      svc.auth.admin.deleteUser(authUserId).catch((cleanupErr) => {
        console.error('[api/members/invite] auth cleanup failed:', cleanupErr);
      });
    }

    return NextResponse.json(
      { error: 'Could not complete invite.' },
      { status: 500 },
    );
  }
}