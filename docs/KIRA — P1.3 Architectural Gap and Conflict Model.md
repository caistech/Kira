# KIRA — P1.3 Architectural Gap / Conflict Model

**Status:** DECISION DOCUMENT COMPLETE
**Purpose:** Convert forensic findings into explicit architectural conflicts, discontinuities, and dependency-ordered resolution requirements
**Scope:** All conflicts between the frozen canonical model and the current production implementation
**Date:** 26 August 2026
**Prerequisite:** P1.2 COMPLETE (full-stack traceability established)
**Phase Boundary:** Decision phase. No code changes. No implementation. P1.3 models what must be resolved, not how to resolve it.

---

## 1. What P1.3 Is

P1.3 answers:

> **Given the canonical model and the forensic traceability evidence, what architectural conflicts and gaps must be resolved before Kira can be considered an implementation of the canonical model?**

P1.3 is not a fix list. It is not an implementation plan. It is a decision document that establishes:

1. What conflicts exist between the canonical model and the current architecture
2. Where meaning is lost across architectural boundaries
3. What authority and security issues must be resolved
4. What capabilities the target architecture must possess
5. What depends on what

After P1.3, we can say: "Here is the architecture Kira has today, here is the architecture the canonical model requires, here are the exact conflicts between them, and here is the dependency-ordered path from one to the other."

---

## 2. Canonical → Current Conflict Register

Every PARTIAL, ABSENT, FAIL, and CONFLICTING finding from P1.2, converted into an explicit architectural conflict.

---

### CONFLICT C-001: Identity God-Table

**Canonical requirement:** Person, Organisation, Subscription, and Kira Instance are distinct entities with independent identity, lifecycle, and persistence.

**Current implementation:** The `users` table carries attributes of all four entities in a single row: person identity (`id`, `email`, `name`), organisation relationship (`organisation_id`), subscription state (`subscription_status`, `stripe_subscription_id`, `stripe_customer_id`, `trial_ends_at`), and instance identity (`agent_id`).

**Evidence (P1.2):** INV-018 FAIL (implementation-defined semantics), INV-020 FAIL (organisational subject primacy). The `users` table conflates person, organisation, subscription, and instance identity.

**Impact:** Every canonical distinction is collapsed at the data layer. The application cannot express "this person belongs to this organisation" independently of "this person has this subscription" independently of "this person uses this Kira instance." All four attributes travel as one row.

**Architectural consequence:** The `users` table must be decomposed into the canonical entity model. This is the foundational conflict — all other conflicts are downstream of it.

**Severity:** CRITICAL — blocking

---

### CONFLICT C-002: Person-Scoped Knowledge

**Canonical requirement:** Organisational knowledge belongs to the Organisation (INV-009, INV-020), not to the person. It must survive changes in people, consultants, instances, and engagements.

**Current implementation:** All three active knowledge layers (`kira_memory`, `genome_*`, `kira_knowledge`) are scoped to `user_id`, not `organisation_id`. The P0.7 `organisational_knowledge` table (org-scoped) exists but has no application code.

**Evidence (P1.2):** INV-009 FAIL (memory/instance separation), INV-017 FAIL (continuity), INV-020 FAIL (organisational subject primacy). The post-call pipeline writes to `kira_memory` and `genome_*` — both person-scoped. No path to `organisational_knowledge`.

**Impact:** If the person changes, the consultant changes, or the Kira instance changes, organisational memory is lost. The canonical model requires continuity; the implementation cannot provide it.

**Architectural consequence:** Knowledge must be promoted from person-scoped to org-scoped. The P0.7 schema provides the target; the application must be wired to it.

**Severity:** CRITICAL — blocking

---

### CONFLICT C-003: Missing Evidence/Knowledge Boundary

**Canonical requirement (INV-010):** Conversation is evidence. Organisational knowledge is the contextualised organisational interpretation derived from evidence. They are distinct.

**Current implementation:** Conversations produce `kira_memory` rows directly. No evidence table is written to. No promotion from evidence to governed knowledge occurs. The `evidence` table (P0.7) is never populated by application code.

**Evidence (P1.2):** INV-010 FAIL. The post-call pipeline (`lib/kira/convai.ts:89-120`) distils conversation → memory → genome without an intermediate evidence layer.

**Impact:** Evidence is conflated with memory. The canonical separation between raw source material and governed interpretation does not exist at runtime.

**Architectural consequence:** An evidence capture layer must exist between conversation and knowledge. Conversations must produce evidence records; evidence must be promoted to governed knowledge through a governed pipeline.

**Severity:** CRITICAL — blocking

---

### CONFLICT C-004: Unused Temporal Infrastructure

**Canonical requirement (INV-012, INV-019):** Historical truth must be available. Past states must not be overwritten. Point-in-time queries must be supported.

**Current implementation:** Nine SQL temporal functions exist (`get_knowledge_at_time`, `get_knowledge_history`, etc.). Seven `_history` tables exist. Temporal columns (`valid_from`/`valid_to`, `is_current`, `superseded_at`) are defined on canonical tables. But zero TypeScript code calls any temporal function or queries any `_history` table.

