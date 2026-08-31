# KIRA — P0.6 Implementation Traceability Matrix

**Status:** P0.7 PASS — COMPLETE
**Purpose:** Audit existing implementation against canonical model
**Scope:** All 9 canonical concepts + 20 invariants (INV-001 to INV-020)
**Date:** 26 August 2026
**Prerequisite:** P0.5 Complete (canonical authority established) + P0.7 Complete (knowledge layer)
**P0.6 Completion Gate:** PASS — All authority-path violations remediated via route rebinding to `getCurrentOrganisationContext()`
**P0.7 Completion Gate:** PASS — INV-006 promoted from UNPROVEN to CONFIRMED via forensic evidence (schema, migrations, application paths, RLS, adversarial case)
**Phase Boundary:** P0.7 closed. INV-006 promoted. INV-003 and INV-016 remain PARTIAL (documented limitations, non-blocking).

---

## 1. Canonical Concepts Audit

| Canonical Concept | Implementation Location | Conformance | Semantic Gaps | Legacy Conflicts | Risk | Decision Required | Migration Implications | Test Coverage |
|---|---|---|---|---|---|---|---|---|
| **1. Organisation** | `organisations` table (P0.5 1A) | CONFIRMED | None | Legacy `users.id` as org proxy removed (Step 6) | Low | None | Complete | 1A verification, `verify_legacy_authority_retired()` |
| **2. Person** | `persons` table (P0.5 1A) | CONFIRMED | None | Legacy `users` table retained for provenance only | Low | None | Complete | 1A verification |
| **3. Ownership Period** | `ownership_periods` table (P0.5 1B) | PARTIAL | Historical ownership not reconstructible from legacy | None | Medium | Record historical ownership going forward | Complete | 1B verification |
| **4. Consultant** | `consultant_profiles`, `consultant_relationships`, `consultant_history` (P0.5 2A) | CONFIRMED | None | Introducer tables separate (correct) | Low | None | Complete | 2A verification |
| **5. Engagement** | `engagements`, `engagement_participants`, `engagement_history` (P0.5 2B) | CONFIRMED | None | None | Low | None | Complete | 2B verification |
| **6. Kira Instance** | `kira_instances`, `kira_instance_history` (P0.5 4) | CONFIRMED | None | Legacy `kira_agents` retained as historical | Low | None | Complete | 4 verification |
| **7. Subscription** | `subscriptions`, `subscription_history` (P0.5 3) | CONFIRMED | None | None | Low | None | Complete | 3 verification |
| **8. Commercial Arrangement** | `commercial_arrangements`, `commercial_history` (P0.5 3) | CONFIRMED | None | None | Low | None | Complete | 3 verification |
| **9. Knowledge** | `organisational_knowledge`, `evidence`, `knowledge_evidence_links` (P0.7) | CONFIRMED | None | Legacy `kira_knowledge` migrated to evidence | Low | None | Complete | P0.7 verification |

---

## 2. Invariants Audit (INV-001 to INV-020)

