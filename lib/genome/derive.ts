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
import { createServiceClientV2 } from '@/lib/supabase/server';
import { resolveOrganisationForPerson } from '@/lib/auth';
// PRIVATE_REASONS is still used to validate what the classifier answers before it is STORED — the
// column keeps filling so a future re-measurement is free. It is `ownerPrivateReason` alone that
// decides what the owner and the buyer actually see. See OwnerEntry.privateReason.
import { ownerPrivateReason, PRIVATE_REASONS, type PrivateReason } from './private';
import { dropRestatements, possibleRestatements } from './similar';
import { GENOME_AREAS, LEGACY_SECTION_MAP, areaFor, type AreaKey } from './areas';
// The tag is defined by the distiller that writes it, and imported rather than restated — the same
// rule areas.ts is held to. A second hand-written copy of a string this small is precisely how the
// producing side and the enforcing side come to disagree without either one looking wrong.
import { ASSISTANT_STATE_TAG } from '@/lib/kira/memory-extract';
import { withoutOwnerName } from './owner-name';
import { deriveBaseline, type AreaBaseline, type BaselineInputs } from './baseline';

/**
 * What the note is about.
 *
 * `software` SPLIT INTO TWO on 2026-08-02, and the split is the point. Applying "software → none"
 * bluntly discarded WHERE THE BUSINESS KEEPS ITS RECORDS, which is rank 10 — measured on the real
 * Genome, 34 rows named a system and every one was filed `none`, among them "bank accounts are not
 * synchronised with Xero". That is the first thing a buyer's accountant hits.
 *
 *   assistant → how Kira should behave. Still forced to `none`; a buyer does not care what tools he
 *               used to talk to an assistant.
 *   systems   → what the business RUNS ON and where its records live. Belongs to `management`.
 *
 * `software` is still accepted so rows classified before the split keep parsing, and is treated as
 * `assistant` — the conservative read, since that is what the old prompt was mostly catching.
 *
 * ⚠️ THE CONSERVATIVE READ HAS A VICTIM, AND IT IS THE CUSTOMER WHOSE BUSINESS IS AI (2026-08-07).
 *
 * The prompt used to open "START BY TRYING TO SAY assistant", a thumb on the scale added because the
 * `about=assistant → none` guard was measured leaking ZERO rows — it was never wrong, it simply never
 * fired. Tuning a guard for its false-NEGATIVE rate is what produced the false-POSITIVE one.
 *
 * Measured on production: of 10 rows captured for shhahhussain@gmail.com since 2026-08-04, SEVEN were
 * filed `about=assistant` by the model with no `assistant-state` tag from the distiller — and what
 * they contained was his company:
 *
 *     "Minimo is a mini memory infrastructure designed for AI agents and humans within the business."
 *     "The long memory evaluation benchmark for retrieval is 99.2%, the highest in the world."
 *     "Shah created Minimo, a memory infrastructure for the AI agent and human."
 *
 * His business IS AI memory, so every genuine fact about it trips a classifier hunting for notes
 * about an assistant. He has three visible Genome entries and the seven discarded are the ones that
 * matter most. He is evaluating this product for a partnership; if he opens My Genome his own product
 * is not in it.
 *
 * The prompt's own discriminator already exonerated all seven — "would this still be true if this
 * assistant had never existed?" — and the bias line overrode it whenever the vocabulary looked
 * AI-shaped. The bias is gone; the test is now the only rule, applied to the SUBJECT of the sentence
 * rather than to its nouns. `genome-classify-product.test.ts` pins his real sentences.
 *
 * THE TAG IS AUTHORITATIVE, THE MODEL'S VERDICT IS NOT. 18 rows carrying `assistant-state` from the
 * distiller were all correct; the model's unaided `assistant` verdicts produced the seven above. The
 * distiller knows its own state; the classifier is guessing.
 */
const ABOUT_VALUES = ['business', 'assistant', 'systems', 'software', 'personal'];

/**
 * The nine areas, in the shape this module already renders.
 *
 * Derived from `areas.ts` rather than restated, so the ranking stays in ONE place — §3.1 obliges the
 * order to be cheap for a broker to re-order, and a second hand-written copy here is exactly what
 * makes that a rewrite instead of a config change.
 */
export const GENOME_SECTIONS = GENOME_AREAS.map((a) => ({
  key: a.key,
  title: a.title,
  question: a.buyerQuestion,
  /**
   * The same question addressed to the owner, for HIS page.
   *
   * Carried alongside rather than replacing `question`: the buyer's third-person wording is correct
   * in the handover document, where the reader is an advisor and the subject is someone else. It is
   * only wrong on the owner's own screen. Two renderings of one Genome is the whole model (§5), and
   * this is that distinction applied to a sentence.
   */
  ownerQuestion: a.ownerFacingQuestion,
}));