**Evidence (P1.2):** INV-012 FAIL (temporal knowledge), INV-019 FAIL (historical preservation). `grep -r "get_knowledge_at_time\|get_knowledge_history\|get_supersession_chain" --include="*.ts"` returns zero results.

**Impact:** The system cannot answer "what did we know about X on date Y?" at runtime. Historical truth is preserved in the database but is inaccessible to the application.

**Architectural consequence:** Temporal query infrastructure must be integrated into the application layer. Service/repository code must call temporal SQL functions. The application must support "as of" queries for knowledge, ownership, subscriptions, and commercial arrangements.

**Severity:** HIGH — blocking for temporal capabilities

---

### CONFLICT C-005: Dual Identity Resolution

**Canonical requirement (INV-018):** Identity resolution must follow a single canonical path: auth → auth_credentials → persons → organisation_memberships → organisations.

**Current implementation:** Two parallel identity paths exist: `getCurrentOrganisationContext()` (canonical, 3 routes) and `getCurrentAppUser()` (legacy, 15+ routes). The legacy path resolves auth → users, bypassing persons, memberships, and organisations.

**Evidence (P1.2):** INV-018 FAIL (implementation-defined semantics). 15+ API routes use `getCurrentAppUser()` exclusively.

**Impact:** Most of the application does not resolve to an organisation at runtime. The canonical identity chain is architecturally present but operationally unused.

**Architectural consequence:** All routes must use the canonical identity resolution path. `getCurrentAppUser()` must be retired. The legacy `users` table must be decomposed so that its identity function is replaced by the canonical chain.

**Severity:** CRITICAL — blocking

---

### CONFLICT C-006: Five Absent Canonical Concepts

**Canonical requirement:** Ownership Period, Consultant, Engagement, Kira Instance, and Commercial Arrangement are first-class entities with application-layer lifecycle management.

**Current implementation:** All five concepts have complete database schemas but zero TypeScript references, zero API routes, zero service functions, and zero UI. The concepts exist as DDL but not as application behaviour.

**Evidence (P1.2):** INV-003 ABSENT, INV-004 ABSENT, INV-005 ABSENT, INV-008 ABSENT, INV-013/014/016 ABSENT. `grep -r "ownership_periods\|consultant_profiles\|consultant_relationships\|engagements\b\|kira_instances\|commercial_arrangements" --include="*.ts"` returns zero results (excluding comments/prompts).

**Impact:** The canonical model defines these as first-class entities with temporal semantics, provenance, and lifecycle. The application cannot create, query, update, or manage any of them.

**Architectural consequence:** Application-layer code must be built for each concept. This includes: repository/service code, API routes, identity resolution, access control, and UI.

**Severity:** HIGH — blocking for lifecycle management

---

### CONFLICT C-007: Agent Identity Baked at Provisioning

**Canonical requirement:** Agent tools must resolve organisational context at runtime, not at provisioning time.

**Current implementation:** ElevenLabs tools are provisioned with `?uid=<user_id>` baked into the URL. The `uid-tools.ts` module extracts user_id from the URL at call time. There is no runtime organisation resolution — the identity is fixed when the tool is created.

**Evidence (P1.2):** Route 8 (tool webhook). All 19 tools use `?uid=user_id` pattern. `lib/kira/uid-tools.ts` extracts from URL.

**Impact:** If a user's organisation membership changes, the tool's identity does not update. The tool cannot reflect the user's current organisational context.

**Architectural consequence:** Tool identity must be resolved at runtime, not at provisioning time. The agent must resolve organisation context per-request, not per-provisioning.

**Severity:** MEDIUM — blocking for instance independence

---

### CONFLICT C-008: Subscription/Legacy Displacement

**Canonical requirement (INV-013, INV-015):** Subscriptions are first-class entities in the `subscriptions` table, with org-scoping, temporal validity, and audit history.

**Current implementation:** Billing writes to `users.subscription_status`, `users.stripe_subscription_id`, `users.stripe_customer_id`, `users.trial_ends_at`. The canonical `subscriptions` table is never read or written by application code.

**Evidence (P1.2):** INV-013 CONFLICTING, INV-015 CONFIRMED (operational) but LEGACY. `lib/billing/index.ts:106-112` configures `createSubscriberAdapter()` against `users` table.

**Impact:** Subscription history is not recoverable. The canonical `subscriptions` table has no data. The billing system cannot be queried against the canonical model.

**Architectural consequence:** Billing must be migrated to write to the canonical `subscriptions` table. The `users` table must lose its subscription columns. Subscription history must be populated.

**Severity:** HIGH — blocking for commercial truth

---

### CONFLICT C-009: No Consultant/Engagement Lifecycle

**Canonical requirement (INV-004, INV-005):** Consultants and Engagements are first-class entities with lifecycle management (create, progress, transition, complete, archive).

**Current implementation:** No application code creates, reads, updates, or deletes consultant relationships or engagements. The `consultant` role in `organisation_memberships` is the only application-level concept — it has no differentiated behaviour.

