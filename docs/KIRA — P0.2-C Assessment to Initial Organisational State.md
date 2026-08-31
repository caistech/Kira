# KIRA — P0.2-C Assessment → Initial Organisational State

**Status:** Architectural Foundation
**Purpose:** Define how the assessment seeds Kira's first representation of the organisation
**Scope:** Assessment pipeline, evidence governance, initial state creation
**Date:** 26 August 2026

---

## 1. Purpose

The purpose of this artifact is to define the **canonical pipeline** by which assessment evidence becomes Kira's first structured representation of the organisation.

The governing principle is:

> **The assessment is not the organisation's history. It is an epistemic observation of the organisation at T₀.**

The assessment establishes the starting point of the organisational state machine. It creates State(T₀) — the initial known state — from which all subsequent state transitions (Causal, Observational, Epistemic, Administrative) will be measured.

---

## 2. What the Assessment Produces

The assessment produces structured organisational knowledge. It does NOT produce organisational truth.

The model distinguishes four layers:

### 2.1 Assessment Evidence

Raw, verbatim responses from the person completing the assessment. These are the **source material** from which organisational knowledge is derived.

**Characteristics:**
- Verbatim or near-verbatim capture
- Never altered or interpreted
- Retained as evidence
- Attributed to the person who provided it
- Timestamped

### 2.2 Assertions

Claims made by the person completing the assessment. These are the person's **stated beliefs** about the organisation.

**Characteristics:**
- Derived from assessment evidence
- Attributed to the person who made the claim
- Carry confidence based on the person's authority and clarity
- May be superseded by later evidence
- May be contradicted by later evidence

### 2.3 Inferences

Knowledge derived by Kira from the assessment evidence through interpretation. These are Kira's **derived understanding** of the organisation.

**Characteristics:**
- Derived from assertions and evidence through interpretation
- Attributed to Kira's inference process
- Carry lower confidence than assertions (Kira inferred, not the person stated)
- Explicitly marked as inferences, not assertions
- May be superseded by later evidence or direct statements

### 2.4 Initial State

The structured organisational knowledge at T₀, composed of assertions and inferences with confidence levels and provenance.

**Characteristics:**
- Composed of assertions and inferences
- Each element has provenance (who said it, when, in what context)
- Each element has confidence (how certain)
- Each element has status (current, superseded, historical)
- Represents the first known state of the organisation in Kira's model

---

## 3. The Two Assessment Mechanisms

The codebase currently has two distinct assessment mechanisms. They serve different purposes and should not be conflated.

### 3.1 Pre-Signup Assessment (13 Questions)

**Purpose:** Rapid capture of the owner's initial understanding of the business. Produces valuation inputs and baseline organisational knowledge.

