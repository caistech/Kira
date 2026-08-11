#!/usr/bin/env node
//
// Insert `## WHEN HE HAS JUST COME OFF A CALL` into a live agent's prompt.
//
// WHY THIS EXISTS. An ElevenLabs system prompt is baked at provision time, so adding a section to
// lib/kira/prompts.ts changes what the NEXT agent is created with and touches nothing already live.
// The call debrief is P1 of the largest ask in CAPTURED_ASKS — and the man who asked for it,
// Chris in Geraldton, has an agent that was minted months ago. Without this he never gets it.
//
// ADDITIVE, NEVER A REGENERATION. Each live prompt carries owner-specific context built at creation
// — their name, their business, their framework, and anything appended since. Rebuilding from source
// would silently discard all of it. This inserts one section at one anchor and touches nothing else,
// which is the same discipline as patch-agent-tool-inventory.mjs.
//
// ⚠️ THIS IS NOT patch-agent-capabilities.mjs, and must not become it. That script is recorded in
// project memory as MUST-NOT-RUN because it reorders sections and puts live prompts back out of step
// with source. The rule this one keeps: insert at the position source uses, or do not insert at all.
//
// THE ANCHOR is the confirmation section, because that is what follows the debrief in
// getBusinessPrompt. An agent missing that anchor is REPORTED, never appended-to-the-end — an
// out-of-order prompt is exactly the damage the paragraph above describes.
//
// SINGLE SOURCE: the section text is read out of lib/kira/prompts.ts rather than restated here. A
// second copy of a prompt section is a copy that drifts, and drift between what she is told she can
// do and what she can actually do is the failure family this repo keeps paying for.
//
// READ-BACK AFTER WRITE. A 200 from updateAgent is not evidence the prompt changed — "a returned
// call is not an attached tool" is already a commit message in this repo. Every patched agent is
// re-fetched and checked, and a failed read-back is a loud error rather than a silent success.
//
//   node scripts/patch-agent-call-debrief.mjs            # dry run (default)
//   node scripts/patch-agent-call-debrief.mjs --apply

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

const sectionMatch = promptsSrc.match(/export const callDebriefSection = `([\s\S]*?)`;/);
if (!sectionMatch) throw new Error('Could not read callDebriefSection from lib/kira/prompts.ts');
const SECTION = sectionMatch[1].trim();

const markerMatch = promptsSrc.match(/export const CALL_DEBRIEF_MARKER = '([^']+)'/);
if (!markerMatch) throw new Error('Could not read CALL_DEBRIEF_MARKER from lib/kira/prompts.ts');
const MARKER = markerMatch[1];
if (!SECTION.includes(MARKER)) throw new Error(`callDebriefSection is missing its marker ${MARKER}`);

const anchorMatch = promptsSrc.match(/export const CONFIRMATION_MARKER = '([^']+)'/);
if (!anchorMatch) throw new Error('Could not read CONFIRMATION_MARKER from lib/kira/prompts.ts');
const ANCHOR = anchorMatch[1];

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: rows, error } = await supabase
  .from('kira_agents')
  .select('elevenlabs_agent_id, agent_name, journey_type, status')
  .in('status', ['active', 'paused']);
if (error) throw new Error(error.message);

// Business only — getBusinessPrompt composes this section and getPersonalPrompt does not. Patching a
// personal agent would give it an instruction its own prompt was never built around.
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
    // A finding, not a no-op. Appending to the end instead would put this prompt out of step with
    // source ordering, which is the damage patch-agent-capabilities.mjs is recorded for.
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
    // writePromptAndVerify reads back and preserves llm/temperature — see scripts/lib/agent-prompt.mjs
    // for the silent no-op that made it necessary.
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
