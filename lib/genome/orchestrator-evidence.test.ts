// lib/genome/orchestrator-evidence.test.ts
//
// Pure-function tests + degrade-don't-fake. No live orchestrator call in this suite — fetchPromotedEvidence
// is exercised only for its unconfigured-env behaviour, mirroring lib/genome/tasks.test.ts's discoverTasks
// coverage.

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  EVIDENCE_BUCKET_TO_AREA,
  observedAreas,
  observedAutomationItem,
  observedItemKey,
  fetchPromotedEvidence,
  type OrchestratorEvidenceRow,
} from './orchestrator-evidence';

function row(over: Partial<OrchestratorEvidenceRow> = {}): OrchestratorEvidenceRow {
  return {
    id: 'ev-1',
    effectKind: 'email.send',
    genomeBucket: 'communication',
    description: 'Outbound communication sent.',
    maturityLevel: 2,
    status: 'promoted',
    createdAt: '2026-09-29T00:00:00.000Z',
    reviewedAt: '2026-09-29T01:00:00.000Z',
    ...over,
  };
}

describe('EVIDENCE_BUCKET_TO_AREA — every orchestrator bucket maps to a real Kira area', () => {
  const KIRA_AREAS = new Set([
    'demand', 'pricing', 'operations', 'cash', 'customers', 'people', 'assets', 'compliance', 'systems',
  ]);

  it('every mapped value is one of Kira\'s nine canonical area keys', () => {
    for (const [bucket, area] of Object.entries(EVIDENCE_BUCKET_TO_AREA)) {
      expect(KIRA_AREAS.has(area), `${bucket} → "${area}" is not a real Kira area key`).toBe(true);
    }
  });

  it('covers every bucket the evidence collector actually emits', () => {
    // Kept in sync by hand with orchestrator/src/genome/evidence-collector.ts EVIDENCE_MAPPINGS —
    // a bucket that evidence-collector.ts emits and this map does not cover is silently dropped by
    // observedAreas, which is the failure mode this test exists to catch.
    const emittedByCollector = [
      'communication', 'client_management', 'compliance', 'risk_management',
      'financial_management', 'cash_flow', 'operations', 'supply_chain', 'sales',
    ];
    for (const bucket of emittedByCollector) {
      expect(EVIDENCE_BUCKET_TO_AREA[bucket], `"${bucket}" has no mapping`).toBeDefined();
    }
  });
});

describe('observedAreas — which areas have at least one promoted, mapped row', () => {
  it('dedupes multiple rows in the same area to one entry', () => {
    const areas = observedAreas([
      row({ genomeBucket: 'communication' }),
      row({ genomeBucket: 'client_management' }), // both map to 'customers'
    ]);
    expect(areas).toEqual(['customers']);
  });

  it('drops a row whose bucket has no mapping rather than guessing', () => {
    const areas = observedAreas([row({ genomeBucket: 'some_future_bucket_nobody_mapped_yet' })]);
    expect(areas).toEqual([]);
  });

  it('returns [] for an empty input, never a default area', () => {
    expect(observedAreas([])).toEqual([]);
  });
});

describe('observedAutomationItem — the merge point into the existing checklist surface', () => {
  it('is never required — absence must not read as a deficiency', () => {
    expect(observedAutomationItem('operations').required).toBe(false);
  });

  it('never carries a valuation factor, same discipline as a discovered task', () => {
    expect(observedAutomationItem('cash').factor).toBeNull();
  });

  it('closes by fact, not by change or document — it is either true or not yet true', () => {
    expect(observedAutomationItem('compliance').closes).toBe('fact');
  });

  it('key matches observedItemKey exactly, for the upsert conflict target', () => {
    expect(observedAutomationItem('demand').key).toBe(observedItemKey('demand'));
    expect(observedItemKey('demand')).toBe('observed.demand');
  });
});

describe('fetchPromotedEvidence — degrade, don\'t fake', () => {
  const ORIGINAL = { url: process.env.ORCHESTRATOR_URL, secret: process.env.ORCHESTRATOR_SECRET };

  beforeEach(() => {
    delete process.env.ORCHESTRATOR_URL;
    delete process.env.ORCHESTRATOR_SECRET;
  });

  afterEach(() => {
    if (ORIGINAL.url !== undefined) process.env.ORCHESTRATOR_URL = ORIGINAL.url; else delete process.env.ORCHESTRATOR_URL;
    if (ORIGINAL.secret !== undefined) process.env.ORCHESTRATOR_SECRET = ORIGINAL.secret; else delete process.env.ORCHESTRATOR_SECRET;
  });

  it('returns [] rather than throwing when orchestrator is not configured', async () => {
    const result = await fetchPromotedEvidence('some-tenant-id');
    expect(result).toEqual([]);
  });

  it('returns [] for an empty tenantId even if orchestrator IS configured', async () => {
    process.env.ORCHESTRATOR_URL = 'https://example.invalid';
    process.env.ORCHESTRATOR_SECRET = 'sk-test-unused';
    const result = await fetchPromotedEvidence('');
    expect(result).toEqual([]);
  });
});
