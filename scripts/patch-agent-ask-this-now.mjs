// Patch the live fleet with the two DURING-CONVERSATIONS rules added 2026-08-17.
//
// ⚠️ WHY A PATCH SCRIPT AT ALL. A change to lib/kira/prompts.ts reaches NO live agent. Every agent
// carries the prompt it was minted with, plus whatever has been appended since, so source edits are
// invisible to every owner already using the product until something writes them across.
//
// WHAT IT CARRIES, and it is the thing that decided a sale:
//
//   1. Obey `ask_this_now` before saying anything else.
//   2. Never offer to save what you already saved.
//
// The server-side trigger was already built and VERIFIED FIRING on the exact fact —
// `sole-capability-ageing` matches "Gary is 61 years old… the only other person who can price jobs"
// — so save_memory returned the question to ask. She said "Done — I've saved the key people
// details… What next?" and moved on. Ray, 2026-08-17: "She was told a 61-year-old is the only other
// man who can price a job, and she said what next. I am being asked to put thirty-five years into
// her keeping. She has to be more careful with it than I am."
//
// A returned field is data an agent may summarise past. A prompt line is what makes it an
// instruction.
//
// ADDITIVE, NEVER A REGENERATION. Rebuilding a prompt from source discards the owner-specific
// context it was minted with — their name, their business, their framework. This inserts two bullets
// at one anchor and touches nothing else.
//
// THE ANCHOR is the bullet these follow in source ("Reference what you know"), so live prompts stay
// in the same order as the file. An agent missing that anchor is REPORTED, never appended-to-the-end
// — a section landing in the wrong place is how live prompts drift out of step with source, which
// project memory records as the reason patch-agent-capabilities.mjs must not be run.
//
// SINGLE SOURCE: the bullet text is read out of lib/kira/prompts.ts rather than restated here, so
// this script cannot say something the file does not.
//
// READ-BACK AFTER WRITE. A 200 from updateAgent is not evidence the prompt changed.
//
//   node scripts/patch-agent-ask-this-now.mjs            # dry run (default)
//   node scripts/patch-agent-ask-this-now.mjs --apply

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

// The two bullets, lifted verbatim from the file between the anchor and the bullet that follows
// them. Read rather than restated, so the fleet and the source cannot disagree.
const ANCHOR = "- **Reference what you know** — don't re-ask what you already have.";
const NEXT_BULLET = '- **Never say you watch, monitor or observe him.**';
const MARKER = 'ask_this_now';

const start = promptsSrc.indexOf(ANCHOR);
if (start === -1) throw new Error('Could not find the anchor bullet in lib/kira/prompts.ts');
const end = promptsSrc.indexOf(NEXT_BULLET, start);
if (end === -1) throw new Error('Could not find the bullet following the section in lib/kira/prompts.ts');

const SECTION = promptsSrc
  .slice(start + ANCHOR.length, end)
  .replace(/\\`/g, '`') // the file escapes backticks inside its template literal
  .trim();
if (!SECTION.includes(MARKER)) throw new Error(`the extracted text is missing its marker ${MARKER}`);

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: rows, error } = await supabase
  .from('kira_agents')
  .select('elevenlabs_agent_id, agent_name, journey_type, status')
  .in('status', ['active', 'paused']);
if (error) throw new Error(error.message);

// Business only. A personal agent has no save_memory risk triggers to obey and no Genome behind
// them, so the instruction would describe a behaviour it cannot have.
const targets = rows.filter((r) => (r.journey_type ?? 'business') !== 'personal');
const skippedPersonal = rows.length - targets.length;

console.log(`${targets.length} business agent(s)${APPLY ? '  [APPLY]' : '  [DRY RUN — pass --apply]'}`);
console.log(`section: ${SECTION.length} chars · anchor: "${ANCHOR.slice(0, 48)}…"`);
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

  const insertAt = at + ANCHOR.length;
  const next = `${prompt.slice(0, insertAt)}\n${SECTION}${prompt.slice(insertAt)}`;

  if (!APPLY) {
    console.log(`  + ${name} — would patch (${prompt.length} → ${next.length} chars)`);
    patched++;
    continue;
  }

  // ⚠️ POSITIONAL, AND IT RETURNS A RESULT RATHER THAN THROWING.
  // Called with an options object first, `apiKey` arrived as undefined and every agent came back
  // "ElevenLabs agent fetch failed: 401 Invalid API key" — which reads exactly like a revoked key
  // and is not. The dry run had passed moments earlier on the same key, and a raw PATCH with it
  // returned 200; that pair is what separated "my call is wrong" from "the credential is dead".
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
