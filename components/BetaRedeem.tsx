'use client';

import {
FormEvent,
useCallback,
useEffect,
useState,
} from 'react';

import {
ArrowRight,
CheckCircle2,
Loader2,
} from 'lucide-react';

import {
TermsAgreement,
TERMS_VERSION,
} from '@/components/TermsAgreement';

type Stage = 'code' | 'confirm' | 'done';

type BetaPeekResponse =
| {
ok: true;
email: string;
firstName?: string | null;
lastName?: string | null;
error?: never;
}
| {
ok: false;
error?: string;
code?: string;
};

type BetaRedeemResponse =
| {
ok: true;
email: string;
tokenHash: string;
existing?: false;
error?: never;
}
| {
ok: true;
email: string;
tokenHash: string;
existing: true;
error?: never;
}
| {
ok: false;
error?: string;
code?: string;
};

type BetaRedeemProps = {
/**
 * Invitation code supplied by /plan?code=...
 *
 * The code is access/provenance information only.
 * It is never organisational authority.
 */
initialCode?: string;

/**
 * Retained for compatibility with the existing /plan contract.
 *
 * These values deliberately do not participate in beta redemption.
 * /plan owns canonical identity establishment.
 */
firstName?: string;
organisationId?: string;
isOwner?: boolean;
};

export function BetaRedeem({
initialCode = '',
firstName: _firstName,
organisationId: _organisationId,
isOwner: _isOwner = false,
}: BetaRedeemProps) {
const [code, setCode] = useState(initialCode);
const [stage, setStage] = useState<Stage>('code');
const [email, setEmail] = useState<string | null>(null);
const [termsAccepted, setTermsAccepted] = useState(false);
const [busy, setBusy] = useState(false);
const [error, setError] = useState<string | null>(null);

/**
 * ---
 * PEEK
 * ---
 *
 * Read-only invitation validation.
 *
 * POST /api/beta/peek
 *
 * This does NOT consume the invitation, create Auth, Person, Organisation,
 * Membership, or Ownership.
 */
const checkCode = useCallback(async (candidate: string) => {
const normalisedCode = candidate.trim();

if (!normalisedCode) {
setError('Enter your invitation code.');
return;
}

setBusy(true);
setError(null);

try {
const response = await fetch('/api/beta/peek', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
},
cache: 'no-store',
body: JSON.stringify({
code: normalisedCode,
}),
});

const data =
(await response.json().catch(() => null)) as
| BetaPeekResponse
| null;

if (!response.ok || !data?.ok || !data.email) {
setError(
data?.error || 'That code did not work.',
);
return;
}

setCode(normalisedCode);
setEmail(data.email);
setStage('confirm');
} catch {
setError(
'We could not reach Kira just then. Check your connection and try again.',
);
} finally {
setBusy(false);
}
}, []);

/**
 * If /plan supplied ?code=..., validate it automatically.
 */
useEffect(() => {
const candidate = initialCode.trim();

if (!candidate) {
return;
}

setCode(candidate);

void checkCode(candidate);
}, [initialCode, checkCode]);

/**
 * ---
 * REDEEM
 * ---
 *
 * The beta redemption boundary receives:
 *   code, termsAccepted, termsVersion
 *
 * No password — the code itself is the credential.
 *
 * The server mints a magic-link token and returns it. The client
 * redirects to /auth/callback which runs verifyOtp server-side,
 * establishing the session and cookies for the invited identity.
 * This guarantees the invitation wins over any ambient browser session.
 */
async function redeem(
event: FormEvent<HTMLFormElement>,
) {
event.preventDefault();

const normalisedCode = code.trim();

if (!normalisedCode) {
setError('Enter your invitation code.');
setStage('code');
return;
}

if (!email) {
setError(
'Please validate your invitation code first.',
);
setStage('code');
return;
}

if (!termsAccepted) {
setError(
'Please agree to the Terms and Privacy Policy to continue.',
);
return;
}

setBusy(true);
setError(null);

try {
const response = await fetch('/api/beta/redeem', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
},
cache: 'no-store',
body: JSON.stringify({
code: normalisedCode,
termsAccepted: true,
termsVersion: TERMS_VERSION,
}),
});

const data =
(await response.json().catch(() => null)) as
| BetaRedeemResponse
| null;

if (!response.ok || !data?.ok) {
throw new Error(
data?.error ||
'Could not redeem that invitation.',
);
}

