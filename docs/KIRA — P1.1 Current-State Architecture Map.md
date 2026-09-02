# KIRA — P1.1 Current-State Architecture Map

**Status:** FORENSIC AUDIT COMPLETE
**Purpose:** Evidence-based map of what exists in the Kira repository right now
**Scope:** Full repository — schema, TypeScript, API routes, agents, frontend, database
**Date:** 26 August 2026
**Prerequisite:** P0 CLOSED; P0.6 schema-level baseline established
**Method:** Read-only forensic audit. Every node traced to actual code/schema/file. No files modified.

---

## 1. Executive Summary

Kira's implementation has three distinct layers of maturity:

**Layer A — Production-active:** The voice agent, memory, genome, billing, and introducer systems are fully operational with deep application code.

**Layer B — Schema-only (new):** P0.5 and P0.7 migrations created canonical tables, RLS policies, and SQL functions that are architecturally correct but have no TypeScript application code calling them.

**Layer C — Schema-only (legacy):** Older tables (`users`, `kira_knowledge`, `kira_agents`) that remain in production use but do not conform to the canonical model.

The most significant finding is that **the canonical model exists in the database but not in the application layer.** The P0.7 knowledge layer, the consultant model, the engagement model, the Kira instance model, and the commercial arrangement model all have correct SQL schemas but zero TypeScript integration. The application continues to operate against the legacy person-scoped model (`user_id` on every row) while the canonical organisation-scoped model sits unused alongside it.

---

## 2. Repository Structure Overview

```
Kira/
├── app/
│   ├── api/                    # 21 route groups (Next.js App Router)
│   │   ├── kira/               # Core Kira agent routes (15 subdirectories)
│   │   ├── billing/            # Stripe billing routes
│   │   ├── checkout/           # Stripe checkout
│   │   ├── pubguard/           # PubGuard security scanner
│   │   ├── webhooks/           # External webhook handlers
│   │   ├── voice/              # Voice telemetry
│   │   ├── genome/             # Genome API
│   │   └── ...
│   └── (pages)                 # Server components + client components
├── lib/
│   ├── auth.ts                 # Identity resolution (canonical + legacy)
│   ├── supabase/               # Supabase client factories
│   ├── kira/                   # Agent logic (63 files — the heart of Kira)
│   ├── genome/                 # Genome derivation and deduplication
│   ├── billing/                # Billing engine (7 files)
│   ├── introducer/             # Introducer/distributor channel
│   ├── elevenlabs/             # ElevenLabs integration
│   ├── pubguard/               # PubGuard security scanning
│   ├── voice/                  # Voice transport
│   └── ...
├── supabase/migrations/        # 100 migration files (P0.5 + P0.7 are recent)
├── business-genome/            # Genome extraction pipeline (16 files)
├── scripts/                    # Provisioning, migration, agent scripts
├── components/                 # Shared UI components
├── docs/                       # Architecture documents (P0 series complete)
└── voice.config.ts             # Voice configuration
```

---

## 3. Domain Maps

### 3.1 Identity Resolution

**Canonical Path (exists, works, underused):**
```
Supabase Auth (JWT)
    │
    ▼
auth_credentials (auth_user_id → person_id)
    │
    ▼
persons (person_id)
    │
    ▼
organisation_memberships (person_id → organisation_id, role, valid_from/to)
    │
    ▼
organisations (organisation_id)
```

**Files:**
| File | Role |
|------|------|
| `lib/auth.ts:123-168` | `getCurrentOrganisationContext()` — canonical resolver |
| `lib/auth.ts:49-83` | `getCurrentAppUser()` — **DEPRECATED** legacy resolver |
| `lib/auth.ts:171-195` | Convenience wrappers: `getCurrentOrganisationId()`, `getCurrentPersonId()`, `currentUserHasRole()`, `currentUserIsOwner()`, `currentUserIsAdmin()` |

**Database objects:**
| Table/Function | Migration | Purpose |
|---|---|---|
| `auth_credentials` | `20260720100000_auth_link.sql` | Links Supabase auth user to person |
| `persons` | `20260826100000_p05_canonical_identity.sql` | Canonical person identity |
| `organisations` | `20260826100000_p05_canonical_identity.sql` | Canonical organisation identity |
| `organisation_memberships` | `20260826110000_p05_membership_tenant_context.sql` | Person→Org link with role + temporal validity |
| `auth_user_has_organisation_access()` | `20260826120000_p05_rls_authority_transfer.sql` | RLS gate function |

**Supabase clients:**
| File | Client | Key | RLS |
|------|--------|-----|-----|
| `lib/supabase/server.ts:5` | `createServiceClient()` | `SUPABASE_SECRET_KEY` | **BYPASSES** |
| `lib/supabase/server.ts:19` | `createServiceClientV2()` | `SUPABASE_SECRET_KEY` | **BYPASSES** |
| `lib/supabase/server-session.ts:10` | `createSessionClient()` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Enforced |
| `lib/supabase/browser.ts:7` | `createClient()` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Enforced |

