-- Cache for the LLM industry matcher.
--
-- Two jobs, and the second is the more valuable one:
--   1. The second owner to type "alpaca stud farm" costs no model call.
--   2. It IS the backlog. Every row here is a phrase the mechanical synonym table did not know, so
--      reading this table tells you exactly which synonyms to add — and a wrong mapping is fixable
--      in one row instead of being re-invented per visitor.
--
-- Keyed on the NORMALISED phrase (lowercased, punctuation stripped) so "Plumber!" and "plumber" are
-- one entry rather than two.

CREATE TABLE IF NOT EXISTS public.industry_match_cache (
  query       text PRIMARY KEY,
  raw_input   text,
  sector      text,
  matched     boolean NOT NULL DEFAULT false,
  source      text NOT NULL DEFAULT 'llm',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- What fell through, most recent first — the list to turn into synonyms.
CREATE INDEX IF NOT EXISTS industry_match_cache_unmatched_idx
  ON public.industry_match_cache (created_at DESC) WHERE matched = false;

ALTER TABLE public.industry_match_cache ENABLE ROW LEVEL SECURITY;
-- No policies: written and read by the service role only. Nothing here belongs to a user, and the
-- route is the only reader.