/**
 * ---------------------------------------------------------------------
 * SESSION ESTABLISHMENT
 * ---------------------------------------------------------------------
 *
 * Both new and existing accounts receive a magic-link token. The client
 * redirects to /auth/callback which exchanges it server-side via verifyOtp,
 * writing the session cookies that establish the invited identity.
 *
 * This replaces ANY ambient browser session — the invitation always wins.
 * There is no /login redirect, no password prompt, no client-side auth.
 */

setStage('done');

/**
 * Canonical convergence: /auth/callback runs verifyOtp, writes session
 * cookies for the invited identity, then redirects to /plan?code=...
 * where canonical Person/Organisation/Membership is established.
 */
const callbackUrl =
`/auth/callback` +
`?token_hash=${encodeURIComponent(data.tokenHash)}` +
`&type=magiclink` +
`&next=${encodeURIComponent(`/plan?code=${encodeURIComponent(normalisedCode)}`)}`;

window.location.assign(callbackUrl);
} catch (err) {
setError(
err instanceof Error
? err.message
: 'Something went wrong while redeeming your invitation.',
);

setBusy(false);
}
}

/**
 * ---
 * COMPLETE
 * ---
 */
if (stage === 'done') {
return (
<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
<CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />
<p className="mt-2 text-base font-semibold text-stone-900">
You&apos;re in. Taking you back to your setup…
</p>
</div>
);
}

/**
 * ---
 * CODE STAGE
 * ---
 */
if (stage === 'code') {
return (
<div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 sm:p-6">
<h3 className="text-lg font-semibold text-stone-900">
Redeem your invitation
</h3>

<p className="mt-1 max-w-prose text-base leading-relaxed text-stone-700">
Free while we&apos;re in beta — no card, and
we&apos;ll ask you before we ever charge for
anything. In exchange we want to hear what
doesn&apos;t work.
</p>

<form
onSubmit={(event) => {
event.preventDefault();
void checkCode(code);
}}
className="mt-4"
>
<label
htmlFor="beta-code"
className="block text-base font-medium text-stone-800"
>
Your invitation code
</label>

<input
id="beta-code"
name="betaCode"
value={code}
onChange={(event) => {
setCode(event.target.value);
if (error) {
setError(null);
}
}}
placeholder="KIRA-XXXX-XXXX"
autoComplete="off"
autoCapitalize="characters"
spellCheck={false}
disabled={busy}
className="mt-1.5 min-h-[48px] w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base tracking-wide outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200 disabled:opacity-60"
/>

<p className="mt-1.5 text-sm text-stone-500">
It&apos;s in the invitation we sent you.
Capitals and dashes don&apos;t matter.
</p>

{error && (
<p
className="mt-3 text-base text-rose-700"
role="alert"
>
{error}
</p>
)}

<button
type="submit"
disabled={busy || !code.trim()}
className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-3.5 text-base font-bold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
>
{busy ? (
<>
<Loader2 className="h-5 w-5 animate-spin" />
Checking code…
</>
) : (
<>
Continue
<ArrowRight className="h-5 w-5" />
</>
)}
</button>
</form>
</div>
);
}

/**
 * ---
 * CONFIRM STAGE
 * ---
 *
 * The invitation has been validated. No password — the code is the
 * credential. The invitee confirms terms and we establish their session.
 */
return (
<div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 sm:p-6">
<h3 className="text-lg font-semibold text-stone-900">
Set up your Kira account
</h3>

<p className="mt-1 max-w-prose text-base leading-relaxed text-stone-700">
Your invitation is valid and is linked to{' '}
<strong className="text-stone-900">
{email}
</strong>
.
</p>

<form
onSubmit={redeem}
className="mt-4"
>
<TermsAgreement
checked={termsAccepted}
onChange={setTermsAccepted}
id="terms-beta"
/>

{error && (
<p
className="mt-3 text-base text-rose-700"
role="alert"
>
{error}
</p>
)}

<button
type="submit"
disabled={
busy ||
!termsAccepted
}
className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-3.5 text-base font-bold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
>
{busy ? (
<>
<Loader2 className="h-5 w-5 animate-spin" />
Setting up…
</>
) : (
<>
Continue to setup
<ArrowRight className="h-5 w-5" />
</>
)}
</button>
</form>
</div>
);
}
