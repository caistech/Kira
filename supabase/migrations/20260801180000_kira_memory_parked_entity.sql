-- 20260801180000_kira_memory_parked_entity.sql
--
-- WHICH other company a parked fact belongs to.
--
-- The entity guard parks a fact she classifies as another company's, and held at 6/6 on the fact she
-- classified. It then measured 1/6, and the logs settled why: she calls save_memory TWICE for the
-- same company and classifies only the first one.
--
--   14:10:39  "Corvid Holdings is a separate company with its own ABN"  -> another_business, parked
--   14:10:45  "Corvid Holdings is raising a $2m fund"                   -> this_business, ACTIVE
--
-- Both facts are about the same company. Neither the duplicate guard nor the containment matcher can
-- relate them, because they are genuinely different facts — the only thing they share is the NAME.
-- Two earlier theories (the post-call distil re-filing, and an unordered exclusion query dropping
-- the row that mattered) were real defects and were fixed, and neither was this one.
--
-- So the name is recorded once, when she first says the business is separate, and every later fact
-- naming that business is parked with it. This is the same shape as everything else that has worked
-- here: she states the judgement, the server owns the consequence.
--
-- ⚠️ KNOWN FALSE POSITIVE, accepted deliberately. A fact genuinely about THIS business that merely
-- mentions the other one — "the yard is sublet from Corvid Holdings" — will be parked too. The
-- server cannot tell a fact's subject from its object. The trade is asymmetric and that is the whole
-- reason for choosing it: a wrongly-parked fact is one `split-genome-entity.mjs --restore` away,
-- while a wrongly-filed one is a false statement about the business inside the document a buyer's
-- accountant reads, and nobody goes looking for it.

ALTER TABLE kira_memory
  ADD COLUMN IF NOT EXISTS parked_entity TEXT;

-- Lookup is "which other businesses does this owner have", asked on every save, so it wants an
-- index. Partial: only parked rows ever carry a value, and they are a small minority.
CREATE INDEX IF NOT EXISTS idx_kira_memory_parked_entity
  ON kira_memory(user_id, parked_entity)
  WHERE parked_entity IS NOT NULL;

COMMENT ON COLUMN kira_memory.parked_entity IS
  'The other company this parked fact belongs to, lower-cased, as she named it. Later facts naming the same business are parked with it — she classifies the first one only.';
