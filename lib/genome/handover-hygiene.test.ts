// WHAT A BUYER READS — the two ways the handover document embarrassed its owner.
//
// Ray walked the product on 2026-08-16, talked to Kira for twenty minutes about how he prices, then
// opened the document he would hand a broker. He found the same fact three times, the hourly rate
// twice, and this:
//
//   "The owner prefers not to have pricing and quoting guides emailed or sent externally and
//    INSISTS on retaining control of document distribution."
//
// His verdict: "It reads like it is working for itself. It has carefully recorded its own filing
// habits and my irritation with it, characterised me to a stranger as someone who insists on
// things… If I'd pressed Share without reading it — and Share is one click at the top of the page —
// that is what would have gone out under my name."
//
// Both defects are measurable and both are guarded here.

import { describe, expect, it } from 'vitest';

import { namesOurOwnProduct } from './derive';
import { isNearDuplicate } from './similar';

// The six pricing memories from Ray's account, verbatim. Six statements, ONE fact.
const RAYS_PRICING_MEMORIES = [
  'Ray prices jobs using a rate per hour that hasn’t changed in three years, plus materials at cost plus twenty percent.',
  'Jobs are priced using a stable hourly rate unchanged for three years, plus materials at cost plus 20%.',
  'The business prices jobs using an hourly rate that has not changed in three years.',
  'Jobs are priced using a fixed hourly rate unchanged for three years, plus materials charged at cost plus 20%.',
  'Jobs are priced using a stable hourly rate that has not changed in three years, plus materials charged at cost plus 20%.',
];

// Three statements, one fact about who may quote.
const RAYS_QUOTING_MEMORIES = [
  'All quotes are prepared solely by the owner; no one else in the business can prepare quotes.',
  'Currently, all quotes are prepared solely by the owner; no other staff member is authorized or able to produce quotes.',
  'Only the owner currently performs quoting; no one else in the business is authorized or trained to do so.',
];

describe('the same fact does not reach the document twice', () => {
  /** What the save path actually does: each new fact is checked against everything already stored. */
  function storedAfterSavingInOrder(memories: readonly string[]): string[] {
    const kept: string[] = [];
    for (const m of memories) {
      if (!kept.some((prior) => isNearDuplicate(prior, m))) kept.push(m);
    }
    return kept;
  }

  it('drops repeats from the real pricing cluster', () => {
    // ⚠️ MEASURED, NOT ASSUMED — and my first version of this test was wrong, not the code.
    // It compared every entry against the FIRST one only, whose best match is 0.78, just under the
    // threshold, so it reported zero and read like a broken dedupe. The real pairwise containments
    // on Ray's five pricing memories are 0.57 / 0.62 / 0.64 / 0.67 / 0.67 / 0.78 / 0.78 / 0.86 /
    // 0.92 / 0.92 — and saving them IN ORDER, each checked against everything kept so far, drops
    // two of five.
    //
    // ⚠️ NOT "drops four of five", and that is deliberate. NEAR_DUPLICATE is 0.8 because it was
    // calibrated to merge NOTHING on the real Genome (0 false merges, measured 2026-08-02). Buying
    // total recall here would spend that, and an over-merging dedupe silently deletes something true
    // from his manual — which is worse than a repetition he can see.
    expect(storedAfterSavingInOrder(RAYS_PRICING_MEMORIES).length).toBeLessThan(
      RAYS_PRICING_MEMORIES.length,
    );
  });

  it('⚠️ CANNOT catch the quoting cluster, and that is recorded rather than hidden', () => {
    // The three quoting memories score 0.33 / 0.50 / 0.50 — below even POSSIBLE_RESTATEMENT (0.55),
    // so they are not merged and are not even surfaced to him as "did you mean the same thing?".
    // "All quotes are prepared solely by the owner" and "Only the owner currently performs quoting"
    // share almost no significant words.
    //
    // Lowering the threshold to reach them would cross the band that exists precisely to NOT act, so
    // the fix for this cluster is upstream: the distiller must not emit three phrasings of one fact
    // from one conversation. That instruction is now in lib/kira/memory-extract.ts. This test pins
    // the LIMIT so nobody later "fixes" it by moving the threshold.
    expect(storedAfterSavingInOrder(RAYS_QUOTING_MEMORIES).length).toBe(RAYS_QUOTING_MEMORIES.length);
  });

  it('does not merge two genuinely different facts', () => {
    // The guard on the guard. `identifiersConflict` is what keeps Lot 91 and Lot 442 apart, and a
    // dedupe that over-merges silently deletes something true from his manual.
    expect(
      isNearDuplicate(
        'Materials are charged at cost plus 20%.',
        'Quotes are adjusted up or down depending on the client and current workload.',
      ),
    ).toBe(false);
    expect(
      isNearDuplicate(
        'The Lot 442 excavation envelope was signed off on 14 August.',
        'The Lot 91 excavation envelope was signed off on 14 August.',
      ),
    ).toBe(false);
  });
});

describe('notes about OUR software never reach a document about HIS business', () => {
  it('catches the ones that name the Genome', () => {
    for (const note of [
      'A clear concise pricing and quoting method description is saved into the Genome under how work is priced and quoted.',
      "A clear pricing and quoting guide stating the method above is saved in the Genome under 'how work is priced and quoted'.",
      'The owner prefers not to have the pricing and quoting guide emailed to anyone and wants it stored within the Genome system as a reference.',
    ]) {
      expect(namesOurOwnProduct(note), note).toBe(true);
    }
  });

  it('⚠️ leaves real business facts alone, including ones that mention software', () => {
    // THE GUARD ON THE GUARD, and the reason an earlier content matcher was rejected: "bank accounts
    // are not reconciled against Xero" is a real fact that must keep travelling and is lexically
    // near-identical to a note about a tool. This keys on OUR nouns only.
    for (const fact of [
      'Materials are charged at cost plus 20%.',
      'The business runs its accounts in Xero and its jobs in simPRO.',
      'Bank accounts are not reconciled against Xero.',
      'Only the owner currently performs quoting; no one else is trained to do so.',
      'Quotes are stored in Google Drive under the client name.',
    ]) {
      expect(namesOurOwnProduct(fact), fact).toBe(false);
    }
  });

  it('⚠️ KNOWN FALSE POSITIVE, recorded rather than designed away', () => {
    // An owner whose business genuinely involves genomes — a genetics lab, an agricultural breeder —
    // would have a real fact filed as ours. Pinned here rather than deleted from the test, because
    // deleting the awkward case is how a limitation becomes a surprise.
    //
    // KEPT ANYWAY, on the asymmetry: a false positive files a true fact as `none`, where he can
    // still SEE it in "everything else you have told me" and say so. A false negative puts a note
    // about our own filing habits into the document he hands a broker, which is what happened, and
    // which he cannot un-send. Visible-and-wrong beats invisible-and-wrong.
    expect(namesOurOwnProduct('The genome of the seed line is patented.')).toBe(true);
  });
});
