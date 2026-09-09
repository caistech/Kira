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
  // Destination default. The canonical auth form ALWAYS carries an explicit `?next=` into every
  // magic-link / confirmation email (see buildRedirectUrl in @caistech/corporate-components), so
  // this fallback only fires when someone reaches the callback without one — e.g. pasted a raw
  // token_link. /talk is the intended default (it resolves the owner's agent and provisions one for
  // a fresh user); deliberately aligned with the /login page's own default so the two never disagree.
  const next = searchParams.get('next') || '/talk';

  const supabase = await createSessionClientV2();

  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  const cookieStore = await cookies();
  const target = ok ? `${origin}${next}` : `${origin}/login?error=auth_callback`;
  const res = NextResponse.redirect(target);

  for (const { name, value } of cookieStore.getAll()) {
    res.cookies.set(name, value, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  return res;
}
