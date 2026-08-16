// The four bullets Ray would not send his broker — verbatim from the document he saved.
//
// One paragraph he typed once became four overlapping entries, and "handshake" appeared five times
// across two sections. "I'd be embarrassed to send that. It doesn't read as thorough, it reads as
// though nobody proofed it — and the man reading it is already looking for reasons to discount me."
//
// This was the ONE condition on him signing.

import { describe, expect, it } from 'vitest';

import { swallowedIds, type SweepableMemory } from './dedupe-sweep';

/** Exactly what the handover document carried under "Who does the work". */
const RAYS_FOUR: SweepableMemory[] = [
  {
    id: '1',
    confirmed: false,
    content:
      'Neither Wayne nor Karen have written contracts; their employment is based on handshake agreements.',
  },
  {
    id: '2',
    confirmed: false,
    content:
      'Karen manages all invoicing and BAS, and works without a written contract on a handshake agreement.',
  },
  {
    id: '3',
    confirmed: false,
    content:
      'Wayne has led shutdown crews for 19 years, is the only other person authorised to sign off mine site permits, and is expected to leave when the owner leaves.',
  },
  {
    id: '4',
    confirmed: false,
    content:
      "Wayne is the leading hand with 19 years at the company, running every shutdown crew and the only other person allowed by the mine to sign off on permits. Karen handles all invoicing and BAS tasks. Neither have written contracts; they're employed on a handshake. Wayne is 61 and is expected to leave when the owner does.",
  },
];

describe("Ray's four bullets — the measured limit", () => {
  it('⚠️ CANNOT be caught here, and the number is recorded rather than the threshold moved', () => {
    // MEASURED, not assumed. Containment between bullet 4 and the three it swallows is 0.67, 0.50
    // and 0.71 — all below NEAR_DUPLICATE (0.8) — because bullet 4 PARAPHRASES rather than quotes:
    // "leading hand with 19 years at the company" against "has led shutdown crews for 19 years"
    // shares few significant words.
    //
    // Lowering the threshold to reach them was rejected. 0.8 was calibrated against the real Genome
    // at ZERO false merges, and 0.55 is explicitly the surface-do-not-act band. Over-merging deletes
    // something true from a man's manual, which is worse than a repetition he can see.
    //
    // The fix for THIS class is upstream, in lib/kira/memory-extract.ts: the distiller is now told
    // never to return a summary paragraph alongside the facts inside it. A paragraph that
    // paraphrases its own sentences is not lexically similar enough for any duplicate check to
    // catch safely, so it must not be written in the first place.
    //
    // This pins the LIMIT so nobody later "fixes" the sweep by moving a number that was set for a
    // reason — and so the next person reading Ray's report knows why this file did not solve it.
    expect(swallowedIds(RAYS_FOUR)).toEqual([]);
  });
});

describe('what the sweep DOES catch', () => {
  it('drops a paragraph that genuinely restates a shorter fact', () => {
    // The case it is for: a long entry whose significant words are mostly the short one's. This is
    // what the post-call distil produces when it re-files something already saved mid-call.
    const pair: SweepableMemory[] = [
      { id: 'short', confirmed: false, content: 'Materials are charged at cost plus 20%.' },
      {
        id: 'long',
        confirmed: false,
        content: 'Materials are charged at cost plus 20% on every job, without exception.',
      },
    ];
    expect(swallowedIds(pair)).toEqual(['long']);
  });

  it('keeps the specific one, because it files into its own area', () => {
    // Keeping the fullest phrasing sounds right and is wrong: the long one is the paragraph, the
    // short ones are the facts, and each short one belongs in a different part of the business.
    const pair: SweepableMemory[] = [
      { id: 'short', confirmed: false, content: 'Materials are charged at cost plus 20%.' },
      {
        id: 'long',
        confirmed: false,
        content: 'Materials are charged at cost plus 20% on every job, without exception.',
      },
    ];
    expect(swallowedIds(pair)).not.toContain('short');
  });
});

