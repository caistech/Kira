// scripts/send-beta-invite.ts
import { Command } from 'commander';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { confirm } from '@inquirer/prompts';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const program = new Command();

interface BetaTester {
  email: string;
  name: string;
  code: string;
  group: 'A' | 'B' | 'C';
  beta_type?: 'superadmin' | 'user';
  trial_started_at?: string | null;
  usage_count?: number;
  last_email_sent?: string | null;
}

// ---------------------------------------------------------------------------
// REAL BETA CODE MINTING
//
// A beta code only exists if it is a row in the `beta_codes` table, bound to a
// specific email. A code that lives only in `data/beta-testers.json` is a
// placeholder — it cannot be redeemed because redemption validates against the
// database.
//
// Before sending an invitation, mint a real code for the recipient so the link
// in the email actually works. Reuse an existing unredeemed, unrevoked,
// unexpired code for the same email if one already exists (idempotency), so
// re-running the script does not spam duplicate codes.
// ---------------------------------------------------------------------------

const BETA_ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789'; // no O/0, I/1, S/5
const BETA_DEFAULT_DAYS = 45;

function generateBetaCode(length = 12): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i += 1) out += BETA_ALPHABET[bytes[i] % BETA_ALPHABET.length];
  return out;
}

function groupBetaCode(code: string): string {
  return (code.match(/.{1,4}/g) ?? []).join('-');
}

function betaDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (via .env.local).');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Ensure a real, redeemable beta code exists for the given email.
 *
 * Returns the stored code (reused if an open one already exists, otherwise a
 * freshly minted row). Never returns a placeholder from the JSON file.
 */
