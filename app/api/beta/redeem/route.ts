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

import { getAuthUser } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { TERMS_VERSION } from '@/lib/terms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REJECTION_MESSAGE =
BETA_CODE_REJECTION_MESSAGE;

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
return typeof value === 'string'
? value.trim()
: '';
}

/**

* ---
* LEGACY APPLICATION-USER BRIDGE
* ---
*
* This exists solely for compatibility/provenance with the legacy users
* table.
*
* users.id is NOT:
*
* * Person identity;
* * Organisation identity;
* * tenancy authority;
* * membership authority;
* * ownership authority.
    */
    async function linkLegacyApplicationUser(
    svc: ReturnType<typeof createServiceClientV2>,
    authUserId: string,
    email: string,
    ): Promise<string | null> {
    const {
    data,
    error,
    } = await svc
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

* Compatibility adoption:
*
* Only adopt an existing legacy row that does not already have an
* auth_user_id.
  */
  const {
  data: byEmail,
  error: emailError,
  } = await svc
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

const {
data: adopted,
error: adoptError,
} = await svc
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

* ---
* EXISTING AUTH ACCOUNT CHECK
* ---
*
* This MUST happen before claimBetaCode().
*
* Existing account:
*
* existing Auth
* ```
     ↓
  ```
* do NOT consume invitation
* ```
     ↓
  ```
* do NOT change password
* ```
     ↓
  ```
* send user to normal login
*
* The email is invitation-bound and therefore is not user-controlled.
  */
  async function findExistingAuthUser(
  svc: ReturnType<typeof createServiceClientV2>,
  email: string,
  ): Promise<{
  id: string;
  email: string;
  } | null> {
  const targetEmail =
  email.trim().toLowerCase();

const perPage = 1000;
let page = 1;

while (true) {
const {
data,
error,
} = await svc.auth.admin.listUsers({
page,
perPage,
});


if (error) {
  throw new Error(
    'Unable to check existing Auth account: ${error.message}',
  );
}

const users = data?.users ?? [];

const match = users.find(
  (candidate) =>
    typeof candidate.email === 'string' &&
    candidate.email.toLowerCase() ===
      targetEmail,
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

* ---
* ATTRIBUTION
* ---
*
* Attribution is acquisition provenance only.
*
* It does not establish:
*
* * Person;
* * Organisation;
* * Membership;
* * Ownership.
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
const touch =
attribution.parse(
request.cookies.get(
ATTRIBUTION_COOKIE,
)?.value,
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
* code: string;
* password: string;
* termsAccepted: true;
* termsVersion?: string;
* }
*
* NEW ACCOUNT:
*
* {
* ok: true,
* email: string
* }
*
* EXISTING ACCOUNT:
*
* {
* ok: true,
* existing: true,
* email: string
* }
*
* This route NEVER creates an Organisation.
  */
  export async function POST(
  // Beta code redemption endpoint
  request: NextRequest,
  ) {
  let body: RedeemRequestBody;

try {
body =
(await request.json()) as RedeemRequestBody;
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

const rawCode =
normaliseString(body.code);

const password =
typeof body.password === 'string'
? body.password
: '';

const termsAccepted =
body.termsAccepted === true;

const submittedTermsVersion =
normaliseString(
body.termsVersion,
);

/*

* ---
* 1. BASIC REQUEST VALIDATION
* ---

*/
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
error:
'Password must be at least 8 characters',
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

/*

* The client may submit the current Terms version.
*
* Empty is accepted for backwards compatibility.
  */
  if (
  submittedTermsVersion &&
  submittedTermsVersion !==
  TERMS_VERSION
  ) {
  return NextResponse.json(
  {
  ok: false,
  error:
  'The Terms have changed. Please review and accept the current Terms and Privacy Policy.',
  code:
  'TERMS_VERSION_MISMATCH',
  },
  { status: 400 },
  );
  }

const svc =
createServiceClientV2();

/*

* ---
* 2. READ-ONLY INVITATION VALIDATION
* ---
*
* No consumption yet.
  */
  let invitationEmail: string;

try {
const peek =
await peekBetaCode(rawCode);


if (!peek.ok) {
  console.warn(
    '[api/beta/redeem] rejected beta code: reason=${peek.reason}',
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

invitationEmail =
  peek.email
    .trim()
    .toLowerCase();


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

* ---
* 3. CHECK EXISTING AUTH ACCOUNT BEFORE CLAIM
* ---
*
* This is the critical ordering rule.
  */
  try {
  const existingAuthUser =
  await findExistingAuthUser(
  svc,
  invitationEmail,
  );


if (existingAuthUser) {



  console.info(
    '[api/beta/redeem] existing Auth account detected for invitation email=${invitationEmail}; invitation NOT consumed',
  );

  return NextResponse.json<
    ExistingAccountSuccess
  >({
    ok: true,
    existing: true,
    email: invitationEmail,
  });
}


} catch (error) {
/*
* Never continue to claim if we cannot establish whether an Auth account
* already exists.
*/
console.error(
'[api/beta/redeem] existing Auth account check failed:',
error,
);


return NextResponse.json(
  {
    ok: false,
    error:
      'Could not verify your account. Please try again.',
    code:
      'AUTH_LOOKUP_FAILED',
  },
  { status: 500 },
);


}

/*

* ---
* 4. CHECK CURRENT AUTH SESSION
* ---
*
* If the browser is already authenticated as the invitation email, treat
* this as an existing account.
  */
  const authenticatedUser =
  await getAuthUser();

if (
authenticatedUser?.email &&
authenticatedUser.email
.toLowerCase() ===
invitationEmail
) {
console.info(
  '[api/beta/redeem] request already authenticated as invitation email=${invitationEmail}; invitation NOT consumed',
);


return NextResponse.json<
  ExistingAccountSuccess
>({
  ok: true,
  existing: true,
  email: invitationEmail,
});


}

/*

* ---
* 5. ATOMIC INVITATION CLAIM
* ---
*
* ONLY NOW is the invitation consumed.
*
* claimBetaCode() must perform its own guarded database update so that
* simultaneous redemption attempts cannot both win.
  */
  const claim =
  await claimBetaCode(rawCode);

if (!claim.ok) {
console.warn(
  '[api/beta/redeem] atomic beta claim rejected: reason=${claim.reason}',
);


return NextResponse.json(
  {
    ok: false,
    error: REJECTION_MESSAGE,
    code:
      'BETA_CODE_REJECTED',
  },
  { status: 400 },
);


}

const email =
claim.email
.trim()
.toLowerCase();

/*

* Defensive consistency check.
*
* The invitation email should not change between peek and claim.
  */
  if (
  email !== invitationEmail
  ) {
  console.error(
  '[api/beta/redeem] invitation email changed between peek and claim',
  {
  invitationEmail,
  claimedEmail: email,
  },
  );


await releaseBetaCode(



  rawCode,
);

return NextResponse.json(
  {
    ok: false,
    error: REJECTION_MESSAGE,
    code:
      'BETA_CODE_REJECTED',
  },
  { status: 400 },
);


}

/*

* ---
* 6. CREATE SUPABASE AUTH ACCOUNT
* ---
*
* The email comes exclusively from the invitation.
*
* The caller cannot substitute another email.
  */
  const {
  data: createdAuth,
  error: createError,
  } =
  await svc.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
  terms_accepted: true,
  terms_version:
  submittedTermsVersion ||
  TERMS_VERSION,
  beta_invitation: true,
  },
  });

if (
createError ||
!createdAuth.user
) {
const alreadyExists =
/already|registered|exists/i.test(
createError?.message ?? '',
);


if (alreadyExists) {
  /*
   * Another request may have created the Auth account between our
   * pre-check and createUser().
   *
   * This request did NOT create that account.
   *
   * Release the invitation so the invitation is not incorrectly consumed.
   */
  console.warn(
    '[api/beta/redeem] Auth account appeared during redemption for email=${email}; releasing invitation',
  );

  await releaseBetaCode(
    rawCode,
  );

  return NextResponse.json<
    ExistingAccountSuccess
  >({
    ok: true,
    existing: true,
    email,
  });
}

/*
 * No Auth account was created.
 *
 * It is safe to release the invitation.
 */
await releaseBetaCode(
  rawCode,
);

console.error(
  '[api/beta/redeem] Auth account creation failed; beta code released:',
  createError,
);

return NextResponse.json(
  {
    ok: false,
    error:
      'Could not create your account. Please try again.',
    code:
      'AUTH_CREATE_FAILED',
  },
  { status: 500 },
);


}

const authUserId =
createdAuth.user.id;

/*

* ---
* 7. LEGACY PROVENANCE BRIDGE
* ---
*
* Compatibility only.
*
* This does NOT create canonical Person/Organisation identity.
  */
  const legacyUserId =
  await linkLegacyApplicationUser(
  svc,
  authUserId,
  email,
  );

/*

* Preserve beta provenance against the Auth/legacy identity.
*
* The beta code remains acquisition/provisioning provenance.
  */
  try {
  await linkBetaCodeToUser(
  rawCode,
  legacyUserId ??
  authUserId,
  );
  } catch (error) {
  /*

  * The Auth account has already been created.
  *
  * Do not delete the Auth account here and do not manufacture canonical
  * identity. Log the provenance failure and allow /plan to establish the
  * canonical identity.
    */
    console.error(
    '[api/beta/redeem] beta provenance link failed:',
    error,
    );
    }

/*

* Legacy journey metadata is non-authoritative.
  */
  if (legacyUserId) {
  const {
  error: userUpdateError,
  } = await svc
  .from('users')
  .update({
  journey_type: 'business',
  updated_at:
  new Date().toISOString(),
  })
  .eq(
  'id',
  legacyUserId,
  );


if (userUpdateError) {



  console.warn(
    '[api/beta/redeem] legacy journey metadata was not updated:',
    userUpdateError.message,
  );
}


}

/*

* ---
* 8. ACQUISITION ATTRIBUTION
* ---

*/
await recordAttribution(
request,
legacyUserId,
email,
);

/*

* ---
* 9. RETURN
* ---
*
* DO NOT create:
*
* * Person
* * Organisation
* * Membership
* * Ownership
*
* /plan is the canonical convergence point.
  */
  return NextResponse.json<
  RedeemSuccess

{
 ok: true,
 email,
}
}