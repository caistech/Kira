// lib/billing/copy.ts
//
// EVERY SENTENCE THE PRODUCT SAYS ABOUT MONEY, IN BOTH MODES, IN ONE PLACE.
//
// `lib/billing/stripe-mode.ts` already gives one switch for the PAYMENT path, and its header is
// emphatic about why there must not be a second copy of the flag. This is the other half of the same
// discipline: one switch for what the product SAYS. The flag was honoured — as a dozen inline
// ternaries spread across a sales page — and that is how the two readings drift. A ternary at line
// 251 and a ternary at line 349 are edited months apart by someone reading one screen at a time.
//
// So both readings live here, adjacent, and a change to one is visibly a change beside the other.
// Flip STRIPE_LIVE_MODE and every surface moves together, or none of them do.
//
// ⚠️ BOTH READINGS MUST BE HONEST ON THEIR OWN TERMS. The test-mode copy is not a placeholder to be
// tidied up later — it is what a real prospect reads today, and a naive tester walked exactly it:
// one click from "free while in beta" onto a Stripe page badged Sandbox, asking for a card he had
// just been told would not be charged. "I'd have stopped there in real life." So the test variant
// says what will actually happen, badge included; the live variant states the arrears terms. Neither
// is allowed to promise something the other mode would make untrue.

export interface BillingCopy {
  /** The primary call to action. */
  cta: string;
  /** Heading of the consequence step that precedes the card form (PRODUCT_STANDARDS §9). */
  confirmTitle: string;
  /** What happens next, said before the click rather than discovered on Stripe's page. */
  confirmBody: (price: string) => string;
  /** The parenthetical after the monthly figure. */
  priceQualifier: string;
  /** The three reassurances on the plan card, in order. */
  bullets: [string, string, string];
  /** The fine print under the button. */
  finePrint: (price: string) => string;
  /** The operator-facing banner at the top of the admin console. */
  adminBanner: string;
}

const LIVE: BillingCopy = {
  cta: 'Start now',
  confirmTitle: 'The next screen asks for your card.',
  confirmBody: (price) =>
    `It is saved, not charged. Your first payment is ${price} at the end of your first month, and we email you three days before it. Cancel before then and the month is written off.`,
  priceQualifier: ' (and you are never billed for the month you are in)',
  bullets: [
    'Nothing is charged today — your card is saved, not billed',
    'We email you 3 days before every payment',
    'Cancel any time — the month you are in is never billed',
  ],
  finePrint: (price) =>
    `Secure checkout by Stripe · billed by Corporate AI Solutions. Your card is saved today but nothing is charged. We bill in arrears: at the end of each month you pay ${price} for the month just finished, and we email you three days before. Cancel at any point and the month you are in is written off — no payment, no proration.`,
  adminBanner: 'LIVE billing — real cards, real money. Stripe is on live keys.',
};

const TEST: BillingCopy = {
  cta: 'Start now — free while in beta',
  confirmTitle: 'The next screen asks for your card.',
  // The Sandbox badge is named HERE, before he sees it. Discovering it unannounced on a page asking
  // for card details reads as a fake payment form, and that is where the conversation ends.
  confirmBody: () =>
    'Nothing is charged — billing is not switched on yet. Stripe still needs the details to set the account up, and we will email you before anything is ever billed. Because billing is off, Stripe shows a "Sandbox" badge on that page: that is our test mode, not a fake payment page.',
  priceQualifier: ' (nothing is charged while we are in beta)',
  bullets: [
    'Nothing is charged while we are in beta',
    'We email you before billing is switched on',
    'Cancel any time before then and pay nothing',
  ],
  finePrint: () =>
    'Secure checkout by Stripe · billed by Corporate AI Solutions. Billing is not switched on yet, so nothing is charged and no payment is taken — Stripe collects the details to set the account up and shows a "Sandbox" badge while we are in test mode. We will email you before anything is ever billed.',
  adminBanner:
    'TEST billing — No real money moves. Stripe is on test keys — flip STRIPE_LIVE_MODE to true and redeploy to go live.',
};

/** The copy for the current mode. One switch, every surface. */
export function billingCopy(live: boolean): BillingCopy {
  return live ? LIVE : TEST;
}
