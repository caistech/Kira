// lib/genome/self-nominate.ts
//
// T2 — THE DOING-LAYER ESCAPE HATCH.
//
// When the doing layer genuinely cannot handle a task (status 'unsupported') AND the subject is
// NOT already covered by the census or the ledger, the task surfaces a structural gap: the
// business needs this practice but the doing layer has no handler and the census does not ask about
// it. At that moment the system self-admits the question into the ledger so the next cohort of
// businesses gets asked, by whoever reviews the admission gate.
//
// WHY ADMITTED, NOT WATCHLISTED. The escape hatch exists because the census should grow through
// lived observation, not only operator composition. The operator can retract for cause or retire
// for coverage. This is the D6 'system' seat.
//
// THE TWO TESTS, applied mechanically:
// 1. No coverage: the utterance must not substantially match any existing item in the static census
//    OR the admission ledger (live today). A task the census already asks about is not a gap.
// 2. Resolves to an area: without an area, the row cannot be scored or placed in the handover
//    document — a stranger area key is skipped, not trusted. If the subject maps to no census area
//    confidently, the task is a personal errand, not a business practice we can ask about.

import { createServiceClientV2 } from '@/lib/supabase/server';
import { isAreaKey, GENOME_AREAS, type AreaKey } from './areas';
import { CHECKLIST, fetchAdmittedChecklist, itemByKey, itemsForArea, type ChecklistItem } from './checklist';

// --- Tokeniser (cheap, deterministic, zero-dependency) ----------------------------------------

const STOP_WORDS = new Set([
  'a','an','the','to','for','of','and','or','but','in','on','at','by','if','so','as',
  'i','me','my','we','our','you','your','it','its','is','are','be','was','were','do',
  'does','did','can','has','have','had','not','no','yes','please','that','this','with',
  'from','what','when','who','how','which','about','into','over','up','out','off','than',
  'just','also','own','all','some','than','them','their','there','then','when','more',
  'set','send','draft','make','get','write','do','use','file','run','build','create',
  'us','need','want','like','sure','going','come','give','tell','know',
]);

export function tokenize(text: string): string[] {
  const raw = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/);
  return raw.filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

export function contentTokens(text: string): string[] {
  return [...new Set(tokenize(text).map(stem))];
}

// Crude suffix stem — only for matching, never stored. Keeps "certificates" ↔ "certificate" honest.
function stem(token: string): string {
  if (token.endsWith('ies') && token.length > 4) return token.slice(0, -3) + 'y';
  if (token.endsWith('ing') && token.length > 4) return token.slice(0, -3);
  if (token.endsWith('ed') && token.length > 3) return token.slice(0, -2);
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) return token.slice(0, -1);
  return token;
}

// --- Census vocabulary (built once per call from the static census + any admitted rows) ----------

export interface CensusVocab {
  /** Union of tokens from all static census items (buyer + owner prompts). */
  staticTokens: Set<string>;
  /** Per-area token lists (static items only), used for placement scoring. */
  areaTokens: Map<AreaKey, string[]>;
  /** All static items, flat, for per-item overlap checks. */
  flatItems: ChecklistItem[];
}

/**
 * Build the census vocabulary from the static checklist + admitted rows.
 *
 * `admitted` is passed as param rather than fetched inside, so the pure-core stays testable.
 * The caller (the dispatch handler) fetches it once via `fetchAdmittedChecklist(supabase)`.
 */
export function buildCensusVocab(admitted: readonly ChecklistItem[]): CensusVocab {
  const flatItems = [...CHECKLIST, ...admitted];
  const staticTokens = new Set<string>();
  const areaTokens = new Map<AreaKey, string[]>();

  for (const area of GENOME_AREAS) {
    const areaTexts: string[] = [];
    for (const i of flatItems.filter((item) => item.area === area.key)) {
      const tokens = [...contentTokens(i.buyerItem), ...contentTokens(i.ownerPrompt)];
      areaTexts.push(...tokens);
      for (const t of tokens) staticTokens.add(t);
    }
    areaTokens.set(area.key as AreaKey, areaTexts);
  }

  return { staticTokens, areaTokens, flatItems };
}

// --- Coverage test (does the census already ask about this?) ----------------------------------

/**
 * True when the utterance overlaps substantially with an EXISTING item in the census or ledger —
 * meaning the business practice is already a question, and the gap is at the answer, not at the ask.
 *
 * Two items genuinely different get caught only if they share a meaningful token core. A threshold
 * that catches "draft a follow-up email" for a census item about follow-up emails without also
 * catching unrelated emails.
 */
function overlapsExistingItem(uttTokens: string[], flatItems: ChecklistItem[]): boolean {
  const uttSet = new Set(uttTokens);
  if (uttTokens.length === 0) return false;

  for (const item of flatItems) {
    const itemTokens = new Set([
      ...contentTokens(item.buyerItem),
      ...contentTokens(item.ownerPrompt),
    ]);
    if (itemTokens.size === 0) continue;

    // Match any existing item whose meaningful content substantially overlaps the utterance.
    // "Substantially" here: the item shares ≥2 of the utterance's content tokens OR the Jaccard
    // overlap is ≥0.45 — whichever is met first (the first catches "follow up with X" when an
    // existing follow-up item exists; the second catches near-paraphrases).
    const intersection = [...uttSet].filter((t) => itemTokens.has(t)).length;
    if (intersection >= 2) return true;
    const union = new Set([...uttSet, ...itemTokens]).size;
    if (union > 0 && intersection / union >= 0.45) return true;
  }
  return false;
}

// --- Area placement (where in the census does this fit?) --------------------------------------

