# KIRA — P0.2-B.1 Temporal State Machine Amendment

**Status:** Architectural Amendment to P0.2-B
**Purpose:** Distinguish organisational causation from knowledge acquisition / observation / belief revision
**Scope:** Targeted refinement of the transition taxonomy and state-change semantics
**Prerequisite:** P0.2-B (Organisational Temporal State Machine)
**Date:** 26 August 2026

---

## 1. Purpose

P0.2-B correctly established the causal chain:

```
Intervention → Decision → Action → Outcome → Learning → Updated Organisational State
```

This amendment does not remove or weaken that chain. It places it in its correct context.

The amendment introduces a broader taxonomy of state transitions, because not every state change results from a Kira intervention. Some result from external events. Some result from new evidence correcting prior beliefs. Some result from administrative metadata changes.

The governing principle of this amendment is:

> **Not every conversation is an event of organisational significance.**
> **Not every organisational change has a Kira intervention in its causal chain.**
> **Not every knowledge update reflects a change in organisational reality.**

---

## 2. The Fundamental Distinction

The model now distinguishes two layers:

### 2.1 Organisational Reality

What is actually true about the organisation, independent of Kira's knowledge of it.

Organisational reality can:
- Change (the organisation actually sold, expanded, hired, pivoted)
- Remain unchanged (Kira discovered something new about a stable organisation)

### 2.2 Organisational State

Kira's structured representation of organisational reality at a point in time.

Organisational State can change because:
- Organisational reality changed
- Kira's knowledge of organisational reality changed
- Both

These are not the same thing. The model must represent both.

---

## 3. The State-Transition Taxonomy

There are four distinct types of state transition. Each has different provenance requirements. Each must be represented differently in the temporal model.

### 3.1 Causal Transition

Something changed because an actor deliberately intervened.

**Causal chain:**
```
Intervention
    ↓
Decision (who, why, evidence, alternatives, confidence)
    ↓
Action (what was done, by whom, status)
    ↓
Outcome (result vs expectation)
    ↓
Learning (what the model learned)
    ↓
State Change
```

**Provenance requirements:**
- Actor identity and role at time of intervention
- Decision record with alternatives and rationale
- Action record with executor and status
- Outcome record with expectation vs actual
- Learning record with model delta
- Full causal chain preserved

**Example:**
- Consultant runs strategy workshop → Decision to change pricing → Action to update pricing → Outcome observed → Learning captured → State updated

### 3.2 Observational Transition

Something changed in the organisation independently of Kira's intervention, and Kira subsequently learned about it.

**Observational chain:**
```
External Event
    ↓
Evidence (source, time, confidence)
    ↓
Knowledge Update (interpretation, supersession)
    ↓
State Change
```

**Provenance requirements:**
- External event record (what happened, when)
- Evidence record (source, reliability, confidence)
- Knowledge update record (what changed in the model)
- No causal chain required (because Kira did not cause the change)

**Example:**
- Owner says "We sold the factory on 1 July" → Evidence recorded → Knowledge updated → State reflects new ownership

### 3.3 Epistemic Transition

The organisation did not change. Kira's understanding of the organisation changed because new evidence arrived.

**Epistemic chain:**
```
New Evidence
    ↓
Belief Revision (prior belief, new evidence, revised belief, confidence delta)
    ↓
Knowledge State Change
    ↓
Representation Change
```

**Provenance requirements:**
- Prior belief record (what Kira believed)
- New evidence record (source, reliability, confidence)
- Revised belief record (what Kira now believes)
- Confidence delta (how much certainty changed)
- No organisational change implied

**Example:**
- Kira believed pricing changed in July → Accountant confirms it was reversed in September → Kira revises belief → State reflects corrected timeline

### 3.4 Administrative Transition

An authorised metadata or system change that does not reflect organisational reality change.

**Administrative chain:**
```
Authorised Actor
    ↓
Explicit Metadata Change
    ↓
State Change (metadata only)
```

