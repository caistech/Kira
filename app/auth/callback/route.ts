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

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') || '/dashboard';

  const supabase = await createSessionClientV2();

  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  const target = ok ? `${origin}${next}` : `${origin}/login?error=auth_callback`;
  const response = NextResponse.redirect(target);

  if (ok) {
    // Carry the session cookies the OTP exchange just wrote onto the redirect response.
    // Re-apply the same attributes the SSR client uses (path=/, httpOnly, sameSite=lax, secure in
    // prod); a missing or wrong path makes the next request not carry them and the user is bounced
    // to /login despite a successful exchange.
    const cookieStore = await cookies();
    const secure = process.env.NODE_ENV === 'production';
    for (const cookie of cookieStore.getAll()) {
      if (cookie.name.startsWith('sb-')) {
        response.cookies.set(cookie.name, cookie.value, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure,
        });
      }
    }
  }

  return response;
}
