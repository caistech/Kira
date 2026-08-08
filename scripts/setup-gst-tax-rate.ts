#!/usr/bin/env npx tsx

/**
 * Create (or find) the Australian GST rate that Kira's checkout applies.
 *
 * WHY THIS EXISTS. Every price surface in the product quotes tax-EXCLUSIVE and says so — "$999 +
 * GST" — and for a long time nothing anywhere in the system would ever have added the 10% to an
 * invoice. The suffix was a claim with no capability behind it. That failure is invisible from the
 * outside in the worst possible way: checkout succeeds, the payment succeeds, and only the invoice
 * is wrong. Nobody notices at the time. The owner's accountant notices, later, when there is no GST
 * to claim back — which is the whole reason a business asks whether a price includes it.
 *
 * WHAT IT CREATES. Standard Australian GST: 10%, EXCLUSIVE (added on top of the quoted price, not
 * carved out of it), tax_type `gst`, jurisdiction AU. Exclusive is the half that must not be got
 * wrong — inclusive on a $999 quote would silently reduce the fee to $908.18 and hand the
 * difference to the ATO out of our own margin, while every screen still read "$999 + GST".
 *
 * IDEMPOTENT. It looks for an active, exclusive, 10% AU rate before creating one. This is not
 * politeness: Stripe Tax Rates CANNOT BE DELETED, only archived, so a script that created blindly
 * would leave a permanent trail of near-identical rates and no way to tell which one is live.
 *
 * TEST AND LIVE ARE SEPARATE ACCOUNTS WITH SEPARATE OBJECTS. A tax rate id from test mode does not
 * exist in live and fails at checkout, in front of a buyer. So run this ONCE PER MODE and put each
 * id in its own variable — the same shape lib/billing/stripe-mode.ts uses for keys, for the same
 * reason.
 *
 *   npx tsx scripts/setup-gst-tax-rate.ts                      # test  → STRIPE_GST_TAX_RATE_ID_TEST
 *   STRIPE_LIVE_MODE=true npx tsx scripts/setup-gst-tax-rate.ts # live  → STRIPE_GST_TAX_RATE_ID_LIVE
 *
 * Then set the printed variable in .env.local and Vercel (production + preview, type `plain` — a
 * tax rate id is not a secret). Until it is set, lib/billing/tax.ts applies no tax and
 * app/api/checkout/route.ts says so in the copy rather than quoting a GST it will not charge.
 */

import path from 'path';

import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// These two imports sit BELOW the dotenv.config() call above, and the order is load-bearing rather
// than untidy: stripe-mode resolves the key when getStripe() is called, but keeping the config call
// first makes it obvious that .env.local has to be populated before anything reads it. Do not hoist
// them to the top of the file to satisfy a formatter.
import { getStripe, stripeMode } from '../lib/billing/stripe-mode';
import { GST_COUNTRY, GST_PERCENTAGE, gstTaxRateEnvVar } from '../lib/billing/tax';

async function main() {
  const mode = stripeMode();
  const stripe = getStripe();
  const envVar = gstTaxRateEnvVar(mode);

  console.log(`\n[gst] Stripe mode: ${mode.toUpperCase()}`);

  // `list` returns at most 100. A workspace with more than 100 ACTIVE tax rates would need
  // pagination — but that is itself a sign something is creating them in a loop, so it is worth
  // saying out loud rather than silently paging past the problem.
  const existing = await stripe.taxRates.list({ active: true, limit: 100 });
  if (existing.has_more) {
    console.warn(
      `[gst] WARNING: more than 100 active tax rates exist. This checked only the first 100, so it ` +
        `may create a duplicate. Archive the ones you do not use before relying on this.`,
    );
  }

  const match = existing.data.find(
    (rate) =>
      rate.country === GST_COUNTRY &&
      rate.percentage === GST_PERCENTAGE &&
      rate.inclusive === false,
  );

  if (match) {
    console.log(`[gst] Reusing the existing rate — nothing created.`);
    console.log(`\n${envVar}=${match.id}\n`);
    return;
  }

  const created = await stripe.taxRates.create({
    display_name: 'GST',
    description: 'Australian GST',
    jurisdiction: 'AU',
    country: GST_COUNTRY,
    percentage: GST_PERCENTAGE,
    // EXCLUSIVE. The quoted price is pre-tax and the GST is added on top, which is what "+ GST"
    // means and what every surface in the product already promises. Inclusive would carve the 10%
    // out of the fee instead — same invoice total, less revenue, and the screens would still say
    // "+ GST".
    inclusive: false,
    tax_type: 'gst',
  });

  console.log(`[gst] Created a new rate.`);
  console.log(`\n${envVar}=${created.id}\n`);
  console.log(
    `Set that in .env.local and in Vercel (production + preview, type "plain"). Tax rates cannot be ` +
      `deleted once created — only archived — so re-running this reuses the one above rather than ` +
      `making another.`,
  );
}

main().catch((error) => {
  console.error('[gst] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
