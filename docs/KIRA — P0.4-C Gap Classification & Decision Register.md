# KIRA — P0.4-C Gap Classification & Decision Register

**Status:** Architectural Decision Register
**Purpose:** Turn P0.4-B forensic findings into explicit architectural decisions
**Scope:** Gap classification, root-cause mapping, target-state decisions, retirement register, dependency order
**Prerequisite:** P0.4-B (Implementation Traceability Matrix)
**Date:** 26 August 2026

---

## 1. Purpose

This artifact is the point where Kira formally moves from forensic discovery into architectural remediation. It answers:

> **For every gap identified in P0.4-B, what is the architectural decision?**

This is NOT a second traceability exercise. It is a decision register. Every conflicting, partial, and missing concept receives an explicit classification and a binding architectural decision.

The governing principle is:

> **The canonical model is the authority. If the code says one thing and the canonical model says another, we do not change the canonical model to make the code look correct.**

---

## 2. Classification Buckets

| Bucket | Definition | Action |
|--------|-----------|--------|
| **Migrate** | Existing structure is semantically salvageable. Data can be transformed. | Transform data, retain under new authority. |
| **Introduce** | Canonical concept has no adequate implementation. New first-class structure required. | Create new structure from scratch. |
| **Refactor/Rebind** | Existing structure contains useful data but semantic meaning is wrong. | Retain data, change authority and relationships. |
| **Retire** | Existing structure fundamentally encodes the wrong ontology. | Deprecate, do not use as canonical authority. |

---

## 3. Root-Cause Map

The P0.4-B traceability matrix identified 18 conflicting, 7 partial, and 5 missing concepts. But these are not 30 independent problems. They are symptoms of a single root cause.

```
users.id SEMANTIC OVERLOAD (Root Cause)
        │
        ├── Organisation identity conflict (INV-001)
        │       └── Organisation cannot persist independently
        │
        ├── Person identity conflict (INV-002)
        │       └── Person cannot exist without Organisation membership
        │
        ├── Tenant isolation conflict (INV-006)
        │       └── Knowledge scoped to Person, not Organisation
        │
        ├── Membership conflict
        │       └── No temporal membership, no roles, no multi-membership
        │
        ├── RLS conflict
        │       └── Genome tables have USING (true), no tenant isolation
        │
        └── Knowledge ownership conflict
                └── All knowledge tables FK to user_id, not organisation_id
```

Every downstream symptom traces to this root cause. Fixing `users.id` semantic overload is the single highest-leverage architectural decision.

---

## 4. Gap Decision Register

### 4.1 Root Architectural Decision: users.id Semantic Overload

| Field | Detail |
|-------|--------|
| **Gap** | `users.id` simultaneously represents Person identity, Organisation identity, Tenant isolation key, Auth credential link, and Membership key |
| **Current State** | Five incompatible semantic roles collapsed into one UUID |
| **Canonical Requirement** | Organisation, Person, Auth, Membership, and Tenant isolation are independent concepts |
| **Classification** | **Refactor/Rebind** |
| **Decision** | `users.id` will be rebinding to `persons.id`. Organisation identity will be extracted to a new `organisations.id`. Tenant isolation will move to `organisation_id`. Auth linkage will remain on `users.auth_user_id` but will reference `persons.id`. Membership will be a new junction table. |
| **Migration Impact** | Every knowledge table FK changes from `user_id → users.id` to `organisation_id → organisations.id`. API routes change from `auth.uid() → users.id` to `auth.uid() → persons.id → organisation_id`. |
| **Retirement Condition** | `users.id` as the authoritative tenant key is retired when all RLS policies use `organisation_id` and all API routes resolve `organisation_id` from the authenticated user. |

### 4.2 Organisation Identity

| Field | Detail |
|-------|--------|
| **Gap** | No `organisations` table. Organisation identity is conflated with Person identity via `users.id`. |
| **Current State** | `users.id` IS the organisation. `business_identity` is a 1:1 extension. |
| **Canonical Requirement** | Independent Organisation entity with lifecycle, temporal ownership, and organisational knowledge ownership. |
| **Classification** | **Introduce** |
| **Decision** | Create `organisations` table. Backfill from `users` + `business_identity`. `organisations.id` initially equals `users.id` (migration convenience, not semantic identity). |
| **Migration Impact** | Every knowledge table gains `organisation_id` FK. RLS policies change to use `organisation_id`. API routes resolve `organisation_id` from authenticated user. |
| **Retirement Condition** | `users.id` as Organisation identity is retired when `organisations.id` is the sole authority for tenant isolation and knowledge ownership. |

