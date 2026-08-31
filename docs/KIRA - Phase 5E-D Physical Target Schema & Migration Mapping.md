# Phase 5E-D: Physical Target Schema & Migration Mapping

**Status:** ✅ ACCEPTED / LOCKED
**Phase:** 5E-D
**Predecessors:** 
- 5D (Locked)
- 5E-A (Locked)
- 5E-B (Locked)
- 5E-C (Locked)

---

## 1. Purpose & Constraint
This document maps the conceptual target architecture (5E-C) to a physical schema design and migration plan.

**Constraint:** No SQL, migration scripts, schema modification, or production code changes are authorised by this artifact.

---

## 2. Decision Queue (Accepted Architectural Decisions)

| ID | Decision Point | Accepted Architectural Resolution |
| :--- | :--- | :--- |
| **DEC-01** | Target Memory Boundary | `kira_memory` is interaction/context layer; Structured Knowledge is downstream. |
| **DEC-02** | Provenance | Provenance is independently represented, not conflated with memory state. |
| **DEC-03** | Historical Preservation | Memory changes are historically recoverable; destructive replacement prohibited. |
| **DEC-04** | Temporal + Supersession | Temporal validity and explicit supersession/version lineage are first-class mechanisms. |
| **DEC-05** | Ambiguous Legacy | Records whose Organisation cannot be deterministically established are quarantined. |
| **DEC-06** | Genome Boundary | Genome classification is orthogonal axis; does not define semantic identity. |
| **DEC-07** | Migration Compatibility | Temporary compatibility layer required for migration; not canonical architecture. |

---

## 3. Physical Schema Concept (Non-SQL)

### 3.1 Target Table: `kira_memory` (Context Layer)
- **Organisation Context:** `organisation_id` (FK)
- **Actor Context:** `legacy_user_id` (nullable, contextual provenance)
- **Kira Context:** `kira_instance_id` (operational provenance)
- **Evidence/Provenance:** FK to `evidence_registry` (abstracted source record)
- **Semantic State:** `status`, `confidence`
- **Governance:** `governance_state`
- **Temporal State:** `valid_from`, `valid_to` (or equivalent range type)

### 3.2 Auxiliary Structures
- **`kira_memory_quarantine`:** Mirror structure of `kira_memory` for records lacking clear `organisation_id`.
- **`kira_memory_history`:** Audit table for every change to `kira_memory` (Supersession chain).
- **`genome_classifications`:** Table hosting the orthogonal classification axis.

---

## 4. Migration Strategy

### 4.1 State Machine
1. **CLASSIFY:** Assign `RESOLVED_AGENT`, `RESOLVED_USER`, etc., to all records.
2. **QUARANTINE:** Move non-RESOLVED records to `kira_memory_quarantine`.
3. **STAGING:** Apply new schema (nullable `organisation_id`, additional provenance/status cols).
4. **BACKFILL:** Apply `organisation_id` to `kira_memory`.
5. **VERIFY:** Strict failure on `NULL organisation_id` in `kira_memory`.
6. **CONSTRAINT:** Apply `NOT NULL` on `organisation_id`.

### 4.2 Legacy Compatibility
A database `VIEW` will simulate the legacy `kira_memory` structure, allowing read/write operations to function during the staged migration (adapter pattern).

---

## 5. Architectural Invariants (Traceability)

- **SEM-001 (Org Context):** Physical schema enforces organisation-level partitioning.
- **SEM-009 (History):** Historical/superseded state is physically recoverable via `kira_memory_history`.
- **SEM-010 (Quarantine):** `organisation_id NOT NULL` is strictly applied *post-migration* via quarantine boundary.
- **SEM-012 (Canonical Integrity):** Schema maps directly to 5E-C semantic concepts; no convenience-led schema overloading.

---

## 6. Acceptance Statement

**Status:** ACCEPTED

Phase 5E-D — Physical Target Schema & Migration Mapping is accepted as the architectural baseline for implementation. The architectural decisions (DEC-01 to DEC-07) are locked. Any deviation during implementation preparation (Phase 5E-E) or execution must be treated as an architectural amendment.

No production code changes are authorised by this acceptance. Proceed to Phase 5E-E (Implementation Preparation).
