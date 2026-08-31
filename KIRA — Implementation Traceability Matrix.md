# KIRA — Implementation Traceability Matrix

**Generated:** 2026-08-29
**Authority:** KIRA — Canonical Organisational Model.md (P0.1) · P0.2-A.1 Canonical Identity & Relationship Model
**Type:** AUDIT ONLY — no code changed, no migration authored, no production mutation
**Method:** Live remote-DB inspection (information_schema, pg_proc, pg_policies, pg_constraint, row evidence) + repository search (app/, lib/, components/, supabase/migrations/) + migration-history review against remote `supabase_migrations.schema_migrations`.
**Baseline:** Remote migration head `20260829140000` (E1 safe cleanup applied). `20260829150000` identity bootstrap authored, **not pushed**.

---

## 0. Executive Verdict

**The canonical organisational architecture has been substantially built at the schema layer; the application layer still carries a large legacy `user_id` ownership surface that is only partially rebound.**

The direction of travel is correct and evidence-based:

- **P0.5 series** delivered the canonical identity/organisation/membership/consultant/engagement/commercial/Kira-instance separation in migrations (`20260826100000` → `20260826230000`).
- **P0.7 series** delivered a genuine knowledge-object architecture — `evidence`, `organisational_knowledge`, `knowledge_evidence_links`, `organisational_knowledge_history`, `get_knowledge_at_time`, `get_superseded_knowledge`, `get_supersession_chain`.
- **RLS** is substantially org-scoped (`*_org_admin_manage` / `*_org_member_select` pattern across core resources).
- **P0.4/P1 phases** rebound `business_valuations`, `search_knowledge_semantic`, `match_kira_knowledge_chunks`, and the rating/readiness recompute paths to organisation ownership. E1 safe cleanup dropped dead legacy resolvers.

But three boundaries remain non-conformant and are the P0 remediation targets (detailed in §6):

1. **Three tables have no `organisation_id` at all and are user-authority-only:** `kira_tasks`, `kira_knowledge_chunks`, `kira_fact_confirmations`. These are canonical-knowledge-adjacent resources keyed exclusively by `user_id`.
2. **Dual-keyed tables** (`organisation_id` present but `user_id` still the write/read selector in app code): `kira_memory` (org column present but reads/writes user-keyed), `genome_*`, `conversations`/`conversation_messages`, `client_profiles`, `drive_documents`, `email_logs`, `introductions`, `kira_research_sessions`, `setup_sessions`, `user_feedback`, `voice_connect_events`, `genome_access_log`, `knowledge_files`, `knowledge_urls`.
3. **The legacy `users` identity bridge is still the active auth→person path** (`users.id = auth_user_id`), and the E1.0-A canonical bootstrap for the six production users is authored but not yet applied. Until those six persons + `auth_credentials` exist, the canonical `auth_credentials → persons` chain is incomplete for real production identity.

**Distinction honoured throughout:** *existence of a `user_id` column* ≠ *semantically wrong*. Provenance/actor/authorship uses are legitimate. Only where `user_id` acts as **ownership/tenant authority** for organisational resources is it an architectural conflict (INV-020).

### Evidence table — tenant-key map (live, 2026-08-29)

