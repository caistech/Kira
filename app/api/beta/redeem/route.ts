// app/api/beta/redeem/route.ts
//
// BETA REDEMPTION
// ---------------
//
// Beta redemption is a provisioning path, not an identity-definition path.
//
// Every acquisition path in Kira converges on /plan before entering the product:
//   organic signup
//   direct invitation
//   system invitation
//   distributor invitation
//   beta invitation
//   paid acquisition
//
// /plan is the universal organisational identity and initial ownership-claim boundary.
//
// By the time this route runs, the Person has:
//   - identified themselves;
//   - supplied their first and last name;
//   - identified or confirmed the Organisation;
//   - explicitly declared whether they are the Owner.
//
// A checked "I am the Owner of this Business" creates the initial
// SELF_DECLARED ownership claim.
//
// The beta code does NOT establish ownership.
//
// The beta code establishes:
//   - invitation provenance;
//   - the email address to which the invitation is bound;
//   - the Organisation context associated with the invitation.
//
// This route therefore must never infer ownership from:
//   - auth.users.id;
//   - public.users.id;
//   - email;
//   - invitation provenance;
//   - the fact that this is the first Person associated with the Organisation;
//   - or the beta code itself.
//
// CANONICAL IDENTITY
// ------------------
//
// The canonical model is:
//
//   Auth account
//        ↓
//   Person
//        ↓
//   Organisation
//        ↓
//   Membership
//        ↓
//   Organisation context
//
// Organisation is the enduring organisational subject.
// Person is the human identity.
// Membership establishes the Person's relationship to the Organisation.
//
// `users.id` is an Auth/application bridge identifier.
// It is NOT the Organisation identity.
//
// This route therefore:
//   1. atomically claims the beta code;
//   2. creates the new Auth account;
//   3. resolves the canonical Person;
//   4. verifies the Organisation supplied by the /plan flow / beta code;
//   5. establishes the Person → Organisation membership;
//   6. records the initial SELF_DECLARED ownership claim when supplied by /plan;
//   7. links the beta code to the application user;
//   8. starts the beta trial in Organisation context;
//   9. records attribution against the Person/application identity.
//
// Existing Auth accounts are never mutated by this route.
// In particular, this route never changes an existing user's password,
// ownership, Organisation membership, or beta status.

import { NextRequest, NextResponse } from 'next/server';

import { ATTRIBUTION_COOKIE, attachFirstTouch, attribution } from '@/lib/introducer';
import {
  BETA_CODE_REJECTION_MESSAGE,
  claimBetaCode,
  linkBetaCodeToUser,
  releaseBetaCode,
} from '@/lib/billing/beta-codes';
import { getBetaGate } from '@/lib/billing';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { TERMS_VERSION } from '@/lib/terms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REJECTION_MESSAGE = BETA_CODE_REJECTION_MESSAGE;

type BootstrapIdentity = {
  authUserId: string;
  appUserId: string;
  personId: string;
  organisationId: string;
  membershipId: string;
};

/**
 * Establish the canonical identity for a newly-created Auth account.
 *
 * IMPORTANT:
 *
 * This function does not discover or invent organisational identity.
 *
 * The Organisation context has already been established by the acquisition
 * flow and /plan. This function verifies that the supplied Organisation exists
 * and then establishes the canonical Person → Organisation relationship.
 *
 * Ownership is likewise NOT inferred here.
 *
 * If the /plan flow declared that this Person is the Owner, the initial
 * ownership claim is explicitly represented as SELF_DECLARED.
 */
