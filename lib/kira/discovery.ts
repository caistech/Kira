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
import { createAnthropicRunner } from '@/lib/kira/structured-runner';
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
import {
  ClientProfileSchema,
  type ClientProfile,
  mergeProfile,
  computeCompleteness,
  DISCOVERY_COMPLETE_THRESHOLD,
} from '@/lib/kira/discovery-schema';

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
      onResult: async (result, meta) => {
        const subjectId = meta.subjectId;
        const { data: existing } = await supabase
          .from('client_profiles')
          .select('profile, sessions_count')
          .eq('user_id', subjectId)
          .maybeSingle();

        const merged = mergeProfile((existing?.profile as Partial<ClientProfile>) ?? {}, result);
        const completeness = computeCompleteness(merged);
        const sessionsCount = (existing?.sessions_count ?? 0) + 1;

        await supabase.from('client_profiles').upsert(
          {
            user_id: subjectId,
            profile: merged,
            completeness,
            discovery_complete: completeness >= DISCOVERY_COMPLETE_THRESHOLD,
            sessions_count: sessionsCount,
            last_discovery_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        // Brief the operational Kira(s): seed a consolidated profile memory the operational agent
        // recalls. If none exists yet, the profile still lives in client_profiles (create-time
        // seeding picks it up).
        const { data: agents } = await supabase
          .from('kira_agents')
          .select('id')
          .eq('user_id', subjectId)
          .eq('status', 'active');
        if (agents && agents.length > 0) {
          const briefing = buildProfileBriefing(merged);
          for (const a of agents) {
            await supabase.from('kira_memory').insert({
              user_id: subjectId,
              kira_agent_id: a.id,
              memory_type: 'context',
              content: briefing,
              importance: 9,
              tags: ['client_profile', 'discovery'],
            });
          }
        }
      },
    },
    {
      runner: createAnthropicRunner(process.env.ANTHROPIC_API_KEY || ''),
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

/** A compact, recall-friendly briefing string the operational agent can pull. */
export function buildProfileBriefing(p: ClientProfile): string {
  const parts: string[] = [];
  if (p.identity?.name) parts.push(`This is ${p.identity.name}.`);
  if (p.identity?.background_summary) parts.push(p.identity.background_summary);
  if (p.business?.description || p.business?.type) parts.push(`Business: ${p.business.description || p.business.type}.`);
  if (p.role) parts.push(`Their role: ${p.role}.`);
  if (p.working_style) parts.push(`How they work: ${p.working_style}.`);
  if (p.goals_near_term?.length) parts.push(`Near-term goals: ${p.goals_near_term.join('; ')}.`);
  if (p.goals_long_term?.length) parts.push(`Long-term goals: ${p.goals_long_term.join('; ')}.`);
  if (p.key_relationships?.length) parts.push(`Key people: ${p.key_relationships.join('; ')}.`);
  if (p.constraints?.length) parts.push(`Constraints: ${p.constraints.join('; ')}.`);
  if (p.current_priorities?.length) parts.push(`Current priorities: ${p.current_priorities.join('; ')}.`);
  return `CLIENT PROFILE (from discovery). ${parts.join(' ')}`.trim();
}