| Resource group | organisation_id | user_id | person_id | instance | engagement | Verdict |
|---|---|---|---|---|---|---|
| `organisations`, `ownership_periods`, `consultant_*`, `engagements`, `commercial_arrangements`, `subscriptions`, `kira_instances`, `kira_agents`, `evidence`, `decisions`, `learnings`, `actions`, `outcomes`, `promotion_*`, `beta_codes`, `organisational_knowledge`, `knowledge_relationships`, `knowledge_provenance_view` | ✅ | — | ✅ (person) | ✅ (evidence) | ✅ (evidence) | **CONFORMANT** (org anchor present) |
| `business_valuations`, `business_valuation_snapshots` | ✅ | ✅ | — | — | — | **REBOUND** (P2.4-D: user_id = provenance only) |
| `kira_memory` | ✅ | ✅ | — | — | — | **PARTIAL** — org column present, app paths user-keyed |
| `conversations`, `conversation_messages` | ✅ | ✅ | — | — | — | **PARTIAL** — org present, user provenance still authority |
| `genome_facts`, `genome_entities`, `genome_events`, `genome_relationships`, `genome_pathways`, `genome_item_status`, `genome_access_log` | ✅ | ✅ | — | — | — | **PARTIAL** — org present; genome_facts repair pending |
| `client_profiles`, `drive_documents`, `email_logs`, `introductions`, `kira_refusals`, `kira_research_sessions`, `knowledge_files`, `knowledge_urls`, `setup_sessions`, `user_feedback`, `voice_connect_events`, `loi_commitments` | ✅ | ✅ | — | — | — | **PARTIAL** — dual-keyed |
| `kira_tasks` | ❌ | ✅ | — | — | — | **NON-CONFORMANT** — no org anchor |
| `kira_knowledge_chunks` | ❌ | ✅ | — | — | — | **NON-CONFORMANT** — no org anchor |
| `kira_fact_confirmations` | ❌ | ✅ | — | — | — | **NON-CONFORMANT** — no org anchor |
| `pubguard_scans` | ❌ | ✅ | — | — | — | **NON-CONFORMANT** — no org anchor |

---

## 1. Canonical Concept Traceability Matrix

| Canonical Concept | Existing Implementation | Tables / Files | Conformance | Gap | Risk | Required Decision |
|---|---|---|---|---|---|---|
| **Organisation** | `organisations` table; org-scoped RLS authority; org resolver functions | `organisations`, `organisation_memberships`, all `*_org_*` policies; `app/api/onboarding/complete/route.ts`, `lib/auth.ts` (`resolveOrganisationForPerson`, `getCurrentOrganisationContext`) | **CONFORMANT** at schema + RLS layer | Live production identity not yet bridged: only 4 persons / 14 test memberships / 35 orgs; six production users have no person → membership link | Production org data is sparse/absent; canonical anchor is schema-ready but data-empty | Confirm E1.0-A bootstrap, then resolve orgs for the six users as evidence emerges (no fabricated orgs) |
| **Person** | `persons` table; FK from `auth_credentials`, `ownership_periods`; `organisational_knowledge.supplied_by` → `persons` | `persons`, `auth_credentials`, `ownership_periods.person_id`; `lib/auth.ts:134` (credential bridge) | **CONFORMANT** (schema) / **PARTIAL** (data: 4 test persons only) | No production `persons`/`auth_credentials` rows yet; legacy `users` still the identity bridge | Auth→person chain unproven in production | Apply E1.0-A (identity-only); keep `auth_credentials` as the sole credential link |
| **Ownership Period** | `ownership_periods` table with `organization_id`, `person_id`, temporal bounds | `ownership_periods` | **CONFORMANT** (schema) | Zero rows live; no write path in app code found | Temporal ownership history is unimplemented in practice | Decide whether any current production entity needs an ownership period; otherwise cap as dormant-safe |
| **Consultant** | `consultant_profiles`, `consultant_relationships`, `consultant_history`, `engagement_participants`, `get_organisation_consultants` | `20260826140000_p05_consultant_relationship.sql` | **CONFORMANT** (schema + function) | No live rows; no app write path sweep verified | Feature surface untested | Verify whether consultant features are in active use before prioritising |
| **Engagement** | `engagements`, `engagement_history`, `engagement_participants`, `get_organisation_engagements`, `decisions`, `outcomes` | `20260826150000_p05_engagement_model.sql`, `20260826160000_p05_consultant_engagement_access.sql` | **CONFORMANT** (schema) | No app orchestration verified in this audit | Engagement lifecycle is schema-present only | Decide whether P0.6 requires app wiring or schema conformance suffices for now |
| **Kira Instance** | `kira_instances`, `kira_instance_history`, `kira_agents` (org-anchored), `get_organisation_kira_instances` | `20260826180000_p05_kira_instance_separation.sql` | **CONFORMANT** (schema) | App flows (`kira/create`, `kira/chat/text`) construct/derive agent context that still resolves via person/org context paths; instance separation implemented but adoption unverified | Instance continuity not yet proven in app | Verify the chat/knowledge paths bind to instance not user |
| **Subscription** | `subscriptions` (org-anchored), `billing_periods_reported`, `get_organisation_subscription`, `check_research_session_limits`, `app/api/billing/*`, `app/api/checkout/route.ts` | `20260725180000_subscription_billing.sql` | **CONFORMANT** (schema + app paths reviewed) | Org anchoring of billing rebind partially reviewed; legacy user paths in billing usage routes may remain | Billing/usage correctness across org transition needs a dedicated re-verification | Schedule a billing-path conformance sweep (P1) |
| **Commercial Arrangement** | `commercial_arrangements`, `commercial_history`, `get_organisation_subscription` (commercial truth) | `20260826170000_p05_commercial_structures.sql` | **CONFORMANT** (schema) | No live rows; no app management surface verified | Commercial versioning present but dormant | Verify whether live commercial arrangements require backfill |
| **Organisational Knowledge Context** | `organisational_knowledge`, `organisational_knowledge_history`, `knowledge_evidence_links`, `evidence`, `get_current_knowledge`, `get_knowledge_at_time`, `get_superseded_knowledge`, `get_supersession_chain`; app search via `search_knowledge_semantic` (org-scoped) | `20260826210000`–`20260827020000` (P0.7 series) | **CONFORMANT** (schema + query layer) | App promotion path (conversation → evidence → knowledge) is schema-supported but not swept in this audit; `kira_memory` still the de-facto app knowledge source | Knowledge authority split between legacy memory and canonical objects | Decide promotion pipeline adoption; see §5 |

