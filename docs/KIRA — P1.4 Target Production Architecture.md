# KIRA — P1.4 Target Production Architecture

**Status:** IMPLEMENTATION BLUEPRINT
**Purpose:** Define the production architecture Kira must have to implement the frozen canonical model
**Scope:** Complete target architecture — domain, identity, data, authority, knowledge, agent, application, migration, runtime authority, acceptance criteria
**Date:** 26 August 2026
**Prerequisite:** P1.3 COMPLETE (architectural gap/conflict model established)
**Phase Boundary:** Architecture design only. No code changes. P1.4 defines what to build, not how to build it.

---

## 1. Architectural Principle

**Organisation is the centre of gravity.**

Every entity, relationship, knowledge object, and operational action in Kira is scoped to an Organisation. The Organisation persists across changes in people, ownership, consultants, engagements, subscriptions, Kira instances, and commercial arrangements. This is not a design preference — it is the canonical architectural invariant (INV-001, INV-020).

The target architecture does not "repair" the legacy person-scoped model. It replaces it with the canonical organisation-scoped model. The legacy model is a migration source, not a foundation to build on.

---

## 2. Target Domain Architecture

The canonical domain model. Nine first-class concepts, all scoped to Organisation.

---

### 2.1 Entity Relationship

```text
                         ┌──────────────────┐
                         │      Person      │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
               Ownership      Consultant     Introducer
                Period          Role           Role
                    │             │             │
                    └─────────────┼─────────────┘
                                  │
                         ┌────────▼────────┐
                         │   Organisation  │ ◄──── centre of gravity
                         └───────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
         Engagement       Kira Instance        Subscription
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ Commercial Arrangement  │
                    └─────────────────────────┘

                         Organisation
                              │
                              ▼
                Organisational Knowledge
                      Context / Memory
```

### 2.2 Entity Definitions

| Entity | Identity Scope | Temporal? | Provenance? | Lifecycle? |
|--------|---------------|-----------|-------------|------------|
| **Organisation** | `organisation_id` (UUID, PK) | Organisation persists; attributes may change | N/A (is the anchor) | exists → active → dormant → archived |
| **Person** | `person_id` (UUID, PK) | Person persists; attributes may change | N/A (is an entity) | exists → active → inactive |
| **Ownership Period** | `ownership_period_id` (UUID, PK) | Yes — `valid_from`, `valid_to`, `status` | `established_by`, `established_at` | proposed → current → historical |
| **Consultant** | `consultant_id` (UUID, PK) via `consultant_profiles` | Yes — via `consultant_relationships.valid_from/to` | `created_by`, `created_at` | proposed → active → transitioning → offboarded |
| **Engagement** | `engagement_id` (UUID, PK) | Yes — `valid_from`, `valid_to` | `created_by`, `created_at` | proposed → accepted → active → paused → completed → terminated |
| **Kira Instance** | `instance_id` (UUID, PK) | Yes — `valid_from`, `valid_to` | `created_by`, `created_at` | provisioning → active → deprecated → replaced |
| **Subscription** | `subscription_id` (UUID, PK) | Yes — `valid_from`, `valid_to` | `created_by`, `created_at` | trialling → active → past_due → cancelled → expired |
| **Commercial Arrangement** | `arrangement_id` (UUID, PK) | Yes — `valid_from`, `valid_to` | `created_by`, `created_at` | proposed → active → superseded → terminated |
| **Organisational Knowledge** | `knowledge_id` (UUID, PK) | Yes — `effective_from`, `effective_to`, `is_current` | Full provenance chain | asserted → observed → validated → superseded/historical |

### 2.3 Relationship Rules

| Relationship | Nature | Temporal? | Multiple? |
|---|---|---|---|
| Person → Organisation (via Ownership Period) | Ownership | Yes — period-bounded | One person may own multiple orgs over time |
| Person → Organisation (via Consultant relationship) | Advisory | Yes — relationship-bounded | One consultant may advise multiple orgs |
| Person → Organisation (via Membership) | Role | Yes — membership-bounded | One person may hold multiple roles in one org |
| Organisation → Engagement | Bounded work | Yes — engagement-bounded | One org may have multiple engagements |
| Organisation → Kira Instance | Service | Yes — instance-bounded | One org may have multiple instances over time |
| Organisation → Subscription | Commercial | Yes — subscription-bounded | One org may have multiple subscriptions over time |
| Organisation → Commercial Arrangement | Economic | Yes — arrangement-bounded | One org may have multiple arrangements |
| Organisation → Knowledge | Intellectual | Yes — temporal validity | One org has one knowledge base |

---

## 3. Target Identity Architecture

Single identity resolution path. No legacy fallbacks.

---

### 3.1 Identity Resolution Chain

```
Supabase Auth (JWT)
    │
    ▼
auth_credentials (auth_user_id → person_id)
    │
    ▼
persons (person_id → email, name, ...)
    │
    ▼
organisation_memberships (person_id → organisation_id, role, valid_from, valid_to)
    │
    ▼
organisations (organisation_id → canonical organisational identity)
```

