-- Kira Exec doing-slice: the task store behind the SwarmCoordinator (lib/kira/swarm).
-- A dispatched intent lives here across voice turns — Kira drafts in one turn, the owner approves
-- in a later one, execution + notification close the loop. Today the LOCAL stub writes these; when
-- Gareth's swarm lands it implements the same SwarmCoordinator and can mirror state into this table
-- (or its own) with no change to Kira's read side. Idempotent.

CREATE TABLE IF NOT EXISTS public.kira_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,                       -- the owner (tenant); one agent per user today
  intent_id     text NOT NULL,                       -- idempotency key: one utterance never dispatches twice
  kind          text NOT NULL,                       -- 'quote' | 'email' | 'reminder' | 'unsupported'
  status        text NOT NULL DEFAULT 'awaiting_approval',
                -- 'queued' | 'awaiting_approval' | 'done' | 'failed' | 'unsupported'
  utterance     text NOT NULL,                       -- what the owner said, verbatim
  summary       text,                                -- one-line the owner hears ("Follow-up to Dave re: quote")
  preview       text,                                -- the full drafted content for review
  artifact      jsonb NOT NULL DEFAULT '{}'::jsonb,  -- structured payload the executor needs
  result        jsonb,                               -- execution outcome (message id, sent-at, error)
  handled_by    text NOT NULL DEFAULT 'local-stub',  -- 'local-stub' | 'swarm:<adapter>' — provenance
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, intent_id)                        -- idempotency
);

CREATE INDEX IF NOT EXISTS kira_tasks_user_status_idx
  ON public.kira_tasks (user_id, status, created_at DESC);

-- RLS on (CLAUDE.md: RLS on every table). Server routes use the service role (bypasses RLS); the
-- owner reads their own rows. No anon access.
ALTER TABLE public.kira_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kira_tasks_owner_select ON public.kira_tasks;
CREATE POLICY kira_tasks_owner_select ON public.kira_tasks
  FOR SELECT USING (auth.uid() = user_id);

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION public.kira_tasks_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS kira_tasks_touch ON public.kira_tasks;
CREATE TRIGGER kira_tasks_touch BEFORE UPDATE ON public.kira_tasks
  FOR EACH ROW EXECUTE FUNCTION public.kira_tasks_touch_updated_at();
