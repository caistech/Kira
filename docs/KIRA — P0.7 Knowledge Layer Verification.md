# KIRA — P0.7 Knowledge Layer Implementation Verification

**Status:** Verification Specification (requires execution)
**Purpose:** Specify and execute verification of knowledge layer implementation
**Scope:** Schema, data migration, temporal queries, RLS, behavioural tests
**Prerequisite:** P0.7.1-7.5 migrations applied to database
**Date:** 26 August 2026

---

## 1. Purpose

This artifact specifies AND executes verification of the knowledge layer implementation. It verifies that:

1. All knowledge layer tables exist and are correctly structured.
2. Existing data has been migrated to new canonical structure with reconciliation.
3. Temporal query patterns work correctly with semantic precision.
4. Promotion pipeline functions correctly.
5. RLS enforces cross-organisation isolation (behavioural test).
6. Supersession and contradiction handling work correctly.
7. Steps 1-6 (P0.5) remain green.

**This document transitions from specification to execution evidence upon completion of verification.**

---

## 2. Verification Checklist

### 2.1 Schema Verification (P0.7.1 & P0.7.2)

| Check | Query | Expected | Actual | Status |
|-------|-------|----------|--------|--------|
| `organisational_knowledge` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organisational_knowledge')` | `true` | | |
| `organisational_knowledge_history` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organisational_knowledge_history')` | `true` | | |
| `knowledge_relationships` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_relationships')` | `true` | | |
| `evidence` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evidence')` | `true` | | |
| `knowledge_evidence_links` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_evidence_links')` | `true` | | |
| `knowledge_provenance_view` exists | `SELECT EXISTS (SELECT 1 FROM information_schema.views WHERE view_name = 'knowledge_provenance_view')` | `true` | | |

### 2.2 Data Migration Verification (P0.7.5)

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `organisational_knowledge` populated | `SELECT COUNT(*) FROM organisational_knowledge` | `> 0` | |
| `evidence` populated | `SELECT COUNT(*) FROM evidence` | `> 0` | |
| `knowledge_evidence_links` populated | `SELECT COUNT(*) FROM knowledge_evidence_links` | `> 0` | |
| No duplicate knowledge | `SELECT COUNT(*) FROM (SELECT organisation_id, knowledge_type, subject, predicate, object, COUNT(*) FROM organisational_knowledge WHERE is_current = TRUE GROUP BY organisation_id, knowledge_type, subject, predicate, object HAVING COUNT(*) > 1) duplicates` | `0` | |

### 2.3 Promotion Pipeline Verification (P0.7.3)

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `promotion_rules` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promotion_rules')` | `true` | |
| `promotion_candidates` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promotion_candidates')` | `true` | |
| `promotion_log` table exists | `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promotion_log')` | `true` | |
| Default promotion rules created | `SELECT COUNT(*) FROM promotion_rules` | `> 0` | |

### 2.4 Temporal Query Verification (P0.7.4)

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `get_knowledge_at_point_in_time()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_knowledge_at_point_in_time')` | `true` | | |
| `get_knowledge_history()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_knowledge_history')` | `true` | | |
| `get_supersession_chain()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_supersession_chain')` | `true` | | |
| `get_conflicting_knowledge()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_conflicting_knowledge')` | `true` | | |
| `get_knowledge_statistics()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_knowledge_statistics')` | `true` | | |

### 2.5 RLS Verification (BEHAVIOURAL — Cross-Org Isolation)

| Check | Action | Expected | Actual | Status |
|-------|--------|----------|--------|--------|
| RLS enabled on `organisational_knowledge` | `SELECT relrowsecurity FROM pg_class WHERE relname = 'organisational_knowledge'` | `true` | | |
| RLS enabled on `evidence` | `SELECT relrowsecurity FROM pg_class WHERE relname = 'evidence'` | `true` | | |
| **CROSS-ORG ISOLATION:** User A cannot read User B's knowledge | Create test data for Org A, attempt read as Org B user | Access denied (0 rows) | | |
| **CROSS-ORG ISOLATION:** User A cannot write User B's knowledge | Attempt INSERT for Org A as Org B user | Error or 0 rows affected | | |
| **CROSS-ORG ISOLATION:** User A cannot delete User B's knowledge | Attempt DELETE for Org A as Org B user | Error or 0 rows affected | | |

### 2.6 Invariant Compliance Verification