**Rules:**
1. Every request resolves through this chain. No exceptions.
2. `getCurrentAppUser()` does not exist in the target architecture.
3. No route accepts `user_id` from the client body.
4. The `users` table carries only authentication identity (`auth_user_id` + minimal session data). All canonical data lives in canonical tables.
5. Organisation membership is the sole source of organisational context.

### 3.2 Role Model

Roles are attributes of `organisation_memberships`, not of `persons`.

| Role | Access Level | Can Own Knowledge? | Can Confirm Facts? | Can Manage Billing? |
|---|---|---|---|---|
| `owner` | Full org access | Yes | Yes | Yes |
| `admin` | Full org access (except billing) | Yes | Yes | No |
| `consultant` | Scoped to their engagements | Yes (within engagement) | Yes (within engagement) | No |
| `employee` | Read-only + limited write | No | No | No |
| `advisor` | Read-only | No | No | No |
| `member` | Read-only | No | No | No |

**Role enforcement:** `currentUserHasRole()` is called in API routes, agent tools, and UI components. No route is accessible without role verification.

### 3.3 Service Identity

Kira agents and tools resolve identity at runtime, not at provisioning time.

```
Agent Tool Request
    │
    ▼
Extract conversation_id from webhook payload
    │
    ▼
Query conversations table → get user_id
    │
    ▼
Resolve user_id → person_id → organisation_id via canonical chain
    │
    ▼
Use organisation_id for all downstream operations
```

**Rule:** Tool URLs do not carry `?uid=user_id`. Identity is resolved per-request from the conversation context.

---

## 4. Target Data Architecture

Decomposed entities. Organisation-scoped. Temporally aware. Historically preserved.

---

### 4.1 Canonical Entity Tables

| Table | PK | Scope Columns | Temporal Columns | History Table |
|---|---|---|---|---|
| `organisations` | `organisation_id` | (is the scope) | `created_at`, `updated_at` | `organisation_history` |
| `persons` | `person_id` | (is an entity) | `created_at`, `updated_at` | `person_history` |
| `ownership_periods` | `ownership_period_id` | `person_id FK`, `organisation_id FK` | `valid_from`, `valid_to`, `status` | (self-auditing) |
| `consultant_profiles` | `consultant_id` | `person_id FK` (nullable) | `created_at`, `updated_at` | `consultant_history` |
| `consultant_relationships` | `relationship_id` | `consultant_id FK`, `organisation_id FK` | `valid_from`, `valid_to`, `status` | `consultant_relationship_history` |
| `engagements` | `engagement_id` | `organisation_id FK` | `valid_from`, `valid_to`, `status` | `engagement_history` |
| `engagement_participants` | `participant_id` | `engagement_id FK`, `person_id FK` | `valid_from`, `valid_to`, `status` | `engagement_participant_history` |
| `kira_instances` | `instance_id` | `organisation_id FK` | `valid_from`, `valid_to`, `status` | `kira_instance_history` |
| `subscriptions` | `subscription_id` | `organisation_id FK` | `valid_from`, `valid_to`, `status` | `subscription_history` |
| `commercial_arrangements` | `arrangement_id` | `organisation_id FK` | `valid_from`, `valid_to`, `status` | `commercial_history` |
| `pricing_tiers` | `tier_id` | (global) | `valid_from`, `valid_to` | `pricing_tier_history` |
| `organisational_knowledge` | `knowledge_id` | `organisation_id FK` | `effective_from`, `effective_to`, `is_current` | `organisational_knowledge_history` |
| `evidence` | `evidence_id` | `organisation_id FK` | `captured_at`, `evidence_date` | (immutable — no update) |
| `knowledge_evidence_links` | `link_id` | `knowledge_id FK`, `evidence_id FK` | `created_at` | (immutable) |

### 4.2 The `users` Table Decomposition

The legacy `users` table is decomposed as follows:

| `users` Column | Target Table | Target Column | Migration Action |
|---|---|---|---|
| `id` | `auth_credentials` | `auth_user_id` | Bridge via `auth_credentials` |
| `email` | `persons` | `email` | Migrate to `persons` |
| `name` | `persons` | `first_name`, `last_name` | Migrate to `persons` |
| `subscription_status` | `subscriptions` | `status` | Migrate to `subscriptions` |
| `stripe_subscription_id` | `subscriptions` | `stripe_subscription_id` | Migrate to `subscriptions` |
| `stripe_customer_id` | `subscriptions` | `stripe_customer_id` | Migrate to `subscriptions` |
| `trial_ends_at` | `subscriptions` | `trial_ends_at` | Migrate to `subscriptions` |
| `organisation_id` | `organisation_memberships` | `organisation_id` | Migrate to memberships |
| `agent_id` | `kira_instances` | `instance_id` | Migrate to `kira_instances` |
| `voice_cost` | `voice_usage` (new) | `cost_usd` | New operational table |
| `created_at` | `persons` | `created_at` | Migrate |
| `updated_at` | `persons` | `updated_at` | Migrate |

**After decomposition:** The `users` table retains only `id` (auth_user_id), `created_at`, and `updated_at`. All canonical data lives in canonical tables.

### 4.3 The Legacy Knowledge Tables

