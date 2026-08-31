# KIRA — P1.2 Full-Stack Traceability Matrix

**Status:** READY TO EXECUTE
**Purpose:** Trace every canonical concept and invariant through the production stack; identify precisely where semantic continuity is preserved, lost, duplicated or contradicted
**Scope:** Full production stack — database → service layer → API → authentication/authorisation → application state → UI
**Date:** 26 August 2026
**Prerequisite:** P1.1 COMPLETE; P0.6 schema-level baseline established
**Phase Boundary:** P1.2 = evidence collection and traceability only. No solution design. No fixes. No code changes.

---

## 1. What P1.2 Is

P1.2 answers the question:

> **How does information actually travel through the system, and where does the canonical model break?**

P1.1 answered: **What exists?**

P1.2 answers: **How does it behave at runtime, and where does the canonical semantics fail?**

P1.2 is not a list of suggested fixes. It is a forensic document. Its output must remain descriptive, not prescriptive.

---

## 2. What P1.2 Is NOT

P1.2 is NOT:
- A fix list
- An architecture design
- A migration proposal
- A solution recommendation
- A prioritised backlog

Those belong to later phases. P1.2 collects the evidence those later phases will need.

---

## 3. Four Tracing Requirements

P1.2 must trace four distinct things through the production stack.

---

### 3.1 Tracing Requirement 1 — Canonical Concepts (All Nine)

For each of the nine canonical concepts, trace the complete production path:

```
Canonical Concept
    │
    ▼
Database (table/columns/constraints)
    │
    ▼
Service/Repository Layer (TypeScript functions that read/write)
    │
    ▼
API Route (handler, request/response shape)
    │
    ▼
Authentication (how is the caller identified?)
    │
    ▼
Authorisation (how is access granted or denied?)
    │
    ▼
Application State (how is the data held in memory/state?)
    │
    ▼
UI (how is it rendered to the user?)
```

For each node in the chain, classify the implementation as one of:

| Classification | Meaning |
|----------------|---------|
| **CANONICAL** | Conforms to the frozen canonical model |
| **PARTIAL** | Implements some but not all of the canonical semantics |
| **LEGACY** | Implements the concept using a pattern that predates the canonical model |
| **DUPLICATED** | The concept exists in more than one place with different semantics |
| **CONFLICTING** | Two implementations of the same concept contradict each other |
| **ABSENT** | The concept has no implementation at this layer |
| **UNREACHABLE** | The concept exists in the database but has no application path to it |

For each classification, provide:
- File path and line number
- What the code does
- Why it receives that classification
- What canonical semantics are lost at that point

---

### 3.2 Tracing Requirement 2 — All 20 Invariants

For each invariant (INV-001 through INV-020), trace the complete runtime path that should enforce it:

```
INV-XXX
    │
    ▼
Schema enforcement (constraints, triggers, RLS)
    │
    ▼
Service layer enforcement (TypeScript guards, validations)
    │
    ▼
API route enforcement (auth checks, role checks)
    │
    ▼
Agent/tool enforcement (what the agent can/cannot do)
    │
    ▼
UI enforcement (what the user can/cannot see/do)
    │
    ▼
Runtime behaviour (what actually happens when the invariant is violated)
```

For each invariant, the output must establish:

| Layer | Enforcement | Gap |
|-------|-------------|-----|
| Schema | Does the database enforce this? | If not, what's missing? |
| Service | Does TypeScript code enforce this? | If not, what's missing? |
| API | Do route handlers enforce this? | If not, what's missing? |
| Agent | Do agent tools enforce this? | If not, what's missing? |
| UI | Does the frontend enforce this? | If not, what's missing? |
| Runtime | What actually happens at runtime? | Is there a violation path? |

**The conclusion for each invariant must not be simply "PASS" or "FAIL."**