async function bootstrapCanonicalIdentity(params: {
  svc: ReturnType<typeof createServiceClientV2>;
  authUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  organisationId: string;
  isOwner: boolean;
}): Promise<BootstrapIdentity> {
  const {
    svc,
    authUserId,
    email,
    firstName,
    lastName,
    organisationId,
    isOwner,
  } = params;

  // ---------------------------------------------------------------------------
  // 1. AUTH → APPLICATION BRIDGE
  // ---------------------------------------------------------------------------
  //
  // The Auth account is not the canonical application identity.
  //
  // public.users is only the bridge between Supabase Auth and the application.

  const { data: appUser, error: appUserError } = await svc
    .from('users')
    .select('id')
    .eq('id', authUserId)
    .maybeSingle();

  if (appUserError) {
    throw new Error(`users bridge lookup failed: ${appUserError.message}`);
  }

  if (!appUser) {
    throw new Error(
      'Auth account exists but public.users bridge was not created',
    );
  }

  // ---------------------------------------------------------------------------
  // 2. AUTH → PERSON
  // ---------------------------------------------------------------------------
  //
  // Resolve the human identity.
  //
  // Person remains distinct from:
  //   - Auth;
  //   - Organisation;
  //   - membership;
  //   - ownership.
  //
  // We first prefer an explicit Auth identity relationship.
  // Email is only a fallback for resolving the human identity. It is never an
  // Organisation identifier.

  let person: { id: string } | null = null;

  const { data: personByAuth, error: personAuthError } = await svc
    .from('persons')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (!personAuthError && personByAuth) {
    person = personByAuth;
  }

  if (!person) {
    const { data: personByEmail, error: personEmailError } = await svc
      .from('persons')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (personEmailError) {
      throw new Error(`person lookup failed: ${personEmailError.message}`);
    }

    if (personByEmail) {
      person = personByEmail;
    }
  }

  if (!person) {
    const { data: createdPerson, error: createPersonError } = await svc
      .from('persons')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        auth_user_id: authUserId,
      })
      .select('id')
      .single();

    if (createPersonError || !createdPerson) {
      throw new Error(
        `person creation failed: ${
          createPersonError?.message ?? 'no person returned'
        }`,
      );
    }

    person = createdPerson;
  }

  // ---------------------------------------------------------------------------
  // 3. VERIFY ORGANISATION
  // ---------------------------------------------------------------------------
  //
  // The Organisation is NOT created here.
  //
  // The Organisation context was established by /plan.
  //
  // Never derive an Organisation from:
  //   - authUserId;
  //   - appUser.id;
  //   - email;
  //   - person.id;
  //   - "first user";
  //   - beta invitation provenance.
  //
  // We only accept the already-established Organisation identity and verify
  // that it exists.

  const { data: organisation, error: organisationError } = await svc
    .from('organisations')
    .select('id')
    .eq('id', organisationId)
    .maybeSingle();

  if (organisationError) {
    throw new Error(
      `organisation lookup failed: ${organisationError.message}`,
    );
  }

  if (!organisation) {
    throw new Error(
      'The Organisation established during /plan could not be found',
    );
  }

  // ---------------------------------------------------------------------------
  // 4. PERSON → ORGANISATION MEMBERSHIP
  // ---------------------------------------------------------------------------
  //
  // Membership is the canonical relationship between the Person and the
  // Organisation.
  //
  // Do not encode this relationship by treating users.id as organisation_id.

  const { data: existingMembership, error: membershipLookupError } = await svc
    .from('organisation_memberships')
    .select('id, role')
    .eq('organisation_id', organisation.id)
    .eq('person_id', person.id)
    .maybeSingle();

  if (membershipLookupError) {
    throw new Error(
      `organisation membership lookup failed: ${membershipLookupError.message}`,
    );
  }

  let membershipId: string;

  if (existingMembership) {
    membershipId = existingMembership.id;
  } else {
    const { data: membership, error: membershipError } = await svc
      .from('organisation_memberships')
      .insert({
        organisation_id: organisation.id,
        person_id: person.id,
        role: isOwner ? 'owner' : 'member',
      })
      .select('id')
      .single();

    if (membershipError || !membership) {
      throw new Error(
        `organisation membership creation failed: ${
          membershipError?.message ?? 'no membership returned'
        }`,
      );
    }

    membershipId = membership.id;
  }

  // ---------------------------------------------------------------------------
  // 5. INITIAL OWNERSHIP CLAIM
  // ---------------------------------------------------------------------------
  //
  // Ownership is NOT inferred from being the first Person.
  //
  // Ownership exists only because the Person explicitly declared it during
  // /plan.
  //
  // The initial declaration is represented as:
  //
  //   SELF_DECLARED
  //
  // The precise ownership-period schema is authoritative here. If the target
  // schema does not yet expose the required ownership-claim write surface,
  // this route must fail rather than silently substituting membership.role
  // for an ownership claim.

  if (isOwner) {
    const { error: ownershipError } = await svc
      .from('ownership_periods')
      .insert({
        organisation_id: organisation.id,
        person_id: person.id,
        claim_type: 'SELF_DECLARED',
      });

    if (ownershipError) {
      throw new Error(
        `initial SELF_DECLARED ownership claim failed: ${ownershipError.message}`,
      );
    }
  }

  return {
    authUserId,
    appUserId: appUser.id,
    personId: person.id,
    organisationId: organisation.id,
    membershipId,
  };
}