| Legacy Table | Target Table | Migration Action |
|---|---|---|
| `kira_memory` | → `evidence` (raw) + `organisational_knowledge` (promoted) | Promote, don't relabel |
| `genome_entities` | → `organisational_knowledge` (type: `entity`) | Map to canonical knowledge type |
| `genome_facts` | → `organisational_knowledge` (type: `fact`) | Map to canonical knowledge type |
| `genome_relationships` | → `organisational_knowledge` (type: `relationship`) | Map to canonical knowledge type |
| `kira_knowledge` | → `evidence` (document evidence) | Documents become evidence, not knowledge |
| `kira_knowledge_chunks` | → `evidence_chunks` (new) | Chunk store for evidence |
| `conversations` | → `evidence` (conversation evidence) | Conversations become evidence |

### 4.4 Temporal Patterns

Every canonical entity follows the same temporal pattern:

```
valid_from  ──────── active period ──────── valid_to
                   │                              │
                   └──────────────────────────────┘
                      Current state window
```

**Rules:**
1. `valid_from` is set at creation time. `valid_to` is NULL for current records.
2. Ending a relationship sets `valid_to` = NOW() and creates a `_history` record.
3. `is_current` is derived: `valid_to IS NULL OR valid_to > NOW()`.
4. Historical records are never deleted. They are preserved in `_history` tables.
5. Point-in-time queries use `valid_from <= :time AND (valid_to IS NULL OR valid_to > :time)`.

---

## 5. Target Authority/RLS Architecture

Organisation-scoped RLS. No person-scoped RLS. No unprotected tables.

---

### 5.1 RLS Policy Pattern

Every table carrying organisational data uses:

```sql
CREATE POLICY org_membership_access ON table_name
  FOR ALL
  USING (auth_user_has_organisation_access(organisation_id));
```

**No exceptions.** Every table. Every operation.

### 5.2 Table Classification

| Classification | Tables | RLS Pattern |
|---|---|---|
| **Organisation-scoped (FOR ALL)** | All canonical tables, all knowledge tables, all evidence tables, conversations, kira_memory, genome_*, kira_knowledge | `auth_user_has_organisation_access(organisation_id)` |
| **Person-scoped (FOR SELECT only)** | `persons` (own record) | `auth.uid() = auth_user_id` via `auth_credentials` |
| **Global (FOR SELECT only)** | `pricing_tiers`, `organisations` (directory) | Authenticated users only |
| **Admin-only** | Platform admin tables | `isCurrentUserAdmin()` |
| **No RLS (service-role only)** | None in target architecture | All tables must have RLS |

### 5.3 Service-Role Usage

Service-role clients (`createServiceClient()`, `createServiceClientV2()`) are restricted to:

1. **Admin operations** — platform-level administration
2. **Webhook handlers** — external system integration (Stripe, ElevenLabs) where the caller is verified by HMAC signature
3. **Migration scripts** — data migration during deployment
4. **Billing operations** — Stripe integration where cross-tenant access is required

**Rule:** No non-admin, non-webhook route may use service-role clients. All business operations use session-scoped clients with RLS enforcement.

### 5.4 Role-Based Access

```typescript
// Route-level role checks
if (!await currentUserIsOwner()) return forbidden();
if (!await currentUserHasRole('admin')) return forbidden();
if (!await currentUserHasRole('consultant')) return forbidden();

// Tool-level role checks
const context = await getCurrentOrganisationContext();
if (context.role !== 'owner' && context.role !== 'admin') return denied();

// UI-level role checks
const { role } = await getCurrentOrganisationContext();
const canManageBilling = role === 'owner';
const canConfirmFacts = ['owner', 'admin', 'consultant'].includes(role);
```

---

## 6. Target Knowledge Architecture

Evidence → interpretation → governed organisational knowledge. Full provenance. Temporal validity.

---

### 6.1 Knowledge Lifecycle

```
Human interaction
    │
    ▼
Evidence (raw source)
    │   evidence table
    │   organisation_id, evidence_type, source_ref
    │   captured_by, captured_at, evidence_date
    │
    ▼
Interpretation (extraction)
    │   LLM extraction from evidence
    │   Candidate knowledge objects
    │   Provenance attached: source evidence, person, engagement
    │
    ▼
Governance (validation)
    │   Validation, deduplication, conflict resolution
    │   Confidence scoring
    │   Epistemic state assignment
    │
    ▼
Organisational Knowledge (governed)
    │   organisational_knowledge table
    │   organisation_id (org-scoped)
    │   effective_from/to, is_current (temporal)
    │   Full provenance chain
    │
    ▼
Retrieval / Use
    │   Temporal queries ("as of" date)
    │   Provenance queries ("who said this?")
    │   Conflict queries ("what contradicts this?")
    │   Supersession chains ("what replaced this?")
```

### 6.2 Knowledge Types

