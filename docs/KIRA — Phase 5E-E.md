# Phase 5E-E: Implementation Preparation & Execution Specification

**Status:** 🟡 IN PROGRESS — Implementation Preparation
**Phase:** 5E-E
**Authority:** 5E-D Physical Target Schema & Migration Mapping (LOCKED)
**Predecessors:** 5D, 5E-A, 5E-B, 5E-C, 5E-D — ALL LOCKED

---

## 1. Purpose & Constraint

Translate the locked 5E-D physical design into an executable implementation package.

**Constraint:** No SQL execution, no destructive migrations, no architectural redesign.
**First Activity:** Forensic verification of actual repository/database state.

---

## 2. Verification Checklist (Execute First)

Before any DDL is written, verify and record the actual state:

### 2.1 Canonical Tables
| Table | PK Type | PK Name | FK References | RLS Enabled | Notes |
|-------|---------|---------|---------------|-------------|-------|
| `organisations` | | | | | |
| `persons` | | | | | |
| `organisation_memberships` | | | | | |
| `ownership_periods` | | | | | |
| `kira_agents` | | | | | |
| `engagements` | | | | | |

### 2.2 Existing `kira_memory`
| Column | Type | Null | Default | Indexes | Constraints |
|--------|------|------|---------|---------|-------------|
| *all columns* | | | | | |

### 2.3 Existing Conversation/Message Tables
| Table | PK | FK to kira_memory | Notes |
|-------|-----|-------------------|-------|

### 2.4 Genome/Structured Knowledge Tables
| Table | Purpose | Relationship to kira_memory |
|-------|---------|----------------------------|

### 2.5 Current RLS / Auth Helpers
| Policy/Function | Table | Definition |
|-----------------|-------|------------|

### 2.6 Application Dependencies
| Route/Service | Operation | kira_memory Fields Used | Legacy Assumptions |
|---------------|-----------|------------------------|-------------------|

---

## 3. DDL Build Plan

### 3.1 New Tables (Exact Order)

| # | Table | Dependencies | Key Decisions |
|---|-------|--------------|---------------|
| 1 | `kira_memory_provenance` | `kira_memory`, `persons`, `kira_agents` | Appendix A |
| 2 | `kira_memory_history` | `kira_memory`, `persons`, `kira_agents`, `engagements`, `kira_memory_provenance` | Appendix B |
| 3 | `kira_memory_supersession` | `kira_memory`, `kira_memory_history` | Appendix C |
| 4 | `kira_memory_quarantine` | (standalone) | Appendix D |
| 5 | `kira_memory` (NEW — replace legacy) | `organisations`, `persons`, `kira_agents`, `engagements` | Appendix E |

### 3.2 Constraints & Indexes
| Table | Constraints | Indexes | Partial Indexes |
|-------|-------------|---------|-----------------|

### 3.3 Triggers / Integrity
| Trigger | Table | Event | Purpose |
|---------|-------|-------|---------|
| `trg_kira_memory_history` | `kira_memory` | INSERT/UPDATE | Append-only history |
| `trg_kira_memory_supersession_xorg` | `kira_memory_supersession` | INSERT | Cross-org protection |
| `trg_kira_memory_updated_at` | `kira_memory` | UPDATE | Audit timestamp |

### 3.4 RLS Policies
| Policy | Table | Expression | Role |
|--------|-------|------------|------|

---

## 4. Migration Staging Model

```
LEGACY kira_memory
       │
       ▼
STAGING TABLE: kira_memory_staging
       │
       ▼
ORGANISATION RESOLUTION (5E-B sequence)
       │
       ├── RESOLVED_AGENT ───▶ TARGET kira_memory
       ├── RESOLVED_USER ────▶ TARGET kira_memory
       ├── RESOLVED_CONVERSATION ▶ TARGET kira_memory
       ├── AMBIGUOUS ────────▶ kira_memory_quarantine
       ├── UNRESOLVED ───────▶ kira_memory_quarantine
       └── ORPHAN ───────────▶ kira_memory_quarantine
```

### 4.1 Staging Table Schema
| Column | Source | Transformation |
|--------|--------|----------------|

### 4.2 Resolution Evidence Capture
| Resolution Path | Evidence Stored in Quarantine |
|-----------------|-------------------------------|

---

## 5. History/Supersession Implementation

### 5.1 Transactional Update Protocol
```sql
BEGIN;
LOCK ROW kira_memory FOR UPDATE;
INSERT INTO kira_memory_history (...);
UPDATE kira_memory SET ...;
COMMIT;
```

### 5.2 Supersession Protocol
```sql
BEGIN;
INSERT INTO kira_memory (new record);
INSERT INTO kira_memory_supersession (old_id, new_id, history_event_id);
UPDATE kira_memory SET semantic_status='superseded' WHERE id=old_id;
INSERT INTO kira_memory_history (event_type='superseded', ...);
COMMIT;
```

---

## 6. Quarantine Implementation

