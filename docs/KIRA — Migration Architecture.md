# KIRA — Migration Architecture

**Status:** Implementation Architecture
**Purpose:** Define how existing Kira data is translated into the canonical model without semantic loss
**Scope:** Migration semantics, identity resolution, temporal reconstruction, knowledge migration, ambiguity handling
**Prerequisite:** P0.3-A through P0.3-E
**Date:** 26 August 2026

---

## 1. Purpose and Governing Principle

The purpose of this artifact is to define the **migration architecture** that translates the existing Kira implementation into the new canonical model.

The governing principle is:

> **Migration must preserve historical evidence even where the existing implementation cannot support a confident canonical interpretation.**

The migration process must never silently convert uncertainty into canonical truth. It is a controlled act of interpretation with provenance, not a one-time destructive conversion.

---

## 2. Migration Source Reality

Before mapping begins, we establish what actually exists in today's Kira implementation.

### 2.1 Source Data Inventory

| Category | Source Tables | Canonical Target | Mapping Confidence |
|----------|--------------|------------------|-------------------|
| **Organisation** | `users` (conflated), `business_identity` | Organisation | Contradicts |
| **Person** | `users` (conflated), `auth.users` | Person | Contradicts |
| **Auth Credential** | `users.auth_user_id`, `auth.users` | Auth Credential | Partial |
| **Organisation Membership** | `users` → `business_identity` (1:1) | Organisation Membership | Contradicts |
| **Ownership Period** | None (implicit in `subscription_status`) | Ownership Period | Missing |
| **Consultant** | None (only `introducers`) | Consultant | Missing |
| **Engagement** | None (only `introductions`) | Engagement | Missing |
| **Kira Instance** | `kira_agents` (FK to `user_id`) | Kira Instance | Partial |
| **Subscription** | `users.subscription_status`, `users.stripe_*` | Subscription | Partial |
| **Commercial Arrangement** | None (pricing in code) | Commercial Arrangement | Missing |
| **Organisational Knowledge** | `genome_entities`, `genome_facts`, `kira_memory`, `conversations`, `kira_knowledge` (all FK to `user_id`) | Organisational Knowledge | Contradicts |
| **Decision** | `kira_memory.memory_type = 'decision'` | Decision | Partial |
| **Action** | `kira_tasks` | Action | Partial |
| **Outcome** | `kira_tasks.result` | Outcome | Partial |
| **Learning** | None | Learning | Missing |
| **Evidence** | `genome_events`, `conversations`, `conversation_messages` | Evidence Record | Partial |
| **State** | `genome_events` (mutation audit) | Organisational State | Partial |
| **Temporal** | `supersedes` chains, `genome_events` | Temporal Model | Partial |

### 2.2 Source Data Volume (Approximate)

| Table | Approximate Volume | Migration Complexity |
|-------|-------------------|---------------------|
| `users` | ~1,000 records | High (Person + Organisation + Membership separation) |
| `business_identity` | ~500 records | Medium (Organisation attributes) |
| `kira_agents` | ~2,000 records | Medium (Kira Instance linkage) |
| `conversations` | ~50,000 records | Low (Evidence source) |
| `conversation_messages` | ~500,000 records | Low (Evidence source) |
| `kira_memory` | ~10,000 records | High (Assertion/Inference extraction) |
| `genome_entities` | ~5,000 records | Medium (Organisational Knowledge linkage) |
| `genome_facts` | ~15,000 records | Medium (Organisational Knowledge linkage) |
| `genome_events` | ~20,000 records | Low (Historical evidence) |
| `kira_tasks` | ~5,000 records | Medium (Action/Outcome linkage) |
| `kira_knowledge` | ~3,000 records | Low (Evidence source) |
| `introductions` | ~500 records | Low (Referral attribution, not Engagement) |

---

## 3. Canonical Mapping Classification

Every existing data object is classified into one of nine mapping categories.

### 3.1 Classification Definitions

