# KIRA — Engagement Domain Specification

**Status:** Architectural Foundation
**Purpose:** P0.2-D — Define Engagement as a bounded organisational intervention
**Scope:** Domain semantics, causal boundaries, and interaction with the organisational model
**Date:** 26 August 2026

---

## 1. Definition

An **Engagement** is a bounded, substantive intervention or body of work undertaken in relation to an Organisation. 

It is a first-class domain concept. It is **not** equivalent to a Kira conversation, a commercial subscription, a specific consultant relationship, or a project management record. It is the context within which organisational change is pursued.

---

## 2. Structural Requirements

An Engagement must capture:
- **Purpose/Scope:** What are the objectives of this intervention?
- **Participants:** Who are the `Person` actors? (Consultants, internal staff, external specialists).
- **Temporal Boundaries:** When did this body of work begin and end?
- **Commercial Context:** Under which `Commercial Arrangement` or `Subscription` is this engagement occurring?
- **State Baseline:** Against which `Organisational State(T₀)` did the engagement begin?
- **Provenance:** What evidence, decisions, and actions are directly attributable to this engagement?

---

## 3. The Causal Loop within an Engagement

An engagement operates against the organisational state using the causal machinery defined in P0.2-B:

```text
Engagement Context
    │
    ▼
Intervention (e.g., Consultant Workshop, Strategic Review)
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
Updated Organisational State (T₂)
```

### The Causal Test
Every material change to the organisation's state must be traceable through this chain. If a state change occurs without this provenance, it is an **Observational Transition** (see P0.2-B.1), not a **Causal Transition**.

---

## 4. Boundaries

### 4.1 Engagement vs. Subscription
Engagements are bounded interventions; subscriptions are recurring service entitlements.
- An Engagement **requires** an active commercial subscription (for Kira capabilities) but is not governed by it.
- Multiple engagements may occur within a single subscription.
- A subscription may persist across multiple engagements.

### 4.2 Engagement vs. Conversation
- A conversation is a **source of evidence**.
- An engagement is a **bounded container of interventions**.
- Conversations occur *within* the context of an engagement, but an engagement is an organisational construct, not a conversational one.

### 4.3 Engagement-Owned Context vs. Organisation-Owned Knowledge
- **Engagement-owned context:** Temporary, intent-specific information (e.g., "what we discussed in the strategy workshop").
- **Organisation-owned knowledge:** The resulting persistent state (e.g., "our pricing model is X").
- *Invariant:* The Engagement must be able to resolve its contributions into the Organisation's enduring state before it concludes.

---

## 5. Interaction and Compounding

The model must support multiple Engagements interacting and compounding:

```text
Organisation
    │
    ├── Engagement A (Consultant A)
    │       │
    │       ▼ State(T₁)
    │
    ├── Engagement B (Consultant B)
    │       │
    │       ▼ State(T₂) (builds on T₁)
    │
    └── Engagement C (Internal Team)
            │
            ▼ State(T₃) (builds on T₁ + T₂)
```

### Knowledge Survival
When an engagement concludes, it must transfer its **results** to the Organisation:
- **What survives:** All evidence, decisions, actions, outcomes, and learned state updates.
- **What is archived:** Engagement-specific context (workshop notes, draft alternatives, process-only discussions).
- **Attribution:** The Organisation's state persists, but the *causality* of how it reached that state remains attributable to the specific Engagement.

---

## 6. Non-Negotiable Invariants

1. **Bounded Intervention:** An Engagement is a discrete intervention, distinct from the ongoing, enduring Organisation.
2. **Causal Traceability:** Every material change in state during an engagement must be traceable to a Decision, Action, Outcome, and Learning event.
3. **Knowledge/Context Boundary:** Knowledge produced by an engagement is organisation-owned; context specific to the engagement's internal mechanics is engagement-owned.
4. **Subscription Independence:** Engagement lifecycle is not bound by subscription lifecycle.
5. **No Collapse:** Engagement must never be represented as a Conversation, Subscription, or Consultant relationship.
6. **Independence of Knowledge:** Organisational knowledge does not belong to Engagement A just because Engagement A discovered it. It belongs to the Organisation.
7. **Consultant Continuity:** Replacing a consultant (within an engagement or between engagements) must not require reconstructing organisational memory.
8. **Traceability:** Kira must be able to reconstruct what an engagement changed in the organisation's state and why.

---

## 7. Implementation Traceability (Audit Requirements)

| Canonical Concept | Existing Implementation |
|---|---|
| Engagement Purpose/Scope | Missing |
| Engagement Participants | Missing |
| Engagement Temporal Boundaries | Missing |
| Causal Link (Engagement → Knowledge) | Partial (via `kira_tasks`) |
| Engagement Context Archive | Missing |
| Knowledge Surviving Engagement | Partial |
