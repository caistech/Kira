// app/api/cron/memory-integrity/route.ts
//
// The continuous check for cross-account memory contamination.
//
// WHY. AI_INCIDENT_RESPONSE.md §7 lists "no automated cross-account leakage detector" as a gap: the
// memory-loop probe asserts isolation in CI, against a preview, at merge time. It says nothing
// about production an hour later. Cross-account leakage is the S1 incident in this product — one
// owner's business being described to another — and the whole history of memory bugs here is
// silent failure behind a success signal: a NOT NULL constraint swallowed behind a 200, a NULL
// filter hiding every saved fact while has_history cheerfully reported true.
//
// THE INVARIANT. A memory row names its owner (convai_memory.user_id) and, optionally, the agent it
// was written through (agent_id, nullable by design). Where an agent IS named, that agent's owner
// must be the same person. If convai_memory.user_id ever disagrees with convai_agents.user_id for
// the referenced agent, a memory has been attributed across an account boundary — which is exactly
// what one-agent-per-user exists to make impossible, and therefore exactly what is worth checking.
//
// DETECT AND ALARM — DELIBERATELY NOT AUTO-HALT. Wiring this to throw the kill switch was tempting
// and is the wrong first move: an unproven detector that can take production down unattended on a
// false positive is a bigger risk than the thing it watches. Revisit once it has a track record of
// being right. The switch is one UPDATE away for a human who has read the alarm.

import { NextRequest, NextResponse } from 'next/server';

import { rejectUnauthorisedCron } from '@/lib/cron-auth';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const unauthorised = rejectUnauthorisedCron(request);
  if (unauthorised) return unauthorised;

  try {
    const svc = createServiceClient();

    // Every memory that names an agent, with that agent's true owner alongside it. Compared in JS
    // rather than SQL because this table has no cross-table view and adding one for a watchdog
    // would put the check's own correctness behind a migration.
    const { data: memories, error: memErr } = await svc
      .from('convai_memory')
      .select('id, user_id, agent_id')
      .not('agent_id', 'is', null)
      .limit(5000);

    if (memErr) {
      console.error('[memory-integrity] could not read convai_memory:', memErr.message);
      return NextResponse.json({ ok: false, error: 'read failed' }, { status: 500 });
    }

    const rows = memories ?? [];
    if (rows.length === 0) {
      return NextResponse.json({ ok: true, checked: 0, mismatches: 0 });
    }

    const agentIds = [...new Set(rows.map((r) => String(r.agent_id)))];
    const { data: agents, error: agentErr } = await svc
      .from('convai_agents')
      .select('id, user_id')
      .in('id', agentIds);

    if (agentErr) {
      console.error('[memory-integrity] could not read convai_agents:', agentErr.message);
      return NextResponse.json({ ok: false, error: 'read failed' }, { status: 500 });
    }

    const ownerOfAgent = new Map((agents ?? []).map((a) => [String(a.id), String(a.user_id)]));

    const mismatches: Array<{ memoryId: string; memoryUser: string; agentOwner: string }> = [];
    let orphaned = 0;

    for (const row of rows) {
      const agentOwner = ownerOfAgent.get(String(row.agent_id));
      if (!agentOwner) {
        // The agent row is gone but the memory survived. Not a leak — the FK cascades — but it
        // means something deleted an agent in a way the cascade did not cover. Worth counting.
        orphaned += 1;
        continue;
      }
      if (agentOwner !== String(row.user_id)) {
        mismatches.push({
          memoryId: String(row.id),
          memoryUser: String(row.user_id),
          agentOwner,
        });
      }
    }

    if (mismatches.length > 0) {
      // Loud, and deliberately without memory CONTENT — an alarm about a confidentiality breach
      // must not itself copy the confidential material into a log aggregator.
      console.error(
        `[memory-integrity] S1 CROSS-ACCOUNT LEAKAGE: ${mismatches.length} memory rows whose owner ` +
          `differs from their agent's owner. Follow docs/AI_INCIDENT_RESPONSE.md. Ids: ` +
          mismatches.slice(0, 20).map((m) => m.memoryId).join(', '),
      );
    }

    if (orphaned > 0) {
      console.warn(`[memory-integrity] ${orphaned} memory rows reference a missing agent.`);
    }

    return NextResponse.json({
      ok: mismatches.length === 0,
      checked: rows.length,
      mismatches: mismatches.length,
      orphaned,
      // Ids only, never content, so an operator can go straight to the rows.
      mismatchIds: mismatches.slice(0, 20).map((m) => m.memoryId),
    });
  } catch (error) {
    console.error('[memory-integrity] threw:', error);
    return NextResponse.json({ ok: false, error: 'check failed' }, { status: 500 });
  }
}
