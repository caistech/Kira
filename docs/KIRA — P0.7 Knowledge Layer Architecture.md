# KIRA — P0.7 Knowledge Layer Architecture

**Status:** Architectural Foundation
**Purpose:** Define the semantic contract for governed organisational knowledge
**Scope:** Knowledge Object model, Provenance, Epistemic State, Temporal Semantics
**Date:** 26 August 2026
**Prerequisite:** P0.5 (canonical authority established), P0.6 (implementation traceability complete)

---

## 1. Architectural Boundary

This document establishes the semantic contract for P0.7 — the knowledge layer architecture. It is deliberately independent of existing `kira_knowledge` table structure, per the canonical model's requirement that implementation must not redefine canonical meaning.

### The Core Distinction (INV-010)

```
CONVERSATION (Evidence)          ≠    ORGANISATIONAL KNOWLEDGE (Memory)
─────────────────────────────────────────────────────────────────────────
Raw interaction history               Interpreted, contextualised
What was said                         What the organisation knows
Ephemeral (conversation ends)         Persistent (organisational truth)
Contains contradictions               Resolved contradictions
No provenance context                 Full provenance chain
No temporal semantics                 Effective-from/to, current/historical
User-scoped                           Organisation-scoped
Kira Instance-scoped                  Organisation-scoped (survives instances)
```

### Architectural Principle

> **Do not design the new knowledge layer as a better version of kira_knowledge. Design it independently, then determine how existing conversation-derived records map into the new architecture.**

---

## 2. Knowledge Object Model

### 2.1 What Constitutes Organisational Knowledge

Organisational knowledge is an **interpreted, contextualised organisational fact, belief, decision, relationship, capability, constraint, preference, process or other meaningful organisational knowledge object**.

**First-class knowledge types:**

| Type | Description | Example |
|------|-------------|---------|
| `fact` | Verified organisational fact | "Revenue is $2.4M AUD" |
| `belief` | Held belief about the organisation | "The board prefers conservative growth" |
| `decision` | Organisational decision | "Decided to acquire Company X" |
| `relationship` | Organisational relationship | "Supplier to Company Y" |
| `capability` | Organisational capability | "Has ISO 27001 certification" |
| `constraint` | Organisational constraint | "Cannot operate in Victoria" |
| `preference` | Organisational preference | "Prefers email over phone" |
| `process` | Business process knowledge | "AP requires dual sign-off >$10k" |
| `risk` | Known organisational risk | "Key person dependency in finance" |
| `opportunity` | Identified opportunity | "Expansion into NZ market feasible" |
| `lesson` | Learning from experience | "Q3 project overran due to scope creep" |

### 2.2 What Is NOT Organisational Knowledge

| Not Knowledge | Why | How It's Handled |
|---------------|-----|------------------|
| Raw conversation transcript | Evidence, not knowledge | Retained as evidence/source |
| Temporary statement | "Let me think..." | Not stored |
| Contradicted information | Superseded by resolution | Historical state, not current |
| Personal opinion | May not reflect organisation | Epistemic state: `opinion` |
| Speculation | Not validated | Epistemic state: `speculative` |
| Outdated information | Temporal boundary expired | Historical, not current |

### 2.3 Knowledge Object Structure

```typescript
interface OrganisationalKnowledgeObject {
  // Identity
  knowledge_id: string;                    // UUID, primary key
  organisation_id: string;                 // FK to organisations (INV-020)
  
  // Content
  knowledge_type: KnowledgeType;           // fact, belief, decision, etc.
  subject: string;                         // What this knowledge is about
  predicate: string;                       // The relationship/property
  object: string;                          // The value or target
  object_type: ObjectType;                 // structured_value, reference, text
  object_value: any;                       // Structured value if applicable
  object_metadata: Record<string, any>;    // Currency, units, references
  
  // Epistemic State (Section 3)
  epistemic_state: EpistemicState;         // asserted, observed, inferred, etc.
  confidence: number;                      // 0.0 - 1.0 (optional)
  
  // Temporal Semantics (Section 4) — PRECISE DATE SEMANTICS
  supplied_at: Date;                       // When information was provided to Kira
  observed_at: Date | null;                // When the information was observed (if different from supplied)
  effective_from: Date;                    // When this became believed effective (may differ from supplied_at)
  effective_to: Date | null;               // When this ceased being believed
  is_current: boolean;                     // Materialised view (DERIVED from effective_from/to)
  
  // Provenance (Section 3.1) — MULTI-EVIDENCE SUPPORT
  source_type: SourceType;                 // conversation, document, observation, etc.
  evidence_ids: string[];                  // Multiple evidence sources via knowledge_evidence_links
  supplied_by: string | null;              // Who provided this (person_id)
  engagement_id: string | null;            // Which engagement produced/validated this
  ownership_period_id: string | null;      // Which ownership period this relates to
  kira_instance_id: string | null;         // Which instance captured this (optional)
  
  // Governance (validation, supersession)
  validated_by: string | null;             // Who validated this knowledge
  validated_at: Date | null;               // When validated
  superseded_by: string | null;            // FK to newer knowledge object
  supersession_reason: string | null;      // Why superseded
  
  // Derivation (Knowledge → Knowledge for inferred knowledge)
  derived_from_ids: string[];              // Knowledge objects this was derived from
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  created_by: string;                      // person_id or system
}
```