| Type | Description | Example |
|---|---|---|
| `fact` | Verified organisational fact | "Revenue is $2.4M AUD" |
| `belief` | Held belief about the organisation | "The board prefers conservative growth" |
| `decision` | Organisational decision | "Decided to acquire Company X" |
| `relationship` | Organisational relationship | "Supplier to Company Y" |
| `capability` | Organisational capability | "Has ISO 27001 certification" |
| `constraint` | Organisational constraint | "Cannot operate in Victoria" |
| `preference` | Organisational preference | "Prefers email over phone" |
| `process` | Business process knowledge | "AP requires dual sign-off >$10k" |
| `risk` | Known organisational risk | "Key person dependency in finance" |
| `opportunity` | Identified opportunity | "Expansion into NZ market feasible" |
| `lesson` | Learning from experience | "Q3 project overran due to scope creep" |

### 6.3 Provenance Chain

Every knowledge object answers:

| Question | Field | Source |
|---|---|---|
| Who provided this? | `supplied_by` → `persons.person_id` | Person who said it |
| When was it provided? | `supplied_at` | When it was said |
| In what context? | `engagement_id` → `engagements.engagement_id` | Professional context |
| Was it directly observed? | `epistemic_state = 'observed'` | Direct evidence |
| Was it inferred? | `epistemic_state = 'inferred'` | Derived knowledge |
| Was it confirmed? | `validated_by`, `validated_at` | Validation chain |
| Has it been contradicted? | `superseded_by`, `supersession_reason` | Resolution chain |
| Why does Kira believe it? | `epistemic_state` + `confidence` | Epistemic justification |
| What engagement produced it? | `engagement_id` | Professional context |
| What ownership period? | `ownership_period_id` | Historical context |
| What evidence supports it? | `knowledge_evidence_links` | Multi-evidence provenance |
| What knowledge was it derived from? | `derived_from_ids` | Knowledge derivation chain |

### 6.4 Epistemic States

```
asserted → observed → validated → current
                │           │
                ▼           ▼
            disputed    superseded → historical
                │
                ▼
            contradicted
```

### 6.5 Temporal Knowledge Queries

```sql
-- What does the organisation know about X right now?
SELECT * FROM get_current_knowledge(:org_id, :type);

-- What was believed on 1 January 2025?
SELECT * FROM get_knowledge_at_point_in_time(:org_id, '2025-01-01');

-- What is the history of this knowledge item?
SELECT * FROM get_knowledge_history(:org_id, :subject, :predicate, :type);

-- What knowledge conflicts with this?
SELECT * FROM get_conflicting_knowledge(:org_id);
```

---

## 7. Target Agent Architecture

Agents resolve identity at runtime. Agents operate under organisational authority. Agents produce evidence, not knowledge.

---

### 7.1 Agent Identity Model

```
ElevenLabs Agent
    │
    ▼
Conversation Start
    │
    ▼
resolveSession (lib/kira/convai.ts)
    │   Query: kira_agents WHERE elevenlabs_agent_id = :agent_id
    │   Get: user_id
    │
    ▼
Canonical Identity Resolution
    │   user_id → auth_credentials → persons → organisation_memberships → organisations
    │
    ▼
OrganisationContext
    │   { organisationId, personId, membershipId, role }
    │
    ▼
All downstream operations use organisationId
```

**Rule:** The agent resolves organisation context per-conversation, not per-provisioning. If the user's membership changes, the next conversation resolves to the new organisation.

### 7.2 Agent Tool Access

| Tool | Reads | Writes | Identity Source | Org-Scoped? |
|---|---|---|---|---|
| `recall_memory` | `organisational_knowledge` | — | Conversation context | Yes |
| `save_memory` | — | `evidence` (conversation) | Conversation context | Yes |
| `search_knowledge` | `organisational_knowledge` | — | Conversation context | Yes |
| `area_agenda` | `organisational_knowledge` | — | Conversation context | Yes |
| `facts_to_confirm` | `organisational_knowledge` | — | Conversation context | Yes |
| `confirm_fact` | — | `organisational_knowledge` | Conversation context | Yes |
| `get_conversation_context` | `conversations`, `conversation_messages` | — | Conversation context | Yes |
| `dispatch` | — | `kira_tasks` | Conversation context | Yes |
| `check_tasks` | `kira_tasks` | — | Conversation context | Yes |
| `search_drive` | External (Google) | — | Conversation context | N/A |
| `read_document` | `evidence` | — | Conversation context | Yes |
| `keep_document` | — | `evidence` | Conversation context | Yes |
| `lookup_contact` | `organisational_knowledge` | — | Conversation context | Yes |
| `record_refusal` | — | `evidence` | Conversation context | Yes |
| `file_manual` | — | `evidence` | Conversation context | Yes |
| `research_organisation` | External + `evidence` | `evidence` | Conversation context | Yes |

### 7.3 Agent Knowledge Production

Agents produce **evidence**, not knowledge. The governed promotion pipeline produces knowledge.

```
Agent produces evidence during conversation
    │
    ▼
Evidence written to `evidence` table
    │   organisation_id (from conversation context)
    │   evidence_type = 'conversation'
    │   source_ref = conversation_id
    │   captured_by = person_id
    │   captured_at = NOW()
    │
    ▼
Post-call pipeline promotes evidence → knowledge
    │   LLM extraction: evidence → candidate knowledge objects
    │   Governance: validation, deduplication, conflict resolution
    │   Promotion: candidate → organisational_knowledge
    │
    ▼
Organisational Knowledge
    │   organisation_id (org-scoped)
    │   effective_from/to (temporal)
    │   Full provenance chain (links back to evidence)
```

