// lib/privacy.ts
//
// The Privacy Policy, as data — mirroring lib/terms.ts deliberately rather than inventing a second
// shape, so the two legal surfaces render, version and date identically (SHARED_SERVICES
// "convergent shape, then extract": if these ever become a @caistech legal-pages package, it is a
// lift rather than a rewrite).
//
// Written to cais-shared-services/REGULATORY_INCLUSIONS.md I1, from what Kira ACTUALLY does. Three
// sections a generic policy would not contain, and which are the reason this could not be copied
// from a template:
//
//   * "What your introducer can see" — an advisor who introduced you gets a status projection and
//     never your contents. That wall is enforced in SQL (introducer_owner_projection), so it can be
//     stated as fact rather than as a promise. It is also the single thing a business owner is most
//     likely to worry about when a broker they know sends them here.
//   * "What you tell Kira" — the memory loop is the product. Saying "we store conversations" would
//     be true and useless; what matters is that it is a distilled summary, that it is per-user, and
//     that it can be deleted without deleting the account.
//   * "Your valuation figures" — turnover and profit are the most sensitive things a small business
//     owner will type anywhere, and the free valuation asks for them before there is even an
//     account.
//
// NOT legal advice. Operational baseline; a lawyer should review before real volume — same standing
// caveat as lib/terms.ts.

/** Bump on any material change. Mirrors TERMS_VERSION so the two can be reasoned about together. */
export const PRIVACY_VERSION = '2026-08-08.1';

export const PRIVACY_UPDATED = '8 August 2026';

/**
 * The operator. Canonical portfolio identity (portfolio-manifest.yaml `shared:` +
 * PRODUCT_STANDARDS §9) — Kira is a CAS-owned product, so it carries OUR entity. A white-label or
 * distributor product would carry theirs instead; that is the "whose brand travels" gate, and
 * getting it wrong is how our ABN ends up on someone else's marketing.
 */
export const OPERATOR = {
  entity: 'Global Buildtech Australia Pty Ltd',
  tradingAs: 'Corporate AI Solutions',
  abn: '54 672 395 685',
  acn: '672 395 685',
  postal: '76-84 Brunswick Street, Fortitude Valley QLD 4006',
  email: 'legal@corporateaisolutions.com',
} as const;

/**
 * WHO CAN SEE WHAT HE TELLS KIRA — the single sentence, in one place.
 *
 * THE ONE ANSWER THAT MAY NOT VARY, and it varied. Asked in conversation *"I have not told my wife
 * or my staff I am thinking of selling. Who can see what I tell you?"*, Kira answered:
 *
 *     "Only you and I see what you share here. No one else — no accountant, no staff, no one —
 *      has access to these conversations unless you explicitly share them."
 *
 * while this product's own pages said our support team can see what she has captured. One of those
 * is false, and the false one was the reassuring one, said out loud, to a man who had just disclosed
 * something he has not told his wife (Ray, 6 August 2026).
 *
 * It happened because the prompt contained NO confidentiality language at all, so she composed an
 * answer — and an assistant composing an answer to "is this private?" will always compose the
 * comfortable one. The fix is not a better instruction to be careful; it is a sentence she is given.
 *
 * Exported as a constant because it is now consumed in FOUR places — the privacy policy, `/my-genome`,
 * `/plan`, and the agent prompt — and the failure being fixed is precisely those drifting apart. If
 * you are editing this, you are editing what the product promises about confidentiality: change it
 * here, and everything else follows. `confidentiality.test.ts` fails if any surface stops matching.
 *
 * ⚠️ A prompt change does not reach a live agent until the fleet is re-provisioned. Editing this
 * constant changes the pages immediately and the SPOKEN answer not at all until then.
 */
export const WHO_CAN_SEE_IT =
  'Our support team can see what Kira has captured when they need to keep the service running. ' +
  'It is never shared with anyone who referred you, and never shown to a buyer.';

/**
 * The same fact in the second person, for Kira to say aloud.
 *
 * Deliberately a SMALLER claim than the one she was making, and that is the point — "you, and my
 * support people if something breaks" is believable where "no one, no one, no one" is not. Ray's own
 * words: *"That's a smaller claim and I'd have believed it. 'No one, no one, no one' from software
 * is a claim I've heard before and it's never been true."*
 */
