#!/usr/bin/env node
//
// Independently verify what the LIVE fleet actually holds. Read-only — it mutates nothing.
//
// WHY THIS EXISTS. Every mutation of this fleet so far has been trusted on the strength of a 200,
// and the failures that hurt were all shaped the same way: the write succeeded and did less than it
// claimed. setAgentTools REPLACES a tool list, so a re-provision missing one definition silently
// STRIPPED dispatch_task and approve_task off ten agents; a patch script appended the same section
// four times because presence was checked and count was not; a tool provisioned without `?uid` is
// attached, callable, and can never resolve an owner.
//
// None of those are visible from the response to the call that caused them. They are only visible
// by reading the fleet back afterwards, which is what this does.
//
// It asserts four things per agent:
//   1. the expected TOOL SET, by name (business gets the full set; personal must NOT have the
//      doing-slice — a coach that can draft and send on someone's behalf is a different product)
//   2. every uid-identified tool carries `?uid=<this agent's owner>` — not just any uid
//   3. every tool carries the tool-secret header, or its calls 401 in live conversations
//   4. each prompt section appears EXACTLY as many times as its gate allows: once when the tool
//      that backs it is attached, zero times when it is not. Zero matters as much as one — a stale
//      section promising a tool the agent no longer holds is the same broken promise.
//
//   node --env-file=.env.local scripts/verify-agent-fleet.mjs

import { createClient } from '@supabase/supabase-js';

import { UID_TOOL_NAMES } from '../lib/kira/uid-tools.mjs';
import { toolDefsFor } from '../lib/kira/tool-manifest.mjs';

const { ELEVENLABS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, DISCOVERY_AGENT_ID } =
  process.env;

if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing');
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('Supabase env missing');

const TOOL_SECRET_HEADER = 'x-convai-tool-secret';

/**
 * What each journey is supposed to hold — DERIVED from the manifest, not restated here.
 *
 * It was a hand-kept copy that "mirrors buildToolsForUser()", and on 2026-08-10 that copy became
 * the thing reporting a correct fleet as broken: dropping save_message + update_conversation_topic
 * from tool-manifest.mjs produced 20 PROBLEMS from a verifier still expecting them. Both directions
 * of that drift are bad — the note below records the fleet holding 17 against an expected 15 and
 * PASSING, and this was the same list wrong the other way.
 *
 * The manifest already exists to be the one list (see its header: "A tool cannot be described to
 * her without being attached, and cannot be attached without being described, because there is only
 * one list"). A verifier with its own second list is outside that guarantee by construction, so it
 * now reads the same source the provisioner and the prompt read.
 *
 * The ordering/journey split stays observable: toolDefsFor already returns the doing + Google slice
 * for business only, so the personal-must-NOT-hold check below still has something real to assert.
 */
