// app/api/cron/memory-integrity/route.ts
// The memory-ownership watchdog.
//
// P0.4 REBIND: the canonical tables are `kira_memory` and `kira_agents` (this cron previously read
// the dead `convai_memory`/`convai_agents` tables).
//
// What it guards now — THE OWNERSHIP INVARIANT:
//   - Every kira_memory row must have organisation_id NOT NULL. An org-less row is unowned memory.
//   - The row's organisation_id must agree with its agent's organisation_id (memory → agent).
//   - A memory row names its owner (kira_memory.organisation_id).
//   - A memory written over an agent whose org differs is cross-org leakage of the same class the
//     cron was built for — it alarms loudly, and deliberately carries ids only, never content.
//
// Compared in JS rather than SQL because there is no cross-table view and adding one for a
// watchdog would put the check's own correctness behind a migration.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { rejectUnauthorisedCron } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const unauthorised = rejectUnauthorisedCron(request);
  if (unauthorised) return unauthorised;

  try {
    const svc = createServiceClientV2();

    // Unowned rows: organisation_id NULL. Cannot leak to another org, but violates the P0.4
    // ownership invariant — every memory belongs to an organisation.
    const { data: unowned, error: unownedErr } = await svc
      .from('kira_memory')
      .select('id')
      .is('organisation_id', null)
      .limit(1000);
    if (unownedErr) {
      console.error('[memory-integrity] could not read kira_memory:', unownedErr.message);
      return NextResponse.json({ ok: false, error: 'read failed' }, { status: 500 });
    }

    // Every memory that names an agent, with that agent's true owning org alongside it. Only rows
    // with an agent (and an org, to make the cross-check honest).
    const { data: memories, error: memErr } = await svc
      .from('kira_memory')
      .select('id, organisation_id, agent_id')
      .not('agent_id', 'is', null)
      .not('organisation_id', 'is', null)
      .limit(5000);
    if (memErr) {
      console.error('[memory-integrity] could not read kira_memory (agent rows):', memErr.message);
      return NextResponse.json({ ok: false, error: 'read failed' }, { status: 500 });
    }

    const agentsNeeded = [...new Set((memories ?? []).map((r) => String(r.agent_id)))];
    let ownerOfAgent = new Map<string, string>();
    if (agentsNeeded.length > 0) {
      const { data: agents, error: agentErr } = await svc
        .from('kira_agents')
        .select('id, organisation_id')
        .in('id', agentsNeeded);
      if (agentErr) {
        console.error('[memory-integrity] could not read kira_agents:', agentErr.message);
        return NextResponse.json({ ok: false, error: 'read failed' }, { status: 500 });
      }
      ownerOfAgent = new Map((agents ?? []).map((a) => [String(a.id), String(a.organisation_id)]));
    }

    const mismatches: Array<{ memoryId: string; memoryOrg: string; agentOrg: string }> = [];
    let orphanedAgents = 0;

    for (const row of memories ?? []) {
      const agentOrg = ownerOfAgent.get(String(row.agent_id));
      if (!agentOrg) {
        // The agent row is gone but the memory survived. Not a leak — the FK cascades — but it
        // means something deleted an agent in a way the cascade did not cover. Count it.
        orphanedAgents += 1;
        continue;
      }
      if (agentOrg !== String(row.organisation_id)) {
        mismatches.push({
          memoryId: String(row.id),
          memoryOrg: String(row.organisation_id),
          agentOrg,
        });
      }
    }

    if (mismatches.length > 0) {
      // Loud, and deliberately without memory CONTENT — an alarm about a confidentiality breach
      // must not itself copy the confidential material into a log aggregator.
      console.error(
        `[memory-integrity] CROSS-ORGANISATION LEAKAGE: ${mismatches.length} memory rows whose ` +
          `owning org differs from their agent's org. Follow docs/AI_INCIDENT_RESPONSE.md. Ids: ` +
          mismatches.slice(0, 20).map((m) => m.memoryId).join(', '),
      );
    }

    return NextResponse.json({
      ok: mismatches.length === 0,
      checked: (memories ?? []).length,
      unowned,
      mismatches: mismatches.length,
      orphanedAgents,
      // Ids only, never content, so an operator can go straight to the rows.
      mismatchIds: mismatches.slice(0, 20).map((m) => m.memoryId),
    });
  } catch (error) {
    console.error('[memory-integrity] threw:', error);
    return NextResponse.json({ ok: false, error: 'check failed' }, { status: 500 });
  }
}