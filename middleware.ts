// middleware.ts
// Session refresh + route segregation for Kira's dual-auth portals (PRODUCT_STANDARDS §8.5).
//   - USER-protected routes  → require any authenticated session.
//   - /admin/*               → require an authenticated session whose email is in ADMIN_EMAILS.
// API routes are NOT gated here (ElevenLabs/Stripe webhooks verify their own signatures);
// the landing page, marketing pages, agent-readiness files, and the auth pages stay public.

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const USER_PROTECTED = ['/setup', '/create-kira', '/chat', '/personal-journey', '/start', '/settings'];
const ADMIN_PREFIX = '/admin';
// Public entries inside /admin (the login + its own password-reset flow).
const ADMIN_PUBLIC = ['/admin/login', '/admin/password-reset'];

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
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
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    if (!adminEmails().includes((user.email || '').toLowerCase())) {
      return NextResponse.redirect(new URL('/admin/login?error=not_admin', request.url));
    }
  }

  // User-protected routes: require any authenticated session.
  if (USER_PROTECTED.some((p) => path === p || path.startsWith(p + '/'))) {
    if (!user) {
      const url = new URL('/login', request.url);
      url.searchParams.set('next', path);
      return NextResponse.redirect(url);
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
