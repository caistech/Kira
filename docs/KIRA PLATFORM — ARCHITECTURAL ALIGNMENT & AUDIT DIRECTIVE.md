# KIRA PLATFORM — ARCHITECTURAL ALIGNMENT & AUDIT DIRECTIVE

**Status:** Governing architectural direction  
**Audience:** Kira-coding / implementation agent  
**Purpose:** Align the Kira platform, Orchestrator, Agents and CAIS Shared Services with the updated Business Genome / Corporate Memory architecture before further implementation changes are made.

---

## 1. Purpose of This Directive

The Kira architecture has evolved materially.

The original implementation model treated Kira primarily as an AI assistant, with memory, orchestration, assessment and subscription functionality organised around the Kira product.

The current architecture is different.

Kira is now understood as an **intelligence and interaction layer operating over a persistent, business-owned knowledge and memory system**.

The free assessment, paid Kira, Orchestrator, Agents and CAIS Shared Services must therefore be aligned around a single canonical architecture.

**Do not begin by rewriting the HLD or changing code.**

First perform an architectural audit against the model defined in this document.

The objective is to discover:

- what already conforms
- what partially conforms
- what contradicts the model
- what is missing
- where responsibilities currently sit incorrectly
- what must change
- what dependencies those changes create
- how the changes can be implemented safely and incrementally

Only after this audit has been reviewed should implementation changes begin.

---

# 2. Governing Architectural Principle

The following principle is the primary architectural rule for the Kira platform:

> **Kira does not own the business's memory. Kira is the intelligence and interaction layer operating over a persistent, business-owned Corporate Memory and Business Genome. The Orchestrator executes actions and produces outcomes. CAIS Shared Services provides the durable, governed system of record. Kira continuously interprets and enriches that record.**

This principle must govern:

- architecture
- database design
- service boundaries
- APIs
- agent design
- memory implementation
- orchestration
- assessment
- entitlements
- lifecycle management
- testing
- documentation

Any existing implementation that materially contradicts this principle must be identified during the audit.

Do not silently rationalise contradictions.

Flag them explicitly.

---

# 3. Canonical System Model

The platform should be understood as the following conceptual stack:

```text
                    HUMAN USERS
                         │
                         ▼
                ┌─────────────────┐
                │      KIRA       │
                │ Intelligence & │
                │ Interaction    │
                │     Layer       │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  ORCHESTRATOR   │
                │ Decision / Flow │
                │    Execution    │
                └────────┬────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        ┌───────────┐         ┌───────────┐
        │   AGENTS  │         │   ACTIONS │
        │ Specialist│         │ External /│
        │  Workers  │         │ Internal  │
        └─────┬─────┘         └─────┬─────┘
              │                     │
              └──────────┬──────────┘
                         ▼
                ┌─────────────────┐
                │ CAIS SHARED     │
                │    SERVICES     │
                │                 │
                │ Durable System  │
                │ of Record       │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ BUSINESS GENOME │
                │ +               │
                │ CORPORATE       │
                │ MEMORY          │
                │ + EVIDENCE      │
                │ + DECISIONS     │
                │ + OUTCOMES      │
                │ + LEARNING      │
                └─────────────────┘
```

This is a conceptual architecture, not necessarily a direct mapping to existing services.

The audit must determine how the current implementation maps onto this model.

---

# 4. The Business Genome Is Canonical

The **Business Genome** is the canonical structured representation of the business.

It is not a Kira-specific data model.

It is not an assessment model.

It is not a CRM model.

It is not merely a collection of conversational memories.

The Business Genome should progressively represent what the system knows about the business across its lifecycle.

The free assessment creates the initial Genome Seed.

Paid Kira progressively enriches that Genome.

Other systems and interactions may subsequently contribute to it.

Therefore:

```text
FREE ASSESSMENT
       │
       ▼
GENOME SEED
       │
       ▼
PAID KIRA
       │
       ▼
LIVING BUSINESS GENOME
       │
       ▼
BUSINESS INTELLIGENCE
       │
       ▼
OPERATING / SUCCESSION INTELLIGENCE
```

There must not be two independent models:

```text
Assessment Data Model
        +
Kira Data Model
```

which later require migration or reconciliation.

Instead:

```text
Assessment
    │
    ▼
Canonical Business Genome
    │
    ▼
Kira enrichment
```

The assessment is therefore the **first writer into the Business Genome**, not a separate product database that happens to feed Kira.

---

# 5. Corporate Memory Is Durable and Business-Owned

