-- Enforce NOT NULL on organisation_id for isolation wall
-- This prevents future memory bleed from NULL-scoped rows.
-- All rows have been backfilled to their respective organisations via scripts/backfill-org-id.ts

ALTER TABLE public.kira_memory ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE public.conversations ALTER COLUMN organisation_id SET NOT NULL;