| Category | Definition | Action |
|----------|-----------|--------|
| **Directly Mappable** | Existing data maps cleanly to canonical model with no ambiguity | Map directly |
| **Transformable** | Existing data requires transformation to fit canonical model | Transform with provenance |
| **Aggregatable** | Multiple existing records represent one canonical entity | Aggregate with consolidation rules |
| **Splittable** | One existing record contains data for multiple canonical entities | Split with attribution rules |
| **Derived** | Canonical object is deterministically derived from existing data | Derive with formula and provenance |
| **Historical Evidence Only** | Valid historical evidence but not current canonical state | Preserve as evidence, exclude from current state |
| **Ambiguous** | Multiple canonical interpretations possible | Preserve with resolution queue |
| **Insufficient** | Existing data does not support interpretation | Preserve as evidence, flag for resolution |
| **Obsolete** | Legacy information cannot legitimately enter canonical model | Preserve historically, exclude from all canonical views |

### 3.2 Mapping Rules by Canonical Entity

#### Organisation

| Existing Record | Classification | Canonical Target | Notes |
|-----------------|---------------|------------------|-------|
| `users` record with `business_identity` | **Aggregatable** | Organisation | Multiple `users` records may represent the same Organisation |
| `business_identity.legal_name` | **Directly Mappable** | Organisation.legal_name | |
| `business_identity.abn` | **Directly Mappable** | Organisation.abn | |
| `business_identity.entity_type` | **Directly Mappable** | Organisation.entity_type | |
| `users.created_at` | **Derived** | Organisation.created_at | Use earliest associated record timestamp |
| `users.subscription_status` | **Splittable** | Organisation → Subscription | Subscription state is separate from Organisation |

#### Person

| Existing Record | Classification | Canonical Target | Notes |
|-----------------|---------------|------------------|-------|
| `users` record | **Splittable** | Person + Organisation Membership | Person identity separated from membership |
| `users.email` | **Directly Mappable** | Person.email | Contact email |
| `users.first_name`, `users.last_name` | **Directly Mappable** | Person.first_name, Person.last_name | |
| `users.auth_user_id` | **Transformable** | Auth Credential | Link to Supabase Auth |
| `users.created_at` | **Derived** | Person.created_at | Use user creation timestamp |

#### Organisation Membership

| Existing Record | Classification | Canonical Target | Notes |
|-----------------|---------------|------------------|-------|
| `users` record | **Derived** | Organisation Membership | Membership implied by user existence |
| `users.created_at` | **Derived** | Membership.valid_from | Use user creation timestamp |
| `users.subscription_status` | **Historical Evidence Only** | Membership.status | Subscription status is not membership status |
| `business_identity.owner_name` | **Derived** | Membership.role = 'owner' | Owner role implied |

#### Ownership Period

| Existing Record | Classification | Canonical Target | Notes |
|-----------------|---------------|------------------|-------|
| None | **Insufficient** | Ownership Period | No temporal ownership data exists |
| `business_identity.owner_name` | **Derived** | Ownership Period.person_id | Current owner only, no temporal scope |

#### Consultant

| Existing Record | Classification | Canonical Target | Notes |
|-----------------|---------------|------------------|-------|
| `introducers` table | **Ambiguous** | Consultant OR Introducer | Must not conflate introducer with consultant |
| `introducer_owner_projection` | **Historical Evidence Only** | Introducer relationship | Referral attribution, not consultant relationship |

#### Engagement

| Existing Record | Classification | Canonical Target | Notes |
|-----------------|---------------|------------------|-------|
| `introductions` table | **Historical Evidence Only** | Introductions (not Engagement) | Referral attribution, not bounded intervention |
| `kira_tasks` | **Transformable** | Action | Tasks may be evidence of engagement activity |

#### Kira Instance

| Existing Record | Classification | Canonical Target | Notes |
|-----------------|---------------|------------------|-------|
| `kira_agents` record | **Directly Mappable** | Kira Instance | Agent = Kira Instance |
| `kira_agents.user_id` | **Transformable** | Kira Instance.organisation_id | Link via backfilled Organisation |
| `kira_agents.version` | **Directly Mappable** | Kira Instance.version | |
| `kira_agents.created_at` | **Derived** | Kira Instance.valid_from | |

#### Subscription