Corporate Memory is the durable record of what the organisation has learned, experienced, decided and done.

It must survive:

- Kira subscription changes
- changes to Kira capability
- changes in ownership
- changes in management
- changes in employees
- business growth
- business restructuring
- ownership transition
- sale of the business
- succession

The memory belongs conceptually to the **business**, not to the Kira subscription.

Kira provides intelligence over that memory.

Kira must therefore not be designed as though:

```text
Kira
  └── owns memory
```

Instead:

```text
Business
  │
  ├── Business Genome
  └── Corporate Memory
          ▲
          │
        Kira
```

---

# 6. Canonical Domain Objects

The architectural audit must establish explicit contracts for the following concepts.

## 6.1 Business Genome

The structured representation of the business and its evolving state.

It should capture canonical business facts, attributes, relationships, conditions, capabilities and other structured knowledge.

---

## 6.2 Corporate Memory

The durable record of organisational knowledge and experience.

It should include appropriate forms of:

- historical knowledge
- operational knowledge
- conversations
- decisions
- actions
- outcomes
- lessons
- evidence
- contextual information

Corporate Memory is broader than conversational memory.

---

## 6.3 Evidence

The provenance supporting a proposition, fact, conclusion or state.

Evidence should allow the system to understand:

- where information came from
- when it was obtained
- who or what supplied it
- how reliable it is
- whether it has subsequently been contradicted
- whether it remains current

The audit must determine how evidence and provenance are currently implemented.

---

## 6.4 Decision

A recorded organisational decision.

A decision is not merely a conversation.

It should be possible to establish, where appropriate:

- what was decided
- why
- when
- by whom
- based on what evidence
- what alternatives were considered
- what action followed
- what outcome resulted

---

## 6.5 Action

An instruction, task or operation performed by an agent, orchestrator or external system.

Actions must be distinguishable from decisions.

---

## 6.6 Outcome

The observed result of an action or decision.

Outcomes are critical because Kira must learn from what actually happened rather than merely remembering what was intended.

---

## 6.7 Learning

A change in the system's understanding resulting from evidence, outcomes, experience or correction.

Learning should be capable of enriching:

- the Business Genome
- Corporate Memory
- future decisions
- future actions
- confidence
- contextual interpretation

---

## 6.8 Context

The information required to interpret a fact, decision, action, conversation or situation correctly.

Context should not be conflated with memory.

---

## 6.9 Ownership Transition

A change in the ownership or control relationship associated with the business.

Examples include:

```text
Owner A
   ↓
Transaction
   ↓
Owner B
```

or:

```text
Founder
   ↓
Management succession
   ↓
New operating leadership
```

Ownership transition must be modelled independently from Kira subscription lifecycle.

---

## 6.10 Entitlement

The capability a user, organisation or account is authorised to access.

Entitlement controls access to Kira capabilities.

It must not determine ownership of the underlying Business Genome or Corporate Memory.

---

# 7. Three Independent Lifecycles

This distinction must be explicitly reflected in the architecture.

There are at least three independent lifecycles.

## 7.1 Kira Capability Lifecycle

```text
Free
  ↓
Paid
  ↓
Upgraded
  ↓
Downgraded
  ↓
Paused / Cancelled
  ↓
Reactivated
```

This represents access to Kira capabilities.

---

## 7.2 Business Lifecycle

```text
Startup
  ↓
Growth
  ↓
Mature
  ↓
Transition
  ↓
Exit
  ↓
Ongoing operation / new ownership
```

The exact states may evolve, but the architecture must not assume that business existence is equivalent to Kira subscription state.

---

## 7.3 Ownership Lifecycle

```text
Owner A
   ↓
Ownership transition
   ↓
Owner B
   ↓
Management succession
   ↓
Future ownership
```

Ownership may change while the business continues.

Kira capability may change while ownership remains unchanged.

The business may continue after a Kira subscription ends.

These are independent concepts.

---

# 8. Persistence Rule

The following architectural rule must be treated as mandatory:

> **The Business Genome and Corporate Memory survive all three lifecycles.**

Therefore the architecture must not implement:

```text
Kira subscription
      ↓
business memory
```

Instead:

```text
Business
   │
   ├── Business Genome
   └── Corporate Memory
          │
          ├── Kira capability
          ├── Orchestrator
          ├── Agents
          └── Other authorised systems
```

Subscription state determines capability.

It does not determine whether the business's institutional knowledge exists.

---

# 9. Assessment Architecture

The 13-question assessment is now formally part of the Genome architecture.

