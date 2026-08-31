# KIRA — P1.2 Full-Stack Traceability Matrix

**Status:** FORENSIC AUDIT COMPLETE
**Purpose:** Trace every canonical concept and invariant through the production stack; identify where semantic continuity is preserved, lost, duplicated or contradicted
**Scope:** Database → Service Layer → API Route → Authentication → Authorisation → Application State → UI → Runtime Behaviour
**Date:** 26 August 2026
**Prerequisite:** P1.1 COMPLETE; P0.6 schema baseline established
**Phase Boundary:** Evidence collection only. No fixes. No solution design. No code changes.

---

## Section 1 — Canonical Concept Traceability Matrix

For each of the nine canonical concepts, the complete production path through the Kira stack.

---

### 1. Organisation

| Layer | Implementation | Classification | Evidence |
|---|---|---|---|
| **Database** | `organisations` table. RLS: `auth_user_has_organisation_access(organisation_id)` FOR ALL. Canonical anchor for every domain table. | CANONICAL | `20260826100000_p05_canonical_identity.sql`; `20260826120000_p05_rls_authority_transfer.sql` |
| **Service Layer** | `getCurrentOrganisationContext()` (`lib/auth.ts:123-168`) resolves auth → auth_credentials → persons → organisation_memberships → organisations. Returns `OrganisationContext` with `organisationId`, `personId`, `membershipId`, `role`, `validFrom`, `validTo`. | CANONICAL | `lib/auth.ts:123-168` |
| **API Routes (canonical)** | `app/api/kira/chat/start/route.ts` — uses `getCurrentOrganisationContext()` for auth and writes to `conversations.organisation_id`. `app/api/kira/chat/text/route.ts` — uses `getCurrentOrganisationContext()`. `app/api/kira/knowledge/upload/route.ts` — uses `getCurrentOrganisationContext()` for auth, writes `created_by: userId`. | CANONICAL | `chat/start/route.ts:22`; `chat/text/route.ts:19`; `knowledge/upload/route.ts:25` |
| **API Routes (legacy)** | 15+ routes use `getCurrentAppUser()` exclusively. These resolve auth → users table, bypassing `persons` and `organisation_memberships`. The user_id from the `users` row is used for all downstream writes. The organisation is not resolved. | LEGACY | `app/api/kira/research/route.ts:29`; `app/api/kira/email/send-kira-ready/route.ts:50` (P0 violations); `app/api/kira/knowledge/upload/route.ts:110` (dual pattern) |
| **Authentication** | Session JWT via `supabase.auth.getUser()`. Session-scoped. | CANONICAL | `lib/auth.ts:128-130` |
| **Authorisation** | RLS on `organisations` table: `auth_user_has_organisation_access(organisation_id)`. Function has `users` table fallback (bridge period). Service-role clients bypass RLS entirely. | PARTIAL | `20260826120000_p05_rls_authority_transfer.sql:6-29`; `lib/supabase/server.ts:5` (service role) |
| **Application State** | `OrganisationContext` object available in authenticated routes. | CANONICAL | `lib/auth.ts:100-118` |
| **UI** | Page components use `getCurrentAppUser()` (legacy). The `organisations` table data is not directly referenced in any page component. | LEGACY | `lib/auth.ts:49-83` called from page components |

**Conformance: PARTIAL.** The canonical path works in three routes. 15+ routes bypass it. The UI uses legacy identity. The canonical organisation exists as an architectural anchor in the database but is not the runtime identity used by most of the application.

---

### 2. Person

| Layer | Implementation | Classification | Evidence |
|---|---|---|---|
| **Database** | `persons` table (canonical) + `users` table (legacy, retained for bridge). Both have data. `auth_credentials` links `auth_user_id` → `person_id`. | DUPLICATED | `20260826100000_p05_canonical_identity.sql`; `20260720100000_auth_link.sql` |
| **Service Layer** | `getCurrentOrganisationContext()` resolves through `auth_credentials` → `persons`. `getCurrentAppUser()` resolves through `users` table directly. Two parallel identity paths. | DUPLICATED | `lib/auth.ts:123-168` (canonical); `lib/auth.ts:49-83` (legacy) |
| **API Routes** | Some routes use canonical path; others use legacy. Identity resolution is route-dependent, not global. | DUPLICATED | Route-by-route variation (see Organisation above) |
| **Authentication** | Session JWT. Both paths use the same JWT. | CANONICAL | `lib/auth.ts:128-130` |
| **Authorisation** | `persons` table has RLS via `auth_user_has_organisation_access()`. `users` table has RLS via `auth.uid() = id`. Different RLS patterns for the same conceptual entity. | DUPLICATED | Different RLS policies per table |
| **Application State** | Some routes hold person_id from canonical path; others hold user_id from legacy path. | DUPLICATED | Route-dependent |
| **UI** | Pages use `getCurrentAppUser()` which returns a `users` row. The `persons` table is not directly referenced by UI code. | LEGACY | Page components import `getCurrentAppUser` |

**Conformance: DUPLICATED.** Person identity exists in two tables (`persons` and `users`) with two resolution paths. The canonical path is correct but underused. The legacy path is the default for most of the application. Data is written to both tables by different routes.

---

### 3. Ownership Period

| Layer | Implementation | Classification | Evidence |
|---|---|---|---|
| **Database** | `ownership_periods` table. Columns: `person_id`, `organisation_id`, `valid_from`, `valid_to`, `status`. RLS: none (P0.5 Step 5 gap). | ABSENT (application layer) | `20260826130000_p05_ownership_period.sql` |
| **Service Layer** | Zero TypeScript references. No file imports, reads, or writes `ownership_periods`. | ABSENT | `grep -r "ownership_periods" *.ts` returns zero results |
| **API Routes** | Zero routes. No endpoint creates, reads, updates, or deletes ownership periods. | ABSENT | No route file references `ownership_periods` |
| **Authentication** | N/A | N/A | N/A |
| **Authorisation** | N/A (no code path exists) | N/A | N/A |
| **Application State** | N/A | N/A | N/A |
| **UI** | N/A | N/A | N/A |
| **Ownership determination** | Currently derived from `organisation_memberships.role = 'owner'`. This is current-state only — not temporal. No ownership history exists. | LEGACY | `lib/auth.ts:142` (role priority comment) |

**Conformance: ABSENT.** The schema exists but has no application layer. Ownership is determined by role assignment, not by temporal periods. Historical ownership is not queryable.

---

### 4. Consultant

| Layer | Implementation | Classification | Evidence |
|---|---|---|---|
| **Database** | `consultant_profiles`, `consultant_relationships`, `consultant_history` tables. RLS: SELECT only (no INSERT/UPDATE/DELETE policies). | ABSENT (application layer) | `20260826140000_p05_consultant_relationship.sql` |
| **Service Layer** | Zero TypeScript references to any consultant table. No `lib/kira/consultant/` directory. No consultant service functions. | ABSENT | Directory `lib/kira/consultant/` does not exist |
| **API Routes** | Zero routes. No endpoint manages consultant profiles or relationships. | ABSENT | No route references consultant tables |
| **Authentication** | N/A | N/A | N/A |
| **Authorisation** | N/A | N/A | N/A |
| **Application State** | N/A | N/A | N/A |
| **UI** | N/A | N/A | N/A |
| **Consultant role** | "Consultant" exists as a role value in `organisation_memberships.role`. A person can be assigned the consultant role through membership. No consultant-specific logic is triggered by this role. | LEGACY | `lib/auth.ts:142` (role priority comment); `business-genome/orchestrator.ts` (mentions in prompts) |

