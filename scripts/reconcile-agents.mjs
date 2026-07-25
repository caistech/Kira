// scripts/reconcile-agents.mjs
// Archive kira_agents rows whose ElevenLabs agent no longer exists (404) — so provisioning scripts
// stop failing on them and no user is pointed at a dead agent. Idempotent; safe to re-run.
//
// Usage: node --env-file=.env.local scripts/reconcile-agents.mjs [--dry-run]

import { createClient } from '@supabase/supabase-js';

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY } = process.env;
const DRY = process.argv.includes('--dry-run');
if (!SUPABASE_SERVICE_ROLE_KEY || !ELEVENLABS_API_KEY) throw new Error('Need SUPABASE_SERVICE_ROLE_KEY + ELEVENLABS_API_KEY');

const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const { data: agents } = await sb
  .from('kira_agents')
  .select('id, elevenlabs_agent_id, agent_name, status')
  .in('status', ['active', 'paused']);

console.log(`checking ${agents.length} active/paused agents against ElevenLabs…\n`);
const dangling = [];
for (const a of agents) {
  if (!a.elevenlabs_agent_id) continue;
  const r = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${a.elevenlabs_agent_id}`, {
    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
  });
  if (r.status === 404) {
    dangling.push(a);
    console.log(`  ${DRY ? '~' : '✓'} ${a.agent_name} (${a.elevenlabs_agent_id}) — 404 in EL${DRY ? ' (would archive)' : ' → archived'}`);
  }
}
if (!dangling.length) console.log('  no dangling agents.');
else if (!DRY) await sb.from('kira_agents').update({ status: 'archived' }).in('id', dangling.map((a) => a.id));

console.log(`\nDone. ${dangling.length} dangling agent(s)${DRY ? ' found' : ' archived'}.`);
