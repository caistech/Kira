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
termsAccepted?: unknown;
termsVersion?: unknown;
};

type RedeemSuccess = {
ok: true;
email: string;
tokenHash: string;
existing?: false;
};

type ExistingAccountSuccess = {
ok: true;
existing: true;
email: string;
tokenHash: string;
};

function normaliseString(value: unknown): string {
return typeof value === 'string'
? value.trim()
: '';
}

/**
 * Generate a magic link token for the given email WITHOUT sending email.
 *
 * The token is exchanged by the client hitting /auth/callback, which runs
 * verifyOtp server-side and establishes the session. This is the code-as-
 * credential mechanism: the invitation code authorises minting the token;
 * the token itself is the session-establishment credential.
 *
 * For a new account (email_confirm: true, no password), this token is the
 * ONLY sign-in path — there is no password to fall back on.
 *
 * Returns the raw hashed token for use as ?token_hash= in the callback URL.
 */
async function mintMagicLinkToken(
svc: ReturnType<typeof createServiceClientV2>,
email: string,
): Promise<string | null> {
const { data, error } =
await svc.auth.admin.generateLink({
type: 'magiclink',
email,
});

if (error || !data?.properties?.hashed_token) {
console.error(
'[api/beta/redeem] magic-link token generation failed:',
error?.message ?? 'no hashed_token',
);
return null;
}

return data.properties.hashed_token;
}

/**
 * Legacy application-user bridge.
 *
 * This exists solely for compatibility/provenance with the legacy users
 * table. users.id is NOT Person identity, Organisation identity, tenancy
 * authority, membership authority, or ownership authority.
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
 * Compatibility adoption: only adopt an existing legacy row that does
 * not already have an auth_user_id.
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
 * Existing auth account check.
 *
 * This MUST happen before claimBetaCode().
 *
 * Existing account → do NOT consume invitation, do NOT change password.
 * Mint a magic-link token for the invited identity and return it to the
 * client for session establishment via /auth/callback.
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
 * Attribution — acquisition provenance only.
 *
 * Attribution does NOT establish Person, Organisation, Membership, or
 * Ownership.
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
 * {
 *   code: string;
 *   termsAccepted: true;
 *   termsVersion?: string;
 * }
 *
 * The code is the credential. No password is required.
 *
 * The server mints a magic-link token (server-generated, never emailed)
 * and returns it. The client redirects to /auth/callback?token_hash=...
 * which establishes the session server-side via verifyOtp, guaranteeing
 * the invited identity wins over any ambient browser session.
 *
 * NEW ACCOUNT:
 *   { ok: true, email, tokenHash, existing?: false }
 *
 * EXISTING ACCOUNT:
 *   { ok: true, existing: true, email, tokenHash }
 *
 * The invitation is NOT consumed for existing accounts.
 *
 * This route NEVER creates an Organisation.
 */
export async function POST(
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
{status: 400},
);
}

const rawCode =
normaliseString(body.code);

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
{status: 400},
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
{status: 400},
);
}

/*
 * The client may submit the current Terms version.
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
{status: 400},
);
}

const svc =
createServiceClientV2();

/*
 * ---
 * 2. READ-ONLY INVITATION VALIDATION
 * ---
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
{status: 400},
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
{status: 400},
);
}

/*
 * ---
 * 3. EXISTING AUTH ACCOUNT — NO PASSWORD, NO /LOGIN REDIRECT
 * ---
 * If the invited email already has an Auth account, mint a magic-link
 * token for that identity directly. The invitation is NOT consumed. The
 * token is exchanged via /auth/callback which overwrites any ambient
 * browser session.
 */