**Conformance: ABSENT.** Consultant is a schema concept with no application layer. The consultant role exists in memberships but has no differentiated behaviour. The full consultant lifecycle (invite, onboard, assign, transition, offboard) does not exist in code.

---

### 5. Engagement

| Layer | Implementation | Classification | Evidence |
|---|---|---|---|
| **Database** | `engagements`, `engagement_participants`, `engagement_history` tables. RLS: SELECT only. | ABSENT (application layer) | `20260826150000_p05_engagement_model.sql` |
| **Service Layer** | Zero TypeScript references to any engagement table. No engagement service functions. | ABSENT | `grep -r "engagements" --include="*.ts" lib/` returns zero results for the canonical table |
| **API Routes** | Zero routes. No endpoint manages engagements. | ABSENT | No route references engagement tables |
| **Authentication** | N/A | N/A | N/A |
| **Authorisation** | N/A | N/A | N/A |
| **Application State** | N/A | N/A | N/A |
| **UI** | N/A | N/A | N/A |
| **"Engagement" in code** | 29 TypeScript references to "engagement" — none refer to the canonical concept. References are: employment classification (`lib/genome/checklist.ts`), professional agreement text (`lib/introducer/undertaking.ts`), re-engagement emails (`app/api/cron/reengagement-emails/`), social media metrics (`app/api/pubguard/v2/types.ts`), and LLM prompts. | N/A (unrelated) | Multiple files, all unrelated to the canonical engagement model |

**Conformance: ABSENT.** Engagement is a schema concept with no application layer. The word "engagement" appears in code but never refers to the canonical engagement model.

---

### 6. Kira Instance

| Layer | Implementation | Classification | Evidence |
|---|---|---|---|
| **Database** | `kira_instances`, `kira_instance_history` tables. RLS: none (P0.5 Step 5 gap). FK: `kira_instances.organisation_id → organisations.id`. | ABSENT (application layer, no RLS) | `20260826180000_p05_kira_instance_separation.sql` |
| **Service Layer** | Zero TypeScript references to `kira_instances` or `kira_instance_history`. Agent management happens through `kira_agents` table (legacy). | ABSENT | `grep -r "kira_instances" --include="*.ts"` returns zero results |
| **API Routes** | Zero routes. No endpoint creates, configures, replaces, or retires a Kira instance. | ABSENT | No route references `kira_instances` |
| **Authentication** | N/A | N/A | N/A |
| **Authorisation** | N/A (no RLS on `kira_instances` table) | N/A | N/A |
| **Application State** | N/A | N/A | N/A |
| **UI** | N/A | N/A | N/A |
| **Instance management** | Agent provisioning uses `kira_agents` table (legacy). `scripts/provision-existing-agents.mjs` reads/writes `kira_agents`. Agent lifecycle is managed through ElevenLabs API, not through a canonical instance model. | LEGACY | `scripts/provision-existing-agents.mjs`; `lib/kira/convai.ts` (provisioning) |

**Conformance: ABSENT.** The canonical `kira_instances` table has no RLS and no application code. Agent management operates entirely against the legacy `kira_agents` table.

---

### 7. Subscription

| Layer | Implementation | Classification | Evidence |
|---|---|---|---|
| **Database (canonical)** | `subscriptions` table. Columns: `id`, `organisation_id`, `tier_id`, `status`, `valid_from`, `valid_to`, `current_period_start`, `current_period_end`, `created_at`, `updated_at`. RLS: none. | CONFLICTING (canonical table exists, unused) | `20260826170000_p05_commercial_structures.sql` |
| **Database (legacy)** | `users` table carries: `subscription_status`, `stripe_subscription_id`, `stripe_customer_id`, `trial_ends_at`. This is where billing actually writes. | LEGACY (active production use) | `lib/billing/index.ts:106-112` |
| **Service Layer** | `lib/billing/index.ts` configures `createSubscriberAdapter()` from `@caistech/subscription-billing` against the `users` table. `lib/billing/plan-state.ts` derives plan state from `user.subscription_status`. `lib/billing/arrears.ts` reads from `users` table. | LEGACY | `lib/billing/index.ts:106-112`; `lib/billing/plan-state.ts`; `lib/billing/arrears.ts` |
| **API Routes** | `POST /api/checkout` — creates Stripe checkout session, updates `users.subscription_status`. `POST /api/billing/cancel` — cancels subscription on `users` table. `GET /api/billing/portal` — opens Stripe portal. `GET /api/billing/usage` — reads voice cost from `users`. `GET /api/billing/mode` — returns live/test mode. All routes write to `users` table, never to `subscriptions` table. | LEGACY | `app/api/checkout/route.ts`; `app/api/billing/cancel/route.ts`; `app/api/billing/portal/route.ts` |
| **Authentication** | Session JWT. Routes check `getCurrentOrganisationContext()` or `getCurrentAppUser()`. | MIXED | Route-dependent |
| **Authorisation** | `checkout/route.ts:90-101` checks owner role via `getCurrentOrganisationContext()`. `billing/cancel/route.ts:56-66` checks `user.id === currentUserId`. | MIXED | Route-dependent |
| **Application State** | `user.subscriptionStatus` held in the `users` object on the client. The canonical `subscriptions` table is not referenced in application state. | LEGACY | Client-side user object |
| **UI** | Pages reference `user.subscriptionStatus` from the `users` object. | LEGACY | Client components |
| **Canonical `subscriptions` table** | Never read or written by any application code. The table has no RLS. `subscription_history` has a trigger but is never populated because no writes go to `subscriptions`. | ABSENT | Zero TypeScript references |

**Conformance: CONFLICTING.** The canonical `subscriptions` table exists but is entirely unused. The billing system operates exclusively against legacy `users` table columns. Subscription history is not recoverable. The canonical table has no RLS.

---

### 8. Commercial Arrangement

| Layer | Implementation | Classification | Evidence |
|---|---|---|---|
| **Database** | `commercial_arrangements`, `commercial_history` tables. RLS: none. | ABSENT (application layer, no RLS) | `20260826170000_p05_commercial_structures.sql` |
| **Service Layer** | Zero TypeScript references. No service functions read or write commercial arrangement data. | ABSENT | `grep -r "commercial_arrangements" --include="*.ts"` returns zero results |
| **API Routes** | Zero routes. No endpoint manages commercial arrangements. | ABSENT | No route references commercial arrangement tables |
| **Authentication** | N/A | N/A | N/A |
| **Authorisation** | N/A (no RLS on tables) | N/A | N/A |
| **Application State** | N/A | N/A | N/A |
| **UI** | N/A | N/A | N/A |
| **Commercial data in code** | `arrangement_type` enum values (`consultant_fees`, `kira_subscription`, `revenue_share`, etc.) are defined in SQL but never referenced in TypeScript. `PRICE_TIERS` is defined in `lib/valuation/pricing.ts` (code-only, no DB table). | N/A | SQL enum; `lib/valuation/pricing.ts` |

**Conformance: ABSENT.** Commercial Arrangement is a schema concept with no application layer. The broader economic/contractual relationship between parties is not represented in application code. Pricing is code-only with no versioning.

---

### 9. Organisational Knowledge Context

