// Cohort evidence — the numbers that make retirement-for-coverage checkable.
//
// Tested here as pure reducers (no database). The read path in `cohortEvidenceFor` is a thin
// wrapper over a Supabase query that feeds rows into this reducer; the contract that makes the
// journal claim honest is asserted here.

import { describe, expect, it } from 'vitest';
import { reduceCohortEvidence, cohortSnapshotText, type CohortEvidenceRow } from './cohort-evidence';

function row(userId: string, status: 'open' | 'weak' | 'answered'): CohortEvidenceRow {
  return { user_id: userId, status };
}

describe('reduceCohortEvidence', () => {
  it('dedupes by user_id — the latest assessment wins (input arrives ordered desc by assessed_at)', () => {
    // u1 has two assessments — the first one (latest) is 'answered'
    const rows = [row('u1', 'answered'), row('u1', 'weak'), row('u2', 'weak')];
    const ev = reduceCohortEvidence(rows);
    expect(ev.totalAssessed).toBe(2);
    expect(ev.answered).toBe(1);
    expect(ev.weak).toBe(1);
  });

  it('applies the window limit on distinct users, not raw rows', () => {
    const rows = [
      row('u1', 'answered'),
      row('u1', 'weak'),   // duplicate — latest wins
      row('u2', 'answered'),
      row('u3', 'weak'),
    ];
    // Limit 2 — takes only the first 2 distinct users (u1, u2)
    const ev = reduceCohortEvidence(rows, 2);
    expect(ev.totalAssessed).toBe(2);
    expect(ev.answered).toBe(2);
    expect(ev.weak).toBe(0);
  });

  it('computes substantivePct correctly', () => {
    const rows = [
      row('u1', 'answered'),
      row('u2', 'answered'),
      row('u3', 'answered'),
      row('u4', 'weak'),
    ];
    const ev = reduceCohortEvidence(rows);
    expect(ev.answered).toBe(3);
    expect(ev.weak).toBe(1);
    expect(ev.substantivePct).toBe(75);
    expect(ev.coveragePct).toBe(100);
  });

  it('returns null substantivePct when no one has landed a verdict', () => {
    const rows = [row('u1', 'open'), row('u2', 'open')];
    const ev = reduceCohortEvidence(rows);
    expect(ev.answered).toBe(0);
    expect(ev.weak).toBe(0);
    expect(ev.open).toBe(2);
    expect(ev.substantivePct).toBeNull();
    expect(ev.coveragePct).toBe(0);
  });

  it('handles empty rows gracefully', () => {
    const ev = reduceCohortEvidence([]);
    expect(ev.totalAssessed).toBe(0);
    expect(ev.substantivePct).toBeNull();
    expect(ev.coveragePct).toBe(0);
  });

  it('rounds rates to one decimal', () => {
    const rows = [
      row('u1', 'answered'),
      row('u2', 'answered'),
      row('u3', 'answered'),
      row('u4', 'weak'),
    ];
    const ev = reduceCohortEvidence(rows);
    // 3/4 = 75% substantive; 4/4 = 100% coverage
    expect(ev.substantivePct).toBe(75);
    expect(ev.coveragePct).toBe(100);
  });
});

describe('cohortSnapshotText', () => {
  it('produces a quotable claim when there is data', () => {
    const text = cohortSnapshotText({
      totalAssessed: 25,
      answered: 22,
      weak: 3,
      open: 0,
      substantivePct: 88,
      coveragePct: 100,
      window: 25,
    });
    expect(text).toContain('last 25 distinct assessments');
    expect(text).toContain('22 substantive (88% of those who answered)');
    expect(text).toContain('3 weak');
    expect(text).toContain('0 unanswered');
    expect(text).toContain('100% coverage');
  });

  it('notes when no assessments exist yet', () => {
    const text = cohortSnapshotText({
      totalAssessed: 0,
      answered: 0,
      weak: 0,
      open: 0,
      substantivePct: null,
      coveragePct: 0,
      window: 25,
    });
    expect(text).toContain('0 assessed');
    expect(text).toContain('no cohort evidence');
  });
});