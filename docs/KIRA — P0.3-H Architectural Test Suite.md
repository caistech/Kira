# KIRA — P0.3-H Architectural Test Suite

**Status:** Architectural Specification
**Purpose:** Define the executable proof layer for the canonical model and transition architecture
**Scope:** Migration safety, canonical conformance, and state transition validation
**Prerequisite:** P0.3-G, P0.3-G.1
**Date:** 26 August 2026

---

## 1. Purpose and Governing Question

This artifact defines the **Architectural Test Suite** — the executable proof layer for the canonical model (P0.1–P0.2) and the transition architecture (P0.3-G/G.1).

The governing question is:

> **Can we demonstrate, through repeatable tests, that the transition from the current user-centric implementation to the canonical Organisation + Person model preserves identity, tenancy, history, provenance, access isolation and organisational continuity at every authority boundary?**

If yes, P0.3-G/G.1 is not merely architecturally plausible — it has a defined verification mechanism.

---

## 2. Test Layer Structure

```
P0.3-H
│
├── A. Migration Safety Tests
│   ├── Identity resolution
│   ├── UUID reuse
│   ├── Dual-context persistence
│   ├── RLS shadow evaluation
│   ├── Service-role isolation
│   ├── Authority transitions
│   ├── Authority rollback
│   └── Migration Ledger integrity
│
├── B. Canonical Conformance Tests
│   ├── Organisation persistence
│   ├── Person/role separation
│   ├── Ownership temporalisation
│   ├── Consultant separation
│   ├── Engagement separation
│   ├── Kira/Organisation separation
│   ├── Subscription/commercial separation
│   ├── Knowledge/conversation separation
│   ├── Provenance
│   ├── Historical preservation
│   └── Continuity through replacement/change
│
└── C. State Transition Tests
    ├── State 0 → State 1
    ├── State 1 → State 2
    ├── State 2 → State 3
    ├── Rollback at each boundary
    └── Forbidden transitions / invariant violations
```

---

## 3. Layer A: Migration Safety Tests

### A1: Identity Resolution

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| A1.1 | ONE→ONE direct mapping | Single legacy user maps to one Organisation and one Person | `legacy_identity_map` has one row. Canonical UUIDs differ from `users.id` in future migrations. |
| A1.2 | ONE→MANY split | Single legacy user contains data for multiple Organisations | `legacy_identity_map` has multiple rows. All historical records preserved. |
| A1.3 | MANY→ONE consolidation | Multiple legacy users represent the same Organisation | `legacy_identity_map` has multiple rows pointing to one canonical Organisation. All source history preserved. |
| A1.4 | Ambiguous resolution | Legacy evidence insufficient to determine canonical mapping | `resolution_status = 'ambiguous'`. Resolution queue entry created. No canonical record created. |
| A1.5 | Insufficient evidence | Legacy data cannot support any canonical interpretation | `resolution_status = 'insufficient'`. Evidence preserved. No canonical record created. |
| A1.6 | Resolution provenance immutable | `legacy_identity_map` records cannot be updated or deleted | UPDATE and DELETE operations fail on `legacy_identity_map` table. |
| A1.7 | Source history preserved | All legacy records referenced in resolution remain accessible | Every `legacy_user_id` in `legacy_identity_map` resolves to at least one source record. |

### A2: UUID Reuse

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| A2.1 | UUID reuse is migration convenience | Verify that `organisations.id = users.id` is documented as temporary | `legacy_identity_map` records the original `users.id` and the canonical UUID. |
| A2.2 | UUID equality does not imply entity identity | Verify that application code does not use `organisation_id = user_id` as a join condition | Grep all SQL queries and application code for `organisation_id = user_id` patterns. Zero matches expected. |
| A2.3 | UUID equality may cease to hold | Verify that future migrations can assign new UUIDs to `organisations.id` without breaking references | Migration script exists that reassigns `organisations.id` to a new UUID and updates all FK references. |

### A3: Dual-Context Persistence

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| A3.1 | One record, two identifiers | Verify that a migrated knowledge record has both `user_id` and `organisation_id` on the same row | Single row in `kira_memory` with `user_id = X` and `organisation_id = Y`. |
| A3.2 | No duplicate records | Verify that dual-context persistence does not create parallel records | Count of records where `user_id = X` equals count of records where `organisation_id = Y` (for the same logical fact). |
| A3.3 | Legacy read path works | Verify that `WHERE user_id = X` returns the same records as `WHERE organisation_id = Y` | Both queries return identical result sets. |
| A3.4 | Canonical read path works | Verify that `WHERE organisation_id = Y` returns correct records | Query returns records belonging to the Organisation. |
| A3.5 | Write populates both identifiers | Verify that new writes populate both `user_id` and `organisation_id` | Inserted record has both identifiers populated. |

