# KIRA — P0.3-C Organisational State Persistence Model

**Status:** Implementation Architecture
**Purpose:** Translate State, Event, Evidence, Assertion, Inference, Confidence, Transition, and Provenance into persistence structures
**Scope:** Temporal state machine persistence semantics (implementation-independent schema design)
**Prerequisite:** P0.3-B (Canonical Persistence Model)
**Date:** 26 August 2026

---

## 1. Purpose

The purpose of this artifact is to define how the **Organisational Temporal State Machine** (P0.2-B, P0.2-B.1) is persisted. It translates the semantic model's temporal primitives into concrete persistence structures.

The governing principle is:

> **Every material state transition must have an explicit provenance path identifying the transition type (Causal / Observational / Epistemic / Administrative) and the evidence supporting it.**

This persistence model must support:
- State reconstruction at any point in time
- Causal history tracing
- Epistemic transition tracking
- Supersession chains
- Confidence management
- Provenance attribution

---

## 2. Entity Definitions

### 2.1 Organisational State

**Purpose:** A snapshot of the Organisation's attributes, knowledge, relationships, and commercial context at a point in time.

**Persistence structure:**

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `state_id` | UUID | PK | Unique identifier |
| `organisation_id` | UUID | FK → organisations(organisation_id), NOT NULL | The Organisation |
| `snapshot_timestamp` | TIMESTAMPTZ | NOT NULL | When this state was captured |
| `state_data` | JSONB | NOT NULL | Structured representation of the organisational state |
| `transition_type` | TEXT | CHECK | Causal, Observational, Epistemic, Administrative |
| `confidence` | NUMERIC(3,2) | CHECK | Overall confidence in this state (0.00–1.00) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When the record was created |

**Transition type values:**
```
causal, observational, epistemic, administrative
```

**Constraints:**
- `organisation_id` + `snapshot_timestamp` is unique (one state per organisation per timestamp)
- `confidence` is between 0.00 and 1.00
- `state_data` is a JSONB object containing the structured state

**State data structure:**
```json
{
  "genome_areas": {
    "operations": { "status": "populated", "confidence": 0.85 },
    "pricing": { "status": "populated", "confidence": 0.90 },
    "customers": { "status": "sparse", "confidence": 0.60 }
  },
  "commercial_terms": {
    "subscription_status": "active",
    "pricing_tier": "professional"
  },
  "ownership": {
    "current_owner": "person_id",
    "ownership_since": "2024-01-01"
  }
}
```

---

### 2.2 Evidence Record

**Purpose:** An immutable record of something from which Kira can establish or infer organisational knowledge.

**Persistence structure:**

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `evidence_id` | UUID | PK | Unique identifier |
| `organisation_id` | UUID | FK → organisations(organisation_id), NOT NULL | The Organisation |
| `source_type` | TEXT | CHECK, NOT NULL | Type of evidence source |
| `source_id` | UUID | NULLABLE | Reference to source record |
| `source_person_id` | UUID | FK → persons(person_id), NULLABLE | Person who provided the evidence |
| `evidence_content` | TEXT | NOT NULL | Verbatim or near-verbatim capture |
| `evidence_metadata` | JSONB | NULLABLE | Additional evidence metadata |
| `reliability` | NUMERIC(3,2) | CHECK | Reliability score (0.00–1.00) |
| `observed_at` | TIMESTAMPTZ | NOT NULL | When the evidence was observed |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When the record was created |

**Source type values:**
```
assessment, conversation, document, system, inferred, owner_input, third_party
```

**Constraints:**
- `source_type` is one of: assessment, conversation, document, system, inferred, owner_input, third_party
- `reliability` is between 0.00 and 1.00
- `observed_at` is the timestamp of the evidence, not the timestamp of record creation

**Migration mapping:**
- `kira_memory` records → `evidence_records` (backfill from existing memory)
- `genome_events` records → `evidence_records` (backfill from existing events)

---

### 2.3 Assertion

**Purpose:** A claim made by a Person about the organisation. Attributed to the person who made it.

**Persistence structure:**

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `assertion_id` | UUID | PK | Unique identifier |
| `organisation_id` | UUID | FK → organisations(organisation_id), NOT NULL | The Organisation |
| `evidence_id` | UUID | FK → evidence_records(evidence_id), NOT NULL | The evidence supporting this assertion |
| `person_id` | UUID | FK → persons(person_id), NOT NULL | The Person who made the assertion |
| `assertion_text` | TEXT | NOT NULL | The assertion in natural language |
| `assertion_data` | JSONB | NULLABLE | Structured representation of the assertion |
| `area_key` | TEXT | NULLABLE | Which genome area this assertion relates to |
| `confidence` | NUMERIC(3,2) | CHECK | Confidence in this assertion (0.00–1.00) |
| `status` | TEXT | CHECK, DEFAULT 'current' | Assertion lifecycle status |
| `observed_at` | TIMESTAMPTZ | NOT NULL | When the assertion was made |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When the record was created |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | When the record was last updated |

**Status lifecycle:**
```
current → superseded → historical
```

