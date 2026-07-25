-- Carry the signup terms acceptance from auth metadata onto the user row.
--
-- Same seam as the referral-source capture: link_or_create_app_user is the ONE place an auth user
-- becomes an app user, so it is the one place this can be picked up without a second round trip
-- that might not happen.
--
-- The checkbox is required at signup, so a NULL terms_accepted_at means the account pre-dates it —
-- not that someone declined. Worth knowing the difference when deciding who to re-prompt.
--
-- Idempotent.

CREATE OR REPLACE FUNCTION link_or_create_app_user(
  p_auth_id uuid,
  p_email text,
  p_first text,
  p_referral_source text DEFAULT NULL,
  p_terms_version text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accepted_at TIMESTAMPTZ := CASE WHEN NULLIF(TRIM(COALESCE(p_terms_version, '')), '') IS NULL
                                    THEN NULL ELSE NOW() END;
BEGIN
  UPDATE users
     SET auth_user_id = p_auth_id,
         email_verified = true,
         -- COALESCE on both: the FIRST acceptance is the one that matters, and a later signup form
         -- that carries nothing must never blank an existing record of consent.
         referral_source_text = COALESCE(referral_source_text, NULLIF(TRIM(p_referral_source), '')),
         terms_accepted_at    = COALESCE(terms_accepted_at, v_accepted_at),
         terms_version        = COALESCE(terms_version, NULLIF(TRIM(p_terms_version), '')),
         updated_at = NOW()
   WHERE lower(email) = lower(p_email)
     AND (auth_user_id IS NULL OR auth_user_id = p_auth_id);

  IF NOT FOUND THEN
    INSERT INTO users (
      email, first_name, auth_user_id, auth_provider, email_verified,
      referral_source_text, terms_accepted_at, terms_version
    )
    VALUES (
      lower(p_email), p_first, p_auth_id, 'email', true,
      NULLIF(TRIM(p_referral_source), ''), v_accepted_at, NULLIF(TRIM(p_terms_version), '')
    )
    ON CONFLICT (email) DO UPDATE
      SET auth_user_id = EXCLUDED.auth_user_id, updated_at = NOW();
  END IF;
END;
$$;

-- Drop the narrower signature so no caller can silently keep using it and lose the acceptance.
DROP FUNCTION IF EXISTS link_or_create_app_user(uuid, text, text, text);

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first   TEXT := COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_source  TEXT := NEW.raw_user_meta_data->>'referral_source';
  -- The checkbox posts a truthy value; we record the VERSION agreed to, not merely that a box was
  -- ticked, so it stays answerable which wording each user accepted.
  v_terms   TEXT := CASE WHEN COALESCE(NEW.raw_user_meta_data->>'terms_accepted', 'false') IN ('true', 'on', '1')
                         THEN COALESCE(NEW.raw_user_meta_data->>'terms_version', 'unversioned')
                         ELSE NULL END;
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL THEN
    PERFORM link_or_create_app_user(NEW.id, NEW.email, v_first, v_source, v_terms);
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
  v_first  TEXT := COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_source TEXT := NEW.raw_user_meta_data->>'referral_source';
  v_terms  TEXT := CASE WHEN COALESCE(NEW.raw_user_meta_data->>'terms_accepted', 'false') IN ('true', 'on', '1')
                        THEN COALESCE(NEW.raw_user_meta_data->>'terms_version', 'unversioned')
                        ELSE NULL END;
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    PERFORM link_or_create_app_user(NEW.id, NEW.email, v_first, v_source, v_terms);
  END IF;
  RETURN NEW;
END;
$$;
