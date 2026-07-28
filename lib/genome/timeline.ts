// The demo's script — the same plumbing business as `/genome`, followed through time.
//
// THE AXIS IS ELAPSED TIME, NOT STEPS. ExecutorAI's demo is a ten-step walkthrough because its flow
// is linear and finite: organise, die, open, probate, done. Kira's never completes — the Genome
// fills in and the score moves. A step-based walkthrough would tell an owner that Kira is a form he
// finishes, which is the opposite of the product.
//
// IT LEADS WITH THE PAIN, NOT THE PRODUCT. The ICP tester would not have told this thing the truth
// on day one. He does not need the mechanism explained first; he needs to believe it understands his
// situation. So the opening beats are recognition, and the mechanism arrives once he is nodding.
//
// AND IT EXPLAINS THE WHY, NOT ONLY THE WHAT. "She talks to you between jobs" means nothing without
// "because you were never going to fill in a form, and we know that". Every process beat carries its
// reason.
//
// PERSON MATTERS, AND IT IS NOT THE SAME FOR BOTH SCRIPTS.
// The owner's script is SECOND PERSON throughout — "you talk to me", "your biggest builder", "what a
// buyer discounts YOU for". It previously opened by addressing him and then slid into narrating a
// third party ("he mentions…"), which is the exact moment he stops seeing himself and starts
// watching somebody else. The example business is therefore introduced as HIS ("let's say you run a
// plumbing business") so every later line can stay "you". The only "he" left is the BUYER, which is
// correct — the buyer is genuinely a third party.
// The ADVISOR script is second person for HER and third for the client, which is also correct: she
// is evaluating somebody else's business, and calling it "yours" would be nonsense.
//
// ONE BUSINESS ACROSS EVERY SURFACE — landing hero, /genome, both demos. Two artifacts describing
// two different fictional businesses read as marketing; one business followed through time reads as
// a record.

import { overallCoverage } from './example';

export interface Beat {
  when: string;
  /** Kira's narration, in her voice — this is what gets generated as audio. */
  narration: string;
  /** Caption shown regardless of sound, and the audio's transcript. */
  caption: string;
  /** Illustration key — see components/DemoScene.tsx. */
  scene?: string;
  coverage?: number;
  stillOpen?: string[];
  /** A figure worth showing large, with its label. */
  figure?: { value: string; label: string };
  /**
   * The next thing to do, on the beat where it belongs.
   *
   * A demo that ends with "thanks for watching" wastes the one moment the viewer is convinced. The
   * final beat asks for the action out loud AND puts the button under it, so he does not have to go
   * looking for what to do next — which, for a 66-year-old who has just been persuaded, is where
   * most of them would stop.
   */
  cta?: { label: string; href: string };
}

export const WEEK_ONE_COVERAGE = 12;
export const MONTH_THREE_COVERAGE = 34;
export const MONTH_SIX_COVERAGE = overallCoverage();

// ─────────────────────────────────────────────────────────────────────────────
// The owner — second person throughout
// ─────────────────────────────────────────────────────────────────────────────

