-- 20260720100000_auth_link.sql
-- Bridge Kira's standalone `users` table to Supabase Auth (auth.users) WITHOUT touching the
-- existing FK graph. Every agent / conversation / kira_memory row references users.id; we do
-- NOT change those ids. Instead we add users.auth_user_id -> auth.users(id) and, on signup,
-- link (or create) the users row by email. App code keeps resolving the app-user by users.id.
--
-- Idempotent.

-- ============================================================================
-- 1. Link column: users.auth_user_id -> auth.users(id)
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_auth_user_id_fkey' AND table_name = 'users'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_auth_user_id_fkey
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_uniq
  ON users (auth_user_id) WHERE auth_user_id IS NOT NULL;

-- ============================================================================
-- 2. On auth signup, link the users row by email (or create it). This keeps a returning
--    email-only user (created by the old flow) attached to their agents/memory, and gives a
--    brand-new signup a users row. SECURITY DEFINER so it can write public.users from the
--    auth trigger context.
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first TEXT := COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
BEGIN
  UPDATE users
     SET auth_user_id = NEW.id,
         email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, email_verified),
         updated_at = NOW()
   WHERE lower(email) = lower(NEW.email)
     AND (auth_user_id IS NULL OR auth_user_id = NEW.id);

  IF NOT FOUND THEN
    INSERT INTO users (email, first_name, auth_user_id, auth_provider, email_verified)
    VALUES (lower(NEW.email), v_first, NEW.id, 'email', NEW.email_confirmed_at IS NOT NULL)
    ON CONFLICT (email) DO UPDATE
      SET auth_user_id = EXCLUDED.auth_user_id, updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- Keep email_verified in sync when a user confirms their email later.
CREATE OR REPLACE FUNCTION handle_auth_user_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL) THEN
    UPDATE users SET email_verified = true, updated_at = NOW() WHERE auth_user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_auth_user_confirmed();

-- ============================================================================
-- 3. RLS on users: own-row select/update by the authenticated user. Service role (used by
--    all server-side data access) bypasses RLS, so this only constrains direct client reads.
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own ON users
  FOR SELECT USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users
  FOR UPDATE USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());
