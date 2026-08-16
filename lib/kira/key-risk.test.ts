import { describe, expect, it } from 'vitest';

import { keyRiskFollowUp } from './key-risk';

// The pair of things this has to get right, and they pull against each other: it must fire on the
// fact Ray actually typed, and it must NOT fire on ordinary business talk. A check that only proved
// the first would ship a tool that interrogates a man about nothing — the behaviour he is most
// wary of from something he has just confided in.

describe('keyRiskFollowUp — fires', () => {
  it("fires on Ray's own disclosure, the fact that produced this finding", () => {
    const risk = keyRiskFollowUp(
      'Wayne is 61 and is the only other person who can sign a permit on the mine site. He has no ' +
        'written contract and will walk out the day I do.',
    );
    expect(risk?.id).toBe('sole-authority-undocumented');
    expect(risk?.question).toContain('written into the contract');
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
