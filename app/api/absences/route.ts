// app/api/absences/route.ts
//
// The write path for the small-win evidence: an owner (or an org admin) records that they
// were away and the business kept running through Kira. Only the dashboard's read side
// shows it back — a period with an ended status is what makes "you can take two months off"
// a statement with receipts.
//
// Authorisation (mirrors the absences RLS policy exactly, because the service client bypasses
// RLS and must not become a hole in it):
//   - an active session + canonical org context is required (401 otherwise);
//   - only an owner/admin member may create/edit (403 otherwise);
//   - the org is taken from the actor's OWN membership, never from the request body, so a
//     caller cannot record an absence in someone else's organisation.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentOrganisationContext } from '@/lib/auth';

const ADMIN_ROLES = ['owner', 'admin'];

function isIsoDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export async function POST(req: NextRequest) {
  const org = await getCurrentOrganisationContext();
  if (!org) {
    return NextResponse.json({ error: 'You need to sign in first.' }, { status: 401 });
  }
  if (!ADMIN_ROLES.includes(org.role) || org.membershipStatus !== 'active') {
    return NextResponse.json(
      { error: 'Only the owner or an admin can record an absence.' },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const startedAt = body.started_at;
  const endedAt = body.ended_at ?? null;
  const status = String(body.status ?? 'ended');
  const questionsHandled = Math.max(0, Math.floor(Number(body.questions_handled) || 0));
  const requiredOwner = Math.max(0, Math.floor(Number(body.required_owner) || 0));
  const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
  const replacementPersonId = typeof body.replacement_person_id === 'string' && body.replacement_person_id
    ? body.replacement_person_id
    : null;

  if (!isIsoDateTime(startedAt)) {
    return NextResponse.json({ error: 'A start date is required.' }, { status: 400 });
  }
  if (endedAt && !isIsoDateTime(endedAt)) {
    return NextResponse.json({ error: 'The end date is not a valid date.' }, { status: 400 });
  }
  if (!['planned', 'ongoing', 'ended', 'voided'].includes(status)) {
    return NextResponse.json({ error: 'Unexpected absence status.' }, { status: 400 });
  }
  if (startedAt && endedAt && Date.parse(endedAt) < Date.parse(startedAt)) {
    return NextResponse.json({ error: 'The end date is before the start date.' }, { status: 400 });
  }

  // The org is the actor's OWN org; it never comes from the request.
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('absences')
    .insert({
      organisation_id: org.organisationId,
      person_id: org.personId,
      replacement_person_id: replacementPersonId,
      started_at: startedAt,
      ended_at: endedAt,
      status,
      questions_handled: status === 'ended' ? questionsHandled : 0,
      required_owner: status === 'ended' ? requiredOwner : 0,
      notes,
    })
    .select('absence_id, started_at, ended_at, status, questions_handled, required_owner')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Could not record the absence.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, absence: data }, { status: 201 });
}
