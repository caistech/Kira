// What belongs to the OWNER and must never travel in the buyer's document.
//
// THE DEFECT THIS CLOSES. The Markdown export calls itself a handover document — "organised by the
// questions a buyer's advisor asks in due diligence" — and `/my-genome` offers it under a button
// reading "Download the handover document". Nothing filtered it. The synthetic account's entire
// Genome was "the owner is considering selling the business after running it for 35 years but has
// not told anyone", and that sentence rendered straight into the document we told him to hand over.
//
// Nothing leaked: only the owner can download it. That is not the risk. The risk is that WE framed a
// file as the thing you give a buyer and then put the single most damaging sentence a vendor can
// disclose inside it. He forwards it to his accountant and the harm is done by our labelling.
//
// THE LINE, and it is one line: does this describe HOW THE BUSINESS RUNS, or does it describe THE
// OWNER'S POSITION — what he intends, how he feels, what he has not told people, what he would
// accept? The first is what a buyer is paying to understand. The second only ever moves the price
// against him, and no vendor pack in the world contains it.
//
// So a withheld entry is NOT a gap in the buyer's document. It was never in scope for it. That is
// why the buyer's copy does not say "3 entries withheld" — a count like that discloses the existence
// of exactly what it withholds, and invites the question it exists to prevent. The obligation to
// state gaps honestly (see the export route's header) is about SECTIONS OF THE BUSINESS with nothing
// in them, which is information a buyer needs. The vendor's state of mind is not.
//
// FAIL TOWARDS WITHHOLDING. Every rule here is written to over-match rather than under-match. A
// business fact wrongly kept out of the buyer's copy costs a line of detail the owner can add back
// by hand. A private fact wrongly let through cannot be recalled once it is read, and it is worth
// real money to the person reading it. The two errors are not comparable and the code should not
// pretend they are.
//
// ⚠️ KNOWN LIMIT — this is a deterministic matcher, so its weakness is RECALL, not honesty: a
// paraphrase that avoids every pattern below will pass through. It is a mechanism rather than a
// request, which is the bar this codebase sets, but it is not a model of meaning. The LLM-backed
// version (classified once at write time and cached on the row, exactly as `genome_section` already
// is) is tracked separately in BUILD_REGISTER.md as B13. Do not read the presence of this file as
// the problem being finished.

/** Why an entry is the owner's alone. Carried through so he can see the reason, not just the verdict. */
export type PrivateReason =
  | 'exit-intent'
  | 'not-yet-told'
  | 'personal-circumstances'
  | 'negotiating-position'
  | 'how-he-feels'
  | 'how-he-works';

/**
 * The vocabulary, as an array, so the classifier can validate a model's answer against exactly the
 * same list the renderer will later look up. Derived from the label map rather than written twice —
 * a reason the model may return but the UI cannot label would render an empty explanation beside a
 * withheld entry, which is worse than no marker: he would see something held back and not be told
 * what.
 */
export const PRIVATE_REASONS = [
  'exit-intent',
  'not-yet-told',
  'personal-circumstances',
  'negotiating-position',
  'how-he-feels',
  'how-he-works',
] as const satisfies readonly PrivateReason[];

/** What the owner is shown next to a withheld entry. His words for it, not the enum's. */
export const PRIVATE_REASON_LABEL: Record<PrivateReason, string> = {
  'exit-intent': 'that you are thinking about selling',
  'not-yet-told': 'who you have and have not told',
  'personal-circumstances': 'your personal circumstances',
  'negotiating-position': 'what you would accept',
  'how-he-feels': 'how you feel about the business',
  'how-he-works': 'how you want to work with Kira',
};

/**
 * Phrases that mean the business trades, not that the owner is leaving.
 *
 * "Sells", "sales" and "sold" are ordinary operating words — "sells fencing to builders", "sales are
 * up", "sold 40 units". Without this guard the exit-intent rule would withhold most of a revenue
 * section, which is the one part of the Genome a buyer most wants. Checked BEFORE the exit rule and
 * only neutralises that rule; every other category is unaffected.
 */
const TRADING_NOT_LEAVING =
  /\b(sell|sells|selling|sold|sale|sales)\b[^.]{0,40}\b(to|through|via|per|of)\b|\bsales?\b\s+(are|was|were|is|figures|revenue|team|rep|price|volume|growth|target)|\b(annual|monthly|weekly|total|gross|net)\s+sales?\b/i;

/**
 * The rules, in the order they are tried. Each is a category plus the pattern that establishes it.
 *
 * Written to be read: someone auditing why a sentence was withheld should be able to point at one
 * line. Anything requiring two conditions is expressed as one regex with both, rather than as
 * cleverness in the loop.
 */
