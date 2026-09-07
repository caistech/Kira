// app/api/valuation/claim/route.test.ts
//
// Proves the beta/sandbox org guard for device-valuation claim.
//
// When the authenticated user belongs to a beta/sandbox organisation, the
// claim route MUST refuse to write or replace — the seeded baseline is
// never overwritten by a device-local valuation. The guard is server-authoritative
// (isBetaSandboxOrganisation) and runs before any read/write to business_valuations.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const claimScope = vi.hoisted(() => ({
  organisationId: 'org-00000000-00000000-0000-000000000001',
  isBetaOrg: false,
  existingValuation: null as { id: string } | null,
  writes: [] as Array<{ table: string; action: string; data?: unknown }>,
}));

vi.mock('@/lib/auth', () => ({
  getCurrentOrganisationContext: vi.fn().mockImplementation(async () => ({
    organisationId: claimScope.organisationId,
    personId: 'person-0001',
    role: 'member',
  })),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClientV2: vi.fn().mockImplementation(() => ({
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      Object.assign(chain, {
        select: (_cols?: string) => chain,
        eq: (_col: string, _val: unknown) => chain,
        maybeSingle: async () => {
          if (table === 'business_valuations') {
            return { data: claimScope.existingValuation, error: null };
          }
          return { data: null, error: null };
        },
        insert: async (vals: Record<string, unknown>) => {
          claimScope.writes.push({ table, action: 'insert', data: vals });
          return { data: null, error: null };
        },
        update: (vals: Record<string, unknown>) => ({
          eq: (_col: string, _val: unknown) => {
            claimScope.writes.push({ table, action: 'update', data: vals });
            return { data: null, error: null };
          },
        }),
      });
      return chain;
    }),
  })),
}));

vi.mock('@/lib/billing/beta-codes', () => ({
  isBetaSandboxOrganisation: vi.fn().mockImplementation(async (orgId: string) => {
    return claimScope.isBetaOrg;
  }),
}));

vi.mock('@/lib/valuation/model', () => ({
  computeValuation: vi.fn().mockImplementation((inputs: unknown) => ({
    gap: 100000,
    today: 500000,
    potential: 600000,
    walkAway: 400000,
    sdeMultiple: 3.2,
    readiness: 0.75,
    readinessPotential: 0.85,
  })),
}));

vi.mock('@/lib/valuation/snapshots', () => ({
  recordValuationSnapshot: vi.fn().mockResolvedValue(undefined),
}));

function makeValuationRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/valuation/claim', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const USABLE_INPUTS = {
  industry: 'Construction',
  annualTurnover: 1000000,
  annualProfit: 200000,
  ownerDependence: 'low',
  systems: 'strong',
  employeeCount: 5,
};

function tidy() {
  claimScope.organisationId = 'org-00000000-00000000-0000-000000000001';
  claimScope.isBetaOrg = false;
  claimScope.existingValuation = null;
  claimScope.writes = [];
}

beforeEach(() => tidy());

describe('valuation claim — beta/sandbox org guard', () => {
  // -------------------------------------------------------------------
  // Test 5: Beta org + device valuation → no prompt, seeded baseline intact
  // -------------------------------------------------------------------
  it('refuses to write when the organisation is a beta/sandbox org', async () => {
    claimScope.isBetaOrg = true;

    const res = await POST(makeValuationRequest({
      inputs: USABLE_INPUTS,
      currency: 'AUD',
      confirmed: true,
      action: 'replace',
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.claimed).toBe(false);
    expect(json.reason).toBe('beta_sandbox_org');
    // No writes to business_valuations
    expect(claimScope.writes).toHaveLength(0);
  });

  it('refuses to adopt even when confirmed for a beta org', async () => {
    claimScope.isBetaOrg = true;

    const res = await POST(makeValuationRequest({
      inputs: USABLE_INPUTS,
      currency: 'AUD',
      confirmed: true,
      action: 'adopt',
    }));
    const json = await res.json();

    expect(json.claimed).toBe(false);
    expect(json.reason).toBe('beta_sandbox_org');
    expect(claimScope.writes).toHaveLength(0);
  });

  // -------------------------------------------------------------------
  // Test 6: Normal org + device valuation → existing behaviour unchanged
  // -------------------------------------------------------------------
  it('allows write for a non-beta organisation', async () => {
    claimScope.isBetaOrg = false;

    const res = await POST(makeValuationRequest({
      inputs: USABLE_INPUTS,
      currency: 'AUD',
      confirmed: true,
      action: 'adopt',
    }));
    const json = await res.json();

    expect(json.claimed).toBe(true);
    expect(claimScope.writes.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects unconfirmed requests', async () => {
    const res = await POST(makeValuationRequest({
      inputs: USABLE_INPUTS,
      currency: 'AUD',
      confirmed: false,
      action: 'adopt',
    }));
    const json = await res.json();

    expect(json.claimed).toBe(false);
    expect(json.reason).toBe('needs_confirmation');
  });

  it('rejects requests without usable inputs', async () => {
    const res = await POST(makeValuationRequest({
      inputs: {},
      currency: 'AUD',
      confirmed: true,
      action: 'adopt',
    }));

    expect(res.status).toBe(400);
  });
});
