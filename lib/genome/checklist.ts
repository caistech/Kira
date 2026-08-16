// THE PER-BUCKET RUBRIC — what a buyer always asks about each area, and what makes an answer real.
//
// WHY THIS EXISTS. `deriveOwnerGenome` bands an area by COUNTING entries: 6+ is "well covered". So
// six trivial notes about the people in a business score identically to the three that would
// survive due diligence — adequate for *"is this area getting attention"*, and no answer at all to
// a broker asking **"green on what basis?"**, which is the first question anyone asks and the one
// the product's credibility rests on.
//
// The fix is a denominator, and it is not invented. Every area in `areas.ts` already carries a
// `buyerQuestion` derived bottom-up from ~140 flows in the orchestrator's task registry. **This
// file is that question, itemised.** Nothing new is asserted; the existing question is broken into
// the facts that answer it. So when a green bucket is challenged, the answer is *"because these six
// things a buyer always asks are on the record"* rather than *"because our algorithm said 6."*
//
// DATA, NOT PROSE — for the same reason `areas.ts` is data. When a broker moves or adds an item
// that must be a config change and a re-score, never a rebuild. There is no external reviewer and
// no relationship to lean on; the list is derived from a source, held as data, and corrected when
// it is challenged. Write each item so a challenge can FALSIFY it.
//
// ⚠️ THREE THINGS THIS FILE DELIBERATELY IS NOT.
//
//   1. IT IS NOT A FORM. The product's whole thesis is that a 66-year-old will talk and will not
//      fill in fields. This is the SCORER's denominator and KIRA's agenda. He should meet it only
//      as "two things left in this area", and only if he goes looking.
//   2. IT IS NOT A GAP ANALYSIS. Compliance covers what he HAS, never what he NEEDS — asserting
//      which licences a business like his must hold is a claim about regulatory obligation, and per
//      DATA_STANDARD that wants an authoritative citable source, never inference.
//   3. IT IS NOT A CLAIM THAT ALL-GREEN MEANS SALE-READY. Sector and size dominate the multiple; a
//      perfectly systemised café is still 1.0–2.5x. The defensible claim is "the top of your
//      sector's range", which the model already computes.
//
// See docs/SPEC_GENOME_CHECKLIST_AND_PATHWAYS.md for the four gates and how this compiles into the
// valuation rubric, and docs/GENOME_BUCKET_CHECKLIST.md for the drafting of the items themselves.

import type { AreaKey } from './areas';

/**
 * The five factors in `lib/valuation/model.ts`. Named here rather than imported so this file stays
 * dependency-free data — but the KEYS MUST MATCH `WEIGHTS` there, and `checklist.test.ts` asserts
 * it against the model's own source rather than trusting this comment.
 */
export type FactorKey =
  | 'ownerDependence'
  | 'systems'
  | 'recurringRevenue'
  | 'clientConcentration'
  | 'growth';

/**
 * What makes an answer substantive — the teeth of the rubric.
 *
 * A rubric that only SCORES produces a red bucket and a confused owner. The reason an answer fails
 * is the most useful thing we know about it, so it is carried here and becomes Kira's next
 * question. "Not answered" and "answered badly" are different states with different remedies.
 */
export interface SubstanceTest {
  /** Observable conditions, ALL of which must hold. Written so a person can check them. */
  tests: string[];
  /** What a thin answer sounds like. */
  weakExample: string;
  /** What a substantive one sounds like. */
  strongExample: string;
  /** What Kira says when it fails. The reason IS the coaching. */
  coaching: string;
}

/**
 * How a gap actually closes — the routing key for gate 4.
 *
 *   fact     — he tells her. Done in a sentence.
 *   document — the thing exists but is not written down. She drafts it, he approves, it files back
 *              to his Drive. This is what write access to Drive is FOR.
 *   change   — the business has to change. No amount of talking closes it, and saying so is the
 *              honest thing: writing down "only I can run this job" does not make it less true.
 *              These are the pathway items.
 */
export type CloseMode = 'fact' | 'document' | 'change';