It must establish:
- **Where** the invariant is enforced (specific file, line, function)
- **Where** the invariant is NOT enforced (specific gap)
- **Whether** the gap is exploitable at runtime
- **What** the runtime consequence is when the invariant is violated

For example, INV-009 (Memory/Instance separation) should not just say "FAIL."

It should say:
> The `organisational_knowledge` table has a nullable `kira_instance_id` FK (schema enforces separation). However, the `kira_memory` and `genome_*` tables have no `organisation_id` column — they are person-scoped only. The application's post-call pipeline (`lib/kira/convai.ts:89-120`) writes to `kira_memory` and then to `genome_*`, never to `organisational_knowledge`. The evidence table is never written to. Therefore, if the Kira instance were replaced, all operational memory (kira_memory) and structured knowledge (genome_*) would be orphaned because they are anchored to `user_id`/`agent_id`, not to `organisation_id`. The P0.7 schema provides the separation, but the application does not use it. The invariant is schema-enforced but application-broken.

---

### 3.3 Tracing Requirement 3 — Legacy → Canonical Paths

P1.1 established that Kira has two architectures living beside each other. P1.2 must explicitly map the boundary between them.

**Produce a Legacy/Canonical Bridge Map:**

```
LEGACY ARCHITECTURE                     CANONICAL ARCHITECTURE
(person/user-scoped)                    (organisation-scoped)
────────────────────                    ────────────────────

users.id                                organisations.organisation_id
    │                                       │
    ├── kira_memory.user_id                 ├── organisational_knowledge.organisation_id
    ├── kira_knowledge.user_id              │
    ├── genome_*.user_id                    │
    ├── conversations.user_id               │
    ├── client_profiles.user_id             │
    ├── business_valuations.user_id         │
    ├── users.subscription_status           ├── subscriptions.organisation_id
    ├── users.stripe_*                      │
    ├── kira_agents.user_id                 ├── kira_instances.organisation_id
    └── ...                                 │
                                            ├── ownership_periods.organisation_id
                                            ├── consultant_relationships.organisation_id
                                            ├── engagements.organisation_id
                                            ├── commercial_arrangements.organisation_id
                                            └── ...

┌──────────────────────────────────────────────────────────────┐
│                    BRIDGE / DISCONTINUITY ZONE               │
│                                                              │
│  Where does information flow from legacy to canonical?      │
│  Where is there NO bridge?                                   │
│  Where do the two systems contradict each other?            │
└──────────────────────────────────────────────────────────────┘
```

For each bridge point (or absence of one), record:

| Legacy Entity | Canonical Entity | Bridge Exists? | Bridge Mechanism | Semantic Discontinuity? | Impact |
|---|---|---|---|---|---|
| `users.id` | `organisations.organisation_id` | Partial | `auth_credentials → persons → organisation_memberships` | Yes — many tables still use `users.id` | Data written to legacy tables is invisible to canonical queries |
| `users.id` | `persons.person_id` | Partial | `auth_credentials` table | Yes — dual `users`/`persons` writes | Person identity split across two tables |
| `users.subscription_status` | `subscriptions` | NO | None | Yes — billing reads legacy columns; canonical table is empty | Subscription history lost |
| `kira_memory.user_id` | `organisational_knowledge.organisation_id` | NO | None | Yes — memory is person-scoped, not org-scoped | Memory cannot survive consultant or instance change |
| `genome_*.user_id` | `organisational_knowledge.organisation_id` | NO | None | Yes — genome is person-scoped, not org-scoped | Knowledge cannot survive ownership change |
| `kira_agents.user_id` | `kira_instances.organisation_id` | NO | None | Yes — agents tied to user, not org | Instance replacement orphans agents |
| ... | ... | ... | ... | ... | ... |

**"Semantic discontinuity"** is the critical classification. It means: the data exists in both systems, but it means different things in each. Migrating from legacy to canonical is not a data transfer — it is a semantic translation.

---

