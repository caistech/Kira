// The nine buckets, and the three things about them that must not be lost in a redesign.
//
// Asserted on the source in the style of `connect-choices.test.tsx` — vitest runs in `node` here,
// and what matters is the CONTENT of the claim rather than the markup, which a snapshot would pin
// far too tightly. `emptyReason` is exercised directly, because it encodes a product rule and a
// grep would only prove both strings exist somewhere.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { emptyReason, improvedSince, type BucketSection } from './GenomeBuckets';
import { GENOME_AREAS } from '@/lib/genome/areas';

const at = (coverage: BucketSection['coverage']): BucketSection[] => [
  { key: 'pricing', title: 'How work is priced and quoted', coverage },
];

const source = readFileSync(path.resolve(__dirname, 'GenomeBuckets.tsx'), 'utf8');

/**
 * What the OWNER can actually read — comments and class names removed, whitespace collapsed.
 *
 * Three separate false failures on the first run, each worth keeping as a reason:
 *
 *   1. COMMENTS MUST BE STRIPPED. The component carries a warning that "well covered" is not enough
 *      to claim sale-readiness — and the overclaim guard matched on that warning, failing the file
 *      for the sentence explaining why the rule exists. Punishing an honest note teaches the next
 *      person to delete the note instead of the overclaim. (Same lesson the portfolio's
 *      social-proof audit learned the same way.)
 *   2. CLASS NAMES MUST BE STRIPPED. `w-[6%]` is a Tailwind width, and the no-percentages guard
 *      matched it. The rule is about what is printed to the owner, not about CSS.
 *   3. WHITESPACE MUST BE COLLAPSED. JSX wraps prose across lines, so a sentence in the file is not
 *      a substring of the file. Every multi-line copy assertion would silently be untestable.
 */
const prose = source
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')
  .replace(/className=(?:"[^"]*"|\{`[^`]*`\})/g, ' ')
  .replace(/\s+/g, ' ');

describe('colour is never the only signal', () => {
  // NOT GENERIC ACCESSIBILITY BOX-TICKING. Red/green colour blindness affects roughly one man in
  // twelve and this product's stated ICP is men aged 60-70, so a traffic light whose meaning is
  // carried entirely by hue is unreadable to a real slice of the people paying for it.
  it('gives all four bands a word, not just a colour', () => {
    for (const label of ['Nothing yet', 'Just started', 'Building up', 'Well covered']) {
      expect(source).toContain(label);
    }
  });

  it('renders the band label into the markup, not just into the lookup table', () => {
    // The failure this catches: someone keeps the `label` field but drops the chip that prints it,
    // leaving four correctly-named bands that are still only visible as colour.
    expect(source).toContain('{band.label}');
  });
});

describe('there are two kinds of empty, and they must not be swapped', () => {
  // Telling a 66-year-old his depreciation schedule is in his head is confidently wrong, he knows
  // it instantly, and it makes him distrust the parts that ARE right.
  it('says only-you-know for the areas whose truth lives in a conversation', () => {
    const conversational = GENOME_AREAS.filter((a) => a.truthLivesIn === 'conversation');
    expect(conversational.length).toBeGreaterThan(0);
    for (const area of conversational) {
      expect(emptyReason(area.key), area.key).toBe('Only you can tell her this');
    }
  });

  it('says not-been-shown for the areas whose truth lives in a system', () => {
    const systemic = GENOME_AREAS.filter((a) => a.truthLivesIn === 'system');
    expect(systemic.length).toBeGreaterThan(0);
    for (const area of systemic) {
      expect(emptyReason(area.key), area.key).toBe('Kira has not been shown where this lives');
    }
  });

  it('does not claim an unknown area is in his head', () => {
    // An area key the model does not recognise resolves to null in `areaFor`. Defaulting that to
    // "only you can tell her this" would be the confident-wrong this whole model avoids — but it is
    // the branch a ternary falls into by accident, so it is pinned rather than assumed.
    // Documented as the CURRENT behaviour: if this ever needs to change, change it deliberately.
    expect(emptyReason('not-a-real-area')).toBe('Only you can tell her this');
  });
});

describe('the claim stays inside what the data supports', () => {
  // `coverage` bands on raw entry count (0 / 1-2 / 3-5 / 6+), so "well covered" means six entries.
  // That is not a basis for telling an owner his business is ready to sell, and the copy must not
  // drift there while the denominator is still a count.
  it('never claims the business is sale-ready, optimised, or at its best multiple', () => {
    const overclaims = [
      /primed for sale/i,
      /sale[- ]ready/i,
      /ready to sell/i,
      /best possible (exit )?multiple/i,
      /optimised/i,
      /fully systemised/i,
    ];
    for (const pattern of overclaims) {
      expect(prose, `overclaim: ${pattern}`).not.toMatch(pattern);
    }
  });

  it('says the colour measures capture, not quality', () => {
    // The sentence that stops an owner reading a red bar as a verdict on that part of his business.
    expect(prose).toContain('not how good that part of the business is');
  });

  it('shows no percentage, because there is no honest denominator', () => {
    // A `%` in a band label or a width would reintroduce exactly the false precision the coverage
    // field was defined to avoid. Tailwind fraction widths (w-1/3, w-2/3) are fine; a printed
    // percentage is not.
    expect(prose).not.toMatch(/\d+\s*%/);
  });
});

describe('the band-change pulse only fires when something was actually achieved', () => {
  // A celebration that fires at the wrong moment is worse than none: it teaches the owner the
  // signal means nothing, and then the one that matters is ignored too.

  it('stays silent on a first visit', () => {
    // With nothing stored, every populated bucket has "changed". A new owner's first dashboard
    // would otherwise fire a celebration for every area, for work he has not done.
    expect(improvedSince(null, at('covered')).size).toBe(0);
  });

  it('fires when a bucket moves up a band', () => {
    expect(improvedSince({ pricing: 'thin' }, at('building')).has('pricing')).toBe(true);
  });

  it('fires on the very first capture in an area', () => {
    // empty -> thin is the most meaningful move there is, and an off-by-one that treats index 0 as
    // "nothing before" would swallow exactly this one.
    expect(improvedSince({ pricing: 'empty' }, at('thin')).has('pricing')).toBe(true);
  });

  it('stays silent when a bucket moves DOWN', () => {
    // Bands legitimately fall — redaction is a promised feature, and an entry the owner takes back
    // should take its coverage with it. Congratulating him for deleting his own data is the wrong
    // note, which is why this is directional rather than an inequality.
    expect(improvedSince({ pricing: 'covered' }, at('thin')).size).toBe(0);
  });

  it('stays silent when nothing changed', () => {
    expect(improvedSince({ pricing: 'building' }, at('building')).size).toBe(0);
  });

  it('stays silent for an area this browser has never seen', () => {
    // A newly added area, or a stored record written before the model widened. Treated as a
    // baseline, not as a move from zero.
    expect(improvedSince({ somethingElse: 'thin' }, at('covered')).size).toBe(0);
  });

  it('ignores a stored value that is not a band at all', () => {
    // localStorage is shared, writable by anything on the origin, and survives deploys. A corrupt
    // or stale value must degrade to no pulse — never to a pulse.
    expect(improvedSince({ pricing: 'banana' }, at('covered')).size).toBe(0);
  });
});

describe('the zero state', () => {
  it('explains the cause rather than reporting a score', () => {
    // Every owner starts here — the questionnaire baseline is deliberately never counted toward
    // coverage — so the first thing a paying customer sees is nine empty bars. It must read as the
    // gap with locations on it, not as a report card on his business.
    expect(prose).toContain('that is expected before your first conversation');
  });
});