| Layer | Implementation | Classification | Evidence |
|---|---|---|---|
| **Database (P0.7)** | `organisational_knowledge`, `organisational_knowledge_history`, `evidence`, `knowledge_evidence_links`, `knowledge_relationships`, `promotion_rules`, `promotion_candidates`, `promotion_log` tables. Full RLS via `auth_user_has_organisation_access(organisation_id)`. 9 SQL functions for temporal queries. | ABSENT (application layer) | `20260826210000_p07_knowledge_object_schema.sql`; `20260826220000_p07_evidence_schema.sql`; `20260826230000_p07_knowledge_promotion_pipeline.sql` |
| **Database (legacy)** | `kira_knowledge` table (document RAG). `kira_memory` table (operational memory). `genome_entities`, `genome_facts`, `genome_relationships` (structured knowledge). All person-scoped via `user_id`. | LEGACY (active production use) | Multiple migrations |
| **Service Layer (P0.7)** | Zero TypeScript references to `organisational_knowledge`, `evidence`, `knowledge_evidence_links`, or any P0.7 table. No repository code. | ABSENT | `grep -r "organisational_knowledge" --include="*.ts"` returns zero results |
| **Service Layer (legacy)** | `business-genome/repository.ts` — CRUD for `genome_*` tables. `lib/kira/knowledge-search.ts` — search over `kira_knowledge`. `lib/kira/recall.ts` — recall from `kira_memory` + Mnemo. `lib/kira/memory-extract.ts` — extraction from conversations. `lib/kira/knowledge-ingest.ts` — document ingestion. | LEGACY (active) | `business-genome/repository.ts`; `lib/kira/knowledge-search.ts`; `lib/kira/recall.ts` |
| **API Routes (P0.7)** | Zero routes that read/write P0.7 tables. | ABSENT | No route references P0.7 tables |
| **API Routes (legacy)** | `POST /api/kira/knowledge/upload` — ingests documents into `kira_knowledge`. `POST /api/kira/knowledge/url` — ingests URLs into `kira_knowledge`. `DELETE /api/kira/knowledge/[id]` — deletes from `kira_knowledge`. `POST /api/kira/discovery/ingest` — ingests from Google Drive into `genome_*`. All write to person-scoped legacy tables. | LEGACY (active) | `knowledge/upload/route.ts`; `discovery/ingest/route.ts` |
| **Authentication** | Session JWT. Routes use `getCurrentOrganisationContext()` or `getCurrentAppUser()`. | MIXED | Route-dependent |
| **Authorisation** | RLS on legacy tables via `auth_user_has_organisation_access()` (on `kira_knowledge`, `kira_memory`, `genome_*`). | CANONICAL (RLS correct) | RLS policies |
| **Knowledge flow (runtime)** | `conversation → onConversationComplete → memory-extract → kira_memory + genome_*`. No path to `organisational_knowledge`. No path to `evidence`. | LEGACY (chain terminates at person-scoped tables) | `lib/kira/convai.ts:89-120` |
| **Agent tools** | `recall_memory` → reads `kira_memory`. `search_knowledge` → reads `kira_knowledge`. `save_memory` → writes `kira_memory`. `area_agenda` → reads `genome_*`. All tools operate against person-scoped legacy tables. No tool reads or writes P0.7 tables. | LEGACY (tools cannot access P0.7) | `lib/kira/recall.ts`; `lib/kira/knowledge-search.ts`; `business-genome/orchestrator.ts` |
| **UI** | Pages reference `kira_knowledge` and `genome_*` data. P0.7 tables are not referenced. | LEGACY | Client components |

**Conformance: ABSENT (P0.7) / LEGACY (active layers).** The P0.7 knowledge layer is a complete schema with no application integration. The active knowledge system operates entirely against person-scoped legacy tables. The canonical boundary between evidence and knowledge (INV-010) is defined in P0.7 but enforced in neither Layer 1 (kira_memory) nor Layer 2 (genome). The evidence table is never written to by any application code.

---

## Section 2 — Invariant Traceability Matrix

For each of the 20 invariants, the complete runtime enforcement path.

---

### INV-001 — Organisation Persistence

> An Organisation persists independently of its members, consultants, engagements, subscriptions, Kira instances, and software implementations.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | `organisations` table with dedicated `id`. RLS via `auth_user_has_organisation_access(organisation_id)` FOR ALL. | None |
| **Service** | `getCurrentOrganisationContext()` resolves through `organisation_memberships` → `organisations`. | None for routes that use it. |
| **API** | 3 routes use canonical path. 15+ routes bypass it. | Legacy routes do not resolve to `organisations` — they use `users.id` as identity anchor. |
| **Agent** | Agent tools use `?uid=user_id`. The organisation is not resolved at the tool level. | Agent operates at person level, not organisation level. |
| **UI** | Pages use `getCurrentAppUser()` — legacy identity. | Organisation not visible in UI. |
| **Runtime** | Organisation record exists independently. But most runtime paths do not touch it. | The organisation is architecturally present but operationally invisible to most code paths. |

**Verdict: PARTIAL.** Schema enforcement is correct. Application enforcement exists in 3 routes. The remaining routes bypass organisational identity entirely. The gap is not exploitable as a data-loss issue (the `organisations` table is protected by RLS) but the organisation is not the runtime identity used by most of the application.

---

### INV-002 — Person/Role Separation

> A Person is a distinct entity from their roles. Roles are attributes of the person's relationship to an organisation.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | `persons` table (identity) separate from `organisation_memberships` (role). `role` is a column on `organisation_memberships`, not on `persons`. | None |
| **Service** | `getCurrentOrganisationContext()` returns both `personId` and `role` from the membership. `getCurrentAppUser()` returns only `users.id` — no role resolution. | Legacy path has no role resolution. |
| **API** | Canonical routes have role. Legacy routes do not. | Role is not consistently available. |
| **Agent** | `currentUserHasRole()` defined but never called. | Role differentiation is application-dead. |
| **UI** | No role-based UI differentiation. | All users see the same interface regardless of role. |
| **Runtime** | Role exists in the database but is not used for access control, UI differentiation, or agent behaviour. | Role is structurally present but operationally unused. |

**Verdict: PARTIAL.** Schema separation is correct. Application enforcement is absent — roles are not used for any runtime decision.

---

### INV-003 — Ownership Temporalisation

> Ownership is a temporal state, not a permanent attribute. Historical ownership must be recoverable.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | `ownership_periods` table with `valid_from`/`valid_to`. | None at schema level. |
| **Service** | Zero TypeScript references. | **Complete gap — no application code reads or writes ownership periods.** |
| **API** | Zero routes. | No way to create, query, or modify ownership periods. |
| **Agent** | N/A | N/A |
| **UI** | N/A | N/A |
| **Runtime** | Ownership is determined by `organisation_memberships.role = 'owner'` — current-state only. No historical ownership exists. | **Ownership changes are not tracked. Historical ownership is unrecoverable.** |

**Verdict: ABSENT.** Schema exists but has no application layer. Historical ownership cannot be reconstructed. The table has no RLS.

---

### INV-004 — Consultant First-Class Status

> A Consultant is a first-class entity with their own identity, lifecycle, and relationships.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | `consultant_profiles`, `consultant_relationships`, `consultant_history`. RLS: SELECT only. | **No INSERT/UPDATE/DELETE RLS policies.** |
| **Service** | Zero TypeScript references. | **Complete gap.** |
| **API** | Zero routes. | No consultant lifecycle management. |
| **Agent** | "Consultant" mentioned in LLM prompts but not as a data concept. | N/A |
| **UI** | N/A | N/A |
| **Runtime** | Consultant role exists in `organisation_memberships` but has no differentiated behaviour. | Consultant is a membership role, not a first-class entity. |