export const ICP_BEATS: Beat[] = [
  {
    when: 'The conversation you have had with yourself',
    scene: 'kitchen-table',
    narration:
      "You've thought about what happens next. Maybe you've mentioned it to nobody — not the staff, " +
      "not the kids, some weeks not even your wife. And somewhere underneath it is a worry you " +
      "haven't said out loud: that after thirty years, the thing you'd be selling is mostly you.",
    caption:
      'You have thought about what comes next, and probably told nobody. And underneath it: after thirty years, the thing you would be selling is mostly you.',
  },
  {
    when: 'Why a buyer pays you less',
    scene: 'handshake',
    narration:
      "Here's what a buyer sees when he looks at you. He can't ring your builders. He doesn't know " +
      "what you charge them. He can't tell which of your customers pay on time. So he prices the " +
      "risk. That isn't him being difficult — it's the only thing he can do when the business runs " +
      "on one man's memory.",
    caption:
      'A buyer cannot see your relationships, your pricing, or which of your customers actually pay. So he prices the risk. That is your discount.',
  },
  {
    when: 'Before I show you anything',
    scene: 'phone',
    narration:
      "Before any of it — a few things I can't do. I can't sit in the background and listen; you have " +
      "to open a conversation and press the button. I don't read your email. And nobody at our end " +
      "reads what you tell me. I'd rather you heard that from me than found it out later.",
    caption:
      'What Kira cannot do: no background listening, no reading your email, and nobody at our end reads your conversations.',
  },
  {
    when: 'Week one',
    scene: 'office',
    figure: { value: '12%', label: 'of your business is written down' },
    coverage: WEEK_ONE_COVERAGE,
    narration:
      "Let's say you run a plumbing business — thirty-one years, nine staff, and it runs on you. " +
      "After a week I know almost nothing about how it works. Twelve percent of it exists on paper " +
      "anywhere. The rest is in your head, which is exactly where it's been the whole time.",
    caption: 'Week one: 12% of how your business runs exists anywhere but in your head.',
    stillOpen: [
      'How you price — including the discount your biggest builder gets',
      'Why you allocate the crews the way you do each morning',
      'Which of your customers pay, and which need chasing',
    ],
  },
  {
    when: 'How it actually works',
    scene: 'ute',
    narration:
      "Here's the part that matters. You don't sit down and do this. You talk to me between jobs — in " +
      "the ute, waiting on a supplier, at the end of the day. Two minutes at a time. I ask the " +
      "questions, and you answer them the way you'd answer an offsider.",
    caption:
      'You talk to Kira between jobs — two minutes at a time, in the ute or waiting on a supplier. She asks; you answer.',
  },
  {
    when: 'Why it works that way',
    scene: 'ute',
    narration:
      "And here's why it's built like that. You were never going to fill in a form. Nobody who's run " +
      "a business for thirty years is going to sit down on a Sunday and write an operations manual — " +
      "not because you can't, but because there is always something more urgent. Talking costs you " +
      "nothing you weren't already spending.",
    caption:
      'Why conversation and not forms: you were never going to write an operations manual on a Sunday. Talking costs you nothing you were not already spending.',
  },
  {
    when: 'A Tuesday, between jobs',
    scene: 'ute',
    narration:
      "Today you mention, in passing, that Hartley gets about twelve percent off list and forty-five " +
      "day terms — and that it goes back to a job in two thousand and four that went wrong and you " +
      "fixed at your own cost. You've never written that down anywhere. You've never had a reason to.",
    caption:
      'In passing, you mention: your biggest builder gets 12% off list and 45-day terms, going back to a job in 2004 you fixed at your own cost. Never written down anywhere.',
  },
  {
    when: 'Why that one mattered',
    scene: 'document',
    narration:
      "That isn't trivia. A buyer who doesn't know it will either lose that builder, or find out " +
      "about the discount after settlement and feel misled. Either way it comes off your price. One " +
      "sentence, said out the window of a ute, is worth real money when you sell.",
    caption:
      'A buyer who does not know that either loses the builder or feels misled after settlement. Either way it comes off your price.',
  },
  {
    when: 'Month three',
    scene: 'office',
    figure: { value: '34%', label: 'documented' },
    coverage: MONTH_THREE_COVERAGE,
    narration:
      "By month three I've started asking about the things I'm missing rather than waiting for them " +
      "to come up. Not a questionnaire — just the next obvious question, while you're already talking.",
    caption:
      'Month three: Kira starts asking about the gaps rather than waiting for them — the next obvious question, while you are already talking.',
    stillOpen: [
      'When you walk away from a job — you have a clear instinct and have never put words to it',
      'Which jobs your newer crew is not ready for',
    ],
  },
  {
    when: 'Month six',
    scene: 'document',
    figure: { value: '61%', label: 'on the page, not in your head' },
    coverage: MONTH_SIX_COVERAGE,
    narration:
      "Six months. Sixty-one percent of how your business runs is on the page — where your work comes " +
      "from, how you price it, who owns the relationships, what must not lapse. And what's still only " +
      "in your head is named rather than hidden, because that's the part a buyer discounts you for.",
    caption:
      'Month six: 61% documented — and what remains is named rather than hidden, because that is what a buyer discounts you for.',
    stillOpen: ['What you would tell a buyer never to change'],
  },
  {
    when: 'What due diligence looks like now',
    scene: 'handshake',
    narration:
      "When it's time, the buyer's accountant asks the questions they always ask — and your answers " +
      "already exist, in writing, with the gaps stated honestly. That's weeks off the process, and " +
      "it's a different conversation about what you're worth.",
    caption:
      'At sale: the buyer’s accountant asks the usual questions and your answers already exist in writing. Weeks off due diligence, and a different conversation about price.',
  },
  {
    when: 'What you end up owning',
    scene: 'document',
    narration:
      "And this is yours. One document a buyer's accountant can read cold, and a copy of everything, " +
      "downloadable whenever you like. If you stop paying us, you keep it. It's your business — " +
      "we're just the ones who wrote it down.",
    caption:
      'Yours to keep: a handover document a buyer’s accountant can read, and a copy of everything. If you stop paying us, you keep it.',
  },
  {
    when: 'Your turn',
    scene: 'phone',
    narration:
      "So — what's yours actually worth today, and how much of it is sitting in your head? Press the " +
      "button underneath me. Eleven questions, about three minutes, no card, and nobody has to know " +
      "you looked.",
    caption:
      'What is yours worth today, and how much is sitting in your head? Eleven questions, three minutes, no card — and nobody has to know you looked.',
    cta: { label: 'Value my business', href: '/business-valuation' },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// The advisor — second person for her, third for the client
// ─────────────────────────────────────────────────────────────────────────────

export const ADVISOR_BEATS: Beat[] = [
  {
    when: 'The client you already have',
    scene: 'kitchen-table',
    narration:
      "You already know this client. Thirty years in, genuinely profitable, and every decision still " +
      "routes through one person. You'd take the listing tomorrow if the owner weren't the product.",
    caption:
      'Thirty years in, genuinely profitable, and every decision routes through one person. You would list them tomorrow if the owner were not the product.',
  },
  {
    when: 'The question worth asking yourself',
    scene: 'handshake',
    narration:
      "Put it this way. If Bob the plumber walked in tomorrow — good book, nine staff, and nothing " +
      "written down anywhere — would you find that harder to sell than the same business with " +
      "documented systems? You know the answer, and you know roughly what it costs him.",
    caption:
      'If Bob the plumber walked in — good book, nine staff, nothing written down — would that be harder to sell than the same business with documented systems? You already know.',
  },
  {
    when: 'What it costs him',
    scene: 'document',
    figure: { value: '$438,000', label: 'the gap on one ordinary plumbing business' },
    narration:
      "On this one — two point four million turnover, two hundred and sixty thousand of owner " +
      "earnings — the difference between selling it as it is and selling it documented is about four " +
      "hundred and thirty-eight thousand dollars. Not a projection: the same multiple applied to a " +
      "business a buyer can actually take over.",
    caption:
      '$2.4M turnover, $260k owner earnings: roughly $438,000 between selling it as it is and selling it documented. Same multiple, applied to a business a buyer can take over.',
  },
  {
    when: 'Why the multiple moves',
    scene: 'handshake',
    narration:
      "It moves because the risk moves. A buyer discounts what he can't verify — the pricing, the " +
      "relationships, whether the crews run without him. Take that uncertainty away and you're " +
      "arguing about a business rather than about a man.",
    caption:
      'The multiple moves because the risk moves. A buyer discounts what he cannot verify; remove the uncertainty and you are negotiating over a business rather than a person.',
  },
  {
    when: 'What your client actually does',
    scene: 'ute',
    narration:
      "Nothing that feels like homework. He talks to Kira between jobs, two minutes at a time, and " +
      "she asks the questions you'd ask in a listing appraisal. He was never going to fill in a form, " +
      "and we built it knowing that.",
    caption:
      'No homework. He talks to Kira between jobs, two minutes at a time; she asks the questions you would ask in a listing appraisal.',
  },
  {
    when: 'What gets written down',
    scene: 'document',
    coverage: MONTH_SIX_COVERAGE,
    narration:
      "Where work comes from and whether it depends on him. How he prices, including the handshake " +
      "discounts nobody has recorded. How the work runs when he isn't there. Suppliers, licences, " +
      "renewals. And explicitly, the things only he knows — because naming those is what makes the " +
      "rest believable.",
    caption:
      'Where work comes from · how he prices, including handshake discounts · how it runs without him · suppliers and licences · and explicitly, what only he knows.',
  },
  {
    when: 'What you see, and what you never see',
    scene: 'office',
    narration:
      "You see that they signed up and you see their readiness moving. You never see their " +
      "conversations, and you never see the contents of their Genome. That boundary is the reason you " +
      "can introduce anyone at all — if you could read your client's private business, you couldn't.",
    caption:
      'You see signup and score movement. You never see their conversations or the contents of their Genome — which is what makes an introduction possible at all.',
  },
  {
    when: 'What you list afterwards',
    scene: 'handshake',
    narration:
      "When it comes to market, you're listing a documented business. Due diligence gets shorter, the " +
      "questions have answers, and your appraisal has something behind it other than your own " +
      "judgement.",
    caption:
      'You list a documented business: shorter due diligence, questions that have answers, and an appraisal with something behind it.',
  },
  {
    when: 'What you get paid',
    scene: 'document',
    figure: { value: '10%', label: 'monthly, on collected funds, for the life of the subscription' },
    narration:
      "Ten percent of what they pay us, every month, for as long as they keep paying — on funds " +
      "actually collected. First touch is yours and can't be quietly reassigned. And you tell them " +
      "you're paid a commission; we give you the wording to paste into your own email.",
    caption:
      '10% monthly on collected funds, for the life of the subscription. First-touch attribution that cannot be reassigned. You disclose the commission; we supply the wording.',
  },
  {
    when: 'What is not built yet',
    scene: 'phone',
    narration:
      "One thing before you put your name on an introduction. Privacy mode — where I sit in the " +
      "background and only wake when I'm called — isn't built. Today your client opens a conversation " +
      "deliberately. I'd rather you heard that from us than had to ask.",
    caption:
      'Not built yet: background listening. Today your client opens a conversation deliberately. You should hear that from us rather than have to ask.',
  },
  {
    // Deliberately calls back to the Bob question near the top. She has already answered it in her
    // head by now; this makes her count, which turns an abstract product into a number of real
    // people she can picture — and it asks on their behalf rather than ours.
    when: 'How many Bobs are on your list?',
    scene: 'phone',
    narration:
      "So — how many Bobs are on your client list? Two? A dozen? Pick one of them, or make one up " +
      "with numbers you'd recognise, and run him through the valuation. Three minutes, and you'll " +
      "see exactly what he'd see. Then let's help them get more for thirty years of hard work.",
    caption:
      'How many Bobs are on your client list? Pick one — or invent one with numbers you would recognise — and run him through it. Three minutes, and you see exactly what he would see. Then let us help them get more for thirty years of hard work.',
    cta: { label: 'Run one of your clients through it', href: '/business-valuation' },
  },
];