const manifestNames = (journey) =>
  toolDefsFor(journey, process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app')
    .filter((t) => t?.name)
    .map((t) => t.name);

const MEMORY_AND_KNOWLEDGE = manifestNames('personal');
const BUSINESS_ONLY = manifestNames('business').filter((n) => !MEMORY_AND_KNOWLEDGE.includes(n));
// The previous hand-kept array is preserved as the RATIONALE it carried, because the reason those
// last two entries exist is worth more than the list was:
//   "Added 2026-08-02 after the fleet was found holding 17 tools against an expected set of 15 —
//    and passing. The two the script did not know about were exactly the pair that carries the
//    confirmed-state axis, so a re-provision that dropped them would have reported 'fleet is
//    consistent' while the axis the product charges for was dead across every agent."
// Deriving from the manifest is that lesson generalised: the list cannot fall behind what is
// attached, in either direction, because it is no longer a separate list.

/**
 * Prompt sections, and the tool that entitles an agent to carry each one. `null` = ungated (it
 * describes no tool, so every business agent gets it).
 */
/**
 * ⚠️ THIS LIST MUST MIRROR `patch-agent-capabilities.mjs`'s `next` array EXACTLY, gate for gate.
 *
 * It did not, for three sections, and the drift was silent in the direction that matters: the
 * patcher wrote confirmation, entity separation and authority onto the fleet, and this file did not
 * know they existed — so it could never have reported them missing. A verifier that checks a subset
 * of what a writer writes does not verify the writer; it verifies the part of the writer it happens
 * to remember, and reports the rest as green.
 *
 * Two of the three are guards with a measured before/after (entity separation went 0/3 → 3/3, the
 * refusal record 0/6 → 6/6). Losing one to a re-provision would show up as behaviour drifting back,
 * days later, with a passing fleet check standing behind it.
 *
 * When a section is added to the patcher, add it here in the same change.
 */
const SECTIONS = [
  { label: 'capability boundary', marker: '## WHAT YOU CAN GET DONE', gate: null },
  { label: 'accounts', marker: '## READING THEIR ACCOUNTS', gate: ['look_up_financials'] },
  { label: 'task ledger', marker: '## ACCOUNTING FOR WHAT THEY ASKED FOR', gate: ['check_tasks'] },
  { label: 'confirmation', marker: '## CHECKING WHAT YOU HAVE GOT RIGHT', gate: ['facts_to_confirm'] },
  {
    label: 'files and contacts',
    marker: '## THEIR FILES AND THEIR CONTACTS',
    gate: ['search_drive', 'read_document', 'keep_document', 'lookup_contact'],
  },
  { label: 'tool honesty', marker: '## NEVER SAY YOU CHECKED SOMETHING YOU DID NOT', gate: null },
  { label: 'typed input', marker: '## WHEN HE TYPES INSTEAD OF SPEAKING', gate: null },
  { label: 'entity separation', marker: '## ONE ACCOUNT, ONE BUSINESS', gate: null },
  { label: 'authority', marker: '## WHO IS ACTUALLY ASKING', gate: null },
];

const el = (path) =>
  fetch(`https://api.elevenlabs.io/v1/convai/${path}`, { headers: { 'xi-api-key': ELEVENLABS_API_KEY } }).then(
    (r) => r.json(),
  );

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY);
const { data: agents, error } = await supabase
  .from('kira_agents')
  .select('elevenlabs_agent_id,agent_name,journey_type,user_id,status')
  .in('status', ['active', 'paused']);
if (error) throw new Error(`supabase: ${error.message}`);

let problems = 0;
/** Reset per agent, so the per-agent verdict below reflects THIS agent and not the run so far. */
let agentProblems = 0;
const note = (agentLabel, message) => {
  problems += 1;
  agentProblems += 1;
  console.log(`  ✗ ${agentLabel}: ${message}`);
};

console.log(`[verify] ${agents.length} agent(s)\n`);

