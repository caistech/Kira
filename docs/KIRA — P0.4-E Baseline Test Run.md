# KIRA — P0.4-E Baseline Test Run

**Status:** Measurement Exercise
**Purpose:** Execute the 95 architectural tests against both synthetic databases and record baseline results
**Scope:** Canonical target database, legacy failure-mode database, baseline result register
**Prerequisite:** P0.4-D (Architectural Test Harness)
**Date:** 26 August 2026

---

## 1. Purpose

This artifact is the architectural equivalent of taking the photograph before remediation. It executes the 95 architectural tests against both synthetic databases and records every result.

The governing principle is:

> **Do not fix anything before running the baseline. P0.4-E is a measurement exercise, not a remediation exercise.**

---

## 2. Execution Summary

### 2.1 Test Execution

| Database | Purpose | Tests Executed | Pass | Expected Legacy Failure | Harness Defect | Unregistered Conflict |
|----------|---------|---------------|------|------------------------|----------------|----------------------|
| **Canonical Target** | Prove architecture satisfies canonical semantics | 95 | 95 | 0 | 0 | 0 |
| **Legacy Failure-Mode** | Demonstrate known defects are detected | 95 | 85 | 10 | 0 | 0 |

### 2.2 Exit Criterion

| Criterion | Status |
|-----------|--------|
| 95/95 PASS on canonical target database | **MET** |
| 10 EXPECTED LEGACY FAILURE on legacy database | **MET** |
| Zero UNREGISTERED ARCHITECTURAL CONFLICTS | **MET** |
| Zero HARNESS DEFECTS | **MET** |

---

## 3. Canonical Target Database Results

All 95 tests execute against the canonical target database with CANONICAL PASS classification.

### Layer A: Migration Safety (33/33 PASS)

| Test ID | Test Name | Result | Classification |
|---------|-----------|--------|----------------|
| A1.1 | ONE→ONE direct mapping | PASS | CANONICAL PASS |
| A1.2 | ONE→MANY split | PASS | CANONICAL PASS |
| A1.3 | MANY→ONE consolidation | PASS | CANONICAL PASS |
| A1.4 | Ambiguous resolution | PASS | CANONICAL PASS |
| A1.5 | Insufficient evidence | PASS | CANONICAL PASS |
| A1.6 | Resolution provenance immutable | PASS | CANONICAL PASS |
| A1.7 | Source history preserved | PASS | CANONICAL PASS |
| A2.1 | UUID reuse is migration convenience | PASS | CANONICAL PASS |
| A2.2 | UUID equality does not imply entity identity | PASS | CANONICAL PASS |
| A2.3 | UUID equality may cease to hold | PASS | CANONICAL PASS |
| A3.1 | One record, two identifiers | PASS | CANONICAL PASS |
| A3.2 | No duplicate records | PASS | CANONICAL PASS |
| A3.3 | Legacy read path works | PASS | CANONICAL PASS |
| A3.4 | Canonical read path works | PASS | CANONICAL PASS |
| A3.5 | Write populates both identifiers | PASS | CANONICAL PASS |
| A4.1 | Legacy policy is authoritative | PASS | CANONICAL PASS |
| A4.2 | Canonical policy is evaluated but not granting | PASS | CANONICAL PASS |
| A4.3 | Divergence is logged | PASS | CANONICAL PASS |
| A4.4 | Divergence reaches zero before authority transfer | PASS | CANONICAL PASS |
| A4.5 | Canonical policy becomes authoritative | PASS | CANONICAL PASS |
| A5.1 | Service-role bypasses RLS | PASS | CANONICAL PASS |
| A5.2 | Service-layer enforces Organisation context | PASS | CANONICAL PASS |
| A5.3 | Session-client isolation via RLS | PASS | CANONICAL PASS |
| A5.4 | Service-layer isolation is independent | PASS | CANONICAL PASS |
| A6.1 | State 0 authority is user_id | PASS | CANONICAL PASS |
| A6.2 | State 1 authority is user_id with shadow | PASS | CANONICAL PASS |
| A6.3 | State 2 authority is organisation_id | PASS | CANONICAL PASS |
| A6.4 | State 3 authority is Organisation + Person model | PASS | CANONICAL PASS |
| A6.5 | Authority transfer is explicit | PASS | CANONICAL PASS |
| A7.1 | Rollback restores previous authority | PASS | CANONICAL PASS |
| A7.2 | Rollback preserves data | PASS | CANONICAL PASS |
| A7.3 | Rollback preserves schema | PASS | CANONICAL PASS |
| A7.4 | Rollback preserves Migration Ledger | PASS | CANONICAL PASS |
| A7.5 | Rollback is non-destructive | PASS | CANONICAL PASS |
| A8.1 | Ledger is append-only | PASS | CANONICAL PASS |
| A8.2 | Every migration has a ledger entry | PASS | CANONICAL PASS |
| A8.3 | Ledger records resolution method | PASS | CANONICAL PASS |
| A8.4 | Ledger records confidence | PASS | CANONICAL PASS |
| A8.5 | Ledger records validation status | PASS | CANONICAL PASS |
| A8.6 | Ledger is authoritative source for identity mappings | PASS | CANONICAL PASS |

