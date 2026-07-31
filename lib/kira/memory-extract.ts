// lib/kira/memory-extract.ts
// The operational memory distillation step: turn a finished conversation's transcript into the few
// DURABLE memories worth keeping about the user, which the canonical distillConversationToMemory then
// saves into kira_memory (so recall_memory has distilled facts to pull, on top of the conversation-
// history continuity get_conversation_context already provides). Uses OpenAI (Kira's ANTHROPIC key is
// invalid; OPENAI_API_KEY is), same as the discovery extraction. Injected into kiraConvaiRoutes().

import type { MemoryExtractor } from '@caistech/elevenlabs-convai';

const TYPES = ['preference', 'context', 'goal', 'decision', 'followup', 'correction', 'insight'] as const;

const SYSTEM = `You distil a coaching / assistant conversation into a few DURABLE memories worth
remembering about THIS person for future sessions — their preferences, goals, decisions, ongoing
context, follow-ups, corrections, and insights about how they think or work. Keep ONLY what will
still matter next time; skip small talk and one-off details. Never invent — only what the transcript
establishes.

Return ONLY JSON of the form:
{"memories":[{"content": string, "memoryType": one of ${TYPES.join(' | ')}, "importance": integer 1-10, "tags": string[]}]}
0 to 8 items. Higher importance = more load-bearing for future help.

REGISTER — how "content" must be written. These memories are read back in two places: by the
assistant, and by the owner himself, in a document that is his business's handover manual. Write
each one as A STATEMENT OF THE BUSINESS, not as a report about a person:

  YES  "Commercial jobs are priced at cost plus 18%."
  NO   "Dennis says he prices commercial jobs at cost plus 18%."
  YES  "Wavecrest is the largest client; the relationship runs through Dave."
  NO   "He mentioned that Wavecrest is his biggest client."

A manual that refers to its own owner in the third person does not read as his manual — it reads as
a file someone is keeping ON him, which for an owner who has told nobody he is selling is precisely
the wrong feeling. Drop "he said", "he mentioned", "the user wants"; state the fact itself.

THE ONE EXCEPTION is a fact genuinely about the person rather than the business — how he prefers to
work, be contacted, or be spoken to (memoryType "preference"). Write those as "The owner prefers…",
which is honest about what they are. Never use his name in either case.`;

export function createMemoryExtractor(apiKey: string): MemoryExtractor {
  return async (turns) => {
    if (!apiKey || turns.length === 0) return [];
    const transcript = turns
      .map((t) => `${t.role}: ${t.content}`)
      .join('\n')
      .slice(0, 24_000);

    let data: unknown;
    try {
      // Env-configurable base URL + model so the memory-governance LLM can run on any
      // OpenAI-compatible endpoint (open-weight servers speak this shape). Defaults to OpenAI —
      // unchanged today; an acquirer repoints the runtime via env with no code change.
      const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.KIRA_EXTRACTION_MODEL || 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: transcript },
          ],
          response_format: { type: 'json_object' },
        }),
      });
      if (!res.ok) return []; // degrade-don't-fake: no memory beats a fabricated one
      data = await res.json();
    } catch {
      return [];
    }

    let parsed: { memories?: unknown };
    try {
      const content = (data as { choices?: { message?: { content?: string } }[] })
        ?.choices?.[0]?.message?.content || '{}';
      parsed = JSON.parse(content);
    } catch {
      return [];
    }

    const items = Array.isArray(parsed.memories) ? parsed.memories : [];
    return items
      .filter((m): m is Record<string, unknown> => !!m && typeof (m as Record<string, unknown>).content === 'string')
      .map((m) => ({
        content: String(m.content).trim(),
        memoryType: (TYPES as readonly string[]).includes(String(m.memoryType))
          ? (m.memoryType as (typeof TYPES)[number])
          : ('context' as const),
        importance: Math.max(1, Math.min(10, Math.round(Number(m.importance)) || 5)),
        tags: Array.isArray(m.tags)
          ? (m.tags as unknown[]).filter((t): t is string => typeof t === 'string').slice(0, 6)
          : [],
      }))
      .filter((m) => m.content.length > 0)
      .slice(0, 8);
  };
}
