// The opener when he arrives from one of the nine areas.
//
// ⚠️ IT CARRIES THE TRIGGER, NOT THE CONTENT — and that is the VOICE_MEMORY_STANDARD rule, not a
// stylistic choice. The obvious implementation fetches the outstanding questions here and bakes them
// into the first message, which is wrong for a reason that only shows up later: this page renders
// once and the call lasts twenty minutes, so anything baked in is a snapshot that can be several
// answers stale by the time she says it. She has `area_agenda` and its description tells her to call
// it whenever a part of the business comes up. The opener's whole job is to make that moment happen.
//
// ⚠️ IT BEATS THE WELCOME-BACK, DELIBERATELY. `buildWelcomeBackFirstMessage` opens on what they last
// talked about, which is the right default and exactly wrong here: he has just pressed a button
// saying he wants to work on his people, and being met with "last time we went through the Herrings
// plumbing quote" puts him straight back in the groove this feature exists to break. Measured — she
// opened on that quote three days running, and the one memory written from the conversation where he
// tried to steer her to an area was a note about the Genome itself.

import { GENOME_AREAS } from '@/lib/genome/areas';

/**
 * The opener, or null when the area is not one of the nine.
 *
 * Null rather than a generic greeting: an unrecognised area means the link was wrong, and inventing
 * a warm opener over a broken link hides it. The caller falls back to the normal welcome-back.
 */
export function buildAreaFocusFirstMessage(area: string | null | undefined, firstName?: string | null): string | null {
  if (!area) return null;
  const def = GENOME_AREAS.find((a) => a.key === area);
  if (!def) return null;

  const name = (firstName || '').trim();
  const greeting = name ? `${name}, ` : '';

  // No question in the opener, on purpose. She is about to call area_agenda and ask a real one; a
  // question here would either be answered before she has looked, or ignored — and two questions in
  // the first ten seconds is the interview the whole design is avoiding.
  return (
    `${greeting}let's look at ${def.title.toLowerCase()}. ` +
    `This is the part a buyer's advisor asks about when they want to know: ${def.buyerQuestion} ` +
    `Give me a moment to see where we're up to on it.`
  );
}

/** The nine keys, for validating a `?area=` before it reaches anything else. */
export function isAreaKey(value: string | null | undefined): boolean {
  return !!value && GENOME_AREAS.some((a) => a.key === value);
}

/** Just enough of an `OwnerSection` to open on it — kept structural so this file stays testable. */
export interface GenomeCoverage {
  key: string;
  title: string;
  coverage: 'empty' | 'thin' | 'building' | 'covered';
}

/**
 * Spoken numbers. Nine areas, so this covers every real count.
 *
 * She SAYS this. "there are 3 parts" is fine to read and wrong to hear — most engines say it
 * correctly, some say "three parts" with a stumble before it, and none of that is worth risking on
 * the first sentence of a conversation.
 */
const SPOKEN = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/**
 * The opener for a man standing on the WHOLE Genome, rather than inside one area.
 *
 * WHY IT IS DIFFERENT FROM `buildAreaFocusFirstMessage`. That one fires when he has already chosen —
 * he pressed a funnel, so the area is settled and her job is to look it up and ask. Here he has
 * chosen nothing. He is looking at nine funnels, several of them empty, and the honest opening move
 * is to name what is missing and let him pick. Opening with "what would you like to work on?" puts
 * the work of reading nine funnels back on him, which is the work he is paying her to do.
 *
 * ⚠️ TRIGGER, NOT CONTENT — the same rule as its sibling, and the reason is the same. It names WHICH
 * areas are thin and stops. It does not carry the questions for them: the page renders once and the
 * call runs twenty minutes, so a baked-in list is a snapshot that can be several answers stale by
 * the time she reads it. `area_agenda` is hers to call once he picks, and its description already
 * tells her to. The opener's whole job is to make that moment happen.
 *
 * ⚠️ IT MUST BEAT THE WELCOME-BACK, for the reason `area_agenda` was written: with no agenda she
 * opens on whatever was raised last, and the last thing is always the live job. Measured on the
 * operator's own account — she opened on the same plumbing quote three days running while his
 * Customers, People and Assets areas held nothing a buyer asks about. On the page that exists to
 * show him those gaps, opening on the plumbing quote is the whole defect in one sentence.
 *
 * Returns null when there is nothing to point at — either no sections, or every area already at
 * `building`/`covered`. Null rather than a manufactured gap: the caller falls back to the normal
 * welcome-back, which is the right opener for a man whose Genome is in good shape.
 */
export function buildGenomeOverviewFirstMessage(
  sections: GenomeCoverage[] | null | undefined,
  firstName?: string | null,
): string | null {
  if (!sections?.length) return null;

  // Empty before thin: an area answering NOTHING is a worse gap than one answering a little, and
  // leading on the worst is what makes the sentence worth listening to.
  const gaps = [
    ...sections.filter((s) => s.coverage === 'empty'),
    ...sections.filter((s) => s.coverage === 'thin'),
  ];

  if (gaps.length === 0) return null;

  const name = (firstName || '').trim();
  const greeting = name ? `${name}, ` : '';
  const lead = gaps[0].title.toLowerCase();

  // ⚠️ THE COUNT AND ONE NAME — NEVER A LIST, and this was found by reading the sentence out loud
  // rather than by a test. An earlier version listed up to three titles, which produced:
  //
  //   "…: who does the work, what the business owns and who buys, and who owns the relationship."
  //
  // One of the nine areas is titled "Who buys, and who owns the relationship" — it CONTAINS a comma
  // — so spoken aloud the list is either three items or four and the listener cannot tell. No
  // separator fixes that in speech, and the nine funnels are on the screen beside her anyway: she
  // does not need to read them out. So she gives him the count, names the worst, and offers it.
  //
  // "a buyer's advisor would ask about" rather than "you haven't done": the gap is in what she has
  // been told, not in how he runs his business.
  const count = SPOKEN[gaps.length] ?? String(gaps.length);
  const opening =
    gaps.length === 1
      ? `there's one part a buyer's advisor would ask about that I know almost nothing about yet.`
      : `there are ${count} parts a buyer's advisor would ask about that I know almost nothing about yet.`;

  return (
    `${greeting}${opening} ` +
    `The biggest gap is ${lead}. Shall we start there? ` +
    `Give me a moment to see what's already in it.`
  );
}