**Constraints:**
- `confidence` is between 0.00 and 1.00
- `status` is one of: current, superseded, historical
- Assertions are attributed to the Person who made them
- Assertions may be superseded by later evidence

---

### 2.4 Inference

**Purpose:** Knowledge derived by Kira from evidence through interpretation. Explicitly marked as inference, not assertion.

**Persistence structure:**

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `inference_id` | UUID | PK | Unique identifier |
| `organisation_id` | UUID | FK → organisations(organisation_id), NOT NULL | The Organisation |
| `evidence_id` | UUID | FK → evidence_records(evidence_id), NOT NULL | The evidence supporting this inference |
| `assertion_id` | UUID | FK → assertions(assertion_id), NULLABLE | The assertion this inference is derived from |
| `inference_text` | TEXT | NOT NULL | The inference in natural language |
| `inference_data` | JSONB | NULLABLE | Structured representation of the inference |
| `area_key` | TEXT | NULLABLE | Which genome area this inference relates to |
| `confidence` | NUMERIC(3,2) | CHECK | Confidence in this inference (0.00–1.00) |
| `status` | TEXT | CHECK, DEFAULT 'current' | Inference lifecycle status |
| `observed_at` | TIMESTAMPTZ | NOT NULL | When the inference was made |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When the record was created |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | When the record was last updated |

**Status lifecycle:**
```
current → superseded → historical
```

**Constraints:**
- `confidence` is between 0.00 and 1.00 (typically lower than assertions)
- `status` is one of: current, superseded, historical
- Inferences are attributed to Kira's interpretation process
- Inferences may be superseded by later evidence or direct statements

---

### 2.5 Confidence Score

**Purpose:** A structured confidence record linking an assertion or inference to its confidence calculation.

**Persistence structure:**

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `confidence_id` | UUID | PK | Unique identifier |
| `organisation_id` | UUID | FK → organisations(organisation_id), NOT NULL | The Organisation |
| `entity_type` | TEXT | CHECK, NOT NULL | Type of entity this confidence applies to |
| `entity_id` | UUID | NOT NULL | ID of the entity (assertion or inference) |
| `base_confidence` | NUMERIC(3,2) | CHECK | Base confidence from evidence type |
| `authority_modifier` | NUMERIC(3,2) | CHECK | Modifier based on who provided the evidence |
| `clarity_modifier` | NUMERIC(3,2) | CHECK | Modifier based on how clearly it was stated |
| `consistency_modifier` | NUMERIC(3,2) | CHECK | Modifier based on consistency with other evidence |
| `final_confidence` | NUMERIC(3,2) | CHECK | Calculated final confidence |
| `calculation_metadata` | JSONB | NULLABLE | Detailed calculation breakdown |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When the record was created |

**Entity type values:**
```
assertion, inference
```

**Constraints:**
- `entity_type` + `entity_id` is unique (one confidence record per entity)
- All confidence values are between 0.00 and 1.00
- `final_confidence` = `base_confidence` × `authority_modifier` × `clarity_modifier` × `consistency_modifier`

---

### 2.6 State Transition

**Purpose:** A record of a material change from one organisational state to another.

**Persistence structure:**

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `transition_id` | UUID | PK | Unique identifier |
| `organisation_id` | UUID | FK → organisations(organisation_id), NOT NULL | The Organisation |
| `from_state_id` | UUID | FK → organisational_states(state_id), NOT NULL | The state before the transition |
| `to_state_id` | UUID | FK → organisational_states(state_id), NOT NULL | The state after the transition |
| `transition_type` | TEXT | CHECK, NOT NULL | Type of transition |
| `transition_timestamp` | TIMESTAMPTZ | NOT NULL | When the transition occurred |
| `actor_person_id` | UUID | FK → persons(person_id), NULLABLE | The Person who caused/authorised the transition |
| `actor_role` | TEXT | NULLABLE | The Person's role at the time of the transition |
| `engagement_id` | UUID | FK → engagements(engagement_id), NULLABLE | The Engagement this transition is part of |
| `evidence_id` | UUID | FK → evidence_records(evidence_id), NULLABLE | The evidence supporting this transition |
| `transition_metadata` | JSONB | NULLABLE | Additional transition metadata |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When the record was created |

**Transition type values:**
```
causal, observational, epistemic, administrative
```

**Constraints:**
- `transition_type` is one of: causal, observational, epistemic, administrative
- `from_state_id` must exist before `to_state_id` (temporal ordering)
- `actor_person_id` is required for Causal and Administrative transitions
- `evidence_id` is required for all transitions

**Migration mapping:**
- `genome_events` records → `state_transitions` (backfill from existing events)
- `conversation_messages` records → `state_transitions` (backfill from conversations)

---

### 2.7 Provenance Record

**Purpose:** A structured provenance record linking a state change to its causal chain.