**Rule:** Agents never write directly to `organisational_knowledge`. The promotion pipeline is the only path from evidence to governed knowledge.

---

## 8. Target Application Architecture

Domain services, repositories, API routes, and a legacy compatibility layer during migration.

---

### 8.1 Service Layer Structure

```
lib/
├── auth.ts                          # Identity resolution (single canonical path)
├── supabase/
│   ├── server.ts                    # Session-scoped client only (no service role for business ops)
│   └── browser.ts                   # Browser client
├── domain/
│   ├── organisation/
│   │   ├── repository.ts            # Organisation CRUD
│   │   └── service.ts               # Organisation business logic
│   ├── person/
│   │   ├── repository.ts
│   │   └── service.ts
│   ├── ownership-period/
│   │   ├── repository.ts
│   │   └── service.ts
│   ├── consultant/
│   │   ├── repository.ts
│   │   └── service.ts
│   ├── engagement/
│   │   ├── repository.ts
│   │   └── service.ts
│   ├── kira-instance/
│   │   ├── repository.ts
│   │   └── service.ts
│   ├── subscription/
│   │   ├── repository.ts
│   │   └── service.ts
│   ├── commercial-arrangement/
│   │   ├── repository.ts
│   │   └── service.ts
│   └── knowledge/
│       ├── repository.ts            # Organisational knowledge CRUD
│       ├── evidence-repository.ts   # Evidence CRUD
│       ├── promotion-pipeline.ts    # Evidence → knowledge promotion
│       ├── temporal-queries.ts      # Point-in-time, history, supersession
│       └── provenance.ts            # Provenance chain queries
├── billing/                         # Billing engine (migrated to canonical tables)
├── introducer/                      # Introducer channel (unchanged)
└── kira/                            # Agent tools (migrated to canonical identity)
```

### 8.2 API Route Structure

```
app/api/
├── kira/
│   ├── chat/
│   │   ├── start/route.ts           # Canonical identity
│   │   ├── text/route.ts            # Canonical identity
│   │   └── history/route.ts         # Canonical identity
│   ├── knowledge/
│   │   ├── upload/route.ts          # Canonical identity, writes to evidence
│   │   ├── url/route.ts             # Canonical identity, writes to evidence
│   │   └── [id]/route.ts            # Canonical identity
│   ├── create/route.ts              # Canonical identity
│   ├── agent/route.ts               # Canonical identity
│   └── discovery/
│       └── ingest/route.ts          # Canonical identity
├── organisation/
│   ├── [id]/route.ts                # Organisation CRUD
│   ├── ownership/route.ts           # Ownership period management
│   └── members/route.ts             # Membership management
├── consultant/
│   ├── profile/route.ts             # Consultant profile management
│   └── relationship/route.ts        # Consultant relationship management
├── engagement/
│   ├── [id]/route.ts                # Engagement CRUD
│   └── participants/route.ts        # Engagement participant management
├── subscription/
│   ├── [id]/route.ts                # Subscription CRUD
│   └── history/route.ts             # Subscription history
├── billing/                         # Migrated to canonical subscription tables
├── knowledge/
│   ├── temporal/route.ts            # Temporal knowledge queries
│   └── provenance/route.ts          # Provenance queries
└── admin/                           # Platform admin (admin-only)
```

### 8.3 Legacy Compatibility Layer

During migration, a compatibility layer bridges legacy and canonical:

```typescript
// lib/compat/bridge.ts
// Temporary bridge: resolves the same identity through both paths
// and verifies they produce the same result.
// Removed once legacy path is fully retired.

export async function verifyIdentityBridge(): Promise<{
  legacy: { userId: string };
  canonical: { organisationId: string; personId: string; role: string };
  consistent: boolean;
}> {
  const legacy = await getCurrentAppUser();
  const canonical = await getCurrentOrganisationContext();
  return {
    legacy: { userId: legacy?.id ?? '' },
    canonical: {
      organisationId: canonical?.organisationId ?? '',
      personId: canonical?.personId ?? '',
      role: canonical?.role ?? '',
    },
    consistent: legacy?.id === canonical?.personId, // Bridge verification
  };
}
```

**Rule:** The compatibility layer exists only during migration. It is removed once all routes use canonical identity.

---

## 9. Migration Architecture

What gets rebuilt, migrated, deprecated, and bridged. Migration order follows the P1.3 dependency graph.

---

### 9.1 Migration Levels

**Level 0 — Security Foundation (immediate)**

| Change | Action | Risk | Rollback |
|---|---|---|---|
| A-001: `/api/kira/research` auth fix | Add session check + canonical identity | Low — adds security | Remove auth check |
| A-002: `/api/kira/email/send-kira-ready` auth fix | Add session check + canonical identity | Low — adds security | Remove auth check |
| C-012: Add RLS to P0.5 Step 5 tables | Apply `auth_user_has_organisation_access()` | Low — adds protection | Drop policies |
| A-006: Fix `proxy.ts` export name | Rename `proxy` → `middleware` | Low — activates existing logic | Revert name |

