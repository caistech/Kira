SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'organisations'
) as organisations_exists;