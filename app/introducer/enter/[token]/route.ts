// app/introducer/enter/[token]/route.ts
//
// The introducer's sign-in: follow the magic link, get a session cookie, land on the board.
//
// The token is exchanged for a session cookie rather than being kept in the URL, so it doesn't sit
// in browser history, referrer headers, or a shared screenshot.

import { NextResponse, type NextRequest } from 'next/server';

import { INTRODUCER_SESSION_COOKIE, resolveMagicLink } from '@/lib/introducer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const introducer = await resolveMagicLink(token);

  if (!introducer) {
    // One message for every failure — unknown, expired, revoked, suspended. Distinguishing them
    // would tell an attacker which tokens exist.
    return NextResponse.redirect(new URL('/introducer/expired', request.url));
  }

  const response = NextResponse.redirect(new URL('/introducer', request.url));
  response.cookies.set(INTRODUCER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}