**Level 1 — Identity (after Level 0)**

| Change | Action | Risk | Rollback |
|---|---|---|---|
| C-001: Users table decomposition | Migrate columns to canonical tables | HIGH — touches all routes | Restore `users` columns |
| C-005: Retire `getCurrentAppUser()` | Replace all 15+ call sites with `getCurrentOrganisationContext()` | HIGH — touches all routes | Restore legacy calls |
| C-013: Legacy RLS migration | Replace `auth.uid() = user_id` with `auth_user_has_organisation_access()` | MEDIUM — changes access patterns | Restore old policies |
| R-008: Complete users decomposition | Remove decomposed columns from `users` | HIGH — irreversible | Re-add columns |

**Level 2 — Knowledge (after Level 1)**

| Change | Action | Risk | Rollback |
|---|---|---|---|
| C-002: Org-scoped knowledge | Build knowledge repository, wire post-call pipeline | HIGH — core product change | Keep legacy knowledge path |
| C-003: Evidence/knowledge separation | Build evidence capture layer, promotion pipeline | HIGH — new architectural layer | Remove evidence layer |
| C-004: Temporal integration | Wire temporal SQL functions into service layer | MEDIUM — adds capability | Remove temporal calls |

**Level 3 — Lifecycle (after Level 1 + 2)**

| Change | Action | Risk | Rollback |
|---|---|---|---|
| C-006: Five absent concepts | Build repository/service/API for each | HIGH — new functionality | Remove new code |
| C-009: Consultant/engagement lifecycle | Build full lifecycle management | HIGH — new functionality | Remove new code |
| C-008: Subscription migration | Rewire billing to canonical `subscriptions` table | HIGH — billing critical | Rewire back to `users` |
| C-011: Commercial arrangement management | Build commercial arrangement CRUD | MEDIUM — new functionality | Remove new code |

**Level 4 — Agent (after Level 2)**

| Change | Action | Risk | Rollback |
|---|---|---|---|
| C-007: Runtime identity in tools | Modify tool webhooks to resolve identity per-request | MEDIUM — changes tool behavior | Restore baked identity |
| C-010: Role-based access in tools | Add role checks to tool handlers | LOW — adds authorization | Remove role checks |

**Level 5 — UI (after all above)**

| Change | Action | Risk | Rollback |
|---|---|---|---|
| D-014: Page component migration | Replace `getCurrentAppUser()` with `getCurrentOrganisationContext()` in all pages | MEDIUM — touches all pages | Restore legacy calls |
| Org-scoped data display | Show organisation-level views instead of person-level | MEDIUM — changes user experience | Revert to person-level |
| Role-based UI | Show different views based on role | LOW — adds capability | Remove role checks |

### 9.2 Migration Safety Rules

1. **No irreversible changes without a rollback path.** Every migration must have a documented rollback.
2. **No data deletion during migration.** Legacy data is deprecated, not deleted.
3. **Bridge period during identity migration.** Both identity paths run in parallel with verification logging. Legacy path is retired only when verification confirms 100% consistency.
4. **Knowledge migration is additive.** Existing knowledge is promoted (not moved) to the new structure. Legacy tables remain readable during the transition.
5. **Billing migration is the highest-risk step.** It must be tested against Stripe in staging before production. Rollback must be possible within the Stripe billing cycle.

### 9.3 Rollback Strategy

Each level has an independent rollback:

| Level | Rollback Mechanism | Recovery Time |
|---|---|---|
| Level 0 | Revert individual changes | Immediate |
| Level 1 | Restore `users` columns, re-enable `getCurrentAppUser()` | Minutes (code revert) |
| Level 2 | Remove evidence layer, keep legacy knowledge path | Minutes (code revert) |
| Level 3 | Remove new lifecycle code, rewire billing to `users` | Hours (code revert + data verification) |
| Level 4 | Restore baked tool identity | Minutes (code revert + reprovision tools) |
| Level 5 | Restore legacy page components | Minutes (code revert) |

---

## 10. Runtime Authority Paths

The target authority model for every request type.

---

### 10.1 Authenticated API Request

```
Client Request (JWT in session cookie)
    │
    ▼
Next.js Middleware (proxy.ts → middleware)
    │   Route segregation: USER_PROTECTED / ADMIN / INTRODUCER
    │   Session refresh
    │
    ▼
Route Handler
    │
    ▼
Authentication: supabase.auth.getUser()
    │   Verifies JWT, extracts auth_user_id
    │
    ▼
Identity Resolution: getCurrentOrganisationContext()
    │   auth_user_id → auth_credentials → persons → organisation_memberships → organisations
    │   Returns: { organisationId, personId, membershipId, role, validFrom, validTo }
    │
    ▼
Role Check: currentUserHasRole(requiredRole)
    │   Checks membership.role against required role
    │   Returns: boolean
    │
    ▼
Domain Operation (session-scoped Supabase client)
    │   All queries use organisation_id for scoping
    │   RLS enforced via auth_user_has_organisation_access(organisation_id)
    │
    ▼
Persistence (canonical tables, org-scoped)
```

