import { describe, expect, it } from 'vitest';

import { keyRiskFollowUp } from './key-risk';

// The pair of things this has to get right, and they pull against each other: it must fire on the
// fact Ray actually typed, and it must NOT fire on ordinary business talk. A check that only proved
// the first would ship a tool that interrogates a man about nothing — the behaviour he is most
// wary of from something he has just confided in.

describe('keyRiskFollowUp — fires', () => {
  // ⚠️ RAY'S VERBATIM WORDS, NOT A PARAPHRASE OF THEM. The first version of these rules was built
  // from a summary of his report and tested against the same summary — twelve green tests over a
  // function that returned null for every real sentence he typed. These fixtures are copied out of
  // the transcript, and that is the only reason they are worth anything.
  it("fires on Ray's key person, exactly as he typed it", () => {
    const risk = keyRiskFollowUp(
      'Gary is the leading hand, 24 years with me, and the only other person who can price a job. He is 61.',
    );
    expect(risk?.id).toBe('sole-capability-ageing');
  });

  it('fires on a capability only one person holds, whatever that capability is', () => {
    // "the mine-site loading" is not a word any rule could have anticipated — which is the point.
    // Enumerating capabilities is what made the first version miss every real fact.
    expect(keyRiskFollowUp('Only Gary knows the mine-site loading.')?.id).toBe('sole-capability');
  });

  it('fires on an undocumented sole signatory', () => {
    const risk = keyRiskFollowUp(
      'Wayne is the only other person who can sign a permit on the mine site. He has no written contract.',
    );
    expect(risk).not.toBeNull();
  });

  it('fires on an undocumented key person', () => {
    const risk = keyRiskFollowUp('Karen has run the office for nineteen years on a handshake, there is nothing in writing.');
    expect(risk).not.toBeNull();
  });

  it('fires on customer concentration', () => {
    const risk = keyRiskFollowUp('The mine is about 60% of our turnover and always has been.');
    expect(risk?.id).toBe('customer-concentration');
  });

  it('fires when he says there is no successor', () => {
    const risk = keyRiskFollowUp('I want to retire in two years and there is nobody here who could take it on.');
    expect(risk?.id).toBe('no-successor');
  });

  it('asks ONE question, never two', () => {
    // A fact can trip two rules at once. Firing both turns a confidence into an interrogation.
    const risk = keyRiskFollowUp(
      'When I retire there is nobody who can sign the permits — only Wayne can, and he has no written contract.',
    );
    expect(risk).not.toBeNull();
    expect(Object.keys(risk!)).toEqual(['id', 'question']);
  });
});

describe('keyRiskFollowUp — stays quiet', () => {
  it.each([
    'We price day rates at $145 an hour plus travel outside the metro area.',
    'The July review sets the rates for the following twelve months.',
    'Karen handles the invoicing and the BAS each quarter.',
    // Ray's other three people, verbatim. A rule that fires on these is a rule that interrogates a
    // man about his apprentice, which is how she starts sounding like she is fishing.
    'Sharon does invoicing, payroll and the ATO three days a week and she is my sister-in-law.',
    'Dylan is a fourth-year apprentice and he is the one I would want to keep.',
    'We have a maintenance contract with the council that runs to June.',
    'The yard is at 14 Enterprise Drive and the lease has four years to run.',
    'Wayne',
  ])('does not fire on ordinary business talk: %s', (text) => {
    expect(keyRiskFollowUp(text)).toBeNull();
  });

  it('does not fire on a fragment too short to carry both signals', () => {
    // "no contract" alone is not a finding — it is half of one, and asking about the other half
    // when it was never said is how she starts sounding like she is fishing.
    expect(keyRiskFollowUp('no contract')).toBeNull();
  });
});

// ⚠️ A CUSTOMER IS NOT A KEY PERSON, AND SAYING SO WRONGLY IS WORSE THAN SAYING NOTHING.
//
// Ray's builder — 40% of turnover, eleven years, handshake, no contract — tripped the key-person
// rule before the customer rule, because "…has been working…no formal contract" satisfies both. She
// stopped, correctly, and gave the wrong diagnosis: "a buyer prices an undocumented key person as a
// risk they inherit."
//
//   "The builder is a CUSTOMER, not a key person. She has reached for a line about staff and used it
//    on a customer concentration. I noticed because it is my business; a broker would notice for the
//    same reason." — 2026-08-17
describe('the right question for the right risk', () => {
  it.each([
    [
      'A single builder accounts for about 40% of the business turnover, has been working with the business for 11 years on a handshake basis with no formal contract, and the owner has never taken more than two weeks off in a row.',
      'customer-concentration',
    ],
    [
      'One builder accounts for about 40% of turnover, with an 11-year relationship based entirely on a handshake and no contract.',
      'customer-concentration',
    ],
    // The key-person rule still owns a genuine key person on a handshake.
    ['Karen has run the office for nineteen years on a handshake, there is nothing in writing.', 'key-person-no-contract'],
    ['Gary is 61 years old, is the leading hand, is the only other person who can price jobs.', 'sole-capability-ageing'],
  ])('%s → %s', (fact, expected) => {
    expect(keyRiskFollowUp(fact)?.id).toBe(expected);
  });
});

// ⚠️ NO CONTROL CHARACTERS IN THESE PATTERNS.
//
// The `notWhen` guard above was first written through a scripted edit, which turned every `\b` into
// a literal BACKSPACE byte (0x08). The regex then hunted for control characters and matched nothing
// — while compiling, typechecking, and reading correctly in the editor. `grep -P '\x08'` reported
// the file clean; only `cat -A` showed the `^H`. It cost a full debugging pass, and this repo has
// now seen the identical failure twice.
//
// One assertion, on the bytes, so the third time is caught in CI instead of by eye.
describe('the rule file contains no mangled escapes', () => {
  it('has no backspace or form-feed characters', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('lib/kira/key-risk.ts', 'utf8');
    expect(src).not.toMatch(/[\u0008\u000c]/);
  });
});
