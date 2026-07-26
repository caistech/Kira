-- Advisor enquiries: enough about the practice to decide, and enough to pay them later.
--
-- The original form asked for a single `name` and a free-text `firm`. Two problems with that on a
-- form whose whole purpose is registering a party we intend to send commission to:
--
--   * A combined name cannot be reliably split later ("Mary-Jane van der Berg"), and we need the
--     parts for a payee record and for addressing them like a person in an email.
--   * A typed firm name is a guess. `firm_abn` + `firm_state` come from the ABR lookup on the form,
--     so the entity is the REGISTERED one rather than an approximation.
--
-- `advisory_type` is the qualifying field: the channel's condition is that they already hold a
-- current listing or engagement agreement with the owner, and what that means differs for a
-- business broker, an accountant and a lawyer. We were accepting enquiries without ever asking.
--
-- `undertaking_confirmed_at` records that they accepted the condition AT ENQUIRY. The portal
-- undertaking (introducers.terms_accepted_at) is still the binding one and still gates the board —
-- this is the earlier, weaker record that the /advisors page has been claiming they give and did
-- not collect.
--
-- `name` is deliberately KEPT and still NOT NULL. It stays populated from the parts so existing
-- rows and any reader expecting it keep working; nothing is migrated destructively.
--
-- Idempotent.

ALTER TABLE advisor_enquiries
    ADD COLUMN IF NOT EXISTS first_name               TEXT,
    ADD COLUMN IF NOT EXISTS last_name                TEXT,
    ADD COLUMN IF NOT EXISTS advisory_type            TEXT,
    ADD COLUMN IF NOT EXISTS firm_abn                 TEXT,
    ADD COLUMN IF NOT EXISTS firm_state               TEXT,
    ADD COLUMN IF NOT EXISTS undertaking_confirmed_at TIMESTAMPTZ;

-- Backfill the parts from rows captured before the split, so the column is not half-empty for
-- anyone who enquired in the first day. Best-effort by design: everything before the last space is
-- the first name. It is a starting point for an operator, not an authority — which is exactly why
-- new rows collect the parts directly instead of deriving them.
UPDATE advisor_enquiries
SET first_name = NULLIF(TRIM(REGEXP_REPLACE(name, '\s+\S+$', '')), ''),
    last_name  = NULLIF(TRIM(SUBSTRING(name FROM '\S+$')), '')
WHERE first_name IS NULL
  AND last_name IS NULL
  AND name IS NOT NULL
  AND POSITION(' ' IN TRIM(name)) > 0;

COMMENT ON COLUMN advisor_enquiries.first_name IS
  'Given name, collected separately. Rows created before 2026-07-27 are split from `name` on a best-effort basis.';
COMMENT ON COLUMN advisor_enquiries.last_name IS
  'Family name, collected separately — needed for the payee record if they are onboarded.';
COMMENT ON COLUMN advisor_enquiries.advisory_type IS
  'What kind of practice: business_broker / accountant / bookkeeper / financial_adviser / lawyer / other. The qualifying field — the channel condition means something different for each.';
COMMENT ON COLUMN advisor_enquiries.firm_abn IS
  'ABN of the firm, from the ABR lookup on the form. NULL when they typed a name the register did not match, or the ABR was unreachable — an unverified enquiry is still a real one.';
COMMENT ON COLUMN advisor_enquiries.firm_state IS
  'State of the registered entity, returned by the same ABR lookup. Also our jurisdiction check: outreach is AU-only.';
COMMENT ON COLUMN advisor_enquiries.undertaking_confirmed_at IS
  'When they confirmed, at enquiry, that they only introduce owners they already act for. The BINDING acceptance is still introducers.terms_accepted_at at the portal; this is the earlier record the /advisors page implies and previously did not capture.';
