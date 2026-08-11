// Write a live agent's system prompt, preserving everything else, and PROVE it landed.
//
// WHY THIS EXISTS — a silent no-op that shipped and was reported as applied.
//
// `updateAgent(apiKey, agentId, options)` takes FLAT options: `systemPrompt`, `llmModel`,
// `temperature`, `firstMessage`, `voiceId`. Two scripts called it with a raw ElevenLabs body:
//
//     updateAgent(apiKey, id, { conversation_config: { agent: { prompt: { prompt: next } } } })
//
// `options.systemPrompt` is then undefined, the agent patch is built empty, `conversation_config` is
// never set, and it PATCHes `{}` — HTTP 200, nothing changed. It looks exactly like success.
//
// Measured 2026-08-11: `patch-agent-tool-inventory.mjs` ran that morning and reported "10 prompts
// patched". Ten live prompts still named `save_message` and `update_conversation_topic` — two tools
// that HAD been removed from the agents. So every owner's agent was asserting it held two tools it
// did not, which is the precise failure that patch was written to prevent, and it was live for a day.
// Nothing caught it because neither script read back, and `verify-agent-fleet.mjs` checks sections
// and tool COUNTS — not the sentence that names them.
//
// ⚠️ THE CORRECT CALL HAS ITS OWN TRAP. Passing `systemPrompt` alone makes the package fill in
// `llm: DEFAULT_AGENT_LLM` and `temperature: 0.7`, silently resetting whatever that agent was set to.
// So the current values are read first and passed back explicitly. A prompt patch must change the
// prompt and nothing else.
//
// READ-BACK IS NOT OPTIONAL HERE. A 200 is not evidence — that is the whole reason this file exists.

import { getAgent, updateAgent } from '@caistech/elevenlabs-convai';

/**
 * @returns {Promise<{ ok: true, before: number, after: number } | { ok: false, reason: string }>}
 */
export async function writePromptAndVerify(apiKey, agentId, nextPrompt, { mustContain } = {}) {
  const current = await getAgent(apiKey, agentId);
  const agentCfg = current?.conversation_config?.agent ?? {};
  const before = agentCfg?.prompt?.prompt ?? '';

  if (!before) return { ok: false, reason: 'could not read the current prompt' };
  if (nextPrompt === before) return { ok: false, reason: 'no change to write' };

  await updateAgent(apiKey, agentId, {
    systemPrompt: nextPrompt,
    // Preserved, not defaulted. Omitting these resets the model and temperature.
    llmModel: agentCfg?.prompt?.llm,
    temperature: agentCfg?.prompt?.temperature,
  });

  const after = (await getAgent(apiKey, agentId))?.conversation_config?.agent?.prompt?.prompt ?? '';
  if (after !== nextPrompt) {
    return { ok: false, reason: `live prompt does not match what was sent (${before.length} → ${after.length}, expected ${nextPrompt.length})` };
  }
  if (mustContain && !after.includes(mustContain)) {
    return { ok: false, reason: `live prompt is missing ${JSON.stringify(mustContain)}` };
  }
  return { ok: true, before: before.length, after: after.length };
}
