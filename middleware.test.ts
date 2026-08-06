// Every redirect out of middleware must carry the refreshed session with it.
//
// WHY THIS IS A SOURCE ASSERTION RATHER THAN A BEHAVIOURAL ONE. The defect is not that any single
// redirect was written wrongly — it is that the CORRECT way to redirect from this file is
// non-obvious, and the wrong way is the one the framework documents and the one every example
// shows. `NextResponse.redirect(url)` is right in a middleware that does not touch auth and quietly
// destructive in one that does, because `supabase.auth.getUser()` rotates the refresh token and
// writes the replacement onto a response object that a redirect then discards. The user is left
// holding a token the server has already retired.
//
// Nothing fails when that happens. No error, no log, and every route that does NOT redirect keeps
// working perfectly — so the signal reaching us was "the login is not persisting across my tabs"
// (Shah Hussain, 2026-08-06), which sounds like a cookie setting and is not.
//
// A behavioural test would need a NextRequest, a mocked @supabase/ssr and a forced token refresh to
// assert one line of plumbing. This asserts the same thing in the place a regression would actually
// appear: someone adds a route, adds a redirect, and reaches for the obvious call. It is the same
// shape as NET_PROFIT_PHRASES_BANNED_IN_SDE_COPY in lib/valuation/sde-copy.ts — a regression guard
// on a correctness bug, not a style preference.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(path.resolve(__dirname, 'middleware.ts'), 'utf8');

/** Strip comments, so the explanatory prose above the helper is not mistaken for a call site. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('middleware redirects preserve the refreshed session', () => {
  it('routes every redirect through redirectPreservingSession', () => {
    const body = code(source);

    // The helper itself is the one legitimate caller of NextResponse.redirect.
    const bare = [...body.matchAll(/NextResponse\.redirect\(/g)];
    expect(
      bare.length,
      'NextResponse.redirect() appears outside the helper. Use redirectPreservingSession(response, url) ' +
        'instead — a bare redirect drops the rotated auth cookie and silently signs the user out.',
    ).toBe(1);

    expect(body).toContain('function redirectPreservingSession');
  });

  it('copies the response cookies onto the redirect', () => {
    // The whole fix is this line. If the copy goes, the helper is a rename of the bug.
    expect(code(source)).toMatch(/for \(const cookie of response\.cookies\.getAll\(\)\)\s*redirect\.cookies\.set\(cookie\)/);
  });

  it('has at least one guarded redirect, so the guard is not vacuous', () => {
    const calls = [...code(source).matchAll(/redirectPreservingSession\(/g)];
    // One definition + the call sites. Fewer than two total means nothing is actually using it.
    expect(calls.length).toBeGreaterThan(1);
  });
});
