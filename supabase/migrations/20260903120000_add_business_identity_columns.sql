-- BUSINESS IDENTITY COLUMNS ON ORGANISATIONS
--
-- The `business_identity` table was never created in production (the migration
-- 20260731090000_business_identity.sql creates table `n`, which also was never applied).
-- The code in lib/business-identity/store.ts queries `.from('business_identity')` which
-- doesn't exist, causing a 500 on /dashboard.
--
-- Rather than creating a parallel table, we add the missing business-identity columns
-- to `organisations` — the canonical identity table. This makes organisations the single
-- source of truth for both the org structure and the business identity the sender needs.
--
-- The `user_id` column from the old business_identity concept is replaced by the
-- organisation_memberships relationship: userId → membership → organisation_id.

ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS locality text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'AU',
  ADD COLUMN IF NOT EXISTS reply_email text,
  ADD COLUMN IF NOT EXISTS sign_off_name text,
  ADD COLUMN IF NOT EXISTS sending_domain text,
  ADD COLUMN IF NOT EXISTS sending_domain_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS authorised_at timestamptz,
  ADD COLUMN IF NOT EXISTS synced_to_orchestrator_at timestamptz;

COMMENT ON COLUMN public.organisations.street IS 'Street address for Spam Act compliance (postal address).';
COMMENT ON COLUMN public.organisations.locality IS 'Suburb/city for the postal address.';
COMMENT ON COLUMN public.organisations.state IS 'Australian state/territory code (e.g. NSW, VIC).';
COMMENT ON COLUMN public.organisations.postcode IS 'Australian postcode for the postal address.';
COMMENT ON COLUMN public.organisations.country IS 'Country code, defaults to AU.';
COMMENT ON COLUMN public.organisations.reply_email IS 'Reply-capable email address shown in commercial email footers.';
COMMENT ON COLUMN public.organisations.sign_off_name IS 'Name used to sign off outbound email (nullable).';
COMMENT ON COLUMN public.organisations.sending_domain IS 'Custom sending domain for Resend email delivery.';
COMMENT ON COLUMN public.organisations.sending_domain_verified_at IS 'Set when Resend reports the sending domain verified.';
COMMENT ON COLUMN public.organisations.authorised_at IS 'Timestamp when the owner authorised Kira to send under this identity.';
COMMENT ON COLUMN public.organisations.synced_to_orchestrator_at IS 'Last time the identity was pushed to the orchestrator sender.';
