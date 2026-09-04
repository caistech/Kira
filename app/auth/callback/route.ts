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

const DIAG = '[auth/callback][DIAG]';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') || '/dashboard';

  // --- DIAGNOSTIC: cookie inventory (names only, NEVER values) ---
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const sbCookieNames = allCookies
    .filter((c) => c.name.startsWith('sb-'))
    .map((c) => c.name);
  const hasCodeVerifier = sbCookieNames.some((n) => n.includes('code-verifier'));

  console.log(`${DIAG} hostname=${new URL(request.url).hostname}`);
  console.log(`${DIAG} has_code=${!!code} has_token_hash=${!!tokenHash} type=${type}`);
  console.log(`${DIAG} next=${next}`);
  console.log(`${DIAG} sb_cookie_count=${sbCookieNames.length} names=[${sbCookieNames.join(', ')}]`);
  console.log(`${DIAG} has_pkce_verifier_cookie=${hasCodeVerifier}`);

  const supabase = await createSessionClientV2();

  let ok = false;
  if (tokenHash && type) {
    console.log(`${DIAG} entering token_hash branch`);
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      console.error(
        `${DIAG} verifyOtp FAILED: name=${error.name} message=${error.message} status=${(error as Record<string, unknown>).status ?? 'n/a'}`,
      );
    } else {
      console.log(`${DIAG} verifyOtp OK`);
    }
    ok = !error;
  } else if (code) {
    console.log(`${DIAG} entering code (PKCE) branch`);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error(
        `${DIAG} exchangeCodeForSession FAILED: name=${error.name} message=${error.message} status=${(error as Record<string, unknown>).status ?? 'n/a'}`,
      );
    } else {
      console.log(`${DIAG} exchangeCodeForSession OK`);
    }
    ok = !error;
  } else {
    console.warn(`${DIAG} NEITHER code NOR token_hash present in callback URL`);
  }

  const target = ok ? `${origin}${next}` : `${origin}/login?error=auth_callback`;
  console.log(`${DIAG} outcome=${ok ? 'SUCCESS' : 'FAILURE'} redirect_to=${target}`);

  // --- CARBON-COPY COOKIE BRIDGE ------------------------------------------------
  //
  // exchangeCodeForSession / verifyOtp write session cookies into the in-memory
  // Next.js cookie store.  A bare `NextResponse.redirect(...)` carries NO cookies
  // back to the browser because it constructs a fresh Headers object.  We must
  // manually copy every Set-Cookie that the cookie store now holds onto the
  // redirect response so the browser actually receives the session.
  //
  // This mirrors the identical fix applied to middleware.ts / proxy.ts
  // (redirectPreservingSession, dated 2026-08-06).

  const res = NextResponse.redirect(target);

  for (const { name, value, options } of cookieStore.getAll()) {
    res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
  }

  return res;
}