for (const a of agents) {
  const id = a.elevenlabs_agent_id;
  if (!id) continue;
  const label = `${a.agent_name ?? '(unnamed)'} ${id}`;
  agentProblems = 0;
  const isDiscovery = a.agent_name === 'Kira Discovery' || (DISCOVERY_AGENT_ID && id === DISCOVERY_AGENT_ID);
  if (isDiscovery) {
    console.log(`  – ${label} — discovery agent, different contract; skipped`);
    continue;
  }

  const live = await el(`agents/${id}`);
  const promptCfg = live?.conversation_config?.agent?.prompt;
  const promptText = promptCfg?.prompt || '';
  const toolIds = promptCfg?.tool_ids || [];

  // Resolve ids to definitions. A tool that cannot be read is treated as ABSENT rather than assumed
  // present — the point of this script is to stop assuming.
  const tools = [];
  for (const toolId of toolIds) {
    try {
      const t = await el(`tools/${toolId}`);
      if (t?.tool_config?.name) tools.push(t.tool_config);
    } catch {
      note(label, `tool ${toolId} could not be read`);
    }
  }
  const held = new Set(tools.map((t) => t.name));
  const isBusiness = a.journey_type === 'business';
  const expected = isBusiness ? [...MEMORY_AND_KNOWLEDGE, ...BUSINESS_ONLY] : MEMORY_AND_KNOWLEDGE;

  for (const name of expected) if (!held.has(name)) note(label, `missing tool ${name}`);
  if (!isBusiness) {
    for (const name of BUSINESS_ONLY) {
      if (held.has(name)) note(label, `personal agent must NOT hold ${name}`);
    }
  }

  for (const t of tools) {
    const url = t.api_schema?.url || t.webhook?.url || '';
    if (!url) continue;
    const headers = t.api_schema?.request_headers || t.webhook?.headers || {};
    const hasSecret = Object.keys(headers).some((k) => k.toLowerCase() === TOOL_SECRET_HEADER);
    if (!hasSecret) note(label, `${t.name} carries no ${TOOL_SECRET_HEADER} header — its calls will 401`);

    if (UID_TOOL_NAMES.some((n) => url.includes(`/${n}?`) || url.endsWith(`/${n}`))) {
      const uid = new URL(url).searchParams.get('uid');
      if (!uid) note(label, `${t.name} has no ?uid — it can never resolve an owner`);
      else if (uid !== a.user_id) note(label, `${t.name} is baked to uid ${uid}, not this agent's owner`);
    }
  }

  for (const s of SECTIONS) {
    const want = !isBusiness ? 0 : s.gate === null ? 1 : s.gate.some((g) => held.has(g)) ? 1 : 0;
    const found = promptText.split(s.marker).length - 1;
    // Ungated sections reach personal agents too via a separate path, so only assert the ones this
    // fleet's scripts actually manage: business agents.
    if (isBusiness && found !== want) {
      note(label, `${s.label} section: expected ${want} copy, found ${found}`);
    }
  }

  if (!agentProblems) console.log(`  ✓ ${label} — ${held.size} tools, prompt sections correct`);
}

/**
 * SHADOW AGENTS — an ElevenLabs agent sharing a name with one of ours that no row points at.
 *
 * `provisionVoiceAgent` is idempotent BY NAME (`findAgentsByName`), so two agents with one name is
 * not untidiness — it is a coin toss over which one a future provision hands to an owner, and the
 * loser is typically the empty one, because it is the abandoned first attempt. That is the exact
 * BucketLyst failure: the second buyer's dashboard hit a duplicate-key error on the binding insert
 * and fell back to no voice agent at all, silently.
 *
 * Nothing saw this before now. The per-agent loop above walks kira_agents rows, so an agent with no
 * row is invisible to it by construction — the check has to start from the WORKSPACE and look back.
 *
 * Scoped to names some kira_agents row actually uses, because this workspace is shared with other
 * products whose duplicates are none of our business.
 */
console.log('\n[verify] shadow agents (same name, no row)…');
const ourNames = new Set(agents.map((a) => a.agent_name).filter(Boolean));
const boundIds = new Set(agents.map((a) => a.elevenlabs_agent_id));
const workspace = [];
let cursor = null;
do {
  const page = await el(`agents?page_size=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
  workspace.push(...(page?.agents ?? []));
  cursor = page?.has_more ? page.next_cursor : null;
} while (cursor);

let shadows = 0;
for (const name of ourNames) {
  const matches = workspace.filter((a) => a.name === name);
  if (matches.length < 2) continue;
  for (const m of matches) {
    if (boundIds.has(m.agent_id)) continue;
    shadows += 1;
    problems += 1;
    const full = await el(`agents/${m.agent_id}`);
    const toolCount = (full?.conversation_config?.agent?.prompt?.tool_ids ?? []).length;
    console.log(
      `  ✗ ${name}: unbound twin ${m.agent_id} (${toolCount} tools) — a provision by name may hand an owner THIS one`,
    );
  }
}
if (!shadows) console.log('  ✓ no shadow agents');

console.log(problems ? `\n[verify] ${problems} PROBLEM(S)` : '\n[verify] fleet is consistent');
process.exit(problems ? 1 : 0);