export type SectionKey = AreaKey;

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
   * THE DETERMINISTIC MATCHER DECIDES THIS, ALONE. `genome_private_reason` is still written by the
   * classifier and is deliberately NOT read here — see the measurement below before restoring it.
   *
   * It was briefly the union of the two, on the reasoning that a model can only ever withhold MORE
   * and therefore cannot cause disclosure. Half of that is true and the other half is what made it
   * wrong: withholding more means REMOVING BUSINESS FACTS FROM THE BUYER'S DOCUMENT, and margins and
   * fundraising are among the things a buyer most wants to read.
   *
   * Measured 2026-08-02 over 305 rows — 105 from the real Factory2Key Genome and 200 from the
   * red-team corpus, whose adversarial conversations are the closest paraphrase test available:
   *
   *   model-only catches (the recall this was built for) : 16
   *   ...of which true positives                          : 0
   *   matcher-only (the model missing a real one)         : 0
   *
   * Seven read "Corvid Holdings is raising a $2 million fund" as `exit-intent`, against a prompt
   * line added the same day saying in as many words that raising money is not an exit. Seven read
   * "the Marlow job's margin is confidential" as `negotiating-position` — an access rule, not a
   * floor price. The matcher caught everything worth catching and invented nothing.
   *
   * So the column stays and keeps filling, because that makes a future re-measurement free once
   * there are more owners than one. Reading it is what stopped. If you restore it, restore the
   * measurement too — the raw runs are in the session scratchpad and the counts above are the bar.
   */
  privateReason: PrivateReason | null;
  /**
   * The id of an earlier entry this one MIGHT be restating, or null.
   *
   * SURFACED, NEVER MERGED — and that is the decision, not a limitation. Above the merge threshold a
   * restatement is collapsed automatically. In the band below it, two entries are alike enough to be
   * worth asking about and not alike enough to act on, so the owner is asked. Silently collapsing two
   * things he said is a rewrite of his own record, and the product is built on him controlling that.
   *
   * The band was previously unreachable: lowering the threshold far enough to catch a real
   * restatement (containment 0.58) also merged Lot 91 with Lot 442 — different sites, different
   * money. `identifiersConflict` removed that danger, because those two are near-identical precisely
   * BECAUSE the only difference is the number. Guard the identifiers and the band opens up.
   */
  possibleRestatementOf: string | null;
  /**
   * Set when this entry is the SAME FACT as an earlier one, said in different words.
   *
   * Ray, third visit running, 2026-08-23: "It KNOWS. If it can spot the duplicate well enough to
   * tell me, it can pick one." So now the product picks: the later entry is folded into the
   * earlier one at read time and carries this pointer instead of rendering. The database row is
   * untouched — provenance survives in `everythingHeld` and the raw export — and the page stops
   * asking him to do his own de-duplication.
   */
  mergedInto?: string | null;
  /**
   * When the same fact was picked up again in other conversations, as ISO timestamps.
   *
   * Provenance for a fold: the survivor states the fact once and honestly carries the dates of the
   * wordings that were folded into it. The raw export keeps every original wording regardless.
   */
  alsoRecordedOn?: string[];
}

export interface OwnerSection {
  key: SectionKey;
  title: string;
  /** The buyer's advisor's wording — third person, for the handover document. */
  question: string;
  /** The same question addressed to the owner, for his own page. */
  ownerQuestion: string;
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
  /**
   * What the eleven pre-signup answers already say about this area, or null.
   *
   * NEVER counted in `coverage` and never mixed into `entries`. A self-reported answer is not a
   * captured fact, and letting one lift an area out of 'empty' would manufacture progress from a
   * form the owner filled in before he paid — the same overclaim as the meta-notes that prompted
   * this, in better clothes. It exists so an area reads as LOCATED rather than blank (§3.2's "no
   * area is ever empty, only located") and so Kira has an honest place to open a conversation.
   *
   * Null for `people` and `compliance`: nothing in the eleven questions speaks to who does what or
   * to licences and insurance, and inventing a line to avoid a blank is the confident-wrong this
   * whole model is built to avoid.
   */
  baseline: AreaBaseline | null;
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
  /**
   * Held, but deliberately NOT in the Genome — chit-chat, notes about the assistant, another
   * company's facts. Shown so "anything here can be taken back" is a promise about everything he has
   * said rather than about the subset that happened to be filed. See the note at the call site.
   */
  otherHeld: OwnerEntry[];
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
  /**
   * Empty areas whose truth normally lives in a SYSTEM or a DOCUMENT, not in his head.
   *
   * Split out of `stillInYourHead` when the model widened to nine areas (2026-08-02), because the
   * copy attached to that list — *"today only you can answer it"* — became FALSE for four of them.
   * Assets, People, Customers and Management are empty because nobody has shown Kira where they
   * live, not because the owner is carrying them: his depreciation schedule is at the accountant's
   * and his insurance certificates are in a filing cabinet.
   *
   * Telling a 66-year-old that his asset register is in his head is the kind of confident wrong that
   * makes him stop trusting the parts that ARE right — and he knows it is wrong immediately, which is
   * worse than saying nothing. §3.2's rule is that no area is ever empty, only located; until §3.3's
   * location model has real data this coarse split is the honest version of that.
   */
  notYetLocated: { key: SectionKey; title: string; question: string }[];
}