---

## 2. Invariant Audit (INV-001 → INV-020)

| Invariant | Status | Evidence | Conflict / Gap | Required Action |
|---|---|---|---|---|
| **INV-001 Organisation persistence** | **CONFORMANT** | `organisations` (org_id PK) independent of persons/memberships/instances; org-scoped RLS across core tables (live `pg_policies`) | Live org rows are fixtures/tests; production identity not yet bridged | Apply E1.0-A; later org resolution for six users when evidence emerges |
| **INV-002 Person/role separation** | **CONFORMANT** (schema) / **PARTIAL** (data) | `persons` independent of `organisation_memberships`; `ownership_periods.person_id`; `organisational_knowledge.supplied_by → persons` | Only 4 test persons; six production users unmapped (still via legacy `users`) | E1.0-A bootstrap (persons + auth_credentials, no memberships) |
| **INV-003 Ownership temporalisation** | **PARTIAL** | `ownership_periods` (org_id, person_id, temporal) exists | 0 rows; no app write path found | Non-blocking; decide if/where ownership periods must be populated |
| **INV-004 Consultant first-class** | **CONFORMANT** | `consultant_profiles`, `consultant_relationships`, `consultant_history` | No live rows; feature usage unverified | P1 verification of feature use |
| **INV-005 Engagement first-class** | **CONFORMANT** | `engagements`, `engagement_history`, `engagement_participants` | No app orchestration sweeped this audit | P1 wiring verification |
| **INV-006 Consultant/Introducer separation** | **CONFORMANT** | `consultant_relationships` vs `introducers` distinct tables; `introducer_owner_projection()` org-scoped | None found | Monitor |
| **INV-007 Engagement/Subscription separation** | **CONFORMANT** | `engagements` independent of `subscriptions` | None found | Monitor |
| **INV-008 Kira/Organisation separation** | **CONFORMANT** | `kira_instances` org-anchored; `kira_agents` org-anchored; `INV-020` resolver used; P0.5-6 retired `get_organisation_id_from_user()` | App routing continuity unproven | Verify chat/knowledge paths resolve instance from org, not user UUID |
| **INV-009 Memory/Instance separation** | **CONFORMANT** (schema) | `organisational_knowledge` org-anchored independent of instance; `evidence.kira_instance_id` optional attribution | App still reads `kira_memory` user-keyed | P0/P1: rebind memory read/write to org context |
| **INV-010 Conversation/Knowledge separation** | **CONFORMANT** (schema) | `evidence` + `organisational_knowledge` distinct from `conversations`; `promotion_candidates` gates raw conversation → knowledge | App promotion adoption unverified; `kira_memory` still used directly | Decide promotion pipeline adoption (P1) |
| **INV-011 Knowledge provenance** | **CONFORMANT** (canonical schema) / **PARTIAL** (legacy) | `organisational_knowledge.supplied_by`, `source_type`, `evidence_id`, `observed_at`; `evidence.captured_by`, `engagement_id` | `kira_memory`/`kira_tasks`/`contact`-related legacy rows lack canonical provenance (user_id + conversation ref only) | Rebind #11 legacy memory sources to canonical evidence/provenance as promotion lands |
| **INV-012 Temporal knowledge** | **CONFORMANT** | `get_knowledge_at_time`, `get_knowledge_at_point_in_time`, `get_knowledge_history`, `get_superseded_knowledge`, `get_supersession_chain`; `organisational_knowledge_history` | App doesn't surface historical queries in audit scope | P1: expose temporal query in app UI/API |
| **INV-013 Commercial truth** | **CONFORMANT** | `commercial_arrangements` org-anchored, independent of org identity | No live rows | P1 verification |
| **INV-014 Commercial versioning** | **CONFORMANT** | `commercial_history` | No live rows | P1 verification |
| **INV-015 Paid Kira service** | **CONFORMANT** | `subscriptions` (org), `billing_periods_reported`, `checkout`, `billing/*` routes; beta trials/cohorts for intro experiences | Billing org-rebinding partially reviewed | P1 billing conformance sweep |
| **INV-016 Consultant economics separation** | **PARTIAL** | Consultant fees vs Kira fees not explicitly separated in a contractual/fees table found in this audit | No dedicated fee-currency separation structure | Decision: is a fees entity in P0.6 scope, or is current introducer/commercial handling sufficient? |
| **INV-017 Continuity** | **CONFORMANT** (architecture) | Org-anchored knowledge, history tables (`organisational_knowledge_history`, `consultant_history`, `engagement_history`, `kira_instance_history`, `commercial_history`, `decision_history`) | Replacement flows (consultant/instance/subscription) not yet exercised | P1 replacement-flow test scenario |
| **INV-018 No implementation-defined semantics** | **CONFORMANT** (post-E1 cleanup) | `verify_legacy_authority_retired()` passes 4/5; `get_organisation_id_from_user()` dropped; sync triggers dropped; no implementation-resolver redefines org meaning | Definitional only: the 5th assertion (policy naming) fails because org-scoped policies are not literally named `org_membership_access` | None (false positive) |
| **INV-019 Historical preservation** | **CONFORMANT** | History tables for every mutable canonical entity; `organisational_knowledge` uses `effective_from/effective_to` + `superseded_by` (no destructive update) | No destructive-mutation paths swept | Full DELETE/UPDATE sweep (P2) |
| **INV-020 Organisational subject primacy** | **PARTIAL (the core gap)** | Org anchor present on ~25 tables; but `kira_tasks`, `kira_knowledge_chunks`, `kira_fact_confirmations` have **no org column**; `kira_memory` org column exists but app reads/writes user-keyed; `genome_*` dual-keyed with 79 rows pending repair | Organisational intelligence (memory/chunks/facts/tasks) is not yet organisation-primarily owned | **P0:** add org anchors + rebind app writes for kira_tasks/chunks/fact_confirmations/kira_memory; execute pending genome_facts repair |

