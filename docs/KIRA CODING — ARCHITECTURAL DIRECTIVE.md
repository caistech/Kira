# KIRA CODING — ARCHITECTURAL DIRECTIVE
## Establish the Persistent Organisational Intelligence Architecture

**Status:** Authoritative architectural directive  
**Audience:** Kira Coding / Engineering / Architecture  
**Date:** 26 August 2026  
**Purpose:** Define the architecture that Kira Coding must establish before further feature implementation.

---

# 1. Executive Directive

Kira is no longer to be architected as primarily a voice agent, assistant, or memory-enabled application.

**Kira is to be architected as a persistent organisational intelligence layer belonging to the business.**

The fundamental architectural question is:

> **Does the Kira architecture allow an organisation's intelligence to survive interventions, people, consultants, ownership changes, product changes and time?**

The answer must ultimately be **yes**.

Kira's intelligence must belong to the enduring organisation rather than to:

- a particular consultant;
- a particular owner;
- a particular employee;
- a particular subscription;
- a particular engagement;
- a particular conversation;
- or a particular Kira deployment.

The current codebase contains substantial substrate for this architecture, particularly in:

- the Business Genome;
- persistent memory;
- provenance and evidence;
- supersession chains;
- genome events;
- orchestrator boundary work;
- task execution;
- and the existing separation between business and commercial concerns.

However, several concepts required by the target architecture **do not currently exist as first-class implementation concepts**.

This directive therefore does **not** instruct Kira Coding to immediately build the complete target architecture.

It instructs Kira Coding to:

1. establish the canonical organisational model;
2. identify and resolve existing architectural contradictions;
3. define the missing domain objects and contracts;
4. establish the lifecycle model;
5. establish the temporal state-transition model;
6. preserve the existing distributor/commercial model;
7. then produce the implementation specification required for safe incremental construction.

---

# 2. Core Architectural Principle

## Kira Persists With the Organisation

The canonical relationship is:

**Organisation → Kira**

not:

**Consultant → Kira → Organisation**

and not:

**Subscription → Kira → Organisation**

A consultant, advisor, broker, accountant or other human participant may interact with Kira and may contribute substantial intelligence to the organisation.

But that human relationship is an **intervention or engagement**.

It is not the owner of Kira's organisational intelligence.

When a consultant leaves:

> Kira remains.

When an owner leaves:

> Kira remains.

When ownership changes:

> Kira remains with the business.

When an engagement ends:

> Kira remains.

When a subscription changes:

> The organisational intelligence must remain persistent, subject to the commercial and entitlement rules governing access to it.

This is the architectural principle against which subsequent implementation decisions must be tested.

---

# 3. What This Directive Is — and Is Not

## 3.1 This directive is

A directive to establish the architectural substrate required for:

**Persistent Organisational Intelligence.**

It covers:

- organisational identity;
- organisational state;
- organisational memory;
- ownership;
- interventions;
- engagements;
- decisions;
- actions;
- outcomes;
- learning;
- provenance;
- temporal state;
- lifecycle separation;
- and persistence.

## 3.2 This directive is not

It is **not** a mandate to:

- replace the existing Distributor model with a Consultant model;
- rewrite the introducer channel as a consultant system;
- build consultant-facing products before the existing distributor SaaS model is validated;
- immediately implement every proposed domain object;
- discard existing Kira commercial decisions;
- treat a consultant as the owner of organisational intelligence;
- or rewrite the existing system simply because the target architecture is more sophisticated.

The architecture must evolve incrementally.

---

# 4. Canonical Domain Model

Kira Coding must establish the following conceptual separation.

## 4.1 Organisation

The enduring business entity.

The organisation is the principal owner of:

- organisational identity;
- organisational facts;
- organisational history;
- organisational decisions;
- organisational learning;
- organisational state;
- and Kira's persistent intelligence.

The organisation survives changes in:

- people;
- ownership;
- advisors;
- consultants;
- engagements;
- subscriptions;
- and Kira capabilities.

---

## 4.2 Ownership

Ownership represents who controls or owns the organisation at a particular point in time.

Ownership is **not equivalent to user identity**.

Ownership must eventually support temporal change.

For example:

```text
Organisation
    |
    +-- Ownership Period 1
    |      Owner A
    |
    +-- Ownership Period 2
           Owner B
```

