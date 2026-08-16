// Gate 4 — the gaps that no amount of talking closes.
//
// Capture reveals the dependency; capture alone does not fix it. Writing down "only I can run this
// job" does not make it less true, so an owner who works through his buckets diligently ends up
// better informed and no better off. That is an audit. This is the execution half.
//
// ⚠️ THE ONE HARD RULE: MAKING THE PLAN MUST NOT MOVE THE NUMBER. ONLY EVIDENCING A MILESTONE DOES.
//
// If agreeing a pathway lifted the score, the product would reward INTENDING to change — which is
// more flattering than rewarding talking and takes longer to disprove, because a plan feels like
// progress for months. He would arrive in a data room with a good number and a business that still
// stops when he does, and the first person to tell him would be a buyer's advisor. The plan is a
// commitment; the milestone is the fact; only the fact counts.
//
// This file therefore has exactly one job beyond holding the shape: making that rule structural
// rather than remembered. `evidencedItemKeys` is the ONLY export the scorer may read, and it looks
// at `evidencedAt` and nothing else — not `agreedAt`, not the milestone existing, not the pathway
// being active.
//
// ⚠️ WHAT KIRA MUST NOT DO WITH THIS. A pathway for "nobody can step into your job" runs straight at
// pay, contracts, restraints, and possibly making his own role redundant. She can SEQUENCE a
// handover. She must not draft an employment contract, opine on entitlements, or advise on
// termination — a plausible-sounding wrong answer there has consequences for a real person and a
// real employee. Named here because the boundary belongs with the feature, not only in a prompt.

import { itemByKey, type ChecklistItem } from './checklist';
import { FACTOR_WEIGHTS } from '@/lib/valuation/evidenced-readiness';

export interface PathwayMilestone {
  /** Stable within the pathway. Order is `sequence`, not array position — rows come back unordered. */
  key: string;
  sequence: number;
  /** What he is actually doing, in his language. */
  description: string;
  /**
   * What would prove it happened.
   *
   * Written at planning time, deliberately, while nobody is invested in the answer. Deciding what
   * counts as done AFTER the work is how "well, he's basically doing it" becomes evidence.
   */
  evidenceKind: string;
  /** When he agreed to it. Records commitment. NEVER read by the scorer. */
  agreedAt: string | null;
  /** When it was actually observed. THE ONLY FIELD THAT MOVES THE NUMBER. */
  evidencedAt: string | null;
}

export interface Pathway {
  itemKey: string;
  /** What good looks like, in his words rather than the checklist's. */
  intent: string;
  milestones: PathwayMilestone[];
  startedAt: string;
  /** Set when he decides not to pursue it. An abandoned pathway is data, not a failure to hide. */
  abandonedAt: string | null;
  abandonedReason: string | null;
}

export type PathwayState = 'not-started' | 'agreed' | 'in-progress' | 'complete' | 'abandoned';

export function pathwayState(pathway: Pathway | null): PathwayState {
  if (!pathway) return 'not-started';
  if (pathway.abandonedAt) return 'abandoned';
  const evidenced = pathway.milestones.filter((m) => m.evidencedAt).length;
  if (evidenced === 0) return 'agreed';
  if (evidenced === pathway.milestones.length) return 'complete';
  return 'in-progress';
}

/**
 * The next thing to actually do — the earliest milestone with no evidence.
 *
 * By `sequence`, never by array order: these arrive from a database and an ORDER BY somebody forgets
 * is exactly how a man gets told to do step 4 before step 1.
 */
export function nextMilestone(pathway: Pathway): PathwayMilestone | null {
  return (
    [...pathway.milestones]
      .sort((a, b) => a.sequence - b.sequence)
      .find((m) => !m.evidencedAt) ?? null
  );
}

/**
 * THE SCORER'S ONLY DOOR. Item keys whose pathway is COMPLETE — every milestone evidenced.
 *
 * Partial progress deliberately counts for NOTHING here. Half a successor is not half a business
 * that runs without him: either someone can run a Tuesday or they cannot, and a buyer will not pay
 * for three of six steps. Partial progress is shown to him — it is genuinely encouraging and it is
 * why the panel exists — it just does not reach the valuation.
 */
export function evidencedItemKeys(pathways: Pathway[]): string[] {
  return pathways.filter((p) => pathwayState(p) === 'complete').map((p) => p.itemKey);
}

/**
 * What closing this gap is worth, as a share of the whole readiness score.
 *
 * ⚠️ NOT A DOLLAR FIGURE, AND THAT IS DELIBERATE. Turning it into money needs the owner's own
 * valuation — his SDE, his sector's spread — which lives in `model.ts` and belongs to the caller
 * that has his row. Returning a fraction keeps this file honest and stops a plausible-looking
 * dollar amount being computed from a share of a score, which is precisely the "precise-looking
 * number on a guess" the coverage band exists to avoid.
 *
 * Null where the item moves nothing — which is most of them, and correct: a pathway can be worth
 * doing for the handover document without moving the multiple.
 */
export function pathwayWorthShare(item: ChecklistItem, requiredItemsForFactor: number): number | null {
  if (!item.factor || requiredItemsForFactor === 0) return null;
  const totalWeight = Object.values(FACTOR_WEIGHTS).reduce((a, b) => a + b, 0);
  return FACTOR_WEIGHTS[item.factor] / totalWeight / requiredItemsForFactor;
}

/**
 * Whether a pathway may be offered for this item at all.
 *
 * Only `closes: 'change'` items. Offering one for something that closes with a sentence asks an
 * owner for months of real work to fix a thing he could have said in ten seconds, which is the
 * fastest way to make him stop trusting the panel.
 */
export function pathwayAvailableFor(itemKey: string): boolean {
  return itemByKey(itemKey)?.closes === 'change';
}
