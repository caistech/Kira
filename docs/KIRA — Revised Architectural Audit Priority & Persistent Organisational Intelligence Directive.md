# KIRA — Revised Architectural Audit Priority & Persistent Organisational Intelligence Directive

## Purpose

The architectural audit should now be oriented around a more fundamental question than whether individual Kira components align with the original directive:

> **Does the current Kira architecture support an organisation's intelligence surviving interventions, people, consultants, ownership changes and time?**

The coding discovery indicates that substantial substrate for this architecture already exists across the genome, memory and orchestrator work.

The next phase is therefore **not to build Kira from scratch**.

It is to turn the existing components into one coherent **persistent organisational intelligence architecture**.

---

# Revised Priority Order

## P0 — Establish the Canonical Organisational State

### 1. Reconcile the two genome systems

There must be **one canonical Business Genome**.

The audit should identify:

- the competing genome implementations
- overlapping responsibilities
- conflicting data models
- duplicated persistence
- conflicting ownership of organisational truth
- which implementation becomes canonical
- what happens to the non-canonical implementation

The outcome should not merely be documentation.

The codebase must converge on a single authoritative organisational-state model.

---

# P0 — Define the Persistent Intelligence Model

### 2. Define the ownership / business / engagement / Kira lifecycle separation

These concepts must become actual domain objects and state transitions rather than philosophical distinctions.

The architecture needs to clearly distinguish:

- **Ownership** — who owns or controls the business
- **Business** — the enduring organisational entity
- **Engagement** — a bounded intervention by a consultant, advisor, specialist or other actor
- **Kira** — the persistent intelligence layer that remains associated with the organisation

The critical principle is:

> **Kira persists with the organisation, not with the consultant or engagement.**

An engagement can end.

A consultant can leave.

Ownership can change.

People can leave.

The organisational intelligence must survive.

The domain model therefore needs to make those transitions explicit.

---

# P0 — Model Organisational Change

### 3. Introduce Decision → Action → Outcome → Learning

This is a foundational architectural requirement.

Kira cannot become an organisational intelligence system if it only stores facts, conversations and documents.

It needs to understand how the organisation changes.

The core pattern is:

**Decision**

→ What was decided?

**Action**

→ What was done?

**Outcome**

→ What happened?

**Learning**

→ What changed in the organisational model as a result?

This is what moves Kira from:

> "memory assistant"

toward:

> **"organisational intelligence system."**

The audit should determine where these concepts currently exist, where they are implicit, and what domain structures are required to make them first-class.

---

# P1 — Establish the Baseline

### 4. Assessment → Genome

The initial consultant assessment should become the initial organisational state.

The assessment should therefore not simply remain a report sitting beside Kira.

The relevant findings should establish the starting state of the Business Genome.

Conceptually:

**Assessment**

→ initial organisational state

→ Genome

→ ongoing change

This establishes a clean baseline against which subsequent organisational change can be understood.

---

# P1 — Preserve Organisational History

### 5. Make organisational state transitions first-class

The system must represent organisational change over time.

It should move beyond:

```text
fact = X
```

toward:

```text
Organisational State T1
        ↓
Intervention
        ↓
Decision
        ↓
Action
        ↓
Outcome
        ↓
Organisational State T2
        ↓
Learning
```

This distinction is critical.

Kira should be able to understand not only **what the organisation is**, but:

- what it was
- what changed
- why it changed
- who or what caused the change
- what intervention occurred
- what resulted
- what was learned
- what the current state is

This is where the long-term consultant continuity value emerges.

---

# P1 — Clarify Architectural Boundaries

### 6. Separate the four major responsibilities

The architecture should explicitly distinguish:

### Business-owned memory

The persistent organisational knowledge and history belonging to the business.

### Kira intelligence

The intelligence layer that interprets, contextualises, reasons over and maintains understanding of the organisational state.

### Orchestrator execution

The mechanism that coordinates and executes operational workflows.

### Consultant intervention

External or internal human expertise that changes the organisation.

These should not collapse into one another.

The consultant should not own the organisational memory.

The orchestrator should not become the organisational memory.

Kira should not become the owner of the business's knowledge.

The business should retain its persistent organisational intelligence while Kira provides the intelligence layer operating over it.

---

# P2 — Expand Ingestion

### 7. Build non-conversational write paths

Kira's organisational intelligence cannot depend primarily on conversation.

The architecture should support organisational-state updates originating from:

- documents
- business systems
- operational actions
- workflow outcomes
- consultant inputs
- assessments
- decisions
- project activity
- structured business data
- external systems
- other validated organisational events

Conversation becomes **one ingestion channel**, rather than the definition of the memory architecture.

The goal is for the Business Genome to become a continuously evolving representation of the organisation.

---

# P2 — Documentation

### 8. Rewrite HLD / LLD / architectural decisions

Once the architectural model has converged, update:

- HLD
- LLD
- architecture decision records
- genome documentation
- orchestrator documentation
- memory architecture documentation
- lifecycle documentation
- relevant audit documentation

Documentation should describe the architecture that actually exists and is intended to exist.

It should no longer preserve assumptions from the earlier Kira concept merely because they exist in older documents.

---

# New Formal Architectural Requirement

## Consultant Intelligence Continuity

This requirement should be added explicitly to the audit.

### Architectural invariant

> **A consultant engagement must leave the organisation more intelligible to Kira than it was before the engagement.**

This is one of the most important architectural requirements in the entire system.

A consultant engagement does not merely produce:

- a report
- recommendations
- decisions
- completed tasks
- operational changes

It should also produce **new persistent organisational intelligence**.

The consultant changes the organisation.

Kira records and understands those changes.

The resulting organisational intelligence remains after the consultant leaves.

Therefore:

> **Every subsequent engagement should be able to begin from the accumulated organisational intelligence rather than reconstructing the business from scratch.**

That is the mechanism by which Kira becomes a **consultant multiplier**.

---

# The Economic Flywheel

The architecture should explicitly support the following lifecycle:

```text
Consultant acquires client
        ↓
Kira is installed
        ↓
Kira captures organisational state
        ↓
Consultant improves business
        ↓
Kira records the new organisational state
        ↓
Consultant engagement ends
        ↓
Kira continues operating
        ↓
Organisational intelligence compounds
        ↓
New problem emerges
        ↓
Kira identifies context and prepares the organisation
        ↓
Consultant returns
        ↓
Consultant works from accumulated intelligence
        ↓
Business improves again
        ↓
Kira records the new state
        ↓
Repeat indefinitely
```

This creates a fundamentally different relationship between Kira and consulting.

Kira does not replace the consultant.

Kira **extends the useful life and leverage of the consultant's knowledge**.

The consultant produces organisational change.

Kira makes that change persistent, intelligible and reusable.

The next consultant therefore starts from a higher level of organisational understanding.

---

# What the Audit Is Really Testing

The original audit question was effectively:

> **Is the Kira code aligned with the directive?**

The more important question is now:

> **Does the Kira architecture allow organisational intelligence to survive interventions, people, consultants, ownership changes and time?**

This should become the central test of architectural alignment.

The audit should therefore evaluate whether:

1. organisational state has a canonical representation
2. organisational identity survives individual engagements
3. Kira survives consultant transitions
4. ownership changes can be represented without destroying organisational history
5. decisions and actions can be connected to outcomes
6. organisational learning can be persisted
7. state transitions are historically recoverable
8. consultant interventions enrich persistent organisational intelligence
9. future consultants can inherit accumulated context
10. intelligence can compound over time

---

# Current Architectural Position

The coding discovery suggests that Kira is already significantly further along this path than the original architecture might imply.

The foundations are being constructed across:

- Business Genome
- persistent memory
- orchestrator boundaries
- organisational state
- assessment
- agent execution
- domain modelling

The problem is primarily **architectural convergence**.

Some of the implementation and documentation still reflects the earlier Kira concept:

> **"Kira is an AI assistant that captures and retrieves business memory."**

The architecture is now moving toward a materially larger proposition:

> **"Kira is the persistent intelligence layer that maintains an evolving model of the organisation and makes that intelligence continuously available to the people and specialists working on the business."**

That distinction should guide the remainder of the audit.

---

# Target Architecture

The target is therefore not:

```text
User
 ↓
Kira
 ↓
Memory
```

It is closer to:

```text
                    ┌─────────────────────┐
                    │      Business       │
                    │                     │
                    │  Persistent State   │
                    │  + History          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Business Genome   │
                    │                     │
                    │ Current + Historical │
                    │ Organisational State │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Kira Intelligence │
                    │                     │
                    │ Context             │
                    │ Reasoning           │
                    │ Interpretation      │
                    │ Preparation         │
                    │ Learning            │
                    └──────┬───────┬──────┘
                           │       │
              ┌────────────┘       └─────────────┐
              ▼                                  ▼
     ┌─────────────────┐                ┌─────────────────┐
     │   Orchestrator  │                │    Consultants  │
     │                 │                │                 │
     │ Execution       │                │ Intervention    │
     │ Workflows       │                │ Expertise       │
     └────────┬────────┘                └────────┬────────┘
              │                                  │
              └──────────────┬───────────────────┘
                             ▼
                    ┌─────────────────────┐
                    │ Decision → Action   │
                    │ → Outcome → Learning│
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Updated Organisational│
                    │       State          │
                    └─────────────────────┘
```

The critical property of this architecture is the feedback loop.

Organisational interventions do not terminate at execution.

They return to the persistent organisational model as new intelligence.

---

# Final Audit Priority Sequence

The revised priority order is therefore:

| Priority | Requirement |
|---|---|
| **P0** | Reconcile the two genome systems into one canonical Business Genome |
| **P0** | Define ownership / business / engagement / Kira lifecycle as actual domain objects and state transitions |
| **P0** | Introduce Decision → Action → Outcome → Learning |
| **P1** | Establish Assessment → Genome as the initial organisational baseline |
| **P1** | Make organisational state transitions first-class |
| **P1** | Clarify Business Memory / Kira Intelligence / Orchestrator / Consultant boundaries |
| **P2** | Add non-conversational organisational-state write paths |
| **P2** | Rewrite HLD / LLD / architectural decisions around the converged model |
| **Cross-cutting requirement** | Enforce Consultant Intelligence Continuity |

---

# Core Architectural Principle

The entire architecture can ultimately be reduced to one principle:

> **Kira must ensure that organisational intelligence persists and compounds independently of the people and engagements that create it.**

That is what allows Kira to survive:

- consultant transitions
- employee transitions
- management transitions
- ownership transitions
- organisational change
- time

And that is what turns Kira from a memory product into a persistent organisational intelligence layer.

The consultant creates value by changing the organisation.

**Kira preserves, contextualises and compounds that value.**

The business therefore becomes progressively more intelligible over time.

That is the architecture that the audit should now be testing.