The intelligence belonging to the organisation must persist across this transition.

The implementation must therefore distinguish:

**Who owns the business now**

from:

**What the business knows and has learned over its history.**

---

## 4.3 Engagement

An engagement represents a bounded intervention involving the organisation and one or more external or internal participants.

Examples may include:

- consultant engagement;
- advisory engagement;
- broker engagement;
- accountant engagement;
- valuation engagement;
- strategic review;
- implementation program;
- succession program;
- operational improvement program.

An engagement has:

- an organisation;
- participants;
- a purpose;
- a start;
- potentially an end;
- activities;
- decisions;
- actions;
- outcomes;
- and organisational effects.

**Engagement is a new domain concept.**

The current codebase does not contain sufficient implementation substrate for it.

Kira Coding must not pretend that the current introducer system is already an engagement model.

---

# 5. Consultant vs Introducer

This distinction is mandatory.

## Introducer

An introducer currently represents a commercial/referral relationship.

The introducer may:

- refer a business;
- receive attribution;
- participate in the commercial channel;
- observe appropriate projections.

The introducer does not necessarily alter organisational intelligence.

## Consultant

A consultant may:

- diagnose;
- advise;
- intervene;
- make recommendations;
- influence decisions;
- execute actions;
- generate outcomes;
- and contribute knowledge to the organisation.

These are different domain behaviours.

Therefore:

> **Do not repurpose the existing introducer model as the consultant/engagement model merely to avoid creating new domain structures.**

The existing introducer architecture should remain intact unless a future architectural decision explicitly changes its purpose.

A future product may support consultant engagements, but this must be additive rather than an accidental corruption of the distributor model.

---

# 6. Four Independent Lifecycles

Kira Coding must explicitly model four different lifecycles.

## 6.1 Kira Capability Lifecycle

This governs what Kira can do.

Examples:

- capabilities;
- plans;
- versions;
- agent availability;
- orchestration capability;
- memory capability.

A change to Kira capability must not automatically destroy organisational intelligence.

---

## 6.2 Business Lifecycle

This governs the organisation.

Examples:

```text
Formation
    ↓
Growth
    ↓
Maturity
    ↓
Transformation
    ↓
Sale / Succession / Closure
```

The business lifecycle is distinct from Kira's technical lifecycle.

---

## 6.3 Ownership Lifecycle

Ownership can change without destroying the organisation's historical intelligence.

Example:

```text
Owner A
   ↓
Sale
   ↓
Owner B
```

The organisational knowledge graph remains attached to the organisation.

Ownership changes must become explicit events/state transitions rather than implicit user changes.

---

## 6.4 Engagement Lifecycle

An engagement is bounded.

Example:

```text
Engagement Created
        ↓
Active Intervention
        ↓
Decisions
        ↓
Actions
        ↓
Outcomes
        ↓
Engagement Closed
```

The end of an engagement does **not** end Kira's organisational intelligence.

---

# 7. The Organisational Intelligence Feedback Loop

The target architecture is:

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
        ↓
Updated Organisational Intelligence
        ↓
