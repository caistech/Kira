// scripts/send-beta-invite.ts
//
// Send one beta invitation, through the compliant path.
//
//   npx tsx scripts/send-beta-invite.ts --to someone@example.com --code KIRA-7H2K-9QLM --name Craig
//   npx tsx scripts/send-beta-invite.ts --to me@example.com --dry            (prints, sends nothing)
//
// ⚠️ `--dry` EXISTS BECAUSE THE ONLY UNRECOVERABLE MISTAKE HERE IS SENDING. There is no unsend, the
// recipient is a real person we want to impress, and the message goes out under a real ABN. Print
// first, read it, then send.
//
// ⚠️ CONSENT BASIS IS `inferred`, NOT `express`, and that is deliberate. The express basis used
// everywhere else in this product rests on the recipient having ticked the terms box at signup — an
// invitee has no account and has ticked nothing. The honest basis for a cold-but-legitimate
// invitation is a conspicuously-published business address messaged about its function, which the
// Spam Act calls inferred, and which is a different sentence in the footer the reader sees.
//
// This script does NOT mint. Mint with scripts/mint-beta-code.mjs, which binds the code to the
// address; passing a code here that was minted for a different address will produce an email whose
// code does not work for its recipient.

import { config } from 'dotenv';

config({ path: '.env.local' });

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const has = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const to = arg('to');
  const code = arg('code') ?? 'KIRA-0000-0000';
  const name = arg('name') ?? null;
  const introducedBy = arg('via') ?? null;
  const dry = has('dry');

  if (!to) {
    console.error('Usage: --to someone@example.com [--code KIRA-....] [--name Craig] [--via Neil] [--dry]');
    process.exit(1);
  }

  // ⚠️ THE CODE MUST EXIST BEFORE IT IS MAILED. Added 2026-08-15, after this script sent a real
  // invitation carrying a code that was never in the table — and the operator, walking the product,
  // typed it out of the email and was told "That code is not valid."
  //
  // That is the worst shape this path can take. The recipient does exactly the right thing, the
  // message tells him to CHECK IT AGAINST THE EMAIL, he checks, it matches, and the only conclusion
  // available to him is that the product is broken. A real invitee has no second channel: he cannot
  // query the table and does not know a placeholder exists. He tries twice and stops — which is the
  // 2026-08-10 invitation audit repeating in new clothes, eight people who could not get in and
  // never said so.
  //
  // The script already holds a service-role connection. One lookup makes the class impossible, and
  // it runs before --dry too, so a dry run cannot bless a code a real send would fail on.
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const normalised = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const { data: row } = await db
    .from('beta_codes')
    .select('code, email, redeemed_at, revoked_at, expires_at')
    .eq('code', normalised)
    .maybeSingle();

  if (!row) {
    console.error(`
  REFUSING TO SEND: "${code}" is not in beta_codes.
` +
      `  Mint one first:  node --env-file=.env.local scripts/mint-beta-code.mjs --email <address>
`);
    process.exit(1);
  }
  if (row.revoked_at || row.redeemed_at || new Date(row.expires_at) <= new Date()) {
    const why = row.revoked_at ? 'revoked' : row.redeemed_at ? 'already redeemed' : 'expired';
    console.error(`
  REFUSING TO SEND: "${code}" is ${why}. Mint a fresh one.
`);
    process.exit(1);
  }
  // ⚠️ NAMED OUT LOUD, because the account created is the code's BOUND address — not the address
  // this email is going to. Mailing a code to one person that creates an account for another is
  // legitimate for a test and confusing for everyone; it should never be a surprise.
  if (String(row.email).toLowerCase() !== String(to).toLowerCase()) {
    console.log(`  NOTE: this code creates an account for ${row.email}, not for ${to}.`);
  }

  const { betaInviteEmail } = await import('../lib/email/invite');
  const message = betaInviteEmail({
    firstName: name,
    code,
    introducedBy,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app',
  });

  console.log(`\nTo:      ${to}`);
  console.log(`Subject: ${message.subject}\n`);
  console.log(message.text);
  console.log('');

  if (dry) {
    console.log('── --dry: nothing was sent ──\n');
    return;
  }

  const { sendCommercialEmail } = await import('../lib/email/commercial');
  const result = await sendCommercialEmail({
    to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    reason: 'inferred',
  });

  if (result.suppressed) {
    // The suppression store fails CLOSED, so this is also what an unreadable store looks like. Said
    // plainly rather than reported as a success, because "sent" and "skipped" must never blur.
    console.log('── NOT SENT: that address has unsubscribed (or the suppression list was unreadable).\n');
    return;
  }
  console.log(`── Sent. id=${result.id}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