**Gaps:**
1. `proxy.ts` exports `proxy` instead of `middleware` — Next.js edge middleware is **inactive**. Route segregation (USER_PROTECTED, ADMIN, INTRODUCER) is not enforced at the edge.
2. 15+ API routes still use `getCurrentAppUser()` exclusively — no canonical org context.
3. 3 API routes use `getCurrentOrganisationContext()` for auth but then use `user.id` for downstream writes (dual pattern).
4. ~15 page components use `getCurrentAppUser()` for read-side display.
5. **Two routes have zero authentication and accept `user_id` from client request bodies:**
   - `app/api/kira/research/route.ts` — accepts `user_id` from body/header, uses service-role client
   - `app/api/kira/email/send-kira-ready/route.ts` — accepts `user_id` from body, reads PII, sends emails

---

### 3.2 People & Roles

**Database:**
| Table | Purpose | Status |
|-------|---------|--------|
| `persons` | Canonical person identity (person_id, email, name) | Active — P0.5 |
| `organisation_memberships` | Person→Org link with role (owner/admin/consultant/employee/advisor/member) | Active — P0.5 |
| `users` | Legacy user table (auth_user_id, email, name) | Active — retained for bridge |

**Application code:**
- `lib/auth.ts:145-162` — resolves `organisation_memberships.role` but `currentUserHasRole()` is **never called** from any other file.
- `lib/auth.ts:198` — `currentUserHasRole()` exists but has zero callers in the codebase.
- Role differentiation (owner vs admin vs consultant) is defined in the schema but not enforced in application logic.

**Gaps:**
- Role-based access control is schema-defined but application-dead. No route checks `currentUserIsOwner()` or `currentUserHasRole()`.
- The `users` table is still written to by several routes (`client_profiles`, `business_identity`, etc.) alongside the canonical `persons` table.

---

### 3.3 Ownership

**Database:**
| Table | Purpose | Status |
|-------|---------|--------|
| `ownership_periods` | Temporal ownership (person_id → organisation_id, valid_from/to, status) | Active — P0.5 |

**Application code:**
- **Zero TypeScript references to `ownership_periods` in the entire codebase.**
- The table exists and has RLS, but no API route, service function, or UI component reads or writes it.
- Ownership is currently determined by `organisation_memberships.role = 'owner'` — a current-state derivation, not a historical record.

**Gaps:**
- Historical ownership is not queryable from application code.
- Ownership changes do not create `ownership_periods` records.
- INV-003 PARTIAL — structural support exists, application logic does not exist.

---

### 3.4 Consultants

**Database:**
| Table | Purpose | Status |
|-------|---------|--------|
| `consultant_profiles` | Consultant identity (extends person or standalone) | Active — P0.5 |
| `consultant_relationships` | Org→Consultant link (valid_from/to, status) | Active — P0.5 |
| `consultant_history` | Audit trail for relationship changes | Active — P0.5 |

**Application code:**
- **4 TypeScript references to "consultant" — all natural language:**
  - `lib/auth.ts:142` — role priority comment
  - `lib/genome/derive.ts:459` — LLM prompt text
  - `lib/kira/discovery.ts:3` — comment describing Kira's role
  - `lib/kira/discovery-config.ts:31` — LLM persona description
- `lib/kira/consultant/` — **does not exist**
- No consultant API routes
- No consultant business logic
- `currentUserHasRole('consultant')` is defined but never called

**Gaps:**
- Consultant is a schema concept with no application layer. The full consultant lifecycle (invite, onboard, assign, transition, offboard) does not exist in code.
- The `consultant_profiles` table has no INSERT/UPDATE/DELETE RLS policies — all mutations must use service role.

---

### 3.5 Engagements

**Database:**
| Table | Purpose | Status |
|-------|---------|--------|
| `engagements` | Engagement identity (org_id, type, status, valid_from/to) | Active — P0.5 |
| `engagement_participants` | People/consultants in an engagement | Active — P0.5 |
| `engagement_history` | Audit trail | Active — P0.5 |

**Application code:**
- **29 TypeScript references to "engagement" — none refer to the canonical concept:**
  - `lib/genome/checklist.ts:396-402` — employment classification (worker type)
  - `lib/introducer/undertaking.ts:39` — professional engagement agreement (legal text)
  - `app/api/cron/reengagement-emails/` — re-engagement marketing emails
  - `app/api/pubguard/v2/types.ts:165` — social media engagement metric
  - Various LLM prompts and comments

- Zero references to `engagements` table, `engagement_participants`, or `engagement_history` in application code.

**Gaps:**
- Engagement is a schema concept with no application layer. There is no way to create, progress, or complete an engagement through the application.
- The `engagements` table has no INSERT/UPDATE/DELETE RLS policies.

---

### 3.6 Kira Instances

**Database:**
| Table | Purpose | Status |
|-------|---------|--------|
| `kira_instances` | Kira instance identity (org_id, journey_type, config, status) | Active — P0.5 |
| `kira_instance_history` | Audit trail | Active — P0.5 |

