# KIRA — P0.5 Step 5 Decision / Action / Outcome / Learning Verification

**Status:** Verification Gate
**Purpose:** Verify decision lifecycle model before proceeding to Step 6
**Scope:** Schema verification, organisational anchoring verification
**Prerequisite:** P0.5 Step 5 migration applied to database
**Date:** 26 August 2026

---

## 1. Purpose

This artifact verifies the decision lifecycle model before proceeding to Step 6 (Retirement of Legacy Authority). It verifies that:

1. All decision lifecycle tables exist and are correctly structured.
2. All tables are organisationally anchored.
3. Steps 1-4 remain green.

---

## 2. Verification Checklist

### 2.1 Schema Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `decisions` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decisions')` | `true` | |
| `decision_history` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_history')` | `true` | |
| `actions` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'actions')` | `true` | |
| `outcomes` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'outcomes')` | `true` | |
| `learnings` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'learnings')` | `true` | |

### 2.2 Organisational Anchoring Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| All tables have organisation_id FK | Review table constraints | All reference organisations | |
| decisions.organisation_id NOT NULL | `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'decisions' AND column_name = 'organisation_id'` | NO | |
| actions.organisation_id NOT NULL | `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'actions' AND column_name = 'organisation_id'` | NO | |
| outcomes.organisation_id NOT NULL | `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'outcomes' AND column_name = 'organisation_id'` | NO | |
| learnings.organisation_id NOT NULL | `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'learnings' AND column_name = 'organisation_id'` | NO | |

### 2.3 Helper Function Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `get_organisation_decisions()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_organisation_decisions')` | `true` | |
| `get_organisation_learnings()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_organisation_learnings')` | `true` | |

### 2.4 Step 1-4 Regression Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| organisations table unchanged | `SELECT COUNT(*) FROM organisations` | Same as before Step 5 | |
| persons table unchanged | `SELECT COUNT(*) FROM persons` | Same as before Step 5 | |
| organisation_memberships table unchanged | `SELECT COUNT(*) FROM organisation_memberships` | Same as before Step 5 | |
| subscriptions table unchanged | `SELECT COUNT(*) FROM subscriptions` | Same as before Step 5 | |
| kira_instances table unchanged | `SELECT COUNT(*) FROM kira_instances` | Same as before Step 5 | |
| consultant_profiles table unchanged | `SELECT COUNT(*) FROM consultant_profiles` | Same as before Step 5 | |
| engagements table unchanged | `SELECT COUNT(*) FROM engagements` | Same as before Step 5 | |

### 2.5 Migration Ledger Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Ledger has decision lifecycle entry | `SELECT COUNT(*) FROM migration_ledger WHERE source_table = 'decision_lifecycle'` | `>= 1` | |

---

## 3. Verification Gate

All checks must pass before proceeding to Step 6. If any check fails:

1. Record the failure in the verification log.
2. Identify the root cause.
3. Fix the migration.
4. Re-run verification.

**No legacy authority retirement until all verification checks pass.**

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

All legacy failures should now be reclassified to CANONICAL PASS or addressed by the canonical model.

**Step 5 exit criterion:** 95/95 PASS on canonical target database. All decision lifecycle tables exist. All tables organisationally anchored. 0 legacy failures remain PENDING.

---

*This artifact is the P0.5-5 decision lifecycle verification gate. It must pass before proceeding to Step 6 (Retirement of Legacy Authority).*