/**
 * ONE MESSAGE FOR EVERY BETA-CODE REJECTION.
 *
 * "No such code", "already used" and "expired" are intentionally not
 * distinguished to an anonymous caller.
 *
 * The actual reason is logged for operators.
 */
export async function POST(request: NextRequest) {
  let body: {
    code?: unknown;
    password?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    organisationId?: unknown;
    isOwner?: unknown;
    termsAccepted?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid body' },
      { status: 400 },
    );
  }

  const rawCode = typeof body.code === 'string' ? body.code : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!rawCode.trim()) {
    return NextResponse.json(
      { error: 'Enter your invitation code.' },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 },
    );
  }

  if (body.termsAccepted !== true) {
    return NextResponse.json(
      {
        error:
          'Please agree to the Terms and Privacy Policy to continue.',
      },
      { status: 400 },
    );
  }

  // /plan is the identity boundary.
  //
  // Do not allow redemption to invent an Organisation or silently assign one.
  const organisationId =
    typeof body.organisationId === 'string'
      ? body.organisationId.trim()
      : '';

  if (!organisationId) {
    return NextResponse.json(
      {
        error:
          'Please complete the business details before redeeming your invitation.',
      },
      { status: 400 },
    );
  }

  const isOwner = body.isOwner === true;

  // ---------------------------------------------------------------------------
  // 1. CLAIM BETA CODE
  // ---------------------------------------------------------------------------
  //
  // Claim first, atomically.
  //
  // The beta code remains authoritative for the invited email.
  // The request body is never trusted for email identity.

  const claim = await claimBetaCode(rawCode);

  if (!claim.ok) {
    console.warn(
      `[api/beta/redeem] rejected a code: reason=${claim.reason}`,
    );

    return NextResponse.json(
      { error: REJECTION_MESSAGE },
      { status: 400 },
    );
  }

  const email = claim.email;
  const svc = createServiceClientV2();

  // ---------------------------------------------------------------------------
  // 2. VALIDATE / ANCHOR ORGANISATION CONTEXT
  // ---------------------------------------------------------------------------
  //
  // A beta code may carry an Organisation context, but that does not itself
  // constitute ownership.
  //
  // When the code IS bound to an Organisation, that Organisation must match the
  // one established by /plan — this prevents an invitation from silently moving
  // a Person into a different Organisation.
  //
  // When the code is NOT yet bound (organisation_id NULL at mint — the P2.4
  // backfill pattern, see 20260901090000_beta_codes_org_nullable.sql), the
  // Organisation does not exist until redemption. /plan has just established it,
  // so we backfill the code with that Organisation here. The canonical identity
  // bootstrap below then verifies the Organisation exists and ties the Person to
  // it. The code is bound at redemption, matching the documented model.

  if (claim.organisation_id && claim.organisation_id !== organisationId) {
    await releaseBetaCode(rawCode);

    console.warn(
      `[api/beta/redeem] organisation mismatch: ` +
        `code_organisation_id=${claim.organisation_id} ` +
        `plan_organisation_id=${organisationId}`,
    );

    return NextResponse.json(
      {
        error:
          'The invitation does not match the business selected during setup.',
      },
      { status: 400 },
    );
  }

  // Bind a previously-unbound code to the Organisation established by /plan.
  // Harmless for an already-bound code (same organisation) and idempotent.
  if (claim.organisation_id !== organisationId) {
    await svc
      .from('beta_codes')
      .update({ organisation_id: organisationId })
      .eq('code', rawCode);
  }

  const askedFirstName =
    typeof body.firstName === 'string'
      ? body.firstName.trim().slice(0, 40)
      : '';

  const askedLastName =
    typeof body.lastName === 'string'
      ? body.lastName.trim().slice(0, 40)
      : '';

  const firstName =
    askedFirstName || email.split('@')[0].split(' ')[0];

  const lastName = askedLastName;

  // ---------------------------------------------------------------------------
  // 3. CREATE AUTH ACCOUNT
  // ---------------------------------------------------------------------------

  const { data: createdAuth, error: createErr } =
    await svc.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        terms_accepted: 'true',
        terms_version: TERMS_VERSION,
      },
    });

  if (createErr || !createdAuth.user) {
    const already = /already|registered|exists/i.test(
      createErr?.message ?? '',
    );

    if (!already) {
      await releaseBetaCode(rawCode);

      console.error(
        '[api/beta/redeem] createUser failed, code released:',
        createErr,
      );

      return NextResponse.json(
        {
          error:
            'Could not create your account. Please try again.',
        },
        { status: 500 },
      );
    }

    // Existing accounts are NEVER mutated.
    //
    // Do not change:
    //   - password;
    //   - ownership;
    //   - membership;
    //   - Organisation;
    //   - beta state.
    //
    // A beta code arriving for an existing account is therefore not a
    // second identity-bootstrap operation.

    console.warn(
      `[api/beta/redeem] code supplied for an existing account — ` +
        `nothing mutated. email=${email}`,
    );

    return NextResponse.json(
      {
        ok: true,
        existing: true,
        email,
      },
      { status: 200 },
    );
  }

  const authUserId = createdAuth.user.id;

  // ---------------------------------------------------------------------------
  // 4. ESTABLISH CANONICAL IDENTITY
  // ---------------------------------------------------------------------------
  //
  // Auth creation alone is insufficient.
  //
  // Required canonical chain:
  //
  //   Auth
  //     ↓
  //   Person
  //     ↓
  //   Organisation
  //     ↓
  //   Membership
  //     ↓
  //   Organisation context
  //
  // Ownership, where declared on /plan, is represented independently as the
  // initial SELF_DECLARED ownership claim.

  let identity: BootstrapIdentity;

  try {
    identity = await bootstrapCanonicalIdentity({
      svc,
      authUserId,
      email,
      firstName,
      lastName,
      organisationId,
      isOwner,
    });
  } catch (identityError) {
    console.error(
      '[api/beta/redeem] canonical identity bootstrap failed:',
      identityError,
    );

    // The Auth account now exists.
    //
    // Do NOT release the beta code and attempt to create another account on
    // retry. The account must remain the unique identity for this email.
    //
    // The caller receives a retryable response. The actual failure remains in
    // operator logs.

    return NextResponse.json(
      {
        error:
          'Account setup is not ready. Please sign in or try again shortly.',
      },
      { status: 500 },
    );
  }

  const {
    appUserId,
    personId,
    organisationId: canonicalOrganisationId,
    membershipId,
  } = identity;

  console.info(
    `[api/beta/redeem] canonical identity established: ` +
      `auth_user_id=${authUserId} ` +
      `person_id=${personId} ` +
      `organisation_id=${canonicalOrganisationId} ` +
      `membership_id=${membershipId} ` +
      `ownership_claim=${isOwner ? 'SELF_DECLARED' : 'NONE'}`,
  );

  // ---------------------------------------------------------------------------
  // 5. LINK BETA CODE TO APPLICATION USER
  // ---------------------------------------------------------------------------
  //
  // users.id is retained only as the Auth/application bridge.
  //
  // It is never treated as organisation_id.

  await linkBetaCodeToUser(rawCode, appUserId);

  await svc
    .from('users')
    .update({
      journey_type: 'business',
      updated_at: new Date().toISOString(),
    })
    .eq('id', appUserId);

  // ---------------------------------------------------------------------------
  // 6. START BETA TRIAL IN ORGANISATION CONTEXT
  // ---------------------------------------------------------------------------
  //
  // The Organisation is now the application subject.
  //
  // Downstream beta/billing services receive organisation_id, never users.id.

  try {
    await getBetaGate().ensureTrial(canonicalOrganisationId);
  } catch (trialError) {
    console.error(
      '[api/beta/redeem] trial not started (canonical account IS created):',
      trialError,
    );
  }

  // ---------------------------------------------------------------------------
  // 7. ATTRIBUTION
  // ---------------------------------------------------------------------------
  //
  // Attribution describes how the Person arrived.
  //
  // It does not establish:
  //   - Organisation identity;
  //   - ownership;
  //   - membership.
  //
  // Attribution therefore remains attached to the Person/application identity.

  try {
    const touch = attribution.parse(
      request.cookies.get(ATTRIBUTION_COOKIE)?.value,
    );

    if (touch) {
      await attachFirstTouch({
        userId: appUserId,
        userEmail: email,
        introducerId: touch.referrerId,
        firstTouchAt: touch.firstTouchAt,
      });
    }
  } catch (attributionError) {
    console.error(
      '[api/beta/redeem] attribution not recorded:',
      attributionError,
    );
  }

  // ---------------------------------------------------------------------------
  // 8. NO VALUATION WRITE
  // ---------------------------------------------------------------------------
  //
  // Valuation answers remain owned by their dedicated claim/provisioning path.
  //
  // This route establishes canonical identity and beta service entitlement.
  // It must not become a second valuation writer.

  return NextResponse.json({
    ok: true,
    email,
    organisationId: canonicalOrganisationId,
  });
}