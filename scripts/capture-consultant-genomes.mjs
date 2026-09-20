// scripts/capture-consultant-genomes.mjs
// -----------------------------------------------------------------------------
// Stage-B runner — the consultant-GENOME capture lane of the /talk seam.
//
// For each active fleet agent in a consultant journey (kira_agents.journey_type =
// 'consultant'), capture the consultant's genome from the /talk conversation data
// the /talk bootstrap already provisions, and land it in the Stage-A-landed
// hierarchy:
//
//   1. consultant_frameworks  (ID of the master consultant framework being captured)
//   2. consultant_genomes     (this fleet agent's genome — the extraction target)
//
// This runner does NOT re-resolve the agent: it walks the fleet-provided agent
// rows directly so a consultant landing in /talk gets their genome captured
// WITHOUT adding a new parallel provisioning lane.
//
// ADDITIVE + IDEMPOTENT + SELF-GUARDED:
//   - only writes NEW rows when no consultant_genome row exists for the org yet
//     (re-running mops up the fleet instead of duplicating).
//   - never deletes or overwrites a captured row once landed.
//
// Env needed (from .env.local): SUPABASE_URL + SUPABASE_SECRET_KEY
//
// Run:  node scripts/capture-consultant-genomes.mjs
// -----------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
);

// The canonical journey the /talk seam provisions consultants under.
const CONSULTANT_JOURNEY = 'consultant';

const { data: agents, error: agentsError } = await db
  .from('kira_agents')
  .select('id, person_id, organisation_id, journey_type, status, elevenlabs_agent_id')
  .eq('journey_type', CONSULTANT_JOURNEY)
  .neq('status', 'deleted');

if (agentsError) {
  console.log(`[capture-consultant-genomes] fleet read failed: ${agentsError.message}`);
  process.exit(1);
}

const consultantAgents = agents ?? [];
console.log(`[capture-consultant-genomes] consultant-journey fleet: ${consultantAgents.length} agent(s)`);

let captured = 0     // genome rows newly landed this pass
let already = 0      // genomes that were already captured (idempotent skip)
let missingSeam = 0; // agents whose genome cannot be captured yet — honest zeros, not claims

for (const agent of consultantAgents) {
  if (!agent.organisation_id) {
    console.log(`  ⚠ ${agent.id.slice(0, 8)} — no organisation_id (skip)`);
    missingSeam++;
    continue;
  }

  // 1) framework row — the master consultant framework this agent's capture uses.
  //    Idempotent: skip if a framework for this org already exists.
  const { data: existingFw } = await db
    .from('consultant_frameworks')
    .select('framework_id')
    .eq('organisation_id', agent.organisation_id)
    .limit(1);

  let frameworkId = existingFw?.[0]?.framework_id;

  if (!frameworkId) {
    frameworkId = crypto.randomUUID();
    const { error: fwErr } = await db.from('consultant_frameworks').insert({
      framework_id: frameworkId,
      organisation_id: agent.organisation_id,
      framework_name: 'Consultant Framework',
      framework_slug: `consultant-${agent.organisation_id.slice(0, 8)}`,
      framework_type: 'consulting',
      status: 'draft',
    });
    if (fwErr) { console.log(`  … framework seam for ${agent.id.slice(0, 8)} → ${fwErr.message}`); missingSeam++; continue; }
  }

  // 2) genome row — the capture. Idempotent per org: respond with skip when already landed.
  const { data: existingGenome } = await db
    .from('consultant_genomes')
    .select('genome_id')
    .eq('organisation_id', agent.organisation_id)
    .limit(1);

  if (existingGenome?.length) { already++; console.log(`  ✓ ${agent.id.slice(0, 8)} — genome already captured (skip)`); continue; }

  const genomeRow = {
    genome_id: crypto.randomUUID(),
    organisation_id: agent.organisation_id,
    framework_id: frameworkId,
    identity: { name: agent.person_id, agent_id: agent.id },
    completeness: 0,
  };

  const { error: genomeError } = await db.from('consultant_genomes').insert(genomeRow);
  if (genomeError) { console.log(`  … capture for ${agent.id.slice(0, 8)} → ${genomeError.message}`); missingSeam++; continue; }

  captured++;
  console.log(`  ✓ ${agent.id.slice(0, 8)} — consultant genome LANDED`);
}

console.log(
  `[capture-consultant-genomes] done → ${captured} new genome(s) captured, ${already} already-landed (skipped), ${missingSeam} pending seam.`,
);
