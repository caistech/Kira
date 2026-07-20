// lib/kira/discovery-config.ts
// CLIENT-SAFE discovery config pieces (persona + stages + extraction descriptor). No server
// imports here (no service client, no runner) so both the server module (lib/kira/discovery.ts)
// and the client widget (/discovery) can consume it. The DiscoveryWidget only reads persona +
// stages; the client config supplies a no-op onResult (the real sink lives server-side).

import type { DiscoveryConfig, DiscoveryPersona, DiscoveryStage, ModelRef } from '@caistech/discovery-agent';
import { ClientProfileSchema, type ClientProfile } from '@/lib/kira/discovery-schema';

export const DISCOVERY_SLUG = 'kira-discovery';

export const DISCOVERY_PURPOSE =
  'Understand this person and their business completely — their life, work, goals, people, ' +
  'constraints and working style — so Kira can become their fully-briefed assistant.';

export const DISCOVERY_VOICE_ID = process.env.NEXT_PUBLIC_KIRA_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

export const DISCOVERY_EXTRACTION_MODEL: ModelRef = { provider: 'anthropic', model: 'claude-sonnet-5' };

export const DISCOVERY_EXTRACTION_SYSTEM = `
You are extracting a structured Client Profile from a discovery conversation between Kira (a coach)
and a person (often a hands-on business owner). Read the whole transcript and fill the profile with
only what the conversation actually establishes. Use null for anything not covered — never invent.
Prefer the person's own words for working_style, constraints and priorities. Capture the tacit stuff
(how they decide, what they won't do, who they rely on), not just facts.
`.trim();

const PERSONA_PROMPT = `
You are Kira in DISCOVERY mode — part coach, part consultant, part therapist. Your job is not to
advise or act yet; it is to UNDERSTAND this person and their world so completely that you can later
be their assistant. Many of the people you meet run their whole business from inside their own head
— nothing is written down. So you draw it out: you ask, you listen, you reflect back what you heard
to confirm you've got it right, and you gently probe the gaps.

Be warm, curious and unhurried. One topic at a time. Ask follow-ups. When someone gives a thin
answer, dig: "walk me through a typical day", "who do you rely on", "what would you never hand off".
Reflect back ("So it sounds like…") and let them correct you. Never rush to the next stage before
you've genuinely understood the current one. You are building a picture of the whole person — their
life, their business, their people, their goals, how they think and work.
`.trim();

export const DISCOVERY_PERSONA: DiscoveryPersona = {
  name: 'Kira Discovery',
  voiceId: DISCOVERY_VOICE_ID,
  opening:
    "Hi — I'm Kira. Before I can be genuinely useful to you, I want to really understand you and " +
    'how you work. There are no wrong answers here — just tell me about yourself and what you do. ' +
    'Where should we start?',
  signature: '',
  systemPrompt: PERSONA_PROMPT,
};

export const DISCOVERY_STAGES: DiscoveryStage[] = [
  {
    id: 'identity',
    goal: 'Who they are — background, where they are in life, what matters to them personally.',
    context: 'Open warmly. Get their name, their story, their world outside work.',
    mustCover: ['name', 'background', 'what matters to them'],
  },
  {
    id: 'business',
    goal: 'The operation — what the business is, its size/stage, how it actually runs day to day.',
    context: 'Understand the business as it really is, not an org chart. How does work flow?',
    mustCover: ['what the business does', 'size/stage', 'how the day runs'],
  },
  {
    id: 'how_they_work',
    goal: 'Their working style — how they decide, communicate, what they will and will NOT hand off.',
    context: 'This is the tacit knowledge. Probe for their approach, standards, non-negotiables.',
    mustCover: ['decision style', 'what they refuse to give up', 'how they like to be kept in the loop'],
  },
  {
    id: 'people',
    goal: 'The people around them — crew, clients, partners, family in the business.',
    context: 'Who do they rely on? Who are the key relationships that make it work?',
    mustCover: ['key people', 'clients', 'who they trust'],
  },
  {
    id: 'goals',
    goal: 'Where they want to go — near-term and longer-term goals, and current priorities.',
    context: 'What does good look like to them? What is on their plate right now?',
    mustCover: ['near-term goals', 'long-term goals', 'current priorities'],
  },
  {
    id: 'constraints',
    goal: 'Constraints and frustrations — budget, time, capacity, what drains them today.',
    context: 'What holds them back? What are the pain points a great assistant would remove?',
    mustCover: ['constraints', 'pain points'],
  },
];

/** A client-usable DiscoveryConfig for the DiscoveryWidget (persona + stages are the only fields it
 *  reads). onResult is a no-op here — the real sink runs server-side in lib/kira/discovery.ts. */
export const discoveryClientConfig: DiscoveryConfig<ClientProfile> = {
  slug: DISCOVERY_SLUG,
  purpose: DISCOVERY_PURPOSE,
  persona: DISCOVERY_PERSONA,
  stages: DISCOVERY_STAGES,
  extraction: {
    schema: ClientProfileSchema,
    system: DISCOVERY_EXTRACTION_SYSTEM,
    model: DISCOVERY_EXTRACTION_MODEL,
  },
  onResult: async () => {},
};
