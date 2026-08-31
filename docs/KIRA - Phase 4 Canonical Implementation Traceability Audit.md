# KIRA - Phase 4 Canonical Implementation Traceability Audit

**Status:** COMPLETE - INSPECTION ONLY (no production code modified, no migrations run)
**Date:** 28 August 2026
**Authority:** KIRA - Canonical Organisational Model (P0.1) — LOCKED
**Method:** Forensic inspection of schema (DB) + application layer (`lib/`, `app/`, `business-genome/`),
  mapped against all 9 canonical concepts and INV-001..INV-020.
**Classification:** GREEN (conformant) / AMBER (partial) / RED (contradicts) / GREY (schema-only, no
  meaningful application implementation).

---

## 0. Headline findings (read first)

| # | Finding | Class | Severity |
|---|---|---|---|
| F1 | Live organisational memory (`kira_memory`) is written **person-anchored** (`user_id`), never org-anchored, despite the `organisation_id` column existing. The canonical `organisational_knowledge` table has **no application writer**. | **RED / GREY** | HIGH |
| F2 | Consultant & Engagement canonical concepts have full schema + RLS but **no application-layer implementation** (`lib/consultants.ts`, `lib/engagements.ts` never created; no route writes `consultant_*`/`engagements`). | **GREY** | HIGH |
| F3 | Ownership Period: schema only (`ownership_periods` table). No application writer or reader; historical ownership unreconstructible from legacy. | **GREY** (schema) / **RED** (semantic gap) | MEDIUM |
| F4 | Subscription is org-anchored at **schema** (`subscriptions.organisation_id`) but the live billing **data boundary** resolves subscription state via the legacy `users` table keyed by `personId`, marked "P2.4 will migrate". | **AMBER** | MEDIUM |
| F5 | Commercial Arrangement: schema + `commercial_history` (versioning) exist but **no application implementation** or versioning writer. | **GREY** | MEDIUM |

The database security boundary and canonical resolvers are **secure** (Phase 1, closed). The above
findings are application-layer semantic gaps — the implementation does not yet *express* several
canonical concepts even though the schema supports them.

---

## 1. Canonical Concepts — Implementation Mapping

| # | Concept | Implementation | Class | Evidence |
|---|---|---|---|---|
| 1 | **Organisation** | `organisations` table + canonical resolver `getCurrentOrganisationContext()` (`lib/auth.ts:123-168`, chain `auth → auth_credentials → persons → organisation_memberships → organisations`). Route rebinding complete for principal workflows (Phase 2). | **GREEN** | Schema verified; resolver re-confirmed |
| 2 | **Person** | `persons` + `auth_credentials` + `organisation_memberships`. Identity/provenance concept, NOT org record (INV-002). Legacy `users` retained for provenance only. | **GREEN** | `lib/auth.ts`, schema |
| 3 | **Ownership Period** | `ownership_periods` table (person_id/org_id/status/valid_from/valid_to) + RLS. **No app-layer read/write.** | **GREY → RED** | Table exists; no `lib`/`app` reference |
| 4 | **Consultant** | `consultant_profiles`, `consultant_relationships`, `consultant_history` + RLS (migration `20260826160000_p05_consultant_engagement_access.sql`). **No app-layer implementation.** P0.5-2D guide's `lib/consultants.ts` never written. | **GREY** | Docs reference; no code |
| 5 | **Engagement** | `engagements`, `engagement_participants`, `engagement_history` + RLS. **No app-layer implementation**; `lib/engagements.ts` never written. | **GREY** | Docs reference; no code |
| 6 | **Kira Instance** | `kira_instances`, `kira_agents` — org-anchored, RLS on. `kira_agents` read in dashboard by `organisation_id` (Phase 2 fix). Kira/Organisation separation holds (INV-008). | **GREEN** | Schema + dashboard code |
| 7 | **Subscription** | `subscriptions` org-anchored at schema. App-layer billing entity resolution partially bridged via legacy `users` (F4). | **AMBER** | `lib/billing/`, `app/api/billing/*` |
| 8 | **Commercial Arrangement** | `commercial_arrangements` + `commercial_history` (versioning) + RLS. **No app-layer implementation** or versioning writer. | **GREY** | Tables only |
| 9 | **Organisational Knowledge** | `organisational_knowledge` org-anchored schema + RLS. **No writer.** Live memory goes to user-anchored `kira_memory` (F1). | **RED / GREY** | `lib/kira/uid-tools.ts:328`, `lib/kira/convai.ts` |

### Concept-level summary
- **GREEN (4):** Organisation, Person, Kira Instance, (subscription schema)
- **AMBER (1):** Subscription (data-boundary bridge)
- **GREY (4):** Consultant, Engagement, Commercial Arrangement, Organisational Knowledge (schema-only)
- **RED (2):** Organisational Knowledge (ownership), Ownership Period (semantic gap)

---

## 2. Invariant Audit (INV-001..INV-020)

