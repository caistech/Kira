// Dropping the paragraph that swallowed the sentences.
//
// WHY THIS EXISTS. `handleKiraSaveMemory` dedupes on the way in — but the POST-CALL DISTIL does not
// go through it. `completeConversationMemory` inserts straight into the table, and `convai.ts`
// already says so in as many words: "The guard on save_memory does NOT cover this path." So a distil
// that returns four overlapping memories writes all four.
//
// Ray, reading the document he would send his broker, 2026-08-16:
//
//   "Bullet 4 contains bullets 1, 2 and 3 in full. Karen's handshake appears in THREE of the four.
//    And then it appears a FOURTH time under 'Money in, money out and terms'. The word 'handshake'
//    is in that document five times, from one paragraph I wrote once… I'd be embarrassed to send
//    that. It doesn't read as thorough, it reads as though nobody proofed it — and the man reading
//    it is already looking for reasons to discount me."
//
// That document is the product. This is the one thing standing between him and signing.
//
// ⚠️ IT DROPS THE LONGER ONE, WHICH IS THE OPPOSITE OF THE OBVIOUS RULE. Keeping the fullest phrasing
// looks right and is wrong here: the long one is the whole paragraph he spoke, and the short ones are
// the individual facts pulled out of it, each of which files into its own area. Ray's own instruction:
// "if she's about to file a long paragraph AND three sentences pulled out of it, file the sentences
// and drop the paragraph." Keeping the paragraph would put one blob in one area and leave the other
// areas empty.

import { containment, identifiersConflict, isNearDuplicate } from './similar';

/**
 * A lower bar, allowed ONLY within one area.
 *
 * `NEAR_DUPLICATE` (0.8) is calibrated against the whole corpus and stays exactly where it is for
 * everything else. This adds one narrow path: same filed section, no conflicting identifier, and a
 * substantial overlap. See `SweepableMemory.section`.
 */
const SAME_AREA_RESTATEMENT = 0.65;

function sameAreaRestatement(a: SweepableMemory, b: SweepableMemory): boolean {
  if (!a.section || !b.section || a.section !== b.section) return false;
  // 'none' and 'unsorted' are holding pens rather than areas — two unrelated facts share them
  // constantly, so a shared value there is no evidence at all.
  if (a.section === 'none' || a.section === 'unsorted') return false;
  if (identifiersConflict(a.content, b.content)) return false;
  return containment(a.content, b.content) >= SAME_AREA_RESTATEMENT;
}

export interface SweepableMemory {
  id: string;
  content: string;
  /** A fact he has read back and agreed with is evidence. Never dropped, whatever it overlaps. */
  confirmed: boolean;
  /**
   * Has this one been sorted into an area of the business yet?
   *
   * ⚠️ A FILED FACT OUTRANKS AN UNFILED TWIN, ALWAYS. Without this the sweep is section-blind, and
   * a re-told fact could park the copy that was already in "How work is priced and quoted" and leave
   * the raw new one sitting in the pile — so telling her something a second time made the record
   * WORSE. Ray, 2026-08-17: "It went from three areas filled to one… I have made my own Genome go
   * backwards by talking to her."
   *
   * Optional so existing callers are unaffected; absent means unfiled, which is the safe reading.
   */
  filed?: boolean;
  /**
   * Which area it is filed under, when it is filed.
   *
   * ⚠️ SAME AREA IS EVIDENCE, and it is what lets a narrower threshold be safe. Two restatements of
   * one fact land in the SAME section by construction — the classifier reads the same content — so
   * a pair that shares a section, shares every identifier, and overlaps substantially is a
   * restatement even below the global containment bar.
   *
   * Ray's pair, both filed under people, containment 0.714 against a calibrated cut of 0.8:
   *   "Dylan is a fourth-year apprentice and the preferred employee to retain."
   *   "Dylan is a fourth-year apprentice considered valuable to retain."
   * Both reached his Genome AND his handover document, with the app asking him to delete one:
   * "you are asking a 66-year-old to sit and de-duplicate his own file. That is my filing cabinet
   * all over again. That is what I came here to stop doing."
   *
   * Lowering the GLOBAL threshold to catch this would merge across areas on 0.71 overlap, which is
   * how a dedupe becomes data loss. Scoping the lower bar to a shared section does not.
   */
  section?: string | null;
}

/**
 * Which memories are swallowed by another and should stop being asserted.
 *
 * Pure and exported so the rule is testable without a database — the caller does the deactivating.
 * Returns ids, never mutates.
 */
export function swallowedIds(memories: readonly SweepableMemory[]): string[] {
  // Longest first, so a paragraph is compared against the sentences it contains rather than the
  // other way round, and the decision is made once per pair.
  const ordered = [...memories].sort((a, b) => b.content.length - a.content.length);
  const dropped = new Set<string>();

  for (const candidate of ordered) {
    if (dropped.has(candidate.id)) continue;
    // ⚠️ A CONFIRMED FACT IS NEVER DROPPED. He was read it back and agreed with it, which is the
    // strongest label the document has; silently removing one would be the product editing a record
    // he has personally signed off.
    if (candidate.confirmed) continue;

    const swallowsSomething = memories.some(
      (other) =>
        other.id !== candidate.id &&
        !dropped.has(other.id) &&
        // Never drop a FILED row in favour of an unfiled one. The filed copy carries the work the
        // classifier already did; the unfiled twin is the same fact with that work thrown away.
        !(candidate.filed && !other.filed) &&
        // Strictly shorter, so two equal-length restatements never delete each other and leave
        // nothing behind — the failure mode that turns a dedupe into data loss.
        other.content.length < candidate.content.length &&
        (isNearDuplicate(candidate.content, other.content) ||
          sameAreaRestatement(candidate, other)),
    );

    if (swallowsSomething) dropped.add(candidate.id);
  }

  return [...dropped];
}
