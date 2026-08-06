// middleware.ts
// Session refresh + route segregation for Kira's portals (PRODUCT_STANDARDS §8.5).
//   - USER-protected routes  → require any authenticated session.
//   - /admin/*               → require an authenticated session whose email is in ADMIN_EMAILS.
//   - /introducer/*          → require an INTRODUCER session cookie. Deliberately NOT ADMIN_EMAILS
//                              and not a Supabase auth session: an introducer is an outside party
//                              with a status-only view, not a Kira user and certainly not an
//                              operator. Adding them to the admin allowlist would have handed a
//                              commercial third party the operator console.
// API routes are NOT gated here (ElevenLabs/Stripe webhooks verify their own signatures);
// the landing page, marketing pages, agent-readiness files, and the auth pages stay public.

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const USER_PROTECTED = ['/setup', '/create-kira', '/chat', '/personal-journey', '/start', '/settings', '/discovery', '/talk'];
const ADMIN_PREFIX = '/admin';
// Public entries inside /admin (the login + its own password-reset flow).
const ADMIN_PUBLIC = ['/admin/login', '/admin/password-reset'];
const INTRODUCER_PREFIX = '/introducer';
// The magic-link entry point mints the session, and the expired page explains its absence — both
// must stay reachable without one.
const INTRODUCER_PUBLIC = ['/introducer/enter', '/introducer/expired'];
// /introducer/terms requires a session but NOT an accepted undertaking — it is where an introducer
// goes to accept one, so gating it on acceptance would be a closed loop.
// Presence-only check here (Edge middleware can't reach the database). The page itself resolves the
// token against introducer_magic_links and redirects if it's stale — this only stops the obvious.
const INTRODUCER_SESSION_COOKIE = 'kira_introducer';

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Redirect WITHOUT throwing away the session that was just refreshed.
 *
 * THIS IS WHY PEOPLE KEPT HAVING TO LOG IN AGAIN. `getUser()` below refreshes an expired access
 * token, and Supabase ROTATES the refresh token when it does — the old one stops working after
 * `security_refresh_token_reuse_interval` (10 seconds on this project). The `set` handler writes the
 * new pair onto `response`. Returning `NextResponse.redirect(...)` returns a DIFFERENT object, so
 * those cookies never reach the browser: the token that would have kept him signed in was minted,
 * consumed, and dropped on the floor. His next request arrives holding a refresh token the server
 * has already retired, and the only way out is the login form.
 *
 * It is invisible from the inside. Nothing errors, nothing logs, and every non-redirecting route
 * works perfectly — so the people who hit it are exactly the ones being redirected, which on this
 * product meant anyone who had not finished setup. Reported as "the login is not persisting across
 * my tabs" (Shah Hussain, 2026-08-06), which is what it looks like from a browser.
 *
 * Copying the cookies across is the whole fix. `getAll()` is read at CALL time, not at closure
 * creation, so it picks up whatever the refresh wrote.
 */
function redirectPreservingSession(response: NextResponse, url: URL): NextResponse {
  const redirect = NextResponse.redirect(url);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminPublic = ADMIN_PUBLIC.some((p) => path === p || path.startsWith(p + '/'));

  // Admin routes: auth + allowlist. The login/reset pages stay reachable.
  if (path.startsWith(ADMIN_PREFIX) && !isAdminPublic) {
    if (!user) {
      return redirectPreservingSession(response, new URL('/admin/login', request.url));
    }
    if (!adminEmails().includes((user.email || '').toLowerCase())) {
      return redirectPreservingSession(response, new URL('/admin/login?error=not_admin', request.url));
    }
  }

  // Introducer routes: their own session cookie, entirely separate from Supabase auth.
  if (path.startsWith(INTRODUCER_PREFIX)) {
    const isIntroducerPublic = INTRODUCER_PUBLIC.some((p) => path === p || path.startsWith(p + '/'));
    if (!isIntroducerPublic && !request.cookies.get(INTRODUCER_SESSION_COOKIE)) {
      return redirectPreservingSession(response, new URL('/introducer/expired', request.url));
    }
    // Return early: an introducer must never be evaluated against the user or admin rules, and a
    // signed-in operator visiting /introducer gets the introducer view, not a merged one.
    return response;
  }

  // User-protected routes: require any authenticated session.
  if (USER_PROTECTED.some((p) => path === p || path.startsWith(p + '/'))) {
    if (!user) {
      const url = new URL('/login', request.url);
      url.searchParams.set('next', path);
      return redirectPreservingSession(response, url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, API routes (self-verified), and agent-readiness files.
    '/((?!_next/static|_next/image|favicon.ico|api/|.well-known|llms.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)',
  ],
};
