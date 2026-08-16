// The area panel must offer an action in EVERY state — especially the empty one.
//
// WHY THIS FILE EXISTS. The panel shipped with its only action inside the assessed branch of a
// `neverAssessed ? … : …` fork, so on a new account — the ONLY state a new owner is ever in — it
// could not render, and the single control on screen was a DISABLED button with nothing said. Nine
// areas, nine identical dead ends. Ray, walking it 2026-08-16:
//
//   "Not homework I'll never do — homework doesn't have a door. This is a room with no door at all."
//
// It was the SECOND instance in one day: the funnels on /my-genome had been mounted inside
// `g.empty ? … : …` for exactly the same reason. Unit tests cannot see it — the component compiles,
// renders and passes in the state the author had in mind. So this asserts the SOURCE STRUCTURE:
// the primary action is outside the fork, and no control is ever rendered disabled.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { stripComments } from '@/lib/source-scan';

const source = readFileSync(
  path.resolve(__dirname, '[area]', 'page.tsx'),
  'utf8',
);

/** Everything from the top of the file to the first `neverAssessed ?` fork. */
const beforeTheFork = source.slice(0, source.indexOf('{neverAssessed ?'));

describe('⚠️ the primary action is reachable in every state', () => {
  it('the Talk link is rendered BEFORE the assessed/unassessed fork', () => {
    // THE LOAD-BEARING ONE. If this moves back inside the fork, a new owner sees no action at all.
    expect(beforeTheFork, 'the Talk link has moved inside the fork again').toMatch(
      /href=\{`\/talk\?area=\$\{area\}`\}/,
    );
  });

  it('the Talk link appears exactly once, so it cannot be half-moved', () => {
    // A partial move — left in the branch AND added above — renders it twice for assessed areas and
    // reads as a mistake rather than a fix.
    expect(source.match(/href=\{`\/talk\?area=\$\{area\}`\}/g)?.length).toBe(1);
  });
});

describe('⚠️ no control is ever rendered disabled', () => {
  it('the assess button is never passed a disabled prop', () => {
    // A greyed button with no reason is, in Ray's words, "the universal sign of software that isn't
    // finished" — and it made the honest refusal message unreachable, because the control that
    // produces it could not be pressed. If there is nothing to check, do not offer to check.
    expect(source).not.toMatch(/<AssessAreaButton[^>]*disabled/);
  });

  it('the assess button is only offered when there is something to assess', () => {
    expect(source).toMatch(/entryCount > 0 && \(/);
  });
});

describe('the panel does not contradict the card that links to it', () => {
  it('renders the baseline statement when the area has one', () => {
    // /my-genome's card shows `baseline.statement`; the panel showed none of it, so one click later
    // the same area said "Kira has not captured anything about this part of your business yet".
    expect(source).toMatch(/section\?\.baseline/);
    expect(source).toMatch(/baseline\.statement/);
  });

  it('does not claim the baseline as captured coverage', () => {
    // A self-report from the thirteen questions is not a captured fact. The band must still be
    // computed from assessed items alone — letting a baseline lift an area out of empty would
    // manufacture progress from a form he filled in before he paid.
    expect(source).toMatch(/assessAreaItems\(area as AreaKey, assessed\)/);
  });
});

describe('the claim the panel is allowed to make', () => {
  it('does not imply that filling every area makes the business sale-ready', () => {
    // Sector and size dominate the multiple; a perfectly systemised cafe is still 1.0-2.5x.
    //
    // ⚠️ COMMENTS ARE STRIPPED FIRST. The first draft matched the file's own header, which says in
    // as many words that the panel MUST NOT imply sale-readiness — so the guard failed on the note
    // explaining why the guard exists. Same lesson as the genome-buckets and readiness-claims
    // checks: punishing an honest explanation teaches the next person to delete the explanation.
    const rendered = stripComments(source);
    expect(rendered).toMatch(/top of your sector/i);
    expect(rendered).not.toMatch(/sale-ready|ready to sell|ready for sale/i);
  });
});
