import { describe, expect, it } from 'vitest';

import { GENOME_AREAS } from '@/lib/genome/areas';
import { buildAreaFocusFirstMessage, isAreaKey } from './area-focus';

describe('the opener when he arrives from an area', () => {
  it('names the area he pressed, in the words the page used', () => {
    // ⚠️ The area TITLE, not the key. `areas.ts` titles are full phrases — "who does the work", not
    // "People" — so the opener reads "let's look at who does the work", which is better English than
    // the key would have given and, more importantly, is the same wording he just read on the page
    // he pressed the button on. An earlier version of this test asserted /people/ on an assumption
    // about the data that had never been checked.
    const msg = buildAreaFocusFirstMessage('people', 'Dennis')!;
    expect(msg).toMatch(/who does the work/i);
    expect(msg).toMatch(/^Dennis, /);
  });

  it('works without a name', () => {
    expect(buildAreaFocusFirstMessage('pricing')).toMatch(/^let's look at how work is priced/i);
  });

  it('uses the area title verbatim, so the page and the opener cannot drift', () => {
    for (const area of GENOME_AREAS) {
      expect(buildAreaFocusFirstMessage(area.key), area.key).toContain(area.title.toLowerCase());
    }
  });

  it('⚠️ carries no question list — she pulls that herself', () => {
    // The standard's rule, and the failure it prevents is a slow one: this page renders once, the
    // call lasts twenty minutes, and anything baked in is a snapshot that can be several answers
    // stale by the time she says it.
    for (const area of GENOME_AREAS) {
      const msg = buildAreaFocusFirstMessage(area.key, 'Dennis')!;
      // The area's own buyer question is context and belongs here; the OUTSTANDING items do not.
      expect(msg).not.toMatch(/who could step into your job/i);
      expect(msg).not.toMatch(/still open|outstanding|missing/i);
    }
  });

  it('asks nothing, so she is not answered before she has looked', () => {
    // Two questions in the first ten seconds is the interview the whole design avoids. The buyer
    // question is quoted as context and reads with a question mark; what must not appear is a
    // SECOND one addressed to him.
    const msg = buildAreaFocusFirstMessage('people', 'Dennis')!;
    expect(msg).not.toMatch(/\bwhat would you like\b|\bshall we\b|\bwhere would you like\b/i);
  });

  it('produces an opener for every one of the nine', () => {
    for (const area of GENOME_AREAS) {
      expect(buildAreaFocusFirstMessage(area.key), area.key).toBeTruthy();
    }
  });

  it('returns null for anything that is not one of the nine', () => {
    // Null rather than a generic greeting: an unrecognised area means the link was wrong, and a warm
    // opener over a broken link hides it.
    expect(buildAreaFocusFirstMessage('the vibe')).toBeNull();
    expect(buildAreaFocusFirstMessage('')).toBeNull();
    expect(buildAreaFocusFirstMessage(null)).toBeNull();
    expect(buildAreaFocusFirstMessage(undefined)).toBeNull();
  });
});

describe('isAreaKey', () => {
  it('accepts the nine and nothing else', () => {
    expect(GENOME_AREAS.every((a) => isAreaKey(a.key))).toBe(true);
    expect(isAreaKey('dashboard')).toBe(false);
    expect(isAreaKey(null)).toBe(false);
  });
});
