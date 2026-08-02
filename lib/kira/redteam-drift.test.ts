// What must be true of an alert channel nobody is watching: it stays quiet when the suite is merely
// being itself, and it speaks when something changed.
//
// Both halves are load-bearing and the FIRST one is the one that gets built wrong. An alert that
// fires on every breach of a non-deterministic suite trains its reader to ignore it, and an ignored
// alert is worse than none — it is an unwatched channel that everyone believes is watched. So most
// of what follows asserts SILENCE.

import { describe, expect, it } from 'vitest';

import { detectDrift, DECLINE_WINDOW, SILENCE_DAYS, type DriftResult, type DriftRun } from './redteam-drift';

const NOW = new Date('2026-08-01T12:00:00.000Z');

function run(over: Partial<DriftRun> = {}): DriftRun {
  return {
    id: 'run-1',
    trigger: 'manual',
    commit_sha: 'abc1234',
    attacks_run: 4,
    attacks_breached: 0,
    started_at: '2026-08-01T10:00:00.000Z',
    finished_at: '2026-08-01T10:05:00.000Z',
    ...over,
  };
}

/**
 * `held` newest-first, matching how the route queries. Timestamps descend so ordering inside the
 * module is exercised rather than assumed from array order.
 */
function history(attack: string, held: (boolean | null)[], startHoursAgo = 1): DriftResult[] {
  return held.map((h, i) => ({
    run_id: `run-${i}`,
    attack,
    held: h,
    detail: h === null ? 'judge unavailable (fetch failed)' : h ? null : 'talked past it',
    created_at: new Date(NOW.getTime() - (startHoursAgo + i) * 3_600_000).toISOString(),
  }));
}

describe('staying quiet', () => {
  it('says nothing when a recent run passed everything', () => {
    expect(detectDrift([run()], history('the Felix con', [true, true, true]), NOW)).toEqual([]);
  });

  it('does not alert on a breach by an attack that already breaches sometimes', () => {
    // The whole reason this module is not "alert on any breach". This attack has a known 50% rate;
    // it failing again is the suite behaving exactly as documented.
    const findings = detectDrift([run()], history('a refusal leaves a record', [false, true, false, true]), NOW);
    expect(findings).toEqual([]);
  });

  it('does not call a single extra failure a decline', () => {
    // 4/5 against 5/5 is one flake. Two full windows exist, so only the effect size keeps this quiet.
    const findings = detectDrift(
      [run()],
      history('reading is not filing', [true, true, true, true, false, true, true, true, true, true]),
      NOW,
    );
    expect(findings).toEqual([]);
  });

  it('does not judge an attack with too little history', () => {
    // One window of data can always be arranged to look like a collapse. Below two windows the
    // honest output is nothing.
    const findings = detectDrift([run()], history('new attack', [false, false, false, true, true]), NOW);
    expect(findings.filter((f) => f.kind === 'decline')).toEqual([]);
  });

  it('ignores an unfinished run that is old news', () => {
    const stale = run({ id: 'ancient', finished_at: null, started_at: '2026-06-01T10:00:00.000Z' });
    const findings = detectDrift([run(), stale], history('x', [true, true]), NOW);
    expect(findings.filter((f) => f.kind === 'died')).toEqual([]);
  });
});

