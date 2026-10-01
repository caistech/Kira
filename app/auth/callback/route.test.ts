// After a magic-link login the browser client must be able to read the session, or every
// client-side auth call fails — John Orian, 2026-10-01: Update password → "Auth session missing!".
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('auth callback cookies', () => {
  const source = readFileSync('app/auth/callback/route.ts', 'utf8');

  it('never re-sets the session cookies as httpOnly', () => {
    expect(source).not.toMatch(/httpOnly:\s*true/);
    expect(source).toMatch(/httpOnly:\s*false/);
  });

  it('gives the session a lifetime, so it survives closing the browser', () => {
    expect(source).toMatch(/maxAge:/);
  });

  it('only rewrites Supabase auth cookies', () => {
    expect(source).toContain("startsWith('sb-')");
  });
});
