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

  // ⚠️ THE SESSION COOKIES MUST BE READABLE BY THE BROWSER CLIENT — NOT httpOnly.
  //
  // This loop used to re-set every cookie httpOnly, with no maxAge. createBrowserClient
  // reads the session from document.cookie, which cannot see an httpOnly cookie, so after a
  // MAGIC-LINK login every client-side auth call failed: John Orian, 2026-10-01, Settings → Update
  // password → "Auth session missing!". Password logins never came through here, which is why it
  // only bit magic-link users. And with no maxAge the session died when the browser closed.
  //
  // These are @supabase/ssr's own DEFAULT_COOKIE_OPTIONS (path, lax, httpOnly false, 400 days), so
  // the callback writes the cookie exactly as every other Supabase write in the app does. Only the
  // Supabase auth cookies are re-set; anything else in the jar is left alone rather than rewritten
  // with options it never had.
  for (const { name, value } of cookieStore.getAll()) {
    if (!name.startsWith('sb-')) continue;
    res.cookies.set(name, value, {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: value ? 400 * 24 * 60 * 60 : 0,
    });
  }

  return res;
}