**Provenance requirements:**
- Actor identity and authorisation
- Change record (what metadata changed, why)
- Explicitly tagged as administrative (not organisational)

**Example:**
- Admin corrects a data entry error → Metadata corrected → State updated with administrative provenance

---

## 4. Revised Invariant: No Silent State Change

The original invariant stated:

> "No change to the Business Genome is permitted without an associated causal provenance record (Decision → Action → Outcome)."

This is revised to:

> **No material state transition is permitted without an explicit provenance path identifying the transition type (Causal / Observational / Epistemic / Administrative) and the evidence supporting it.**

This is stronger architecturally because:

1. It requires provenance for every material transition, not just causal ones
2. It prevents the system from inventing causality where none exists
3. It preserves the causal chain where it does exist
4. It distinguishes "the organisation changed" from "Kira's knowledge changed"
5. It supports the P0.1 requirement that Kira distinguish current, historical, superseded, disputed, and inferred knowledge

---

## 5. Transition Type Decision Tree

The model includes a decision rule for determining transition type:

```
Did Kira cause or authorise the change?
    │
    ├── Yes → Was there a deliberate intervention?
    │         │
    │         ├── Yes → Causal Transition
    │         │         (Intervention → Decision → Action → Outcome → Learning)
    │         │
    │         └── No → Administrative Transition
    │                   (Authorised metadata change)
    │
    └── No → Did organisational reality change independently?
              │
              ├── Yes → Observational Transition
              │         (External Event → Evidence → Knowledge Update)
              │
              └── No → Did Kira's belief change?
                        │
                        ├── Yes → Epistemic Transition
                        │         (New Evidence → Belief Revision)
                        │
                        └── No → Not a material state transition
                                  (No state change required)
```

---

## 6. What Changed vs. What Kira Learned

The model now explicitly represents both:

### 6.1 Organisational Event

Something that happened to the organisation. Independent of Kira's knowledge.

### 6.2 Evidence

Something from which Kira can establish or infer organisational knowledge.

### 6.3 Knowledge Update

A change in Kira's model of the organisation, triggered by evidence.

### 6.4 State

The structured representation of the organisation at a point in time, reflecting both:
- Actual organisational reality (what changed)
- Kira's knowledge of that reality (what Kira learned)

These are stored separately and linked through provenance records. They are not conflated.

---

## 7. Temporal Reconstruction

The model must now support reconstruction queries that distinguish:

1. **What did the organisation look like at time T?**
   - Query the state machine for the organisational state at T
   - Includes both actual state and Kira's knowledge of it at that time

2. **What changed between T1 and T2?**
   - Query the transition log for all state transitions between T1 and T2
   - Include transition type (Causal / Observational / Epistemic / Administrative)
   - Include provenance for each transition

3. **Why did it change?**
   - For Causal transitions: retrieve the full causal chain
   - For Observational transitions: retrieve the evidence and external event
   - For Epistemic transitions: retrieve the belief revision record
   - For Administrative transitions: retrieve the authorised change record

4. **Who caused or authorised the change?**
   - For Causal transitions: Actor identity and role at time of intervention
   - For Observational transitions: Evidence source (who provided the information)
   - For Epistemic transitions: Evidence source
   - For Administrative transitions: Authorised Actor

5. **What did Kira believe at time T?**
   - Query the knowledge state at T, including confidence levels and provenance

6. **What does Kira believe now?**
   - Query current knowledge state, including confidence levels and provenance

7. **What is the difference between what Kira believed then and what Kira believes now?**
   - Compare knowledge states at T1 and T2
   - Identify epistemic transitions (belief changes without organisational change)
   - Identify organisational transitions (actual changes reflected in knowledge)

---

## 8. Impact on P0.2-B Architecture

This amendment adds the following to the P0.2-B architecture:

### 8.1 New Primitives