### 10.2 Agent Tool Request

```
ElevenLabs Agent
    │
    ▼
Tool Webhook (HMAC-verified)
    │   toolSecretOk(req) — shared-secret guard
    │
    ▼
Identity Resolution (per-request)
    │   Extract conversation_id from payload
    │   Query conversations → get user_id
    │   Resolve user_id → person_id → organisation_id via canonical chain
    │
    ▼
Domain Operation (session-scoped or service-role for agent ops)
    │   All queries use organisation_id for scoping
    │
    ▼
Persistence (canonical tables, org-scoped)
```

### 10.3 Post-Call Pipeline

```
ElevenLabs Post-Call Webhook (HMAC-verified)
    │
    ▼
Identity Resolution
    │   Query conversations → get user_id
    │   Resolve user_id → person_id → organisation_id via canonical chain
    │
    ▼
Evidence Capture
    │   Write conversation transcript to `evidence` table
    │   organisation_id, evidence_type = 'conversation'
    │
    ▼
Memory Extraction (person-scoped, transient)
    │   Extract facts from conversation
    │   Write to temporary working memory
    │
    ▼
Knowledge Promotion Pipeline
    │   LLM extraction: evidence → candidate knowledge objects
    │   Governance: validation, deduplication, conflict resolution
    │   Promotion: candidate → `organisational_knowledge`
    │   organisation_id (org-scoped)
    │   Full provenance chain attached
    │
    ▼
Temporal State
    │   effective_from = NOW()
    │   effective_to = NULL (current)
    │   is_current = TRUE (derived)
    │
    ▼
Persistence (canonical tables, org-scoped)
```

### 10.4 Webhook Request (Stripe, ElevenLabs)

```
External Webhook (HMAC/签名 verified)
    │
    ▼
Route Handler
    │   Verify webhook signature
    │   Extract entity reference (e.g., stripe_subscription_id)
    │
    ▼
Identity Resolution (from entity, not from session)
    │   Query canonical table by entity reference
    │   Resolve to organisation_id
    │
    ▼
Domain Operation (service-role for cross-tenant webhook operations)
    │   Update canonical table
    │   Write to _history table
    │
    ▼
Persistence (canonical tables, org-scoped)
```

---

## 11. Architecture Acceptance Criteria

Explicit tests demonstrating that the production architecture satisfies the 20 canonical invariants.

---

### 11.1 INV-001 — Organisation Persistence

**Test:** Create an organisation. Add members. Change ownership. Change consultants. Replace the Kira instance. Verify the organisation record and all its knowledge remain intact.

**Pass criteria:** Organisation record unchanged. Knowledge count unchanged. Historical records preserved.

---

### 11.2 INV-002 — Person/Role Separation

**Test:** Create a person. Assign them as owner of Org A, consultant to Org B, and employee of Org C. Verify each role is independently represented and does not affect the person's identity.

**Pass criteria:** Three distinct membership records. Person identity unchanged across all three.

---

### 11.3 INV-003 — Ownership Temporalisation

**Test:** Create an ownership period (2020-2024). Create a second ownership period (2024-present). Query ownership as of 2022. Query ownership as of 2025. Verify correct owner for each point in time.

**Pass criteria:** Point-in-time queries return the correct owner. Both periods are preserved.

---

### 11.4 INV-004 — Consultant First-Class Status

**Test:** Create a consultant profile. Create a consultant relationship with Org A. Create an engagement. End the relationship. Verify consultant history is preserved and the consultant can be assigned to Org B.

**Pass criteria:** Consultant profile persists. History preserved. New relationship created without data loss.

---

### 11.5 INV-005 — Engagement First-Class Status

**Test:** Create an engagement. Add participants. Progress through states (proposed → active → completed). Verify engagement history and participant history are preserved.

**Pass criteria:** All state transitions recorded. History preserved. Participants have temporal records.

---

### 11.6 INV-006 — Consultant/Introducer Separation

**Test:** Create a person as both consultant to Org A and introducer of Org B. Verify the two relationships are structurally independent. Verify consultant access does not grant introducer access and vice versa.

**Pass criteria:** Two independent records. Different access patterns. No cross-contamination.

---

### 11.7 INV-007 — Engagement/Subscription Separation

**Test:** Create an engagement. Create a subscription. End the subscription. Verify the engagement persists independently.

**Pass criteria:** Engagement unaffected by subscription change. No FK between tables.

---

### 11.8 INV-008 — Kira/Organisation Separation

**Test:** Create a Kira instance for Org A. Create knowledge via that instance. Replace the instance with a new one. Verify all knowledge persists and is accessible via the new instance.

**Pass criteria:** All knowledge records unchanged. New instance can access all historical knowledge.

---

### 11.9 INV-009 — Memory/Instance Separation

**Test:** Create knowledge via Instance A. Replace Instance A with Instance B. Query all knowledge for the organisation. Verify all knowledge is present and correctly attributed.

**Pass criteria:** All knowledge present. Instance attribution preserved in history. New instance can query all knowledge.

