# KIRA — P0.5-1A Migration Verification

**Status:** Verification Gate
**Purpose:** Verify the canonical identity migration before proceeding to Step 1B
**Scope:** Schema verification, backfill verification, FK verification, trigger verification, ledger verification
**Prerequisite:** P0.5 Step 1A migration applied to database
**Date:** 26 August 2026

---

## 1. Purpose

This artifact is the verification gate between the canonical identity migration (Step 1A) and the membership/tenant context (Step 1B). It verifies that the migration was applied correctly before any authority is transferred.

The governing principle is:

> **Verify before transferring authority. If the migration is incorrect, authority transfer will propagate the error.**

---

## 2. Verification Checklist

### 2.1 Schema Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `organisations` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organisations')` | `true` | |
| `persons` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'persons')` | `true` | |
| `auth_credentials` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auth_credentials')` | `true` | |
| `migration_ledger` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_ledger')` | `true` | |
| `legacy_identity_map` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'legacy_identity_map')` | `true` | |
| `organisation_memberships` does NOT exist | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organisation_memberships')` | `false` | |
| `ownership_periods` does NOT exist | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ownership_periods')` | `false` | |

### 2.2 Backfill Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Organisation count = User count | `SELECT (SELECT COUNT(*) FROM organisations) = (SELECT COUNT(*) FROM users)` | `true` | |
| Person count = User count | `SELECT (SELECT COUNT(*) FROM persons) = (SELECT COUNT(*) FROM users)` | `true` | |
| Auth credential count <= User count | `SELECT (SELECT COUNT(*) FROM auth_credentials) <= (SELECT COUNT(*) FROM users)` | `true` | |
| Migration ledger count = User count | `SELECT (SELECT COUNT(*) FROM migration_ledger) = (SELECT COUNT(*) FROM users)` | `true` | |
| Legacy identity map count = User count | `SELECT (SELECT COUNT(*) FROM legacy_identity_map) = (SELECT COUNT(*) FROM users)` | `true` | |

### 2.3 UUID Continuity Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Every Organisation UUID exists in users | `SELECT COUNT(*) FROM organisations WHERE organisation_id NOT IN (SELECT id FROM users)` | `0` | |
| Every Person UUID exists in users | `SELECT COUNT(*) FROM persons WHERE person_id NOT IN (SELECT id FROM users)` | `0` | |
| Every user has an Organisation | `SELECT COUNT(*) FROM users WHERE id NOT IN (SELECT organisation_id FROM organisations)` | `0` | |
| Every user has a Person | `SELECT COUNT(*) FROM users WHERE id NOT IN (SELECT person_id FROM persons)` | `0` | |

### 2.4 Knowledge Backfill Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| genome_entities: no NULL organisation_id | `SELECT COUNT(*) FROM genome_entities WHERE organisation_id IS NULL` | `0` | |
| genome_facts: no NULL organisation_id | `SELECT COUNT(*) FROM genome_facts WHERE organisation_id IS NULL` | `0` | |
| genome_relationships: no NULL organisation_id | `SELECT COUNT(*) FROM genome_relationships WHERE organisation_id IS NULL` | `0` | |
| genome_events: no NULL organisation_id | `SELECT COUNT(*) FROM genome_events WHERE organisation_id IS NULL` | `0` | |
| kira_memory: no NULL organisation_id | `SELECT COUNT(*) FROM kira_memory WHERE organisation_id IS NULL` | `0` | |
| kira_knowledge: no NULL organisation_id | `SELECT COUNT(*) FROM kira_knowledge WHERE organisation_id IS NULL` | `0` | |
| conversations: no NULL organisation_id | `SELECT COUNT(*) FROM conversations WHERE organisation_id IS NULL` | `0` | |
| kira_agents: no NULL organisation_id | `SELECT COUNT(*) FROM kira_agents WHERE organisation_id IS NULL` | `0` | |