---

## 3. Legacy Authority Audit

*Distinction: `user_id` for provenance/actor/authorship is legitimate. `user_id` as ownership/tenant authority for organisational resources is a conflict.*

### 3.1 Legitimate remaining `user_id` uses (do NOT touch)

| Location | Use | Classification |
|---|---|---|
| `lib/auth.ts:134` | `.eq('auth_user_id', user.id)` → `auth_credentials` | (A) Credential bridge |
| `lib/auth.ts:57,68,75,77,82` | Legacy self-healing bridge (`users.auth_user_id` adoption). Comment explicitly states it will be removed once all `user_id` refs are rebound | (C) Bridging — keep until E1.0-A verified |
| `lib/auth.ts:215` | `resolveOrganisationFromUser` (HMAC/webhook) | (A) Trusted context resolution |
| `app/settings/actions.ts:18,34`; `app/my-genome/[area]`; `app/drafts/*`; `app/api/genome/{share,export,manual}` routes | `.eq('auth_user_id', authUser.id)` → `users` | (A/C) Auth bridge to legacy users |
| `organisational_knowledge.supplied_by`, `evidence.captured_by` | Person provenance | (A) Person FK |

### 3.2 Architectural conflicts — `user_id` as ownership/tenant authority

| Resource | Live schema | App pattern | Conflict | Required action |
|---|---|---|---|---|
| `kira_memory` | org column added (nullable?) | reads/writes via `user_id` (`lib/kira/*`, chat memory pipeline) | INV-009/INV-020 | P0: decide org fallback; rebind read/write to org context with `user_id` demoted to provenance |
| `kira_tasks` | **no org column** | user-keyed only | INV-020 | P0: add `organisation_id`, backfill, rebind |
| `kira_knowledge_chunks` | **no org column** | user-keyed; `match_kira_knowledge_chunks` (P0.4) is org-scoped | INV-020 | P0: add org column; reconcile chunk org vs knowledge org |
| `kira_fact_confirmations` | **no org column** | user-keyed; parents `memory_id` (user-keyed memory) | INV-020 | P0: add org (or route through parent) |
| `genome_facts` (`79 rows`) | org + user | user-keyed writes; 38 sentinel('00000000-0000-0000-0000-000000000000') org ids; 41-row owner has no membership | INV-020 + data integrity | **P0.1 (P2/E2):** execute the recorded repair (Option A/B) |
| `client_profiles`, `drive_documents`, `email_logs`, `introductions`, `kira_refusals`, `kira_research_sessions`, `knowledge_files`, `knowledge_urls`, `setup_sessions`, `user_feedback`, `voice_connect_events`, `genome_access_log`, `loi_commitments` | dual-keyed | org column present; various user-keyed path remnants | INV-020 (partial) | P1: confirm each read/write path resolves org first |
| `business_valuations` / `snapshots` | org + user | **P2.4-D rebound; user_id is provenance only** | Resolved | None (P2.4-D closed) |
| `pubguard_scans` | **no org column** | user-keyed | INV-020 | P2 (pubguard feature not in canonical core) |

