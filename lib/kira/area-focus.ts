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
