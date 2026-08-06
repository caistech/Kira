// A name, or the front half of an email address?
//
// The signup trigger invents a first name — `split_part(NEW.email, '@', 1)` — when no metadata is
// supplied. One bad value, three surfaces, all found in the same walkthrough (Ray, 6 August 2026):
// the sign-off field that reaches his customer pre-filled with `dennis+ray`; the valuation page
// greeting "You are signed in, dennis+ray" directly above "What should we call you?"; and the Genome
// export attributing entries to "Recorded by dennis+qauser".
//
// The direction of the trade-off is the whole design and is worth stating: suppressing a REAL name
// is the worse error, because he watches the product forget who he is. So the rule only fires when
// the stored name matches the local part AND that local part carries a machine signature.

import { describe, expect, it } from 'vitest';

import { realFirstName, realSignOffName } from './user-name';

describe('realFirstName', () => {
  it.each([
    ['dennis+ray', 'dennis+ray@factory2key.com.au', 'a plus-tag'],
    ['ray.thompson', 'ray.thompson@bigpond.com', 'a dot-separated pair'],
    ['dennis_mcm', 'dennis_mcm@example.com', 'an underscore'],
    ['ray2', 'ray2@example.com', 'a digit'],
    ['dennis+qauser', 'dennis+qauser@factory2key.com.au', 'the QA identity that reached the export'],
  ])('rejects %s (%s) — %s', (name, email) => {
    expect(realFirstName({ first_name: name }, email)).toBeNull();
  });

  it.each([
    ['Dennis', 'dennis@factory2key.com.au', 'a real first name that happens to match the address'],
    ['Ray', 'ray@bigpond.com', 'the same, short'],
    ['Ray', 'ray.thompson@bigpond.com', 'a real name that is only PART of the local part'],
    ['Trinh', 'admin@bucketlyst.com.au', 'a name unrelated to the address'],
  ])('keeps %s (%s) — %s', (name, email) => {
    expect(realFirstName({ first_name: name }, email)).toBe(name);
  });

  it('is case-insensitive about the match, because the trigger lowercases and people do not', () => {
    expect(realFirstName({ first_name: 'Dennis+Ray' }, 'dennis+ray@factory2key.com.au')).toBeNull();
  });

  it('returns null for nothing at all, rather than an empty string a caller might print', () => {
    expect(realFirstName({ first_name: '' }, 'a@b.com')).toBeNull();
    expect(realFirstName(null, 'a@b.com')).toBeNull();
    expect(realFirstName({ first_name: '  ' }, 'a@b.com')).toBeNull();
  });

  it('falls back to `name` when there is no first_name', () => {
    expect(realFirstName({ name: 'Ray' }, 'ray@bigpond.com')).toBe('Ray');
  });

  it('keeps the name when there is no email to compare against', () => {
    // No evidence it came from an address, so no grounds to suppress it.
    expect(realFirstName({ first_name: 'dennis+ray' }, null)).toBe('dennis+ray');
  });
});

describe('realSignOffName', () => {
  it('joins first and last, which is what a customer sees at the bottom of a quote', () => {
    expect(realSignOffName({ first_name: 'Ray', last_name: 'Thompson' }, 'ray@bigpond.com')).toBe('Ray Thompson');
  });

  it('rejects the invented single-word name that would have been signed to a customer', () => {
    // The exact string Ray found in the box: pre-filled, plausible-looking, and not his name.
    expect(realSignOffName({ first_name: 'dennis+ray' }, 'dennis+ray@factory2key.com.au')).toBeNull();
  });

  it('keeps a real full name even when the first name matches the address', () => {
    // "Dennis" + "McMahon" against dennis@… is a person, not a machine string, and the joined form
    // no longer equals the local part anyway.
    expect(realSignOffName({ first_name: 'Dennis', last_name: 'McMahon' }, 'dennis@factory2key.com.au')).toBe(
      'Dennis McMahon',
    );
  });
});
