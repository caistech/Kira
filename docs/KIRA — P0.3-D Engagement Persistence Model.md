# KIRA — P0.3-D Engagement Persistence Model

**Status:** Implementation Architecture
**Purpose:** Define how the Engagement domain is persisted, including its relationships with the Organisational State Machine and knowledge production
**Scope:** Engagement entities, relationships, and persistence semantics (implementation-independent schema design)
**Prerequisite:** P0.3-B (Canonical Persistence Model), P0.3-C (Organisational State Persistence Model)
**Date:** 26 August 2026

---

## 1. Purpose

The purpose of this artifact is to define the persistence model for the **Engagement domain**. It translates the Engagement semantic model (P0.2-D) into concrete persistence structures that integrate with the Organisational State Machine (P0.3-C) and the Canonical Persistence Model (P0.3-B).

The governing principle is:

> **Engagements are bounded interventions that produce organisational knowledge and state transitions, but their internal context is distinct from the Organisation's owned knowledge.**

This persistence model must support:
- Linking Engagements to the state transitions they produce
- Attributing state transitions to Engagement participants
- Recording the initial state against which an Engagement operates
- Preserving the provenance of knowledge produced by an Engagement
- Separating Engagement-owned context (ephemeral, internal) from Organisation-owned knowledge (persistent)

---

## 2. Engagement Entity Updates

We update the `engagements` table from P0.3-B to include a reference to the initial organisational state.

### 2.1 Engagements

**Persistence structure (updated):**

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `engagement_id` | UUID | PK | Unique identifier |
| `organisation_id` | UUID | FK → organisations(organisation_id), NOT NULL | The Organisation being engaged |
| `title` | TEXT | NOT NULL | Engagement title |
| `description` | TEXT | NULLABLE | Engagement description |
| `scope` | TEXT | NULLABLE | Engagement scope |
| `initial_state_id` | UUID | FK → organisational_states(state_id), NULLABLE | The Organisational State at the start of the Engagement (T₀) |
| `status` | TEXT | CHECK, DEFAULT 'active' | Engagement lifecycle state |
| `valid_from` | TIMESTAMPTZ | NOT NULL | When the engagement started |
| `valid_to` | TIMESTAMPTZ | NULLABLE | When the engagement ended (NULL = active) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When the record was created |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | When the record was last updated |

**Status lifecycle:**
```
active → completed → archived
```

**Constraints:**
- `organisation_id` is required
- `title` is required
- `valid_from` must be before `valid_to` (if provided)
- `status` is one of: active, completed, archived
- `initial_state_id` must point to a state with a `snapshot_timestamp` <= `valid_from` (the state at or before engagement start)

**Note:** The `initial_state_id` is optional because an Engagement may start without a recorded initial state (e.g., if the state machine is not yet initialized). However, for a well-formed Engagement, it should be set.

---

## 3. Engagement Participant (Unchanged from P0.3-B)

The `engagement_participants` table from P0.3-B remains as defined. It links a Person to an Engagement with a specific role and temporal scope.

**Persistence structure:**

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `participant_id` | UUID | PK | Unique identifier |
| `engagement_id` | UUID | FK → engagements(engagement_id), NOT NULL | The Engagement |
| `person_id` | UUID | FK → persons(person_id), NOT NULL | The Person |
| `role` | TEXT | CHECK, NOT NULL | Role within the Engagement |
| `status` | TEXT | CHECK, DEFAULT 'active' | Participation status |
| `valid_from` | TIMESTAMPTZ | NOT NULL | When participation started |
| `valid_to` | TIMESTAMPTZ | NULLABLE | When participation ended (NULL = active) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When the record was created |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | When the record was last updated |

**Role types:**
```
consultant, internal, advisor, observer
```

**Constraints:**
- `engagement_id` + `person_id` + `role` is unique (one role per person per engagement)
- `valid_from` must be before `valid_to` (if provided)

---

## 4. Linking Engagements to State Transitions

The `state_transitions` table from P0.3-C already includes an `engagement_id` column to link a transition to an Engagement.

We retain and rely on this link.

