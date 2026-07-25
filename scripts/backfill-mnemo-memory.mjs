// scripts/backfill-mnemo-memory.mjs
// One-off: seed Mnemo with existing kira_memory facts, grouped per user, so deep/semantic recall
// works on history that predates the dual-write. New conversations dual-write automatically
// (lib/kira/convai.ts onConversationComplete). Mnemo `add` appends, so run ONCE (a re-run duplicates).
//
// Usage: node --env-file=.env.local scripts/backfill-mnemo-memory.mjs

import { createClient } from '@supabase/supabase-js';

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MNEMO_API_KEY } = process.env;
const API_URL = (process.env.MNEMO_API_URL || 'https://api.mnemohq.com').replace(/\/$/, '');
if (!SUPABASE_SERVICE_ROLE_KEY || !MNEMO_API_KEY) throw new Error('Need SUPABASE_SERVICE_ROLE_KEY + MNEMO_API_KEY');

const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function mnemoAdd(userId, contents) {
  const items = contents.map((c) => c?.trim()).filter(Boolean);
  if (!items.length) return 0;
  const r = await fetch(`${API_URL}/v1/memories`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MNEMO_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope: { type: 'org', id: `kira-user-${userId}` }, items: items.map((content) => ({ content })) }),
  });
  return r.ok ? items.length : 0;
}

const { data: rows, error } = await sb
  .from('kira_memory')
  .select('user_id, content')
  .eq('active', true)
  .order('created_at', { ascending: true });
if (error) throw error;

const byUser = new Map();
for (const r of rows) {
  if (!r.user_id || !r.content) continue;
  if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
  byUser.get(r.user_id).push(r.content);
}

console.log(`${rows.length} memory rows across ${byUser.size} user(s)\n`);
let total = 0;
for (const [userId, contents] of byUser) {
  const n = await mnemoAdd(userId, contents);
  console.log(`  ${userId.slice(0, 8)} → ${n}/${contents.length} facts into kira-user-${userId.slice(0, 8)}…`);
  total += n;
}
console.log(`\nDone. ${total} facts seeded to Mnemo.`);