async function ensureMintedBetaCode(
  email: string,
  label: string,
  betaType: 'superadmin' | 'user' = 'user',
): Promise<{ code: string; reused: boolean }> {
  const db = betaDatabase();

  const { data: existing, error: findError } = await db
    .from('beta_codes')
    .select('code, expires_at, redeemed_at, revoked_at, beta_type')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1);

  if (findError) throw findError;

  const open = existing?.[0];
  const now = new Date();
  if (
    open &&
    !open.redeemed_at &&
    !open.revoked_at &&
    new Date(open.expires_at) > now
  ) {
    return { code: open.code, reused: true };
  }

  // Reuse the JSON placeholder value if and only if it is already a genuine
  // row in the table AND still open (handled above). Otherwise mint fresh.
  const code = generateBetaCode();
  const expires = new Date(now.getTime() + BETA_DEFAULT_DAYS * 24 * 60 * 60 * 1000);

  const { error: insertError } = await db.from('beta_codes').insert({
    code,
    email,
    label: label || null,
    beta_type: betaType || 'user',
    expires_at: expires.toISOString(),
    created_by: process.env.USERNAME || 'send-beta-invite.ts',
  });
  if (insertError) throw insertError;

  return { code, reused: false };
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function getBetaTesters(): Promise<BetaTester[]> {
  try {
    // Read testers from a JSON file instead of database
    const filePath = path.join(__dirname, '..', 'data', 'beta-testers.json');
    if (!fs.existsSync(filePath)) {
      throw new Error(`Tester data file not found at ${filePath}`);
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const testersData = JSON.parse(rawData);

    return testersData.map((tester: any) => {
      // The registry migrated from a single `name` to mandatory `firstName`/`lastName`.
      // Compose the salutation from those, falling back to the email prefix only if both
      // are absent — never a stale combined `name` field.
      const first = tester.firstName?.trim() ?? '';
      const last = tester.lastName?.trim() ?? '';
      const name = [first, last].filter(Boolean).join(' ').trim() || (tester.name?.trim() ?? '') || tester.email.split('@')[0];
      return {
        email: tester.email,
        name,
        code: tester.code,
        group: tester.group || 'C', // Default to Group C if not specified
        trial_started_at: tester.trial_started_at || null,
        usage_count: tester.usage_count || 0,
        last_email_sent: tester.last_email_sent || null,
      };
    });
  } catch (error) {
    console.error('Error fetching beta testers:', error);
    throw error;
  }
}

async function sendEmail(to: string, subject: string, body: string, dryRun: boolean, maxRetries = 3) {
  const mailOptions = {
    from: '"Dennis McMahon" <dennis@corporateaisolutions.com>',
    to,
    subject,
    text: body,
    html: body.replace(/\n/g, '<br>'),
  };

  if (dryRun) {
    console.log(`[DRY RUN] Would send email to ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}\n`);
    return true;
  }

  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${to}`);
      return true;
    } catch (error) {
      lastError = error;
      attempt++;
      console.warn(`Attempt ${attempt} failed for ${to}:`, error instanceof Error ? error.message : String(error));

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${delay/1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`Failed to send email to ${to} after ${maxRetries} attempts. Last error:`, lastError instanceof Error ? lastError.message : String(lastError));
  return false;
}

function createEmailContent(tester: BetaTester): { subject: string; body: string } {
  const baseUrl = 'https://kiraexec.com/?code=';


  if (tester.group === 'A') {
      return {
      subject: 'About Kira — Your feedback would mean a lot',
      body: `Hi ${tester.name},
      
      
      
I noticed you've been using Kira since {trial_started_at}. That's great to see!

What I most want from you at this point: does she stop on something a buyer would stop on? If you tell her one man does all the pricing, or that one customer is forty per cent of revenue on a handshake, a good adviser would interrupt. That is the failure I am least confident about.

If you have any thoughts or suggestions about how Kira could be even better, I'd love to hear them. Your feedback helps make Kira more valuable for everyone.

No rush — your access continues to work for the next few weeks.

Dennis

Sent by Corporate AI Solutions (ABN 54 672 395 685), 76-84 Brunswick Street, Fortitude Valley QLD 4006 · dennis@corporateaisolutions.com
You are receiving this because you agreed to look at Kira. Reply with "stop" and I will not contact you about it again.      
  }
      
  )

  if (tester.group === 'B') {
    return {
      subject: 'Kira — the path you took was broken, and here is the fixed one',
      body: \`Hi ${tester.name},

Short note, because I owe you an apology.

You tried to use your beta code last week and hit a bug. The pricing page offered two "no card" options — one for beta testers (correct) and one for general signups (wrong). The second one was more visible than the first. You took the sensible path, and it bypassed the entire beta setup.

That is my fault, not yours. The page has now been fixed — there is only one path for beta testers now, and it carries your code in the link.

Here is the working link: ${baseUrl}${tester.code}

Click it, answer the thirteen questions (about three minutes), and at the end you set a password and go straight in. No card, nothing to type, no confusion.

What I most want from you at this point: does she stop on something a buyer would stop on? If you tell her one man does all the pricing, or that one customer is forty per cent of revenue on a handshake, a good adviser would interrupt. That is the failure I am least confident about.

Thank you for your patience with this. You found a real bug and I have fixed it for everyone who comes after you.

Dennis

Sent by Corporate AI Solutions (ABN 54 672 395 685), 76-84 Brunswick Street, Fortitude Valley QLD 4006 · dennis@corporateaisolutions.com
You are receiving this because you agreed to look at Kira. Reply with "stop" and I will not contact you about it again.`
    };
  } else if (tester.group === 'C') {
    let usageInfo = '';
    if (tester.usage_count && tester.usage_count > 0) {
      usageInfo = `\n\nBy the way, we noticed you've been active ${tester.usage_count} times since your trial started. That's great to see!`;
    }

    return {
      subject: 'Kira — Would you like to be a beta tester?',
      body: `Hi ${tester.name},

I'm reaching out because I'd love to have you try Kira, our AI-powered business valuation assistant. Kira helps owners get their businesses valued by talking to them about their business, pricing, customers, and more.

This is a beta program, which means:
1. You'll get early access to Kira
2. You'll help shape the product
3. You'll get a chance to influence how Kira develops

If you're interested in being a beta tester, please reply to this email with "YES". I'll then send you a special link to get started.

What Kira is for:
Most owner-run businesses are worth less than the owner thinks, because the pricing, the judgement, the relationships all live in one man's head. A buyer is not buying an asset, he is buying a job — and he prices it accordingly.

Kira's whole job is to get that knowledge out of his head and onto paper, by talking to him. The deliverable is a handover document in the nine areas a buyer's advisor works through. His to keep whether or not he keeps paying us.

If you're not interested right now, that's okay too. You can reply with "NO" and I won't contact you again about Kira.

Dennis

Sent by Corporate AI Solutions (ABN 54 672 395 685), 76-84 Brunswick Street, Fortitude Valley QLD 4006 · dennis@corporateaisolutions.com
You are receiving this because you agreed to look at Kira. Reply with "stop" and I will not contact you about it again.`
    };
  } else {
    // Group A - no email needed
    return { subject: '', body: '' };
  }
}