const SECTION_KEYS = GENOME_SECTIONS.map((s) => s.key) as string[];

/**
 * Does this row's tag set say the distiller marked it as Kira's own state?
 *
 * Tolerant of what actually comes back from Postgres — a `text[]` arrives as an array, but a row
 * written before the column existed, or by a path that stored a bare string, must not throw its way
 * into a `null` verdict and back onto the retry queue forever. Anything unreadable is simply "not
 * marked", which routes the row to the classifier exactly as it does today.
 */
export function isAssistantState(tags: unknown): boolean {
  const list = Array.isArray(tags) ? tags : typeof tags === 'string' ? [tags] : [];
  return list.some((t) => typeof t === 'string' && t.trim().toLowerCase() === ASSISTANT_STATE_TAG);
}

/**
 * Does this note name one of OUR OWN surfaces? Then it is about the software, whatever the model said.
 *
 * ⚠️ A CONTENT MATCHER WAS REJECTED ONCE, FOR A GOOD REASON, AND THIS IS NOT THAT MATCHER. The
 * rejected one keyed on business-systems vocabulary, where "bank accounts are not reconciled against
 * Xero" is a real fact that must keep travelling and is lexically near-identical to a note about a
 * tool. This keys on OUR PRODUCT'S OWN NOUNS — the Genome, Kira herself. No fact about an electrical
 * contracting business legitimately describes something as being "saved into the Genome", because
 * the Genome is a thing we made and it did not exist until he signed up.
 *
 * WHY IT IS NEEDED ON TOP OF THE TAG. `isAssistantState` is authoritative and correct when it fires
 * (18/18 measured), but it only fires when the DISTILLER tagged the row. Measured on Ray's account
 * 2026-08-16, four notes about Kira's own filing behaviour reached `about=business, section=pricing`
 * untagged, and one of them — "The owner prefers not to have pricing and quoting guides emailed and
 * insists on retaining control of document distribution" — landed in the handover document a broker
 * would read. His words: "It reads like it is working for itself… characterised me to a stranger as
 * someone who insists on things."
 *
 * Deliberately NARROW. It does not try to judge whether a sentence is "really" about the business —
 * that is the model's job and it is mostly right. It catches the one case a model cannot be talked
 * out of getting wrong occasionally, and where being wrong reaches a buyer.
 */
// WRITTEN WITH THE RegExp CONSTRUCTOR, NOT A LITERAL, AND NOT VIA A SHELL HEREDOC.
//
// The first version of this line was written through a heredoc and its word-boundary escapes were
// stored as literal BACKSPACE bytes (0x08). The regex compiled, tsc passed, the build passed, and
// it matched NOTHING. Only `cat -A` revealed it. Fourth escape-mangling in one day, and already a
// memory note — the lesson is not "be careful", it is: assert the BEHAVIOUR, because reading the
// source back looked completely correct.
const OUR_OWN_SURFACES = new RegExp(
  ['(?:the|your|his|her|my)\\s+genome', 'genome\\s+(?:system|page|entry|record)'].join('|'),
  'i',
);

export function namesOurOwnProduct(content: string): boolean {
  return OUR_OWN_SURFACES.test(String(content ?? ''));
}

/** A stored key, resolved to a current area — carrying legacy keys forward. See the call site. */
function resolveSection(stored: string): SectionKey | 'unsorted' {
  if (SECTION_KEYS.includes(stored)) return stored as SectionKey;
  const forwarded = LEGACY_SECTION_MAP[stored as keyof typeof LEGACY_SECTION_MAP];
  return forwarded ?? 'unsorted';
}

