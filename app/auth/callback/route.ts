// app/auth/callback/route.ts
// Canonical Supabase auth callback (PRODUCT_STANDARDS §2). Handles both flows:
//   - ?token_hash=&type=  → verifyOtp   (email confirm, magic link, recovery)
//   - ?code=              → exchangeCodeForSession (PKCE)
// then redirects to ?next (default /dashboard). Failures land back on /login with an error.
//
// THE SESSION-COOKIE BUG THIS FIXES:
//   verifyOtp/exchangeCodeForSession write the session cookies onto the SSR cookie store
//   (next/headers cookies). A bare `NextResponse.redirect(...)` returns a DIFFERENT object that
//   carries NONE of those cookies, so the freshly-minted session never reaches the browser — the
//   user is redirected, then the protected route's middleware finds no session and bounces them
//   to /login. The middleware already works around the identical defect (redirectPreservingSession
//   in proxy.ts, dated 2026-08-06 against the same "why do I keep having to log in" report). This
//   route was missing the same treatment. We copy the cookie-store cookies onto the redirect.

import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createSessionClientV2 } from '@/lib/supabase/server-session';

const D = '[auth/callback][DIAG]';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') || '/dashboard';

  console.log(`${D} === CALLBACK ENTERED === hostname=${new URL(request.url).hostname}`);

  // --- 1. INPUT ANALYSIS ---
  const inputBranch = code ? 'CODE' : tokenHash && type ? 'TOKEN_HASH' : 'NEITHER';
  console.log(`${D} [INPUT] branch=${inputBranch} has_code=${!!code} has_token_hash=${!!tokenHash} type=${type} next=${next}`);

  // --- 2. COOKIE INVENTORY ---
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const sbCookieNames = allCookies.filter((c) => c.name.startsWith('sb-')).map((c) => c.name);
  const hasCodeVerifier = sbCookieNames.some((n) => n.includes('code-verifier'));
  console.log(`${D} [COOKIES] sb_count=${sbCookieNames.length} has_pkce_verifier=${hasCodeVerifier} names=[${sbCookieNames.join(',')}]`);

  // --- 3. CREATE SUPABASE CLIENT ---
  const supabase = await createSessionClientV2();
  console.log(`${D} [CLIENT] supabase client created`);

  // --- 4. AUTHENTICATION ---
  let ok = false;
  let authError: string | null = null;

  if (tokenHash && type) {
    console.log(`${D} [AUTH] entering verifyOtp branch type=${type}`);
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      authError = `${error.name}: ${error.message}`;
      console.error(`${D} [AUTH] verifyOtp FAILED: ${authError} status=${(error as Record<string, unknown>).status ?? 'n/a'}`);
    } else {
      console.log(`${D} [AUTH] verifyOtp OK`);
    }
    ok = !error;
  } else if (code) {
    console.log(`${D} [AUTH] entering exchangeCodeForSession branch`);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      authError = `${error.name}: ${error.message}`;
      console.error(`${D} [AUTH] exchangeCodeForSession FAILED: ${authError} status=${(error as Record<string, unknown>).status ?? 'n/a'}`);
    } else {
      console.log(`${D} [AUTH] exchangeCodeForSession OK`);
    }
    ok = !error;
  } else {
    console.warn(`${D} [AUTH] NEITHER code NOR token_hash present`);
  }

  // --- 5. POST-AUTH SESSION CHECK ---
  if (ok) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const hasSession = !!sessionData?.session;
    console.log(`${D} [SESSION] after_auth: has_session=${hasSession} session_error=${sessionError?.message ?? 'none'}`);
    if (!hasSession) {
      console.warn(`${D} [SESSION] WARNING: auth succeeded but getSession returns no session`);
    }
  }

  // --- 6. REDIRECT DECISION ---
  const targetPath = ok ? `${new URL(next, 'https://placeholder').pathname}` : '/login?error=auth_callback';
  const target = ok ? `${origin}${next}` : `${origin}/login?error=auth_callback`;
  console.log(`${D} [REDIRECT] decision=${ok ? 'SUCCESS' : 'FAILURE'} auth_error=${authError ?? 'none'} redirect_pathname=${targetPath}`);

  // --- 7. COOKIE BRIDGE ---
  const cookieCount = cookieStore.getAll().length;
  console.log(`${D} [COOKIES] total_cookies_before_bridge=${cookieCount}`);

  const res = NextResponse.redirect(target);
  for (const { name, value, options } of cookieStore.getAll()) {
    res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
  }

  const resCookieCount = res.cookies.getAll().length;
  console.log(`${D} [COOKIES] cookies_on_redirect_response=${resCookieCount}`);
  console.log(`${D} === CALLBACK EXITING === final_redirect=${target}`);

  return res;
}
