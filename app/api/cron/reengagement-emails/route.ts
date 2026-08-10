// app/api/cron/reengagement-emails/route.ts
// Cron job to send re-engagement emails to inactive users
// Schedule: Daily at 10am (configure in vercel.json)

import { NextRequest, NextResponse } from 'next/server';
import { rejectUnauthorisedCron } from '@/lib/cron-auth';
import { createServiceClient } from '@/lib/supabase/server';
import { sendWelcomeBackEmail } from '@/lib/email/resend';

export async function GET(request: NextRequest) {
  try {
    // Fail closed: an unset CRON_SECRET refuses the request rather than waving it through.
    const unauthorised = rejectUnauthorisedCron(request);
    if (unauthorised) return unauthorised;

    const supabase = createServiceClient();

    console.log('[reengagement-emails] Starting cron job');

    // Get users who need re-engagement emails
    const { data: users, error } = await supabase
      .rpc('get_users_for_reengagement', {
        p_days_inactive: 7,       // Haven't chatted in 7 days
        p_min_days_since_email: 3 // Haven't been emailed in 3 days
      });

    if (error) {
      console.error('[reengagement-emails] Error fetching users:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`[reengagement-emails] Found ${users?.length || 0} users to email`);

    // NOBODY IS INVITED BACK THROUGH A DOOR THEY HAVE NEVER BEEN ABLE TO OPEN.
    //
    // `get_users_for_reengagement` selects on ACTIVITY, which is the right question for "who has
    // gone quiet" and the wrong one for "who can act on this email". Two people signed up in
    // January and February 2026, were given a thirty-day trial and a provisioned agent, and never
    // had an auth identity created — so they have never been able to sign in at all. This cron
    // mailed both of them on 2026-08-07: a "welcome back" to a product neither has ever been
    // inside, from a trial that expired without them once getting through the door.
    //
    // Filtered HERE rather than inside the RPC, deliberately. The send is the thing that reaches a
    // person, so the guard belongs at the send, where it is visible in the file someone edits —
    // rather than in a migration nobody re-reads. Narrowing the RPC as well is still worth doing;
    // this is the floor, not the ceiling.
    const candidateIds = (users || []).map((u: { user_id: string }) => u.user_id).filter(Boolean);
    const { data: reachable } = candidateIds.length
      ? await supabase.from('users').select('id').in('id', candidateIds).not('auth_user_id', 'is', null)
      : { data: [] as { id: string }[] };
    const canSignIn = new Set((reachable || []).map((r: { id: string }) => r.id));
    const sendable = (users || []).filter((u: { user_id: string }) => canSignIn.has(u.user_id));
    const skipped = (users?.length || 0) - sendable.length;

    // Count only — an address is PII and this log is not the place for it. A number is enough to
    // notice the state and go and look.
    if (skipped > 0) {
      console.warn(
        `[reengagement-emails] skipping ${skipped} account(s) with no auth identity — they cannot sign in, so a "welcome back" is not something they can act on`,
      );
    }

    const results = {
      total: users?.length || 0,
      sendable: sendable.length,
      skippedNoAuthIdentity: skipped,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send emails (with rate limiting)
    for (const user of sendable) {
      try {
        await sendWelcomeBackEmail({
          userName: user.user_name || 'there',
          userEmail: user.user_email,
          agentId: user.agent_id,
          lastTopic: user.last_topic,
          daysSinceLastChat: user.days_since_chat,
        });

        // Log the email
        await supabase.from('email_logs').insert({
          user_id: user.user_id,
          email_type: 'welcome_back',
          recipient: user.user_email,
          status: 'sent',
          metadata: {
            days_inactive: user.days_since_chat,
            last_topic: user.last_topic,
          }
        });

        // Update user's last_email_at
        await supabase
          .from('users')
          .update({ last_email_at: new Date().toISOString() })
          .eq('id', user.user_id);

        results.sent++;
        
        // Rate limit: 1 email per 100ms to avoid hitting Resend limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (emailError) {
        console.error(`[reengagement-emails] Failed for ${user.user_email}:`, emailError);
        results.failed++;
        results.errors.push(`${user.user_email}: ${emailError}`);

        // Log the failure
        await supabase.from('email_logs').insert({
          user_id: user.user_id,
          email_type: 'welcome_back',
          recipient: user.user_email,
          status: 'failed',
          error_message: String(emailError),
        });
      }
    }

    console.log('[reengagement-emails] Complete:', results);

    return NextResponse.json({
      success: true,
      ...results,
    });

  } catch (error) {
    console.error('[reengagement-emails] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
