// lib/faq.ts
//
// FAQ content, in one place.
//
// The landing page and the pricing page each carried their own copy, and they drifted: both still
// promised a "7-day free trial" long after the trial became a month and the card moved to signup.
// Answers about money that disagree with what the checkout actually does are the worst kind of
// stale copy — one source removes the possibility.
//
// The pricing page is now gone entirely. A price only ever appears in ONE place — /plan, after the
// owner has seen their own gap — because Kira's price is a fraction of that gap and a number quoted
// without it is just a number to flinch at. This FAQ is the only other place money is discussed,
// and it deliberately describes the SHAPE of the price (a small fraction of the uplift, never billed
// for the month you are in) without ever naming a figure. Do not add one here.
//
// ⚠️ THIS FILE DRIFTED AGAIN, THE SAME DAY THE MODEL CHANGED (2026-07-28). Billing moved to arrears
// — the month is owed from day one and invoiced when it closes, and cancelling writes off the month
// you are in — and /plan, the pricing block and Settings were all updated while these answers went
// on promising a 30-day free trial. Two naive testers, walking separately, both found four different
// deals on one site.
//
// The sweep that was supposed to catch it ran with `head -20` on the grep and the file's matches
// fell below the cut. A completeness check that truncates its own output is not a completeness check.
//
// The commercial terms live in lib/billing/arrears.ts. If the model changes, change it there and
// re-read this file — and grep without a `head`.

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * The terms, stated the same way everywhere.
 *
 * ⚠️ NOTHING IMPORTS THIS. It was written to be the one source and no surface ever consumed it,
 * which is exactly why the answers below were free to drift away from what the checkout does. Wire
 * it in or delete it — an unused constant claiming to be the single source is worse than no
 * constant at all, because it makes the next person believe the problem is solved.
 */
