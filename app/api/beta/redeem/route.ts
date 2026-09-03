// app/api/beta/redeem/route.ts
//
// BETA REDEMPTION
// ---------------
//
// Beta redemption is a provisioning boundary.
//
// It is NOT an alternative identity-definition path.
//
// The canonical identity boundary remains:
//
//   /plan
//      ↓
//   Person
//      ↓
//   Organisation
//      ↓
//   Membership
//      ↓
//   Ownership, when explicitly declared
//
// This route therefore does ONLY beta provisioning:
//
//   1. validate and atomically claim the beta code;
//   2. obtain the invitation-bound email;
//   3. create the Supabase Auth account;
//   4. leave existing accounts untouched;
//   5. record beta provenance;
//   6. establish beta entitlement in the Organisation only when canonical
//      organisation context already exists;
//   7. return the email needed by the client to establish the session.
//
// A newly-created Auth account is then signed in by BetaRedeem.tsx and sent
// back to /plan.
//
// /plan subsequently performs:
//
//   Auth
//      ↓
//   auth_credentials
//      ↓
//   Person
//      ↓
//   Organisation
//      ↓
//   Membership
//      ↓
//   Ownership
//
// IMPORTANT:
//
// The beta route must NEVER establish Organisation identity from:
//
//   - auth.users.id;
//   - public.users.id;
//   - email;
//   - beta code;
//   - "first user";
//   - invitation provenance;
//
// `users.id` is retained only as a legacy/provenance bridge where an existing
// application-user row is available.
//
// The beta code itself is provenance/access information, not ownership authority.

import { NextRequest, NextResponse } from 'next/server';

import {
  ATTRIBUTION_COOKIE,
  attachFirstTouch,
  attribution,
} from '@/lib/introducer';

import {
  BETA_CODE_REJECTION_MESSAGE,
  claimBetaCode,
  linkBetaCodeToUser,
  releaseBetaCode,
} from '@/lib/billing/beta-codes';

import { getBetaGate } from '@/lib/billing';
import { createServiceClientV2 } from '@/lib/supabase/server';
import {
  getCurrentOrganisationContext,
  getAuthUser,
} from '@/lib/auth';
import { TERMS_VERSION } from '@/lib/terms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REJECTION_MESSAGE = BETA_CODE_REJECTION_MESSAGE;

type RedeemRequestBody = {
  code?: unknown;
  password?: unknown;
  termsAccepted?: unknown;
  termsVersion?: unknown;
};

type RedeemSuccess = {
  ok: true;
  email: string;
  existing?: false;
};

type ExistingAccountSuccess = {
  ok: true;
  existing: true;
  email: string;
};

function normaliseString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Determine whether the current request already has a canonical
 * organisational context.
 *
 * This is intentionally optional.
 *
 * A newly-created beta account will not have one yet, because /plan is the
 * component that establishes the Person → Organisation relationship.
 *
 * An already-authenticated user may already have one.
 */
async function getOptionalCanonicalOrganisationId(): Promise<string | null> {
  try {
    const context = await getCurrentOrganisationContext();

    return context?.organisationId ?? null;
  } catch {
    return null;
  }
}

/**
 * Link beta provenance to an existing legacy application-user row when one
 * already exists.
 *
 * This is deliberately best-effort and never establishes organisational
 * authority.
 */
async function linkLegacyApplicationUser(
  svc: ReturnType<typeof createServiceClientV2>,
  authUserId: string,
  email: string,
): Promise<string | null> {
  const { data, error } = await svc
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) {
    console.warn(
      '[api/beta/redeem] legacy users bridge lookup failed:',
      error.message,
    );

    return null;
  }

  if (data?.id) {
    return data.id;
  }

  /*
   * The legacy table is NOT canonical identity.
   *
   * If another part of the application has already created the bridge row,
   * use it. Otherwise do not manufacture organisational authority here.
   */
  const { data: byEmail, error: emailError } = await svc
    .from('users')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  if (emailError) {
    console.warn(
      '[api/beta/redeem] legacy users email lookup failed:',
      emailError.message,
    );

    return null;
  }

  if (!byEmail?.id) {
    return null;
  }

  /*
   * Adoption is strictly a provenance bridge.
   *
   * It is guarded so an already-linked row cannot be repointed.
   */
  const { data: adopted, error: adoptError } = await svc
    .from('users')
    .update({
      auth_user_id: authUserId,
    })
    .eq('id', byEmail.id)
    .is('auth_user_id', null)
    .select('id')
    .maybeSingle();

  if (adoptError) {
    console.warn(
      '[api/beta/redeem] legacy users bridge adoption failed:',
      adoptError.message,
    );

    return null;
  }

  return adopted?.id ?? null;
}

/**
 * Start beta entitlement only when a canonical Organisation context already
 * exists.
 *
 * For a brand-new beta account this returns without doing anything.
 *
 * The newly-created account will establish its Organisation through /plan,
 * after which the normal Organisation-scoped beta service can be invoked.
 */
