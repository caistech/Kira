# KIRA — P1 Production Architecture Derivation

**Status:** READY TO EXECUTE
**Purpose:** Derive the production architecture required to implement the frozen canonical model
**Scope:** Full-stack forensic audit + architecture derivation — no code changes
**Date:** 26 August 2026
**Prerequisite:** P0 CLOSED (P0.1 through P0.7 all PASS; 18/20 invariants confirmed; INV-003 and INV-016 PARTIAL/non-blocking)
**Phase Boundary:** P1 = architecture discovery. No production code changes. Deliverables are four architecture documents.

---

## 1. Phase Boundary

### P0 — CLOSED

Canonical organisational reality established.

- P0.1 — Canonical model frozen (`docs/KIRA — Canonical Organisational Model.md`)
- P0.5 — Authority rebinding complete; legacy authority retired
- P0.6 — Schema-level implementation traceability established (18/20 CONFIRMED)
- P0.7 — Knowledge-layer semantics defined and verified
- INV-003 and INV-016 remain PARTIAL (documented limitations, non-blocking)

### P1 — THIS PHASE: Production Architecture Derivation

No coding. No schema changes. No migrations. No deployment.

The deliverable from P1 is **four architecture documents**, not modified production code.

P1 is an **architecture-discovery phase**, not an architecture-design phase. The canonical model tells us what must be true. The repository audit tells us what currently exists. P1.3 is where those two are compared and the actual production architecture is derived.

P1 must be allowed to discover that the existing architecture is substantially wrong. We do not pre-design the solution for it.

### P2 — NEXT: Build That Machinery

P2 will begin only after P1 is CLOSED and the four architecture documents have been reviewed.

---

## 2. Governing Principle

The canonical organisational model (`docs/KIRA — Canonical Organisational Model.md`) is frozen and is the architectural authority.

> **Do not modify, reinterpret, simplify, or reconcile the canonical model to fit the existing implementation.**

Where the implementation conflicts with the canonical model, record the conflict. Do not change the canonical model to accommodate it.

---

## 3. The Central Architectural Test

The entire P1 phase is governed by one question:

> **If Kira itself were replaced tomorrow — the application, the agent, the tenant interface, all of it — would the Organisation and its governed organisational knowledge survive intact?**

If the answer is no, that is not a minor implementation issue. It means the current system has placed the organisational memory at the wrong architectural layer.

This is an architectural test, not a rhetorical question. P1 must answer it with evidence.

---

## 4. Rigid Sequencing

P1 proceeds in four strict phases. Each must complete before the next begins.

```text
P1.1 — Forensic Current State
        │
        ▼
P1.2 — Full-Stack Traceability (extends P0.6)
        │
        ▼
P1.3 — Required Production Architecture (derived, not designed)
        │
        ▼
P1.4 — Migration / Build Sequence
        │
        ▼
    P1 CLOSED
```

No phase may be skipped. No implementation changes at any point.

---

## 5. P1.1 — Forensic Current State Map

### Purpose

Produce a complete, evidence-based map of what exists in the Kira repository right now. Not what the docs say should exist. What actually exists in code.

### Scope

Every architectural domain that touches the canonical model:

| Domain | What to Map |
|--------|-------------|
| **Identity Resolution** | How does the system determine who is asking? How does it resolve to an Organisation? What code paths exist? What is deprecated? What is still active? |
| **People & Roles** | How are persons represented? How are roles assigned? Where are roles resolved at runtime? |
| **Ownership** | How is ownership recorded? Is temporal ownership supported? Can historical ownership be queried? |
| **Consultants** | How are consultant relationships modelled? How do they start, change, end? What access do consultants have? |
| **Engagements** | Do engagements exist as first-class objects in application code, or only in schema? How are they created, managed, progressed? |
| **Kira Instances** | How are instances modelled? How are they created, configured, replaced? What happens to knowledge when an instance changes? |
| **Subscriptions** | How are subscriptions managed? How do tier changes affect access? |
| **Commercial Arrangements** | How are commercial terms stored? Can they version? Can historical terms be recovered? |
| **Knowledge Layer** | The full lifecycle: interaction → evidence capture → knowledge extraction → governance → retrieval → use. Trace every file, function, agent tool, API route. |
| **Temporal Infrastructure** | What temporal patterns exist? What can be queried "as of" a point in time? What cannot? |
| **Access Control** | RLS policies, auth middleware, role checks, API-level guards. What is canonical? What is legacy? |
| **Agent/Tool Behaviour** | ElevenLabs agent configuration, tool definitions, prompt sections, webhook handlers. How do agents interact with the knowledge layer? |

