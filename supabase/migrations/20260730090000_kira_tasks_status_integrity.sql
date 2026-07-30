-- Repair the rows whose status became a JSON blob, then make the column refuse the next one.
--
-- WHAT HAPPENED. The reconcile cron read the orchestrator's authoritative TaskStatus and wrote the
-- whole OBJECT into `status` instead of its `status` field. Three tasks — a test email, a second
-- test, and a client-ready $60,000 quote for Trinh — ended up with
-- `{"taskGroupId":…,"status":"queued","draft":{…}}` where a status belongs. Every reader asks for one
-- of six names, so those rows matched nothing: not the approval flow, not /admin/asked-for. They sat
-- in the database and on no page for two days while the owner believed they had been sent.
--
-- The typo is not the defect. Three layers each had the chance to stop it and none did: a bare
-- `as TaskState` cast that validates nothing, a comparison of an object against a string that is
-- never equal so every run rewrote the damage, and a text column that accepts any string at all.
-- The code fixes the first two. This fixes the third, so the same class of write fails loudly at the
-- boundary rather than becoming an invisible row.
--
-- ORDER MATTERS: the cron runs every 20 minutes, so this repair is only durable alongside the code
-- change that stops the writer. Applied on its own, the blobs return within the hour.
--
-- Idempotent.

-- 1. Unwrap every blob whose embedded status is one Kira actually recognises. The drafts, recipients
--    and summaries were never damaged — only the one column — so this is a lossless recovery.
UPDATE public.kira_tasks
SET status = status::json->>'status'
WHERE status LIKE '{%'
  AND status::json->>'status' IN
      ('queued', 'awaiting_approval', 'scheduled', 'done', 'failed', 'unsupported');

-- 2. Anything still unreadable becomes 'failed' rather than blocking the constraint below.
--    'failed' on purpose: it is the state the operator queue SHOWS. A row we cannot interpret must
--    end up in front of a person, not quietly parked in a state nobody reads.
UPDATE public.kira_tasks
SET status = 'failed'
WHERE status NOT IN
      ('queued', 'awaiting_approval', 'scheduled', 'done', 'failed', 'unsupported');

-- 3. The backstop. Had this existed, the bad write would have errored inside a fail-soft catch —
--    logged and skipped — instead of persisting and looking exactly like a healthy row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'kira_tasks_status_check'
      AND conrelid = 'public.kira_tasks'::regclass
  ) THEN
    ALTER TABLE public.kira_tasks
      ADD CONSTRAINT kira_tasks_status_check
      CHECK (status IN ('queued', 'awaiting_approval', 'scheduled', 'done', 'failed', 'unsupported'));
  END IF;
END $$;
