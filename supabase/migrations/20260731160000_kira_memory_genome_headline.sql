-- A headline for each Genome entry.
--
-- The public example Genome leads every entry with a plain statement of fact — "Three builders supply
-- roughly 60% of turnover" — and the real one rendered the raw distilled sentence instead. Side by
-- side they did not look like the same product, and the real one is the thing being paid for.
--
-- Generated at CLASSIFY time rather than at render: it is the same model call that already decides
-- the section, so it costs nothing extra, and it means the owner's manual reads the same way every
-- time it is opened rather than being re-worded on each visit.
--
-- Nullable: NULL means not yet classified, or classified as 'none' (which never appears in the
-- Genome anyway). Idempotent.

ALTER TABLE public.kira_memory
  ADD COLUMN IF NOT EXISTS genome_headline text;

COMMENT ON COLUMN public.kira_memory.genome_headline IS
  'Short plain-English lead for this entry in the owner Genome, written when the row is classified. NULL = unclassified or not Genome material.';