### A4: RLS Shadow Evaluation

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| A4.1 | Legacy policy is authoritative | Verify that legacy `user_id`-based RLS policy grants access | Session client can read records where `user_id = auth.uid()`. |
| A4.2 | Canonical policy is evaluated but not granting | Verify that canonical `organisation_id`-based policy is evaluated for audit | Shadow evaluation function returns correct canonical access decision. |
| A4.3 | Divergence is logged | Verify that access where legacy allows but canonical denies is logged | Divergence log contains entries for cross-tenant access attempts. |
| A4.4 | Divergence reaches zero before authority transfer | Verify that no divergence exists before switching to canonical authority | Divergence log is empty for all tested records. |
| A4.5 | Canonical policy becomes authoritative | Verify that after authority transfer, canonical policy is the sole access control | Legacy policy removed. Session client can only read records where `organisation_id` matches. |

### A5: Service-Role Isolation

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| A5.1 | Service-role bypasses RLS | Verify that service-role client can access all records regardless of RLS | Service-role client reads records without RLS filtering. |
| A5.2 | Service-layer enforces Organisation context | Verify that service-layer code enforces `organisation_id` filtering independently of RLS | Service-layer code checks `organisation_id` before returning data. |
| A5.3 | Session-client isolation via RLS | Verify that session-client access is filtered by RLS | Session client cannot read records belonging to other Organisations. |
| A5.4 | Service-layer isolation is independent | Verify that service-layer Organisation context enforcement works even if RLS is disabled | Service-layer code correctly filters by `organisation_id` with RLS off. |

### A6: Authority Transitions

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| A6.1 | State 0 authority is user_id | Verify that in State 0, all queries use `user_id` as the tenant key | Application code uses `WHERE user_id = auth.uid()` for all data access. |
| A6.2 | State 1 authority is user_id with shadow | Verify that in State 1, legacy code uses `user_id` and new code can use `organisation_id` | Legacy code paths use `user_id`. New code paths use `organisation_id`. Both return correct results. |
| A6.3 | State 2 authority is organisation_id | Verify that in State 2, all queries use `organisation_id` as the tenant key | Application code uses `WHERE organisation_id = ?` for all data access. |
| A6.4 | State 3 authority is Organisation + Person model | Verify that in State 3, all queries use `organisation_id` and `person_id` as the tenant key | Application code uses `WHERE organisation_id = ? AND person_id = ?` for all data access. |
| A6.5 | Authority transfer is explicit | Verify that authority transfer requires explicit governance approval | Authority transfer cannot occur without a signed migration ledger entry. |

### A7: Authority Rollback

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| A7.1 | Rollback restores previous authority | Verify that rollback changes authority back to the previous state | After rollback, `user_id` is the authoritative tenant key. |
| A7.2 | Rollback preserves data | Verify that rollback does not destroy any data | All records remain accessible after rollback. |
| A7.3 | Rollback preserves schema | Verify that rollback does not drop any tables or columns | All tables and columns remain after rollback. |
| A7.4 | Rollback preserves Migration Ledger | Verify that rollback does not modify Migration Ledger entries | `migration_ledger` records are unchanged after rollback. |
| A7.5 | Rollback is non-destructive | Verify that no data is deleted during rollback | Row counts before and after rollback are identical. |

### A8: Migration Ledger Integrity

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| A8.1 | Ledger is append-only | Verify that `migration_ledger` records cannot be updated or deleted | UPDATE and DELETE operations fail on `migration_ledger` table. |
| A8.2 | Every migration has a ledger entry | Verify that every data migration operation creates a corresponding ledger entry | Count of migrated records = count of ledger entries. |
| A8.3 | Ledger records resolution method | Verify that each ledger entry records how the mapping was determined | `resolution_method` is populated for every ledger entry. |
| A8.4 | Ledger records confidence | Verify that each ledger entry records the confidence of the mapping | `confidence` is populated for every ledger entry. |
| A8.5 | Ledger records validation status | Verify that each ledger entry records whether the mapping was validated | `validation_status` is populated for every ledger entry. |
| A8.6 | Ledger is the authoritative source for identity mappings | Verify that `legacy_identity_map` references can be resolved via `migration_ledger` | Every `legacy_identity_map` entry has a corresponding `migration_ledger` entry. |

---

## 4. Layer B: Canonical Conformance Tests