It is not merely:

```text
Lead qualification
        ↓
Score
        ↓
Sales conversion
```

It is:

```text
13 Questions
     ↓
Genome Seed Generation
     ↓
Initial Business Genome
     ↓
Kira enrichment
```

The assessment must therefore write into the same canonical Business Genome used by Kira.

The audit must identify:

- assessment data structures
- assessment persistence
- scoring models
- work-category models
- provenance
- confidence
- unanswered questions
- knowledge gaps
- contradictions
- ambiguity
- assessment-to-Genome mapping
- assessment-to-Kira handoff

Any duplicate business representation must be identified.

---

# 10. What Kira Is

Kira is the primary intelligence and interaction interface.

Kira:

- listens
- interprets
- retrieves context
- reasons over business knowledge
- asks questions
- identifies knowledge gaps
- identifies contradictions
- proposes decisions
- initiates actions
- reports outcomes
- enriches the Business Genome
- enriches Corporate Memory
- learns from outcomes

Kira is therefore an **active intelligence layer**.

However:

> Kira is not the authoritative owner of the underlying business record.

---

# 11. What the Orchestrator Is

The Orchestrator is the execution and coordination layer.

It should be responsible for:

- workflow execution
- task coordination
- agent selection
- sequencing
- dependencies
- retries
- execution state
- action routing
- outcome collection
- operational flow control

The Orchestrator must not become the de facto owner of Business Genome or Corporate Memory.

The audit must specifically identify places where:

```text
Orchestrator owns business state
```

when the canonical architecture requires:

```text
CAIS Shared Services
        ↓
Business state / memory
```

The Orchestrator should consume and update governed state through defined contracts rather than creating parallel authoritative state.

---

# 12. What Agents Are

Agents are specialist execution and reasoning components.

Agents may:

- inspect information
- retrieve knowledge
- reason about a domain
- perform specialised operations
- execute actions
- produce evidence
- produce outcomes
- identify learning

Agents should not independently create competing sources of truth.

Where an agent learns or discovers something material, the result should flow through the appropriate governed persistence contract.

---

# 13. What CAIS Shared Services Is

CAIS Shared Services should provide the durable, governed platform capabilities required across Kira and potentially other CAIS products.

This includes, as appropriate:

- identity
- tenancy
- Business Genome persistence
- Corporate Memory persistence
- evidence/provenance
- decisions
- actions
- outcomes
- learning
- entitlements
- auditability
- governance
- shared domain services

The audit must determine which of these capabilities already exist and which currently live incorrectly inside Kira or the Orchestrator.

The desired direction is:

```text
Kira
   │
Orchestrator
   │
Agents
   │
   ▼
CAIS Shared Services
   │
   ├── Business Genome
   ├── Corporate Memory
   ├── Evidence
   ├── Decisions
   ├── Actions
   ├── Outcomes
   ├── Learning
   ├── Entitlements
   └── Governance
```

---

# 14. RAG Is Not Corporate Memory

The audit must explicitly challenge any architecture that equates:

```text
RAG = Memory
```

RAG may be one retrieval mechanism.

It is not the definition of Corporate Memory.

Corporate Memory includes governed, structured and contextual information such as:

- facts
- evidence
- decisions
- actions
- outcomes
- historical events
- learning
- relationships
- provenance
- temporal state

RAG may retrieve portions of this information.

It does not replace the underlying model.

---

# 15. Memory Must Not Be Primarily Conversational

The architecture must not assume:

```text
Conversation
   ↓
Memory
```

as the complete memory model.

Instead:

```text
Evidence
   ↓
Interpretation
   ↓
Business Genome / Corporate Memory
   ↓
Decision
   ↓
Action
   ↓
Outcome
   ↓
Learning
   ↓
Genome / Memory enrichment
```

Conversations are one source of evidence.

They are not the entirety of organisational memory.

---

# 16. Contradictions, Ambiguity and Knowledge Gaps

The architecture must support the concepts already validated in the Kira plumbing tests.

The system must be able to represent and reason about:

- no knowledge
- extracted knowledge
- provenance
- contradictions
- ambiguity
- knowledge gaps
- questions that should be asked next

These are not merely conversational behaviours.

They are properties of the Business Genome / Corporate Memory learning system.

The audit must determine where these concepts currently live and whether they are persisted as durable governed state.

---

# 17. Required Architecture Audit

Before modifying implementation, Kira-coding must audit all relevant architectural and implementation surfaces.

At minimum:

```text
project.md

HLD

LLD

DECISIONS

Architecture diagrams

Database schema

Database migrations

Kira services

Kira voice agent

Kira APIs

Orchestrator

Agent registry

Agents

CAIS Shared Services

Memory implementation

Assessment

Assessment persistence

Assessment scoring

Business categories

Entitlements

Identity / tenancy

Tests

Integration tests

End-to-end tests

Configuration

Environment assumptions

Documentation
```

The audit must inspect both documentation and implementation.

Do not assume that documentation accurately represents the running system.

---

# 18. Phase 1 — Discover

Create an inventory of the current architecture.

For every relevant component identify:

- purpose
- location
- owner/service boundary
- inputs
- outputs
- persistence
- dependencies
- API contracts
- data contracts
- tests
- architectural assumptions

Produce a current-state map.

Do not modify implementation during this phase unless required to safely inspect or instrument it.

---

# 19. Phase 2 — Identify Contradictions

Search explicitly for assumptions that conflict with the new architecture.

At minimum identify every occurrence of assumptions equivalent to:

### Contradiction A

```text
Kira is a finite project
```

### Contradiction B

```text
Assessment is separate from Kira
```

### Contradiction C

```text
Payment creates the Kira/business relationship
```

### Contradiction D

```text
Memory belongs to Kira
```

### Contradiction E

```text
Memory is primarily conversational
```

### Contradiction F

```text
Exit is the end of the business lifecycle
```

### Contradiction G

```text
Owner is the permanent identity
```

### Contradiction H

```text
RAG equals memory
```

### Contradiction I

```text
Orchestrator owns business state
```

### Contradiction J

```text
Subscription lifecycle equals business lifecycle
```

### Contradiction K

```text
Subscription lifecycle equals ownership lifecycle
```

### Contradiction L

```text
Assessment has its own canonical business model
```

Every contradiction must be recorded rather than silently changed.

---

# 20. Phase 3 — Establish Canonical Contracts

Before implementation changes are made, define canonical contracts for:

```text
Business Genome
Corporate Memory
Evidence
Decision
Action
Outcome
Learning
Context
Ownership Transition
Entitlement
```

For each contract define:

- purpose
- authoritative owner
- persistence location
- identifiers
- relationships
- lifecycle
- provenance
- access rules
- mutation rules
- API/interface
- consumers
- producers
- test requirements

The objective is to establish one authoritative interpretation of each concept.

---

# 21. Ownership Matrix

Produce an explicit responsibility matrix.

At minimum:

| Capability | Kira | Orchestrator | Agents | CAIS Shared Services |
|---|---|---|---|---|
| Interaction | Own | — | — | — |
| Interpretation | Own | — | Support | — |
| Business Genome | Consume/enrich | Consume | Consume/enrich | **Authoritative** |
| Corporate Memory | Consume/enrich | Consume | Consume/enrich | **Authoritative** |
| Evidence | Produce | Consume | Produce | **Authoritative persistence** |
| Decision | Propose/interpret | Execute flow | Support | **Persist/govern** |
| Action | Initiate | Coordinate | Execute | Persist/audit |
| Outcome | Interpret | Collect/coordinate | Produce | Persist |
| Learning | Generate/interpret | — | Generate | Persist/govern |
| Workflow | — | **Own** | Execute | — |
| Agent selection | — | **Own** | — | — |
| Entitlement | Consume | Consume | Consume | **Authoritative** |
| Ownership | Interpret | — | — | **Authoritative** |
| Identity/Tenancy | Consume | Consume | Consume | **Authoritative** |

This matrix must be refined during the audit where necessary.

---

# 22. Implementation Mapping

For every architectural requirement produce the following mapping:

```text
Requirement
    ↓
Existing implementation
    ↓
Current architectural owner
    ↓
Correct architectural surface
    ↓
Required change
    ↓
Dependencies
    ↓
Migration considerations
    ↓
Tests affected
    ↓
New tests required
```

Do not jump directly from requirement to code change.

---

# 23. Change Classification

Every identified issue should be classified as one of:

```text
A — Already aligned

B — Documentation only

C — Contract/API change

D — Data model change

E — Service boundary change

F — Behavioural change

G — Migration required

H — Test coverage change

I — Architectural decision required
```

This allows implementation to be sequenced safely.

---

# 24. Migration Principle

Do not perform broad destructive rewrites simply to make the code appear architecturally clean.

Where existing structures contain valuable business data:

```text
Existing data
     ↓
Compatibility / migration layer
     ↓
Canonical model
```

