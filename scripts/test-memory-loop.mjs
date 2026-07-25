// scripts/test-memory-loop.mjs
//
// THE END-TO-END MEMORY BEHAVIOURAL TEST — the definition of "fixed" that all four prior fix
// rounds lacked. Memory was declared fixed four times from code inspection and stayed broken each
// time, because nobody ever ran the whole chain: talk -> disconnect -> reconnect -> assert recall.
// A green unit/route test proves nothing for this subsystem; only the behaviour does.
//
// It drives the DEPLOYED prod webhook loop (not local handlers) exactly as a provisioned agent
// would — sending the x-kira-tool-secret header — so it catches the real regressions:
//   - link 4 (tool auth): a 401 from start/recall means the header/guard is misaligned. Loud fail.
//   - link 7 (recall on reconnect): a SECOND conversation must see has_history AND recall a fact
//     saved in the FIRST. This is the exact failure that shipped ("this is our first chat here").
//   - identity binding: recall keys off the conversation row's bound user, never a supplied id.
//
// It does NOT cover link 5 (the LLM actually emitting the tool call mid-voice-call) — that needs a
// live voice session and is asserted by the manual/live pass. Stated here so a green run is never
// mistaken for "the agent definitely calls its tools."
//
// SAFETY: it operates on a DEDICATED throwaway agent row it creates and hard-deletes, so no real
// user's memory is ever written or read. Teardown runs in finally, even on failure.
//
// Usage:
//   node --env-file=.env.local scripts/test-memory-loop.mjs
//   Exit 0 = pass, 1 = fail. Suitable for CI against prod.

import { createClient } from '@supabase/supabase-js';

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  KIRA_TOOL_WEBHOOK_SECRET,
  NEXT_PUBLIC_APP_URL,
  QA_TEST_USER_EMAIL,
} = process.env;

