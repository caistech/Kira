import { describe, it, expect } from 'vitest';
import { synonymSector } from './industry-synonyms';
import { lookupSdeMultiple, AVERAGE_SDE_MULTIPLE } from './sde-multiples';

// The eleven words a real Australian owner types that ALL returned "no sector match" before this
// layer existed (naive-tester, 2026-07-28). They are the regression test, not an illustration.
const REAL_WORDS = [
  'plumber', 'electrician', 'cafe', 'hairdresser', 'accounting',
  'childcare', 'physio', 'civil', 'earthmoving', 'labour hire', 'aged care',
];

describe('industry synonyms', () => {
  it.each(REAL_WORDS)('resolves %s to a real sector multiple', (word) => {
    expect(synonymSector(word)).toBeTruthy();
    const { matched, sde } = lookupSdeMultiple(word);
    expect(matched).toBe(true);
    expect(sde).not.toBe(AVERAGE_SDE_MULTIPLE);
  });

  it('prefers the longer, more specific key', () => {
    // "auto electrician" is a mechanic, not a sparky — the substring must not win.
    expect(synonymSector('auto electrician')).toBe('Auto Repair & Service');
    expect(synonymSector('electrician')).toBe('Electrical & Mechanical Contracting');
  });

  it('matches on word boundaries, not fragments', () => {
    expect(synonymSector('plumbing services')).toBe('Plumbing');
    expect(synonymSector('plum jam')).toBeNull();
  });

  // A TRADE BEATS A BUSINESS MODEL.
  //
  // "electrical contracting" used to resolve to Residential Building & General Contracting, and it
  // was the ONLY option the picker offered — because ranking was by key length and `contracting`
  // (11) is longer than `electrical` (10). A 66-year-old electrician of 35 years typed the most
  // accurate description of himself available and was told he was a builder, on a page that states
  // the sector "sets the multiple, so if it is wrong the number is too". A builder's multiple is
  // not a sparky's, so this was a wrong NUMBER wearing a wrong label.
  describe('a trade word beats a business-model word', () => {
    it.each([
      ['electrical contracting', 'Electrical & Mechanical Contracting'],
      ['plumbing contracting', 'Plumbing'],
      ['electrical contracting services', 'Electrical & Mechanical Contracting'],
    ])('%s resolves to %s', (typed, expected) => {
      expect(synonymSector(typed)).toBe(expected);
    });

    it('still resolves a bare business-model word, because then it is all he gave us', () => {
      // Nothing else matched, so `contracting` is not competing with a trade — it is the answer.
      expect(synonymSector('contracting')).toBe('Residential Building & General Contracting');
    });

    it('the sector actually reached is the one whose multiple is used', () => {
      // The label and the arithmetic must not be able to disagree: assert through the multiple,
      // not only through the name.
      const sparky = lookupSdeMultiple('electrical contracting');
      const builder = lookupSdeMultiple('contracting');
      expect(sparky.matched).toBe(true);
      expect(builder.matched).toBe(true);
      expect(sparky.sde).not.toBe(builder.sde);
    });
  });

  it('returns null for the long tail, so the LLM backstop runs and the copy stays honest', () => {
    expect(synonymSector('alpaca stud farm')).toBeNull();
    expect(lookupSdeMultiple('alpaca stud farm').matched).toBe(false);
  });
});
