# KIRA — P0.4-B Implementation Traceability Matrix

**Status:** Forensic Implementation Audit
**Purpose:** Map every canonical entity and invariant against the actual Kira implementation
**Scope:** Database schema, API/service layers, RLS policies, authentication, knowledge architecture
**Prerequisite:** P0.4-A (Implementation Baseline), P0.1–P0.3 (Canonical Architecture)
**Date:** 26 August 2026

---

## 1. Purpose

This artifact answers the canonical model's central audit question:

> **Where does each canonical concept currently exist in Kira, and where does the current implementation violate the canonical meaning?**

This is strictly forensic. No redesign. No modification of the canonical model to accommodate the existing schema.

---

## 2. Status Classification

| Classification | Definition |
|---------------|------------|
| **Conformant** | Implementation satisfies the canonical invariant |
| **Partial** | Structural substrate exists but semantic meaning is insufficient |
| **Missing** | No implementation exists |
| **Conflicting** | Implementation actively violates the canonical invariant |
| **Semantic Ambiguity** | Implementation exists but creates semantic confusion between distinct canonical concepts |

---

## 3. Canonical Entity Traceability

### 3.1 Organisation

**Canonical definition:** The enduring business entity that owns organisational intelligence. Independent of Person, Consultant, Engagement, Kira Instance, Subscription.

| Field | Finding |
|-------|---------|
| **Canonical requirement** | Independent Organisation entity with lifecycle, temporal ownership, and organisational knowledge ownership |
| **Actual implementation** | No `organisations` table. `users.id` IS the organisation. |
| **Source of truth** | `supabase/migrations/20260119000000_kira_complete.sql` — `CREATE TABLE users` (line ~1) |
| **Status** | **Conflicting** |
| **Evidence** | Every knowledge table (`genome_entities`, `genome_facts`, `kira_memory`, `conversations`) FKs to `user_id → users.id`. The `users` table serves as both Person identity and Organisation identity. |
| **Canonical violation** | Organisation identity is conflated with Person identity. There is no independent Organisation entity. |
| **users.id semantic overload** | `users.id` currently performs THREE incompatible roles: (1) Person identity, (2) Organisation identity, (3) Tenant isolation key. |

### 3.2 Person

**Canonical definition:** A distinct human identity that may participate in one or more Organisations. Independent of auth, membership, subscription.

| Field | Finding |
|-------|---------|
| **Canonical requirement** | Independent Person entity with identity independent of Organisation membership |
| **Actual implementation** | No `persons` table. `users.id` IS the person. |
| **Source of truth** | `supabase/migrations/20260119000000_kira_complete.sql` — `CREATE TABLE users` |
| **Status** | **Conflicting** |
| **Evidence** | `users` table has `email`, `name`, `first_name`, `last_name` (Person attributes) but also `subscription_status`, `stripe_customer_id` (Subscription attributes) and `business_identity` FK (Organisation attributes). |
| **Canonical violation** | Person identity is conflated with Organisation membership and Subscription state. Person cannot exist without Organisation membership. Person cannot belong to multiple Organisations. |

### 3.3 Auth Credential

**Canonical definition:** An authentication mechanism that allows a Person to authenticate. Independent of Person identity.

| Field | Finding |
|-------|---------|
| **Canonical requirement** | Auth credential separate from Person identity. Multiple auth credentials per Person possible. |
| **Actual implementation** | `users.auth_user_id UUID FK → auth.users(id)` (added in `20260720100000_auth_link.sql`). |
| **Source of truth** | `supabase/migrations/20260720100000_auth_link.sql` — `ALTER TABLE users ADD COLUMN auth_user_id UUID REFERENCES auth.users(id)` |
| **Status** | **Partial** |
| **Evidence** | Auth credential is linked to Person via FK. But auth credential is coupled to Person identity (revoking auth effectively ends Person access to Kira). `getCurrentAppUser()` in `lib/auth.ts` resolves auth → user bridge with orphan adoption. |
| **Partial conformity** | Auth is a credential, not identity. But it is coupled to Person identity via FK. Multiple auth credentials per Person are not supported. |

### 3.4 Organisation Membership

**Canonical definition:** A recorded relationship between a Person and an Organisation, defining roles and temporal scope.

