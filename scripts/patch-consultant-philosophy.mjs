#!/usr/bin/env node
// scripts/patch-consultant-philosophy.mjs
//
// One-off patch for a real bug found live 2026-09-22: getConsultantPrompt() was injecting
// EXEC_PHILOSOPHY (lib/kira/exec-philosophy.mjs) verbatim — a block whose own file header says
// "the fractional executive for a BUSINESS OWNER" — into every consultant/distributor-journey
// agent's prompt. Journey routing was correct (journey_type='consultant' in the DB, getKiraPrompt
// branched correctly); the PROMPT CONTENT was wrong, so a partner bringing Kira to their own
// clients was told "you are building their exit" / "turned into something that could run (and
// sell) WITHOUT them" — the business-owner persona, in a partner-onboarding conversation.
//
// Fixed at source (lib/kira/exec-philosophy.mjs now exports consultantPhilosophyFor(); prompts.ts
// wires it into getConsultantPrompt() instead of execPhilosophyFor()). This script pushes that fix
// to already-provisioned live agents — same "source doesn't reach live agents automatically"
// pattern this repo's Known State section documents for prompts.ts/tool-manifest.mjs changes.
//
// Scope: EVERY active kira_agents row with journey_type IN ('consultant', 'distributor'). Does an
// EXACT string replace of the rendered EXEC_PHILOSOPHY block (with that agent owner's real first
// name interpolated) for the rendered CONSULTANT_PHILOSOPHY block — never a regex/marker guess at
// section boundaries, so a prompt that has already drifted from source is left alone and reported,
// not corrupted.
//
// Usage: node --env-file=.env.local scripts/patch-consultant-philosophy.mjs [--dry-run]

import { createClient } from '@supabase/supabase-js';
import { execPhilosophyFor, consultantPhilosophyFor } from '../lib/kira/exec-philosophy.mjs';

const { ELEVENLABS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

const DRY_RUN = process.argv.includes('--dry-run');
const AGENTS_API = 'https://api.elevenlabs.io/v1/convai/agents';

if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing');
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('Supabase env missing');

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY);
const auth = { 'xi-api-key': ELEVENLABS_API_KEY };

const { data: agents, error } = await supabase
  .from('kira_agents')
  .select('id, elevenlabs_agent_id, journey_type, person_id, status')
  .in('journey_type', ['consultant', 'distributor'])
  .neq('status', 'archived');

if (error) throw error;

const personIds = [...new Set(agents.map((a) => a.person_id).filter(Boolean))];
const { data: persons } = personIds.length
  ? await supabase.from('persons').select('person_id, first_name').in('person_id', personIds)
  : { data: [] };
const nameFor = new Map((persons ?? []).map((p) => [p.person_id, p.first_name]));

console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Checking ${agents.length} consultant/distributor agent(s)\n`);

let patched = 0;
let skipped = 0;
let mismatched = 0;
let failed = 0;

for (const a of agents) {
  const id = a.elevenlabs_agent_id;
  if (!id) {
    console.warn(`  - ${a.id}: no elevenlabs_agent_id, skipping`);
    skipped++;
    continue;
  }

  const firstName = nameFor.get(a.person_id) || 'the partner';
  const wrongBlock = execPhilosophyFor(firstName);
  const rightBlock = consultantPhilosophyFor(firstName);

  const res = await fetch(`${AGENTS_API}/${id}`, { headers: auth });
  if (!res.ok) {
    console.error(`  ✗ ${id}: fetch failed (${res.status})`);
    failed++;
    continue;
  }
  const live = await res.json();
  const currentPrompt = live?.conversation_config?.agent?.prompt?.prompt || '';

  if (!currentPrompt.includes(wrongBlock)) {
    console.warn(`  ⚠ ${id} (${firstName}): rendered EXEC_PHILOSOPHY not found verbatim — already patched or drifted, skipping rather than guessing`);
    mismatched++;
    continue;
  }

  const newPrompt = currentPrompt.replace(wrongBlock, rightBlock);

  if (DRY_RUN) {
    console.log(`  [DRY RUN] would patch ${id} (${firstName}) — ${currentPrompt.length} -> ${newPrompt.length} chars`);
    patched++;
    continue;
  }

  const patchRes = await fetch(`${AGENTS_API}/${id}`, {
    method: 'PATCH',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_config: {
        agent: { prompt: { prompt: newPrompt } },
      },
    }),
  });

  if (!patchRes.ok) {
    console.error(`  ✗ ${id}: patch failed (${patchRes.status}) ${await patchRes.text()}`);
    failed++;
    continue;
  }

  console.log(`  ✓ ${id} (${firstName}): patched`);
  patched++;
}

console.log(`\nDone. patched=${patched} skipped=${skipped} mismatched=${mismatched} failed=${failed}`);
if (failed > 0) process.exitCode = 1;
