// scripts/patch-tool-system-vars.mjs
//
// THE FIX for "the agent calls the tool but memory/knowledge still don't work."
//
// The conversation/memory/knowledge tools shipped with their id parameters (conversation_id,
// elevenlabs_conversation_id, elevenlabs_agent_id) LLM-FILLED (is_system_provided=false, no
// dynamic_variable). The model cannot know the real ElevenLabs conversation id, so it passed
// garbage, the webhook could not bind the conversation, and every tool returned "first chat" /
// "conversation not found" — even though the agent DID call the tool and the webhook works when
// given the right id (which is why the direct-call E2E test passed while live voice calls failed).
//
// Fix: bind those id params to ElevenLabs SYSTEM DYNAMIC VARIABLES (system__conversation_id,
// system__agent_id), which ElevenLabs auto-populates for every channel (web/WebRTC/widget included;
// only caller_id/called_number are voice-only) and injects into the webhook body. Documented
// mechanism; confirmed the API requires them once bound.
//
// Workspace tools are SHARED across all Kira agents (ensureWorkspaceTools reuses by name+url and
// never overwrites config), so patching them once fixes every agent — existing and future.
//
// Usage: node --env-file=.env.local scripts/patch-tool-system-vars.mjs [--dry-run]

const { ELEVENLABS_API_KEY, NEXT_PUBLIC_APP_URL } = process.env;
const DRY = process.argv.includes('--dry-run');
if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing');

const H = { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' };
const appHost = new URL(NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app').host;

// Which param name maps to which system variable.
const SYS = {
  conversation_id: 'system__conversation_id',
  elevenlabs_conversation_id: 'system__conversation_id',
  elevenlabs_agent_id: 'system__agent_id',
};

// A param bound to a system variable must set ONLY dynamic_variable among the mutually-exclusive
// group {description, dynamic_variable, is_system_provided, constant_value, is_omitted} (API 422s
// otherwise), so clear the others.
function bindSystem(prop, varName) {
  prop.dynamic_variable = varName;
  prop.description = '';
  prop.is_system_provided = false;
  prop.constant_value = '';
  prop.is_omitted = false;
  prop.enum = null;
}

const list = await (await fetch('https://api.elevenlabs.io/v1/convai/tools', { headers: H })).json();
const tools = (list.tools || []).filter((t) => {
  const url = t.tool_config?.api_schema?.url || '';
  try { return url.includes('/api/kira/webhooks/') && new URL(url).host === appHost; }
  catch { return false; }
});

console.log(`${tools.length} Kira workspace tool(s) on ${appHost}\n`);
let patched = 0, already = 0, failed = 0;

for (const t of tools) {
  const cfg = t.tool_config;
  const props = cfg.api_schema?.request_body_schema?.properties || {};
  const toBind = Object.keys(props).filter((name) => SYS[name] && props[name].dynamic_variable !== SYS[name]);
  if (toBind.length === 0) { console.log(`  = ${cfg.name} — already bound`); already++; continue; }

  for (const name of toBind) bindSystem(props[name], SYS[name]);

  if (DRY) { console.log(`  ~ ${cfg.name} — would bind ${toBind.join(', ')}`); patched++; continue; }
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${t.id}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ tool_config: cfg }),
    });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
    console.log(`  ✓ ${cfg.name} — bound ${toBind.join(', ')} → system vars`);
    patched++;
  } catch (e) { console.error(`  ✗ ${cfg.name}: ${e.message}`); failed++; }
}

console.log(`\nDone. ${patched} patched, ${already} already bound, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