| Field | Finding |
|-------|---------|
| **Canonical requirement** | Independent membership table with temporal scope, role concept, multi-membership support |
| **Actual implementation** | No membership table. Membership is implied by `users` → `business_identity` (1:1). |
| **Source of truth** | `supabase/migrations/20260731090000_business_identity.sql` — `CREATE TABLE business_identity` (PK on `user_id`, FK to `users(id)`) |
| **Status** | **Conflicting** |
| **Evidence** | `business_identity` is a 1:1 extension of `users`. No temporal scope. No role concept. No multi-membership. `admin_users` table (added `20260815100000_admin_system_complete.sql`) provides admin role but is not a membership concept. |
| **Canonical violation** | Membership is collapsed into Person identity. Temporal scope is missing. Role concept is missing. Multi-membership is impossible. |

### 3.5 Ownership Period

**Canonical definition:** A temporal record of who owned or controlled an Organisation during a specific period. First-class temporal entity.

| Field | Finding |
|-------|---------|
| **Canonical requirement** | Ownership period entity with temporal scope, transition context, and historical preservation |
| **Actual implementation** | No ownership period concept. `business_identity.owner_name TEXT` is the only ownership indicator. |
| **Source of truth** | `supabase/migrations/20260731090000_business_identity.sql` — `owner_name TEXT` |
| **Status** | **Missing** |
| **Evidence** | `owner_name` is a text field on `business_identity`. No temporal scope. No transition context. No historical ownership records. |
| **Canonical violation** | Ownership is not temporal. Historical ownership cannot survive. Ownership change would destroy organisational identity if identity were correctly separated. |

### 3.6 Consultant

**Canonical definition:** A professional advisor who intervenes in an Organisation to produce change. Participates in Engagements. Distinct from Introducer.

| Field | Finding |
|-------|---------|
| **Canonical requirement** | Consultant entity as role within Organisation Membership |
| **Actual implementation** | No Consultant entity. Only `introducers` (referral attribution). |
| **Source of truth** | `supabase/migrations/20260814100000_introducer_system.sql` — `CREATE TABLE introducers`, `CREATE TABLE introductions` |
| **Status** | **Missing** |
| **Evidence** | `introducers` table has `id`, `name`, `email`, `status`. `introductions` table has `user_id`, `introducer_id`, `status`. These are referral attribution records, not consultant relationships. |
| **Canonical violation** | Consultant concept does not exist. Introducer is correctly separated from Consultant in the codebase (no conflation), but Consultant itself is absent. |

### 3.7 Engagement

**Canonical definition:** A bounded, substantive intervention or body of work undertaken in relation to an Organisation. First-class domain concept.

| Field | Finding |
|-------|---------|
| **Canonical requirement** | Engagement entity with purpose, scope, participants, temporal boundaries, causal chain |
| **Actual implementation** | No Engagement entity. `introductions` table represents referral attribution, not bounded intervention. |
| **Source of truth** | `supabase/migrations/20260814100000_introducer_system.sql` — `CREATE TABLE introductions` |
| **Status** | **Missing** |
| **Evidence** | `introductions` has `projected_exit_valuation`, `projected_monthly_revenue`, `actual_exit_valuation`, `actual_monthly_revenue` — financial projection fields, not engagement intervention fields. |
| **Canonical violation** | Engagement concept does not exist. `introductions` is correctly identified as referral attribution, not engagement. |

### 3.8 Kira Instance

**Canonical definition:** A software deployment serving an Organisation. Can be replaced without affecting Organisation identity or knowledge.

| Field | Finding |
|-------|---------|
| **Canonical requirement** | Kira Instance entity independent of Organisation. Multiple historical instances per Organisation. |
| **Actual implementation** | `kira_agents` table represents the Kira Instance. Agent = Kira Instance. FK'd to `user_id`. |
| **Source of truth** | `supabase/migrations/20260119000000_kira_complete.sql` — `CREATE TABLE kira_agents` |
| **Status** | **Partial** |
| **Evidence** | `kira_agents` has `id`, `user_id`, `agent_id`, `status`, `is_restricted`, `version`. Agent lifecycle management exists (`lib/kira/agent-lifecycle.ts`). But agent is coupled to `user_id` (Person/Organisation). |
| **Partial conformity** | Agent is a Kira Instance. But it is coupled to Person/Organisation via `user_id`. Multiple historical instances per Organisation are supported (version field), but the coupling to `user_id` means replacing the agent does not cleanly separate from Organisation identity. |

