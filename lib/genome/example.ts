// A worked example of a Business Genome.
//
// "We promise, they see." The Genome is the product's whole promise — getting what is in the owner's
// head onto the page — and until now it was a word on the landing page with no surface behind it. A
// 66-year-old is being asked for $999/month for a deliverable he has never laid eyes on.
//
// This is a REAL-SHAPED example, not lorem ipsum, and it is labelled as an example everywhere it
// appears. It is deliberately a plumbing business: the ICP's trade, and the exact word the industry
// matcher used to fail on.
//
// The sections are the questions a BUYER'S ADVISOR asks in due diligence, not categories we invented.
// That is the point — the Genome is worth paying for because it answers the questions that otherwise
// stall a sale for months.

export type Confidence = 'confirmed' | 'captured' | 'thin';

export interface GenomeEntry {
  title: string;
  detail: string;
  /** confirmed = the owner has read it back and agreed; captured = Kira has it but unconfirmed. */
  confidence: Confidence;
  capturedFrom: string;
}

/** Mirrors derive.ts:186 — the product's own coverage vocabulary. */
export type CoverageBand = 'empty' | 'thin' | 'building' | 'covered';

export interface GenomeSection {
  key: string;
  title: string;
  /** The due-diligence question this section answers. */
  question: string;
  /**
   * THE SAME FOUR BANDS THE PRODUCT EMITS (`derive.ts:186`), not a percentage.
   *
   * This was `0-100`. The real Genome has never produced a percentage for an area, so a prospect
   * was shown "78%" here and would get "building" on his own account — the example promising a
   * precision the product cannot deliver, on the one page he sees before he pays.
   */
  coverage: CoverageBand;
  entries: GenomeEntry[];
  /** Named, specific gaps — the honest half. */
  stillOnlyInYourHead: string[];
}

export const EXAMPLE_BUSINESS = {
  name: 'A plumbing business, 31 years old, 9 staff',
  note: 'An example Genome, built from the kind of conversations Kira has week to week.',
};

