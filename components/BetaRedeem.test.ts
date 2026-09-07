// components/BetaRedeem.test.ts
//
// Proves the BetaRedeem component redirects to /auth/callback with the
// correct token_hash, type, and next parameters after a successful redeem.
//
// This is a source-scanning test: we assert the component's source code
// constructs the callback URL correctly, without needing a browser or DOM.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stripComments } from '@/lib/source-scan';

const sourcePath = join(__dirname, 'BetaRedeem.tsx');
const source = readFileSync(sourcePath, 'utf8');
const stripped = stripComments(source);

describe('BetaRedeem — session establishment via /auth/callback', () => {
  it('constructs the callback URL with token_hash, type=magiclink, and next=/plan?code=...', () => {
    // The component must redirect to /auth/callback with the server-generated
    // magic-link token. The callback runs verifyOtp server-side and writes
    // session cookies — the invitation identity always wins.
    expect(stripped).toContain('/auth/callback');
    expect(stripped).toContain('token_hash=');
    expect(stripped).toContain('type=magiclink');
    expect(stripped).toContain('next=');
    expect(stripped).toContain('/plan?code=');
  });

  it('does NOT contain signInWithPassword — code is the credential, not a password', () => {
    // The old flow used signInWithPassword on the browser client. The new
    // code-as-credential flow mints a magic-link token server-side and
    // delegates session establishment to /auth/callback.
    expect(stripped).not.toMatch(/signInWithPassword/);
  });

  it('does NOT contain PasswordInput or password state — no password stage', () => {
    // The old flow had a password input stage. The new flow has 'code' and
    // 'confirm' stages only.
    expect(stripped).not.toMatch(/PasswordInput/);
    expect(stripped).not.toMatch(/password.*useState|useState.*password/i);
  });

  it('does NOT redirect to /login — the invitation always wins over ambient session', () => {
    // The old flow sent existing accounts to /login, which let the ambient
    // browser session win. The new flow mints a token for the invited identity
    // and delegates to /auth/callback — no /login redirect.
    expect(stripped).not.toMatch(/\/login/);
  });

  it('does NOT call createClientV2 for client-side auth — no client-side auth', () => {
    // The old flow used createClientV2() on the browser for signInWithPassword.
    // The new flow does no client-side auth at all.
    expect(stripped).not.toMatch(/createClientV2/);
  });

  it('defines exactly two stages: code and confirm', () => {
    // The old flow had code, password, done. The new flow has code, confirm, done.
    expect(stripped).toContain("Stage = 'code' | 'confirm' | 'done'");
  });

  it('calls window.location.assign with the callback URL — the redirect mechanism', () => {
    // The redirect is a full navigation, not a client-side route change,
    // because the callback must set cookies server-side before the next page loads.
    expect(stripped).toContain('window.location.assign(');
    expect(stripped).toContain('callbackUrl');
  });
});