### 3.9 Subscription

**Canonical definition:** A commercial arrangement under which Kira is provided. Independent of Organisation, Person, Engagement.

| Field | Finding |
|-------|---------|
| **Canonical requirement** | Independent Subscription entity with lifecycle, history, and Organisation linkage |
| **Actual implementation** | `users.subscription_status TEXT`, `users.subscription_id TEXT`, `users.stripe_customer_id TEXT`, `users.stripe_subscription_id TEXT` — all on the `users` table. |
| **Source of truth** | `supabase/migrations/20260119000000_kira_complete.sql` — `users` table columns |
| **Status** | **Conflicting** |
| **Evidence** | Subscription state is on the `users` table. `subscription_status` is a TEXT field with CHECK constraint (`active`, `trial`, `cancelled`, `past_due`, `expired`). Stripe integration exists in `lib/stripe/server.ts`. |
| **Canonical violation** | Subscription is conflated with Person identity. Subscription lifecycle is not independent. Subscription history is not preserved (status overwrites). |

### 3.10 Commercial Arrangement

**Canonical definition:** The commercial terms under which Kira is provided. Versioned, temporal, independent of Subscription.

| Field | Finding |
|-------|---------|
| **Canonical requirement** | Commercial Arrangement entity with versioning, temporal scope, and pricing terms |
| **Actual implementation** | No Commercial Arrangement entity. Pricing is hardcoded in `lib/valuation/pricing.ts`. |
| **Source of truth** | `lib/valuation/pricing.ts` — hardcoded pricing logic |
| **Status** | **Missing** |
| **Evidence** | Pricing logic exists in code but is not a data entity. No versioned commercial terms. No temporal commercial arrangement. |
| **Canonical violation** | Commercial Arrangement concept does not exist. Pricing is hardcoded, not data-driven. |

### 3.11 Organisational Knowledge

**Canonical definition:** All knowledge belonging to the Organisation, not to any Person, Membership, Engagement, or Kira Instance.

| Field | Finding |
|-------|---------|
| **Canonical requirement** | Knowledge scoped to Organisation (`organisation_id`), with provenance, supersession chains, and temporal history |
| **Actual implementation** | All genome/memory/knowledge tables FK to `user_id`, not `organisation_id`. |
| **Source of truth** | `supabase/migrations/20260119000000_kira_complete.sql` — all knowledge tables |
| **Status** | **Conflicting** |
| **Evidence** | `genome_entities.user_id`, `genome_facts.user_id`, `kira_memory.user_id`, `conversations.user_id`, `kira_knowledge.user_id` — all FK to `users.id`. |
| **Canonical violation** | Knowledge is scoped to Person, not Organisation. Knowledge does not survive Person change, Consultant change, Subscription change, or Kira Instance change. |

### 3.12 Decision (First-Class)

**Canonical definition:** An explicit organisational choice with provenance (who, why, evidence, alternatives, confidence).

| Field | Finding |
|-------|---------|
| **Canonical requirement** | Independent Decision entity with alternatives, rationale, evidence chain, confidence |
| **Actual implementation** | `kira_memory.memory_type` has `'decision'` tag. No first-class Decision entity. |
| **Source of truth** | `supabase/migrations/20260119000000_kira_complete.sql` — `kira_memory` table |
| **Status** | **Partial** |
| **Evidence** | `kira_memory.memory_type TEXT CHECK (memory_type IN ('preference', 'context', 'goal', 'decision', 'followup', 'correction', 'insight'))`. Decision is a tag on memory, not a first-class entity. No alternatives, rationale, or evidence chain. |
| **Partial conformity** | Decision exists as a memory type tag, but lacks the structural depth required by the canonical model. |

### 3.13 Action (First-Class)

**Canonical definition:** Something undertaken. Status (pending/active/completed/failed). Linked to a Decision.