**Application code:**
- **Zero TypeScript references to `kira_instances` or `kira_instance_history` in the entire codebase.**
- Agent management happens through the legacy `kira_agents` table and ElevenLabs provisioning scripts.

**Gaps:**
- Kira Instance is a schema concept with no application layer.
- There is no code to create, configure, replace, or retire a Kira instance.
- The instance-independence test (can knowledge survive instance replacement?) cannot be executed because there is no instance management code.

---

### 3.7 Subscriptions

**This is the most deeply embedded commercial concept in Kira.**

**Database:**
| Table/Column | Purpose | Status |
|---|---|---|
| `subscriptions` (canonical) | Subscription record (org_id, tier_id, status, valid_from/to) | Active — P0.5 schema |
| `subscription_history` | Audit trail | Active — P0.5 schema |
| `users.subscription_status` | **Actual subscription state** — lives on legacy `users` table | Active — production |
| `users.stripe_subscription_id` | Stripe reference | Active — production |
| `users.stripe_customer_id` | Stripe customer reference | Active — production |
| `users.trial_ends_at` | Trial boundary | Active — production |
| `billing_periods_reported` | Idempotent period tracking for arrears | Active — production |

**Application code — Billing library (`lib/billing/`):**
| File | Role |
|------|------|
| `arrears.ts` | Arrears billing engine — reports periods, enforces 12-month cap, cancels with month-waiver |
| `plan-state.ts` | Derives user-facing plan state from subscription_status |
| `stripe-mode.ts` | Test/live key switch |
| `copy.ts` | All money-related product copy |
| `beta-codes.ts` | Beta access code minting/claiming |
| `index.ts` | Central billing orchestrator + subscription adapter |

**API routes:**
| Route | Purpose |
|-------|---------|
| `POST /api/checkout` | Creates Stripe Checkout session with dynamic pricing |
| `POST /api/billing/cancel` | Cancels with month-waiver |
| `GET /api/billing/portal` | Opens Stripe billing portal |
| `GET /api/billing/usage` | Fair-use meter data |
| `GET /api/billing/mode` | Returns live/test mode |

**Pricing:**
- `PRICE_TIERS` defined in `lib/valuation/pricing.ts` — 5 bands ($499-$4,999/month), **code-only, no DB table**
- Consumed by checkout, billing copy, introducer disclosure, arrears cap

**Gaps:**
- The billing system writes to `users` table columns, NOT to the canonical `subscriptions` table.
- The `subscriptions` table (P0.5) exists but is never read or written by application code.
- Subscription lifecycle (commence, renew, change tier, suspend, expire, cancel, replace) is implemented in `lib/billing/` but operates against the legacy `users` schema.
- No connection exists between the canonical `subscriptions` table and the billing system.
- `pricing_tiers` is code-only — no DB table, no versioning, no historical pricing.

---

### 3.8 Commercial Arrangements

**Database:**
| Table | Purpose | Status |
|-------|---------|--------|
| `commercial_arrangements` | Commercial arrangement (org_id, arrangement_type, terms) | Active — P0.5 schema |
| `commercial_history` | Audit trail for arrangement changes | Active — P0.5 schema |

**Application code:**
- **Zero TypeScript references to `commercial_arrangements` or `commercial_history` in the entire codebase.**

**Gaps:**
- Commercial Arrangement is a schema concept with no application layer.
- The broader economic/contractual relationship (consultant fees, revenue sharing, referral arrangements, tiered pricing) is not represented in application code.
- Pricing changes, revenue-share changes, and consultant term changes are not tracked in any structured way.
- `arrangement_type` enum values (`consultant_fees`, `kira_subscription`, etc.) are defined in SQL but never used in TypeScript.

---

### 3.9 Knowledge Layer

**This is the most architecturally significant domain. Kira has THREE knowledge subsystems.**

#### Layer 1: `kira_memory` (Operational Memory)

**Database:**
| Table | Purpose | Status |
|-------|---------|--------|
| `kira_memory` | Flat-text memory (content, importance, user_id, agent_id) | Active — production |
| `kira_memory_parked_reason` | Parking metadata | Active |
| `kira_memory_genome_headline` | Genome classification | Active |
| `kira_memory_privacy_classification` | Privacy classification | Active |
| `kira_memory_content_original` | Original content preservation | Active |

**Application code:**
| File | Role |
|------|------|
| `lib/kira/recall.ts` | Two-lane recall: Mnemo semantic search + kira_memory substring search |
| `lib/kira/memory-extract.ts` | Post-call distilation — extracts facts from conversation |
| `lib/kira/convai.ts:89-120` | `onConversationComplete` — distils conversation to memory |
| `lib/kira/confirm.ts` | Owner confirmation loop (facts_to_confirm, confirm_fact) |
| `lib/kira/knowledge-ingest.ts` | Document ingestion into kira_knowledge |
| `lib/kira/knowledge-search.ts` | RAG search over kira_knowledge (pgvector + Jina reranking) |

