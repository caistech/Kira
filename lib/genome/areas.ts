// lib/genome/areas.ts
//
// THE NINE AREAS, AS DATA. The canonical model is `docs/GENOME_BUYER_FORMAT.md` §3.2–3.3; this is
// that decision in a form the code can read.
//
// WHY DATA AND NOT PROSE. §3.1 commits us to asserting a ranking and then asking brokers to re-order
// it. That obliges the order to be CHEAP TO CHANGE — "it lives as data the scorecard reads, never as
// the sequence sections happen to be written in. When a broker moves a row, that is a config change
// and a re-score, not a rebuild." A ranking that only exists as the order of a markdown table is the
// one shape that makes a broker's re-order a rewrite, which is exactly what this file prevents.
//
// WHERE THE NINE CAME FROM. Bottom-up from ~140 flows in `orchestrator/TASK_REGISTRY.md`, collapsed
// into areas a broker recognises — not invented. The `flowGroups` on each area is that provenance,
// kept so the derivation can be re-checked rather than taken on trust.
//
// WHAT IS DELIBERATELY *NOT* AN AREA. Three of §3.1's ten ranks cannot be areas by the document's own
// reasoning, and each absence is load-bearing:
//   - rank 2, OWNER DEPENDENCE — it is the AXIS, measured per area (`owner_dependent` on the row),
//     not a place to file things. Filing it as a section is what produced "Things only you know",
//     which became a bucket holding 115 of 233 rows on one account.
//   - rank 3, FINANCIAL INTEGRITY — explicitly not our job. The accountant produces the statements;
//     our contribution is separating personal from business, which is something only the owner knows.
//   - rank 8, SUPPLIERS — folded into Cash & working capital, which is where the flow registry puts
//     money-out and supply.

/** The five places an area's truth can live, worst to best. §3.2 "No area is ever EMPTY." */
export const LOCATIONS = [
  {
    key: 'head',
    label: "the owner's head",
    writtenDown: false,
    reachableByOthers: false,
    verifiable: false,
    // Not a gap to be recorded — the product itself. Everything above this rung is a thing she can
    // offer to DO, which is what stops an empty area reading as a report card.
    moveUp: 'talk to her — this is the product',
  },
  { key: 'paper', label: 'paper, filing cabinet', writtenDown: true, reachableByOthers: false, verifiable: false, moveUp: 'scan it' },
  { key: 'local', label: 'a local machine', writtenDown: true, reachableByOthers: false, verifiable: false, moveUp: 'upload it' },
  { key: 'own-cloud', label: 'his own cloud', writtenDown: true, reachableByOthers: true, verifiable: true, moveUp: 'grant access' },
  { key: 'third-party', label: 'a third-party system', writtenDown: true, reachableByOthers: true, verifiable: true, moveUp: 'already there' },
] as const;

export type LocationKey = (typeof LOCATIONS)[number]['key'];

export interface GenomeArea {
  key: string;
  /** What the owner sees. Plain English — he is 66 and allergic to jargon. */
  title: string;
  /** What a buyer is trying to find out. §3.1's "what the buyer wants VISIBILITY of". */
  buyerQuestion: string;
  /**
   * What the owner can DO with this area's data, today.
   *
   * ✅ OFFERED, NEVER SCORED (§3.2, decided 2026-08-02). This is not a fourth axis on the scorecard —
   * an invented "usability %" is the same class of fabrication as the hand-authored figures on the
   * public example. It is the trigger for an OFFER, which is how she earns the conversation that
   * produces the buyer-facing record.
   *
   * Null where the operator did not give one; the absence is honest and must not be filled in by
   * whoever reads this next.
   */
  ownerQuestion: string | null;
  /**
   * Its weight, from §3.1's buyer-priority ranking. LOWER IS MORE VALUABLE (1 = biggest discount).
   *
   * `null` is NOT "unimportant" — see DEMAND below. It means no rank has been decided, and a scorer
   * must say so rather than treat it as zero.
   */
  rank: number | null;
  /** Which flow groups in the task registry this was collapsed from. Provenance, not decoration. */
  flowGroups: string[];
  /**
   * Where this area's truth NORMALLY comes from — and it changes what an empty area means.
   *
   * §3.2: "The four new areas are SOURCE gaps, not conversational ones. They are empty not because he
   * has not talked, but because their truth lives in a system or a document rather than in a
   * conversation."
   *
   * This is not a nicety. The page tells an owner that an empty area is *"still only in your head —
   * today only you can answer it"*, which is a fair default for how he prices a job. Said about his
   * ASSETS it is simply false: the depreciation schedule is at his accountant's, the insurance
   * certificates are in a filing cabinet. Asserting it is in his head is a claim nobody checked, and
   * the owner knows it is wrong the moment he reads it — which costs more than saying nothing.
   *
   * `system` areas therefore get an honest "we have not been shown where this lives yet" instead of
   * a confident claim about his head. Once §3.3's location model has real data (it needs the
   * onboarding scope question), this coarse split is replaced by the actual answer per area.
   */
  truthLivesIn: 'conversation' | 'system';
}