const APP_URL = (NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app').replace(/\/$/, '');
const BASE = `${APP_URL}/api/kira/webhooks`;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase env missing');
if (!KIRA_TOOL_WEBHOOK_SECRET) {
  throw new Error('KIRA_TOOL_WEBHOOK_SECRET missing — the deployed routes require it; the test must send it.');
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// A run id makes every artifact unique + greppable, so teardown is exact and parallel runs never
// collide. new Date() is fine here (plain script, not a workflow).
const RUN = `e2e_${Date.now()}`;
const SENTINEL = `zephyr-${RUN}`; // a token that cannot occur in real memory → recall proves cross-conversation read
const headers = { 'Content-Type': 'application/json', 'x-kira-tool-secret': KIRA_TOOL_WEBHOOK_SECRET };

async function post(route, body) {
  const res = await fetch(`${BASE}/${route}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  return { status: res.status, json };
}

const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

let agentRowId = null;
const elAgentId = `agent_${RUN}`;
const convA = `${RUN}_a`;
const convB = `${RUN}_b`;

try {
  console.log(`\nMemory loop E2E — ${RUN}\n  target: ${BASE}\n`);

  // ---- Setup: a dedicated throwaway agent bound to the QA user (never a real agent) ----
  const qaEmail = QA_TEST_USER_EMAIL || 'dennis@factory2key.com.au';
  const { data: qaUser } = await supabase.from('users').select('id').eq('email', qaEmail).maybeSingle();
  if (!qaUser) throw new Error(`QA user ${qaEmail} not found`);

  const { data: agentRow, error: agentErr } = await supabase
    .from('kira_agents')
    .insert({
      user_id: qaUser.id,
      elevenlabs_agent_id: elAgentId,
      agent_name: `E2E_${RUN}`,
      journey_type: 'business',
      status: 'active',
    })
    .select('id')
    .single();
  if (agentErr) throw new Error(`could not create test agent: ${agentErr.message}`);
  agentRowId = agentRow.id;

  // ---- Conversation 1: talk, then save a fact ----
  const start1 = await post('start_conversation', { elevenlabs_agent_id: elAgentId, elevenlabs_conversation_id: convA });
  // A 401 here is the exact link-4 regression — call it out unmistakably.
  if (start1.status === 401) {
    check('LINK 4 — tool auth (start_conversation not 401)', false, '401 Unauthorized: tool secret header/guard misaligned');
    throw new Error('link 4 broken — aborting');
  }
  check('conversation 1 starts', start1.status === 200 && start1.json.success, `status ${start1.status}`);

  const saveMsg = await post('save_message', { conversation_id: convA, role: 'user', content: `My project codename is ${SENTINEL}.` });
  check('save_message accepted', saveMsg.status === 200 && saveMsg.json.success, `status ${saveMsg.status}`);

  // The deployed route reads body.memory + body.category (routes.js saveMemory) — this is the exact
  // shape the provisioned agent's save_memory tool sends. (An earlier test draft sent content/
  // memory_type and got a 400 — the test caught its own contract mismatch, which is the point.)
  const saveMem = await post('save_memory', {
    conversation_id: convA,
    memory: `The user's project codename is ${SENTINEL}.`,
    category: 'context',
  });
  check('save_memory accepted', saveMem.status === 200 && saveMem.json.success, `status ${saveMem.status}`);

  // ---- Conversation 2: RECONNECT (new conversation id) — the moment that was broken ----
  const start2 = await post('start_conversation', { elevenlabs_agent_id: elAgentId, elevenlabs_conversation_id: convB });
  check('conversation 2 sees prior history (has_history)', start2.status === 200 && start2.json?.context?.has_history === true,
    `has_history=${start2.json?.context?.has_history}`);

  // ---- The core assertion: recall a fact from conversation 1, in conversation 2 ----
  const recall = await post('recall_memory', { conversation_id: convB, query: SENTINEL });
  const recalledText = JSON.stringify(recall.json?.memories || []);
  check('recall returns the fact saved in conversation 1', (recall.json?.found ?? 0) >= 1 && recalledText.includes(SENTINEL),
    `found=${recall.json?.found}`);

  // ---- Identity binding: recall must key off the conversation's bound user, not a supplied id ----
  // A recall against a NON-EXISTENT conversation must NOT return our sentinel (or anything).
  const foreign = await post('recall_memory', { conversation_id: `${RUN}_nonexistent`, query: SENTINEL });
  check('recall on an unbound conversation returns nothing', !JSON.stringify(foreign.json).includes(SENTINEL),
    foreign.json?.error || `found=${foreign.json?.found}`);

  // ---- Owned RAG (search_knowledge): a shared document is retrievable + cited (#11) ----
  // Needs an embedding key to seed a chunk; skip cleanly (not fail) where it's absent (e.g. CI
  // without OPENAI_API_KEY) — degrade-don't-fake.
  if (process.env.OPENAI_API_KEY) {
    const DOC_SENTINEL = `quokka-${RUN}`;
    const emb = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: [`The confidential project codename is ${DOC_SENTINEL}.`], dimensions: 1536 }),
    }).then((r) => r.json());
    const vec = emb?.data?.[0]?.embedding;
    if (vec) {
      const { data: kdoc } = await supabase.from('kira_knowledge').insert({
        user_id: qaUser.id, kira_agent_id: agentRowId, created_by: 'user', source_type: 'user_upload',
        title: `E2E test doc ${RUN}`, summary: 'e2e', status: 'indexed',
      }).select('id').single();
      await supabase.from('kira_knowledge_chunks').insert({
        knowledge_id: kdoc.id, user_id: qaUser.id, kira_agent_id: agentRowId, chunk_index: 0,
        content: `The confidential project codename is ${DOC_SENTINEL}.`, embedding: vec,
      });
      // Call as ElevenLabs REALLY calls it: body = query only, identity via the baked ?uid in the
      // URL (EL does not pass the conversation id to server-tool webhooks). This closes the blind
      // spot that made every prior round pass while live calls failed.
      const skRes = await fetch(`${BASE}/search_knowledge?uid=${qaUser.id}`, {
        method: 'POST', headers, body: JSON.stringify({ query: 'confidential project codename' }),
      });
      const sk = { json: await skRes.json() };
      check('search_knowledge (uid in URL, no conversation_id) retrieves a shared doc, cited',
        (sk.json?.found ?? 0) >= 1 && JSON.stringify(sk.json?.results || []).includes(DOC_SENTINEL) && Boolean(sk.json?.results?.[0]?.source),
        `found=${sk.json?.found}`);
      // And recall the SAME way — uid in URL, query only.
      const recUid = await fetch(`${BASE}/recall_memory?uid=${qaUser.id}`, {
        method: 'POST', headers, body: JSON.stringify({ query: SENTINEL }),
      });
      const recUidJson = await recUid.json();
      check('recall_memory (uid in URL, no conversation_id) resolves the user',
        (recUidJson?.found ?? 0) >= 1, `found=${recUidJson?.found}`);
    }
  } else {
    console.log('  · search_knowledge check skipped (no OPENAI_API_KEY)');
  }
} catch (err) {
  check('run completed without throwing', false, err.message);
} finally {
  // ---- Teardown: hard-delete everything this run created. Always runs. ----
  try {
    if (agentRowId) {
      // The canonical handler writes agent_id; Kira's table also carries kira_agent_id. Delete by
      // BOTH so a test memory row can never orphan regardless of which column the insert set.
      await supabase.from('kira_memory').delete().eq('agent_id', agentRowId);
      await supabase.from('kira_memory').delete().eq('kira_agent_id', agentRowId);
      // The test knowledge doc's agent FK is on-delete-set-null, so it won't cascade with the agent —
      // delete it explicitly (chunks cascade on the doc's delete).
      await supabase.from('kira_knowledge').delete().eq('kira_agent_id', agentRowId);
      const { data: convs } = await supabase.from('conversations').select('id').eq('agent_id', agentRowId);
      const convIds = (convs || []).map((c) => c.id);
      if (convIds.length) await supabase.from('conversation_messages').delete().in('conversation_id', convIds);
      await supabase.from('conversations').delete().eq('agent_id', agentRowId);
      await supabase.from('kira_agents').delete().eq('id', agentRowId);
    }
    console.log('\n  (teardown complete — test agent + its memory/conversations removed)');
  } catch (e) {
    console.error('\n  ⚠ teardown failed — manual cleanup may be needed for', RUN, ':', e.message);
  }
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.length - passed;
console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${passed}/${checks.length} checks`);
console.log('  (covers links 3/4/6/7 + identity binding; link 5 — the LLM emitting the call mid-voice — needs the live pass)\n');
process.exit(failed === 0 ? 0 : 1);
