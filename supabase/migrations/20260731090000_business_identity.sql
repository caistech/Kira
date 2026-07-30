-- WHOSE NAME IS ON THE EMAIL.
--
-- Kira sends on behalf of the OWNER'S BUSINESS — a plumber chasing his own customer, a builder
-- quoting his own client. Australia's Spam Act requires every commercial message to identify its
-- sender by name, ABN and a reply-capable address, and the sender is the tenant, never Corporate AI
-- Solutions. Until now nothing in this product ever asked for any of it: `users` has no business
-- name, the valuation captures turnover and owner-dependence but no identity, and onboarding was a
-- password field. So every tenant reached the orchestrator with three NULL columns and the email
-- connector refused to send for them — correctly, and permanently, because nothing could ever fill
-- them in.
--
-- ONE IDENTITY PER ACCOUNT, deliberately (operator, 2026-07-31). A second business is a second
-- account with its own Kira and its own entity, so this is keyed by user and has no notion of a
-- list. Modelling multiple businesses per account here would let the wrong ABN be selected on a
-- send, which is the failure the whole table exists to prevent.
--
-- WHY THE CONSTRAINTS ARE ON THE COLUMNS.
--
-- The lesson is two days old and cost a $60,000 quote: `kira_tasks.status` was a bare text column,
-- a caller wrote an object into it, and three requests sat on no screen for two days because a text
-- column accepts anything. An ABN that is not eleven digits is the same class of defect and worse
-- in consequence — it goes out in the footer of real mail — so the column refuses it rather than
-- trusting every writer to check.
--
-- authorised_at is NOT NULL on purpose: it is structurally impossible to hold an identity here that
-- the owner never authorised us to send under, because the row cannot exist without the timestamp.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS business_identity (
  user_id        uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- The registered entity, exactly as the register has it. This is what the footer says.
  legal_name     text NOT NULL CHECK (length(btrim(legal_name)) > 0),

  -- Normalised to 11 digits on write. Never store the spaced display form — the footer formats it.
  abn            text NOT NULL CHECK (abn ~ '^[0-9]{11}$'),

  -- What customers call the business, when that differs from the entity. The ABR frequently returns
  -- something like "The Trustee for the X Family Trust" while the world knows a trading name; which
  -- one appears is the OWNER'S decision, not a default we are entitled to pick for them.
  trading_name   text,

  -- Reply-capable postal address, structured so it can be validated and re-composed rather than
  -- parsed back out of one free-text line.
  street         text NOT NULL CHECK (length(btrim(street)) > 0),
  locality       text NOT NULL CHECK (length(btrim(locality)) > 0),
  state          text NOT NULL CHECK (state IN ('ACT','NSW','NT','QLD','SA','TAS','VIC','WA')),
  postcode       text NOT NULL CHECK (postcode ~ '^[0-9]{4}$'),
  country        text NOT NULL DEFAULT 'Australia',

  -- NOT NULL because the alternative is silent and expensive: the orchestrator's connector falls
  -- back to the verified SENDING domain when this is absent, and that domain is ours — so the
  -- owner's customer replies to his quote and the reply lands with us, where he never sees it.
  reply_email    text NOT NULL CHECK (reply_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),

  -- How Kira signs off. Separate from the entity: mail is signed by a person, not a company.
  sign_off_name  text,

  -- The owner authorising mail to go out under this ABN. Consent, recorded with its moment.
  authorised_at  timestamptz NOT NULL,

  -- Set only when the orchestrator has ACKNOWLEDGED the identity. Null means Kira holds it and the
  -- system that actually sends does not, which is a real state and must be visible rather than
  -- assumed away — a tenant that believes it is configured and cannot send is exactly the failure
  -- being repaired here.
  synced_to_orchestrator_at timestamptz,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN business_identity.abn IS
  'The OWNER''s ABN — never Corporate AI Solutions''. This is the identity that appears in the Spam Act footer of mail Kira sends on their behalf.';

COMMENT ON COLUMN business_identity.synced_to_orchestrator_at IS
  'Set only on a 200 from PUT /v1/tenants/:id/identity. Null = Kira has it, the sender does not.';

-- Rows are read and written exclusively by server actions holding the service role, matching every
-- other identity-bearing surface in this app. RLS is ON with no policy, so the anon and authenticated
-- roles reach nothing: this table decides whose ABN goes on outbound mail, and a browser must never
-- be able to write it.
ALTER TABLE business_identity ENABLE ROW LEVEL SECURITY;

-- Finding the tenants who still cannot send is a routine operator question; without this it is a
-- full scan of a table that only grows.
CREATE INDEX IF NOT EXISTS business_identity_unsynced_idx
  ON business_identity (created_at)
  WHERE synced_to_orchestrator_at IS NULL;
