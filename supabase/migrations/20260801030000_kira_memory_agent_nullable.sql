-- 20260801030000_kira_memory_agent_nullable.sql
--
-- kira_memory.kira_agent_id must be NULLABLE, because the documented write path passes null.
--
-- `handleKiraSaveMemory` inserts `kira_agent_id: agent?.id ?? null` — correct, because a memory is
-- worth keeping whether or not an agent binding can be resolved. The column said NOT NULL. For any
-- owner who has an agent the two never meet; for one who does not, the insert is refused by Postgres
-- and the route answers "Failed to save memory" for a reason that has nothing to do with the memory.
--
-- This is the SAME defect @caistech/elevenlabs-convai fixed in 0.7.4, where convai_memory.agent_id
-- was NOT NULL while resolveToolIdentity documents agentId as OPTIONAL: every memory write failed
-- the constraint and the handler swallowed it behind a 200 — green endpoint, nothing stored. Kira
-- renamed the tables and inherited the shape.
--
-- Found by seeding red-team fixtures, which is the honest version of how it would otherwise have
-- been found: a new owner, no agent yet, memory silently not saved.

ALTER TABLE kira_memory ALTER COLUMN kira_agent_id DROP NOT NULL;

DO $$
BEGIN
  -- agent_id is the same field under the package's original name; drop its constraint too if the
  -- column exists and carries one, for the same reason.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kira_memory' AND column_name = 'agent_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE kira_memory ALTER COLUMN agent_id DROP NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN kira_memory.kira_agent_id IS
  'Nullable on purpose: a fact is worth keeping even when no agent binding resolves. See 0.7.4 of @caistech/elevenlabs-convai for the same defect upstream.';