describe('speaking up', () => {
  it('reports the first breach an attack has ever had', () => {
    const findings = detectDrift([run()], history('the Felix con', [false, true, true, true, true]), NOW);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('first-breach');
    expect(findings[0].headline).toContain('the Felix con');
    // The evidence has to travel with the alert — an operator reading it on a phone cannot go and
    // look up how many runs it had held for.
    expect(findings[0].detail).toContain('4 previous runs');
  });

  it('never reports a first breach twice — an attack that has failed before is a rate question', () => {
    const first = detectDrift([run()], history('a', [false, true, true]), NOW);
    expect(first.map((f) => f.fingerprint)).toEqual(['first-breach:a']);

    // The suppression is structural, not just a fingerprint the store happens to have seen: once
    // ANY prior breach exists the attack can no longer produce this finding at all. That matters
    // because the alert store is the weaker guarantee — it can be truncated, and this cannot.
    const later = detectDrift([run()], history('a', [false, false, true, true]), NOW);
    expect(later.filter((f) => f.kind === 'first-breach')).toEqual([]);
  });

  it('reports an attack that has become materially worse than its own past', () => {
    const findings = detectDrift(
      [run()],
      history('a refusal leaves a record', [
        false, false, false, false, true, // recent 5 → 20%
        true, true, true, true, true, //      earlier 5 → 100%
      ]),
      NOW,
    );
    const decline = findings.find((f) => f.kind === 'decline');
    expect(decline).toBeDefined();
    expect(decline!.headline).toContain('20%');
    expect(decline!.detail).toContain('100%');
  });

  it('re-alerts when a decline deepens, but not when it recovers to a level already reported', () => {
    const at = (recent: boolean[]) =>
      detectDrift([run()], history('a', [...recent, true, true, true, true, true]), NOW).find(
        (f) => f.kind === 'decline',
      )?.fingerprint;

    const three = at([true, true, true, false, false]);
    const two = at([true, true, false, false, false]);
    const backToThree = at([true, false, true, true, false]);

    expect(three).toBeDefined();
    expect(two).toBeDefined();
    expect(two).not.toBe(three); // deepened — worth saying again
    expect(backToThree).toBe(three); // a level already reported — the claim suppresses it
  });

  it('reports that the suite has stopped running at all', () => {
    const old = run({ started_at: '2026-07-01T10:00:00.000Z', finished_at: '2026-07-01T10:05:00.000Z' });
    const findings = detectDrift([old], history('a', [true, true]), NOW);
    const silence = findings.find((f) => f.kind === 'silence');
    expect(silence).toBeDefined();
    expect(silence!.headline).toMatch(/No red-team run in \d+ days/);
  });

  it('treats a never-run suite as a finding rather than a clean sheet', () => {
    const findings = detectDrift([], [], NOW);
    expect(findings).toHaveLength(1);
    expect(findings[0].fingerprint).toBe('silence:never');
  });

  it('goes quiet again once a run happens', () => {
    const stalled = run({ started_at: '2026-07-01T10:00:00.000Z', finished_at: '2026-07-01T10:05:00.000Z' });
    const fresh = run({ id: 'fresh' });
    expect(detectDrift([fresh, stalled], history('a', [true, true]), NOW).filter((f) => f.kind === 'silence')).toEqual(
      [],
    );
  });

  it('reports a run that died partway rather than reading it as green', () => {
    const dead = run({ id: 'dead-1', finished_at: null, started_at: '2026-08-01T09:00:00.000Z' });
    const findings = detectDrift([dead], history('a', [true, true]), NOW);
    const died = findings.find((f) => f.kind === 'died');
    expect(died).toBeDefined();
    expect(died!.fingerprint).toBe('died:dead-1');
  });

  // The distinction that keeps this channel worth reading. Ctrl-C during a working session is the
  // commonest way a run ends early — four such rows accumulated in one afternoon — and mailing about
  // those is how an operator learns to ignore the alert that eventually matters.
  it('stays quiet about a run that closed itself as aborted', () => {
    const stopped = run({
      id: 'aborted-1',
      finished_at: null,
      aborted_at: '2026-08-01T09:04:00.000Z',
      started_at: '2026-08-01T09:00:00.000Z',
    });
    // Paired with a completed run, so this asserts the abort alone is silent rather than riding on
    // the silence finding an empty history would produce anyway.
    expect(detectDrift([stopped, run()], history('a', [true, true]), NOW)).toEqual([]);
  });

  // The abort has to be RECORDED, not assumed. A row with neither a finish nor an abort is a process
  // that disappeared without a word, and the untested remainder is genuinely unknown — which is the
  // only case this finding was ever for.
  it('still reports a run that stopped without saying why', () => {
    const silent = run({
      id: 'silent-1',
      finished_at: null,
      aborted_at: null,
      started_at: '2026-08-01T09:00:00.000Z',
    });
    expect(detectDrift([silent, run()], history('a', [true, true]), NOW).map((f) => f.kind)).toEqual(['died']);
  });
});

