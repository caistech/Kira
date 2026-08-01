// scripts/reprovision-kira-agents.mjs
// One-time (idempotent) re-provision of EXISTING Kira agents onto the canonical voice-memory
// loop. New agents get this automatically at creation (app/api/kira/create + setup-tools);
// this brings already-created agents up to the same wiring.
//
// For each active/paused agent it:
//   1. appends the canonical continuity prompt (once, guarded by a marker),
//   2. attaches the FULL operational tool set as workspace tool_ids — the 5 canonical
//      memory/continuity tools, search_knowledge, and the doing-slice pair
//      (dispatch_task/approve_task). Anything missing here is stripped, not merely skipped,
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
  CONVAI_TOOL_SECRET_HEADER,
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
import {
  kiraSearchDriveToolDef,
  kiraReadDocumentToolDef,
  kiraKeepDocumentToolDef,
  kiraLookupContactToolDef,
} from '../lib/kira/lookup-tools-def.mjs';
import { isUidToolUrl } from '../lib/kira/uid-tools.mjs';
import { buildToolsForUser } from './lib/redteam-tools.mjs';
import {
  kiraDispatchToolDef,
  kiraApproveToolDef,
  kiraFinancialsToolDef,
  kiraCheckTasksToolDef,
} from '../lib/kira/swarm/doing-tools-def.mjs';

const {
  ELEVENLABS_API_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_APP_URL,
  DISCOVERY_AGENT_ID,
} = process.env;

const APP_URL = (NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app').replace(/\/$/, '');
const CONTINUITY_MARKER = '## CONVERSATION CONTINUITY';

// --tools-only  attach the tool set and nothing else: skip the prompt append and, importantly, skip
//               bindWorkspaceWebhook. Re-binding is not free — the package's reuse-by-URL check can
//               race and leave two enabled webhooks for one URL with DIFFERENT secrets, which breaks
//               post-call HMAC verification and shows up as memory silently not persisting. When the
//               only thing that has drifted is an agent's tool list, rebinding a working webhook is
//               risk with no upside.
// --dry-run     report what would change; call nothing that mutates.
const TOOLS_ONLY = process.argv.includes('--tools-only');
const DRY_RUN = process.argv.includes('--dry-run');

if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing (run: vercel env pull .env.local --environment=production)');
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase env missing');

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Build the tool set for a SPECIFIC agent owner. recall_memory + search_knowledge get the owner's
// user id baked into the URL (?uid=<userId>), because ElevenLabs does not pass the conversation id
// to server-tool webhooks — identity is server-known (one agent per user) and baked in at provision.
// The tool-secret header gates every tool route.
//
// It is the PACKAGE's canonical header (`x-convai-tool-secret`), not a Kira-local name. Kira used
// to define its own, and a local name for a portfolio-wide mechanism is a fork — this one had
// already forced portfolio-gate's memory-loop probe to grow a `toolSecretHeader` option purely to
// accommodate one repo.
//
// Running this script IS the migration: the route guard accepts the legacy header too, so agents
// re-provisioned here move to the canonical one while un-re-provisioned agents keep working. Once
// the audit shows zero agents on the legacy header, drop it from lib/kira/convai.ts.
// journeyType scopes the doing-slice: dispatch_task/approve_task belong to the BUSINESS journey
// (drafting a client quote, a follow-up, a job reminder). A personal-journey coach is a different
// product register and must not gain the ability to draft and send on the user's behalf, which is
// why lib/admin/exec-reprovision.ts filters journey_type='business'. Same rule here.
// buildToolsForUser now lives in scripts/lib/redteam-tools.mjs (imported above).
//
// The red-team provisioner needs the IDENTICAL set — an agent built differently is not a test of
// the real thing — and a third copy of a list already annotated "change one, change both" is how
// dispatch_task and approve_task were silently stripped off ten live agents. Behaviour unchanged.
const hostname = new URL(APP_URL).hostname;

// EXCLUDE the shared discovery agent. It lives in kira_agents too (provision-discovery-agent.mjs
// inserts it as agent_name 'Kira Discovery', status 'active'), but it is NOT an operational Kira:
// re-provisioning it would overwrite its discovery persona with the operational continuity prompt,
// repoint its tools from /api/convai/webhooks to /api/kira/webhooks, and collapse every user's
// discovery onto the system owner. Exclude by name (always) and by id (when the env is present).
let query = supabase
  .from('kira_agents')
  .select('id, elevenlabs_agent_id, agent_name, status, user_id, journey_type')
  .in('status', ['active', 'paused'])
  .neq('agent_name', 'Kira Discovery');
if (DISCOVERY_AGENT_ID) query = query.neq('elevenlabs_agent_id', DISCOVERY_AGENT_ID);

const { data: agents, error } = await query;

if (error) throw error;

const mode = `${DRY_RUN ? 'DRY RUN' : 'APPLY'}${TOOLS_ONLY ? ' · tools-only (no prompt append, no webhook rebind)' : ''}`;
console.log(`Re-provisioning ${agents.length} agent(s) → ${APP_URL}  [${mode}]\n`);

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
    if (!TOOLS_ONLY && !prompt.includes(CONTINUITY_MARKER)) {
      if (!DRY_RUN) {
        await updateAgent(ELEVENLABS_API_KEY, id, {
          systemPrompt: `${prompt}\n\n${conversationContinuityPrompt}`,
        });
      }
    }

    // 2. Attach the tools (with THIS owner's uid baked into recall/search URLs) + enable overrides.
    const desired = buildToolsForUser(a.user_id, a.journey_type);
    if (DRY_RUN) {
      const liveCount = (live?.conversation_config?.agent?.prompt?.tool_ids ?? []).length;
      console.log(
        `  · ${a.agent_name} (${id}): ${liveCount} tool(s) attached → would set ${desired.length} ` +
          `(${desired.map((t) => t.name).join(', ')})`,
      );
      ok++;
      continue;
    }
    await setAgentTools(ELEVENLABS_API_KEY, id, desired);
    await setAgentOverrides(ELEVENLABS_API_KEY, id);

    // 3. Ensure the post-call webhook + allowlist. Skipped under --tools-only (see the flag note).
    if (!TOOLS_ONLY) {
      await bindWorkspaceWebhook(ELEVENLABS_API_KEY, id, {
        name: 'Kira post-call',
        url: `${APP_URL}/api/kira/webhook`,
      });
      await setAllowlist(ELEVENLABS_API_KEY, id, standardAllowlist(hostname));
    }

    console.log(`  ✓ ${a.agent_name} (${id})`);
    ok++;
  } catch (e) {
    console.error(`  ✗ ${a.agent_name} (${id}): ${e?.message ?? e}`);
    failed++;
  }
}

console.log(`\nDone. ${ok} re-provisioned, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