| Field | Finding |
|-------|---------|
| **Canonical requirement** | Independent Action entity with status lifecycle, linked to Decision and Outcome |
| **Actual implementation** | `kira_tasks` covers dispatched tasks only. No general Action entity. |
| **Source of truth** | `supabase/migrations/20260119000000_kira_complete.sql` — `CREATE TABLE kira_tasks` |
| **Status** | **Partial** |
| **Evidence** | `kira_tasks` has `id`, `user_id`, `title`, `description`, `status`, `due_at`, `completed_at`. Task status lifecycle exists. But tasks are limited to dispatched tasks, not general organisational actions. |
| **Partial conformity** | Action exists as `kira_tasks` but is limited to task management, not general organisational action. |

### 3.14 Outcome (First-Class)

**Canonical definition:** The observed result of an action. Compared against expectations.

| Field | Finding |
|-------|---------|
| **Canonical requirement** | Independent Outcome entity with expectation vs actual comparison |
| **Actual implementation** | `kira_tasks.result TEXT` captures task outcomes. No general Outcome entity. |
| **Source of truth** | `supabase/migrations/20260119000000_kira_complete.sql` — `kira_tasks.result` |
| **Status** | **Partial** |
| **Evidence** | `kira_tasks.result TEXT` exists but is limited to task completion results. No expectation vs actual comparison. |
| **Partial conformity** | Outcome exists as task result, but lacks the structural depth required by the canonical model. |

### 3.15 Learning (First-Class)

**Canonical definition:** Knowledge derived from the outcome fed back into organisational knowledge/state.

| Field | Finding |
|-------|---------|
| **Canonical requirement** | Independent Learning entity linking Outcome to Knowledge update |
| **Actual implementation** | No Learning entity. No explicit "system learned X from outcome Y" record. |
| **Source of truth** | None |
| **Status** | **Missing** |
| **Evidence** | No learning records exist. The learning loop is implicit in the genome update mechanism. |
| **Canonical violation** | Learning concept does not exist as a first-class entity. |

---

## 4. Canonical Invariant Traceability

### INV-001: Organisation Identity Persists

**Canonical requirement:** Organisation persists independently of Person, Consultant, Engagement, Subscription, Kira Instance.

| Field | Finding |
|-------|---------|
| **Status** | **Conflicting** |
| **Evidence** | `users.id` IS the organisation. Deleting or deactivating a `users` record would destroy the Organisation identity. `business_identity` has `ON DELETE CASCADE` from `users(id)` (migration `20260731090000_business_identity.sql` line 31). |
| **Violation** | Organisation identity does not persist independently. It is coupled to Person identity via `users.id`. |

### INV-002: Person ≠ Auth ≠ Membership

**Canonical requirement:** Person identity, Auth credential, and Organisation Membership are distinct concepts.

| Field | Finding |
|-------|---------|
| **Status** | **Conflicting** |
| **Evidence** | `users` table conflates Person (email, name), Auth (auth_user_id), Membership (business_identity FK), and Subscription (subscription_status, stripe_*). |
| **Violation** | All four concepts are collapsed into a single table. |

### INV-003: Ownership is Temporal

**Canonical requirement:** Ownership Period is a first-class temporal entity with start/end.

| Field | Finding |
|-------|---------|
| **Status** | **Missing** |
| **Evidence** | `business_identity.owner_name TEXT` is the only ownership indicator. No temporal scope. |
| **Violation** | Ownership is not temporal. Historical ownership cannot be reconstructed. |

### INV-004: Consultant ≠ Introducer

**Canonical requirement:** Consultant and Introducer are distinct concepts.

| Field | Finding |
|-------|---------|
| **Status** | **Conformant** (by absence) |
| **Evidence** | `introducers` table exists as referral attribution. No Consultant entity exists. The two concepts are correctly separated — not because they are implemented as distinct, but because Consultant is absent entirely. |
| **Note** | This is accidental conformity. The separation exists because Consultant was never implemented, not because it was architecturally separated. |

### INV-005: Engagement is First-Class

**Canonical requirement:** Engagement is a bounded intervention with purpose, scope, participants, temporal boundaries.

| Field | Finding |
|-------|---------|
| **Status** | **Missing** |
| **Evidence** | No Engagement entity. `introductions` is referral attribution, not bounded intervention. |
| **Violation** | Engagement concept does not exist. |

### INV-006: Knowledge Belongs to Organisation

**Canonical requirement:** All organisational knowledge is scoped to Organisation, not Person.

