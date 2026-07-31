// Turning what Kira remembers into the owner's Genome.
//
// THE HONEST PROBLEM THIS SOLVES, stated plainly because it shapes everything below: `kira_memory`
// holds CONVERSATIONAL memory — context, goal, preference, decision — with free-form topic tags.
// That is the right shape for recall ("what did he tell me last time") and the wrong shape for a
// Genome, which is organised by the questions a buyer's advisor asks. Nothing in the product
// currently captures Genome-SHAPED knowledge directly.
//
// So this derives one from what we actually have, and is careful not to overstate it. An owner
// paying $999/month is entitled to see what we hold; he is not entitled to be told it is more
// organised than it is. Sections with nothing in them say so.
//
// Classification is cached on the row (kira_memory.genome_section) so opening your own Genome is
// instant and free, and a wrong call is fixable in a row rather than re-argued with a prompt.

import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';

export const GENOME_SECTIONS = [
  { key: 'work-in', title: 'How work comes in', question: 'Where does revenue come from, and does it depend on you?' },
  { key: 'pricing', title: 'How work is priced and quoted', question: 'Could someone else quote a job and reach your number?' },
  { key: 'delivery', title: 'How the work gets done', question: 'Does the business run when you are not on site?' },
  { key: 'suppliers', title: 'Suppliers and terms', question: 'What do your costs depend on, and are those terms portable?' },
  { key: 'obligations', title: 'Licences, insurance and the calendar', question: 'What must not lapse, and who is watching it?' },
  { key: 'only-you', title: 'Things only you know', question: 'What walks out the door with you?' },
] as const;

export type SectionKey = (typeof GENOME_SECTIONS)[number]['key'];

export interface OwnerEntry {
  id: string;
  /** The plain statement of fact, written when the row was classified. Null on older rows. */
  headline: string | null;
  content: string;
  capturedAt: string;
  importance: number | null;
  section: SectionKey | 'unsorted';
  /**
   * Where this came from — the conversation he said it in.
   *
   * This is the difference between a handover document and a list of assertions. "The pricing rule
   * is X" is a claim a buyer's accountant discounts; "the owner stated on 3 March that the pricing
   * rule is X" is evidence they can put in a file. Null where the source could not be resolved,
   * and shown as unsourced rather than quietly presented as if it were sourced.
   */
  source: { conversationId: string; spokenOn: string } | null;
}

export interface OwnerSection {
  key: SectionKey;
  title: string;
  question: string;
  entries: OwnerEntry[];
  /**
   * How well this section is covered — a BAND, not a percentage.
   *
   * A percentage needs a denominator, and there is no honest one: nobody knows how many facts a
   * business's pricing section "should" contain. Inventing 6 and dividing by it would put a
   * precise-looking number on a guess, in a document meant to be shown to a buyer. Bands say what we
   * can actually support.
   */
  coverage: 'empty' | 'thin' | 'building' | 'covered';
}

export interface OwnerGenome {
  sections: OwnerSection[];
  unsorted: OwnerEntry[];
  totalCaptured: number;
  documents: number;
  /** 0–1 from the valuation, or null when they have not run one. */
  readiness: number | null;
  gap: number | null;
  worthToday: number | null;
  /** True when nothing has been captured — the empty state must be honest, not decorative. */
  empty: boolean;
  /** How many entries can be traced to a conversation. Stated plainly; a buyer will ask. */
  sourced: number;
  /**
   * The sections with nothing in them yet — the "still only in your head" list.
   *
   * The single most valuable thing on the page, and the reason the public example is persuasive: it
   * names what has NOT been captured. A manual that only shows what it holds lets an owner believe
   * he is finished; naming the gaps is what turns the Genome from a record into a to-do list, and it
   * is the honest answer to "what still walks out the door with you?".
   */
  stillInYourHead: { key: SectionKey; title: string; question: string }[];
}

const SECTION_KEYS = GENOME_SECTIONS.map((s) => s.key) as string[];

