-- Per-bucket rubrics, substance verdicts, and pathways.
--
-- Three tables and one column. See docs/SPEC_GENOME_CHECKLIST_AND_PATHWAYS.md for the four gates.
--
-- ⚠️ `business_valuations.readiness` IS NOT TOUCHED. It is the BASELINE — what the thirteen
-- questions said on the day — and recomputing it in place would silently rewrite the number every
-- owner was shown when he paid, which is the exact objection MODEL_VERSION exists to answer. The
-- movement lives in a new column beside it, so progress is a delta from a fixed origin.
--
-- Idempotent throughout (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS), per the portfolio
-- migration rule. RLS on every table, service-role only for writes.

-- 1. Where he is NOW, alongside the frozen baseline. ------------------------------------------

alter table public.business_valuations
  add column if not exists readiness_now numeric,
  add column if not exists readiness_now_at timestamptz;

comment on column public.business_valuations.readiness_now is
  'Evidenced transferability, 0-1, recomputed from assessed checklist items. NULL until first '
  'assessment. `readiness` remains the frozen baseline and must never be recomputed in place.';

-- 2. The per-item verdict. --------------------------------------------------------------------

create table if not exists public.genome_item_status (
  id uuid primary key default gen_random_uuid(),
  -- users.id, NOT auth.users.id. Every agent / conversation / kira_memory row references users.id
  -- (see 20260720100000_auth_link.sql) and the genome is derived by app user id throughout; a table
  -- keyed the other way joins to nothing and its RLS silently matches no rows.
  user_id uuid not null references public.users(id) on delete cascade,

  -- The stable key from lib/genome/checklist.ts. Deliberately NOT a foreign key to an items table:
  -- the checklist is CODE, held as data so a change is a config change and a re-score. Mirroring it
  -- into rows would mean a migration every time a broker disputes an item, which is exactly the
  -- rebuild the design refuses.
  item_key text not null,
  area text not null,

  status text not null check (status in ('open', 'weak', 'answered')),

  -- Why it is weak, in the owner's language. NULL unless status = 'weak'.
  -- This is the coaching, and it is stored rather than recomputed so the panel reads the same
  -- sentence twice running — a criticism that rewords itself on refresh reads as arbitrary.
  why text,

  -- kira_memory ids supporting the verdict, so a green item can be DEFENDED rather than asserted.
  evidence uuid[] not null default '{}',

  assessed_at timestamptz not null default now(),
  -- A verdict is only readable if you know what produced it. Same argument as MODEL_VERSION.
  assessed_by text,

  unique (user_id, item_key)
);

create index if not exists genome_item_status_user_area_idx
  on public.genome_item_status (user_id, area);

alter table public.genome_item_status enable row level security;

drop policy if exists genome_item_status_owner_read on public.genome_item_status;
create policy genome_item_status_owner_read on public.genome_item_status
  for select using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

-- 3. Pathways — gate 4. -----------------------------------------------------------------------

create table if not exists public.genome_pathways (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_key text not null,

  -- What good looks like, in HIS words rather than the checklist's. The checklist says "who could
  -- step into your job"; he says "Mark can run a Tuesday without me". The second one is what he
  -- will actually work towards.
  intent text not null,

  started_at timestamptz not null default now(),

  -- An abandoned pathway is data, not a failure to hide. "Mark left" is one of the more useful
  -- things this product could ever know about a business.
  abandoned_at timestamptz,
  abandoned_reason text,

  unique (user_id, item_key)
);

create table if not exists public.genome_pathway_milestones (
  id uuid primary key default gen_random_uuid(),
  pathway_id uuid not null references public.genome_pathways(id) on delete cascade,

  sequence integer not null,
  description text not null,

  -- What would PROVE it happened, written at planning time while nobody is invested in the answer.
  -- Deciding what counts as done after the work is how "well, he's basically doing it" becomes
  -- evidence.
  evidence_kind text not null,

  -- ⚠️ THE DISTINCTION THE WHOLE FEATURE RESTS ON.
  --   agreed_at   — he committed to it. Records intent. NEVER read by the scorer.
  --   evidenced_at — it was actually observed. THE ONLY COLUMN THAT MOVES THE NUMBER.
  -- If agreeing lifted the score the product would reward intending to change, and he would reach a
  -- data room with a good number and a business that still stops when he does.
  agreed_at timestamptz,
  evidenced_at timestamptz,
  evidence_note text,

  unique (pathway_id, sequence)
);

create index if not exists genome_pathways_user_idx on public.genome_pathways (user_id);
create index if not exists genome_pathway_milestones_pathway_idx
  on public.genome_pathway_milestones (pathway_id);

alter table public.genome_pathways enable row level security;
alter table public.genome_pathway_milestones enable row level security;

drop policy if exists genome_pathways_owner_read on public.genome_pathways;
create policy genome_pathways_owner_read on public.genome_pathways
  for select using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

drop policy if exists genome_pathway_milestones_owner_read on public.genome_pathway_milestones;
create policy genome_pathway_milestones_owner_read on public.genome_pathway_milestones
  for select using (
    pathway_id in (
      select p.id from public.genome_pathways p
      join public.users u on u.id = p.user_id
      where u.auth_user_id = auth.uid()
    )
  );

comment on table public.genome_pathways is
  'Gate 4 — gaps that only close by the business changing. A plan here moves no score; only a '
  'milestone with evidenced_at set does. See lib/genome/pathway.ts evidencedItemKeys().';