### Output Format

For each domain:

```text
DOMAIN NAME

Current Implementation:
  ├── [file path] — [what it does]
  ├── [file path] — [what it does]
  └── ...

Database Objects:
  ├── [table] — [purpose]
  ├── [function] — [purpose]
  └── ...

Runtime Behaviour:
  └── [description of what actually happens at runtime]

Canonical Concept Mapped:
  └── [which canonical entity/concept this implements]
```

Every node must reference actual code locations (file path, line number where possible).

### What NOT to Do

- Do not re-audit P0.6 schema-level findings. P0.6 is an established baseline.
- Do not modify any files.
- Do not create new database objects.

---

## 6. P1.2 — Full-Stack Traceability Matrix

### Purpose

Extend P0.6's schema-level traceability into the full application stack: services, API handlers, agent tools, frontend components, knowledge pipeline, temporal behaviour, access control.

### Relationship to P0.6

P0.6 established schema-level conformance for all 20 invariants. That work is an existing baseline.

**P1.2 does not redo P0.6.** P1.2 uses P0.6 as established evidence and concentrates effort on:

- Application-layer behaviour (TypeScript services, API routes, middleware)
- Agent/tool behaviour (ElevenLabs tools, prompt sections, webhook handling)
- Knowledge pipeline behaviour (evidence capture, extraction, promotion, retrieval)
- Temporal behaviour at runtime (what can be queried as-of a point in time?)
- Access control at the application layer (beyond RLS)
- Consultant/engagement lifecycle in application code
- Instance independence at the application layer

### Traceability Matrix Format

**For each canonical concept:**

| Canonical Concept | Schema Location (from P0.6) | Application Layer | API Layer | Agent Layer | Frontend Layer | Conformance | Semantic Gaps | Conflicts | Risk |
|---|---|---|---|---|---|---|---|---|---|

**For each invariant:**

| Invariant | Schema (from P0.6) | Application Code | API Routes | Agent/Tools | Runtime Behaviour | Conformance | Gap | Risk | Evidence |
|---|---|---|---|---|---|---|---|---|---|

### Critical Investigation Areas

These are the areas where P1.2 must go deepest, because P0.6 did not cover them:

**Identity Resolution at Runtime:**
- Trace `getCurrentOrganisationContext()` through every call site
- Verify no code path bypasses canonical resolution
- Map the full auth → person → membership → organisation chain in application code

**Knowledge Promotion Pipeline:**
- Trace `business-genome/` extraction logic end to end
- How does evidence become knowledge?
- Where is provenance attached?
- Where is temporal context attached?
- What happens to knowledge when the source conversation is deleted?

**Agent/Tool Behaviour:**
- What tools does the ElevenLabs agent have?
- What do those tools read/write?
- How does the agent resolve organisational context?
- What happens to agent-captured knowledge when the agent is replaced?

**Temporal Behaviour:**
- What queries support point-in-time retrieval?
- What cannot be queried historically?
- Where does `is_current` get set? Is it derived or independent?

**Instance Independence:**
- What is coupled to a specific Kira instance?
- What would break if the instance were replaced?
- Is knowledge truly organisation-scoped at the application layer, or does it leak into instance-scoped code?

---

## 7. P1.3 — Required Production Architecture

### Purpose

