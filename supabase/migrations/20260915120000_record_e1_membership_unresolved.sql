-- Record E1.0-B as explicitly unresolved in migration_ledger
BEGIN;

INSERT INTO migration_ledger (
  legacy_user_id, canonical_person_id, canonical_organisation_id,
  source_table, source_record_id, migration_phase,
  resolution_status, resolution_method, resolution_reason,
  notes, migration_timestamp
)
SELECT
  u.id, p.person_id, NULL::uuid,
  'users', u.id, 'e1-membership-unresolved',
  'unresolved', 'no-evidence', 'No sign-in since identity reset; no membership evidence found.',
  'Unresolved pending sign-in / establishment of organisational relationship.',
  NOW()
FROM users u
LEFT JOIN persons p ON p.email = u.email
WHERE u.email IN (
  'anjali.karki@gentell.com',
  'davor.ivankovic@pintsch.net',
  'l.frank@house-of-communication.com',
  'octavia@tarte.com',
  'viola.armbrecht@signata.group'
)
ON CONFLICT DO NOTHING;

COMMIT;