### 4.3 Person Identity

| Field | Detail |
|-------|--------|
| **Gap** | No `persons` table. Person identity is conflated with Organisation identity via `users.id`. |
| **Current State** | `users.id` IS the person. `users.email`, `users.first_name`, `users.last_name` are Person attributes. |
| **Canonical Requirement** | Independent Person entity with identity independent of Organisation membership. |
| **Classification** | **Refactor/Rebind** |
| **Decision** | Create `persons` table. Backfill from `users`. `persons.id` initially equals `users.id` (migration convenience). Person identity becomes independent of Organisation membership. |
| **Migration Impact** | `users.auth_user_id` references `persons.id` instead of `users.id`. Auth credential linked to Person, not Organisation. |
| **Retirement Condition** | `users.id` as Person identity is retired when `persons.id` is the sole authority for Person identity and all application code references `persons.id`. |

### 4.4 Organisation Membership

| Field | Detail |
|-------|--------|
| **Gap** | No membership table. Membership is implied by `users` → `business_identity` (1:1). No temporal scope, no roles, no multi-membership. |
| **Current State** | `business_identity` is a 1:1 extension of `users`. No temporal columns. No role concept. |
| **Canonical Requirement** | Temporal membership junction table with roles (owner, consultant, employee, advisor, admin). |
| **Classification** | **Introduce** |
| **Decision** | Create `organisation_memberships` junction table. Backfill from `users` + `business_identity`. Role derived from context (owner for business users, admin for admin users). |
| **Migration Impact** | Multi-membership becomes possible. Temporal membership becomes possible. Role-based access becomes possible. |
| **Retirement Condition** | `business_identity` as the sole membership indicator is retired when `organisation_memberships` is the authority for Person ↔ Organisation relationships. |

### 4.5 Ownership Period

| Field | Detail |
|-------|--------|
| **Gap** | No ownership period concept. `business_identity.owner_name TEXT` is the only ownership indicator. No temporal scope. |
| **Current State** | `owner_name` is a text field. No temporal ownership. No historical ownership. |
| **Canonical Requirement** | Temporal ownership period entity with start/end, transition context, and historical preservation. |
| **Classification** | **Introduce** |
| **Decision** | Create `ownership_periods` table. Backfill from `business_identity.owner_name`. Current owner gets `status = 'current'`. Historical ownership is not reconstructable from existing data. |
| **Migration Impact** | Ownership becomes temporal. Ownership change no longer destroys Organisation identity. |
| **Retirement Condition** | `business_identity.owner_name` as the sole ownership indicator is retired when `ownership_periods` is the authority for ownership. |

### 4.6 Consultant

| Field | Detail |
|-------|--------|
| **Gap** | No Consultant entity. Only `introducers` (referral attribution). |
| **Current State** | `introducers` table exists as referral attribution. No Consultant concept. |
| **Canonical Requirement** | Consultant as role within Organisation Membership, participating in Engagements. |
| **Classification** | **Introduce** |
| **Decision** | Consultant will be a role within `organisation_memberships` (role = 'consultant'). No separate `consultants` table required. Consultant participation in Engagements is captured via `engagement_participants`. |
| **Migration Impact** | Consultant relationships become temporal. Consultant replacement no longer destroys knowledge. |
| **Retirement Condition** | N/A — Consultant concept is new. `introducers` remains as referral attribution (separate concern). |

### 4.7 Engagement

| Field | Detail |
|-------|--------|
| **Gap** | No Engagement entity. `introductions` is referral attribution, not bounded intervention. |
| **Current State** | `introductions` table has financial projection fields. No Engagement concept. |
| **Canonical Requirement** | Bounded intervention with purpose, scope, participants, temporal boundaries, causal chain. |
| **Classification** | **Introduce** |
| **Decision** | Create `engagements` table. Create `engagement_participants` junction table. `introductions` remains as referral attribution (separate concern). |
| **Migration Impact** | Bounded interventions become first-class. Knowledge produced during Engagements is attributed to Organisation, not Engagement. |
| **Retirement Condition** | N/A — Engagement concept is new. `introductions` remains as referral attribution. |

### 4.8 Kira Instance

