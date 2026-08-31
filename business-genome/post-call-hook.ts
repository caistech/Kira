// business-genome/post-call-hook.ts
//
// POST-CALL HOOK — integrates genome extraction into the Kira conversation pipeline.
//
// This function is called from lib/kira/convai.ts after a conversation ends.
// It runs PARALLEL to the existing memory distillation — it does NOT replace it.
//
// ARCHITECTURE RULE:
//   kira_memory = interaction/context memory (what Kira recalls)
//   genome_* = structured business knowledge (the Business Genome)
//   They are NOT the same thing. This hook writes to genome_* only.

import { runGenomeExtraction } from './extract';

/**
 * The post-call hook for genome extraction.
 *
 * Call this from convai.ts onConversationComplete, AFTER the memory pipeline completes.
 * It extracts structured entities, facts, and relationships from the transcript.
 *
 * @param params.userId - The business owner's user ID
 * @param params.conversationId - The Kira conversation ID
 * @param params.elevenlabsConversationId - The ElevenLabs conversation ID (for transcript lookup)
 * @param params.transcriptMessages - The transcript messages (role + content)
 */
export async function genomePostCallHook(params: {
  organisationId: string;
  userId: string;
  conversationId: string;
  transcriptMessages: Array<{ role: string; content: string }>;
}): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL;
  const model = process.env.KIRA_EXTRACTION_MODEL;
  
  if (!apiKey && !baseUrl) {
    console.warn('[genome/post-call-hook] No LLM configured (OPENAI_API_KEY or OPENAI_BASE_URL) — skipping genome extraction');
    return;
  }

  // Skip if no meaningful transcript
  const totalLength = params.transcriptMessages.reduce(
    (sum, m) => sum + (m.content?.length ?? 0),
    0
  );
  if (totalLength < 100) {
    console.log('[genome/post-call-hook] transcript too short — skipping genome extraction');
    return;
  }

  // Run extraction (degrade-don't-fake — errors are logged, never thrown)
  await runGenomeExtraction({
    organisationId: params.organisationId,
    userId: params.userId,
    conversationId: params.conversationId,
    transcriptMessages: params.transcriptMessages,
    apiKey: apiKey ?? '',
    baseUrl,
    model,
  });
}