| Existing Record | Classification | Canonical Target | Notes |
|-----------------|---------------|------------------|-------|
| `users.subscription_status` | **Directly Mappable** | Subscription.status | |
| `users.stripe_subscription_id` | **Directly Mappable** | Subscription.stripe_subscription_id | |
| `users.subscription_started_at` | **Directly Mappable** | Subscription.valid_from | |
| `users.subscription_ends_at` | **Directly Mappable** | Subscription.valid_to | |
| `users.stripe_customer_id` | **Directly Mappable** | Subscription.stripe_customer_id | |

#### Organisational Knowledge

| Existing Record | Classification | Canonical Target | Notes |
|-----------------|---------------|------------------|-------|
| `genome_entities` | **Transformable** | Organisational Knowledge (assertions) | FK restructure from `user_id` to `organisation_id` |
| `genome_facts` | **Transformable** | Organisational Knowledge (assertions) | FK restructure from `user_id` to `organisation_id` |
| `kira_memory` (memory_type ≠ 'decision') | **Transformable** | Evidence Record | Conversation-derived evidence |
| `kira_memory` (memory_type = 'decision') | **Transformable** | Decision | Decision-tagged memory |
| `conversations` | **Historical Evidence Only** | Evidence Record | Raw conversation is evidence, not knowledge |
| `conversation_messages` | **Historical Evidence Only** | Evidence Record | Raw messages are evidence |
| `kira_knowledge` | **Transformable** | Evidence Record | Document-derived evidence |
| `genome_events` | **Historical Evidence Only** | Historical evidence | Mutation audit trail |

#### Decision

| Existing Record | Classification | Canonical Target | Notes |
|-----------------|---------------|------------------|-------|
| `kira_memory` (memory_type = 'decision') | **Transformable** | Decision | Extract and enrich with provenance |
| `genome_events` (decision-related) | **Historical Evidence Only** | Historical evidence | Not a first-class decision |

#### Action

| Existing Record | Classification | Canonical Target | Notes |
|-----------------|---------------|------------------|-------|
| `kira_tasks` | **Transformable** | Action | Map task status to action status |
| `kira_tasks.result` | **Transformable** | Outcome | Task result = outcome |

#### Outcome

| Existing Record | Classification | Canonical Target | Notes |
|-----------------|---------------|------------------|-------|
| `kira_tasks.result` | **Transformable** | Outcome | Task result as outcome evidence |

#### Learning

| Existing Record | Classification | Canonical Target | Notes |
|-----------------|---------------|------------------|-------|
| None | **Insufficient** | Learning | No learning records exist |

---

## 4. Historical Preservation

### 4.1 Invariant

> **Existing information that cannot yet be confidently mapped should not be deleted simply because it doesn't fit the new schema.**

### 4.2 Preservation Pipeline

```
Legacy Data
    │
    ├── Confidently mapped → Canonical model
    │
    ├── Partially mapped → Canonical + provenance
    │
    ├── Ambiguous → Preserved + resolution required
    │
    └── Obsolete → Preserved historically, excluded from current state
```

### 4.3 Preservation Rules

1. **No destructive migration.** All existing data is preserved in its original form before migration begins.
2. **Immutable migration log.** Every migration decision is recorded with rationale, confidence, and evidence.
3. **Ambiguity queue.** Ambiguous mappings are flagged for human resolution, not silently resolved.
4. **Historical evidence preserved.** Raw conversations, messages, and events are preserved as evidence, not discarded.
5. **Supersession chains preserved.** Existing supersession chains in `genome_entities`/`genome_facts` are preserved through migration.

---

## 5. Identity Resolution

### 5.1 The Problem

The existing Kira system has no explicit Organisation entity. Every `users` record conflates Person, Organisation, Membership, and Auth Credential. The migration must separate these without creating duplicate Organisations.

### 5.2 Canonical Mapping Rules

#### Organisation Resolution

| Rule | Description | Example |
|------|-------------|---------|
| **ABN match** | If two `users` records have the same `business_identity.abn`, they represent the same Organisation | Two accounts for ABC Pty Ltd (ABN 12345678901) → one Organisation |
| **Legal name match** | If two `users` records have the same `business_identity.legal_name` (case-insensitive), they likely represent the same Organisation | "ABC Engineering" and "abc engineering" → one Organisation |
| **Email domain match** | If two `users` records share an email domain and similar business identity, they likely represent the same Organisation | john@abc.com and jane@abc.com with similar business_identity → investigate |
| **No match** | If no match is found, a new Organisation is created | |