### 2.5 FK Integrity Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| genome_entities: all organisation_id resolve | `SELECT COUNT(*) FROM genome_entities WHERE organisation_id IS NOT NULL AND organisation_id NOT IN (SELECT organisation_id FROM organisations)` | `0` | |
| genome_facts: all organisation_id resolve | `SELECT COUNT(*) FROM genome_facts WHERE organisation_id IS NOT NULL AND organisation_id NOT IN (SELECT organisation_id FROM organisations)` | `0` | |
| kira_memory: all organisation_id resolve | `SELECT COUNT(*) FROM kira_memory WHERE organisation_id IS NOT NULL AND organisation_id NOT IN (SELECT organisation_id FROM organisations)` | `0` | |
| conversations: all organisation_id resolve | `SELECT COUNT(*) FROM conversations WHERE organisation_id IS NOT NULL AND organisation_id NOT IN (SELECT organisation_id FROM organisations)` | `0` | |
| auth_credentials: all person_id resolve | `SELECT COUNT(*) FROM auth_credentials WHERE person_id NOT IN (SELECT person_id FROM persons)` | `0` | |

### 2.6 Trigger Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| genome_entities trigger exists | `SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_genome_entities_sync_organisation_id')` | `true` | |
| genome_facts trigger exists | `SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_genome_facts_sync_organisation_id')` | `true` | |
| kira_memory trigger exists | `SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_kira_memory_sync_organisation_id')` | `true` | |
| conversations trigger exists | `SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_conversations_sync_organisation_id')` | `true` | |

### 2.7 Migration Ledger Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Ledger is append-only (no UPDATE) | Attempt UPDATE on migration_ledger | Should fail or affect 0 rows | |
| Ledger has entry for every user | `SELECT COUNT(*) FROM users WHERE id NOT IN (SELECT legacy_user_id FROM migration_ledger)` | `0` | |
| All ledger entries have resolution_status | `SELECT COUNT(*) FROM migration_ledger WHERE resolution_status IS NULL` | `0` | |
| All ledger entries have resolution_method | `SELECT COUNT(*) FROM migration_ledger WHERE resolution_method IS NULL` | `0` | |

### 2.8 Semantic Independence Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Organisation ≠ Person (different tables) | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organisations') AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'persons')` | `true` | |
| Auth credential linked to Person, not Organisation | `SELECT COUNT(*) FROM auth_credentials WHERE person_id IS NULL` | `0` | |
| Knowledge has organisation_id column | `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'genome_entities' AND column_name = 'organisation_id')` | `true` | |
| Legacy user_id column still exists | `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'genome_entities' AND column_name = 'user_id')` | `true` | |

---

## 3. Verification Gate

All checks must pass before proceeding to Step 1B. If any check fails:

1. Record the failure in the verification log.
2. Identify the root cause.
3. Fix the migration.
4. Re-run verification.

**No authority is transferred until all verification checks pass.**

---

## 4. Test Suite Execution

After verification checks pass, run the 95-test suite against the migrated state:

| Test Layer | Expected Result |
|-----------|----------------|
| A. Migration Safety (33) | 33 PASS |
| B. Canonical Conformance (44) | 44 PASS |
| C. State Transition (18) | 18 PASS |
| **Total** | **95/95 PASS** |

The 10 legacy failures from P0.4-E should now be reclassified:

| Test ID | Previous Classification | New Classification | Reason |
|---------|------------------------|-------------------|--------|
| B1.1 | EXPECTED LEGACY FAILURE | CANONICAL PASS | Organisation table now exists |
| B1.2 | EXPECTED LEGACY FAILURE | CANONICAL PASS | Organisation now independent of Person |
| B2.1 | EXPECTED LEGACY FAILURE | CANONICAL PASS | Person table now exists |
| B2.2 | EXPECTED LEGACY FAILURE | CANONICAL PASS | Person now independent of Organisation |
| B3.1 | EXPECTED LEGACY FAILURE | PENDING (Step 1B+) | Ownership periods not yet created |
| B5.1 | EXPECTED LEGACY FAILURE | PENDING (Step 5) | Engagement not yet created |
| B6.1 | EXPECTED LEGACY FAILURE | PENDING (Step 7) | Kira Instance not yet separated |
| B7.1 | EXPECTED LEGACY FAILURE | PENDING (Step 6) | Subscription not yet separated |
| B8.1 | EXPECTED LEGACY FAILURE | CANONICAL PASS | Knowledge now has organisation_id |
| B8.6 | EXPECTED LEGACY FAILURE | PENDING (later) | Conversation/knowledge separation not yet addressed |

**Step 1A exit criterion:** 95/95 PASS on canonical target database. 4 legacy failures reclassified to CANONICAL PASS. 6 legacy failures remain PENDING for later steps.

---

*This artifact is the P0.5-1A migration verification gate. It must pass before proceeding to Step 1B (Membership/Tenant Context).*
