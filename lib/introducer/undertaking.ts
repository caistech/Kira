// lib/introducer/undertaking.ts
//
// The undertaking every introducer accepts before they can use the channel.
//
// The channel's consent position rests on ONE rule: a broker only sends their link to owners they
// already hold a current listing agreement with. That is what makes their email to an owner an
// ordinary message inside an existing commercial relationship rather than cold marketing — and it
// is the reason the compose-and-hand-off design is defensible.
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
export const UNDERTAKING_VERSION = '2026-07-26.1';

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
    heading: 'You send it, we do not',
    body:
      'Introductions go out from your own email, in your own words, under your own name. We never ' +
      'email an owner on your behalf, and we never contact your clients to sell around you.',
  },
  {
    heading: 'You tell them you have an interest',
    body:
      'When you introduce an owner to Kira, you tell them you are paid a commission if they ' +
      'subscribe. It is a small thing to say and it protects the relationship you have with them.',
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
