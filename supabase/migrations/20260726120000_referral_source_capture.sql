-- Carry the self-reported "How did you hear about Kira?" answer from signup onto the user row.
--
-- The canonical AuthForm writes extra signup fields into auth.users.raw_user_meta_data. The
-- adopt-or-create helper is the one place that turns an auth user into a public.users row, so it
-- is the one place this can be picked up without a second round trip from the client.
--
-- This is a HINT, not an attribution: someone typing "my accountant Bob" is a lead for a human to
-- follow up, never a commission. That is why it writes referral_source_text — outside the
-- first-touch immutability guard — and never referrer_id.
--
-- Idempotent.

CREATE OR REPLACE FUNCTION link_or_create_app_user(
  p_auth_id uuid,
  p_email text,
  p_first text,
  p_referral_source text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
     SET auth_user_id = p_auth_id,
         email_verified = true,
         -- COALESCE keeps an existing answer: the first thing someone told us about how they found
         -- us is the true one, and a later empty signup form must not blank it.
         referral_source_text = COALESCE(referral_source_text, NULLIF(TRIM(p_referral_source), '')),
         updated_at = NOW()
   WHERE lower(email) = lower(p_email)
     AND (auth_user_id IS NULL OR auth_user_id = p_auth_id);

  IF NOT FOUND THEN
    INSERT INTO users (email, first_name, auth_user_id, auth_provider, email_verified, referral_source_text)
    VALUES (lower(p_email), p_first, p_auth_id, 'email', true, NULLIF(TRIM(p_referral_source), ''))
    ON CONFLICT (email) DO UPDATE
      SET auth_user_id = EXCLUDED.auth_user_id, updated_at = NOW();
  END IF;
END;
$$;

-- The 3-argument signature is dropped so no caller can silently keep using the old one and lose
-- the answer. Both triggers below are rebound to the 4-argument version in the same migration.
DROP FUNCTION IF EXISTS link_or_create_app_user(uuid, text, text);

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first TEXT := COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_source TEXT := NEW.raw_user_meta_data->>'referral_source';
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL THEN
    PERFORM link_or_create_app_user(NEW.id, NEW.email, v_first, v_source);
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
  v_source TEXT := NEW.raw_user_meta_data->>'referral_source';
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    PERFORM link_or_create_app_user(NEW.id, NEW.email, v_first, v_source);
  END IF;
  RETURN NEW;
END;
$$;
