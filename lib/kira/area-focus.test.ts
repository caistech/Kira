import { describe, expect, it } from 'vitest';

import { GENOME_AREAS } from '@/lib/genome/areas';
import { buildAreaFocusFirstMessage, buildGenomeOverviewFirstMessage, isAreaKey } from './area-focus';

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

describe('the opener when he is standing on the whole Genome', () => {
  const s = (key: string, title: string, coverage: 'empty' | 'thin' | 'building' | 'covered') => ({
    key,
    title,
    coverage,
  });

  it('leads on an EMPTY area before a thin one', () => {
    // An area answering nothing is a worse gap than one answering a little, so it is the one she
    // offers even when a thin one comes first in the list.
    const line = buildGenomeOverviewFirstMessage([
      s('pricing', 'How work is priced and quoted', 'thin'),
      s('people', 'Who does the work', 'empty'),
    ])!;
    expect(line).toMatch(/the biggest gap is who does the work/i);
  });

  it('NAMES ONE AREA, never a list — the titles contain commas', () => {
    // ⚠️ FOUND BY READING IT ALOUD, not by a test. One of the nine real areas is titled "Who buys,
    // and who owns the relationship", so a listed opener said: "who does the work, what the business
    // owns and who buys, and who owns the relationship" — three items or four, and a listener cannot
    // tell. No separator fixes that in speech. She gives the count and offers the worst one; the
    // funnels beside her carry the rest.
    const line = buildGenomeOverviewFirstMessage([
      s('people', 'Who does the work', 'empty'),
      s('customers', 'Who buys, and who owns the relationship', 'empty'),
      s('assets', 'What the business owns', 'empty'),
    ])!;
    // Lower-cased on purpose — the title sits mid-sentence and is spoken aloud.
    expect(line).toContain('who does the work');
    expect(line).not.toContain('what the business owns');
    expect(line).not.toContain('who owns the relationship');
  });

  it('counts in WORDS, because she says this out loud', () => {
    const line = buildGenomeOverviewFirstMessage(
      ['a', 'b', 'c'].map((k) => s(k, `Area ${k.toUpperCase()}`, 'empty')),
    )!;
    expect(line).toMatch(/there are three parts/);
    expect(line).not.toMatch(/there are 3 parts/);
  });

  it('counts every gap, not just the ones it could have named', () => {
    // The count is the honest total. Capping it would under-report the size of the job on the one
    // screen whose purpose is showing him the size of the job.
    const line = buildGenomeOverviewFirstMessage(
      ['a', 'b', 'c', 'd', 'e', 'f'].map((k) => s(k, `Area ${k.toUpperCase()}`, 'empty')),
    )!;
    expect(line).toMatch(/there are six parts/);
  });

  it('offers to start there, so he does not have to choose from nine', () => {
    const line = buildGenomeOverviewFirstMessage([s('people', 'Who does the work', 'empty')])!;
    expect(line).toMatch(/the biggest gap is who does the work\. shall we start there\?/i);
  });

  it('uses the singular when only one area is missing', () => {
    const line = buildGenomeOverviewFirstMessage([
      s('people', 'Who does the work', 'empty'),
      s('pricing', 'How work is priced', 'covered'),
    ])!;
    expect(line).toMatch(/there's one part/i);
    expect(line).not.toMatch(/there are/i);
  });

  it('returns null when the Genome is in good shape, so the welcome-back stands', () => {
    // Null rather than a manufactured gap. A man whose areas are all covered should be met with
    // what he was last working on, not with an invented deficiency.
    expect(
      buildGenomeOverviewFirstMessage([
        s('people', 'Who does the work', 'covered'),
        s('pricing', 'How work is priced', 'building'),
      ]),
    ).toBeNull();
  });

  it('returns null on no sections at all, rather than opening on nothing', () => {
    expect(buildGenomeOverviewFirstMessage([])).toBeNull();
    expect(buildGenomeOverviewFirstMessage(null)).toBeNull();
  });

  it('carries the TRIGGER only — never the questions themselves', () => {
    // ⚠️ THE RULE THIS FILE EXISTS TO HOLD. The page renders once; the call lasts twenty minutes. A
    // question baked into the opener is a snapshot that can be several answers stale by the time she
    // says it, which is why area_agenda is hers to call. If a future edit starts embedding the
    // checklist here, this fails.
    const line = buildGenomeOverviewFirstMessage([s('people', 'Who does the work', 'empty')])!;
    expect(line).toMatch(/give me a moment to see what's already in it/i);
    expect(line.split('?').length - 1).toBe(1); // exactly one question: which area to start on
  });

  it('greets him by name when there is one, and reads properly without', () => {
    const withName = buildGenomeOverviewFirstMessage([s('people', 'Who does the work', 'empty')], 'Dennis')!;
    expect(withName.startsWith('Dennis, ')).toBe(true);
    const without = buildGenomeOverviewFirstMessage([s('people', 'Who does the work', 'empty')], '  ')!;
    expect(without.startsWith("there's one part")).toBe(true);
  });
});