**Verdict: ABSENT.** Schema exists but has no application layer. The consultant lifecycle does not exist in code.

---

### INV-005 — Engagement First-Class Status

> An Engagement is a first-class entity representing a bounded period of consultant-client interaction.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | `engagements`, `engagement_participants`, `engagement_history`. RLS: SELECT only. | **No INSERT/UPDATE/DELETE RLS policies.** |
| **Service** | Zero TypeScript references. | **Complete gap.** |
| **API** | Zero routes. | No engagement lifecycle management. |
| **Agent** | N/A | N/A |
| **UI** | N/A | N/A |
| **Runtime** | No engagement concept exists at runtime. | Engagements cannot be created, progressed, or completed. |

**Verdict: ABSENT.** Schema exists but has no application layer.

---

### INV-006 — Consultant/Introducer Separation

> Consultants and Introducers are structurally and semantically distinct. A consultant provides services; an introducer refers clients.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | Consultant tables (`consultant_*`) and Introducer tables (`introducer_*`) are fully independent. Different identity models (`person_id` vs `email`). Different relationship structures. Different RLS boundaries. | None |
| **Service** | Consultant: no service code. Introducer: full service code in `lib/introducer/`. | Asymmetric — introducer is implemented, consultant is not. |
| **API** | Consultant: zero routes. Introducer: 10+ API routes. | Asymmetric — introducer is implemented, consultant is not. |
| **Agent** | Agent tools do not differentiate between consultant and introducer. | N/A |
| **UI** | Introducer channel has full UI. Consultant has no UI. | Asymmetric |
| **Runtime** | Introducer channel is fully operational. Consultant channel does not exist at runtime. | **The separation is architecturally correct but operationally one-sided.** |

**Verdict: CONFIRMED (structural) / ABSENT (consultant implementation).** The schema correctly separates consultants and introducers. The introducer side is fully implemented. The consultant side has no application layer. The separation is architecturally sound but operationally incomplete.

---

### INV-007 — Engagement/Subscription Separation

> An Engagement is not a Subscription. A Subscription is a commercial arrangement; an Engagement is a bounded interaction.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | No FK between `engagements` and `subscriptions`. Different ownership paths. | None |
| **Service** | Neither table is referenced in application code. | N/A |
| **API** | Neither table is referenced in API routes. | N/A |
| **Agent** | N/A | N/A |
| **UI** | N/A | N/A |
| **Runtime** | No engagement or subscription lifecycle management exists in application code. | Separation is structurally correct but irrelevant at runtime because neither concept is implemented. |

**Verdict: CONFIRMED (structural) / IRRELEVANT (neither concept is implemented).** The schema correctly separates them. Neither has an application layer.

---

### INV-008 — Kira/Organisation Separation

> A Kira Instance is not the Organisation it serves. The Organisation must survive changes to its Kira Instance.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | `kira_instances.organisation_id → organisations.id`. FK enforced. | None at schema level. No RLS on `kira_instances`. |
| **Service** | Zero TypeScript references to `kira_instances`. Agent management uses `kira_agents` (legacy). | **Complete gap — no application code references the canonical instance model.** |
| **API** | Zero routes. | No instance lifecycle management. |
| **Agent** | Agent provisioning uses `kira_agents.user_id`, not `kira_instances.organisation_id`. | Legacy instance model is active. |
| **UI** | N/A | N/A |
| **Runtime** | Agent lifecycle is managed through `kira_agents` table and ElevenLabs API. The canonical `kira_instances` table is never touched. | **If the Kira application were replaced, there is no code path to migrate instance state from `kira_agents` to `kira_instances`.** |

**Verdict: PARTIAL (schema) / ABSENT (application).** The FK relationship is correct at the schema level. No application code uses it. Agent management operates against the legacy `kira_agents` table.

---

### INV-009 — Memory/Instance Separation

> Organisational knowledge is independent of the Kira Instance that produced it.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | P0.7 `organisational_knowledge.organisation_id` (org-scoped). Legacy `kira_memory.user_id` and `genome_*.user_id` (person-scoped). | **Two different scoping models coexist.** |
| **Service** | P0.7: no application code. Legacy: active. | Legacy memory is person-scoped, not org-scoped. |
| **API** | P0.7: no routes. Legacy: active routes. | No path from legacy memory to org-scoped knowledge. |
| **Agent** | Tools use `?uid=user_id`. Memory is person-scoped. | Agent cannot produce org-scoped knowledge. |
| **UI** | References person-scoped memory. | N/A |
| **Runtime** | The post-call pipeline (`lib/kira/convai.ts:89-120`) writes to `kira_memory` and `genome_*` — both person-scoped. The P0.7 `organisational_knowledge` table is never written to. | **Memory is anchored to the person, not the organisation. If the person changes their Kira instance, or if a new consultant takes over, the memory does not transfer.** |

**Verdict: FAIL.** Memory is person-scoped at runtime, not organisation-scoped. The P0.7 schema provides org-scoping but has no application integration. This is the core architectural gap that P1.1 identified.

---

### INV-010 — Conversation/Knowledge Separation

> Conversation is evidence. Organisational knowledge is the contextualised organisational interpretation derived from evidence. They are distinct.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | P0.7: `evidence` table (raw source) separate from `organisational_knowledge` (governed). Links via `knowledge_evidence_links`. | Correct at schema level. |
| **Service (P0.7)** | Zero TypeScript references. | **Complete gap.** |
| **Service (legacy)** | `completeConversationMemory` in `lib/kira/convai.ts:150` writes to `kira_memory`. `classifyPendingMemories` writes to `genome_*`. No evidence table is written to. | Legacy conflates conversation and memory. |
| **API** | No route writes to `evidence` or `organisational_knowledge`. | No path for evidence → knowledge promotion. |
| **Agent** | Agent saves memories directly. No distinction between evidence and knowledge. | Agent conflates evidence and knowledge. |
| **UI** | Displays memories and genome data. No distinction between evidence and knowledge. | N/A |
| **Runtime** | Conversation ends → `kira_memory` row created. Memory is person-scoped. No evidence table is written to. No knowledge promotion occurs. | **The canonical boundary (INV-010) is defined in P0.7 but enforced in neither Layer 1 nor Layer 2.** |

**Verdict: FAIL.** The canonical separation between evidence and knowledge is defined in P0.7 but not enforced anywhere in the application. Conversations produce person-scoped memories directly, with no intermediate evidence layer and no promotion to governed organisational knowledge.

---

### INV-011 — Knowledge Provenance

> For every piece of organisational knowledge, the system must record: who said/created it, when, in what context, whether it was observed/asserted/inferred/validated, whether it has been contradicted, and whether it is current or historical.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema (P0.7)** | `organisational_knowledge` has `created_by`, `created_at`, `source_context`, `epistemic_status`, `superseded_by`, `effective_from`, `effective_to`, `is_current`. `evidence` table has `source_type`, `source_id`, `captured_at`, `epistemic_status`. Links via `knowledge_evidence_links`. | Correct at schema level. |
| **Schema (legacy)** | `genome_facts` has `source_type`, `source_id`, `observed_at`, `superseded_at`, `supersedes`. `kira_memory` has `user_id`, `agent_id`, `created_at`. | Partial — genome has some provenance; memory has minimal. |
| **Service** | P0.7: no code. Legacy: genome extraction writes `source_type`/`source_id` inline. | **P0.7 provenance infrastructure unused.** |
| **API** | No route writes P0.7 provenance. | N/A |
| **Agent** | Tools do not capture provenance beyond `user_id` + `agent_id`. | N/A |
| **Runtime** | Provenance at runtime is limited to: `user_id` (who owns the memory), `agent_id` (which agent wrote it), `created_at` (when), `source_type`/`source_id` (for genome facts). No epistemic status, no effective dates, no current/historical distinction. | **Runtime provenance is partial. P0.7 provenance infrastructure exists but is unused.** |

