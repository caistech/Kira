#!/usr/bin/env node
//
// Insert `## WORKING ON ONE PART OF THE BUSINESS` into a live agent's prompt.
//
// WHY THIS EXISTS. An ElevenLabs system prompt is baked at provision time, so adding a section to
// lib/kira/prompts.ts changes what the NEXT agent is created with and touches nothing already live.
// Every existing agent was minted before `area_agenda` existed, so without this they hold the tool
// and no instruction about when to reach for it — which is the worst of the three states, because a
// tool she never calls is indistinguishable from a tool that does not work.
//
// WHAT IT BUYS, measured rather than argued. On the operator's own account: 96 filed memories, ZERO
// answers to the questions a buyer asks about Customers, 28 Operations entries answering none of
// them, `people` and `assets` empty. She had no agenda, so she talked about the last live job — and
// the last live job is always the one in front of him. The day after, a conversation opened
// deliberately to work on a Genome area still opened on the Herrings plumbing quote, and the single
// memory it produced was a note about the Genome itself, filed as a fact about his business.
//
// ADDITIVE, NEVER A REGENERATION. Each live prompt carries owner-specific context built at creation
// — their name, their business, their framework, and anything appended since. Rebuilding from source
// would silently discard all of it. This inserts one section at one anchor and touches nothing else.
//
// ⚠️ IT IS NOT patch-agent-capabilities.mjs, and must not become it. That script is recorded in
// project memory as MUST-NOT-RUN because it reorders sections and puts live prompts out of step with
// source. The rule kept here: insert at the position source uses, or do not insert at all.
//
// THE ANCHOR is the confirmation section, because that is what follows this one in getBusinessPrompt
// (`taskLedger → callDebrief → areaWork → confirmation`). An agent missing that anchor is REPORTED,
// never appended-to-the-end.
//
// ⚠️ THE ANCHOR SURVIVES A TRIM THAT HAPPENED THE SAME DAY. `confirmationSection` was cut from 1,699
// characters to 393 in source — ~95% of it was verbatim in the facts_to_confirm / confirm_fact tool
// descriptions — but the HEADING is unchanged, and live agents still carry the long version. So the
// anchor matches on both the old and the new text, which is the only reason this is safe to run
// against a fleet whose prompts predate that trim.
//
// SINGLE SOURCE: the section text is read out of lib/kira/prompts.ts rather than restated here.
//
// READ-BACK AFTER WRITE. A 200 from updateAgent is not evidence the prompt changed.
//
//   node scripts/patch-agent-area-work.mjs            # dry run (default)
//   node scripts/patch-agent-area-work.mjs --apply

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { getAgent } from '@caistech/elevenlabs-convai';

import { writePromptAndVerify } from './lib/agent-prompt.mjs';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// Dry run by default. Every other agent script here defaults to APPLY, which project memory records
// as a hazard; a prompt rewrite across the live fleet is not the place to inherit that.
const APPLY = process.argv.includes('--apply');

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY missing');

const promptsSrc = fs.readFileSync(path.join(process.cwd(), 'lib/kira/prompts.ts'), 'utf8');

const sectionMatch = promptsSrc.match(/export const areaWorkSection = `([\s\S]*?)\n`;/);
if (!sectionMatch) throw new Error('Could not read areaWorkSection from lib/kira/prompts.ts');
const SECTION = sectionMatch[1].trim();

const markerMatch = promptsSrc.match(/export const AREA_WORK_MARKER = '([^']+)'/);
if (!markerMatch) throw new Error('Could not read AREA_WORK_MARKER from lib/kira/prompts.ts');
const MARKER = markerMatch[1];
if (!SECTION.includes(MARKER)) throw new Error(`areaWorkSection is missing its marker ${MARKER}`);

const anchorMatch = promptsSrc.match(/export const CONFIRMATION_MARKER = '([^']+)'/);
if (!anchorMatch) throw new Error('Could not read CONFIRMATION_MARKER from lib/kira/prompts.ts');
const ANCHOR = anchorMatch[1];

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const { data: rows, error } = await supabase
  .from('kira_agents')
  .select('elevenlabs_agent_id, agent_name, journey_type, status')
  .in('status', ['active', 'paused']);
if (error) throw new Error(error.message);

// Business only — the nine areas describe a business, and getPersonalPrompt does not compose this
// section. Patching a personal agent would give it an instruction about a Genome it does not have,
// and a tool (area_agenda) that toolDefsFor deliberately withholds from it.
const targets = rows.filter((r) => (r.journey_type ?? 'business') !== 'personal');
const skippedPersonal = rows.length - targets.length;

console.log(`${targets.length} business agent(s)${APPLY ? '  [APPLY]' : '  [DRY RUN — pass --apply]'}`);
console.log(`section: ${SECTION.length} chars · anchor: "${ANCHOR}"`);
if (skippedPersonal) console.log(`skipping ${skippedPersonal} personal agent(s) — the section is business-only`);
console.log('');

let patched = 0, already = 0, noAnchor = 0, failed = 0;

for (const row of targets) {
  const id = row.elevenlabs_agent_id;
  const agent = await getAgent(apiKey, id);
  const name = agent?.name ?? row.agent_name ?? id;
  const prompt = agent?.conversation_config?.agent?.prompt?.prompt ?? '';

  if (prompt.includes(MARKER)) {
    console.log(`  = ${name} — already has it`);
    already++;
    continue;
  }

  const at = prompt.indexOf(ANCHOR);
  if (at === -1) {
    console.log(`  ? ${name} — anchor "${ANCHOR}" not present; NOT patched`);
    noAnchor++;
    continue;
  }

  const next = `${prompt.slice(0, at)}${SECTION}\n\n${prompt.slice(at)}`;
  if (next === prompt || !next.includes(MARKER)) {
    throw new Error(`insertion was a no-op for ${name} — refusing to report success`);
  }

  console.log(`  ${APPLY ? '+' : '·'} ${name} — ${prompt.length} → ${next.length} chars`);

  if (APPLY) {
    const res = await writePromptAndVerify(apiKey, id, next, { mustContain: MARKER });
    if (!res.ok) {
      console.error(`  ✗ ${name} — ${res.reason}`);
      failed++;
      continue;
    }
    // Order is part of correctness: it must land BEFORE the confirmation section, as in source.
    const live = (await getAgent(apiKey, id))?.conversation_config?.agent?.prompt?.prompt ?? '';
    if (live.indexOf(MARKER) > live.indexOf(ANCHOR)) {
      console.error(`  ✗ ${name} — landed AFTER the anchor; prompt is now out of step with source`);
      failed++;
      continue;
    }
    console.log(`        verified live: ${res.before} → ${res.after} chars`);
    patched++;
  }
}

console.log(
  `\n${APPLY ? `patched ${patched}` : 'would patch'} · already ${already} · no anchor ${noAnchor} · failed ${failed}`,
);
if (failed > 0) process.exitCode = 1;