| Invariant | Check | Expected | Actual | Status |
|-----------|-------|----------|--------|--------|
| INV-009 | Knowledge tables use `organisation_id` FK (NOT `kira_instance_id` as owner) | All tables have FK | | |
| INV-010 | `evidence` table exists SEPARATE from knowledge | Table exists | | |
| INV-011 | Provenance view joins knowledge with evidence | View exists and returns data | | |
| INV-012 | Temporal queries work correctly (see behavioural tests) | Queries return expected results | | |
| INV-017 | Knowledge survives instance replacement | `kira_instance_id` is OPTIONAL FK | | |
| INV-020 | All knowledge anchored to organisation | `organisation_id` NOT NULL on all tables | | |

### 2.7 P0.5 Regression Verification

| Check | Query | Expected | Actual | Status |
|-------|-------|----------|--------|--------|
| `organisations` table unchanged | `SELECT COUNT(*) FROM organisations` | Same as before P0.7 | | |
| `persons` table unchanged | `SELECT COUNT(*) FROM persons` | Same as before P0.7 | | |
| `organisation_memberships` unchanged | `SELECT COUNT(*) FROM organisation_memberships` | Same as before P0.7 | | |
| `consultant_profiles` unchanged | `SELECT COUNT(*) FROM consultant_profiles` | Same as before P0.7 | | |
| `engagements` unchanged | `SELECT COUNT(*) FROM engagements` | Same as before P0.7 | | |
| `subscriptions` unchanged | `SELECT COUNT(*) FROM subscriptions` | Same as before P0.7 | | |

---

## 3. Verification Gate

All checks must pass before proceeding. If any check fails:

1. Record the failure in the verification log.
2. Identify the root cause.
3. Fix the migration.
4. Re-run verification.

---

## 4. BEHAVIOURAL TESTS (CRITICAL)

These tests prove the architecture, not just table existence.

### 4.1 Cross-Organisation Isolation (RLS)

| Test | Setup | Action | Expected | Actual | Status |
|------|-------|--------|----------|--------|--------|
| **B.1** Org A creates knowledge X | Create Org A, knowledge X for Org A | — | Knowledge X exists | | |
| **B.2** Org B user CANNOT read knowledge X | Create Org B, user B | Query knowledge as user B | 0 rows (access denied) | | |
| **B.3** Org B user CANNOT write to knowledge X | Attempt INSERT as user B | Write to knowledge X | Error or 0 rows affected | | |
| **B.4** Org B user CANNOT delete knowledge X | Attempt DELETE as user B | Delete knowledge X | Error or 0 rows affected | | |
| **B.5** Org B user CAN read own knowledge Y | Create knowledge Y for Org B | Query as user B | Knowledge Y returned | | |

### 4.2 Supersession Chain

| Test | Setup | Action | Expected | Actual | Status |
|------|-------|--------|----------|--------|--------|
| **B.6** Create Knowledge A (revenue = $2M) | Knowledge A for Org | — | Knowledge A current | | |
| **B.7** Supersede with Knowledge B (revenue = $2.4M) | Call `supersede_knowledge(A, B, "Updated")` | — | A = superseded, B = current | | |
| **B.8** Query supersession chain | `get_supersession_chain(A)` | — | Chain: A → B | | |
| **B.9** Point-in-time: 1 Jun = A | `get_knowledge_at_point_in_time(Org, '2026-06-01')` | — | Returns A | | |
| **B.10** Point-in-time: 20 Aug = B | `get_knowledge_at_point_in_time(Org, '2026-08-20')` | — | Returns B | | |

### 4.3 Contradiction and Resolution

| Test | Setup | Action | Expected | Actual | Status |
|------|-------|--------|----------|--------|--------|
| **B.11** Create Knowledge X (supplier = preferred) | Knowledge X | — | X current | | |
| **B.12** Create Knowledge Y (supplier = not preferred) | Knowledge Y | — | Y current (conflicts with X) | | |
| **B.13** Detect conflict | `get_conflicting_knowledge(Org)` | — | Returns X, Y | | |
| **B.14** Resolve with Knowledge Z (supplier = preferred) | Create Z, supersede X, Y | — | Z current, X/Y superseded | | |
| **B.15** Verify resolution | Query knowledge | — | Z current, X/Y historical | | |

### 4.4 Temporal Query Accuracy

| Test | Setup | Action | Expected | Actual | Status |
|------|-------|--------|----------|--------|--------|
| **B.16** Create knowledge effective from 1 Jul | Knowledge A, effective_from = 1 Jul | — | — | | |
| **B.17** Query at 1 Jun | `get_knowledge_at_point_in_time(Org, '2026-06-01')` | — | 0 rows (before effective) | | |
| **B.18** Query at 1 Jul | `get_knowledge_at_point_in_time(Org, '2026-07-01')` | — | Returns A | | |
| **B.19** Query at 1 Aug | `get_knowledge_at_point_in_time(Org, '2026-08-01')` | — | Returns A | | |

