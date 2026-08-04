// lib/kira/welcome-back.ts
// Builds the spoken "welcome back" opener from conversation context.
//
// WHY THIS EXISTS — the failure it fixes:
// The canonical continuity prompt asks the agent to call get_conversation_context at the start of
// every conversation and open by referencing the last topic. In practice the agent frequently does
// NOT call it at turn zero: it speaks its (frozen) first_message, then waits. The user says "where
// did we get to?" and the agent answers from its SYSTEM PROMPT — which still holds the months-old
// signup objective — producing the exact failure "It looks like this is our first chat here… you
// mentioned wanting to travel around Australia" while a full, correct history sat one RPC away.
//
// Prompt-only instructions could not fix this: the agent had BOTH the continuity instruction and an
// explicit "never assert the signup objective" block, and ignored them. A tool call the model may
// skip is not a mechanism — so the opener is rendered SERVER-SIDE from the canonical store and
// pushed as a per-session first_message override. The agent still owns every subsequent pull
// (recall_memory, deeper history); this only guarantees the first sentence is true.
//
// On VOICE_MEMORY_STANDARD ("the agent PULLS state, the operator never reads it in"): the intent of
// that rule is that state must come from the canonical store rather than being invented or cached by
// the caller. That holds here — this reads the SAME get_conversation_context RPC the agent's own
// tool reads, at connect time, and renders it. What changes is only that speaking it is no longer
// optional. See task #4: this belongs in the canonical package, because every convai consumer has
// this same turn-zero gap.

export interface ConversationContextShape {
  has_history?: boolean;
  last_topic?: string | null;
  time_gap_category?: 'new' | 'recent' | 'today' | 'this_week' | 'older' | string;
  message_count?: number | null;
}

/**
 * Turn a stored last_topic into something speakable.
 *
 * Stored topics are LLM NARRATIONS of the call ("The conversation began with the user asking the
 * agent to review a completed Iress Open form. The agent then…"). Spoken verbatim they sound like a
 * machine reading a log. This takes the first sentence and rewrites the narration into natural
 * second person ("you wanted me to review a completed Iress Open form"). The real fix is to have the
 * distil write a clean topic in the first place — carried into #4 (canonical); this is the
 * client-side cleanup until then.
 */
