-- The nine-area Genome model (docs/GENOME_BUYER_FORMAT.md §3.2, decided 2026-08-02).
--
-- Three changes, and the second is the one that matters.
--
-- 1. `genome_section` KEEPS ITS NAME and widens its value set. §3 calls the nine "a widening, not a
--    rewrite" — five of the six legacy keys map straight across (work-in→demand, delivery→operations,
--    suppliers→cash, obligations→compliance, pricing→pricing). A second column would mean dual-writing
--    every path that files a memory, and the first missed one would silently split the Genome in two.
--
-- 2. `genome_owner_dependent` — THE BRIDGE, and the reason `only-you` can be retired at all.
--    "Things only you know" was a PLACE, and it behaved like one: on the red-team account it held 115
--    of 233 classified rows, and in a real export five of six sections were empty while everything
--    landed in it. The taxonomy was functioning as five sections plus a bucket.
--    §3.2 makes owner-dependence the AXIS instead — measured per area, because "pricing is entirely
--    in his head" and "the yard tidy-up is in his head" are not the same risk. This flag is what
--    carries that fact across the re-classification: each `only-you` row is re-filed into the area it
--    is really about AND marked here, so the axis has data the day it is built rather than after a
--    second pass over the owner's record.
--    NULL is deliberate and is NOT false: it means nobody has judged this row yet. Defaulting to
--    false would assert "this does not depend on the owner" about several hundred rows nobody has
--    read, in a document whose entire subject is what depends on the owner.
--
-- 3. `genome_about` widens `software` into `assistant` | `systems`. Applying "software → none"
--    bluntly discards WHERE THE BUSINESS KEEPS ITS RECORDS, which is rank 10 — measured on the real
--    Genome, 34 rows name a system and every one was filed `none`, including "bank accounts are not
--    synchronised with Xero" and "documents are on Drive but may not use straightforward file names".
--    Those are the first things a buyer's accountant hits. `assistant` (how Kira should behave) still
--    goes to `none`; `systems` (what the business runs on) goes to the systems area.
--
-- NOTHING IS BACKFILLED HERE, ON PURPOSE. Re-filing ~700 rows across two live Genomes is a REVIEWED
-- pass through POST /api/admin/genome/reclassify (dry-run by default, the proposal read and then
-- applied, journal kept for revert) — not a blind UPDATE inside a migration. A wrong bulk update here
-- would rewrite an owner's record with no proposal to read and nothing to revert to; the first prompt
-- change made on 2026-08-02 would have deleted a real financing fact, and it was the dry run that
-- caught it.

ALTER TABLE public.kira_memory
  ADD COLUMN IF NOT EXISTS genome_owner_dependent boolean;

COMMENT ON COLUMN public.kira_memory.genome_section IS
  'demand | pricing | operations | cash | customers | people | assets | compliance | systems | none. '
  'NULL = not yet classified; show as unsorted, never hide. '
  'Legacy values (work-in, delivery, suppliers, obligations, only-you) may persist until the reviewed '
  're-classification runs; lib/genome/areas.ts resolves unknown keys to null rather than throwing.';

COMMENT ON COLUMN public.kira_memory.genome_owner_dependent IS
  'Does this fact live only in the owner''s head? The per-area owner-dependence axis that replaced the '
  '"Things only you know" SECTION. NULL = not yet judged, which is NOT the same as false — false is a '
  'claim that this does not depend on him.';

COMMENT ON COLUMN public.kira_memory.genome_about IS
  'business | assistant | systems | personal. `assistant` (how Kira should behave) is forced to '
  'section none; `systems` (what the business runs on, where its records live) belongs to the '
  'systems area and is rank 10. The pre-2026-08-02 value `software` conflated the two and cost the '
  'highest-ranked area every fact it had.';

-- Partial, because the axis is only ever read for rows that are IN the Genome. An index over the
-- nulls would be almost the whole table and answer a question nothing asks.
CREATE INDEX IF NOT EXISTS kira_memory_owner_dependent_idx
  ON public.kira_memory (user_id, genome_owner_dependent)
  WHERE active IS NOT false AND genome_owner_dependent IS TRUE;