| Field | Detail |
|-------|--------|
| **Gap** | `kira_agents` table exists but is coupled to `user_id`. Agent = Kira Instance but cannot be independently replaced. |
| **Current State** | `kira_agents.user_id` FK to `users.id`. Agent lifecycle management exists. |
| **Canonical Requirement** | Kira Instance entity independent of Organisation. Multiple historical instances per Organisation. |
| **Classification** | **Refactor/Rebind** |
| **Decision** | `kira_agents` will be rebinding to `organisations.id` instead of `users.id`. Agent lifecycle management continues. Multiple historical instances per Organisation are supported. |
| **Migration Impact** | Kira Instance becomes independent of Person identity. Agent replacement no longer affects Person identity. |
| **Retirement Condition** | `kira_agents.user_id` as the sole FK is retired when `kira_agents.organisation_id` is the authority. |

### 4.9 Subscription

| Field | Detail |
|-------|--------|
| **Gap** | `users.subscription_status`, `users.stripe_*` are on the `users` table. Subscription conflated with Person identity. |
| **Current State** | Subscription state on `users` table. Stripe integration exists. |
| **Canonical Requirement** | Independent Subscription entity with lifecycle, history, and Organisation linkage. |
| **Classification** | **Refactor/Rebind** |
| **Decision** | Create `subscriptions` table. Backfill from `users.subscription_status`. Subscription becomes independent of Person identity. |
| **Migration Impact** | Subscription lifecycle becomes independent. Subscription history is preserved. |
| **Retirement Condition** | `users.subscription_status` as the sole authority is retired when `subscriptions` is the authority. |

### 4.10 Commercial Arrangement

| Field | Detail |
|-------|--------|
| **Gap** | No Commercial Arrangement entity. Pricing is hardcoded in `lib/valuation/pricing.ts`. |
| **Current State** | Pricing logic in code. No data-driven commercial terms. |
| **Canonical Requirement** | Versioned, temporal Commercial Arrangement entity with pricing terms. |
| **Classification** | **Introduce** |
| **Decision** | Create `commercial_arrangements` table. Initial data derived from `lib/valuation/pricing.ts`. Pricing becomes data-driven. |
| **Migration Impact** | Commercial terms become versionable. Pricing changes become auditable. |
| **Retirement Condition** | N/A — Commercial Arrangement concept is new. |

### 4.11 Organisational Knowledge

| Field | Detail |
|-------|--------|
| **Gap** | All knowledge tables FK to `user_id`, not `organisation_id`. Knowledge scoped to Person, not Organisation. |
| **Current State** | `genome_entities.user_id`, `genome_facts.user_id`, `kira_memory.user_id`, `conversations.user_id`, `kira_knowledge.user_id` — all FK to `users.id`. |
| **Canonical Requirement** | Knowledge scoped to Organisation (`organisation_id`), with provenance, supersession chains, and temporal history. |
| **Classification** | **Refactor/Rebind** |
| **Decision** | Add `organisation_id` FK to all knowledge tables. Backfill from `users.id` → `organisations.id`. `user_id` FK retained temporarily for legacy compatibility. |
| **Migration Impact** | Knowledge ownership moves from Person to Organisation. Knowledge survives Person change, Consultant change, Subscription change, Kira Instance change. |
| **Retirement Condition** | `user_id` as the sole authority for knowledge ownership is retired when `organisation_id` is the authority on all knowledge tables. |

### 4.12 RLS Policies

| Field | Detail |
|-------|--------|
| **Gap** | Genome tables have `USING (true)` — no tenant isolation. Memory/knowledge tables have `USING (user_id = auth.uid())` — user-scoped, not org-scoped. |
| **Current State** | Mixed: genome tables wide open, memory/knowledge tables user-scoped. |
| **Canonical Requirement** | All RLS policies use `organisation_id` as the primary tenant isolation key. |
| **Classification** | **Refactor/Rebind** |
| **Decision** | Phase 1: Add `organisation_id`-based RLS policies alongside legacy policies (shadow evaluation). Phase 2: Switch to `organisation_id`-only policies. Phase 3: Remove legacy policies. |
| **Migration Impact** | Tenant isolation moves from `user_id` to `organisation_id`. Cross-tenant data access is prevented. |
| **Retirement Condition** | Legacy `user_id`-based RLS policies are retired when `organisation_id`-based policies are verified correct. |

### 4.13 Decision (First-Class)

