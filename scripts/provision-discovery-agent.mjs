// scripts/provision-discovery-agent.mjs
// One-time (idempotent) provisioning of the SHARED discovery agent + its kira_agents row.
// The persona/stages here MIRROR lib/kira/discovery-config.ts (the canonical source) — re-running
// with DISCOVERY_AGENT_ID set updates the live agent from this config.
//
// Usage:  node --env-file=.env.local scripts/provision-discovery-agent.mjs
// Emits DISCOVERY_AGENT_ID / DISCOVERY_POSTCALL_SECRET / DISCOVERY_SESSION_SECRET to set as env.

import { defineDiscovery } from '@caistech/discovery-agent';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import crypto from 'node:crypto';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app').replace(/\/$/, '');
const VOICE = process.env.KIRA_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PERSONA_PROMPT = `You are Kira in DISCOVERY mode — part coach, part consultant, part therapist. Your job is not to advise or act yet; it is to UNDERSTAND this person and their world so completely that you can later be their assistant. Many of the people you meet run their whole business from inside their own head — nothing is written down. So you draw it out: you ask, you listen, you reflect back what you heard to confirm you've got it right, and you gently probe the gaps. Be warm, curious and unhurried. One topic at a time. Ask follow-ups. When someone gives a thin answer, dig. Reflect back and let them correct you. Never rush to the next stage before you've genuinely understood the current one.`;

const OPENING = "Hi — I'm Kira. Before I can be genuinely useful to you, I want to really understand you and how you work. There are no wrong answers here — just tell me about yourself and what you do. Where should we start?";

const STAGES = [
  { id: 'identity', goal: 'Who they are — background, life, what matters personally.', context: 'Open warmly; their name, story, world outside work.', mustCover: ['name', 'background', 'what matters to them'] },
  { id: 'business', goal: 'The operation — what the business is, size/stage, how it runs day to day.', context: 'The business as it really is, not an org chart.', mustCover: ['what the business does', 'size/stage', 'how the day runs'] },
  { id: 'how_they_work', goal: 'Working style — how they decide, communicate, what they will/will NOT hand off.', context: 'The tacit knowledge — approach, standards, non-negotiables.', mustCover: ['decision style', 'what they refuse to give up', 'how they like to be kept in the loop'] },
  { id: 'people', goal: 'The people — crew, clients, partners, family in the business.', context: 'Who they rely on; the key relationships.', mustCover: ['key people', 'clients', 'who they trust'] },
  { id: 'goals', goal: 'Where they want to go — near/long-term goals and current priorities.', context: 'What good looks like; what is on their plate now.', mustCover: ['near-term goals', 'long-term goals', 'current priorities'] },
  { id: 'constraints', goal: 'Constraints and frustrations — budget, time, capacity, what drains them.', context: 'What holds them back; the pain points to remove.', mustCover: ['constraints', 'pain points'] },
];

const config = {
  slug: 'kira-discovery',
  purpose: 'Understand this person and their business completely so Kira can become their fully-briefed assistant.',
  persona: { name: 'Kira Discovery', voiceId: VOICE, opening: OPENING, signature: '', systemPrompt: PERSONA_PROMPT },
  stages: STAGES,
  extraction: { schema: z.object({}), system: '', model: { provider: 'anthropic', model: 'claude-sonnet-5' } },
  onResult: async () => {},
};

const deps = {
  runner: { run: async () => ({ result: {} }) },
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
  sessionSecret: 'bootstrap',
  supabase: svc,
  baseUrl: APP_URL,
  voiceId: VOICE,
  existingAgentId: process.env.DISCOVERY_AGENT_ID || undefined,
};

const d = defineDiscovery(config, deps);
console.log(`Provisioning discovery agent → ${APP_URL} …`);
const { agentId, webhookSecret } = await d.provision();

// The convai loop resolves the agent by elevenlabs_agent_id in kira_agents — the shared discovery
// agent needs a row. Owner = a dedicated system user (conversations are keyed to the real subject
// via the signed token, not this owner).
const sysEmail = 'system+discovery@kira.internal';
let { data: sysUser } = await svc.from('users').select('id').eq('email', sysEmail).maybeSingle();
if (!sysUser) {
  const r = await svc.from('users').insert({ email: sysEmail, first_name: 'System' }).select('id').single();
  if (r.error) throw new Error('system user create: ' + r.error.message);
  sysUser = r.data;
}
const up = await svc.from('kira_agents').upsert(
  { user_id: sysUser.id, agent_name: 'Kira Discovery', journey_type: 'business', elevenlabs_agent_id: agentId, status: 'active' },
  { onConflict: 'elevenlabs_agent_id' }
);
if (up.error) console.warn('kira_agents upsert warning:', up.error.message);

console.log('\n=== set these env vars (Vercel prod+preview + .env.local) ===');
console.log('DISCOVERY_AGENT_ID=' + agentId);
console.log('DISCOVERY_POSTCALL_SECRET=' + (webhookSecret || '(reused existing webhook — keep prior secret)'));
console.log('DISCOVERY_SESSION_SECRET=' + crypto.randomBytes(32).toString('hex'));
