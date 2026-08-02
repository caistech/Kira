// Who decides an entry is the owner's own — and, since 2026-08-02, who deliberately does not.
//
// This file briefly asserted a UNION of the deterministic matcher and the classifier's stored
// verdict, on the reasoning that a model can only ever withhold MORE and so cannot cause disclosure.
// Half of that was true. The other half is what made it wrong: withholding more means removing
// business facts from the buyer's document, and margins and fundraising are among the things a buyer
// most wants to read.
//
// Measured over 305 rows — 105 from the real Genome, 200 from the red-team corpus:
//   model-only catches: 16 · true positives among them: 0 · matcher-only misses: 0
// Seven read "raising a $2 million fund" as exit-intent, against a prompt line saying in as many
// words that raising money is not an exit. Seven read "the margin is confidential" as a negotiating
// position — an access rule, not a floor price.
//
// So these tests now pin the OPPOSITE of what they originally pinned, and they exist to make a
// restoration deliberate: if someone re-reads `genome_private_reason`, this file goes red and points
// at the measurement rather than letting a quiet edit put it back.

import { describe, expect, it } from 'vitest';

import { ownerPrivateReason, PRIVATE_REASONS, type PrivateReason } from './private';

/** Exactly the expression in deriveOwnerGenome — matcher only. Stored verdict is ignored by design. */
function decided(content: string, _storedAndIgnored: string | null): PrivateReason | null {
  return ownerPrivateReason(content);
}

// A real sentence the matcher misses. It stayed in this file after the retirement on purpose: it is
// the honest cost of the decision, not an argument against it — the model did not catch this one
// either, and the 16 it did catch were all wrong.
const PARAPHRASE = 'He has quietly started conversations with a couple of trade buyers, and the team is unaware.';

describe('the matcher decides, alone', () => {
  it('withholds what it recognises', () => {
    expect(decided('is thinking about selling the business', null)).toBe('exit-intent');
    expect(decided('has not told his staff about the sale', null)).toBe('not-yet-told');
  });

  it('releases what describes the business', () => {
    expect(decided('Commercial jobs are priced at cost plus 18%.', null)).toBeNull();
  });

  it('still misses the paraphrase, and that is the accepted cost', () => {
    expect(decided(PARAPHRASE, null)).toBeNull();
  });
});

describe('the stored model verdict is not consulted', () => {
  it('does not withhold on the model alone', () => {
    // The exact shape of the 16 false positives: a business fact the model called private. Under
    // the old union this vanished from the buyer's document.
    expect(decided('Corvid Holdings is raising a $2 million fund.', 'exit-intent')).toBeNull();
    expect(decided("The Marlow job's margin is confidential.", 'negotiating-position')).toBeNull();
  });

  it('does not let the model override the matcher either way', () => {
    expect(decided('is thinking about selling the business', null)).toBe('exit-intent');
    expect(decided('is thinking about selling the business', 'how-he-feels')).toBe('exit-intent');
  });
});

describe('the vocabulary the renderer can label', () => {
  it('every reason has words the owner would recognise', async () => {
    const { PRIVATE_REASON_LABEL } = await import('./private');
    for (const reason of PRIVATE_REASONS) expect(PRIVATE_REASON_LABEL[reason]).toBeTruthy();
    expect(PRIVATE_REASONS.length).toBe(Object.keys(PRIVATE_REASON_LABEL).length);
  });
});