async function sendBetaInvites(dryRun: boolean = true) {
  try {
    const testers = await getBetaTesters();
    const results = {
      sent: 0,
      skipped: 0,
      errors: 0,
      groupA: 0,
      groupB: 0,
      groupC: 0,
      dryRun: dryRun
    };

    console.log('\nBeta Tester Summary:');
    console.log('--------------------');

    // Group A: Successfully redeemed
    const groupA = testers.filter(t => t.group === 'A');
    console.log(`\nGROUP A: Successfully redeemed (${groupA.length})`);
    groupA.forEach(tester => {
      console.log(`- ${tester.name} <${tester.email}> (Code: ${tester.code})`);
      console.log(`  Trial Started: ${tester.trial_started_at || 'Never'}`);
      console.log(`  Usage Count: ${tester.usage_count}`);
      results.groupA++;
      results.skipped++;
    });

    // Group B: Bug victims
    const groupB = testers.filter(t => t.group === 'B');
    console.log(`\nGROUP B: Bug victims (${groupB.length})`);
    groupB.forEach(tester => {
      console.log(`- ${tester.name} <${tester.email}> (Code: ${tester.code})`);
      console.log(`  Last Email Sent: ${tester.last_email_sent || 'Never'}`);
    });

    // Group C: Never tried
    const groupC = testers.filter(t => t.group === 'C');
    console.log(`\nGROUP C: Never tried (${groupC.length})`);
    groupC.forEach(tester => {
      console.log(`- ${tester.name} <${tester.email}> (Code: ${tester.code})`);
      console.log(`  Last Email Sent: ${tester.last_email_sent || 'Never'}`);
    });

    console.log('\nSummary:');
    console.log(`- Total testers: ${testers.length}`);
    console.log(`- Group A: ${groupA.length}`);
    console.log(`- Group B: ${groupB.length}`);
    console.log(`- Group C: ${groupC.length}`);

    if (dryRun) {
      console.log('\nThis is a DRY RUN. No emails will actually be sent.');
      console.log('Run with --send to actually send emails.');
      return;
    }

    // Confirm before sending
    const shouldSend = await confirm({
      message: `Are you sure you want to send emails to ${groupB.length} Group B and ${groupC.length} Group C testers?`,
      default: false
    });

    if (!shouldSend) {
      console.log('Email sending cancelled.');
      return;
    }

    // Send emails to Group B
    for (const tester of groupB) {
      try {
        const { code: realCode, reused } = await ensureMintedBetaCode(
          tester.email,
          `${tester.name || ''} — via send-beta-invite`,
          tester.beta_type ?? 'user',
        );
        tester.code = realCode;
        if (!reused) {
          console.log(`  Minted real code ${groupBetaCode(realCode)} for ${tester.email}`);
        }
      } catch (error) {
        console.error(
          `Skipping ${tester.email}: could not mint beta code —`,
          error instanceof Error ? error.message : String(error),
        );
        results.errors++;
        continue;
      }

      const { subject, body } = createEmailContent(tester);
      if (subject && body) {
        const success = await sendEmail(tester.email, subject, body, dryRun);
        if (success) {
          results.sent++;
          results.groupB++;
        } else {
          results.errors++;
        }
      } else {
        results.skipped++;
      }
    }

    // Send emails to Group C
    for (const tester of groupC) {
      try {
        const { code: realCode, reused } = await ensureMintedBetaCode(
          tester.email,
          `${tester.name || ''} — via send-beta-invite`,
          tester.beta_type ?? 'user',
        );
        tester.code = realCode;
        if (!reused) {
          console.log(`  Minted real code ${groupBetaCode(realCode)} for ${tester.email}`);
        }
      } catch (error) {
        console.error(
          `Skipping ${tester.email}: could not mint beta code —`,
          error instanceof Error ? error.message : String(error),
        );
        results.errors++;
        continue;
      }

      const { subject, body } = createEmailContent(tester);
      if (subject && body) {
        const success = await sendEmail(tester.email, subject, body, dryRun);
        if (success) {
          results.sent++;
          results.groupC++;
        } else {
          results.errors++;
        }
      } else {
        results.skipped++;
      }
    }

    console.log('\nEmail sending summary:');
    console.log(`- Total testers: ${testers.length}`);
    console.log(`- Emails sent: ${results.sent}`);
    console.log(`- Group A (no email): ${results.groupA}`);
    console.log(`- Group B (bug victims): ${results.groupB}`);
    console.log(`- Group C (never tried): ${results.groupC}`);
    console.log(`- Skipped: ${results.skipped}`);
    console.log(`- Errors: ${results.errors}`);

    console.log('\nEmail sending process completed');
  } catch (error) {
    console.error('Error in sendBetaInvites:', error);
  }
}

