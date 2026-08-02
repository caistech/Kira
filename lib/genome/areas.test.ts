import { describe, expect, it } from 'vitest';

import { AREA_KEYS, GENOME_AREAS, LEGACY_SECTION_MAP, LOCATIONS, areaFor, areasByRank } from './areas';

describe('the nine areas', () => {
  it('is exactly nine', () => {
    expect(GENOME_AREAS).toHaveLength(9);
  });

  it('has no duplicate keys', () => {
    expect(new Set(AREA_KEYS).size).toBe(AREA_KEYS.length);
  });

  // Three of §3.1's ten ranks cannot be areas by the document's own reasoning, and each absence is
  // load-bearing. Re-adding any of them is the regression this pins.
  it('does NOT contain owner-dependence, financial integrity, or a standalone suppliers area', () => {
    expect(AREA_KEYS).not.toContain('only-you');
    expect(AREA_KEYS).not.toContain('owner-dependence');
    expect(AREA_KEYS).not.toContain('financials');
    expect(AREA_KEYS).not.toContain('financial-integrity');
    expect(AREA_KEYS).not.toContain('suppliers');
  });

  it('assigns each rank at most once', () => {
    const ranks = GENOME_AREAS.map((a) => a.rank).filter((r): r is number => r !== null);
    expect(new Set(ranks).size).toBe(ranks.length);
  });

  // The open decision, pinned so it stays visible. If someone gives Demand a rank, this test should
  // be the thing that makes them state why — not a silent edit that starts scoring it.
  it('leaves DEMAND unranked, because §3.1 has no marketing rank and the call has not been made', () => {
    expect(GENOME_AREAS.find((a) => a.key === 'demand')?.rank).toBeNull();
  });

  it('ranks Customers first — the biggest discount a buyer applies', () => {
    expect(GENOME_AREAS.find((a) => a.key === 'customers')?.rank).toBe(1);
    expect(areasByRank()[0].key).toBe('customers');
  });

  // An unranked area must still appear. Dropping it from a buyer-facing document because nobody
  // assigned it a number is exactly what the sort must not do.
  it('sorts unranked areas last rather than dropping them', () => {
    const sorted = areasByRank();
    expect(sorted).toHaveLength(9);
    expect(sorted[sorted.length - 1].key).toBe('demand');
  });

  it('carries the flow-group provenance for every area', () => {
    for (const area of GENOME_AREAS) expect(area.flowGroups.length).toBeGreaterThan(0);
  });
});

describe('the legacy six', () => {
  it('maps the five that widen straight across', () => {
    expect(LEGACY_SECTION_MAP).toEqual({
      'work-in': 'demand',
      pricing: 'pricing',
      delivery: 'operations',
      suppliers: 'cash',
      obligations: 'compliance',
    });
  });

  // The whole point of retiring it. A mapping would reinstate the bucket: 115 of 233 rows on one
  // account sat in only-you, and sending them all to one area just renames the problem.
  it('does NOT map only-you anywhere — it becomes the per-row axis', () => {
    expect(LEGACY_SECTION_MAP).not.toHaveProperty('only-you');
  });

  it('maps every legacy key to a real area', () => {
    for (const target of Object.values(LEGACY_SECTION_MAP)) expect(AREA_KEYS).toContain(target);
  });
});

describe('the location ladder', () => {
  it('runs from the head to a third-party system, five rungs', () => {
    expect(LOCATIONS.map((l) => l.key)).toEqual(['head', 'paper', 'local', 'own-cloud', 'third-party']);
  });

  // The ladder is only meaningful if it actually ascends: each rung must be at least as good as the
  // one below on every axis. A reorder that broke this would make "the move up" advice wrong.
  it('never goes backwards on written-down, reachable or verifiable', () => {
    const score = (l: (typeof LOCATIONS)[number]) => Number(l.writtenDown) + Number(l.reachableByOthers) + Number(l.verifiable);
    for (let i = 1; i < LOCATIONS.length; i += 1) {
      expect(score(LOCATIONS[i])).toBeGreaterThanOrEqual(score(LOCATIONS[i - 1]));
    }
  });

  it('gives every rung a next action, including the bottom one', () => {
    for (const l of LOCATIONS) expect(l.moveUp.length).toBeGreaterThan(0);
  });
});

describe('areaFor', () => {
  it('resolves a known key', () => {
    expect(areaFor('customers')?.title).toBe('Who buys, and who owns the relationship');
  });

  // Old rows carry retired keys. Returning null is data; throwing would take down a Genome page.
  it('returns null for an unknown, null or undefined key rather than throwing', () => {
    expect(areaFor('only-you')).toBeNull();
    expect(areaFor(null)).toBeNull();
    expect(areaFor(undefined)).toBeNull();
    expect(areaFor('')).toBeNull();
  });
});

describe('where an area\'s truth lives', () => {
  it('marks every area either conversation or system', () => {
    for (const a of GENOME_AREAS) expect(['conversation', 'system']).toContain(a.truthLivesIn);
  });

  // §3.2: "The four new areas are SOURCE gaps, not conversational ones." These are the four, and
  // the reason the page must not tell an owner they are "still only in your head" — his
  // depreciation schedule is at the accountant's, and he knows it.
  it('treats the four new areas as source gaps, not head gaps', () => {
    const systemAreas = GENOME_AREAS.filter((a) => a.truthLivesIn === 'system').map((a) => a.key);
    expect(systemAreas.sort()).toEqual(['assets', 'customers', 'people', 'systems']);
  });

  it('keeps the five widened-from-legacy areas conversational', () => {
    const conv = GENOME_AREAS.filter((a) => a.truthLivesIn === 'conversation').map((a) => a.key);
    expect(conv.sort()).toEqual(['cash', 'compliance', 'demand', 'operations', 'pricing']);
  });

  // The legacy five are exactly the ones an owner has been TALKING about, so every legacy mapping
  // must land on a conversational area. If one ever maps to a system area, the "still in your head"
  // copy starts lying about facts he really did tell us.
  it('maps every legacy section onto a conversational area', () => {
    for (const target of Object.values(LEGACY_SECTION_MAP)) {
      expect(GENOME_AREAS.find((a) => a.key === target)?.truthLivesIn).toBe('conversation');
    }
  });
});
