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

// The accounts section is appended ONLY to agents that actually hold look_up_financials.
//
// An agent told it can read the books, whose tool list does not contain the tool, will offer and
// then fail — the same broken promise this script was written to repair, arriving from the opposite
// direction. Attaching the tool is a separate job (scripts/reprovision-kira-agents.mjs, which needs
// KIRA_TOOL_WEBHOOK_SECRET); until that has run for a given agent, that agent is not told.
//
// Self-correcting on purpose: the section appears by itself on the next run after the tool lands,
// rather than depending on someone remembering to do both halves in the right order.
const FIN_MARKER = '## READING THEIR ACCOUNTS';
const finMatch = promptsSrc.match(/export const financialsSection = `([\s\S]*?)`;/);
if (!finMatch) throw new Error('Could not read financialsSection from lib/kira/prompts.ts');
const financials = finMatch[1].trim();

// The task-ledger section is gated the same way, on check_tasks. Told she can account for open work
// without the tool to read it, she would answer "let me check" and then have nothing to check with.
const TASK_MARKER = '## ACCOUNTING FOR WHAT THEY ASKED FOR';
const taskMatch = promptsSrc.match(/export const taskLedgerSection = `([\s\S]*?)`;/);
if (!taskMatch) throw new Error('Could not read taskLedgerSection from lib/kira/prompts.ts');

// These two are UNGATED — unlike the sections above, they describe no tool.
//
// Tool honesty is a rule about every tool she does not hold, so an agent with fewer tools needs it
// MORE, not less. And typed input arrives on every agent whether or not anyone told it so: on 31
// July a typed email address reached the transcript as a user turn and she denied twice that she
// could see it, because her prompt never mentioned the possibility.
const HONESTY_MARKER = '## NEVER SAY YOU CHECKED SOMETHING YOU DID NOT';
const honestyMatch = promptsSrc.match(/export const toolHonestySection = `([\s\S]*?)`;/);
if (!honestyMatch) throw new Error('Could not read toolHonestySection from lib/kira/prompts.ts');
const honesty = honestyMatch[1].trim();
if (!honesty.includes(HONESTY_MARKER)) throw new Error(`toolHonestySection is missing ${HONESTY_MARKER}`);

const TYPED_MARKER = '## WHEN HE TYPES INSTEAD OF SPEAKING';
const typedMatch = promptsSrc.match(/export const typedInputSection = `([\s\S]*?)`;/);
if (!typedMatch) throw new Error('Could not read typedInputSection from lib/kira/prompts.ts');
const typed = typedMatch[1].trim();
if (!typed.includes(TYPED_MARKER)) throw new Error(`typedInputSection is missing ${TYPED_MARKER}`);
const taskLedger = taskMatch[1].trim();

/**
 * Which tools does this agent actually hold? `tool_ids` are ids, so each has to be resolved by name.
 *
 * Returns a Set rather than answering one question, because there are now two gated sections and
 * resolving the same tool list twice per agent is a second round of API calls for the same answer.
 */
