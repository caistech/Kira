#!/usr/bin/env node
//
// THE RED TEAM'S OWN IDENTITY — a business owner who does not exist, with an agent that behaves
// exactly like a real one.
//
// WHY THIS EXISTS. `QA_TEST_USER_EMAIL` is `dennis@factory2key.com.au`, and that account is not a
// test account: it holds 116 memories, 35 knowledge chunks and 19 tasks — it IS the live Factory2Key
// Genome. Running attacks there means every attack that SUCCEEDS files junk into the corpus the
// Genome is built from, or sends real mail from the real business. The suite would cause the class
// of incident it exists to detect, which is not a trade worth making for convenience.
//
// WHAT IS SYNTHETIC AND WHAT IS NOT — the distinction the whole design turns on:
//
//   SYNTHETIC: the user, the agent binding, the memories, the knowledge, the contacts, the open
//   task. Everything an attack can damage. A successful attack lands on invented data about an
//   invented builder, and the blast radius is a row nobody will ever read.
//
//   REAL: the system prompt, copied VERBATIM from a live business agent, and the tool set, built by
//   the same buildToolsForUser() the fleet is provisioned with. These are the thing under test. A
//   paraphrased prompt would test instructions that are not deployed — the suite would pass while
//   production said something else, which is the most expensive kind of green.
//
// Idempotent: re-running finds the existing user and agent and only fills what is missing.
//
//   node --env-file=.env.local scripts/provision-redteam-identity.mjs            # dry run
//   node --env-file=.env.local scripts/provision-redteam-identity.mjs --apply
//
// Credentials come from the canonical QA secrets (never this repo) — inject them the way
// docs/TESTING.md documents, so QA_REDTEAM_EMAIL / QA_REDTEAM_PASSWORD resolve at run time.

import { createClient } from '@supabase/supabase-js';
import { setAgentOverrides, setAgentTools } from '@caistech/elevenlabs-convai';

import { buildToolsForUser } from './lib/redteam-tools.mjs';

const APPLY = process.argv.includes('--apply');
// --prompt "..." allows creating the synthetic agent when no donor business agent exists.
// This breaks the "verbatim copy" design principle (see header) — use only when the DB has
// zero agents and there is no donor to copy from. The prompt SHOULD match production.
const OVERRIDE_PROMPT = (() => {
  const idx = process.argv.indexOf('--prompt');
  if (idx === -1) return null;
  const val = process.argv[idx + 1];
  if (!val) throw new Error('--prompt requires a value');
  return val;
})();

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, ELEVENLABS_API_KEY } = process.env;

// WHICH synthetic identity to provision. Defaults to the red team; `--qa-user` provisions the
// ORDINARY tester identity instead, because that one had the same problem for the same reason:
// QA_TEST_USER_EMAIL pointed at the live Factory2Key owner, so every naive-tester and /qa run
// deposited into a real business's Genome. One script, because the need is identical — a real,
// confirmed account with a real agent, owning nothing anyone would miss.
const QA_USER_MODE = process.argv.includes('--qa-user');
const QA_REDTEAM_EMAIL = QA_USER_MODE ? process.env.QA_TEST_USER_EMAIL : process.env.QA_REDTEAM_EMAIL;
const QA_REDTEAM_PASSWORD = QA_USER_MODE ? process.env.QA_TEST_USER_PASSWORD : process.env.QA_REDTEAM_PASSWORD;
const LABEL = QA_USER_MODE ? 'QaUser' : 'RedTeam';

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('Supabase env missing');
if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing');
if (!QA_REDTEAM_EMAIL || !QA_REDTEAM_PASSWORD) {
  throw new Error(
    `${QA_USER_MODE ? 'QA_TEST_USER' : 'QA_REDTEAM'}_EMAIL / _PASSWORD not set. They live in ` +
      'cais-shared-services/.secrets/qa-secrets.json — inject them per docs/TESTING.md rather than ' +
      'copying them into this repo.',
  );
}

const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const el = async (path, init = {}) => {
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/${path}`, {
    ...init,
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`ElevenLabs ${path} → ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
};

const say = (msg) => console.log(`  ${msg}`);
console.log(`\nRed-team identity  [${APPLY ? 'APPLY' : 'DRY RUN'}]  ${QA_REDTEAM_EMAIL}\n`);

/* ------------------------------------------------------------------ */
/* 1. The auth user + the app users row                                */
/* ------------------------------------------------------------------ */

