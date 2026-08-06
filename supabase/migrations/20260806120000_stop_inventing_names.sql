-- Stop inventing a first name from the email address.
--
-- WHAT WAS WRONG. Both signup triggers derived the new user's first name as:
--
--     COALESCE(raw_user_meta_data->>'first_name',
--              raw_user_meta_data->>'name',
--              split_part(NEW.email, '@', 1))     -- <-- this
--
-- That last fallback does not find a name, it MAKES one. Sign up as `ray.thompson@bigpond.com` with
-- no metadata and the product decides you are called "ray.thompson"; sign up as
-- `dennis+ray@factory2key.com.au` and it decides you are called "dennis+ray".
--
-- One invented value, surfacing in three places, all found in the same walkthrough
-- (Ray, 6 August 2026):
--
--   * "How Kira signs off" pre-filled with `dennis+ray` — the string destined for the bottom of a
--     quote to his customer. "A man in a hurry ticks the box and hits Save."
--   * The valuation page greeting "You are signed in, dennis+ray" four inches above the field that
--     asks "What should we call you?" — not knowing his name and using it anyway.
--   * The Genome export byline: "Recorded by dennis+qauser".
--
-- NULL IS THE HONEST ANSWER. We do not know his name; a column saying so is a fact, and every
-- surface can then ask. The invented string is worse than an empty one precisely because it looks
-- like knowledge — nothing downstream can tell it from a name he gave us, which is why it travelled
-- all the way to a customer-facing sign-off field without anyone noticing.
--
-- SAFETY. `users.first_name` is nullable (rows created by the valuation-claim path have always
-- arrived without one), so passing NULL cannot fail the insert. `link_or_create_app_user` is
-- unchanged and still takes the value it is given.
--
-- ⚠️ THIS FIXES NEW SIGNUPS ONLY. Existing rows keep whatever was invented for them, and they are
-- NOT rewritten here: mass-updating the name field of real accounts is data surgery on the one
-- column an owner would notice, and it would also overwrite names people genuinely gave us. The read
-- side handles those instead — `lib/user-name.ts` refuses a stored name that matches the local part
-- of the address AND carries a machine signature (a plus-tag, a dot-pair, a digit, an underscore).
-- Deliberately conservative in that direction: a real Dennis at dennis@… keeps his name, because
-- making the product forget who he is would be the worse error.

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- No split_part fallback. If neither metadata field is present we do not know his name.
  v_first TEXT := COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'name');
BEGIN
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
  v_first TEXT := COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'name');
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    PERFORM link_or_create_app_user(NEW.id, NEW.email, v_first);
  END IF;
  RETURN NEW;
END;
$$;

-- CREATE OR REPLACE FUNCTION rebinds the existing triggers; re-asserted idempotently so a fresh
-- install that runs this migration alone still wires them, matching 20260720500000's own pattern.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_auth_user_confirmed();