Given the immutable canonical model and the forensic findings from P1.1 + P1.2, derive the production architecture that Kira must have.

### Critical Constraint

**Do not describe the current architecture.** Describe the target architecture that the canonical model demands.

This is where P1 must be allowed to discover that the existing architecture is substantially wrong. If the canonical model requires something the current system does not support, that is a finding, not a reason to soften the model.

### Structure

For each architectural domain:

```text
DOMAIN NAME

Current State:
  └── [what exists, from P1.1/P1.2]

Required State:
  └── [what the canonical model demands]

Gap:
  └── [what must change]

Dependencies:
  └── [what blocks what]

Architectural Decision Required:
  └── [any decision that must be made before implementation]
```

### Key Architectural Questions

P1.3 must answer these explicitly, with evidence from the audit:

1. **Can ownership history exist?** Can the system answer "who owned this organisation on 1 January 2025?"

2. **Can consultant relationships change without destroying history?** If Consultant A is replaced by Consultant B, does the organisation's knowledge survive intact?

3. **Can Kira instances be replaced?** If we deploy a completely new Kira application, does the organisation's knowledge transfer seamlessly?

4. **Can commercial terms change while preserving historical truth?** If pricing changes, can we recover what the pricing was before?

5. **For every piece of organisational knowledge:** Can the system answer who said it, when, in what context, whether it was observed/asserted/inferred/validated, whether it has been contradicted, and whether it is current or historical?

6. **Is organisational memory at the correct architectural layer?** Or is it coupled to a specific application, agent, or interface that could be replaced?

7. **Does the knowledge promotion pipeline preserve provenance end to end?** From raw conversation through extraction, governance, to retrieval?

8. **Can the system survive a complete consultant transition?** New consultant gets access to the organisation's full knowledge history, including knowledge produced by the previous consultant?

### Output

A complete target architecture document with:
- Architecture diagrams (text-based is fine)
- Component responsibilities
- Data flow descriptions
- Interface contracts
- Architectural invariants (non-negotiable properties the architecture must have)

---

## 8. P1.4 — Migration / Build Sequence

### Purpose

Derive the implementation sequence for moving from the current state to the required architecture.

### Constraints

- Must not begin until P1.3 is complete
- Must be ordered by dependency (what blocks what)
- Must identify risk at each step
- Must identify what can remain unchanged

### Structure

For each change:

| Change | What | Why | Dependencies | Risk | Can Remain? | Migration Required? | Tests Required? |
|---|---|---|---|---|---|---|---|

### Sequencing Rules

1. **Identity and authority first.** If organisational identity resolution is wrong, everything downstream is wrong.
2. **Knowledge layer second.** If knowledge is at the wrong architectural layer, it must move before anything else depends on it.
3. **Temporal infrastructure third.** If the system cannot answer "what was true at time T?", that capability must exist before historical data matters.
4. **Lifecycle management fourth.** Consultant, engagement, subscription, and commercial lifecycles must be correct before production use.
5. **Agent/tool alignment fifth.** The ElevenLabs agent and its tools must be aligned to the production architecture.
6. **Frontend alignment last.** The UI must reflect the production architecture, not the legacy architecture.

### What P1.4 Must NOT Do

- Must not estimate effort or timelines
- Must not assign work to people or sessions
- Must not begin implementation
- Must not modify production code

---

## 9. Completion Criteria

### P1 is complete when:

- [ ] P1.1 — Current-State Architecture Map is written and every node references actual code
- [ ] P1.2 — Full-Stack Traceability Matrix covers all 9 concepts and all 20 invariants at the application/runtime layer
- [ ] P1.2 — Extends P0.6 rather than redoing it; P0.6 schema findings are cited as established baseline
- [ ] P1.3 — Required Production Architecture is derived from the canonical model, not from the current implementation
- [ ] P1.3 — The central architectural test is answered with evidence (instance independence)
- [ ] P1.3 — Every architectural gap is documented with the canonical invariant it violates
- [ ] P1.4 — Migration/build sequence is ordered by dependency
- [ ] P1.4 — Each step identifies risk, dependencies, and test requirements
- [ ] No production code has been modified during P1
- [ ] No canonical model has been modified during P1
- [ ] All four documents exist in `docs/`