export const WHO_CAN_SEE_IT_SPOKEN =
  'You, and the support people here if something breaks and they need to fix it. ' +
  'Not your accountant, not your staff, not whoever introduced us, and never a buyer.';

export interface PrivacySection {
  heading: string;
  paragraphs: string[];
}

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    heading: 'Who we are',
    paragraphs: [
      `Kira is operated by ${OPERATOR.entity} (ABN ${OPERATOR.abn}), trading as ${OPERATOR.tradingAs}, of ${OPERATOR.postal}. We are the organisation responsible for the personal information described here, and you can reach us at ${OPERATOR.email}.`,
    ],
  },
  {
    heading: 'What we collect',
    paragraphs: [
      'Your account details: name, email address, and the password you set (stored hashed — we never see it).',
      'The business information you give us: what your business does, its industry, turnover, profit, how it runs, and anything else you tell Kira while working with her.',
      'Your conversations with Kira, and the summary she keeps of them so she can be useful next time. See "What you tell Kira" below.',
      'Billing details if you subscribe. Card numbers are handled by Stripe and never reach our systems — we hold only the fact of a subscription and its status.',
      'If you are an advisor enquiring about the introducer channel: your name, firm, contact details and practice type.',
    ],
  },
  {
    heading: 'Your valuation figures',
    paragraphs: [
      'The free valuation asks for turnover, profit and how dependent the business is on you. For most owners that is the most sensitive information they will type into anything, so it is worth being specific about it.',
      'You can complete a valuation without an account. If you do not sign up afterwards, we hold what you entered only to produce the result you asked for. If you do sign up, it becomes part of your account and is used to track whether the gap is closing.',
      'We do not sell it, we do not share it with brokers or buyers, and we do not use it to build a market database.',
    ],
  },
  {
    heading: 'What you tell Kira',
    paragraphs: [
      'Kira remembers, because an assistant that forgets is not one. What she keeps is a distilled written summary of what mattered in a conversation — not a recording, and not a raw transcript of everything said.',
      'That memory belongs to your account alone. Each account has its own assistant, and one user\'s memory is never visible to another.',
      'The voice conversation itself is processed by ElevenLabs, which is why they ask for your consent before a call starts. That notice is theirs and it is accurate: they are a third party processing what you say, in order to understand and reply to it.',
      'You can ask us to delete what Kira remembers without closing your account. Everything else in Kira keeps working; she simply starts again.',
    ],
  },
  {
    // The Privacy Act's automated-decision transparency requirement (APP 1.7/1.8, from the
    // POLA Act 2024) commences 10 December 2026 and asks a privacy policy to describe the
    // kinds of personal information used in automated decisions, the kinds of decisions
    // made, and broadly how the process works — where a decision could reasonably be
    // expected to significantly affect the individual's rights or interests.
    //
    // WE PROBABLY DO NOT MEET THAT THRESHOLD, and this section exists anyway. The rule
    // targets decisions an organisation makes ABOUT a person that change what they can have
    // — credit refused, an application screened out, a claim declined. Everything Kira works
    // out is about the owner's own business, shown to the owner, and grants or denies him
    // nothing. That is a different shape.
    //
    // But the product asks a man for his turnover, his profit, and often that he has not
    // told his staff or his family — the policy says two sections up that this is the most
    // sensitive information most owners will type into anything. Staying quiet about what
    // the automation decides, on the grounds that a threshold is arguably not met, is
    // trading on a technicality with exactly the reader least inclined to extend credit.
    //
    // The last paragraph is the one that matters and it is the reason this is cheap to say:
    // nothing automated here decides anything about his access, his price or his standing.
    heading: 'What Kira works out on her own',
    paragraphs: [
      'Software makes some judgements here without a person looking, so it is worth saying plainly what they are.',
      'The valuation is arithmetic. Your turnover, your profit and your answers about how the business runs go into a published formula, and the same answers always produce the same figure. No AI model is involved in the number, and nobody reviews it before you see it — which is also why it is an estimate and not an offer.',
      'The Genome scores how much of your business is written down rather than held in your head. That score is derived from what has been captured, not from any opinion about you.',
      'What Kira remembers is chosen automatically. After a conversation she writes a short summary of what mattered and keeps that, rather than the whole exchange. You can read it and you can have it deleted.',
      'The handover document is filtered automatically. Anything that reads as your position rather than how the business runs — what you intend, what you would accept, who you have not told — is withheld from the buyer copy. The filter is deliberately over-cautious: it would rather hold back a business detail you can add by hand than let through something that costs you money at the table.',
      'None of this decides anything about you. No automated process here sets your price, grants or refuses you access, ranks you against another customer, or reports on you to anyone. If that ever changes, this section changes with it, before it ships.',
    ],
  },
  {
    heading: 'What your introducer can see',
    paragraphs: [
      'If a broker, accountant or other advisor introduced you to Kira, they can see that you signed up, roughly where you are in the process, and whether your valuation is moving.',
      'They cannot see your conversations, what Kira remembers, your documents, or anything you have told her. That is not a policy we intend to follow — it is enforced in the database itself, which will only ever return status information to an introducer, so there is no screen or mistake that could expose the contents.',
      'They are paid a commission if you subscribe, and they are required to tell you that when they introduce you.',
    ],
  },
  {
    heading: 'Why we collect it',
    paragraphs: [
      'To run your account, produce your valuation, let Kira be useful to you over time, take payment if you subscribe, and tell you things about the service you need to know.',
      'We do not sell personal information. We do not use what you tell Kira to train anyone\'s AI models.',
    ],
  },
  {
    heading: 'Who we share it with',
    paragraphs: [
      'Only the providers that run the service, and only as far as they need it: Supabase (database), Vercel (hosting), Resend (email), Stripe (payments), ElevenLabs (the voice conversation), and the AI model providers that generate Kira\'s responses.',
      'Some of these process or store data outside Australia, including in the United States and the European Union. Your account and everything Kira holds about your business sits in our database in Mumbai, India — that is where the primary copy lives. We choose providers that commit to protecting it, but that transfer is worth knowing about.',
      'We will disclose information if the law requires it. We will not hand it over because someone asked nicely.',
    ],
  },
  {
    heading: 'Marketing, and how to stop it',
    paragraphs: [
      'Every commercial email we send carries our name, ABN and a working unsubscribe link, as Australian law requires. Unsubscribing is honoured as a permanent state against your email address, not a one-off deletion — so re-importing a list cannot resurrect you.',
      'Emails you asked for by acting — a password reset, a receipt, a notice about your subscription — are not marketing and will keep arriving while you have an account.',
    ],
  },
  {
    heading: 'How long we keep it',
    paragraphs: [
      'Account and business information for as long as you have an account, and briefly afterwards so we can settle anything outstanding.',
      'What Kira remembers, until you delete it or close your account.',
      'Records we are required to keep for tax or accounting reasons, for as long as the law requires — typically seven years for anything billing-related.',
    ],
  },
  {
    heading: 'Your rights',
    paragraphs: [
      'You can ask for a copy of what we hold about you, ask us to correct it, or ask us to delete it. We will not charge you for asking, and we will respond within a reasonable time.',
      'If you think we have mishandled your information and we have not put it right, you can complain to the Office of the Australian Information Commissioner at oaic.gov.au.',
    ],
  },
  {
    heading: 'Security',
    paragraphs: [
      'Data is encrypted in transit and at rest, access is limited to those who need it to operate the service, and each account\'s data is isolated at the database level rather than only in the application.',
      'If a breach occurs that is likely to cause you serious harm, we will tell you and the Commissioner, as the law requires.',
    ],
  },
  {
    heading: 'Changes and contact',
    paragraphs: [
      'If this policy changes in a way that affects you, we will update the version and date at the top of this page rather than change it quietly.',
      `For anything in this policy, including a request about your information, contact us at ${OPERATOR.email} or by post at ${OPERATOR.postal}.`,
    ],
  },
];
