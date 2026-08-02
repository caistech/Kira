#!/usr/bin/env node
//
// Create a real, confirmed account for someone you want to LOOK at Kira — a broker, an accountant,
// an investor — without sending them through checkout.
//
// WHY THIS EXISTS. The question that prompted it was "can I still use a test card for people I just
// want to sign in for a review?" Once Stripe is live, no: test cards are rejected in live mode, the
// two ledgers are entirely separate. But the premise is worth challenging — a reviewer does not need
// a card at all, because **nothing in this product gates access on subscription state**. Middleware
// does not check it, no page redirects on it; it is displayed in Settings and the admin console, and
// the billing cron only touches `active`/`trial`/`trialing`. So an account with no Stripe record
// whatsoever sees the entire product, and the billing machinery correctly ignores it.
//
// That matters beyond convenience: keeping Stripe in TEST mode so that test cards keep working is
// what puts a "Sandbox" badge on the payment page in production. A naive tester called that "the end
// of the conversation". This script removes the last reason to stay in test mode.
//
// NOT A BACKDOOR. It creates a normal Supabase user with a normal password, exactly as a signup
// would, and every guard applies to it afterwards. There is no bypass flag and no privileged route —
// the only thing skipped is the payment, and payment is not what protects anything here.
//
// Usage:
//   node --env-file=.env.local scripts/provision-reviewer.mjs --email name@firm.com --name "Ada"
//   node --env-file=.env.local scripts/provision-reviewer.mjs --email … --name … --password '…'
//
// With no --password one is generated and printed ONCE. It is never written to a file, never
// committed, and never logged anywhere else — copy it into the message you send them and it is gone.

import { randomBytes } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
}

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : undefined;
};

const email = (arg('email') ?? '').trim().toLowerCase();
const firstName = (arg('name') ?? '').trim();
if (!email || !email.includes('@')) {
  console.error('Usage: --email name@firm.com --name "Ada" [--password "…"]');
  process.exit(2);
}

/**
 * Readable rather than maximal.
 *
 * This gets read down a phone line to a 66-year-old, or pasted into an email he then types by hand.
 * A 32-character jumble is more secure in theory and, in practice, is the thing that stops him
 * getting in — at which point he does not report it, he simply does not look at the product.
 */
const password = arg('password') ?? `kira-${randomBytes(4).toString('hex')}-${randomBytes(3).toString('hex')}`;

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// email_confirm:true because mailer_autoconfirm is OFF — this is a real confirmed account, created
// the way an admin creates one, not an account that skips confirmation at sign-in time.
const { data: created, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: firstName ? { first_name: firstName } : {},
});

if (error) {
  const already = /already|registered|exists/i.test(error.message);
  if (!already) throw new Error(`createUser: ${error.message}`);
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
  if (!existing) throw new Error('account exists but could not be found to reset');
  const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  if (updateError) throw new Error(`updateUser: ${updateError.message}`);
  console.log(`[reviewer] ${email} already existed — password reset.`);
} else {
  console.log(`[reviewer] created ${email} (${created.user?.id}).`);
}

// The auth trigger creates the public.users row by email. Set the name there too when we were given
// one: it is baked into the agent's prompt at provision and is what she calls him from then on, so
// letting it fall back to the local part of an email address ("shhahhussain") is a real cost.
if (firstName) {
  const { error: nameError } = await supabase
    .from('users')
    .update({ first_name: firstName.split(' ')[0] })
    .eq('email', email);
  if (nameError) console.warn(`[reviewer] name not set on the app record: ${nameError.message}`);
}

const { data: appUser } = await supabase.from('users').select('id, subscription_status').eq('email', email).maybeSingle();

console.log('');
console.log('  Send them this, then delete it:');
console.log('');
console.log(`    Sign in at   ${process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app'}/login`);
console.log(`    Email        ${email}`);
console.log(`    Password     ${password}`);
console.log('');
console.log(`  No card, no subscription (status: ${appUser?.subscription_status ?? 'none'}), nothing will ever be charged.`);
console.log('  They will be asked for business details on first sign-in — that is the product, not a gate.');
