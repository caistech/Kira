# KIRA — P0.3-A Implementation Traceability & Gap Matrix

**Status:** Implementation Architecture
**Purpose:** Map the canonical model against the current Kira implementation
**Scope:** Database schema, API contracts, service boundaries, data migration risks
**Date:** 26 August 2026

---

## 1. Purpose

The purpose of this artifact is to take the canonical model established in P0.2 and inspect the actual current Kira implementation against it.

For every canonical entity, relationship, and invariant, we establish:
- Where it exists today
- What database structure currently represents it
- What API/service currently exposes it
- Whether the implementation is semantically conformant
- What has been collapsed incorrectly
- What is missing
- What historical data exists that must be migrated
- What cannot be migrated without interpretation
- What architectural decision is required
- What migration risk exists

The governing rule remains:

> **We do not alter the canonical model to make the existing database look correct.**

If the current implementation has a semantic gap, we record it. We do not rationalise it away.

---

## 2. Canonical Concept Traceability Matrix

### 2.1 Organisation

| Field | Detail |
|-------|--------|
| **Canonical definition** | The enduring business entity that owns organisational intelligence. Independent of Person, Consultant, Engagement, Kira Instance, Subscription. |
| **Current implementation** | No `organisations` table exists. The `users` table IS the organisation. `business_identity` table has `legal_name`, `abn`, `entity_type`, `industry`, `annual_revenue_range`, `owner_name` but is FK'd to `user_id`. |
| **Database structure** | `users` table: `id UUID PK`, `email TEXT`, `name TEXT`, `first_name TEXT`, `last_name TEXT`, `journey_type TEXT`, `status TEXT`. `business_identity` table: `user_id UUID FK → users(id) UNIQUE`, `legal_name TEXT`, `abn TEXT`, `entity_type TEXT`, `industry TEXT`, `annual_revenue_range TEXT`, `owner_name TEXT`. |
| **API exposure** | `app/api/user/profile/route.ts` exposes user profile including business identity. `app/api/admin/exec/dashboard/route.ts` exposes admin dashboard with business data. |
| **Semantic conformance** | **Contradicts.** The canonical model requires Organisation as an independent entity. The current implementation conflates Organisation with Person. |
| **What is collapsed** | Organisation identity is collapsed into Person identity (the `users` table). Business identity (`business_identity`) is a property of the user, not an independent entity. |
| **What is missing** | Independent Organisation entity. Organisation lifecycle (Active → Dormant → Sold → Merged → Closed). Organisation identity independent of Person. |
| **Historical data** | Every `users` record with a `business_identity` represents an Organisation. The `legal_name`, `abn`, `entity_type` are Organisation attributes. |
| **Migration risk** | **High.** Restructuring `users` to separate Person from Organisation requires FK migration across all tables that currently FK to `user_id`. |
| **Architectural decision required** | Introduce `organisations` table. Restructure `user_id` FKs to `organisation_id` on all knowledge/genome/memory tables. |

### 2.2 Person

| Field | Detail |
|-------|--------|
| **Canonical definition** | A distinct human identity that may participate in one or more Organisations. Independent of auth, membership, subscription. |
| **Current implementation** | No `persons` table. The `users` table IS the person. Identity is conflated with Organisation membership. |
| **Database structure** | `users` table: `id UUID PK`, `email TEXT`, `name TEXT`, `first_name TEXT`, `last_name TEXT`, `auth_user_id UUID FK → auth.users(id)`, `auth_provider TEXT`. |
| **API exposure** | User profile API. Auth API. |
| **Semantic conformance** | **Contradicts.** Person identity is conflated with Organisation membership. Person cannot exist without Organisation membership. Person cannot belong to multiple Organisations. |
| **What is collapsed** | Person identity is collapsed into Organisation membership. Auth credential is collapsed into Person identity. |
| **What is missing** | Independent Person entity. Person identity independent of auth. Person identity independent of Organisation membership. |
| **Historical data** | Every `users` record represents a Person. `email`, `name`, `first_name`, `last_name` are Person attributes. |
| **Migration risk** | **High.** Restructuring requires separating Person from Organisation. Every `users` record must be mapped to both a Person and an Organisation. |
| **Architectural decision required** | Introduce `persons` table. Link Person to Organisation via membership junction table. |

