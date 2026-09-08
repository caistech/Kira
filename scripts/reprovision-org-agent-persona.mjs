#!/usr/bin/env node
// scripts/reprovision-org-agent-persona.mjs
// Re-provisions the shared org agent so its persona is ORG-scoped, not PERSON-scoped.
//
// Problem: the agent was provisioned with the owner's personal name (Dennis) in the system prompt
// and first_message. When an org member talks to it, the agent says "You are Dennis's fractional
// executive" — wrong identity for a shared org agent.
//
// Fix: replace person-specific references in the live ElevenLabs prompt with org-neutral language.
// The per-caller greeting (client-side) already uses the canonical caller name.
//
// Usage (from repo root):
//   node --env-file=.env.local scripts/reprovision-org-agent-persona.mjs [--dry-run]
//
// Idempotent: agents already updated are skipped.

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

// Fetch active agents with a framework that references a person name (not org)
const { data: agents, error } = await supabase
  .from('kira_agents')
  .select('id, elevenlabs_agent_id, agent_name, status, framework, organisation_id')
  .in('status', ['active', 'paused'])
  .neq('agent_name', 'Kira Discovery');

if (error) throw error;

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

    // The person name from the framework (e.g. "Dennis")
    const personName = a.framework?.firstName
      || String(a.framework?.userName || '').split(' ')[0]
      || '';

    if (!personName || personName === 'there') {
      console.log(`  = ${a.agent_name} — no person name in framework, skipping`);
      skipped++;
      continue;
    }

    // Check if the prompt contains person-specific references that need org-scoping
    const hasPersonRef = currentPrompt.includes(personName)
      || currentPrompt.includes(`${personName}'s fractional executive`)
      || currentPrompt.includes(`back-office for ${personName}`)
      || currentPrompt.includes(`WHAT YOU KNOW ABOUT ${personName.toUpperCase()}`)
      || currentPrompt.includes(`**Name:** ${a.framework?.userName || personName}`);

    if (!hasPersonRef) {
      console.log(`  = ${a.agent_name} — already org-scoped (no "${personName}" refs)`);
      skipped++;
      continue;
    }

    const orgLabel = 'this business';
    const userName = a.framework?.userName || personName;

    // Build replacement map: person-specific → org-neutral
    // System prompt references
    const replacements = [
      // The core persona line
      [`You are Kira — ${personName}'s fractional executive.`, `You are Kira — the fractional executive for this business.`],
      [`You run the back-office for ${personName}`, `You run the back-office for this business`],
      // WHO YOU KNOW section
      [`## WHAT YOU KNOW ABOUT ${personName.toUpperCase()}`, `## WHAT YOU KNOW ABOUT THIS BUSINESS`],
      [`**Name:** ${userName}`, `**Name:** ${userName} (the business owner)`],
      // Greeting instruction
      [`- Greet ${personName} by first name.`, `- Greet the caller by their own first name.`],
      // Generic person references in instructions (be conservative — only exact phrasing from prompts.ts)
      [`${personName} hasn't shared any documents`, `The business owner hasn't shared any documents`],
      [`when ${personName} asks you to actually DO something`, `when the caller asks you to actually DO something`],
      [`search ${personName}'s own Google Drive`, `search the business's Google Drive`],
      // First message (neutral greeting — the client-side override handles the caller's name)
      [`Hey ${personName} — good to hear from you. Let me see where we got to.`, `Hey — good to hear from you. Let me see where we got to.`],
    ];

    let updatedPrompt = currentPrompt;
    let updatedFirst = currentFirst;
    let changeCount = 0;

    for (const [from, to] of replacements) {
      if (updatedPrompt.includes(from)) {
        updatedPrompt = updatedPrompt.replaceAll(from, to);
        changeCount++;
      }
    }

    // Also fix the first message if it still references the person
    if (updatedFirst.includes(personName)) {
      updatedFirst = `Hey — good to hear from you. Let me see where we got to.`;
      changeCount++;
    }

    if (changeCount === 0) {
      console.log(`  = ${a.agent_name} — no changes needed after inspection`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  ~ ${a.agent_name} (${id}) — would apply ${changeCount} replacement(s)`);
      patched++;
      continue;
    }

    // PATCH the agent — preserve tool_ids and all other config
    const { tools: _deprecatedInlineTools, ...promptRest } = promptCfg;
    const nextPrompt = {
      ...(promptCfg.tool_ids?.length ? promptRest : promptCfg),
      prompt: updatedPrompt,
    };

    const body = {
      conversation_config: {
        agent: {
          ...agentCfg,
          first_message: updatedFirst,
          prompt: nextPrompt,
        },
      },
    };

    const patchRes = await fetch(`${AGENTS_API}/${id}`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!patchRes.ok) throw new Error(`${patchRes.status} ${await patchRes.text()}`);

    console.log(`  ✓ ${a.agent_name} (${id}) — ${changeCount} replacement(s) applied`);
    patched++;
  } catch (e) {
    console.error(`  ✗ ${a.agent_name} (${id}): ${e?.message ?? e}`);
    failed++;
  }
}

console.log(`\nDone. ${patched} patched, ${skipped} skipped, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