**Verdict: PARTIAL.** Schema provides comprehensive provenance (P0.7). Runtime provides minimal provenance (user_id + agent_id + created_at). The gap between schema capability and runtime reality is significant.

---

### INV-012 — Temporal Knowledge

> The system must support point-in-time queries: "What did we know about X on date Y?"

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | 9 SQL functions: `get_knowledge_at_time`, `get_knowledge_at_point_in_time`, `get_knowledge_history`, `get_supersession_chain`, `get_superseded_knowledge`, `get_conflicting_knowledge`, etc. | Correct at schema level. |
| **Service** | Zero TypeScript references to any temporal function. | **Complete gap — no code calls these functions.** |
| **API** | No route exposes temporal queries. | No way to query "as of" from the application. |
| **Agent** | Agent tools do not support temporal queries. | Agent cannot answer "what was true on date X?" |
| **UI** | No temporal query UI. | N/A |
| **Runtime** | Temporal infrastructure exists in the database but is never invoked by the application. | **Temporal knowledge is schema-defined but runtime-inaccessible.** |

**Verdict: FAIL (at runtime).** Schema provides comprehensive temporal infrastructure. No application code uses it. The system cannot answer "what did we know on date Y?" at runtime.

---

### INV-013 — Commercial Truth

> Commercial arrangements are truthful and current. The system records the actual commercial terms, not approximations.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | `commercial_arrangements` table. RLS: none. | Table exists but no RLS. |
| **Service** | Zero TypeScript references. | **Complete gap.** |
| **API** | Zero routes. | No way to read or write commercial arrangements. |
| **Agent** | N/A | N/A |
| **UI** | N/A | N/A |
| **Runtime** | Pricing is defined in `lib/valuation/pricing.ts` as code constants (`PRICE_TIERS`). No DB table. No versioning. | **Commercial truth is in code, not in data. Pricing cannot be versioned or audited.** |

**Verdict: ABSENT.** Commercial arrangements have no application layer. Pricing is code-only.

---

### INV-014 — Commercial Versioning

> Commercial arrangement changes are recorded with effective dates, preserving historical truth.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | `commercial_history` trigger on `commercial_arrangements` INSERT/UPDATE. | Trigger exists but table has no RLS and no application writes. |
| **Service** | Zero TypeScript references. | **Complete gap.** |
| **API** | Zero routes. | N/A |
| **Agent** | N/A | N/A |
| **UI** | N/A | N/A |
| **Runtime** | No writes to `commercial_arrangements` or `commercial_history` from application code. The trigger exists but never fires because no application code writes to the table. | **Commercial versioning is schema-defined but never populated.** |

**Verdict: ABSENT.** The trigger infrastructure exists but has no application writes to trigger.

---

### INV-015 — Paid Kira Service

> Kira is a paid service. Billing enforcement must be robust.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | `users.subscription_status` with enum: `none`, `trial`, `active`, `past_due`, `cancelled`. `users.stripe_subscription_id`. | LEGACY (not in canonical `subscriptions` table) |
| **Service** | `lib/billing/index.ts` — `createBetaGate()` from `@caistech/beta-gate` enforces access. `lib/billing/arrears.ts` — arrears billing with 12-month cap. `lib/billing/plan-state.ts` — plan state derivation. | ACTIVE (against legacy table) |
| **API** | Checkout, cancel, portal, usage, mode routes all operational. | ACTIVE |
| **Agent** | Agent checks `check_access()` before dispatching actions. | ACTIVE |
| **UI** | Billing UI shows subscription status. | ACTIVE |
| **Runtime** | Billing is enforced via `@caistech/beta-gate` and `@caistech/subscription-billing`. The arrears model enforces monthly invoicing with a fair-use ceiling. Cancellation enforces month-waiver. | **Billing is operationally robust but operates against the legacy `users` table, not the canonical `subscriptions` table.** |

**Verdict: CONFIRMED (operational) but LEGACY (against wrong table).** Billing enforcement works. The data model is legacy.

---

### INV-016 — Consultant Economics Separation

> Consultant economics (fees, revenue sharing) are separate from Kira subscription economics.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | `commercial_arrangements` with `arrangement_type` enum includes `consultant_fees` and `kira_subscription` as separate values. | Correct at schema level. |
| **Service** | Zero TypeScript references. | **Complete gap.** |
| **API** | Zero routes. | N/A |
| **Agent** | N/A | N/A |
| **UI** | N/A | N/A |
| **Runtime** | No consultant economics exist in application code. No separation is enforced because neither concept is implemented. | **Separation is schema-defined but not implemented.** |

**Verdict: ABSENT.** Both concepts have no application layer.

---

### INV-017 — Continuity

> The organisation's knowledge survives transitions: consultant changes, instance replacements, ownership changes.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | P0.7 `organisational_knowledge` is org-scoped. RLS via `auth_user_has_organisation_access(organisation_id)`. | Correct at schema level. |
| **Service** | P0.7: no code. Legacy: memory is person-scoped (`user_id`). | **Legacy memory cannot survive transitions.** |
| **API** | No route promotes person-scoped memory to org-scoped knowledge. | No continuity mechanism exists. |
| **Agent** | Agent tools are person-scoped. | Agent cannot ensure continuity. |
| **UI** | N/A | N/A |
| **Runtime** | Memory is anchored to `user_id`. If the user changes their Kira instance, or a new consultant takes over, the memory does not transfer. There is no promotion path from person-scoped to org-scoped knowledge. | **Continuity is architecturally impossible with the current runtime model.** |

**Verdict: FAIL.** Continuity requires org-scoped knowledge. The runtime model is person-scoped. The gap is structural, not a missing feature.

---

### INV-018 — No Implementation-Defined Semantics

> Canonical concepts must not be redefined by the implementation to mean something different from the canonical model.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | Canonical tables use canonical names and structures. | None |
| **Service** | Legacy paths redefine identity: `users.id` acts as organisation anchor, person anchor, and subscription anchor simultaneously. | **Legacy semantics redefine canonical concepts.** |
| **API** | Some routes accept `user_id` from client body — redefining identity as client-supplied rather than server-resolved. | **P0 authority violations redefine identity semantics.** |
| **Agent** | Agent tools use `?uid=user_id` — identity is baked at provisioning time, not resolved per-request. | **Tool identity is implementation-defined, not canonical.** |
| **UI** | Pages use `user.id` as the universal identifier — conflating person, organisation, and subscription identity. | **UI semantics are legacy, not canonical.** |
| **Runtime** | The `users` table carries attributes that should belong to separate canonical entities: `subscription_status` (should be in `subscriptions`), `organisation_id` (should be resolved through `organisation_memberships`), `person_id` (should be in `persons`). | **The `users` table is a god-table that conflates multiple canonical identities.** |

**Verdict: FAIL.** Legacy implementation redefines canonical semantics. The `users` table conflates person, organisation, subscription, and instance identity into a single row.

---

### INV-019 — Historical Preservation

