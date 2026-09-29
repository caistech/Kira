-- Task discovery — the operational-completeness layer, merged into the existing checklist surface.
--
-- The static 50-item checklist (lib/genome/checklist.ts) + the admission ledger
-- (genome_admission_ledger) answer one question: "is this business sellable" — a buyer's fixed,
-- curated set of questions, portfolio-wide. They were never meant to, and do not, answer the
-- separate claim made to BBBO owners: that every actual task making up THIS business gets mapped
-- and locked into an SOP well enough that the owner could take 12 weeks off. That needs a
-- per-business, genuinely open-ended task list — unbounded, unlike the curated 50, and private to
-- one organisation, unlike the operator-admitted cohort items in genome_admission_ledger.
--
-- This table is that list. It plugs into the SAME item-source extension point the admission ledger
-- already uses (`itemsForArea(area, extra)`, `assessAreaEntries(..., extraItems)` in
-- lib/genome/checklist.ts / checklist-assess.ts) — gate 2's substance tests, gate 4's pathways, and
-- the evidenced-readiness rollup are UNCHANGED and already generic over "any ChecklistItem, however
-- sourced." Nothing here duplicates that machinery; see lib/genome/tasks.ts for the mapping.
--
-- `factor` is not a column here because a task-derived ChecklistItem always sets factor: null in
-- code (lib/genome/tasks.ts taskToChecklistItem) — tasks measure operational completeness, never
-- the valuation multiple. Conflating the two is the exact failure PRODUCT_MEASURED_SYSTEMISATION.md
-- warns against ("do not price a compliance gain as an enterprise-value gain until it is
-- calibrated"), and it is why `readiness` / `readiness_now` are untouched by anything in this file.
--
-- Organisation-scoped (INV-020: organisations are the tenant), same anchor as genome_item_status /
-- genome_pathways. Idempotent throughout, RLS on, service-role writes only, per the portfolio
-- migration rule.

create table if not exists public.genome_tasks (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(organisation_id) on delete cascade,

  -- Provenance only, same reading as genome_item_status.user_id — who was talking to her when the
  -- task surfaced. Ownership is organisation_id.
  discovered_by_user_id uuid not null references public.users(id) on delete cascade,

  area text not null,

  -- Generated, globally unique, never reused. Deliberately NOT derived from `name` (a slug): the
  -- owner renames things mid-conversation ("actually I call it the Tuesday run") and a
  -- name-derived key would either drift from genome_item_status verdicts already stored against it,
  -- or force a rename to become a delete+recreate. The id is stable; `name` is not.
  item_key text not null unique,

  -- What the owner (or Kira, provisionally) calls it. Drives the generated substance test — see
  -- lib/genome/tasks.ts taskToChecklistItem().
  name text not null,

  -- How it entered the record. Appearing here is Kira NOTICING a distinct task, not the owner
  -- confirming it exists or is complete — confirmation is gate 1/2's job, same as every other item.
  source_type text not null default 'conversation' check (source_type in ('conversation', 'owner_input')),
  source_conversation_id text,

  created_at timestamptz not null default now(),

  -- Soft delete, mirrors genome_pathways.abandoned_reason: "we don't do that any more" is data, never
  -- a hard delete — a retired task's history (verdicts/pathways already stored against its item_key)
  -- must stay readable rather than orphaned.
  retired_at timestamptz,
  retired_reason text
);

create index if not exists genome_tasks_org_area_idx
  on public.genome_tasks (organisation_id, area)
  where retired_at is null;

alter table public.genome_tasks enable row level security;

drop policy if exists genome_tasks_owner_read on public.genome_tasks;
create policy genome_tasks_owner_read on public.genome_tasks
  for select using (
    exists (
      select 1 from organisation_memberships om
      where om.organisation_id = genome_tasks.organisation_id
        and om.person_id = (
          select person_id from auth_credentials
          where auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub'
        )
        and om.status = 'active'
    )
  );

comment on table public.genome_tasks is
  'Per-organisation, open-ended task inventory — the operational-completeness layer beside the '
  'fixed 50-item checklist. Rows here become live ChecklistItems via lib/genome/tasks.ts and are '
  'merged into itemsForArea()/assessAreaEntries() exactly like admitted items. factor is always '
  'null in the generated item: tasks never move the valuation number, only the separate '
  'operational-coverage read (lib/genome/tasks.ts taskCoverageForArea).';
