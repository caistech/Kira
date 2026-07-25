// scripts/reprovision-kira-agents.mjs
// One-time (idempotent) re-provision of EXISTING Kira agents onto the canonical voice-memory
// loop. New agents get this automatically at creation (app/api/kira/create + setup-tools);
// this brings already-created agents up to the same wiring.
//
// For each active/paused agent it:
//   1. appends the canonical continuity prompt (once, guarded by a marker),
//   2. attaches the 5 canonical memory/continuity tools as workspace tool_ids,
//   3. enables per-session overrides,
//   4. (re)binds the workspace post-call webhook + writes the Security allowlist.
//
// RUN ORDER: deploy the new routes to prod FIRST — the tool URLs point at the PROD app
// (NEXT_PUBLIC_APP_URL), and /api/kira/webhooks/recall_memory + save_memory are new routes
// that must be live before an agent calls them.
//
// Usage (from repo root, env pulled to .env.local):
//   node --env-file=.env.local scripts/reprovision-kira-agents.mjs

import { createClient } from '@supabase/supabase-js';
import {
  createConversationTools,
  conversationContinuityPrompt,
  setAgentTools,
  setAgentOverrides,
  bindWorkspaceWebhook,
  setAllowlist,
  standardAllowlist,
  getAgent,
  updateAgent,
} from '@caistech/elevenlabs-convai';
import { kiraKnowledgeToolDef } from '../lib/kira/knowledge-tool-def.mjs';

const {
  ELEVENLABS_API_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_APP_URL,
  DISCOVERY_AGENT_ID,
} = process.env;

const APP_URL = (NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app').replace(/\/$/, '');
const CONTINUITY_MARKER = '## CONVERSATION CONTINUITY';

if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing (run: vercel env pull .env.local --environment=production)');
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase env missing');

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// The 5 canonical memory tools + the owned-RAG search_knowledge tool (single-sourced def), so a
// re-provisioned agent gets knowledge retrieval too — not just memory.
const tools = [...createConversationTools(APP_URL, '/api/kira/webhooks'), kiraKnowledgeToolDef(APP_URL)];
// Interim tool-webhook auth (matches lib/kira/convai.ts toolSecretOk): when KIRA_TOOL_WEBHOOK_SECRET
// is set, the operational tools carry it as a header so the routes can reject un-provisioned callers.
if (process.env.KIRA_TOOL_WEBHOOK_SECRET) {
  for (const t of tools) {
    if (t.webhook) {
      t.webhook.headers = { ...(t.webhook.headers ?? {}), 'x-kira-tool-secret': process.env.KIRA_TOOL_WEBHOOK_SECRET };
    }
  }
}
const hostname = new URL(APP_URL).hostname;

// EXCLUDE the shared discovery agent. It lives in kira_agents too (provision-discovery-agent.mjs
// inserts it as agent_name 'Kira Discovery', status 'active'), but it is NOT an operational Kira:
// re-provisioning it would overwrite its discovery persona with the operational continuity prompt,
// repoint its tools from /api/convai/webhooks to /api/kira/webhooks, and collapse every user's
// discovery onto the system owner. Exclude by name (always) and by id (when the env is present).
let query = supabase
  .from('kira_agents')
  .select('id, elevenlabs_agent_id, agent_name, status')
  .in('status', ['active', 'paused'])
  .neq('agent_name', 'Kira Discovery');
if (DISCOVERY_AGENT_ID) query = query.neq('elevenlabs_agent_id', DISCOVERY_AGENT_ID);

const { data: agents, error } = await query;

if (error) throw error;

console.log(`Re-provisioning ${agents.length} agent(s) → ${APP_URL}\n`);

let ok = 0;
let failed = 0;

for (const a of agents) {
  const id = a.elevenlabs_agent_id;
  if (!id) {
    console.warn(`  - ${a.agent_name}: no elevenlabs_agent_id, skipping`);
    continue;
  }
  try {
    // 1. Ensure the continuity prompt is present (append once). Do this BEFORE setAgentTools
    //    — updateAgent replaces the prompt object (no tool_ids), so tools must be attached
    //    after, since setAgentTools reads the current prompt and preserves it + adds tool_ids.
    const live = await getAgent(ELEVENLABS_API_KEY, id);
    const prompt = live?.conversation_config?.agent?.prompt?.prompt || '';
    if (!prompt.includes(CONTINUITY_MARKER)) {
      await updateAgent(ELEVENLABS_API_KEY, id, {
        systemPrompt: `${prompt}\n\n${conversationContinuityPrompt}`,
      });
    }

    // 2. Attach the canonical tools + enable overrides.
    await setAgentTools(ELEVENLABS_API_KEY, id, tools);
    await setAgentOverrides(ELEVENLABS_API_KEY, id);

    // 3. Ensure the post-call webhook + allowlist.
    await bindWorkspaceWebhook(ELEVENLABS_API_KEY, id, {
      name: 'Kira post-call',
      url: `${APP_URL}/api/kira/webhook`,
    });
    await setAllowlist(ELEVENLABS_API_KEY, id, standardAllowlist(hostname));

    console.log(`  ✓ ${a.agent_name} (${id})`);
    ok++;
  } catch (e) {
    console.error(`  ✗ ${a.agent_name} (${id}): ${e?.message ?? e}`);
    failed++;
  }
}

console.log(`\nDone. ${ok} re-provisioned, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