**Recall the `state_transitions` table (from P0.3-C):**

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `transition_id` | UUID | PK | Unique identifier |
| `organisation_id` | UUID | FK → organisations(organisation_id), NOT NULL | The Organisation |
| `from_state_id` | UUID | FK → organisational_states(state_id), NOT NULL | The state before the transition |
| `to_state_id` | UUID | FK → organisational_states(state_id), NOT NULL | The state after the transition |
| `transition_type` | TEXT | CHECK, NOT NULL | Type of transition (causal, observational, epistemic, administrative) |
| `transition_timestamp` | TIMESTAMPTZ | NOT NULL | When the transition occurred |
| `actor_person_id` | UUID | FK → persons(person_id), NULLABLE | The Person who caused/authorised the transition |
| `actor_role` | TEXT | NULLABLE | The Person's role at the time of the transition |
| `engagement_id` | UUID | FK → engagements(engagement_id), NULLABLE | The Engagement this transition is part of |
| `evidence_id` | UUID | FK → evidence_records(evidence_id), NULLABLE | The evidence supporting this transition |
| `transition_metadata` | JSONB | NULLABLE | Additional transition metadata |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When the record was created |

**Constraints (from P0.3-C):**
- `transition_type` is one of: causal, observational, epistemic, administrative
- `from_state_id` must exist before `to_state_id` (temporal ordering)
- `actor_person_id` is required for Causal and Administrative transitions
- `evidence_id` is required for all transitions
- `engagement_id` is nullable (not all transitions are part of an Engagement)

**Usage:**
- When an Engagement produces a state transition (via the causal chain: Intervention → Decision → Action → Outcome → Learning), the resulting `state_transitions` record will have:
  - `engagement_id` set to the Engagement's ID
  - `actor_person_id` set to the Person who caused/authorised the transition (e.g., the consultant or owner)
  - `actor_role` set to that Person's role in the Engagement
  - `transition_type` set to 'causal'
  - `evidence_id` set to the evidence supporting the transition
  - A corresponding `provenance_records` entry will detail the causal chain

---

## 5. Engagement-Specific Context

The canonical model (P0.1) and the Engagement Domain Specification (P0.2-D) distinguish between:

- **Engagement-owned context:** Temporary, intent-specific information (e.g., workshop notes, draft ideas, internal discussions) that is not promoted to organisational knowledge.
- **Organisation-owned knowledge:** The resulting persistent state (e.g., "our pricing model is X") that belongs to the Organisation.

### 5.1 Organisation-Owned Knowledge

Organisation-owned knowledge is persisted via the Organisational State Machine (P0.3-C) and the Canonical Persistence Model (P0.3-B). Specifically:

- Assertions, inferences, decisions, actions, outcomes, and learnings are stored in their respective tables.
- These are linked to the Organisation via `organisation_id`.
- They are attributed to the Person who provided the evidence or made the inference/decision.
- They are connected to state transitions via `provenance_records`.
- They contribute to the `organisational_states` table (via `state_data` or through the knowledge in the assertions/inferences that shape the state).

### 5.2 Engagement-Owned Context

Engagement-owned context is **not** persisted in the organisational knowledge base. It is considered transient and is not required to be retained for the organisational model.

**Rationale:**
- The Engagement's internal context (e.g., brainstorming notes, rejected alternatives, process-only discussions) does not constitute organisational knowledge.
- Retaining every piece of engagement context would lead to data bloat and obscure the organisational knowledge.
- The organisational model only requires that the **results** of the Engagement (the knowledge that updates the organisational state) are persisted.

**Implementation:**
- Engagement-owned context may be stored in a separate, temporary system (e.g., a shared drive, a collaborative document, or a temporary database) for the duration of the Engagement.
- Upon Engagement completion, the Engagement-owned context is either:
  - Discarded (if not needed for audit or compliance), or
  - Exported to an archive (if required for compliance) but **not** imported into the organisational knowledge base.
- The organisational knowledge base only retains the knowledge that has been promoted to Organisation-owned knowledge via the state transition and provenance mechanisms.

---

## 6. Knowledge Production Flow

The flow of knowledge from an Engagement to the Organisation is:

```
Engagement Context
    │
    ▼
Intervention (e.g., Workshop, Review)
    │
    ▼
Decision (with alternatives/rationale)
    │
    ▼
Action (human/agent/system)
    │
    ▼
Outcome (observed result)
    │
    ▼
Evidence (provenance)
    │
    ▼
Learning (Belief Revision)
    │
    ▼
State Transition (Causal)
    │
    ▼
Updated Organisational State (T₂)
    │
    ▼
Organisation-owned Knowledge (assertions, inferences, decisions, actions, outcomes, learnings)
```

### 6.1 Attribution

- The `Decision`, `Action`, `Outcome`, and `Learning` entities are attributed to the `Person` who performed them (via `person_id` in their respective tables).
- The `state_transitions` record links to the `engagement_id` and records the `actor_person_id` and `actor_role`.
- The `provenance_records` record links the `state_transitions` to the `Decision`, `Action`, `Outcome`, and `Learning` entities, preserving the causal chain.
- The `organisational_states` record (the `to_state_id`) reflects the updated organisational knowledge.

### 6.2 Example

An Engagement (Consultant Workshop) produces:
1. **Decision:** "Change pricing model to tiered subscription" (attributed to Consultant Jane)
2. **Action:** "Update pricing in billing system" (attributed to Owner Dennis)
3. **Outcome:** "Pricing updated; revenue increased by 10%" (attributed to the system)
4. **Learning:** "Tiered subscription model increases customer retention" (attributed to Kira's learning system)
5. **State Transition:** Causal transition from State(T₁) to State(T₂) with evidence of the pricing update and revenue increase.
6. **Organisational State:** State(T₂) includes the updated pricing model and the learned knowledge about customer retention.

The Engagement-owned context (e.g., workshop notes, rejected pricing models, discussion transcripts) is not persisted in the organisational knowledge base.

---

## 7. Non-Negotiable Persistence Rules

1. **Engagement-produced knowledge is Organisation-owned.** All knowledge that updates the organisational state (assertions, inferences, decisions, actions, outcomes, learnings) is stored in the Organisation's tables (`organisation_id` FK), not in Engagement-specific tables.

2. **Every material state transition from an Engagement must have provenance.** If a `state_transitions` record has an `engagement_id` set, it must have a corresponding `provenance_records` entry for Causal and Administrative transitions.

3. **Engagement participants are attributed to state transitions.** The `actor_person_id` and `actor_role` in a `state_transitions` record must correspond to a valid `engagement_participants` record for that Engagement and Person at the time of the transition.

4. **The initial state is recorded.** The `engagements.initial_state_id` must point to a valid `organisational_states` record that represents the state at or before the engagement started.

5. **Engagement-owned context is not persisted in the organisational knowledge base.** Engagement-owned context (notes, ideas, internal discussions) is not stored in the Organisation's tables. It may be retained temporarily elsewhere but is not imported into the organisational knowledge base.

6. **Historical Engagement data is preserved.** Engagement records (`engagements` and `engagement_participants`) are never deleted. They transition to `status = 'archived'` when completed.

7. **Soft delete for Engagement-owned context.** If Engagement-owned context is persisted temporarily, it must be soft-deleted or archived after the Engagement ends, but this is outside the organisational knowledge base.

---

## 8. Relationship Map

```text
                         ┌──────────────┐
                         │  Organisation │
                         └──────┬───────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
  ┌───────────────┐   ┌─────────────────┐   ┌─────────────────┐
  │  Engagement   │   │  State Transition │   │  Organisation   │
  │               │   │                 │   │  Knowledge        │
  │  Participants │   │  (links to      │   │  (assertions,     │
  │  (Person+Role)│   │   Engagement)   │   │   inferences,     │
  │               │   │                 │   │   decisions,      │
  │               │   │                 │   │   actions,        │
  │               │   │                 │   │   learnings)      │
  └───────┬─────────┘   └───────────────┘   └───────────────────┘
          │                   │
          ▼                   ▼
  ┌───────────────┐   ┌─────────────────┐
  │  Initial      │   │  Provenance     │
  │  State (T₀)   │   │  Record         │
  │               │   │  (links to      │
  │               │   │   Decision,     │
  │               │   │   Action,       │
  │               │   │   Outcome,      │
  │               │   │   Learning)     │
  └───────────────┘   └─────────────────┘
```

---

*This artifact is the P0.3-D engagement persistence model. It is ready to serve as the basis for P0.3-E (API Contract Architecture).*