export const EXAMPLE_GENOME: GenomeSection[] = [
  {
    key: 'demand',
    title: 'Where the work comes from',
    question: 'Where does revenue come from, and does it depend on the owner?',
    coverage: 'covered',
    entries: [
      {
        title: 'Three builders supply roughly 60% of turnover',
        detail:
          'Hartley Constructions, Vaughan Homes and Ridge Developments. All three came through the owner personally; ' +
          'Hartley since 1998. None are on a written contract — work is allocated by a phone call to the owner, usually on a Friday.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 12 March',
      },
      {
        title: 'Domestic work arrives by phone and word of mouth',
        detail:
          'No advertising spend. The office mobile diverts to the owner after 5pm and on weekends, which is when roughly ' +
          'a third of domestic jobs are booked.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 12 March',
      },
      {
        title: 'Maintenance contracts with two aged-care facilities',
        detail: 'Annual, renewed each June. Renewal has never been competitive — both are handled by the owner directly.',
        confidence: 'captured',
        capturedFrom: 'Conversation, 2 April',
      },
    ],
    stillOnlyInYourHead: [
      'Why the fourth builder stopped calling in 2023 — and whether that relationship is recoverable',
      'Which domestic suburbs are worth travelling to and which are not',
    ],
  },
  {
    key: 'pricing',
    title: 'How work is priced and quoted',
    question: 'Can someone else quote a job and get the same number?',
    coverage: 'covered',
    entries: [
      {
        title: 'Standard hourly rates, by job type',
        detail:
          'Maintenance $135/hr, new build $118/hr (volume), after-hours $210/hr first hour then $135. ' +
          'Apprentice time charged at $65 and not billed separately on builder work.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 19 March',
      },
      {
        title: 'The builder discount is not written anywhere',
        detail:
          'Hartley gets roughly 12% off list and 45-day terms. The owner describes this as "what we agreed years ago". ' +
          'It is not in the accounting system, not on the quote template, and nobody else knows the figure.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 19 March',
      },
      {
        title: 'Quoting rule of thumb for bathroom renovations',
        detail: 'Fixtures at cost plus 22%, labour estimated at 1.4× the plumber\'s own first guess. "It is always worse than it looks."',
        confidence: 'captured',
        capturedFrom: 'Conversation, 7 May',
      },
    ],
    stillOnlyInYourHead: [
      'When to walk away from a job — the owner has a clear instinct and has never articulated the rule',
      'How variations are priced once work has started',
    ],
  },
  {
    key: 'operations',
    title: 'How the work actually gets done',
    question: 'Does the business run without the owner on site?',
    coverage: 'covered',
    entries: [
      {
        title: 'Two crews, allocated each morning by the owner',
        detail:
          'Allocation is done from memory at about 6:15am, balancing who is closest, who works well with whom, and ' +
          'which jobs the owner does not trust to the newer crew.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 26 March',
      },
      {
        title: 'Compliance sign-off is the owner\'s licence',
        detail:
          'Every certificate of compliance is issued under the owner\'s licence number. No other staff member holds the ' +
          'licence class required. This is the single largest transferability constraint in the business.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 26 March',
      },
      {
        title: 'The Thursday run sheet, and who builds it',
        detail:
          'Jobs for the following week are allocated on Thursday afternoon from the whiteboard in the office. Since '
          + 'March this has been done by Karen with the owner reviewing it, rather than by the owner from memory. Two '
          + 'weeks in the last six months needed no changes at all.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 5 June',
      },
      {
        title: 'What happens when a job goes wrong on site',
        detail:
          'The apprentice calls Danny, not the owner. Danny has authority to spend up to $2,000 to keep a job moving '
          + 'without asking. Written down in May after the Ridge job stalled for a day waiting on a phone call.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 22 May',
      },
    ],
    stillOnlyInYourHead: [
      'Which jobs the newer crew is not ready for, and what would make them ready',
      'The morning allocation logic — currently unwritten and done from memory',
    ],
  },
  {
    key: 'cash',
    title: 'Money in, money out and terms',
    question: 'What do the input costs depend on, and are they portable?',
    coverage: 'covered',
    entries: [
      {
        title: 'Reece account since 1996, negotiated pricing',
        detail: 'Roughly 18% below trade list on regular lines. The rep visits quarterly. Account is in the business name, not the owner\'s.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 2 April',
      },
      {
        title: 'Two backup suppliers used for stock outages only',
        detail: 'Tradelink for urgent, a local independent for anything unusual. Neither has negotiated pricing.',
        confidence: 'captured',
        capturedFrom: 'Conversation, 2 April',
      },
      {
        title: 'Who chases, and at what point',
        detail:
          'Karen runs the aged debtors on the first Monday of the month and calls anything over 45 days. The owner is '
          + 'only involved above 60 days or over $10,000. Before February he made every one of those calls himself.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 5 June',
      },
    ],
    stillOnlyInYourHead: ['Whether the Reece pricing survives a change of owner — it has never been tested'],
  },
  {
    key: 'compliance',
    title: 'Licences, insurance and the calendar',
    question: 'What must not lapse, and who is watching it?',
    coverage: 'covered',
    entries: [
      {
        title: 'Plumbing licence, public liability, workers comp — all current',
        detail: 'Renewal dates are 14 March, 30 June and 30 June. All three renew from the owner\'s personal email inbox.',
        confidence: 'confirmed',
        capturedFrom: 'Documents + conversation, 14 April',
      },
      {
        title: 'Two apprentices mid-indenture',
        detail: 'Completion dates November and the following March. TAFE reporting handled by the office manager.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 14 April',
      },
      {
        title: 'The renewal calendar, and who watches it',
        detail:
          'Plumbing licence, two vehicle registrations, public liability and workers compensation, with renewal dates '
          + 'and the broker’s contact. Karen holds the calendar; the owner is copied. Nothing has lapsed since it was '
          + 'written down.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 18 June',
      },
    ],
    stillOnlyInYourHead: [],
  },
  {
    // ADDED 2026-08-03 with `assets` and `systems`. The example showed SIX areas after the model
    // moved to NINE, so the one page a buyer looks at to see what he is paying for asserted a shape
    // the product had abandoned — and the three it omitted are precisely the ones a due-diligence
    // list starts with. `areas.test.ts` pins GENOME_AREAS at 9; nothing pinned this file to it.
    key: 'people',
    title: 'Who does the work',
    question: 'Who is critical, how long have they been with you, and who would leave on announcement?',
    coverage: 'covered',
    entries: [
      {
        title: 'Two of the nine are load-bearing, and only one has a contract',
        detail:
          'The leading hand has been here 19 years and runs the two-man maintenance crew without being asked. He has no written agreement and no restraint. The office manager has both.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 22 April',
      },
      {
        title: 'Apprentice pipeline is deliberate, not accidental',
        detail:
          'Two apprentices at any time, taken from the same TAFE campus, on a rotation the owner set up after a bad hire in 2019.',
        confidence: 'captured',
        capturedFrom: 'Conversation, 22 April',
      },
      {
        title: 'Who would leave if the business changed hands',
        detail:
          'The owner believes Danny stays and the second-year apprentice follows him. Karen has said she would retire '
          + 'rather than learn a new system. None of this is in any file, and all three are load-bearing.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 18 June',
      },
    ],
    stillOnlyInYourHead: [
      'Which of the nine would follow the leading hand if he left',
      'What the owner would pay to keep him through a sale',
    ],
  },
  {
    key: 'assets',
    title: 'What the business owns',
    question: 'What do you own, what do you lease, and what is held in your own name?',
    coverage: 'covered',
    entries: [
      {
        title: 'Four vans owned outright, one on finance until 2027',
        detail:
          'Service history is with the mechanic, not on file. The financed van is the newest and the only one under warranty.',
        confidence: 'captured',
        capturedFrom: 'Conversation, 6 May',
      },
      {
        title: 'The yard is leased from a family trust the owner controls',
        detail:
          'Related-party lease, three years to run, currently under market. A buyer inherits the rate only if the lease transfers — which has never been tested.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 6 May',
      },
      {
        title: 'What is owned, financed, and held personally',
        detail:
          'Three utes and the trailer are owned outright; the 2023 ute is financed with 19 months remaining. The yard '
          + 'is held in the owner’s super fund and leased to the business at below market rent — which a buyer will '
          + 'normalise, and which is not in these figures.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 2 July',
      },
    ],
    stillOnlyInYourHead: [
      'Which plant is near end of life and what replacing it costs',
      'Whether the yard lease survives a change of control',
    ],
  },
  {
    key: 'systems',
    title: 'What is run by them, and what they can tell you',
    question: 'Where do your records live, who can reach them, and what is written down?',
    coverage: 'covered',
    entries: [
      {
        title: 'Jobs are scheduled in a whiteboard photo, sent nightly',
        detail:
          'The owner photographs the yard whiteboard each evening and sends it to the crew. There is no job-management system; the photo is the schedule.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 13 May',
      },
      {
        title: 'Accounts are in Xero; everything else is in the owner\'s email',
        detail:
          'The bookkeeper has Xero access. Quotes, variations and supplier agreements live in a personal inbox nobody else can search.',
        confidence: 'confirmed',
        capturedFrom: 'Documents + conversation, 13 May',
      },
      {
        title: 'Where everything lives, and who can reach it',
        detail:
          'Accounts in Xero, jobs in simPRO, photographs on the office machine and on the owner’s phone. Karen and the '
          + 'owner hold admin on both systems; nobody else does. The domain and the business email were registered in '
          + 'the owner’s personal name in 2009 and have not been moved.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 2 July',
      },
    ],
    stillOnlyInYourHead: [
      'Which supplier agreements exist in writing and where they are',
      'The pricing spreadsheet\'s formulas, which only the owner can explain',
    ],
  },
  {
    // WAS 'Things only you know'. That stopped being a section when the nine-area model made
    // owner-dependence a per-fact AXIS instead of a place — it had become a bucket holding half the
    // Genome. Both entries below are about CUSTOMERS, which is where they belong, and they are also
    // the two most persuasive lines on this page: exactly the kind of thing that only exists in an
    // owner's head, now filed where a buyer's advisor would look for it.
    key: 'customers',
    title: 'Who buys, and who owns the relationship',
    question: 'Revenue by customer, concentration, and who owns each relationship.',
    coverage: 'covered',
    entries: [
      {
        title: 'Which customers pay and which need chasing',
        detail:
          'The owner can name, without looking, the six accounts that always pay late and the two that must be ' +
          'phoned rather than emailed. None of this is in the accounting system.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 30 April',
      },
      {
        title: 'The history behind the Hartley relationship',
        detail:
          'A job in 2004 that went badly and was fixed at the business\'s own cost. The owner believes this is why the ' +
          'work has never gone to tender. A buyer would have no way of knowing this mattered.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 30 April',
      },
      {
        title: 'Revenue by customer, three years, and who owns each one',
        detail:
          'Hartley 34%, Vaughan 16%, Ridge 11%, the two aged-care contracts 9% between them, domestic the remainder. '
          + 'Hartley and the aged-care contracts are owned by the owner personally; Vaughan and Ridge have been handled '
          + 'by Danny since last October and have not asked for the owner since.',
        confidence: 'confirmed',
        capturedFrom: 'Conversation, 12 June',
      },
    ],
    stillOnlyInYourHead: [
      'The informal arrangement with the council inspector about scheduling',
      'Why the business does not take on strata work',
      'What the owner would tell a buyer to never change',
    ],
  },
];

/** Overall coverage — the headline number, and the thing that moves as the Genome fills in. */
/**
 * The example's headline number, in THE PRODUCT'S metric.
 *
 * This was `overallCoverage` — the mean of nine invented percentages, rendered as "X%" under
 * "On the page, not in your head" and captioned "This is the number that moves". The product's
 * actual headline is **Transferability /100** (business-valuation:1094, my-genome:86), so the one
 * page a prospect sees before paying taught him a second scale that does not exist, and then his
 * own account showed him a different number under a different name. Same metric, same scale,
 * DERIVED from the bands rather than asserted beside them.
 */
export function exampleTransferability(sections: GenomeSection[] = EXAMPLE_GENOME): number {
  if (!sections.length) return 0;
  const points: Record<CoverageBand, number> = { covered: 100, building: 66, thin: 33, empty: 0 };
  return Math.round(sections.reduce((sum, s) => sum + points[s.coverage], 0) / sections.length);
}
