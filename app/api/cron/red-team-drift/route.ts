// app/api/cron/red-team-drift/route.ts
//
// Daily: read the red-team history and mail the operator if a boundary has stopped holding.
//
// WHY A SCHEDULED JOB AND NOT THE SUITE ITSELF. The suite already exits non-zero on a breach, and
// that is enough when a person is watching the terminal. It is not enough for the two cases that
// actually matter: a run triggered automatically by a re-provision that nobody is watching, and a
// decline that no single run contains — an attack sliding from always-holding to half-holding never
// produces a failing run that looks different from the last one. Only history shows it, and history
// is what this reads.
//
// It also answers the question the suite structurally cannot: WHETHER IT RAN AT ALL. A red team that
// silently stopped executing looks identical, on every dashboard, to one that keeps passing.
//
// THE CLAIM IS TAKEN BEFORE THE SEND, AND RELEASED IF THE SEND FAILS. Recording "told them" for an
// email that never left is the one outcome worse than not alerting: the alarm is then permanently
// disarmed for that finding, and the disarming is invisible.

import { NextRequest, NextResponse } from 'next/server';

import { rejectUnauthorisedCron } from '@/lib/cron-auth';
import { sendRedTeamDriftAlert } from '@/lib/email/redteam-drift';
import { detectDrift, type DriftResult, type DriftRun } from '@/lib/kira/redteam-drift';
import { createServiceClientV2 } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * How much history to judge against.
 *
 * Deep enough for two five-run comparison windows per attack with room to spare, shallow enough that
 * a year-old build's behaviour never dilutes a rate that is supposed to describe the current one.
 */
const RUN_LIMIT = 50;
const RESULT_LIMIT = 500;

export async function GET(request: NextRequest) {
  const unauthorised = rejectUnauthorisedCron(request);
  if (unauthorised) return unauthorised;

  // A dry run computes and reports without claiming or mailing. This exists because the alternative
  // way to check the watcher works is to wait for something to break.
  const dry = request.nextUrl.searchParams.get('dry') === '1';

  const supabase = createServiceClientV2();

  const [{ data: runRows, error: runError }, { data: resultRows, error: resultError }] = await Promise.all([
    supabase
      .from('kira_redteam_runs')
      // aborted_at included deliberately: without it every run the suite closed on its own way out
      // reads here as a silent death, and the detector would mail about a Ctrl-C.
      .select('id, trigger, commit_sha, attacks_run, attacks_breached, started_at, finished_at, aborted_at')
      .order('started_at', { ascending: false })
      .limit(RUN_LIMIT),
    supabase
      .from('kira_redteam_results')
      .select('run_id, attack, held, detail, created_at')
      .order('created_at', { ascending: false })
      .limit(RESULT_LIMIT),
  ]);

  if (runError || resultError) {
    // Loud, and a 500. A watcher that cannot read its own history must not answer 200 — a green
    // cron invocation is exactly the signal that would be misread as "nothing to report".
    console.error('[cron/red-team-drift] Query failed:', runError ?? resultError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  const findings = detectDrift((runRows ?? []) as DriftRun[], (resultRows ?? []) as DriftResult[]);

  if (dry) {
    return NextResponse.json({ dry: true, findings });
  }

  if (findings.length === 0) {
    console.log('[cron/red-team-drift] nothing to report');
    return NextResponse.json({ findings: 0, alerted: 0 });
  }

  // Claim first. `ignoreDuplicates` makes the insert the dedupe itself, so the rows that come back
  // are exactly the findings not yet mailed — no read-then-write race, and no second source of
  // truth about what has been said.
  const { data: claimed, error: claimError } = await supabase
    .from('kira_redteam_alerts')
    .upsert(
      findings.map((f) => ({ fingerprint: f.fingerprint, kind: f.kind, headline: f.headline })),
      { onConflict: 'fingerprint', ignoreDuplicates: true },
    )
    .select('fingerprint');

  if (claimError) {
    console.error('[cron/red-team-drift] Could not claim findings:', claimError);
    return NextResponse.json({ error: 'Alert bookkeeping failed' }, { status: 500 });
  }

  const fresh = new Set((claimed ?? []).map((c) => c.fingerprint as string));
  const toSend = findings.filter((f) => fresh.has(f.fingerprint));

  if (toSend.length === 0) {
    console.log(`[cron/red-team-drift] ${findings.length} finding(s), all previously alerted`);
    return NextResponse.json({ findings: findings.length, alerted: 0 });
  }

  try {
    const recipients = await sendRedTeamDriftAlert(toSend);
    console.log(`[cron/red-team-drift] alerted ${recipients?.length ?? 0} operator(s):`, toSend.map((f) => f.headline));
    return NextResponse.json({ findings: findings.length, alerted: toSend.length, recipients: recipients?.length ?? 0 });
  } catch (error) {
    // Release the claims so tomorrow's run tries again. Leaving them would mark these findings as
    // reported forever on the strength of an email that did not send.
    await supabase
      .from('kira_redteam_alerts')
      .delete()
      .in('fingerprint', [...fresh]);
    console.error('[cron/red-team-drift] Send failed — claims released for retry:', error);
    return NextResponse.json({ error: 'Alert send failed' }, { status: 500 });
  }
}
