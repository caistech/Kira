-- Billing periods reported to Stripe's meter.
--
-- Kira bills in ARREARS: the month is owed from day one and invoiced when the period closes. That
-- is a metered subscription, and a metered subscription bills whatever usage was reported before
-- the period shut. Two failures follow, and they are opposites:
--
--   report nothing  → the invoice is $0 and nobody is billed, against a subscription that looks
--                     completely healthy from every screen in Stripe.
--   report twice    → the owner is billed double for a month.
--
-- Stripe's own meter-event `identifier` dedupes retries, but only over a rolling window of "at
-- least 24 hours" — long enough for a webhook retry storm, nowhere near a billing period. Two
-- `customer.subscription.updated` events three days apart inside the same period would both pass
-- that window and sum to two units. So the durable record of "this period has been reported" has
-- to be ours.
--
-- The row is claimed BEFORE the report is sent and deleted if the send fails, so a crash between
-- the two leaves no claim behind — the same release-on-failure shape the webhook idempotency
-- ledger uses, and for the same reason: a stuck claim silently stops billing.

create table if not exists public.billing_periods_reported (
  id uuid primary key default gen_random_uuid(),
  stripe_subscription_id text not null,
  -- The period's END, which is what identifies it uniquely per subscription and is the one field
  -- every Stripe event about that period agrees on.
  period_end timestamptz not null,
  stripe_customer_id text,
  -- Null until the meter event is accepted. A row with a claim and no reported_at is a send that
  -- failed or is in flight, and is the thing to look at when an invoice comes out at $0.
  reported_at timestamptz,
  created_at timestamptz not null default now(),
  unique (stripe_subscription_id, period_end)
);

create index if not exists billing_periods_reported_subscription_idx
  on public.billing_periods_reported (stripe_subscription_id, period_end desc);

-- The "we email you before we charge you" promise, re-keyed for arrears.
--
-- It used to be `trial_reminder_sent_at` — a single stamp, set once, because there was exactly one
-- charge to warn about: the one at the end of the free month. Under arrears there is no free month
-- and EVERY month ends in a charge, so a once-ever stamp would keep the promise once and then stop
-- silently. Storing the period we last wrote about instead makes the notice repeat correctly and
-- stay idempotent within a period.
alter table public.users
  add column if not exists charge_notice_period_end timestamptz;

comment on column public.users.charge_notice_period_end is
  'The subscription period end this owner was last emailed a pre-charge notice for. Compared against subscription_ends_at so the notice goes out once per period.';

-- Service-role only. This table is written from the Stripe webhook path and read by nobody in the
-- browser; an owner has no business seeing another's billing periods, and no business seeing their
-- own through this table rather than through Stripe's invoices.
alter table public.billing_periods_reported enable row level security;

drop policy if exists "service role manages billing periods" on public.billing_periods_reported;
create policy "service role manages billing periods"
  on public.billing_periods_reported
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
