// Two sentences, one fact.
//
// THE DEFECT. The Genome's dedupe normalised the string — lowercase, strip punctuation, first 120
// characters — so it caught a fact saved twice verbatim and nothing else. What the product actually
// produces is PARAPHRASE: the distil runs per conversation, the owner mentions the same thing in
// March and again in June, and two differently-worded versions of one fact are stored. The QA export
// carried six entries that were really two facts. A handover document that repeats itself is how a
// buyer's advisor decides it was generated rather than written, which is the one conclusion this
// document cannot afford.
//
// WHY NOT A MODEL. B13 is the answer: an LLM verdict was measured over 305 rows for the adjacent
// privacy question and produced sixteen catches, none of them right. Deduplication is cheaper to get
// right deterministically and, unlike privacy, is verifiable by reading two sentences side by side.
//
// THE MEASURE is CONTAINMENT, not Jaccard — |A ∩ B| / min(|A|, |B|) over significant words. The two
// behave very differently on the case that matters. A restatement usually carries the same facts
// plus extra qualifying words ("has not told anyone" becoming "has not disclosed this intention to
// anyone yet"), which grows the union and depresses Jaccard exactly when the shorter sentence is
// wholly contained in the longer one. Containment asks the question that matches the intent: is the
// smaller of these two entirely inside the bigger one?
//
// ── WHAT THIS DELIBERATELY DOES NOT CATCH ─────────────────────────────────────────────────────
//
// Restatements that share a fact but almost no vocabulary. Measured on the real pair:
//
//   "prefers to keep control over when and how sensitive communications ... are sent, despite
//    indicating standing approval"                                         containment 0.58
//   "prefers to maintain strict control over communications and approvals, explicitly disagreeing
//    with sending sensitive emails without prior approval"
//
// Those are the same fact and this will not merge them. Lowering the threshold far enough to catch
// them merges genuinely distinct facts that share a vocabulary — and on a construction Genome, where
// half the entries contain "Lot 91", "approval" and "delivery", that is most of the document. The
// error that hides a real fact from the owner is worse than the one that leaves a near-duplicate on
// the page, so the threshold sits where precision is safe and the recall gap is written down here
// rather than pretended away.

/** Words that carry no evidence of sameness. Deliberately short: a long list starts merging facts. */
const STOPWORDS = new Set(
  ('a an and are as at be been being but by for from has have had he her his in into is it its of on or she that the their them there they this to was were will with would ' +
    'about after all also any because before both can could did do does each how may might more most must no nor not now only other our out over own same should so some such ' +
    'than then these those through under until up very what when where which while who why you your i me my we us')
    .split(' '),
);

/**
 * The words a sentence is actually claiming something with.
 *
 * Numbers are KEPT and are load-bearing — "35 years", "40% equity", "Lot 91" are often the only
 * thing distinguishing two otherwise similar sentences, and dropping them would merge two different
 * lots into one fact.
 */
export function significantWords(text: string): Set<string> {
  return new Set(
    String(text ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9%$ ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w)),
  );
}

/**
 * How much of the smaller sentence appears in the larger. 0 to 1.
 *
 * Containment rather than Jaccard — see the header. Returns 0 when either side has nothing
 * significant to say, so an empty or stopword-only entry never merges with anything.
 */
export function containment(a: string, b: string): number {
  const A = significantWords(a);
  const B = significantWords(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared += 1;
  return shared / Math.min(A.size, B.size);
}

/**
 * How alike two entries must be before one is treated as a restatement of the other.
 *
 * 0.8 — chosen against the real corpus rather than by feel, and measured on 2026-08-02:
 *
 *   real Factory2Key Genome, 16 visible entries : 0 pairs merge. Highest scoring pair 0.60, and it
 *                                                 is a close call worth knowing about — "managing
 *                                                 modular site deliveries including Lot 109, 91,
 *                                                 442" against "active projects include Lot 91,
 *                                                 442, 109 in Geraldton". Arguably one fact; it
 *                                                 stays, because that is the safe direction.
 *   QA account, 5 visible entries               : 3 pairs merge at 0.82 / 0.90 / 1.00, all of them
 *                                                 the "considering selling after 35 years"
 *                                                 restatements. 5 entries become 3.
 *
 * Raising it loses the restatements it exists for; lowering it starts merging Lot 91 with Lot 442,
 * which are different sites and different money. Re-measure before moving it — `containment()` is
 * exported so the check is two lines.
 */
export const NEAR_DUPLICATE = 0.8;

export function isNearDuplicate(a: string, b: string): boolean {
  return containment(a, b) >= NEAR_DUPLICATE;
}

/**
 * Drop restatements, keeping the first of each cluster.
 *
 * FIRST WINS, and the caller controls the order — `deriveOwnerGenome` passes newest-first, so the
 * most recent phrasing of a fact is the one shown. That is the existing behaviour of the exact-match
 * dedupe this replaces, and keeping it means the change removes duplicates without also quietly
 * reshuffling which version of every fact the owner sees.
 *
 * O(n²) against the survivors, not against everything: a Genome is hundreds of entries, not
 * millions, and comparing only against what has already been kept means a cluster of five
 * restatements costs five comparisons rather than twenty-five.
 */
export function dropRestatements<T>(items: T[], text: (item: T) => string): T[] {
  const kept: T[] = [];
  for (const item of items) {
    const content = text(item);
    if (!kept.some((k) => isNearDuplicate(content, text(k)))) kept.push(item);
  }
  return kept;
}

/**
 * Everything in `items` that restates `target`, including anything that restates those in turn.
 *
 * Transitive on purpose, and it is the redaction case that needs it: A and B are near-duplicates, B
 * and C are near-duplicates, A and C might not be. Parking only what matches A directly would leave
 * C behind, and C is a sentence saying the thing he just asked to take back. For the feature whose
 * whole purpose is that he controls what is kept, a partial removal is worse than none — he would
 * believe it was gone.
 */
export function restatementCluster<T>(target: string, items: T[], text: (item: T) => string): T[] {
  const cluster: T[] = [];
  const frontier = [target];
  const seen = new Set<T>();
  while (frontier.length) {
    const current = frontier.pop() as string;
    for (const item of items) {
      if (seen.has(item)) continue;
      if (isNearDuplicate(current, text(item))) {
        seen.add(item);
        cluster.push(item);
        frontier.push(text(item));
      }
    }
  }
  return cluster;
}
