#!/usr/bin/env node
//
// Turn OFF cancellation in the Stripe billing portal, so the only way to cancel is the one that
// honours the waiver.
//
// WHY THIS IS NECESSARY, not tidying. Kira bills in arrears and promises the month you are in is
// never billed (lib/billing/arrears.ts). Our own /api/billing/cancel keeps that promise by passing
// `invoice_now: false`. The Stripe portal's cancel does not and cannot: it either ends the
// subscription at period end — so the period completes and IS invoiced — or ends it immediately and
// invoices the accrued month. Both leave the owner holding a bill for a month we said was on us.
//
// Two doors, one of which breaks the promise, is not a promise. This closes the other door.
//
// The portal keeps everything it is genuinely good at — card updates, invoice history, billing
// address — and Settings carries the cancel button.
//
// RUN IT ONCE PER MODE. Test-mode and live-mode portals are separate configurations, so doing this
// in test does nothing for live. It MUST be run against live before STRIPE_LIVE_MODE is switched on.
//
//   node scripts/configure-billing-portal.mjs            # whichever mode the env selects
//   node scripts/configure-billing-portal.mjs --dry-run  # print what would change
//
// Reversible in one dashboard click if it is ever wrong.

import fs from 'node:fs';
import path from 'node:path';

import Stripe from 'stripe';

// Load .env.local the way the app does, without adding a dependency to the script.
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const dryRun = process.argv.includes('--dry-run');
const live = process.env.STRIPE_LIVE_MODE === 'true';
const key = live
  ? process.env.STRIPE_SECRET_KEY_LIVE
  : (process.env.STRIPE_SECRET_KEY_TEST ?? process.env.STRIPE_SECRET_KEY);

if (!key) {
  console.error(`No Stripe secret key for ${live ? 'LIVE' : 'TEST'} mode. Nothing done.`);
  process.exit(1);
}
if (live && !key.startsWith('sk_live')) {
  console.error('STRIPE_LIVE_MODE is true but the key is not a live key. Refusing to guess.');
  process.exit(1);
}
if (!live && key.startsWith('sk_live')) {
  console.error('A LIVE key is in the test slot. Refusing to run — see lib/billing/stripe-mode.ts.');
  process.exit(1);
}

const stripe = new Stripe(key, {});

console.log(`[portal] mode: ${live ? 'LIVE' : 'TEST'}${dryRun ? ' (dry run)' : ''}`);

const configurations = await stripe.billingPortal.configurations.list({ limit: 10 });
const target = configurations.data.find((c) => c.is_default) ?? configurations.data[0];

if (!target) {
  console.error(
    'No billing portal configuration exists yet. Open the portal once (Settings → Manage billing) ' +
      'so Stripe creates the default, then re-run.',
  );
  process.exit(1);
}

console.log(`[portal] configuration ${target.id}`);
console.log(`[portal] subscription_cancel currently: ${target.features?.subscription_cancel?.enabled}`);

if (target.features?.subscription_cancel?.enabled === false) {
  console.log('[portal] already disabled — nothing to do.');
  process.exit(0);
}

if (dryRun) {
  console.log('[portal] would disable subscription_cancel. Re-run without --dry-run to apply.');
  process.exit(0);
}

const updated = await stripe.billingPortal.configurations.update(target.id, {
  features: { subscription_cancel: { enabled: false } },
});

console.log(`[portal] subscription_cancel now: ${updated.features?.subscription_cancel?.enabled}`);
console.log('[portal] Cancellation now happens only through /api/billing/cancel, which waives the month.');
