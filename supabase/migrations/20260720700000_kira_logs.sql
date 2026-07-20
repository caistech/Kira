-- 20260720700000_kira_logs.sql
-- The kira_logs observability table — write-only structured request logs (request_id / step /
-- status / message / details) emitted by lib/kira/logger.ts and app/api/kira/create/route.ts.
--
-- Residual from the voice-memory canonical-adoption sweep (PRs #2/#3): both writers already
-- `insert into kira_logs`, but no migration ever created the table, so every persistent-log insert
-- silently failed (caught → console fallback). Logs survived in Vercel but never in Supabase. This
-- creates the table so the intended persistent logging works. No code change needed — the existing
-- insert payloads match these columns exactly.
--
-- Per DATA_STANDARD: internal operational telemetry, service-role-only. NOT user data — RLS is on
-- with no policies, so only the service role (which bypasses RLS) can read/write it.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS kira_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  step TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('start', 'success', 'error')),
  message TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Query by request (trace one create flow) and recency.
CREATE INDEX IF NOT EXISTS kira_logs_request_idx ON kira_logs (request_id);
CREATE INDEX IF NOT EXISTS kira_logs_created_idx ON kira_logs (created_at DESC);

-- RLS on, no policies: deny-all to anon/authenticated; the service-role writers bypass RLS.
ALTER TABLE kira_logs ENABLE ROW LEVEL SECURITY;