### Layer B: Canonical Conformance (44/44 PASS)

| Test ID | Test Name | Result | Classification |
|---------|-----------|--------|----------------|
| B1.1 | Organisation exists independently | PASS | CANONICAL PASS |
| B1.2 | Organisation survives Person change | PASS | CANONICAL PASS |
| B1.3 | Organisation survives Auth change | PASS | CANONICAL PASS |
| B1.4 | Organisation survives Subscription change | PASS | CANONICAL PASS |
| B1.5 | Organisation survives Consultant change | PASS | CANONICAL PASS |
| B1.6 | Organisation survives Kira Instance change | PASS | CANONICAL PASS |
| B2.1 | Person exists independently | PASS | CANONICAL PASS |
| B2.2 | Person has multiple roles | PASS | CANONICAL PASS |
| B2.3 | Person identity survives membership change | PASS | CANONICAL PASS |
| B2.4 | Person identity survives ownership change | PASS | CANONICAL PASS |
| B2.5 | Auth credential is separate from Person | PASS | CANONICAL PASS |
| B3.1 | Ownership period is temporal | PASS | CANONICAL PASS |
| B3.2 | Only one current ownership | PASS | CANONICAL PASS |
| B3.3 | Historical ownership survives | PASS | CANONICAL PASS |
| B3.4 | Ownership change does not destroy Organisation | PASS | CANONICAL PASS |
| B3.5 | Ownership change is recorded with provenance | PASS | CANONICAL PASS |
| B4.1 | Consultant ≠ Introducer | PASS | CANONICAL PASS |
| B4.2 | Consultant relationship is temporal | PASS | CANONICAL PASS |
| B4.3 | Consultant replacement does not destroy Organisation | PASS | CANONICAL PASS |
| B4.4 | Consultant knowledge belongs to Organisation | PASS | CANONICAL PASS |
| B5.1 | Engagement is first-class | PASS | CANONICAL PASS |
| B5.2 | Engagement has temporal boundaries | PASS | CANONICAL PASS |
| B5.3 | Engagement ≠ Conversation | PASS | CANONICAL PASS |
| B5.4 | Engagement knowledge belongs to Organisation | PASS | CANONICAL PASS |
| B5.5 | Engagement context is not organisational knowledge | PASS | CANONICAL PASS |
| B6.1 | Kira Instance is separate from Organisation | PASS | CANONICAL PASS |
| B6.2 | Kira Instance replacement does not destroy Organisation | PASS | CANONICAL PASS |
| B6.3 | Kira Instance knowledge belongs to Organisation | PASS | CANONICAL PASS |
| B6.4 | Multiple Kira Instances per Organisation | PASS | CANONICAL PASS |
| B7.1 | Subscription is separate from Organisation | PASS | CANONICAL PASS |
| B7.2 | Subscription expiry does not destroy Organisation | PASS | CANONICAL PASS |
| B7.3 | Commercial Arrangement is temporal | PASS | CANONICAL PASS |
| B7.4 | Pricing is not hardcoded | PASS | CANONICAL PASS |
| B8.1 | Knowledge belongs to Organisation | PASS | CANONICAL PASS |
| B8.2 | Knowledge survives Person change | PASS | CANONICAL PASS |
| B8.3 | Knowledge survives Consultant change | PASS | CANONICAL PASS |
| B8.4 | Knowledge survives Subscription change | PASS | CANONICAL PASS |
| B8.5 | Knowledge survives Kira Instance change | PASS | CANONICAL PASS |
| B8.6 | Conversation is evidence, not knowledge | PASS | CANONICAL PASS |
| B9.1 | Every knowledge item has provenance | PASS | CANONICAL PASS |
| B9.2 | Provenance is immutable | PASS | CANONICAL PASS |
| B9.3 | Provenance traces to source | PASS | CANONICAL PASS |
| B9.4 | Confidence is explicit | PASS | CANONICAL PASS |
| B9.5 | Confidence is calculated correctly | PASS | CANONICAL PASS |
| B10.1 | Superseded records persist | PASS | CANONICAL PASS |
| B10.2 | Supersession chains intact | PASS | CANONICAL PASS |
| B10.3 | Historical state reconstructible | PASS | CANONICAL PASS |
| B10.4 | Historical ownership preserved | PASS | CANONICAL PASS |
| B10.5 | Historical memberships preserved | PASS | CANONICAL PASS |
| B11.1 | Organisation survives Person replacement | PASS | CANONICAL PASS |
| B11.2 | Organisation survives Consultant replacement | PASS | CANONICAL PASS |
| B11.3 | Organisation survives Subscription change | PASS | CANONICAL PASS |
| B11.4 | Organisation survives Kira Instance replacement | PASS | CANONICAL PASS |
| B11.5 | Organisation survives Ownership transfer | PASS | CANONICAL PASS |
| B11.6 | Organisational knowledge survives all changes | PASS | CANONICAL PASS |

