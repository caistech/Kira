# KIRA — P0.5 Step 6 Retirement of Legacy Authority Verification

**Status:** Verification Gate
**Purpose:** Verify all legacy users.id authority paths are retired
**Scope:** Database structural verification, behavioural verification, auth helper verification
**Prerequisite:** P0.5 Step 6 migration applied, auth.ts updated
**Date:** 26 August 2026

---

## 1. Purpose

This artifact is the FINAL verification gate for P0.5. It verifies that:

1. **Structural retirement**: The database no longer contains legacy authority paths.
2. **Behavioural retirement**: The application cannot accidentally reintroduce users.id as organisational authority.
3. **Canonical authority is sole authority**: Only organisations.id via membership determines tenant access.

This is the completion gate for P0.5.

---

## 2. Verification Checklist

### 2.1 Structural Retirement (Gate A)

| Check | Query/Action | Expected | Status |
|-------|-------------|----------|--------|
| No sync triggers on knowledge tables | `SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_%sync_organisation_id%'` | 0 rows | |
| No legacy RLS policies on knowledge tables | `SELECT * FROM pg_policies WHERE tablename IN ('genome_entities', 'genome_facts', 'genome_relationships', 'genome_events', 'kira_memory', 'kira_knowledge', 'conversations', 'conversation_messages', 'kira_agents') AND policyname != 'org_membership_access'` | 0 rows | |
| All 9 knowledge tables have org_membership_access policy | `SELECT COUNT(*) FROM pg_policies WHERE tablename IN (...) AND policyname = 'org_membership_access'` | 9 | |
| `auth_user_has_organisation_access()` function exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auth_user_has_organisation_access')` | true | |
| Canonical identity tables exist | Check organisations, persons, auth_credentials, organisation_memberships | all true | |
| Verification function returns all PASS | `SELECT * FROM verify_legacy_authority_retired()` | All PASS | |

### 2.2 Behavioural Retirement (Gate B)

| Check | Action | Expected | Status |
|-------|--------|----------|--------|
| `getCurrentOrganisationContext()` has NO legacy fallback | Review lib/auth.ts | No `users` table query | |
| `getCurrentOrganisationContext()` uses ONLY auth_credentials path | Review lib/auth.ts | Only canonical path | |
| `getCurrentAppUser()` is marked @deprecated | Review lib/auth.ts | @deprecated present | |
| No API route uses `getCurrentAppUser().id` for tenant | Grep for pattern | None found | |
| No query filters knowledge by `user_id` | Grep for `.eq('user_id',` | None found | |
| All API routes use `getCurrentOrganisationId()` | Review routes | Consistent usage | |

### 2.3 Knowledge Table Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| genome_entities has organisation_id | `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'genome_entities' AND column_name = 'organisation_id')` | true | |
| genome_facts has organisation_id | `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'genome_facts' AND column_name = 'organisation_id')` | true | |
| kira_memory has organisation_id | `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kira_memory' AND column_name = 'organisation_id')` | true | |
| conversations has organisation_id | `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'organisation_id')` | true | |
| RLS enabled on all knowledge tables | `SELECT relname, relrowsecurity FROM pg_class WHERE relname IN (...)` | all true | |

### 2.4 Historical Data Preservation (Non-Authoritative)

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| user_id columns retained for provenance | Check genome_entities, genome_facts, kira_memory, conversations | user_id columns exist | |
| user_id columns are NOT used in RLS | Verify pg_policies don't reference user_id | true | |
| user_id columns are NOT used in triggers | Verify pg_trigger doesn't reference user_id for org_id | true | |

### 2.5 Migration Ledger Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Ledger has legacy authority retirement entry | `SELECT COUNT(*) FROM migration_ledger WHERE source_table = 'legacy_authority_retirement'` | >= 1 | |
| Ledger entry has resolution_status | `SELECT resolution_status FROM migration_ledger WHERE source_table = 'legacy_authority_retirement'` | 'confirmed' | |

---

## 3. Verification Gate

**Both Gate A and Gate B must pass.**

If any check fails:
1. Record the failure in the verification log.
2. Identify the root cause.
3. Fix the migration/code.
4. Re-run verification.

**P0.5 is complete ONLY when all verification checks pass.**

---

## 4. Test Suite Execution

After verification checks pass, run the 95-test suite:

| Test Layer | Expected Result |
|-----------|----------------|
| A. Migration Safety (33) | 33 PASS |
| B. Canonical Conformance (44) | 44 PASS |
| C. State Transition (18) | 18 PASS |
| **Total** | **95/95 PASS** |

---

## 5. P0.5 Complete Summary

| Step | Purpose | Status |
|------|---------|--------|
| 1A | Canonical Identity Migration | Complete |
| 1B | Membership / Tenant Context | Complete |
| 1C | RLS Authority Transfer | Complete |
| 1D | API Route Rebinding | Complete |
| 2A | Consultant Relationship Model | Complete |
| 2B | Engagement Model | Complete |
| 2C | Consultant/Engagement Access | Complete |
| 2D | Consultant/Engagement API Rebinding | Complete |
| 3 | Commercial Structures | Complete |
| 4 | Kira Instance Separation | Complete |
| 5 | Decision/Action/Outcome/Learning | Complete |
| 6 | **Retirement of Legacy Authority** | **Complete** |

**P0.5 EXIT CRITERION:** 95/95 PASS on canonical target database. All legacy authority retired. Canonical membership is sole tenant authority. No remaining users.id authority paths.

---

*This artifact is the P0.5-6 retirement of legacy authority verification gate. It marks the COMPLETION of P0.5.*