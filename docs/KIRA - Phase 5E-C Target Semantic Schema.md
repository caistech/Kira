# Phase 5E-C: Target Semantic Schema — ACCEPTED / LOCKED

**Status:** ✅ ACCEPTED / LOCKED  
**Phase:** 5E-C  
**Predecessors:**
- Phase 5D — Semantic Inventory & Remediation Matrix — ACCEPTED / LOCKED
- Phase 5E-A — Current kira_memory Schema Inventory — ACCEPTED / LOCKED
- Phase 5E-B — Organisation-Context Resolution Strategy — LOCKED
- KIRA — Canonical Organisational Model — ARCHITECTURAL FOUNDATION

**Constraint:** No SQL, migration implementation, schema modification, or production code changes are authorised by this artifact.

---

## 1. Purpose

Phase 5E-C defines the target semantic schema for `kira_memory` and its relationship to the canonical organisational architecture.

The purpose is to establish what a memory record must mean in the target architecture — not to reproduce the current database structure.

The target schema must preserve the distinction between:
- Organisational context
- Evidence and provenance
- Semantic disposition
- Temporal state
- Governance state
- Interaction/context memory
- Structured organisational knowledge

**Central Architectural Invariant:**  
*Organisation resolution gives a memory an organisational home; it does not make the memory true, current, governed, or semantically valid.*

---

## 2. Architectural Basis

The Canonical Organisational Model establishes that the Organisation is the enduring organisational anchor and that organisational knowledge must remain coherent across changes to people, consultants, engagements, subscriptions and Kira instances.

It explicitly distinguishes:
- Person from organisational role
- Organisation from Kira Instance
- Consultant from Engagement
- Engagement from Subscription
- Subscription from Commercial Arrangement
- Conversation from Organisational Knowledge
- Current state from historical truth

The target semantic schema must avoid reproducing the legacy assumption that a memory's `user_id`, agent or conversation determines what the memory means.

---

## 3. Target Semantic Model

A target memory record conceptually has the following structure:

```
                         MEMORY RECORD
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
          ▼                   ▼                    ▼
   ORGANISATIONAL        PROVENANCE          SEMANTIC
      CONTEXT             / EVIDENCE         DISPOSITION
          │                   │                    │
          │                   │                    ├── status
          │                   │                    ├── confidence
          │                   │                    └── classification
          │                   │
          │                   ├── source type
          │                   ├── source identifier
          │                   ├── source reference
          │                   ├── observed at
          │                   └── actor/context
          │
          ├── organisation_id
          ├── optional contextual actor
          ├── optional Kira instance
          └── optional engagement
          
                              │
          ┌───────────────────┴────────────────────┐
          │                                        │
          ▼                                        ▼
   TEMPORAL STATE                           GOVERNANCE STATE
          │                                        │
          ├── effective/observed time              ├── pending
          ├── current/historical                    ├── governed
          ├── superseded                            ├── disputed
          └── supersession chain                    └── restricted/etc.
```

These dimensions are deliberately independent.

---

## 4. organisation_id

### 4.1 Definition
`organisation_id` identifies the canonical Organisation to which the memory belongs contextually.  
It answers: **"Whose organisational context does this record belong to?"**  
It does **not** answer: Is the record true? Is it current? Is it validated? Is it governed? Is it relevant? Is it safe to expose? Is it authoritative? Those belong to other dimensions.

### 4.2 Target State
```
organisation_id
    ↓
organisations.organisation_id
```
The organisation must be the enduring anchor (INV-020, INV-009).

### 4.3 Nullability
The target architecture ultimately requires `organisation_id = NOT NULL`, but this constraint is a **post-resolution boundary**, not a mechanism for resolving identity. Unresolved records pass through the 5E-B resolution/quarantine process first.

---

## 5. Organisation Resolution ≠ Knowledge Validity (Mandatory Distinction)

These states are all possible and represent materially different semantic authority:
```
organisation_id = ABC
status = candidate
confidence = 0.35
governance_state = pending
temporal_state = historical

organisation_id = ABC
status = validated
confidence = 0.98
governance_state = governed
temporal_state = current
```
**Rule:** `organisation_id` must never be used as a proxy for trust, validation, governance, or currentness.

---

## 6. Relationship to user_id

### 6.1 Target Meaning
`user_id` ceases to function as canonical organisational anchor.  
`user_id ≠ organisation_id` — Person identity is separate from organisational roles (INV-002).

### 6.2 Survival
Legacy `user_id` may remain as historical provenance/context: *"Which legacy/person-level identity was associated with creation/capture?"* — not ownership.