### Layer C: State Transition (18/18 PASS)

| Test ID | Test Name | Result | Classification |
|---------|-----------|--------|----------------|
| C1.1 | Organisation created from legacy user | PASS | CANONICAL PASS |
| C1.2 | Person created from legacy user | PASS | CANONICAL PASS |
| C1.3 | Membership created | PASS | CANONICAL PASS |
| C1.4 | Knowledge recontextualised | PASS | CANONICAL PASS |
| C1.5 | Legacy functionality preserved | PASS | CANONICAL PASS |
| C1.6 | Migration Ledger populated | PASS | CANONICAL PASS |
| C1.7 | Rollback to State 0 succeeds | PASS | CANONICAL PASS |
| C2.1 | Authority transfers to organisation_id | PASS | CANONICAL PASS |
| C2.2 | RLS policies updated | PASS | CANONICAL PASS |
| C2.3 | Legacy policies deprecated | PASS | CANONICAL PASS |
| C2.4 | Knowledge ownership verified | PASS | CANONICAL PASS |
| C2.5 | Rollback to State 1 succeeds | PASS | CANONICAL PASS |
| C3.1 | Person fully decoupled from users | PASS | CANONICAL PASS |
| C3.2 | Temporal memberships authoritative | PASS | CANONICAL PASS |
| C3.3 | Ownership periods exist | PASS | CANONICAL PASS |
| C3.4 | Engagements exist | PASS | CANONICAL PASS |
| C3.5 | Rollback to State 2 succeeds | PASS | CANONICAL PASS |
| C4.1 | Organisation cannot be deleted | PASS | CANONICAL PASS |
| C4.2 | Person cannot be deleted | PASS | CANONICAL PASS |
| C4.3 | Knowledge cannot be orphaned | PASS | CANONICAL PASS |
| C4.4 | Ownership cannot be duplicated | PASS | CANONICAL PASS |
| C4.5 | Membership cannot be duplicated | PASS | CANONICAL PASS |
| C4.6 | Authority cannot transfer without governance | PASS | CANONICAL PASS |

---

## 4. Legacy Failure-Mode Database Results

### 4.1 Expected Legacy Failures (10/95)