### B1: Organisation Persistence

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| B1.1 | Organisation exists independently | Verify that Organisation record exists independent of Person, Auth, Subscription | `organisations` table has records. `organisation_id` is NOT NULL on all knowledge tables. |
| B1.2 | Organisation survives Person change | Verify that Organisation persists when Person is removed or replaced | Deleting or deactivating a Person does not delete or deactivate the Organisation. |
| B1.3 | Organisation survives Auth change | Verify that Organisation persists when Auth credential is rotated | Rotating Auth credential does not affect Organisation record. |
| B1.4 | Organisation survives Subscription change | Verify that Organisation persists when Subscription expires or is cancelled | Expiring Subscription does not affect Organisation record. |
| B1.5 | Organisation survives Consultant change | Verify that Organisation persists when Consultant is replaced | Replacing Consultant does not affect Organisation record. |
| B1.6 | Organisation survives Kira Instance change | Verify that Organisation persists when Kira Instance is replaced | Replacing Kira Instance does not affect Organisation record. |

### B2: Person/Role Separation

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| B2.1 | Person exists independently | Verify that Person record exists independent of Organisation | `persons` table has records. Person can exist without Organisation membership. |
| B2.2 | Person has multiple roles | Verify that Person can have multiple organisational roles | Person can be `owner` in one Organisation and `consultant` in another. |
| B2.3 | Person identity survives membership change | Verify that Person identity persists when membership is ended | Ending membership does not delete Person record. |
| B2.4 | Person identity survives ownership change | Verify that Person identity persists when ownership is transferred | Transferring ownership does not delete Person record. |
| B2.5 | Auth credential is separate from Person | Verify that Auth credential can be revoked without destroying Person identity | Revoking Auth credential does not delete Person record. |

### B3: Ownership Temporalisation

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| B3.1 | Ownership period is temporal | Verify that Ownership Period has `valid_from` and `valid_to` | `ownership_periods` table has temporal columns. |
| B3.2 | Only one current ownership | Verify that only one Ownership Period is `current` at a time | COUNT of `status = 'current'` per Organisation = 1. |
| B3.3 | Historical ownership survives | Verify that historical Ownership Periods are never deleted | Historical records persist after ownership transfer. |
| B3.4 | Ownership change does not destroy Organisation | Verify that Organisation persists through ownership change | Organisation record unchanged after ownership transfer. |
| B3.5 | Ownership change is recorded with provenance | Verify that ownership transfer has transition record | `state_transitions` table has entry for ownership change. |

### B4: Consultant Separation

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| B4.1 | Consultant ≠ Introducer | Verify that Consultant and Introducer are separate entities | `consultants` table and `introducers` table exist independently. |
| B4.2 | Consultant relationship is temporal | Verify that Consultant relationship has start/end | `consultant_relationships` table has temporal columns. |
| B4.3 | Consultant replacement does not destroy Organisation | Verify that Organisation persists when Consultant is replaced | Organisation record unchanged after Consultant replacement. |
| B4.4 | Consultant knowledge belongs to Organisation | Verify that knowledge produced during Consultant engagement belongs to Organisation | Knowledge records have `organisation_id`, not `consultant_id`. |

### B5: Engagement Separation

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| B5.1 | Engagement is first-class | Verify that Engagement entity exists independently | `engagements` table has records with `organisation_id`. |
| B5.2 | Engagement has temporal boundaries | Verify that Engagement has start/end | `engagements` table has `valid_from` and `valid_to`. |
| B5.3 | Engagement ≠ Conversation | Verify that Engagement and Conversation are separate entities | `engagements` table and `conversations` table exist independently. |
| B5.4 | Engagement knowledge belongs to Organisation | Verify that knowledge produced during Engagement belongs to Organisation | Knowledge records have `organisation_id`, not `engagement_id`. |
| B5.5 | Engagement context is not organisational knowledge | Verify that Engagement-owned context (notes, drafts) is not persisted in organisational knowledge tables | Engagement-specific notes are not in `kira_memory` or `genome_facts`. |

### B6: Kira/Organisation Separation

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| B6.1 | Kira Instance is separate from Organisation | Verify that Kira Instance entity exists independently | `kira_instances` table has records with `organisation_id`. |
| B6.2 | Kira Instance replacement does not destroy Organisation | Verify that Organisation persists when Kira Instance is replaced | Organisation record unchanged after Kira Instance replacement. |
| B6.3 | Kira Instance knowledge belongs to Organisation | Verify that memory generated by Kira Instance belongs to Organisation | Knowledge records have `organisation_id`, not `kira_instance_id`. |
| B6.4 | Multiple Kira Instances per Organisation | Verify that Organisation can have multiple historical Kira Instances | COUNT of `kira_instances` per Organisation can be > 1. |

