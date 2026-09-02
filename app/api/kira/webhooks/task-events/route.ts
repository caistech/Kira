// POST /api/kira/webhooks/task-events — the RETURN LEG.
//
// Most work does not finish inside the request that started it. A sweep fires at 4am, an approval
// lands hours later, a connector retries. Without this endpoint Kira could only POLL, and a voice
// agent that must poll cannot tell an owner "that's gone out" at the moment it goes out — which is
// the entire difference between an assistant and a job queue.
//
// AUTH IS FAIL-CLOSED and uses a SEPARATE secret from the outbound one. The outbound secret proves
// Kira to the orchestrator; this proves the orchestrator to Kira. Sharing one value would mean
// anyone able to read Kira's env could forge completions — and a forged completion is Kira telling
// an owner his quote went to a client when nothing was sent.
//
// @machine-callable — called by another SYSTEM, never a browser. The middleware matcher excludes
// api/, which is load-bearing: a session redirect here is a 307 the caller follows to an HTML page,
// so nothing throws, nothing logs, and the return leg silently never runs.

import { NextResponse } from 'next/server';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { resolveOrganisationForPerson } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CALLBACK_HEADER = 'x-orchestrator-callback-secret';

export async function POST(request: Request) {
  const secret = process.env.ORCHESTRATOR_CALLBACK_SECRET;
  if (!secret) {
    console.error('[task-events] ORCHESTRATOR_CALLBACK_SECRET unset — refusing rather than accepting unverified completions.');
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }
  if (request.headers.get(CALLBACK_HEADER) !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    version?: string;
    tenantId?: string;
    taskGroupId?: string;
    status?: string;
    event?: string;
    summary?: string;
    detail?: Record<string, unknown>;
    at?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.taskGroupId || !body.tenantId) {
    return NextResponse.json({ error: 'taskGroupId and tenantId are required' }, { status: 400 });
  }

  const supabase = createServiceClientV2();

  // Upsert on (organisation_id, intent_id): a completion may arrive for a task Kira dispatched, or
  // for one the orchestrator raised on its own (a sweep at 4am the owner never asked for) — both
  // belong in his history. The idempotency key is org-scoped per the canonical model; a mirror that
  // cannot resolve an owning org has no row to land in and is refused rather than stored tenantless.
  const orgContext = await resolveOrganisationForPerson(body.tenantId);
  if (!orgContext) {
    return NextResponse.json({ error: 'No owning organisation could be resolved for this task' }, { status: 422 });
  }
  const { error } = await supabase
    .from('kira_tasks')
    .upsert(
      {
        user_id: body.tenantId,
        organisation_id: orgContext.organisationId,
        intent_id: `orch:${body.taskGroupId}`,
        kind: 'email',
        status: mapStatus(body.status),
        utterance: body.summary ?? '(raised by the orchestrator)',
        summary: body.summary ?? null,
        handled_by: 'orchestrator',
        result: { event: body.event, detail: body.detail ?? {}, at: body.at ?? new Date().toISOString() },
      },
      { onConflict: 'organisation_id,intent_id' },
    );

  if (error) {
    // 500 so the orchestrator RETRIES. Swallowing this would lose the completion silently, and the
    // owner would be told nothing at all rather than told late.
    console.error('[task-events] mirror failed:', error);
    return NextResponse.json({ error: 'Could not record the event' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** The orchestrator's vocabulary is a superset of Kira's; map rather than store a status Kira cannot render. */
function mapStatus(s?: string): string {
  switch (s) {
    case 'done': return 'done';
    case 'failed': return 'failed';
    case 'awaiting_approval': return 'awaiting_approval';
    case 'scheduled': return 'scheduled';
    default: return 'queued';
  }
}