function toSpokenTopic(rawTopic: string): string {
  let t = String(rawTopic || '').trim().replace(/\s+/g, ' ');

  // First sentence only — the boundary can sit after a closing quote ("Executor AI." The agent…).
  const m = t.match(/[.!?]["”’']?\s+[A-Z]/);
  if (m && (m.index ?? 0) > 25) t = t.slice(0, (m.index ?? 0) + 1);
  // Cut on a WORD boundary. At 140 characters this was severing mid-word, and she said it out loud:
  // "…emphasizing a detailed, conversational approach ak." A machine reading a log is recoverable;
  // a machine reading half a word is not.
  if (t.length > 140) t = t.slice(0, t.lastIndexOf(' ', 140) > 40 ? t.lastIndexOf(' ', 140) : 140);

  // Rewrite the "The conversation began with X {verb}…" narration into second person.
  t = t.replace(/^the conversation (began|started|opened|kicked off) with /i, '');
  t = t.replace(/^the user asking the (agent|assistant) to /i, 'you wanted me to ');
  t = t.replace(/^the user asking (the (agent|assistant) )?/i, 'you asked ');
  t = t.replace(/^the user (telling|informing) the (agent|assistant)( that)? /i, 'you told me ');
  t = t.replace(/^the user (requesting|wanting) /i, 'you wanted ');
  // "The user reiterated the need for…" was becoming "you WERE reiterated the need for…" — the
  // rewrite assumed a gerund and these narrations are overwhelmingly past tense. Spoken aloud as the
  // FIRST THING SHE SAYS, it is the sentence that decides whether she sounds like a person.
  t = t.replace(/^the user /i, 'you ');
  t = t.replace(/^the (agent|assistant) (recalling|confirming|reviewing|discussing|summari[sz]ing) /i, 'we went over ');
  t = t.replace(/^the (agent|assistant) /i, 'we were ');
  t = t.replace(/\bthe user's\b/gi, 'your').replace(/\bthe user\b/gi, 'you');
  // She is the agent. Left as "the agent" she talks about herself in the third person in the first
  // sentence of the call, which sounds like a machine reading its own log.
  t = t.replace(/\bthe (agent|assistant)\b/gi, 'me');

  // Drop a dangling opening quote whose partner was cut off with the rest of the sentence.
  if (((t.match(/["“”]/g) || []).length) % 2 === 1) t = t.replace(/\s*["“”][^"“”]*$/, '');

  t = t.replace(/[\s,;:.]+$/, '');

  // LAST GATE, and it exists because every rule above is a heuristic over text nobody controls.
  // A trailing one- or two-letter word is a truncation the cleanup did not catch; a remaining
  // "the user"/"the agent" is a narration the rewrites missed. Either way she is about to SAY it, so
  // returning nothing is better — the caller has an honest fallback for exactly this case.
  const lastWord = t.split(/\s+/).pop() ?? '';
  if (lastWord.length <= 2 && /^[a-z]+$/i.test(lastWord)) return '';
  if (/\bthe (user|agent|assistant)\b/i.test(t)) return '';
  if (endsMidSentence(t)) return '';
  return t;
}

/**
 * Does this end on a word that cannot end a sentence?
 *
 * THE FAILURE THIS CLOSES, heard on a live call: she opened with
 *
 *   "Right Dennis — last time, you, Dennis, opting to continue discussing the."
 *
 * Traced exactly. The stored topic was "The conversation began with the user, Dennis, opting to
 * continue discussing the \"Orchestrator Handover — Lot 442 Earthworks & Services Packet.\"" The
 * 140-character cut landed inside the quoted title, which left ONE unbalanced quote, and the
 * dangling-quote rule above then removed everything from that quote to the end — taking the object
 * of the sentence with it. What survived was a clause ending in a bare article.
 *
 * The existing gate could not catch it: it rejects a trailing word of one or two letters, and "the"
 * is three. So the guard was correct in principle and one character short in practice.
 *
 * Function words are the right test rather than a longer length limit, because the tell is
 * GRAMMATICAL, not dimensional — an article, preposition or conjunction at the end means the thing
 * it introduced was cut off, whatever its length. A content word ending the phrase ("…discussing the
 * earthworks packet") is a legitimately short summary and must still travel.
 */
function endsMidSentence(text: string): boolean {
  const DANGLING = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'from',
    'about', 'into', 'over', 'that', 'this', 'his', 'her', 'their', 'its', 'my', 'your', 'our',
    'is', 'was', 'were', 'be', 'been', 'as', 'by', 'if', 'so', 'than', 'then', 'via',
  ]);
  const last = (text.split(/\s+/).pop() ?? '').toLowerCase().replace(/[^a-z']/g, '');
  return DANGLING.has(last);
}

/**
 * Render the first thing the agent says. Returns `null` when there is no history — the agent's own
 * new-user greeting is correct in that case and must not be overridden.
 */
export function buildWelcomeBackFirstMessage(
  firstName: string,
  context: ConversationContextShape | null | undefined,
): string | null {
  if (!context?.has_history) return null;

  const name = firstName?.trim() || 'there';
  const cleaned = context.last_topic ? toSpokenTopic(context.last_topic) : '';

  // LAST GATE BEFORE SHE SAYS IT OUT LOUD.
  //
  // Everything toSpokenTopic does is a heuristic over text nobody controls — an LLM narration of a
  // call, in whatever shape it came out. Two failures survive it and both were audible on 31 July:
  // a truncation that severed a word ("…conversational approach ak") and a narration the rewrites
  // did not reach, which leaves her talking about "the user" to the user.
  //
  // Checked HERE, at the point of use, rather than inside the cleanup: the cleanup returns a string
  // and the caller decides whether it is speakable. An unspeakable topic is not a degraded greeting,
  // it is a different and honest one — the fallback below already exists for exactly this.
  const lastWord = cleaned.split(/\s+/).pop() ?? '';
  const truncated = lastWord.length > 0 && lastWord.length <= 2 && /^[a-z]+$/i.test(lastWord);
  const narration = /\bthe user\b/i.test(cleaned);
  const topic = truncated || narration ? '' : cleaned;

  // Degrade, don't fake — but do not narrate the bookkeeping either.
  //
  // WAS: "I know we've talked before, though I don't have a clean summary of where we left off."
  // Heard on a live call, and it is the FIRST SENTENCE of the session. It is honest about the wrong
  // thing: the owner did not ask about our summary column, and telling him it is empty describes our
  // storage rather than his business. He hears an assistant apologising for her own filing before he
  // has said a word — which is precisely the class of leak we removed from the Genome, arriving by
  // voice instead.
  //
  // The honest content is "we have talked before, and I want to know what we are doing now". That
  // needs no reference to what we do or do not hold. She still has the recalled memories in context
  // and can use them the moment he speaks; what she must not do is open by discussing her own gaps.
  if (!topic) {
    return `Hey ${name} — good to hear from you again. What are we picking up?`;
  }

  const gap = context.time_gap_category;
  const lead =
    gap === 'recent'
      ? `Right ${name} —`
      : gap === 'today'
        ? `Hey ${name}, good to hear from you again —`
        : gap === 'this_week'
          ? `Hey ${name}, good to see you again —`
          : `Hey ${name}, it's been a little while —`;

  // "Last time, <second-person phrase>." reads naturally now that the topic is rewritten from the
  // narration. The close is a fork, not an open question: she states what we were doing and offers
  // to continue OR pivot, without waiting to be asked.
  return `${lead} last time, ${topic}. Do you want to carry on with that, or is there something new?`;
}
