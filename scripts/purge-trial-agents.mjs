// scripts/purge-trial-agents.mjs
// Inventory and (on --apply) permanently remove trial/test Kiras — the agent row, its ElevenLabs
// agent, its conversations and its memories.
//
// DRY RUN BY DEFAULT, and it prints every row it would touch, grouped by why. Deletion here is not
// recoverable: an ElevenLabs agent cannot be un-deleted, and the memories are the accumulated
// substance of a conversation history.
//
// THE CLASSIFICATION IS THE WHOLE POINT. "Delete the trial agents" sounds unambiguous and is not —
// the same table holds real prospects who were given access, and the two synthetic identities that
// CI and the weekly red-team run depend on. Deleting those does not lose data so much as silently
// switch off the checks that watch for regressions.
//
//   node --env-file=.env.local scripts/purge-trial-agents.mjs                 # inventory only
//   node --env-file=.env.local scripts/purge-trial-agents.mjs --group tests --apply

import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const groupArg = (() => {
  const i = process.argv.indexOf('--group');
  return i > -1 ? (process.argv[i + 1] || '') : '';
})();

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const elevenKey = process.env.ELEVENLABS_API_KEY;

/** Real people who were deliberately given access. Never swept. */
const REAL_PROSPECTS = [
  'andrew@aerion.com.au',
  'trinh@bucketlyst.com.au',
  'shhahhussain@gmail.com',
  'carme.plasencia@aromics.es',
  'simon.crisp@finnbusinesssales.com.au',
];
/** The operator's own working accounts. */
const OPERATOR = ['dennis@factory2key.com.au', 'dennis@corporateaisolutions.com', 'mcmdennis@gmail.com'];
/** Load-bearing synthetic identities — CI and the weekly red-team run resolve to these. */
const AUTOMATION = ['dennis+qauser@factory2key.com.au', 'dennis+redteam@factory2key.com.au', 'system+discovery@kira.internal'];

function classify(email) {
  const e = (email || '').toLowerCase();
  if (AUTOMATION.includes(e)) return 'automation';
  if (REAL_PROSPECTS.includes(e)) return 'prospect';
  if (OPERATOR.includes(e)) return 'operator';
  return 'tests';
}

const { data: users } = await sb.from('users').select('id, email');
const emailOf = Object.fromEntries((users || []).map((u) => [u.id, u.email]));

const { data: agents } = await sb
  .from('kira_agents')
  .select('id, user_id, agent_name, journey_type, status, elevenlabs_agent_id, total_conversations, created_at')
  .order('created_at');

const groups = { tests: [], operator: [], prospect: [], automation: [] };
for (const a of agents || []) groups[classify(emailOf[a.user_id])].push(a);

const LABELS = {
  tests: 'TEST / THROWAWAY ACCOUNTS — safe to remove',
  operator: 'OPERATOR ACCOUNTS — your own Kiras, including real history',
  prospect: 'REAL PEOPLE given access — removing these deletes their product',
  automation: 'AUTOMATION IDENTITIES — CI and the weekly red-team run resolve to these',
};

for (const key of ['tests', 'operator', 'prospect', 'automation']) {
  console.log(`\n=== ${LABELS[key]} (${groups[key].length}) ===`);
  for (const a of groups[key]) {
    console.log(
      `  ${String(emailOf[a.user_id] || a.user_id).padEnd(40)} ${String(a.journey_type).padEnd(9)} ${String(a.status).padEnd(9)} ` +
        `${String(a.agent_name).slice(0, 32).padEnd(34)} convos=${a.total_conversations ?? 0}`,
    );
  }
}

if (!groupArg) {
  console.log('\n[purge] inventory only — pass --group <tests|operator|prospect|automation> --apply to remove one group');
  process.exit(0);
}

const target = groups[groupArg];
if (!target) throw new Error(`unknown group: ${groupArg}`);

console.log(`\n[purge] ${APPLY ? 'APPLY' : 'DRY RUN'} — group "${groupArg}", ${target.length} agent(s)`);
if (!APPLY) {
  console.log('[purge] dry run — re-run with --apply');
  process.exit(0);
}

for (const a of target) {
  const who = emailOf[a.user_id] || a.user_id;
  // ElevenLabs first: if this fails we still have the row to retry from. The reverse order would
  // orphan a live agent with no record of it.
  if (a.elevenlabs_agent_id && elevenKey) {
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${a.elevenlabs_agent_id}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': elevenKey },
    });
    console.log(`  elevenlabs ${a.elevenlabs_agent_id} -> ${res.status}`);
  }
  const { error: mErr, count: mCount } = await sb
    .from('kira_memory')
    .delete({ count: 'exact' })
    .eq('kira_agent_id', a.id);
  const { error: aErr } = await sb.from('kira_agents').delete().eq('id', a.id);
  console.log(
    `  ${who.padEnd(40)} ${String(a.agent_name).slice(0, 30).padEnd(32)} memories=${mCount ?? 0}${mErr ? ' (' + mErr.message + ')' : ''} row=${aErr ? 'ERR ' + aErr.message : 'deleted'}`,
  );
}
console.log('\n[purge] done');