**Characteristics:**
- Completed before Kira is engaged
- ~13 questions about the business
- Self-reported (the owner's own view)
- Produces `business_valuations.inputs` (JSONB blob)
- Used for valuation calculation
- Creates the initial genome baseline via `lib/genome/baseline.ts`

**Target architecture:**
- The 13 questions produce Assessment Evidence
- Each answer becomes an Assertion (owner stated X)
- Kira derives Inferences from the assertions (owner's answer implies Y about the business)
- Initial state is created from assertions + inferences
- The assessment is the FIRST WRITER into the canonical Business Genome

### 3.2 Ongoing Genome Assessment (52-Item Checklist)

**Purpose:** Structured assessment of the organisation's state across 52 items in 9 areas. Used to evaluate knowledge quality, identify gaps, and drive conversation planning.

**Characteristics:**
- Completed during the Kira relationship
- 52 items across 9 areas
- Status per item: open, weak, answered
- Quality scores and gap analysis
- Used for conversation planning and knowledge governance
- Creates `genome_item_status` records

**Target architecture:**
- The genome assessment is an ONGOING assessment, not a one-time event
- Each assessment creates a Knowledge State assessment at a point in time
- The assessment results are stored as organisational knowledge, not as user-level evaluation
- The assessment drives conversation planning (what to ask next)
- The assessment tracks knowledge maturity over time

### 3.3 Relationship Between the Two

```
Pre-Signup Assessment (13 Questions)
    │
    ├── Evidence
    │
    ├── Assertions (owner stated X about their business)
    │
    ├── Inferences (Kira derived Y from the assertions)
    │
    └── Initial State (T₀)
            │
            ▼
        State Machine begins
            │
    ┌───────┴───────┐
    ▼               ▼
  Conversations   Ongoing Assessment
    │               │
    ├── Evidence     ├── Assertions
    ├── Inferences   ├── Knowledge Quality
    └── State        └── Gap Analysis
        Transitions
```

The pre-signup assessment seeds the state machine. The ongoing assessment evaluates the state machine's maturity. They are not the same thing.

---

## 4. Assessment → Genome Mapping

The pre-signup assessment must write into the canonical Business Genome. This is the critical architectural requirement from P0.1 and P0.2-B.

### 4.1 Current Gap

The current implementation stores assessment inputs in `business_valuations.inputs` (JSONB blob) and derives baselines at render time via `lib/genome/baseline.ts`. The baselines are NOT persistent organisational facts. They are ephemeral projections.

### 4.2 Target Architecture

The assessment must produce **persistent organisational facts** in the genome tables.

```
Assessment Evidence
    ↓
Assertion Extraction
    ↓
Genome Fact Creation
    ↓
Initial Organisational State (T₀)
```

Each genome fact created from the assessment must have:
- **source_type:** 'assessment'
- **source_id:** reference to the assessment record
- **observed_at:** timestamp of the assessment
- **status:** 'candidate' (not yet confirmed by further evidence)
- **confidence:** derived from the person's authority and clarity
- **provenance:** "asserted by [Person] during initial assessment at [time]"

### 4.3 Genome Fact Provenance

The assessment creates genome facts with explicit provenance:

```
Fact: "Owner stated annual revenue is approximately $8M"
Provenance:
  source_type: 'assessment'
  source_id: assessment_record_id
  observed_at: 2026-08-26
  confidence: 0.8
  attribution: Person: Dennis
  relationship: self-reported
  status: 'candidate'
```

This fact is:
- Attributed to Dennis (the Person who stated it)
- Marked as self-reported (not independently verified)
- Marked as a candidate (may be superseded by evidence)
- Dated (observed_at reflects when the statement was made)

---

## 5. Assessment Evidence Governance

The assessment evidence governance layer enforces the P0.1 requirement that Kira distinguish what it knows from what it merely heard.

### 5.1 Evidence Types

| Type | Definition | Confidence Modifier | Example |
|------|-----------|-------------------|---------|
| Self-reported | Person stated X about their organisation | 0.7 (owner may be biased) | "Revenue is $8M" |
| Externally verified | Third party confirmed X | 0.95 (external validation) | "Accountant confirmed revenue" |
| Kira inferred | Kira derived X from evidence | 0.6 (inference, not statement) | "Systems are documented" |
| Document observed | Document contains X | 0.9 (document is authoritative) | "Contract says X" |
| Conversation extracted | Conversation surfaced X | 0.65 (conversation, not assertion) | "Owner mentioned X in chat" |

### 5.2 Confidence Calculation

Each genome fact created from assessment has a confidence score derived from:

```
Base Confidence (per evidence type)
    × Authority Modifier (who provided the evidence)
    × Clarity Modifier (how clearly was it stated)
    × Consistency Modifier (does it conflict with other evidence)
    = Final Confidence
```

### 5.3 Supersession

Assessment-derived facts may be superseded by later evidence:

```
Fact: "Revenue is $8M" (from assessment, confidence 0.8)
    ↓
Later Evidence: "Revenue is $12M" (from accountant, confidence 0.95)
    ↓
Supersession: Fact: "Revenue is $8M" → superseded by "Revenue is $12M"
    ↓
Historical truth: "At T₀, the owner stated revenue was $8M"
```

The assessment-derived fact is not deleted. It becomes historical. The new fact supersedes it with higher confidence.

---

## 6. Initial State (T₀)

The initial state is the structured organisational knowledge at T₀, composed of:

### 6.1 State Composition

```
State(T₀)
    │
    ├── Assertions from assessment
    │     ├── What the owner stated about the business
    │     ├── What the owner implied about the business
    │     └── What the owner did NOT say (gaps)
    │
    ├── Inferences from assessment
    │     ├── What Kira derived from the assertions
    │     ├── What Kira inferred about the business structure
    │     └── What Kira guessed about the business capabilities
    │
    ├── Knowledge Quality Assessment
    │     ├── What areas have high confidence
    │     ├── What areas have low confidence
    │     ├── What areas have no information
    │     └── What gaps need to be addressed
    │
    └── Provenance Record
          ├── Assessment date
          ├── Person who provided the assessment
          ├── Confidence levels per fact
          ├── Evidence types per fact
          └── Transition type: Epistemic (first observation)
```

### 6.2 State Representation

The initial state is represented as a snapshot of the organisational genome at T₀:

```
Organisation: [Organisation ID]
State Timestamp: T₀
Transition Type: Epistemic
Evidence Source: Pre-Signup Assessment
Person: [Person ID]
Confidence: Aggregate confidence of all assessment-derived facts

Genome Areas:
  - Operations: [facts, confidence, gaps]
  - Pricing: [facts, confidence, gaps]
  - Customers: [facts, confidence, gaps]
  - Demand: [facts, confidence, gaps]
  - Cash: [facts, confidence, gaps]
  - Assets: [facts, confidence, gaps]
  - Systems: [facts, confidence, gaps]
  - People: [facts, confidence, gaps]
  - Compliance: [facts, confidence, gaps]
```

### 6.3 Transition Type

The initial state creation is an **Epistemic Transition**:

```
New Evidence (assessment responses)
    ↓
Belief Revision (Kira creates initial model)
    ↓
Knowledge State Change (genome facts created)
    ↓
Representation Change (State T₀ established)
```

This is NOT a Causal Transition because:
- Kira did not cause the assessment (the person completed it)
- Kira did not cause the organisational state (it already existed)
- Kira merely observed and structured what was already true

---

## 7. Relationship to the State Machine

The initial state (T₀) establishes the baseline from which all subsequent state transitions are measured.

```
State(T₀) ← Assessment Evidence
    │
    ▼
Conversations / Engagements / External Events
    │
    ├── Causal Transitions (interventions that change the organisation)
    │     └── Decision → Action → Outcome → Learning → State(T1)
    │
    ├── Observational Transitions (external events observed)
    │     └── External Event → Evidence → Knowledge Update → State(T2)
    │
    ├── Epistemic Transitions (Kira's understanding changes)
    │     └── New Evidence → Belief Revision → State(T3)
    │
    └── Administrative Transitions (metadata corrections)
          └── Authorised Change → State(T4)
```

The initial state is the starting point. All subsequent transitions build on it.

---

## 8. Non-Negotiable Rules

1. **Assessment is epistemic, not historical.** The assessment produces Kira's first observation of the organisation, not the organisation's history.

2. **Assessment evidence must be persistent.** Raw assessment responses must be retained as evidence, not discarded after genome fact creation.

3. **Assertions must be attributed.** Every assertion from the assessment must be attributed to the person who made it, with timestamp and context.

4. **Inferences must be marked.** Kira's inferences from assessment evidence must be explicitly marked as inferences, not assertions.

5. **Confidence must be explicit.** Every genome fact from the assessment must carry a confidence score derived from evidence type and authority.

6. **Supersession must be supported.** Assessment-derived facts may be superseded by later evidence. Historical facts must not be destroyed.

7. **Gaps must be identified.** What the person did NOT say about the business must be identified and tracked as knowledge gaps.

8. **The genome is the canonical target.** Assessment evidence must write into the genome tables (`genome_entities`, `genome_facts`), not into ephemeral projections.

9. **Provenance is mandatory.** Every genome fact from the assessment must have provenance (source_type, source_id, observed_at, attribution).

10. **The initial state is State(T₀).** The assessment establishes the baseline from which all subsequent state transitions are measured.

---

## 9. Non-Goals

1. This artifact does **not** define the Engagement domain. That is P0.2-D.

2. This artifact does **not** define the database schema for assessment storage. That is an implementation concern.

3. This artifact does **not** define the conversation-to-knowledge pipeline. That is the voice memory loop.

4. This artifact does **not** define the ongoing genome assessment mechanics. That is the genome coverage/quality system.

5. This artifact does **not** define the commercial terms of the assessment. That is a business concern.

---

## 10. Impact on P0.2-D

The initial state (T₀) is the baseline that Engagements will operate on. Engagements will:

1. **Consume** organisational knowledge from the initial state
2. **Produce** new organisational knowledge through interventions
3. **Supersede** initial state facts with higher-confidence evidence
4. **Enrich** the state with knowledge from the engagement

The initial state is therefore the foundation for P0.2-D (Engagement Domain Specification).

---

*This artifact is ready to serve as the basis for P0.2-D (Engagement Domain Specification).*
