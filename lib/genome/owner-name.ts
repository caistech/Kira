// lib/genome/owner-name.ts — his name does not appear in his own handover document.
//
// ⚠️ THE PROMPT ALREADY SAYS THIS AND IT HAPPENED ANYWAY. memory-extract.ts carries the rule in
// plain terms — "Never use his name in either case" — with worked examples. The extractor still
// wrote:
//
//   "Pricing is done verbally in Ray's head based on drawings; nothing is written down."
//   "…and Ray has never taken more than two weeks off in a row."
//
// Ray read the first of those in the copy meant for a buyer: "Most of it says 'the owner' and 'him',
// properly at arm's length. Then one line reads Pricing is done verbally in RAY's head. My first
// name, in the copy meant for a buyer."
//
// A rule an LLM follows most of the time is not a guard. This is the mechanical version, applied
// where the text is read rather than where it is written, so it covers facts already in the table as
// well as every future one.
//
// ⚠️ WHOLE WORD, POSSESSIVE-AWARE, AND ONLY THE OWNER'S OWN NAME. Gary, Sharon and Dylan MUST
// survive — they are the substance of the people section, and a blanket name-scrub would gut the
// document to protect it. Short names are skipped entirely: a two-letter first name inside ordinary
// words would rewrite the text into nonsense, and no handover document is worth that.

/** Names too short to match safely inside prose. */
const MIN_NAME = 3;

/**
 * Replace the owner's first name with a role word.
 *
 * `"Ray's head"` → `"the owner's head"`, `"Ray has never"` → `"the owner has never"`. Case-insensitive
 * on the match, and it never touches a name that merely CONTAINS his (Raymond, Raybould) because the
 * boundary is a word boundary.
 */
export function withoutOwnerName(text: string, firstName: string | null | undefined): string {
  const name = String(firstName ?? '').trim();
  if (name.length < MIN_NAME) return text;
  // Escape anything regex-significant — a name is user data.
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // ⚠️ NOT `\b`, AND THIS FILE'S OWN TEST CAUGHT WHY. A word boundary treats a HYPHEN as a boundary,
  // so "the x-ray machine is leased" became "the x-the owner machine is leased" — the same class of
  // damage the MIN_NAME floor exists to prevent, arriving through punctuation rather than length.
  // The lookarounds exclude a hyphen on either side, so a hyphenated word containing his name is
  // left intact while "Ray has" and "Ray's head" still match.
  const edge = `(?<![\\w-])${escaped}`;
  return text
    .replace(new RegExp(`${edge}'s(?![\\w-])`, 'gi'), "the owner's")
    // Both apostrophes: the distil emits typographic ones, the tests type straight ones, and a rule
    // that handles only one of them is half a guard.
    .replace(new RegExp(`${edge}’s(?![\\w-])`, 'gi'), 'the owner’s')
    .replace(new RegExp(`${edge}(?![\\w-])`, 'gi'), 'the owner');
}
