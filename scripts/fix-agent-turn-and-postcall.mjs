// scripts/fix-agent-turn-and-postcall.mjs
//
// Repair two silent defects on LIVE Kira agents, then read every agent back.
//
//   1. turn.turn_timeout — ElevenLabs re-engages after N seconds of user silence ("are you still
//      there?"). The 2026-09-30 sweep set turn_eagerness and left this at 7. Target: the shared
//      value in lib/kira/turn-config.ts (-1, never re-engage).
//   2. post-call webhook binding — agents provisioned with the concurrent bind/allowlist race have
//      post_call_webhook_id null, so no call they take is ever recorded or distilled.
//
// DRY RUN BY DEFAULT. Pass --apply to write. The whole `turn` object is sent back (never a partial
// PATCH), because a partial PATCH can reset sibling turn fields to their defaults.
//
// Usage:
//   node --env-file=.env.local scripts/fix-agent-turn-and-postcall.mjs agent_a agent_b ... [--apply]

import { bindWorkspaceWebhook, getAgent } from '@caistech/elevenlabs-convai';

const API_KEY = process.env.ELEVENLABS_API_KEY;
const POST_CALL_URL = 'https://kiraexec.com/api/kira/webhooks/post-call';
const TARGET_TURN_TIMEOUT = -1;
const apply = process.argv.includes('--apply');
const agentIds = process.argv.slice(2).filter((arg) => arg.startsWith('agent_'));

if (!API_KEY) throw new Error('ELEVENLABS_API_KEY missing — run with --env-file=.env.local');
if (!agentIds.length) throw new Error('Pass one or more agent_… ids');

async function patchAgent(agentId, body) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    method: 'PATCH',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`PATCH ${agentId} → ${response.status} ${await response.text()}`);
}

function describe(agent) {
  return {
    turnTimeout: agent?.conversation_config?.turn?.turn_timeout,
    eagerness: agent?.conversation_config?.turn?.turn_eagerness,
    postCall: agent?.platform_settings?.workspace_overrides?.webhooks?.post_call_webhook_id ?? null,
    toolCount: (agent?.conversation_config?.agent?.prompt?.tool_ids ?? []).length,
  };
}

console.log(apply ? 'APPLYING' : 'DRY RUN (pass --apply to write)');
let failures = 0;

for (const agentId of agentIds) {
  try {
    const before = await getAgent(API_KEY, agentId);
    const was = describe(before);
    const needsTurn = was.turnTimeout !== TARGET_TURN_TIMEOUT || was.eagerness !== 'patient';
    const needsBind = !was.postCall;

    if (apply && needsTurn) {
      const turn = { ...before.conversation_config.turn, turn_timeout: TARGET_TURN_TIMEOUT, turn_eagerness: 'patient' };
      await patchAgent(agentId, { conversation_config: { turn } });
    }
    if (apply && needsBind) {
      await bindWorkspaceWebhook(API_KEY, agentId, { name: 'Kira post-call', url: POST_CALL_URL });
    }

    const now = apply ? describe(await getAgent(API_KEY, agentId)) : was;
    const ok = now.turnTimeout === TARGET_TURN_TIMEOUT && now.eagerness === 'patient' && Boolean(now.postCall);
    if (apply && !ok) failures += 1;
    console.log(
      `${agentId}  before: timeout=${was.turnTimeout} post_call=${was.postCall ?? 'NULL'} tools=${was.toolCount}`
        + `  →  ${apply ? 'after' : 'would fix'}: ${needsTurn ? 'turn ' : ''}${needsBind ? 'bind ' : ''}`
        + (apply ? `  read-back: timeout=${now.turnTimeout} eagerness=${now.eagerness} post_call=${now.postCall ?? 'NULL'} tools=${now.toolCount} ${ok ? 'OK' : 'FAILED'}` : ''),
    );
  } catch (error) {
    failures += 1;
    // "fetch failed" alone says nothing — the network reason is on error.cause.
    const cause = error instanceof Error && error.cause ? ` (cause: ${error.cause.code ?? ''} ${error.cause.message ?? error.cause})` : '';
    console.error(`${agentId}  ERROR: ${error instanceof Error ? error.message : error}${cause}`);
  }
}

if (failures) {
  console.error(`${failures} agent(s) not verified`);
  process.exit(1);
}