---

## 4. Knowledge Architecture Audit

**Pipeline:** Conversation → Evidence → Knowledge → Organisational Knowledge Context

### 4.1 Canonical knowledge schema (P0.7) — present and rich

`evidence`: `evidence_id`, `organisation_id` (NOT NULL), `evidence_type`, `source_table/source_id/source_ref`, `captured_by` (person), `engagement_id`, `kira_instance_id`, `evidence_date`, `retention_until`, `metadata`. ✅ Provenance, source, org anchor, temporal.

`knowledge_evidence_links`: `link_id`, `knowledge_id`, `evidence_id`, `link_type`, `confidence`, `created_by`, `created_at`. ✅ Many-to-many evidence support with confidence.

`organisational_knowledge` (knowledge object): `knowledge_id`, `organisation_id` (NOT NULL), `knowledge_type`, subject/predicate/object(+type/value/metadata), `epistemic_state` (asserted/observed/inferred/validated/disputed/superseded…), `confidence` (0..1), `supplied_by` (person), `source_type`, `evidence_id`, `engagement_id`, `ownership_period_id`, `kira_instance_id`, `observed_at`, `effective_from`, `effective_to`, `is_current`, `superseded_by`, `supersession_reason`. ✅ **Full provenance, temporal validity, confidence, confirmation/disputation states, supersession — CONFORMANT.**

`organisational_knowledge_history`: full historical row capture. ✅ Historical preservation.

### 4.2 Query/promotion layer — present

