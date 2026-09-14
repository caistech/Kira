-- T8: Backwards-compatible callback handler - kira_memory columns for the return leg.
--
-- source: what produced this memory entry.
--   'conversation' - default, from owner-Kira chat
--   'record'       - from orchestrator callback (task completion evidence)
-- leg: which D/S partition this evidence feeds (assigned at classify-time, not in callback).
--   'D' - continuity gap (function exists but runs through owner)
--   'S' - capability gap (function absent)

ALTER TABLE public.kira_memory
  ADD COLUMN IF NOT EXISTS source text
    CHECK (source IN ('conversation', 'record'))
    DEFAULT 'conversation';

ALTER TABLE public.kira_memory
  ADD COLUMN IF NOT EXISTS leg text
    CHECK (leg IN ('D', 'S'));

COMMENT ON COLUMN public.kira_memory.source IS
  'conversation = from owner-Kira chat; record = from orchestrator callback (task completion evidence)';

COMMENT ON COLUMN public.kira_memory.leg IS
  'D = continuity gap (function exists but runs through owner); S = capability gap (function absent). Assigned at classify-time.';

CREATE INDEX IF NOT EXISTS kira_memory_source_idx ON public.kira_memory (source) WHERE source = 'record';
CREATE INDEX IF NOT EXISTS kira_memory_leg_idx ON public.kira_memory (leg) WHERE leg IS NOT NULL;