// Command line interface
program
  .command('send')
  .description('Send beta tester invites')
  .option('--dry-run', 'Show what would be sent without actually sending')
  .action(async (options) => {
    await sendBetaInvites(!options.dryRun);
  });

program
  .command('check-status')
  .description('Check the status of beta testers')
  .action(async () => {
    try {
      const testers = await getBetaTesters();

      console.log('Beta Tester Status Report:');
      console.log('---------------------------');

      // Group A: Successfully redeemed
      const groupA = testers.filter(t => t.group === 'A');
      console.log(`\nGROUP A: Successfully redeemed (${groupA.length})`);
      groupA.forEach(tester => {
        console.log(`- ${tester.name} <${tester.email}> (Code: ${tester.code})`);
        console.log(`  Trial Started: ${tester.trial_started_at || 'Never'}`);
        console.log(`  Usage Count: ${tester.usage_count}`);
      });

      // Group B: Bug victims
      const groupB = testers.filter(t => t.group === 'B');
      console.log(`\nGROUP B: Bug victims (${groupB.length})`);
      groupB.forEach(tester => {
        console.log(`- ${tester.name} <${tester.email}> (Code: ${tester.code})`);
        console.log(`  Last Email Sent: ${tester.last_email_sent || 'Never'}`);
      });

      // Group C: Never tried
      const groupC = testers.filter(t => t.group === 'C');
      console.log(`\nGROUP C: Never tried (${groupC.length})`);
      groupC.forEach(tester => {
        console.log(`- ${tester.name} <${tester.email}> (Code: ${tester.code})`);
        console.log(`  Last Email Sent: ${tester.last_email_sent || 'Never'}`);
      });

      console.log('\nSummary:');
      console.log(`- Total testers: ${testers.length}`);
      console.log(`- Group A: ${groupA.length}`);
      console.log(`- Group B: ${groupB.length}`);
      console.log(`- Group C: ${groupC.length}`);
    } catch (error) {
      console.error('Error checking status:', error);
    }
  });

program.parse(process.argv);

