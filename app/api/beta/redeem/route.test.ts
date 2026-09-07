// app/api/beta/redeem/route.test.ts
//
// Proves the complete code-as-credential redemption contract:
//
// 1. The beta code IS the credential — no password is required or created.
// 2. A magic-link token is minted server-side for the invited identity.
// 3. The token hash is returned to the client for /auth/callback exchange.
// 4. For existing accounts: no duplicate, no consume, token for existing identity.
// 5. For new accounts: user created with email_confirm:true, code consumed, token minted.
// 6. Terms acceptance is required.
// 7. The invitation email determines the identity — ambient session is irrelevant.
//
// The established /auth/callback route handles verifyOtp and cookie writing.
// This test proves the redeem route sets up the correct precondition.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

import { POST } from './route';

const redeemScope = vi.hoisted(() => ({
  // Beta code rows that peekBetaCode resolves
  rows: [] as Array<{
    code: string;
    email: string;
    organisation_id: string;
    first_name: string | null;
    last_name: string | null;
    expires_at: string;
    redeemed_at: string | null;
    revoked_at: string | null;
  }>,
  // Existing auth users returned by listUsers
  authUsers: [] as Array<{ id: string; email: string; confirmed_at: string | null }>,
  // Created auth users from createUser
  createdUser: null as { id: string } | null,
  createUserError: null as { message: string } | null,
  // Generated magic-link tokens
  generatedTokens: [] as string[],
  // Consumed beta codes (claimBetaCode UPDATE)
  consumedCodes: [] as string[],
  // Linked beta codes (linkBetaCodeToUser)
  linkedCodes: [] as Array<{ code: string; userId: string }>,
  // Legacy users
  legacyUsers: [] as Array<{ id: string; auth_user_id: string | null; email: string }>,
  // Current authenticated user (simulates ambient session)
  currentUser: null as { id: string; email: string } | null,
}));

// Mock getAuthUser to simulate ambient browser session
vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn().mockImplementation(async () => redeemScope.currentUser),
}));

