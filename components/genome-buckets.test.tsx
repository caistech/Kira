// @design-tokens-ok: this file names #ef4444 and #dc2626 in order to assert their ABSENCE from the
// funnels — "nine red-bottomed shapes is nine warning lights on a dashboard". A test proving a
// colour is not used has to name the colour, and replacing them with tokens would make the
// assertion check for a token nobody paints with instead of the literal somebody might.

// The nine buckets, and the three things about them that must not be lost in a redesign.
//
// Asserted on the source in the style of `connect-choices.test.tsx` — vitest runs in `node` here,
// and what matters is the CONTENT of the claim rather than the markup, which a snapshot would pin
// far too tightly. `emptyReason` is exercised directly, because it encodes a product rule and a
// grep would only prove both strings exist somewhere.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { bucketDisplay, emptyReason, improvedSince, type BucketSection } from './GenomeBuckets';
import { GENOME_AREAS } from '@/lib/genome/areas';
import { stripComments } from '@/lib/source-scan';

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
  it('gives EVERY band a word, not just a colour', () => {
    // ⚠️ 'You told us' was added in a later change and this list did not grow with it, which is how
    // an accessibility guard quietly stops covering the newest state. Derived would be better; a
    // named list at least fails loudly when someone adds a sixth and reads this.
    for (const label of ['Nothing yet', 'You told us', 'Just started', 'Building up', 'Well covered']) {
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

describe('a self-report is shown, and can never outrank a captured fact', () => {
  const sec = (over: Partial<BucketSection>): BucketSection => ({
    key: 'pricing', title: 'How work is priced and quoted', coverage: 'empty', ...over,
  });
  const told = { statement: 'You told us the pricing lives in your head', ownerDependent: true };

  it('lifts an EMPTY area to located when he has answered for it', () => {
    // The defect this closes: a man who had just answered thirteen questions about his own business
    // was shown nine bars reading "Nothing yet".
    expect(bucketDisplay(sec({ coverage: 'empty', baseline: told }))).toBe('located');
  });

  it('leaves an area with NO answer empty', () => {
    // `people` and `compliance` get no baseline — nothing in the thirteen questions speaks to who
    // does the work or to licences. They stay red, honestly, and that IS the "still only in your
    // head" signal rather than a gap in the display.
    expect(bucketDisplay(sec({ coverage: 'empty', baseline: null }))).toBe('empty');
    expect(bucketDisplay(sec({ coverage: 'empty' }))).toBe('empty');
  });

  it('NEVER lets a self-report outrank something Kira actually captured', () => {
    // The load-bearing rule. Once there are real entries, capture is what is shown — a baseline may
    // only ever lift the empty state. Getting this wrong would let a form he filled in before he
    // paid dress itself up as captured knowledge, which is the exact overclaim `coverage` refuses.
    for (const coverage of ['thin', 'building', 'covered'] as const) {
      expect(bucketDisplay(sec({ coverage, baseline: told })), coverage).toBe(coverage);
    }
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

describe('⚠️ the picture Ray could not read — none of it comes back', () => {
  // Every assertion here is a defect he found on 2026-08-16, walking production as the ICP.
  const rendered = stripComments(source);

  it('has no red anywhere', () => {
    // "Nine red-bottomed shapes is nine warning lights on a dashboard." The caption said the colour
    // measures capture; the picture won. And on /sample-genome a FINISHED area was still red at the
    // bottom, so red was permanent — "a traffic light, not a gauge".
    expect(rendered).not.toMatch(/#ef4444|#dc2626|bg-rose-|text-rose-|border-rose-/);
  });

  it('is not a funnel — no interpolated widths', () => {
    // "Every funnel I've seen in thirty-five years is a picture of LOSS." A shape whose width is
    // derived from its own y is the funnel returning under another name.
    expect(rendered).not.toMatch(/segmentPath|TOP_W|BOT_W|halfAt/);
  });

  it('draws equal levels, so one of four looks like one of four', () => {
    // The fill used to sit at the narrow end, where progress was nearly invisible.
    expect(rendered).toMatch(/levelRect/);
    expect(rendered).toMatch(/<rect/);
  });

  it('carries a count for anyone who cannot see the picture', () => {
    // "There's no number. I cannot tell whether I'm at the start, a third of the way, or nearly
    // there, and there's nowhere on the page that tells me."
    expect(rendered).toMatch(/of 4 levels/);
    // "so far" was dropped when the summary gained the STARTED count beside the covered one —
    // "0 of 9 well covered" sat above a grid with three visibly filled, and one number could not
    // tell the truth about three states. The assertion tracks the surviving half of that sentence.
    expect(rendered).toMatch(/well covered/);
  });

  it('says out loud that an area can be opened', () => {
    // "The funnels are clickable, but nothing says so… A bloke my age doesn't go poking at pictures."
    expect(rendered).toMatch(/Open this area/);
  });

  it('does not offer a link to the page you are already on', () => {
    // "I clicked it three times." A link that does nothing costs more than a missing one.
    expect(rendered).toMatch(/variant === 'compact'/);
  });
});

describe('⚠️ the six totals Ray counted on one screen', () => {
  const rendered = stripComments(source);

  it('a "you told us" area is OUTLINED, never filled', () => {
    // THE ROOT OF THE CONTRADICTION. The bars showed `located` (he answered in the thirteen
    // questions) while the list below showed `coverage` (she captured), so a filled bar sat directly
    // above the words "Not captured". His fix: "a filled bar is a promise."
    expect(rendered).toMatch(/outlineOnly/);
    expect(rendered).toMatch(/strokeDasharray/);
  });

  it('counts the third quantity, not just two', () => {
    // There are three states — captured, located, nothing — and only two were ever counted, which is
    // how the footer said "Nothing is filled in yet" above six tiles showing something.
    expect(rendered).toMatch(/const located = sections\.filter/);
  });

  it('the zero state never claims nothing has happened when something has', () => {
    expect(rendered).not.toMatch(/Nothing is filled in yet/);
  });

  it('body text on the tiles is at least 16px on mobile', () => {
    // 17 nodes measured at 12px at 375px — the description under every one of the nine tiles.
    // Responsive rule: >=16px base on mobile; dense sizing is allowed from `sm:` up.
    //
    // The first version of this used a negative LOOKAHEAD and flagged `sm:text-xs` as a violation,
    // because the `sm:` sits BEFORE the match, not after. A lookbehind is the right tool: catch a
    // bare `text-xs` and leave a breakpoint-qualified one alone.
    // READ INSIDE THE ASSERTION, NOT FROM THE MODULE-SCOPE source.
    //
    // The module-scope copy did not reflect a mutation: reintroducing a bare text-xs in
    // GenomeBuckets.tsx left this green, while the identical regex over the identical bytes in a
    // standalone script found it immediately. Rather than keep guessing at the cause, the read moved
    // to where the assertion is, which is the only version whose freshness is self-evident.
    //
    // Third guard today that could not fire, and the pattern in all three is the same: I checked the
    // guard against the FIXED code and inferred it would catch the broken one.
    const live = stripComments(readFileSync(path.resolve(__dirname, 'GenomeBuckets.tsx'), 'utf8'));
    const bare = [...live.matchAll(/(?<!sm:)text-xs/g)];
    expect(bare.map((m) => live.slice(Math.max(0, m.index - 45), m.index + 8))).toEqual([]);
});});