const RULES: { reason: PrivateReason; pattern: RegExp; ignoreIfTrading?: boolean }[] = [
  {
    // The owner leaving, not the business trading. Anchored on the thing being disposed of — "the
    // business", "the company", "up", "out" — so "sells fencing" does not match but "sell the
    // business", "sell up", "get out", "wind it down" and "succession plan" all do.
    reason: 'exit-intent',
    ignoreIfTrading: true,
    pattern:
      /\b(sell|selling|sale|dispose|divest|offload)\b[^.]{0,25}\b(the |his |her |their |this |my )?(business|company|firm|practice|operation|shop|yard|it)\b|\bsell(ing)?\s+up\b|\bexit(ing)?\s+(the\s+)?(business|company|plan|strategy)?\b|\b(retire|retiring|retirement|succession|stepping (down|back|away)|step (down|back|away)|wind(ing)? (it |the business )?(down|up)|get(ting)? out|move on from|hand(ing)? (it |the business )?(on|over))\b|\b(thinking|considering|planning|looking|wants?|wanting|intends?|ready)\b[^.]{0,30}\b(to sell|to exit|to retire|an exit|a sale)\b/i,
  },
  {
    // Who does not know yet. The most expensive sentence in the document, because it tells a buyer
    // both that a sale is coming and that the vendor is not yet committed in public.
    reason: 'not-yet-told',
    pattern:
      /\b(ha(s|ve)n't|has not|have not|hadn't|had not|not yet|yet to|never)\b[^.]{0,30}\b(told|informed|mentioned|discussed|said anything|announced|disclosed|shared)\b|\b(no ?one|nobody|none of (the |his |her |their )?(staff|team|family|kids|children|partners?))\b[^.]{0,25}\b(knows?|aware|been told)\b|\b(keep|keeping|kept|stay|staying)\b[^.]{0,20}\b(quiet|secret|confidential|between us|to himself|to herself)\b|\bbefore (telling|announcing|letting)\b|\bwithout (telling|informing)\b/i,
  },
  {
    // TELLING PEOPLE ABOUT A SALE. Ordered AFTER not-yet-told, and deliberately NOT `ignoreIfTrading`.
    //
    // This is the rule that was missing, found in production by a tester on 2026-08-02. The sentence
    // that got through:
    //
    //   "…prefers to keep control over when and how sensitive communications, such as ANNOUNCING A
    //    SALE TO CUSTOMERS, are sent…"
    //
    // Two independent failures had to line up, which is why it survived review. First, the trading
    // guard matched — `sale` followed by `to` inside forty characters is exactly the shape of "sells
    // fencing to builders", so the guard did its job and switched the exit rule off. Second, the exit
    // rule would not have caught it anyway: it anchors on the thing being disposed of ("sell the
    // business"), and here the noun after "sale" is the audience, not the asset.
    //
    // So the guard that protects an ordinary tradesman's revenue section is what let a sale
    // announcement into the handover document. Both behaviours are correct in isolation; the gap is
    // between them, and it needs its own line rather than a loosening of either.
    //
    // ORDER MATTERS AND IS LOAD-BEARING. Placed first, this rule stole "he has not told his staff
    // about the sale" from not-yet-told — both withhold it, so nothing leaked, but the owner is shown
    // the REASON beside the withheld entry and "who you have and have not told" is the truer and more
    // specific one. An existing test caught it. Most specific wins; this rule is the fallback for the
    // sentences the other two do not describe.
    //
    // WHAT MAKES THIS DIFFERENT FROM TRADING: a disclosure verb. Announcing, telling, informing,
    // notifying someone of "a sale" is about the EVENT becoming known — the vendor's position — not
    // about goods changing hands. `\bsale\b` is singular on purpose: "announce sales figures", "sales
    // to the eastern states" and "sold 40 units to the council" all keep passing.
    //
    // ⚠️ ACCEPTED FALSE POSITIVE: a retailer announcing a discount sale to customers is withheld.
    // That is the correct error under this file's stated policy — a business fact wrongly kept out
    // costs a line the owner can add back by hand, and a sale announcement wrongly let through cannot
    // be recalled by the person who reads it.
    reason: 'exit-intent',
    pattern:
      /\b(announc\w*|telling|tells?|told|inform\w*|disclos\w*|notify|notifying|notified|breaking the news|word gets out|finding out)\b[^.]{0,40}\b(a|the|his|her|their|any|this)\s+sale\b|\b(a|the|his|her|their|this)\s+sale\b[^.]{0,40}\b(announc\w*|is announced|becomes known|gets out)\b/i,
  },
  {
    // Health, family and money pressure. "health and safety", "safety record" and similar are
    // excluded inside the pattern rather than by a second guard, because they are the only common
    // business collocations of "health" and the exception belongs where the rule is.
    reason: 'personal-circumstances',
    pattern:
      /\b(divorce|separation|separating|marriage|widow|bereave|estate planning|inheritance|his will|her will)\b|\b(health)\b(?!\s*(and|&)\s*safety)(?![- ]safety)[^.]{0,30}\b(issue|problem|scare|reason|declin|deteriorat|not good|poor|failing)\b|\b(ill(ness)?|cancer|stroke|heart attack|surgery|diagnos(is|ed))\b|\b(personally\s+(guarantee[ds]?|guaranteeing|liable|exposed)|remortgag|second mortgage|personal (debt|loan|guarantee))\b/i,
  },
  {
    // What he would take. A buyer who learns the floor never pays above it.
    //
    // ⚠️ THE QUALIFIER AFTER "walk away" IS REQUIRED, not optional, and the test that caught this is
    // worth keeping: "he decides which jobs to walk away from based on access" is OPERATING
    // JUDGEMENT, and §1 lists "when to walk away from a job" as one of the five things a broker
    // wants and never gets. An optional qualifier withheld it — the filter would have stripped a
    // headline feature out of the buyer's document while appearing to work correctly.
    reason: 'negotiating-position',
    pattern:
      /\bwalk[- ]?away\s+(price|number|figure|point)\b|\b(would|will|could|might|happy to|prepared to|willing to)\b[^.]{0,25}\b(accept|take|settle for|let it go for|come down to)\b|\b(minimum|lowest|least|bottom line|reserve)\b[^.]{0,20}\b(price|figure|number|he'd|she'd|acceptable)\b|\b(needs?|wants?|hoping for|holding out for|after)\b[^.]{0,15}\b(at least|no less than|around)\b[^.]{0,15}[$£€]/i,
  },
  {
    // Burnout and reluctance. Reads as leverage to a buyer and as nothing at all to an operator.
    reason: 'how-he-feels',
    pattern:
      /\b(burn(t|ed)?[- ]out|burnout|exhausted|worn out|had enough|sick of|tired of|fed up|over it|losing interest|no longer enjoys?|doesn't enjoy|stress(ed|ful)?\b[^.]{0,20}\b(him|her|owner))\b|\b(desperate|urgent(ly)?|needs? out|can't (keep|carry on|go on))\b/i,
  },
  {
    // HOW HE WANTS TO WORK WITH KIRA — instructions to the assistant, not facts about the business.
    //
    // An authenticated walkthrough found these in the buyer handover document, on a page whose
    // privacy copy promises it "leaves out your own position — your plans, your circumstances, what
    // you would accept". Measured against the matcher, all three exported with NO reason at all:
    //
    //   "prefers to maintain strict control over communications and approvals, explicitly
    //    disagreeing with sending sensitive emails without prior approval"
    //   "prefers to give standing approval for sending sensitive communications"
    //   "reducing owner dependency is his priority"
    //
    // Why a buyer must not read them: the first two say how cautious he is and where he will not
    // delegate, which is negotiating posture wearing operational clothes. The third states his
    // priority, and a buyer who knows what the vendor is trying to fix knows what to discount.
    // None of them is a fact about how the business runs, which is the only thing the document is
    // for.
    //
    // Deliberately anchored on the OWNER as the subject plus an approval/permission/priority verb,
    // rather than on "approval" alone — "the job needs council approval" is an operating fact and
    // must keep travelling. Placed LAST, deliberately: exit-intent and not-yet-told are the more consequential readings of
    // a sentence, and a line about "announcing a sale to customers" should tell the owner it was
    // withheld because it reveals the sale, not because it describes his approval habits. This
    // catches what nothing else does, which is the gap it was written for.
    reason: 'how-he-works',
    pattern:
      /\b(owner|he|she|they|client|user)\b[^.]{0,40}\b(prefers?|wants?|insists?|requires?|expects?|refus(es?|ing)|declin(es?|ing)|disagree(s|ing)?|authoris(es?|ed)|permits?|allows?)\b[^.]{0,60}\b(approval|approve|permission|sign[- ]off|standing|control over|oversight|before sending|without (telling|asking|checking|prior))\b|\b(reducing|reduce|less|lower)\b[^.]{0,25}\bowner[- ]depend(ence|ency|ent)\b|\b(his|her|their|the owner'?s)\b[^.]{0,20}\b(priority|priorities|main (goal|aim|objective))\b/i,
  },
];

/**
 * The owner's own, or null when the entry describes the business.
 *
 * Pure and synchronous on purpose: it runs inside the export and the page render, and a filter that
 * can fail is a filter that can fail OPEN. There is no network call to time out and no model to
 * decline, so there is no path where a private fact reaches the buyer's copy because something else
 * was unavailable.
 */
export function ownerPrivateReason(content: string): PrivateReason | null {
  const text = String(content ?? '');
  if (!text.trim()) return null;
  const trading = TRADING_NOT_LEAVING.test(text);
  for (const rule of RULES) {
    if (rule.ignoreIfTrading && trading) continue;
    if (rule.pattern.test(text)) return rule.reason;
  }
  return null;
}

/** Convenience for the render paths, which only ever ask the yes/no. */
export function isOwnerPrivate(content: string): boolean {
  return ownerPrivateReason(content) !== null;
}
