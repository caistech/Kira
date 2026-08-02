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
import { ownerPrivateReason, PRIVATE_REASONS, type PrivateReason } from './private';

/** What the note is about. `software` forces section 'none' — enforced in code, not just asked for. */
const ABOUT_VALUES = ['business', 'software', 'personal'];

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
  /**
   * The date he was read this back and agreed, or null.
   *
   * The three states a fact can be in are asserted (he said it), sourced (traceable to the
   * conversation), and CONFIRMED (read back and agreed) — and only the third is evidence a buyer
   * cannot discount. Null is currently the honest majority: confirmations began on 2026-08-02 and
   * are deliberately not backfillable, because a confirmation nobody made is the one lie a handover
   * document cannot survive.
   */
  confirmedOn: string | null;
  /**
   * Why this entry is the owner's alone, or null when it describes the business.
   *
   * THE UNION OF THE MATCHER AND THE MODEL, never one or the other. `lib/genome/private.ts` is
   * deterministic and cheap but weak on recall; the classifier reads meaning but can fail, time out,
   * or answer null. Taking either as sufficient means a private fact reaches the buyer's document
   * the first time the other one is wrong, so the entry is private if EITHER says so — the only
   * combination in which a failure on either side can only ever withhold too much.
   *
   * Computed here rather than at each call site so there is exactly one place to get it right. The
   * export and `/my-genome` read this field; they do not re-derive it.
   */
  privateReason: PrivateReason | null;
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
   * How many he has been read back and agreed with — the count a buyer cannot discount.
   *
   * Distinct from `sourced` on purpose: traceable to a conversation means we know when he said it,
   * and confirmed means he heard it back and stood by it. Only the second survives a buyer asking
   * "and how do you know that is still true?"
   */
  confirmed: number;
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
to a buyer. Reply with ONLY a JSON object:
{"about": "<business|software|personal>", "section": "<key>", "headline": "<short lead>", "private": "<reason|null>"}

ANSWER "about" FIRST, and START BY TRYING TO SAY "software". It decides most of the rest.

software  THE DEFAULT SUSPICION, and the answer far more often than it looks. Anything mentioning
          the assistant, this app, an integration or a tool — what it may access, what it should or
          should not send, how it should ask, reminders and task-tracking, drafting or sending mail
          on his behalf, Drive or Gmail or Contacts access, uploads, onboarding, what he wants built
          next, anything phrased as a want/need/preference ABOUT BEING HELPED. If the sentence would
          make no sense to someone who had never heard of this product, it is software.
business  how the business EARNS, DELIVERS, BUYS, or is OBLIGED — clients, jobs, sites, prices,
          crews, suppliers, invoices, cash, licences, financing. Includes the owner's own judgement
          when it governs the WORK: his pricing instinct, which client he will not take, why he
          walks away from a job.
personal  about the OWNER's life or intentions rather than the operation: selling up, retiring,
          health, family, money pressure, how he feels about the work.

THE TEST — and it is the one that goes wrong most often. Ask WHO OR WHAT THE SENTENCE IS ABOUT:
  "Reminders are needed to follow up with Dave"            → about being HELPED  → software
  "Follow-up with Dave on soil testing is due 7 August"    → about the WORK      → business
  "Emails are drafted and reviewed before sending"         → about the ASSISTANT → software
  "Invoices are issued at practical completion"            → about the BUSINESS  → business
  "Files for Lot 91 are in a shared Drive folder"          → about the TOOL      → software
  "Lot 91 was delivered before building approval"          → about the SITE      → business
Both kinds mention real projects and real people. The project names prove nothing. Ask what the
sentence is TELLING you: how the business works, or what the assistant should do.

SECTIONS
work-in      how work/revenue arrives: clients, referrals, contracts, marketing, who brings the work
pricing      how anything is priced, quoted, discounted, or what it costs the customer
delivery     how the work actually gets done: crews, scheduling, process, who does what, quality
suppliers    suppliers, purchasing, materials, subcontractors, trade terms
obligations  licences, insurance, compliance, registrations, renewals, deadlines
only-you     judgement, history, relationships or rules that live only in the owner's head
none         everything else — and "none" is the right answer far more often than it looks

HOW "about" CONSTRAINS "section":
- about=software  → section MUST be "none". Always. No exceptions. A buyer does not care what tools
  he used, and this manual is not a record of how he talks to an assistant.
- about=personal  → still choose a real section when the fact bears on the business at all (a plan to
  sell, a health reason behind it, who has not been told). Only use "none" for personal life with no
  bearing on the business whatsoever — a van being repaired, holiday plans, chit-chat.
- about=business  → choose the section that fits.

ALSO FILE AS "none": anything about a DIFFERENT company or product than the one this manual is for.