---

## 7. Relationship to kira_agent_id

`kira_agent_id` remains as operational provenance/context only.  
**Correct relationship:** `kira_agent_id` → Kira Instance → `organisation_id` (INV-008, INV-009).  
The agent is an operational instance, not the knowledge owner.

---

## 8. Relationship to source_conversation_id

A conversation is evidence/source context — not organisational knowledge itself.  
**Target relationship:** Conversation → Evidence → Memory/Knowledge Processing → Organisational Context (INV-010).

---

## 9. Provenance Model (INV-011)

Every material memory record must have conceptually recoverable provenance:

| Dimension | Meaning |
|-----------|---------|
| source_type | Where evidence originated (conversation, document, system, inferred) |
| source_id | Identifier of the source object |
| source_reference | Precise location within source |
| observed_at | When information was observed/provided |
| created_at | When Kira created the memory record |
| confirmed_at | When confirmation occurred (if applicable) |
| confirmed_by | Actor providing confirmation (if applicable) |
| source_conversation_id | Conversation source (where applicable) |
| user_id | Person/legacy identity associated with capture (where applicable) |
| kira_agent_id | Kira Instance/agent associated with capture (where applicable) |

---

## 10. Source Types

The target model preserves source categories (conversation, document, system, inferred).  
**Rule:** Source type describes origin — it does not determine truth.

---

## 11. Semantic Disposition

Answers: *"What does this record represent from a knowledge perspective?"*

### 11.1 Status (Controlled Vocabulary)
- asserted
- observed
- inferred
- validated
- disputed
- superseded
- rejected

### 11.2 Confidence
Independent of status. E.g., `status = asserted, confidence = 0.90` ≠ validated.  
**Rule:** Confidence must never substitute for validation status.

---

## 12. Temporal State (INV-012, INV-019)

Must distinguish current from historical knowledge and preserve superseded knowledge:
- observation/capture time
- effective time where known
- current/historical disposition
- supersession relationship
- historical continuity

---

## 13. Supersession

Represented as relationship between knowledge states (not destructive replacement):
```
Memory A → superseded by → Memory B
```
System must answer: *What did Kira previously believe?* and *What replaced that belief?*  
Existing `superseded_by` is insufficient; target requires explicit historical chain with event/provenance.

---

## 14. Governance State

Separate from semantic status:
- pending
- governed
- disputed
- restricted
- approved
- quarantined

**Rule:** `semantic status ≠ governance status`. E.g., `status = validated, governance = pending` is valid.

---

## 15. Quarantine Boundary

Quarantine is an operational boundary, not a semantic status:
```
LEGACY RECORD
     ↓
RESOLUTION
     ↓
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│ RESOLVED              │  │ AMBIGUOUS             │  │ UNRESOLVED            │
│ organisation_id set   │  │ org unknown/conflict  │  │ insufficient evidence │
└───────────┬───────────┘  └───────────┬───────────┘  └───────────┬───────────┘
            │                          │                          │
            ▼                          ▼                          ▼
       TARGET MEMORY              QUARANTINE                  QUARANTINE
                                     │                          │
                                     ▼                          ▼
                                REVIEW / RESOLVE            REVIEW / RESOLVE
```
No silent assignment for AMBIGUOUS/UNRESOLVED records.

---

## 16. Relationship to Engagement

Engagement may provide contextual provenance but does **not** own knowledge (INV-005).  
Organisational knowledge remains associated with the Organisation.

---

## 17. Relationship to Ownership Period

Knowledge must preserve temporal context against ownership periods to distinguish historical practice from current policy.

---

## 18. Target Semantic Dimensions Summary

| Dimension | Answers |
|-----------|---------|
| organisation_id | Whose organisational context? |
| Provenance | Where did this come from? |
| Actor context | Who provided/captured it? |
| Source context | Which conversation/document/system? |
| Semantic status | What kind of knowledge/evidence? |
| Confidence | How strongly assessed? |
| Temporal state | When did it apply / observed? |
| Supersession | What replaced it? |
| Governance | What governance treatment? |
| Kira context | Which instance captured it? |
| Engagement context | Which body of work produced it? |

**Rule:** No single dimension substitutes for another.

---

## 19. What kira_memory Becomes

The target preserves `kira_memory` as the **interaction/context memory layer** — not the canonical organisational knowledge store.

```
CONVERSATION / INTERACTION LAYER
        │
        ▼
    kira_memory
        │
        ├── interaction context
        ├── preferences
        ├── conversational continuity
        ├── transient context
        └── legacy knowledge candidates
                 │
                 ▼
        KNOWLEDGE PROCESSING
                 │
                 ▼
      STRUCTURED ORGANISATIONAL
             KNOWLEDGE
```

