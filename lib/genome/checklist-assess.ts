// Matching what he actually said to the questions a buyer asks — gate 1 and gate 2, in one pass.
//
// `GENOME_BUCKET_CHECKLIST.md` §4 names this as the real build: *"Matching a captured fact to a
// checklist item is the actual build… not writing this list."* That is right, and the shape matters
// more than the model.
//
// WHY ONE CALL PER AREA RATHER THAN PER ENTRY. `classifyPendingMemories` files each entry into an
// area, one row at a time, because that is a property OF THE ROW. Substance is not: whether "who
// could step into your job" is answered depends on everything he has ever said about people, and no
// single entry can settle it. Two entries that each say half of an answer together satisfy an item
// neither satisfies alone, and a per-entry pass structurally cannot see that.
//
// ⚠️ THE VERDICT IS THREE-VALUED AND THE THIRD VALUE IS THE PRODUCT. "Open" and "weak" are not
// grades of the same thing — they need different responses. Open means Kira asks the question. Weak
// means she pushes back on an answer he has already given, which is a much harder thing to do well
// and the reason `why` is returned rather than a score: the reason IS the coaching.
//
// ⚠️ DEGRADE, DON'T FAKE (DATA_STANDARD R4). With no model configured, every item comes back OPEN
// and nothing is claimed. That reads on screen as "we have not assessed this yet", which is true,
// rather than as an empty Genome, which would not be. It must never guess an item answered —
// unsure ⇒ open, and Kira has something to ask, which is the good outcome and not the failure.

import { z } from 'zod';

import type { AreaKey } from './areas';
import { itemsForArea, type ChecklistItem } from './checklist';
import type { AssessedItem, ItemStatus } from './checklist-bands';
import { createOpenAIRunner } from '@/lib/kira/structured-runner';

/** The minimum an entry must expose to be assessable. Structurally a subset of `OwnerEntry`. */
export interface AssessableEntry {
  id: string;
  headline: string | null;
  content: string;
}

const VerdictSchema = z.object({
  verdicts: z.array(
    z.object({
      item_key: z.string(),
      status: z.enum(['open', 'weak', 'answered']),
      /** Required when weak; the model is told so, and a missing one degrades to the static coaching. */
      why: z.string().nullable().optional(),
      evidence: z.array(z.string()).nullable().optional(),
    }),
  ),
});

const SYSTEM = `You are assessing whether a business owner's own record answers the questions a
buyer's advisor always asks. You are NOT summarising and you are NOT being encouraging.

For each checklist item, return exactly one of:

  "answered" — the record contains a genuinely substantive answer. EVERY test listed for that item
               must hold. If a test cannot be checked from the record, the item is not answered.
  "weak"     — the record touches the question but fails at least one test. Say which, in one
               sentence, addressed to the owner, quoting his own words where you can.
  "open"     — nothing in the record speaks to it.

Rules that matter more than completeness:

- NEVER mark an item answered because something in the area vaguely touched it. If you are unsure,
  return "open". An unanswered question is useful; a wrongly-answered one is a lie in a document
  that will be shown to a buyer.
- A plan or an intention is not an answer. "I'm going to get Mark trained up" does not answer "who
  could step into your job" — that item asks what is true today.
- "We're all important", "it depends", "the usual", "it's all up to date" and similar are WEAK, not
  answered. They are the exact failure this assessment exists to catch.
- An honest negative IS an answer. "Nobody could step into my job" fully answers that item. Do not
  mark a bad-but-true state as open or weak — it is the most valuable thing in the record.
- Cite the entry ids you relied on in "evidence".`;

function promptFor(area: AreaKey, items: ChecklistItem[], entries: AssessableEntry[]): string {
  const itemBlock = items
    .map((i) => {
      const tests = i.substance
        ? `\n    tests (ALL must hold): ${i.substance.tests.join(' · ')}` +
          `\n    a weak answer sounds like: "${i.substance.weakExample}"` +
          `\n    a substantive one sounds like: "${i.substance.strongExample}"`
        : '\n    (supporting item — presence of a relevant fact is enough)';
      return `- ${i.key}: ${i.buyerItem}${tests}`;
    })
    .join('\n');

  const entryBlock = entries.length
    ? entries.map((e) => `[${e.id}] ${e.headline ? `${e.headline} — ` : ''}${e.content}`).join('\n')
    : '(nothing on the record for this area)';

  return `AREA: ${area}\n\nCHECKLIST ITEMS:\n${itemBlock}\n\nTHE OWNER'S RECORD:\n${entryBlock}\n\nReturn a verdict for EVERY item key listed above.`;
}

/**
 * Assess one area. Returns a verdict for every item in it — including the ones the model omitted,
 * which come back `open` rather than being dropped.
 *
 * Never throws. A model failure is a degraded assessment, not a broken page: the Genome is the
 * product and it must render whatever else is wrong.
 */
export async function assessAreaEntries(
  area: AreaKey,
  entries: AssessableEntry[],
  opts: { apiKey?: string; model?: string } = {},
): Promise<AssessedItem[]> {
  const items = itemsForArea(area);
  const allOpen = (): AssessedItem[] =>
    items.map((i) => ({ itemKey: i.key, status: 'open' as ItemStatus, why: null, evidence: [] }));

  const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY ?? '';
  // No key, or nothing to assess: everything open. Not an error and not a guess.
  if (!apiKey || entries.length === 0) return allOpen();

  let verdicts: z.infer<typeof VerdictSchema>['verdicts'];
  try {
    const runner = createOpenAIRunner(apiKey);
    const { result } = await runner.run({
      // `provider` is required by ModelRef and IGNORED by createOpenAIRunner, which always talks to
      // OPENAI_BASE_URL. Matching the existing convention (DISCOVERY_EXTRACTION_MODEL says the same
      // thing) rather than inventing a second one — the field is inaccurate for every caller, which
      // makes it the shared type's problem to fix, not this one's to diverge over.
      model: { provider: 'openrouter', model: opts.model ?? 'gpt-4.1-mini' },
      system: SYSTEM,
      input: promptFor(area, items, entries),
      schema: VerdictSchema,
    });
    verdicts = result.verdicts;
  } catch (error) {
    console.error(`[checklist-assess] ${area} failed:`, error);
    return allOpen();
  }

  const byKey = new Map(verdicts.map((v) => [v.item_key, v]));
  const entryIds = new Set(entries.map((e) => e.id));

  return items.map((item) => {
    const v = byKey.get(item.key);
    if (!v) return { itemKey: item.key, status: 'open' as ItemStatus, why: null, evidence: [] };

    // A weak verdict with no reason falls back to the item's static coaching rather than showing
    // him a bare "needs work". The static line is always at least true of the QUESTION, even when
    // it cannot quote him — and a criticism with no reason attached is the one thing more annoying
    // than no criticism.
    const why =
      v.status === 'weak' ? (v.why?.trim() || item.substance?.coaching || null) : null;

    return {
      itemKey: item.key,
      status: v.status,
      why,
      // Filtered against the entries we actually passed in. A model citing an id that was never in
      // the prompt has invented it, and an invented citation on a page whose purpose is to be
      // defensible to a buyer is worse than no citation.
      evidence: (v.evidence ?? []).filter((id) => entryIds.has(id)),
    };
  });
}