### 6.1 Resolution Workflow
| Status | Action | UI/API |
|--------|--------|--------|
| `pending` | Auto-assigned on resolution failure | Review queue |
| `in_review` | Human/system review | Resolution form |
| `resolved` | `organisation_id` assigned → migrate to target | Auto-migrate |
| `retained` | Permanently archived | Audit log only |

### 6.2 Review Required Fields
- `candidate_organisation_ids`
- `resolution_evidence` (JSONB)
- `review_decision`
- `reviewed_by_person_id`

---

## 7. Compatibility Adapter

### 7.1 Legacy Fields Still Required
| Legacy Field | Adapter Strategy | Deprecation Gate |
|--------------|------------------|------------------|
| `user_id` | Map to `person_id` + provenance | After all reads migrated |
| `source_conversation_id` | Map to `kira_memory_provenance` | After all reads migrated |
| `superseded_by` | Map to `kira_memory_supersession` | After all writes migrated |
| `genome_section` | Metadata only — no semantic meaning | Immediate (no adapter) |
| `confirmed_outcome` | Map to `semantic_status`/`confidence` | After migration |
| `parked_reason` | Map to `governance_state`/history | After migration |

### 7.2 Prohibition Rules (Enforced in Adapter)
- ❌ `user_id` → organisational ownership
- ❌ `organisation_id` → truth/validity
- ❌ `confidence` → validation
- ❌ Current state → historical truth

---

## 8. RLS Implementation Preparation

### 8.1 Auth Path
```text
auth.uid() → person_id → organisation_memberships → organisation_id
```

### 8.2 Policy Layers
| Layer | Scope | Implementation |
|-------|-------|----------------|
| Tenancy | `organisation_id IN (SELECT ...)` | Mandatory base policy |
| Authorisation | `check_knowledge_access(person_id, memory_id, action)` | Function-based |
| Governance | `governance_state <> 'restricted' OR has_role(...)` | Additional filter |
| Quarantine | `NOT EXISTS (SELECT 1 FROM kira_memory_quarantine ...)` | Exclusion |

### 8.3 Privileged/Service Roles
| Role | Access | Justification |
|------|--------|---------------|
| `service_role` | Full (explicit) | Migration, admin |
| `migration_reviewer` | Quarantine R/W | Resolution workflow |

---

## 9. Application Dependency Map

### 9.1 Read Paths
| Component | Query Pattern | Fields | Migration Strategy |
|-----------|---------------|--------|-------------------|

### 9.2 Write Paths
| Component | Operation | Fields | Migration Strategy |
|-----------|-----------|--------|-------------------|

### 9.3 Legacy Assumptions to Eliminate
| Assumption | Current Code | Target Correction |
|------------|--------------|-------------------|

---

## 10. Validation & Acceptance

### 10.1 Migration Integrity (MIG-001 to MIG-011)
| Test | Query | Expected |
|------|-------|----------|

### 10.2 Data Integrity (DI-001 to DI-012)
| Test | Query | Expected |
|------|-------|----------|

### 10.3 5E-D Acceptance Matrix
| Test | Query | Expected |
|------|-------|----------|

### 10.4 Reconciliation
| Metric | Legacy | Target | Tolerance |
|--------|--------|--------|-----------|
| Total rows | | | 0 |
| Resolved rows | | | 0 |
| Quarantined rows | | | Exact |
| Provenance records | | | ≥ Legacy sources |
| History events | | | ≥ Migrations |
| Supersession chains | | | Preserved |

---

## 11. Execution Gates

| Gate | Activity | Exit Criteria | Authorisation |
|------|----------|---------------|---------------|
| **G1** | Schema Verification | All tables/columns/types recorded | 5E-E Lead |
| **G2** | DDL Review | DDL matches 5E-D spec exactly | Architecture Review |
| **G3** | Migration Dry-Run | Staging + resolution + quarantine validated on copy | QA + Architecture |
| **G4** | Compatibility Verification | All read/write paths pass against adapter | Application Team |
| **G5** | Migration Execution | Production run (staged) | Release Gate |
| **G6** | Post-Migration Validation | All MIG/DI/Acceptance tests pass | QA + Architecture |
| **G7** | Legacy Deprecation | Legacy fields/paths removed | Architecture Review |

---

## 12. Appendices (To Be Populated After Verification)

### Appendix A: `kira_memory_provenance` Exact DDL
### Appendix B: `kira_memory_history` Exact DDL
### Appendix C: `kira_memory_supersession` Exact DDL
### Appendix D: `kira_memory_quarantine` Exact DDL
### Appendix E: `kira_memory` (NEW) Exact DDL
### Appendix F: Trigger Definitions
### Appendix G: RLS Policy Definitions
### Appendix H: Compatibility Adapter Code Spec
### Appendix I: Migration Resolution Scripts
### Appendix J: Application Migration Checklist

---

## 13. Next Action

**Immediate:** Execute Section 2 (Forensic Verification) against live repository/database.
**Output:** Populated verification tables (Section 2) + any deviations from 5E-D assumptions.

**No SQL execution until G1 passes.**