---

## 20. Field Classification (Migration Mapping Basis)

| Category | Treatment |
|----------|-----------|
| **Canonicalised** | `organisation_id`, provenance identifiers, temporal information, recoverable semantic disposition |
| **Contextual** | `user_id`, `kira_agent_id`, `source_conversation_id` (useful but not canonical ownership) |
| **Legacy Semantic** | Fields not cleanly mapping to target — explicit migration mapping required |
| **Deprecated** | Deferred to migration design phase |

---

## 21. RLS / Authorisation Implications

**Target Principle:**
```
Authenticated Identity
       ↓
Person
       ↓
Organisational Relationship / Role
       ↓
Organisation
       ↓
Authorised Knowledge
```
**NOT:**
```
Authenticated User
       ↓
user_id
       ↓
All records bearing user_id
```

**Security Invariant:**  
`Organisation context ≠ Authorisation` and `Organisation context ≠ Governance`.  
Organisation establishes tenancy; authorisation determines permitted actions within that context.

---

## 22. Canonical Separation Matrix

| Dimension | Canonical Authority | Must NOT be inferred from |
|-----------|---------------------|---------------------------|
| Organisation | organisation_id | conversation, person, agent |
| Person | Person identity | organisational role |
| Role | organisational relationship | Person identity alone |
| Knowledge provenance | source/evidence | organisation |
| Semantic status | knowledge disposition | organisation |
| Confidence | evidence assessment | status alone |
| Temporal state | observation/effective history | creation time alone |
| Governance | governance state | semantic status |
| Kira context | Kira Instance | Organisation identity |
| Engagement context | Engagement | Knowledge ownership |
| Currentness | temporal/semantic state | latest database row |
| Historical truth | retained history | current state |

---

## 23. Explicit Anti-Patterns (Forbidden)

| Anti-Pattern | Description |
|--------------|-------------|
| Organisation implies truth | `organisation_id` exists → record trusted |
| User implies organisation | `user_id` → `organisation_id` without explicit relationship |
| Agent implies ownership | `kira_agent_id` → memory owner |
| Conversation implies knowledge | `source_conversation_id` → organisational truth |
| Latest record implies current truth | `ORDER BY created_at DESC` → current truth |
| Confirmation implies governance | `confirmed_at IS NOT NULL` → governed = true |

---

## 24. Relationship to Structured Genome

**Architectural Distinction:**
- `kira_memory` = interaction/context memory
- Structured Genome = canonical structured organisational knowledge (Entity, Fact, Relationship, Attribute)

A memory may provide evidence for a Genome fact — it does not automatically become one.

---

## 25. Knowledge Promotion Pipeline

```
Interaction
    ↓
Conversation
    ↓
Evidence
    ↓
kira_memory
    ↓
Semantic processing
    ↓
Provenance + contextualisation
    ↓
Candidate knowledge
    ↓
Validation / confirmation / governance
    ↓
Structured organisational knowledge
```

Preserves canonical distinction: *what was said* ≠ *what Kira understands as organisational knowledge*.

---

## 26. Traceability to Canonical Invariants (INV-001 through INV-020)

All 20 canonical invariants are satisfied by this semantic model (see full traceability matrix in 5E-C artifact).

---

## 27. Target Conceptual Record (Semantic Definition)

```
MEMORY
│
├── Identity
│   └── memory_id
│
├── Organisational Context
│   └── organisation_id
│
├── Actor Context
│   └── person/user reference (optional/contextual)
│
├── Kira Context
│   └── kira instance reference (optional/contextual)
│
├── Engagement Context
│   └── engagement reference (optional/contextual)
│
├── Evidence / Provenance
│   ├── source_type
│   ├── source_id
│   ├── source_reference
│   ├── source_conversation_id
│   └── observed_at
│
├── Semantic Disposition
│   ├── status
│   └── confidence
│
├── Temporal State
│   ├── effective/observed period
│   ├── current/historical state
│   └── supersession relationship
│
├── Governance
│   └── governance_state
│
└── Audit
    ├── created_at
    └── updated_at
```

*This is a semantic definition, not a database schema prescription.*

---

## 28. Migration Boundary

Migration cannot be simple column copy. It must determine, record, and preserve:
- Organisational resolution
- Provenance
- Semantic status
- Temporal meaning
- Historical relationships
- Ambiguity
- Quarantine
- Supersession

---

## 29. Quarantine Before Constraint

