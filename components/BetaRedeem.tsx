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

import { PasswordInput } from '@/components/auth/PasswordInput';
import {
TermsAgreement,
TERMS_VERSION,
} from '@/components/TermsAgreement';

import { createClientV2 } from '@/lib/supabase/browser';

type Stage = 'code' | 'password' | 'done';

type BetaPeekResponse =
| {
ok: true;
email: string;
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
existing?: false;
}
| {
ok: true;
email: string;
existing: true;
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
const [password, setPassword] = useState('');
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
* This does NOT:
*
* * consume the invitation;
* * create Auth;
* * create Person;
* * create Organisation;
* * create Membership;
* * create Ownership.
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
  setStage('password');
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
*
* This is still only a read-only peek.
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
* The beta redemption boundary receives ONLY:
*
* code
* password
* termsAccepted
* termsVersion
*
* It does not receive organisational identity.
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

if (password.length < 8) {
  setError(
    'Please choose a password of at least 8 characters.',
  );
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
      password,
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
   * EXISTING ACCOUNT
   * ---------------------------------------------------------------------
   *
   * The server deliberately does NOT:
   *
   *   - consume the invitation;
   *   - change the password;
   *   - create another Auth account.
   *
   * Send the person to normal login instead.
   */
  if (data.existing) {
    setBusy(false);

    setError(
      'You already have an account with this email. Please sign in with your existing password.',
    );

    window.setTimeout(() => {
      window.location.assign(`/login?next=${encodeURIComponent(`/plan?code=${encodeURIComponent(normalisedCode)}`)}`);
    }, 1800);

    return;
  }

  /**
   * ---------------------------------------------------------------------
   * NEW ACCOUNT
   * ---------------------------------------------------------------------
   *
   * The server has:
   *
   *   - validated the invitation;
   *   - atomically claimed it;
   *   - created the Auth account;
   *   - preserved beta provenance.
   *
   * Establish the Auth session using the password just created.
   */
  const supabase = createClientV2();

  const {
    data: sessionData,
    error: signInError,
  } =
    await supabase.auth.signInWithPassword({
      email: data.email,
      password,
    });

  if (signInError) {
    throw signInError;
  }

  if (!sessionData.session) {
    throw new Error(
      'Your account was created, but we could not establish your login session.',
    );
  }

  setStage('done');

  /**
   * ---------------------------------------------------------------------
   * CANONICAL CONVERGENCE
   * ---------------------------------------------------------------------
   *
   * /plan now takes over:
   *
   *   Auth
   *      ↓
   *   Person
   *      ↓
   *   Organisation
   *      ↓
   *   Membership
   *      ↓
   *   Ownership
   *
   * BetaRedeem does none of those things.
   */
  window.setTimeout(() => {
    window.location.assign(
      `/plan?code=${encodeURIComponent(normalisedCode)}`,
    );
  }, 350);
} catch (err) {
  setError(
    err instanceof Error
      ? err.message
      : 'Something went wrong while redeeming your invitation.',
  );

  setBusy(false);
}


/**

* ---
* COMPLETE
* ---

*/
if (stage === 'done') {
return ( <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center"> <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />


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
return ( <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 sm:p-6"> <h3 className="text-lg font-semibold text-stone-900">
Redeem your invitation </h3>


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
* PASSWORD STAGE
* ---

*/
return ( <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 sm:p-6"> <h3 className="text-lg font-semibold text-stone-900">
Create your Kira account </h3>


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
    <div>
      <PasswordInput
        value={password}
        onChange={(value) => {
          setPassword(value);
          if (error) {
            setError(null);
          }
        }}
        placeholder="Choose a password (8+ characters)"
        autoComplete="new-password"
        id="beta-password"
      />
    </div>

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
        password.length < 8 ||
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




}
