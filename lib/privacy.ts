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
export const PRIVACY_VERSION = '2026-07-27.1';

export const PRIVACY_UPDATED = '27 July 2026';

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
