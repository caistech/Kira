// scripts/provision-landing-agent.mjs
// The PUBLIC landing agent — idempotent create-or-update.
//
// WHY IT EXISTS. The landing page was pointed at the SETUP agent, whose prompt says "You are NOT a
// coach, advisor, or problem-solver. You're an intake form with a friendly voice" and whose hard
// rules include "Don't explore their problem deeper". The page above it invites exactly the
// conversation that agent is instructed to refuse. And its first_message was EMPTY, so it connected
// and waited — nothing was ever spoken, which reads as a broken widget.
//
// IDEMPOTENT BY AGENT ID (KIRA_LANDING_AGENT_ID). Re-running UPDATES the live agent rather than
// minting a second one. Provisioning that creates on every run leaves a workspace full of
// near-identical agents and no way to tell which one production points at — which happened twice
// here before the id-keyed version existed. See the note below.
//
//   node --env-file=.env.local scripts/provision-landing-agent.mjs             # dry run
//   node --env-file=.env.local scripts/provision-landing-agent.mjs --apply

import { createAgent, updateAgent, getAgent, DEFAULT_AGENT_LLM } from '@caistech/elevenlabs-convai';

import {
  LANDING_AGENT_NAME,
  LANDING_FIRST_MESSAGE,
  LANDING_PROMPT,
  LANDING_VOICE_ID,
} from '../lib/kira/landing-agent.mjs';

const APPLY = process.argv.includes('--apply');
const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY missing (vercel env pull .env.local --environment=production)');

// KEYED ON THE ENV VAR, NOT ON A NAME SEARCH — and that correction is the whole reason this comment
// exists. The first version used `findAgentsByName`, which filters a page-capped list: the workspace
// has more than 100 agents, so a freshly created one is not in the page and the lookup returns
// nothing. Every run then CREATED, which is precisely the duplication the note above warns about.
// It duplicated twice before anyone noticed, because `createAgent` also silently ignored the name
// (the field is `agentName`, not `name`) so both agents came out called "Agent agent" and neither
// could ever be found by name again.
//
// An id from the environment is deterministic and cannot be defeated by pagination or by a naming
// bug. Same shape as scripts/provision-discovery-agent.mjs, which already got this right.
const current = process.env.KIRA_LANDING_AGENT_ID || null;

console.log(`[landing-agent] ${APPLY ? 'APPLY' : 'DRY RUN'}`);
console.log(`  name          : ${LANDING_AGENT_NAME}`);
console.log(`  existing      : ${current ?? '(none — will create)'}`);
console.log(`  prompt        : ${LANDING_PROMPT.length} chars`);
console.log(`  first message : ${LANDING_FIRST_MESSAGE.slice(0, 72)}…`);
console.log(`  voice / llm   : ${LANDING_VOICE_ID} / ${DEFAULT_AGENT_LLM}`);
// NO TOOLS is the point, not an omission: the page promises nothing is saved, and an agent that
// CANNOT save is a stronger guarantee than one told not to.
console.log('  tools         : none (deliberate — see lib/kira/landing-agent.mjs)');

if (current) {
  const live = await getAgent(apiKey, current);
  const p = live?.conversation_config?.agent ?? {};
  console.log(`  live first_msg: ${JSON.stringify(String(p.first_message ?? '')).slice(0, 60)}`);
  console.log(`  live prompt   : ${String(p.prompt?.prompt ?? '').length} chars`);
}

if (!APPLY) {
  console.log('\n[landing-agent] dry run — re-run with --apply');
  process.exit(0);
}

const config = {
  // `agentName`, NOT `name`. The package's ConvAIAgentConfig uses agentName, and passing `name`
  // is silently ignored — which is how two agents ended up called "Agent agent".
  agentName: LANDING_AGENT_NAME,
  voiceId: LANDING_VOICE_ID,
  // A public page. Someone will leave the tab open, and an agent that talks to nobody for an hour
  // is a bill rather than a conversation.
  maxDurationSeconds: 600,
};

let agentId;
if (current) {
  await updateAgent(apiKey, current, {
    name: LANDING_AGENT_NAME,
    agentName: LANDING_AGENT_NAME,
    systemPrompt: LANDING_PROMPT,
    firstMessage: LANDING_FIRST_MESSAGE,
    voiceId: LANDING_VOICE_ID,
  });
  agentId = current;
  console.log(`\n[landing-agent] updated ${agentId}`);
} else {
  const created = await createAgent(apiKey, {
    config,
    systemPrompt: LANDING_PROMPT,
    firstMessage: LANDING_FIRST_MESSAGE,
    language: 'en',
    tools: [],
    maxDurationSeconds: 600,
  });
  agentId = created.agentId;
  console.log(`\n[landing-agent] created ${agentId}`);
}

// READ IT BACK. A 200 from the update is a report; this is the effect — and the specific thing that
// was wrong here was an EMPTY first_message, which no status code would have revealed.
const after = await getAgent(apiKey, agentId);
const a = after?.conversation_config?.agent ?? {};
const spoken = String(a.first_message ?? '');
console.log(`  verified first_message : ${spoken ? `"${spoken.slice(0, 60)}…"` : 'EMPTY — SHE WILL NOT SPEAK'}`);
console.log(`  verified prompt chars  : ${String(a.prompt?.prompt ?? '').length}`);
console.log(`  verified tools         : ${(a.prompt?.tools ?? []).length}`);
// VERIFY THE NAME TOO. A wrong name is not cosmetic here — it is what made the agent unfindable and
// caused the duplication, and it produced no error at any point.
console.log(`  verified name          : ${JSON.stringify(after?.name ?? '')}`);
if (!spoken) {
  console.error('  ✗ first_message is EMPTY — she will connect and say nothing.');
  process.exitCode = 1;
}

console.log(`\nSet this in Vercel (production + preview):\n  KIRA_LANDING_AGENT_ID=${agentId}`);
