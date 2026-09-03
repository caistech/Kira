// app/api/beta/redeem/route.ts
//
// BETA REDEMPTION
// ---------------
//
// Beta redemption is a provisioning boundary.
//
// It is NOT an alternative identity-definition path.
//
// Canonical identity remains:
//
//   Supabase Auth
//        ↓
//   auth_credentials
//        ↓
//   Person
//        ↓
//   Organisation
//        ↓
//   Membership
//        ↓
//   Ownership, when explicitly declared
//
// This route therefore does ONLY beta provisioning:
//
//   1. validate the invitation;
//   2. determine whether the bound Auth account already exists;
//   3. leave an existing account untouched;
//   4. atomically claim the invitation for a NEW account;
//   5. create the Auth identity;
//   6. preserve beta provenance;
//   7. return the invitation-bound email.
//
// It NEVER creates an Organisation.
//
// /plan is the canonical identity convergence point.

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
  peekBetaCode,
  releaseBetaCode,
} from '@/lib/billing/beta-codes';

import { createServiceClientV2 } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
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
 * Locate a legacy users row associated with an Auth identity.
 *
 * IMPORTANT:
 *
 * This is a provenance/compatibility bridge only.
 *
 * users.id is NOT used as:
 *   - Organisation identity;
 *   - tenancy authority;
 *   - membership authority;
 *   - ownership authority.
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
   * A legacy row may exist before the Auth bridge has been attached.
   *
   * Adoption is only permitted when the row has no Auth identity yet.
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
 * Check whether an Auth account already exists for the invitation-bound email.
 *
 * This check happens BEFORE claimBetaCode().
 *
 * That is essential:
 *
 *   existing account
 *        ↓
 *   do not consume invitation
 *
 * Supabase's admin listUsers API does not provide the same simple exact-email
 * lookup contract as the application tables, so we paginate defensively.
 *
 * The invitation email is already known from peekBetaCode(), so no
 * user-controlled email enters this operation.
 */
