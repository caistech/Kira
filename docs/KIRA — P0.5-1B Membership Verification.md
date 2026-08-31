# KIRA — P0.5-1B Membership / Tenant Context Verification

**Status:** Verification Gate
**Purpose:** Verify the membership/tenant context migration before proceeding to Step 1C
**Scope:** Membership table, ownership periods, backfill verification, tenant context resolution
**Prerequisite:** P0.5 Step 1B migration applied to database
**Date:** 26 August 2026

---

## 1. Purpose

This artifact is the verification gate between the membership/tenant context (Step 1B) and the RLS authority transfer (Step 1C). It verifies that:

1. The membership table exists and is correctly structured.
2. Every canonical Person/Organisation relationship is deterministic.
3. No unregistered membership conflicts remain.
4. Tenant context can be resolved without relying on the old `users.id` semantic.
5. The migration is idempotent.
6. Rollback characteristics are verified.
7. Step 1A remains green.
8. No RLS authority has yet been transferred.

The governing principle is:

> **Membership establishes the canonical Person → Organisation access context. This context must be proven correct before RLS consumes it.**

---

## 2. Verification Checklist

### 2.1 Schema Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `organisation_memberships` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organisation_memberships')` | `true` | |
| `ownership_periods` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ownership_periods')` | `true` | |
| `organisation_memberships` has correct columns | `SELECT column_name FROM information_schema.columns WHERE table_name = 'organisation_memberships' ORDER BY ordinal_position` | membership_id, organisation_id, person_id, role, status, valid_from, valid_to, created_at, updated_at | |
| `ownership_periods` has correct columns | `SELECT column_name FROM information_schema.columns WHERE table_name = 'ownership_periods' ORDER BY ordinal_position` | ownership_period_id, organisation_id, person_id, status, valid_from, valid_to, created_at, updated_at | |
| `organisation_memberships` has unique constraint | `SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%organisation_memberships%' AND contype = 'u')` | `true` | |
| `ownership_periods` has CHECK constraint on status | `SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%ownership_periods%' AND contype = 'c')` | `true` | |

### 2.2 Membership Backfill Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Every user with business_identity has owner membership | `SELECT u.id FROM users u JOIN business_identity bi ON bi.user_id = u.id WHERE NOT EXISTS (SELECT 1 FROM organisation_memberships om WHERE om.organisation_id = u.id AND om.person_id = u.id AND om.role = 'owner')` | `0 rows` | |
| Every admin_user has admin membership | `SELECT au.user_id FROM admin_users au WHERE NOT EXISTS (SELECT 1 FROM organisation_memberships om WHERE om.organisation_id = au.user_id AND om.person_id = au.user_id AND om.role = 'admin')` | `0 rows` | |
| Every user without business_identity and without admin has member membership | `SELECT u.id FROM users u WHERE NOT EXISTS (SELECT 1 FROM business_identity bi WHERE bi.user_id = u.id) AND NOT EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = u.id) AND NOT EXISTS (SELECT 1 FROM organisation_memberships om WHERE om.organisation_id = u.id AND om.person_id = u.id AND om.role = 'member')` | `0 rows` | |
| No duplicate active memberships per role per Person per Organisation | `SELECT organisation_id, person_id, role, COUNT(*) as cnt FROM organisation_memberships WHERE status = 'active' GROUP BY organisation_id, person_id, role HAVING COUNT(*) > 1` | `0 rows` | |

### 2.3 Ownership Period Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Every user with business_identity has current ownership | `SELECT u.id FROM users u JOIN business_identity bi ON bi.user_id = u.id WHERE NOT EXISTS (SELECT 1 FROM ownership_periods op WHERE op.organisation_id = u.id AND op.person_id = u.id AND op.status = 'current')` | `0 rows` | |
| Only one current ownership per Organisation | `SELECT organisation_id, COUNT(*) as cnt FROM ownership_periods WHERE status = 'current' GROUP BY organisation_id HAVING COUNT(*) > 1` | `0 rows` | |

### 2.4 Tenant Context Resolution Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `resolve_organisation_id_from_auth()` function exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'resolve_organisation_id_from_auth')` | `true` | |
| `check_organisation_membership()` function exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_organisation_membership')` | `true` | |
| Function does NOT reference users.id for tenant resolution | Review function body for `users.id` references | Should not use `users.id` as tenant key | |

### 2.5 UUID Continuity Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Every membership Organisation UUID exists in organisations | `SELECT COUNT(*) FROM organisation_memberships WHERE organisation_id NOT IN (SELECT organisation_id FROM organisations)` | `0` | |
| Every membership Person UUID exists in persons | `SELECT COUNT(*) FROM organisation_memberships WHERE person_id NOT IN (SELECT person_id FROM persons)` | `0` | |
| Every ownership Organisation UUID exists in organisations | `SELECT COUNT(*) FROM ownership_periods WHERE organisation_id NOT IN (SELECT organisation_id FROM organisations)` | `0` | |
| Every ownership Person UUID exists in persons | `SELECT COUNT(*) FROM ownership_periods WHERE person_id NOT IN (SELECT person_id FROM persons)` | `0` | |

