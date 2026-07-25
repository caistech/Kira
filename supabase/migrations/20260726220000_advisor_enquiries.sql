-- Brokers and accountants asking to join the introducer channel (/advisors).
--
-- Deliberately NOT an introducer row: an operator reviews the enquiry and adds them from
-- /admin/introducers. A self-serve form that mints a referral link and starts attributing
-- commission to whoever filled it in is not something we want.
--
-- Service-role only: RLS ENABLED with no policies. These are business contact details of people
-- who have not yet agreed to anything.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS advisor_enquiries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    firm        TEXT,
    phone       TEXT,
    client_band TEXT,                                   -- 'Under 20' / '20–50' / '50–200' / '200+'
    note        TEXT,
    status      TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'contacted', 'onboarded', 'declined')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS advisor_enquiries_created_idx ON advisor_enquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS advisor_enquiries_status_idx ON advisor_enquiries(status);

ALTER TABLE advisor_enquiries ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE advisor_enquiries IS
  'Inbound advisor/broker enquiries from /advisors. Reviewed by an operator, who then adds the real introducer at /admin/introducers.';