| Field | Detail |
|-------|--------|
| **Gap** | `kira_memory.memory_type = 'decision'` is a tag, not a first-class entity. No alternatives, rationale, or evidence chain. |
| **Current State** | Decision is a memory type tag. |
| **Canonical Requirement** | Independent Decision entity with alternatives, rationale, evidence chain, confidence. |
| **Classification** | **Introduce** |
| **Decision** | Create `decisions` table. Extract decision-tagged memories into first-class Decision records. |
| **Migration Impact** | Decisions become traceable. Alternatives and rationale become queryable. |
| **Retirement Condition** | N/A — Decision concept is new. `kira_memory.memory_type = 'decision'` is retired when `decisions` is the authority. |

### 4.14 Action (First-Class)

| Field | Detail |
|-------|--------|
| **Gap** | `kira_tasks` covers dispatched tasks only. No general Action entity. |
| **Current State** | `kira_tasks` exists as task management. |
| **Canonical Requirement** | General Action entity with status lifecycle, linked to Decision and Outcome. |
| **Classification** | **Refactor/Rebind** |
| **Decision** | `kira_tasks` will be rebinding to `organisation_id` and extended to link to `decisions`. Task status lifecycle continues. |
| **Migration Impact** | Actions become attributable to Decisions. Action outcomes become traceable. |
| **Retirement Condition** | `kira_tasks.user_id` as the sole authority is retired when `kira_tasks.organisation_id` and `kira_tasks.decision_id` are populated. |

### 4.15 Outcome (First-Class)

| Field | Detail |
|-------|--------|
| **Gap** | `kira_tasks.result TEXT` captures task outcomes. No general Outcome entity. |
| **Current State** | Outcome is a text field on `kira_tasks`. |
| **Canonical Requirement** | Independent Outcome entity with expectation vs actual comparison. |
| **Classification** | **Introduce** |
| **Decision** | Create `outcomes` table. Link to `kira_tasks` (Action) and `decisions`. Expectation vs actual comparison becomes queryable. |
| **Migration Impact** | Outcomes become traceable. Expectation vs actual becomes auditable. |
| **Retirement Condition** | N/A — Outcome concept is new. |

### 4.16 Learning (First-Class)

| Field | Detail |
|-------|--------|
| **Gap** | No Learning entity. No explicit "system learned X from outcome Y" record. |
| **Current State** | Learning loop is implicit in genome update mechanism. |
| **Canonical Requirement** | Independent Learning entity linking Outcome to Knowledge update. |
| **Classification** | **Introduce** |
| **Decision** | Create `learnings` table. Link to `outcomes` and knowledge updates. Learning loop becomes explicit and auditable. |
| **Migration Impact** | Learning becomes traceable. Knowledge updates become attributable to specific Outcomes. |
| **Retirement Condition** | N/A — Learning concept is new. |

---

## 5. Canonical Target-State Decisions

For every conflicting, partial, or missing concept, the implementation must become:

| Concept | Current State | Target State | Authority |
|---------|--------------|--------------|-----------|
| **Organisation** | `users.id` | `organisations.id` (independent entity) | `organisations.id` |
| **Person** | `users.id` | `persons.id` (independent entity) | `persons.id` |
| **Auth** | `users.auth_user_id` | `auth_credentials` (linked to `persons.id`) | `auth_credentials.id` |
| **Membership** | Implied by `users` → `business_identity` | `organisation_memberships` (temporal, role-based) | `organisation_memberships.id` |
| **Ownership** | `business_identity.owner_name` | `ownership_periods` (temporal) | `ownership_periods.id` |
| **Consultant** | None | Role in `organisation_memberships` | `organisation_memberships.role = 'consultant'` |
| **Engagement** | None | `engagements` (bounded intervention) | `engagements.id` |
| **Kira Instance** | `kira_agents.user_id` | `kira_agents.organisation_id` | `kira_agents.organisation_id` |
| **Subscription** | `users.subscription_status` | `subscriptions` (independent entity) | `subscriptions.id` |
| **Commercial** | Hardcoded in code | `commercial_arrangements` (versioned, temporal) | `commercial_arrangements.id` |
| **Knowledge** | FK to `user_id` | FK to `organisation_id` | `organisation_id` |
| **Decision** | `kira_memory.memory_type` tag | `decisions` (first-class entity) | `decisions.id` |
| **Action** | `kira_tasks` | `kira_tasks` (rebinding to `organisation_id`) | `kira_tasks.organisation_id` |
| **Outcome** | `kira_tasks.result` | `outcomes` (first-class entity) | `outcomes.id` |
| **Learning** | None | `learnings` (first-class entity) | `learnings.id` |
| **RLS** | Mixed (wide open / user-scoped) | `organisation_id`-based | `organisation_id` |

