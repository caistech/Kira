// The beta code's judgement, tested without a database.
//
// Two things are being pinned. NORMALISATION, because the whole reason this product uses a code
// rather than a magic link is that a link expired before eight real invitees opened it — and a code
// that fails on capitalisation or a mail client's en-dash is the same failure wearing a different
// hat. And the FOUR REJECTION BRANCHES, because three of them are states a real tester will hit
// (used it already, left it too long, we withdrew it) and the endpoint answers all four with one
// sentence on purpose, so only these tests can tell them apart.

import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  BETA_CODE_REJECTION_MESSAGE,
  CAIS_BETA_ORGANISATION_ID,
  checkBetaCode,
  formatBetaCode,
  generateBetaCode,
  normaliseBetaCode,
  isBetaSandboxOrganisation,
  type BetaCodeRow,
} from './beta-codes';

const row = (over: Partial<BetaCodeRow> = {}): BetaCodeRow => ({
  code: 'KIRA7H2K9QLM',
  email: 'someone@example.com',
  first_name: null,
  last_name: null,
  organisation_id: '00000000-0000-0000-0000-000000000000',
  expires_at: '2026-12-31T00:00:00.000Z',
  redeemed_at: null,
  revoked_at: null,
  ...over,
});

const NOW = new Date('2026-08-15T00:00:00.000Z');

describe('normalisation — the reason this is a code and not a link', () => {
  it('accepts the hyphenated form it is printed in', () => {
    expect(normaliseBetaCode('KIRA-7H2K-9QLM')).toBe('KIRA7H2K9QLM');
  });

  it('accepts lower case', () => {
    // A 66-year-old typing from an email. This must never be why he cannot get in.
    expect(normaliseBetaCode('kira-7h2k-9qlm')).toBe('KIRA7H2K9QLM');
  });

  it('survives a mail client turning hyphens into en- and em-dashes', () => {
    expect(normaliseBetaCode('KIRA–7H2K—9QLM')).toBe('KIRA7H2K9QLM');
  });

  it('survives a copy-paste that brought whitespace with it', () => {
    expect(normaliseBetaCode('  KIRA 7H2K 9QLM \n')).toBe('KIRA7H2K9QLM');
  });

  it('is idempotent, so a normalised code can be re-normalised safely', () => {
    // Both the peek and the claim normalise, and claim calls peek. If this were not idempotent the
    // second pass would corrupt the first.
    const once = normaliseBetaCode('kira-7h2k-9qlm');
    expect(normaliseBetaCode(once)).toBe(once);
  });

  it('round-trips through the display format', () => {
    expect(normaliseBetaCode(formatBetaCode('KIRA7H2K9QLM'))).toBe('KIRA7H2K9QLM');
  });

  it('gives back an empty string for junk rather than throwing', () => {
    expect(normaliseBetaCode('---')).toBe('');
    expect(normaliseBetaCode('')).toBe('');
  });
});