### 3.4 Tracing Requirement 4 — Runtime Authority Paths

For every route that touches a canonical concept, trace the complete authority path:

```
Client Request
    │
    ▼
Route Handler
    │
    ▼
Authentication
    │   How does the route verify the caller's identity?
    │   - Session JWT?
    │   - Service role (bypasses auth)?
    │   - No auth at all?
    │
    ▼
Identity Resolution
    │   How does the route determine WHO is calling?
    │   - getCurrentOrganisationContext() (canonical)?
    │   - getCurrentAppUser() (legacy)?
    │   - Client-supplied user_id (violation)?
    │
    ▼
Organisation Resolution
    │   How does the route determine WHICH ORGANISATION?
    │   - From canonical context?
    │   - From user_id lookup?
    │   - From client body?
    │
    ▼
Role / Relationship Check
    │   Does the route check the caller's role?
    │   - Owner? Admin? Consultant? Member?
    │   - Or does it skip authorisation entirely?
    │
    ▼
Authorisation
    │   Is the caller authorised to perform this operation?
    │   - RLS enforced?
    │   - Manual check in code?
    │   - No check?
    │
    ▼
Domain Operation
    │   What does the route actually do?
    │   - Which tables does it read/write?
    │   - Does it use canonical or legacy identity?
    │
    ▼
Persistence
    │   Where does the data go?
    │   - Canonical tables?
    │   - Legacy tables?
    │   - Both?
```

For each route, produce:

| Route | Method | Auth | Identity Resolution | Org Resolution | Role Check | Authorisation | Writes To | Status |
|---|---|---|---|---|---|---|---|---|
| `/api/kira/chat/start` | POST | Session JWT | `getCurrentOrganisationContext()` | Canonical | None | RLS | `conversations` | CANONICAL |
| `/api/kira/knowledge/upload` | POST | Session JWT | `getCurrentOrganisationContext()` | Canonical | None | RLS | `kira_knowledge` | PARTIAL |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

Routes with **no authentication** must be flagged separately:

| Route | Method | Auth | Identity Source | Severity | Impact |
|---|---|---|---|---|---|
| `/api/kira/research` | POST | None | Client-supplied `user_id` from body/header | **P0** | Any caller can read/write any user's data |
| `/api/kira/email/send-kira-ready` | POST | None | Client-supplied `user_id` from body | **P0** | Any caller can read PII and send emails as any user |

---

## 4. Output Format

P1.2 produces a single document: `docs/KIRA — P1.2 Full-Stack Traceability Matrix.md`

The document contains four sections, corresponding to the four tracing requirements above.

### Section 1 — Canonical Concept Traceability Matrix

| Canonical Concept | Database | Service Layer | API Layer | Authentication | Authorisation | Application State | UI | Conformance | Gap Description |
|---|---|---|---|---|---|---|---|---|---|
| Organisation | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| Person | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| Ownership Period | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| Consultant | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| Engagement | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| Kira Instance | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| Subscription | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| Commercial Arrangement | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| Organisational Knowledge Context | ... | ... | ... | ... | ... | ... | ... | ... | ... |

Each cell must contain:
- **File path(s)** where the concept is implemented (or "ABSENT" if not)
- **Classification** (CANONICAL, PARTIAL, LEGACY, DUPLICATED, CONFLICTING, ABSENT, UNREACHABLE)
- **Brief evidence** (what specifically was found)

### Section 2 — Invariant Traceability Matrix

For each invariant, a detailed trace through the runtime stack:

| Invariant | Schema | Service Layer | API Layer | Agent/Tools | UI | Runtime Enforcement | Gap | Consequence of Violation |
|---|---|---|---|---|---|---|---|---|
| INV-001 | ... | ... | ... | ... | ... | ... | ... | ... |
| INV-002 | ... | ... | ... | ... | ... | ... | ... | ... |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |
| INV-020 | ... | ... | ... | ... | ... | ... | ... | ... |