export const GENOME_AREAS: readonly GenomeArea[] = [
  {
    key: 'demand',
    title: 'Where the work comes from',
    buyerQuestion: 'Where does work come from, and does it come to him personally?',
    ownerQuestion: 'What is the demand for our products and services, and how do we increase sales from the data we already hold?',
    // ⚠️ DELIBERATELY NULL, AND IT IS AN OPEN DECISION — not an oversight, and not a zero.
    //
    // Demand is marketing and sales. Nothing in §3.1's ten ranks is lead generation: rank 1 is
    // revenue concentration and who owns each relationship, which is CUSTOMERS. So under
    // ranking-as-weighting this area has no counterpart and would silently contribute nothing.
    //
    // That may even be right — what a buyer actually wants from Demand is "does work come to HIM",
    // which is owner-dependence applied to Demand rather than a department in its own right. But it
    // has to be DECIDED, so a scorer must refuse a null rank loudly rather than multiply it by zero
    // and produce a confident number over a question nobody answered.
    rank: null,
    flowGroups: ['4.1 Getting attention'],
    truthLivesIn: 'conversation',
  },
  {
    key: 'pricing',
    title: 'How work is priced and quoted',
    buyerQuestion: 'Could someone else reach his number?',
    ownerQuestion: 'How do we determine price — and what do we know about the competition?',
    rank: 4,
    flowGroups: ['4.2 Scoping and quoting', '4.7 Catalogue and pricing ops'],
    truthLivesIn: 'conversation',
  },
  {
    key: 'operations',
    // Renamed from `delivery` 2026-08-02: "the HOW of the business — we sell the WHAT to WHO, and
    // this is how we deliver it." Sending out a machine and an operator; packaging and couriering a
    // product; shipping software.
    title: 'How the work actually gets done',
    buyerQuestion: 'Does the work happen without him on site?',
    ownerQuestion: null,
    rank: 5,
    flowGroups: ['4.3 Winning and setting up', '4.4 Delivering', '4.8 Fulfilment'],
    truthLivesIn: 'conversation',
  },
  {
    key: 'cash',
    title: 'Money in, money out and terms',
    buyerQuestion: 'Who chases, who approves, what are the terms — and are supplier terms personal to him?',
    ownerQuestion: 'Where do we stand, what are our margins, and what can we do with the information we have?',
    // Rank 8 (Suppliers & inputs), not rank 3. Rank 3 is financial integrity and is explicitly not
    // our job: the accountant produces the statements, and what this area holds is what the business
    // DOES with them plus whether the terms travel with the entity.
    rank: 8,
    flowGroups: ['4.5 Money in', '4.6 Money out and supply'],
    truthLivesIn: 'conversation',
  },
  {
    key: 'customers',
    title: 'Who buys, and who owns the relationship',
    buyerQuestion: 'Revenue by customer over three years, concentration, and who owns each relationship.',
    ownerQuestion: 'How do we use that data to increase sales and margins?',
    // The single biggest discount a buyer applies, and the highest-value question in it — who owns
    // each relationship — has no system anywhere that answers it. That is not an integration gap; it
    // is precisely what Kira exists to capture.
    rank: 1,
    flowGroups: ['4.9 Keeping the client'],
    truthLivesIn: 'system',
  },
  {
    key: 'people',
    title: 'Who does the work',
    buyerQuestion: 'Who is actually critical, tenure, contracts and restraints, who leaves on announcement.',
    ownerQuestion: 'Can we leverage them for greater productivity, sales, efficiency?',
    rank: 6,
    flowGroups: ['4.10 People', '4.11 Contractors'],
    truthLivesIn: 'system',
  },
  {
    key: 'assets',
    title: 'What the business owns',
    buyerQuestion: 'Owned vs leased vs personally held; deferred maintenance; whether the premises lease transfers.',
    ownerQuestion: null,
    rank: 9,
    flowGroups: ['4.12 Assets, fleet and equipment'],
    truthLivesIn: 'system',
  },
  {
    key: 'compliance',
    title: 'Licences, insurance and the calendar',
    buyerQuestion: 'The obligations calendar and who watches it; change-of-control clauses; anything in dispute.',
    // "What insurances do we hold, and what certificates, licences and regulatory artefacts do we
    // NEED and HAVE." ⚠️ The need half is a GAP ANALYSIS and a different risk class from the have
    // half: asserting which licences a business like his MUST hold is a claim about regulatory
    // obligation, and per DATA_STANDARD it wants an authoritative citable source — never inference.
    ownerQuestion: 'What insurances do we hold, and what certificates and licences do we need and have?',
    rank: 7,
    flowGroups: ['4.13 Obligations'],
    truthLivesIn: 'conversation',
  },
  {
    key: 'management',
    // ⚠️ SYSTEMS, NOT PEOPLE. §3.1 rank 10 is "Systems, data & IP" and the operator's definition is
    // explicit: "this is not people, this is management systems — what is run by them, and what can
    // they tell us." A rename to `Systems & records` is PROPOSED and not decided; the title below is
    // worded to carry the meaning either way, so nobody reads this as people-management.
    title: 'Where the records live',
    buyerQuestion: 'Where records live, who has access, what is documented, and whether the IP is owned by the entity.',
    ownerQuestion: null,
    // The quiet one: it determines whether everything above it can be verified at all.
    rank: 10,
    flowGroups: ['4.14 Running the thing', '4.15 Data hygiene'],
    truthLivesIn: 'system',
  },
] as const;