---

## 6. Retirement Register

Structures that may survive temporarily for migration compatibility but must not survive as canonical authorities:

| Structure | Current Authority | Retirement Condition | Migration Compatibility |
|-----------|------------------|---------------------|------------------------|
| `users.id` as Organisation key | Tenant isolation, knowledge ownership | `organisations.id` is sole authority | Retained temporarily as `organisation_id` backfill source |
| `users.id` as Person key | Person identity | `persons.id` is sole authority | Retained temporarily as `persons.id` backfill source |
| `users.id` as Tenant key | RLS filtering, API context | `organisation_id` is sole authority | Retained temporarily for legacy API compatibility |
| `users.subscription_status` | Subscription state | `subscriptions` table is authority | Retained temporarily during subscription migration |
| `business_identity.owner_name` | Ownership indicator | `ownership_periods` table is authority | Retained temporarily during ownership migration |
| `kira_memory.memory_type = 'decision'` | Decision tagging | `decisions` table is authority | Retained temporarily during decision extraction |
| `kira_tasks` as sole Action | Task management | `kira_tasks` rebinding to `organisation_id` | Retained, rebinding under new authority |
| `kira_tasks.result` as sole Outcome | Task outcome | `outcomes` table is authority | Retained temporarily during outcome extraction |

---

## 7. Migration Dependency Order

The following order is mandatory. Steps cannot be executed independently.

```
1. Canonical Identity (Organisation + Person separation)
        │
        ▼
2. Membership + Tenant Context (organisation_memberships)
        │
        ▼
3. RLS Authority Transfer (organisation_id-based policies)
        │
        ▼
4. Knowledge Ownership (FK restructure to organisation_id)
        │
        ▼
5. Consultant / Engagement Relationships
        │
        ▼
6. Commercial Structures (subscriptions, commercial_arrangements)
        │
        ▼
7. Kira Instance Separation (kira_agents rebinding)
        │
        ▼
8. Decision / Action / Outcome / Learning Introduction
        │
        ▼
9. Retirement of Legacy Authority (users.id as tenant key)
```

### Dependency Justification

| Step | Depends On | Justification |
|------|-----------|---------------|
| 1. Canonical Identity | Nothing | Foundation. All other steps require Organisation and Person entities. |
| 2. Membership + Tenant Context | Step 1 | Membership junction table requires Organisation and Person entities. |
| 3. RLS Authority | Steps 1, 2 | RLS policies require Organisation entity and Membership junction. |
| 4. Knowledge Ownership | Steps 1, 2, 3 | Knowledge FK restructure requires Organisation entity, Membership, and RLS. |
| 5. Consultant / Engagement | Steps 1, 2 | Consultant role and Engagement entity require Organisation and Person. |
| 6. Commercial Structures | Step 1 | Subscriptions and Commercial Arrangements require Organisation entity. |
| 7. Kira Instance | Step 1 | Kira Instance rebinding requires Organisation entity. |
| 8. Decision / Action / Outcome / Learning | Steps 1, 4 | First-class entities require Organisation entity and Knowledge ownership. |
| 9. Legacy Retirement | All previous | Legacy authority can only be retired when all canonical structures are authoritative. |

---

## 8. Decision Register Summary

| Classification | Count | Items |
|---------------|-------|-------|
| **Introduce** | 8 | Organisation, Membership, Ownership Period, Consultant (as role), Engagement, Commercial Arrangement, Decision, Outcome, Learning |
| **Refactor/Rebind** | 7 | users.id (root), Person, Kira Instance, Subscription, Knowledge FKs, RLS, Action |
| **Migrate** | 0 | (No existing structure is semantically salvageable without refactoring) |
| **Retire** | 8 | users.id as Org key, users.id as Person key, users.id as Tenant key, users.subscription_status, business_identity.owner_name, kira_memory.memory_type='decision' (as sole Decision), kira_tasks as sole Action, kira_tasks.result as sole Outcome |

---

*This artifact is the P0.4-C gap classification and decision register. It is ready to serve as the basis for P0.4-D (Architectural Test Harness).*