### Section 3 — Legacy/Canonical Bridge Map

The bridge table from 3.3 above, plus a narrative description of each discontinuity.

### Section 4 — Runtime Authority Paths

The route-by-route authority trace from 3.4 above, plus a narrative description of the security findings.

---

## 5. Methodology Rules

### 5.1 Evidence First

Every finding must be backed by a specific file path and line number. "The application does not use X" must be supported by "I searched for X across all .ts files and found zero references" or "I read file Y and confirmed X is not called."

### 5.2 P0.6 Is an Established Baseline

P0.6 established schema-level conformance for all 20 invariants. P1.2 does not redo that work.

P1.2 uses P0.6 as established evidence for the **Database** column in each matrix. P1.2 concentrates effort on the layers P0.6 did not cover:
- Service layer
- API route behaviour
- Agent/tool behaviour
- Application state
- UI
- Runtime authority paths

Where P1.2 discovers a schema-level finding that contradicts P0.6, record the contradiction explicitly. Do not silently override P0.6.

### 5.3 The Canonical Model Is Immutable

Where the implementation conflicts with the canonical model, record the conflict. Do not change the canonical model to accommodate the implementation.

### 5.4 No Fixes

P1.2 is a forensic document. It must not contain:
- "This should be fixed by..."
- "A migration would need to..."
- "The solution is..."
- Any language that prescribes change

P1.2 identifies gaps, discontinuities, and violations. Later phases decide what to do about them.

### 5.5 Semantic Precision

Use the exact classifications defined in Section 3. Do not invent new categories. If something is "ABSENT" at one layer and "LEGACY" at another, say so — do not conflate them.

**ABSENT** means the concept has no implementation at all at that layer.
**LEGACY** means there IS an implementation, but it predates and contradicts the canonical model.
These are different findings and must not be merged.

---

## 6. Scope Boundaries

### 6.1 In Scope

- All canonical entities and their application-layer implementations
- All 20 invariants and their runtime enforcement
- All API routes that touch canonical concepts
- All agent tools that touch canonical concepts
- All TypeScript service/repository code
- All Supabase client usage patterns
- All RLS policy applications
- All identity resolution paths
- The knowledge promotion pipeline (evidence → knowledge → organisational knowledge)
- The legacy/canonical bridge points

### 6.2 Out of Scope

- Frontend CSS, styling, responsive design
- PubGuard subsystem (separate product domain)
- Non-canonical API routes (e.g., `/api/voice/telemetry`, `/api/loi`)
- Infrastructure (Vercel, Stripe webhooks at the platform level)
- Performance or scalability analysis
- Bug fixes of any kind

---

## 7. Relationship to Other Documents

| Document | Relationship to P1.2 |
|----------|---------------------|
| `KIRA — Canonical Organisational Model.md` | The authority. P1.2 measures implementation against it. |
| `KIRA — P0.6 Implementation Traceability Matrix.md` | Schema-level baseline. P1.2 extends it to application/runtime layers. |
| `KIRA — P0.6 INV Evidence Register.md` | Invariant evidence baseline. P1.2 extends with runtime evidence. |
| `KIRA — P0.7 Knowledge Layer Architecture.md` | Target architecture for knowledge. P1.2 measures gap between target and current. |
| `KIRA — P1.1 Current-State Architecture Map.md` | Forensic inventory. P1.2 traces behaviour through that inventory. |

---

## 8. Completion Criteria

P1.2 is complete when:

- [ ] All 9 canonical concepts are traced through DB → service → API → auth → state → UI
- [ ] All 20 invariants are traced through schema → service → API → agent → UI → runtime
- [ ] Each classification is backed by specific file paths and line numbers
- [ ] The legacy/canonical bridge map identifies every bridge point and every discontinuity
- [ ] Every route touching a canonical concept has a runtime authority trace
- [ ] Security findings (unauthenticated routes, client-supplied identity) are documented with severity and impact
- [ ] The document contains no fix prescriptions, solution designs, or migration recommendations
- [ ] P0.6 schema findings are cited as established baseline, not re-audited
- [ ] All findings reference the canonical model's specific sections/invariants