### P1 Failure Condition

If P1.3 determines that the current architecture cannot be incrementally migrated to the required architecture — that the gap is too large for a step-by-step approach — that finding must be recorded honestly. A "rewrite" recommendation is a valid P1 output, not a P1 failure.

---

## 10. Deliverables

Write the four artifacts as:

1. `docs/KIRA — P1.1 Current-State Architecture Map.md`
2. `docs/KIRA — P1.2 Full-Stack Traceability Matrix.md`
3. `docs/KIRA — P1.3 Required Production Architecture.md`
4. `docs/KIRA — P1.4 Migration and Build Plan.md`

---

## 11. Instruction to Kira Coding

The following is the verbatim instruction to be sent to Kira Coding:

---

> **P1 — Derive Production Architecture from Frozen Canonical Model**
>
> P0 is CLOSED. The canonical organisational model (`docs/KIRA — Canonical Organisational Model.md`) is frozen and is the architectural authority.
>
> Do not modify, reinterpret, simplify, or reconcile the canonical model to fit the existing implementation.
>
> Your task is to inspect the complete Kira repository and derive the production architecture required to implement the canonical model faithfully.
>
> **P0.6 is an established baseline.** Schema-level traceability for all 9 concepts and 20 invariants has been completed. Do not redo that work. Use P0.6 as established evidence and extend it into the application, runtime, agent, and knowledge-pipeline layers.
>
> Perform a forensic audit of the current implementation across the full stack: database schema, TypeScript types, API route handlers, service layers, agent/tool definitions, frontend components, knowledge pipeline logic, auth/identity resolution, webhook handlers, and temporal behaviour at runtime.
>
> For each canonical entity, relationship, temporal requirement, knowledge requirement, and INV-001 through INV-020, determine:
>
> - Where it exists in application code (not just schema)
> - Whether it conforms semantically to the canonical model
> - Where it is partially implemented or incorrectly collapsed
> - Where organisational identity is anchored (should be `organisations` table; verify no code path uses `user_id` or `kira_instance_id` as identity anchor)
> - What temporal capabilities exist at runtime
> - What provenance exists at the application layer
> - Whether the implementation is instance-independent
>
> Then derive the required production architecture. Do not describe the current architecture. Describe the architecture the canonical model demands. P1 must be allowed to discover that the existing architecture is substantially wrong.
>
> Then derive the migration/build sequence, ordered by dependency.
>
> Produce:
>
> 1. **P1.1 — Current-State Architecture Map** — forensic map of what exists, every node traced to actual code
> 2. **P1.2 — Full-Stack Traceability Matrix** — extends P0.6 into application/runtime layers
> 3. **P1.3 — Required Production Architecture** — derived from canonical model, not current implementation
> 4. **P1.4 — Migration / Build Plan** — ordered by dependency, with risk at each step
>
> The central architectural test is:
>
> **Can Kira preserve an Organisation's identity, history and governed organisational knowledge independently of changes to people, ownership, consultants, engagements, subscriptions, commercial arrangements and Kira instances?**
>
> Treat the answer as an architectural test, not a rhetorical question.
>
> Where the current implementation conflicts with the canonical model, record the conflict. Do not change the canonical model to accommodate it.
>
> No production code changes during this phase. Deliverables are architecture documents only.

---

## 12. Phase Boundary Summary

| Phase | Purpose | Status |
|-------|---------|--------|
| **P0** | Define what Kira must preserve (canonical organisational reality) | **CLOSED** |
| **P1** | Derive what machinery must exist to preserve it (production architecture) | **READY TO EXECUTE** |
| **P2** | Build that machinery (implementation) | **PENDING P1 COMPLETION** |

We are at P1.