---

## 3. Provenance and Epistemic State

### 3.1 Provenance Chain — Multi-Evidence Support

Every knowledge object must answer:

| Question | Field | Purpose |
|----------|-------|---------|
| **Who** provided this? | `supplied_by` → person_id | Human source |
| **When** was it provided? | `supplied_at` | Temporal context |
| **In what context?** | `engagement_id` | Professional context |
| **Was it directly observed?** | `epistemic_state` = `observed` | Direct evidence |
| **Was it inferred?** | `epistemic_state` = `inferred` | Derived knowledge |
| **Was it confirmed?** | `validated_by`, `validated_at` | Validation chain |
| **Has it been contradicted?** | `superseded_by`, `supersession_reason` | Resolution chain |
| **Why does Kira believe it?** | `epistemic_state` + confidence | Epistemic justification |
| **What engagement produced it?** | `engagement_id` | Professional context |
| **What ownership period?** | `ownership_period_id` | Historical context |
| **What evidence supports it?** | `knowledge_evidence_links` | Multi-evidence provenance |
| **What knowledge was it derived from?** | `derived_from_ids` | Knowledge derivation chain |

### 3.2 Epistemic States

```typescript
type EpistemicState = 
  | 'asserted'        // Stated, not verified
  | 'observed'        // Directly witnessed/observed
  | 'inferred'        // Derived from other knowledge
  | 'validated'       // Confirmed by evidence or authority
  | 'disputed'        // Conflicting claims exist
  | 'superseded'      // Replaced by newer knowledge
  | 'historical'      // Was true, no longer current
  | 'opinion'         // Expressed belief (NOT speculative)
  | 'unknown';        // State not determined
```

**Note:** An `opinion` is a legitimate organisational belief (e.g., "The founder believes the company should remain family owned"). It is NOT the same as `speculative` which implies uncertain projection.

### 3.3 Confidence Scoring

| Range | Interpretation | Use Case |
|-------|---------------|----------|
| 0.0 - 0.3 | Low confidence | Speculative, early stage |
| 0.3 - 0.6 | Medium confidence | Inferred, partially validated |
| 0.6 - 0.8 | High confidence | Validated by multiple sources |
| 0.8 - 1.0 | Very high confidence | Directly observed, confirmed |

---

## 4. Temporal Semantics

### 4.1 Precise Date Semantics (CRITICAL)

The temporal model must distinguish between conceptually different timestamps:

| Date Field | Definition | Example |
|------------|-----------|---------|
| `supplied_at` | When information was provided to Kira | 26 Aug 2026 |
| `observed_at` | When the information was observed (may differ from supplied) | 1 Jul 2026 |
| `effective_from` | When this became believed effective (may differ from supplied_at) | 1 Jul 2026 |
| `effective_to` | When this ceased being believed | NULL (current) or 14 Oct 2026 |
| `validated_at` | When validated by authority | 28 Aug 2026 |

**Example:**

```
Knowledge: "Revenue is $2.4M AUD"
  supplied_at: 26 Aug 2026 (when told to Kira)
  observed_at: 1 Jul 2026 (when revenue was observed)
  effective_from: 1 Jul 2026 (when this became effective truth)
  validated_at: 28 Aug 2026 (when confirmed)
  effective_to: NULL (currently true)
```

### 4.2 is_current Derivation Rule

**CRITICAL INVARIANT: `is_current` is DERIVED from `effective_from`/`effective_to`, NOT an independent source of truth.**

```typescript
// DERIVATION RULE
is_current := effective_to IS NULL OR effective_to > NOW()
```

**Invalid states (must be prevented by constraints or application logic):**

| State | Meaning | Problem |
|-------|---------|---------|
| `effective_to = '2026-08-20'` AND `is_current = TRUE` | Contradiction | Historical but marked current |
| `effective_to = NULL` AND `is_current = FALSE` | Contradiction | Current but marked historical |

### 4.3 Effective Dating

Every knowledge object has temporal boundaries:

```
effective_from  ──────── believed true ──────── effective_to
                      │                              │
                      └──────────────────────────────┘
                         Current knowledge window
```

### 4.4 Knowledge States Over Time

| State | effective_from | effective_to | is_current | Meaning |
|-------|---------------|--------------|------------|---------|
| Current | Set | NULL | TRUE (derived) | Currently believed true |
| Historical | Past | Past | FALSE (derived) | Was true, now superseded |
| Future | Future | NULL | FALSE (derived) | Will become true |
| Permanent | Past | Far future | TRUE (derived) | Long-term truth |

### 4.3 Supersession Chain

When knowledge is superseded:

```
Knowledge A (current)
    │
    ├── superseded_by ──→ Knowledge B (new)
    │                          │
    │                          └── supersedes: Knowledge A
    │
    └── effective_to: Date B was accepted
```

### 4.4 Contradiction Handling

When conflicting knowledge exists:

```
Knowledge X (asserted)
    │
    └── conflicts_with ──→ Knowledge Y (asserted)
         │                      │
         └── epistemic_state: 'disputed'
              │
              └── resolution: Knowledge Z (validated)
                   │
                   └── supersedes: X, Y
```

---

## 5. Migration Boundary Design

### 5.1 Current State Analysis

**Existing tables:**
- `kira_knowledge` — conversation chunks treated as knowledge
- `genome_entities` — structured knowledge (entities)
- `genome_facts` — structured knowledge (facts with predicates)
- `genome_relationships` — entity relationships
- `genome_events` — entity events
- `kira_memory` — memory blocks

**Current problems:**
1. `kira_knowledge` conflates conversation with knowledge (INV-010 violation)
2. No epistemic state tracking
3. Limited provenance (only `user_id`)
4. No temporal semantics beyond `created_at`
5. No supersession/contradiction tracking

### 5.2 Migration Strategy

**Principle:** Promote, don't relabel.

| Source | Target | Strategy |
|--------|--------|----------|
| `genome_entities` | `organisational_knowledge` | Direct mapping (already structured) |
| `genome_facts` | `organisational_knowledge` | Map predicates to knowledge objects |
| `kira_knowledge` | **EVIDENCE** (not knowledge) | Becomes source material |
| `kira_memory` | Evaluate for promotion | Some may be knowledge, some evidence |
| Conversation transcripts | **EVIDENCE** | Retained as evidence, not knowledge |

### 5.3 Evidence Table (New)

```typescript
interface Evidence {
  evidence_id: string;
  organisation_id: string;
  evidence_type: 'conversation' | 'document' | 'observation' | 'import' | 'other';
  source_ref: string;                    // FK to conversations, uploaded doc, etc.
  captured_by: string;                   // person_id who captured
  captured_at: Date;
  engagement_id: string | null;
  kira_instance_id: string | null;
  metadata: Record<string, any>;
}
```

### 5.4 Knowledge Promotion Pipeline

```
Raw Conversation/Evidence
        │
        ▼
┌─────────────────────────┐
│   Evidence Extraction   │
│   (NLP/LLM processing) │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Candidate Knowledge   │
│   (Proposed facts/      │
│    beliefs/decisions)   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Knowledge Governance  │
│   - Validation          │
│   - Deduplication       │
│   - Conflict resolution │
│   - Confidence scoring  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Organisational Knowledge│
│  (Canonical knowledge   │
│   objects)              │
└─────────────────────────┘
```

---

## 6. Semantic Contract

### 6.1 The Test

The knowledge layer succeeds if Kira can answer:

> **What does the organisation know, why does it believe it, when did it learn it, who/what established it, what engagement produced or validated it, and is it still current — without reconstructing the answer from raw conversation history?**

### 6.2 Required Query Patterns

| Query | Required Fields | Purpose |
|-------|-----------------|---------|
| "What does the organisation know about X?" | subject, predicate | Knowledge retrieval |
| "When did we learn Y?" | effective_from | Temporal origin |
| "Who told us Z?" | supplied_by | Provenance |
| "Is this still true?" | is_current, effective_to | Temporal currency |
| "Why do we believe W?" | epistemic_state, confidence | Justification |
| "What engagement produced V?" | engagement_id | Professional context |
| "What was believed at time T?" | effective_from, effective_to | Historical view |
| "What knowledge conflicts with U?" | conflicts_with | Contradiction detection |

### 6.3 Invariant Compliance

| Invariant | How P0.7 Addresses It |
|-----------|----------------------|
| INV-009 | Knowledge objects use `organisation_id` FK, not `kira_instance_id` |
| INV-010 | Conversation is evidence; knowledge is governed organisational memory |
| INV-011 | Full provenance chain: supplied_by, engagement_id, ownership_period_id |
| INV-012 | Temporal semantics: effective_from/to, is_current, supersession |
| INV-017 | Knowledge survives instance replacement via organisation_id FK |
| INV-020 | All knowledge anchored to organisation, not person or instance |

---

## 7. Next Steps

| Step | Purpose | Output |
|------|---------|--------|
| P0.7.1 | Define schema for knowledge objects | SQL migration |
| P0.7.2 | Define schema for evidence table | SQL migration |
| P0.7.3 | Define knowledge promotion pipeline | API/edge functions |
| P0.7.4 | Define temporal query patterns | SQL functions, API routes |
| P0.7.5 | Define migration from existing data | Data migration script |
| P0.7.6 | Verification gates | Verification documents |

---

*This architecture establishes the semantic contract for governed organisational knowledge. It is independent of existing table structures and follows the canonical model's requirement that implementation must not redefine canonical meaning.*