> Historical data is preserved. Past states are not overwritten.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | 7 `_history` tables: `consultant_history`, `engagement_history`, `commercial_history`, `subscription_history`, `kira_instance_history`, `decision_history`, `organisational_knowledge_history`. | Correct at schema level. |
| **Service** | Zero TypeScript references to any `_history` table. | **Complete gap — history tables are never written to by application code.** |
| **API** | Zero routes read or write `_history` tables. | N/A |
| **Agent** | N/A | N/A |
| **UI** | N/A | N/A |
| **Runtime** | History tables exist but are never populated because no application code writes to them. The triggers on `commercial_history` and `subscription_history` exist but never fire. | **Historical preservation is schema-defined but never populated.** |

**Verdict: FAIL (at runtime).** Schema provides history tables. Runtime never populates them. Historical data is overwritten or lost.

---

### INV-020 — Organisational Subject Primacy

> The Organisation is the primary subject. All data belongs to the Organisation, not to the person, instance, or interface.

| Layer | Enforcement | Gap |
|---|---|---|
| **Schema** | Canonical tables have `organisation_id` as the scoping column. RLS via `auth_user_has_organisation_access(organisation_id)`. | Correct for canonical tables. |
| **Schema (legacy)** | `kira_memory`, `genome_*`, `kira_knowledge`, `client_profiles`, `business_valuations`, `kira_tasks` all use `user_id` as the scoping column. | **Legacy tables scope to person, not organisation.** |
| **Service** | P0.7: no code. Legacy: memory/genome operations are person-scoped. | Person-scoped operations dominate. |
| **API** | Routes write to person-scoped tables. | Data belongs to the person, not the organisation. |
| **Agent** | Tools use `?uid=user_id`. | Agent produces person-scoped data. |
| **UI** | Pages display person-scoped data. | User sees their own data, not the organisation's data. |
| **Runtime** | The vast majority of runtime data is person-scoped. The organisation exists as an anchor in the database but is not the runtime subject. | **The organisation is the architectural anchor but not the runtime subject.** |

**Verdict: FAIL.** The organisation is the architectural anchor (schema) but not the runtime subject (application). Data belongs to the person at runtime, not the organisation.

---

## Section 3 — Legacy/Canonical Bridge Map

This section maps every bridge point between the legacy person-scoped architecture and the canonical organisation-scoped architecture. Where there is no bridge, "Semantic discontinuity" identifies that the meaning does not survive the boundary.

### Bridge Table

| Legacy Entity (Person-Scoped) | Canonical Entity (Org-Scoped) | Bridge Exists? | Bridge Mechanism | Semantic Discontinuity? | Impact |
|---|---|---|---|---|---|
| `users.id` | `organisations.organisation_id` | Partial | `auth_credentials → persons → organisation_memberships → organisations` (canonical path) | **Yes** — many routes still use `users.id` directly | Data written via legacy path is invisible to canonical queries |
| `users.id` | `persons.person_id` | Partial | `auth_credentials` table links `auth_user_id` → `person_id` | **Yes** — dual `users`/`persons` writes | Person identity split across two tables |
| `users.id` | `organisation_memberships.membership_id` | Partial | `organisation_memberships.person_id → persons.person_id` | **Yes** — membership is derived, not direct | Role-based access is schema-present but application-absent |
| `users.subscription_status` | `subscriptions` | **NO** | None — billing writes to `users`, not to `subscriptions` | **Yes** — subscription state in legacy table; canonical table is empty | Subscription history is unrecoverable; billing operates against legacy |
| `users.stripe_subscription_id` | `subscriptions` | **NO** | None — Stripe reference lives in `users`, not in `subscriptions` | **Yes** | Canonical subscription table has no Stripe reference |
| `users.stripe_customer_id` | (no canonical equivalent) | **NO** | None | **Yes** — Stripe customer identity is on the god-table | No canonical home for Stripe customer identity |
| `users.trial_ends_at` | `subscriptions` | **NO** | None | **Yes** — trial clock on legacy table | Trial state not in canonical model |
| `kira_memory.user_id` | `organisational_knowledge.organisation_id` | **NO** | None — no promotion path from memory to knowledge | **Yes** — memory is person-scoped; knowledge should be org-scoped | Memory cannot survive person/instance changes |
| `genome_*.user_id` | `organisational_knowledge.organisation_id` | **NO** | None — no promotion path from genome to knowledge | **Yes** — genome is person-scoped; knowledge should be org-scoped | Knowledge cannot survive person/instance changes |
| `kira_knowledge.user_id` | `organisational_knowledge.organisation_id` | **NO** | None — document RAG is person-scoped | **Yes** — documents cannot survive person changes | RAG corpus is person-bound |
| `kira_agents.user_id` | `kira_instances.organisation_id` | **NO** | None — agent management uses `kira_agents`, not `kira_instances` | **Yes** — agent lifecycle is user-bound, not org-bound | Instance replacement orphans agents |
| `client_profiles.user_id` | (should be `organisations`) | **NO** | None — client profiles are person-scoped | **Yes** — client data belongs to person, not organisation | Client data cannot be shared across consultants |
| `business_valuations.user_id` | (should be `organisations`) | **NO** | None — valuations are person-scoped | **Yes** — valuation history is person-bound | Valuations cannot survive ownership changes |
| `kira_tasks.user_id` | (should be `organisations`) | **NO** | None — tasks are person-scoped | **Yes** — tasks are person-bound | Task history cannot survive person changes |

### Critical Discontinuities

**Discontinuity 1: Memory → Knowledge (the core gap)**
- `kira_memory` (person-scoped) → `organisational_knowledge` (org-scoped): **NO BRIDGE**
- This is the most architecturally significant discontinuity. The application produces person-scoped memories but the canonical model requires org-scoped knowledge. There is no promotion path.

**Discontinuity 2: Subscription State**
- `users.subscription_status` → `subscriptions`: **NO BRIDGE**
- Billing writes to the legacy table. The canonical table is empty. There is no migration path.

**Discontinuity 3: Agent Identity**
- `kira_agents.user_id` → `kira_instances.organisation_id`: **NO BRIDGE**
- Agent management is user-bound. The canonical instance model is unused.

**Discontinuity 4: Knowledge Provenance**
- `genome_*` inline source → `evidence` table (P0.7): **NO BRIDGE**
- Evidence is embedded in genome records. The canonical evidence table is never written to.

### The God-Table Problem

The `users` table is the most significant legacy/canonical discontinuity. It carries attributes that belong to multiple canonical entities:

| `users` Column | Canonical Entity It Should Belong To | Current State |
|---|---|---|
| `id` | `persons.person_id` + `organisations.organisation_id` | Acts as universal identity anchor |
| `email` | `persons.email` | Duplicated in `persons` table |
| `name` | `persons.name` | Duplicated in `persons` table |
| `subscription_status` | `subscriptions.status` | Billing writes here; canonical table unused |
| `stripe_subscription_id` | `subscriptions.stripe_subscription_id` | Billing writes here; canonical table unused |
| `stripe_customer_id` | (no canonical home) | Billing writes here |
| `trial_ends_at` | `subscriptions.trial_ends_at` | Billing writes here; canonical table unused |
| `organisation_id` | `organisation_memberships` | Resolved through membership, not direct |
| `agent_id` | `kira_instances` (should be) | Agent management writes here |

The `users` table is a de facto god-table that conflates person identity, organisation identity, subscription state, and instance state into a single row. This is the root cause of most legacy/canonical discontinuities.

---

## Section 4 — Runtime Authority Paths

For every route that touches a canonical concept, the complete authority path from client request to persistence.

---

### Route 1: `POST /api/kira/chat/start` — Start Conversation

