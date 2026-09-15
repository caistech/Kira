-- ============================================================================
-- P2.4-E1.0-A (RETRY): IDENTITY ESTABLISHMENT — idempotent
-- ============================================================================
-- Scope: Establish canonical Persons and auth_credentials for the six production
--   users. Uses ON CONFLICT (email) to handle existing rows from aborted rebuilds.
--
-- Migration Version: 20260915110000
-- ============================================================================

BEGIN;

-- 1. Establish canonical Persons (UUID reuse from legacy users.id; provenance preserved).
INSERT INTO persons (person_id, email, first_name, last_name, status, created_at)
SELECT id, email, COALESCE(first_name, ''), COALESCE(last_name, ''), 'active', created_at
FROM users
WHERE email IN (
  'anjali.karki@gentell.com',
  'davor.ivankovic@pintsch.net',
  'dennis@factory2key.com.au',
  'l.frank@house-of-communication.com',
  'octavia@tarte.com',
  'viola.armbrecht@signata.group'
)
ON CONFLICT (email) DO NOTHING;

-- 2. Establish canonical Auth Credentials (actor identity link).
INSERT INTO auth_credentials (auth_provider, auth_user_id, person_id, status, created_at)
SELECT 'email', u.auth_user_id::text, p.person_id, 'active', NOW()
FROM users u
JOIN persons p ON p.email = u.email
WHERE u.email IN (
  'anjali.karki@gentell.com',
  'davor.ivankovic@pintsch.net',
  'dennis@factory2key.com.au',
  'l.frank@house-of-communication.com',
  'octavia@tarte.com',
  'viola.armbrecht@signata.group'
)
ON CONFLICT (auth_provider, auth_user_id) DO NOTHING;

-- 3. Quarantine UNRESOLVED organisational state in migration_ledger (NULL org).
INSERT INTO migration_ledger (
  legacy_user_id, canonical_person_id, canonical_organisation_id,
  source_table, source_record_id, migration_phase,
  resolution_status, resolution_method, resolution_reason,
  notes, migration_timestamp
)
SELECT
  u.id, p.person_id, NULL::uuid,
  'users', u.id, 'pre-org-identity',
  'pending', 'pre-org-no-evidence', 'No organisational evidence found for production user',
  'Identity established; organisational relationship unresolved until a later resolution migration.',
  NOW()
FROM users u
JOIN persons p ON p.email = u.email
WHERE u.email IN (
  'anjali.karki@gentell.com',
  'davor.ivankovic@pintsch.net',
  'dennis@factory2key.com.au',
  'l.frank@house-of-communication.com',
  'octavia@tarte.com',
  'viola.armbrecht@signata.group'
)
ON CONFLICT DO NOTHING;

COMMIT;