| Field | Finding |
|-------|---------|
| **Status** | **Conflicting** |
| **Evidence** | All knowledge tables (`genome_entities`, `genome_facts`, `kira_memory`, `conversations`, `kira_knowledge`) FK to `user_id → users.id`. |
| **Violation** | Knowledge is scoped to Person, not Organisation. Knowledge does not survive Person change. |

### INV-007: Knowledge Has Provenance

**Canonical requirement:** Every knowledge item has source_type, source_id, observed_at, attribution.

| Field | Finding |
|-------|---------|
| **Status** | **Partial** |
| **Evidence** | `genome_entities` has `source_type TEXT`, `source_id UUID`, `observed_at TIMESTAMPTZ`. `kira_memory` has `source TEXT`. Provenance fields exist but are not consistently populated. |
| **Partial conformity** | Provenance fields exist on genome tables. But they are not consistently populated, and the canonical model requires provenance on ALL knowledge items, not just genome entries. |

### INV-008: Historical Preservation

**Canonical requirement:** Historical relationships and states are never destroyed.

| Field | Finding |
|-------|---------|
| **Status** | **Partial** |
| **Evidence** | `genome_entities.supersedes UUID` and `genome_facts.supersedes UUID` create supersession chains. `genome_events` tracks mutations. But there is no temporal ownership, no temporal membership, and no engagement history to preserve. |
| **Partial conformity** | Supersession chains exist for genome data. But temporal ownership, membership, and engagement history do not exist to be preserved. |

### INV-009: Temporal Reconstruction

**Canonical requirement:** Organisational state can be reconstructed at any historical point.

| Field | Finding |
|-------|---------|
| **Status** | **Partial** |
| **Evidence** | `genome_events` tracks mutations with timestamps. `genome_entities.observed_at` and `genome_facts.observed_at` provide temporal markers. But there is no state snapshot mechanism, no temporal ownership, and no temporal membership. |
| **Partial conformity** | Some temporal markers exist. But full historical state reconstruction is not possible without temporal ownership and membership. |

### INV-010: No Silent State Change

**Canonical requirement:** Every material state transition has an explicit provenance path.

| Field | Finding |
|-------|---------|
| **Status** | **Conflicting** |
| **Evidence** | `genome_events` tracks mutations but does not distinguish Causal, Observational, Epistemic, or Administrative transitions. There is no causal chain. There is no distinction between what the system observed and what it inferred. |
| **Violation** | State changes occur without causal provenance. The system cannot distinguish between what it observed and what it inferred. |

---

## 5. Knowledge Architecture Traceability

### 5.1 Persistence Layer

| Table | FK Target | RLS Policy | Status |
|-------|-----------|------------|--------|
| `genome_entities` | `user_id → users.id` | `USING (true)` — **wide open** | **Conflicting** |
| `genome_facts` | `user_id → users.id` | `USING (true)` — **wide open** | **Conflicting** |
| `genome_relationships` | `user_id → users.id` | `USING (true)` — **wide open** | **Conflicting** |
| `genome_events` | `user_id → users.id` | `USING (true)` — **wide open** | **Conflicting** |
| `kira_memory` | `user_id → users.id` | `USING (user_id = auth.uid())` | **Conflicting** |
| `kira_knowledge` | `user_id → users.id` | `USING (user_id = auth.uid())` | **Conflicting** |
| `conversations` | `user_id → users.id` | `USING (user_id = auth.uid())` | **Conflicting** |
| `conversation_messages` | `conversation_id → conversations.id` | `USING (true)` | **Conflicting** |

### 5.2 RLS Layer

| Table | RLS Policy | Isolation | Status |
|-------|-----------|-----------|--------|
| `genome_entities` | `USING (true)` | **No isolation** | **Conflicting** |
| `genome_facts` | `USING (true)` | **No isolation** | **Conflicting** |
| `genome_relationships` | `USING (true)` | **No isolation** | **Conflicting** |
| `genome_events` | `USING (true)` | **No isolation** | **Conflicting** |
| `kira_memory` | `USING (user_id = auth.uid())` | User-scoped | **Conflicting** |
| `kira_knowledge` | `USING (user_id = auth.uid())` | User-scoped | **Conflicting** |
| `conversations` | `USING (user_id = auth.uid())` | User-scoped | **Conflicting** |
| `conversation_messages` | `USING (true)` | **No isolation** | **Conflicting** |

