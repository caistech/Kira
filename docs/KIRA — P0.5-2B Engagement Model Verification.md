# KIRA — P0.5-2B Engagement Model Verification

**Status:** Verification Gate
**Purpose:** Verify engagement model before proceeding to Step 2C
**Scope:** Schema verification, helper function verification, independence verification
**Prerequisite:** P0.5 Step 2B migration applied to database
**Date:** 26 August 2026

---

## 1. Purpose

This artifact verifies the engagement model before proceeding to Step 2C (Consultant / Engagement access semantics). It verifies that:

1. Engagement tables exist and are correctly structured.
2. Helper functions work correctly.
3. Engagement is independent of Subscription.
4. History is preserved.
5. Step 1 and 2A remain green.

---

## 2. Verification Checklist

### 2.1 Schema Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `engagements` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engagements')` | `true` | |
| `engagement_participants` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engagement_participants')` | `true` | |
| `engagement_history` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engagement_history')` | `true` | |

### 2.2 Constraint Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `engagements` has CHECK constraint on engagement_type | `SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%engagements%' AND contype = 'c')` | `true` | |
| `engagements` has CHECK constraint on status | `SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%engagements%' AND contype = 'c')` | `true` | |
| `engagement_participants` has CHECK constraint on participant_type | `SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%engagement_participants%' AND contype = 'c')` | `true` | |

### 2.3 Independence Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| No FK from engagements to subscriptions | Review table constraints | No FK | |
| No FK from engagement_participants to subscriptions | Review table constraints | No FK | |
| Engagement is first-class entity | Verify table structure | Independent | |

### 2.4 Helper Function Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `is_engagement_active()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_engagement_active')` | `true` | |
| `get_organisation_engagements()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_organisation_engagements')` | `true` | |
| `get_engagement_participants()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_engagement_participants')` | `true` | |

### 2.5 Backfill Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| No engagements exist yet | `SELECT COUNT(*) FROM engagements` | `0` | |
| No engagement participants exist yet | `SELECT COUNT(*) FROM engagement_participants` | `0` | |
| No engagement history exists yet | `SELECT COUNT(*) FROM engagement_history` | `0` | |

### 2.6 Step 1/2A Regression Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| organisations table unchanged | `SELECT COUNT(*) FROM organisations` | Same as before 2B | |
| persons table unchanged | `SELECT COUNT(*) FROM persons` | Same as before 2B | |
| organisation_memberships table unchanged | `SELECT COUNT(*) FROM organisation_memberships` | Same as before 2B | |
| consultant_profiles table unchanged | `SELECT COUNT(*) FROM consultant_profiles` | Same as before 2B | |
| consultant_relationships table unchanged | `SELECT COUNT(*) FROM consultant_relationships` | Same as before 2B | |
| Knowledge tables unchanged | `SELECT COUNT(*) FROM genome_entities` | Same as before 2B | |

### 2.7 Migration Ledger Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Ledger has engagement model entry | `SELECT COUNT(*) FROM migration_ledger WHERE source_table = 'engagements'` | `>= 1` | |
| Ledger entry has resolution_status | `SELECT COUNT(*) FROM migration_ledger WHERE source_table = 'engagements' AND resolution_status IS NULL` | `0` | |

---

## 3. Verification Gate

All checks must pass before proceeding to Step 2C. If any check fails:

1. Record the failure in the verification log.
2. Identify the root cause.
3. Fix the migration.
4. Re-run verification.

**No access semantics are applied until all verification checks pass.**

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
| B5.1 | PENDING (Step 2B) | CANONICAL PASS | Engagement model now exists |

**Step 2B exit criterion:** 95/95 PASS on canonical target database. Engagement tables exist. Helper functions work. No legacy data backfilled. 0 legacy failures remain PENDING for Step 2.

---

*This artifact is the P0.5-2B engagement model verification gate. It must pass before proceeding to Step 2C (Consultant / Engagement access semantics).*
