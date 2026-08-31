# Phase 5D — kira_memory Semantic Inventory & Remediation Matrix

**Status:** Phase 5D — Semantic Inventory & Remediation Matrix: ACCEPTED

---

## Executive Summary / Key Architectural Finding

> **kira_memory is not one semantic thing.** It is currently a mixed operational / evidentiary / candidate / Genome state store.  
> Remediation must separate **semantic disposition** from **ownership**, **provenance**, **temporal state**, and **promotion** — before any column changes.

This finding is the anchor for the entire Phase 5D artifact. The seven `memory_type` values do not map 1:1 to dispositions; a single `memory_type` can traverse multiple dispositions over its lifecycle. Similarly, `genome_section` is a classification marker, not a promotion gate. The reader boundary (`user_id`) is the most urgent structural violation (INV-020).

---

## 5D.1 Semantic Inventory — Seven memory_type Categories

| memory_type | Observed Meaning | Primary Disposition(s) | Notes |
|-------------|------------------|------------------------|-------|
| `context` | Conversation-scoped state, working context, transient facts | Operational | Written by `uid-tools.ts`, `apply-profile.ts`; short-lived |
| `decision` | Explicit decisions made during conversation | Evidence → Candidate | Promotable via `confirm.ts`; `parked_reason` tracks confirmation state |
| `insight` | Derived understanding, pattern recognition | Evidence → Candidate | Genome classifier may elevate; `genome_section` set on promotion |
| `correction` | User corrections to prior memory | Evidence / Operational | Can demote or invalidate prior records |
| `followup` | Pending actions, open loops | Operational | Retained until resolved; not promotable |
| `goal` | Stated objectives, desired outcomes | Operational → Candidate | May become organisational goal if validated |
| `profile` | User/organisation preferences, identity attributes | Operational | `apply-profile.ts` writer; sticky but not organisational knowledge |

---

## 5D.2 Disposition Taxonomy (Target Governance Lifecycle)

Disposition is **not identical to `memory_type`**. A record's disposition evolves through a promotion pipeline. It will be implemented using a **controlled disposition vocabulary**, not a simple enum.

| Disposition | Definition | Entry Criteria | Exit Criteria | Example Sources |
|-------------|------------|----------------|---------------|-----------------|
| **Operational** | Live conversation state, working memory, preferences | Written by any writer with `memory_type ∈ {context, followup, profile, goal}` | Conversation ends / profile updated / goal achieved | `uid-tools.ts`, `apply-profile.ts`, `kira/create` |
| **Evidence** | Raw conversation-derived material, unvalidated | `memory_type ∈ {decision, insight, correction}` written; no `confirmed_outcome` | Validated via `confirm.ts` OR invalidated via `correction` | `confirm.ts` (pre-confirmation), `kira/create` |
| **Candidate** | Validated evidence, awaiting organisational adoption | `confirmed_outcome = true` AND `genome_section IS NULL` | Promoted to Governed OR demoted to Evidence | `confirm.ts` (post-confirmation) |
| **Governed** | Organisational knowledge, contextualised, attributed | Promoted from Candidate via explicit governance action | Superseded / archived | Future: `organisational_knowledge` table |
| **Technical** | System-internal markers, debugging, migration artifacts | `parked_reason` system values, migration tags | Cleanup / migration complete | Migration scripts, debug tooling |
| **Unknown** | Unclassified, schema drift, null `memory_type` | Any record not matching above | Re-classified or purged | Data quality issues |

**Promotion Rule:** Classification ≠ Promotion. Genome classification (`genome_section = <area_key>`) does not automatically equal Governed organisational knowledge.

---

## 5D.3 Marker Semantics

These fields currently carry implicit state-machine semantics. They must be documented and eventually made explicit.

| Field | Current Semantics | States / Values | Implicit Transitions |
|-------|-------------------|-----------------|---------------------|
| `genome_section` | Genome classification stratum | `NULL` = unclassified candidate<br>`'none'` = explicit non-Genome<br>`<area_key>` = Genome-classified (9 areas) | `NULL` → `<area_key>` via classifier; `<area_key>` → `'none'` via redact |
| `parked_reason` | Confirmation / lifecycle state | `'pending_confirmation'`, `'confirmed'`, `'rejected'`, `'superseded'`, `'genome_derived'`, `'genome_redacted'` | `confirm.ts` mutates; `genome/derive.ts` & `genome/redact.ts` mutate |
| `confirmed_outcome` | Boolean validation gate | `true` / `false` / `null` | `confirm.ts` sets `true`; `correction` may set `false` |
| `tags` | Free-form categorisation | Arbitrary strings | Writer-dependent; no controlled vocabulary |
| `importance` | Priority / retention signal | Integer (1–10 observed) | Heuristic; not tied to disposition |
| `active` | Soft-delete / retention flag | `true` / `false` | Set `false` on supersede / archive |

**Critical Observation:** `parked_reason` conflates *confirmation state* with *Genome lifecycle state*. These must be separated.

