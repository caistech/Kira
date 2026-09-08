#!/usr/bin/env node
// scripts/reprovision-org-agent-persona.mjs
// Re-provisions the shared org agent so its persona is ORG-scoped, not PERSON-scoped.
//
// Problem: the agent was provisioned with the owner's personal name (Dennis) in the system prompt
// and first_message. When an org member talks to it, the agent says "You are Dennis's fractional
// executive" and "I have you recorded as Dennis" — wrong identity for a shared org agent.
//
// Fix: sweep the live ElevenLabs prompt (and first_message) for EVERY person-scoped reference —
// the bold EXEC_PHILOSOPHY template, the framework `**Name:**` line, possessive references, and
// any seeded example containing the owner's identity (e.g. a live email address) — and replace
// them with org-neutral language. The caller's own name is provided at runtime by the client-side
// greeting (agentInfo.first_name) and the ?uid identity, never baked into the prompt.
//
// Idempotent: agents already fully org-scoped are skipped.
//
// Usage (from repo root):
//   node --env-file=.env.local scripts/reprovision-org-agent-persona.mjs [--dry-run]

import { createClient } from '@supabase/supabase-js';

const {
  ELEVENLABS_API_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SECRET_KEY,
} = process.env;

const DRY_RUN = process.argv.includes('--dry-run');
const AGENTS_API = 'https://api.elevenlabs.io/v1/convai/agents';

if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing');
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('Supabase env missing');

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY);
const auth = { 'xi-api-key': ELEVENLABS_API_KEY };

// Fetch active agents with their owner's person_id (the person name lives in the persons table)
const { data: agents, error } = await supabase
  .from('kira_agents')
  .select('id, elevenlabs_agent_id, agent_name, status, person_id, organisation_id')
  .in('status', ['active', 'paused'])
  .neq('agent_name', 'Kira Discovery');

if (error) throw error;

// Resolve person names from the persons table
const personIds = [...new Set(agents.map(a => a.person_id).filter(Boolean))];
const { data: persons } = personIds.length
  ? await supabase.from('persons').select('person_id, first_name, last_name, email').in('person_id', personIds)
  : { data: [] };
const personMap = new Map((persons ?? []).map(p => [p.person_id, p]));

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build a set of person identity tokens to sweep (name variants + email local/domain).
function identityTokens(person) {
  const tokens = new Set();
  if (person?.first_name) tokens.add(person.first_name);
  if (person?.last_name) tokens.add(person.last_name);
  if (person?.first_name && person?.last_name) tokens.add(`${person.first_name} ${person.last_name}`);
  if (person?.email) {
    tokens.add(person.email);
    const local = person.email.split('@')[0];
    if (local) tokens.add(local);
  }
  return [...tokens].filter(Boolean).sort((a, b) => b.length - a.length);
}