### 2.3 Auth Credential

| Field | Detail |
|-------|--------|
| **Canonical definition** | An authentication mechanism that allows a Person to authenticate to a Kira Instance. Independent of Person identity. |
| **Current implementation** | `auth_user_id` FK on `users` table links to Supabase Auth (`auth.users`). Auth is conflated with Person identity. |
| **Database structure** | `users.auth_user_id UUID FK → auth.users(id)`. `users.auth_provider TEXT DEFAULT 'email'`. |
| **API exposure** | Auth API (Supabase Auth). |
| **Semantic conformance** | **Partially conforms.** Auth is a credential, not identity. But it is coupled to Person identity via FK. |
| **What is collapsed** | Auth credential is coupled to Person identity. Revoking auth effectively ends Person access to Kira. |
| **What is missing** | Independent Auth Credential entity. Multiple auth credentials per Person. Auth credential revocation without Person identity destruction. |
| **Historical data** | Every `users.auth_user_id` represents an Auth Credential. |
| **Migration risk** | **Medium.** Supabase Auth is an external service. Restructuring requires mapping Auth users to Person records. |
| **Architectural decision required** | Separate Auth Credential from Person identity. Allow multiple auth credentials per Person. |

### 2.4 Organisation Membership

| Field | Detail |
|-------|--------|
| **Canonical definition** | A recorded relationship between a Person and an Organisation, defining roles and temporal scope. |
| **Current implementation** | No membership table. Membership is implied by `users` → `business_identity` (1:1). No temporal scope. No role concept. |
| **Database structure** | `users` table IS the membership. `business_identity` table is the membership context. No temporal columns on membership. |
| **API exposure** | User profile API. Admin dashboard. |
| **Semantic conformance** | **Contradicts.** Membership is 1:1 (one Person = one Organisation). No temporal scope. No role concept. No multi-membership. |
| **What is collapsed** | Membership is collapsed into Person identity. Temporal scope is missing. Role concept is missing. |
| **What is missing** | Independent membership table. Temporal scope (start/end). Role concept (Owner, Consultant, Introducer, Employee, Advisor). Multi-membership support. |
| **Historical data** | Every `users` record with a `business_identity` represents a membership. The `created_at` timestamp is the membership start. No end timestamp exists. |
| **Migration risk** | **High.** Restructuring requires creating membership records for all existing users. |
| **Architectural decision required** | Introduce `organisation_memberships` table with temporal scope and role. |

### 2.5 Ownership Period

| Field | Detail |
|-------|--------|
| **Canonical definition** | A temporal record of who owned or controlled an Organisation during a specific period. First-class temporal entity. |
| **Current implementation** | No ownership period concept. Ownership is implicit in `subscription_status` and `business_identity.owner_name`. |
| **Database structure** | `users.subscription_status TEXT`. `business_identity.owner_name TEXT`. No temporal ownership record. |
| **API exposure** | Admin dashboard. |
| **Semantic conformance** | **Missing.** No temporal ownership concept exists. |
| **What is missing** | Ownership period entity. Temporal scope (start/end). Transition context (how ownership changed). |
| **Historical data** | `business_identity.owner_name` contains the current owner's name. No historical ownership records. |
| **Migration risk** | **Medium.** No existing data to migrate. New entity must be created. |
| **Architectural decision required** | Introduce `ownership_periods` table. Define transition semantics. |

### 2.6 Consultant

| Field | Detail |
|-------|--------|
| **Canonical definition** | A professional advisor who intervenes in an Organisation to produce change. Participates in Engagements. Distinct from Introducer. |
| **Current implementation** | No Consultant entity. Only `introducers` (referral channel). Introducer ≠ Consultant. |
| **Database structure** | `introducers` table: `id UUID PK`, `name TEXT`, `email TEXT UNIQUE`, `status TEXT`. `introductions` table: `id UUID PK`, `user_id UUID FK → users(id)`, `introducer_id UUID FK → introducers(id)`. |
| **API exposure** | `app/admin/(panel)/introducers/actions.ts`. `app/introducer/page.tsx`. |
| **Semantic conformance** | **Missing.** Introducer exists but is NOT a Consultant. Introducer is a referral attribution system. Consultant is a bounded intervention participant. |
| **What is collapsed** | Nothing is collapsed. The two concepts are correctly separated in the codebase. |
| **What is missing** | Consultant entity. Consultant relationship to Organisation. Consultant participation in Engagements. |
| **Historical data** | No Consultant data exists. |
| **Migration risk** | **Low.** No existing data to migrate. New entity must be created. |
| **Architectural decision required** | Introduce Consultant as a role within Organisation Membership. Define Consultant relationship to Engagement. |

