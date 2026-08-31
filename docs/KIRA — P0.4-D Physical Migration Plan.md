# Kira — P0.4-D Physical Migration Plan

**Status:** Physical Execution Specification
**Purpose:** Define the executable physical state machine for transitioning from legacy Supabase implementation to the canonical architecture.
**Prerequisite:** P0.4-C (Gap/Decision Register), Disposition Register
**Date:** 26 August 2026

---

## 1. Global Physical State Machine

The migration proceeds through ordered states, where each transition is a validated physical operation.

| State | Definition | Auth Anchor |
| :--- | :--- | :--- |
| **0** | **Legacy** | `users.id` |
| **1** | **Introduction** | Canonical tables exist; legacy remains authoritative. |
| **2** | **Transformation** | Legacy data → Canonical tables populated. |
| **3** | **Validation** | Semantic equivalence and preservation verified. |
| **4** | **Authoritative** | Canonical structures authoritative; legacy consumers removed. |
| **5** | **Retirement** | Legacy structures frozen and retired. |

---

## 2. Transition State Machine

| Transition | Operation | Validation Gate |
| :--- | :--- | :--- |
| **0→1** | Create canonical schema | Tables exist; schema correct. |
| **1→2** | Populate canonical tables | Reconciliation counts balance (source=target). |
| **2→3** | Validate equivalence | Behavioural test suite (B.1–B.27) green. |
| **3→4** | Cutover Consumers | API routes and RLS switch to `organisation_id`. |
| **4→5** | Retire legacy | Legacy tables/columns frozen then dropped. |

---

## 3. Atomic Disposition Execution Plans

Each of the 23 legacy structures defined in the disposition register must transition through the physical state machine.

### 3.1 Group: Identity & Authority De-conflation (`users`, `business_identity`)
*Disposition: TRANSFORM → RETIRE*

| Row | Source | Target | Transformation | Authority |
| :--- | :--- | :--- | :--- | :--- |
| **Org Key** | `users.id` | `organisations.id` | Backfill | `organisations` |
| **Person Key** | `users.id` | `persons.id` | Backfill | `persons` |
| **Users Table** | `users` | `persons`, `orgs`, `auth` | Decompose | Canonical |
| **Business Identity** | `business_identity` | `memberships`, `ownership` | Decompose | Canonical |
| **Owner Name** | `owner_name` | `ownership_periods` | Extract to temporal | `ownership_periods` |
| **Admin Users** | `admin_users` | `memberships` | Merge role | `memberships` |

- **Dependency**: Must precede all knowledge/RLS migration.
- **Validation**: `legacy_identity_map` verification.
- **Retirement**: Drop legacy tables/columns after consumers migrated to `persons`/`organisations`.

### 3.2 Group: Knowledge Structure Restructuring (`genome_*`, `kira_*`)
*Disposition: TRANSFORM (→ RETIRE for memory/knowledge)*

| Row | Source | Target | Transformation | Authority |
| :--- | :--- | :--- | :--- | :--- |
| **Genome Ent/Fact** | `genome_*` | `organisational_knowledge` | FK rebind | Canonical |
| **Conversations** | `conversations` | `evidence_records` | FK rebind | Canonical |
| **Kira Knowledge** | `kira_knowledge` | `evidence_records` | Extract to canonical | Canonical |
| **Kira Memory** | `kira_memory` | `evidence` / `decisions` | Decompose/Extract | Canonical |

- **Dependency**: `organisation_id` FK must exist on all targets.
- **Transition**: Coexistence during transformation (State 2).
- **Validation**: No silent data loss; count reconciliation.
- **Retirement**: Drop legacy `kira_memory` columns/tables after state 4 (authoritative).

### 3.3 Group: Kira Operational Rebinding (`kira_agents`, `kira_tasks`)
*Disposition: TRANSFORM*

| Row | Source | Target | Transformation | Authority |
| :--- | :--- | :--- | :--- | :--- |
| **Kira Agents** | `kira_agents` | `kira_agents` | Rebind `organisation_id` | Canonical |
| **Kira Tasks** | `kira_tasks` | `kira_tasks` | Rebind `organisation_id` | Canonical |

- **Ordering**: After identity and RLS transfer.
- **Transition**: Active rebinding, seamless switch.

---

## 4. Migration Execution Gates

| Gate | Criterion | Evidence |
| :--- | :--- | :--- |
| **Schema Gate** | All canonical tables exist and conform. | Migration Safety Tests |
| **Data Gate** | Reconciliation counts balance. | Migration Ledger |
| **RLS Gate** | Cross-organisation isolation enforced. | Behavioural Tests |
| **Semantic Gate** | Temporal queries/provenance preserved. | Behavioural Tests |
| **Consumer Gate** | All API consumers migrated to canonical auth. | Trace logs |
| **Retirement Gate** | All consumers using canonical; audit inactivity. | Legacy usage telemetry |

---

## 5. Rollback and Recovery
- **Snapshot**: Take a full DB backup before starting any transition state.
- **Ledger**: Every row migration must be recorded in the `migration_ledger` with `rollback_status = 'active'`.
- **Reversal**: `migration_ledger` allows physical reversal to the last authoritative legacy state.

*This plan is the physical state machine for the 23-row disposition register.*