console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Auditing ${agents.length} agent(s) for person-scoped persona\n`);

let patched = 0;
let skipped = 0;
let failed = 0;

for (const a of agents) {
  const id = a.elevenlabs_agent_id;
  if (!id) {
    console.warn(`  - ${a.agent_name}: no elevenlabs_agent_id, skipping`);
    skipped++;
    continue;
  }

  try {
    const res = await fetch(`${AGENTS_API}/${id}`, { headers: auth });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const live = await res.json();

    const agentCfg = live.conversation_config?.agent ?? {};
    const promptCfg = agentCfg.prompt ?? {};
    const currentPrompt = promptCfg.prompt || '';
    const currentFirst = agentCfg.first_message || '';

    const person = personMap.get(a.person_id);
    const tokens = identityTokens(person);

    if (tokens.length === 0) {
      console.log(`  = ${a.agent_name} — no person identity on record, skipping`);
      skipped++;
      continue;
    }

    // Detect any person-scoped reference in the prompt or first message.
    const hasRef = tokens.some(t => currentPrompt.includes(t) || currentFirst.includes(t));
    if (!hasRef) {
      console.log(`  = ${a.agent_name} — already org-scoped (no identity refs)`);
      skipped++;
      continue;
    }

    let updatedPrompt = currentPrompt;
    let updatedFirst = currentFirst;
    const applied = [];

    // ── 1. The bold WHO YOU ARE persona line (exec-philosophy template).
    //    "You are Dennis's **fractional executive** — ..." → org-neutral.
    for (const t of tokens) {
      const boldPersona = new RegExp(`You are ${escapeRegExp(t)}'s \\*\\*fractional executive\\*\\*`, 'g');
      if (updatedPrompt.match(boldPersona)) {
        updatedPrompt = updatedPrompt.replace(boldPersona, 'You are this organisation\'s **fractional executive**');
        applied.push('bold WHO YOU ARE persona line');
      }
    }

    // ── 2. The framework `**Name:** <token>` line in WHAT YOU KNOW.
    //    A blank-slate org agent must NOT be handed the owner's name — identity comes at runtime.
    for (const t of tokens) {
      const nameLine = new RegExp(`\\*\\*Name:\\*\\* ${escapeRegExp(t)}[^\\n]*\\n`, 'g');
      if (updatedPrompt.match(nameLine)) {
        updatedPrompt = updatedPrompt.replace(nameLine, '');
        applied.push(`**Name:** line (${t})`);
      }
    }

    // ── 3. Person-named pronouns and possessives in instruction prose.
    //    "Dennis's own Google Drive" → "the business's Google Drive";
    //    "when Dennis asks you" → "when the caller asks you".
    for (const t of tokens) {
      if (t.includes(' ') || !/[A-Za-z]/.test(t)) continue; // single word tokens only
      // Possessive — the business objects are the ones the prompt ties to the owner.
      const possessive = new RegExp(`\\b${escapeRegExp(t)}\\'(?:s|’s)\\s*(own\\s+)?(Google|email|Gmail|Drive|Xero|contacts|phone|business|documents|files|accounts?)`, 'gi');
      updatedPrompt = updatedPrompt.replace(possessive, 'this business\'s $1$2');
      // "when Dennis asks/wants/tells you" → "when the caller asks/wants/tells you"
      const subject = new RegExp(`\\b(when|if|that|so) ${escapeRegExp(t)} (asks|wants|tells|uses|shares|opens|provides)`, 'gi');
      updatedPrompt = updatedPrompt.replace(subject, '$1 the caller $2');
    }

    // ── 4. Baked example values carrying the owner's FULL email are handled by step 5 below
//    (source-template shapes). A blanket replaceAll on short tokens is dangerous: replacing
//    "dennis" would corrupt "mcmdennis@gmail.com" into garbage. Nothing else here needs it.

// ── 5. The typed-input example in the source template may carry a real address that is NOT
//    the owner's registered email (so a token sweep cannot see it). Neutralise the literal
//    known example shape regardless of its value.
    const typedExample = updatedPrompt.match(/say[^—\n]{0,60}landed[^"\n]{0,20}[“"]([^“"”]+@[^“"”]+)[”"]/);
    if (typedExample?.[1]) {
      updatedPrompt = updatedPrompt.replace(typedExample[1], 'you@yourcompany.com');
      applied.push(`typed-input example value`);
    }

    // ── 6. First message — any person name in it.
    for (const t of tokens) {
      if (updatedFirst.includes(t)) {
        updatedFirst = 'Hey — good to hear from you. Let me see where we got to.';
        applied.push('first_message name');
        break;
      }
    }

    if (applied.length === 0) {
      console.log(`  = ${a.agent_name} — none of the broader patterns matched`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  ~ ${a.agent_name} (${id}) — would apply: ${applied.join('; ')}`);
      patched++;
      continue;
    }

    // PATCH the agent — preserve every other piece of config. The GET snapshot echoes BOTH the
    // deprecated inline `tools` array and `tool_ids`; ElevenLabs rejects the PATCH if both are
    // present ("Cannot specify both tools and tool IDs"). Send the `tool_ids` form only.
    const { tools: _inlineTools, ...promptToSend } = promptCfg;

    const body = {
      conversation_config: {
        agent: {
          ...agentCfg,
          first_message: updatedFirst,
          prompt: { ...promptToSend, prompt: updatedPrompt },
        },
      },
    };

    const patchRes = await fetch(`${AGENTS_API}/${id}`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!patchRes.ok) throw new Error(`${patchRes.status} ${await patchRes.text()}`);

    console.log(`  ✓ ${a.agent_name} (${id}) — applied: ${applied.join('; ')}`);
    patched++;
  } catch (e) {
    console.error(`  ✗ ${a.agent_name} (${id}): ${e?.message ?? e}`);
    failed++;
  }
}

console.log(`\nDone. ${patched} patched, ${skipped} skipped, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;