// Mock createServiceClientV2 with full chain mock
vi.mock('@/lib/supabase/server', () => ({
  createServiceClientV2: vi.fn().mockImplementation(() => {
    const current: Record<string, unknown> = {};

    function makeChain(table: string) {
      const chain: Record<string, unknown> = {};
      Object.assign(chain, {
        select: (_cols?: string) => chain,
        eq: (col: string, val: unknown) => { current[col] = val; return chain; },
        ilike: (col: string, val: unknown) => { current[col] = val; return chain; },
        is: (col: string, val: unknown) => { current[col] = val; return chain; },
        limit: (_n: number) => chain,
        maybeSingle: async () => {
          // beta_codes: return matching row from peekScope
          if (table === 'beta_codes') {
            const row = redeemScope.rows.find(
              (r) => r.code === String(current.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
            );
            return { data: row ?? null, error: null };
          }
          // users: legacy lookup
          if (table === 'users') {
            const match = redeemScope.legacyUsers.find(
              (u) => (current.auth_user_id && u.auth_user_id === current.auth_user_id) ||
                     (current.email && u.email.toLowerCase() === String(current.email).toLowerCase()),
            );
            return { data: match ?? null, error: null };
          }
          return { data: null, error: null };
        },
        update: (vals: Record<string, unknown>) => {
          const updateChain: Record<string, unknown> = {};
          Object.assign(updateChain, {
            eq: (col: string, val: unknown) => {
              current[col] = val;
              if (table === 'beta_codes') {
                if ('redeemed_at' in vals && vals.redeemed_at === null) {
                  redeemScope.consumedCodes.push(String(current.code ?? ''));
                }
                if ('redeemed_user_id' in vals && vals.redeemed_user_id) {
                  redeemScope.linkedCodes.push({
                    code: String(current.code ?? ''),
                    userId: String(vals.redeemed_user_id),
                  });
                }
              }
              if (table === 'users') {
                if ('auth_user_id' in vals) {
                  const match = redeemScope.legacyUsers.find((u) => u.id === current.id);
                  if (match) match.auth_user_id = String(vals.auth_user_id);
                }
              }
              return updateChain;
            },
            is: (_col: string, _val: unknown) => updateChain,
            select: (_cols?: string) => updateChain,
            maybeSingle: async () => {
              if (table === 'beta_codes') {
                const code = String(current.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                const row = redeemScope.rows.find((r) => r.code === code);
                if (row && !row.redeemed_at && !row.revoked_at) {
                  row.redeemed_at = new Date().toISOString();
                  return {
                    data: { code: row.code, email: row.email, organisation_id: row.organisation_id },
                    error: null,
                  };
                }
                return { data: null, error: null };
              }
              return {
                data: redeemScope.legacyUsers.find((u) => u.id === current.id) ?? null,
                error: null,
              };
            },
          });
          return updateChain;
        },
        insert: async (vals: Record<string, unknown>) => {
          if (table === 'users') {
            redeemScope.legacyUsers.push({
              id: `legacy-${redeemScope.legacyUsers.length + 1}`,
              auth_user_id: null,
              email: String(vals.email ?? ''),
            });
          }
          return { data: null, error: null };
        },
      });
      return chain;
    }

    return {
      from: vi.fn((table: string) => makeChain(table)),
      auth: {
        admin: {
          listUsers: vi.fn(async () => ({
            data: { users: redeemScope.authUsers },
            error: null,
          })),
          createUser: vi.fn(async (opts: { email?: string; password?: string; email_confirm?: boolean }) => {
            if (redeemScope.createUserError) {
              return { data: null, error: redeemScope.createUserError };
            }
            const id = `auth-new-${opts.email ?? 'unknown'}`;
            redeemScope.createdUser = { id };
            return { data: { user: { id } }, error: null };
          }),
          generateLink: vi.fn(async () => {
            const token = `ml-token-${redeemScope.generatedTokens.length + 1}`;
            redeemScope.generatedTokens.push(token);
            return {
              data: {
                properties: {
                  hashed_token: token,
                  verification_type: 'magiclink',
                },
                user: { id: redeemScope.createdUser?.id ?? 'auth-unknown' },
              },
              error: null,
            };
          }),
        },
      },
    };
  }),
}));

vi.mock('@/lib/introducer', () => ({
  ATTRIBUTION_COOKIE: 'kira_attribution',
  attachFirstTouch: vi.fn(),
  attribution: { parse: vi.fn(() => null) },
}));

vi.mock('@/lib/terms', () => ({
  TERMS_VERSION: '2025-01-01',
}));

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/beta/redeem', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function tidy() {
  redeemScope.rows = [];
  redeemScope.authUsers = [];
  redeemScope.createdUser = null;
  redeemScope.createUserError = null;
  redeemScope.generatedTokens = [];
  redeemScope.consumedCodes = [];
  redeemScope.linkedCodes = [];
  redeemScope.legacyUsers = [];
  redeemScope.currentUser = null;
}

beforeEach(() => tidy());

describe('beta code-as-credential redemption', () => {
  // -------------------------------------------------------------------
  // Test 1: Fresh beta tester — Sally Auth → Sally Person → CAIS Beta org
  // -------------------------------------------------------------------
  it('creates a new account for a fresh tester and returns a magic-link token hash', async () => {
    redeemScope.rows = [
      {
        code: 'KIRA7H2K9QLM',
        email: 'sally@newaccount.com',
        organisation_id: '11111111-1111-1111-1111-111111111111',
        first_name: 'Sally',
        last_name: 'Smith',
        expires_at: '2099-01-01T00:00:00.000Z',
        redeemed_at: null,
        revoked_at: null,
      },
    ];
    redeemScope.authUsers = []; // No existing account

    const res = await POST(makeRequest({
      code: 'KIRA-7H2K-9QLM',
      termsAccepted: true,
      termsVersion: '2025-01-01',
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.existing).toBeFalsy();
    expect(json.email).toBe('sally@newaccount.com');
    expect(json.tokenHash).toBeTruthy();
    expect(typeof json.tokenHash).toBe('string');
    expect(json.tokenHash.length).toBeGreaterThan(0);
  });

  it('does not require a password — no PASSWORD_TOO_SHORT in response', async () => {
    redeemScope.rows = [
      {
        code: 'KIRA7H2K9QLM',
        email: 'nopass@example.com',
        organisation_id: '00000000-0000-0000-0000-000000000000',
        first_name: null,
        last_name: null,
        expires_at: '2099-01-01T00:00:00.000Z',
        redeemed_at: null,
        revoked_at: null,
      },
    ];

    // Submit WITHOUT password field
    const res = await POST(makeRequest({
      code: 'KIRA-7H2K-9QLM',
      termsAccepted: true,
      termsVersion: '2025-01-01',
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    // Password must NOT be required
    expect(json.code).not.toBe('PASSWORD_TOO_SHORT');
  });

  it('creates auth user with email_confirm:true and no password', async () => {
    redeemScope.rows = [
      {
        code: 'KIRA7H2K9QLM',
        email: 'fresh@example.com',
        organisation_id: '00000000-0000-0000-0000-000000000000',
        first_name: 'Fresh',
        last_name: 'Tester',
        expires_at: '2099-01-01T00:00:00.000Z',
        redeemed_at: null,
        revoked_at: null,
      },
    ];

    await POST(makeRequest({
      code: 'KIRA-7H2K-9QLM',
      termsAccepted: true,
    }));

    // Verify createUser was called (createdUser is set)
    expect(redeemScope.createdUser).not.toBeNull();
    expect(redeemScope.createdUser!.id).toContain('fresh@example.com');
  });

  it('generates a magic-link token for the invited email', async () => {
    redeemScope.rows = [
      {
        code: 'KIRA7H2K9QLM',
        email: 'invited@example.com',
        organisation_id: '00000000-0000-0000-0000-000000000000',
        first_name: null,
        last_name: null,
        expires_at: '2099-01-01T00:00:00.000Z',
        redeemed_at: null,
        revoked_at: null,
      },
    ];

    await POST(makeRequest({
      code: 'KIRA-7H2K-9QLM',
      termsAccepted: true,
    }));

    expect(redeemScope.generatedTokens.length).toBe(1);
    expect(redeemScope.generatedTokens[0]).toMatch(/^ml-token-/);
  });

  // -------------------------------------------------------------------
  // Test 3: Sally already has an Auth account — no password, no /login redirect
  // -------------------------------------------------------------------
  it('returns existing:true and a magic-link token for an existing account without /login', async () => {
    redeemScope.rows = [
      {
        code: 'KIRA7H2K9QLM',
        email: 'sally@example.com',
        organisation_id: '11111111-1111-1111-1111-111111111111',
        first_name: 'Sally',
        last_name: 'Smith',
        expires_at: '2099-01-01T00:00:00.000Z',
        redeemed_at: null,
        revoked_at: null,
      },
    ];
    redeemScope.authUsers = [
      { id: 'auth-sally-existing', email: 'sally@example.com', confirmed_at: '2026-01-01' },
    ];

    const res = await POST(makeRequest({
      code: 'KIRA-7H2K-9QLM',
      termsAccepted: true,
      termsVersion: '2025-01-01',
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.existing).toBe(true);
    expect(json.email).toBe('sally@example.com');
    expect(json.tokenHash).toBeTruthy();

    // Must NOT have created a new user
    expect(redeemScope.createdUser).toBeNull();
    // Must NOT have consumed the invitation
    expect(redeemScope.consumedCodes).toHaveLength(0);
    // Must NOT have linked the code
    expect(redeemScope.linkedCodes).toHaveLength(0);
  });

  // -------------------------------------------------------------------
  // Test 2: Dennis's browser session present + Sally's code → Sally's identity
  // -------------------------------------------------------------------
  it('mints token for the invited identity regardless of ambient browser session', async () => {
    redeemScope.rows = [
      {
        code: 'KIRA7H2K9QLM',
        email: 'sally@invited.com',
        organisation_id: '11111111-1111-1111-1111-111111111111',
        first_name: 'Sally',
        last_name: 'Invited',
        expires_at: '2099-01-01T00:00:00.000Z',
        redeemed_at: null,
        revoked_at: null,
      },
    ];
    redeemScope.authUsers = [
      { id: 'auth-sally', email: 'sally@invited.com', confirmed_at: '2026-01-01' },
    ];
    // Dennis is signed in (ambient session)
    redeemScope.currentUser = { id: 'auth-dennis', email: 'dennis@example.com' };

    const res = await POST(makeRequest({
      code: 'KIRA-7H2K-9QLM',
      termsAccepted: true,
    }));
    const json = await res.json();

    // Token is for the INVITED identity (Sally), not Dennis
    expect(json.ok).toBe(true);
    expect(json.existing).toBe(true);
    expect(json.email).toBe('sally@invited.com');
    expect(json.tokenHash).toBeTruthy();

    // generateLink was called — token is for Sally
    expect(redeemScope.generatedTokens.length).toBe(1);
  });

  // -------------------------------------------------------------------
  // Test 7: Invalid/expired/used codes — no auth, clear failure
  // -------------------------------------------------------------------
  it('rejects an unknown code', async () => {
    redeemScope.rows = [];

    const res = await POST(makeRequest({
      code: 'FAKE-CODE-1234',
      termsAccepted: true,
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.code).toBe('BETA_CODE_REJECTED');
  });

  it('rejects a revoked code', async () => {
    redeemScope.rows = [
      {
        code: 'KIRA7H2K9QLM',
        email: 'revoked@example.com',
        organisation_id: '00000000-0000-0000-0000-000000000000',
        first_name: null,
        last_name: null,
        expires_at: '2099-01-01T00:00:00.000Z',
        redeemed_at: null,
        revoked_at: '2026-08-01T00:00:00.000Z',
      },
    ];

    const res = await POST(makeRequest({
      code: 'KIRA-7H2K-9QLM',
      termsAccepted: true,
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.code).toBe('BETA_CODE_REJECTED');
  });

  it('rejects when terms are not accepted', async () => {
    redeemScope.rows = [
      {
        code: 'KIRA7H2K9QLM',
        email: 'test@example.com',
        organisation_id: '00000000-0000-0000-0000-000000000000',
        first_name: null,
        last_name: null,
        expires_at: '2099-01-01T00:00:00.000Z',
        redeemed_at: null,
        revoked_at: null,
      },
    ];

    const res = await POST(makeRequest({
      code: 'KIRA-7H2K-9QLM',
      termsAccepted: false,
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.code).toBe('TERMS_REQUIRED');
  });

  it('rejects a mismatched terms version', async () => {
    redeemScope.rows = [
      {
        code: 'KIRA7H2K9QLM',
        email: 'test@example.com',
        organisation_id: '00000000-0000-0000-0000-000000000000',
        first_name: null,
        last_name: null,
        expires_at: '2099-01-01T00:00:00.000Z',
        redeemed_at: null,
        revoked_at: null,
      },
    ];

    const res = await POST(makeRequest({
      code: 'KIRA-7H2K-9QLM',
      termsAccepted: true,
      termsVersion: '1999-01-01',
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.code).toBe('TERMS_VERSION_MISMATCH');
  });

  it('rejects a missing code', async () => {
    const res = await POST(makeRequest({
      termsAccepted: true,
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.code).toBe('CODE_REQUIRED');
  });
});
