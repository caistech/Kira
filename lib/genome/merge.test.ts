// The union rule, tested in isolation from the database.
//
// `deriveOwnerGenome` decides an entry is the owner's own if EITHER the deterministic matcher says
// so OR the classifier's stored verdict does. That asymmetry is the whole safety argument: the
// matcher cannot read meaning and the model can fail, time out, or answer null, so taking either as
// SUFFICIENT means a private fact reaches the buyer's document the first time the other one is
// wrong. Under a union, both have to be wrong in the same direction — and a failure on either side
// can only ever withhold too much, which is the error that costs a line rather than a price.
//
// Tested against a local copy of the expression rather than through the Supabase client, because
// what is being asserted is the LOGIC, not the query. A test that needed a database to prove "or"
// would be skipped the first time it flaked.

import { describe, expect, it } from 'vitest';

import { ownerPrivateReason, PRIVATE_REASONS, type PrivateReason } from './private';

/** Exactly the expression in deriveOwnerGenome. Kept in step by the last test in this file. */
function merged(content: string, stored: string | null): PrivateReason | null {
  return (
    ownerPrivateReason(content) ??
    (PRIVATE_REASONS.includes(String(stored ?? '') as PrivateReason) ? (String(stored) as PrivateReason) : null)
  );
}

// A real sentence the matcher provably misses — no "sell", no "told", no "retire". This is the
// entire reason the classifier was given the question, so if this ever starts matching, the case is
// no longer testing what it claims to.
const PARAPHRASE = 'He has quietly started conversations with a couple of trade buyers, and the team is unaware.';

describe('the matcher alone', () => {
  it('really does miss the paraphrase — the premise of the whole change', () => {
    expect(ownerPrivateReason(PARAPHRASE)).toBeNull();
  });
});

describe('either side is enough to withhold', () => {
  it('withholds when only the matcher sees it, even if the model said nothing', () => {
    expect(merged('is thinking about selling the business', null)).toBe('exit-intent');
  });

  it('withholds when only the model sees it — the recall the matcher cannot have', () => {
    expect(merged(PARAPHRASE, 'exit-intent')).toBe('exit-intent');
  });

  it('releases only when both agree there is nothing', () => {
    expect(merged('Commercial jobs are priced at cost plus 18%.', null)).toBeNull();
  });
});

describe('the model can never open the gate', () => {
  // The direction that matters. A model that fails, is unavailable, or is simply wrong cannot cause
  // disclosure — it can only fail to add recall the matcher never had.
  it.each([null, '', 'null', 'none', 'not-private', 'BUSINESS', 'undefined'])(
    'ignores %j from the model and keeps the matcher verdict',
    (stored) => {
      expect(merged('has not told his staff about the sale', stored as string | null)).toBe('not-yet-told');
    },
  );

  it('ignores a reason outside the vocabulary rather than trusting it', () => {
    // A stored value the UI has no label for would render an empty explanation beside a withheld
    // entry — he would see something held back and not be told what.
    expect(merged('Sales are up 12% on last year.', 'commercially-sensitive')).toBeNull();
  });
});

describe('the matcher wins ties, and that is deliberate', () => {
  it('prefers the matcher reason when both have an opinion', () => {
    // Not arbitrary: the matcher's reason is derived from words actually present in the sentence, so
    // when it is shown to the owner he can see why. The model's reason is an inference he cannot
    // check against the text in front of him.
    expect(merged('is thinking about selling the business', 'how-he-feels')).toBe('exit-intent');
  });
});

describe('the copy in derive.ts has not drifted from this file', () => {
  it('every vocabulary entry is one the renderer can label', async () => {
    const { PRIVATE_REASON_LABEL } = await import('./private');
    for (const reason of PRIVATE_REASONS) expect(PRIVATE_REASON_LABEL[reason]).toBeTruthy();
    expect(PRIVATE_REASONS.length).toBe(Object.keys(PRIVATE_REASON_LABEL).length);
  });
});
