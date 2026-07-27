-- Kira doing-slice: give a reminder a time to actually fire.
--
-- Until now `reminder` was the one kind the product could not keep its promise on. The owner said
-- "remind me to call the plumber tomorrow", the stub captured a free-text `due_hint` ("tomorrow
-- 9am") that nothing ever parsed, marked the task `done` at approval, and Kira said "Done." Nothing
-- fired, then or ever. A task table with no clock cannot hold a reminder.
--
-- Two changes: an absolute `due_at` the sweeper can compare against now(), and a `scheduled` status
-- so approval no longer claims completion for work that has not happened. Idempotent.

ALTER TABLE public.kira_tasks
  ADD COLUMN IF NOT EXISTS due_at timestamptz;

COMMENT ON COLUMN public.kira_tasks.due_at IS
  'When a scheduled task should fire (UTC). Set at approval for kind=reminder; null otherwise.';

-- status now also carries 'scheduled': approved, waiting for its due time, not yet executed.
-- (status is free text, so this is documentation rather than a constraint change.)
COMMENT ON COLUMN public.kira_tasks.status IS
  'queued | awaiting_approval | scheduled | done | failed | unsupported';

-- The sweeper's access path: due reminders, oldest first. Partial index because the sweep only ever
-- looks at scheduled rows, and they are a small minority of the table.
CREATE INDEX IF NOT EXISTS kira_tasks_due_idx
  ON public.kira_tasks (due_at)
  WHERE status = 'scheduled';
