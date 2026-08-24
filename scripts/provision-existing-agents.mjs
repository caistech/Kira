// Reprovision / check existing Kira agents for the workspace post-call webhook +
// origin allowlist that the create paths now set automatically on new agents.
//
// Agents created BEFORE the 2026-05-25 hub migration were created with the deprecated
// (silently-ignored) per-agent webhook and no allowlist, so their transcripts never
// persisted and their agent IDs were open to key abuse. This backfills them.
//
//   CHECK (read-only, default):  node scripts/provision-existing-agents.mjs
//   APPLY (binds webhook + allowlist for every agent):
//                                node scripts/provision-existing-agents.mjs --apply
//
// New agents need nothing — app/api/kira/create + setup-tools already do this at create.
// The script is idempotent: bindWorkspaceWebhook reuses the one workspace webhook for the
// URL, and setAllowlist is a plain PATCH. On the FIRST apply the workspace webhook is
// created and its signing secret is printed ONCE — set it as ELEVENLABS_WEBHOOK_SECRET.

import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { bindWorkspaceWebhook, setAllowlist, standardAllowlist, getAgent } from '@caistech/elevenlabs-convai';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const APPLY = process.argv.includes('--apply');
const API_KEY = process.env.ELEVENLABS_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app';

for (const [name, val] of Object.entries({ ELEVENLABS_API_KEY: API_KEY, NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY })) {
  if (!val) { console.error(`${name} missing from .env.local`); process.exit(1); }
}

const hostname = new URL(APP_URL).hostname;
// CANONICAL post-call endpoint (2026-08-24 boundary migration). The legacy alias
// /api/kira/webhook was retired to a 410 once deliveries were confirmed here.
// NOTE: pointing at a NEW URL creates a NEW workspace webhook whose signing secret is
// printed ONCE below — rotate ELEVENLABS_WEBHOOK_SECRET in Vercel + .env.local and redeploy.
const webhookUrl = `${APP_URL}/api/kira/webhooks/post-call`;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

console.log(`Mode: ${APPLY ? 'APPLY (will bind webhook + set allowlist)' : 'CHECK (read-only)'}`);
console.log(`Webhook URL: ${webhookUrl}`);
console.log(`Allowlist host: ${hostname}\n`);

const { data: agents, error } = await supabase
  .from('kira_agents')
  .select('elevenlabs_agent_id, agent_name')
  .not('elevenlabs_agent_id', 'is', null);

if (error) { console.error('Supabase query failed:', error.message); process.exit(2); }
if (!agents?.length) { console.log('No agents found.'); process.exit(0); }

console.log(`${agents.length} agent(s) found.\n`);

let firstSecret;
let okCount = 0, gapCount = 0;

for (const { elevenlabs_agent_id: agentId, agent_name } of agents) {
  try {
    const agent = await getAgent(API_KEY, agentId);
    const ps = agent?.platform_settings ?? {};
    const webhookBound = Boolean(ps?.workspace_overrides?.webhooks?.post_call_webhook_id);
    const allowlist = ps?.auth?.allowlist ?? [];
    const allowlistSet = Array.isArray(allowlist) && allowlist.length > 0;

    if (!APPLY) {
      const flag = webhookBound && allowlistSet ? 'OK ' : 'GAP';
      if (webhookBound && allowlistSet) okCount++; else gapCount++;
      console.log(`[${flag}] ${agent_name} — webhook:${webhookBound ? 'bound' : 'MISSING'} allowlist:${allowlistSet ? `${allowlist.length}` : 'MISSING'}`);
      continue;
    }

    const { webhookSecret } = await bindWorkspaceWebhook(API_KEY, agentId, { name: 'Kira post-call', url: webhookUrl });
    if (webhookSecret && !firstSecret) firstSecret = webhookSecret;
    await setAllowlist(API_KEY, agentId, standardAllowlist(hostname));
    okCount++;
    console.log(`[DONE] ${agent_name} — webhook bound + allowlist set`);
  } catch (e) {
    gapCount++;
    console.error(`[ERR ] ${agent_name} (${agentId}): ${e?.message ?? e}`);
  }
}

console.log(`\n${APPLY ? 'Applied' : 'Checked'}: ${okCount} ok, ${gapCount} ${APPLY ? 'errored' : 'with gaps'}.`);
if (firstSecret) {
  console.log('\n*** Workspace webhook was CREATED. Set this as ELEVENLABS_WEBHOOK_SECRET (shown once): ***');
  console.log(firstSecret);
  console.log('(Do not commit it — set via Vercel env, type:sensitive, production+preview.)');
}
if (!APPLY && gapCount > 0) console.log('\nRun with --apply to backfill the gaps.');
