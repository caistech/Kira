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