Future Decision
```

This is the central compounding mechanism of Kira.

Kira must not merely accumulate conversations.

It must progressively improve the organisational model.

The objective is:

> **Experience becomes organisational intelligence.**

---

# 8. Decision → Action → Outcome → Learning

These concepts must become first-class architectural concepts.

## 8.1 Decision

A decision represents an explicit organisational choice.

It should eventually capture concepts such as:

- what was decided;
- when;
- by whom;
- why;
- evidence;
- alternatives considered;
- confidence;
- affected organisational areas;
- resulting actions.

Existing `kira_memory.memory_type = decision` may provide historical substrate but is not sufficient as the final domain model.

Do not destroy existing memory behaviour before establishing the replacement contract.

---

## 8.2 Action

An action represents something undertaken as a consequence of a decision or intervention.

`kira_tasks` currently represents dispatched tasks.

That is useful substrate, but:

> **A task is not necessarily an action.**

An action may be:

- human;
- consultant-led;
- system-executed;
- agent-executed;
- operational;
- strategic.

The architecture must therefore distinguish task execution from the broader concept of organisational action.

---

## 8.3 Outcome

An outcome represents what actually happened.

It must eventually be possible to distinguish:

```text
Expected outcome
Actual outcome
Evidence
Variance
```

Existing task result fields are useful substrate but do not constitute the complete outcome model.

---

## 8.4 Learning

Learning represents what Kira concludes or updates about the organisation as a consequence of experience.

Learning may result in:

- a new fact;
- changed confidence;
- a superseded assumption;
- a changed relationship;
- a new rule;
- a new risk;
- a changed priority;
- or a revised organisational belief.

Learning must ultimately result in an update to organisational state or organisational intelligence.

---

# 9. Canonical Business Genome

## P0 — Reconcile the Two Genome Systems

There must be **one canonical Business Genome**.

Kira Coding must first identify and reconcile the existing genome implementations.

The audit must establish:

- which schema is authoritative;
- which code paths write to it;
- which code paths merely derive projections;
- which tables represent canonical state;
- which structures are legacy;
- which structures are transitional;
- and how migration will occur.

The target architecture must not continue with two competing definitions of organisational truth.

The canonical genome must support:

- entities;
- facts;
- relationships;
- events;
- evidence;
- provenance;
- confidence;
- supersession;
- temporal validity;
- and organisational state.

---

# 10. Assessment → Initial Organisational State

The assessment must become the initial organisational state.

The intended flow is:

```text
Assessment
    ↓
Validated Answers
    ↓
Structured Organisational Facts
    ↓
Initial Business Genome
    ↓
Initial Organisational State
```

The current implementation derives baseline information at render time and stores assessment inputs primarily in a valuation structure.

This is insufficient as the target architecture.

Assessment information that represents an organisation's self-reported state must become persistent, attributable organisational knowledge.

It must retain provenance indicating that the information originated from:

> **Initial assessment / self-report**

rather than being represented as an inferred or externally verified fact.

The implementation must distinguish:

- self-reported;
- observed;
- externally sourced;
- system-inferred;
- consultant-derived;
- and subsequently verified information.

---

# 11. Organisational State

The architecture must introduce a formal concept of organisational state.

At minimum, Kira must eventually be able to answer:

> **What did we believe the organisation's state was at time T?**

and:

> **What changed between T1 and T2?**

and:

> **Why did it change?**

and:

> **What intervention, decision, action or outcome caused or contributed to the change?**

The existing `genome_events` system is valuable but is not sufficient by itself.

A genome mutation audit answers:

> "What changed?"

The target architecture must additionally answer:

> "Why did it change?"

and:

> "What organisational intervention produced that change?"

---

# 12. Temporal Architecture

Kira Coding must design for temporal organisational intelligence.

The architecture should support:

```text
State T1
   ↓
Intervention
   ↓
Decision
   ↓
Action
   ↓
Outcome
   ↓
State T2
```

The system must preserve historical states rather than simply overwriting current values.

Where practical, the architecture should distinguish:

- effective time;
- recorded time;
- source;
- confidence;
- superseded state;
- current state;
- causal event;
- and responsible actor.

This does not necessarily require storing a complete database snapshot after every event.

The implementation team must determine the most appropriate technical mechanism during the data-model and migration design phase.

The architectural requirement is persistence of historical meaning, not a predetermined storage implementation.

---

# 13. Provenance Is Mandatory

Every meaningful organisational intelligence update should eventually be attributable to its source.

Examples:

```text
Assessment
Conversation
Owner
Consultant
Employee
Document
External data
Agent inference
Decision
Action outcome
System observation
```

Kira must be able to distinguish:

> "The owner told us this."

from:

> "Kira inferred this."

from:

> "The consultant recommended this."

from:

> "The organisation subsequently verified this."

This is essential for trustworthy organisational intelligence.

---

# 14. Persistence Across People

Kira must survive:

### Consultant departure

```text
Consultant A
    ↓
Engagement ends
    ↓
Kira remains
    ↓
Consultant B
    ↓
New engagement
    ↓
Kira provides historical organisational context
```

The incoming consultant must not need to reconstruct the organisation from scratch.

However, Kira must not incorrectly expose information merely because it exists.

Access, permissions, commercial entitlement and confidentiality remain separate concerns.

---

# 15. Persistence Across Ownership Change

Ownership transition must not destroy organisational intelligence.

Example:

```text
Organisation X

