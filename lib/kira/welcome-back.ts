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
  if (t.length > 140) t = t.slice(0, 140);

  // Rewrite the "The conversation began with X {verb}…" narration into second person.
  t = t.replace(/^the conversation (began|started|opened|kicked off) with /i, '');
  t = t.replace(/^the user asking the (agent|assistant) to /i, 'you wanted me to ');
  t = t.replace(/^the user asking (the (agent|assistant) )?/i, 'you asked ');
  t = t.replace(/^the user (telling|informing) the (agent|assistant)( that)? /i, 'you told me ');
  t = t.replace(/^the user (requesting|wanting) /i, 'you wanted ');
  t = t.replace(/^the user /i, 'you were ');
  t = t.replace(/^the (agent|assistant) (recalling|confirming|reviewing|discussing|summari[sz]ing) /i, 'we went over ');
  t = t.replace(/^the (agent|assistant) /i, 'we were ');
  t = t.replace(/\bthe user's\b/gi, 'your').replace(/\bthe user\b/gi, 'you');

  // Drop a dangling opening quote whose partner was cut off with the rest of the sentence.
  if (((t.match(/["“”]/g) || []).length) % 2 === 1) t = t.replace(/\s*["“”][^"“”]*$/, '');

  t = t.replace(/[\s,;:.]+$/, '');
  return t;
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
  const topic = context.last_topic ? toSpokenTopic(context.last_topic) : '';

  // Degrade, don't fake: history exists but no usable topic summary → acknowledge the return
  // honestly and ask, rather than inventing a subject.
  if (!topic) {
    return `Hey ${name} — good to hear from you again. I know we've talked before, though I don't have a clean summary of where we left off. What are we picking up?`;
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