#### Person Resolution

| Rule | Description | Example |
|------|-------------|---------|
| **Email match** | If two `users` records have the same email, they represent the same Person | john@abc.com in two accounts → one Person |
| **Auth user match** | If two `users` records reference the same `auth_user_id`, they represent the same Person | Same Supabase Auth user → one Person |
| **No match** | If no match is found, a new Person is created | |

#### Consultant Resolution

| Rule | Description | Example |
|------|-------------|---------|
| **Introducer ≠ Consultant** | `introducers` records are NOT Consultants. They are Introducers (referral attribution) | `introducer_id = 42` → Introducer, not Consultant |
| **No consultant data** | If no consultant relationship data exists, no Consultant record is created | |
| **Future resolution** | Consultant relationships will be created through new Engagement records, not migration | |

### 5.3 Consolidation Procedure

1. **ABN deduplication:** Group `users` records by `business_identity.abn`. Within each group, designate one record as the canonical Organisation source.
2. **Email deduplication:** Group `users` records by `email`. Within each group, designate one record as the canonical Person source.
3. **Cross-reference:** Link Person records to Organisation records via the backfilled membership junction table.
4. **Preserve ambiguity:** Where deduplication is uncertain, preserve both records and flag for human resolution.

---

## 6. Temporal Reconstruction

### 6.1 The Problem

The existing Kira system has limited temporal data. Timestamps exist (`created_at`, `updated_at`, `started_at`, `ended_at`), but there is no explicit temporal model for ownership, membership, or consultant relationships.

### 6.2 Temporal Mapping Rules

| Legacy Timestamp | Canonical Mapping | Confidence |
|-----------------|------------------|------------|
| `users.created_at` | Person.created_at, Membership.valid_from, Organisation.created_at, Subscription.valid_from | High |
| `users.updated_at` | Updated timestamp (not temporal range) | High |
| `kira_agents.created_at` | Kira Instance.valid_from | High |
| `kira_agents.updated_at` | Updated timestamp | High |
| `conversations.started_at` | Evidence observed_at | High |
| `conversations.ended_at` | Evidence end timestamp | High |
| `genome_events.created_at` | Historical evidence timestamp | High |
| `genome_entities.observed_at` | Evidence observed_at | High |
| `genome_facts.observed_at` | Evidence observed_at | High |
| `genome_entities.superseded_at` | Supersession timestamp | High |
| `genome_facts.superseded_at` | Supersession timestamp | High |

### 6.3 Temporal Boundaries

Where temporal boundaries are not explicitly recorded, the migration uses bounded estimates:

| Scenario | Temporal Boundary |
|----------|------------------|
| Start date known | Use known date |
| Start date unknown | Use `created_at` of earliest associated record |
| End date known | Use known date |
| End date unknown | Use NULL (still active) or `updated_at` of latest associated record |
| Ownership period unknown | Use NULL (still active) or earliest known owner record |

### 6.4 Temporal Integrity

The migration must not invent temporal data that doesn't exist. Where temporal boundaries are uncertain, they are marked as `provenance = 'legacy-derived'` with confidence scores.

---

## 7. Knowledge Migration

### 7.1 The Problem

The existing Kira system stores knowledge in multiple tables (`genome_entities`, `genome_facts`, `kira_memory`, `conversations`, `kira_knowledge`), all FK'd to `user_id`. The migration must restructure these to FK to `organisation_id` while preserving provenance and attribution.

### 7.2 Knowledge Migration Pipeline

```
Conversation / Legacy Record
    │
    ▼
Evidence Assessment
    │
    ├── Sufficient evidence → Assertion extraction
    │                           │
    │                           ▼
    │                     Confidence scoring
    │                           │
    │                           ▼
    │                     Knowledge creation
    │
    └── Insufficient evidence → Preserve as evidence only
                                (do not fabricate knowledge)
```

### 7.3 Knowledge Migration Rules

