import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  // Step 1: Backfill kira_memory — join kira_agent_id → kira_agents.organisation_id
  const { data: kmNull } = await supabase
    .from('kira_memory')
    .select('id, kira_agent_id')
    .is('organisation_id', null);

  console.log(`kira_memory NULL rows to fix: ${kmNull?.length || 0}`);

  let kmFixed = 0;
  for (const row of kmNull || []) {
    if (!row.kira_agent_id) {
      console.log(`  SKIP memory ${row.id} — no kira_agent_id`);
      continue;
    }
    const { data: agent } = await supabase
      .from('kira_agents')
      .select('organisation_id')
      .eq('id', row.kira_agent_id)
      .maybeSingle();
    if (!agent?.organisation_id) {
      console.log(`  SKIP memory ${row.id} — agent has no org`);
      continue;
    }
    const { error } = await supabase
      .from('kira_memory')
      .update({ organisation_id: agent.organisation_id })
      .eq('id', row.id);
    if (error) {
      console.error(`  FAIL memory ${row.id}: ${error.message}`);
    } else {
      kmFixed++;
    }
  }
  console.log(`kira_memory fixed: ${kmFixed}/${kmNull?.length || 0}`);

  // Step 2: Backfill conversations — join kira_agent_id → kira_agents.organisation_id
  const { data: convNull } = await supabase
    .from('conversations')
    .select('id, kira_agent_id')
    .is('organisation_id', null);

  console.log(`conversations NULL rows to fix: ${convNull?.length || 0}`);

  let convFixed = 0;
  for (const row of convNull || []) {
    if (!row.kira_agent_id) {
      console.log(`  SKIP conv ${row.id} — no kira_agent_id`);
      continue;
    }
    const { data: agent } = await supabase
      .from('kira_agents')
      .select('organisation_id')
      .eq('id', row.kira_agent_id)
      .maybeSingle();
    if (!agent?.organisation_id) {
      console.log(`  SKIP conv ${row.id} — agent has no org`);
      continue;
    }
    const { error } = await supabase
      .from('conversations')
      .update({ organisation_id: agent.organisation_id })
      .eq('id', row.id);
    if (error) {
      console.error(`  FAIL conv ${row.id}: ${error.message}`);
    } else {
      convFixed++;
    }
  }
  console.log(`conversations fixed: ${convFixed}/${convNull?.length || 0}`);

  // Step 3: Verify — no more NULL org rows
  const { count: kmRemaining } = await supabase
    .from('kira_memory')
    .select('*', { count: 'exact', head: true })
    .is('organisation_id', null);
  const { count: convRemaining } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .is('organisation_id', null);

  console.log(`\nVerification:`);
  console.log(`  kira_memory NULL org rows remaining: ${kmRemaining}`);
  console.log(`  conversations NULL org rows remaining: ${convRemaining}`);
}

main().catch(console.error);
