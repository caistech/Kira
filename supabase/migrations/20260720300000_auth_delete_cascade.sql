-- 20260720300000_auth_delete_cascade.sql
-- Right-to-delete fix for the Supabase-Auth ↔ public.users bridge.
--
-- 20260720100000_auth_link.sql bridges users.auth_user_id -> auth.users(id) with ON DELETE SET
-- NULL. App data (conversations, conversation_messages, kira_memory, client_profiles) all cascade
-- from public.users(id) — but a hard delete of the Supabase Auth account only NULLs
-- users.auth_user_id, leaving the public.users row and every conversation / voice-memory / profile
-- (PII) row behind. So "delete my account" would strand the user's data instead of purging it,
-- violating the VOICE_MEMORY_STANDARD delete-cascade / right-to-delete expectation.
--
-- Fix: when an auth.users row is deleted, delete the linked public.users row so the EXISTING
-- ON DELETE CASCADE foreign keys fire and purge the memory + PII. Idempotent.

CREATE OR REPLACE FUNCTION handle_auth_user_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deleting the app-user row triggers the ON DELETE CASCADE FKs from public.users
  -- (conversations / conversation_messages / kira_memory / client_profiles) → full purge.
  DELETE FROM public.users WHERE auth_user_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_auth_user_deleted();