```
Client Request
    │
    ▼
Route Handler: app/api/kira/chat/start/route.ts:17-25
    │
    ▼
Authentication: Session JWT via supabase.auth.getUser()
    │   Identity: supabase.auth.getUser() — session-scoped
    │
    ▼
Identity Resolution: getCurrentOrganisationContext()
    │   Path: auth → auth_credentials → persons → organisation_memberships → organisations
    │   Returns: { organisationId, personId, membershipId, role, validFrom, validTo }
    │
    ▼
Organisation Resolution: From canonical context — organisationId
    │
    ▼
Role Check: None (no role-based differentiation)
    │
    ▼
Authorisation: RLS on conversations table via auth_user_has_organisation_access(organisation_id)
    │
    ▼
Domain Operation: INSERT INTO conversations (organisation_id, user_id, topic, ...)
    │
    ▼
Persistence: conversations table (org-scoped)
```

**Status: CANONICAL.** This route uses the full canonical identity chain.

---

### Route 2: `POST /api/kira/chat/text` — Text Message

```
Client Request
    │
    ▼
Route Handler: app/api/kira/chat/text/route.ts:14-19
    │
    ▼
Authentication: Session JWT
    │
    ▼
Identity Resolution: getCurrentOrganisationContext()
    │
    ▼
Organisation Resolution: From canonical context
    │
    ▼
Role Check: None
    │
    ▼
Authorisation: RLS on conversation_messages table
    │
    ▼
Domain Operation: INSERT INTO conversation_messages
    │
    ▼
Persistence: conversation_messages table
```

**Status: CANONICAL.** Uses the full canonical identity chain.

---

### Route 3: `POST /api/kira/knowledge/upload` — Upload Document

```
Client Request
    │
    ▼
Route Handler: app/api/kira/knowledge/upload/route.ts:17-25
    │
    ▼
Authentication: Session JWT
    │
    ▼
Identity Resolution (auth): getCurrentOrganisationContext() — used for auth check
    │   Path: canonical chain
    │
    ▼
Identity Resolution (writes): getCurrentAppUser() — used for downstream writes
    │   Path: auth → users (legacy)
    │   Returns: userId from users table
    │
    ▼
Organisation Resolution: organisationId from canonical context (auth only)
    │   BUT writes use userId from legacy context
    │
    ▼
Role Check: None
    │
    ▼
Authorisation: RLS on kira_knowledge via auth_user_has_organisation_access(organisation_id)
    │
    ▼
Domain Operation: INSERT INTO kira_knowledge (user_id, title, summary, ...) — writes to legacy table
    │   created_by: userId (legacy user_id, not person_id)
    │
    ▼
Persistence: kira_knowledge table (person-scoped, NOT org-scoped)
```

**Status: DUAL PATTERN.** Auth uses canonical identity. Writes use legacy identity. The document is written to the person-scoped `kira_knowledge` table, not to the org-scoped P0.7 knowledge tables.

---

### Route 4: `POST /api/kira/research` — Research Organisation (P0 VIOLATION)

```
Client Request
    │   user_id: supplied by CLIENT in request body or header
    │
    ▼
Route Handler: app/api/kira/research/route.ts:17-29
    │
    ▼
Authentication: NONE — no session check, no JWT verification
    │   NO getCurrentAppUser() call
    │   NO getCurrentOrganisationContext() call
    │
    ▼
Identity Resolution: Client-supplied user_id from request body/header
    │   Path: body.user_id or x-user-id header
    │   NO server-side verification
    │
    ▼
Organisation Resolution: NONE
    │
    ▼
Role Check: NONE
    │
    ▼
Authorisation: Service-role client (bypasses ALL RLS)
    │
    ▼
Domain Operation: INSERT/UPDATE on kira_research_sessions using client-supplied user_id
    │
    ▼
Persistence: kira_research_sessions table (using client-supplied identity)
```

**Status: P0 AUTHORITY VIOLATION.** Any unauthenticated caller can read/write any user's research data. No identity verification, no RLS, no authorisation.

---

### Route 5: `POST /api/kira/email/send-kira-ready` — Send Email (P0 VIOLATION)

```
Client Request
    │   user_id: supplied by CLIENT in request body
    │
    ▼
Route Handler: app/api/kira/email/send-kira-ready/route.ts:17-50
    │
    ▼
Authentication: NONE — no session check, no JWT verification
    │
    ▼
Identity Resolution: Client-supplied user_id from request body
    │   Path: body.user_id
    │   NO server-side verification
    │
    ▼
Organisation Resolution: NONE
    │
    ▼
Role Check: NONE
    │
    ▼
Authorisation: Service-role client (bypasses ALL RLS)
    │
    ▼
Domain Operation: SELECT from users, client_profiles, business_identity using client-supplied user_id
    │   Reads PII: name, email, business_name, abn
    │   Sends email via Resend
    │
    ▼
Persistence: Email sent externally. PII read from database.
```

**Status: P0 AUTHORITY VIOLATION + PII EXPOSURE.** Any unauthenticated caller can read PII for any user and send emails as any user.

---

### Route 6: `GET /api/billing/mode` — Billing Mode

```
Client Request
    │
    ▼
Route Handler: app/api/billing/mode/route.ts:10-15
    │
    ▼
Authentication: NONE — no session check
    │
    ▼
Identity Resolution: NONE
    │
    ▼
Organisation Resolution: NONE
    │
    ▼
Role Check: NONE
    │
    ▼
Authorisation: NONE
    │
    ▼
Domain Operation: Returns test/live mode
    │
    ▼
Persistence: Read-only, no persistence
```

**Status: LOW RISK (read-only).** Returns a non-sensitive configuration value. No authentication but no PII exposure.

---

### Route 7: `POST /api/kira/discovery/ingest` — Google Drive Ingestion

```
Client Request
    │
    ▼
Route Handler: app/api/kira/discovery/ingest/route.ts
    │
    ▼
Authentication: Session JWT (via middleware or route check)
    │
    ▼
Identity Resolution: getCurrentAppUser() — legacy path
    │   Path: auth → users
    │   Returns: userId from users table
    │
    ▼
Organisation Resolution: NONE — uses user_id directly
    │
    ▼
Role Check: None
    │
    ▼
Authorisation: RLS on genome tables via auth_user_has_organisation_access(organisation_id)
    │
    ▼
Domain Operation: Ingests Google Drive documents into genome_* tables
    │   Uses service-role client for some operations
    │
    ▼
Persistence: genome_entities, genome_facts, genome_relationships (person-scoped)
```

**Status: LEGACY.** Uses legacy identity resolution. Writes to person-scoped tables.

---

### Route 8: Tool Webhook — recall_memory

```
ElevenLabs Agent
    │   Calls tool URL with ?uid=<user_id> baked in at provisioning time
    │
    ▼
Route Handler: app/api/kira/webhooks/tool-webhook/route.ts (via kiraConvaiRoutes)
    │
    ▼
Authentication: HMAC signature on webhook payload (CONVAI_TOOL_SECRET_HEADER)
    │   NO session JWT — agent-to-server communication
    │
    ▼
Identity Resolution: uid-tools.ts extracts user_id from ?uid= URL parameter
    │   Path: URL parameter (server-baked at provisioning time)
    │   NO runtime identity resolution — identity is fixed at provisioning
    │
    ▼
Organisation Resolution: NONE — user_id only, no org resolution
    │
    ▼
Role Check: NONE
    │
    ▼
Authorisation: Service-role client (bypasses ALL RLS)
    │
    ▼
Domain Operation: search_knowledge (queries kira_knowledge), recall_memory (queries kira_memory + Mnemo)
    │   All queries use user_id, not organisation_id
    │
    ▼
Persistence: Read-only for search; write for save_memory (to kira_memory, person-scoped)
```

