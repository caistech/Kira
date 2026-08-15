// EVERY PATH THAT CREATES AN ACCOUNT RECORDS THE TERMS ACCEPTANCE.
//
// This is a guard, not a unit test, and it exists because the rule was already known and already
// broken. `terms_accepted` was written by exactly ONE surface — the /signup form — while the two
// paths that create an account server-side passed only `first_name`. The result was inverted:
// `users.terms_accepted_at` was stamped for people who signed up free and NULL for everyone who had
// actually paid, i.e. the only group with a contract was the group with no recorded acceptance.
//
// Nothing failed. Nothing logged. The migration's own comment quietly became untrue — it says a NULL
// means "the account pre-dates this", and it also meant "they paid".
//
// A rule enforced by remembering holds until someone adds a third signup route at 1am. This is the
// mechanism instead: a new `admin.createUser` call site that does not carry the acceptance fails
// here, by name, with the reason.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

/** Every .ts/.tsx under app/ and lib/, which is where an account could be created. */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
}

const CREATE_CALL = /auth\.admin\.createUser\s*\(/;

/**
 * Call sites allowed to create an account WITHOUT recording acceptance.
 *
 * Empty, and it should stay that way. If a genuine exception ever arises it goes here with a reason
 * a reader can weigh — not by loosening the check.
 */
const EXEMPT: Record<string, string> = {};

describe('terms acceptance is captured wherever an account is created', () => {
  const files = [path.join(ROOT, 'app'), path.join(ROOT, 'lib')].flatMap((dir) => sourceFiles(dir));
  const creators = files.filter((file) => CREATE_CALL.test(readFileSync(file, 'utf8')));

  it('finds the account-creating call sites at all', () => {
    // If this ever reads zero, the guard has stopped guarding — either the files moved or the SDK
    // call was renamed — and every assertion below would pass vacuously.
    expect(creators.length).toBeGreaterThan(0);
  });

  it('passes terms_accepted at every one of them', () => {
    for (const file of creators) {
      const rel = path.relative(ROOT, file).replace(/\\/g, '/');
      if (EXEMPT[rel]) continue;
      const source = readFileSync(file, 'utf8');
      expect(source, `${rel} creates an account without recording terms acceptance`).toMatch(
        /terms_accepted/,
      );
    }
  });

  it('records the VERSION as well as the tick', () => {
    // "He agreed" without "to what" is the half of the record that settles nothing, and the DB
    // trigger falls back to the string 'unversioned' when the version is absent — which is a real
    // value that looks like an answer.
    for (const file of creators) {
      const rel = path.relative(ROOT, file).replace(/\\/g, '/');
      if (EXEMPT[rel]) continue;
      const source = readFileSync(file, 'utf8');
      expect(source, `${rel} records a tick but not the version agreed to`).toMatch(/terms_version/);
    }
  });

  it('never lets the client name the version it agreed to', () => {
    // The tick is necessarily the client's assertion — there is no server-side way to observe one.
    // The WORDING is not: if a request could name its own `terms_version`, the record would say the
    // user agreed to whatever they claimed to agree to, which is worse than having no record.
    for (const file of creators) {
      const rel = path.relative(ROOT, file).replace(/\\/g, '/');
      if (EXEMPT[rel]) continue;
      const source = readFileSync(file, 'utf8');
      // Either the constant is imported from our own module, or the value comes from Stripe session
      // metadata (`m.terms_version`), which the server wrote in /api/checkout from that same
      // constant. Both are ours; `body.termsVersion` would not be.
      const serverOwned = /TERMS_VERSION/.test(source) || /m\.terms_version/.test(source);
      expect(serverOwned, `${rel} may be taking the terms version from the request body`).toBe(true);
      expect(source, `${rel} reads the terms version straight off the request body`).not.toMatch(
        /body[.\s]*\.?\s*termsVersion/,
      );
    }
  });
});