**Evidence (P1.2):** INV-004 ABSENT, INV-005 ABSENT. `lib/kira/consultant/` directory does not exist. Zero API routes reference consultant or engagement tables.

**Impact:** The consultant lifecycle (invite → onboard → assign → transition → offboard) cannot be managed. The engagement lifecycle (create → progress → complete → archive) cannot be managed. The consultant/engagement separation (INV-006) is architecturally correct but operationally non-functional.

**Architectural consequence:** Full lifecycle management code must be built for both concepts. This includes: identity, access control, temporal tracking, and UI.

**Severity:** HIGH — blocking for consultant/engagement operations

---

### CONFLICT C-010: Role-Based Access Unused

**Canonical requirement (INV-002):** Roles are attributes of a person's relationship to an organisation and should differentiate access.

**Current implementation:** `currentUserHasRole()`, `currentUserIsOwner()`, `currentUserIsAdmin()` are defined in `lib/auth.ts` but have zero callers in the codebase. Role checks do not exist in any API route, agent tool, or UI component.

**Evidence (P1.2):** INV-002 PARTIAL. Role functions exist but are never called. `grep -r "currentUserHasRole\|currentUserIsOwner\|currentUserIsAdmin" --include="*.ts"` returns only the definition file.

**Impact:** All authenticated users see the same interface and have the same capabilities, regardless of role. Owner/admin/consultant/employee distinctions are invisible at runtime.

**Architectural consequence:** Role-based access control must be implemented across routes, tools, and UI. The role infrastructure exists but must be wired in.

**Severity:** MEDIUM — blocking for differentiated access

---

### CONFLICT C-011: No Commercial Arrangement Management

**Canonical requirement (INV-013, INV-014, INV-016):** Commercial arrangements are first-class entities with versioning, effective dates, and audit history. Consultant economics are separate from Kira subscription economics.

**Current implementation:** `commercial_arrangements` and `commercial_history` tables exist but have zero application references. `arrangement_type` enum values are defined in SQL but never used in TypeScript.

**Evidence (P1.2):** INV-013 ABSENT, INV-014 ABSENT, INV-016 ABSENT.

**Impact:** The economic relationship between parties cannot be structured, versioned, or audited. Pricing is code-only (`PRICE_TIERS` in `lib/valuation/pricing.ts`) with no DB table, no versioning, no per-org overrides.

**Architectural consequence:** Commercial arrangement management must be built. Pricing must be data-driven with versioning.

**Severity:** MEDIUM — blocking for commercial truth

---

### CONFLICT C-012: Unprotected Database Tables

**Canonical requirement:** All tables carrying organisational data must have RLS policies enforcing org-scoped access.

**Current implementation:** P0.5 Step 5 tables (`ownership_periods`, `decisions`, `decision_history`, `kira_instances`, `kira_instance_history`, `subscriptions`, `subscription_history`, `commercial_arrangements`, `commercial_history`) have no RLS policies at all.

**Evidence (P1.2):** Section 3 (Access Control) — P0.5 Step 5 tables lack RLS.

**Impact:** Any authenticated user can read, modify, or delete data in these tables regardless of their organisation membership. Multi-tenant isolation is broken for these tables.

**Architectural consequence:** RLS policies must be added to all unprotected tables. The `auth_user_has_organisation_access()` pattern must be applied consistently.

**Severity:** CRITICAL — security

---

### CONFLICT C-013: Legacy RLS Not Org-Scoped

**Canonical requirement:** All tables should use `auth_user_has_organisation_access(organisation_id)` for RLS, not `auth.uid() = user_id`.

**Current implementation:** Legacy tables (`users`, `client_profiles`, `business_valuations`, `kira_tasks`, `kira_refusals`, `drive_documents`, etc.) use `auth.uid() = user_id` — person-scoped, not org-scoped.

**Evidence (P1.2):** Section 3 (Access Control) — legacy RLS patterns.

**Impact:** Data is scoped to the authenticated user, not to the organisation. A consultant who needs access to an organisation's data cannot see it through the legacy RLS path.

**Architectural consequence:** Legacy RLS must be migrated to the canonical pattern. This is part of the `users` table decomposition.

**Severity:** HIGH — blocking for multi-tenant access

---

### CONFLICT C-014: Edge Middleware Inactive

**Canonical requirement:** Route segregation (USER_PROTECTED, ADMIN, INTRODUCER) must be enforced at the edge.

**Current implementation:** `proxy.ts` exports `proxy` instead of `middleware`. Next.js edge middleware is inactive. Route segregation exists in documentation but is not enforced in code.

**Evidence (P1.1):** `proxy.ts` exports `proxy` — Next.js expects `middleware` as the export name.

**Impact:** All routes are accessible to all authenticated users regardless of the intended route segregation.

**Architectural consequence:** The middleware export name must be corrected. Route segregation must be enforced at the edge.

**Severity:** MEDIUM — blocking for edge enforcement

---

## 3. Semantic Discontinuity Register

The 14 places where meaning is lost or transformed across architectural boundaries.

