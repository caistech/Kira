-- Keep the original wording when a memory is rewritten into the owner's register.
--
-- The distil used to write every memory as a report about a person — "Dennis says he prices
-- commercial jobs at cost plus 18%" — and /my-genome renders content verbatim, so the owner's own
-- handover manual read as a file someone was keeping on him. That is fixed at write time; the rows
-- already stored still carry the old voice and are rewritten by scripts/backfill-genome-register.mjs.
--
-- WHY A COLUMN AND NOT JUST A CAREFUL SCRIPT. The rewrite is an LLM pass over the owner's own words.
-- It is supposed to change the wording and nothing else, and the failure that matters is one that
-- quietly changes a FACT — a margin, a name, a date — in a document he is expected to hand a buyer.
-- Keeping the original makes that reversible and auditable instead of a thing we hope went well.
-- It is also the only way to tell "already rewritten" from "written correctly in the first place",
-- which is what makes the backfill safe to run twice.
--
-- Nullable on purpose: NULL means never rewritten, and a value means this row was.
-- Idempotent.

ALTER TABLE public.kira_memory
  ADD COLUMN IF NOT EXISTS content_original text;

COMMENT ON COLUMN public.kira_memory.content_original IS
  'The wording as first distilled, kept when a row is rewritten into the business register. NULL = never rewritten.';
