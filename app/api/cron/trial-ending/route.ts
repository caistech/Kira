// app/api/cron/trial-ending/route.ts
//
// Daily: email every owner whose billing period closes in 3 days, before their card is charged.
//
// Kira bills in ARREARS (lib/billing/arrears.ts) — the month is owed from day one and invoiced when
// the period closes — so this is not a trial-ending notice any more, it is a pre-charge notice, and
// there is one EVERY month rather than one ever. The route keeps its path so the scheduled cron
// entry and its secret don't have to move.
//
// Idempotent per PERIOD, via users.charge_notice_period_end. The previous stamp
// (trial_reminder_sent_at) was set once and never cleared, which was right when there was a single
// charge to warn about and would now keep the promise once and then go quiet — a silence nobody
// would notice until a customer said "you charged me without telling me".

import { NextRequest, NextResponse } from 'next/server';

import { rejectUnauthorisedCron } from '@/lib/cron-auth';
import { resolveOrganisationForPerson } from '@/lib/auth';
import { sendTrialEndingEmail } from '@/lib/email/trial-ending';
import { createServiceClientV2 } from '@/lib/supabase/server';
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

  const supabase = createServiceClientV2();

  // The window is a whole day, not an instant: the job runs once daily, so "3 days out" means
  // "the period closes some time during the day that is 3 days from now".
  const windowStart = new Date();
  windowStart.setUTCDate(windowStart.getUTCDate() + REMINDER_LEAD_DAYS);
  windowStart.setUTCHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);

  const { data: users, error } = await supabase
    .from('users')
    .select(
      'id, email, first_name, last_name, subscription_ends_at, charge_notice_period_end, subscription_status',
    )
    .gte('subscription_ends_at', windowStart.toISOString())
    .lt('subscription_ends_at', windowEnd.toISOString())
    // Only people who will actually be charged. Someone who already cancelled must not be told
    // their card is about to be debited — and under arrears, a cancelled owner's final month is
    // waived, so a notice would be doubly wrong.
    .in('subscription_status', ['active', 'trial', 'trialing']);

  if (error) {
    console.error('[cron/trial-ending] Query failed:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  const results = { found: users?.length ?? 0, sent: 0, failed: 0 };

  for (const user of users ?? []) {
    try {
      // Already told them about THIS period. Comparing the stored period end (rather than a bare
      // "sent" flag) is what lets the notice repeat monthly without repeating within a month.
      if (
        user.charge_notice_period_end &&
        new Date(user.charge_notice_period_end).getTime() ===
          new Date(user.subscription_ends_at).getTime()
      ) {
        continue;
      }

      // The price is the valuation-derived band quoted at checkout. Read it back from the
      // valuation rather than re-deriving it here — one price, one source.
      //
      // ⚠️ ORG-SCOPED SINCE P2.4-B. The valuation belongs to the Organisation, so the person is
      // resolved to its organisation through membership before reading — the price quoted at
      // checkout is the business's price, and must survive a change of billing contact.
      const orgContext = await resolveOrganisationForPerson(user.id);
      const { data: valuation } = orgContext
        ? await supabase
            .from('business_valuations')
            .select('quoted_monthly, currency')
            .eq('organisation_id', orgContext.organisationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null as { quoted_monthly: number | null; currency: string | null } | null };

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
        chargeDate: new Date(user.subscription_ends_at),
      });

      await supabase
        .from('users')
        .update({ charge_notice_period_end: user.subscription_ends_at })
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