| Rule | Description |
|------|-------------|
| **Evidence preserved** | Raw conversations and messages are preserved as evidence, not discarded |
| **Knowledge extracted** | Where evidence supports it, assertions and inferences are extracted |
| **Confidence scored** | Every extracted knowledge item has a confidence score |
| **Provenance attributed** | Every knowledge item is attributed to its source (conversation, document, person) |
| **Supersession preserved** | Existing supersession chains are preserved through migration |
| **No fabrication** | Where evidence is insufficient, knowledge is NOT created. Evidence is preserved only. |

### 7.4 Knowledge Migration Mapping

| Source Table | Target Table | Mapping | Notes |
|--------------|-------------|---------|-------|
| `genome_entities` | `organisational_knowledge` (via assertions) | Transformable | Restructure FK, preserve entity type |
| `genome_facts` | `organisational_knowledge` (via assertions) | Transformable | Restructure FK, preserve fact structure |
| `kira_memory` (memory_type ≠ 'decision') | `evidence_records` | Transformable | Conversation-derived evidence |
| `kira_memory` (memory_type = 'decision') | `decisions` | Transformable | Decision extraction with provenance |
| `conversations` | `evidence_records` | Historical Evidence Only | Raw conversation as evidence |
| `conversation_messages` | `evidence_records` | Historical Evidence Only | Raw messages as evidence |
| `kira_knowledge` | `evidence_records` | Transformable | Document-derived evidence |
| `genome_events` | `historical_evidence` | Historical Evidence Only | Mutation audit trail |

---

## 8. Migration Confidence and Unresolved State

### 8.1 Migration Outcome Classification

| Outcome | Meaning | Action |
|---------|---------|--------|
| **Confirmed** | Existing evidence clearly supports canonical mapping | Migrate with full confidence |
| **Derived** | Canonical object is deterministically derived from existing data | Migrate with derived provenance |
| **Probable** | Strong evidence but not definitive | Migrate with qualification |
| **Ambiguous** | Multiple canonical interpretations possible | Preserve with resolution queue |
| **Insufficient** | Existing data does not support interpretation | Preserve as evidence, flag for resolution |
| **Historical-only** | Valid historical evidence but not current canonical state | Preserve historically, exclude from current state |
| **Rejected** | Legacy information cannot legitimately enter canonical model | Preserve historically, excluded from all canonical views |

### 8.2 Resolution Queue

Ambiguous and Insufficient mappings are placed in a **Resolution Queue** for human review. The queue captures:

| Field | Description |
|-------|-------------|
| `legacy_record_id` | The source record |
| `legacy_table` | The source table |
| `canonical_entity` | The target canonical entity |
| `interpretation_options` | Possible canonical mappings |
| `confidence_scores` | Confidence for each interpretation |
| `required_evidence` | What additional evidence would resolve the ambiguity |
| `assigned_to` | Person responsible for resolution |
| `status` | open, resolved, rejected |

### 8.3 Migration Log

Every migration decision is recorded in a **Migration Log** with:

| Field | Description |
|-------|-------------|
| `migration_id` | Unique identifier |
| `legacy_record_id` | The source record |
| `legacy_table` | The source table |
| `canonical_entity` | The target canonical entity |
| `canonical_record_id` | The created canonical record (if mapped) |
| `mapping_classification` | Directly Mappable, Transformable, etc. |
| `confidence` | Migration confidence score |
| `rationale` | Why this mapping was chosen |
| `evidence` | What evidence supports this mapping |
| `created_at` | When the migration decision was made |

---

## 9. Migration Phases

### Phase 1: Preparation (Read-Only)

1. **Full data inventory.** Catalogue every table, column, and record.
2. **Identity resolution.** Identify Organisation and Person boundaries.
3. **Temporal reconstruction.** Establish temporal boundaries from available timestamps.
4. **Knowledge assessment.** Classify every knowledge record by migration confidence.
5. **Backup.** Full database backup before any migration begins.

### Phase 2: Schema Creation