| Invariant | Status | Implementation | Location | Conformance | Gap | Risk | Evidence |
|---|---|---|---|---|---|---|---|
| **INV-001** Organisation persistence | CONFIRMED | `organisations` table + canonical resolver + RLS | `20260826100000_p05_canonical_identity.sql`, `lib/auth.ts:138` | Full | None | Low | `auth_credentials → persons → organisation_memberships → organisations` path |
| **INV-002** Person/role separation | CONFIRMED | `persons` + `organisation_memberships` with `role` | `20260826100000_p05_canonical_identity.sql`, `20260826110000_p05_membership_tenant_context.sql` | Full | None | Low | Role is from membership, not person |
| **INV-003** Ownership temporalisation | PARTIAL | `ownership_periods` with `valid_from/to`, `status` | `20260826110000_p05_membership_tenant_context.sql` | Structural | Historical ownership not reconstructible from legacy | Medium | "Historical ownership is NOT reconstructable from legacy data" |
| **INV-004** Consultant first-class status | CONFIRMED | `consultant_profiles`, `consultant_relationships`, `consultant_history` | `20260826140000_p05_consultant_relationship.sql` | Full | None | Low | Separate tables, RLS, functions |
| **INV-005** Engagement first-class status | CONFIRMED | `engagements`, `engagement_participants`, `engagement_history` | `20260826150000_p05_engagement_model.sql` | Full | None | Low | Separate tables, RLS, functions |
| **INV-006** Consultant/Introducer separation | CONFIRMED | Consultant and Introducer are structurally and semantically distinct: independent identity models (`person_id` vs `email`), independent relationship structures (`consultant_relationships` vs `referrals`), independent RLS boundaries (org membership vs session cookie), independent application paths (`/lib/introducer/` vs `/lib/kira/consultant/`). Adversarial same-party case passes. | `20260726000000_introducer_channel.sql`, `20260826140000_p05_consultant_relationship.sql` | Full | None | Low | Forensic evidence 26 Aug 2026 |
| **INV-007** Engagement/Subscription separation | CONFIRMED | No FK between `engagements` and `subscriptions` | `20260826150000_p05_engagement_model.sql`, `20260826170000_p05_commercial_structures.sql` | Full | None | Low | Both anchor to Organisation independently |
| **INV-008** Kira/Organisation separation | CONFIRMED | `kira_instances` FK to `organisations` (NOT NULL) | `20260826180000_p05_kira_instance_separation.sql` | Full | None | Low | Instance is subordinate; multiple per Organisation supported |
| **INV-009** Memory/Instance separation | CONFIRMED | `organisational_knowledge` mandatory FK to `organisations`; optional FK to `kira_instances` | `20260826210000_p07_knowledge_object_schema.sql` | Full | None | Low | Knowledge survives Instance replacement |
| **INV-010** Conversation/Knowledge separation | CONFIRMED | `evidence` for raw source; `organisational_knowledge` for governed memory | `20260826220000_p07_evidence_schema.sql`, `20260826210000_p07_knowledge_object_schema.sql` | Full | None | Low | "Promote, don't relabel" migration strategy |
| **INV-011** Knowledge provenance | CONFIRMED | `supplied_by`, `engagement_id`, `ownership_period_id`, `kira_instance_id`, `evidence_id`, `knowledge_provenance_view` | `20260826210000_p07_knowledge_object_schema.sql`, `20260826220000_p07_evidence_schema.sql` | Full | None | Low | Comprehensive provenance chain |
| **INV-012** Temporal knowledge | CONFIRMED | `effective_from/to`, `is_current`, `superseded_by`, temporal query functions | `20260826210000_p07_knowledge_object_schema.sql`, `20260827000000_p07_temporal_query_patterns.sql` | Full | None | Low | Point-in-time, history, supersession chains |
| **INV-013** Commercial truth | CONFIRMED | `commercial_arrangements` separate table with `organisation_id` FK | `20260826170000_p05_commercial_structures.sql` | Full | None | Low | Separate from Organisation identity |
| **INV-014** Commercial versioning | CONFIRMED | `commercial_history` + trigger + temporal columns | `20260826170000_p05_commercial_structures.sql` | Full | None | Low | Audit trail preserved |
| **INV-015** Paid Kira service | CONFIRMED | `pricing_tiers` with positive prices, `subscriptions` with trial status | `20260826170000_p05_commercial_structures.sql` | Full | None | Low | Paid model explicit; trials are distinct status |
| **INV-016** Consultant economics separation | PARTIAL | `arrangement_type` enum separates conceptually | `20260826170000_p05_commercial_structures.sql` | Conceptual | No structural FK between `consultant_relationships` and `commercial_arrangements` | Medium | Conceptual separation exists; no enforcement |
| **INV-017** Continuity | CONFIRMED | Universal temporal/history pattern; Org root; Knowledge decoupled | All P0.5/P0.7 migrations | Full | None | Low | Cascade direction protects Organisation |
| **INV-018** No implementation-defined semantics | CONFIRMED | Migration comments document intent; Step 6 retires legacy | `20260826100000_p05_canonical_identity.sql`, `20260826200000_p05_legacy_authority_retirement.sql` | Full | None | Low | Active retirement of legacy conflations |
| **INV-019** Historical preservation | CONFIRMED | Universal `_history` tables, temporal columns, supersession chains | All P0.5/P0.7 migrations | Full | None | Low | History preserved across all concepts |
| **INV-020** Organisational subject primacy | CONFIRMED (remediated) | Schema/RLS anchor to Organisation; 5 routes rebound to `getCurrentOrganisationContext()` during P0.6 remediation | Multiple P0.5/P0.7 migrations + `app/api/kira/` routes | Full | None | Low | Routes remediated 26 Aug 2026 |