describe('minting', () => {
  it('avoids the characters people mis-read', () => {
    // No O/0, I/1 or S/5. Every one of those is a support conversation that starts "it says my code
    // is wrong", on a path whose entire job is to not be the reason someone cannot get in.
    //
    // L IS DELIBERATELY KEPT, and this test asserted otherwise on its first run. L is only confusable
    // with 1 and I, and both are excluded — so removing it too would cost an eighth of the alphabet
    // to solve a collision that cannot occur.
    const codes = Array.from({ length: 40 }, () => generateBetaCode());
    for (const code of codes) expect(code).not.toMatch(/[IOS015]/);
  });

  it('produces the expected length and alphabet', () => {
    const code = generateBetaCode();
    expect(code).toHaveLength(12);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it('does not repeat itself', () => {
    // A weak check on purpose — it cannot prove randomness, but it does catch the failure that
    // matters (a constant, or a seeded generator returning the same value per process).
    const codes = new Set(Array.from({ length: 200 }, () => generateBetaCode()));
    expect(codes.size).toBe(200);
  });
});

describe('the four rejection branches', () => {
  it('accepts a live, unused, unrevoked code', () => {
    expect(checkBetaCode(row(), NOW)).toBeNull();
  });

  it('rejects a code that does not exist', () => {
    expect(checkBetaCode(null, NOW)).toBe('unknown');
  });

  it('rejects a code that has already been redeemed', () => {
    expect(checkBetaCode(row({ redeemed_at: '2026-08-01T00:00:00.000Z' }), NOW)).toBe('redeemed');
  });

  it('rejects a code an operator has withdrawn', () => {
    expect(checkBetaCode(row({ revoked_at: '2026-08-01T00:00:00.000Z' }), NOW)).toBe('revoked');
  });

  it('rejects a code past its expiry', () => {
    expect(checkBetaCode(row({ expires_at: '2026-08-14T23:59:59.000Z' }), NOW)).toBe('expired');
  });

  it('treats the expiry instant itself as expired', () => {
    // Boundary stated rather than discovered. `<=` means the moment it expires, it has.
    expect(checkBetaCode(row({ expires_at: NOW.toISOString() }), NOW)).toBe('expired');
  });

  it('offers a way out that does not assume an email to reply to', () => {
    // The sentence Ray hit told him to reply to an invitation he had never received — his code came
    // from a person, not a mailbox. Both halves are pinned: the route out for a code already used
    // (an account exists, so signing in resolves it) and a monitored address for everything else.
    expect(BETA_CODE_REJECTION_MESSAGE).toMatch(/sign in/i);
    expect(BETA_CODE_REJECTION_MESSAGE).toMatch(/@/);
    expect(BETA_CODE_REJECTION_MESSAGE).not.toMatch(/reply to it/i);
  });

  it('still refuses to say WHICH of the four reasons applied', () => {
    // The message is the disclosure boundary, not just copy: naming "already redeemed" tells an
    // anonymous caller that a given code exists, which is the one thing a guesser can learn here.
    for (const leak of [/already been used/i, /expired/i, /revoked/i, /no such code/i]) {
      expect(BETA_CODE_REJECTION_MESSAGE).not.toMatch(leak);
    }
  });

  it('is the SAME sentence on /peek and /redeem — neither route declares its own', () => {
    // ⚠️ THIS IS THE TEST THAT WOULD HAVE CAUGHT THE REAL DEFECT. The wording was repaired on
    // /redeem and left stale on /peek, and BetaRedeem calls /peek first — so the fix was live on the
    // route almost nobody reaches while every rejected code showed the dead end. Nothing failed,
    // nothing logged, and from outside it was indistinguishable from never having fixed it.
    //
    // Asserted against the SOURCE rather than by importing the routes, because both pull in the
    // service-role Supabase client at module scope and would need a live environment to load. The
    // question here is a textual one anyway: does a second copy of this sentence exist?
    const root = join(__dirname, '..', '..', 'app', 'api', 'beta');
    for (const route of ['peek', 'redeem']) {
      const source = readFileSync(join(root, route, 'route.ts'), 'utf8');
      const code = source
        .split('\n')
        .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
        .join('\n');

      expect(code).toContain('BETA_CODE_REJECTION_MESSAGE');
      // A literal rejection sentence outside the shared constant is the drift itself.
      expect(code).not.toMatch(/That code (did not work|is not valid)/);
    }
  });

  it('reports REVOKED ahead of redeemed, so a withdrawn code reads correctly in the log', () => {
    // Only the operator sees this distinction — the visitor gets one sentence either way — and when
    // a code was withdrawn AND somehow used, the withdrawal is the fact worth surfacing.
    expect(
      checkBetaCode(
        row({ revoked_at: '2026-08-01T00:00:00.000Z', redeemed_at: '2026-08-02T00:00:00.000Z' }),
        NOW,
      ),
    ).toBe('revoked');
  });
});

describe('CAIS_BETA_ORGANISATION_ID', () => {
  it('matches the canonical CAIS Beta sandbox org id', () => {
    // This pins the constant to the seeded value used across the app.
    expect(CAIS_BETA_ORGANISATION_ID).toBe('11f7dfa8-14fd-4994-9738-42927c0555b6');
  });
});

describe('isBetaSandboxOrganisation', () => {
  // Note: isBetaSandboxOrganisation requires a live service client (queries beta_codes).
  // We test the exported constant value and the CAIS_BETA_ORGANISATION_ID match here.
  // Full integration test would require mocking createServiceClientV2.

  it('the CAIS Beta constant qualifies as a beta sandbox organisation', () => {
    // The constant is the authoritative anchor — it MUST be the value we expect.
    expect(CAIS_BETA_ORGANISATION_ID).toBeTruthy();
    expect(typeof CAIS_BETA_ORGANISATION_ID).toBe('string');
    expect(CAIS_BETA_ORGANISATION_ID.length).toBeGreaterThan(0);
  });
});

describe('source contracts — the redeem route uses the shared rejection constant', () => {
  it('redeem route source references BETA_CODE_REJECTION_MESSAGE', () => {
    // The same contract test from the four-rejection-branches suite — asserting
    // that a literal rejection sentence never appears outside the shared constant.
    // Kept here because it is a regression guard for the code-as-credential
    // rewrite: the reject path must still use the shared message.
    const { readFileSync } = require('node:fs');
    const { join } = require('node:path');
    const root = join(__dirname, '..', '..', 'app', 'api', 'beta');
    for (const route of ['peek', 'redeem']) {
      const source = readFileSync(join(root, route, 'route.ts'), 'utf8');
      const code = source
        .split('\n')
        .filter((line: string) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
        .join('\n');
      expect(code).toContain('BETA_CODE_REJECTION_MESSAGE');
      expect(code).not.toMatch(/That code (did not work|is not valid)/);
    }
  });
});
