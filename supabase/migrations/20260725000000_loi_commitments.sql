-- LOI / letter-of-intent capture: the structured commitment a prospect records after experiencing
-- Kira. This is the load-bearing artifact for the financing/validation thesis ("get LOIs, then come
-- for financing"). Public form writes via the service role only; RLS-on with no public policies means
-- the client can never read/write it directly — reads go through the server (admin).
CREATE TABLE IF NOT EXISTS public.loi_commitments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  name              text NOT NULL,
  email             text NOT NULL,
  business_name     text,
  role              text,
  -- Primary commitment level: start_paid | paid_pilot | interested | refer
  commitment_level  text NOT NULL,
  commitment_detail text,          -- free-text expression of intent
  monthly_intent    numeric,       -- $/mo they'd commit (optional)
  refer_count       integer,       -- peers they'd recommend to (optional)
  signature         text,          -- typed name as signature
  consent           boolean NOT NULL DEFAULT false,
  source            text,          -- which surface: commit_page | chat | dashboard | demo
  user_id           uuid REFERENCES public.users(id) ON DELETE SET NULL,
  agent_id          text           -- elevenlabs agent id if captured from a chat session
);

ALTER TABLE public.loi_commitments ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: only the service role (server) reads/writes. Admin views go server-side.

CREATE INDEX IF NOT EXISTS loi_commitments_created_idx ON public.loi_commitments (created_at DESC);
