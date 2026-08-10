// A one-off apology to the people whose accounts never worked.
//
// WHY THIS EXISTS AND WHY IT IS NOT A TEMPLATE. Two people signed up in January and February 2026,
// were given a thirty-day trial and a provisioned agent, and never had an auth identity created —
// so neither has ever been able to sign in. Both trials expired unused, and the re-engagement cron
// went on inviting them back until 2026-08-10. This says sorry and asks whether they would like to
// look again. It is deliberately hardcoded to those two people rather than generalised: a script
// that can apologise to anybody is a script that will one day apologise to everybody.
//
// COMMERCIAL, NOT TRANSACTIONAL. It says sorry AND asks them to look at the product, which makes it
// a commercial electronic message under the Spam Act however kindly it is worded. So it carries the
// identification footer AND a working unsubscribe, and states the consent basis. `send-owner-invite`
// is transactional and correctly has no unsubscribe; this one is not, and the difference is not a
// matter of tone.
//
// ⚠️ JURISDICTION. Carmen's address is Spanish. The portfolio rule is Australia-only for commercial
// email until a country's rules are implemented, and `assertJurisdictionAllowed` is wired NOWHERE in
// this repo — so nothing here would stop it. The recipient's country is printed in the preview so
// the decision is made with eyes open rather than by omission. Operator authorised 2026-08-10.
//
//   node --env-file=.env.local scripts/send-apology.mjs            # preview both
//   node --env-file=.env.local scripts/send-apology.mjs --send     # actually send

import { createClient } from '@supabase/supabase-js';
import { createEmailSender } from '@caistech/email-send';
import { senderFromEnv } from '@caistech/email-compliance';

const SEND = process.argv.includes('--send');
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://kiraexec.com').replace(/\/$/, '');

const LETTERS = [
  {
    email: 'andrew@aerion.com.au',
    greeting: 'Andrew',
    country: 'AU',
    when: 'in February',
    ago: 'about six months',
    monthWord: 'February',
  },
  {
    email: 'carme.plasencia@aromics.es',
    greeting: 'Carmen',
    country: 'ES  ⚠️ non-AU — outside the portfolio jurisdiction rule',
    when: 'in January',
    ago: 'about seven months',
    monthWord: 'January',
  },
];

const body = (l) =>
  `
<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1c1917;max-width:560px">
  <p>${l.greeting},</p>
  <p>I owe you an apology, and it is overdue by ${l.ago}.</p>
  <p>You signed up to Kira ${l.when}. What you should have got was a login and thirty days to try it.
     What you actually got was an account with no way to sign in — we created your profile, started
     your trial and set up your assistant, and the one step that would have let you through the door
     was never done. The trial then ran its course and expired without you ever being able to open
     it.</p>
  <p>I only found this going back through every account we have ever created. Worse, our system has
     gone on sending you the occasional email since, inviting you back to something you could not get
     into. I have stopped that.</p>
  <p>We have shifted direction somewhat since ${l.monthWord}, and the product is a good deal clearer
     than the one you signed up for. If you would like to see what it is now, it is at
     <a href="${appUrl}">${appUrl.replace(/^https:\/\//, '')}</a> — there is a short valuation tool on
     the front that needs no account and takes about three minutes.</p>
  <p>If any of it looks useful, tell me and I will set your account up properly myself, and check it
     works before I hand it over. If it is not for you, that is entirely fair, and you will not hear
     from us again.</p>
  <p>Either way — sorry. You gave us your time ${l.when} and we wasted it.</p>
  <p>Dennis</p>
</div>`.trim();

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const sender = senderFromEnv();
const mailer = createEmailSender({ sender });

for (const letter of LETTERS) {
  const { data: appUser } = await db.from('users').select('id, auth_user_id').eq('email', letter.email).maybeSingle();

  console.log('='.repeat(72));
  console.log(`${SEND ? 'SENDING' : 'PREVIEW'} → ${letter.email}`);
  console.log(`  country   : ${letter.country}`);
  console.log(`  account   : ${appUser ? appUser.id : 'NO users ROW'}`);
  console.log(`  can log in: ${appUser?.auth_user_id ? 'yes' : 'no — this is what we are apologising for'}`);
  console.log(`  reply-to  : ${sender.email}`);
  console.log(`\n${body(letter).replace(/<[^>]+>/g, '').replace(/\n\s*\n/g, '\n').trim()}\n`);

  if (!SEND) continue;

  // Strip HTML comments before the wire. They are not rendered and they ARE delivered — one click
  // of "show original" and the reader has the source. This template has none today; the strip stays
  // because a later edit will, and the first send of send-owner-invite.mjs shipped exactly that.
  const wireHtml = body(letter).replace(/<!--[\s\S]*?-->/g, '');

  const result = await mailer.send({
    to: letter.email,
    subject: 'An apology — your Kira account never actually worked',
    html: wireHtml,
    replyTo: sender.email,
    compliance: {
      unsubscribeUrl: `${appUrl}/unsubscribe`,
      reason: `You are receiving this because you signed up for a Kira account ${letter.when} 2026 and opted in to hear from us. If you would rather not, the link below stops it for good.`,
    },
  });

  if (appUser?.id) {
    await db.from('users').update({ last_email_at: new Date().toISOString() }).eq('id', appUser.id);
    await db.from('email_logs').insert({
      user_id: appUser.id,
      email_type: 'apology_account_never_worked',
      recipient: letter.email,
      status: 'sent',
      metadata: { reason: 'no auth identity was ever created; trial expired unused' },
    });
  }
  console.log(`  sent — id ${result?.id ?? '(none returned)'}`);
}

if (!SEND) console.log('\npreview only — re-run with --send');
