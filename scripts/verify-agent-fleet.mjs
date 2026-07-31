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

const { ELEVENLABS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DISCOVERY_AGENT_ID } =
  process.env;

if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing');
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase env missing');

const TOOL_SECRET_HEADER = 'x-convai-tool-secret';

/** What each journey is supposed to hold. Mirrors buildToolsForUser() in the re-provision script. */
const MEMORY_AND_KNOWLEDGE = [
  'get_conversation_context',
  'save_message',
  'update_conversation_topic',
  'recall_memory',
  'save_memory',
  'search_knowledge',
];
const BUSINESS_ONLY = [
  'dispatch_task',
  'approve_task',
  'look_up_financials',
  'check_tasks',
  'search_drive',
  'read_document',
  'keep_document',
  'lookup_contact',
];

/**
 * Prompt sections, and the tool that entitles an agent to carry each one. `null` = ungated (it
 * describes no tool, so every business agent gets it).
 */
const SECTIONS = [
  { label: 'capability boundary', marker: '## WHAT YOU CAN GET DONE', gate: null },
  { label: 'accounts', marker: '## READING THEIR ACCOUNTS', gate: ['look_up_financials'] },
  { label: 'task ledger', marker: '## ACCOUNTING FOR WHAT THEY ASKED FOR', gate: ['check_tasks'] },
  {
    label: 'files and contacts',
    marker: '## THEIR FILES AND THEIR CONTACTS',
    gate: ['search_drive', 'read_document', 'keep_document', 'lookup_contact'],
  },
  { label: 'tool honesty', marker: '## NEVER SAY YOU CHECKED SOMETHING YOU DID NOT', gate: null },
  { label: 'typed input', marker: '## WHEN HE TYPES INSTEAD OF SPEAKING', gate: null },
];

const el = (path) =>
  fetch(`https://api.elevenlabs.io/v1/convai/${path}`, { headers: { 'xi-api-key': ELEVENLABS_API_KEY } }).then(
    (r) => r.json(),
  );

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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

console.log(problems ? `\n[verify] ${problems} PROBLEM(S)` : '\n[verify] fleet is consistent');
process.exit(problems ? 1 : 0);
