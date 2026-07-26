-- Self-serve sign-in link for introducers: the per-address send cooldown.
--
-- Introducer sign-in links last seven days, so an advisor who checks in fortnightly is locked out
-- every other visit. Until now the only recovery was emailing a human, which meant waiting on an
-- operator to view their OWN status board.
--
-- The self-serve form accepts an arbitrary address from an anonymous visitor, so every accepted
-- submission sends mail to someone who did not necessarily ask. This column is what stops it being
-- a mailbomb: the last send is recorded, and a repeat inside the cooldown is a no-op.
--
-- It lives in the DATABASE rather than an in-process rate limiter because Vercel gives each lambda
-- its own memory — an in-memory Map limits one instance and lets every other instance through.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS) per the migration standard.

ALTER TABLE introducers
    ADD COLUMN IF NOT EXISTS last_link_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN introducers.last_link_sent_at IS
    'When a sign-in link was last emailed to this introducer. Read by the self-serve request form '
    'to enforce a per-address cooldown; NULL means one has never been sent through that path.';

-- The self-serve lookup is by lower-cased email, and `email` is already UNIQUE (so it has an
-- index), but the UNIQUE index is on the raw value. Addresses are normalised to lower case before
-- the query, so a mixed-case row would be missed. Enforce the invariant instead of hoping for it:
-- a functional unique index on lower(email) makes "Dennis@x.com" and "dennis@x.com" one account,
-- which is what everyone means, and keeps the lookup index-backed.
CREATE UNIQUE INDEX IF NOT EXISTS introducers_email_lower_idx ON introducers (lower(email));
