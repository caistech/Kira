// lib/kira/discovery.ts
// The SERVER side of the deep-discovery phase, configured on @caistech/discovery-agent. Kira here
// is the coach / consultant / quasi-doctor who draws the whole operation OUT of the owner's head
// (for an owner-operator like Chris there are no repos/decks — the conversation IS the source) and
// distils it into the Client Profile. The profile deepens across coaching sessions; the
// discovery-complete gate says "briefed enough to operate."
//
// The persona + stages live in the client-safe lib/kira/discovery-config.ts (shared with the widget).
// This file adds the server-only surface: primeContext, the extraction runner, the onResult sink,
// and the injected convai/ElevenLabs/Supabase deps.

import { defineDiscovery, type Discovery } from '@caistech/discovery-agent';
import { createServiceClient } from '@/lib/supabase/server';
import { createOpenAIRunner } from '@/lib/kira/structured-runner';
import { KIRA_CONVAI_TABLES } from '@/lib/kira/convai';
import {
  DISCOVERY_SLUG,
  DISCOVERY_PURPOSE,
  DISCOVERY_PERSONA,
  DISCOVERY_STAGES,
  DISCOVERY_EXTRACTION_SYSTEM,
  DISCOVERY_EXTRACTION_MODEL,
  DISCOVERY_VOICE_ID,
} from '@/lib/kira/discovery-config';
import { ClientProfileSchema, type ClientProfile } from '@/lib/kira/discovery-schema';
import { applyProfileExtraction } from '@/lib/kira/apply-profile';

let cached: Discovery<ClientProfile> | null = null;

/** Build the Discovery instance lazily (env read at call time, not import/build time). */
export function getDiscovery(): Discovery<ClientProfile> {
  if (cached) return cached;

  const supabase = createServiceClient();

  cached = defineDiscovery<ClientProfile>(
    {
      slug: DISCOVERY_SLUG,
      purpose: DISCOVERY_PURPOSE,
      persona: DISCOVERY_PERSONA,
      stages: DISCOVERY_STAGES,
      extraction: {
        schema: ClientProfileSchema,
        system: DISCOVERY_EXTRACTION_SYSTEM,
        model: DISCOVERY_EXTRACTION_MODEL,
        requireEvidence: false,
      },
      // PUSH what we already know so the coach doesn't re-ask across sessions.
      primeContext: async (subjectId) => {
        const { data } = await supabase
          .from('client_profiles')
          .select('profile, sessions_count')
          .eq('user_id', subjectId)
          .maybeSingle();
        if (!data || !data.sessions_count) return '';
        return (
          `You have spoken with this person before. Here is what you already know — do NOT re-ask ` +
          `these; build on them and fill the gaps:\n${JSON.stringify(data.profile, null, 1)}`
        );
      },
      // The sink: deepen the Client Profile, recompute the gate, and brief any operational agent.
      // A voice discovery call counts as a session (bumpSession) — shared with the ingestion
      // pre-brief via applyProfileExtraction so the two paths never drift.
      onResult: async (result, meta) => {
        await applyProfileExtraction(supabase, meta.subjectId, result, {
          source: 'discovery',
          bumpSession: true,
        });
      },
    },
    {
      runner: createOpenAIRunner(process.env.OPENAI_API_KEY || ''),
      elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
      sessionSecret: process.env.DISCOVERY_SESSION_SECRET || '',
      supabase,
      baseUrl: (process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app').replace(/\/$/, ''),
      voiceId: DISCOVERY_VOICE_ID,
      tableNames: KIRA_CONVAI_TABLES,
      existingAgentId: process.env.DISCOVERY_AGENT_ID,
      postCallSecret: process.env.DISCOVERY_POSTCALL_SECRET,
    }
  );

  return cached;
}
