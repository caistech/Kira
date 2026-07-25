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

/** Trim a stored last_topic (an LLM summary, often cut mid-sentence) to a speakable clause. */
function toSpokenTopic(rawTopic: string): string {
  let topic = rawTopic.trim().replace(/\s+/g, ' ');

  // Stored topics are truncated at a fixed length and routinely end mid-word. Cut back to the last
  // sentence boundary when there is one, so the agent never speaks a severed fragment.
  const lastStop = Math.max(topic.lastIndexOf('. '), topic.lastIndexOf('; '));
  if (lastStop > 60) topic = topic.slice(0, lastStop);

  topic = topic.replace(/[\s,;:.]+$/, '');

  // Summaries are written ABOUT the conversation ("The conversation began with the agent…"). Strip
  // that framing so the opener sounds like a person remembering, not a transcript being read out.
  topic = topic
    .replace(/^the conversation (began|started|opened) with (the agent|kira)\s*/i, '')
    .replace(/^the (user|agent|conversation)\s+/i, '')
    .replace(/^(discussed|covered|focused on)\s+/i, '');

  return topic;
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
      ? `Right ${name}, picking up where we left off.`
      : gap === 'today'
        ? `Hey ${name} — good to hear from you again.`
        : gap === 'this_week'
          ? `Hey ${name}, good to see you again.`
          : `Hey ${name} — it's been a little while.`;

  // The close is a fork, not an open question: the standing requirement is that she states what we
  // were doing and offers to continue OR pivot, without waiting to be asked.
  return `${lead} Last time we were on ${topic}. Do you want to carry on with that, or is there something new?`;
}