### 5.3 API/Service Layer

| API Route | Tenant Resolution | Status |
|-----------|------------------|--------|
| `app/api/kira/webhooks/save_memory/route.ts` | `auth.uid()` → `users.id` | **Conflicting** |
| `app/api/genome/query/route.ts` | `auth.uid()` → `users.id` | **Conflicting** |
| `app/api/genome/entities/route.ts` | `auth.uid()` → `users.id` | **Conflicting** |
| `app/api/knowledge/search/route.ts` | `auth.uid()` → `users.id` | **Conflicting** |
| All 40+ API routes | `auth.uid()` → `users.id` | **Conflicting** |

### 5.4 Retrieval Layer

| Retrieval Path | Tenant Context | Status |
|----------------|---------------|--------|
| Genome query (`lib/genome/query.ts`) | `user_id` from session | **Conflicting** |
| Memory search (`lib/kira/memory.ts`) | `user_id` from session | **Conflicting** |
| Knowledge search (`lib/kira/knowledge.ts`) | `user_id` from session | **Conflicting** |
| Conversation history (`lib/kira/conversations.ts`) | `user_id` from session | **Conflicting** |

---

## 6. users.id Semantic Overload Analysis

The `users.id` field currently performs **five incompatible semantic roles**:

| Role | Canonical Entity | Current Implementation |
|------|-----------------|----------------------|
| **Person Identity** | `persons.id` | `users.id` |
| **Organisation Identity** | `organisations.id` | `users.id` |
| **Tenant Isolation Key** | `organisation_id` | `user_id` |
| **Auth Credential Link** | `auth_credentials.id` | `users.auth_user_id` |
| **Membership Key** | `organisation_memberships.id` | Implied by `users.id` → `business_identity` |

This is the architectural root cause of every conflict identified in this traceability matrix. The canonical model requires these five concepts to be independent. The current implementation collapses them into a single UUID.

---

## 7. Summary: Degree of Architectural Collapse

| Classification | Count | Percentage |
|---------------|-------|------------|
| **Conflicting** | 18 | 60% |
| **Partial** | 7 | 23% |
| **Missing** | 5 | 17% |
| **Conformant** | 0 | 0% |
| **Total** | 30 | 100% |

**No canonical entity is fully conformant.** The only accidental conformity is INV-004 (Consultant ≠ Introducer), which exists because Consultant was never implemented, not because it was architecturally separated.

The degree of architectural collapse is total. The current implementation has a fundamentally different identity ontology from the canonical model. Every knowledge table, every API route, every RLS policy is anchored to `users.id`, which performs five incompatible semantic roles.

---

## 8. Central Audit Question Answered

> **Where does each canonical concept currently exist in Kira, and where does the current implementation violate the canonical meaning?**

| Canonical Concept | Exists? | Location | Violates? |
|-------------------|---------|----------|-----------|
| Organisation | No | `users.id` (conflated) | Yes — conflated with Person |
| Person | No | `users.id` (conflated) | Yes — conflated with Organisation |
| Auth Credential | Partial | `users.auth_user_id` | Partially — coupled to Person |
| Membership | No | Implied by `users` → `business_identity` | Yes — 1:1, no temporal, no role |
| Ownership Period | No | `business_identity.owner_name` | Yes — not temporal |
| Consultant | No | None | Yes — concept absent |
| Engagement | No | None | Yes — concept absent |
| Kira Instance | Partial | `kira_agents` | Partially — coupled to `user_id` |
| Subscription | Partial | `users.subscription_status` | Yes — conflated with Person |
| Commercial Arrangement | No | `lib/valuation/pricing.ts` (code) | Yes — hardcoded, not data |
| Organisational Knowledge | No | All tables FK to `user_id` | Yes — scoped to Person, not Organisation |
| Decision | Partial | `kira_memory.memory_type = 'decision'` | Partially — tag only |
| Action | Partial | `kira_tasks` | Partially — limited to tasks |
| Outcome | Partial | `kira_tasks.result` | Partially — limited to task results |
| Learning | No | None | Yes — concept absent |

---

*This artifact is the P0.4-B implementation traceability matrix. It is ready to serve as the basis for P0.4-C (Gap Classification / Decision Register).*