---

## 5D.4 Writer Remediation Matrix

| Writer | Current Behaviour | Semantic Issue | Target Behaviour |
|--------|-------------------|----------------|------------------|
| `uid-tools.ts` | Writes all 7 types with mixed semantics | No explicit disposition; `user_id` scoped | Write Operational only; tag disposition explicitly |
| `apply-profile.ts` | Writes `context` (operational/profile state) | Retains profile as Operational indefinitely | Retain if Operational; separate profile store for Canonical |
| `kira/create` | Seeds context; blurs instance/organisation boundary | Ownership ambiguous | Verify organisation ownership at write; set `organisation_id` |
| `confirm.ts` | Mutates via `parked_reason` | Implicit confirmation state; conflates with Genome | Explicit promotion/provenance semantics; separate `confirmation_status` |
| `genome/derive.ts` | Mutates `parked_reason` to `'genome_derived'` | Genome lifecycle mixed into memory | Isolate Genome state; write to `genome_classification` table |
| `genome/redact.ts` | Mutates `parked_reason` to `'genome_redacted'` | Same as above | Isolate Genome state; soft-delete classification only |

**Unified Writer Contract (Target):**
- Every write MUST specify: `disposition`, `provenance`, `organisation_id` (not `user_id`), `temporal_state`
- `memory_type` becomes a *facet*, not the primary classifier

---

## 5D.5 Reader Remediation Matrix (Critical — INV-020 Violation)

| Reader | Current Ownership | Problem | Target Ownership |
|--------|-------------------|---------|------------------|
| `recall.ts:68` | `.eq('user_id', conv.user_id)` | Person-scoped; violates organisational subject primacy | Organisation-scoped operational memory; `organisation_id` filter |
| `confirm.ts` | `user_id` scoped | Person-scoped mutation | Organisation + authorised actor (role-based) |
| `genome/derive.ts` | `user_id` scoped classification | Classification reads person-scoped | Organisation-scoped Genome derivation |
| Webhook → `recall.ts` | Delegates to `recall` | Inherits reader problem | Inherit corrected organisation context |

**INV-009 / INV-010 / INV-020 Alignment:**  
Kira's memory belongs conceptually to the **organisation**, not to a particular conversation, person, consultant, subscription, or software instance. All readers must filter by `organisation_id` and respect authorisation boundaries, not `user_id`.

---

## 5D.6 Promotion Boundary Specification

```
Conversation (ephemeral)
        │
        ▼
kira_memory (mixed store)
        │
        ├── Operational ──────▶ (expires / archived)
        │
        ├── Evidence (raw, unvalidated)
        │        │
        │        ▼ validation / confirmation (confirm.ts)
        │        ├── rejected ──▶ Evidence (archived)
        │        │
        │        ▼ confirmed_outcome = true
        │   Candidate (validated, awaiting adoption)
        │        │
        │        ▼ explicit governance action
        │   Governed Organisational Knowledge
        │        │
        │        ▼ contextualised interpretation
        │   organisational_knowledge table (future)
        │
        └── Genome Classification (orthogonal axis)
                 │
                 ▼ classifier / derive
            genome_section = <area_key>
                 │
                 ▼ (does NOT auto-promote to Governed)
            Candidate or Governed (separate decision)
```

### Crucial Rules
1. **Classification ≠ Promotion.** `genome_section = <area_key>` marks *relevance to a Genome area*, not organisational adoption.
2. **Genome ≠ Governed.** Genome-classified material may remain Candidate indefinitely.
3. **Organisational Knowledge = Contextualised Interpretation.** Derived from Evidence + Candidate, not simply "everything Kira has heard."
4. **Provenance Chain Required.** Every Candidate → Governed promotion must carry: source conversation, validator, timestamp, governance action reference.

**Terminology Note:** The Evidence → Candidate → Governed Organisational Knowledge lifecycle is the *target governance lifecycle* for the Kira implementation. It is not an immutable canonical-domain definition. The Canonical Organisational Model defines the semantic distinction between conversation/evidence and contextualised organisational knowledge; the implementation lifecycle operationalises that distinction.

---

## 5D.7 Provenance Model (Conceptual)

| Field | Purpose | Required At |
|-------|---------|-------------|
| `source_conversation_id` | Traceability to origin | Evidence creation |
| `validated_by` | Actor who confirmed | Candidate creation |
| `validated_at` | Timestamp of confirmation | Candidate creation |
| `promoted_by` | Governance actor | Canonical promotion |
| `promoted_at` | Timestamp of promotion | Canonical promotion |
| `governance_ref` | Link to approval record | Canonical promotion |
| `organisation_id` | Ownership anchor | **All writes** (replaces `user_id`) |

---

## 5D.8 Temporal Semantics Classification

