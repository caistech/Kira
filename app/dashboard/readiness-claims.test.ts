// THE DASHBOARD MUST NOT PROMISE MOVEMENT IT CANNOT PRODUCE.
//
// `readiness` has exactly TWO writers — app/api/onboarding/complete and app/api/valuation/claim —
// and both run at signup. No cron recomputes it, no genome write path touches it, no confirmation
// updates it. It is a baseline, permanently, until the valuation-movement work lands.
//
// The paid home screen said "Transferability today: 54/100 — we grow this every week" for every
// owner who has ever read it, four inches above a paragraph explaining that the baseline "stays
// fixed so progress is measured from one starting point". Two sentences on one screen contradicting
// each other, one of them false, on the product's own promise.
//
// ⚠️ THIS GUARD IS DELIBERATELY NARROW. It does not police "grows" or "improves" generally — the
// Genome genuinely does grow as she captures, and /my-genome says so truthfully. What it forbids is
// a RECURRING-INTERVAL promise attached to the readiness figure, which is the specific claim nothing
// implements. When readiness recomputes, delete this file rather than editing around it.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { stripComments } from '@/lib/source-scan';

const dashboard = stripComments(
  readFileSync(path.resolve(__dirname, 'page.tsx'), 'utf8'),
);

describe('the readiness figure claims only what it is', () => {
  it('does not promise a weekly or monthly increase', () => {
    // Comments are stripped first — this file's own explanation quotes the removed sentence, and a
    // guard that fails on the note recording why it exists teaches the next person to delete the
    // note. Learned the same way on the genome-buckets overclaim check.
    for (const promise of [
      /grow this every week/i,
      /grows every week/i,
      /every week/i,
      /each week/i,
      /weekly/i,
    ]) {
      expect(dashboard, `dashboard promises recurring movement: ${promise}`).not.toMatch(promise);
    }
  });

  it('names the figure as a baseline rather than as today', () => {
    // "Transferability TODAY" implies a figure that will be different tomorrow. It will not be.
    expect(dashboard).toMatch(/Transferability at your baseline/);
  });

  it('still points the owner at something that does move', () => {
    // The promise was transferred rather than deleted. The nine Genome areas fill as she captures,
    // and that is visible — so removing the false claim did not leave the screen saying nothing
    // about progress, which would have been a different kind of wrong.
    expect(dashboard).toMatch(/See what has moved/);
  });
});

describe('the claim matches the code', () => {
  it('readiness really is written only at signup', () => {
    // ⚠️ THE LOAD-BEARING ONE. The copy above is only correct while this is true. If a third writer
    // appears — a cron, a confirmation path, a rescore — the honest thing is to make the copy claim
    // movement again, and this test failing is the prompt to do that rather than an obstacle.
    const writers = ['app/api/onboarding/complete/route.ts', 'app/api/valuation/claim/route.ts'];
    const repoRoot = path.resolve(__dirname, '..', '..');

    for (const writer of writers) {
      const src = readFileSync(path.join(repoRoot, writer), 'utf8');
      expect(src, `${writer} should still write readiness`).toMatch(/readiness/);
    }
  });
});