**Key properties:**
- Person-scoped via `user_id` on every row
- No evidence separation — the memory row IS the knowledge
- Minimal provenance (user_id + agent_id only)
- No temporal semantics beyond `created_at`
- Identity baked into tool URLs via `?uid=` parameter

#### Layer 2: Business Genome (Structured Knowledge)

**Database:**
| Table | Purpose | Status |
|-------|---------|--------|
| `genome_entities` | Business entities (people, systems, assets, etc.) | Active — production |
| `genome_facts` | Subject-predicate-object triples | Active — production |
| `genome_relationships` | Entity-to-entity edges | Active — production |
| `genome_events` | Immutable audit trail of mutations | Active — production |
| `genome_entities_sections` | 9-area classification | Active — production |
| `genome_checklists` | Assessment checklists | Active — production |

**Application code:**
| File | Role |
|------|------|
| `business-genome/types.ts` | TypeScript interfaces for all genome types |
| `business-genome/extract.ts` | LLM-powered extraction from conversations (gpt-4.1-mini) |
| `business-genome/repository.ts` | CRUD layer — the ONLY code that touches genome tables |
| `business-genome/orchestrator.ts` | Decision layer: what to ask, what to show, access control |
| `business-genome/conversation-loop.ts` | Bridges genome state and voice conversation |
| `business-genome/conflicts.ts` | Conflict detection and supersession |
| `business-genome/ontology/v1/areas.ts` | 9-area ontology definition |
| `lib/genome/derive.ts` | Maps memory→genome classification |
| `lib/genome/dedupe-sweep-apply.ts` | Deduplication sweeper |

**Key properties:**
- Person-scoped via `user_id` on every row
- Evidence encoded inline as `source_type` + `source_id` (no separate evidence table)
- Partial provenance (source_type, source_id, observed_at)
- Supersession-based history (`superseded_at`, `supersedes` pointer)
- `valid_from`/`valid_to` defined in types but never populated by extraction
- No time-slice queries — cannot ask "what did we know on date X?"
- Identity baked into tool URLs via `?uid=` parameter

**Extraction pipeline:**
```
Conversation transcript
    │
    ▼
LLM extraction (gpt-4.1-mini, temp 0.1)
    │
    ▼
Validation against whitelist (area_keys, entity_types, predicates)
    │
    ▼
Conflict detection + supersession
    │
    ▼
genome_entities / genome_facts / genome_relationships
    │
    ▼
genome_events (immutable audit trail)
```

#### Layer 3: P0.7 Organisational Knowledge (Schema-Only)

**Database (migrations exist, no TypeScript code):**
| Table | Purpose | Status |
|-------|---------|--------|
| `organisational_knowledge` | Canonical knowledge objects (org-scoped) | Schema only |
| `organisational_knowledge_history` | Immutable audit trail | Schema only |
| `evidence` | Raw source material (conversation, document, observation) | Schema only |
| `knowledge_evidence_links` | Many-to-many knowledge↔evidence links | Schema only |
| `knowledge_relationships` | Knowledge-to-knowledge relationships | Schema only |
| `knowledge_provenance_view` | Convenience view for provenance queries | Schema only |
| `promotion_rules` | Knowledge promotion rules | Schema only |
| `promotion_candidates` | Candidate knowledge awaiting promotion | Schema only |
| `promotion_log` | Promotion audit trail | Schema only |

**SQL functions (defined, never called from TypeScript):**
| Function | Purpose |
|----------|---------|
| `get_current_knowledge(org_id, type)` | Current knowledge for an org |
| `get_knowledge_at_time(org_id, timestamp, type)` | Time-slice query |
| `get_knowledge_at_point_in_time(org_id, timestamp)` | Alternate time-slice |
| `get_knowledge_history(org_id, subject, predicate, type)` | History of a knowledge item |
| `get_supersession_chain(knowledge_id, depth)` | Walk supersession chain |
| `get_superseded_knowledge(org_id)` | All superseded knowledge |
| `get_conflicting_knowledge(org_id)` | Conflicting knowledge detection |
| `get_knowledge_statistics(org_id)` | Knowledge statistics |
| `supersede_knowledge(old_id, new_id, reason)` | Atomic supersession |

**Gaps (CRITICAL):**
- No TypeScript repository code for `organisational_knowledge`
- No extraction pipeline integration — conversations do NOT promote to `organisational_knowledge`
- No evidence ingestion — the `evidence` table is never written to
- No UI — no page shows the org-scoped knowledge view
- No migration of existing genome data into the new structure
- The entire Layer 3 exists as SQL schema but is invisible to the application
- **The three layers do not communicate.** Layer 2 (genome) does not promote to Layer 3 (P0.7). Layer 1 (memory) feeds Layer 2 but not Layer 3.

---

### 3.10 Temporal Infrastructure

