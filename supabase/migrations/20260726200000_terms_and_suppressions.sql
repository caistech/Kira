-- Consent, made real: recorded acceptance + a durable opt-out list + an opt-out that is honoured.
--
-- Three things were assumed and none were true:
--   1. "Users agreed to our T&Cs" — nothing recorded acceptance, and there were no T&Cs.
--   2. "They can unsubscribe" — there was no unsubscribe route and no suppression list.
--   3. "They can turn emails off in Settings" — the toggle wrote users.email_notifications_opt_in,
--      which NO send path read. Unticking it changed nothing. A decorative opt-out is worse than
--      none: it is a promise made and visibly not kept.
--
-- Idempotent.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Recorded acceptance of the terms
--
-- Versioned: accepting superseded terms is not accepting the terms in force, so a material change
-- can require re-acceptance rather than being assumed to carry over.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS terms_version     TEXT;

COMMENT ON COLUMN users.terms_accepted_at IS
  'When this user accepted the Terms (incl. consent to product emails). NULL = never recorded — pre-dates the signup checkbox.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. The durable suppression list (@caistech/email-compliance migration.sql)
--
-- Keyed by EMAIL, not user id, deliberately: someone who unsubscribes, deletes their account and
-- signs up again with the same address has still told us to stop. Service-role only.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_suppressions (
    email         TEXT PRIMARY KEY,
    reason        TEXT NOT NULL DEFAULT 'unsubscribe'
                  CHECK (reason IN ('unsubscribe', 'bounce', 'complaint', 'manual')),
    detail        TEXT,
    suppressed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS email_suppressions_suppressed_at_idx ON email_suppressions(suppressed_at);
ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE email_suppressions IS
  'Durable opt-out list (Spam Act pillar 3). A row here means DO NOT MAIL, whatever any user-level flag says.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Make the Settings toggle actually do something
--
-- should_send_email() read only the older email_preferences JSONB. The Settings page has been
-- writing email_notifications_opt_in since 20260724130000, and nothing consulted it — so a user who
-- unticked "Email updates" kept receiving re-engagement mail.
--
-- Now, in order of authority:
--   * the suppression list wins over everything (an unsubscribe is unconditional);
--   * then the account-level opt-out;
--   * then the per-type preference;
-- EXCEPT for essential mail, which is not marketing and is never suppressed — you do not opt out
-- of a password reset or notice that your card is about to be charged.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION should_send_email(p_user_id UUID, p_email_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email      TEXT;
  v_opt_in     BOOLEAN;
  v_prefs      JSONB;
  v_pref_value BOOLEAN;
  -- Transactional / recipient-initiated. Not "commercial electronic messages" — always allowed.
  v_essential  TEXT[] := ARRAY['kira_ready', 'magic_link', 'subscription_confirm', 'trial_ending', 'password_reset'];
BEGIN
  SELECT email, email_notifications_opt_in, email_preferences
    INTO v_email, v_opt_in, v_prefs
    FROM users
   WHERE id = p_user_id;

  IF v_email IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_email_type = ANY(v_essential) THEN
    RETURN TRUE;
  END IF;

  -- An unsubscribe is unconditional and outranks every other setting.
  IF EXISTS (SELECT 1 FROM email_suppressions WHERE email = lower(v_email)) THEN
    RETURN FALSE;
  END IF;

  IF v_opt_in IS FALSE THEN
    RETURN FALSE;
  END IF;

  v_pref_value := (v_prefs ->> p_email_type)::BOOLEAN;
  RETURN COALESCE(v_pref_value, TRUE);
END;
$$;

COMMENT ON FUNCTION should_send_email IS
  'The single gate for non-essential email. Order of authority: suppression list > account opt-out > per-type preference. Essential (transactional) types always pass.';
