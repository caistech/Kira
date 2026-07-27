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

  it('returns null for the long tail, so the LLM backstop runs and the copy stays honest', () => {
    expect(synonymSector('alpaca stud farm')).toBeNull();
    expect(lookupSdeMultiple('alpaca stud farm').matched).toBe(false);
  });
});
