#!/usr/bin/env node
//
// Defuse SHADOW AGENTS — ElevenLabs agents sharing a name with one of ours that no kira_agents row
// points at. Found by `verify-agent-fleet.mjs`; this is the fix.
//
// WHY THEY ARE DANGEROUS RATHER THAN UNTIDY. `provisionVoiceAgent` is idempotent BY NAME
// (`findAgentsByName`), so two agents carrying one name is a coin toss over which one a future
// provision hands to an owner — and the loser is usually the empty one, because a shadow is
// typically the abandoned first attempt of a provision that then succeeded. BucketLyst shipped
// exactly this: the second buyer's binding insert died on the unique `elevenlabs_agent_id` and the
// dashboard fell back to no voice agent at all, silently.
//
// WHY RENAME AND NOT DELETE. The collision is the entire hazard, and a rename removes it — the
// agent stops being findable by the name a provision searches for, and nothing is destroyed. It is
// the same park-don't-drop posture the rest of this codebase takes with a redacted memory or a
// denied fact: a wrong call here costs a rename back, not an agent. Deleting also risks the
// `webhook_in_use` class of error where an agent still holds a binding we have not looked for.
//
// DRY RUN BY DEFAULT — pass --apply to commit. Deliberately the OPPOSITE default to
// `reconcile-agents.mjs`, which sits next door and applies with no flag; that inconsistency has
// already caused one unintended mutation of thirteen live agents, so a script that renames things
// gets the safe default and does not get folded into the one that does not have it.
//
//   node --env-file=.env.local scripts/defuse-shadow-agents.mjs [--apply]

import { createClient } from '@supabase/supabase-js';

const { ELEVENLABS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing');
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase env missing');

const APPLY = process.argv.includes('--apply');

/**
 * Prefix marking a defused agent.
 *
 * Chosen so it can never collide with a generated name (which is always `Kira_…`) and so the reason
 * is legible in the ElevenLabs console to whoever finds it next, without needing this file.
 */
const SHADOW_PREFIX = 'zz_shadow_';

const el = (path, init) =>
  fetch(`https://api.elevenlabs.io/v1/convai/${path}`, {
    ...init,
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// EVERY row, not just active/paused. An archived row still owns its name for collision purposes —
// the provisioner searches ElevenLabs by name and has no idea what our status column says.
const { data: rows, error } = await supabase.from('kira_agents').select('elevenlabs_agent_id, agent_name, status');
if (error) throw new Error(`supabase: ${error.message}`);

const ourNames = new Set(rows.map((r) => r.agent_name).filter(Boolean));
const boundIds = new Set(rows.map((r) => r.elevenlabs_agent_id).filter(Boolean));

const workspace = [];
let cursor = null;
do {
  const page = await (await el(`agents?page_size=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`)).json();
  workspace.push(...(page?.agents ?? []));
  cursor = page?.has_more ? page.next_cursor : null;
} while (cursor);

console.log(`[shadows] ${APPLY ? 'APPLY' : 'DRY RUN'} · ${workspace.length} workspace agent(s), ${ourNames.size} of our names\n`);

let found = 0;
let defused = 0;

for (const name of ourNames) {
  const matches = workspace.filter((a) => a.name === name);
  if (matches.length < 2) continue;

  for (const m of matches) {
    // The bound one is the real agent. Never touch it — renaming the agent an owner is actually
    // talking to is the one way this script could cause the harm it exists to prevent.
    if (boundIds.has(m.agent_id)) continue;
    found += 1;

    const full = await (await el(`agents/${m.agent_id}`)).json();
    const toolCount = (full?.conversation_config?.agent?.prompt?.tool_ids ?? []).length;
    const nextName = `${SHADOW_PREFIX}${name}`;

    if (!APPLY) {
      console.log(`  ~ ${name} · ${m.agent_id} (${toolCount} tools) → would rename to ${nextName}`);
      continue;
    }

    const res = await el(`agents/${m.agent_id}`, { method: 'PATCH', body: JSON.stringify({ name: nextName }) });
    if (!res.ok) {
      console.log(`  ✗ ${name} · ${m.agent_id} — rename failed ${res.status}: ${await res.text()}`);
      continue;
    }

    // Read back rather than trust the 200. Every fleet failure in this repo's history has been a
    // write that succeeded and did less than it claimed, so the assertion is the point of the run.
    const after = await (await el(`agents/${m.agent_id}`)).json();
    if (after?.name !== nextName) {
      console.log(`  ✗ ${name} · ${m.agent_id} — PATCH returned 200 but the name reads back as "${after?.name}"`);
      continue;
    }

    defused += 1;
    console.log(`  ✓ ${name} · ${m.agent_id} (${toolCount} tools) → ${nextName}`);
  }
}

if (!found) console.log('  no shadow agents.');
console.log(`\n[shadows] ${found} found, ${APPLY ? `${defused} defused` : '0 defused (dry run — pass --apply)'}`);

// A dry run that found something is not a failure; it is the run doing its job. Only a failed APPLY
// should be able to go red, so CI can call the dry run without it becoming noise.
process.exit(APPLY && defused !== found ? 1 : 0);
