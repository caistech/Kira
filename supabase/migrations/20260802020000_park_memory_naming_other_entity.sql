-- 20260802020000_park_memory_naming_other_entity.sql
--
-- ANOTHER COMPANY'S FACT STAYS OUT OF THIS GENOME — ENFORCED AT THE WRITE, NOT AT THE WRITER.
--
-- The front door already holds. save_memory asks which business a fact is about, parks an explicit
-- `another_business`, and parks any later fact naming a company already parked. Measured on 1 August
-- across three red-team runs: both save_memory calls parked correctly, every time.
--
-- The record still ended up asserting it. Traced in production:
--
--   23:42:49  save_memory   -> PARKED, entity recorded as "corvid 234101 holdings"
--   23:42:54  save_memory   -> PARKED by the name match (he pushed; the first call stood)
--   23:43:02  the DISTIL    -> ACTIVE. In the Genome.
--
-- The end-of-session distil re-derives facts from the transcript in ITS OWN WORDS, and it merged the
-- two parked facts into a single new sentence: "Corvid 234101 Holdings is a separate company with its
-- own ABN, raising a $2 million fund, and the owner is the sole director." The exclusion list handed
-- to the extractor is a list of parked fact TEXT, and that sentence matches none of it. A correct
-- mechanism, defeated by a paraphrase.
--
-- WHY A TRIGGER AND NOT MORE APPLICATION CODE. The distil writes through the canonical
-- @caistech/elevenlabs-convai handler, so there is no Kira function between the extractor and the
-- INSERT to put a check in. Every path — mid-call save, typed distil, voice post-call distil, a
-- future one nobody has written yet — must pass through this table. So the rule lives where they
-- meet. This is the same shape as the declined_because CHECK, which is the guard on this product
-- that has never been walked around, and for the same reason: a request is not a mechanism.
--
-- IT KEYS ON THE ENTITY NAME, NEVER ON FACT TEXT. The name is the only thing a paraphrase cannot
-- change; the sentence around it is exactly what the model rewrites. That is the lesson of the leak.
--
-- ⚠️ ACCEPTED FALSE POSITIVE, carried over deliberately from the save_memory guard. A fact genuinely
-- about THIS business that merely mentions the other one — "the yard is sublet from Corvid Holdings"
-- — is parked too, because no rule at this level can tell a sentence's subject from its object. The
-- asymmetry is the whole argument: a wrongly-parked fact is one --restore away, and a wrongly-filed
-- one is a false statement about the business inside the document a buyer's accountant reads, which
-- nobody ever goes looking for.

CREATE OR REPLACE FUNCTION park_memory_naming_other_entity()
RETURNS TRIGGER AS $$
DECLARE
  matched TEXT;
BEGIN
  -- Already parked by the caller: nothing to decide, and re-deciding could only downgrade it.
  IF NEW.active IS FALSE THEN
    RETURN NEW;
  END IF;

  IF NEW.content IS NULL OR NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- The names this owner has already had parked. Length floor of 3 mirrors the application guard:
  -- a two-character "name" is inside half the Genome and would park everything.
  SELECT parked_entity INTO matched
  FROM kira_memory
  WHERE user_id = NEW.user_id
    AND parked_entity IS NOT NULL
    AND length(parked_entity) >= 3
    AND position(parked_entity IN lower(NEW.content)) > 0
  LIMIT 1;

  IF matched IS NOT NULL THEN
    NEW.active := FALSE;
    NEW.parked_reason := 'entity:other';
    NEW.parked_entity := matched;
    -- Visible in the Postgres log. A guard that fires silently cannot be told apart from one that
    -- never fires, and this one exists precisely because a silent path was found.
    RAISE NOTICE 'parked a memory naming another business: %', matched;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_park_memory_naming_other_entity ON kira_memory;

CREATE TRIGGER trg_park_memory_naming_other_entity
  BEFORE INSERT ON kira_memory
  FOR EACH ROW
  EXECUTE FUNCTION park_memory_naming_other_entity();

COMMENT ON FUNCTION park_memory_naming_other_entity IS
  'Keeps another company''s facts out of this Genome regardless of which path writes them. Keys on the parked entity NAME, because the distil paraphrases the fact text.';