---

### DISCONTINUITY D-001: users.id → organisations.organisation_id

**Legacy meaning:** `users.id` is the universal identity anchor — it means "this user" across all contexts (person, subscription, agent, tasks).

**Canonical meaning:** `organisations.organisation_id` is the organisational anchor — it means "this organisation" and is the scope for all organisational data.

**Discontinuity:** The legacy path resolves identity as a single user. The canonical path resolves identity as a person within an organisation. The two paths produce different identity scopes.

**Where meaning is lost:** Routes using `getCurrentAppUser()` produce a `user_id` that carries no organisational context. All downstream writes are person-scoped, not org-scoped.

**Bridge exists:** Partial — `auth_credentials → persons → organisation_memberships → organisations`. But most routes bypass this bridge.

---

### DISCONTINUITY D-002: users.id → persons.person_id

**Legacy meaning:** `users.id` identifies the authenticated user and is used for all personal data.

**Canonical meaning:** `persons.person_id` identifies the person as an entity distinct from their authentication credentials and their organisational relationships.

**Discontinuity:** The legacy `users` table conflates authentication identity (`auth_user_id`), personal identity (`email`, `name`), and organisational membership. The canonical model separates these.

**Where meaning is lost:** Routes that write to `users` (e.g., `business_identity`, `client_profiles`) create person data in the wrong table. The canonical `persons` table receives some writes but not all.

**Bridge exists:** Partial — `auth_credentials` links `auth_user_id` → `person_id`. But many writes bypass this bridge.

---

### DISCONTINUITY D-003: users.subscription_status → subscriptions

**Legacy meaning:** `users.subscription_status` is the subscription state for "this user." It is a simple enum on the user row.

**Canonical meaning:** `subscriptions` is a first-class entity with `organisation_id`, `tier_id`, `status`, `valid_from`, `valid_to`, and temporal validity. It belongs to the organisation, not the person.

**Discontinuity:** The billing system writes to the legacy column. The canonical table is empty. Subscription state is person-scoped in the legacy model; it should be org-scoped in the canonical model.

**Where meaning is lost:** The billing system produces subscription state that is person-bound. If the person changes their organisation, the subscription state does not follow.

**Bridge exists:** NO BRIDGE.

---

### DISCONTINUITY D-004: kira_memory.user_id → organisational_knowledge.organisation_id

**Legacy meaning:** `kira_memory` records are owned by a user. "This user's memory."

**Canonical meaning:** `organisational_knowledge` records belong to an organisation. "This organisation's knowledge."

**Discontinuity:** Memory is person-scoped. Knowledge should be org-scoped. There is no promotion path from memory to knowledge.

**Where meaning is lost:** The post-call pipeline writes to `kira_memory`. The knowledge never becomes organisational knowledge. If the person changes, the memory is orphaned.

**Bridge exists:** NO BRIDGE. This is the most architecturally significant discontinuity.

---

### DISCONTINUITY D-005: genome_*.user_id → organisational_knowledge.organisation_id

**Legacy meaning:** `genome_facts` are scoped to a user. "This user's business knowledge."

**Canonical meaning:** `organisational_knowledge` is scoped to an organisation. "This organisation's governed knowledge."

**Discontinuity:** Genome extraction produces person-scoped structured knowledge. There is no promotion path to org-scoped governed knowledge.

**Where meaning is lost:** The genome extraction pipeline writes to person-scoped tables. The knowledge never becomes organisational knowledge. If the person changes, the genome is orphaned.

**Bridge exists:** NO BRIDGE.

---

### DISCONTINUITY D-006: genome_facts.source_type/source_id → evidence

**Legacy meaning:** Evidence is inline — `source_type` and `source_id` are columns on `genome_facts`. Evidence is embedded in the knowledge.

**Canonical meaning:** Evidence is a separate entity (`evidence` table) linked to knowledge through `knowledge_evidence_links`. Evidence is distinct from knowledge.

**Discontinuity:** Evidence is embedded in genome records. There is no separate evidence layer. The canonical separation between raw source and governed interpretation does not exist.

**Where meaning is lost:** When a genome fact is superseded, its evidence is lost with it. The evidence is not independently preserved.

**Bridge exists:** NO BRIDGE.

---

### DISCONTINUITY D-007: kira_agents.user_id → kira_instances.organisation_id

**Legacy meaning:** `kira_agents` records are owned by a user. "This user's agent."

**Canonical meaning:** `kira_instances` are scoped to an organisation. "This organisation's Kira instance."

**Discontinuity:** Agent lifecycle is person-scoped. Instance lifecycle should be org-scoped. There is no migration path from agent to instance.

**Where meaning is lost:** Agent provisioning writes to `kira_agents`. The canonical `kira_instances` table is never touched. If the Kira application is replaced, there is no code to migrate agent state to instances.

**Bridge exists:** NO BRIDGE.

---

### DISCONTINUITY D-008: client_profiles.user_id → organisations

**Legacy meaning:** Client profiles are owned by a user. "This user's clients."

