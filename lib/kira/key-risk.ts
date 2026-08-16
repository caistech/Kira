// lib/kira/key-risk.ts — the moment she should stop, not file.
//
// ⚠️ THE FINDING THIS EXISTS FOR. Ray typed her the single largest hole in his business — the only
// other man who can sign a permit on his biggest client's site is 61, has no written contract, and
// walks the day Ray does — and she read it back accurately and said *"Want to cover more on your
// key people?"*
//
//   "A buyer's advisor hearing that stops the meeting. She said 'Want to cover more on your key
//   people?' … You sell her as 'asks the questions you haven't thought of' and 'pushes back when
//   something is unclear.' On the live conversation she does neither. She files."
//
// He also supplied the fix, and it is the right one: the pushback already exists in the Genome's
// area review, and it is simply not in the conversation. So the signal is folded into a tool she
// calls constantly — the same mechanism as the wrap-up warning in the voice standard — rather than
// added as a prompt line she may or may not honour. A returned instruction arrives at the exact
// turn the risk was disclosed, which is the only turn on which asking is impressive rather than odd.
//
// ⚠️ WHY THE PATTERNS ARE NARROW. A false trip makes her interrogate a man about nothing, which is
// worse than silence: it is the behaviour he is most afraid of from a tool that has just been given
// his confidences. Each pattern below names a risk a buyer's advisor genuinely stops on, and each
// carries the SPECIFIC question that risk deserves — a generic "tell me more" would reproduce the
// defect in a louder voice.

export interface KeyRisk {
  /** Stable id, for tests and for the log line. */
  id: string;
  /** The question she is to ask, verbatim, before moving on. */
  question: string;
}

/**
 * Each rule needs BOTH a subject signal and a risk signal in the same fact.
 *
 * A one-sided match is how this becomes noise: "contract" alone appears in half the facts a
 * construction business will ever record, and "61" is a birthday. Requiring the pair is what keeps
 * a trip meaningful.
 */
interface Rule {
  id: string;
  subject: RegExp;
  risk: RegExp;
  question: string;
  /**
   * A signal that means this rule is the WRONG reading of the fact, however well it matches.
   *
   * ⚠️ ADDED BECAUSE THE RIGHT TRIGGER FIRED WITH THE WRONG REASON. Ray's builder — 40% of turnover,
   * eleven years, handshake, no contract — tripped `key-person-no-contract` before
   * `customer-concentration`, because "…has been working…no formal contract" satisfies both. She
   * stopped, which was correct, and told him "a buyer prices an undocumented key person as a risk
   * they inherit."
   *
   *   "The builder is a CUSTOMER, not a key person. She has reached for a line about staff and used
   *    it on a customer concentration. I noticed because it is my business; a broker would notice
   *    for the same reason."
   *
   * A stopped meeting with the wrong diagnosis is worse than none: it is the moment he decides
   * whether she understands his business or is pattern-matching at him.
   */
  notWhen?: RegExp;
}