"private" — WOULD THIS SENTENCE COST HIM MONEY IF THE BUYER READ IT?
Most notes are not private; answer null. It is private when it describes HIS POSITION rather than the
business, because that only ever moves the price against him. One of exactly these, or null:
  exit-intent            he is thinking of selling, retiring, winding down, stepping back.
                         NOT raising money, taking on equity partners, refinancing, or bringing in
                         an investor — those are how a business GROWS, they are exactly what a buyer
                         wants to read, and calling them an exit both hides them and misreads them.
  not-yet-told           who does not know yet — staff, family, customers, anyone
  personal-circumstances health, divorce, bereavement, personal debt or guarantees driving the sale
  negotiating-position   what he would accept, his floor, how urgently he needs it done
  how-he-feels           burnt out, had enough, sick of it, desperate to be out
NOT private: how the business runs, however candid. "He walks away from jobs with bad access" is his
operating judgement and a buyer is paying to learn it. When genuinely unsure, answer with the reason
rather than null — a business fact wrongly withheld costs a line he can add back, and a private fact
wrongly released cannot be recalled.

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
          genome_about: verdict.about,
          genome_private_reason: verdict.private,
          // Stamped whatever the answer was, including null. This is what makes a null reason
          // readable later: reason null + this null means never asked, reason null + this set means
          // asked and no. Without it a half-finished backfill is indistinguishable from a complete
          // one that found nothing.
          genome_privacy_classified_at: new Date().toISOString(),
        })
        .eq('id', m.id);
      classified += 1;
    }),
  );
  return { classified, deferred };
}

/** One row's current and proposed classification. The unit the operator reviews and then applies. */
export interface ProposedChange {
  id: string;
  email: string | null;
  content: string;
  before: { section: string | null; about: string | null; privateReason: string | null };
  after: { section: string | null; about: string | null; privateReason: string | null };
}

/**
 * Re-ask the classifier for every row that was never asked, and report what WOULD change.
 *
 * Writes nothing. The point of separating this from the apply is that re-classification moves facts
 * out of a live Genome — a row going `only-you` → `none` vanishes from an owner's page — and that is
 * not something to do to a real business record without a person reading the list first.
 *
 * Rows the model declines to classify are counted, not guessed at: `classifyOne` returns null on a
 * transient failure and those rows simply stay unasked, exactly as they are today.
 */
export async function classifyForReview({
  userId,
  limit = 1000,
}: { userId?: string; limit?: number } = {}): Promise<{
  considered: number;
  failed: number;
  changes: ProposedChange[];
  summary: { sectionMoves: number; toNone: number; newlyPrivate: number; labelledOnly: number };
}> {
  const supabase = createServiceClient();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { considered: 0, failed: 0, changes: [], summary: { sectionMoves: 0, toNone: 0, newlyPrivate: 0, labelledOnly: 0 } };

  let q = supabase
    .from('kira_memory')
    .select('id, user_id, content, genome_section, genome_about, genome_private_reason')
    .is('genome_privacy_classified_at', null)
    .neq('active', false)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (userId) q = q.eq('user_id', userId);

  const { data: rows } = await q;
  if (!rows?.length) return { considered: 0, failed: 0, changes: [], summary: { sectionMoves: 0, toNone: 0, newlyPrivate: 0, labelledOnly: 0 } };

  // Whose row it is, so a report spanning accounts can be read. One query rather than a join, for
  // the same reason the Genome resolves its sources separately: a missing user degrades one line
  // instead of dropping the row.
  const userIds = [...new Set(rows.map((r) => String(r.user_id)))];
  const emails = new Map<string, string>();
  const { data: users } = await supabase.from('users').select('id, email').in('id', userIds);
  for (const u of users ?? []) emails.set(String(u.id), String(u.email ?? ''));

  const changes: ProposedChange[] = [];
  let failed = 0;

  // Sequential on purpose. This runs a few hundred model calls against one key, and the parallel
  // version rate-limits into failures that look exactly like "the model could not classify it".
  for (const r of rows) {
    const verdict = await classifyOne(apiKey, String(r.content ?? ''));
    if (verdict === null) {
      failed += 1;
      continue;
    }
    changes.push({
      id: String(r.id),
      email: emails.get(String(r.user_id)) ?? null,
      content: String(r.content ?? '').slice(0, 220),
      before: {
        section: (r.genome_section as string) ?? null,
        about: (r.genome_about as string) ?? null,
        privateReason: (r.genome_private_reason as string) ?? null,
      },
      after: { section: verdict.section, about: verdict.about, privateReason: verdict.private },
    });
  }

  const sectionMoves = changes.filter((c) => c.before.section !== c.after.section);
  return {
    considered: rows.length,
    failed,
    changes,
    summary: {
      sectionMoves: sectionMoves.length,
      toNone: sectionMoves.filter((c) => c.after.section === 'none').length,
      // Counted against the MATCHER, not against the stored value — a row the matcher already
      // catches is not new protection, and reporting it as such would overstate what this run buys.
      newlyPrivate: changes.filter((c) => c.after.privateReason && !ownerPrivateReason(c.content)).length,
      labelledOnly: changes.filter((c) => c.before.section === c.after.section).length,
    },
  };
}

