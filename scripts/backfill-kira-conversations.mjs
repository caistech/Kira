// scripts/backfill-kira-conversations.mjs
// Backfill conversations that were lost when the OLD post-call webhook wrote to phantom
// tables (kira_conversations / kira_messages). The transcripts were never stored in Kira's
// DB, but ElevenLabs retains them server-side — so we pull each agent's conversation history
// from the ElevenLabs API and replay it through the CANONICAL handlePostCallWebhook, landing
// it in the real conversations / conversation_messages tables.
//
// NOTE: this recovers TRANSCRIPT + TOPIC only. It cannot recover distilled memories
// (kira_memory rows) — during those calls the agent had no save_memory tool, so no memories
// were ever produced to recover.
//
// Idempotent: handlePostCallWebhook dedupes on (conversation_id, message_index) and gates
// side-effects on processed_at, so re-running is safe.
//
// RUN AFTER deploy + re-provision. Usage:
//   node --env-file=.env.local scripts/backfill-kira-conversations.mjs

import { createClient } from '@supabase/supabase-js';
import { handlePostCallWebhook } from '@caistech/elevenlabs-convai';

const { ELEVENLABS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing');
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('Supabase env missing');

const ELEVEN = 'https://api.elevenlabs.io/v1/convai';
const KIRA_TABLES = {
  agents: 'kira_agents',
  conversations: 'conversations',
  messages: 'conversation_messages',
  memory: 'kira_memory',
};

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY);

async function eleven(path) {
  const res = await fetch(`${ELEVEN}${path}`, { headers: { 'xi-api-key': ELEVENLABS_API_KEY } });
  if (!res.ok) throw new Error(`ElevenLabs ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

// List every conversation id for an agent (cursor-paginated).
async function listConversationIds(agentId) {
  const ids = [];
  let cursor = '';
  do {
    const q = `/conversations?agent_id=${encodeURIComponent(agentId)}&page_size=100${cursor ? `&cursor=${cursor}` : ''}`;
    const data = await eleven(q);
    for (const c of data.conversations || []) ids.push(c.conversation_id);
    cursor = data.has_more ? data.next_cursor : '';
  } while (cursor);
  return ids;
}

function toParams(detail) {
  const md = detail.metadata || {};
  const startUnix = md.start_time_unix_secs || Math.floor(Date.now() / 1000);
  const endUnix = md.end_time_unix_secs || startUnix + (md.call_duration_secs || 0);
  const messages = (detail.transcript || [])
    .filter((t) => t.role === 'user' || t.role === 'agent')
    .map((t) => ({
      role: t.role === 'agent' ? 'assistant' : 'user',
      content: t.message || '',
      timestamp: new Date((startUnix + (t.time_in_call_secs || 0)) * 1000).toISOString(),
    }))
    .filter((m) => m.content.trim().length > 0);

  return {
    elevenlabsAgentId: detail.agent_id,
    conversationId: detail.conversation_id,
    userId: '', // orphan fallback → agent owner; a prior start-row (none here) would keep its own
    topic: detail.analysis?.transcript_summary?.slice(0, 200) || 'Backfilled conversation',
    status: detail.status || 'done',
    startedAt: new Date(startUnix * 1000).toISOString(),
    endedAt: new Date(endUnix * 1000).toISOString(),
    durationSecs: md.call_duration_secs || 0,
    summary: detail.analysis?.transcript_summary,
    messages,
  };
}

const { data: agents, error } = await supabase
  .from('kira_agents')
  .select('elevenlabs_agent_id, agent_name')
  .not('elevenlabs_agent_id', 'is', null);
if (error) throw error;

console.log(`Backfilling conversations for ${agents.length} agent(s)...\n`);

let convOk = 0;
let convSkipped = 0;
let convFailed = 0;

for (const a of agents) {
  const agentId = a.elevenlabs_agent_id;
  let ids = [];
  try {
    ids = await listConversationIds(agentId);
  } catch (e) {
    console.error(`  ✗ list ${a.agent_name} (${agentId}): ${e.message}`);
    continue;
  }
  if (ids.length === 0) continue;
  console.log(`  ${a.agent_name} (${agentId}): ${ids.length} conversation(s)`);

  for (const cid of ids) {
    try {
      const detail = await eleven(`/conversations/${cid}`);
      const params = toParams(detail);
      if (params.messages.length === 0) { convSkipped++; continue; }
      const result = await handlePostCallWebhook(supabase, params, KIRA_TABLES);
      if (result.success) convOk++;
      else { convFailed++; console.error(`    ✗ ${cid}: ${result.error}`); }
    } catch (e) {
      convFailed++;
      console.error(`    ✗ ${cid}: ${e.message}`);
    }
  }
}

console.log(`\nDone. ${convOk} backfilled, ${convSkipped} empty/skipped, ${convFailed} failed.`);
if (convFailed > 0) process.exitCode = 1;