1. **Create canonical tables.** `organisations`, `persons`, `auth_credentials`, `organisation_memberships`, `ownership_periods`, `engagements`, `engagement_participants`, `kira_instances`, `subscriptions`, `commercial_arrangements`.
2. **Create knowledge tables.** `organisational_states`, `evidence_records`, `assertions`, `inferences`, `confidence_scores`, `state_transitions`, `provenance_records`, `knowledge_supersession`.
3. **Create migration tables.** `migration_log`, `resolution_queue`.

### Phase 3: Data Migration (Non-Destructive)

1. **Backfill Organisations.** Create Organisation records from `users` + `business_identity`.
2. **Backfill Persons.** Create Person records from `users`.
3. **Backfill Auth Credentials.** Create Auth Credential records from `users.auth_user_id`.
4. **Backfill Memberships.** Create Organisation Membership records linking Persons to Organisations.
5. **Backfill Ownership Periods.** Create Ownership Period records from `users` + `business_identity.owner_name`.
6. **Backfill Kira Instances.** Create Kira Instance records from `kira_agents`.
7. **Backfill Subscriptions.** Create Subscription records from `users.subscription_status`.
8. **Restructure Knowledge FKs.** Update all genome/memory/knowledge table FKs from `user_id` to `organisation_id`.
9. **Extract Knowledge.** Extract assertions and inferences from `genome_entities`, `genome_facts`, `kira_memory`.
10. **Record Migration Decisions.** Log every migration decision in `migration_log`.

### Phase 4: Validation

1. **Referential integrity.** Verify all FKs resolve correctly.
2. **Temporal consistency.** Verify temporal boundaries are valid (valid_from < valid_to).
3. **Knowledge completeness.** Verify all migrated knowledge has provenance.
4. **Ambiguity resolution.** Review and resolve items in the Resolution Queue.
5. **Invariant compliance.** Verify all P0.1 invariants are satisfied by the migrated data.

### Phase 5: Cutover

1. **Switch API routes** to use canonical model.
2. **Deprecate legacy routes** (do not delete).
3. **Monitor** for migration issues.
4. **Resolve** any remaining ambiguities.

---

## 10. Rollback Strategy

### 10.1 Rollback Principles

1. **No destructive cutover.** Legacy tables are never deleted during migration. They are deprecated.
2. **Reversible migration.** Every migration step has a corresponding rollback step.
3. **Point-in-time recovery.** Database backups at each phase boundary enable point-in-time recovery.
4. **Feature flag cutover.** API routes are switched via feature flags, not code deployment.

### 10.2 Rollback Triggers

| Trigger | Action |
|---------|--------|
| Referential integrity failure | Rollback to Phase 2, fix FK issues |
| Knowledge completeness failure | Rollback to Phase 3, fix extraction |
| Invariant compliance failure | Rollback to Phase 3, fix mapping |
| Performance degradation | Rollback to Phase 4, optimise |
| Data loss detected | Rollback to Phase 1, restore from backup |

---

## 11. Invariant Compliance Check

P0.3-F produces an explicit result for each P0.1 invariant:

| Invariant | Current Kira Data Support | Migration Action |
|-----------|--------------------------|------------------|
| Organisation identity persists | **Partial** — `users` + `business_identity` | Create Organisation, separate from Person |
| Person persists independently | **No** — Person = User | Create Person, separate from Organisation |
| Ownership is temporal | **No** — No temporal ownership | Create Ownership Periods from available evidence |
| Consultant ≠ Introducer | **Yes** — Correctly separated | Preserve separation |
| Engagement is first-class | **No** — No Engagement entity | Create Engagement from new activity, not migration |
| Knowledge belongs to Organisation | **No** — FK to `user_id` | Restructure FKs to `organisation_id` |
| Historical truth preserved | **Partial** — `supersedes` chains exist | Preserve chains, add provenance |
| Provenance survives | **Partial** — `source_type` exists on genome tables | Enrich with migration provenance |
| Temporal reconstruction possible | **Partial** — Timestamps exist | Reconstruct temporal boundaries from timestamps |
| Commercial terms are temporal | **No** — Pricing in code | Create Commercial Arrangement from new activity |

---

*This artifact is the P0.3-F migration architecture. It is ready to serve as the basis for P0.3-G (Compatibility & Transition Architecture).*