**Status: LEGACY.** Identity is baked at provisioning time. No runtime org resolution. Service-role bypasses RLS.

---

### Route 9: Post-Call Pipeline — onConversationComplete

```
ElevenLabs Post-Call Webhook
    │
    ▼
Route Handler: app/api/kira/webhooks/post-call/route.ts → kiraConvaiRoutes().postCall
    │
    ▼
Authentication: HMAC signature verification
    │
    ▼
Identity Resolution: userId from conversation record (canonical or legacy depending on conversation origin)
    │
    ▼
Organisation Resolution: NONE — pipeline operates at user level
    │
    ▼
Pipeline Steps (lib/kira/convai.ts:89-120):
    │   1. Snapshot prior facts (genome_facts WHERE user_id = X)
    │   2. completeConversationMemory → writes to kira_memory (person-scoped)
    │   3. forgetParkedEntityLeaks → deletes from genome_* (person-scoped)
    │   4. sweepDuplicateMemories → deduplicates in kira_memory (person-scoped)
    │   5. refileAssistantCapabilityClaims → updates genome_facts (person-scoped)
    │   6. classifyPendingMemories → writes to genome_* (person-scoped)
    │   7. accrueVoiceCost → updates users.voice_cost (person-scoped)
    │
    ▼
    NONE of these steps write to P0.7 tables.
    NONE of these steps write to evidence table.
    NONE of these steps promote memory to organisational knowledge.
    │
    ▼
Persistence: kira_memory, genome_*, users (ALL person-scoped)
```

**Status: LEGACY.** The post-call pipeline is the core knowledge production mechanism. It writes exclusively to person-scoped tables. No path to org-scoped knowledge.

---

## Section 5 — Summary of Findings

### Canonical Concept Conformance Summary

| Concept | DB | Service | API | Auth | UI | Overall |
|---|---|---|---|---|---|---|
| Organisation | ✅ CANONICAL | ⚠️ PARTIAL | ⚠️ PARTIAL | ✅ CANONICAL | ❌ LEGACY | **PARTIAL** |
| Person | ⚠️ DUPLICATED | ⚠️ DUPLICATED | ⚠️ DUPLICATED | ✅ CANONICAL | ❌ LEGACY | **DUPLICATED** |
| Ownership Period | ✅ CANONICAL | ❌ ABSENT | ❌ ABSENT | N/A | N/A | **ABSENT** |
| Consultant | ✅ CANONICAL | ❌ ABSENT | ❌ ABSENT | N/A | N/A | **ABSENT** |
| Engagement | ✅ CANONICAL | ❌ ABSENT | ❌ ABSENT | N/A | N/A | **ABSENT** |
| Kira Instance | ⚠️ NO RLS | ❌ ABSENT | ❌ ABSENT | N/A | N/A | **ABSENT** |
| Subscription | ⚠️ CONFLICTING | ❌ LEGACY | ❌ LEGACY | ⚠️ MIXED | ❌ LEGACY | **CONFLICTING** |
| Commercial Arrangement | ⚠️ NO RLS | ❌ ABSENT | ❌ ABSENT | N/A | N/A | **ABSENT** |
| Organisational Knowledge | ✅ CANONICAL | ❌ ABSENT | ❌ ABSENT | N/A | N/A | **ABSENT** |

### Invariant Conformance Summary

| Invariant | Schema | Service | API | Agent | UI | Runtime | Overall |
|---|---|---|---|---|---|---|---|
| INV-001 Organisation persistence | ✅ | ✅ | ⚠️ | ❌ | ❌ | ⚠️ | **PARTIAL** |
| INV-002 Person/role separation | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | **PARTIAL** |
| INV-003 Ownership temporalisation | ✅ | ❌ | ❌ | N/A | N/A | ❌ | **ABSENT** |
| INV-004 Consultant first-class | ✅ | ❌ | ❌ | N/A | N/A | ❌ | **ABSENT** |
| INV-005 Engagement first-class | ✅ | ❌ | ❌ | N/A | N/A | ❌ | **ABSENT** |
| INV-006 Consultant/Introducer separation | ✅ | ⚠️ | ⚠️ | N/A | N/A | ⚠️ | **PARTIAL** |
| INV-007 Engagement/Subscription separation | ✅ | N/A | N/A | N/A | N/A | N/A | **CONFIRMED** |
| INV-008 Kira/Organisation separation | ✅ | ❌ | ❌ | ❌ | N/A | ❌ | **ABSENT** |
| INV-009 Memory/Instance separation | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | **FAIL** |
| INV-010 Conversation/Knowledge separation | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **FAIL** |
| INV-011 Knowledge provenance | ✅ | ❌ | ❌ | ❌ | ❌ | ⚠️ | **PARTIAL** |
| INV-012 Temporal knowledge | ✅ | ❌ | ❌ | ❌ | N/A | ❌ | **FAIL** |
| INV-013 Commercial truth | ✅ | ❌ | ❌ | N/A | N/A | ❌ | **ABSENT** |
| INV-014 Commercial versioning | ✅ | ❌ | ❌ | N/A | N/A | ❌ | **ABSENT** |
| INV-015 Paid Kira service | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | **CONFIRMED** |
| INV-016 Consultant economics separation | ✅ | ❌ | ❌ | N/A | N/A | ❌ | **ABSENT** |
| INV-017 Continuity | ✅ | ❌ | ❌ | ❌ | N/A | ❌ | **FAIL** |
| INV-018 No implementation-defined semantics | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **FAIL** |
| INV-019 Historical preservation | ✅ | ❌ | ❌ | N/A | N/A | ❌ | **FAIL** |
| INV-020 Organisational subject primacy | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **FAIL** |

### Score Summary

| Classification | Count | Invariants |
|---|---|---|
| **CONFIRMED** | 2 | INV-007, INV-015 |
| **PARTIAL** | 5 | INV-001, INV-002, INV-006, INV-011, (concept: Organisation) |
| **ABSENT** | 8 | INV-003, INV-004, INV-005, INV-008, INV-013, INV-014, INV-016, (concepts: Ownership Period, Consultant, Engagement, Kira Instance, Commercial Arrangement, Organisational Knowledge) |
| **FAIL** | 5 | INV-009, INV-010, INV-012, INV-017, INV-018, INV-019, INV-020 |
| **CONFLICTING** | 1 | (concept: Subscription) |
| **DUPLICATED** | 1 | (concept: Person) |

### The Fundamental Finding

**The canonical model exists in the database. The application does not use it.**

The application operates against a legacy person-scoped model (`user_id` on every row). The canonical organisation-scoped model (`organisation_id` on every row) exists as schema but has no application integration.

The most critical gaps are:
1. **Knowledge is person-scoped, not org-scoped** (INV-009, INV-010, INV-017)
2. **Temporal infrastructure is unused** (INV-012, INV-019)
3. **Five canonical concepts have no application layer** (INV-003, INV-004, INV-005, INV-008, INV-013/014/016)
4. **The `users` god-table conflates multiple canonical identities** (INV-018, INV-020)
5. **Two routes have zero authentication** (P0 security violations)

P1.2 is complete. The evidence base for P1.3 (Architectural Gap / Conflict Model) is established.

---

*P1.2 Full-Stack Traceability Matrix — Complete. No files modified.*