**Persistence structure:**

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `provenance_id` | UUID | PK | Unique identifier |
| `organisation_id` | UUID | FK → organisations(organisation_id), NOT NULL | The Organisation |
| `transition_id` | UUID | FK → state_transitions(transition_id), NOT NULL | The transition this provenance supports |
| `entity_type` | TEXT | CHECK, NOT NULL | Type of entity (Decision, Action, Outcome, Learning) |
| `entity_id` | UUID | NOT NULL | ID of the entity |
| `provenance_chain` | JSONB | NOT NULL | Structured causal chain |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When the record was created |

**Entity type values:**
```
decision, action, outcome, learning
```

**Provenance chain structure:**
```json
{
  "intervention": {
    "intervention_id": "uuid",
    "type": "workshop",
    "description": "Strategy workshop"
  },
  "decision": {
    "decision_id": "uuid",
    "alternatives": ["A", "B", "C"],
    "rationale": "Because X",
    "confidence": 0.85
  },
  "action": {
    "action_id": "uuid",
    "type": "implementation",
    "description": "Changed pricing model"
  },
  "outcome": {
    "outcome_id": "uuid",
    "expected": "Revenue increase",
    "actual": "Revenue increase confirmed",
    "variance": "positive"
  },
  "learning": {
    "learning_id": "uuid",
    "what_changed": "Pricing model knowledge updated",
    "confidence_delta": 0.15
  }
}
```

---

### 2.8 Knowledge Supersession

**Purpose:** A record of how one piece of knowledge supersedes another.

**Persistence structure:**

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `supersession_id` | UUID | PK | Unique identifier |
| `organisation_id` | UUID | FK → organisations(organisation_id), NOT NULL | The Organisation |
| `superseded_entity_type` | TEXT | CHECK, NOT NULL | Type of entity being superseded |
| `superseded_entity_id` | UUID | NOT NULL | ID of the entity being superseded |
| `superseding_entity_type` | TEXT | CHECK, NOT NULL | Type of entity doing the superseding |
| `superseding_entity_id` | UUID | NOT NULL | ID of the entity doing the superseding |
| `supersession_reason` | TEXT | NULLABLE | Why the supersession occurred |
| `supersession_confidence` | NUMERIC(3,2) | CHECK | Confidence in the supersession |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When the record was created |

**Entity type values:**
```
assertion, inference, decision, action, outcome, learning
```

**Constraints:**
- `superseded_entity_type` + `superseded_entity_id` is unique (one supersession per entity)
- `supersession_confidence` is between 0.00 and 1.00
- Historical superseded records are never destroyed

---

## 3. Relationship Map

```text
                         ┌──────────────────┐
                         │ Organisational   │
                         │ State (T₀)       │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Evidence Record  │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
            ┌───────────┐ ┌───────────┐ ┌───────────┐
            │ Assertion │ │ Inference │ │ Confidence│
            └───────────┘ └───────────┘ └───────────┘
                    │             │             │
                    └─────────────┼─────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ State Transition │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
            ┌───────────┐ ┌───────────┐ ┌───────────┐
            │Provenance │ │Knowledge  │ │ Organisa- │
            │ Record    │ │Supersession│ │ tional    │
            │           │ │           │ │ State (T₂)│
            └───────────┘ └───────────┘ └───────────┘
```

---

## 4. State Reconstruction Query Pattern

To reconstruct the organisational state at any point in time:

```sql
-- Get the state at time T
SELECT * FROM organisational_states
WHERE organisation_id = :org_id
  AND snapshot_timestamp <= :T
ORDER BY snapshot_timestamp DESC
LIMIT 1;

-- Get all transitions between T1 and T2
SELECT * FROM state_transitions
WHERE organisation_id = :org_id
  AND transition_timestamp BETWEEN :T1 AND :T2
ORDER BY transition_timestamp ASC;

-- Get the causal chain for a specific transition
SELECT * FROM provenance_records
WHERE transition_id = :transition_id
ORDER BY created_at ASC;

-- Get all evidence supporting a state
SELECT * FROM evidence_records
WHERE organisation_id = :org_id
  AND observed_at <= :T
ORDER BY observed_at ASC;
```

---

## 5. Non-Negotiable Persistence Rules

1. **Every material state transition must have provenance.** The `state_transitions` table must have a corresponding `provenance_records` entry for Causal and Administrative transitions.

2. **Evidence is immutable.** `evidence_records` are append-only. They are never updated or deleted.

3. **Assertions and Inferences are attributed.** Every assertion must have a `person_id`. Every inference must be marked as Kira's interpretation.

4. **Confidence is explicit.** Every assertion and inference must have a confidence score derived from evidence type, authority, clarity, and consistency.

5. **Supersession is explicit.** When one piece of knowledge supersedes another, the supersession must be recorded in `knowledge_supersession`.

6. **Historical records are never destroyed.** Assertions, inferences, and state transitions that are superseded are never deleted. They transition to historical status.

7. **State snapshots are versioned.** Each `organisational_states` record has a unique `snapshot_timestamp`. States are never updated; new states are created.

8. **Transition types are enforced.** The `transition_type` column must be one of: causal, observational, epistemic, administrative.

---

*This artifact is the P0.3-C organisational state persistence model. It is ready to serve as the basis for P0.3-D (Engagement Persistence Model).*
