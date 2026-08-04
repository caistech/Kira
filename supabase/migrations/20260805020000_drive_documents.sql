-- 20260805020000_drive_documents.sql
-- DB: Kira (kmrskyewwnwettlycpfe) — NOT the orchestrator (xuzvurmprexhalnxgsdu) and not the cockpit.
--
-- WHERE EACH AREA OF THE MANUAL LIVES IN THE OWNER'S OWN DRIVE.
--
-- This is the idempotency map, and it is a table rather than a convention because the alternative
-- fails in a way the owner sees. Drive keys on id, not on name: without a stored handle every run
-- CREATES, so the third session leaves twenty-seven documents in his folder and he stops trusting
-- it. A manual he does not trust is worth less than no manual, because he will not hand it to
-- anyone — which is the only thing it is for.
--
-- The same class as the tool-list defect that stripped the fleet twice: a rule that lives in
-- someone's head about how to call a function is not a mechanism. Store the handle.
--
-- IDEMPOTENCY IS THE CALLER'S ON PURPOSE (see the orchestrator's upsertDoc). Drive cannot know that
-- "Cash and invoicing" is the same area it wrote last month, and matching on the document TITLE
-- would break the moment the owner renames it — which he is supposed to be able to do, because the
-- document is his.

CREATE TABLE IF NOT EXISTS drive_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 'owner' | 'buyer'. TWO DESTINATIONS, NEVER ONE FOLDER: the owner's manual carries his position
  -- and his plans; the buyer handover deliberately does not. A single synced folder he later shares
  -- with an advisor is the private/buyer leak at filesystem scale — one click, irreversible, and he
  -- would never know. Part of the key so the two can never collide on one file.
  audience       TEXT NOT NULL CHECK (audience IN ('owner', 'buyer')),

  -- The Genome area key, or 'unfiled'. Matches RenderedDocument.key in lib/genome/render.ts.
  area_key       TEXT NOT NULL,

  -- Which system of record this handle belongs to. The destination is swappable by design
  -- (see the orchestrator's docs/SYSTEM_OF_RECORD_PORT.md), so a handle is meaningless without it —
  -- a Drive file id handed to OneDrive is not an error anyone would enjoy diagnosing.
  destination    TEXT NOT NULL DEFAULT 'drive',

  -- The destination's own handle. Opaque here on purpose: Kira never interprets it.
  ref            TEXT NOT NULL,
  -- Where the owner can open it. Convenience only — never the identity of the document.
  url            TEXT,

  -- The folder this document sits in, so a re-run does not re-resolve it every time.
  container_ref  TEXT,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- When we last successfully wrote CONTENT, as distinct from when the row changed. "Shipped" and
  -- "working" are separate columns everywhere else in this product; so are these.
  last_written_at TIMESTAMPTZ
);

-- THE CONSTRAINT THAT IS THE WHOLE POINT. One document per (owner, audience, area, destination).
-- Without it the table records the duplicates instead of preventing them.
CREATE UNIQUE INDEX IF NOT EXISTS drive_documents_unique_slot
  ON drive_documents (user_id, audience, area_key, destination);

CREATE INDEX IF NOT EXISTS drive_documents_by_user ON drive_documents (user_id);

DROP TRIGGER IF EXISTS trg_drive_documents_updated ON drive_documents;
CREATE TRIGGER trg_drive_documents_updated BEFORE UPDATE ON drive_documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE drive_documents ENABLE ROW LEVEL SECURITY;

-- He may see where his own manual went — that is the transparency the whole write-back is for.
-- Writes are service-role only: this table decides which file gets overwritten, so an owner able to
-- insert a row could point his own manual at any file id he liked.
DROP POLICY IF EXISTS "own drive documents readable" ON drive_documents;
CREATE POLICY "own drive documents readable" ON drive_documents
  FOR SELECT USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = drive_documents.user_id));

COMMENT ON TABLE drive_documents IS
  'Where each area of the operating manual lives in the owner''s own system of record. The idempotency map: without it every write CREATES, and the third run leaves him a folder he stops trusting.';

COMMENT ON COLUMN drive_documents.audience IS
  'owner | buyer. Part of the unique key so the two renderings can never collide on one file — the owner''s copy carries his position and the buyer''s must not.';

COMMENT ON COLUMN drive_documents.last_written_at IS
  'Last successful CONTENT write, as distinct from updated_at. A row can exist because we tried; this says we succeeded.';
