SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'migration_ledger'
) as migration_ledger_exists;