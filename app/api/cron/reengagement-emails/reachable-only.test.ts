// A re-engagement email must only reach someone who can act on it.
//
// THE DEFECT THIS PINS. `get_users_for_reengagement` selects on activity — who has gone quiet — and
// nothing asked the second question: can this person sign in at all? Two real people signed up in
// January and February 2026, were given a thirty-day trial and a provisioned agent, and never had an
// auth identity created. Their trials expired without either of them once getting through the door,
// and this cron went on mailing them "welcome back" — most recently on 2026-08-07, in the same batch
// as the operator's own account.
//
// Nothing surfaced it, because from the inside it looks identical to a healthy send: rows returned,
// mail dispatched, `last_email_at` updated. The only signal was in a column nobody joined against.
//
// A source assertion rather than a rendered one: the route is a cron handler that reaches Supabase
// and Resend, so running it in vitest would test the harness. What can be asserted cheaply is the
// thing that broke — that the recipient list is narrowed to accounts with an auth identity, and that
// the loop sends to the NARROWED list rather than the raw one.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repo = (p: string) => readFileSync(path.resolve(__dirname, '../../../..', p), 'utf8');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('re-engagement only reaches people who can sign in', () => {
  const route = stripComments(repo('app/api/cron/reengagement-emails/route.ts'));

  it('asks which candidates have an auth identity', () => {
    expect(route).toMatch(/\.not\(\s*['"`]auth_user_id['"`]\s*,\s*['"`]is['"`]\s*,\s*null\s*\)/);
  });

  it('sends to the narrowed list, not the raw RPC result', () => {
    // The half that actually protects anyone. Building `sendable` and then looping over `users`
    // anyway would leave the bug in place with a variable nearby that looks like a fix.
    expect(route).toMatch(/for\s*\(\s*const user of sendable\s*\)/);
    expect(route).not.toMatch(/for\s*\(\s*const user of users \|\| \[\]\s*\)/);
  });

  it('reports how many it skipped rather than silently shrinking the batch', () => {
    // A batch that quietly gets smaller is indistinguishable from one with fewer people in it.
    expect(route).toMatch(/skippedNoAuthIdentity/);
  });

  it('does not log the addresses it skipped', () => {
    // An email address is PII and a cron log is not the place for it. The count is enough to
    // notice the state and go and look.
    const warnLine = route.match(/console\.warn\([\s\S]*?\);/)?.[0] ?? '';
    expect(warnLine).not.toMatch(/user_email|\.email\b/);
  });
});
