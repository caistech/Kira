// app/api/cron/trial-ending/route.ts
//
// Daily: email every owner whose free month ends in 3 days, before their card is charged.
//
// Idempotent by users.trial_reminder_sent_at — the cron only mails rows where it is NULL, and
// stamps it on success. A daily job that re-mails the same person for three days running is worse
// than not mailing at all.
//
// Schedule in vercel.json.

import { NextRequest, NextResponse } from 'next/server';

import { rejectUnauthorisedCron } from '@/lib/cron-auth';
import { sendTrialEndingEmail } from '@/lib/email/trial-ending';
import { createServiceClient } from '@/lib/supabase/server';
import { DEFAULT_CURRENCY } from '@/lib/valuation/currency';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** How many days before the charge the reminder goes out. */
const REMINDER_LEAD_DAYS = 3;

export async function GET(request: NextRequest) {
  // Fail closed. This endpoint emails real customers about a real charge — an unauthenticated
  // caller must never be able to trigger a run.
  const unauthorised = rejectUnauthorisedCron(request);
  if (unauthorised) return unauthorised;

  const supabase = createServiceClient();

  // The window is a whole day, not an instant: the job runs once daily, so "3 days out" means
  // "the trial ends some time during the day that is 3 days from now".
  const windowStart = new Date();
  windowStart.setUTCDate(windowStart.getUTCDate() + REMINDER_LEAD_DAYS);
  windowStart.setUTCHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, trial_ends_at, subscription_status')
    .is('trial_reminder_sent_at', null)
    .gte('trial_ends_at', windowStart.toISOString())
    .lt('trial_ends_at', windowEnd.toISOString())
    // Only people who will actually be charged. Someone who already cancelled must not be told
    // their card is about to be debited.
    .in('subscription_status', ['trial', 'trialing']);

  if (error) {
    console.error('[cron/trial-ending] Query failed:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  const results = { found: users?.length ?? 0, sent: 0, failed: 0 };

  for (const user of users ?? []) {
    try {
      // The price is the valuation-derived band quoted at checkout. Read it back from the
      // valuation rather than re-deriving it here — one price, one source.
      const { data: valuation } = await supabase
        .from('business_valuations')
        .select('quoted_monthly, currency')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!valuation?.quoted_monthly) {
        // Degrade, don't fake: a reminder that guesses the amount is worse than no reminder.
        // Leave the stamp NULL so it retries once the valuation is linked.
        console.warn(`[cron/trial-ending] No quoted price for ${user.id} — skipped.`);
        continue;
      }

      await sendTrialEndingEmail({
        userEmail: user.email,
        userName: [user.first_name, user.last_name].filter(Boolean).join(' '),
        monthlyAmount: Number(valuation.quoted_monthly),
        currencyCode: String(valuation.currency || DEFAULT_CURRENCY),
        chargeDate: new Date(user.trial_ends_at),
      });

      await supabase
        .from('users')
        .update({ trial_reminder_sent_at: new Date().toISOString() })
        .eq('id', user.id);

      results.sent += 1;
    } catch (sendError) {
      // One bad address must not stop the rest of the run, and must not consume the stamp.
      console.error(`[cron/trial-ending] Failed for ${user.id}:`, sendError);
      results.failed += 1;
    }
  }

  console.log('[cron/trial-ending]', results);
  return NextResponse.json(results);
}