async function toolNames(prompt) {
  const names = new Set();
  for (const toolId of prompt?.tool_ids ?? []) {
    try {
      const t = await (
        await fetch(`https://api.elevenlabs.io/v1/convai/tools/${toolId}`, { headers: { 'xi-api-key': apiKey } })
      ).json();
      if (t?.tool_config?.name) names.add(t.tool_config.name);
    } catch {
      // A tool we cannot read is a tool we cannot count on — treat it as absent rather than assume.
    }
  }
  return names;
}

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
  // Discovery gets the UNGATED sections only. It runs the intake interview and holds none of the
  // doing-slice tools, so the capability boundary would be a plain falsehood on it — but it is the
  // FIRST agent a new owner ever speaks to, which makes 'never claim you checked something' and
  // 'he can type to you' matter more here than anywhere, not less. Skipping it wholesale left the
  // first impression as the only one still able to fabricate.
  const isDiscovery = a.agent_name === 'Kira Discovery' || (discoveryId && id === discoveryId);
  try {
    const live = await (
      await fetch(`https://api.elevenlabs.io/v1/convai/agents/${id}`, { headers: { 'xi-api-key': apiKey } })
    ).json();

    const current = live?.conversation_config?.agent?.prompt?.prompt || '';

    // The boundary is always the LAST section, so an agent that already has it is updated by cutting
    // from the marker and re-appending the current text. A pure skip-if-present guard would have
    // frozen the first version onto the fleet forever — which is the very failure this script
    // exists to undo, one level up.
    // Cut at whichever of our sections appears first — both are always appended last, in order.
    const cuts = [current.indexOf(MARKER), current.indexOf(FIN_MARKER), current.indexOf(TASK_MARKER), current.indexOf(HONESTY_MARKER), current.indexOf(TYPED_MARKER)].filter(
      (i) => i >= 0,
    );
    const base = cuts.length ? current.slice(0, Math.min(...cuts)).trimEnd() : current;
    const updating = cuts.length > 0;
    const held = await toolNames(live?.conversation_config?.agent?.prompt);
    // Each section is included only if its tool is attached, so the prompt never claims more than the
    // agent can invoke — and appears by itself on the next run after the tool lands.
    const next = [base, isDiscovery ? null : boundary, !isDiscovery && held.has('look_up_financials') ? financials : null, !isDiscovery && held.has('check_tasks') ? taskLedger : null, honesty, typed]
      .filter(Boolean)
      .join('\n\n');

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
          agent: { prompt: { prompt: next } },
        },
      }),
    });
    if (!res.ok) throw new Error(`elevenlabs ${res.status}: ${await res.text()}`);

    // Read back rather than trusting the 200 — and check the TOOLS survived, because the failure
    // this fleet has actually suffered is a write that succeeded and quietly emptied the tool list.
    const after = await (
      await fetch(`https://api.elevenlabs.io/v1/convai/agents/${id}`, { headers: { 'xi-api-key': apiKey } })
    ).json();
    const afterPrompt = after?.conversation_config?.agent?.prompt?.prompt || '';
    const markerCount = afterPrompt.split(MARKER).length - 1;
    const toolCount = (after?.conversation_config?.agent?.prompt?.tool_ids || []).length;
    if (!isDiscovery && markerCount === 0) throw new Error('patch returned 200 but the marker is absent on read-back');
    // Assert exactly ONE. An earlier version of this script sent `current + boundary` while the
    // dedupe logic sat unused a few lines above, so every run stacked another copy of the section
    // onto the same prompt — four deep before anyone counted. A read-back that only checks the text
    // is PRESENT cannot see that failure, because it is present four times.
    if (markerCount > 1) {
      throw new Error(`patch left ${markerCount} copies of the section on this agent — dedupe failed`);
    }
    // Every section we just sent must be present exactly once on read-back. Checking only the
    // boundary would let one be silently dropped, which is the same shape as the write that
    // emptied the tool list: a 200 that did less than it claimed.
    for (const [label, marker] of [['tool honesty', HONESTY_MARKER], ['typed input', TYPED_MARKER]]) {
      const copies = afterPrompt.split(marker).length - 1;
      if (copies !== 1) throw new Error(`expected exactly 1 copy of the ${label} section, found ${copies}`);
    }

    patched += 1;
    console.log(`  + ${id} ${a.agent_name ?? ''} — ${updating ? 'updated' : 'appended'} · ${toolCount} tools still attached`);
  } catch (error) {
    failed += 1;
    console.error(`  ! ${id} — ${error.message}`);
  }
}

console.log(`[capabilities] appended ${patched} · already had it ${already} · failed ${failed}`);
if (!APPLY) console.log('[capabilities] dry run — re-run with --apply');
process.exit(failed ? 1 : 0);