---

### 11.10 INV-010 — Conversation/Knowledge Separation

**Test:** Have a conversation. Verify the conversation is recorded as evidence. Promote evidence to governed knowledge. Verify the evidence and knowledge are separate records with a link between them.

**Pass criteria:** Evidence table has conversation record. Knowledge table has promoted record. Link exists between them.

---

### 11.11 INV-011 — Knowledge Provenance

**Test:** Create knowledge via a conversation. Verify the knowledge record has: supplied_by (person), captured_at (timestamp), engagement_id (context), epistemic_state (assertion type), evidence_id (source).

**Pass criteria:** All provenance fields populated. Provenance view returns complete chain.

---

### 11.12 INV-012 — Temporal Knowledge

**Test:** Create knowledge effective from 1 Jan 2025. Supersede it on 1 Jul 2025 with new knowledge. Query knowledge as of 1 Mar 2025. Query knowledge as of 1 Sep 2025. Verify correct knowledge for each date.

**Pass criteria:** Point-in-time queries return correct knowledge. Supersession chain preserved.

---

### 11.13 INV-013 — Commercial Truth

**Test:** Create a commercial arrangement with specific terms. Verify the terms are stored accurately. Query the arrangement. Verify the terms match what was stored.

**Pass criteria:** Commercial terms stored and retrievable. No approximation or loss.

---

### 11.14 INV-014 — Commercial Versioning

**Test:** Create a commercial arrangement. Change terms. Verify the original terms are preserved in history. Verify current terms reflect the change.

**Pass criteria:** History table has original terms. Current record has new terms. Both recoverable.

---

### 11.15 INV-015 — Paid Kira Service

**Test:** Create a subscription. Verify billing enforcement. Cancel the subscription. Verify access is revoked. Verify the cancellation is recorded.

**Pass criteria:** Billing enforced. Access revoked on cancellation. History preserved.

---

### 11.16 INV-016 — Consultant Economics Separation

**Test:** Create a consultant fee arrangement and a Kira subscription for the same organisation. Verify they are structurally independent. Verify changes to one do not affect the other.

**Pass criteria:** Two independent commercial arrangements. Changes isolated.

---

### 11.17 INV-017 — Continuity

**Test:** Create an organisation with knowledge, consultants, and engagements. Replace the consultant. Replace the Kira instance. Change ownership. Verify all knowledge, history, and relationships persist.

**Pass criteria:** All data preserved across all transitions. No knowledge loss.

---

### 11.18 INV-018 — No Implementation-Defined Semantics

**Test:** Verify no table uses `users.id` as a foreign key for organisational data. Verify no route accepts `user_id` from the client body. Verify all identity resolution goes through the canonical chain.

**Pass criteria:** Zero instances of implementation-defined semantics. All identity resolution is canonical.

---

### 11.19 INV-019 — Historical Preservation

**Test:** Create entities. Modify them. Delete the current version. Verify all historical records are preserved in `_history` tables. Verify point-in-time queries return historical data.

**Pass criteria:** History tables populated. Historical data recoverable. No data loss on modification.

---

### 11.20 INV-020 — Organisational Subject Primacy

**Test:** Create knowledge, tasks, conversations, and documents for an organisation. Replace the person who created them. Verify all data remains accessible under the organisation.

**Pass criteria:** All data persists under the organisation. Person change does not affect data accessibility.

---

## 12. P1 Completion Criteria

P1 is complete when all four artifacts exist and are reviewed:

| Artifact | Status | Document |
|---|---|---|
| P1.1 | COMPLETE | `KIRA — P1.1 Current-State Architecture Map.md` |
| P1.2 | COMPLETE | `KIRA — P1.2 Full-Stack Traceability Matrix.md` |
| P1.3 | COMPLETE | `KIRA — P1.3 Architectural Gap and Conflict Model.md` |
| P1.4 | COMPLETE | `KIRA — P1.4 Target Production Architecture.md` |

**P1 is now complete.**

The four documents together establish:
1. What exists (P1.1)
2. How it behaves and where it breaks (P1.2)
3. What conflicts must be resolved (P1.3)
4. What must be built (P1.4)

**P2 — Build.** The implementation blueprint is established. An engineer can now look at P1.4 and say: "I know what Kira's production architecture is supposed to be, what the authority boundaries are, what gets migrated, and in what order."

---

## 13. Phase Boundary Summary

| Phase | Purpose | Status |
|-------|---------|--------|
| **P0** | Define what Kira must preserve (canonical organisational reality) | **CLOSED** |
| **P1.1** | Forensic current-state map — what exists | **CLOSED** |
| **P1.2** | Full-stack traceability — how it behaves, where it breaks | **CLOSED** |
| **P1.3** | Architectural gap/conflict model — what conflicts exist | **CLOSED** |
| **P1.4** | Target production architecture — what must be built | **CLOSED** |
| **P2** | Build the target architecture | **READY TO BEGIN** |

P0 defined what Kira means.
P1 discovered what Kira has and what Kira needs.
P2 builds what Kira must become.

---

*P1.4 Target Production Architecture — Complete. No files modified.*
