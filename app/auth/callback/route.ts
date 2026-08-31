// app/auth/callback/route.ts
// Canonical Supabase auth callback (PRODUCT_STANDARDS §2). Handles both flows:
//   - ?token_hash=&type=  → verifyOtp   (email confirm, magic link, recovery)
//   - ?code=              → exchangeCodeForSession (PKCE)
// then redirects to ?next (default /dashboard). Failures land back on /login with an error.

import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSessionClientV2 } from '@/lib/supabase/server-session';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') || '/dashboard';

  const supabase = await createSessionClientV2();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