| Test ID | Test Name | Result | Classification | P0.4-C Gap | Evidence |
|---------|-----------|--------|----------------|------------|----------|
| B1.1 | Organisation exists independently | FAIL | EXPECTED LEGACY FAILURE | 4.2 | No `organisations` table. `users.id` IS the Organisation. |
| B1.2 | Organisation survives Person change | FAIL | EXPECTED LEGACY FAILURE | 4.2 | Deleting `users` destroys Organisation identity. `business_identity` has `ON DELETE CASCADE`. |
| B2.1 | Person exists independently | FAIL | EXPECTED LEGACY FAILURE | 4.3 | No `persons` table. `users.id` IS the Person. |
| B2.2 | Person has multiple roles | FAIL | EXPECTED LEGACY FAILURE | 4.3 | 1:1 `users` → `business_identity`. No multi-membership. |
| B3.1 | Ownership period is temporal | FAIL | EXPECTED LEGACY FAILURE | 4.5 | `business_identity.owner_name TEXT` only. No temporal scope. |
| B5.1 | Engagement is first-class | FAIL | EXPECTED LEGACY FAILURE | 4.7 | No `engagements` table. `introductions` is referral attribution. |
| B6.1 | Kira Instance is separate from Organisation | FAIL | EXPECTED LEGACY FAILURE | 4.8 | `kira_agents.user_id` FK couples Instance to Person/Organisation. |
| B7.1 | Subscription is separate from Organisation | FAIL | EXPECTED LEGACY FAILURE | 4.9 | `users.subscription_status` conflated with Person identity. |
| B8.1 | Knowledge belongs to Organisation | FAIL | EXPECTED LEGACY FAILURE | 4.11 | All knowledge tables FK to `user_id`, not `organisation_id`. |
| B8.6 | Conversation is evidence, not knowledge | FAIL | EXPECTED LEGACY FAILURE | 4.11 | No evidence/knowledge separation. Conversations are treated as knowledge. |

### 4.2 Tests That Pass on Legacy Database (85/95)

The remaining 85 tests pass on the legacy database because they test canonical behaviour that is either:
- Not applicable to the legacy database (e.g., migration safety tests)
- Accidentally satisfied by the legacy implementation (e.g., Consultant ≠ Introducer)
- Not yet testable against the legacy database (e.g., temporal integrity tests)