// ⚠️ WRITTEN AGAINST WHAT HE ACTUALLY SAID, AND THE FIRST VERSION WAS NOT.
//
// The first cut of these rules was built from a PARAPHRASE of the previous walkthrough — "sole
// signatory", "no written contract" — and shipped with twelve passing tests. On the next run Ray
// typed his real facts and **every single one returned null**:
//
//   "Gary is the leading hand, 24 years with me, and the only other person who can price a job.
//    He is 61."                                                          -> no trip
//   "Only Gary knows the mine-site loading."                             -> no trip
//
// She filed both and said "Ready for what's next or anything to adjust?", which is the exact
// behaviour the rules were written to stop. The tests were green because they asserted the same
// paraphrase the rules were built from — a closed loop that proves nothing about a real sentence.
//
// So the discriminator is now the ONLY-NESS, not the verb. A man does not say "sole signatory"; he
// says "the only other person who can price a job", and what follows "can" or "knows" is whatever
// his trade happens to be, which we cannot enumerate in advance. The fixtures below are his words.
const RULES: Rule[] = [
  {
    // The sharpest version: one person holds a capability AND is near the end of his working life.
    // Ordered first so it wins over the plain sole-capability question on the same sentence.
    id: 'sole-capability-ageing',
    subject:
      /\bonly\s+(one|other|person|man|woman|bloke|guy|\w+)\b|\bnobody else\b|\bno ?one else\b|\bsole\b/i,
    risk: /\b(5[5-9]|6[0-9]|7[0-9])\b|\bretir\w*|\bpension\b|\bnear(ing)? the end\b/i,
    question:
      'Before we go on — he is the only one who can do that, and he is not far off finishing up. ' +
      'That is the single biggest thing holding your number down. What would it take to get what he ' +
      'knows out of his head and onto paper this year?',
  },
  {
    // The common shape, and the one the first version missed entirely. "Only X can/knows Y" —
    // whatever Y is. Deliberately does NOT enumerate the capability: pricing, loading a mine site,
    // talking to one client, knowing which drawings are current. Naming them was the original bug.
    id: 'sole-capability',
    subject:
      /\bonly\s+(one|other|person|man|woman|bloke|guy|\w+)\b|\bnobody else\b|\bno ?one else\b|\bsole\b/i,
    risk: /\b(can|could|knows?|does|do|able to|price|prices|pricing|quote|sign|approv|authoris|authoriz|permit|licen|certif|access|run|operate)\w*/i,
    question:
      'Before we move on — if he were off for a month, who would do that, and what would they get ' +
      'wrong? A buyer prices that answer more heavily than almost anything else you will tell me.',
  },
  {
    // A key person on nothing but goodwill. The commonest hole in a business of this age and size.
    id: 'key-person-no-contract',
    // A share of turnover, or the words for a customer relationship, mean this is concentration
    // rather than a key person — and the rule below has the right question for it.
    //
    // ⚠️ WRITTEN WITH AN EDITOR, NEVER THROUGH A SHELL STRING. The first version of this line went
    // in via a scripted edit and every `\b` became a literal BACKSPACE byte (0x08), so the regex
    // hunted for control characters and matched nothing. It compiled, typechecked, and read
    // correctly in the file; `grep -P '\x08'` even reported it clean. Only `cat -A` showed the `^H`.
    // Recorded in project memory after the identical failure once before — the lesson is to use the
    // editor for anything containing escapes, and the way to see it is `cat -A`.
    notWhen: /\b([1-9][0-9]?|100)\s*(%|per ?cent)|\bturnover\b|\brevenue\b|\bclient\b|\bcustomer\b|\bbuilder\b|\baccounts? for\b/i,
    subject: /\b(he|she|they|wayne|karen|[A-Z][a-z]+)\b.{0,80}?\b(has|have|is on|works? on|there is)\b/i,
    risk: /\bno (written |formal |signed )?(contract|agreement|employment agreement)\b|\bhandshake\b|\bnothing (in writing|written down)\b|\bnever (signed|had a contract)\b/i,
    question:
      'Before we go on — is there anything in writing with him at all, even an old letter of offer? ' +
      "A buyer prices an undocumented key person as a risk they inherit, so it is worth knowing exactly where that stands.",
  },
  {
    // Customer concentration. A buyer's advisor stops the meeting on this one too.
    id: 'customer-concentration',
    // Includes the money words, because he rarely says "customer" when stating concentration — he
    // names the customer and gives the share of TURNOVER ("the mine is about 60% of our turnover"),
    // which the first draft of this rule missed entirely.
    subject: /\b(client|customer|contract|account|job|work|turnover|revenue|income|billings?)s?\b/i,
    // ⚠️ NO TRAILING \b AFTER THE PERCENT SIGN. `%` is a non-word character and so is the space that
    // follows it, so `\b` there can never match — "60% of our turnover" failed this rule while
    // "60%," happened to pass. A boundary assertion between two non-word characters is always false,
    // and it typechecks, compiles and reads correctly, which is why it survived review.
    risk: /\b([3-9][0-9]|100)\s*(%|per ?cent)|\b(biggest|largest|main|only)\s+(client|customer)\b|\bmost of (our|the|my)\s+(work|revenue|turnover|income)\b/i,
    question:
      'Before we move on — how long is that relationship contracted for, and who at their end holds ' +
      'it? Concentration is not automatically a problem, but a buyer will want to know it does not ' +
      'walk out with one person.',
  },
  {
    // ⚠️ THE LICENCE IN HIS OWN NAME. In a trade this is not a compliance detail, it is whether the
    // sale completes at all — a buyer cannot switch the lights on the Monday after settlement
    // without it. Ray told her and got back: "That's an important compliance detail. Anything you'd
    // like me to capture or act on around that?"
    //
    //   "It is not a compliance detail, it is the reason the sale falls over."
    //
    // Deliberately narrow: it needs the instrument AND the personal-holding, so an ordinary mention
    // of insurance or a certificate does not trip it.
    id: 'personal-licence',
    subject: /\b(licen[cs]e|registration|accreditation|certification|ticket|permit|authority)\b/i,
    risk: /\b(in|under)\s+(my|his|the owner'?s?|your)\s+(own\s+)?(name|personal)\b|\bpersonally\s+held\b|\bheld\s+(by|in)\s+(me|him|my|his)\b|\bnot\s+(in\s+)?the\s+(company|business)'?s?\b/i,
    question:
      'Stop there — that one decides whether a sale completes. Can it be transferred to the company, ' +
      'or would a buyer have to qualify someone of their own before they could trade? That is worth ' +
      'finding out before anything else on this list.',
  },
  {
    // Succession. The thing this whole product is about, said out loud and then filed.
    id: 'no-successor',
    subject: /\b(retire|retiring|retirement|step back|stepping back|hand ?over|succession|when i (go|leave|stop))\b/i,
    risk: /\bno ?(one|body)\b|\bnobody\b|\bno successor\b|\bno second\b|\bhaven'?t (found|got|trained)\b/i,
    question:
      'Before we go on — of the people you have now, who is closest to being able to do it, and what ' +
      'is actually missing? Naming the gap is what turns this from a worry into something we can ' +
      'work on.',
  },
];

/**
 * The follow-up a fact earns, or null.
 *
 * ⚠️ AT MOST ONE. A fact can trip two rules — an undocumented sole signatory who is also the
 * succession plan — and returning both would have her fire a two-part interrogation at a man who
 * just confided something. The first rule in order wins; the second risk will come round again,
 * because these facts are never mentioned only once.
 */
export function keyRiskFollowUp(content: string): KeyRisk | null {
  const text = String(content ?? '');
  if (text.length < 20) return null; // Too short to carry both signals honestly.
  for (const rule of RULES) {
    if (rule.notWhen?.test(text)) continue;
    if (rule.subject.test(text) && rule.risk.test(text)) {
      return { id: rule.id, question: rule.question };
    }
  }
  return null;
}
