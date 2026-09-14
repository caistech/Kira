-- Monotonic admission gate — the honesty guarantee, in data (T3).
--
-- Factors are NEVER removed. Admission is gated at entry with a high bar; once admitted an item
-- enters the live factor set and stays. This table is that guarantee:
--
--   * a row starts WATCHLISTED (everything surfaced, nothing admitted yet)
--   * the operator admits it (v1) with a journaled reason → ADMITTED. `admitted_by` is restricted
--     to operator|system in v1; the broker-visible seat is a v2 requirement (D6).
--   * ADMITTED items are read into the score AT READ TIME (lib/genome/checklist.ts) — a code
--     deploy is never needed for a new question, and the admission is journaled, never deleted
--   * retraction is FOR CAUSE ONLY (wrong specification / wrong cohort), journaled with
--     `retracted_at` + `retraction_reason` (D12). Baseline scores remain readable as what they were.
--   * retirement for COVERAGE is NOT removal: `no_longer_discriminative` flags "everyone now answers
--     it" — the item stays in the denominator and only stops loading the live score, and that only
--     with cohort evidence behind the flag.
--
-- COHORT-SCOPED, NOT ORGANISATION-SCOPED. The two admission tests are judged across the cohort —
-- "is this a thing a buyer asks of ANY business in this cohort?" and "does it discriminate?". So the
-- ledger is one set for the whole product: an admitted item enters every business's factor set, and
-- the unique (area_key, item_key) key IS the idempotency guarantee (D14) — a duplicate nomination
-- UPDATES the existing row, never inserts a second one.
--
-- Idempotent throughout (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS), per the
-- portfolio migration rule. RLS enabled; the service-role client is the only writer (admin actions
-- and the score read both run through it) and the policy mirrors that.

create table if not exists public.genome_admission_ledger (
  id uuid primary key default gen_random_uuid(),
  -- One of the nine census areas (lib/genome/areas.ts). The admission UI validates this against the
  -- static nine at write time; an item outside the census is a v2 area-creation feature, not a v1.
  area_key text not null,
  -- Stable, human-meaningful, kebab-case. NEVER renumbered — it is what assessed entries are
  -- matched and stored against, exactly like a static ChecklistItem.key. Must not collide with a
  -- static checklist key in the same area (enforced at write time, see the admission action).
  item_key text not null,
  -- The buyer's phrasing of the question, third person, for the handover document.
  buyer_item text not null,
  -- The same question asked of the owner, second person — the agenda and the panel copy.
  owner_prompt text not null,
  -- Which valuation factor this evidences, or null (most items complete the document rather than
  -- move the number). Mirrors ChecklistItem.factor.
  factor text
    check (factor is null or factor in ('ownerDependence','systems','recurringRevenue','clientConcentration','growth')),
  status text not null default 'watchlisted'
    check (status in ('watchlisted','admitted')),
  -- Journaled rationale for admission. Every admission has one — the bar has no silent members.
  reason text,
  -- v1 operator-scoped (D6). 'system' exists so the T2 wire (a doing-layer task that genuinely fits
  -- nowhere) can self-nominate into ADMITTED in a later change without a migration.
  admitted_by text
    check (admitted_by is null or admitted_by in ('operator','system')),
  watchlisted_at timestamptz not null default now(),
  admitted_at timestamptz,
  retracted_at timestamptz,
  retraction_reason text,
  -- Journaled cohort evidence for retirement-for-coverage: "everyone now answers it". The flag
  -- itself is `no_longer_discriminative`; this note is what makes the flag defensible to anyone who
  -- asks why it moved.
  evidence_note text,
  no_longer_discriminative boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint genome_admission_unique_pair unique (area_key, item_key)
);

comment on table public.genome_admission_ledger is
  'Monotonic admission gate (T3). Cohort-scoped: watchlist → operator admission → every '
  'business''s live factor set. Nothing is ever removed: retraction-for-cause is journaled, '
  'retirement-for-coverage is flagged.';

create index if not exists idx_genome_ledger_area_status on public.genome_admission_ledger(area_key, status);

-- The score read and the operator actions run through the service client; RLS is enabled and the
-- policy mirrors that reality, matching the sibling genome tables. The ledgable rows are never anon
-- or user-visible: the admin UI and the score both go through the service role.
alter table public.genome_admission_ledger enable row level security;

-- Repo policy pattern (no IF NOT EXISTS on CREATE POLICY here — this Postgres version lacks it).
drop policy if exists "Service role full access" on public.genome_admission_ledger;
create policy "Service role full access" on public.genome_admission_ledger
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');