### 2.7 Engagement

| Field | Detail |
|-------|--------|
| **Canonical definition** | A bounded, substantive intervention or body of work undertaken in relation to an Organisation. First-class domain concept. |
| **Current implementation** | No Engagement entity. `introductions` table represents referral attribution, not bounded intervention. |
| **Database structure** | `introductions` table: `id UUID PK`, `user_id UUID FK → users(id)`, `introducer_id UUID FK → introducers(id)`, `status TEXT`, `projected_exit_valuation NUMERIC`, `projected_monthly_revenue NUMERIC`. |
| **API exposure** | Admin dashboard. Introducer status projection. |
| **Semantic conformance** | **Missing.** `introductions` is NOT an Engagement. It is a referral attribution record. |
| **What is collapsed** | Nothing is collapsed. The two concepts are correctly separated. |
| **What is missing** | Engagement entity. Engagement purpose/scope. Engagement participants. Engagement temporal boundaries. Engagement causal chain. |
| **Historical data** | No Engagement data exists. |
| **Migration risk** | **Low.** No existing data to migrate. New entity must be created. |
| **Architectural decision required** | Introduce `engagements` table. Define Engagement lifecycle. Define relationship to Consultant, Organisation, Kira Instance. |

### 2.8 Kira Instance

| Field | Detail |
|-------|--------|
| **Canonical definition** | A software deployment serving an Organisation. Can be replaced without affecting Organisation identity or knowledge. |
| **Current implementation** | `kira_agents` table represents the Kira Instance. Agent = Kira Instance in current implementation. FK'd to `user_id`. |
| **Database structure** | `kira_agents` table: `id UUID PK`, `user_id UUID FK → users(id)`, `agent_id TEXT UNIQUE`, `status TEXT`, `is_restricted BOOLEAN`, `version INTEGER`. |
| **API exposure** | Agent creation, reprovisioning, lifecycle management APIs. |
| **Semantic conformance** | **Partially conforms.** Agent is a Kira Instance. But it is coupled to `user_id` (Person/Organisation). |
| **What is collapsed** | Kira Instance is coupled to Person/Organisation via `user_id`. |
| **What is missing** | Kira Instance entity independent of Person. Kira Instance lifecycle (created → active → archived → replaced). |
| **Historical data** | Every `kira_agents` record represents a Kira Instance. |
| **Migration risk** | **Medium.** Restructuring requires linking Kira Instance to Organisation, not Person. |
| **Architectural decision required** | Separate Kira Instance from Person identity. Link to Organisation. |

### 2.9 Subscription

| Field | Detail |
|-------|--------|
| **Canonical definition** | A commercial arrangement under which Kira is provided. Independent of Organisation, Person, Engagement. |
| **Current implementation** | `users.subscription_status TEXT`, `users.subscription_id TEXT`, `users.stripe_customer_id TEXT`, `users.stripe_subscription_id TEXT`. Subscription is conflated with Person identity. |
| **Database structure** | `users` table: `subscription_status TEXT DEFAULT 'trial'`, `subscription_id TEXT`, `stripe_customer_id TEXT UNIQUE`, `stripe_subscription_id TEXT`, `trial_started_at TIMESTAMPTZ`, `trial_ends_at TIMESTAMPTZ`, `subscription_started_at TIMESTAMPTZ`, `subscription_ends_at TIMESTAMPTZ`. |
| **API exposure** | Stripe webhook handlers. Subscription management APIs. |
| **Semantic conformance** | **Partially conforms.** Subscription exists but is conflated with Person identity. |
| **What is collapsed** | Subscription is collapsed into Person identity. |
| **What is missing** | Independent Subscription entity. Subscription lifecycle. Subscription history. |
| **Historical data** | Every `users` record with `subscription_status` represents a Subscription. |
| **Migration risk** | **Medium.** Restructuring requires separating Subscription from Person. |
| **Architectural decision required** | Introduce `subscriptions` table. Link to Organisation, not Person. |

