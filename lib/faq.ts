// lib/faq.ts
//
// FAQ content, in one place.
//
// The landing page and the pricing page each carried their own copy, and they drifted: both still
// promised a "7-day free trial" long after the trial became a month and the card moved to signup.
// Answers about money that disagree with what the checkout actually does are the worst kind of
// stale copy — one source removes the possibility.
//
// The commercial terms live in lib/billing (TRIAL_DAYS), and the wording below is written to match
// them. If the trial length changes, change it there and re-read this file.

export interface FaqItem {
  q: string;
  a: string;
}

/** The terms, stated the same way everywhere. */
export const TRIAL_TERMS = {
  headline: 'First month free',
  short: 'First month free, then monthly — cancel any time.',
  /** For the checkout, where someone is about to enter a card. */
  atCheckout:
    'Your card is saved today but nothing is charged. The first payment comes out a month from now, and we email you three days before. Cancel before then and you pay nothing.',
} as const;

/** Owner-facing. Shown on the landing page. */
export const OWNER_FAQ: FaqItem[] = [
  {
    q: "What do you mean 'my own Kira'?",
    a: "When you start, you'll have a quick conversation with Setup Kira. She learns what you're working on, your context, and what success looks like. Then we create a unique Kira agent just for you — one that knows your situation from day one.",
  },
  {
    q: 'What can Kira actually help with?',
    a: 'Running your business and making it worth more. Capturing how it works, getting the small things done (a quote, a follow-up, a reminder — for your approval), sorting the recurring headaches like the BAS, and turning the knowledge in your head into a transferable, sellable asset.',
  },
  {
    q: 'What does it cost, and when do I pay?',
    a: "The valuation is completely free — no sign-up, no card. If you want Kira to help close the gap, your first month is free. You add a card when you start, nothing is charged that day, and the first payment comes out a month later. We email you three days beforehand so it's never a surprise. Cancel any time before then and you pay nothing at all.",
  },
  {
    q: 'Why do you need my card if the first month is free?',
    a: "So Kira carries straight on at the end of the month instead of stopping dead and losing your thread. Nothing is charged until the month is up, you get three days' warning before the first payment, and cancelling takes one click in Settings.",
  },
  {
    q: 'How do I cancel?',
    a: "Settings → Manage billing, which opens your billing portal. Cancel there and it takes effect at the end of the period you've paid for. No phone call, no retention conversation.",
  },
  {
    q: 'What if she gets something wrong?',
    a: "She will sometimes. When that happens, tell her. She'll adjust and do better. That's how this partnership works.",
  },
  {
    q: 'Is this like ChatGPT?',
    a: "Kira uses AI, but she's built to be YOUR guide, not a generic answer machine. She knows your specific context, asks questions before jumping to answers, and is designed for ongoing thinking partnerships — not one-off queries.",
  },
  {
    q: 'What happens to my conversations?',
    a: "They stay private. Kira learns from your conversations to help you better, but your data isn't shared or sold. Ever. If an advisor introduced you, they can see that you signed up and how your valuation is moving — never what you and Kira discuss.",
  },
  {
    q: 'Can I have more than one Kira?',
    a: 'For now, each Kira is focused on one business. If you run more than one, you can create a separate Kira for each.',
  },
];

/** Pricing-page specific. Narrower, money-focused. */
export const PRICING_FAQ: FaqItem[] = [
  {
    q: 'What does Kira Exec actually do?',
    a: "She's a voice-first assistant for the hands-on owner. You talk to her between jobs; she captures how your business really runs, gets the small things done (drafts a quote, a follow-up, a reminder — for your approval), and turns the knowledge in your head into a documented, transferable asset that's worth more when you sell.",
  },
  {
    q: 'How is it priced?',
    a: "One monthly plan, priced to the size of the gap your valuation finds — from $99/month at the entry band up to $1,499 for the largest. Your 3-minute valuation shows your number before you decide anything, and you see the exact figure before entering a card.",
  },
  {
    q: 'When am I actually charged?',
    a: 'Not on the day you sign up. You add a card, your first month runs free, and the first payment is taken a month later — with an email from us three days before it happens. Cancel any time before that and you pay nothing.',
  },
  {
    q: 'What currency am I charged in?',
    a: 'Australian dollars by default (ex-GST) — this is an Australian product. Prefer another currency? Switch it on the valuation screen and the price follows; Stripe then bills you in that currency.',
  },
  {
    q: 'Will my business information be used to train AI models?',
    a: 'No. The AI providers we use are accessed through paid APIs under terms that exclude training on customer data. What you tell Kira stays between you and your business, private and permissioned.',
  },
  {
    q: 'What happens to my data if I cancel?',
    a: 'Everything Kira has captured about your business is exportable at any time. After cancellation we keep it for 30 days in case you come back, then delete it. Export early if you want a copy outside the app.',
  },
];

/** Advisor-facing — brokers, accountants, anyone with a book of owner clients. */
export const ADVISOR_FAQ: FaqItem[] = [
  {
    q: 'What do I actually get paid?',
    a: '10% of what each owner you introduce pays us, every month, for as long as they keep paying. Not a one-off finder\'s fee — while the subscription runs, you earn on it. The free first month pays nothing because nothing is collected.',
  },
  {
    q: 'When and how am I paid?',
    a: 'Monthly, on money actually collected — never on invoices we haven\'t been paid for. You get a statement each month showing which owners it relates to. We can pay you personally or your firm, whichever you nominate.',
  },
  {
    q: 'How long does the commission last?',
    a: "For the life of that owner's subscription. If they stay five years, you earn for five years. If they cancel, it stops.",
  },
  {
    q: 'What if the owner comes back later through someone else?',
    a: "They stay yours. Attribution is first-touch: whoever introduced them is credited, not whoever they happened to click last. It's recorded when they first open your link and it cannot be quietly reassigned afterwards.",
  },
  {
    q: 'What can I see about my clients?',
    a: "Whether they've opened your link, whether they've signed up, and how their business valuation is moving. You will never see their conversations with Kira, their transcripts, or anything she remembers about them. That boundary is built into the system, not a policy we promise to follow.",
  },
  {
    q: 'Who do I send it to?',
    a: 'Owners you already act for — clients with a current listing or engagement agreement with you. Not cold lists. That is the one condition of being in the channel, and you confirm it when you join.',
  },
  {
    q: 'Do you email my clients?',
    a: "No. You introduce them, in your own words, from your own email. We never contact your clients to sell around you, and we never email them on your behalf. Once they're a customer we email them about their own account — receipts, their free month ending — as you'd expect.",
  },
  {
    q: 'Do I have to tell them I get paid?',
    a: "Yes, and it's a condition of joining. It's a small thing to say and it protects the relationship you have with them.",
  },
  {
    q: 'Why would I introduce them at all?',
    a: "Because an owner whose business is documented, systemised and running without them in the middle of it is a business you can actually sell — at a better multiple, with a shorter due diligence and fewer deals falling over. Kira does the part your clients never get around to. You see the valuation move on your dashboard.",
  },
  {
    q: 'What does it cost me?',
    a: 'Nothing. There is no fee to join and no minimum. If you never send anyone, nothing happens.',
  },
];