Owner A
  ↓
Sale
  ↓
Owner B
```

The organisation's historical intelligence remains associated with Organisation X.

However, ownership change may alter:

- permissions;
- access;
- commercial entitlement;
- disclosure rules;
- governance;
- and the interpretation of historical information.

These must be treated separately from persistence.

---

# 16. Persistence Across Subscription Changes

The principle:

> **Memory PERSISTS on downgrade**

must be retained and reconciled with the new architecture.

The architecture must explicitly distinguish:

### Persistence

Whether organisational intelligence continues to exist.

### Entitlement

Whether a user or organisation is currently entitled to access particular capabilities or information.

### Capability

What Kira can currently do.

### Commercial Subscription

What the organisation is currently paying for.

A subscription ending must not automatically imply deletion of organisational intelligence.

At the same time, persistence of intelligence does not imply perpetual free access to Kira services.

The commercial model remains an independent concern.

---

# 17. Resolve Existing Architectural Contradictions

Before implementation, Kira Coding must explicitly review the following existing decisions.

## D1 — "Kira is a project that finishes"

This directly conflicts with:

> "Kira persists with the organisation."

D1 must not be silently ignored.

Kira Coding must determine whether:

- D1 is superseded;
- D1 refers only to an implementation/project phase;
- or D1 requires reinterpretation.

This must become an explicit architectural decision.

---

## D2 — "Maintain rate at 1/3 of build rate"

This must be reviewed against the persistence model.

The architecture must determine whether this refers to:

- maintenance of the Kira capability;
- maintenance of the organisational intelligence layer;
- ongoing service;
- or commercial subscription pricing.

Architecture must not infer the answer.

---

## D14 — KIRA ADMIN as entitlement source of truth

Retain the principle unless a later decision supersedes it.

The architecture must additionally determine how:

- organisation;
- engagement;
- consultant;
- user;
- subscription;
- and entitlement

relate without creating competing sources of truth.

---

## D20 — Memory persists on downgrade

This is aligned with the target architecture and should be treated as a foundational principle.

---

# 18. Do Not Conflate Architecture With Commercial Model

Kira's commercial model remains independently governed.

The architecture must support the existing distributor ecosystem, including relationships involving:

- brokers;
- accountants;
- advisors;
- consultants;
- introducers;
- and other channels.

A consultant engagement may become a future product capability.

It must not automatically replace the current distributor SaaS model.

The architecture must therefore distinguish:

```text
Commercial Channel
        ↓
Customer / Organisation
        ↓
Kira
        ↓
Organisational Intelligence
```

from:

```text
Organisation
        ↓
Engagement
        ↓
Consultant
        ↓
Intervention
        ↓
Organisational Intelligence
```

These structures may intersect, but they are not identical.

---

# 19. P0 — Required Architectural Work

Kira Coding must work in the following order.

## P0.1 — Reconcile the Genome

Establish the canonical Business Genome.

Deliver:

- canonical schema;
- canonical write path;
- legacy systems identified;
- migration strategy;
- ownership of each data structure;
- removal/deprecation plan.

---

## P0.2 — Define Persistent Organisational Identity

Establish the canonical relationship:

```text
Organisation
    ↓
Persistent Kira Intelligence
```

Define:

- organisation identity;
- Kira identity;
- ownership;
- subscription;
- entitlement;
- capability.

These must not be conflated.

---

## P0.3 — Define Lifecycle Separation

Formally model:

1. Kira Capability Lifecycle
2. Business Lifecycle
3. Ownership Lifecycle
4. Engagement Lifecycle
5. Commercial Subscription Lifecycle

Document the transitions between them.

---

## P0.4 — Define Decision → Action → Outcome → Learning

Establish the domain contracts.

Determine:

- existing substrate;
- new entities required;
- relationships;
- provenance;
- APIs;
- event model;
- migration approach.

---

## P0.5 — Define Organisational State Transitions

Design:

```text
State T1
 → Intervention
 → Decision
 → Action
 → Outcome
 → State T2
 → Learning
