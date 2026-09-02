// Patch the live fleet with the VALUE QUESTIONS rule added 2026-08-23.
//
// ⚠️ WHY A PATCH SCRIPT AT ALL. A change to lib/kira/prompts.ts reaches NO live agent. Every agent
// carries the prompt it was minted with, plus whatever has been appended since, so source edits are
// invisible to every owner already using the product until something writes them across.
//
// WHAT IT CARRIES: "## VALUE QUESTIONS" — the owner who asks what his business is worth is offered
// the eleven questions on the spot, because the value gap needs no accounting software. Ray's
// eighth visit found Kira gating the number on Xero data she cannot reach ("I'd need your
// accounting data"), sending him away empty-handed from the one question the whole product exists
// to answer. The prompt text was added inside capabilityBoundary in source, but every live agent
// already carries that boundary's marker, so patch-agent-capabilities.mjs skips them by design.
//
// ADDITIVE, NEVER A REGENERATION. Rebuilding a prompt from source discards the owner-specific
// context it was minted with. This inserts one section before an existing heading and touches
// nothing else.
//
// THE ANCHOR is "## WHAT YOU CANNOT REACH YET", which follows the new section in source, so live
// prompts stay in the same order as the file. An agent missing that anchor is REPORTED, never
// appended-to-the-end — a section landing in the wrong place is how live prompts drift out of step
// with source.
//
// SINGLE SOURCE: the section text is read out of lib/kira/prompts.ts rather than restated here, so
// this script cannot say something the file does not.
//
// READ-BACK AFTER WRITE. A 200 from updateAgent is not evidence the prompt changed.
//
//   node scripts/patch-agent-value-questions.mjs            # dry run (default)
//   node scripts/patch-agent-value-questions.mjs --apply

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

// Dry run by default. Other agent scripts here default to APPLY, which project memory records as a
// hazard; a fleet-wide prompt write is not the place to inherit it.
const APPLY = process.argv.includes('--apply');

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY missing');

const promptsSrc = fs.readFileSync(path.join(process.cwd(), 'lib/kira/prompts.ts'), 'utf8');

const SECTION_HEADING = '## VALUE QUESTIONS';
const ANCHOR = '## WHAT YOU CANNOT REACH YET';
const MARKER = SECTION_HEADING;

const start = promptsSrc.indexOf(SECTION_HEADING);
if (start === -1) throw new Error(`Could not find ${SECTION_HEADING} in lib/kira/prompts.ts`);
const end = promptsSrc.indexOf(ANCHOR, start);
if (end === -1) throw new Error('Could not find the heading following the section in lib/kira/prompts.ts');

const SECTION = promptsSrc
  .slice(start, end)
  .replace(/\\`/g, '`') // the file escapes backticks inside its template literal
  .trim();
if (!SECTION.includes(MARKER)) throw new Error(`the extracted text is missing its marker ${MARKER}`);

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const { data: rows, error } = await supabase
  .from('kira_agents')
  .select('elevenlabs_agent_id, agent_name, journey_type, status')
  .in('status', ['active', 'paused']);
if (error) throw new Error(error.message);

// Business only. A personal-journey coach has no valuation behind it, so the instruction would
// describe a behaviour it cannot have.
const targets = rows.filter((r) => (r.journey_type ?? 'business') !== 'personal');
const skippedPersonal = rows.length - targets.length;

console.log(`${targets.length} business agent(s)${APPLY ? '  [APPLY]' : '  [DRY RUN — pass --apply]'}`);
console.log(`section: ${SECTION.length} chars · anchor: "${ANCHOR}"`);
if (skippedPersonal) console.log(`skipping ${skippedPersonal} personal agent(s)`);
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
    console.log(`  ? ${name} — anchor not present; NOT patched`);
    noAnchor++;
    continue;
  }

  const next = `${prompt.slice(0, at)}${SECTION}\n\n${prompt.slice(at)}`;

  if (!APPLY) {
    console.log(`  + ${name} — would patch (${prompt.length} → ${next.length} chars)`);
    patched++;
    continue;
  }

  try {
    const result = await writePromptAndVerify(apiKey, id, next, { mustContain: MARKER });
    if (result.ok) {
      console.log(`  ✓ ${name} — patched and verified (${result.before} → ${result.after} chars)`);
      patched++;
    } else {
      console.log(`  ✗ ${name} — ${result.reason}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ✗ ${name} — ${e.message}`);
    failed++;
  }
}

console.log('');
console.log(`patched ${patched} · already ${already} · no anchor ${noAnchor} · failed ${failed}`);
if (failed > 0) process.exitCode = 1;
