# KIRA — Organisational Temporal State Machine

**Status:** Architectural Foundation
**Purpose:** P0.2-B — Define organisational change as causally connected state transitions
**Scope:** Temporal model, causality, provenance, and state-transition semantics
**Date:** 26 August 2026

---

## 1. Purpose
The purpose of this artifact is to define the **Organisational Temporal State Machine**. It transitions Kira from a system that stores "the current state of facts" to a system that understands **how the organisation changed**.

The central architectural requirement is:
> **Kira must be able to reconstruct the organisation's state and the causal history of how it got there at any point in time.**

This machine transforms raw interactions (conversations/documents) into an evolving model of the organisation, anchored by causal relationships rather than mere temporal correlation.

---

## 2. Foundational Principle: Causal Intelligence
An event or a change in data is not automatically a causally meaningful organisational event.

The model explicitly distinguishes **correlation** from **causation**.

### The Causal Chain
```text
Intervention
    │
    ▼
Decision (Who, why, what, alternatives, confidence)
    │
    ▼
Action (What was done, by whom)
    │
    ▼
Outcome (What happened)
    │
    ▼
Learning (What changed in the model)
    │
    ▼
Updated Organisational State (The new persistent reality)
```

This sequence is the mechanism of organisational intelligence. It defines the trajectory from an intervention by a person (owner/consultant) to a persistent update in the organisation's state.

---

## 3. Temporal Primitives

The model defines the following primitives for representing organisational time and change:

### 3.1 State
The persistent, structured snapshot of an Organisation's attributes, knowledge, relationships, and commercial context at a point in time. It is the answer to: "What is true about the organisation now?"

### 3.2 Event
An immutable record of something that occurred. An event is not inherently a causal change (e.g., "owner logged in" is an event, but not necessarily a causal change to the organisation's state).

### 3.3 Transition
A formal change from `State(T1)` to `State(T2)`. A transition must be anchored by an event or a causal sequence.

### 3.4 Actor
A `Person` (as defined in P0.2-A.1) acting in a specific `Role` or `Engagement` context. Every causal sequence requires an Actor.

### 3.5 Intervention
A deliberate activity or engagement (e.g., consultant strategy workshop, owner review) that initiates a causal sequence.

### 3.6 Decision
An explicit organisational choice. It must include provenance (who, why, evidence, alternatives).

### 3.7 Action
Something undertaken. Actions are distinct from decisions. Actions are the execution phase.

### 3.8 Outcome
The observed result of an action. Crucially, outcomes are assessed against expectations (did it work?).

### 3.9 Learning
The process by which the system updates the model based on the variance between Expected and Actual outcomes.

---

## 4. The State-Machine Mechanics

### 4.1 Invariants
1. **No Silent State Change:** No change to the Business Genome (entity/fact/relationship) is permitted without an associated causal provenance record (Decision → Action → Outcome).
2. **Causal Integrity:** If an intervention leads to a state change, the causal chain must be preserved. A mutation event alone (`genome_events`) is not sufficient.
3. **Temporal Recovery:** The system must be capable of answering "What did we believe was true at time T?" by querying the state machine and supersession chains.
4. **Separation of Concerns:** The temporal state machine manages the *logic of change*. It is distinct from the *storage implementation* (e.g., event sourcing or snapshotting are valid implementation strategies for this model).

### 4.2 Causal Provenance
Every state update requires a provenance record:
```text
State(T1) + Intervention + Actor + Decision + Action + Outcome + Learning = State(T2)
```
Where evidence is missing, the system must reflect **low confidence** rather than inventing a causal chain. The system's epistemic integrity depends on distinguishing *observed change* from *inferred causality*.

---

## 5. Architectural Test
The model is successful only if it can answer the following **causal queries**:

1. **What changed?** (State evolution)
2. **Why did it change?** (Decision context)
3. **Who authorised or caused the change?** (Actor/Consultant/Owner)
4. **What action was actually taken?** (Action execution)
5. **What was the result?** (Outcome vs Expectation)
6. **What was learned?** (Learning/Genome enrichment)
7. **What is the current state, and how does it relate to the previous one?**

---

## 6. Next Steps
This P0.2-B model establishes the requirements for the causal feedback loop. It is now the foundation for:
- P0.2-C: Assessment → Initial Organisational State (seeding the state machine).
- P0.2-D: Engagement Domain Specification (the intervention anchor).