### 2.10 Commercial Arrangement

| Field | Detail |
|-------|--------|
| **Canonical definition** | The commercial terms under which Kira is provided. Versioned, temporal, independent of Subscription. |
| **Current implementation** | No Commercial Arrangement entity. Pricing is hardcoded in `lib/valuation/pricing.ts`. No versioned commercial terms. |
| **Database structure** | No table. Pricing logic in code. |
| **API exposure** | Valuation API. |
| **Semantic conformance** | **Missing.** No Commercial Arrangement entity exists. |
| **What is missing** | Commercial Arrangement entity. Versioned pricing. Revenue share terms. Temporal commercial terms. |
| **Historical data** | No Commercial Arrangement data exists. |
| **Migration risk** | **Low.** No existing data to migrate. New entity must be created. |
| **Architectural decision required** | Introduce `commercial_arrangements` table. Define versioning semantics. |

### 2.11 Organisational Knowledge

| Field | Detail |
|-------|--------|
| **Canonical definition** | All knowledge (genome, memory, facts, decisions, actions, outcomes, learnings) belonging to the Organisation, not to any Person, Membership, Engagement, or Kira Instance. |
| **Current implementation** | All genome/memory tables FK to `user_id`, not `organisation_id`. Knowledge is scoped to Person, not Organisation. |
| **Database structure** | `genome_entities.user_id UUID FK → users(id)`. `genome_facts.user_id UUID FK → users(id)`. `genome_relationships.user_id UUID FK → users(id)`. `genome_events.user_id UUID FK → users(id)`. `kira_memory.user_id UUID FK → users(id)`. `kira_knowledge.user_id UUID FK → users(id)`. `conversations.user_id UUID FK → users(id)`. |
| **API exposure** | Genome API. Memory API. Knowledge search API. |
| **Semantic conformance** | **Contradicts.** Knowledge is scoped to Person, not Organisation. |
| **What is collapsed** | Knowledge ownership is collapsed into Person identity. |
| **What is missing** | Knowledge scoped to Organisation. Knowledge transfer between Persons. Knowledge persistence through ownership change. |
| **Historical data** | Every genome/memory/knowledge record represents organisational knowledge. All are FK'd to `user_id`. |
| **Migration risk** | **Critical.** FK migration across all knowledge tables. Risk of data loss or orphaning. |
| **Architectural decision required** | Restructure all knowledge table FKs from `user_id` to `organisation_id`. Design migration strategy. |

### 2.12 Decision (First-Class)

| Field | Detail |
|-------|--------|
| **Canonical definition** | An explicit organisational choice with provenance (who, why, evidence, alternatives, confidence). |
| **Current implementation** | `kira_memory.memory_type` has `'decision'` tag. No first-class Decision entity. |
| **Database structure** | `kira_memory.memory_type TEXT CHECK (memory_type IN ('preference', 'context', 'goal', 'decision', 'followup', 'correction', 'insight'))`. |
| **API exposure** | Memory API. |
| **Semantic conformance** | **Partial.** Decision is a tag on memory, not a first-class entity. No alternatives, rationale, or evidence chain. |
| **What is collapsed** | Decision is collapsed into a memory type tag. |
| **What is missing** | Independent Decision entity. Alternatives considered. Rationale. Evidence chain. Confidence. |
| **Historical data** | `kira_memory` records with `memory_type = 'decision'` represent Decisions. |
| **Migration risk** | **Medium.** Existing decision-tagged memories may need restructuring. |
| **Architectural decision required** | Introduce `decisions` table. Define relationship to Engagement, Action, Outcome. |

### 2.13 Action (First-Class)