- `get_current_knowledge`, `get_knowledge_at_time`, `get_knowledge_at_point_in_time`, `get_knowledge_history`, `get_superseded_knowledge`, `get_supersession_chain`, `get_knowledge_statistics`, `check_duplicate_knowledge`, `check_conflicting_knowledge`, `get_conflicting_knowledge`.
- `promotion_candidates`, `promotion_log`, `promotion_rules` tables exist — the promotion gate infrastructure is present.

### 4.3 Findings & gaps

1. **Promotion pipeline adoption unverified.** The migration series defines it; this audit did not sweep a live conversation→evidence→knowledge promotion path. Status: **schema-CONFORMANT, adoption-UNCLEAR.** *Marked UNCLEAR — needs a dedicated sweep.*
2. **`kira_memory` remains the de-facto application knowledge source.** `lib/kira/` flows (recall/convai/uid-tools) read/write `kira_memory` keyed by `user_id`. It is conversational memory, not canonical organisational knowledge. It does carry `organisation_id`, `superseded_by`, `confirmed_at`, and `genome_*` classification columns — a hybrid. Rebind (P0) or consciously keep as experience layer feeding promotion (P1 decision).
3. **`kira_knowledge_chunks` (user-keyed, no org)** is the embedding/searchable knowledge surface — **NON-CONFORMANT** to INV-020. Its org-scoped search twin `match_kira_knowledge_chunks` exists, so the search API is org-scoped but the storage table is not.
4. **Confirmation state exists in two places:** `organisational_knowledge.epistemic_state` (canonical) and `kira_fact_confirmations` (user-keyed legacy). The legacy one lacks an org anchor and confirms user-keyed memory. **Pending a consolidation decision.**
5. **Provenance of legacy rows:** `kira_memory` rows carry `user_id` + `source_conversation_id` but not canonical `captured_by`/`observed_at`. When promoted to `organisational_knowledge`, canonical fields must be populated, not left NULL.

**Per-dimension checklist (INV-011/012/020):**

| Property | Canonical schema | Legacy path | Status |
|---|---|---|---|
| provenance (person) | `supplied_by` | `user_id` | PARTIAL |
| source reference | `source_table/source_id/source_ref`, `evidence_id` | `source_conversation_id` | PARTIAL |
| organisation anchor | `organisation_id NOT NULL` | `kira_memory.org` nullable, tasks/chunks/facts none | NON-CONFORMANT (3 tables) |
| temporal context | `effective_from/to`, `observed_at`, `evidence_date` | `created_at` only | CONFORMANT (canon) / PARTIAL (legacy) |
| confidence | `confidence 0..1` | none | CONFORMANT |
| confirmation/validation | `epistemic_state` | `kira_fact_confirmations.outcome` | PARTIAL (split) |
| supersession | `superseded_by`, `supersession_reason`, `is_current` | `kira_memory.superseded_by` | PARTIAL |
| historical state | `organisational_knowledge_history` | none | CONFORMANT |

---

## 5. UNCLEAR — Needs Directed Inspection Next

These areas require a specific evidence sweep before a confident decision (no assumption made):

1. **Promotion pipeline adoption** — is there an app/API path that converts conversation → `evidence` → `organisational_knowledge`? (Sweep `app/api/kira/*`, `lib/kira/knowledge-*`, cron).
2. **`kira_memory.organisation_id` fill state** — is the org column populated in live rows or NULL for existing user-derived memory? (Read-only row sample.)
3. **Owner-person binding integrity** for `ownership_periods`/`engage` write paths — are there any active writes that create these? (App sweep).
4. **`commercial_arrangements` / `commercial_history` live rows** — audit found the schema; whether live commercial truth exists to backfill is unknown.
5. **Billing routes org-rebind** — `app/api/billing/*`, `app/api/checkout/*` partially reviewed; full conformance unverified.

---

## 6. Recommended Remediation Sequence

Ranked by canonical risk. Each entry: affected tables / code / migration / tests / data risk.

### P0 — must fix before further feature work