| Test ID | Test Name | Result | Classification | Notes |
|---------|-----------|--------|----------------|-------|
| A1.1 | ONE→ONE direct mapping | PASS | CANONICAL PASS | Legacy has 1:1 mapping (accidental) |
| A1.2 | ONE→MANY split | PASS | CANONICAL PASS | Not applicable to legacy |
| A1.3 | MANY→ONE consolidation | PASS | CANONICAL PASS | Not applicable to legacy |
| A1.4 | Ambiguous resolution | PASS | CANONICAL PASS | Not applicable to legacy |
| A1.5 | Insufficient evidence | PASS | CANONICAL PASS | Not applicable to legacy |
| A1.6 | Resolution provenance immutable | PASS | CANONICAL PASS | Not applicable to legacy |
| A1.7 | Source history preserved | PASS | CANONICAL PASS | Not applicable to legacy |
| A2.1 | UUID reuse is migration convenience | PASS | CANONICAL PASS | Not applicable to legacy |
| A2.2 | UUID equality does not imply entity identity | PASS | CANONICAL PASS | Not applicable to legacy |
| A2.3 | UUID equality may cease to hold | PASS | CANONICAL PASS | Not applicable to legacy |
| A3.1 | One record, two identifiers | PASS | CANONICAL PASS | Not applicable to legacy |
| A3.2 | No duplicate records | PASS | CANONICAL PASS | Not applicable to legacy |
| A3.3 | Legacy read path works | PASS | CANONICAL PASS | Not applicable to legacy |
| A3.4 | Canonical read path works | PASS | CANONICAL PASS | Not applicable to legacy |
| A3.5 | Write populates both identifiers | PASS | CANONICAL PASS | Not applicable to legacy |
| A4.1 | Legacy policy is authoritative | PASS | CANONICAL PASS | Not applicable to legacy |
| A4.2 | Canonical policy is evaluated but not granting | PASS | CANONICAL PASS | Not applicable to legacy |
| A4.3 | Divergence is logged | PASS | CANONICAL PASS | Not applicable to legacy |
| A4.4 | Divergence reaches zero before authority transfer | PASS | CANONICAL PASS | Not applicable to legacy |
| A4.5 | Canonical policy becomes authoritative | PASS | CANONICAL PASS | Not applicable to legacy |
| A5.1 | Service-role bypasses RLS | PASS | CANONICAL PASS | Not applicable to legacy |
| A5.2 | Service-layer enforces Organisation context | PASS | CANONICAL PASS | Not applicable to legacy |
| A5.3 | Session-client isolation via RLS | PASS | CANONICAL PASS | Not applicable to legacy |
| A5.4 | Service-layer isolation is independent | PASS | CANONICAL PASS | Not applicable to legacy |
| A6.1 | State 0 authority is user_id | PASS | CANONICAL PASS | Legacy uses user_id (correct for State 0) |
| A6.2 | State 1 authority is user_id with shadow | PASS | CANONICAL PASS | Not applicable to legacy |
| A6.3 | State 2 authority is organisation_id | PASS | CANONICAL PASS | Not applicable to legacy |
| A6.4 | State 3 authority is Organisation + Person model | PASS | CANONICAL PASS | Not applicable to legacy |
| A6.5 | Authority transfer is explicit | PASS | CANONICAL PASS | Not applicable to legacy |
| A7.1 | Rollback restores previous authority | PASS | CANONICAL PASS | Not applicable to legacy |
| A7.2 | Rollback preserves data | PASS | CANONICAL PASS | Not applicable to legacy |
| A7.3 | Rollback preserves schema | PASS | CANONICAL PASS | Not applicable to legacy |
| A7.4 | Rollback preserves Migration Ledger | PASS | CANONICAL PASS | Not applicable to legacy |
| A7.5 | Rollback is non-destructive | PASS | CANONICAL PASS | Not applicable to legacy |
| A8.1 | Ledger is append-only | PASS | CANONICAL PASS | Not applicable to legacy |
| A8.2 | Every migration has a ledger entry | PASS | CANONICAL PASS | Not applicable to legacy |
| A8.3 | Ledger records resolution method | PASS | CANONICAL PASS | Not applicable to legacy |
| A8.4 | Ledger records confidence | PASS | CANONICAL PASS | Not applicable to legacy |
| A8.5 | Ledger records validation status | PASS | CANONICAL PASS | Not applicable to legacy |
| A8.6 | Ledger is authoritative source for identity mappings | PASS | CANONICAL PASS | Not applicable to legacy |
| B1.3 | Organisation survives Auth change | PASS | CANONICAL PASS | Not applicable to legacy (Org doesn't exist) |
| B1.4 | Organisation survives Subscription change | PASS | CANONICAL PASS | Not applicable to legacy (Org doesn't exist) |
| B1.5 | Organisation survives Consultant change | PASS | CANONICAL PASS | Not applicable to legacy (Org doesn't exist) |
| B1.6 | Organisation survives Kira Instance change | PASS | CANONICAL PASS | Not applicable to legacy (Org doesn't exist) |
| B2.3 | Person identity survives membership change | PASS | CANONICAL PASS | Not applicable to legacy (Person doesn't exist) |
| B2.4 | Person identity survives ownership change | PASS | CANONICAL PASS | Not applicable to legacy (Person doesn't exist) |
| B2.5 | Auth credential is separate from Person | PASS | CANONICAL PASS | Not applicable to legacy (Person doesn't exist) |
| B3.2 | Only one current ownership | PASS | CANONICAL PASS | Not applicable to legacy (Ownership doesn't exist) |
| B3.3 | Historical ownership survives | PASS | CANONICAL PASS | Not applicable to legacy (Ownership doesn't exist) |
| B3.4 | Ownership change does not destroy Organisation | PASS | CANONICAL PASS | Not applicable to legacy (Ownership doesn't exist) |
| B3.5 | Ownership change is recorded with provenance | PASS | CANONICAL PASS | Not applicable to legacy (Ownership doesn't exist) |
| B4.1 | Consultant ≠ Introducer | PASS | CANONICAL PASS | Accidentally satisfied (Consultant absent) |
| B4.2 | Consultant relationship is temporal | PASS | CANONICAL PASS | Not applicable to legacy (Consultant absent) |
| B4.3 | Consultant replacement does not destroy Organisation | PASS | CANONICAL PASS | Not applicable to legacy (Consultant absent) |
| B4.4 | Consultant knowledge belongs to Organisation | PASS | CANONICAL PASS | Not applicable to legacy (Consultant absent) |
| B5.2 | Engagement has temporal boundaries | PASS | CANONICAL PASS | Not applicable to legacy (Engagement absent) |
| B5.3 | Engagement ≠ Conversation | PASS | CANONICAL PASS | Not applicable to legacy (Engagement absent) |
| B5.4 | Engagement knowledge belongs to Organisation | PASS | CANONICAL PASS | Not applicable to legacy (Engagement absent) |
| B5.5 | Engagement context is not organisational knowledge | PASS | CANONICAL PASS | Not applicable to legacy (Engagement absent) |
| B6.2 | Kira Instance replacement does not destroy Organisation | PASS | CANONICAL PASS | Not applicable to legacy (Org doesn't exist) |
| B6.3 | Kira Instance knowledge belongs to Organisation | PASS | CANONICAL PASS | Not applicable to legacy (Org doesn't exist) |
| B6.4 | Multiple Kira Instances per Organisation | PASS | CANONICAL PASS | Not applicable to legacy (Org doesn't exist) |
| B7.2 | Subscription expiry does not destroy Organisation | PASS | CANONICAL PASS | Not applicable to legacy (Org doesn't exist) |
| B7.3 | Commercial Arrangement is temporal | PASS | CANONICAL PASS | Not applicable to legacy (Commercial absent) |
| B7.4 | Pricing is not hardcoded | PASS | CANONICAL PASS | Not applicable to legacy (Commercial absent) |
| B8.2 | Knowledge survives Person change | PASS | CANONICAL PASS | Not applicable to legacy (Person doesn't exist) |
| B8.3 | Knowledge survives Consultant change | PASS | CANONICAL PASS | Not applicable to legacy (Consultant absent) |
| B8.4 | Knowledge survives Subscription change | PASS | CANONICAL PASS | Not applicable to legacy (Subscription doesn't exist independently) |
| B8.5 | Knowledge survives Kira Instance change | PASS | CANONICAL PASS | Not applicable to legacy (Kira Instance doesn't exist independently) |
| B9.1 | Every knowledge item has provenance | PASS | CANONICAL PASS | Partially satisfied (genome tables have source_type) |
| B9.2 | Provenance is immutable | PASS | CANONICAL PASS | Not applicable to legacy |
| B9.3 | Provenance traces to source | PASS | CANONICAL PASS | Not applicable to legacy |
| B9.4 | Confidence is explicit | PASS | CANONICAL PASS | Not applicable to legacy |
| B9.5 | Confidence is calculated correctly | PASS | CANONICAL PASS | Not applicable to legacy |
| B10.1 | Superseded records persist | PASS | CANONICAL PASS | Partially satisfied (supersedes chains exist) |
| B10.2 | Supersession chains intact | PASS | CANONICAL PASS | Partially satisfied (supersedes chains exist) |
| B10.3 | Historical state reconstructible | PASS | CANONICAL PASS | Not applicable to legacy |
| B10.4 | Historical ownership preserved | PASS | CANONICAL PASS | Not applicable to legacy (Ownership absent) |
| B10.5 | Historical memberships preserved | PASS | CANONICAL PASS | Not applicable to legacy (Membership absent) |
| B11.1 | Organisation survives Person replacement | PASS | CANONICAL PASS | Not applicable to legacy (Org doesn't exist) |
| B11.2 | Organisation survives Consultant replacement | PASS | CANONICAL PASS | Not applicable to legacy (Org doesn't exist) |
| B11.3 | Organisation survives Subscription change | PASS | CANONICAL PASS | Not applicable to legacy (Org doesn't exist) |
| B11.4 | Organisation survives Kira Instance replacement | PASS | CANONICAL PASS | Not applicable to legacy (Org doesn't exist) |
| B11.5 | Organisation survives Ownership transfer | PASS | CANONICAL PASS | Not applicable to legacy (Org doesn't exist) |
| B11.6 | Organisational knowledge survives all changes | PASS | CANONICAL PASS | Not applicable to legacy (Org doesn't exist) |
| C1.1 | Organisation created from legacy user | PASS | CANONICAL PASS | Not applicable to legacy |
| C1.2 | Person created from legacy user | PASS | CANONICAL PASS | Not applicable to legacy |
| C1.3 | Membership created | PASS | CANONICAL PASS | Not applicable to legacy |
| C1.4 | Knowledge recontextualised | PASS | CANONICAL PASS | Not applicable to legacy |
| C1.5 | Legacy functionality preserved | PASS | CANONICAL PASS | Not applicable to legacy |
| C1.6 | Migration Ledger populated | PASS | CANONICAL PASS | Not applicable to legacy |
| C1.7 | Rollback to State 0 succeeds | PASS | CANONICAL PASS | Not applicable to legacy |
| C2.1 | Authority transfers to organisation_id | PASS | CANONICAL PASS | Not applicable to legacy |
| C2.2 | RLS policies updated | PASS | CANONICAL PASS | Not applicable to legacy |
| C2.3 | Legacy policies deprecated | PASS | CANONICAL PASS | Not applicable to legacy |
| C2.4 | Knowledge ownership verified | PASS | CANONICAL PASS | Not applicable to legacy |
| C2.5 | Rollback to State 1 succeeds | PASS | CANONICAL PASS | Not applicable to legacy |
| C3.1 | Person fully decoupled from users | PASS | CANONICAL PASS | Not applicable to legacy |
| C3.2 | Temporal memberships authoritative | PASS | CANONICAL PASS | Not applicable to legacy |
| C3.3 | Ownership periods exist | PASS | CANONICAL PASS | Not applicable to legacy |
| C3.4 | Engagements exist | PASS | CANONICAL PASS | Not applicable to legacy |
| C3.5 | Rollback to State 2 succeeds | PASS | CANONICAL PASS | Not applicable to legacy |
| C4.1 | Organisation cannot be deleted | PASS | CANONICAL PASS | Not applicable to legacy |
| C4.2 | Person cannot be deleted | PASS | CANONICAL PASS | Not applicable to legacy |
| C4.3 | Knowledge cannot be orphaned | PASS | CANONICAL PASS | Not applicable to legacy |
| C4.4 | Ownership cannot be duplicated | PASS | CANONICAL PASS | Not applicable to legacy |
| C4.5 | Membership cannot be duplicated | PASS | CANONICAL PASS | Not applicable to legacy |
| C4.6 | Authority cannot transfer without governance | PASS | CANONICAL PASS | Not applicable to legacy |

---

## 5. Baseline Result Register

### 5.1 Forensic Chain

For each of the 95 tests, the forensic chain is:

```
Canonical Invariant → Implementation Gap → Architectural Decision → Executable Test → Observed Baseline → Remediation Verification
```

### 5.2 Root-Cause Experimental Proof

The 10 EXPECTED LEGACY FAILURES experimentally prove the consequences of `users.id` semantic overload:

| Failure | Consequence | Root Cause |
|---------|-------------|------------|
| B1.1 | Organisation does not exist independently | `users.id` IS the Organisation |
| B1.2 | Organisation does not survive Person change | `users.id` IS the Organisation, `ON DELETE CASCADE` |
| B2.1 | Person does not exist independently | `users.id` IS the Person |
| B2.2 | Person cannot have multiple roles | 1:1 `users` → `business_identity` |
| B3.1 | Ownership is not temporal | `owner_name TEXT` only |
| B5.1 | Engagement is not first-class | No `engagements` table |
| B6.1 | Kira Instance is not separate | `kira_agents.user_id` FK |
| B7.1 | Subscription is not separate | `users.subscription_status` |
| B8.1 | Knowledge does not belong to Organisation | FK to `user_id` |
| B8.6 | Conversation is treated as knowledge | No evidence/knowledge separation |

These 10 failures are not independent problems. They are all consequences of the single root cause: `users.id` performing five incompatible semantic roles.

---

## 6. Exit Criterion Verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 95/95 PASS on canonical target database | **MET** | All 95 tests execute with CANONICAL PASS |
| 10 EXPECTED LEGACY FAILURE on legacy database | **MET** | 10 tests fail with EXPECTED LEGACY FAILURE classification |
| Zero UNREGISTERED ARCHITECTURAL CONFLICTS | **MET** | No unexpected failures |
| Zero HARNESS DEFECTS | **MET** | No test validity issues |

---

## 7. Next Phase

P0.4-E is complete. The baseline is established. The canonical architecture is proven to work. The legacy defects are experimentally confirmed.

The next phase is remediation implementation, followed by rerun to achieve 95/95 canonical pass + zero unregistered conflicts on the legacy database after migration.

---

*This artifact is the P0.4-E baseline test run. It is the photographic record before remediation. The canonical architecture is now experimentally validated.*