### 2.6 Idempotency Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Re-running backfill creates no new rows | Execute backfill INSERT statements again, check row counts unchanged | Row counts identical | |
| Re-running backfill creates no duplicate memberships | `SELECT organisation_id, person_id, role, COUNT(*) FROM organisation_memberships GROUP BY organisation_id, person_id, role HAVING COUNT(*) > 1` | `0 rows` | |

### 2.7 Step 1A Regression Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `organisations` table still exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organisations')` | `true` | |
| `persons` table still exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'persons')` | `true` | |
| `auth_credentials` table still exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auth_credentials')` | `true` | |
| `migration_ledger` table still exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_ledger')` | `true` | |
| `legacy_identity_map` table still exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'legacy_identity_map')` | `true` | |
| Knowledge tables still have organisation_id | `SELECT table_name FROM information_schema.columns WHERE column_name = 'organisation_id' AND table_name IN ('genome_entities', 'genome_facts', 'kira_memory', 'conversations')` | 4 rows | |
| Knowledge tables still have user_id | `SELECT table_name FROM information_schema.columns WHERE column_name = 'user_id' AND table_name IN ('genome_entities', 'genome_facts', 'kira_memory', 'conversations')` | 4 rows | |

### 2.8 RLS Authority NOT Yet Transferred

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| genome_entities RLS still uses user_id | Review RLS policy for genome_entities | Policy references `user_id`, not `organisation_id` | |
| genome_facts RLS still uses user_id | Review RLS policy for genome_facts | Policy references `user_id`, not `organisation_id` | |
| kira_memory RLS still uses user_id | Review RLS policy for kira_memory | Policy references `user_id`, not `organisation_id` | |
| conversations RLS still uses user_id | Review RLS policy for conversations | Policy references `user_id`, not `organisation_id` | |

### 2.9 Migration Ledger Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Ledger has entry for every membership | `SELECT om.membership_id FROM organisation_memberships om WHERE NOT EXISTS (SELECT 1 FROM migration_ledger ml WHERE ml.source_record_id = om.membership_id AND ml.source_table = 'organisation_memberships')` | `0 rows` | |
| All new ledger entries have resolution_status | `SELECT COUNT(*) FROM migration_ledger WHERE source_table = 'organisation_memberships' AND resolution_status IS NULL` | `0` | |
| All new ledger entries have resolution_method | `SELECT COUNT(*) FROM migration_ledger WHERE source_table = 'organisation_memberships' AND resolution_method IS NULL` | `0` | |

---

## 3. Verification Gate

All checks must pass before proceeding to Step 1C. If any check fails:

1. Record the failure in the verification log.
2. Identify the root cause.
3. Fix the migration.
4. Re-run verification.

**No RLS authority is transferred until all verification checks pass.**

---

## 4. Test Suite Execution

After verification checks pass, run the 95-test suite against the migrated state:

| Test Layer | Expected Result |
|-----------|----------------|
| A. Migration Safety (33) | 33 PASS |
| B. Canonical Conformance (44) | 44 PASS |
| C. State Transition (18) | 18 PASS |
| **Total** | **95/95 PASS** |

### Reclassification of Pending Legacy Failures

| Test ID | Previous Classification | New Classification | Reason |
|---------|------------------------|-------------------|--------|
| B3.1 | PENDING (Step 1B+) | CANONICAL PASS | Ownership periods now exist |
| B5.1 | PENDING (Step 5) | PENDING (Step 5) | Engagement not yet created |
| B6.1 | PENDING (Step 7) | PENDING (Step 7) | Kira Instance not yet separated |
| B7.1 | PENDING (Step 6) | PENDING (Step 6) | Subscription not yet separated |
| B8.6 | PENDING (later) | PENDING (later) | Conversation/knowledge separation not yet addressed |

**Step 1B exit criterion:** 95/95 PASS on canonical target database. 1 additional legacy failure reclassified to CANONICAL PASS (B3.1). 4 legacy failures remain PENDING for later steps.

---

## 5. What 1B Does NOT Do

| Concern | Status | Deferred To |
|---------|--------|-------------|
| RLS authority transfer | NOT DONE | Step 1C |
| API route rebinding | NOT DONE | Step 1D |
| Legacy authority retirement | NOT DONE | Step 9 |
| Consultant entity | NOT DONE | Step 5 |
| Engagement entity | NOT DONE | Step 5 |
| Commercial arrangement | NOT DONE | Step 6 |
| Kira Instance separation | NOT DONE | Step 7 |
| Decision/Action/Outcome/Learning | NOT DONE | Step 8 |

---

*This artifact is the P0.5-1B membership/tenant context verification gate. It must pass before proceeding to Step 1C (RLS Authority Transfer).*
