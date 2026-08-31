-- Beta telemetry, feedback, and cohort tables
-- Enables evidence capture per Beta Operations Directive §2–3

-- kira_telemetry: structured evidence for every meaningful beta interaction
create table if not exists kira_telemetry (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null,
  tester_id text not null,
  cohort text,
  workflow text not null,               -- signup | draft | create | chat | knowledge | voice
  model_provider text,                  -- elevenlabs | openai | supabase | etc
  latency_ms integer,
  outcome text not null,                -- pass | fail | degraded
  error_mode text,                      -- validation | provider_5xx | timeout | auth | unknown
  expected text,
  actual text,
  reproducible boolean,
  severity text,                        -- P0 | P1 | P2 | P3
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists kira_telemetry_tester_idx on kira_telemetry (tester_id);
create index if not exists kira_telemetry_workflow_idx on kira_telemetry (workflow);
create index if not exists kira_telemetry_created_idx on kira_telemetry (created_at);

-- kira_feedback: in-app beta feedback submissions
create table if not exists kira_feedback (
  id uuid primary key default gen_random_uuid(),
  tester_id text not null,
  cohort text,
  workflow text,                        -- which flow they were in
  rating integer check (rating between 1 and 5),
  category text,                        -- usability | bug | missing | praise | other
  description text not null,
  expected text,
  actual text,
  reproducible boolean,
  severity text,                        -- P0 | P1 | P2 | P3
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists kira_feedback_tester_idx on kira_feedback (tester_id);
create index if not exists kira_feedback_created_idx on kira_feedback (created_at);

-- beta_cohorts: cohort assignment for testers
create table if not exists beta_cohorts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  tester_id text not null unique,
  cohort text not null check (cohort in ('veteran', 'fresh', 'edge')),
  invited_by text,
  invited_at timestamptz default now(),
  confirmed_at timestamptz,
  first_login_at timestamptz,
  status text default 'invited' check (status in ('invited', 'active', 'inactive', 'completed')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists beta_cohorts_email_idx on beta_cohorts (email);
create index if not exists beta_cohorts_cohort_idx on beta_cohorts (cohort);
create index if not exists beta_cohorts_status_idx on beta_cohorts (status);

-- RLS: service role bypasses (server routes); anon/select for feedback form
alter table kira_telemetry enable row level security;
alter table kira_feedback enable row level security;
alter table beta_cohorts enable row level security;

-- Service role can do everything
drop policy if exists "service_role_all" on kira_telemetry;
drop policy if exists "service_role_all" on kira_feedback;
drop policy if exists "service_role_all" on beta_cohorts;
create policy "service_role_all" on kira_telemetry for all using (auth.role() = 'service_role');
create policy "service_role_all" on kira_feedback for all using (auth.role() = 'service_role');
create policy "service_role_all" on beta_cohorts for all using (auth.role() = 'service_role');

-- Anon can insert feedback (public feedback form)
drop policy if exists "anon_insert_feedback" on kira_feedback;
drop policy if exists "anon_insert_telemetry" on kira_telemetry;
create policy "anon_insert_feedback" on kira_feedback for insert with check (true);
create policy "anon_insert_telemetry" on kira_telemetry for insert with check (true);

-- Authenticated users can read their own feedback/telemetry
drop policy if exists "user_read_own_feedback" on kira_feedback;
drop policy if exists "user_read_own_telemetry" on kira_telemetry;
create policy "user_read_own_feedback" on kira_feedback for select using (auth.uid()::text = tester_id);
create policy "user_read_own_telemetry" on kira_telemetry for select using (auth.uid()::text = tester_id);

-- Updated at trigger for beta_cohorts
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists beta_cohorts_updated_at on beta_cohorts;
create trigger beta_cohorts_updated_at
  before update on beta_cohorts
  for each row execute function public.handle_updated_at();