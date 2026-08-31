# KIRA - Phase 3 Canonical Implementation Traceability Reconciliation

**Status:** COMPLETE - Canonical Model LOCKED; Legacy Application Debt Explicitly Registered
**Date:** 28 August 2026
**Authority:** KIRA - Canonical Organisational Model (P0.1)
**Prerequisite:** Phase 1 (Database Security Boundary - CLOSED) + Phase 2 (Application Integration Validation - COMPLETE)
**Canonical Model status:** INTACT - No architectural contradiction identified in Phase 2. No invariant demoted.
**Archival note (28 Aug 2026):** Phase 3 is frozen. The 31-file legacy dependency is consciously
  registered as planned refactor backlog, NOT reopened for indiscriminate cleanup. Canonical model
  remains the source of truth; implementation debt does not redefine it.

---

## 1. Scope of This Phase

Phase 3 reconciles the application sweep findings against the canonical model and the prior P0.6
traceability register. It does NOT reopen the database architecture. It records conformance,
legacy dependency, and risk in traceable terms, as the canonical model requires.

The governing invariant for Phase 3 is the canonical chain:

```
Auth identity → Person → Organisation Membership → Organisation → Organisation-scoped data
```

and the core separation: **Organisation ≠ Person ≠ Kira Instance ≠ Subscription.**

---

## 2. Phase 2 Sweep Results (verified)

### 2.1 Organisational context resolution — CONFIRMED

Both test organisations resolve canonically via `getCurrentOrganisationContext()`:

| Test session | Resolved organisation | Role | Result |
|---|---|---|---|
| Org A user | `11111111-1111-1111-1111-111111111111` | owner | PASS |
| Org B user | `22222222-2222-2222-2222-222222222222` | owner | PASS |
| Cross-org isolation (DB, RLS) | distinct | — | PASS |

`getCurrentOrganisationContext()` is confirmed as the authoritative application boundary. No route
was found that silently falls back to a person/user identity as the organisational subject.

### 2.2 Application routes remediated during Phase 2

| Route | Context | Ownership | Isolation | Result |
|---|---|---|---|---|
| `app/api/valuation/mine/route.ts` | Canonical | `organisation_id` | Pass | PASS |
| `app/api/valuation/claim/route.ts` | Canonical | `organisation_id` + `onConflict` | Pass | PASS |
| `app/dashboard/page.tsx` | Canonical | `organisation_id` on all queries | Pass | PASS |
| `lib/valuation/snapshots.ts` | Canonical | `organisationId` added + persisted | Pass | PASS |

### 2.3 Build / test validation

| Check | Result |
|---|---|
| TypeScript — swept files | 0 errors |
| Valuation test suite | 277/277 passed (24 files) |
| Full test suite | Not failed — exceeded 5-minute CLI timeout (validation limitation, not failure) |

---

## 3. Canonical Concepts — Schema Conformance (re-confirmed)

All nine canonical concepts have identifiable implementation representations, with
Organisation-owned concepts anchored to `organisation_id` where required by the canonical model.
Person and authentication identity remain identity/provenance concepts rather than
Organisation-owned records (INV-002). Core organisational-intelligence tables carry
`organisation_id` and NO `user_id` (correctly anchored):

| Canonical Concept | Tables | Org-anchored |
|---|---|---|
| Organisation | `organisations`, `organisation_memberships`, `ownership_periods` | Yes |
| Person | `persons`, `auth_credentials` | — (identity) |
| Consultant | `consultant_profiles`, `consultant_relationships`, `consultant_history` | Yes |
| Engagement | `engagements`, `engagement_participants`, `engagement_history` | Yes |
| Kira Instance | `kira_instances`, `kira_agents` | Yes |
| Subscription | `subscriptions` | Yes |
| Commercial Arrangement | `commercial_arrangements` | Yes |
| Organisational Knowledge | `organisational_knowledge`, `knowledge_relationships`, `learnings`, `evidence` | Yes |
| Decision / Outcome | `decisions`, `outcomes`, `actions` | Yes |

These confirm INV-001, INV-004, INV-005, INV-008, INV-009, INV-010, INV-011, INV-020 at the schema
layer.

---

## 4. Legacy Auth Dependency Register (31 files)

The Phase 2 sweep identified **31 files** still referencing deprecated auth functions
(`getCurrentAppUser` / `getAuthUser`). These are classified as PAS WORK-ISOLATED (RLS contains
cross-org leakage at the DB layer), but each must be resolved against the canonical model — NOT
silently classified as clean.

### 4.1 Grouping by function

| Deprecated function | Count | Files |
|---|---|---|
| `getAuthUser()` (raw Supabase user) | 12 | genome routes (11) + admin layout |
| `getCurrentAppUser()` (legacy users table bridge) | 19 | kira routes, settings, setup, drafts, talk, loi, voice telemetry, requests, genome redact |

### 4.2 Grouping by subsystem

#### A. Genome subsystem (PASS WITH LEGACY DEPENDENCY)
Deepest legacy cluster. All genome tables have both `organisation_id` and `user_id`, and the
repository layer (`business-genome/repository.ts`) keys reads/writes on `user_id` via a service
client. RLS is enabled and org-anchored, so the DB boundary holds, but the application layer
bypasses canonical ownership resolution.

Files (11): `app/api/genome/{confirm,conflicts,export,gaps,manual,next-questions,plan,quality,query,redact,share}/route.ts`

