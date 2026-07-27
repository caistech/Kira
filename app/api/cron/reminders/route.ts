// app/api/cron/reminders/route.ts
//
// Hourly: deliver every reminder whose due time has passed.
//
// This is the half of the doing-slice that was missing. `reminder` was accepted, approved, marked
// done and spoken back as "Done." — and nothing ever fired, because nothing swept the table. A task
// store with no clock cannot hold a reminder; this is the clock.
//
// Idempotent by status: the sweep only reads rows still 'scheduled' and flips each to 'done' on a
// successful send, so a re-run (or an overlapping invocation) cannot mail the same reminder twice.
// A row that fails delivery stays 'scheduled' and is retried next hour rather than being burned on
// a transient mail error.
//
// Granularity is the schedule: a reminder set for 9:15 arrives at the 10:00 sweep. Tighten the cron
// if that is too coarse — nothing else needs to change.
//
// Schedule in vercel.json.

import { NextRequest, NextResponse } from 'next/server';

import { rejectUnauthorisedCron } from '@/lib/cron-auth';
import { getSwarmCoordinator, LocalSwarmStub } from '@/lib/kira/swarm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Fail closed. This endpoint sends real mail to real owners.
  const unauthorised = rejectUnauthorisedCron(request);
  if (unauthorised) return unauthorised;

  // Delivery is the LOCAL stub's job. When a swarm adapter takes over dispatch it owns its own
  // scheduling, so sweeping our table then would fire reminders it is already handling — hence the
  // explicit check rather than an unconditional call through the coordinator.
  const coordinator = getSwarmCoordinator();
  if (!(coordinator instanceof LocalSwarmStub)) {
    console.log('[cron/reminders] Swarm adapter active — it owns scheduling. Skipping.');
    return NextResponse.json({ skipped: 'swarm adapter owns scheduling' });
  }

  try {
    const results = await coordinator.deliverDueReminders();
    console.log('[cron/reminders]', results);
    return NextResponse.json(results);
  } catch (error) {
    console.error('[cron/reminders] Sweep failed:', error);
    return NextResponse.json({ error: 'Sweep failed' }, { status: 500 });
  }
}