| INV | Statement | Class | Evidence / finding |
|---|---|---|---|
| 001 | Organisation persistence | **GREEN** | `organisations` + canonical resolver; org ≠ person/instance/sub |
| 002 | Person/role separation | **GREEN** | `persons`/`memberships` with explicit role; Person identity/provenance |
| 003 | Ownership temporalisation | **RED** | `ownership_periods` schema exists; no app writer; history unreconstructible |
| 004 | Consultant first-class | **GREY** | tables + RLS only; no app implementation |
| 005 | Engagement first-class | **GREY** | tables + RLS only; no app implementation |
| 006 | Consultant/Introducer separation | **GREEN** | distinct structures; established in P0.7 |
| 007 | Engagement/Subscription separation | **GREY** | engagement not implemented; can't orphan from subscription yet |
| 008 | Kira/Organisation separation | **GREEN** | `kira_instances`/`kira_agents` org-anchored; RLS |
| 009 | Memory/Instance separation | **AMBER** | `organisational_knowledge` org-anchored (instance-independent) but no writer; live memory user-anchored |
| 010 | Conversation/Knowledge separation | **AMBER** | raw `conversations` distinct from `organisational_knowledge`/`kira_memory`, but memory is user-anchored |
| 011 | Knowledge provenance | **AMBER** | `kira_memory` has source_conversation_id/superseded_by; genome has confidence/source, but org anchor + full epistemic states missing |
| 012 | Temporal knowledge | **AMBER** | `kira_memory.superseded_by`; explicit current/historical states not fully implemented |
| 013 | Commercial truth independent of org | **GREEN** | `subscriptions`/`commercial_arrangements` org-anchored, no user_id |
| 014 | Commercial versioning | **GREY** | `commercial_history` table exists; no app versioning writer |
| 015 | Paid Kira service | **GREEN** | billing/subscription model represents paid service; intro vs commercial distinguished |
| 016 | Consultant economics separation | **GREY** | consultant fees not modelled (consultant GREY) |
| 017 | Continuity | **AMBER** | org identity persists; but memory ownership gap undermines continuity across person change |
| 018 | No implementation-defined semantics | **AMBER** | org-anchored schema correct; legacy person-anchored memory contradicts intent |
| 019 | Historical preservation | **AMBER** | history tables exist (`*_history`) but no app writers |
| 020 | Organisational subject primacy | **RED** | persistent intelligence written person-anchored, not org-anchored (F1) |

### Invariant summary
- **GREEN (7):** INV-001, 002, 006, 008, 013, 015 (+005-adjacent schema)
- **AMBER (7):** INV-009, 010, 011, 012, 017, 018, 019
- **RED (2):** INV-003, INV-020
- **GREY (4):** INV-004, 005, 007, 014, 016

---

## 3. RED findings — recommended remediation (no code changed; proposals only)

### R1 — Memory ownership must be org-anchored (INV-020, GOV-009) — HIGH
- **Location:** `lib/kira/uid-tools.ts:328` (`save_memory` insert), `lib/kira/convai.ts`
  (post-call distil), `app/api/kira/create/route.ts`, `lib/kira/apply-profile.ts`.
- **Issue:** `kira_memory` insert writes `user_id`/`kira_agent_id` but never `organisation_id`,
  despite the column existing. Recall (`lib/kira/recall.ts`, genome render) keys by user.
- **Proposed remediation (application-layer only, no schema change):**
  1. Resolve org via `getCurrentOrganisationContext()` at the memory write boundary.
  2. Populate `organisation_id` on every `kira_memory`/`kira_knowledge` insert, alongside
     `user_id` retained as **provenance** (who asserted).
  3. Re-key recall/Genome render by `organisation_id`, filtering `user_id` to provenance only.
  4. Add an org-anchored writer to `organisational_knowledge` (the pure-org canonical sink).

### R2 — Ownership Period application layer (INV-003) — MEDIUM
- Create `lib/ownership.ts` to read/write `ownership_periods` via canonical org context; seed
  current owner forward. Historical backfill from legacy is impossible (documented limitation).

### R3 — Consultant / Engagement implementation (INV-004, 005, 007) — HIGH (debt)
- Implement the documented `lib/consultants.ts` + `lib/engagements.ts` (P0.5-2D guide) so
  `getOrganisationConsultants()`, `checkConsultantRelationship()`, engagement lifecycle exist as
  org-scoped code. Currently GREY.

### R4 — Commercial Arrangement versioning (INV-014) — MEDIUM
- Add application writer to `commercial_arrangements` + append to `commercial_history` on any
  terms change, via canonical org context.

### R5 — Subscription data-boundary bridge (F4) — MEDIUM
- Migrate billing entity resolution from legacy `users`-keyed-by-`personId` to the org-anchored
  `subscriptions.organisation_id` (the files already carry the "P2.4 will migrate" marker).

---

## 4. GREEN confirmations (do not regress)

- Canonical identity chain + `getCurrentOrganisationContext()` — authoritative, no legacy fallback.
- Organisation storage + RLS boundary — secure (Phase 1, closed).
- Principal workflows (valuation, dashboard, kira agent) org-scoped (Phase 2, complete).
- `subscriptions`/`commercial_arrangements`/`organisational_knowledge` schema org-anchored (no user_id).
- Person as provenance, not ownership (INV-002).

---

## 5. Acceptance criteria

The audit is inspection-only by design: **no production code was modified, no migrations run.**
Findings R1-R5 are candidate remediation for a controlled implementation cycle. The canonical model
was **not** altered to match the legacy person-anchored memory — it remains authoritative, and the
implementation (not the model) is flagged as the non-conformant party.

**Phase 4 audit: COMPLETE. INSPECTION ONLY.**
