-- Two holes found on 2026-08-10, both in the path a visitor's question travels.
--
-- 1. A PUBLIC ASK WAS RECORDED NOWHERE. `POST /api/kira/ask` — the box on the landing page —
--    only ever sent an operator alert. `kira_tasks.user_id` was NOT NULL, so an anonymous ask had
--    no row to go in, which made the EMAIL the record. If the throttle suppressed that email the
--    question was gone for good, while the email itself invited the reader to "See the build
--    queue →" for an item that had never been added to it.
--
--    NULL means "asked by a visitor with no account", which is exactly what it is. The existing RLS
--    policy is `auth.uid() = user_id`, and NULL never equals anything — so anonymous rows are
--    invisible to every authenticated user and readable only by the service role, which is the
--    admin build queue. That is the correct outcome and it needs no new policy.
--
--    ⚠️ UNIQUE (user_id, intent_id) no longer constrains anonymous rows, because Postgres treats
--    NULLs as distinct. Deliberate: idempotency exists so one owner's utterance never dispatches
--    twice, and a public ask dispatches nothing. Two visitors asking the same thing are two events
--    and should both be kept.
--
-- 2. THE ALERT THROTTLE WAS PER SERVERLESS INSTANCE. Added 2026-08-03 after this alert exhausted
--    the portfolio's shared Resend daily quota and took auth email down for EVERY product on the
--    account. Its state was a module-level Map, so on a low-traffic public endpoint nearly every
--    request landed on a fresh instance with an empty map and a zeroed counter — the operator's
--    inbox shows three identical alerts four minutes apart inside a ten-minute dedupe window.
--
--    `/api/kira/ask` is public and unauthenticated, so the flood is reachable by a stranger with
--    curl, and the blast radius is every other product's ability to log a user in.

-- ── 1. anonymous asks can be recorded ────────────────────────────────────────
ALTER TABLE public.kira_tasks ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN public.kira_tasks.user_id IS
  'The owner (tenant). NULL = asked by a visitor with no account via the public /api/kira/ask. '
  'RLS (auth.uid() = user_id) never matches NULL, so anonymous rows are service-role-only.';

-- ── 2. the throttle survives a cold start ────────────────────────────────────
-- Append-only. One row per alert actually sent; the two limits are both questions about this table
-- rather than about the memory of whichever instance happened to answer.
CREATE TABLE IF NOT EXISTS public.unanswered_alert_sends (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utterance_key text NOT NULL,                       -- sha256 of the normalised utterance
  sent_at       timestamptz NOT NULL DEFAULT now()
);

-- The ceiling asks "how many in the window", the dedupe asks "this one, in the window".
CREATE INDEX IF NOT EXISTS unanswered_alert_sends_sent_at_idx
  ON public.unanswered_alert_sends (sent_at DESC);
CREATE INDEX IF NOT EXISTS unanswered_alert_sends_key_sent_at_idx
  ON public.unanswered_alert_sends (utterance_key, sent_at DESC);

-- RLS on with NO policy: service role only (CLAUDE.md — RLS on every table). Nobody signing in has
-- any business reading the operator's alerting history, and the utterance column carries whatever a
-- stranger typed into a public box.
ALTER TABLE public.unanswered_alert_sends ENABLE ROW LEVEL SECURITY;