export interface ChecklistItem {
  /** Stable id. NEVER renumbered — it is what an assessed entry is matched to and stored against. */
  key: string;
  area: AreaKey;
  /** Required items are what "covered" MEANS. Supporting items add depth and can never hold a bucket red. */
  required: boolean;
  /** The buyer's phrasing, third person, for the handover document. */
  buyerItem: string;
  /** The same thing asked of the owner — Kira's agenda, and what the panel shows him. */
  ownerPrompt: string;
  /**
   * Null on supporting items, where presence is enough.
   *
   * Deliberate: a substance test on every item would turn depth into another bar to clear, and the
   * supporting items exist precisely to reward detail without punishing its absence.
   */
  substance: SubstanceTest | null;
  /**
   * Which valuation factor this evidences, or null.
   *
   * ⚠️ NULL IS THE COMMON CASE, and that is the point of mapping per ITEM rather than per AREA.
   * Nine areas do not map onto five factors — Assets and Compliance evidence none of them — and
   * pretending otherwise would put weight on things a buyer does not price. Most items complete the
   * handover document; a minority move the number. The panel can only say which if the mapping
   * lives here.
   */
  factor: FactorKey | null;
  closes: CloseMode;
}

// ---------------------------------------------------------------------------------------------
// The items.
//
// Required items are the questions a buyer ALWAYS asks. Supporting items are the ones asked when it
// matters. Substance tests are written on required items only.
// ---------------------------------------------------------------------------------------------

