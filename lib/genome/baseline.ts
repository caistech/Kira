// lib/genome/baseline.ts
//
// THE BASELINE: what we already know about each of the nine areas before Kira has captured a single
// thing, derived from the eleven questions the owner answered BEFORE he signed up.
//
// WHY THIS EXISTS. An authenticated walkthrough found all nine areas empty on a real account, while
// the seven items that had been captured were Kira's own meta-notes — her connection status and her
// reasoning, one of them recorded three times. A product charging live for a Business Genome was
// showing an owner nine empty boxes and calling it his.
//
// The nine areas were built. The location ladder in `areas.ts` was built. What was missing is the
// thing this file supplies, and `derive.ts` says so in its own comment: *"until §3.3's location
// model has real data this coarse split is the honest version of that."* There has never been any
// real data. Yet the owner answered eleven questions about exactly this before he paid — where the
// systems live, whether the business runs without him, whether revenue is contracted, how
// concentrated his clients are — and none of it reached the Genome.
//
// §3.2's rule is "no area is ever EMPTY, only LOCATED". A baseline is how that rule becomes true on
// day one rather than after weeks of conversation.
//
// WHAT THIS IS NOT. It is not a claim to have captured anything. Every line here is the owner's own
// self-assessment, restated, and it is labelled as such — `source: 'baseline'` — so it can never be
// mistaken for something Kira verified, and so the moment a real fact arrives it takes precedence.
// Presenting a self-reported answer as a captured fact would be the same overclaim in a new costume.
//
// WHY SELF-REPORT IS STILL WORTH SHOWING. Because the alternative on screen is a blank, and a blank
// tells the owner his answers went nowhere. It also gives Kira somewhere honest to start a
// conversation: "you told us the pricing lives in your head — shall we start there?" is a better
// opening than an empty panel.

import type { LocationKey } from './areas';

/** The eleven pre-signup answers, in the shape `business_valuations.inputs` stores them. */
export interface BaselineInputs {
  industry?: string;
  turnover?: number;
  annualProfit?: number;
  tangibleAssets?: number;
  profitTrend?: string;
  marginTrend?: string;
  clientTrend?: string;
  clientConcentration?: string;
  ownerDependence?: string;
  systems?: string;
  recurringRevenue?: string;
}

export interface AreaBaseline {
  /** Nine-area key from `areas.ts`. */
  area: string;
  /** Where this area's truth currently lives, on the LOCATIONS ladder. */
  location: LocationKey;
  /** Plain English, addressed to the owner, in his own words as far as possible. */
  statement: string;
  /** True when the owner's own answer says this one depends on him personally. */
  ownerDependent: boolean;
}

/**
 * `systems` IS a location, almost literally.
 *
 * The question asks where the operating knowledge lives and offers three answers that map onto the
 * bottom, middle and top of the ladder. This is the single highest-value line in the file: it is a
 * direct read on the thing the whole product exists to move, given to us before the owner paid.
 */
function systemsLocation(systems: string | undefined): LocationKey {
  if (systems === 'documented_team') return 'own-cloud';
  if (systems === 'some') return 'local';
  return 'head';
}

/** Owner-dependence is the AXIS, not an area — it qualifies every statement below. */
function isOwnerDependent(ownerDependence: string | undefined): boolean {
  return ownerDependence === 'i_am_the_business' || ownerDependence === 'heavily_involved';
}

const MONEY = (n: number | undefined): string =>
  n == null || !Number.isFinite(n) ? '' : '$' + Math.round(n).toLocaleString();

/**
 * Derive a baseline for each of the nine areas from the pre-signup answers.
 *
 * Areas the eleven questions genuinely say nothing about get NO baseline rather than an invented
 * one — returning eight confident lines and one silence is more trustworthy than nine lines where
 * the ninth was guessed. `derive.ts` renders those as "nobody has shown Kira where this lives yet",
 * which is true, instead of asserting it is in his head, which for an asset register usually is not.
 */