---

## 3. Route Authority Findings

| Route | Operation | Authority Source | Canonical Resolution | Status | Severity | Invariant Affected |
|---|---|---|---|---|---|---|
| `/api/kira/knowledge/upload` | POST | `getCurrentOrganisationContext()` | Canonical | CONFIRMED | — | — |
| `/api/kira/knowledge/url` | POST | `getCurrentOrganisationContext()` | Canonical | CONFIRMED | — | — |
| `/api/kira/knowledge/[id]` | DELETE | `getCurrentOrganisationContext()` | Canonical | CONFIRMED | — | — |
| `/api/kira/create` | POST | `getCurrentOrganisationContext()` | Canonical | CONFIRMED | — | — |
| `/api/kira/discovery/ingest` | POST | `getCurrentOrganisationContext()` | Canonical | CONFIRMED | — | — |
| `/api/kira/chat/start` | POST | `getCurrentOrganisationContext()` | Canonical | CONFIRMED | — | — |
| `/api/kira/chat/text` | POST | `getCurrentOrganisationContext()` | Canonical | CONFIRMED | — | — |
| `/api/kira/agent` | GET | `getCurrentOrganisationContext()` | Canonical | CONFIRMED | — | — |
| `/api/kira/conversation/context` | GET | `getCurrentOrganisationContext()` | Canonical | CONFIRMED | — | — |
| `/api/kira/ask` | POST | N/A (public, records question only) | Design-appropriate | N/A | — | — |

---

## 4. Key Findings

### P0 Authority Violations

Five routes bypass the canonical authority path (`getCurrentOrganisationContext()`):

1. **`/api/kira/knowledge/upload`** — Accepts `userId` from client form data and writes it directly to `kira_knowledge.user_id`. No canonical resolution. A caller can supply any `userId` and write knowledge to that user's scope.

2. **`/api/kira/knowledge/url`** — Accepts `userId` from client request body. Same vulnerability as upload.

3. **`/api/kira/knowledge/[id]`** — Uses `getCurrentAppUser()` (deprecated legacy path) for ownership check (`user_id !== user.id`). Does not resolve via canonical membership.

4. **`/api/kira/create`** — Uses `getCurrentAppUser()` (deprecated) for agent creation. Agent is linked to legacy `user_id` rather than canonical `organisation_id`.

5. **`/api/kira/discovery/ingest`** — Uses `getCurrentAppUser()` (deprecated) for profile ingestion. Writes `user_id` to `client_profiles` rather than resolving via canonical membership.

### Impact

These violations mean:
- Organisational authority is derived from client-supplied or legacy identity, not from `auth → person → membership → organisation`
- INV-020 (Organisational subject primacy) is violated at the API layer despite being correct at the schema/RLS layer
- Knowledge records created via these routes may not be properly organisation-scoped

### Required Disposition

All five routes must be rebound to `getCurrentOrganisationContext()` before P0.6 can be declared complete. This is a **blocking architectural remediation**, not a polish item.

---

## 5. Summary Statistics

| Category | Count |
|---|---|
| Invariants CONFIRMED | 18 |
| Invariants PARTIAL | 2 (INV-003, INV-016) |
| Invariants UNPROVEN | 0 |
| Invariants VIOLATED | 0 |
| Routes CONFIRMED | 10 |
| Routes VIOLATED | 0 |
| Routes N/A | 1 |

---

## 6. P0.6/P0.7 Completion Gate

**P0.6 PASS** — Closed 26 August 2026.
**P0.7 PASS** — Closed 26 August 2026.

**Phase boundary:**
- P0.1 — Canonical model → COMPLETE
- P0.5 — Authority rebinding / legacy authority retirement → COMPLETE
- P0.6 — Organisational authority/invariant audit → **PASS**
- P0.7 — Residual semantic conformance → **PASS**

**Remaining documented limitations (non-blocking):**
- INV-003: PARTIAL — historical ownership not reconstructible from legacy data
- INV-016: PARTIAL — consultant economics separation conceptual only, no structural enforcement

**Status definition:** These are documented architectural limitations, not authority-gate failures. They remain visible in the Evidence Register but do not block P0.6 or P0.7 closure.
