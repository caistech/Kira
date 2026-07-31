// app/api/cron/genome-classify/route.ts
//
// The straggler sweep behind write-time Genome classification.
//
// Facts are filed the moment a call ends (lib/kira/convai.ts), which is what stopped an owner's
// manual from filling in 25 rows at a time as he re-opened the page. Two things still slip past it:
// a memory saved mid-call by the save_memory tool when the post-call webhook never arrives (a
// dropped call, a failed delivery), and a classification the model declined to make, which is now
// deliberately left NULL to be retried instead of being written as 'none' and never reconsidered.
//
// So this exists to make "unclassified" a temporary state rather than a permanent one. It does the
// same work as the write-time pass and decides nothing differently — if this is the only thing
// filing facts for a given owner, that is a signal his post-call webhook is not firing, not a
// reason to change what happens here.
//
// @machine-callable

import { NextRequest, NextResponse } from 'next/server';

import { rejectUnauthorisedCron } from '@/lib/cron-auth';
import { classifyPendingMemories } from '@/lib/genome/derive';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Owners per run, and facts per owner. A backlog drains across hours; one run never stalls on it. */
const OWNER_BATCH = 25;
const PER_OWNER = 50;

export async function GET(request: NextRequest) {
  const unauthorised = rejectUnauthorisedCron(request);
  if (unauthorised) return unauthorised;

  const supabase = createServiceClient();

  // Only owners who actually have something waiting — asking every user every hour would spend the
  // whole budget on people with nothing to file.
  const { data: waiting, error } = await supabase
    .from('kira_memory')
    .select('user_id')
    .is('genome_section', null)
    .neq('active', false)
    .limit(2000);

  if (error) {
    console.error('[cron/genome-classify] query failed:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  const owners = [...new Set((waiting ?? []).map((r) => r.user_id as string))].slice(0, OWNER_BATCH);
  const result = { owners: owners.length, classified: 0, deferred: 0, failed: 0 };

  for (const userId of owners) {
    try {
      const filed = await classifyPendingMemories(userId, PER_OWNER);
      result.classified += filed.classified;
      result.deferred += filed.deferred;
    } catch (sweepError) {
      // One owner's failure must not end the sweep for everyone else.
      result.failed += 1;
      console.error(`[cron/genome-classify] ${userId} failed (others continue):`, sweepError);
    }
  }

  console.log('[cron/genome-classify]', result);
  return NextResponse.json(result);
}