| Temporal Class | memory_type Examples | Retention | Disposition Flow |
|----------------|---------------------|-----------|------------------|
| **Ephemeral** | `context`, `followup` | Conversation TTL | Operational → Archive |
| **Sticky Operational** | `profile`, `goal` | Until superseded | Operational (long-lived) |
| **Evidentiary** | `decision`, `insight`, `correction` | Until validated/invalidated | Evidence → Candidate → Canonical/Archive |
| **Genome-Classified** | Any with `genome_section ≠ NULL` | Indefinite (classification) | Orthogonal to promotion |

---

## 5D.9 Genome Translation Strategy

| Current State | Target State | Action |
|---------------|--------------|--------|
| `genome_section` in `kira_memory` | `genome_classifications` table (org_id, memory_id, area_key, classified_at, classified_by) | Extract; drop column |
| `parked_reason` Genome values | `genome_classifications.lifecycle_state` | Migrate; separate from confirmation |
| 9 Genome areas | Controlled vocabulary in `genome_areas` table | Define; reference by FK |

---

## 5D.10 Remediation Sequence (Phased)

| Phase | Scope | Deliverable |
|-------|-------|-------------|
| **5D Doc** | This document | ✅ Review / accept |
| **5E** | Schema migration | `organisation_id` column; **controlled disposition vocabulary**; `genome_classifications` table; provenance columns |
| **5F** | Writer refactor | All writers emit `organisation_id`, `disposition`, provenance |
| **5G** | Reader refactor | All readers filter by `organisation_id` + authz; deprecate `user_id` reads |
| **5H** | Promotion pipeline | Explicit Candidate → **Governed** governance action; API + UI |
| **5I** | Genome separation | Move classification out of `kira_memory`; standalone service |
| **5J** | Cleanup | Drop `parked_reason` Genome values; drop `genome_section`; archive legacy |

---

## Completion Checklist

- [x] Semantic inventory discovered
- [x] Disposition taxonomy defined
- [x] Marker semantics documented
- [x] Writer remediation matrix prepared
- [x] Reader remediation matrix prepared (INV-020 critical path)
- [x] Promotion boundary specified
- [x] Provenance model specified
- [x] Temporal semantics classified
- [x] Genome translation strategy identified
- [x] **Phase 5D document reviewed & accepted**
- [ ] **Phase 5E schema migration planned**

---

## Phase 5D Acceptance Decision

**Status:** ACCEPTED

Phase 5D — kira_memory Semantic Inventory & Remediation Matrix is accepted as the architectural baseline for remediation of the existing kira_memory implementation.

The forensic discovery establishes that kira_memory currently combines multiple semantic concerns, including operational state, evidentiary material, candidate knowledge and Genome classification. These concerns must not be resolved by further overloading memory_type.

The accepted architectural direction is:

- memory_type becomes a semantic facet rather than the primary lifecycle classifier.
- Memory disposition is represented explicitly through a controlled vocabulary.
- Persistent organisational memory is anchored to organisation_id, not user_id.
- Person identity and organisational ownership/access are treated as separate concepts.
- Confirmation state is separated from Genome lifecycle state.
- Genome classification is treated as an orthogonal classification axis and does not constitute promotion to governed organisational knowledge.
- Provenance and temporal semantics are explicit requirements for material organisational knowledge.
- Promotion from evidence/candidate material to governed organisational knowledge requires an explicit governance boundary.
- Historical organisational truth must remain recoverable.
- No implementation change may redefine or weaken the canonical organisational model.

The proposed Evidence → Candidate → Governed Organisational Knowledge lifecycle is accepted as the target governance lifecycle, not as an immutable canonical-domain definition.

The next phase is Phase 5E — Schema Migration Planning.

Phase 5E must determine the concrete database representation, migration sequencing, compatibility strategy, organisation-context resolution mechanism, provenance fields, Genome extraction model, and rollback/test strategy.

No production code changes are authorised by this acceptance.

---

## Phase 5E — Scope & Structure

Phase 5E should produce a Schema Migration Design document structured around:

### 5E.1 Current Schema
Precisely document kira_memory:
- columns, constraints, indexes, RLS, foreign keys, triggers, dependent objects

### 5E.2 Target Schema
Define the target semantic model:
- kira_memory: organisation_id, memory_type, disposition, provenance, temporal state, operational fields
- Separate Genome structures

### 5E.3 Organisation-Context Resolution
Define exactly how Person → Conversation → Kira Instance → Organisation relate when a memory write occurs.

### 5E.4 Migration Mapping
For every existing kira_memory row, establish the mapping to:
- organisation_id
- disposition
- provenance
- temporal classification
- Genome extraction
Including rows that cannot be confidently classified.

### 5E.5 Legacy Compatibility
Determine how existing writers/readers continue operating during migration.

### 5E.6 RLS / Authorisation
Treated as part of schema migration design, not postponed, because changing the ownership anchor without securing the new anchor could create a dangerous intermediate state.

### 5E.7 Migration Sequencing
Only after those decisions should we produce the actual SQL migration.

---

**Next Action:** Begin Phase 5E Schema Migration Design. No production code changes.