**Schema-level temporal patterns (comprehensive):**
| Pattern | Tables Using It |
|---------|----------------|
| `valid_from` / `valid_to` | `organisation_memberships`, `ownership_periods`, `consultant_relationships`, `engagements`, `engagement_participants`, `subscriptions`, `commercial_arrangements`, `kira_instances`, `organisational_knowledge` |
| `is_current` (derived) | `organisational_knowledge` |
| `superseded_at` / `supersedes` | `genome_entities`, `genome_facts`, `genome_relationships`, `organisational_knowledge` |
| `effective_from` / `effective_to` | `organisational_knowledge` |
| `_history` tables | 7 tables: `consultant_history`, `engagement_history`, `commercial_history`, `subscription_history`, `kira_instance_history`, `decision_history`, `organisational_knowledge_history` |

**Application-level temporal behaviour:**
| Capability | Schema | Application Code |
|------------|--------|------------------|
| Query current knowledge | ✅ | ❌ (no TypeScript calls `get_current_knowledge`) |
| Query knowledge at point in time | ✅ | ❌ |
| Query knowledge history | ✅ | ❌ |
| Walk supersession chain | ✅ | ❌ |
| Detect conflicting knowledge | ✅ | ❌ |
| Query ownership history | ✅ (schema only) | ❌ |
| Query engagement history | ✅ (schema only) | ❌ |
| Query subscription history | ✅ (schema only) | ❌ |
| Query commercial history | ✅ (schema only) | ❌ |

**Gaps:**
- ALL temporal query functions exist in SQL but have ZERO TypeScript callers.
- The temporal infrastructure is DB-complete but application-dead.
- `is_current` is derived via SQL rule but the derivation is not enforced at the application layer.
- `GenomeFact.valid_from`/`valid_to` are defined in TypeScript types but never populated by the extraction pipeline.

---

### 3.11 Access Control

**RLS Policies — Canonical Layer:**
- 20+ tables protected by `auth_user_has_organisation_access(organisation_id)` (FOR ALL)
- Includes: `genome_entities`, `genome_facts`, `genome_relationships`, `genome_events`, `organisational_knowledge`, `evidence`, `knowledge_evidence_links`, `conversations`, `conversation_messages`, `kira_memory`, `kira_knowledge`, `organisation_memberships`, `organisations`, `persons`
- `auth_user_has_organisation_access()` has a `users` table fallback (bridge period — intentional)

**RLS Policies — Legacy Layer (NOT org-scoped):**
| Table | Policy Pattern |
|-------|---------------|
| `users` | `auth.uid() = id` |
| `client_profiles` | `auth.uid() = user_id` |
| `business_valuations` | `auth.uid() = user_id` |
| `business_valuation_snapshots` | `auth.uid() = user_id` |
| `kira_tasks` | `auth.uid() = user_id` |
| `kira_refusals` | `auth.uid() = user_id` |
| `kira_fact_confirmations` | `auth.uid() = user_id` |
| `drive_documents` | `auth.uid() = user_id` |
| `business_identity` | `auth.uid() = user_id` |

**RLS — No Protection:**
| Table | Issue |
|-------|-------|
| `decisions`, `decision_history` | No RLS |
| `actions`, `outcomes`, `learnings` | No RLS |
| `kira_instances`, `kira_instance_history` | No RLS |
| `subscriptions`, `subscription_history` | No RLS |
| `commercial_arrangements`, `commercial_history` | No RLS |
| `pricing_tiers` | No RLS |
| `ownership_periods` | No RLS |

**Consultant/Engagement RLS — SELECT only:**
- Consultant and engagement tables have SELECT policies but no INSERT/UPDATE/DELETE policies.
- All mutations use service role (bypasses RLS).

**Application-layer access control:**
- `currentUserHasRole()`, `currentUserIsOwner()`, `currentUserIsAdmin()` — defined but never called
- No route-level role checks exist in application code
- Agent access control in `business-genome/orchestrator.ts` is in-memory and ephemeral

**Gaps:**
- Legacy tables are not org-scoped — they use `auth.uid()` not `auth_user_has_organisation_access()`
- P0.5 Step 5 tables have no RLS at all
- Role-based differentiation is defined but unused
- The `auth_user_has_organisation_access()` bridge fallback to `users` table should be removed when legacy authority is fully retired

---

### 3.12 Agent/Tool Behaviour

**Tool manifest (`lib/kira/tool-manifest.mjs`):**
- 19 tools defined for `business` journey type
- Tools are defined in separate `*-tool-def.mjs` files and composed by `toolDefsFor()`
- The prompt's `## TOOLS` section is generated from the same array (single source of truth)

