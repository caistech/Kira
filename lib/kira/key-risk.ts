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
}

const RULES: Rule[] = [
  {
    // Ray's own case. One person holding an authority the business depends on, with nothing written.
    id: 'sole-authority-undocumented',
    subject: /\b(only|sole|solely|just)\s+(one|1|other|person|man|woman|bloke|guy)\b|\bonly\s+\w+\s+can\b|\bsole\s+(signatory|authority|approver)\b/i,
    risk: /\b(sign|signs|signing|signatory|approve|approves|authoris|authoriz|permit|licence|license|certif|access|password|key)\w*/i,
    question:
      'Before we go on — is that authority written into the contract with the client, or is it ' +
      'personal to him? That one answer is worth more than most of the rest of this.',
  },
  {
    // A key person on nothing but goodwill. The commonest hole in a business of this age and size.
    id: 'key-person-no-contract',
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
    if (rule.subject.test(text) && rule.risk.test(text)) {
      return { id: rule.id, question: rule.question };
    }
  }
  return null;
}
