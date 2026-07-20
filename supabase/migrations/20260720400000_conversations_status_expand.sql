-- 20260720400000_conversations_status_expand.sql
-- The canonical post-call handler passes ElevenLabs' conversation status through (it maps only
-- 'done' -> 'completed'); a 'failed' / 'processing' call therefore violates the conversations.status
-- CHECK, which the base migration (20260119000000_kira_complete.sql) limited to
-- ('active','completed','abandoned'). The insert then 500s and the whole transcript is lost.
-- Expand the allowed set so an interrupted/failed call still persists (degrade-don't-fake), rather
-- than erroring out and discarding the conversation. Idempotent.

DO $$
DECLARE cname text;
BEGIN
  -- Drop the existing status CHECK regardless of its auto-generated name (match by definition).
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'conversations' AND nsp.nspname = 'public' AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%status%'
    AND pg_get_constraintdef(con.oid) ILIKE '%completed%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.conversations DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_status_check
  CHECK (status IN ('active', 'completed', 'abandoned', 'failed', 'processing'));