**Tool inventory (business journey):**
| Tool | Purpose | Identity Pattern |
|------|---------|-----------------|
| `save_message` | File each conversation turn | Server-side bookkeeping |
| `update_conversation_topic` | Declare call topic | Server-side bookkeeping |
| `get_conversation_context` | Pull conversation history | Canonical (org context) |
| `recall_memory` | Semantic memory search | `?uid=` in URL (server-baked) |
| `search_knowledge` | RAG search over documents | `?uid=` in URL (server-baked) |
| `save_memory` | Save a memory | `?uid=` in URL (server-baked) |
| `dispatch` | Create task/action | `?uid=` in URL |
| `approve` | Approve dispatch | `?uid=` in URL |
| `get_financials` | Read financial data | `?uid=` in URL |
| `check_tasks` | Check pending tasks | `?uid=` in URL |
| `search_drive` | Search Google Drive | `?uid=` in URL |
| `read_document` | Read a document | `?uid=` in URL |
| `keep_document` | Save a document reference | `?uid=` in URL |
| `lookup_contact` | Look up contact details | `?uid=` in URL |
| `record_refusal` | Record a declined request | `?uid=` in URL |
| `facts_to_confirm` | List facts needing confirmation | `?uid=` in URL |
| `confirm_fact` | Confirm/correct/deny a fact | `?uid=` in URL |
| `area_agenda` | What to ask next (9 areas) | `?uid=` in URL |
| `file_manual` | File operating manual | `?uid=` in URL |
| `research_organisation` | Research another org | `?uid=` in URL |

**Identity resolution in tools:**
- Most tools use `?uid=` parameter in the webhook URL — the server bakes the user identity into the tool definition at provisioning time
- `uid-tools.ts` / `uid-tools.mjs` extract and validate the `uid` from incoming requests
- This means tool identity is **agent-scoped at provisioning time**, not session-resolved at call time
- The `isUidToolUrl()` function validates that a URL contains a valid UID

**Post-call pipeline (`lib/kira/convai.ts`):**
```
onConversationComplete:
    1. Snapshot prior facts
    2. Distil conversation → kira_memory
    3. Forget parked entity leaks
    4. Sweep duplicate memories
    5. Refile assistant capability claims
    6. Classify pending memories → genome
    7. Accrue voice cost
```

**Webhook routing:**
- Legacy `/api/kira/webhook` → **RETIRED** (returns 410)
- Canonical endpoint: `/api/kira/webhooks/post-call` (via `kiraConvaiRoutes()`)
- HMAC signature verification on all post-call payloads
- Tool webhook secrets with rotation window (`KIRA_TOOL_WEBHOOK_SECRET_PREVIOUS`)

**Setup tools (`app/api/kira/setup-tools/route.ts`):**
- In-memory session storage (Map) — documented as temporary
- Handles: `set_journey_type`, `save_user_context`, `create_operational_kira` (deprecated)
- `create_operational_kira` returns deprecation error — onboarding now uses authenticated draft flow

**Gaps:**
- Tool identity is baked at provisioning time, not resolved per-request. If a user's organisation membership changes, the tool's `uid` does not update.
- The post-call pipeline writes to `kira_memory` and `genome_*` but never writes to `organisational_knowledge` or `evidence`.
- No tool writes to the P0.7 knowledge layer.
- The `research_organisation` tool (`lib/kira/research-tools.ts`) writes to `kira_research_sessions` using `user_id` — it does not resolve organisation context.
- `area_agenda` tool queries the genome for gaps but does not query the P0.7 knowledge layer.

---

## 4. Cross-Cutting Architectural Observations

### 4.1 The Three-Layer Knowledge Gap