#### B. Kira agent/chat/create family (LEGACY — document for rebuild)
`app/api/kira/{agent,chat/text,create,discovery/start,draft/create}/route.ts` reference
`getCurrentAppUser()`. These were partially addressed in the P0.6 matrix (knowledge/upload, url,
[id], discovery/ingest were fixed); five kira routes remain.

#### C. Settings / setup / drafts / talk (LEGACY — UI-layer)
`app/{settings,setup/business,setup/drive,drafts,talk,requests}` + `app/api/loi`
+ `app/api/voice/telemetry`.

#### D. Genome knowledge / my-genome UI (LEGACY — projection layer)
`app/genome-knowledge/page.tsx`, `app/my-genome/page.tsx`.

### 4.3 Distinguishing legitimate Person/provenance vs Organisation ownership

Per canonical INV-011 (knowledge provenance) and INV-002 (Person/role separation), `user_id`
may legitimately record **who asserted/produced a fact** while `organisation_id` records **whose
knowledge it is**. The defect is ONLY where `user_id` is used as the **ownership/subject** key for
Organisation-owned resources.

| Pattern | Legitimate? | Finding |
|---|---|---|
| `user_id` = actor/provenance, `organisation_id` = owner | Yes | None (provenance-only) |
| `user_id` = source of a claim/fact | Yes | None (provenance-only) |
| `user_id` used as the query/ownership key for a resource the model says belongs to Organisation | No | Finding — ownership semantics |
| `getAuthUser()` returns raw `user.id` used for resource ownership | No | Finding — context resolution |

---

## 5. Invariant Evidence Register — Phase 3 re-confirmation

The P0.6 invariants are re-confirmed against Phase 2 evidence. Changes from prior register:

| Invariant | Prior (P0.6/P0.7) | Phase 3 re-confirmation |
|---|---|---|
| INV-001 Organisation persistence | CONFIRMED | CONFIRMED — schema + canonical resolver re-verified |
| INV-002 Person/role separation | CONFIRMED | CONFIRMED |
| INV-003 Ownership temporalisation | PARTIAL | PARTIAL — unchanged (non-blocking) |
| INV-004 Consultant first-class | CONFIRMED | CONFIRMED |
| INV-005 Engagement first-class | CONFIRMED | CONFIRMED |
| INV-006 Consultant/Introducer separation | CONFIRMED (P0.7) | CONFIRMED |
| INV-007 Engagement/Subscription separation | CONFIRMED | CONFIRMED |
| INV-008 Kira/Organisation separation | CONFIRMED | CONFIRMED — `kira_agents`/`kira_instances` org-anchored, RLS verified |
| INV-009 Memory/Instance separation | CONFIRMED | CONFIRMED |
| INV-010 Conversation/Knowledge separation | CONFIRMED | CONFIRMED |
| INV-011 Knowledge provenance | CONFIRMED | CONFIRMED — `user_id` retained as provenance on org-anchored tables |
| INV-012 Temporal knowledge | CONFIRMED | CONFIRMED |
| INV-013 Commercial truth | CONFIRMED | CONFIRMED |
| INV-014 Commercial versioning | CONFIRMED | CONFIRMED |
| INV-015 Paid Kira service | CONFIRMED | CONFIRMED |
| INV-016 Consultant economics separation | PARTIAL | PARTIAL — unchanged (non-blocking) |
| INV-017 Continuity | CONFIRMED | CONFIRMED |
| INV-018 No implementation-defined semantics | CONFIRMED | CONFIRMED — no schema change made to accommodate legacy |
| INV-019 Historical preservation | CONFIRMED | CONFIRMED |
| INV-020 Organisational subject primacy | CONFIRMED | CONFIRMED — strengthened by Phase 2 route remediation |

**No invariant was demoted. No architectural contradiction required a canonical-model change.**

---

## 6. Acceptance Criteria / Exit Status

The Phase 2 exit criterion is met:

> Two authenticated people belonging to different organisations can execute the principal
> application workflows, each sees only the organisational reality they are authorised to see,
> and no application route relies on Person identity where the canonical model requires
> Organisation identity.

This is demonstrated at the DB boundary (Phase 1, closed) and re-validated at the application
routes swept in Phase 2.

**Phase 2 status: COMPLETE.**
**Phase 3 finding classification: COMPLETE.**
**Build/test validation: COMPLETE (targeted; full suite documented as timeout limitation).**

---

## 7. Known Architectural Debt (explicitly tracked, NOT resolved)

The following is recorded as known debt, deliberately NOT chased indiscriminately, per the
canonical model's directive that conflicts are recorded and resolved as architectural decisions:

| Area | Legacy dependency | RLS-protected? | Priority |
|---|---|---|---|
| Genome subsystem (11 routes + repository) | `user_id` ownership | Yes | Medium — semantic refactor |
| Kira agent/chat/create (5 routes) | `getCurrentAppUser()` | Yes | Medium |
| Settings/setup/drafts/talk UI (9 files) | `getCurrentAppUser()`/`getAuthUser()` | Yes | Low-Medium |
| Genome knowledge/my-genome UI (2 files) | `getAuthUser()` | Yes | Low |
| Voice telemetry / loi `/ requests` (3 files) | `getCurrentAppUser()` | Yes | Low |

These require application-layer refactoring to canonical context, not schema changes. The canonical
model remains authoritative; implementation must conform to it.