export const BILLING_TERMS = {
  headline: 'Never billed for the month you’re in',
  short: 'Billed at the end of each month, for the month just gone — cancel any time.',
  /** For the checkout, where someone is about to enter a card. */
  atCheckout:
    'Your card is saved today but nothing is charged. At the end of each month you pay for the month just finished, and we email you three days before. Cancel at any point and the month you are in is written off.',
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
    // "That's why there's no price list here" sat directly beneath a price. A tester: "Pick one.
    // I'd pick the explanation and drop the number." We kept the number — a nav item called Pricing
    // that shows no price reads as evasion to exactly this buyer — so the sentence that contradicted
    // it had to go instead. The bands ARE the price list; what is not fixed is which one he lands in.
    a: "The valuation is completely free — no sign-up, no card. If you then want Kira to help close the gap, her monthly fee is set by the size of your business — the annual profit you tell us, not the gap we calculate. That distinction matters: the tool that works out what your business is worth has nothing to gain from the number being bigger. The bands are shown up front, and you see your own figure on screen before you decide anything. You're never invoiced for the month you're in: each month is billed once it has finished, and if you cancel, that month is on us.",
  },
  {
    q: 'Why is the price different for different businesses?',
    a: "Because what Kira is worth to you depends on what's locked in your head. The valuation shows the gap between what your business is worth today and what it's worth captured and transferable; her fee is a small fraction of that per year. A bigger gap means more for her to unlock, so the bands move with it — never the other way around, where you pay the same regardless of what you get out.",
  },
  {
    q: 'Why do you need my card before anything is charged?',
    a: "So Kira carries straight on at the end of the month instead of stopping dead and losing your thread. Nothing is charged today; each month is billed once it has finished, you get three days' warning before every payment, and cancelling takes one click in Settings — the month you're in is never billed.",
  },
  {
    q: 'What currency am I charged in?',
    // IT PROMISED A CONTROL THAT DOES NOT EXIST. "Your FAQ promises a currency switch that isn't
    // there. There is no currency control anywhere on the valuation screen or the result. I looked
    // twice."
    //
    // He is right, and the selector's absence is deliberate rather than an oversight: it is archived
    // in app/business-valuation/page.tsx because it CONVERTED NOTHING — changing it relabelled the
    // same number, so an Australian owner's gap could read as £752,919. A wrong number is worse than
    // a missing feature.
    //
    // So the answer describes what we actually do. This matters more than a copy nit: the landing
    // page now shows AUD unconditionally, and the justification written into that change was this
    // FAQ's promise that he could switch it later. A fix resting on a sentence that is not true is
    // not a fix.
    a: 'Australian dollars. This is an Australian product, built for Australian owner-operators, and every figure you see — the valuation and the fee — is in AUD, quoted excluding GST. We do not convert to other currencies, because a converted headline figure that moves with an exchange rate would be a worse number, not a friendlier one.',
  },
  {
    q: 'Will my business information be used to train AI models?',
    a: 'No. The AI providers we use are accessed through paid APIs under terms that exclude training on customer data. What you tell Kira stays between you and your business, private and permissioned.',
  },
  {
    q: 'What happens to my data if I cancel?',
    a: 'Everything Kira has captured about your business is exportable at any time. After cancellation we keep it for 30 days in case you come back, then delete it. Export early if you want a copy outside the app.',
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

// There was a PRICING_FAQ here, for the pricing page. Both are gone: the page, because a price
// quoted before the valuation is a number without its denominator, and the separate FAQ with it —
// its money answers now live in OWNER_FAQ above, stated as a fraction of the gap rather than a
// figure. Nothing should reintroduce a second FAQ list; two lists about money is how the last drift
// started.

/** Advisor-facing — brokers, accountants, anyone with a book of owner clients. */
export const ADVISOR_FAQ: FaqItem[] = [
  {
    q: 'What does the owner pay?',
    a: "There is no price list, and that is deliberate: Kira's monthly fee is set to the size of the value gap her valuation finds in that specific business — a small fraction of the uplift, per month. Your client sees their own figure at the end of the free 3-minute valuation, before any card. Run it yourself on a business you know and you'll see exactly what they see. They are never invoiced for the month they are in — each month is billed once it has finished — and they can cancel any time. All prices are quoted excluding GST (or the equivalent tax where your client is based).",
  },
  {
    q: 'What do I actually get paid?',
    a: "10% of what each owner you introduce pays us, every month, for as long as they keep paying. Not a one-off finder's fee — while the subscription runs, you earn on it. Commission follows collection: an owner's first month is invoiced once it has finished, so your first payment follows theirs.",
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
  // The three assurance answers an introducing adviser needs, alongside the commercial ones. The
  // long-form versions with what enforces each are on the advisor page itself (lib/trust.ts) and in
  // the downloadable briefing — these are here so someone scanning the accordion still finds them.
  {
    q: 'If Kira tells my client something wrong, whose problem is that?',
    a: "Ours to fix, and nobody's to rely on as advice. Kira is not a licensed adviser and gives no financial, legal, tax or valuation advice. The valuation is an indicative figure from your client's own self-reported numbers, and it says so on the screen, in the exported document, and in the terms they accept. It starts the conversation you are having with them; it does not replace your judgement or your engagement.",
  },
  {
    q: 'Two of my clients are competitors. Can anything cross between them?',
    a: "No. Each owner's conversations, memory and documents are isolated at the database row level and scoped to their own account — enforced by the database rather than by code remembering to filter, which is the difference between a rule and a guarantee. Their information also stays on our own infrastructure; the substance of their business is not handed to a third-party memory service.",
  },
  {
    q: 'If my client sells, retires or dies, does their information come out?',
    a: "Yes, at any time, without asking us. They can export the whole Business Genome themselves — a handover document a buyer's accountant can read cold, and the raw data in a form another system can read. Every entry is dated to the conversation the owner said it in, so it reads as evidence rather than assertion. If they stop paying us, they keep it.",
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