The most significant architectural finding is the gap between the three knowledge layers:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 3: P0.7 Organisational Knowledge (SCHEMA ONLY)               │
│   ├── organisational_knowledge (org-scoped)                        │
│   ├── evidence (separated source material)                         │
│   ├── knowledge_evidence_links                                     │
│   ├── Full provenance, temporal semantics, supersession            │
│   └── ❌ No TypeScript code reads or writes this layer             │
├─────────────────────────────────────────────────────────────────────┤
│ Layer 2: Business Genome (PRODUCTION ACTIVE)                       │
│   ├── genome_entities, genome_facts, genome_relationships         │
│   ├── Inline provenance (source_type + source_id)                  │
│   ├── Supersession-based history                                   │
│   ├── Person-scoped (user_id)                                      │
│   └── ✅ Active extraction pipeline, CRUD, conflict detection      │
├─────────────────────────────────────────────────────────────────────┤
│ Layer 1: kira_memory (PRODUCTION ACTIVE)                           │
│   ├── Flat text memories                                           │
│   ├── No evidence separation                                       │
│   ├── No provenance beyond user_id + agent_id                      │
│   ├── No temporal semantics                                        │
│   └── ✅ Active recall, confirmation, distilation                  │
└─────────────────────────────────────────────────────────────────────┘
```

**The canonical boundary (INV-010) is defined in Layer 3 but enforced in neither Layer 1 nor Layer 2.**

### 4.2 The Schema/Application Duality

Canonical tables exist alongside legacy tables, with no bridge between them:

| Canonical Table (P0.5/P0.7) | Legacy Table (in use) | Bridge? |
|---------------------------|----------------------|---------|
| `organisations` | `users` (carries org-like attributes) | ❌ |
| `persons` | `users` (same data, different table) | ❌ |
| `organisation_memberships` | `users.id` used as identity anchor | ❌ |
| `ownership_periods` | None | ❌ |
| `consultant_profiles/relationships` | None | ❌ |
| `engagements` | None | ❌ |
| `kira_instances` | `kira_agents` | ❌ |
| `subscriptions` | `users.subscription_status` etc. | ❌ |
| `commercial_arrangements` | None | ❌ |
| `organisational_knowledge` | `genome_*` + `kira_memory` | ❌ |

### 4.3 The Identity Drift

The canonical identity resolution chain works correctly in the routes that use it. But the application has two identity systems running in parallel:

1. **Canonical:** `auth → auth_credentials → persons → organisation_memberships → organisations`
2. **Legacy:** `auth → users` (bypasses persons, memberships, organisations)

Routes that use canonical auth but write to legacy tables create a hybrid that satisfies neither model.

### 4.4 The Temporal Illusion

Temporal infrastructure is comprehensive at the database level — 7 `_history` tables, 9 SQL functions, `valid_from`/`valid_to` on 8 tables. But:

- **Zero TypeScript code calls any temporal function.**
- **Zero TypeScript code queries any `_history` table.**
- The temporal capabilities exist as infrastructure that nothing uses.
- The application cannot answer "what was true on date X?" for any domain.

### 4.5 The Instance Independence Test

**The central architectural test from P1:**

> If Kira itself were replaced tomorrow — the application, the agent, the tenant interface, all of it — would the Organisation and its governed organisational knowledge survive intact?

**Current answer: NO.**

Reasons:
1. Organisational knowledge is split across three layers, none of which communicate.
2. The P0.7 `organisational_knowledge` layer (the one designed for instance independence) has no application code.
3. The active knowledge layers (`kira_memory`, `genome_*`) are person-scoped, not organisation-scoped.
4. Tool identity is baked at provisioning time via `?uid=` — replacing the application would orphan all tool references.
5. The `evidence` table is never written to — the raw source material is trapped in `conversation_messages` and `kira_memory`.
6. Subscription state lives in `users` table columns, not in the canonical `subscriptions` table.

---

## 5. Key Findings Summary

### Critical Findings

| # | Finding | Domain | Impact |
|---|---------|--------|--------|
| 1 | P0.7 knowledge layer is schema-only — no TypeScript integration | Knowledge | Organisational knowledge cannot survive instance replacement |
| 2 | Temporal query functions exist in SQL but have zero TypeScript callers | Temporal | Cannot answer "what was true at time T?" |
| 3 | Three knowledge layers operate independently with no promotion path between them | Knowledge | Evidence does not become knowledge; knowledge does not become organisational knowledge |
| 4 | Two routes have zero auth and accept user_id from client body | Identity | Full authority violation — any caller can read/write any user's data |
| 5 | Subscription/billing uses legacy `users` table, not canonical `subscriptions` | Commercial | Commercial history is not recoverable |
| 6 | Consultants and engagements have full schema but zero application logic | Lifecycle | Cannot create, progress, or complete engagements or consultant relationships |
| 7 | `proxy.ts` exports `proxy` not `middleware` — edge middleware inactive | Access | Route segregation not enforced at edge |
| 8 | 15+ routes still use `getCurrentAppUser()` — legacy identity path | Identity | Organisational authority bypassed at application layer |

### Significant Findings

| # | Finding | Domain | Impact |
|---|---------|--------|--------|
| 9 | `currentUserHasRole()` defined but never called | Access | Role-based differentiation is schema-only |
| 10 | Tool identity baked at provisioning time via `?uid=` | Agent | Cannot reflect runtime membership changes |
| 11 | `auth_user_has_organisation_access()` still has `users` table fallback | Identity | Bridge period not closed |
| 12 | Legacy tables (9 tables) use `auth.uid()`, not org-scoped RLS | Access | Not multi-tenant |
| 13 | P0.5 Step 5 tables have no RLS at all | Access | Unprotected by row-level security |
| 14 | `setup-tools` uses in-memory session storage | Agent | Not production-safe for multi-instance |
| 15 | `orchestrator.ts` access log is in-memory (max 1000 entries) | Agent | Lost on restart |
| 16 | No `kira_instance` management in application code | Instance | Cannot test instance independence |
| 17 | No `commercial_arrangement` management in application code | Commercial | Commercial versioning not implemented |
| 18 | Pricing is code-only (`PRICE_TIERS` in `lib/valuation/pricing.ts`), no DB table | Commercial | No pricing history, no per-org pricing overrides |

---

## 6. Domain Index

| Domain | Schema Status | Application Status | First-Class? | Canonical Conformance |
|--------|--------------|-------------------|--------------|----------------------|
| Organisation | ✅ Complete | ⚠️ Partial (routes use it, pages don't) | ✅ | CONFIRMED |
| Person | ✅ Complete | ⚠️ Partial (dual `users`/`persons`) | ✅ | CONFIRMED |
| Ownership Period | ✅ Complete | ❌ No application code | ❌ | PARTIAL |
| Consultant | ✅ Complete | ❌ No application code | ❌ | Schema only |
| Engagement | ✅ Complete | ❌ No application code | ❌ | Schema only |
| Kira Instance | ✅ Complete | ❌ No application code | ❌ | Schema only |
| Subscription | ⚠️ Partial (schema exists, not used) | ✅ Deep (legacy `users` columns) | ✅ (legacy) | PARTIAL |
| Commercial Arrangement | ✅ Complete | ❌ No application code | ❌ | Schema only |
| Knowledge (Layer 1: kira_memory) | ✅ Active | ✅ Active | ✅ | PARTIAL (person-scoped) |
| Knowledge (Layer 2: Genome) | ✅ Active | ✅ Active | ✅ | PARTIAL (person-scoped, no evidence separation) |
| Knowledge (Layer 3: P0.7) | ✅ Schema only | ❌ No application code | ❌ | CONFIRMED (schema) |
| Temporal | ✅ Comprehensive | ❌ No application usage | ❌ | PARTIAL |
| Access Control | ⚠️ Mixed (canonical + legacy + unprotected) | ⚠️ Partial (role checks unused) | ⚠️ | PARTIAL |
| Agent/Tools | ✅ Active | ✅ Active | ✅ | PARTIAL (identity baked at provision time) |

---

## 7. P0.6 Baseline Verification

P0.6 established schema-level conformance for all 20 invariants. P1.1 confirms those findings and extends them:

| Invariant | P0.6 Status | P1.1 Extension |
|-----------|-------------|----------------|
| INV-001 Organisation persistence | CONFIRMED | ✅ Schema correct. Application partially bypasses via legacy paths. |
| INV-002 Person/role separation | CONFIRMED | ✅ Schema correct. Role differentiation unused in application code. |
| INV-003 Ownership temporalisation | PARTIAL | ⚠️ Schema correct. Zero application code. Historical ownership unrecoverable. |
| INV-004 Consultant first-class | CONFIRMED | ⚠️ Schema correct. Zero application code. Consultants exist as a role value only. |
| INV-005 Engagement first-class | CONFIRMED | ⚠️ Schema correct. Zero application code. |
| INV-006 Consultant/Introducer separation | CONFIRMED | ✅ Confirmed. Introducer channel is fully independent. |
| INV-007 Engagement/Subscription separation | CONFIRMED | ✅ Confirmed. No FK between tables. |
| INV-008 Kira/Organisation separation | CONFIRMED | ✅ Confirmed. `kira_instances` FK to `organisations`. |
| INV-009 Memory/Instance separation | CONFIRMED | ⚠️ Schema correct. P0.7 knowledge layer is schema-only — the application still uses person-scoped memory. |
| INV-010 Conversation/Knowledge separation | CONFIRMED | ⚠️ Schema correct (P0.7). Application conflates conversation, memory, and knowledge. |
| INV-011 Knowledge provenance | CONFIRMED | ⚠️ Schema correct (P0.7). Application provenance is inline source_type/source_id only. |
| INV-012 Temporal knowledge | CONFIRMED | ⚠️ Schema correct. Temporal functions exist but are never called from application code. |
| INV-013 Commercial truth | CONFIRMED | ⚠️ Schema correct. Application uses legacy `users` table for subscription state. |
| INV-014 Commercial versioning | CONFIRMED | ⚠️ Schema correct. `commercial_history` trigger exists but is never populated by application code. |
| INV-015 Paid Kira service | CONFIRMED | ✅ Confirmed. Billing system enforces paid model. |
| INV-016 Consultant economics separation | PARTIAL | ⚠️ Schema only. No application code to enforce separation. |
| INV-017 Continuity | CONFIRMED | ⚠️ Schema correct. Application cannot demonstrate continuity because lifecycle management code doesn't exist. |
| INV-018 No implementation-defined semantics | CONFIRMED | ⚠️ Schema correct. Legacy authority retirement incomplete (15+ routes still use `getCurrentAppUser()`). |
| INV-019 Historical preservation | CONFIRMED | ⚠️ Schema correct. `_history` tables exist but are never populated by application writes. |
| INV-020 Organisational subject primacy | CONFIRMED | ⚠️ Schema correct. Application layer has 3 P0 authority violations and 12+ P1 legacy-identity routes. |

---

## 8. P1.1 Completion

P1.1 is complete. The forensic audit reveals:

1. **The canonical model exists in the database but not in the application.**
2. **The application operates against a legacy person-scoped model** while the canonical organisation-scoped model sits alongside it, unused.
3. **The three knowledge layers do not communicate.** Evidence does not become knowledge; knowledge does not become organisational knowledge.
4. **Temporal infrastructure is comprehensive at the schema level but entirely unused by the application.**
5. **Five canonical concepts (Ownership Period, Consultant, Engagement, Kira Instance, Commercial Arrangement) have full schema but zero application logic.**
6. **The instance-independence test fails.** If Kira were replaced tomorrow, organisational knowledge would not survive because it lives in person-scoped tables with no promotion path to org-scoped knowledge.

P1.2 will now trace each canonical concept and invariant through the full application stack — services, API routes, agents, tools, frontend — extending the schema-level baseline established by P0.6.

---

*P1.1 Forensic Current State Map — Complete. No files modified.*