should generally be preferred over immediate destructive replacement.

Data migration requirements must be identified before schema changes are implemented.

---

# 25. Documentation Alignment

After the canonical contracts are agreed, the following documentation must be brought into alignment:

```text
project.md
HLD
LLD
DECISIONS
Architecture diagrams
Database documentation
Service documentation
Agent documentation
Assessment documentation
Memory documentation
Entitlement documentation
Testing documentation
```

Documentation must describe the actual canonical architecture.

Do not maintain multiple competing architectural truths.

---

# 26. Testing Requirements

The new architecture must be reflected in tests.

At minimum, tests must verify:

### Genome

- assessment creates Genome Seed
- Kira enriches the same Genome
- Genome persists independently of subscription state

### Memory

- Corporate Memory persists independently of Kira capability
- memory is not restricted to conversations
- evidence has provenance
- decisions are distinguishable from actions
- actions produce outcomes
- outcomes can produce learning

### Knowledge

- no knowledge can be represented
- knowledge can be extracted
- provenance can be established
- contradictions can be represented
- ambiguity can be represented
- knowledge gaps can be represented
- next-best questions can be generated

### Lifecycle

- subscription changes do not destroy business memory
- ownership changes do not destroy business memory
- business lifecycle changes do not imply subscription changes
- ownership transition is independent of Kira entitlement

### Architecture

- Orchestrator does not become the authoritative business-memory store
- agents do not create competing sources of truth
- assessment does not create a separate canonical business model
- RAG is not treated as the memory system of record

---

# 27. Existing Plumbing Tests

The existing plumbing validation provides an important baseline.

The ten scenario suite has demonstrated that the current system can successfully support:

```text
1. Start with no knowledge
2. Extract from conversations
3. Establish provenance
4. Introduce contradictions
5. Introduce ambiguity
6. Create knowledge gaps
7. Ask what to ask next
8. [existing scenario]
9. [existing scenario]
10. [existing scenario]
```

The architecture audit must preserve the behaviours already validated by these tests.

Any architectural refactor that risks breaking these capabilities must identify that risk and add regression coverage before implementation.

The plumbing tests are therefore not disposable implementation tests.

They are evidence that core Genome / Memory behaviours are already emerging in the system.

---

# 28. Phase 4 — Produce the Architectural Gap Report

Before changing implementation, produce an explicit report containing:

## A. Current Architecture

What exists today.

## B. Target Architecture

What the canonical model requires.

## C. Contradictions

Where current implementation or documentation conflicts with the target.

## D. Missing Capabilities

What does not yet exist.

## E. Misplaced Responsibilities

What currently exists in the wrong service or layer.

## F. Data Model Gaps

What entities, relationships, provenance or lifecycle fields are missing.

## G. API / Contract Gaps

What interfaces need to change.

## H. Migration Requirements

What existing data or services need transition strategies.

## I. Testing Gaps

What tests need to be added or modified.

## J. Implementation Sequence

The safest order in which changes should occur.

---

# 29. Phase 5 — Implementation

**Do not begin this phase until Phases 1–4 have been completed.**

Implementation should proceed incrementally.

Preferred sequence:

```text
1. Canonical contracts
        ↓
2. Data model
        ↓
3. Shared-service persistence
        ↓
4. Service/API boundaries
        ↓
5. Assessment → Genome
        ↓
6. Kira integration
        ↓
7. Orchestrator integration
        ↓
8. Agent integration
        ↓
9. Lifecycle / entitlement separation
        ↓
10. Memory / learning behaviour
        ↓
11. Regression tests
        ↓
12. Documentation alignment
```

The exact sequence may change following the audit.

The implementation agent must justify significant deviations.

---

# 30. Architectural Non-Negotiables

The following must be treated as architectural constraints unless explicitly superseded by a documented Architecture Decision.

### 1.

**Kira does not own Business Memory.**

### 2.

**CAIS Shared Services provides the durable governed system of record.**

### 3.

**The Business Genome is canonical.**

### 4.

**The 13-question assessment writes directly into the canonical Business Genome.**

### 5.

**There is no separate assessment business model that later needs migration into Kira.**

### 6.

**Corporate Memory is broader than conversational memory.**

### 7.

**RAG is a retrieval mechanism, not the definition of memory.**

### 8.

**The Orchestrator executes and coordinates; it does not own canonical business state.**

### 9.

**Agents operate through governed contracts and do not create competing sources of truth.**

### 10.

**Subscription lifecycle, business lifecycle and ownership lifecycle are independent.**