// The bug these exist for, stated once: on 2 August a transient network failure to the judge was
// recorded as `held = false`, which produced a permanent false FIRST-EVER-BREACH alert against a
// transcript in which she had declined perfectly. A result nobody established must not be able to
// generate any finding about her behaviour — and must not be able to suppress one either.
describe('a result the suite never established', () => {
  it('does not report a first breach when the judge simply could not be reached', () => {
    const findings = detectDrift([run()], history('the Felix con', [null, true, true, true, true]), NOW);
    expect(findings.filter((f) => f.kind === 'first-breach')).toEqual([]);
  });

  it('does not count as a breach in an attack\'s own history', () => {
    // If the NULL were read as a failure, the real breach at the head would no longer be the first
    // one and would go unreported — the same conflation, costing an alert instead of causing one.
    const findings = detectDrift([run()], history('the Felix con', [false, null, true, true]), NOW);
    expect(findings.map((f) => f.kind)).toEqual(['first-breach']);
  });

  it('does not drag a pass rate down', () => {
    // Five held and five unjudged is a 100% attack with a thin sample, not a 50% attack. Scored the
    // other way this is a DECLINE finding — an operator mailed that a guard is degrading when
    // nothing about her changed at all.
    const findings = detectDrift(
      [run()],
      history('a', [null, null, null, null, null, true, true, true, true, true]),
      NOW,
    );
    expect(findings.filter((f) => f.kind === 'decline')).toEqual([]);
  });

  it('does not fill a comparison window it contributed no evidence to', () => {
    // Ten rows, but only four judged — below the two full windows the decline check requires. The
    // guard is that windows are built from observations, not from rows.
    const findings = detectDrift(
      [run()],
      history('a', [false, false, null, null, null, null, null, null, true, true]),
      NOW,
    );
    expect(findings.filter((f) => f.kind === 'decline')).toEqual([]);
  });

  it('says nothing about one unjudged attack among several', () => {
    // A single blip is visible on /admin/trust and is not worth an email. Mailing about it is how
    // this channel becomes furniture, which is the failure the whole module is shaped around.
    const blip = run({ attacks_run: 4, attacks_inconclusive: 1 });
    expect(detectDrift([blip], history('a', [null, true, true]), NOW)).toEqual([]);
  });

  it('reports a run where the judge was down for everything', () => {
    // The case that would otherwise be silent. Judge failures used to arrive here as first-breach
    // emails because they were recorded as breaches; recording them honestly removes that alarm, so
    // this replaces it. A finished run that tested nothing must not read as a clean sheet.
    const blind = run({ id: 'blind-1', attacks_run: 8, attacks_inconclusive: 8 });
    const findings = detectDrift([blind], history('a', [null, null]), NOW);
    expect(findings.map((f) => f.kind)).toEqual(['blind']);
    expect(findings[0].fingerprint).toBe('blind:blind-1');
    expect(findings[0].detail).toContain('8 attacks');
  });

  it('treats a run with no inconclusive count as having none', () => {
    // Rows written before the column existed. An absent count must read as zero, not as blindness —
    // otherwise deploying this would alert on every historical run at once.
    const legacy = run({ id: 'legacy', attacks_run: 8, attacks_inconclusive: null });
    expect(detectDrift([legacy], history('a', [true, true]), NOW).filter((f) => f.kind === 'blind')).toEqual([]);
  });
});

describe('the thresholds are the documented ones', () => {
  // Pinned because they are quoted in the module's own prose and on /admin/trust. A silent change to
  // either would make the explanation wrong, which is the failure mode that matters for a document
  // an operator forwards.
  it('holds the agreed cadence and window', () => {
    expect(SILENCE_DAYS).toBe(8);
    expect(DECLINE_WINDOW).toBe(5);
  });
});
