# KIRA — P0.5 Step 4 Kira Instance Separation Verification

**Status:** Verification Gate
**Purpose:** Verify Kira Instance separation before proceeding to Step 5
**Scope:** Schema verification, backfill verification, independence verification
**Prerequisite:** P0.5 Step 4 migration applied to database
**Date:** 26 August 2026

---

## 1. Purpose

This artifact verifies Kira Instance separation before proceeding to Step 5 (Decision / Action / Outcome / Learning). It verifies that:

1. Kira Instance tables exist and are correctly structured.
2. Kira Instances are backfilled from legacy data.
3. Kira Instance is separate from Organisation.
4. Multiple Kira Instances per Organisation are possible.
5. Steps 1-3 remain green.

---

## 2. Verification Checklist

### 2.1 Schema Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `kira_instances` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kira_instances')` | `true` | |
| `kira_instance_history` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kira_instance_history')` | `true` | |

### 2.2 Backfill Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Kira Instances backfilled from legacy | `SELECT COUNT(*) FROM kira_instances` | Matches kira_agents with organisation_id | |

### 2.3 Independence Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| No FK from organisations to kira_instances | Review table constraints | No FK | |
| Kira Instance is subordinate to Organisation | Verify FK direction | kira_instances.organisation_id → organisations | |

### 2.4 Helper Function Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `get_kira_instance()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_kira_instance')` | `true` | |
| `get_organisation_kira_instances()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_organisation_kira_instances')` | `true` | |

### 2.5 Step 1-3 Regression Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| organisations table unchanged | `SELECT COUNT(*) FROM organisations` | Same as before Step 4 | |
| persons table unchanged | `SELECT COUNT(*) FROM persons` | Same as before Step 4 | |
| organisation_memberships table unchanged | `SELECT COUNT(*) FROM organisation_memberships` | Same as before Step 4 | |
| subscriptions table unchanged | `SELECT COUNT(*) FROM subscriptions` | Same as before Step 4 | |

### 2.6 Migration Ledger Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Ledger has Kira Instance entry | `SELECT COUNT(*) FROM migration_ledger WHERE source_table = 'kira_instances'` | `>= 1` | |

---

## 3. Verification Gate

All checks must pass before proceeding to Step 5. If any check fails:

1. Record the failure in the verification log.
2. Identify the root cause.
3. Fix the migration.
4. Re-run verification.

**No Decision / Action / Outcome / Learning is created until all verification checks pass.**

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
| B6.1 | PENDING (Step 7) | CANONICAL PASS | Kira Instance is now separate from Organisation |

**Step 4 exit criterion:** 95/95 PASS on canonical target database. Kira Instance tables exist. Backfilled from legacy. Separate from Organisation. 0 legacy failures remain PENDING for Step 4.

---

*This artifact is the P0.5-4 Kira Instance separation verification gate. It must pass before proceeding to Step 5 (Decision / Action / Outcome / Learning).*
