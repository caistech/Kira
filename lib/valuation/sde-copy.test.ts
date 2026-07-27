// lib/valuation/sde-copy.test.ts
//
// Guards a correctness bug, not a style preference.
//
// A naive-tester found the profit question describing SDE two different ways on one screen: the
// label said "plus the salary and perks you pay yourself", the helper said "after costs and your
// own pay". For an owner-operated SME the gap between those is the owner's whole remuneration —
// usually the largest add-back — so an owner following the helper enters a materially smaller
// number and the valuation comes out wrong, confidently. It is the single input `computeValuation`
// runs on.
//
// These tests fail if the net-profit phrasing comes back, anywhere in the valuation copy.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  NET_PROFIT_PHRASES_BANNED_IN_SDE_COPY,
  SDE_DEFINITION,
  SDE_SHORT_REMINDER,
  sdeExample,
  sdeMarginNote,
} from './sde-copy';

const VALUATION_PAGE = join(process.cwd(), 'app', 'business-valuation', 'page.tsx');

describe('SDE copy', () => {
  it('defines SDE as profit WITH the owner’s pay added back', () => {
    expect(SDE_DEFINITION).toMatch(/plus the salary and perks you pay yourself/i);
    expect(SDE_DEFINITION).toMatch(/added back/i);
  });

  it('never describes SDE using net-profit phrasing', () => {
    const allCopy = [
      SDE_DEFINITION,
      SDE_SHORT_REMINDER,
      sdeExample('$'),
      sdeMarginNote(10, '$2,000,000'),
    ].join(' \n ');

    for (const banned of NET_PROFIT_PHRASES_BANNED_IN_SDE_COPY) {
      expect(allCopy.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });

  it('shows the worked example as two components that are ADDED, not one net figure', () => {
    const example = sdeExample('$');
    // The failure mode was an example that folded the owner's pay into "what you kept".
    expect(example).toMatch(/\$150k after costs/i);
    expect(example).toMatch(/paid you \$50k/i);
    expect(example).toMatch(/add them together/i);
    expect(example).toMatch(/\$200,000/);
  });

  it('reminds the owner to add their pay back when confirming a margin', () => {
    expect(sdeMarginNote(10, '$2,000,000')).toMatch(/includes your own salary and perks added back/i);
  });

  it('the live valuation page contains none of the banned net-profit phrasing', () => {
    const page = readFileSync(VALUATION_PAGE, 'utf8').toLowerCase();
    for (const banned of NET_PROFIT_PHRASES_BANNED_IN_SDE_COPY) {
      expect(page).not.toContain(banned.toLowerCase());
    }
  });

  it('the live valuation page sources its SDE copy from this module, not inline strings', () => {
    const page = readFileSync(VALUATION_PAGE, 'utf8');
    expect(page).toContain('SDE_DEFINITION');
    expect(page).toContain('sdeExample');
    expect(page).toContain('sdeMarginNote');
  });
});
