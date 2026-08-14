// The guard that stops a model's invention reaching a human as a fact.
//
// WHY IT EXISTS, precisely. Run against a real multi-site dental group, the people extractor was
// handed a JavaScript shell containing ten characters of visible text and returned two people —
// plausible names, plausible titles, and a real source URL on each. None of the four name tokens
// appeared anywhere in the 33,737 bytes of HTML. The extraction prompt says, in capitals, NEVER
// invent a person. It invented two.
//
// The instruction was not the control. This is the control: nothing the model proposes survives
// unless the page we actually retrieved contains it.
//
// THE TWO WAYS THIS GUARD COULD BE WRONG, and both are tested below:
//   too loose — an invented name slips through, and the guard is decoration;
//   too tight  — a real person is dropped because the model wrote "Dr Sarah Chen" where the page
//                wrote "Sarah Chen", and we lose the evidence we came for while feeling safe.

import { describe, expect, it } from 'vitest';
import { isGroundedInSource, normaliseName } from './research';

/** The corpus is always lower-cased by the caller before it reaches the guard. */
const corpus = (s: string) => s.toLowerCase();

describe('normaliseName', () => {
  it('strips honorifics so a title the page omits is not treated as a difference', () => {
    expect(normaliseName('Dr Sarah Chen')).toBe('sarah chen');
    expect(normaliseName('Prof. Alan Grant')).toBe('alan grant');
    expect(normaliseName('Ms Kate Thomson')).toBe('kate thomson');
    expect(normaliseName('A/Prof Ruth Bader')).toBe('ruth bader');
  });

  it('normalises punctuation, case and whitespace', () => {
    expect(normaliseName('  CHEN,   Sarah  ')).toBe('chen sarah');
    expect(normaliseName("O'Brien, Niamh")).toBe('o brien niamh');
  });

  it('returns empty for something that is not a name', () => {
    expect(normaliseName('   ')).toBe('');
    expect(normaliseName('...')).toBe('');
  });
});

describe('isGroundedInSource — rejecting inventions', () => {
  const page = corpus(`
    Example Medical Centre. We are a family practice in the northern suburbs.
    Our team includes Sarah Chen and Michael Okonkwo, supported by our reception staff.
  `);

  it('accepts a person written on the page', () => {
    expect(isGroundedInSource('Sarah Chen', page)).toBe(true);
    expect(isGroundedInSource('Michael Okonkwo', page)).toBe(true);
  });

  it('accepts an honorific the page did not use', () => {
    // The model elaborating "Sarah Chen" into "Dr Sarah Chen" is reasonable, not an invention.
    expect(isGroundedInSource('Dr Sarah Chen', page)).toBe(true);
  });

  it('accepts a reversed or comma-separated rendering', () => {
    expect(isGroundedInSource('Chen, Sarah', page)).toBe(true);
  });

  it('REJECTS the two names actually fabricated in the live run', () => {
    // The regression test for the defect. Neither token appears in this page, or in the one that
    // produced them, which had ten characters of text and no people at all.
    const shell = corpus('HBF Dental');
    expect(isGroundedInSource('Dr Ashlee Kent', shell)).toBe(false);
    expect(isGroundedInSource('Ms Kate Thomson', shell)).toBe(false);
  });

  it('REJECTS a plausible invention against a page full of other content', () => {
    // The harder case: the page is real and readable, and the model added someone who is not on it.
    expect(isGroundedInSource('Dr Emily Watson', page)).toBe(false);
    expect(isGroundedInSource('Practice Manager Jane Doe', page)).toBe(false);
  });

  it('rejects an empty or punctuation-only name', () => {
    expect(isGroundedInSource('', page)).toBe(false);
    expect(isGroundedInSource('   ', page)).toBe(false);
    expect(isGroundedInSource('.', page)).toBe(false);
  });

  it('rejects a single-letter surname rather than matching almost anything', () => {
    // "Dr X" would otherwise match any page containing the letter x.
    expect(isGroundedInSource('Dr X', page)).toBe(false);
  });

  it('matches on the surname, which is the token a page always carries', () => {
    // A page listing "Dr Okonkwo" without a first name still grounds the fuller form.
    expect(isGroundedInSource('Michael Okonkwo', corpus('Our principal is Dr Okonkwo.'))).toBe(true);
  });
});