try {
const existingAuthUser =
await findExistingAuthUser(
svc,
invitationEmail,
);

if (existingAuthUser) {
const tokenHash =
await mintMagicLinkToken(
svc,
invitationEmail,
);

if (!tokenHash) {
console.error(
'[api/beta/redeem] token mint failed for existing account email=${invitationEmail}',
);

return NextResponse.json(
{
ok: false,
error:
'Could not verify your account. Please try again.',
code: 'TOKEN_MINT_FAILED',
},
{status: 500},
);
}

console.info(
'[api/beta/redeem] existing Auth account for ${invitationEmail}; magic-link token minted; invitation NOT consumed',
);

return NextResponse.json<
ExistingAccountSuccess
>({
ok: true,
existing: true,
email: invitationEmail,
tokenHash,
});
}
} catch (error) {
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
{status: 500},
);
}

/*
 * ---
 * 4. CHECK CURRENT AUTH SESSION
 * ---
 * If the browser is already authenticated as the invitation email, treat
 * as an existing account. Still mint the token — the ambient session may
 * be stale (different browser, expired refresh token).
 */
const authenticatedUser =
await getAuthUser();

if (
authenticatedUser?.email &&
authenticatedUser.email
.toLowerCase() ===
invitationEmail
) {
const tokenHash =
await mintMagicLinkToken(
svc,
invitationEmail,
);

if (tokenHash) {
console.info(
'[api/beta/redeem] request already authenticated as ${invitationEmail}; token minted for session refresh',
);

return NextResponse.json<
ExistingAccountSuccess
>({
ok: true,
existing: true,
email: invitationEmail,
tokenHash,
});
}
}

/*
 * ---
 * 5. ATOMIC INVITATION CLAIM
 * ---
 * ONLY NOW is the invitation consumed.
 *
 * claimBetaCode() performs its own guarded database update so that
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
{status: 400},
);
}

const email =
claim.email
.trim()
.toLowerCase();

/*
 * Defensive consistency check.
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
{status: 400},
);
}

/*
 * ---
 * 6. CREATE SUPABASE AUTH ACCOUNT — NO PASSWORD
 * ---
 * The email comes exclusively from the invitation.
 * No password is set — the invitation code is the sole credential.
 * The magic-link token is the sign-in mechanism.
 */
const {
data: createdAuth,
error: createError,
} =
await svc.auth.admin.createUser({
email,
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
 * Race: another request created the Auth account between
 * findExistingAuthUser and createUser. Release the invitation
 * and fall back to existing-account path.
 */
console.warn(
'[api/beta/redeem] Auth account appeared during redemption for email=${email}; releasing invitation',
);

await releaseBetaCode(
rawCode,
);

const tokenHash =
await mintMagicLinkToken(
svc,
email,
);

if (tokenHash) {
return NextResponse.json<
ExistingAccountSuccess
>({
ok: true,
existing: true,
email,
tokenHash,
});
}

return NextResponse.json(
{
ok: false,
error:
'Could not create your account. Please try again.',
code:
'AUTH_CREATE_FAILED',
},
{status: 500},
);
}

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
{status: 500},
);
}

const authUserId =
createdAuth.user.id;

/*
 * ---
 * 7. LEGACY PROVENANCE BRIDGE
 * ---
 * Compatibility only. Does NOT create canonical identity.
 */
const legacyUserId =
await linkLegacyApplicationUser(
svc,
authUserId,
email,
);

/*
 * Preserve beta provenance against the Auth/legacy identity.
 */
try {
await linkBetaCodeToUser(
rawCode,
legacyUserId ??
authUserId,
);
} catch (error) {
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
 * 9. MINT MAGIC-LINK TOKEN & RETURN
 * ---
 * The session is established by the client hitting
 * /auth/callback?token_hash=...&type=magiclink, which runs verifyOtp
 * server-side, writes auth cookies, and redirects to the plan flow.
 *
 * The magic-link token is one-time-use, generated server-side, and
 * never emailed. It is the code-as-credential mechanism.
 */
const tokenHash =
await mintMagicLinkToken(svc, email);

if (!tokenHash) {
console.error(
'[api/beta/redeem] token mint failed for new account email=${email}',
);

return NextResponse.json(
{
ok: false,
error:
'Could not complete your account setup. Please try again.',
code: 'TOKEN_MINT_FAILED',
},
{status: 500},
);
}

return NextResponse.json({
ok: true,
email,
tokenHash,
});
}