const CLASSIFY_SYSTEM = `
You are filing one note into a small business's OPERATING MANUAL — the document its owner would hand
to a buyer. Reply with ONLY a JSON object: {"section": "<key>", "headline": "<short lead>"}

SECTIONS
work-in      how work/revenue arrives: clients, referrals, contracts, marketing, who brings the work
pricing      how anything is priced, quoted, discounted, or what it costs the customer
delivery     how the work actually gets done: crews, scheduling, process, who does what, quality
suppliers    suppliers, purchasing, materials, subcontractors, trade terms
obligations  licences, insurance, compliance, registrations, renewals, deadlines
only-you     judgement, history, relationships or rules that live only in the owner's head
none         everything else — and "none" is the right answer far more often than it looks

FILE AS "none":
- Anything about the ASSISTANT, the app or the software — what it can or cannot do, what access it
  needs, what the owner wants built, how he prefers to talk to it, upload problems, feature requests.
  This is the most common mistake: a note mentioning "email access", "tracking tasks" or "uploading
  documents" is about the SOFTWARE, not about the business. A buyer does not care what tools he used.
- Anything about a DIFFERENT company or product than the one this manual is for.
- Personal life, chit-chat, and one-off errands with no bearing on operations (a van being repaired,
  travel plans).

DO **NOT** FILE AS "none" JUST BECAUSE IT IS CURRENT OR UNFINISHED. Real operating knowledge is
usually in motion: a live approval problem on a site, who is being chased about it, which projects
are running, how the business is financed, who the counterparties are. A buyer's advisor wants
exactly these. Named projects, sites, clients, suppliers, consultants, deadlines and financing
structure all belong in the manual even when the situation is ongoing.

THE TEST: would a buyer's advisor, reading this in a handover document, learn something real about
this business — how it operates, who it depends on, what it is currently carrying? If yes, file it.
Only if the note is really about the software, another company, or his personal life is it "none".

HEADLINE: 3–8 words, plain English, stating the FACT — "Three builders supply 60% of turnover",
"Commercial jobs priced at cost plus 18%". Not a topic label. Not a sentence about a person. Use
Australian spelling. Empty string if the section is "none".

A note filed into the wrong section is worse than one left out: the owner reads it there and
concludes we did not understand his business.
`.trim();

/**
 * File any unclassified memories for one owner.
 *
 * CALLED AT WRITE TIME (after the post-call distil) and swept hourly for stragglers — NOT on a page
 * visit, which is where it used to live. Classifying 25 per visit meant a new owner's Genome filled
 * in over several sessions: he opens his own manual, sees a fraction of what he said, comes back and
 * finds more. The product reads as forgetting things, which is the exact fear it exists to answer.
 *
 * Bounded per call so a long history cannot stall the caller; the sweep finishes what a burst leaves.
 */