async function ensureExistingOrganisationBetaEntitlement(): Promise<void> {
  const organisationId = await getOptionalCanonicalOrganisationId();

  if (!organisationId) {
    return;
  }

  try {
    await getBetaGate().ensureTrial(organisationId);
  } catch (error) {
    /*
     * Entitlement failure must not mutate identity or cause a second Auth
     * account to be created on retry.
     */
    console.error(
      '[api/beta/redeem] existing organisation beta entitlement failed:',
      error,
    );
  }
}

/**
 * POST /api/beta/redeem
 *
 * Provision a beta invitation.
 *
 * Contract:
 *
 * Request:
 *   {
 *     code: string;
 *     password: string;
 *     termsAccepted: true;
 *     termsVersion?: string;
 *   }
 *
 * Success for a new account:
 *   {
 *     ok: true;
 *     email: string;
 *   }
 *
 * Success for an existing account:
 *   {
 *     ok: true;
 *     existing: true;
 *     email: string;
 *   }
 *
 * No organisationId, isOwner, firstName or lastName is accepted as authority
 * here. Those belong to /plan.
 */
export async function POST(request: NextRequest) {
  let body: RedeemRequestBody;

  try {
    body = (await request.json()) as RedeemRequestBody;
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid body',
        code: 'INVALID_BODY',
      },
      { status: 400 },
    );
  }

  const rawCode = normaliseString(body.code);
  const password =
    typeof body.password === 'string' ? body.password : '';

  const termsAccepted = body.termsAccepted === true;

  const submittedTermsVersion =
    normaliseString(body.termsVersion);

  if (!rawCode) {
    return NextResponse.json(
      {
        error: 'Enter your invitation code.',
        code: 'CODE_REQUIRED',
      },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      {
        error: 'Password must be at least 8 characters',
        code: 'PASSWORD_TOO_SHORT',
      },
      { status: 400 },
    );
  }

  if (!termsAccepted) {
    return NextResponse.json(
      {
        error:
          'Please agree to the Terms and Privacy Policy to continue.',
        code: 'TERMS_REQUIRED',
      },
      { status: 400 },
    );
  }

  if (
    submittedTermsVersion &&
    submittedTermsVersion !== TERMS_VERSION
  ) {
    return NextResponse.json(
      {
        error:
          'The Terms have changed. Please review and accept the current Terms and Privacy Policy.',
        code: 'TERMS_VERSION_MISMATCH',
      },
      { status: 400 },
    );
  }

  /*
   * ---------------------------------------------------------------------------
   * AUTHENTICATED EXISTING USER
   * ---------------------------------------------------------------------------
   *
   * If a person is already authenticated, that Auth identity is relevant only
   * to establishing whether the request is already associated with a canonical
   * context.
   *
   * We NEVER use auth_user_id as organisation identity.
   */
  const authenticatedUser = await getAuthUser();

  /*
   * ---------------------------------------------------------------------------
   * 1. ATOMIC BETA CODE CLAIM
   * ---------------------------------------------------------------------------
   *
   * This remains the critical concurrency boundary.
   *
   * claimBetaCode performs the guarded UPDATE:
   *
   *   WHERE code = ?
   *   AND redeemed_at IS NULL
   *
   * Only one simultaneous redemption can win.
   *
   * The claim happens before Auth creation so that a code cannot provision
   * multiple accounts under concurrent requests.
   */
  const claim = await claimBetaCode(rawCode);

  if (!claim.ok) {
    console.warn(
      `[api/beta/redeem] rejected beta code: reason=${claim.reason}`,
    );

    return NextResponse.json(
      {
        error: REJECTION_MESSAGE,
        code: 'BETA_CODE_REJECTED',
      },
      { status: 400 },
    );
  }

  const email = claim.email;
  const svc = createServiceClientV2();

  /*
   * ---------------------------------------------------------------------------
   * 2. EXISTING AUTHENTICATED ACCOUNT
   * ---------------------------------------------------------------------------
   *
   * If the browser is already authenticated as the same invitation email,
   * do not create another Auth account.
   *
   * The beta route still does not define Organisation identity.
   */
  if (
    authenticatedUser?.email &&
    authenticatedUser.email.toLowerCase() === email.toLowerCase()
  ) {
    const legacyUserId = await linkLegacyApplicationUser(
      svc,
      authenticatedUser.id,
      email,
    );

    await linkBetaCodeToUser(
      rawCode,
      legacyUserId ?? authenticatedUser.id,
    );

    await ensureExistingOrganisationBetaEntitlement();

    try {
      const touch = attribution.parse(
        request.cookies.get(ATTRIBUTION_COOKIE)?.value,
      );

      if (touch && legacyUserId) {
        await attachFirstTouch({
          userId: legacyUserId,
          userEmail: email,
          introducerId: touch.referrerId,
          firstTouchAt: touch.firstTouchAt,
        });
      }
    } catch (error) {
      console.error(
        '[api/beta/redeem] attribution not recorded:',
        error,
      );
    }

    return NextResponse.json<ExistingAccountSuccess>({
      ok: true,
      existing: true,
      email,
    });
  }

  /*
   * ---------------------------------------------------------------------------
   * 3. CREATE AUTH ACCOUNT
   * ---------------------------------------------------------------------------
   *
   * The invitation-bound email is authoritative.
   *
   * The request body cannot provide or override the email.
   */
  const { data: createdAuth, error: createError } =
    await svc.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        terms_accepted: true,
        terms_version: TERMS_VERSION,
        beta_invitation: true,
      },
    });

  if (createError || !createdAuth.user) {
    const alreadyExists = /already|registered|exists/i.test(
      createError?.message ?? '',
    );

    if (alreadyExists) {
      /*
       * Existing Auth accounts are never mutated.
       *
       * Because the code has already been atomically claimed, we return the
       * existing-account response rather than attempting password mutation or
       * account takeover.
       *
       * The code can remain claimed against the invitation; the user can sign
       * in and contact support if necessary.
       */
      console.warn(
        `[api/beta/redeem] invitation supplied for existing Auth account; ` +
          `existing account was not mutated. email=${email}`,
      );

      return NextResponse.json<ExistingAccountSuccess>({
        ok: true,
        existing: true,
        email,
      });
    }

    /*
     * No Auth account was created, so the narrow release exception applies.
     *
     * This makes a transient Auth-provider failure retryable.
     */
    await releaseBetaCode(rawCode);

    console.error(
      '[api/beta/redeem] Auth account creation failed; beta code released:',
      createError,
    );

    return NextResponse.json(
      {
        error: 'Could not create your account. Please try again.',
        code: 'AUTH_CREATE_FAILED',
      },
      { status: 500 },
    );
  }

  const authUserId = createdAuth.user.id;

  /*
   * ---------------------------------------------------------------------------
   * 4. LEGACY BETA PROVENANCE BRIDGE
   * ---------------------------------------------------------------------------
   *
   * This is deliberately not canonical identity.
   *
   * users.id is retained only where required by legacy/provenance consumers.
   */
  const legacyUserId = await linkLegacyApplicationUser(
    svc,
    authUserId,
    email,
  );

  await linkBetaCodeToUser(
    rawCode,
    legacyUserId ?? authUserId,
  );

  if (legacyUserId) {
    const { error: userUpdateError } = await svc
      .from('users')
      .update({
        journey_type: 'business',
        updated_at: new Date().toISOString(),
      })
      .eq('id', legacyUserId);

    if (userUpdateError) {
      /*
       * Legacy journey metadata is non-authoritative provenance.
       *
       * Failure here must not invalidate the newly-created canonical Auth
       * account or attempt another redemption.
       */
      console.warn(
        '[api/beta/redeem] legacy journey metadata was not updated:',
        userUpdateError.message,
      );
    }
  }

  /*
   * ---------------------------------------------------------------------------
   * 5. ATTRIBUTION
   * ---------------------------------------------------------------------------
   *
   * Attribution describes acquisition provenance.
   *
   * It does not establish:
   *   - Person identity;
   *   - Organisation identity;
   *   - membership;
   *   - ownership.
   */
  try {
    const touch = attribution.parse(
      request.cookies.get(ATTRIBUTION_COOKIE)?.value,
    );

    if (touch && legacyUserId) {
      await attachFirstTouch({
        userId: legacyUserId,
        userEmail: email,
        introducerId: touch.referrerId,
        firstTouchAt: touch.firstTouchAt,
      });
    }
  } catch (error) {
    console.error(
      '[api/beta/redeem] attribution not recorded:',
      error,
    );
  }

  /*
   * ---------------------------------------------------------------------------
   * 6. EXISTING ORGANISATION CONTEXT, IF ANY
   * ---------------------------------------------------------------------------
   *
   * A newly-created account normally has no canonical Organisation context yet.
   *
   * An already-authenticated canonical context is handled above.
   *
   * We therefore do not manufacture an organisation here.
   */
  await ensureExistingOrganisationBetaEntitlement();

  /*
   * ---------------------------------------------------------------------------
   * 7. RETURN PROVISIONING RESULT
   * ---------------------------------------------------------------------------
   *
   * The client now signs in with the password it just established and returns
   * to /plan.
   *
   * /plan owns the next operation:
   *
   *   Auth
   *      ↓
   *   auth_credentials
   *      ↓
   *   Person
   *      ↓
   *   Organisation
   *      ↓
   *   Membership
   *      ↓
   *   Ownership
   *
   * The beta route has finished its job.
   */
  return NextResponse.json<RedeemSuccess>({
    ok: true,
    email,
  });
}