export function deriveBaseline(inputs: BaselineInputs | null | undefined): AreaBaseline[] {
  if (!inputs || typeof inputs !== 'object') return [];

  const loc = systemsLocation(inputs.systems);
  const dependent = isOwnerDependent(inputs.ownerDependence);
  const out: AreaBaseline[] = [];

  // OPERATIONS — the direct read from `systems`.
  out.push({
    area: 'operations',
    location: loc,
    ownerDependent: dependent,
    statement:
      loc === 'head'
        ? 'You told us how the work actually gets done is in your head, not written down.'
        : loc === 'local'
          ? 'You told us some of how the work gets done is written down, and the rest is in your head.'
          : 'You told us the way the work gets done is documented and your team follows it.',
  });

  // PRICING — how you decide what to charge is the classic owner-held judgement, and the question
  // about systems is the best evidence we have about it before Kira asks directly.
  out.push({
    area: 'pricing',
    location: loc === 'own-cloud' ? 'local' : 'head',
    ownerDependent: dependent,
    statement:
      loc === 'own-cloud'
        ? 'Your process is documented, so some of how you price is likely written down — Kira will check what is not.'
        : 'How you decide what to charge is almost certainly yours alone — it usually is, and nothing you told us suggests otherwise.',
  });

  // CUSTOMERS — two of the eleven questions are directly about this.
  if (inputs.clientConcentration || inputs.recurringRevenue) {
    const conc =
      inputs.clientConcentration === 'concentrated'
        ? 'A few clients carry most of your revenue'
        : inputs.clientConcentration === 'moderate'
          ? 'Your revenue leans on a handful of key clients'
          : 'Your revenue is spread across many clients';
    const rec =
      inputs.recurringRevenue === 'strong'
        ? 'and most of it is contracted or repeat.'
        : inputs.recurringRevenue === 'some'
          ? 'and some of it is contracted or repeat.'
          : 'and almost none of it is locked in ahead of time.';
    out.push({
      area: 'customers',
      location: 'head',
      ownerDependent: dependent,
      statement: `${conc} ${rec} Who holds those relationships is the part a buyer asks about first.`,
    });
  }

  // DEMAND — where the work comes from. The client trend is the only signal we have.
  if (inputs.clientTrend) {
    out.push({
      area: 'demand',
      location: 'head',
      ownerDependent: dependent,
      statement:
        inputs.clientTrend === 'expanding'
          ? 'You told us your client base is growing. How that happens — who refers you, what brings work in — is the part worth writing down.'
          : inputs.clientTrend === 'shrinking'
            ? 'You told us your client base is shrinking. Where work used to come from, and what changed, is worth getting on paper.'
            : 'You told us your client base is steady. What keeps it steady is usually a handful of relationships and habits only you can name.',
    });
  }

  // CASH — turnover and profit are facts he gave us, and they are the anchor for everything else.
  if (inputs.turnover || inputs.annualProfit) {
    const t = MONEY(inputs.turnover);
    const p = MONEY(inputs.annualProfit);
    out.push({
      area: 'cash',
      location: 'head',
      ownerDependent: false, // the numbers live with the accountant, not in his head
      statement:
        t && p
          ? `You told us roughly ${t} through the door and about ${p} of that as owner earnings. The statements behind those sit with your accountant; what a buyer needs is the story linking them.`
          : `You gave us ${t || p} as your starting figure. The statements behind it sit with your accountant.`,
    });
  }

  // ASSETS — a figure, and a note about where the register actually lives. Deliberately NOT 'head':
  // telling a 66-year-old his depreciation schedule is in his head is confidently wrong, and he
  // knows it immediately.
  if (inputs.tangibleAssets) {
    out.push({
      area: 'assets',
      location: 'paper',
      ownerDependent: false,
      statement: `You told us about ${MONEY(inputs.tangibleAssets)} of equipment, vehicles and stock. The register and the finance paperwork are usually at the accountant's or in a drawer.`,
    });
  }

  // SYSTEMS — what software the business runs on. The `systems` answer is about documentation rather
  // than tooling, so this is a weaker read and says only what it can defend.
  out.push({
    area: 'systems',
    location: loc === 'own-cloud' ? 'own-cloud' : 'head',
    ownerDependent: dependent,
    statement:
      loc === 'own-cloud'
        ? 'You told us things are documented and the team works to them, so the tools are likely shared rather than personal.'
        : 'Which tools the business actually depends on — and who holds the logins — is not something you have told us yet.',
  });

  // PEOPLE and COMPLIANCE get NO baseline. Nothing in the eleven questions speaks to who does what,
  // or to licences and insurance. Inventing a line for them to avoid a blank is exactly the
  // confident-wrong this file exists to avoid.

  return out;
}
