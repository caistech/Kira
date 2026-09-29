// lib/kira/extract-client-profile.ts
// Extracts a ClientProfile from a transcript — standalone, so the folded-in business-journey
// post-call hook (lib/kira/convai.ts) doesn't need to spin up @caistech/discovery-agent's full
// session machinery (which wants an ElevenLabs API key and a session secret this call site has no
// use for) just to run its extraction step. Same schema, same system prompt, same model as the
// original discovery flow — only the delivery mechanism changed, not what gets extracted.

import { createOpenAIRunner } from './structured-runner';
import { ClientProfileSchema, type ClientProfile } from './discovery-schema';
import { DISCOVERY_EXTRACTION_SYSTEM, DISCOVERY_EXTRACTION_MODEL } from './discovery-config';

export interface TranscriptTurn {
  role: string;
  content: string;
}

/**
 * Never throws — a failed extraction must not break the post-call path (same discipline as
 * checklist-assess.ts / consultant-genome-extract.ts). Returns null on any failure, no key, or
 * empty transcript — degrade, don't fake.
 */
export async function extractClientProfile(
  turns: TranscriptTurn[],
  opts: { apiKey?: string } = {},
): Promise<ClientProfile | null> {
  const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY ?? '';
  if (!apiKey || turns.length === 0) return null;

  const transcript = turns.map((t) => `${t.role}: ${t.content}`).join('\n');

  try {
    const runner = createOpenAIRunner(apiKey);
    const { result } = await runner.run({
      model: DISCOVERY_EXTRACTION_MODEL,
      system: DISCOVERY_EXTRACTION_SYSTEM,
      input: transcript,
      schema: ClientProfileSchema,
    });
    return result as ClientProfile;
  } catch (error) {
    console.error('[extract-client-profile] extraction failed:', error);
    return null;
  }
}
