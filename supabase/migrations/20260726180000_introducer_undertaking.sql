-- The introducer's undertaking — recorded, not assumed.
--
-- The channel's consent position rests on one rule: a broker only sends their link to owners they
-- already hold a current listing agreement with. That rule is what makes their email to an owner an
-- ordinary message inside an existing commercial relationship rather than cold marketing.
--
-- A rule nobody records is a hope. This captures the broker's acceptance of it — who, when, and
-- which version of the wording — so that if it is ever questioned there is evidence of what they
-- agreed to rather than a recollection.
--
-- Deliberately versioned: when the wording changes, everyone re-accepts. An acceptance of superseded
-- terms is not an acceptance of the current ones.
--
-- Idempotent.

ALTER TABLE introducers
    ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS terms_version     TEXT;

COMMENT ON COLUMN introducers.terms_accepted_at IS
  'When this introducer accepted the channel undertaking (incl. the listing-agreement warranty). NULL = never accepted; the dashboard is gated until it is set.';
COMMENT ON COLUMN introducers.terms_version IS
  'Which version of the undertaking wording was accepted. A change of wording requires re-acceptance.';
