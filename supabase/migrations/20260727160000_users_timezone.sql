-- Give the owner a timezone.
--
-- The reminder scheduler resolves "remind me tomorrow at 9" against a wall clock, and until now
-- that clock was a portfolio default (KIRA_DEFAULT_TIMEZONE, Australia/Perth) applied to every
-- owner. An owner in Sydney asking for 9am got 9am Perth — a reminder two hours late, with nothing
-- on screen to explain why. Australia alone spans three offsets, and the product is sold to
-- owner-operators anywhere.
--
-- NULLABLE ON PURPOSE. A default here would be a guess wearing the costume of a fact: every
-- existing owner would silently acquire 'Australia/Perth' and there would be no way to tell a
-- confirmed timezone from an assumed one. NULL means "not known yet", the caller falls back to the
-- portfolio default explicitly, and a later capture is an improvement rather than an overwrite of
-- something that looked deliberate.
--
-- Values are IANA zone names ('Australia/Sydney'), never offsets — an offset cannot survive
-- daylight saving, which is exactly when a reminder would silently drift by an hour.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS timezone text;

COMMENT ON COLUMN public.users.timezone IS
  'IANA timezone name (e.g. Australia/Sydney). NULL = not captured; callers fall back to KIRA_DEFAULT_TIMEZONE. Never store a UTC offset — it cannot survive daylight saving.';
