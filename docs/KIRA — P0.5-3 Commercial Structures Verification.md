# KIRA — P0.5 Step 3 Commercial Structures Verification

**Status:** Verification Gate
**Purpose:** Verify commercial structures before proceeding to Step 4
**Scope:** Schema verification, backfill verification, independence verification
**Prerequisite:** P0.5 Step 3 migration applied to database
**Date:** 26 August 2026

---

## 1. Purpose

This artifact verifies commercial structures before proceeding to Step 4 (Kira Instance Separation). It verifies that:

1. Commercial tables exist and are correctly structured.
2. Pricing tiers are not hardcoded.
3. Subscriptions are backfilled from legacy data.
4. Commercial structures are independent of Organisation identity.
5. Steps 1-2 remain green.

---

## 2. Verification Checklist

### 2.1 Schema Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `pricing_tiers` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pricing_tiers')` | `true` | |
| `subscriptions` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions')` | `true` | |
| `commercial_arrangements` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commercial_arrangements')` | `true` | |
| `commercial_history` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commercial_history')` | `true` | |
| `subscription_history` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_history')` | `true` | |

### 2.2 Backfill Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Default pricing tiers exist | `SELECT COUNT(*) FROM pricing_tiers` | `>= 1` | |
| Subscriptions backfilled from legacy | `SELECT COUNT(*) FROM subscriptions` | Matches users with subscription_status | |

### 2.3 Independence Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| No FK from organisations to subscriptions | Review table constraints | No FK | |
| No FK from organisations to commercial_arrangements | Review table constraints | No FK | |
| Subscription is first-class entity | Verify table structure | Independent | |

### 2.4 Helper Function Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `get_organisation_subscription()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_organisation_subscription')` | `true` | |
| `is_subscription_active()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_subscription_active')` | `true` | |

### 2.5 Step 1/2 Regression Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| organisations table unchanged | `SELECT COUNT(*) FROM organisations` | Same as before Step 3 | |
| persons table unchanged | `SELECT COUNT(*) FROM persons` | Same as before Step 3 | |
| organisation_memberships table unchanged | `SELECT COUNT(*) FROM organisation_memberships` | Same as before Step 3 | |
| consultant_profiles table unchanged | `SELECT COUNT(*) FROM consultant_profiles` | Same as before Step 3 | |
| engagements table unchanged | `SELECT COUNT(*) FROM engagements` | Same as before Step 3 | |

### 2.6 Migration Ledger Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Ledger has commercial structures entry | `SELECT COUNT(*) FROM migration_ledger WHERE source_table = 'commercial_structures'` | `>= 1` | |
| Ledger entry has resolution_status | `SELECT COUNT(*) FROM migration_ledger WHERE source_table = 'commercial_structures' AND resolution_status IS NULL` | `0` | |

---

## 3. Verification Gate

All checks must pass before proceeding to Step 4. If any check fails:

1. Record the failure in the verification log.
2. Identify the root cause.
3. Fix the migration.
4. Re-run verification.

**No Kira Instance separation is applied until all verification checks pass.**

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
| B7.1 | PENDING (Step 6) | CANONICAL PASS | Subscription now exists as first-class entity |
| B7.3 | (not yet tested) | CANONICAL PASS | Commercial arrangements now exist |
| B7.4 | (not yet tested) | CANONICAL PASS | Pricing tiers are data-driven, not hardcoded |

**Step 3 exit criterion:** 95/95 PASS on canonical target database. Commercial tables exist. Pricing tiers are data-driven. Subscriptions backfilled. 0 legacy failures remain PENDING for Step 3.

---

*This artifact is the P0.5-3 commercial structures verification gate. It must pass before proceeding to Step 4 (Kira Instance Separation).*