export type AreaKey = (typeof GENOME_AREAS)[number]['key'];

export const AREA_KEYS: readonly string[] = GENOME_AREAS.map((a) => a.key);

/**
 * The old six sections, mapped forward.
 *
 * §3 calls the nine "a widening, not a rewrite" — five of the six map straight across, which is what
 * makes the re-classification a review rather than a re-derivation. `only-you` is the exception and
 * is deliberately absent: it stops being a PLACE and becomes the per-row `owner_dependent` axis, so
 * a row carrying it has to be re-filed into the area it is really about. Mapping it to any single
 * area here would silently reinstate the bucket this model exists to remove.
 */
export const LEGACY_SECTION_MAP: Readonly<Record<string, AreaKey>> = {
  'work-in': 'demand',
  pricing: 'pricing',
  delivery: 'operations',
  suppliers: 'cash',
  obligations: 'compliance',
};

/** Look one up, or null. Never throws — an unknown key on an old row is data, not a crash. */
export function areaFor(key: string | null | undefined): GenomeArea | null {
  if (!key) return null;
  return GENOME_AREAS.find((a) => a.key === key) ?? null;
}

/**
 * Areas in the order a BUYER cares about, most-discounting first.
 *
 * Unranked areas sort last and keep their declared order. They are NOT dropped: an area missing from
 * a buyer-facing document because nobody assigned it a number is the failure mode this ordering is
 * supposed to prevent.
 */
export function areasByRank(): GenomeArea[] {
  return [...GENOME_AREAS].sort((a, b) => (a.rank ?? Number.POSITIVE_INFINITY) - (b.rank ?? Number.POSITIVE_INFINITY));
}