/**
 * Write back exactly the decisions that were reviewed — or, on `before`, undo them.
 *
 * Takes the proposal rather than re-running the model. At temperature 0 a second run would probably
 * agree, and "probably" is not the bar for silently rewriting someone's business record: the
 * operator applies the list he read.
 */
export async function applyReviewedClassification(
  changes: ProposedChange[],
  { direction }: { direction: 'after' | 'before' },
): Promise<number> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  let written = 0;

  for (const c of changes) {
    const target = direction === 'after' ? c.after : c.before;
    const { error } = await supabase
      .from('kira_memory')
      .update({
        genome_section: target.section,
        genome_about: target.about,
        genome_private_reason: target.privateReason,
        // On a revert this returns to NULL, which is what puts the row back in the "never asked"
        // pool — a revert that left the stamp behind would make the row invisible to a later run
        // and quietly permanent.
        genome_privacy_classified_at: direction === 'after' ? now : null,
      })
      .eq('id', c.id);
    if (error) console.error('[genome-reclassify] write failed for', c.id, error.message);
    else written += 1;
  }
  return written;
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
    .select(
      'id, content, created_at, importance, genome_section, genome_headline, source_conversation_id, confirmed_at, genome_private_reason',
    )
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
      // When he was read this back and agreed. Null is the honest majority for now — the record
      // cannot be backfilled, so every fact captured before confirmations existed is sourced at
      // best. See docs/GENOME_BUYER_FORMAT.md §2.
      confirmedOn: r.confirmed_at ? String(r.confirmed_at).slice(0, 10) : null,
      // Matcher OR model — see the field's note on OwnerEntry. The matcher runs first because it is
      // free and synchronous; the stored verdict adds the recall it cannot have. A stored reason
      // outside the known vocabulary is ignored rather than trusted, so a bad write cannot put an
      // unlabelable reason in front of the owner.
      privateReason:
        ownerPrivateReason(String(r.content ?? '')) ??
        (PRIVATE_REASONS.includes(String(r.genome_private_reason ?? '') as PrivateReason)
          ? (String(r.genome_private_reason) as PrivateReason)
          : null),
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
    confirmed: all.filter((e) => e.confirmedOn).length,
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
): Promise<{ section: string; headline: string | null; about: string | null; private: PrivateReason | null } | null> {
  if (!content.trim()) return { section: 'none', headline: null, about: null, private: null }; // a real verdict, not a failure
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        temperature: 0,
        // Raised from 120 with the two extra fields. A truncated JSON object throws in the parse
        // below and returns null, which the sweep retries forever — a cap that is merely too tight
        // presents as a row that will not classify, with nothing pointing at the cap.
        max_tokens: 200,
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
      about?: unknown;
      private?: unknown;
    };
    let section = String(parsed.section ?? '').trim().toLowerCase();
    if (!SECTION_KEYS.includes(section) && section !== 'none') {
      // An answer outside the vocabulary is a model problem, not a verdict about the fact.
      console.warn(`[genome] unrecognised section "${section.slice(0, 40)}" — leaving unclassified.`);
      return null;
    }

    const about = ABOUT_VALUES.includes(String(parsed.about ?? '').trim().toLowerCase())
      ? String(parsed.about).trim().toLowerCase()
      : null;

    // THE CONSTRAINT IS ENFORCED HERE, NOT LEFT TO THE PROMPT. The prompt says about=software must
    // file as "none", and the model mostly obeys — but "mostly" is how the vendor's AI-assistant
    // preferences ended up in a document we told him to hand to a buyer. A rule stated in prose and
    // checked in code is a mechanism; stated only in prose it is a request.
    if (about === 'software' && section !== 'none') {
      console.warn(`[genome] about=software with section "${section}" — forcing none.`);
      section = 'none';
    }

    const privateReason = PRIVATE_REASONS.includes(String(parsed.private ?? '').trim().toLowerCase() as PrivateReason)
      ? (String(parsed.private).trim().toLowerCase() as PrivateReason)
      : null;

    const headline = typeof parsed.headline === 'string' ? parsed.headline.trim().slice(0, 90) : '';
    return { section, headline: headline || null, about, private: privateReason };
  } catch {
    return null;
  }
}
