-- Substance-test authoring on the admission ledger — the v2 surface the T3 migration reserved.
--
-- The T3 ledger admitted items that were JUDGED BY PRESENCE until the operator authored the real
-- test ("Judged by presence until the operator authors a substance test on the row (v2 surface)" in
-- lib/genome/checklist.ts). This is that surface, in data:
--
--   * `substance` is a JSONB SubstanceTest ({tests[], weakExample, strongExample, coaching}) or null.
--     Null mirrors ChecklistItem.substance — absence means presence is enough.
--   * the enforcement that makes it honest lives at the ACTION layer (admitAdmission):
--       - a factor-bearing item (factor NOT null) MUST carry a substance test before it goes live —
--         "the bar has no silent members"
--       - the YOLKLESS escape: an item can be admitted without a substance test by carrying no
--         factor at all (factor null) — it completes the document rather than moving the number,
--         and presence judgment is exactly the right bar for that.
--   * cohort evidence for retirement-for-coverage is COMPUTED at read time (lib/genome/
--     cohort-evidence.ts) over genome_item_status — no schema change needed for that claim to be
--     checkable; the flagRetired action snapshots the numbers into evidence_note so the journal is
--     self-describing even without a live query.
--
-- Idempotent, per the portfolio migration rule.

alter table public.genome_admission_ledger
  add column if not exists substance jsonb;

comment on column public.genome_admission_ledger.substance is
  'JSONB SubstanceTest ({tests[], weakExample, strongExample, coaching}). Null = judged by presence. '
  'Enforced at admission: a factor-bearing item must carry one; a factor-null item (the document ) '
  'may go live judged by presence (the yolkless escape).';