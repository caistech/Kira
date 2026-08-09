import { describe, expect, it } from 'vitest';

import { forSharing, DEVICE_ONLY_ANSWERS } from './share';

// ⚠️ THE H3 GUARD. Kira must never conclude that an owner is selling. The questionnaire asks him
// directly how long he has got, because the advice genuinely inverts between two years and eight
// (register P7) — and the answer must then stop at the edge of the device.
//
// The failure this pins is quiet and one-way: once the handoff is claimed at signup it is a row on
// the account, and from there it is readable by an agent that talks. A man who has told nobody he is
// selling, told by his own assistant that she knows he is leaving in two years, is the single worst
// sentence this product could produce.

const ANSWERS = {
  industry: 'Electrical Contractors',
  turnover: 2_000_000,
  annualProfit: 460_000,
  tangibleAssets: 150_000,
  businessDebt: 380_000,
  workInProgress: 95_000,
  premises: 'owns',
  ownerDependence: 'mostly_runs',
  exitTimeframe: 'within_2',
};

describe('forSharing', () => {
  it('drops the exit timeframe', () => {
    expect(forSharing(ANSWERS)).not.toHaveProperty('exitTimeframe');
  });

  it('drops every answer named device-only, whatever the list grows to', () => {
    const shared = forSharing(ANSWERS) as unknown as Record<string, unknown>;
    for (const key of DEVICE_ONLY_ANSWERS) expect(shared[key]).toBeUndefined();
  });

  it('carries everything else through untouched', () => {
    // The guard must not quietly cost the valuation its inputs — a strip that took too much would
    // break the baseline every introducer's movement column measures from.
    const shared = forSharing(ANSWERS) as unknown as Record<string, unknown>;
    expect(shared.annualProfit).toBe(460_000);
    expect(shared.businessDebt).toBe(380_000);
    expect(shared.workInProgress).toBe(95_000);
    expect(shared.premises).toBe('owns');
    expect(shared.industry).toBe('Electrical Contractors');
    expect(Object.keys(shared)).toHaveLength(Object.keys(ANSWERS).length - DEVICE_ONLY_ANSWERS.length);
  });

  it('does not mutate the answers the page is still rendering from', () => {
    // The advice paragraph on screen is built from the very answer this removes.
    const answers = { ...ANSWERS };
    forSharing(answers);
    expect(answers.exitTimeframe).toBe('within_2');
  });

  it('survives an answer set that never had the field', () => {
    const partial = { annualProfit: 100_000 };
    expect(forSharing(partial)).toEqual({ annualProfit: 100_000 });
  });
});