**Canonical meaning:** Client data should belong to the organisation. "This organisation's client relationships."

**Discontinuity:** Client data is person-scoped. It cannot be shared across consultants or survive ownership changes.

**Where meaning is lost:** `client_profiles` writes use `user_id`. If a new consultant takes over, the client data does not transfer.

**Bridge exists:** NO BRIDGE.

---

### DISCONTINUITY D-009: business_valuations.user_id → organisations

**Legacy meaning:** Business valuations are owned by a user. "This user's valuation."

**Canonical meaning:** Valuation history should belong to the organisation. "This organisation's valuation history."

**Discontinuity:** Valuation data is person-scoped. Historical valuations cannot be recovered if the person changes.

**Where meaning is out:** `business_valuations` writes use `user_id`. The valuation history is person-bound.

**Bridge exists:** NO BRIDGE.

---

### DISCONTINUITY D-010: kira_tasks.user_id → organisations

**Legacy meaning:** Tasks are owned by a user. "This user's tasks."

**Canonical meaning:** Tasks should be scoped to the organisation or engagement. "This organisation's tasks."

**Discontinuity:** Task data is person-scoped. It cannot survive person changes or be shared across consultants.

**Where meaning is lost:** `kira_tasks` writes use `user_id`. Task history is person-bound.

**Bridge exists:** NO BRIDGE.

---

### DISCONTINUITY D-011: Tool ?uid= → Runtime Identity Resolution

**Legacy meaning:** Tool identity is baked at provisioning time. The `uid` in the URL is the user's identity, fixed when the tool was created.

**Canonical meaning:** Identity should be resolved at runtime from the conversation/session context, not fixed at provisioning time.

**Discontinuity:** The tool cannot reflect changes in the user's organisational context. If the user changes their organisation membership, the tool still carries the old identity.

**Where meaning is lost:** Every tool webhook call uses the provisioned `uid`, not a runtime-resolved identity. The tool operates against a potentially stale identity.

**Bridge exists:** NO BRIDGE — the identity is baked, not resolved.

---

### DISCONTINUITY D-012: kira_knowledge.user_id → organisational_knowledge.organisation_id

**Legacy meaning:** Uploaded documents are owned by a user. "This user's documents."

**Canonical meaning:** Organisational knowledge should be scoped to the organisation. "This organisation's knowledge base."

**Discontinuity:** Document RAG is person-scoped. It cannot survive person changes.

**Where meaning is lost:** `knowledge-ingest.ts` writes to `kira_knowledge` using `user_id`. `knowledge-search.ts` queries by `user_id`. The document corpus is person-bound.

**Bridge exists:** NO BRIDGE.

---

### DISCONTINUITY D-013: users.voice_cost → (no canonical equivalent)

**Legacy meaning:** Voice usage cost is tracked per user on the `users` table.

**Canonical meaning:** No canonical entity for voice cost tracking. This is an operational metric, not an organisational fact.

**Discontinuity:** Voice cost is an operational detail that has no canonical home. It is currently on the god-table.

**Where meaning is lost:** If the `users` table is decomposed, voice cost must be relocated. There is no canonical entity to attach it to.

**Bridge exists:** N/A — operational metric, not canonical.

---

### DISCONTINUITY D-014: app/ → (page components using legacy identity)

**Legacy meaning:** Page components import `getCurrentAppUser()` and render data scoped to that user.

**Canonical meaning:** Pages should display organisation-scoped data, resolved through the canonical identity chain.

**Discontinuity:** The UI uses legacy identity. All page data is person-scoped. The canonical organisation is not visible in the UI.

**Where meaning is lost:** Every page that imports `getCurrentAppUser()` renders person-scoped data. The UI cannot display organisation-level views.

**Bridge exists:** NO BRIDGE — UI identity is legacy.

---

## 4. Authority Conflict Model

---

### AUTHORITY CONFLICT A-001: P0 — Unauthenticated Research Route

**Route:** `POST /api/kira/research/route.ts`
**Violation:** Accepts `user_id` from client request body/header. No session check. No JWT verification. Uses service-role client (bypasses RLS).
**Severity:** P0 — immediate security risk.
**Impact:** Any unauthenticated caller can read/write any user's research data. Full read/write access to any user's data without authentication.
**Root cause:** The route was built before the canonical identity model was established. It accepts identity from the client because it was designed for agent-to-server communication where the agent supplies the user context.
**Resolution required:** Must be authenticated. Must use canonical identity resolution. Must not accept user_id from client body.

---

### AUTHORITY CONFLICT A-002: P0 — Unauthenticated Email Route

**Route:** `POST /api/kira/email/send-kira-ready/route.ts`
**Violation:** Accepts `user_id` from client request body. No session check. No JWT verification. Uses service-role client. Reads PII (name, email, business_name, ABN).
**Severity:** P0 — immediate security risk + PII exposure.
**Impact:** Any unauthenticated caller can read PII for any user and send emails as any user. Full PII exposure without authentication.
**Root cause:** Similar to A-001 — designed for agent-to-server communication.
**Resolution required:** Must be authenticated. Must use canonical identity resolution. Must not accept user_id from client body. PII access must be logged.

