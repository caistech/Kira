#!/usr/bin/env npx tsx

/**
 * Create (or find) the Australian GST tax rate Kira's checkout applies.
 *
 * Every price in the product is quoted EXCLUSIVE of GST, so the 10% has to exist as a real Stripe
 * Tax Rate and be attached to the subscription — otherwise the invoice carries no GST line and the
 * owner's accountant cannot claim it back, which is the whole reason a business asks.
 *
 * Idempotent: it looks for an active, exclusive 10% AU rate before creating one, so re-running it
 * never litters the account with duplicates. Tax rates cannot be deleted, only archived — which is
 * exactly why this checks first.
 *
 * TEST AND LIVE ARE SEPARATE ACCOUNTS. Run it once per mode with that mode's key and put each id
 * in the matching environment:
 *
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/setup-gst-tax-rate.ts
 *   STRIPE_SECRET_KEY=sk_live_... npx tsx scripts/setup-gst-tax-rate.ts
 *
 * Then set STRIPE_GST_TAX_RATE_ID to the printed id (Vercel: production + preview, type plain —
 * a tax rate id is not a secret).
 */

import path from 'path';

import * as dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const GST_PERCENTAGE = 10;
const COUNTRY = 'AU';

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set (put it in .env.local or pass it inline)');

  const stripe = new Stripe(key, {});
  const mode = key.startsWith('sk_live') ? 'LIVE' : 'test';

  const existing = await stripe.taxRates.list({ active: true, limit: 100 });
  const match = existing.data.find(
    (rate) =>
      rate.country === COUNTRY &&
      rate.percentage === GST_PERCENTAGE &&
      rate.inclusive === false,
  );

  if (match) {
    console.log(`[gst] ${mode}: reusing existing rate`);
    console.log(`STRIPE_GST_TAX_RATE_ID=${match.id}`);
    return;
  }

  const created = await stripe.taxRates.create({
    display_name: 'GST',
    description: 'Australian GST',
    jurisdiction: 'AU',
    country: COUNTRY,
    percentage: GST_PERCENTAGE,
    // Exclusive: the price is pre-tax and the GST is added on top — "$499 + GST", the way it is
    // stated to the owner. Inclusive would silently carve the 10% out of the fee instead.
    inclusive: false,
    tax_type: 'gst',
  });

  console.log(`[gst] ${mode}: created rate`);
  console.log(`STRIPE_GST_TAX_RATE_ID=${created.id}`);
}

main().catch((error) => {
  console.error('[gst] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
