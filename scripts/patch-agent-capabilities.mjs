#!/usr/bin/env node
//
// Append the capability boundary to BUSINESS agents that were minted before it existed.
//
// WHY A SCRIPT AND NOT JUST A PROMPT EDIT. An ElevenLabs agent's system prompt is baked in at
// provision time. Editing lib/kira/prompts.ts changes what the NEXT agent is created with and
// touches nothing already live — so the repo can describe a capability perfectly while every real
// owner talks to an agent that has never heard of it. That is exactly what happened here: asked for
// a Xero balance, Kira interrogated the owner and then said she had no access to external systems,
// while holding dispatch_task and approve_task the entire time. Her deployed prompt described
// neither tool. The tools were attached by a migration; the words never followed.
//
// IDEMPOTENT, and marker-guarded rather than diff-guarded: an agent whose prompt already contains
// the marker heading is left completely alone, so this is safe to re-run and safe to run against a
// mixed fleet.
//
// APPENDS — never replaces. Each agent's prompt carries owner-specific context built at creation
// (their name, their business, their framework), and regenerating it here would silently discard
// whatever has accumulated since. The boundary is additive text, so appending is both sufficient
// and the only non-destructive option.
//
// BUSINESS JOURNEY ONLY. Personal-journey coaches do not carry the doing-slice tools, so telling
// one it has a team that drafts quotes would be a plain falsehood — the failure this text exists to
// end, pointed the other way.
//
//   node scripts/patch-agent-capabilities.mjs            # dry run (default)
//   node scripts/patch-agent-capabilities.mjs --apply

import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const APPLY = process.argv.includes('--apply');
const apiKey = process.env.ELEVENLABS_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!apiKey) throw new Error('ELEVENLABS_API_KEY missing');
if (!supabaseUrl || !serviceKey) throw new Error('Supabase service credentials missing');

// The prompt text lives in lib/kira/prompts.ts and is read from there rather than duplicated, so the
// text a live agent receives cannot drift from the text a new agent is created with. Extracted by
// marker because this is a .mjs script and that module is TypeScript.
const promptsSrc = fs.readFileSync(path.join(process.cwd(), 'lib/kira/prompts.ts'), 'utf8');
const match = promptsSrc.match(/export const capabilityBoundary = `([\s\S]*?)`;/);
if (!match) throw new Error('Could not read capabilityBoundary from lib/kira/prompts.ts');
const boundary = match[1].trim();
const MARKER = '## WHAT YOU CAN GET DONE';
if (!boundary.includes(MARKER)) throw new Error(`capabilityBoundary is missing its marker ${MARKER}`);

async function sb(pathname, init = {}) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${pathname}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

const agents = await sb(
  'kira_agents?select=elevenlabs_agent_id,agent_name,journey_type,status&journey_type=eq.business&status=in.(active,paused)',
);

console.log(`[capabilities] ${APPLY ? 'APPLY' : 'DRY RUN'} · ${agents.length} business agent(s)`);

let patched = 0;
let already = 0;
let failed = 0;

// The discovery agent is excluded for the same reason the personal coaches are: it runs the
// intake interview, carries no doing-slice tools, and telling it that it has a team which drafts
// quotes would be a falsehood — the precise failure this text exists to end, pointed backwards.
const discoveryId = process.env.DISCOVERY_AGENT_ID;

for (const a of agents) {
  const id = a.elevenlabs_agent_id;
  if (!id) continue;
  if (a.agent_name === 'Kira Discovery' || (discoveryId && id === discoveryId)) {
    console.log(`  - ${id} ${a.agent_name ?? ''} — skipped (discovery agent, no doing tools)`);
    continue;
  }
  try {
    const live = await (
      await fetch(`https://api.elevenlabs.io/v1/convai/agents/${id}`, { headers: { 'xi-api-key': apiKey } })
    ).json();

    const current = live?.conversation_config?.agent?.prompt?.prompt || '';

    // The boundary is always the LAST section, so an agent that already has it is updated by cutting
    // from the marker and re-appending the current text. A pure skip-if-present guard would have
    // frozen the first version onto the fleet forever — which is the very failure this script
    // exists to undo, one level up.
    const base = current.includes(MARKER) ? current.slice(0, current.indexOf(MARKER)).trimEnd() : current;
    const updating = current.includes(MARKER);
    const next = `${base}

${boundary}`;

    if (next === current) {
      already += 1;
      console.log(`  = ${id} ${a.agent_name ?? ''} — already current`);
      continue;
    }

    if (!APPLY) {
      patched += 1;
      console.log(`  + ${id} ${a.agent_name ?? ''} — would ${updating ? 'UPDATE' : 'append'} (${boundary.length} chars)`);
      continue;
    }

    // PATCH the prompt text only. Sending the whole conversation_config back would risk clobbering
    // tool_ids, the model, and the first message — the tool list in particular has been silently
    // emptied once already by a write that replaced rather than merged.
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${id}`, {
      method: 'PATCH',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_config: {
          agent: { prompt: { prompt: `${current}\n\n${boundary}` } },
        },
      }),
    });
    if (!res.ok) throw new Error(`elevenlabs ${res.status}: ${await res.text()}`);

    // Read back rather than trusting the 200 — and check the TOOLS survived, because the failure
    // this fleet has actually suffered is a write that succeeded and quietly emptied the tool list.
    const after = await (
      await fetch(`https://api.elevenlabs.io/v1/convai/agents/${id}`, { headers: { 'xi-api-key': apiKey } })
    ).json();
    const hasMarker = (after?.conversation_config?.agent?.prompt?.prompt || '').includes(MARKER);
    const toolCount = (after?.conversation_config?.agent?.prompt?.tool_ids || []).length;
    if (!hasMarker) throw new Error('patch returned 200 but the marker is absent on read-back');

    patched += 1;
    console.log(`  + ${id} ${a.agent_name ?? ''} — appended · ${toolCount} tools still attached`);
  } catch (error) {
    failed += 1;
    console.error(`  ! ${id} — ${error.message}`);
  }
}

console.log(`[capabilities] appended ${patched} · already had it ${already} · failed ${failed}`);
if (!APPLY) console.log('[capabilities] dry run — re-run with --apply');
process.exit(failed ? 1 : 0);
