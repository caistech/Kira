-- Give a memory a place in the owner's Genome.
--
-- kira_memory holds CONVERSATIONAL memory — context, goal, preference, decision — with free-form
-- topic tags. That is the right shape for recall ("what did he tell me last time") and the wrong
-- shape for the Genome, which is organised by the questions a BUYER'S ADVISOR asks: how work comes
-- in, how it is priced, whether it runs without him, suppliers, obligations, and what only he knows.
--
-- So the section is classified ONCE and stored, rather than derived per page view. Three reasons:
-- a model call every time an owner opens his own Genome is slow and costs money for an answer that
-- does not change; a stored value is INSPECTABLE, so a wrong classification can be corrected in a
-- row instead of re-argued with a prompt; and it means the Genome renders instantly, which matters
-- for a page whose whole job is to make someone feel their knowledge is safe.
--
-- NULL means "not yet classified", which the UI must show as unsorted rather than silently dropping
-- it. A memory the owner gave us that never appears anywhere is exactly the failure this product
-- exists to prevent.

ALTER TABLE public.kira_memory
  ADD COLUMN IF NOT EXISTS genome_section text,
  ADD COLUMN IF NOT EXISTS genome_classified_at timestamptz;

COMMENT ON COLUMN public.kira_memory.genome_section IS
  'work-in | pricing | delivery | suppliers | obligations | only-you | none. NULL = not yet classified; show as unsorted, never hide.';

CREATE INDEX IF NOT EXISTS kira_memory_genome_idx
  ON public.kira_memory (user_id, genome_section) WHERE active IS NOT false;