| Field | Detail |
|-------|--------|
| **Canonical definition** | Something undertaken. Status (pending/active/completed/failed). Linked to a Decision. |
| **Current implementation** | `kira_tasks` covers dispatched tasks only. No general Action entity. |
| **Database structure** | `kira_tasks` table: `id UUID PK`, `user_id UUID FK → users(id)`, `title TEXT`, `description TEXT`, `status TEXT`, `due_at TIMESTAMPTZ`, `completed_at TIMESTAMPTZ`. |
| **API exposure** | Task API. |
| **Semantic conformance** | **Partial.** Action exists as `kira_tasks` but is limited to dispatched tasks. |
| **What is collapsed** | Action is collapsed into task management. |
| **What is missing** | General Action entity. Action linked to Decision. Action status lifecycle. Action attributed to Person. |
| **Historical data** | `kira_tasks` records represent Actions. |
| **Migration risk** | **Low.** Existing tasks may need restructuring to link to Decisions. |
| **Architectural decision required** | Introduce `actions` table or extend `kira_tasks`. Define relationship to Decision, Outcome. |

### 2.14 Outcome (First-Class)

| Field | Detail |
|-------|--------|
| **Canonical definition** | The observed result of an action. Compared against expectations. |
| **Current implementation** | `kira_tasks.result` captures task outcomes. No general Outcome entity. |
| **Database structure** | `kira_tasks.result TEXT`. |
| **API exposure** | Task API. |
| **Semantic conformance** | **Partial.** Outcome exists as task result, but is limited to task completion. |
| **What is collapsed** | Outcome is collapsed into task result. |
| **What is missing** | Independent Outcome entity. Expectation vs actual comparison. Outcome linked to Action. |
| **Historical data** | `kira_tasks.result` records represent Outcomes. |
| **Migration risk** | **Low.** Existing task results may need restructuring. |
| **Architectural decision required** | Introduce `outcomes` table. Define relationship to Action, Learning. |

### 2.15 Learning (First-Class)

| Field | Detail |
|-------|--------|
| **Canonical definition** | Knowledge derived from the outcome fed back into organisational knowledge/state. |
| **Current implementation** | No Learning entity. No explicit "system learned X from outcome Y" record. |
| **Database structure** | No table. |
| **API exposure** | No API. |
| **Semantic conformance** | **Missing.** No Learning entity exists. |
| **What is missing** | Learning entity. Link to Outcome. Link to Knowledge update. |
| **Historical data** | No Learning data exists. |
| **Migration risk** | **Low.** No existing data to migrate. New entity must be created. |
| **Architectural decision required** | Introduce `learnings` table. Define relationship to Outcome, Knowledge. |

---

## 3. Invariant Compliance Matrix

### 3.1 Organisation Invariants

| Invariant | Current Status | Classification | Gap |
|-----------|---------------|----------------|-----|
| Organisation is the enduring subject | No Organisation entity | Contradicts | Introduce `organisations` table |
| Organisation identity persists through all changes | Organisation = Person = User | Contradicts | Separate Organisation from Person |
| Organisation owns all knowledge | Knowledge FKs to `user_id` | Contradicts | Restructure FKs to `organisation_id` |
| Organisation has lifecycle states | No lifecycle concept | Missing | Introduce lifecycle states |

### 3.2 Person Invariants

| Invariant | Current Status | Classification | Gap |
|-----------|---------------|----------------|-----|
| Person is identity, not role | Person = User = Organisation | Contradicts | Separate Person from Organisation |
| Auth Credential is mechanism, not identity | Auth coupled to Person | Partial | Separate Auth from Person |
| Person persists through membership change | Person = Membership | Contradicts | Separate Person from Membership |
| Person can belong to multiple Organisations | 1:1 Person:Organisation | Contradicts | Introduce multi-membership |

### 3.3 Ownership Invariants

| Invariant | Current Status | Classification | Gap |
|-----------|---------------|----------------|-----|
| Ownership Period is temporal, not a property | No ownership concept | Missing | Introduce `ownership_periods` |
| Only one Ownership Period can be Current | No ownership concept | Missing | Define temporal semantics |
| Historical Ownership Periods are never destroyed | No ownership concept | Missing | Define persistence rules |
| Ownership change does not destroy Organisation | No ownership concept | Missing | Define transition semantics |

### 3.4 Knowledge Invariants

