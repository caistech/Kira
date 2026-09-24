-- 20260925000000_marketing_events_and_introducer_fields.sql
--
-- Phase 0 of the BBBO/family/consultant funnel build (docs/KIRA_FUNNEL_SCOPE.md), agreed 2026-09-25:
-- the small, foundational pieces everything else in the funnel depends on, before the matching
-- engine, booking, or family path exist.
--
-- TWO UNRELATED CHANGES IN ONE FILE, deliberately, because they were approved and are being applied
-- together as one Phase-0 batch:
--
--   1. `marketing_events` — a first-party event log. This is BOTH the analytics foundation
--      (KIRA_FUNNEL_SCOPE.md §15) AND the fix for attribution not surviving the anonymous readiness
--      check (§6): today the signed attribution cookie is only ever read at signup
--      (app/api/onboarding/complete/route.ts, app/api/beta/redeem/route.ts), so a partner's referral
--      is lost if the eventual signup happens in a different browser session than the valuation. This
--      table lets `/api/track` stamp `referrer_id` the moment a valuation starts, not just at signup.
--      A third-party analytics vendor (PostHog etc.) is a separate, later decision — this is a
--      first-party Postgres log that works today with no vendor/cost/privacy-review overhead, and
--      gives a backfill source if a vendor is added on top later.
--
--   2. Three new columns on `introducers` (§8(a)) — `region`/`practice_type`/`client_band` already
--      get collected at advisor-enquiry time (app/advisors/AdvisorEnquiryForm.tsx →
--      app/api/advisors/enquiry/route.ts → the `advisor_enquiries` table) and were being silently
--      dropped the moment an operator promoted an enquiry into a real `introducers` row via
--      /admin/introducers. Additive and nullable — existing rows are unaffected, same as every other
--      optional field already on this table (e.g. `org_abn`).
--
-- Per DATA_STANDARD: `marketing_events` is internal operational telemetry about anonymous visits, not
-- a user's own content — service-role-only, RLS on with no policies, same posture as `kira_logs`.
--
-- Idempotent; safe to re-run.

CREATE TABLE IF NOT EXISTS marketing_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Deliberately narrow today — only what app/business-valuation actually fires. Widen this CHECK
  -- when a real new surface (a doorway page, a family share link) starts emitting a new type; do not
  -- pre-add event names for surfaces that don't exist yet (KIRA_FUNNEL_SCOPE.md §15).
  event_type   TEXT NOT NULL CHECK (event_type IN ('valuation_started', 'valuation_completed')),
  -- Client-set (sessionStorage), ties one anonymous visitor's steps together across calls.
  session_id   TEXT NOT NULL,
  -- NULL until/unless this session is ever claimed by a real account. Never required at write time —
  -- these events fire long before signup, often never followed by one at all.
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  -- From the existing @caistech/attribution first-touch cookie, when present at the moment of the
  -- event — the same cookie attachFirstTouch() reads at signup, just read earlier here too.
  referrer_id  UUID REFERENCES introducers(id) ON DELETE SET NULL,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  path         TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_events_session  ON marketing_events (session_id);
CREATE INDEX IF NOT EXISTS idx_marketing_events_referrer ON marketing_events (referrer_id) WHERE referrer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketing_events_created  ON marketing_events (created_at);

-- RLS on, no policies: deny-all to anon/authenticated; only the service-role writer (/api/track)
-- bypasses RLS. No client-side read path — mirrors kira_logs.
ALTER TABLE marketing_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE introducers
  ADD COLUMN IF NOT EXISTS region        TEXT,
  ADD COLUMN IF NOT EXISTS practice_type TEXT,
  ADD COLUMN IF NOT EXISTS client_band   TEXT;
