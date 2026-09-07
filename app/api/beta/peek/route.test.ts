// app/api/beta/peek/route.test.ts
//
// Proves that the beta invitation peek route exposes the invitation-bound
// first and last name alongside the email — the data that the valuation page
// uses to pre-fill the "What should we call you?" field, and that the plan
// page surfaces as the invitee's canonical name.
//
// The route is read-only: it never consumes the invitation, creates Auth
// accounts, or establishes sessions. It validates the code and returns
// identity-adjacent presentation data.

import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { POST } from './route';

const peekScope = vi.hoisted(() => ({
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
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClientV2: vi.fn().mockImplementation(() => ({
    from: vi.fn(() => ({
      select: (_cols?: string) => ({
        eq: (_col: string, _val: unknown) => ({
          maybeSingle: async () => {
            const row = peekScope.rows[0] ?? null;
            return { data: row, error: null };
          },
        }),
      }),
    })),
  })),
}));

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/beta/peek', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('beta invitation peek — identity-adjacent presentation data', () => {
  it('returns first_name and last_name when the code is valid', async () => {
    peekScope.rows = [
      {
        code: 'KIRA7H2K9QLM',
        email: 'sally@example.com',
        organisation_id: '11111111-1111-1111-1111-111111111111',
        first_name: 'Sally',
        last_name: 'Smith',
        expires_at: '2026-12-31T00:00:00.000Z',
        redeemed_at: null,
        revoked_at: null,
      },
    ];

    const res = await POST(makeRequest({ code: 'KIRA-7H2K-9QLM' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.email).toBe('sally@example.com');
    expect(json.firstName).toBe('Sally');
    expect(json.lastName).toBe('Smith');
  });

  it('returns null names when the code has no invitation names', async () => {
    peekScope.rows = [
      {
        code: 'KIRA7H2K9QLM',
        email: 'anonymous@example.com',
        organisation_id: '22222222-2222-2222-2222-222222222222',
        first_name: null,
        last_name: null,
        expires_at: '2026-12-31T00:00:00.000Z',
        redeemed_at: null,
        revoked_at: null,
      },
    ];

    const res = await POST(makeRequest({ code: 'KIRA-7H2K-9QLM' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.firstName).toBeNull();
    expect(json.lastName).toBeNull();
  });

  it('rejects an unknown code with the shared rejection message', async () => {
    peekScope.rows = [];

    const res = await POST(makeRequest({ code: 'FAKE-CODE-1234' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.code).toBe('BETA_CODE_REJECTED');
  });

  it('rejects a revoked code', async () => {
    peekScope.rows = [
      {
        code: 'KIRA7H2K9QLM',
        email: 'revoked@example.com',
        organisation_id: '00000000-0000-0000-0000-000000000000',
        first_name: 'Rev',
        last_name: 'oked',
        expires_at: '2099-01-01T00:00:00.000Z',
        redeemed_at: null,
        revoked_at: '2026-08-01T00:00:00.000Z',
      },
    ];

    const res = await POST(makeRequest({ code: 'KIRA-7H2K-9QLM' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
  });

  it('rejects a redeemed code (code-as-credential: invalid/expired codes still rejected)', async () => {
    peekScope.rows = [
      {
        code: 'KIRA7H2K9QLM',
        email: 'used@example.com',
        organisation_id: '00000000-0000-0000-0000-000000000000',
        first_name: null,
        last_name: null,
        expires_at: '2099-01-01T00:00:00.000Z',
        redeemed_at: '2026-08-01T00:00:00.000Z',
        revoked_at: null,
      },
    ];

    const res = await POST(makeRequest({ code: 'KIRA-7H2K-9QLM' }));
    const json = await res.json();

    // peekBetaCode uses checkBetaCode which rejects 'redeemed' codes.
    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
  });
});