Final target: `organisation_id NOT NULL`  
Migration sequence:
```
Current records → Resolve organisation → Classify resolution
                     ↓
              Resolved ──┐
                         │
              Ambiguous ──► Quarantine
                         │
              Unresolved ─► Quarantine
                         │
                         ▼
                 Review / Resolution
                         │
                         ▼
               Canonical organisation_id
                         │
                         ▼
                 NOT NULL boundary
```

---

## 30. What 5E-C Does Not Decide (Deferred)

- Exact physical table structure
- PostgreSQL enum definitions
- Exact RLS policies
- Provenance table decomposition
- Temporal state mechanism (ranges, timestamps, events)
- Exact governance vocabulary
- Exact migration mechanics
- Treatment of unresolvable legacy rows
- Relationship to future structured knowledge tables
- API/service interfaces

---

## 31. Architectural Acceptance Criteria

5E-C accepted only if target architecture can answer **yes** to all:

**Organisation**
- ✅ Every canonical memory assigned to enduring Organisation?
- ✅ Organisational context distinguished from knowledge validity?
- ✅ Organisational identity survives Kira Instance replacement?

**Person**
- ✅ Memory retains person context without treating Person as Organisation?
- ✅ One person participates in multiple organisational contexts?

**Provenance**
- ✅ Kira identifies evidence origin?
- ✅ Distinguishes conversation, document, system, inference?
- ✅ Preserves source reference?

**Semantic State**
- ✅ Asserted vs observed vs inferred vs validated vs disputed vs superseded?
- ✅ Confidence independent of status?

**Temporal State**
- ✅ Current vs historical distinguished?
- ✅ Superseded knowledge recoverable?
- ✅ Can explain previous beliefs?

**Governance**
- ✅ Governance status independent of semantic status?
- ✅ Pending/disputed records not treated as invalid?

**Security**
- ✅ Organisation context ≠ automatic authorisation?
- ✅ Access depends on Person, role, Engagement, sensitivity, provenance, time?

**Continuity**
- ✅ Consultant replacement preserves knowledge?
- ✅ Kira Instance replacement preserves knowledge?
- ✅ Subscription change preserves knowledge?
- ✅ Ownership change preserves history?

---

## 32. Core 5E-C Invariants (SEM-001 through SEM-012)

| Invariant | Statement |
|-----------|-----------|
| **SEM-001** | `organisation_id` establishes organisational context only |
| **SEM-002** | Organisation does not imply validity |
| **SEM-003** | Person is context, not organisational identity |
| **SEM-004** | Kira Instance is context, not knowledge owner |
| **SEM-005** | Conversation is evidence |
| **SEM-006** | Provenance is independent |
| **SEM-007** | Status and confidence are separate |
| **SEM-008** | Governance is separate |
| **SEM-009** | Historical truth is preserved |
| **SEM-010** | Quarantine precedes constraint |
| **SEM-011** | Organisational continuity |
| **SEM-012** | Canonical meaning precedes physical schema |

---

## 33. Final Target Principle

> **A memory has an organisational context, but organisational context is only one dimension of what that memory means.**

```
                         MEMORY
                           │
          ┌────────────────┼─────────────────┐
          │                │                 │
          ▼                ▼                 ▼
   ORGANISATION        PROVENANCE        SEMANTICS
      CONTEXT             │                 │
          │               │                 ├── status
          │               │                 └── confidence
          │               │
          │               ├── source
          │               └── actor
          │
          ├── organisation
          │
          ▼
       ACCESS
          │
          └── subject to independent authorisation

                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
      TEMPORAL                          GOVERNANCE
       STATE                              STATE
```

**Decisive Boundary:** Organisation resolution tells Kira where the record belongs. Provenance tells Kira where it came from. Semantic disposition tells Kira what it represents. Temporal state tells Kira when it applies. Governance tells Kira how it may be treated. None of these dimensions may be silently substituted for another.

---

## 34. Phase Boundary

| Phase | Question | Status |
|-------|----------|--------|
| 5E-A | What exists? | LOCKED |
| 5E-B | How does memory resolve to Organisation? | LOCKED |
| 5E-C | What must a target memory mean? | **ACCEPTED / LOCKED** |
| 5E-D | How does semantic model become physical schema/migration? | 🔜 NEXT |

---

## 35. Acceptance Statement

**Explicitly Agreed:**  
*`organisation_id` is the canonical organisational anchor for memory, but organisational anchoring is independent of provenance, semantic disposition, temporal state and governance state.*

**5E-C → LOCKED**

Next authorised phase: **5E-D — Physical Target Schema & Migration Mapping** (architecture first, no SQL yet).