**P0.1 — Canonical identity bootstrap for production users (in flight).**
- Migration: `20260829150000_p24e10_identity_bootstrap.sql` (authored, **unpushed**): relax `migration_ledger.canonical_organisation_id` NOT NULL, insert 6 persons + 6 `auth_credentials` + 6 ledger rows (NULL org, `pending`).
- Affected: `persons`, `auth_credentials`, `migration_ledger`.
- No org/membership fabricated. Data risk: none (idempotent, transactional). Tests: verify 6/6 person+credential, 0 memberships.

**P0.2 — Repair `genome_facts` org integrity (79 rows).**
- Affected: `genome_facts` (38 sentinel org UUID, 41 no-membership owner).
- Migration: execute the recorded E2 repair decision (Option A with Option B fallback).
- Data risk: HIGH if wrong owner resolution — quarantine sentinel rows first.

**P0.3 — Add org anchor to `kira_tasks` / `kira_knowledge_chunks` / `kira_fact_confirmations`.**
- Migration: `ALTER TABLE ... ADD COLUMN organisation_id`, backfill via parent resources (task→conversation, chunk→knowledge, fact_confirm→memory→conversation), set NOT NULL.
- Code: rebind write/read paths to resolve org first (person→org context).
- Data risk: HIGH without backfill mapping — quarantinable; test on staging first.
- Reconcile `kira_knowledge_chunks` org vs parent `kira_knowledge` org (P0.4 already org-scoped its search twin).

**P0.4 — `kira_memory` org-first rebind.**
- Code: memory save/recall (`lib/kira/*`, chat/text pipeline) resolve organisation via person context; `user_id` demoted to provenance.
- Migration: none (org column exists) — verify non-null for new writes.
- Data risk: MEDIUM; reads must fall back gracefully for pre-org memory.

### P1 — required for canonical conformity

- **P1.1** Author and apply E1 fallback-removal migration (drop `users.id = auth_user_id` branches in `resolveOrganisationFromUser`/`link_or_create_app_user`) **only after** E1.0-A is live-verified. Gated separately.
- **P1.2** Billing conformance sweep: `app/api/billing/*`, `app/api/checkout/*` must resolve `organisation_id` from canonical context, never client-supplied.
- **P1.3** Conversation provenance: `conversations`/`conversation_messages` — confirm org immutability + user as provenance.
- **P1.4** Knowledge promotion adoption decision: route conversation→evidence→`organisational_knowledge`; wire `get_superseded_knowledge` UI.
- **P1.5** Rebind dual-keyed write paths to org-first: `client_profiles`, `drive_documents`, `email_logs`, `introductions`, `kira_refusals`, `kira_research_sessions`, `knowledge_files`, `knowledge_urls`, `setup_sessions`, `user_feedback`, `voice_connect_events`, `genome_access_log`, `loi_commitments`.
- **P1.6** Legacy-memory provenance backfill (`user_id`→`supplied_by`, `source_conversation_id`→`evidence_id` mapping) when promotion lands.

### P2 — important but can follow

- **P2.1** `pubguard_scans` org anchoring (feature not in canonical core).
- **P2.2** Full destructive-op sweep (DELETE/UPDATE/UPSERT that could violate INV-019).
- **P2.3** Governance/verification suite extension (mirror `verify_legacy_authority_retired()` for INV-002/009/010/020).

### P3 — future architecture

- **P3.1** Retire the legacy `users` table as identity bridge entirely (`auth_credentials` → `persons` sole path); migrate remaining `users`-typed provenance.
- **P3.2** `ownership_periods` population strategy.
- **P3.3** Temporal knowledge surfacing in product UI (answers to §29 architectural test questions 13–14 live).

---

## 7. Status Legend / Method Notes

- **CONFORMANT** — canonical semantics implemented at the audited layer.
- **PARTIAL** — structure present but a required semantic (data, app wiring, or immutability) is incomplete.
- **NON-CONFORMANT** — implementation actively violates the canonical invariant.
- **NOT IMPLEMENTED** — no trace found.
- **UNCLEAR** — evidence unavailable in scope; directed inspection required (§5).
- Audit is **static + live-DB**, not a runtime conversation exercise. No production data was modified.