| Invariant | Current Status | Classification | Gap |
|-----------|---------------|----------------|-----|
| Knowledge belongs to Organisation | Knowledge FKs to `user_id` | Contradicts | Restructure FKs to `organisation_id` |
| Historical contributions persist | Knowledge scoped to Person | Contradicts | Separate knowledge ownership from Person |
| Knowledge has provenance | `source_type`, `source_id` exist | Conforms | Sufficient |
| Knowledge has temporal history | `supersedes` chains exist | Conforms | Sufficient |
| Knowledge can be transferred | No transfer mechanism | Missing | Introduce knowledge transfer |

### 3.5 Temporal Invariants

| Invariant | Current Status | Classification | Gap |
|-----------|---------------|----------------|-----|
| No silent state change | `genome_events` tracks mutations | Partial | No causal provenance |
| Causal integrity | No causal chain | Missing | Introduce causal chain |
| Temporal recovery | `supersedes` chains exist | Partial | No state reconstruction |
| Transition type distinction | No transition types | Missing | Introduce Causal/Observational/Epistemic/Administrative |

### 3.6 Engagement Invariants

| Invariant | Current Status | Classification | Gap |
|-----------|---------------|----------------|-----|
| Engagement is bounded intervention | No Engagement entity | Missing | Introduce `engagements` table |
| Engagement produces organisational knowledge | No Engagement entity | Missing | Define causal chain |
| Engagement ≠ Conversation | No Engagement entity | Missing | Define boundary |
| Engagement ≠ Subscription | No Engagement entity | Missing | Define independence |
| Multiple Engagements interact | No Engagement entity | Missing | Define compounding |

### 3.7 Commercial Invariants

| Invariant | Current Status | Classification | Gap |
|-----------|---------------|----------------|-----|
| Subscription is independent | Subscription = Person | Contradicts | Separate Subscription from Person |
| Commercial terms are temporal | No versioned terms | Missing | Introduce versioned terms |
| Pricing is not hardcoded | Pricing in code | Contradicts | Introduce pricing entity |
| Revenue share is temporal | No revenue share concept | Missing | Introduce revenue share |

---

## 4. Critical Migration Risks

| Risk | Severity | Description | Mitigation |
|------|----------|-------------|------------|
| FK restructuring across knowledge tables | **Critical** | All genome/memory/knowledge tables FK to `user_id`. Restructuring to `organisation_id` requires migration of every row. | Backfill `organisations` table first. Update FKs in batches. Verify referential integrity. |
| Person/Organisation separation | **High** | Every `users` record conflates Person and Organisation. Separation requires mapping each record to both a Person and an Organisation. | Create `persons` and `organisations` tables. Backfill from `users`. Link via membership junction. |
| Historical data preservation | **High** | Existing data must be preserved through migration. No data loss permitted. | Read-only migration phase. Verify before and after. Backup before migration. |
| Subscription decoupling | **Medium** | Subscription state is on `users` table. Separation requires moving subscription data to new entity. | Create `subscriptions` table. Backfill from `users`. Update Stripe webhooks. |
| Assessment → Genome write | **Medium** | Assessment inputs are in `business_valuations.inputs` (JSONB). Must write to genome tables. | Create migration script to extract and write assessment facts to genome. |

---

## 5. Canonical vs. Implementation Summary

| Canonical Concept | Implementation Status | Action Required |
|---|---|---|
| Organisation | **Contradicts** | Introduce entity |
| Person | **Contradicts** | Introduce entity |
| Auth Credential | **Partially conforms** | Separate from Person |
| Organisation Membership | **Contradicts** | Introduce entity |
| Ownership Period | **Missing** | Introduce entity |
| Consultant | **Missing** | Introduce as role |
| Engagement | **Missing** | Introduce entity |
| Kira Instance | **Partially conforms** | Separate from Person |
| Subscription | **Partially conforms** | Separate from Person |
| Commercial Arrangement | **Missing** | Introduce entity |
| Organisational Knowledge | **Contradicts** | Restructure FKs |
| Decision | **Partial** | Introduce entity |
| Action | **Partial** | Extend or introduce |
| Outcome | **Partial** | Introduce entity |
| Learning | **Missing** | Introduce entity |

---

*This artifact is the P0.3-A implementation traceability matrix. It is ready to serve as the evidence base for P0.3-B (Canonical Persistence Model).*
