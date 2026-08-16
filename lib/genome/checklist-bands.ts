// The band, computed from the checklist rather than from a tally of entries.
//
// WHAT IT REPLACES. `deriveOwnerGenome` bands an area by counting: 0 empty, 1–2 thin, 3–5 building,
// 6+ covered. So "well covered" means six facts of any kind, and six trivial notes score identically
// to the three that would survive diligence. This computes the same four bands against a
// DEFENSIBLE denominator — the questions a buyer always asks about that area.
//
// ⚠️ A `weak` ITEM COUNTS AS NOT ANSWERED, AND THAT IS THE WHOLE POINT OF GATE 2. An answer that
// fails its substance test must not be able to carry a bucket to green, or the rubric has reverted
// to counting with extra steps. It is not discarded either — it appears in the panel WITH its
// reason, which is the state the old model could not represent at all: "answered badly" was
// indistinguishable from "answered".
//
// ⚠️ BANDS STAY BANDS. The counts here define boundaries; they are never printed. There is no honest
// denominator to turn into a percentage — `OwnerSection.coverage` argues it and this does not
// disturb the argument, because the checklist bounds what a buyer ASKS, not what a business HAS.
// Commercially the same: "amber, and here are the two things missing" is a conversation, "58%" is an
// argument.

import type { AreaKey } from './areas';
import { itemsForArea, requiredItemsForArea, type ChecklistItem } from './checklist';

/** Matches `OwnerSection.coverage` exactly — this is a drop-in for the same field. */
export type Band = 'empty' | 'thin' | 'building' | 'covered';

/**
 * What the assessor concluded about one item.
 *
 *   open     — nothing on the record answers it
 *   weak     — something does, and it fails the substance test. `why` says how.
 *   answered — on the record and substantive
 */
export type ItemStatus = 'open' | 'weak' | 'answered';

export interface AssessedItem {
  itemKey: string;
  status: ItemStatus;
  /** Why it is weak, instantiated against what he actually said. Null unless status is 'weak'. */
  why: string | null;
  /** Entry ids supporting the verdict — so a green item can be DEFENDED, not merely asserted. */
  evidence: string[];
}

export interface AreaAssessment {
  area: AreaKey;
  band: Band;
  answered: ChecklistItem[];
  /** Answered badly. Each carries the reason, which is the next question Kira asks. */
  weak: (ChecklistItem & { why: string | null })[];
  open: ChecklistItem[];
  /** Items here that move the valuation — used to say "two of these five move your number". */
  movesNumber: ChecklistItem[];
}

/**
 * The band rule.
 *
 * `thin` deliberately triggers on ANY answered item rather than on a required one: an owner who has
 * answered three supporting questions and no required ones has plainly engaged with the area, and
 * showing him red for it is the kind of scoring that makes a person stop talking. It cannot reach
 * `building` without required items, so nothing is overclaimed.
 */
export function bandFor(area: AreaKey, statuses: Map<string, ItemStatus>): Band {
  const required = requiredItemsForArea(area);
  const all = itemsForArea(area);

  const answeredAll = all.filter((i) => statuses.get(i.key) === 'answered');
  if (answeredAll.length === 0) return 'empty';

  const answeredRequired = required.filter((i) => statuses.get(i.key) === 'answered');
  if (answeredRequired.length === required.length) return 'covered';
  if (answeredRequired.length > required.length / 2) return 'building';
  return 'thin';
}

export function assessArea(area: AreaKey, assessed: AssessedItem[]): AreaAssessment {
  const byKey = new Map(assessed.map((a) => [a.itemKey, a]));
  const statuses = new Map<string, ItemStatus>(
    // An item the assessor never returned is OPEN, never silently answered. Same rule as the
    // confirmations: unsure means Kira has something to ask, which is the good outcome.
    itemsForArea(area).map((i) => [i.key, byKey.get(i.key)?.status ?? 'open']),
  );

  const items = itemsForArea(area);
  return {
    area,
    band: bandFor(area, statuses),
    answered: items.filter((i) => statuses.get(i.key) === 'answered'),
    weak: items
      .filter((i) => statuses.get(i.key) === 'weak')
      .map((i) => ({ ...i, why: byKey.get(i.key)?.why ?? null })),
    open: items.filter((i) => statuses.get(i.key) === 'open'),
    movesNumber: items.filter((i) => i.factor !== null),
  };
}

/**
 * The sentence under the panel: how many of the outstanding items actually move the price.
 *
 * Returned as counts rather than a rendered string so the copy stays in the component with the rest
 * of the voice — and so a test can assert the ARITHMETIC without pinning the wording.
 */
export function outstandingSplit(assessment: AreaAssessment): {
  movesNumber: number;
  completesDocument: number;
} {
  const outstanding = [...assessment.open, ...assessment.weak];
  return {
    movesNumber: outstanding.filter((i) => i.factor !== null).length,
    completesDocument: outstanding.filter((i) => i.factor === null).length,
  };
}
