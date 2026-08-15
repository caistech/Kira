// The beta code's judgement, tested without a database.
//
// Two things are being pinned. NORMALISATION, because the whole reason this product uses a code
// rather than a magic link is that a link expired before eight real invitees opened it — and a code
// that fails on capitalisation or a mail client's en-dash is the same failure wearing a different
// hat. And the FOUR REJECTION BRANCHES, because three of them are states a real tester will hit
// (used it already, left it too long, we withdrew it) and the endpoint answers all four with one
// sentence on purpose, so only these tests can tell them apart.

import { describe, expect, it } from 'vitest';

import {
  checkBetaCode,
  formatBetaCode,
  generateBetaCode,
  normaliseBetaCode,
  type BetaCodeRow,
} from './beta-codes';

const row = (over: Partial<BetaCodeRow> = {}): BetaCodeRow => ({
  code: 'KIRA7H2K9QLM',
  email: 'someone@example.com',
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