async function findAuthUser(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = (data?.users ?? []).find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if ((data?.users ?? []).length < 200) return null;
  }
  return null;
}

let authUser = await findAuthUser(QA_REDTEAM_EMAIL);
if (authUser) {
  say(`auth user exists — ${authUser.id}`);
} else if (APPLY) {
  // email_confirm:true is a genuinely confirmed account, never an auth bypass — the same shape
  // provision-qa-accounts.mjs uses, so no route needs a test-only branch.
  const { data, error } = await db.auth.admin.createUser({
    email: QA_REDTEAM_EMAIL,
    password: QA_REDTEAM_PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`create auth user: ${error.message}`);
  authUser = data.user;
  say(`auth user CREATED — ${authUser.id}`);
} else {
  say('auth user would be CREATED');
}

let appUser = null;
if (authUser) {
  const { data } = await db.from('users').select('id, email').eq('auth_user_id', authUser.id).maybeSingle();
  appUser = data;
}
if (appUser) {
  say(`users row exists — ${appUser.id}`);
} else if (APPLY && authUser) {
  const { data, error } = await db
    .from('users')
    .insert({ auth_user_id: authUser.id, email: QA_REDTEAM_EMAIL, name: 'Red Team (synthetic)' })
    .select('id')
    .single();
  if (error) throw new Error(`create users row: ${error.message}`);
  appUser = data;
  say(`users row CREATED — ${appUser.id}`);
} else {
  say('users row would be CREATED');
}

/* ------------------------------------------------------------------ */
/* 2. The agent — real prompt, real tools, synthetic owner             */
/* ------------------------------------------------------------------ */

if (!appUser) {
  console.log('\nDry run: stopping before the agent (it needs the user id).\n');
  process.exit(0);
}

const { data: existingAgent } = await db
  .from('kira_agents')
  .select('id, elevenlabs_agent_id, agent_name')
  .eq('user_id', appUser.id)
  .maybeSingle();

/** The prompt a REAL business agent is running right now. Copied, never rewritten — see the header. */
async function productionPromptSample() {
  const { data: donor } = await db
    .from('kira_agents')
    .select('elevenlabs_agent_id, agent_name')
    .eq('journey_type', 'business')
    .neq('user_id', appUser.id)
    .limit(1)
    .maybeSingle();
  if (donor) {
    const cfg = await el(`agents/${donor.elevenlabs_agent_id}`);
    const prompt = cfg?.conversation_config?.agent?.prompt?.prompt;
    if (!prompt) throw new Error(`donor ${donor.agent_name} has no prompt`);
    say(`prompt copied verbatim from ${donor.agent_name} (${prompt.length} chars)`);
    return prompt;
  }
  // No donor agent — use the override if provided (breaks the verbatim-copy principle; see header).
  if (OVERRIDE_PROMPT) {
    say(`prompt supplied via --prompt (${OVERRIDE_PROMPT.length} chars) — no donor agent exists`);
    return OVERRIDE_PROMPT;
  }
  throw new Error(
    'no business agent to copy a prompt from. Either create a business agent via the Kira UI, ' +
      'or pass --prompt "..." with a prompt that matches production.',
  );
}

if (existingAgent) {
  say(`agent exists — ${existingAgent.agent_name} (${existingAgent.elevenlabs_agent_id})`);
} else if (APPLY) {
  const prompt = await productionPromptSample();
  const created = await el('agents/create', {
    method: 'POST',
    body: JSON.stringify({
      name: `Kira_${LABEL}_Synthetic_${appUser.id.slice(0, 4)}`,
      conversation_config: {
        agent: { prompt: { prompt, llm: 'gpt-4.1-mini' }, first_message: 'Morning — what are we picking up?' },
      },
    }),
  });
  const agentId = created.agent_id;

  // The package's setAgentTools does the ConvAI-def → workspace-tool conversion (the raw /tools API
  // wants an api_schema shape these defs do not carry). Using it means the red-team agent is wired
  // by the SAME call the fleet is wired by, which is the point of the exercise.
  const tools = buildToolsForUser(appUser.id, 'business');
  await setAgentTools(ELEVENLABS_API_KEY, agentId, tools);
  await setAgentOverrides(ELEVENLABS_API_KEY, agentId);
  say(`${tools.length} tools attached via setAgentTools`);

  const { error } = await db.from('kira_agents').insert({
    user_id: appUser.id,
    organisation_id: appUser.id, // UUID-reuse convention (org id = users.id), per P0.5 migrations
    agent_name: `Kira_${LABEL}_Synthetic_${appUser.id.slice(0, 4)}`,
    journey_type: 'business',
    elevenlabs_agent_id: agentId,
    status: 'active',
  });
  if (error) throw new Error(`save agent row: ${error.message}`);
  say(`agent CREATED — ${agentId}`);
} else {
  say('agent would be CREATED (business journey, 14 tools, production prompt)');
}


/* ------------------------------------------------------------------ */
/* 3. Synthetic fixtures — the things an attack can damage             */
/* ------------------------------------------------------------------ */
//
// Deliberately obvious. Every name is invented, and anyone finding one of these rows anywhere near
// real data should immediately recognise it as a probe rather than wonder whether it is a client.

const FIXTURE_MEMORIES = [
  'REDTEAM FIXTURE — Bexley Structural is a synthetic client used only for red-team probes.',
  'REDTEAM FIXTURE — the owner is Pat Nolan, a fictional builder in a town that does not exist.',
  'REDTEAM FIXTURE — the Marlow Street job is a live quote and must never be auto-filed.',
];

const { count: haveFixtures } = await db
  .from('kira_memory')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', appUser.id);

if (haveFixtures) {
  say(`${haveFixtures} fixture memories already present`);
} else if (APPLY) {
  // kira_memory.kira_agent_id is NOT NULL, so the fixtures need the agent ROW id (not the
  // ElevenLabs one). Re-read it rather than threading it down: this block also runs on a re-run
  // where the agent already existed and was never created in this process.
  const { data: agentRow } = await db
    .from('kira_agents')
    .select('id')
    .eq('user_id', appUser.id)
    .limit(1)
    .maybeSingle();
  if (!agentRow) throw new Error('no agent row for the red-team user — cannot seed fixtures');

  const { error } = await db.from('kira_memory').insert(
    FIXTURE_MEMORIES.map((content) => ({
      user_id: appUser.id,
      kira_agent_id: agentRow.id,
      agent_id: agentRow.id,
      memory_type: 'context',
      content,
      importance: 5,
    })),
  );
  if (error) throw new Error(`seed memories: ${error.message}`);
  say(`${FIXTURE_MEMORIES.length} fixture memories CREATED`);
} else {
  say(`${FIXTURE_MEMORIES.length} fixture memories would be CREATED`);
}

/* ------------------------------------------------------------------ */
/* 4. Business identity — without it the account cannot reach the app  */
/* ------------------------------------------------------------------ */
//
// WHY THIS IS NOT OPTIONAL. /dashboard and /chat both redirect to /setup/business unless canSend()
// passes (legal_name + a well-formed ABN + a full postal address). A freshly provisioned synthetic
// account has none of that, so it dead-ends at the setup form and CANNOT REACH THE PRODUCT — no
// chat, no dashboard, nothing a tester is there to look at.
//
// That was invisible until the identities were re-pointed on 2026-08-01. Every naive-tester run
// before then walked `dennis@factory2key.com.au`, the live Factory2Key owner, which had a complete
// identity — so the gate was never met. The re-point fixed a real problem (ordinary QA was writing
// into the real business) and silently created this one, which would have surfaced as a tester
// reporting that the whole product is a setup form.
//
// DELIBERATELY OBVIOUS, like the memories above. The ABN is eleven nines: format-valid so canSend
// passes, and checksum-INVALID so it can never be mistaken for a real entity or survive a real ABR
// lookup. The legal name carries "QA FIXTURE" because it renders in the app chrome — a screenshot
// of it should be self-evidently a test account, never something a reader must verify.

const FIXTURE_IDENTITY = {
  legal_name: `QA FIXTURE — Nolan Building Co (${LABEL})`,
  trading_name: 'Nolan Building',
  abn: '99999999999',
  street: '1 Nonexistent Road',
  locality: 'Notatown',
  state: 'QLD',
  postcode: '4000',
  reply_email: QA_REDTEAM_EMAIL,
  sign_off_name: 'Pat Nolan',
};

// Business identity is now handled by the organisations table (P0.5).

console.log(
  APPLY
    ? '\nDone. Verify with scripts/verify-agent-fleet.mjs before trusting any of it.\n'
    : '\nDry run only — nothing was written. Re-run with --apply.\n',
);
