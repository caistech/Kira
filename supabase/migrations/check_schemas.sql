SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename LIKE '%organisation%' OR tablename LIKE '%person%' OR tablename LIKE '%membership%';