async function findExistingAuthUser(
  svc: ReturnType<typeof createServiceClientV2>,
  email: string,
): Promise<{ id: string; email: string } | null> {
  const targetEmail = email.toLowerCase();

  /*
   * Auth accounts are expected to be few enough for the first page during
   * beta. We nevertheless use pagination and stop at the first match.
   *
   * If the project later has enough Auth users for this to become inefficient,
   * replace this with an authoritative email lookup RPC/API rather than
   * changing the redemption semantics.
   */
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await svc.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(
        `Unable to check existing Auth account: ${error.message}`,
      );
    }

    const users = data?.users ?? [];

    const match = users.find(
      (candidate) =>
        typeof candidate.email === 'string' &&
        candidate.email.toLowerCase() === targetEmail,
    );

    if (match?.id && match.email) {
      return {
        id: match.id,
        email: match.email.toLowerCase(),
      };
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

/**
 * Attach attribution to an existing legacy application-user row.
 *
 * Attribution is acquisition provenance only.
 *
 * It does not establish:
 *   - Person;
 *   - Organisation;
 *   - membership;
 *   - ownership.
 */
async function recordAttribution(
  request: NextRequest,
  legacyUserId: string | null,
  email: string,
): Promise<void> {
  if (!legacyUserId) {
    return;
  }

  try {
    const touch = attribution.parse(
      request.cookies.get(ATTRIBUTION_COOKIE)?.value,
    );

    if (!touch) {
      return;
    }

    await attachFirstTouch({
      userId: legacyUserId,
      userEmail: email,
      introducerId: touch.referrerId,
      firstTouchAt: touch.firstTouchAt,
    });
  } catch (error) {
    console.error(
      '[api/beta/redeem] attribution not recorded:',
      error,
    );
  }
}

/**
 * POST /api/beta/redeem
 *
 * Request:
 *
 * {
 *   code: string;
 *   password: string;
 *   termsAccepted: true;
 *   termsVersion?: string;
 * }
 *
 * New-account response:
 *
 * {
 *   ok: true;
 *   email: string;
 * }
 *
 * Existing-account response:
 *
 * {
 *   ok: true;
 *   existing: true;
 *   email: string;
 * }
 */
export async function POST(request: NextRequest) {
  let body: RedeemRequestBody;

  try {
    body = (await request.json()) as RedeemRequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
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
        ok: false,
        error: 'Enter your invitation code.',
        code: 'CODE_REQUIRED',
      },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Password must be at least 8 characters',
        code: 'PASSWORD_TOO_SHORT',
      },
      { status: 400 },
    );
  }

  if (!termsAccepted) {
    return NextResponse.json(
      {
        ok: false,
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
        ok: false,
        error:
          'The Terms have changed. Please review and accept the current Terms and Privacy Policy.',
        code: 'TERMS_VERSION_MISMATCH',
      },
      { status: 400 },
    );
  }

  const svc = createServiceClientV2();

  /*
   * -------------------------------------------------------------------------
   * 1. READ-ONLY INVITATION VALIDATION
   * -------------------------------------------------------------------------
   *
   * This does not consume anything.
   *
   * We need the invitation-bound email before deciding whether the Auth
   * account already exists.
   */
  let invitationEmail: string;

  try {
    const peek = await peekBetaCode(rawCode);

    if (!peek.ok) {
      console.warn(
        `[api/beta/redeem] rejected beta code: reason=${peek.reason}`,
      );

      return NextResponse.json(
        {
          ok: false,
          error: REJECTION_MESSAGE,
          code: 'BETA_CODE_REJECTED',
        },
        { status: 400 },
      );
    }

    invitationEmail = peek.email.toLowerCase();
  } catch (error) {
    console.error(
      '[api/beta/redeem] invitation validation failed:',
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: REJECTION_MESSAGE,
        code: 'BETA_CODE_REJECTED',
      },
      { status: 400 },
    );
  }

  /*
   * -------------------------------------------------------------------------
   * 2. EXISTING AUTH ACCOUNT CHECK — BEFORE CLAIM
   * -------------------------------------------------------------------------
   *
   * This is the critical correction.
   *
   * If the invitation belongs to an Auth account that already exists:
   *
   *   - do NOT claim the beta code;
   *   - do NOT change the password;
   *   - do NOT create another account;
   *   - do NOT mutate the Auth identity.
   *
   * The browser is sent to /login by BetaRedeem.
   */
  try {
    const existingAuthUser = await findExistingAuthUser(
      svc,
      invitationEmail,
    );

    if (existingAuthUser) {
      console.info(
        `[api/beta/redeem] existing Auth account detected for invitation email=${invitationEmail}; invitation was NOT consumed`,
      );

      return NextResponse.json<ExistingAccountSuccess>({
        ok: true,
        existing: true,
        email: invitationEmail,
      });
    }
  } catch (error) {
    /*
     * Do not continue into claim/create if we cannot determine whether an
     * existing account exists.
     *
     * Otherwise a temporary Auth lookup failure could turn into a second
     * account attempt.
     */
    console.error(
      '[api/beta/redeem] existing Auth account check failed:',
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: 'Could not verify your account. Please try again.',
        code: 'AUTH_LOOKUP_FAILED',
      },
      { status: 500 },
    );
  }

  /*
   * -------------------------------------------------------------------------
   * 3. AUTHENTICATED REQUEST CHECK
   * -------------------------------------------------------------------------
   *
   * If the current browser is already authenticated as the invitation email,
   * treat it exactly like an existing account.
   *
   * Crucially, the code is NOT consumed.
   */
  const authenticatedUser = await getAuthUser();

  if (
    authenticatedUser?.email &&
    authenticatedUser.email.toLowerCase() === invitationEmail
  ) {
    console.info(
      `[api/beta/redeem] request already authenticated as invitation email=${invitationEmail}; invitation was NOT consumed`,
    );

    return NextResponse.json<ExistingAccountSuccess>({
      ok: true,
      existing: true,
      email: invitationEmail,
    });
  }

  /*
   * -------------------------------------------------------------------------
   * 4. ATOMIC CLAIM
   * -------------------------------------------------------------------------
   *
   * Only now do we consume the invitation.
   *
   * claimBetaCode() performs the guarded database update:
   *
   *   WHERE code = ?
   *   AND redeemed_at IS NULL
   *
   * Therefore simultaneous new-account redemption attempts resolve to one
   * winner.
   */
  const claim = await claimBetaCode(rawCode);

  if (!claim.ok) {
    console.warn(
      `[api/beta/redeem] atomic beta claim rejected: reason=${claim.reason}`,
    );

    return NextResponse.json(
      {
        ok: false,
        error: REJECTION_MESSAGE,
        code: 'BETA_CODE_REJECTED',
      },
      { status: 400 },
    );
  }

  const email = claim.email.toLowerCase();

  /*
   * Defensive consistency check.
   *
   * peekBetaCode() and claimBetaCode() both obtain the invitation-bound email.
   * They should agree. If they do not, do not provision an account.
   */
  if (email !== invitationEmail) {
    console.error(
      '[api/beta/redeem] invitation email changed between peek and claim',
      {
        invitationEmail,
        claimedEmail: email,
      },
    );

    await releaseBetaCode(rawCode);

    return NextResponse.json(
      {
        ok: false,
        error: REJECTION_MESSAGE,
        code: 'BETA_CODE_REJECTED',
      },
      { status: 400 },
    );
  }

  /*
   * -------------------------------------------------------------------------
   * 5. CREATE AUTH ACCOUNT
   * -------------------------------------------------------------------------
   *
   * The invitation-bound email is authoritative.
   *
   * The client cannot supply an alternative email.
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
       * A race may have created the account after our pre-check.
       *
       * This request did NOT create the account.
       *
       * Therefore the invitation must NOT remain consumed.
       */
      console.warn(
        `[api/beta/redeem] Auth account appeared during redemption for email=${email}; releasing invitation because this request did not create the account`,
      );

      await releaseBetaCode(rawCode);

      return NextResponse.json<ExistingAccountSuccess>({
        ok: true,
        existing: true,
        email,
      });
    }

    /*
     * No Auth account was created.
     *
     * This is exactly the narrow case where releasing the claim is safe.
     */
    await releaseBetaCode(rawCode);

    console.error(
      '[api/beta/redeem] Auth account creation failed; beta code released:',
      createError,
    );

    return NextResponse.json(
      {
        ok: false,
        error: 'Could not create your account. Please try again.',
        code: 'AUTH_CREATE_FAILED',
      },
      { status: 500 },
    );
  }

  const authUserId = createdAuth.user.id;

  /*
   * -------------------------------------------------------------------------
   * 6. LEGACY PROVENANCE BRIDGE
   * -------------------------------------------------------------------------
   *
   * This does not establish canonical identity.
   *
   * It simply preserves compatibility for existing consumers of users.id.
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

  /*
   * Legacy journey metadata is non-authoritative.
   */
  if (legacyUserId) {
    const { error: userUpdateError } = await svc
      .from('users')
      .update({
        journey_type: 'business',
        updated_at: new Date().toISOString(),
      })
      .eq('id', legacyUserId);

    if (userUpdateError) {
      console.warn(
        '[api/beta/redeem] legacy journey metadata was not updated:',
        userUpdateError.message,
      );
    }
  }

  /*
   * -------------------------------------------------------------------------
   * 7. ATTRIBUTION
   * -------------------------------------------------------------------------
   */
  await recordAttribution(
    request,
    legacyUserId,
    email,
  );

  /*
   * -------------------------------------------------------------------------
   * 8. RETURN
   * -------------------------------------------------------------------------
   *
   * We deliberately do NOT:
   *
   *   - create Organisation;
   *   - assign Organisation;
   *   - create membership;
   *   - create ownership;
   *   - derive Organisation from email;
   *   - derive Organisation from beta code;
   *   - use users.id as Organisation identity.
   *
   * BetaRedeem signs the new Auth account in and redirects to /plan.
   *
   * /plan then performs the canonical identity establishment.
   */
  return NextResponse.json<RedeemSuccess>({
    ok: true,
    email,
  });
}