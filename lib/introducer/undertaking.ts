// lib/introducer/undertaking.ts
//
// The undertaking every introducer accepts before they can use the channel.
//
// The channel's consent position rests on ONE rule: a broker only sends their link to owners they
// already hold a current listing agreement with. That is what makes their email to an owner an
// ordinary message inside an existing commercial relationship rather than cold marketing — and it
// is what keeps our own first contact clean, because the owner reaches us by opening their broker's
// link and running their own valuation. They come to us; we do not go to them.
//
// The fee clauses (3 and 4) carry the introducer's own regulatory obligations: APES 110 s330 wants
// written disclosure of the fee, its payer and its calculation, and the TPB's conflicts-of-interest
// item wants the amount stated before or when the service is provided. Clause 4 is the one place
// disclosure is not enough — a commission tied to an assurance client is prohibited outright.
// Position + sources: orchestrator/REFERRAL_FEE_POSITION.md.
//
// A rule nobody records is a hope. This is the wording, versioned, so acceptance means something
// specific and a later change of wording forces re-acceptance.
//
// NOT legal advice and not the introducer agreement. It is the operational warranty shown at the
// door; the agreement itself is with the lawyer (BROKER_CHANNEL_BUILD_STATE guardrails).

/**
 * Bump this whenever the wording below changes. Everyone re-accepts on their next visit — an
 * acceptance of superseded terms is not an acceptance of the current ones.
 */
export const UNDERTAKING_VERSION = '2026-07-27.1';

export interface UndertakingClause {
  heading: string;
  body: string;
}

export const UNDERTAKING_CLAUSES: UndertakingClause[] = [
  {
    heading: 'You already act for the owner',
    body:
      'You will only send your Kira link to business owners you currently hold a signed listing or ' +
      'engagement agreement with. Not prospects, not a purchased list, not someone you met once — ' +
      'people who have already engaged you.',
  },
  {
    heading: 'The introduction is yours to make',
    body:
      'Introductions go out from your own email, in your own words, under your own name — we do not ' +
      'email an owner before you have introduced us, and we never approach your clients to sell ' +
      'around you. Once an owner comes to us of their own accord, we deal with them directly: they ' +
      'run their own valuation, we walk them through it, and we look after them from there.',
  },
  {
    heading: 'You tell them what you are paid — in writing',
    body:
      'When you introduce an owner, you tell them in writing that you are paid a commission if they ' +
      'subscribe, who pays it, and how much. That is your professional obligation, not our ' +
      'preference — so we write the wording for you and put it beside your link. Copy it into your ' +
      'own message. Say it at the introduction, not later.',
  },
  {
    heading: 'Not if you audit them',
    body:
      'If you provide audit or review services to an owner, we cannot pay you for introducing them ' +
      '— that is one place disclosure does not fix the problem. Tell us and we will switch the fee ' +
      'off for that introduction or for your whole account. The introduction still works and your ' +
      'dashboard is unchanged; you simply are not paid for it.',
  },
  {
    heading: 'You see progress, never their business',
    body:
      'Your dashboard shows whether an owner has signed up and how their valuation is moving. It ' +
      'will never show you what they discuss with Kira. That is between them and the product, ' +
      'permanently and by design.',
  },
  {
    heading: 'Their details stay theirs',
    body:
      'Anything you learn about an owner through this channel is used to serve that introduction ' +
      'and nothing else.',
  },
];
