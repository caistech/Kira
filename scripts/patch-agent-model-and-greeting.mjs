// scripts/patch-agent-model-and-greeting.mjs
// Brings EXISTING Kira agents onto two fixes that new agents now get at creation:
//
//   1. LLM -> DEFAULT_AGENT_LLM (gpt-4.1-mini). The hub pins this because gpt-4o-mini DROPS TOOL
//      CALLS as a conversation runs long — which silently disables the entire memory loop with no
//      error anywhere. Agents minted before this fix are all on gpt-4o-mini.
//
//   2. first_message -> a neutral opener. The old greeting baked the SIGNUP objective into a
//      frozen string ("I know you're working on how to travel around australia") that an agent then
//      repeated for six months while the user's real focus had moved on. Recall belongs to the
//      agent (which PULLS it via get_conversation_context), never to a frozen string.
//
//   3. Appends a marker-guarded CURRENT FOCUS block telling the agent that the objective written
//      into its system prompt is a stale signup snapshot and that pulled context wins. Existing
//      agents have the stale objective baked into their prompt; this neutralises it without a
//      risky prompt rewrite.
//
// Idempotent — an agent already on the target model/greeting/marker is left alone.
//
// Usage (from repo root):
//   node --env-file=.env.local scripts/patch-agent-model-and-greeting.mjs [--dry-run]

import { createClient } from '@supabase/supabase-js';
import { DEFAULT_AGENT_LLM } from '@caistech/elevenlabs-convai';
import { SESSION_FOCUS, SESSION_FOCUS_MARKER } from '../lib/kira/session-focus.mjs';

const {
  ELEVENLABS_API_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  DISCOVERY_AGENT_ID,
} = process.env;

const DRY_RUN = process.argv.includes('--dry-run');
const AGENTS_API = 'https://api.elevenlabs.io/v1/convai/agents';
const STALE_MARKER = '## CURRENT FOCUS BEATS THE SIGNUP SNAPSHOT';

// The stale-objective guard (kept) PLUS the shared session-focus rules (single-sourced from
// lib/kira/session-focus.mjs, identical to what new agents get at creation).
const FOCUS_BLOCK = `${STALE_MARKER}

Any objective written into this prompt was captured when the account was created and has NEVER been
refreshed. It is frequently months out of date and is NOT what the person is working on today.

- Treat what \`get_conversation_context\` and \`recall_memory\` return as the ONLY authoritative
  statement of their current focus.
- NEVER open a conversation by asserting the recorded objective as if it were current.
- If the pulled context and the recorded objective disagree, the pulled context wins — silently.
  Do not narrate the discrepancy or apologise for it; just talk about what they're actually doing.

${SESSION_FOCUS}`;

if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing (run: vercel env pull .env.local --environment=production)');
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('Supabase env missing');

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY);
const auth = { 'xi-api-key': ELEVENLABS_API_KEY };

// EXCLUDE the shared discovery agent — it is not an operational Kira and has its own persona,
// greeting and tool routing (mirrors the exclusion in reprovision-kira-agents.mjs).
let query = supabase
  .from('kira_agents')
  .select('id, elevenlabs_agent_id, agent_name, status, framework')
  .in('status', ['active', 'paused'])
  .neq('agent_name', 'Kira Discovery');
if (DISCOVERY_AGENT_ID) query = query.neq('elevenlabs_agent_id', DISCOVERY_AGENT_ID);

const { data: agents, error } = await query;
if (error) throw error;

console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Patching ${agents.length} agent(s) → llm=${DEFAULT_AGENT_LLM}\n`);

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
    const currentLlm = promptCfg.llm;
    const currentPrompt = promptCfg.prompt || '';
    const currentFirst = agentCfg.first_message || '';

    // Derive the neutral greeting from the stored framework (same shape as getFirstMessage()).
    const firstName =
      a.framework?.firstName || String(a.framework?.userName || '').split(' ')[0] || 'there';
    const targetFirst = `Hey ${firstName} — good to hear from you. Let me see where we got to.`;

    const needsLlm = currentLlm !== DEFAULT_AGENT_LLM;
    const needsFirst = currentFirst !== targetFirst;
    // Needs the block if EITHER marker is absent — so agents patched with the earlier, weaker
    // stale-objective-only block get topped up with the session-focus rules on the next run.
    const needsFocus =
      !currentPrompt.includes(STALE_MARKER) || !currentPrompt.includes(SESSION_FOCUS_MARKER);

    if (!needsLlm && !needsFirst && !needsFocus) {
      console.log(`  = ${a.agent_name} — already correct`);
      skipped++;
      continue;
    }

    const changes = [
      needsLlm ? `llm ${currentLlm} → ${DEFAULT_AGENT_LLM}` : null,
      needsFirst ? 'first_message → neutral' : null,
      needsFocus ? '+CURRENT FOCUS block' : null,
    ].filter(Boolean).join(', ');

    if (DRY_RUN) {
      console.log(`  ~ ${a.agent_name} (${id}) — ${changes}`);
      patched++;
      continue;
    }

    // PATCH only the fields we are changing. Spread the live prompt object so tool_ids and every
    // other field survive — replacing the prompt object wholesale would drop the tool attachments
    // and re-break the memory loop we just fixed.
    //
    // GOTCHA: a GET returns BOTH the deprecated inline `tools` array AND `tool_ids`, but a PATCH
    // rejects the pair with 400 both_tools_and_tool_ids_provided. So drop the deprecated `tools`
    // key whenever tool_ids is present — the same trap @caistech/elevenlabs-convai fixed in v0.4.5.
    const { tools: _deprecatedInlineTools, ...promptRest } = promptCfg;
    const nextPrompt = {
      ...(promptCfg.tool_ids?.length ? promptRest : promptCfg),
      llm: DEFAULT_AGENT_LLM,
      // Strip any previously-appended block before re-appending, so re-running (e.g. to top up an
      // agent that only got the earlier stale-objective-only version) REPLACES it rather than
      // stacking a second copy. The block is always appended last, so cutting from its marker to
      // the end is exact.
      prompt: needsFocus
        ? `${
            currentPrompt.includes(STALE_MARKER)
              ? currentPrompt.slice(0, currentPrompt.indexOf(STALE_MARKER)).replace(/\s+$/, '')
              : currentPrompt
          }\n\n${FOCUS_BLOCK}`
        : currentPrompt,
    };

    const body = {
      conversation_config: {
        agent: {
          ...agentCfg,
          first_message: targetFirst,
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

    console.log(`  ✓ ${a.agent_name} (${id}) — ${changes}`);
    patched++;
  } catch (e) {
    console.error(`  ✗ ${a.agent_name} (${id}): ${e?.message ?? e}`);
    failed++;
  }
}

console.log(`\nDone. ${patched} patched, ${skipped} already correct/skipped, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