### B7: Subscription/Commercial Separation

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| B7.1 | Subscription is separate from Organisation | Verify that Subscription entity exists independently | `subscriptions` table has records with `organisation_id`. |
| B7.2 | Subscription expiry does not destroy Organisation | Verify that Organisation persists when Subscription expires | Organisation record unchanged after Subscription expiry. |
| B7.3 | Commercial Arrangement is temporal | Verify that Commercial Arrangement has version and temporal scope | `commercial_arrangements` table has `version`, `valid_from`, `valid_to`. |
| B7.4 | Pricing is not hardcoded | Verify that pricing logic references `commercial_arrangements` table | Application code queries `commercial_arrangements` for pricing. |

### B8: Knowledge/Conversation Separation

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| B8.1 | Knowledge belongs to Organisation | Verify that knowledge records have `organisation_id` NOT NULL | All `kira_memory`, `genome_entities`, `genome_facts` records have `organisation_id`. |
| B8.2 | Knowledge survives Person change | Verify that knowledge persists when Person is removed or replaced | Deleting or deactivating a Person does not delete knowledge records. |
| B8.3 | Knowledge survives Consultant change | Verify that knowledge persists when Consultant is replaced | Replacing Consultant does not delete knowledge records. |
| B8.4 | Knowledge survives Subscription change | Verify that knowledge persists when Subscription expires | Expiring Subscription does not delete knowledge records. |
| B8.5 | Knowledge survives Kira Instance change | Verify that knowledge persists when Kira Instance is replaced | Replacing Kira Instance does not delete knowledge records. |
| B8.6 | Conversation is evidence, not knowledge | Verify that raw conversations are preserved as evidence, not treated as knowledge | `conversations` table exists as evidence source. Knowledge is extracted from conversations into `kira_memory`. |

### B9: Provenance

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| B9.1 | Every knowledge item has provenance | Verify that every knowledge record has `source_type`, `source_id`, `observed_at` | All knowledge records have provenance fields populated. |
| B9.2 | Provenance is immutable | Verify that provenance fields cannot be updated or deleted | UPDATE and DELETE operations fail on provenance fields. |
| B9.3 | Provenance traces to source | Verify that every `source_id` resolves to a valid record | All `source_id` references resolve to existing records in source tables. |
| B9.4 | Confidence is explicit | Verify that every knowledge record has a confidence score | All knowledge records have `confidence` populated. |
| B9.5 | Confidence is calculated correctly | Verify that confidence score reflects evidence type, authority, clarity, consistency | Confidence calculation matches expected formula. |

### B10: Historical Preservation

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| B10.1 | Superseded records persist | Verify that superseded knowledge records are never deleted | Superseded records remain in tables with `status = 'superseded'`. |
| B10.2 | Supersession chains intact | Verify that `supersedes` chains are preserved through migration | All `supersedes` references resolve correctly after migration. |
| B10.3 | Historical state reconstructible | Verify that organisational state can be reconstructed at any historical point | Query for state at time T returns correct state. |
| B10.4 | Historical ownership preserved | Verify that historical Ownership Periods are never deleted | Historical records persist after ownership transfer. |
| B10.5 | Historical memberships preserved | Verify that historical membership records are never deleted | Historical records persist after membership change. |

### B11: Continuity Through Replacement/Change

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| B11.1 | Organisation survives Person replacement | Verify that Organisation persists when Person is replaced | Organisation record unchanged. Knowledge records unchanged. |
| B11.2 | Organisation survives Consultant replacement | Verify that Organisation persists when Consultant is replaced | Organisation record unchanged. Knowledge records unchanged. |
| B11.3 | Organisation survives Subscription change | Verify that Organisation persists when Subscription expires or changes | Organisation record unchanged. Knowledge records unchanged. |
| B11.4 | Organisation survives Kira Instance replacement | Verify that Organisation persists when Kira Instance is replaced | Organisation record unchanged. Knowledge records unchanged. |
| B11.5 | Organisation survives Ownership transfer | Verify that Organisation persists when ownership is transferred | Organisation record unchanged. Knowledge records unchanged. |
| B11.6 | Organisational knowledge survives all changes | Verify that knowledge persists through all organisational changes | Knowledge records unchanged through Person, Consultant, Subscription, Kira Instance, and Ownership changes. |

---

## 5. Layer C: State Transition Tests

