import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { withoutOwnerName } from './owner-name';

// HIS NAME IN THE COPY MEANT FOR A BUYER.
//
// memory-extract.ts instructs the distil never to use it, with worked examples, and the distil wrote
// it anyway: "Pricing is done verbally in Ray's head based on drawings." Ray read that in the
// handover document — "My first name, in the copy meant for a buyer."
//
// A rule an LLM follows most of the time is not a guard. These are the exact strings from his
// account.

describe('withoutOwnerName', () => {
  it("removes the possessive, which is how it actually appeared", () => {
    expect(
      withoutOwnerName('Pricing is done verbally in Ray’s head based on drawings.', 'Ray'),
    ).toBe('Pricing is done verbally in the owner’s head based on drawings.');
    expect(withoutOwnerName("Ray's head", 'Ray')).toBe("the owner's head");
  });

  it('removes the bare name', () => {
    expect(withoutOwnerName('Ray has never taken more than two weeks off in a row.', 'Ray')).toBe(
      'the owner has never taken more than two weeks off in a row.',
    );
  });

  it('⚠️ LEAVES THE STAFF ALONE — they are the substance of the people section', () => {
    // A blanket name-scrub would gut the document to protect it. Only HIS name goes.
    const staff =
      'Gary is 61, the leading hand, and the only other person who can price jobs. Sharon handles payroll. Dylan is a fourth-year.';
    expect(withoutOwnerName(staff, 'Ray')).toBe(staff);
  });

  it('does not match a name that merely contains his', () => {
    expect(withoutOwnerName('Raymond runs the Bunbury depot.', 'Ray')).toBe('Raymond runs the Bunbury depot.');
    expect(withoutOwnerName('The x-ray machine is leased.', 'Ray')).toBe('The x-ray machine is leased.');
  });

  it('skips a name too short to match safely', () => {
    // A two-letter name inside ordinary words would rewrite the text into nonsense. No handover
    // document is worth that, so the guard stands down rather than doing damage.
    expect(withoutOwnerName('Bo is on the tools and the job is a bother.', 'Bo')).toBe(
      'Bo is on the tools and the job is a bother.',
    );
  });

  it('is safe with a name containing regex characters', () => {
    expect(() => withoutOwnerName('anything', 'A.(B')).not.toThrow();
  });

  it('does nothing when there is no name on the account', () => {
    expect(withoutOwnerName('Ray is the owner.', null)).toBe('Ray is the owner.');
  });
});

describe('it is applied where entries are read, not in each surface', () => {
  it('derive scrubs both entry lists', () => {
    // Both mappers — the filed entries and the unsorted pile. Ray's leak was in the unsorted one, so
    // covering only the obvious mapper would have fixed nothing he saw.
    const src = readFileSync('lib/genome/derive.ts', 'utf8');
    expect(src).toContain("import { withoutOwnerName } from './owner-name'");
    expect(src.match(/clean\(String\(r\.content/g)?.length).toBe(2);
  });
});
