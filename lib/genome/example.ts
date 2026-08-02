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

export interface GenomeSection {
  key: string;
  title: string;
  /** The due-diligence question this section answers. */
  question: string;
  /** 0-100. What share of this area is on the page rather than only in his head. */
  coverage: number;
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
    coverage: 78,
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
    coverage: 54,
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
    coverage: 41,
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
    coverage: 83,
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
    ],
    stillOnlyInYourHead: ['Whether the Reece pricing survives a change of owner — it has never been tested'],
  },
  {
    key: 'compliance',
    title: 'Licences, insurance and the calendar',
    question: 'What must not lapse, and who is watching it?',
    coverage: 92,
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
    ],
    stillOnlyInYourHead: [],
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
    coverage: 22,
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
    ],
    stillOnlyInYourHead: [
      'The informal arrangement with the council inspector about scheduling',
      'Why the business does not take on strata work',
      'What the owner would tell a buyer to never change',
    ],
  },
];

/** Overall coverage — the headline number, and the thing that moves as the Genome fills in. */
export function overallCoverage(sections: GenomeSection[] = EXAMPLE_GENOME): number {
  if (!sections.length) return 0;
  return Math.round(sections.reduce((sum, s) => sum + s.coverage, 0) / sections.length);
}
