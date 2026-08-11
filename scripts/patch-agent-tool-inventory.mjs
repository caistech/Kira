#!/usr/bin/env node
//
// Rewrite the ONE SENTENCE in a live agent's prompt that lists which tools it has.
//
// WHY THIS EXISTS. An ElevenLabs system prompt is baked at provision time, so editing
// lib/kira/tool-manifest.mjs changes what the NEXT agent is created with and touches nothing
// already live. Measured 2026-08-10: 10 of 11 deployed agents carried
//
//   "These are the tools you have, and there are no others: get_conversation_context,
//    save_message, update_conversation_topic, recall_memory, …"
//
// Dropping save_message / update_conversation_topic from the attached set WITHOUT this leaves every
// owner's agent asserting it holds two tools it does not. That is the precise failure
// tool-manifest.mjs was written to end, pointed the other way: she reaches for a tool that isn't
// there, the call fails, and she reports it to the owner as something she "can't access" — which
// reads as a broken product rather than a removed feature.
//
// ORDER MATTERS, AND IT IS NOT SYMMETRIC. Run this BEFORE the tool removal. A prompt that
// UNDERSTATES what she holds is harmless — she simply never calls the two. A prompt that OVERSTATES
// produces the failure above. So: patch the words, then strip the tools.
//
// SURGICAL — replaces the NAME LIST ONLY, never the section and never the prompt. Each agent's
// prompt carries owner-specific context built at creation (their name, their business, their
// framework, and anything appended since). Regenerating would silently discard it, which is the
// same reason patch-agent-capabilities.mjs appends rather than replaces.
//
// IDEMPOTENT: an agent whose list already matches the manifest is skipped, so this is safe to
// re-run and safe against a mixed fleet.
//
//   node scripts/patch-agent-tool-inventory.mjs            # dry run (default)
//   node scripts/patch-agent-tool-inventory.mjs --apply

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { getAgent } from '@caistech/elevenlabs-convai';

import { writePromptAndVerify } from './lib/agent-prompt.mjs';

import { toolDefsFor } from '../lib/kira/tool-manifest.mjs';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// Default is a DRY RUN. Every other agent script in this repo defaults to APPLY, which is recorded
// as a hazard in project memory; a prompt rewrite across the live fleet is not the place to inherit
// that convention.
const APPLY = process.argv.includes('--apply');

const apiKey = process.env.ELEVENLABS_API_KEY;
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app').replace(/\/$/, '');
if (!apiKey) throw new Error('ELEVENLABS_API_KEY missing');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// The sentence, anchored on its own opening words so it cannot match anything else in the prompt.
const LIST_RE = /(These are the tools you have, and there are no others: )([^.]+)(\.)/;

const { data: rows, error } = await supabase
  .from('kira_agents')
  .select('elevenlabs_agent_id, journey_type, status')
  .in('status', ['active', 'paused']);
if (error) throw new Error(error.message);

console.log(`${rows.length} agent(s)${APPLY ? '  [APPLY]' : '  [DRY RUN — pass --apply]'}\n`);

let patched = 0, already = 0, missing = 0, failedWrites = 0;

for (const row of rows) {
  const agent = await getAgent(apiKey, row.elevenlabs_agent_id);
  const name = agent?.name ?? row.elevenlabs_agent_id;
  const prompt = agent?.conversation_config?.agent?.prompt?.prompt ?? '';

  const match = LIST_RE.exec(prompt);
  if (!match) {
    // Reported, never skipped silently: an agent whose prompt does not carry the sentence is one
    // this script cannot keep honest, and that is a finding rather than a no-op.
    console.log(`  ? ${name} — no tool-inventory sentence found; NOT patched`);
    missing++;
    continue;
  }

  const expected = toolDefsFor(row.journey_type ?? 'business', appUrl)
    .filter((t) => t?.name)
    .map((t) => t.name)
    .join(', ');

  if (match[2].trim() === expected) {
    console.log(`  = ${name} — already matches the manifest (${expected.split(', ').length} tools)`);
    already++;
    continue;
  }

  const had = match[2].split(',').map((s) => s.trim());
  const want = expected.split(', ');
  const removed = had.filter((n) => !want.includes(n));
  const added = want.filter((n) => !had.includes(n));

  console.log(`  ${APPLY ? '+' : '·'} ${name} — ${had.length} → ${want.length} tools`);
  if (removed.length) console.log(`        remove: ${removed.join(', ')}`);
  if (added.length) console.log(`        add:    ${added.join(', ')}`);

  if (APPLY) {
    const next = prompt.replace(LIST_RE, `$1${expected}$3`);
    if (next === prompt) throw new Error(`replacement was a no-op for ${name} — refusing to report success`);
    // ⚠️ This used to call updateAgent with a raw conversation_config body, which the package
    // ignores — 200, nothing written. It reported "10 prompts patched" on 2026-08-10 and patched
    // none, leaving every prompt naming two tools the agent no longer held for a full day.
    // scripts/lib/agent-prompt.mjs reads back and preserves llm/temperature.
    const res = await writePromptAndVerify(apiKey, row.elevenlabs_agent_id, next, { mustContain: expected });
    if (!res.ok) {
      console.error(`  ✗ ${name} — ${res.reason}`);
      failedWrites++;
      continue;
    }
    console.log(`        verified live: ${res.before} → ${res.after} chars`);
    patched++;
  }
}

console.log(`\n${APPLY ? `patched ${patched}` : 'would patch'} · already correct ${already} · no sentence ${missing}`);