```

Determine how this is represented persistently.

---

## P0.6 — Define Assessment → Genome

Establish the contract by which the initial assessment creates persistent organisational facts.

The initial assessment must become the initial organisational state, with explicit provenance.

---

# 20. P1 — Subsequent Architectural Work

After P0 is resolved, address:

### P1.1 — Engagement Model

Define the engagement domain without altering the existing introducer model unless explicitly authorised.

### P1.2 — Ownership Transitions

Create the temporal ownership model.

### P1.3 — Intervention Model

Represent human and system interventions.

### P1.4 — Causal Intelligence

Connect decisions, actions and outcomes to resulting organisational changes.

### P1.5 — Learning Model

Represent explicit learning and its effect on the Business Genome.

### P1.6 — Historical State Reconstruction

Allow Kira to reconstruct organisational state at a meaningful historical point.

### P1.7 — Permission and Entitlement Boundaries

Ensure persistent intelligence does not imply unrestricted access.

---

# 21. Required Audit Classification

Every discovered architectural issue must be classified.

Use the following categories:

| Classification | Meaning |
|---|---|
| A | Existing architecture already satisfies requirement |
| B | Existing substrate can satisfy requirement with minor change |
| C | Contract/API change required |
| D | Data model change required |
| E | Migration required |
| F | Behavioural change required |
| G | Documentation/decision change required |
| H | Test coverage required |
| I | Architectural decision required |
| J | New domain capability required |

The audit must not describe missing functionality as "existing substrate" merely because adjacent functionality exists.

---

# 22. Required Evidence Standard

For every architectural assertion, Kira Coding must distinguish between:

### Existing

Implemented and demonstrably used.

### Partial

Some implementation exists but does not satisfy the complete architectural requirement.

### Derived

Produced dynamically rather than persisted as canonical organisational state.

### Planned

Documented but not implemented.

### Missing

No meaningful implementation exists.

### Contradictory

Existing implementation or decision conflicts with the target architecture.

This distinction is mandatory.

---

# 23. The 10-Document Implementation Package

The executive priority sequence above does **not** replace the detailed implementation package.

The following documents must be retained or recreated as the implementation specification.

## 1. Canonical Domain Model

Define:

- Organisation;
- Ownership;
- Engagement;
- Consultant;
- Kira;
- Subscription;
- Entitlement;
- Decision;
- Action;
- Outcome;
- Learning;
- Intervention;
- Organisational State.

---

## 2. Genome Reconciliation Specification

Document:

- competing genome systems;
- authoritative structures;
- data ownership;
- write paths;
- migration;
- deprecation.

---

## 3. API / Contract Impact Analysis

Identify every affected:

- API;
- service;
- edge function;
- agent;
- orchestrator;
- database contract;
- frontend contract.

---

## 4. Lifecycle Specification

Define the five lifecycle domains and their interactions.

---

## 5. Organisational State / Temporal Model

Define how historical state and state transitions are represented.

---

## 6. Decision → Action → Outcome → Learning Specification

Define the complete causal feedback loop.

---

## 7. Assessment → Genome Specification

Define exactly how initial assessment information becomes persistent organisational knowledge.

---

## 8. Migration Analysis

Define:

- existing records affected;
- compatibility;
- backfill;
- migration order;
- rollback;
- legacy behaviour.

---

## 9. Test Impact Analysis

Define tests required for:

- persistence;
- downgrade;
- ownership change;
- engagement closure;
- new engagement;
- genome writes;
- supersession;
- provenance;
- historical state;
- decision/action/outcome/learning.

---

## 10. Architectural Decision Register

Record every decision that resolves a contradiction or ambiguity.

No major architectural assumption should remain implicit.

---

# 24. Testing the Core Principle

The architecture is not complete until the following scenarios can be represented and tested.

## Scenario A — Consultant Leaves

```text
Organisation
   ↓
Consultant A
   ↓
Intervention
   ↓
Knowledge added
   ↓
Engagement ends
```

Expected:

> Organisational intelligence remains.

---

## Scenario B — Consultant Returns

```text
Consultant A
   ↓
Leaves
   ↓
Time passes
   ↓
Returns
```

Expected:

> Kira can provide appropriate historical organisational context.

---

## Scenario C — New Consultant Arrives

```text
Consultant A
   ↓
Engagement ends

Consultant B
   ↓
New engagement
```

Expected:

> Consultant B can work from the organisation's accumulated intelligence without incorrectly inheriting Consultant A's private context.

---

## Scenario D — Ownership Changes

```text
Owner A
   ↓
