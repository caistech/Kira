-- 20260801120000_kira_refusals_declined_because.sql
--
-- MAKE THE MODEL NAME THE DECISION, INSTEAD OF ASKING IT NOT TO GUESS.
--
-- The refusal record shipped with the rule stated in prose, in the strongest terms the tool
-- description could manage: "IMPORTANT — this is ONLY for decisions not to act. It is NOT for tool
-- failures: 'Drive isn't connected' or 'I couldn't reach your accounts' are things that went wrong,
-- not things you refused."
--
-- Twenty-four minutes after that shipped, a row was written reading:
--
--   asked:  "check the Marlow Street quote about the retaining wall"
--   reason: "no Google account is connected, so I cannot access your documents to check the quote"
--
-- Which is the prohibition's own example. The description was not unclear; it was a REQUEST, and a
-- request is not a mechanism. Worse, it argued against itself — its list of things TO record included
-- "he asks for something outside what you can do and you say no", and a disconnected Drive is, from
-- where the model sits, something outside what it can do.
--
-- So the classification stops being prose and becomes a required, constrained value. A refusal must
-- now arrive naming WHICH KIND it is. A tool failure has no value it can honestly pass, and the
-- CHECK constraint means a wrong one cannot be invented — the database refuses the row rather than
-- trusting the caller to have read the description.
--
-- THE BOUNDARY, stated once so every layer can repeat it: a refusal is IMPOSSIBLE IN PRINCIPLE, a
-- failure merely FAILED THIS TIME. "I don't lodge BAS" is a refusal (outside_scope — it is not a
-- thing she does). "Drive isn't connected" is a failure (reconnect it and the same request succeeds).
-- Reversibility by fixing a precondition is the test.
--
-- Nullable, because the rows already written predate the column and are not retro-classifiable
-- without guessing — which is the thing this migration exists to stop.

ALTER TABLE kira_refusals
  ADD COLUMN IF NOT EXISTS declined_because TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kira_refusals_declined_because_check'
  ) THEN
    ALTER TABLE kira_refusals
      ADD CONSTRAINT kira_refusals_declined_because_check
      CHECK (
        declined_because IS NULL
        OR declined_because IN ('no_approval', 'not_asked_to_keep', 'unverified', 'outside_scope')
      );
  END IF;
END $$;

COMMENT ON COLUMN kira_refusals.declined_because IS
  'Which kind of refusal. no_approval | not_asked_to_keep | unverified | outside_scope. NEVER a tool failure — a refusal is impossible in principle, a failure merely failed this time. NULL only on rows written before 2026-08-01.';