---

### AUTHORITY CONFLICT A-003: P1 — Dual Identity Resolution Paths

**Scope:** 15+ API routes use `getCurrentAppUser()` (legacy) instead of `getCurrentOrganisationContext()` (canonical).
**Severity:** P1 — architectural authority violation.
**Impact:** Most of the application does not resolve to an organisation at runtime. The canonical identity chain is bypassed.
**Root cause:** The legacy `getCurrentAppUser()` was the original identity resolver. Routes were built before the canonical model was established. Migration to canonical resolution has been partial.
**Resolution required:** All routes must use `getCurrentOrganisationContext()`. `getCurrentAppUser()` must be retired.

---

### AUTHORITY CONFLICT A-004: P1 — Service-Role Bypasses RLS on Critical Operations

**Scope:** Multiple routes use `createServiceClient()` or `createServiceClientV2()` which bypass ALL RLS policies. This includes routes that accept client-supplied identity (A-001, A-002).
**Severity:** P1 — architectural authority violation.
**Impact:** Service-role clients operate outside the multi-tenant access control model. Combined with unauthenticated routes (A-001, A-002), this creates full access to any user's data.
**Root cause:** Service role is used for operations that need cross-tenant access (e.g., admin operations, billing). But some routes use it as a convenience rather than a necessity.
**Resolution required:** Service-role usage must be audited and restricted to legitimate admin operations. Non-admin routes must use session-scoped clients with RLS enforcement.

---

### AUTHORITY CONFLICT A-005: P2 — Role-Based Access Not Enforced

**Scope:** `currentUserHasRole()`, `currentUserIsOwner()`, `currentUserIsAdmin()` defined but never called. No route differentiates access by role.
**Severity:** P2 — functional gap.
**Impact:** All authenticated users have the same capabilities regardless of role. Owner, admin, consultant, and employee see the same interface and have the same permissions.
**Root cause:** Role infrastructure was built but never wired in. The application treats all authenticated users identically.
**Resolution required:** Role checks must be implemented in routes, tools, and UI. The role infrastructure exists; it needs to be activated.

---

### AUTHORITY CONFLICT A-006: P1 — Edge Middleware Inactive

**Scope:** `proxy.ts` exports `proxy` instead of `middleware`. Next.js edge middleware is inactive. Route segregation (USER_PROTECTED, ADMIN, INTRODUCER) is not enforced at the edge.
**Severity:** P1 — security architecture gap.
**Impact:** All routes are accessible to all authenticated users. Route segregation is documented but not enforced.
**Root cause:** Export name mismatch in `proxy.ts`.
**Resolution required:** Export name must be corrected. Route segregation must be enforced at the edge.

---

## 5. Target Architecture Requirements

Not implementation. The architectural capabilities the target system must possess to satisfy the canonical model.

---

### REQUIREMENT R-001: Single Identity Resolution

**The target system must have one identity resolution path.** All requests must resolve through: auth → auth_credentials → persons → organisation_memberships → organisations. No route may accept identity from the client body. No route may use a legacy resolver. The canonical resolver must be the only path.

**Current state:** Two parallel paths (canonical in 3 routes, legacy in 15+ routes).
**Target state:** One canonical path for all routes.

---

### REQUIREMENT R-002: Organisation-Scoped Knowledge

**The target system must scope all knowledge to the organisation, not the person.** Memory, genome, documents, and governed knowledge must all be accessible through the organisation. Person-scoped knowledge must be promoted to org-scoped knowledge through a governed pipeline.

**Current state:** All active knowledge is person-scoped. P0.7 org-scoped tables exist but are unused.
**Target state:** All knowledge is org-scoped. Person-scoped knowledge is a transient state in the promotion pipeline.

---

### REQUIREMENT R-003: Evidence/Knowledge Separation

**The target system must separate evidence from knowledge.** Conversations produce evidence. Evidence is promoted to governed knowledge through a governed pipeline. The evidence table must be populated. Knowledge must reference its source evidence.

**Current state:** Conversations produce memory directly. No evidence layer. No promotion pipeline.
**Target state:** Conversations → evidence → governed knowledge. Full provenance chain.

---

### REQUIREMENT R-004: Temporal Query Capability

**The target system must support point-in-time queries for all canonical entities.** "What did we know about X on date Y?" must be answerable for knowledge, ownership, subscriptions, and commercial arrangements.

**Current state:** Temporal SQL functions exist but are never called. Temporal columns exist but are not queried.
**Target state:** Temporal queries are integrated into service/repository code. The application can answer "as of" questions for all canonical entities.

---

### REQUIREMENT R-005: Canonical Entity Lifecycle Management

**The target system must provide application-layer lifecycle management for all nine canonical entities.** Ownership Period, Consultant, Engagement, Kira Instance, and Commercial Arrangement must have: repository/service code, API routes, identity resolution, access control, temporal tracking, and UI.

**Current state:** Five concepts have schema but no application layer. Three concepts (Organisation, Person, Subscription) have partial application layer.
**Target state:** All nine concepts have complete lifecycle management.