Business sale
   ↓
Owner B
```

Expected:

> Organisational intelligence survives the ownership transition, subject to appropriate access and governance rules.

---

## Scenario E — Subscription Downgrade

Expected:

> Organisational intelligence persists.

Access and capabilities may change according to entitlement.

---

## Scenario F — Decision Produces Outcome

```text
Decision
   ↓
Action
   ↓
Outcome
   ↓
Learning
   ↓
Genome update
```

Expected:

> The organisation becomes measurably more informed as a consequence of experience.

---

# 25. Architectural Non-Negotiables

The following principles are now mandatory unless explicitly superseded by a recorded architectural decision.

### 1. One canonical Business Genome.

### 2. Kira's organisational intelligence belongs to the organisation.

### 3. Kira does not belong to an individual consultant.

### 4. Engagement is distinct from organisation.

### 5. Consultant is distinct from introducer.

### 6. Subscription is distinct from organisational identity.

### 7. Entitlement is distinct from persistence.

### 8. Ownership is distinct from organisational identity.

### 9. Historical organisational meaning must survive change.

### 10. Provenance must accompany important organisational knowledge.

### 11. Assessment must become persistent initial organisational state.

### 12. Decision, Action, Outcome and Learning must eventually become first-class concepts.

### 13. Genome mutation history is not by itself sufficient causal history.

### 14. Existing architecture must not be described as implemented merely because adjacent substrate exists.

### 15. New domain concepts must be explicitly identified before implementation.

---

# 26. What Kira Coding Must Not Do

Until this architecture is resolved, Kira Coding must **not**:

- create a second genome;
- create an alternative organisational identity;
- repurpose introducers as consultants without an architectural decision;
- make subscription the owner of organisational intelligence;
- make users the owner of organisational intelligence;
- treat task results as the complete outcome model;
- treat memory records as the complete decision model;
- claim genome mutation history represents intervention causality;
- silently supersede D1;
- implement consultant-specific features before defining the engagement domain;
- or perform broad refactoring without the migration and contract impact analysis.

---

# 27. Definition of Architectural Completion

This architectural phase is complete when Kira Coding can answer, with documented implementation decisions:

1. **What is the canonical organisation?**
2. **What is the canonical Business Genome?**
3. **What exactly belongs to the organisation?**
4. **How does Kira persist with it?**
5. **How is ownership represented and changed?**
6. **What is an engagement?**
7. **What is an intervention?**
8. **What is a decision?**
9. **What is an action?**
10. **What is an outcome?**
11. **What is learning?**
12. **How does learning change organisational state?**
13. **How is assessment converted into initial state?**
14. **How is historical state reconstructed?**
15. **How is provenance maintained?**
16. **What happens when a consultant leaves?**
17. **What happens when a consultant returns?**
18. **What happens when a new consultant arrives?**
19. **What happens when ownership changes?**
20. **What happens when a subscription changes?**
21. **What happens when Kira capabilities change?**
22. **Which existing architectural decisions must be superseded or retained?**
23. **Which parts already exist?**
24. **Which parts are partial?**
25. **Which parts are genuinely new?**
26. **What is the migration path?**
27. **What must be tested before implementation proceeds?**

---

# 28. Final Architectural Direction

Kira's architectural evolution is:

```text
VOICE AGENT
     ↓
AI ASSISTANT
     ↓
MEMORY-ENABLED ASSISTANT
     ↓
BUSINESS INTELLIGENCE SYSTEM
     ↓
PERSISTENT ORGANISATIONAL INTELLIGENCE
```

The destination is not a smarter chatbot.

The destination is an intelligence layer that allows an organisation to **retain, accumulate, contextualise and compound what it learns over time**.

Consultants, advisors, owners, employees and agents may all contribute to that intelligence.

They do not own it.

The organisation does.

Therefore the governing architectural principle for all subsequent Kira development is:

> **People and engagements change. The organisation's intelligence persists.**

And the governing engineering test is:

> **If the people, engagement, ownership, subscription or Kira capability changes, can the organisation's accumulated intelligence survive with its meaning and provenance intact?**

If the answer is not demonstrably yes, the architecture is not yet complete.