-- 20260720500000_auth_link_confirm_gate.sql
-- Close the email-link account-takeover window. 20260720100000_auth_link.sql linked a new auth
-- signup to a pre-existing public.users row by lower(email) at INSERT time, regardless of whether
-- the email was confirmed. With mailer_autoconfirm ON, signing up as victim@x is auto-confirmed and
-- inherits the victim's (legacy, email-only) users row — and thus their agents / kira_memory /
-- client_profiles. Fix: a signup may ADOPT an existing row only once its email is CONFIRMED.
--
-- The adopt-or-create logic now lives in ONE confirmation-gated helper, called from both triggers:
--   * autoconfirm ON  → email_confirmed_at is set at INSERT → on_auth_user_created runs it (as before)
--   * autoconfirm OFF → INSERT is unconfirmed → nothing happens until the confirm UPDATE runs it
-- so this is safe under EITHER setting and makes turning autoconfirm OFF the security-activating
-- switch (an attacker who cannot receive the confirmation mail never links to the victim's row).
-- Idempotent.

CREATE OR REPLACE FUNCTION link_or_create_app_user(p_auth_id uuid, p_email text, p_first text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
     SET auth_user_id = p_auth_id,
         email_verified = true,
         updated_at = NOW()
   WHERE lower(email) = lower(p_email)
     AND (auth_user_id IS NULL OR auth_user_id = p_auth_id);

  IF NOT FOUND THEN
    INSERT INTO users (email, first_name, auth_user_id, auth_provider, email_verified)
    VALUES (lower(p_email), p_first, p_auth_id, 'email', true)
    ON CONFLICT (email) DO UPDATE
      SET auth_user_id = EXCLUDED.auth_user_id, updated_at = NOW();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first TEXT := COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
BEGIN
  -- Adopt/create only when the email is already CONFIRMED (autoconfirm ON, or admin-created).
  -- Otherwise defer to handle_auth_user_confirmed() below.
  IF NEW.email_confirmed_at IS NOT NULL THEN
    PERFORM link_or_create_app_user(NEW.id, NEW.email, v_first);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION handle_auth_user_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first TEXT := COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
BEGIN
  -- On the NULL -> NOT NULL confirmation transition, perform the (deferred) adopt-or-create.
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    PERFORM link_or_create_app_user(NEW.id, NEW.email, v_first);
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers already exist from 20260720100000_auth_link.sql; CREATE OR REPLACE FUNCTION rebinds them.
-- Re-assert idempotently so a fresh install (this migration alone) also wires them.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_auth_user_confirmed();
