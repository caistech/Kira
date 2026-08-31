-- P2.4 HOTFIX: Add missing columns to kira_knowledge to allow existing migration to pass
ALTER TABLE kira_knowledge ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE kira_knowledge ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE kira_knowledge ADD COLUMN IF NOT EXISTS file_size BIGINT;