### 4.5 Multi-Evidence Provenance

| Test | Setup | Action | Expected | Actual | Status |
|------|-------|--------|----------|--------|--------|
| **B.20** Create Knowledge A | Knowledge A | — | — | | |
| **B.21** Create Evidence 1 (conversation) | Evidence E1 | — | — | | |
| **B.22** Create Evidence 2 (document) | Evidence E2 | — | — | | |
| **B.23** Link both evidences to Knowledge A | `link_evidence_to_knowledge(A, E1, 'derived_from')`, `link_evidence_to_knowledge(A, E2, 'supported_by')` | — | Both linked | | |
| **B.24** Query provenance | `knowledge_provenance_view` | — | Returns A with E1, E2 | | |

### 4.6 Knowledge Derivation (Knowledge → Knowledge)

| Test | Setup | Action | Expected | Actual | Status |
|------|-------|--------|----------|--------|--------|
| **B.25** Create Knowledge A (direct observation) | Knowledge A, epistemic = 'observed' | — | A exists | | |
| **B.26** Create Knowledge B (inferred from A) | Knowledge B, epistemic = 'inferred', derived_from = [A] | — | B exists | | |
| **B.27** Query derivation chain | Query knowledge_relationships | — | B → derives_from → A | | |

---

## 5. MIGRATION RECONCILIATION

Every legacy record must have a disposition. No silent data loss.

### 5.1 Source Record Inventory

| Source Table | Records Eligible | Records Migrated | Records Excluded | Records Invalid | Disposition |
|--------------|------------------|------------------|------------------|-----------------|-------------|
| `genome_entities` | | | | | MIGRATED / EXCLUDED / INVALID |
| `genome_facts` | | | | | MIGRATED / EXCLUDED / INVALID |
| `genome_relationships` | | | | | MIGRATED / EXCLUDED / INVALID |
| `genome_events` | | | | | MIGRATED / EXCLUDED / INVALID |
| `kira_knowledge` | | | | | MIGRATED → evidence / EXCLUDED |
| `kira_memory` | | | | | EVALUATED / EXCLUDED |

### 5.2 Reconciliation Queries

| Query | Purpose |
|-------|---------|
| `SELECT COUNT(*) FROM genome_entities WHERE organisation_id IS NOT NULL` | Eligible for migration |
| `SELECT COUNT(*) FROM organisational_knowledge WHERE source_type = 'conversation'` | Migrated count |
| `SELECT COUNT(*) FROM evidence WHERE source_table = 'genome_entities'` | Evidence created |
| `SELECT COUNT(*) FROM genome_entities WHERE organisation_id IS NULL` | Excluded (no org) |
| Reconciliation check: eligible = migrated + excluded | Must balance |

### 5.3 No Silent Data Loss Rule

**Every legacy record must be accounted for:**

| Status | Meaning |
|--------|---------|
| `MIGRATED` | Successfully promoted to new structure |
| `EXCLUDED — no org` | Excluded because organisation_id is NULL |
| `EXCLUDED — duplicate` | Excluded as duplicate (reason recorded) |
| `EXCLUDED — invalid` | Excluded as invalid (reason recorded) |
| `REQUIRES REVIEW` | Cannot be automatically dispositioned |

---

## 6. TEST SUITE EXECUTION

After behavioural tests and migration reconciliation pass, run the test suite:

| Test Layer | Expected | Actual | Status |
|-----------|----------|--------|--------|
| A. Migration Safety (33) | 33 PASS | | |
| B. Canonical Conformance (44) | 44 PASS | | |
| C. State Transition (18) | 18 PASS | | |
| **Total** | **95/95 PASS** | | |

---

## 7. P0.7 EXIT CERTIFICATE

**This section is completed ONLY when all verification evidence exists.**

| Criterion | Evidence Location | Status |
|-----------|-------------------|--------|
| Schema verification (2.1) | Query results in Actual columns | |
| Data migration (2.2) | Reconciliation counts in 5.1 | |
| Temporal queries (2.4) | Behavioural test results in 4.4 | |
| RLS behavioural (2.5) | Behavioural test results in 4.1 | |
| Supersession (behavioural) | Test results in 4.2 | |
| Contradiction (behavioural) | Test results in 4.3 | |
| Multi-evidence provenance | Test results in 4.4 | |
| Knowledge derivation | Test results in 4.6 | |
| 95/95 test suite | Execution evidence in 6 | |
| P0.5 regression (2.7) | Query results | |

**P0.7 EXIT CRITERION:** All above criteria have evidence. No empty Actual/Status columns remain.

---

*This artifact transitions from Verification Specification to Verification Result upon completion of all checks with evidence.*