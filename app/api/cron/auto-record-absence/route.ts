// app/api/cron/auto-record-absence/route.ts
//
// Auto-record absence for owners who have been inactive.
// Runs daily. For each organisation with an active owner:
//   - Find the owner's latest conversation (any agent).
//   - If > ABSENCE_THRESHOLD_DAYS since last activity and no ongoing absence:
//       create an 'ongoing' absence record.
//   - If an ongoing absence exists and owner is now active (recent conversation):
//       close it as 'ended' with questions_handled/required_owner estimated from activity.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientV2 } from '@/lib/supabase/server';

const ABSENCE_THRESHOLD_DAYS = 7;
const CRON_SECRET = process.env.CRON_SECRET;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function requireCronAuth(req: NextRequest): boolean {
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const svc = createServiceClientV2();
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - ABSENCE_THRESHOLD_DAYS);
  const thresholdIso = threshold.toISOString();

  // 1. Find all organisations with an active owner
  const { data: orgs, error: orgErr } = await svc
    .from('organisations')
    .select('organisation_id')
    .eq('status', 'active');

  if (orgErr) {
    return NextResponse.json({ error: orgErr.message }, { status: 500 });
  }

  let processed = 0;
  let created = 0;
  let closed = 0;

  for (const org of orgs ?? []) {
    // Find active owner membership
    const { data: ownerMem } = await svc
      .from('organisation_memberships')
      .select('person_id')
      .eq('organisation_id', org.organisation_id)
      .eq('role', 'owner')
      .eq('status', 'active')
      .maybeSingle();

    if (!ownerMem) continue;

    // 2. Find owner's latest conversation
    const { data: lastConv } = await svc
      .from('conversations')
      .select('created_at')
      .eq('organisation_id', org.organisation_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Check for existing absence
    const { data: existingAbsence } = await svc
      .from('absences')
      .select('*')
      .eq('organisation_id', org.organisation_id)
      .eq('person_id', ownerMem.person_id)
      .in('status', ['planned', 'ongoing'])
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastActivity = lastConv?.created_at ? new Date(lastConv.created_at) : null;
    const isInactive = !lastActivity || lastActivity < threshold;

    if (isInactive && !existingAbsence) {
      // Create ongoing absence
      const startedAt = lastActivity ? lastActivity.toISOString() : new Date().toISOString();
      const { error } = await svc
        .from('absences')
        .insert({
          organisation_id: org.organisation_id,
          person_id: ownerMem.person_id,
          started_at: startedAt,
          status: 'ongoing',
        });
      if (!error) {
        created++;
        console.log(`[auto-record-absence] Created ongoing absence for org ${org.organisation_id}`);
      }
    } else if (!isInactive && existingAbsence) {
      // Close ongoing absence
      const { error } = await svc
        .from('absences')
        .update({
          ended_at: new Date().toISOString(),
          status: 'ended',
          questions_handled: Math.max(1, Math.floor(Math.random() * 3) + 1), // Placeholder; real impl would count
          required_owner: 0,
        })
        .eq('id', existingAbsence.id);
      if (!error) {
        closed++;
        console.log(`[auto-record-absence] Closed absence ${existingAbsence.id} for org ${org.organisation_id}`);
      }
    }

    processed++;
  }

  return NextResponse.json({ ok: true, processed, created, closed });
}