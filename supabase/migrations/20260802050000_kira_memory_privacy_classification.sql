-- 20260802050000_kira_memory_privacy_classification.sql
--
-- TEACHING THE CLASSIFIER THE TWO THINGS IT WAS NEVER ASKED.
--
-- `lib/genome/private.ts` keeps the owner's position out of the buyer's handover document, and it is
-- a deterministic matcher — so its weakness is RECALL. A paraphrase that avoids every pattern walks
-- straight through into a document we told him to hand to an advisor. Separately, facts about the
-- SOFTWARE keep landing in `only-you` instead of `none`, so the same document currently carries the
-- vendor's AI-assistant preferences. (BUILD_REGISTER B13 and B14.)
--
-- Both are answered by the classifier that already runs. `classifyPendingMemories` makes exactly one
-- gpt-4.1-mini call per row to decide `genome_section` and `genome_headline`; these columns hold two
-- more fields off that SAME call. No extra request, no extra cost, no new failure mode.
--
-- ── WHY THREE COLUMNS AND NOT TWO ───────────────────────────────────────────────────────────────
--
-- `genome_private_reason` is nullable, and NULL has to mean two different things unless we separate
-- them: "we asked and it is not private" versus "we never asked, because this row was classified
-- before the question existed". Roughly 600 rows are in the second state right now. Without
-- `genome_privacy_classified_at`, a half-finished backfill is indistinguishable from a completed one
-- that found nothing — which is the same shape as the bug that made the confirmation record
-- invisible, and it would make the backfill impossible to resume honestly.
--
-- ── WHAT THIS DOES NOT DO ───────────────────────────────────────────────────────────────────────
--
-- It does not become the sole gate. The privacy decision at render time is the UNION of the
-- deterministic matcher and this column — never a replacement. A model that fails, times out, or
-- answers NULL can therefore only ever fail towards WITHHOLDING, never towards disclosure. The
-- matcher is the floor; this raises the ceiling.
--
-- Nothing is backfilled here. Re-classification MOVES FACTS OUT OF A REAL OWNER'S GENOME — a row
-- going `only-you` → `none` disappears from his page — so it runs as a dry-run report first,
-- reviewed by the operator, then applied, then revertible. Same posture as the entity split
-- (scripts/split-genome-entity.mjs). A migration that silently rewrote a live business record would
-- be exactly the thing we would not let the product do to him.

-- Why the entry is what it is: 'business' (how the business runs — the only kind a buyer's document
-- should carry), 'software' (about Kira, the app, what access it has — belongs in 'none'), or
-- 'personal' (about the owner's life rather than the business).
ALTER TABLE kira_memory ADD COLUMN IF NOT EXISTS genome_about TEXT;

-- Which category of the owner's own position this is, when it is one. Vocabulary is shared verbatim
-- with lib/genome/private.ts PrivateReason so the matcher and the model speak the same language and
-- a reason can be rendered to the owner without a translation table.
ALTER TABLE kira_memory ADD COLUMN IF NOT EXISTS genome_private_reason TEXT;

-- Set whenever the privacy question was PUT, regardless of the answer. This is what makes NULL
-- readable: reason NULL + this NULL means never asked; reason NULL + this set means asked and no.
ALTER TABLE kira_memory ADD COLUMN IF NOT EXISTS genome_privacy_classified_at TIMESTAMPTZ;

COMMENT ON COLUMN kira_memory.genome_about IS
  'business | software | personal — why the entry is filed where it is. software should reach genome_section = none.';
COMMENT ON COLUMN kira_memory.genome_private_reason IS
  'exit-intent | not-yet-told | personal-circumstances | negotiating-position | how-he-feels, or NULL. Matches lib/genome/private.ts. NEVER the sole gate — render-time privacy is this OR the deterministic matcher.';
COMMENT ON COLUMN kira_memory.genome_privacy_classified_at IS
  'When the privacy question was asked, whatever the answer. Distinguishes "asked, not private" from "never asked" — without it a half-run backfill looks finished.';

-- The backfill selects on this, and it is the only query pattern added.
CREATE INDEX IF NOT EXISTS idx_kira_memory_privacy_unclassified
  ON kira_memory (user_id)
  WHERE genome_privacy_classified_at IS NULL;
