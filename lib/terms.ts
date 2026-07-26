// lib/terms.ts
//
// The Terms, as data — so the page renders them, the signup checkbox names the same version, and
// the recorded acceptance means something specific.
//
// Structure follows the portfolio's existing SaaS terms shape (DealFindrs: acceptance / service /
// data / acceptable use / billing / liability / contact) rather than a new one, with two sections
// this product genuinely needs: what Kira remembers, and what we email.
//
// NOT legal advice. This is the operational baseline; a lawyer should review it before real volume
// — as should the introducer agreement (BROKER_CHANNEL_BUILD_STATE guardrails).

/**
 * Bump on any material change. Acceptance records the version, so it is always answerable which
 * wording a given user agreed to — and a change can require re-acceptance rather than being
 * assumed to carry over.
 */
export const TERMS_VERSION = '2026-07-26.1';

export const TERMS_UPDATED = '26 July 2026';

export interface TermsSection {
  heading: string;
  paragraphs: string[];
}

export const TERMS_SECTIONS: TermsSection[] = [
  {
    heading: 'Acceptance',
    paragraphs: [
      'By creating an account or using Kira, you agree to these Terms. If you are signing up on behalf of a business, you confirm you are authorised to do so.',
    ],
  },
  {
    heading: 'What Kira is',
    paragraphs: [
      'Kira is an AI assistant for business owners. She talks with you, remembers what you tell her, and helps you organise and act on the running of your business.',
      'Kira produces decision support, not professional advice. Valuations, readiness scores and suggestions are indicative. They are not financial, legal, accounting or valuation advice, and you should not treat them as a substitute for a professional who knows your circumstances.',
    ],
  },
  {
    heading: 'What Kira remembers',
    paragraphs: [
      'Kira works by remembering. What you tell her is stored so she can carry context between conversations — that is the product, not a side effect.',
      'You own what you put in. We process it to run the service and we do not sell it. You can delete your account at any time from Settings, which removes your data and everything derived from it.',
      'If someone introduced you to Kira and is paid a commission, they can see whether you signed up and how your valuation is moving. They can never see your conversations, your transcripts or anything Kira remembers about you.',
    ],
  },
  {
    heading: 'Email we send you',
    paragraphs: [
      'By creating an account you agree to receive emails about Kira: how to get started, occasional product updates, and tips for getting more out of her.',
      'You can stop those at any time — the unsubscribe link at the bottom of any such email, or the Notifications section of Settings. We honour it.',
      'Some emails are not marketing and continue regardless: a password reset, a receipt, notice that your card is about to be charged, or a change to these Terms. You would not thank us for letting you opt out of those.',
    ],
  },
  {
    heading: 'Your account and acceptable use',
    paragraphs: [
      'Keep your login details to yourself; you are responsible for what happens under your account.',
      'Do not use Kira to break the law, to impersonate someone, or to store material you have no right to store. Accounts used that way are closed.',
    ],
  },
  {
    heading: 'Billing',
    paragraphs: [
      'Your first 30 days are free. We take your card at signup and the first payment is taken at the end of those 30 days — we email you three days beforehand so it is never a surprise.',
      'Your monthly fee is set from the value gap your valuation identifies, and the exact figure is shown to you before you enter a card. All prices are quoted exclusive of GST; for supplies to Australian customers, 10% GST is added and shown as a separate line on your tax invoice.',
      'Subscriptions are billed monthly in advance. You can cancel at any time from Settings; cancellation takes effect at the end of the period you have paid for, and partial periods are not refunded.',
      'The free 30 days include a fair-use allowance. If you approach it we tell you — we do not cut you off mid-conversation.',
    ],
  },
  {
    heading: 'Availability and liability',
    paragraphs: [
      'Kira is provided "as is". We work to keep her available but do not guarantee uninterrupted service.',
      'To the maximum extent permitted by law, Corporate AI Solutions is not liable for loss arising from reliance on Kira\'s outputs. Nothing in these Terms excludes rights you have under the Australian Consumer Law.',
    ],
  },
  {
    heading: 'Changes and contact',
    paragraphs: [
      'If we change these Terms materially, we will tell you. Continuing to use Kira after that means you accept the change.',
      'Questions: legal@corporateaisolutions.com.',
    ],
  },
];