describe('what it must never drop', () => {
  it('⚠️ never drops a CONFIRMED fact', () => {
    // He was read it back and agreed with it — the strongest label the document has. Removing one
    // silently would be the product editing a record he has personally signed off.
    const pair: SweepableMemory[] = [
      { id: 'short', confirmed: false, content: 'Materials are charged at cost plus 20%.' },
      {
        id: 'long',
        confirmed: true,
        content: 'Materials are charged at cost plus 20% on every job, without exception.',
      },
    ];
    expect(swallowedIds(pair)).toEqual([]);
  });

  it('never drops two equal-length restatements into nothing', () => {
    // Equal lengths must not delete each other. The strict `<` comparison is what prevents it.
    const twins: SweepableMemory[] = [
      { id: 'a', confirmed: false, content: 'Materials are charged at cost plus 20 percent.' },
      { id: 'b', confirmed: false, content: 'Materials are charged at cost plus 20 percent!' },
    ];
    expect(swallowedIds(twins)).toEqual([]);
  });

  it('leaves genuinely different facts alone', () => {
    const distinct: SweepableMemory[] = [
      { id: 'a', confirmed: false, content: 'Materials are charged at cost plus 20%.' },
      { id: 'b', confirmed: false, content: 'Quotes are adjusted depending on the client and current workload.' },
      { id: 'c', confirmed: false, content: 'The yard is held in the super fund and the business pays it rent.' },
    ];
    expect(swallowedIds(distinct)).toEqual([]);
  });

  it('⚠️ keeps facts about different sites apart', () => {
    // identifiersConflict inside isNearDuplicate is what stops Lot 91 and Lot 442 collapsing —
    // different sites, different money.
    const lots: SweepableMemory[] = [
      { id: 'a', confirmed: false, content: 'The Lot 442 excavation envelope was signed off on 14 August.' },
      { id: 'b', confirmed: false, content: 'The Lot 91 excavation envelope was signed off on 14 August by the surveyor.' },
    ];
    expect(swallowedIds(lots)).toEqual([]);
  });

  it('handles an empty set without complaint', () => {
    expect(swallowedIds([])).toEqual([]);
  });
});

// ⚠️ TELLING HER SOMETHING TWICE MUST NOT MAKE THE RECORD WORSE.
//
// A re-told fact arrives unfiled, because classification runs after the conversation. Section-blind,
// the sweep would park the copy already sitting in "How work is priced and quoted" and keep the raw
// new one — so the area emptied and the pile grew.
//
//   "Before I typed anything today the page said 5 things captured, across 3 of the 9 areas. After I
//    told her the same facts again, the same page says 10 things captured, across 1 of the 9 areas…
//    I have made my own Genome go backwards by talking to her." — Ray, 2026-08-17
describe('a filed fact outranks an unfiled twin', () => {
  const filedShort = { id: 'filed', content: 'Service work is charged at $118 an hour.', confirmed: false, filed: true };
  const unfiledLong = {
    id: 'unfiled',
    content: 'Service work is charged at $118 an hour plus materials at cost.',
    confirmed: false,
    filed: false,
  };

  it('drops the unfiled copy, not the filed one', () => {
    const dropped = swallowedIds([filedShort, unfiledLong]);
    expect(dropped).toEqual(['unfiled']);
  });

  it('⚠️ still drops a FILED paragraph that swallows FILED sentences', () => {
    // The original rule must survive: when both sides are filed, length decides as before, so a
    // paragraph does not sit in one area while its own sentences fill the others.
    const paragraph = { id: 'para', content: 'Gary prices jobs. Sharon does payroll.', confirmed: false, filed: true };
    const sentence = { id: 'one', content: 'Gary prices jobs.', confirmed: false, filed: true };
    expect(swallowedIds([paragraph, sentence])).toEqual(['para']);
  });

  it('treats a missing flag as unfiled, which is the safe reading', () => {
    const a = { id: 'a', content: 'Gary prices jobs and knows the mine loading.', confirmed: false };
    const b = { id: 'b', content: 'Gary prices jobs.', confirmed: false };
    expect(swallowedIds([a, b])).toEqual(['a']);
  });
});