### 11.

**Business Genome and Corporate Memory survive changes in Kira capability.**

### 12.

**Business Genome and Corporate Memory survive ownership transition.**

### 13.

**Evidence and provenance are first-class concepts.**

### 14.

**Decisions, actions, outcomes and learning are distinct concepts.**

### 15.

**Architecture changes must preserve validated Genome / Memory behaviours unless deliberately superseded.**

---

# 31. Decision Rule for Kira-Coding

When encountering an ambiguous architectural decision, apply this order of reasoning:

```text
1. Does this preserve the canonical Business Genome?
2. Does this preserve durable Corporate Memory?
3. Does this maintain clear ownership of system state?
4. Does this preserve provenance?
5. Does this preserve independent lifecycles?
6. Does this prevent competing sources of truth?
7. Does this preserve the separation between intelligence, orchestration and persistence?
8. Does this preserve existing validated behaviours?
```

If the answer is no, flag the issue rather than silently implementing it.

---

# 32. What Kira-Coding Must NOT Do

Do not:

- rewrite the HLD before auditing the implementation
- redesign the database based only on documentation
- move memory tables blindly
- merge services without understanding dependencies
- assume subscription equals business identity
- assume Kira owns the business record
- create another assessment model
- make the Orchestrator the memory owner
- equate RAG with Corporate Memory
- delete existing memory structures without migration analysis
- replace working plumbing merely because its implementation is not yet elegant
- make broad architectural changes without documenting the dependency chain

---

# 33. Required Deliverables Before Implementation

Kira-coding must first produce:

```text
01_CURRENT_STATE_ARCHITECTURE.md

02_ARCHITECTURAL_CONTRADICTIONS.md

03_CANONICAL_DOMAIN_CONTRACTS.md

04_OWNERSHIP_RESPONSIBILITY_MATRIX.md

05_IMPLEMENTATION_GAP_ANALYSIS.md

06_DATA_MIGRATION_ANALYSIS.md

07_API_CONTRACT_IMPACT.md

08_TEST_IMPACT_ANALYSIS.md

09_IMPLEMENTATION_SEQUENCE.md

10_ARCHITECTURE_DECISIONS_REQUIRED.md
```

These documents collectively form the architecture-audit package.

Only after this package has been produced and reviewed should implementation begin.

---

# 34. Final Governing Model

The target architecture can be summarised as:

```text
                    BUSINESS
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
   BUSINESS GENOME           CORPORATE MEMORY
          │                         │
          └────────────┬────────────┘
                       │
                CAIS SHARED SERVICES
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
     ORCHESTRATOR                GOVERNANCE
          │
      ┌───┴────┐
      ▼        ▼
   AGENTS    ACTIONS
      │        │
      └───┬────┘
          ▼
       OUTCOMES
          │
          ▼
       LEARNING
          │
          └──────────────► BUSINESS GENOME
                              +
                          CORPORATE MEMORY


             KIRA
              │
              ▼
      INTELLIGENCE &
       INTERACTION
              │
              ├──── reads Genome
              ├──── retrieves Memory
              ├──── reasons
              ├──── asks
              ├──── proposes
              ├──── initiates
              └──── enriches
```

And the lifecycle model is:

```text
             KIRA CAPABILITY
        Free → Paid → Changed
                    │
                    │
                    ▼
BUSINESS ─────────────────────────► continues
   │
   ├── Growth
   ├── Maturity
   ├── Transition
   └── Exit / Ongoing operation
                    │
                    ▼
             OWNERSHIP
        Owner A → Owner B
                    │
                    ▼
          MANAGEMENT SUCCESSION


Business Genome ──────────────────────────────► SURVIVES
Corporate Memory ─────────────────────────────► SURVIVES
```

---

# 35. The Core Architectural Statement

The Kira platform should ultimately be understood as:

> **A persistent Business Genome and Corporate Memory system, governed through CAIS Shared Services, with Kira providing the intelligence and human interaction layer, the Orchestrator coordinating execution, and Agents performing specialised reasoning and actions.**

The 13-question assessment creates the initial Genome Seed.

Kira progressively turns that seed into a Living Business Genome.

Interactions, evidence, decisions, actions, outcomes and learning progressively enrich Corporate Memory.

The business may change.

The owner may change.

Management may change.

Kira's commercial entitlement may change.

**The underlying Business Genome and Corporate Memory remain the durable institutional record of the business.**

That is the architectural foundation against which the Kira platform must now be audited and subsequently rebuilt.