---

## 9. Instruction to Kira Coding

The following is the verbatim instruction to be sent to Kira Coding:

---

> **P1.2 — Full-Stack Traceability Matrix**
>
> P0 is CLOSED. The canonical organisational model is frozen.
>
> P1.1 is COMPLETE. The forensic current-state map is in `docs/KIRA — P1.1 Current-State Architecture Map.md`. Read it before beginning.
>
> P0.6 is an ESTABLISHED BASELINE. Schema-level traceability for all 9 concepts and 20 invariants is in `docs/KIRA — P0.6 Implementation Traceability Matrix.md` and `docs/KIRA — P0.6 INV Evidence Register.md`. Do not redo that work.
>
> Your task is to produce a full-stack traceability matrix that extends P0.6's schema-level findings into the application and runtime layers.
>
> For each of the nine canonical concepts, trace the complete production path:
>
> Database → Service/Repository Layer → API Route → Authentication → Authorisation → Application State → UI
>
> Classify each layer as: CANONICAL, PARTIAL, LEGACY, DUPLICATED, CONFLICTING, ABSENT, or UNREACHABLE.
>
> For each of the 20 invariants (INV-001 through INV-020), trace the complete runtime enforcement path:
>
> Schema → Service Layer → API Route → Agent/Tools → UI → Runtime Behaviour
>
> For each invariant, establish:
> - Where it IS enforced (specific file, line, function)
> - Where it is NOT enforced (specific gap)
> - Whether the gap is exploitable at runtime
> - What the runtime consequence is when the invariant is violated
>
> Do NOT simply write "PASS" or "FAIL." Establish exactly where the enforcement exists or fails, and what happens at runtime as a result.
>
> Additionally, produce a Legacy/Canonical Bridge Map. P1.1 established that Kira has two architectures living beside each other. Map every bridge point between the legacy person-scoped model and the canonical organisation-scoped model. Where there is no bridge, record "Semantic discontinuity" — not just "missing code." This matters because migrating live data requires semantic translation, not just data transfer.
>
> For every route that touches a canonical concept, trace the complete runtime authority path:
>
> Client Request → Route Handler → Authentication → Identity Resolution → Organisation Resolution → Role/R relationship Check → Authorisation → Domain Operation → Persistence
>
> Document the two P0 authority violations discovered in P1.1 (`research/route.ts` and `email/send-kira-ready/route.ts`) and determine whether they are isolated defects or evidence of a broader identity/authority architecture problem.
>
> Write the output to `docs/KIRA — P1.2 Full-Stack Traceability Matrix.md`.
>
> The output must be forensic, not prescriptive. Do not include fix prescriptions, solution designs, or migration recommendations. P1.2 identifies gaps, discontinuities, and violations. Later phases decide what to do about them.
>
> Every finding must reference actual code locations (file path + line number where possible).

---

## 10. Phase Boundary Summary

| Phase | Purpose | Status |
|-------|---------|--------|
| **P0** | Define what Kira must preserve (canonical organisational reality) | **CLOSED** |
| **P1.1** | Forensic current-state map — what exists in the repository | **CLOSED** |
| **P1.2** | Full-stack traceability — how information travels, where the canonical model breaks | **READY TO EXECUTE** |
| **P1.3** | Architectural gap / conflict model | **PENDING P1.2** |
| **P1.4** | Migration / implementation sequence | **PENDING P1.3** |
| **P2** | Build | **PENDING P1 CLOSURE** |

P0 defined what Kira means.
P1.1 established what actually exists.
P1.2 now establishes exactly how the existing system behaves — and where it breaks against the canonical model.

We are at P1.2.
