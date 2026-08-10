// Invite a named owner whose account already exists.
//
// WHY THIS EXISTS. Kira has self-signup and an introducer invite (advisors, a different flow) and
// nothing in between — so provisioning an owner is silent, and the person has no idea. That is fine
// for two people and a real gap the moment a distributor expects to add end users and have them told.
//
// IT DOES NOT SEND A MAGIC LINK. `mailer_otp_exp` is 3600s, so a link emailed now is dead in an hour
// — and an invitation is read when the recipient gets to it, not when it is sent. A dead link in a
// first contact is worse than no link, because it reads as the product being broken before he has
// seen it. The instruction (open /login, use Forgot password) never expires, so that leads.
//
// IT NAMES WHO IT IS FROM IN THE FIRST LINE. The mail arrives from a domain the recipient has never
// seen — updates.corporateaisolutions.com is the only Resend-verified sender, and cannot be his own
// until a paid plan allows a second domain. An unexplained "your account is ready" from an unknown
// domain is the exact shape of a phishing mail, so the person who actually sent it is named before
// anything is asked of the reader.
//
//   node --env-file=.env.local scripts/send-owner-invite.mjs --email x@y.com --name Will   # preview
//   node --env-file=.env.local scripts/send-owner-invite.mjs --email x@y.com --name Will --send

import { createClient } from '@supabase/supabase-js';
import { createEmailSender } from '@caistech/email-send';
import { senderFromEnv } from '@caistech/email-compliance';

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};

const SEND = process.argv.includes('--send');
const email = (arg('email') || '').trim().toLowerCase();
const name = arg('name', '');
const fromWho = arg('from', 'Dennis');
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://kiraexec.com').replace(/\/$/, '');
if (!email) throw new Error('--email is required');

// REFUSE TO INVITE SOMEONE WHO HAS NO ACCOUNT. The whole message says "your account is already
// there"; sending it to an address with nothing behind it walks the reader into a dead end and is
// exactly the failure the never-invited introducer page was fixed for earlier today.
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const { data: appUser } = await db.from('users').select('id, auth_user_id').eq('email', email).maybeSingle();
if (!appUser) throw new Error(`no account for ${email} — run scripts/onboard-tester.mjs first`);
if (!appUser.auth_user_id) throw new Error(`${email} has no auth_user_id — it would sign in and then not exist`);

const greeting = name ? `Hi ${name},` : 'Hi,';
const html = `
<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1c1917;max-width:560px">
  <p>${greeting}</p>
  <!-- SAY WHAT IT IS IN THE FIRST TWO LINES, IN HIS WORDS.
       A boomer owner read the full material on 2026-08-05 and came back with "I am not even sure
       what the product is — you are going to need to distil all of that down to a level a baby
       boomer can understand." He is the buyer. If he cannot say what it does after reading
       everything, no amount of access helps, and an invitation that opens "this is the thing I've
       been building" assumes exactly the knowledge he has just told us he does not have.
       No "AI", no "agent", no "platform". Two sentences: what it does today, and why it pays. -->
  <p>${fromWho} here. Short version: it's an assistant you talk to while you work — it finds your
     files, drafts your quotes and emails, and keeps track of what's still outstanding.</p>
  <p>While it does that, it writes down how you actually run the business — your pricing, your
     clients, the judgement calls only you make. That matters because when you come to sell, a
     business that only works because you're in it is worth a lot less than one someone else could
     pick up and run.</p>
  <p>I've set up an account for you, so you don't need to sign up for anything.</p>
  <p><strong>To get in:</strong></p>
  <ol>
    <li>Go to <a href="${appUrl}/login" style="color:#be123c">${appUrl}/login</a></li>
    <li>Click <strong>Forgot password</strong> and put in this email address</li>
    <li>It'll send you a link to set your own password, and you're in</li>
  </ol>
  <p><strong>Worth doing on your phone.</strong> Open <a href="${appUrl}" style="color:#be123c">${appUrl}</a>
     on your mobile and add it to your home screen — on Android it'll offer to install it, on an
     iPhone you tap Share then "Add to Home Screen". It opens straight to the microphone, which is
     how it's actually meant to be used.</p>
  <p>She'll ask about the business first, then you just talk to her the way you'd talk to someone who
     works for you — find me that file, draft a follow-up, what's still outstanding. She reads
     anything back to you and waits for your yes before it goes out.</p>
  <p><strong>It's early and you'll find rough edges — that's the point of you being in there.</strong>
     There's a "Report a problem" button in the corner of every screen, which comes straight to me
     with the page attached. Anything you'd rather say properly, just reply to this email.</p>
  <p>Thanks for having a look.</p>
  <p>${fromWho}</p>
</div>`.trim();

console.log(`[invite] ${SEND ? 'SENDING' : 'PREVIEW'} to ${email}`);
console.log(`  account   : ${appUser.id} (bridged)`);
console.log(`  app url   : ${appUrl}`);
console.log(`  reply-to  : ${senderFromEnv().email}`);
console.log(`\n${html.replace(/<[^>]+>/g, '').replace(/\n\s*\n/g, '\n').trim()}\n`);

if (!SEND) {
  console.log('[invite] preview only — re-run with --send');
  process.exit(0);
}

// STRIP HTML COMMENTS BEFORE SENDING. They are not rendered and they ARE delivered — one click of
// "show original" in Gmail and the reader has the source. The first send of this script shipped an
// internal note quoting another owner's private feedback by description, into a third party's inbox.
// Nothing in the template should reach a recipient that was not written for him, and the only safe
// assumption is that a comment in an email body will eventually be read.
const wireHtml = html.replace(/<!--[\s\S]*?-->/g, '').replace(/\n\s*\n\s*\n/g, '\n\n');

const sender = senderFromEnv();
const result = await createEmailSender({ sender }).send({
  to: email,
  subject: `${fromWho} has set you up on Kira`,
  html: wireHtml,
  replyTo: sender.email,
  // Transactional in character: his account exists and this tells him how to reach it. It carries
  // the identification footer (entity, ABN, address) and no unsubscribe — you do not unsubscribe
  // from being told your own account is ready.
  compliance: { transactional: true },
});
console.log(`[invite] sent — id ${result?.id ?? '(none returned)'}`);

// RECORD IT, because not recording it is what made this whole class of problem invisible.
//
// On 2026-08-10 three people — a business broker among them — were found holding accounts with no
// sign-in, and nothing anywhere could answer "was this person ever actually invited?" The script
// mailed them and forgot. The only trace was `auth.users.recovery_sent_at` from a DIFFERENT
// mechanism, and reading that wrongly is how you conclude someone ignored you when in fact you sent
// them a link that expired within the hour.
//
// Fail-soft: the mail has already gone, and failing here would report a send that happened as a
// send that did not.
try {
  await db.from('users').update({ last_email_at: new Date().toISOString() }).eq('id', appUser.id);
  await db.from('email_logs').insert({
    user_id: appUser.id,
    email_type: 'owner_invite',
    recipient: email,
    status: 'sent',
    metadata: { app_url: appUrl, from: fromWho, provider_id: result?.id ?? null },
  });
  console.log('[invite] recorded in email_logs');
} catch (recordError) {
  console.error('[invite] SENT but not recorded — the mail went, the trail did not:', recordError);
}