const CLASSIFY_SYSTEM = `
You are filing one note into a small business's OPERATING MANUAL — the document its owner would hand
to a buyer. Reply with ONLY a JSON object:
{"about": "<business|assistant|systems|personal>", "section": "<key>", "headline": "<short lead>",
 "private": "<reason|null>", "owner_dependent": <true|false|null>}

ANSWER "about" FIRST. It decides most of the rest.

⚠️ THE OWNER'S OWN PRODUCT IS ALWAYS "business" — even when his product is an AI assistant, an agent,
a memory system, a chatbot or a developer tool. Apply the ONE test below and nothing else. A customer
who builds AI is describing HIS COMPANY, not describing you, and filing his product as "assistant"
deletes the most important facts he owns.

  "Minimo is a memory infrastructure for AI agents and humans."   → HIS PRODUCT → business
  "Our retrieval benchmark is 99.2%, highest without a re-ranker." → HIS METRIC  → business
  "He created Minimo."                                            → HIS COMPANY → business

THE ONE TEST: would this still be true if this assistant had never existed?
  YES → it is HIS (business / systems / personal). NO → it is "assistant".
Apply it to the SUBJECT of the sentence, never to the vocabulary. Words like agent, memory, model,
prompt, retrieval and assistant are ordinary nouns in a technology business and prove nothing.

assistant HOW THIS ASSISTANT SHOULD BEHAVE. What she may access, what she should or should not send,
          how she should ask, reminders and task-tracking, drafting on his behalf, uploads, what he
          wants built next — anything phrased as a want/need/preference ABOUT BEING HELPED BY YOU.
          It must fail the ONE TEST above: meaningless if this assistant had never existed.
systems   WHAT THE BUSINESS RUNS ON, and WHERE ITS RECORDS LIVE. Named tools the business itself
          depends on, what is in them, what is NOT in them, how well they are kept. "Bank accounts
          are not synchronised with Xero." "Documents are on Drive but file names are inconsistent."
          "Quotes are tracked in a spreadsheet on his laptop." This is NOT about the assistant — it is
          about the business's own memory, and a buyer's accountant hits it on day one.
          THE LINE BETWEEN THEM: does the sentence tell you how KIRA should act, or where the
          BUSINESS keeps things? "Send me a reminder about Drive" is assistant. "The contracts are in
          Drive" is systems.
business  how the business EARNS, DELIVERS, BUYS, or is OBLIGED — clients, jobs, sites, prices,
          crews, suppliers, invoices, cash, licences, financing. Includes the owner's own judgement
          when it governs the WORK: his pricing instinct, which client he will not take, why he
          walks away from a job.
personal  about the OWNER's life or intentions rather than the operation: selling up, retiring,
          health, family, money pressure, how he feels about the work.

THE TEST — and it is the one that goes wrong most often. Ask WHO OR WHAT THE SENTENCE IS ABOUT:
  "Reminders are needed to follow up with Dave"            → about being HELPED    → assistant
  "Follow-up with Dave on soil testing is due 7 August"    → about the WORK        → business
  "Emails are drafted and reviewed before sending"         → about the ASSISTANT   → assistant
  "Invoices are issued at practical completion"            → about the BUSINESS    → business
  "Files for Lot 91 are in a shared Drive folder"          → where RECORDS LIVE    → systems
  "Lot 91 was delivered before building approval"          → about the SITE        → business
Both kinds mention real projects and real people. The project names prove nothing. Ask what the
sentence is TELLING you: how the business works, where it keeps its records, or what the assistant
should do.

SECTIONS — nine areas, the ones a buyer's advisor actually asks about
demand      where work comes from: clients arriving, referrals, marketing, reputation, who brings it
pricing     how anything is priced, quoted, discounted, what it costs the customer, the competition
operations  how the work actually gets done: crews, scheduling, process, who does what, quality
cash        money in and out: invoicing, who chases, terms, margins, suppliers, purchasing, financing
customers   WHO buys, what they buy, repeat vs one-off, concentration, who owns each relationship
people      who is inside the business: roles, skills, tenure, contractors, who is critical
assets      what the business owns or leases: plant, vehicles, equipment, premises, their condition
compliance  licences, insurance, registrations, renewals, deadlines, disputes
systems     WHERE THE RECORDS LIVE and what is documented — the business's own memory, its systems
none        everything else — and "none" is the right answer far more often than it looks

HOW "about" CONSTRAINS "section":
- about=assistant → section MUST be "none". Always. No exceptions. A buyer does not care what tools
  he used, and this manual is not a record of how he talks to an assistant.
- about=systems   → section is almost always "systems". Only choose another area when the note is
  really about that area and merely MENTIONS a system.
- about=personal  → still choose a real section when the fact bears on the business at all (a plan to
  sell, a health reason behind it, who has not been told). Only use "none" for personal life with no
  bearing on the business whatsoever — a van being repaired, holiday plans, chit-chat.

  ⚠️ HOW MUCH THE BUSINESS DEPENDS ON HIM IS NEVER "personal life with no bearing". "I have never
  taken more than two weeks off in a row" was filed "none" and dropped out of the Genome and both
  documents. It is not chit-chat about his holidays — it is the single strongest piece of evidence
  for owner-dependence, which is the whole thing this manual measures. Ray, 2026-08-17: "That
  sentence IS the business. Thirty-five years, never two weeks off in a row — that is the whole
  diagnosis in eleven words, and it is the single line a buyer's advisor would circle. You have filed
  it as personal chit-chat."

  The test is not whether the sentence mentions him. It is whether a buyer would price it. Never
  taking a holiday, doing every quote himself, being the only one who can open the yard — all of
  that is operating knowledge wearing a personal sentence.

  ⚠️ A LICENCE, REGISTRATION OR ACCREDITATION HELD IN HIS OWN NAME IS THE SAME TRAP, and in a trade
  it is the deal itself. "The electrical contractor's licence is in my name, not the company's" was
  acknowledged in conversation as "an important compliance detail" and never reached the record at
  all. A buyer cannot trade the Monday after settlement without it. File it under licences — never
  "none", never "personal".
- about=business  → choose the area that fits.

"owner_dependent" — DOES THIS LIVE ONLY IN HIS HEAD?
true when the fact describes judgement, history, a relationship or a rule that exists because HE
holds it — his pricing instinct, the client he will not take, why he walks away from a job, the
supplier who gives him terms because of who he is, the thing nobody else in the business knows.
false when it is written down, systematised, or held by someone else — a documented process, a named
non-owner who does it, a rule anyone could apply from the records.
null when you genuinely cannot tell. Prefer null to a guess: this is the axis a buyer prices the
business on, and a confident wrong answer on it is worse than an honest gap.
This is NOT a section — it is a property of the fact, and it applies to every area. "Pricing is
entirely in his head" and "the yard tidy-up is in his head" are both true and are not the same risk,
which is why it is measured per fact rather than filed in one bucket.

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
export async function classifyPendingMemories(organisationId: string, limit = 50): Promise<{ classified: number; deferred: number }> {
  const supabase = createServiceClientV2();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { classified: 0, deferred: 0 };

  const { data: pending } = await supabase
    .from('kira_memory')
    .select('id, content, tags')
    .eq('organisation_id', organisationId)
    .is('genome_section', null)
    .neq('active', false)
    .order('importance', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (!pending?.length) return { classified: 0, deferred: 0 };

  let classified = 0;
  let deferred = 0;
  await Promise.all(
    pending.map(async (m) => {
      // KIRA'S OWN STATE IS FILED WITHOUT ASKING. The distiller read the transcript and marked this
      // as a note about herself (lib/kira/memory-extract.ts); the classifier will only ever see the
      // sentence, by which point "access to the Gmail account is unresolved" is indistinguishable
      // from a fact about the business's records — which is exactly how it reached the Customers
      // area of the real Genome.
      //
      // Filed `none`, not deleted: `none` is what the owner's "everything else you have told me"
      // list renders, so he can still see it and remove it, while the buyer's handover never
      // carries it. Deleting would be the product quietly editing his record.
      // The tag when the distiller set it; the product-noun backstop when it did not. Same
      // consequence either way — filed `none`, kept visible to him, kept out of the buyer's copy.
      if (isAssistantState(m.tags) || namesOurOwnProduct(String(m.content ?? ''))) {
        await supabase
          .from('kira_memory')
          .update({
            genome_section: 'none',
            genome_headline: '',
            genome_classified_at: new Date().toISOString(),
            genome_about: 'assistant',
            // Privacy is moot on a row that never reaches the buyer, and stamping it keeps this row
            // out of the re-review queue, which selects on this column being null. Left unstamped it
            // would be re-proposed for classification forever.
            genome_private_reason: null,
            genome_privacy_classified_at: new Date().toISOString(),
            genome_owner_dependent: null,
          })
          .eq('id', m.id);
        classified += 1;
        return;
      }

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
          // The bridge that lets `only-you` stop being a place. Written on every classification from
          // here, so the axis has data the day it is built rather than needing a second pass over
          // the owner's record.
          genome_owner_dependent: verdict.ownerDependent,
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
  const supabase = createServiceClientV2();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { considered: 0, failed: 0, changes: [], summary: { sectionMoves: 0, toNone: 0, newlyPrivate: 0, labelledOnly: 0 } };

  let q = supabase
    .from('kira_memory')
    .select('id, user_id, organisation_id, content, genome_section, genome_about, genome_private_reason')
    .is('genome_privacy_classified_at', null)
    .neq('active', false)
    .order('created_at', { ascending: true })
    .limit(limit);
  // P0.4: when the admin reclassify targets one account, ownership resolves through the canonical
  // membership chain — never through user_id. A fleet-wide sweep (no userId) is the admin's explicit
  // all-org lens and carries organisation_id so a re-save cannot drop it.
  if (userId) {
    const orgContext = await resolveOrganisationForPerson(userId);
    if (!orgContext) return { considered: 0, failed: 0, changes: [], summary: { sectionMoves: 0, toNone: 0, newlyPrivate: 0, labelledOnly: 0 } };
    q = q.eq('organisation_id', orgContext.organisationId);
  }

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
  const supabase = createServiceClientV2();
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
export async function deriveOwnerGenome(organisationContext: { organisationId: string, personId: string }): Promise<OwnerGenome> {
  const supabase = createServiceClientV2();
  const userId = organisationContext.personId;
  const organisationId = organisationContext.organisationId;

  // ⚠️ HIS OWN NAME, SO IT CAN BE TAKEN BACK OUT OF EVERY LINE.
  //
  // memory-extract.ts already instructs the distil never to use it, and the distil wrote "Pricing is
  // done verbally in Ray's head" into the copy meant for a buyer anyway. Applied at READ time rather
  // than at write time so it covers the rows already in the table, and in one place rather than in
  // each of the four surfaces that render an entry.
  const { data: ownerRow } = await supabase
    .from('users')
    .select('first_name')
    .eq('id', userId)
    .maybeSingle();
  const ownerFirstName = (ownerRow?.first_name as string | null) ?? null;
  const clean = (text: string) => withoutOwnerName(text, ownerFirstName);

  const { data: rows } = await supabase
    .from('kira_memory')
    .select(
      'id, content, created_at, importance, genome_section, genome_headline, source_conversation_id, confirmed_at, genome_private_reason',
    )
    .eq('organisation_id', organisationId)
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
    .select('readiness, gap, worth_today, inputs')
    .eq('organisation_id', organisationId)
    .maybeSingle();

  const { count: documents } = await supabase
    .from('kira_knowledge')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', organisationContext.organisationId);

  // 'none' is filed away rather than shown: it is real memory, but it is not about how the business
  // operates, and padding a Genome with chit-chat is how it stops being believable.
  const relevant = (rows ?? []).filter((r) => r.genome_section !== 'none');

  // EVERYTHING ELSE HE IS HOLDING, so "anything here can be taken back" is true.
  //
  // Rows filed `none` are chit-chat, notes about the assistant, or facts about another company —
  // correctly kept out of the Genome and out of the handover document. But the page tells him
  // "Anything here can be taken back — use Remove on the entry itself", and a tester counted: the
  // page showed 2 while the export held 12. "Ten of the twelve aren't on the page, so there is no
  // entry and no Remove. The promise is scoped to what's visible and doesn't say so."
  //
  // It matters more than housekeeping. One of his surviving rows read "...organizing knowledge and
  // documents to improve business clarity and value for a POTENTIAL SALE" — filed `none` because it
  // is about the assistant, invisible on his page, and therefore un-removable by him. The redaction
  // net could not reach it either: it shares almost no vocabulary with the sentence he removed, so
  // neither the lexical cluster nor the private matcher sees it. What CAN be fixed is letting him
  // see it and decide, which is the whole posture of this feature.
  const otherHeld: OwnerEntry[] = (rows ?? [])
    .filter((r) => r.genome_section === 'none')
    .map((r) => ({
      id: String(r.id),
      headline: (r.genome_headline as string) ?? null,
      content: clean(String(r.content ?? '')),
      capturedAt: String(r.created_at),
      importance: (r.importance as number) ?? null,
      section: 'unsorted' as const,
      source: null,
      confirmedOn: null,
      privateReason: ownerPrivateReason(String(r.content ?? '')),
      possibleRestatementOf: null,
    }));

  // RESTATEMENTS OUT. The same fact said in three conversations distils three times, and a handover
  // document that repeats itself reads as padding — exactly how a buyer's advisor decides a document
  // was generated rather than written.
  //
  // This used to compare a normalised STRING, which caught only a fact saved twice word for word.
  // What the product actually produces is paraphrase: the QA export carried six entries that were
  // really two facts. `dropRestatements` compares significant-word containment instead — see
  // lib/genome/similar.ts for the measurement behind the threshold. Rows arrive newest-first, and
  // first-wins is kept from the old filter, so the most recent phrasing survives and this change
  // removes repetition without also reshuffling which version of every fact he sees.
  const survivors = dropRestatements(relevant, (r) => String(r.content ?? ''));
  // Computed over the SURVIVORS, so he is never asked about a pair where one side has already been
  // merged away — that question has no answer he could act on.
  const maybeSame = possibleRestatements(
    survivors,
    (r) => String(r.id),
    (r) => String(r.content ?? ''),
  );
  const all: OwnerEntry[] = survivors.map((r) => ({
      id: String(r.id),
      headline: (r.genome_headline as string | null) ?? null,
      content: clean(String(r.content ?? '')),
      capturedAt: String(r.created_at),
      importance: (r.importance as number) ?? null,
      // LEGACY KEYS RESOLVE FORWARD, at read time.
      //
      // The nine-area model renamed the section keys, and the reviewed re-classification of the
      // existing rows has not run yet. Without this, every row still filed `work-in` / `delivery` /
      // `suppliers` / `obligations` falls through to `unsorted` — so an owner's Genome collapses into
      // one undifferentiated pile the moment the model widens, and the areas he is told about all
      // read as empty while his facts sit in a heap underneath them.
      //
      // §3 calls the nine "a widening, not a rewrite", and five of the six map straight across. Doing
      // it here means the widening is free and the re-classification stays what it should be: a
      // reviewed pass over the rows that genuinely need a judgement, not a migration everything is
      // blocked on. `only-you` is deliberately absent from the map — it becomes the per-row axis, and
      // those rows need the operator's eye rather than an automatic destination.
      section: resolveSection(String(r.genome_section)),
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
      // Matcher only. `genome_private_reason` is selected above and deliberately not consulted —
      // the field note on OwnerEntry carries the measurement that retired it.
      privateReason: ownerPrivateReason(String(r.content ?? '')),
      possibleRestatementOf: maybeSame.get(String(r.id)) ?? null,
      // If this entry is the SAME FACT as an earlier-listed (more recent) one, said in different
      // words, it carries that entry's id here instead of rendering.
      mergedInto: maybeSame.get(String(r.id)) ?? null,
    }));

  // ACT ON THE RELATION WE ALREADY DETECT.
  //
  // Three visits running, the Genome showed Wayne/Karen twice with "this may be another way of
  // saying something you already told Kira — remove whichever one reads worse". Ray, 2026-08-23:
  // "It KNOWS. If it can spot the duplicate well enough to tell me, it can pick one."
  //
  // So the product picks. An entry whose content is alike enough that the page was willing to ASK
  // about it (containment ≥ POSSIBLE_RESTATEMENT, identifiers compatible — see lib/genome/
  // similar.ts) is folded into the entry it may restate, here at read time, so every consumer —
  // his page, the handover document, the share counts — sees the same deduped record without each
  // re-implementing the rule.
  //
  // ⚠️ FOLDED, NOT DELETED. The database row is untouched; the raw JSON export reads the table
  // directly and still carries every wording. Provenance survives on the survivor as
  // `alsoRecordedOn`, so the record honestly shows the fact was mentioned more than once.
  const visible = (() => {
    if (!maybeSame.size) return all;
    const foldedDates = new Map<string, string[]>();
    for (const e of all) {
      if (!e.mergedInto || !e.capturedAt) continue;
      const dates = foldedDates.get(e.mergedInto) ?? [];
      dates.push(e.capturedAt);
      foldedDates.set(e.mergedInto, dates);
    }
    for (const entry of all) {
      const dates = foldedDates.get(entry.id);
      if (dates?.length) entry.alsoRecordedOn = dates;
    }
    return all.filter((e) => !e.mergedInto);
  })();

  // THE BASELINE — what the eleven pre-signup answers already say about each area.
  //
  // §3.2's rule is "no area is ever EMPTY, only LOCATED", and until now nothing made that true on
  // day one: an authenticated walkthrough found all nine areas blank on a live account while the
  // owner's own answers about where his systems live sat unread in `business_valuations.inputs`.
  //
  // It is deliberately SEPARATE from `entries` and never counted in `coverage`. A self-reported
  // answer is not a captured fact, and letting one raise an area from "empty" to "thin" would
  // manufacture progress out of a form the owner filled in before he paid — the same overclaim as
  // the meta-notes that prompted this, wearing better clothes.
  const baselines = deriveBaseline((valuation?.inputs ?? null) as BaselineInputs | null);
  const baselineFor = new Map(baselines.map((b) => [b.area, b]));

  const sections: OwnerSection[] = GENOME_SECTIONS.map((s) => {
    const entries = visible.filter((e) => e.section === s.key);
    const coverage =
      entries.length === 0 ? 'empty' : entries.length <= 2 ? 'thin' : entries.length <= 5 ? 'building' : 'covered';
    const baseline = baselineFor.get(s.key) ?? null;
    return {
      key: s.key,
      title: s.title,
      question: s.question,
      ownerQuestion: s.ownerQuestion,
      entries,
      coverage,
      baseline,
    };
  });

  return {
    sections,
    unsorted: visible.filter((e) => e.section === 'unsorted'),
    totalCaptured: visible.length,
    documents: documents ?? 0,
    readiness: valuation?.readiness != null ? Number(valuation.readiness) : null,
    gap: valuation?.gap != null ? Number(valuation.gap) : null,
    worthToday: valuation?.worth_today != null ? Number(valuation.worth_today) : null,
    empty: visible.length === 0,
    otherHeld,
    sourced: visible.filter((e) => e.source).length,
    confirmed: visible.filter((e) => e.confirmedOn).length,
    // Empty areas, split by where their truth normally comes from — see `notYetLocated` above. An
    // area with `truthLivesIn: 'system'` is NOT claimed to be in his head, because that is a claim
    // nobody has checked.
    stillInYourHead: sections
      .filter((sec) => sec.coverage === 'empty' && areaFor(sec.key)?.truthLivesIn !== 'system')
      .map((sec) => ({ key: sec.key, title: sec.title, question: sec.ownerQuestion })),
    notYetLocated: sections
      .filter((sec) => sec.coverage === 'empty' && areaFor(sec.key)?.truthLivesIn === 'system')
      .map((sec) => ({ key: sec.key, title: sec.title, question: sec.ownerQuestion })),
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
): Promise<{
  section: string;
  headline: string | null;
  about: string | null;
  private: PrivateReason | null;
  ownerDependent: boolean | null;
} | null> {
  // a real verdict, not a failure
  if (!content.trim()) return { section: 'none', headline: null, about: null, private: null, ownerDependent: null };
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
      owner_dependent?: unknown;
    };
    let section = String(parsed.section ?? '').trim().toLowerCase();
    if (!SECTION_KEYS.includes(section) && section !== 'none') {
      // An answer outside the vocabulary is a model problem, not a verdict about the fact.
      console.warn(`[genome] unrecognised section "${section.slice(0, 40)}" — leaving unclassified.`);
      return null;
    }

    let about = ABOUT_VALUES.includes(String(parsed.about ?? '').trim().toLowerCase())
      ? String(parsed.about).trim().toLowerCase()
      : null;
    // A pre-split row (or a model still answering the old vocabulary) reads as `assistant`. That is
    // the conservative direction: `software` was mostly catching assistant-preferences, and treating
    // it as `systems` would promote a pile of unreviewed rows straight into the buyer's document.
    if (about === 'software') about = 'assistant';

    // THE CONSTRAINT IS ENFORCED HERE, NOT LEFT TO THE PROMPT. The prompt says about=software must
    // file as "none", and the model mostly obeys — but "mostly" is how the vendor's AI-assistant
    // preferences ended up in a document we told him to hand to a buyer. A rule stated in prose and
    // checked in code is a mechanism; stated only in prose it is a request.
    if (about === 'assistant' && section !== 'none') {
      console.warn(`[genome] about=assistant with section "${section}" — forcing none.`);
      section = 'none';
    }

    // THE OTHER HALF OF THE SPLIT, and it must be enforced in the same place for the same reason.
    // `systems` exists precisely to stop rank 10 being empty, so a model that answers systems and
    // then files it as `none` — the habit the old prompt trained for months — would reproduce the
    // exact bug the split was made to fix, quietly and while appearing to comply.
    if (about === 'systems' && section === 'none') {
      console.warn('[genome] about=systems filed as none — routing to the systems area.');
      section = 'systems';
    }

    const privateReason = PRIVATE_REASONS.includes(String(parsed.private ?? '').trim().toLowerCase() as PrivateReason)
      ? (String(parsed.private).trim().toLowerCase() as PrivateReason)
      : null;

    // Strictly tri-state. Anything that is not a real boolean — a string "unsure", a missing field,
    // a null — becomes null, because the honest gap is the point: false is a CLAIM that this fact
    // does not depend on the owner, in a document whose whole subject is what does.
    const ownerDependent = typeof parsed.owner_dependent === 'boolean' ? parsed.owner_dependent : null;

    const headline = typeof parsed.headline === 'string' ? parsed.headline.trim().slice(0, 90) : '';
    return { section, headline: headline || null, about, private: privateReason, ownerDependent };
  } catch {
    return null;
  }
}