| Primitive | Definition | Purpose |
|-----------|------------|---------|
| Organisational Event | Something that happened to the organisation | Distinguish actual events from Kira's knowledge of them |
| Evidence | Something from which Kira infers organisational knowledge | Track source, reliability, confidence |
| Knowledge Update | A change in Kira's model triggered by evidence | Distinguish knowledge change from state change |
| Causal Transition | State change resulting from deliberate intervention | Full causal chain required |
| Observational Transition | State change resulting from external event observation | Evidence required, causal chain not required |
| Epistemic Transition | Knowledge change without organisational change | Belief revision record required |
| Administrative Transition | Metadata change by authorised actor | Authorisation record required |

### 8.2 Revised State Machine

```text
                          ┌─────────────────┐
                          │  Organisational │
                          │     Event       │
                          └────────┬────────┘
                                   │
                                   ▼
                              ┌─────────┐
                              │ Evidence │
                              └─────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │     Knowledge Update         │
                    │  (interpretation, inference, │
                    │   supersession, confidence)  │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │    State Transition          │
                    │  (Causal / Observational /   │
                    │   Epistemic / Administrative)│
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │    Organisational State      │
                    │    (T2)                      │
                    └──────────────────────────────┘
```

### 8.3 Revised No Silent State Change Invariant

> **No material state transition is permitted without an explicit provenance path identifying the transition type (Causal / Observational / Epistemic / Administrative) and the evidence supporting it.**

---

## 9. Non-Negotiable Rules Added

1. **Not every state change is causal.** The model must support observational, epistemic, and administrative transitions without requiring a causal chain.

2. **Organisational reality and Kira's knowledge are distinct.** State changes may reflect actual organisational change, knowledge change, or both. These must be represented separately.

3. **Evidence is required for all material transitions.** The system must not update organisational state without recording the evidence that motivated the update.

4. **Causality is not invented.** If the evidence does not support a causal chain, the transition must be classified as Observational or Epistemic, not Causal.

5. **Epistemic events are first-class.** When Kira's understanding changes without organisational reality changing, this must be represented as an Epistemic Transition, not silently merged into a Causal Transition.

6. **Administrative changes are explicitly tagged.** Metadata corrections and system changes must be tagged as Administrative to prevent them from being misread as organisational reality changes.

---

## 10. Impact on P0.2-C

This amendment directly shapes P0.2-C (Assessment → Initial Organisational State):

The assessment is not the organisation's history. It is an **epistemic observation** of the organisation at T₀.

The assessment → initial state pipeline must therefore produce:

```
Assessment Evidence
    ↓
Assertions (what the owner stated)
    ↓
Inferences (what Kira derived)
    ↓
Confidence (how certain is each assertion/inference)
    ↓
Initial State (T₀)
    ↓
  State Transition Type: Epistemic
  Provenance: Assessment evidence + interpretation
```

The initial state is an epistemic snapshot, not an organisational history. It is Kira's first structured representation of the organisation, derived from assessment evidence, with explicit confidence and provenance.

This aligns with the P0.1 requirement that Kira distinguish what it knows from what it merely heard.

---

## 11. Traceability to P0.2-B

| P0.2-B Concept | P0.2-B.1 Amendment |
|---|---|
| Causal chain (Intervention → Decision → Action → Outcome → Learning) | Retained as one of four transition types |
| State | Now distinguishes organisational reality from Kira's knowledge of it |
| Event | Now distinguishes Organisational Event from Kira's internal events |
| Transition | Now has four types: Causal, Observational, Epistemic, Administrative |
| Actor | Now includes Evidence Source as a type of actor |
| Learning | Now distinguished from Knowledge Update |
| Updated Organisational State | Now includes both actual change and knowledge change |
| No Silent State Change | Revised to require provenance path identifying transition type |

---

*This amendment is ready to serve as the basis for P0.2-C (Assessment → Initial Organisational State).*
