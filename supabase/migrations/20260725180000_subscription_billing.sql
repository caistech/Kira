-- Workstream B — billing.
--
-- Brings Kira onto @caistech/subscription-billing (webhook idempotency + ordering safety) and
-- @caistech/beta-gate (30-day trial clock + a $20 fair-use cost cap on voice).
--
-- Idempotent; safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. @caistech/subscription-billing — idempotency ledger
--
-- One row per Stripe event id. The reducer inserts to CLAIM an event and deletes the row if the
-- apply fails, so Stripe's retry can re-run it. Service-role only: RLS ENABLED with NO policies —
-- anon/authenticated read nothing, the service-role client bypasses RLS.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    event_id         TEXT PRIMARY KEY,
    event_type       TEXT NOT NULL,
    event_created_at TIMESTAMPTZ NOT NULL,
    received_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS stripe_webhook_events_received_idx
    ON stripe_webhook_events(received_at);
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. users — the out-of-order guard column
--
-- Stripe does not guarantee delivery order. Without this stamp, an older event (e.g. a delayed
-- `customer.subscription.updated` carrying `trialing`) can overwrite newer state (`cancelled`).
-- The reducer compares it against each event's `created` and ignores anything not newer.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_stripe_event_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. @caistech/beta-gate — trial clock + usage cost accrual
--
-- Mirrors the package's shipped migration.sql (kept inline so `supabase db push` is the single
-- apply path — see CLAUDE.md, migrations live in supabase/migrations/).
--
-- The trial is the first month free with a ~$20 fair-use ceiling on voice spend, warn-not-hard-cut:
-- beta_usage.cost_usd accrues real cost, and the product surfaces it before the ceiling.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS beta_trials (
    subject_id       UUID PRIMARY KEY,
    trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trial_expires_at TIMESTAMPTZ NOT NULL,
    status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'expired', 'extended', 'converted')),
    extended_count   INT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS beta_trials_expiry_idx ON beta_trials(trial_expires_at);
ALTER TABLE beta_trials ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS beta_usage (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL,
    action     TEXT NOT NULL,
    day        DATE NOT NULL DEFAULT CURRENT_DATE,
    cost_usd   NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE beta_usage ADD COLUMN IF NOT EXISTS cost_usd NUMERIC NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS beta_usage_lookup_idx ON beta_usage(subject_id, action, day);
ALTER TABLE beta_usage ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Trial-end reminder bookkeeping
--
-- The card is captured at signup and the first charge lands on day 30. Charging someone who has
-- forgotten they signed up is how a subscription earns a chargeback — so a reminder goes out 3 days
-- before. This column makes that send idempotent: the cron only mails rows where it is NULL.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_reminder_sent_at TIMESTAMPTZ;
