// app/api/cron/capture-consultant-genomes/route.ts
//
// Automated runner for the consultant-GENOME capture lane.
//
// Idempotent and self-guarding: skips agents already captured.
//
// @machine-callable

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { rejectUnauthorisedCron } from '@/lib/cron-auth';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONSULTANT_JOURNEY = 'consultant';

export async function GET(request: NextRequest) {
  const unauthorised = rejectUnauthorisedCron(request);
  if (unauthorised) return unauthorised;

  const db = createServiceClientV2();

  const { data: agents, error: agentsError } = await db
    .from('kira_agents')
    .select('id, person_id, organisation_id, journey_type, status, elevenlabs_agent_id')
    .eq('journey_type', CONSULTANT_JOURNEY)
    .neq('status', 'deleted');

  if (agentsError) {
    console.error('[cron/capture-consultant-genomes] fleet read failed:', agentsError.message);
    return NextResponse.json({ error: 'Database read failed' }, { status: 500 });
  }

  const consultantAgents = agents ?? [];
  const report = { total: consultantAgents.length, captured: 0, skipped: 0, failed: 0 };

  for (const agent of consultantAgents) {
    if (!agent.organisation_id) {
      report.skipped += 1;
      continue;
    }

    try {
      // 1) framework row
      const { data: existingFw } = await db
        .from('consultant_frameworks')
        .select('framework_id')
        .eq('organisation_id', agent.organisation_id)
        .limit(1);

      let frameworkId = existingFw?.[0]?.framework_id;

      if (!frameworkId) {
        frameworkId = randomUUID();
        const { error: fwErr } = await db.from('consultant_frameworks').insert({
          framework_id: frameworkId,
          organisation_id: agent.organisation_id,
          framework_name: 'Consultant Framework',
          framework_slug: `consultant-${agent.organisation_id.slice(0, 8)}`,
          framework_type: 'consulting',
          status: 'draft',
        });
        if (fwErr) throw new Error(`Framework insert failed: ${fwErr.message}`);
      }

      // 2) genome row
      const { data: existingGenome } = await db
        .from('consultant_genomes')
        .select('genome_id')
        .eq('organisation_id', agent.organisation_id)
        .limit(1);

      if (existingGenome?.length) {
        report.skipped += 1;
        continue;
      }

      const genomeRow = {
        genome_id: randomUUID(),
        organisation_id: agent.organisation_id,
        framework_id: frameworkId,
        identity: { name: agent.person_id, agent_id: agent.id },
        completeness: 0,
      };

      const { error: genomeError } = await db.from('consultant_genomes').insert(genomeRow);
      if (genomeError) throw new Error(`Genome insert failed: ${genomeError.message}`);

      report.captured += 1;
    } catch (e) {
      report.failed += 1;
      console.error(`[cron/capture-consultant-genomes] failed for agent ${agent.id.slice(0, 8)}:`, e);
    }
  }

  console.log('[cron/capture-consultant-genomes]', report);
  return NextResponse.json(report);
}