export const CHECKLIST: readonly ChecklistItem[] = [
  // --- CUSTOMERS (rank 1 — concentration is the single largest discount a buyer applies) --------
  {
    key: 'customers.top-named',
    area: 'customers',
    required: true,
    buyerItem: 'The largest customers, named, with approximate share of revenue each',
    ownerPrompt: 'Who are your biggest customers, and roughly what share of the work is each?',
    substance: {
      tests: [
        'names actual customers rather than a count or a category',
        'gives a rough share, proportion or ranking for the largest',
      ],
      weakExample: 'we have about forty regulars',
      strongExample: 'Brenton Homes is about a third, then Calloway and Deakin at maybe 15% each, the rest is spread',
      coaching:
        'A count does not tell a buyer what happens if one of them leaves. Who are the biggest few by name, and roughly what share is the largest?',
    },
    factor: 'clientConcentration',
    closes: 'fact',
  },
  {
    key: 'customers.relationship-owner',
    area: 'customers',
    required: true,
    buyerItem: 'Who inside the business owns each of the main customer relationships',
    ownerPrompt: 'For each of those, who actually holds the relationship — is it you?',
    substance: {
      tests: [
        'names a person per major customer',
        'is explicit where the answer is the owner himself rather than leaving it implied',
      ],
      weakExample: 'we all look after them',
      strongExample: 'Brenton is me. Calloway is Sam — he does the ordering and the site visits. Deakin is me again.',
      coaching:
        'This is the one a buyer probes hardest, because relationships that live with you leave with you. Name a person for each of the big ones — and if the answer is you, that is worth saying plainly.',
    },
    factor: 'ownerDependence',
    closes: 'fact',
  },
  {
    key: 'customers.contracted',
    area: 'customers',
    required: true,
    buyerItem: 'Which customers are under contract and which are at-will',
    ownerPrompt: 'Which of them are on a contract or standing agreement, and which just keep ringing?',
    substance: {
      tests: [
        'distinguishes contracted from at-will rather than answering generally',
        'names which customers fall on each side, or says plainly that none are contracted',
      ],
      weakExample: 'mostly handshake stuff',
      strongExample: 'Only Brenton has a supply agreement, renews each June. Everyone else is job by job.',
      coaching:
        'A buyer is purchasing next year\'s revenue, not last year\'s. Which of them are actually committed on paper — and if the honest answer is none, that is worth stating rather than leaving vague.',
    },
    factor: 'recurringRevenue',
    closes: 'fact',
  },
  {
    key: 'customers.would-follow',
    area: 'customers',
    required: false,
    buyerItem: 'Which customers would follow the owner personally if he left',
    ownerPrompt: 'If you walked away tomorrow, which of them would follow you rather than stay?',
    substance: null,
    factor: 'ownerDependence',
    closes: 'fact',
  },
  {
    key: 'customers.tenure',
    area: 'customers',
    required: false,
    buyerItem: 'How long the main customers have been buying',
    ownerPrompt: 'How long have the main ones been with you?',
    substance: null,
    factor: null,
    closes: 'fact',
  },
  {
    key: 'customers.unusual-terms',
    area: 'customers',
    required: false,
    buyerItem: 'Anything unusual in how a major customer is served or priced',
    ownerPrompt: 'Is there anything unusual about how you serve or price one of the big ones?',
    substance: null,
    factor: null,
    closes: 'fact',
  },

  // --- PRICING (rank 4 — earnings consistency) --------------------------------------------------
  {
    key: 'pricing.method',
    area: 'pricing',
    required: true,
    buyerItem: 'How a price is arrived at — list, cost-plus, market, or judgement',
    ownerPrompt: 'When a job comes in, how do you actually arrive at the price?',
    substance: {
      tests: [
        'describes a method someone else could follow, not only that a price gets set',
        'is specific enough that a second person would reach a similar number',
      ],
      weakExample: 'I price it on what the job\'s worth',
      strongExample: 'Materials at cost plus 22%, labour at $95 an hour, then I round to the nearest fifty and add a bit if access is bad',
      coaching:
        'That is judgement, which is exactly what a buyer cannot buy — it leaves with you. Talk me through the last quote you did: what did you start from, and what did you add?',
    },
    factor: 'ownerDependence',
    closes: 'fact',
  },
  {
    key: 'pricing.rates',
    area: 'pricing',
    required: true,
    buyerItem: 'The actual rates or margins, written down',
    ownerPrompt: 'What are the rates or margins themselves?',
    substance: {
      tests: ['gives at least one actual number rather than describing that numbers exist'],
      weakExample: 'we have a rate card somewhere',
      strongExample: '$95 an hour for the trade, $65 for the apprentice, materials at cost plus 22%',
      coaching:
        'A rate card someone has to find is not the same as one a buyer can read. What are the numbers?',
    },
    factor: 'systems',
    closes: 'document',
  },
  {
    key: 'pricing.non-standard',
    area: 'pricing',
    required: true,
    buyerItem: 'What a non-standard job does to the price, and who decides',
    ownerPrompt: 'When a job is unusual, what happens to the price — and who makes that call?',
    substance: {
      tests: [
        'says what changes, not only that something changes',
        'names who decides — and if it is only the owner, says so',
      ],
      weakExample: 'depends on the job',
      strongExample: 'Anything over two storeys I add 15% for access and I decide that myself; Sam can price anything standard',
      coaching:
        '"Depends" is the answer that worries a buyer most, because it means the pricing lives with you. What actually changes, and who is allowed to make that call?',
    },
    factor: 'ownerDependence',
    closes: 'change',
  },
  {
    key: 'pricing.discount-authority',
    area: 'pricing',
    required: false,
    buyerItem: 'Who may discount, and by how much',
    ownerPrompt: 'Can anyone else discount, and how far?',
    substance: null,
    factor: 'ownerDependence',
    closes: 'change',
  },
  {
    key: 'pricing.list-location',
    area: 'pricing',
    required: false,
    buyerItem: 'Where the price list lives, if there is one',
    ownerPrompt: 'Where does the price list actually live?',
    substance: null,
    factor: 'systems',
    closes: 'document',
  },
  {
    key: 'pricing.last-moved',
    area: 'pricing',
    required: false,
    buyerItem: 'When prices last moved, and what triggered it',
    ownerPrompt: 'When did you last put prices up, and what made you?',
    substance: null,
    factor: null,
    closes: 'fact',
  },

  // --- OPERATIONS (rank 5 — seller involvement, transferability) --------------------------------
  {
    key: 'operations.standard-job',
    area: 'operations',
    required: true,
    buyerItem: 'The steps of a standard job, start to finish',
    ownerPrompt: 'Walk me through a standard job from the phone call to the invoice.',
    substance: {
      tests: [
        'describes a sequence of steps rather than a general description of the work',
        'reaches the end — the job finishing or being invoiced — rather than stopping at the start',
      ],
      weakExample: 'we go out, do the work, send the bill',
      strongExample: 'Call comes in, I do a site look within a couple of days, quote out within a week, deposit before we book it, Sam schedules the crew, I check it before we leave, invoice on completion with 14 days',
      coaching:
        'That is the shape but not the steps. A buyer wants to see the sequence someone else could follow — what happens between the call and the crew turning up?',
    },
    factor: 'systems',
    closes: 'document',
  },
  {
    key: 'operations.who-does-each-step',
    area: 'operations',
    required: true,
    buyerItem: 'Who performs each step of a standard job',
    ownerPrompt: 'Who does each of those steps?',
    substance: {
      tests: ['attaches a person or role to the steps rather than describing the work impersonally'],
      weakExample: 'the boys handle it',
      strongExample: 'Sam schedules and orders, the crew does the install, I do the site look and the final check',
      coaching:
        '"The boys" is fine in the yard and not in a handover. Which steps are yours, and which are genuinely somebody else\'s?',
    },
    factor: 'ownerDependence',
    closes: 'fact',
  },
  {
    key: 'operations.owner-still-does',
    area: 'operations',
    required: true,
    buyerItem: 'What the owner personally still does on a normal job',
    ownerPrompt: 'On a normal job, what do you still personally do?',
    substance: {
      tests: [
        'names specific activities rather than a general level of involvement',
        'is honest about the parts nobody else does',
      ],
      weakExample: 'I keep an eye on things',
      strongExample: 'I do every site look, I sign off anything over $10k, and I am the one who rings a customer when it goes wrong',
      coaching:
        'This is the single most valuable answer in the whole record, so it is worth being blunt. On a normal job, what happens that does not happen unless you do it?',
    },
    factor: 'ownerDependence',
    closes: 'change',
  },
  {
    key: 'operations.quality-check',
    area: 'operations',
    required: false,
    buyerItem: 'The quality check, and who signs it off',
    ownerPrompt: 'Is there a check before a job is called finished, and who does it?',
    substance: null,
    factor: 'ownerDependence',
    closes: 'change',
  },
  {
    key: 'operations.common-failure',
    area: 'operations',
    required: false,
    buyerItem: 'What goes wrong most often, and the standard fix',
    ownerPrompt: 'What goes wrong most often, and what do you do about it?',
    substance: null,
    factor: null,
    closes: 'fact',
  },
  {
    key: 'operations.owner-only-jobs',
    area: 'operations',
    required: false,
    buyerItem: 'Any job type only the owner can run',
    ownerPrompt: 'Is there a kind of job only you can run?',
    substance: null,
    factor: 'ownerDependence',
    closes: 'change',
  },

  // --- PEOPLE (rank 6 — management structure) ---------------------------------------------------
  {
    key: 'people.roster',
    area: 'people',
    required: true,
    buyerItem: 'Everyone who works in the business, named, with their role',
    ownerPrompt: 'Who works in the business, and what does each of them do?',
    substance: {
      tests: ['names people individually', 'gives a role for each rather than a headcount'],
      weakExample: 'there are six of us',
      strongExample: 'Sam runs scheduling and ordering, Mark and Dave are the install crew, Jules does the books two days a week, and my son is an apprentice',
      coaching:
        'A headcount does not tell a buyer who does what. Who are they, and what does each one actually do?',
    },
    factor: null,
    closes: 'fact',
  },
  {
    key: 'people.engagement-type',
    area: 'people',
    required: true,
    buyerItem: 'Whether each person is employed, contracted or casual',
    ownerPrompt: 'For each of them — employee, contractor or casual?',
    substance: {
      tests: ['gives an engagement type per person rather than a general statement'],
      weakExample: 'mix of both',
      strongExample: 'Sam and Mark are full-time employees, Dave is a subbie on his own ABN, Jules is casual',
      coaching:
        'A buyer prices these very differently, so it needs to be person by person. Which of them are on the books, and which invoice you?',
    },
    factor: null,
    closes: 'fact',
  },
  {
    key: 'people.critical',
    area: 'people',
    required: true,
    buyerItem: 'Who is genuinely critical — who the business would struggle without',
    ownerPrompt: 'Apart from you, who would the business really struggle without?',
    substance: {
      tests: [
        'names a person, or states plainly that nobody besides the owner is critical',
        'says what would actually be lost',
      ],
      weakExample: 'they\'re all important',
      strongExample: 'Sam. He holds every supplier relationship and knows the scheduling in his head — if he went we would be a month recovering',
      coaching:
        'Everyone being important is the same as nobody being critical, and a buyer will not believe it. If one person did not turn up for a month, who would hurt most — and what exactly would be missing?',
    },
    factor: 'ownerDependence',
    closes: 'fact',
  },
  {
    key: 'people.successor',
    area: 'people',
    required: true,
    buyerItem: 'Who could step into the owner\'s job',
    ownerPrompt: 'Who could step into your job?',
    substance: {
      tests: [
        'names a person, or states plainly that nobody can',
        'says what that person can already decide without the owner',
        'is true today rather than a plan or an intention',
      ],
      weakExample: 'my son helps out',
      strongExample: 'Mark runs Tuesday and Thursday end to end and quotes up to $8k without me — has done since March',
      coaching:
        '"Helps out" does not tell a buyer whether the business runs on a Tuesday if you are in hospital. Who actually does — and what can they decide without ringing you?',
    },
    factor: 'ownerDependence',
    closes: 'change',
  },
  {
    key: 'people.tenure',
    area: 'people',
    required: false,
    buyerItem: 'How long each person has been with the business',
    ownerPrompt: 'How long has each of them been with you?',
    substance: null,
    factor: null,
    closes: 'fact',
  },
  {
    key: 'people.contracts-restraints',
    area: 'people',
    required: false,
    buyerItem: 'Who has a written contract, and who has a restraint',
    ownerPrompt: 'Who has anything in writing — a contract, or a restraint clause?',
    substance: null,
    factor: null,
    closes: 'document',
  },
  {
    key: 'people.flight-risk',
    area: 'people',
    required: false,
    buyerItem: 'Who would be likely to leave if the business sold',
    ownerPrompt: 'If the business sold, who do you think would leave?',
    substance: null,
    factor: null,
    closes: 'fact',
  },

  // --- COMPLIANCE (rank 7) ----------------------------------------------------------------------
  //
  // ⚠️ WHAT HE HAS, NEVER WHAT HE NEEDS. Asserting which licences a business like his MUST hold is a
  // claim about regulatory obligation, and DATA_STANDARD D1/D2 wants an authoritative citable source
  // for that, never inference. A gap analysis is a different product with a different risk profile.
  {
    key: 'compliance.licences',
    area: 'compliance',
    required: true,
    buyerItem: 'Every licence and registration held, with its expiry',
    ownerPrompt: 'What licences and registrations does the business hold, and when do they expire?',
    substance: {
      tests: ['names the licences individually', 'gives an expiry or renewal timing for them'],
      weakExample: 'all up to date',
      strongExample: 'Plumbing licence in my name, renews each March. Gas fitting to 2028. Business registration and the ABN are current.',
      coaching:
        '"Up to date" is true right up until one is not. Which ones are there, and when does each fall due?',
    },
    factor: null,
    closes: 'fact',
  },
  {
    key: 'compliance.insurance',
    area: 'compliance',
    required: true,
    buyerItem: 'Every insurance policy, with its renewal date',
    ownerPrompt: 'What insurance is in place, and when does each policy renew?',
    substance: {
      tests: ['names the policies rather than saying insurance exists', 'gives renewal timing'],
      weakExample: 'we\'re fully insured',
      strongExample: 'Public liability $20m through CGU renews in October, workers comp through the state scheme, tools and vehicle on the one policy in June',
      coaching:
        'Which policies, and when do they renew? A buyer checks that nothing lapses in the handover, and "fully insured" is not something they can check.',
    },
    factor: null,
    closes: 'fact',
  },
  {
    key: 'compliance.who-watches',
    area: 'compliance',
    required: true,
    buyerItem: 'Who watches the renewal calendar',
    ownerPrompt: 'Who keeps track of when those fall due?',
    substance: {
      tests: [
        'names a person or a system',
        'is explicit where the answer is the owner remembering, rather than leaving it implied',
      ],
      weakExample: 'it gets done',
      strongExample: 'The broker emails me each year for the insurance; the licences I just remember, which is not ideal',
      coaching:
        'If the answer is that you remember, say so — that is a real finding and it is fixable. Who or what would catch it if one nearly lapsed?',
    },
    factor: 'ownerDependence',
    closes: 'change',
  },
  {
    key: 'compliance.disputes',
    area: 'compliance',
    required: false,
    buyerItem: 'Anything currently in dispute',
    ownerPrompt: 'Is anything in dispute at the moment?',
    substance: null,
    factor: null,
    closes: 'fact',
  },
  {
    key: 'compliance.change-of-control',
    area: 'compliance',
    required: false,
    buyerItem: 'Any contract with a change-of-control clause',
    ownerPrompt: 'Does any contract say something changes if the business is sold?',
    substance: null,
    factor: null,
    closes: 'fact',
  },

  // --- CASH (rank 8 — working capital) ----------------------------------------------------------
  {
    key: 'cash.customer-terms',
    area: 'cash',
    required: true,
    buyerItem: 'The payment terms given to customers',
    ownerPrompt: 'What payment terms do you give customers?',
    substance: {
      tests: ['gives actual terms — a period, a deposit, or payment on completion'],
      weakExample: 'they pay when the job\'s done',
      strongExample: '30% deposit to book, balance on completion, 14 days for the commercial ones',
      coaching:
        'Is that on the day, or an invoice with a period? And is there a deposit? Those three answers are what a buyer models the working capital from.',
    },
    factor: null,
    closes: 'fact',
  },
  {
    key: 'cash.chasing',
    area: 'cash',
    required: true,
    buyerItem: 'Who chases overdue money, and at what point',
    ownerPrompt: 'Who chases an overdue invoice, and how long before they do?',
    substance: {
      tests: ['names who does it', 'says at what point it happens'],
      weakExample: 'I get onto them eventually',
      strongExample: 'Jules sends a reminder at 30 days, and anything past 60 comes to me to ring',
      coaching:
        '"Eventually" is a process a buyer cannot inherit. Who does it, and at what point?',
    },
    factor: 'ownerDependence',
    closes: 'change',
  },
  {
    key: 'cash.spend-authority',
    area: 'cash',
    required: true,
    buyerItem: 'Who may approve spending, and up to what amount',
    ownerPrompt: 'Who can spend the business\'s money, and up to how much?',
    substance: {
      tests: [
        'names who can spend',
        'gives a limit, or states plainly that only the owner can',
      ],
      weakExample: 'they check with me',
      strongExample: 'Sam orders materials up to $5k on the account without asking; anything above that is me',
      coaching:
        'Is there a limit, or does everything come to you? A buyer reads "everything comes to me" as a business that stops when you do.',
    },
    factor: 'ownerDependence',
    closes: 'change',
  },
  {
    key: 'cash.personal-supplier-terms',
    area: 'cash',
    required: true,
    buyerItem: 'Whether any supplier terms are personal to the owner rather than to the business',
    ownerPrompt: 'Are any of your supplier terms really about you rather than the business?',
    substance: {
      tests: ['answers for the supplier relationships specifically, yes or no', 'names which, where yes'],
      weakExample: 'we\'ve been with them a long time',
      strongExample: 'The trade discount at Reece is because I have known the branch manager twenty years — it is not on paper anywhere',
      coaching:
        'Long relationships are exactly where this hides. Is there a discount or a credit line that exists because of you personally, rather than because of the business?',
    },
    factor: 'ownerDependence',
    closes: 'change',
  },
  {
    key: 'cash.tied-up',
    area: 'cash',
    required: false,
    buyerItem: 'Roughly how much is tied up in stock and unbilled work at any time',
    ownerPrompt: 'Roughly how much is sitting in stock or work you have done but not billed?',
    substance: null,
    factor: null,
    closes: 'fact',
  },
  {
    key: 'cash.other-obligations',
    area: 'cash',
    required: false,
    buyerItem: 'Anything the business owes beyond what the valuation captured',
    ownerPrompt: 'Does the business owe anything we have not already talked about?',
    substance: null,
    factor: null,
    closes: 'fact',
  },

  // --- ASSETS (rank 9) --------------------------------------------------------------------------
  //
  // Every item here carries `factor: null`, and that is the mapping working rather than failing.
  // Assets belong in the handover document and are priced separately as the walk-away figure; they
  // do not move the MULTIPLE. Forcing an area→factor map is what would have hidden this.
  {
    key: 'assets.owned',
    area: 'assets',
    required: true,
    buyerItem: 'What the business owns outright',
    ownerPrompt: 'What does the business own outright?',
    substance: {
      tests: ['names the significant items rather than gesturing at a category'],
      weakExample: 'the usual gear',
      strongExample: 'Two utes owned outright, the trailer, and about $40k of tools and plant',
      coaching:
        'A buyer needs the list, not the category. What are the significant things, roughly?',
    },
    factor: null,
    closes: 'fact',
  },
  {
    key: 'assets.financed',
    area: 'assets',
    required: true,
    buyerItem: 'What is financed or leased, and what is still owing',
    ownerPrompt: 'What is on finance or lease, and roughly what is left owing?',
    substance: {
      tests: ['distinguishes financed from owned', 'gives a rough balance or term remaining'],
      weakExample: 'a couple of things are on finance',
      strongExample: 'The newer ute has about $22k left, two years to run. Nothing else is financed.',
      coaching:
        'Which ones, and roughly how much is left? This comes straight off what a buyer will pay, so it is better in your words than found later.',
    },
    factor: null,
    closes: 'fact',
  },
  {
    key: 'assets.personally-held',
    area: 'assets',
    required: true,
    buyerItem: 'What is held in the owner\'s name or super fund rather than the business',
    ownerPrompt: 'Is anything the business uses actually held in your name, or your super fund?',
    substance: {
      tests: ['answers specifically about personal or SMSF ownership', 'names what, where yes'],
      weakExample: 'it\'s all pretty mixed up',
      strongExample: 'The yard is in the super fund and the business pays it rent. My own ute is in my name.',
      coaching:
        'This one surprises people at the worst moment, when a buyer finds it in diligence. Is anything the business relies on actually yours or your fund\'s?',
    },
    factor: null,
    closes: 'fact',
  },
  {
    key: 'assets.premises',
    area: 'assets',
    required: true,
    buyerItem: 'The premises: owned or leased, term remaining, and whether the lease transfers',
    ownerPrompt: 'The yard or workshop — owned or leased, how long is left, and does it transfer on a sale?',
    substance: {
      tests: [
        'says owned or leased',
        'gives term remaining where leased',
        'addresses whether it transfers, or says that is unknown',
      ],
      weakExample: 'we rent the yard',
      strongExample: 'Leased, three years left with a three-year option, and the landlord has to consent to an assignment — I have not asked him',
      coaching:
        'How long is left, and does it survive a sale? A lease a buyer cannot inherit changes the deal, and "I have not asked" is a perfectly good answer to record.',
    },
    factor: null,
    closes: 'fact',
  },
  {
    key: 'assets.replacement-due',
    area: 'assets',
    required: false,
    buyerItem: 'Anything due for replacement in the next couple of years',
    ownerPrompt: 'Anything that will need replacing in the next year or two?',
    substance: null,
    factor: null,
    closes: 'fact',
  },
  {
    key: 'assets.deferred-maintenance',
    area: 'assets',
    required: false,
    buyerItem: 'Deferred maintenance a buyer would notice',
    ownerPrompt: 'Anything you have been putting off that someone would notice?',
    substance: null,
    factor: null,
    closes: 'fact',
  },

  // --- SYSTEMS & RECORDS (rank 10) --------------------------------------------------------------
  {
    key: 'systems.software',
    area: 'systems',
    required: true,
    buyerItem: 'What software the business runs on — accounting, jobs, payroll, CRM',
    ownerPrompt: 'What does the business actually run on — accounting, job management, payroll?',
    substance: {
      tests: ['names actual products rather than categories'],
      weakExample: 'we use accounting software',
      strongExample: 'Xero for the books, simPRO for jobs and scheduling, payroll runs through Xero too, and everything else is email',
      coaching:
        'Which ones by name? This one has a second use — it tells me where your records already live, so I know what I can help you reach.',
    },
    factor: 'systems',
    closes: 'fact',
  },
  {
    key: 'systems.admin-access',
    area: 'systems',
    required: true,
    buyerItem: 'Who has admin access to each system',
    ownerPrompt: 'Who has the admin login for each of those?',
    substance: {
      tests: [
        'attaches a person to the systems',
        'is explicit where the owner is the only administrator',
      ],
      weakExample: 'I\'ve got the logins',
      strongExample: 'Xero is me and the bookkeeper, simPRO is me and Sam, the domain is only me',
      coaching:
        'If you are the only one, that is worth saying plainly — it is one of the quieter ways a business stops when the owner does. Who else can get in?',
    },
    factor: 'ownerDependence',
    closes: 'change',
  },
  {
    key: 'systems.file-location',
    area: 'systems',
    required: true,
    buyerItem: 'Where the business\'s files actually live',
    ownerPrompt: 'Where do the files actually live — quotes, photos, certificates?',
    substance: {
      tests: ['names an actual location rather than saying files exist'],
      weakExample: 'they\'re all saved',
      strongExample: 'Quotes and invoices in Google Drive, site photos on my phone, certificates in a folder in the office',
      coaching:
        'Saved where? A buyer is buying the records as much as the tools, and "on my phone" is a real and common answer worth recording.',
    },
    factor: 'systems',
    closes: 'fact',
  },
  {
    key: 'systems.ip-ownership',
    area: 'systems',
    required: true,
    buyerItem: 'Whether the domain, brand and IP are owned by the business or by the owner personally',
    ownerPrompt: 'The domain name and the business name — are they in the business\'s name or yours?',
    substance: {
      tests: ['answers ownership specifically, business or personal', 'covers the domain and the trading name'],
      weakExample: 'it\'s all ours',
      strongExample: 'The domain is registered to me personally, the business name is on the ABN, and there is no trade mark',
      coaching:
        'Registered to which — you, or the company? These are commonly in the founder\'s own name and it is a straightforward thing to fix once it is known.',
    },
    factor: null,
    closes: 'fact',
  },
  {
    key: 'systems.written-vs-habit',
    area: 'systems',
    required: false,
    buyerItem: 'What is written down versus what is habit',
    ownerPrompt: 'What is genuinely written down, and what is just how you have always done it?',
    substance: null,
    factor: 'systems',
    closes: 'document',
  },
  {
    key: 'systems.access-if-unavailable',
    area: 'systems',
    required: false,
    buyerItem: 'What happens to system access if the owner is unavailable',
    ownerPrompt: 'If you were off for a month, could anyone get to what they needed?',
    substance: null,
    factor: 'ownerDependence',
    closes: 'change',
  },

  // --- DEMAND (rank NULL — see below) -----------------------------------------------------------
  //
  // ⚠️ EVERY DEMAND ITEM CARRIES `factor: null`, DELIBERATELY. `areas.ts` gives Demand a null rank
  // and says a scorer "must refuse a null rank loudly rather than multiply it by zero and produce a
  // confident number over a question nobody answered". So Demand gets a coverage band like every
  // other area and contributes NOTHING to the price until that rank is decided. Coverage yes, price
  // no — and the absence is recorded here rather than silently defaulting to a weight.
  {
    key: 'demand.sources',
    area: 'demand',
    required: true,
    buyerItem: 'The main sources of new work, roughly ranked',
    ownerPrompt: 'Where does new work actually come from?',
    substance: {
      tests: ['names sources rather than saying work comes in', 'gives a rough sense of which matters most'],
      weakExample: 'word of mouth mostly',
      strongExample: 'Most of it is repeat builders, then referrals from those builders, and maybe one a month off the website',
      coaching:
        'Word of mouth from whom? A buyer wants to know whether that referral network is the business\'s or yours.',
    },
    factor: null,
    closes: 'fact',
  },
  {
    key: 'demand.comes-to-owner',
    area: 'demand',
    required: true,
    buyerItem: 'Whether new work comes to the owner by name',
    ownerPrompt: 'When someone rings, are they asking for you by name or for the business?',
    substance: {
      tests: ['answers the personal-versus-business question directly'],
      weakExample: 'they just ring the office',
      strongExample: 'Nearly all of them ask for me. The builders have my mobile, not the office number.',
      coaching:
        'Do they ask for you, or for the business? This is one of the biggest single things a buyer prices, and most owners underestimate it.',
    },
    factor: null,
    closes: 'change',
  },
  {
    key: 'demand.repeat-split',
    area: 'demand',
    required: false,
    buyerItem: 'The split between repeat and new work',
    ownerPrompt: 'Roughly how much is repeat customers versus new ones?',
    substance: null,
    factor: null,
    closes: 'fact',
  },
  {
    key: 'demand.marketing',
    area: 'demand',
    required: false,
    buyerItem: 'What marketing exists, and who runs it',
    ownerPrompt: 'Is there any marketing, and who looks after it?',
    substance: null,
    factor: null,
    closes: 'fact',
  },
] as const;

// --- Lookups ---------------------------------------------------------------------------------

export function itemsForArea(area: AreaKey): ChecklistItem[] {
  return CHECKLIST.filter((i) => i.area === area);
}

export function requiredItemsForArea(area: AreaKey): ChecklistItem[] {
  return CHECKLIST.filter((i) => i.area === area && i.required);
}

export function itemByKey(key: string): ChecklistItem | null {
  return CHECKLIST.find((i) => i.key === key) ?? null;
}

/** Items that evidence a given valuation factor. The rollup in `evidenced-readiness.ts` reads this. */
export function itemsForFactor(factor: FactorKey): ChecklistItem[] {
  return CHECKLIST.filter((i) => i.factor === factor);
}

/**
 * Items whose gap can only close by the business changing — the pathway candidates.
 *
 * Kept as a function rather than a second hand-maintained list, because the two would drift and the
 * drift would be invisible: a pathway offered for an item that closes with a sentence is merely
 * annoying, but an item that NEEDS one and is missing from the list simply never gets offered, and
 * nothing anywhere would say so.
 */
export function pathwayItems(): ChecklistItem[] {
  return CHECKLIST.filter((i) => i.closes === 'change');
}
