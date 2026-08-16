// The number that moves — and every way it must refuse to move.
//
// Most of this file is about the score NOT changing. That is the right emphasis: a scoring change
// that is too eager is indistinguishable from flattery, and flattery on a valuation is the one
// failure this product cannot recover from, because the man finds out in a data room.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import type { AssessedItem, ItemStatus } from '@/lib/genome/checklist-bands';
import { CHECKLIST, type FactorKey } from '@/lib/genome/checklist';
import {
  FACTOR_WEIGHTS,
  computeEvidencedReadiness,
  evidenceForFactor,
  movementDrivers,
} from './evidenced-readiness';

const BASELINE: Record<FactorKey, number> = {
  ownerDependence: 0.5,
  systems: 0.5,
  recurringRevenue: 0.5,
  clientConcentration: 0.5,
  growth: 0.5,
};

const verdicts = (pairs: [string, ItemStatus][]): AssessedItem[] =>
  pairs.map(([itemKey, status]) => ({ itemKey, status, why: null, evidence: [] }));

const requiredFor = (factor: FactorKey) =>
  CHECKLIST.filter((i) => i.factor === factor && i.required).map((i) => i.key);

describe('it stays tied to the model', () => {
  it('the weights match model.ts exactly', () => {
    // ⚠️ LOAD-BEARING. This file restates the weights so it can stay dependency-free, and a restated
    // constant is a constant that drifts. Read out of the model's own source so a change there
    // reddens here instead of silently producing a second, different rubric.
    const source = readFileSync(path.resolve(__dirname, 'model.ts'), 'utf8');
    const block = source.match(/const WEIGHTS = \{([^}]+)\}/)?.[1];
    expect(block, 'could not find WEIGHTS in model.ts — this guard has stopped guarding').toBeTruthy();

    const parsed: Record<string, number> = {};
    for (const m of (block as string).matchAll(/(\w+):\s*([\d.]+)/g)) parsed[m[1]] = Number(m[2]);
    expect(parsed).toEqual(FACTOR_WEIGHTS);
  });
});

describe('rule 1 — a plan moves nothing', () => {
  it('an unassessed owner sits exactly on his baseline', () => {
    const r = computeEvidencedReadiness(BASELINE, []);
    expect(r.unassessed).toBe(true);
    expect(r.readinessNow).toBeCloseTo(r.baseline, 10);
  });

  it('a WEAK answer moves nothing', () => {
    // The whole point of gate 2. If weak counted, the rubric would be counting again with extra
    // steps: six vague sentences and a higher valuation.
    const r = computeEvidencedReadiness(
      BASELINE,
      verdicts(requiredFor('ownerDependence').map((k) => [k, 'weak'])),
    );
    expect(r.readinessNow).toBeCloseTo(r.baseline, 10);
  });

  it('an area returned all-open because the model was unreachable does not crater the score', () => {
    // ⚠️ Degrade-don't-fake at the scoring layer. All-open is what an outage looks like, and reading
    // it as "everything is missing" would show a collapsed valuation to a man whose only problem
    // was our API key.
    const r = computeEvidencedReadiness(BASELINE, verdicts(CHECKLIST.map((i) => [i.key, 'open'])));
    expect(r.unassessed).toBe(true);
    expect(r.readinessNow).toBeCloseTo(r.baseline, 10);
  });

  it('supporting items cannot move the number, however many are answered', () => {
    // Otherwise a man lifts his valuation by answering the easy questions — rewards-talking in a
    // subtler form.
    const supporting = CHECKLIST.filter((i) => !i.required && i.factor).map(
      (i) => [i.key, 'answered'] as [string, ItemStatus],
    );
    expect(supporting.length).toBeGreaterThan(0);
    const r = computeEvidencedReadiness(BASELINE, verdicts(supporting));
    expect(r.readinessNow).toBeCloseTo(r.baseline, 10);
  });
});

describe('rule 2 — it can go down, and that is the feature', () => {
  it('falls when the evidence is worse than the self-report', () => {
    // He said he was a 0.5 on owner-dependence. Then he answered the questions, and the answers say
    // one of four. The number must follow the evidence, not the flattering original.
    const keys = requiredFor('ownerDependence');
    const one: [string, ItemStatus][] = keys.map((k, i) => [k, i === 0 ? 'answered' : 'weak']);
    const r = computeEvidencedReadiness(BASELINE, verdicts(one));
    expect(r.readinessNow).toBeLessThan(r.baseline);

    const driver = movementDrivers(r)[0];
    expect(driver.factor).toBe('ownerDependence');
    expect(driver.delta).toBeLessThan(0);
  });

  it('rises when every required item for a factor is genuinely answered', () => {
    const r = computeEvidencedReadiness(
      BASELINE,
      verdicts(requiredFor('ownerDependence').map((k) => [k, 'answered'])),
    );
    expect(r.readinessNow).toBeGreaterThan(r.baseline);
  });

  it('at full coverage the evidence wins outright over the baseline', () => {
    // Every required item assessed IS a better answer than a form he filled in before he paid.
    const all = CHECKLIST.filter((i) => i.required && i.factor).map(
      (i) => [i.key, 'answered'] as [string, ItemStatus],
    );
    const r = computeEvidencedReadiness(BASELINE, verdicts(all));
    for (const f of r.factors) {
      if (f.total > 0) expect(f.baselineScore + f.delta).toBeCloseTo(1, 6);
    }
  });

  it('names what moved, biggest first, in either direction', () => {
    const r = computeEvidencedReadiness(
      BASELINE,
      verdicts([
        ...requiredFor('ownerDependence').map((k) => [k, 'answered'] as [string, ItemStatus]),
        ...requiredFor('systems').map((k, i) => [k, i === 0 ? 'answered' : 'open'] as [string, ItemStatus]),
      ]),
    );
    const drivers = movementDrivers(r);
    expect(drivers.length).toBeGreaterThan(0);
    for (let i = 1; i < drivers.length; i++) {
      expect(Math.abs(drivers[i - 1].delta)).toBeGreaterThanOrEqual(Math.abs(drivers[i].delta));
    }
  });
});

describe('rule 3 — no evidence means no opinion', () => {
  it('a factor with nothing assessed keeps its baseline sub-score exactly', () => {
    // growth has no checklist items at all — it is the one thing the model says a seller cannot fix
    // by writing things down. It must pass through untouched rather than being read as zero.
    const r = computeEvidencedReadiness(
      BASELINE,
      verdicts(requiredFor('ownerDependence').map((k) => [k, 'answered'])),
    );
    const growth = r.factors.find((f) => f.factor === 'growth');
    expect(growth?.delta).toBe(0);
    expect(growth?.evidencedScore).toBeNull();
  });

  it('growth is deliberately unevidenced by the checklist', () => {
    // Stated as an assertion rather than left implicit: if somebody later maps an item to growth,
    // this reddens and they have to decide whether writing something down really does move it.
    expect(evidenceForFactor('growth', new Map()).total).toBe(0);
  });
});

describe('the result stays in range', () => {
  it('clamps to 0..1 even with a nonsense baseline', () => {
    const silly: Record<FactorKey, number> = {
      ownerDependence: 5,
      systems: -3,
      recurringRevenue: 2,
      clientConcentration: 0.5,
      growth: 9,
    };
    const r = computeEvidencedReadiness(silly, verdicts(CHECKLIST.map((i) => [i.key, 'answered'])));
    expect(r.readinessNow).toBeGreaterThanOrEqual(0);
    expect(r.readinessNow).toBeLessThanOrEqual(1);
  });
});
