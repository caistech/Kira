# Phase 5E-B: Organisation-Context Resolution Strategy

This document outlines how `kira_memory` records resolve to their canonical `organisation_id`. 

> **Architectural Principle:** Organisation resolution establishes organisational context *only*. It does *not* establish knowledge validity, semantic disposition, currency, provenance strength, or governance status.

## 1. Resolution Chain Analysis

Resolution is inferred via existing relationships.

### 1.1 Resolution Hierarchy (Authority Order)

| Authority | Path | Purpose |
| :--- | :--- | :--- |
| **Primary** | `kira_memory.kira_agent_id` → `kira_agents.organisation_id` | Canonical Instance/Organisation link. |
| **Secondary** | `kira_memory.user_id` → `users.organisation_id` | Identity-based anchor (conditional on unambiguous relationship). |
| **Tertiary** | `kira_memory.source_conversation_id` → `conversations` → ... | Corroborating evidence (unless conversation carries authoritative context). |

### 1.2 Deterministic Classification Rules
1. **Agent Authority:** Primary anchor.
2. **User Authority:** Conditional on establishing an unambiguous, applicable person/organisation relationship (INV-002: Person/role separation).
3. **Corroboration:** Conversation paths are tertiary/corroborating unless the conversation carries independent authoritative organisation context.
4. **No Silent Overwrites:** Contradictory evidence (e.g., Agent → Org A, User → Org B) MUST be flagged as `AMBIGUOUS`.

## 2. Classification & Migration Treatment

| Classification | Meaning | Migration Treatment |
| :--- | :--- | :--- |
| **RESOLVED_AGENT** | Primary path establishes consistent `organisation_id`. | Assign `organisation_id`. |
| **RESOLVED_USER** | Secondary path establishes unambiguous organisation relationship. | Assign `organisation_id`. |
| **RESOLVED_CONVERSATION**| Conversation corroborates existing context. | Assign `organisation_id`. |
| **AMBIGUOUS** | Paths establish conflicting `organisation_id` values. | **Quarantine / Review.** |
| **ORPHAN** | No valid organisation resolution path exists. | **Quarantine / Review.** |
| **UNRESOLVED** | Insufficient evidence for any path. | **Quarantine / Review.** |

## 3. Migration Sequence for `NOT NULL` Constraint

The final schema requires `organisation_id` to be `NOT NULL`.

1. **Phase 5E-D (Mapping):** Classify 100% of rows (RESOLVED_AGENT, RESOLVED_USER, RESOLVED_CONVERSATION, AMBIGUOUS, ORPHAN, UNRESOLVED).
2. **Quarantine/Remediation:**
    - Records in {AMBIGUOUS, ORPHAN, UNRESOLVED} are moved to a `kira_memory_quarantine` table (Option B) or manually remediated to a resolvable state (Option A).
3. **Constraint Application:** Only *after* 100% of records in the primary `kira_memory` table have a valid `organisation_id` will the `NOT NULL` constraint be applied.

## 4. Architectural Findings & Rules

1. **Semantic Separation:** Organisation resolution is independent of semantic memory disposition/governance.
2. **Verification:** Strict verification pattern (migration failure if `organisation_id` is `NULL`) will be enforced.
3. **No Discarding:** No record may be silently discarded or arbitrarily assigned.

## 5. Next Steps
- **5E-C (Target Schema):** Finalize column definition.
- **5E-D (Migration Mapping):** Execute mapping to classify every record.