### C1: State 0 → State 1 (Bridge)

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| C1.1 | Organisation created from legacy user | Verify that Organisation record is created from `users` + `business_identity` | `organisations` table has record with `id = users.id`. |
| C1.2 | Person created from legacy user | Verify that Person record is created from `users` | `persons` table has record with `id = users.id`. |
| C1.3 | Membership created | Verify that Organisation Membership record is created linking Person to Organisation | `organisation_memberships` table has record with `role = 'owner'`. |
| C1.4 | Knowledge recontextualised | Verify that knowledge records have `organisation_id` populated | All knowledge records have `organisation_id = users.id`. |
| C1.5 | Legacy functionality preserved | Verify that legacy API routes continue to work | Legacy routes return correct results. |
| C1.6 | Migration Ledger populated | Verify that `migration_ledger` has entries for all migrated records | Ledger entry count = migrated record count. |
| C1.7 | Rollback to State 0 succeeds | Verify that rollback restores `user_id` authority without data loss | `user_id` is authoritative. All data preserved. |

### C2: State 1 → State 2 (Migrated)

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| C2.1 | Authority transfers to organisation_id | Verify that `organisation_id` becomes the primary tenant key | Application code uses `organisation_id` for all queries. |
| C2.2 | RLS policies updated | Verify that RLS policies use `organisation_id` as the primary filter | Session client access filtered by `organisation_id`. |
| C2.3 | Legacy policies deprecated | Verify that legacy `user_id`-based RLS policies are removed | No `user_id`-based RLS policies exist. |
| C2.4 | Knowledge ownership verified | Verify that all knowledge records belong to the correct Organisation | No cross-Organisation knowledge access. |
| C2.5 | Rollback to State 1 succeeds | Verify that rollback restores `user_id` authority | `user_id` is authoritative. All data preserved. |

### C3: State 2 → State 3 (Canonical)

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| C3.1 | Person fully decoupled from users | Verify that Person identity is independent of `users.id` | Person can exist without `users` record. |
| C3.2 | Temporal memberships authoritative | Verify that `organisation_memberships` has temporal scope | `valid_from` and `valid_to` columns populated. |
| C3.3 | Ownership periods exist | Verify that `ownership_periods` table has records | Ownership is temporal. |
| C3.4 | Engagements exist | Verify that `engagements` table has records | Engagements are first-class. |
| C3.5 | Rollback to State 2 succeeds | Verify that rollback restores State 2 authority | `organisation_id` is authoritative. All data preserved. |

### C4: Forbidden Transitions / Invariant Violations

| Test ID | Test Name | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| C4.1 | Organisation cannot be deleted | Verify that Organisation record cannot be deleted | DELETE operation fails on `organisations` table. |
| C4.2 | Person cannot be deleted | Verify that Person record cannot be deleted | DELETE operation fails on `persons` table. |
| C4.3 | Knowledge cannot be orphaned | Verify that knowledge record cannot exist without `organisation_id` | INSERT with NULL `organisation_id` fails. |
| C4.4 | Ownership cannot be duplicated | Verify that only one Ownership Period is `current` at a time | INSERT of second `current` Ownership Period fails. |
| C4.5 | Membership cannot be duplicated | Verify that only one membership per role per Person per Organisation at a time | INSERT of duplicate membership fails. |
| C4.6 | Authority cannot transfer without governance | Verify that authority transfer requires explicit governance approval | Authority transfer without migration ledger entry fails. |

---

## 6. Test Execution Requirements

### 6.1 Environment

- Tests execute against a synthetic testing database with known data.
- Tests do not execute against production data.
- Each test has a setup and teardown phase that creates and destroys test data.

### 6.2 Automation

- All tests are automated and executable via CI/CD pipeline.
- Tests run on every schema migration or database access layer modification.
- Tests run before and after each migration phase boundary.

### 6.3 Reporting

- Test results are recorded in a test report with pass/fail status.
- Failed tests are classified by severity (critical, high, medium, low).
- Critical failures block migration phase transitions.

### 6.4 Exit Criteria

The test suite is complete when:
1. All Layer A tests pass (Migration Safety).
2. All Layer B tests pass (Canonical Conformance).
3. All Layer C tests pass (State Transition).
4. No critical failures remain unresolved.
5. The test suite is integrated into the CI/CD pipeline.

---

## 7. Completion Criterion

The Architectural Test Suite is complete when it can answer:

> **Can we demonstrate, through repeatable tests, that the transition from the current user-centric implementation to the canonical Organisation + Person model preserves identity, tenancy, history, provenance, access isolation and organisational continuity at every authority boundary?**

If the answer is yes, the architecture is not merely plausible — it has a defined verification mechanism.

---

*This artifact is the P0.3-H architectural test suite. It is the final design artifact in the P0.3 sequence. The canonical model, transition architecture, and test suite are now complete and ready for implementation.*