/**
 * Score the utterance against each area's vocabulary. Areas are the nine census dimensions.
 *
 * Returns null when the best area is ambiguous (no clear winner), which means the task is a
 * personal errand, not a business practice we can place. The dispatch handler must NOT guess
 * — a stranger area key on a row is skipped, not trusted.
 */
function resolveAreaKey(
  uttTokens: string[],
  areaTokens: Map<AreaKey, string[]>,
): AreaKey | null {
  if (uttTokens.length === 0 || areaTokens.size === 0) return null;

  const uttSet = new Set(uttTokens);
  const scores: [AreaKey, number][] = [];

  for (const [areaKey, tokens] of areaTokens) {
    // Count utterance tokens that appear in the area's vocabulary. Areas with more items and
    // broader vocab are naturally favoured — that is the right default, because the wider
    // vocabulary reflects more real questions about the area.
    const hits = tokens.filter((t) => uttSet.has(t)).length;
    // Normalise by vocabulary size, not utterance size — larger vocabularies should not get a
    // free ride just for being broad, and a narrow utterance should not be penalised for brevity.
    const score = tokens.length === 0 ? 0 : hits / Math.max(1, tokens.length);
    scores.push([areaKey, score]);
  }

  scores.sort((a, b) => b[1] - a[1]);
  const best = scores[0]!;
  const bestScore = best[1];
  const second = scores[1];

  // Require a clear winner: best score must be non-zero and strictly above second.
  // When there is only one area in the map, the single area is uniquely best by definition
  // provided its score is non-zero — there is nothing to tie against.
  if (bestScore === 0) return null;
  if (second && best[1] === second[1]) return null; // exact tie — ambiguous

  return best[0];
}

// --- Pure decision (testable without Supabase) ------------------------------------------------

export interface SelfNominateDecision {
  nominate: false;
  reason:
    | 'empty'
    | 'covered-by-census'
    | 'covered-by-ledger'
    | 'no-area'
    | 'tied-area'
    | 'dud-slug';
}
export interface SelfNominateResolve {
  nominate: true;
  itemKey: string;
  areaKey: AreaKey;
}

export type SelfNominateOutcome = SelfNominateDecision | SelfNominateResolve;

export function decideUnsupportedTask(
  utterance: string,
  vocab: CensusVocab,
): SelfNominateOutcome {
  const utt = utterance.trim();
  const uttTokens = contentTokens(utt);
  if (uttTokens.length === 0) return { nominate: false, reason: 'empty' };

  // The stable slug for the item key — if this already exists anywhere in the static census
  // (not just by text overlap, but as a literal item key), do not pollute the slate.
  const slug = slugFromUtterance(utt);
  if (!slug || slug.length < 3) return { nominate: false, reason: 'dud-slug' };
  if (itemByKey(slug)) return { nominate: false, reason: 'covered-by-census' };

  // Does the utterance map to an existing census item by text overlap?
  if (overlapsExistingItem(uttTokens, vocab.flatItems)) {
    return { nominate: false, reason: 'covered-by-census' };
  }

  // Resolve an area. No area = personal errand, not a cohort question.
  const area = resolveAreaKey(uttTokens, vocab.areaTokens);
  if (!area) return { nominate: false, reason: 'no-area' };

  return { nominate: true, itemKey: slug, areaKey: area };
}

// --- Item key slug (stable, human-readable, ≤100 chars, kebab-case) ---------------------------

const SLUG_RE = /[^a-z0-9]+/g;

export function slugFromUtterance(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(SLUG_RE, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug;
}

// --- Supabase write path (fail-soft, never breaks the voice path) ----------------------------

/**
 * The T2 self-nomination path. Called when the doing layer returns 'unsupported'.
 *
 * Fetches the admitted set to check coverage, decides, and upserts if the pure path clears.
 * Fail-soft by design: a ledger failure must never delay or break a live voice call.
 */
export async function maybeSelfNominateUnsupportedTask(
  utterance: string,
  ownerUserId: string,
): Promise<SelfNominateOutcome> {
  try {
    const supabase = createServiceClientV2();
    const admitted = await fetchAdmittedChecklist(supabase);
    const vocab = buildCensusVocab(admitted);
    const decision = decideUnsupportedTask(utterance, vocab);
    if (!decision.nominate) {
      console.log(
        `[admission] T2 skipped: "${utterance.slice(0, 60)}…" reason=${decision.reason}`,
      );
      return decision;
    }

    const { itemKey, areaKey } = decision;
    const trunc = utterance.length > 200 ? `${utterance.slice(0, 200)}…` : utterance;

    // D14 idempotent: the unique (area_key,item_key) constraint handles repeat deliveries.
    // ignoreDuplicates keeps a manually watchlisted/retracted row from being silently stomped
    // by a system re-delivery — the operator's decision (or the date of it) takes precedence.
    const { error } = await supabase.from('genome_admission_ledger').upsert(
      {
        area_key: areaKey,
        item_key: itemKey,
        buyer_item: utterance,
        owner_prompt: utterance,
        factor: null,
        status: 'admitted',
        admitted_by: 'system',
        admitted_at: new Date().toISOString(),
        reason: `System self-admission (T2): the doing layer had no handler for this task and no census question covers it. Operator can retract for cause if it is not a cohort question. Task text: "${trunc}"`,
      },
      { onConflict: 'area_key,item_key', ignoreDuplicates: true },
    );

    if (error) {
      console.error('[admission] T2 upsert failed:', error);
      return { nominate: false, reason: 'covered-by-census' } as SelfNominateDecision;
    }

    console.log(
      `[admission] T2 self-nominated "${itemKey}" → ${areaKey} (by system)`,
    );
    return decision;
  } catch (err) {
    console.error('[admission] T2 self-nomination crashed:', err);
    return { nominate: false, reason: 'empty' } as SelfNominateDecision;
  }
}