export async function classifyPendingMemories(userId: string, limit = 50): Promise<{ classified: number; deferred: number }> {
  const supabase = createServiceClient();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { classified: 0, deferred: 0 };

  const { data: pending } = await supabase
    .from('kira_memory')
    .select('id, content')
    .eq('user_id', userId)
    .is('genome_section', null)
    .neq('active', false)
    .order('importance', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (!pending?.length) return { classified: 0, deferred: 0 };

  let classified = 0;
  let deferred = 0;
  await Promise.all(
    pending.map(async (m) => {
      const verdict = await classifyOne(apiKey, String(m.content ?? ''));
      // null means WE COULD NOT TELL, and the row is left NULL so the next sweep retries it. Writing
      // a guess here is not a cosmetic mistake: 'none' is filtered out of the Genome entirely and is
      // never revisited, so one transient model failure used to delete a fact from the owner's
      // handover manual permanently — silently, and with a comment claiming it did the opposite.
      if (verdict === null) {
        deferred += 1;
        return;
      }
      await supabase
        .from('kira_memory')
        .update({
          genome_section: verdict.section,
          genome_headline: verdict.headline,
          genome_classified_at: new Date().toISOString(),
        })
        .eq('id', m.id);
      classified += 1;
    }),
  );
  return { classified, deferred };
}

/**
 * Read the owner's Genome.
 *
 * READ-ONLY. Classification happens at write time (above), so opening this page never changes what
 * it is about to show you.
 */
export async function deriveOwnerGenome(userId: string): Promise<OwnerGenome> {
  const supabase = createServiceClient();

  const { data: rows } = await supabase
    .from('kira_memory')
    .select('id, content, created_at, importance, genome_section, genome_headline, source_conversation_id')
    .eq('user_id', userId)
    .neq('active', false)
    .order('created_at', { ascending: false });

  // The conversation each fact came from. One extra round trip rather than a join, so a missing or
  // deleted conversation degrades that entry to unsourced instead of dropping the fact itself.
  const sourceIds = [...new Set((rows ?? []).map((r) => r.source_conversation_id).filter(Boolean))];
  const spokenOn = new Map<string, string>();
  if (sourceIds.length > 0) {
    const { data: convs } = await supabase
      .from('conversations')
      .select('id, started_at')
      .in('id', sourceIds as string[]);
    for (const c of convs ?? []) spokenOn.set(String(c.id), String(c.started_at));
  }

  const { data: valuation } = await supabase
    .from('business_valuations')
    .select('readiness, gap, worth_today')
    .eq('user_id', userId)
    .maybeSingle();

  const { count: documents } = await supabase
    .from('kira_knowledge')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const seen = new Set<string>();
  const all: OwnerEntry[] = (rows ?? [])
    // 'none' is filed away rather than shown: it is real memory, but it is not about how the
    // business operates, and padding a Genome with chit-chat is how it stops being believable.
    .filter((r) => r.genome_section !== 'none')
    // NEAR-DUPLICATES OUT. The same fact said in three conversations distils three times, and a
    // handover document that repeats itself reads as padding — which is exactly how a buyer's
    // advisor decides a document was generated rather than written. Compared on a normalised form so
    // punctuation and casing do not smuggle a duplicate through.
    .filter((r) => {
      const key = String(r.content ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((r) => ({
      id: String(r.id),
      headline: (r.genome_headline as string | null) ?? null,
      content: String(r.content ?? ''),
      capturedAt: String(r.created_at),
      importance: (r.importance as number) ?? null,
      section: (SECTION_KEYS.includes(String(r.genome_section)) ? r.genome_section : 'unsorted') as SectionKey | 'unsorted',
      source:
        r.source_conversation_id && spokenOn.has(String(r.source_conversation_id))
          ? {
              conversationId: String(r.source_conversation_id),
              spokenOn: spokenOn.get(String(r.source_conversation_id)) as string,
            }
          : null,
    }));

  const sections: OwnerSection[] = GENOME_SECTIONS.map((s) => {
    const entries = all.filter((e) => e.section === s.key);
    const coverage =
      entries.length === 0 ? 'empty' : entries.length <= 2 ? 'thin' : entries.length <= 5 ? 'building' : 'covered';
    return { key: s.key, title: s.title, question: s.question, entries, coverage };
  });

  return {
    sections,
    unsorted: all.filter((e) => e.section === 'unsorted'),
    totalCaptured: all.length,
    documents: documents ?? 0,
    readiness: valuation?.readiness != null ? Number(valuation.readiness) : null,
    gap: valuation?.gap != null ? Number(valuation.gap) : null,
    worthToday: valuation?.worth_today != null ? Number(valuation.worth_today) : null,
    empty: all.length === 0,
    sourced: all.filter((e) => e.source).length,
    stillInYourHead: sections
      .filter((sec) => sec.coverage === 'empty')
      .map((sec) => ({ key: sec.key, title: sec.title, question: sec.question })),
  };
}

/**
 * Which section a fact belongs in — or null when we could not establish it.
 *
 * The null is the point. This used to return 'none' on every failure path, under a comment saying it
 * would "leave it unclassified rather than guessing". It did the opposite: 'none' is a decision, it
 * is filtered out of the Genome, and the row is never reconsidered because it is no longer NULL. A
 * rate limit or a dropped connection therefore erased a real fact from the owner's manual for good.
 * Degrade-don't-fake means declining to answer, not answering "nothing".
 */
async function classifyOne(
  apiKey: string,
  content: string,
): Promise<{ section: string; headline: string | null } | null> {
  if (!content.trim()) return { section: 'none', headline: null }; // a real verdict, not a failure
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        temperature: 0,
        max_tokens: 120,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: CLASSIFY_SYSTEM },
          { role: 'user', content: content.slice(0, 900) },
        ],
      }),
    });
    if (!res.ok) return null; // transient — retry on the next sweep rather than file it as nothing
    const json = await res.json();
    const parsed = JSON.parse(String(json?.choices?.[0]?.message?.content ?? '{}')) as {
      section?: unknown;
      headline?: unknown;
    };
    const section = String(parsed.section ?? '').trim().toLowerCase();
    if (!SECTION_KEYS.includes(section) && section !== 'none') {
      // An answer outside the vocabulary is a model problem, not a verdict about the fact.
      console.warn(`[genome] unrecognised section "${section.slice(0, 40)}" — leaving unclassified.`);
      return null;
    }
    const headline = typeof parsed.headline === 'string' ? parsed.headline.trim().slice(0, 90) : '';
    return { section, headline: headline || null };
  } catch {
    return null;
  }
}
