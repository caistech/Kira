# KIRA — P0.5-2A Consultant Relationship Model Verification

**Status:** Verification Gate
**Purpose:** Verify consultant relationship model before proceeding to Step 2B
**Scope:** Schema verification, helper function verification, history verification
**Prerequisite:** P0.5 Step 2A migration applied to database
**Date:** 26 August 2026

---

## 1. Purpose

This artifact verifies the consultant relationship model before proceeding to Step 2B (Engagement model). It verifies that:

1. Consultant tables exist and are correctly structured.
2. Helper functions work correctly.
3. History is preserved.
4. Consultant ≠ Introducer (separate concepts).
5. Step 1 remains green.

---

## 2. Verification Checklist

### 2.1 Schema Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `consultant_profiles` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultant_profiles')` | `true` | |
| `consultant_relationships` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultant_relationships')` | `true` | |
| `consultant_history` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultant_history')` | `true` | |
| `consultant_profiles` has correct columns | Check column names | consultant_id, person_id, organisation_name, abn, specialisation, status, created_at, updated_at | |
| `consultant_relationships` has correct columns | Check column names | relationship_id, consultant_id, organisation_id, relationship_type, status, valid_from, valid_to, created_at, updated_at | |
| `consultant_history` has correct columns | Check column names | history_id, relationship_id, consultant_id, organisation_id, action, action_timestamp, performed_by, reason, metadata | |

### 2.2 Constraint Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `consultant_profiles` has CHECK constraint | `SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%consultant_profiles%' AND contype = 'c')` | `true` | |
| `consultant_relationships` has CHECK constraint on relationship_type | `SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%consultant_relationships%' AND contype = 'c')` | `true` | |
| `consultant_relationships` has unique active constraint | `SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%consultant_relationships%' AND contype = 'u')` | `true` | |
| `consultant_history` has CHECK constraint on action | `SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%consultant_history%' AND contype = 'c')` | `true` | |

### 2.3 Index Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Index on consultant_profiles.person_id | `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_consultant_profiles_person_id')` | `true` | |
| Index on consultant_relationships.consultant_id | `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_consultant_relationships_consultant_id')` | `true` | |
| Index on consultant_relationships.organisation_id | `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_consultant_relationships_organisation_id')` | `true` | |

### 2.4 Helper Function Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `check_consultant_relationship()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_consultant_relationship')` | `true` | |
| `get_organisation_consultants()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_organisation_consultants')` | `true` | |
| `end_consultant_relationship()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'end_consultant_relationship')` | `true` | |

### 2.5 Consultant ≠ Introducer Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `introducers` table still exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'introducers')` | `true` | |
| `introductions` table still exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'introductions')` | `true` | |
| `consultant_profiles` is separate from `introducers` | Verify different tables | `true` | |
| No data migration from introducers to consultants | Verify no cross-table references | `true` | |

### 2.6 Backfill Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| No consultant relationships exist yet | `SELECT COUNT(*) FROM consultant_relationships` | `0` | |
| No consultant profiles exist yet | `SELECT COUNT(*) FROM consultant_profiles` | `0` | |
| No consultant history exists yet | `SELECT COUNT(*) FROM consultant_history` | `0` | |

### 2.7 Step 1 Regression Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| organisations table unchanged | `SELECT COUNT(*) FROM organisations` | Same as before 2A | |
| persons table unchanged | `SELECT COUNT(*) FROM persons` | Same as before 2A | |
| organisation_memberships table unchanged | `SELECT COUNT(*) FROM organisation_memberships` | Same as before 2A | |
| Knowledge tables unchanged | `SELECT COUNT(*) FROM genome_entities` | Same as before 2A | |

### 2.8 Migration Ledger Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Ledger has consultant model entry | `SELECT COUNT(*) FROM migration_ledger WHERE source_table = 'consultant_relationships'` | `>= 1` | |
| Ledger entry has resolution_status | `SELECT COUNT(*) FROM migration_ledger WHERE source_table = 'consultant_relationships' AND resolution_status IS NULL` | `0` | |

---

## 3. Verification Gate

All checks must pass before proceeding to Step 2B. If any check fails:

1. Record the failure in the verification log.
2. Identify the root cause.
3. Fix the migration.
4. Re-run verification.

**No engagement model is created until all verification checks pass.**

---

## 4. Test Suite Execution

After verification checks pass, run the 95-test suite:

| Test Layer | Expected Result |
|-----------|----------------|
| A. Migration Safety (33) | 33 PASS |
| B. Canonical Conformance (44) | 44 PASS |
| C. State Transition (18) | 18 PASS |
| **Total** | **95/95 PASS** |

### Reclassification of Pending Legacy Failures

| Test ID | Previous Classification | New Classification | Reason |
|---------|------------------------|-------------------|--------|
| B5.1 | PENDING (Step 5) | PENDING (Step 2B) | Engagement not yet created (next step) |

**Step 2A exit criterion:** 95/95 PASS on canonical target database. Consultant tables exist. Helper functions work. No legacy data backfilled. 1 legacy failure remains PENDING for Step 2B.

---

*This artifact is the P0.5-2A consultant relationship model verification gate. It must pass before proceeding to Step 2B (Engagement model).*
