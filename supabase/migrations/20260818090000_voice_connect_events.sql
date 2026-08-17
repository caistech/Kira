-- Voice connection telemetry.
--
-- WHY THIS EXISTS. A beta tester granted his microphone, got "Not connected", and gave up. The
-- failure left NO TRACE ANYWHERE — not in the runtime logs (retention had rolled past it by the
-- time he wrote), not in the database, not in any counter. Three sessions were then spent
-- reconstructing it from one sentence in an email, and the answer was still a guess.
--
-- The point is not to collect analytics. It is that a voice connection is the one step in this
-- product that fails on the CLIENT, in someone else's browser, on someone else's network — so it is
-- the one step we are structurally blind to unless the browser tells us. Everything else leaves a
-- server-side row.
--
-- ⚠️ `reachable` IS THE COLUMN THIS TABLE WAS BUILT FOR. On failure the browser probes ElevenLabs
-- directly. `false` means the network the visitor is on cannot reach the vendor at all — a
-- corporate proxy or firewall, nothing we can fix in code. `true` means it reached the vendor and
-- the session still failed, which IS ours. Without that one bit, every future report is the same
-- unresolvable argument.

create table if not exists public.voice_connect_events (
  id uuid primary key default gen_random_uuid(),
  -- Null for surfaces that run before sign-in (the landing widget, the valuation page). The row is
  -- still worth keeping: an anonymous visitor who cannot connect is a lost visitor.
  user_id uuid references public.users(id) on delete cascade,
  -- Which voice surface: 'start' | 'chat' | 'landing' | 'valuation' | 'pubguard'.
  surface text not null,
  -- 'connected' | 'signed_url_failed' | 'error' | 'stalled'.
  --
  -- 'connected' is recorded on purpose. A table holding only failures cannot answer "how often?",
  -- and "three failures" means something entirely different at thirty attempts than at three.
  outcome text not null,
  -- Short, redacted. See redactVoiceDetail — the signed URL carries a conversation signature and
  -- must never land here.
  detail text,
  -- Could the browser reach the vendor at all? Null when not probed (i.e. on success).
  reachable boolean,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists voice_connect_events_created_idx
  on public.voice_connect_events (created_at desc);
create index if not exists voice_connect_events_outcome_idx
  on public.voice_connect_events (outcome, created_at desc);

alter table public.voice_connect_events enable row level security;

-- NO POLICIES, DELIBERATELY. Nothing in the browser reads this table; the API route writes it with
-- the service role, which bypasses RLS. RLS on with zero policies is therefore deny-all for anon
-- and authenticated, which is the intent stated rather than assumed. If a surface ever needs to
-- read its own rows, add a narrow owner-scoped select policy then — not now, pre-emptively.