---

### REQUIREMENT R-006: Runtime Identity Resolution in Tools

**The target system must resolve organisational context at runtime in agent tools.** Tools must not carry baked identity from provisioning time. Identity must be resolved per-request from the conversation/session context.

**Current state:** Tools use `?uid=user_id` baked at provisioning time.
**Target state:** Tools resolve organisation context at runtime.

---

### REQUIREMENT R-007: Multi-Tenant RLS Consistency

**The target system must use `auth_user_has_organisation_access(organisation_id)` consistently for all tables.** No table may use `auth.uid() = user_id`. No table may lack RLS. Service-role usage must be restricted to legitimate admin operations.

**Current state:** Mixed RLS patterns. P0.5 Step 5 tables have no RLS. Legacy tables use `auth.uid()`.
**Target state:** Consistent org-scoped RLS across all tables.

---

### REQUIREMENT R-008: Decomposition of the Users God-Table

**The target system must not carry multiple canonical identities in a single row.** The `users` table must be decomposed so that person, organisation, subscription, and instance identity are stored in their respective canonical tables.

**Current state:** `users` table carries person identity, organisation relationship, subscription state, and instance identity.
**Target state:** `users` table carries only authentication identity (`auth_user_id` + minimal session data). All canonical data lives in canonical tables.

---

### REQUIREMENT R-009: Edge Route Enforcement

**The target system must enforce route segregation at the edge.** USER_PROTECTED, ADMIN, and INTRODUCER routes must be segregated in Next.js middleware.

**Current state:** Middleware is inactive. Route segregation is documented but not enforced.
**Target state:** Middleware active. Route segregation enforced at the edge.

---

### REQUIREMENT R-010: Role-Based Access Control

**The target system must differentiate access by role.** Owner, admin, consultant, employee, and member roles must have different permissions, different UI views, and different tool access.

**Current state:** Roles defined but never checked.
**Target state:** Roles enforced across routes, tools, and UI.

---

## 6. Migration Dependency Graph

What must be resolved before what. This graph establishes the dependency order for architectural resolution.

---

### Level 0 — Foundation (no dependencies)

These must be resolved first. Everything else depends on them.

```
┌─────────────────────────────────────────────────────────────┐
│ LEVEL 0: FOUNDATION                                         │
│                                                             │
│  A-001  P0 Auth Violation (research route)                  │
│  A-002  P0 Auth Violation (email route)                     │
│  C-012  Unprotected Database Tables (add RLS)               │
│  A-006  Edge Middleware (fix export name)                    │
└─────────────────────────────────────────────────────────────┘
```

**Rationale:** Security must be resolved before any architectural work. The P0 violations are immediate risks. Unprotected tables are a multi-tenant isolation failure. Edge middleware must be active before route-level enforcement.

---

### Level 1 — Identity (depends on Level 0)

Identity resolution is the foundation for all canonical operations. Nothing can be org-scoped until identity resolves to an organisation.

```
┌─────────────────────────────────────────────────────────────┐
│ LEVEL 1: IDENTITY                                           │
│                                                             │
│  C-001  Identity God-Table Decomposition                    │
│  C-005  Dual Identity Resolution (retire getCurrentAppUser) │
│  C-013  Legacy RLS Migration (auth.uid → auth_user_has_...) │
│  R-008  Users Table Decomposition                           │
│  R-001  Single Identity Resolution                          │
│  R-007  Multi-Tenant RLS Consistency                        │
└─────────────────────────────────────────────────────────────┘
```

**Rationale:** The `users` god-table decomposition is the most foundational structural change. All other canonical entities depend on identity being resolved correctly. RLS must be consistent before any data migration.

---

### Level 2 — Knowledge Architecture (depends on Level 1)

Knowledge is the core product. It cannot be org-scoped until identity is org-scoped.

```
┌─────────────────────────────────────────────────────────────┐
│ LEVEL 2: KNOWLEDGE                                          │
│                                                             │
│  C-002  Person-Scoped Knowledge → Org-Scoped                │
│  C-003  Missing Evidence/Knowledge Boundary                 │
│  C-004  Unused Temporal Infrastructure                      │
│  R-002  Organisation-Scoped Knowledge                       │
│  R-003  Evidence/Knowledge Separation                       │
│  R-004  Temporal Query Capability                           │
└─────────────────────────────────────────────────────────────┘
```

**Rationale:** Knowledge promotion (person-scoped → org-scoped) requires identity to be org-scoped (Level 1). Evidence/knowledge separation requires the evidence table to be populated, which requires the promotion pipeline. Temporal queries require the knowledge to be in the right tables.

---

### Level 3 — Lifecycle Management (depends on Level 1 + Level 2)

Lifecycle management for the five absent concepts requires identity (Level 1) and temporal infrastructure (Level 2).

