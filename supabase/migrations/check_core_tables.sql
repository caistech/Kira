SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name IN ('migration_ledger', 'organisations', 'persons', 'organisation_memberships')
ORDER BY table_name;