```
┌─────────────────────────────────────────────────────────────┐
│ LEVEL 3: LIFECYCLE MANAGEMENT                               │
│                                                             │
│  C-006  Five Absent Canonical Concepts                      │
│  C-009  Consultant/Engagement Lifecycle                     │
│  C-011  Commercial Arrangement Management                   │
│  R-005  Canonical Entity Lifecycle Management               │
│  C-008  Subscription/Legacy Displacement                    │
└─────────────────────────────────────────────────────────────┘
```

**Rationale:** Ownership periods, consultants, engagements, instances, and commercial arrangements need identity (to know which org they belong to) and temporal infrastructure (to track their history). Subscription migration requires the billing system to be rewired.

---

### Level 4 — Agent Alignment (depends on Level 1 + Level 2)

Agent tools must resolve identity at runtime and operate against org-scoped knowledge.

```
┌─────────────────────────────────────────────────────────────┐
│ LEVEL 4: AGENT ALIGNMENT                                    │
│                                                             │
│  C-007  Agent Identity Baked at Provisioning                │
│  C-010  Role-Based Access in Tools                          │
│  R-006  Runtime Identity Resolution in Tools                │
│  R-010  Role-Based Access Control                           │
└─────────────────────────────────────────────────────────────┘
```

**Rationale:** Agent tools must resolve identity at runtime (requires Level 1 identity). Tools must operate against org-scoped knowledge (requires Level 2 knowledge). Role-based access in tools requires the role infrastructure to be wired in.

---

### Level 5 — UI Alignment (depends on all above)

The UI must reflect the canonical model — org-scoped data, role-based views, temporal capabilities.

```
┌─────────────────────────────────────────────────────────────┐
│ LEVEL 5: UI ALIGNMENT                                       │
│                                                             │
│  D-014  Page Components Using Legacy Identity               │
│  R-009  Edge Route Enforcement                              │
│  Role-based UI views                                        │
│  Org-scoped data display                                    │
│  Temporal query UI                                          │
└─────────────────────────────────────────────────────────────┘
```

---

### Dependency Graph (Visual)

```
Level 0: Security Foundation
    │
    ├── A-001, A-002 (P0 auth violations)
    ├── C-012 (unprotected tables)
    └── A-006 (edge middleware)
    │
    ▼
Level 1: Identity
    │
    ├── C-001 (god-table decomposition)
    ├── C-005 (dual identity resolution)
    ├── C-013 (legacy RLS migration)
    └── R-001, R-007, R-008
    │
    ▼
Level 2: Knowledge              Level 3: Lifecycle
    │                              │
    ├── C-002 (org-scoped knowledge)  ├── C-006 (5 absent concepts)
    ├── C-003 (evidence boundary)     ├── C-009 (consultant/engagement)
    ├── C-004 (temporal infra)        ├── C-011 (commercial arrangements)
    └── R-002, R-003, R-004           └── C-008 (subscription migration)
    │                              │
    └──────────┬───────────────────┘
               │
               ▼
Level 4: Agent Alignment
    │
    ├── C-007 (runtime identity in tools)
    ├── C-010 (role-based access)
    └── R-006, R-010
    │
    ▼
Level 5: UI Alignment
    │
    ├── D-014 (page components)
    ├── R-009 (edge enforcement)
    └── Role-based views, org-scoped display, temporal UI
```

---

### Critical Path

The critical path through the dependency graph is:

```
P0 Auth Fix → RLS Fix → Identity Decomposition → Knowledge Architecture → Agent Alignment → UI
```

**The single most impactful change is C-001 (identity god-table decomposition).** It is the foundation for R-001 (single identity), R-002 (org-scoped knowledge), R-007 (RLS consistency), and R-008 (users table decomposition). Resolving C-001 unblocks the majority of the dependency graph.

---

## 7. Summary

### What P1.3 Has Established

1. **14 architectural conflicts** between the canonical model and the current implementation (C-001 through C-014)
2. **14 semantic discontinuities** where meaning is lost across architectural boundaries (D-001 through D-014)
3. **6 authority conflicts** including 2 P0 security violations (A-001 through A-006)
4. **10 target architecture requirements** — capabilities the system must possess (R-001 through R-010)
5. **5-level migration dependency graph** — what must be resolved before what

### The Central Finding

**The canonical model exists in the database but not in the application. The application operates against a legacy person-scoped model with a different semantic structure from the canonical model.**

The most foundational conflict is C-001 (identity god-table). Resolving it unblocks the majority of the dependency graph. The most architecturally significant gap is C-002/C-003 (knowledge architecture). Without org-scoped knowledge, the core product promise — organisational intelligence that survives transitions — cannot be delivered.

### What P1.3 Does NOT Do

- P1.3 does not redesign the canonical model (P0 is frozen)
- P1.3 does not design the target architecture (that is P1.4)
- P1.3 does not estimate effort or timelines
- P1.3 does not begin implementation

### What Comes Next

P1.4 — Target Production Architecture. Given the canonical requirements, the forensic evidence, and the dependency graph, derive the actual architecture Kira must have. Not a retrofit — a target architecture derived from the canonical model and constrained by the dependency graph.

---

*P1.3 Architectural Gap / Conflict Model — Complete. No files modified.*
