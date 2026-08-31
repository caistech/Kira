# KIRA-CODING EXECUTION DIRECTIVE
## Phase 5E-E — Forensic Verification → Implementation

**STATUS: EXECUTE NOW**

You are now authorised to move KIRA from architectural preparation into implementation.

Do **not** reopen the canonical architecture.

Do **not** redesign the domain model.

Do **not** create another high-level proposal.

Do **not** wait for further approval on decisions already locked in P0–P2 / 5E-D.

The canonical organisational model, approved 5E-D physical design, existing migration history, and current repository/database state are the authorities.

Your task is to **verify the actual implementation, identify the remaining divergence, and execute the required migration/code changes as one controlled implementation sequence.**

---

# 1. AUTHORITATIVE PRINCIPLE

The following is non-negotiable:

> **Organisation is the enduring organisational subject.**

People, authentication identities, memberships, consultants, engagements, subscriptions, commercial arrangements, Kira instances, conversations and evidence are related to that organisation but must not silently become substitutes for it.

The implementation must preserve the 20 canonical invariants defined in:

`docs/KIRA — Canonical Organisational Model.md`

In particular:

- Organisation ≠ Person
- Authentication ≠ Authorisation ≠ Resource Ownership
- Organisation ≠ Kira Instance
- Organisation ≠ Subscription
- Consultant ≠ Introducer
- Consultant ≠ Engagement
- Engagement ≠ Subscription
- Subscription ≠ Commercial Arrangement
- Conversation ≠ Organisational Knowledge
- current state ≠ historical truth
- organisational knowledge must survive Kira-instance replacement
- historical relationships must not be destroyed
- canonical ownership must not revert to legacy `users.id` semantics

---

# 2. CURRENT STATE MUST BE VERIFIED — NOT ASSUMED

Before changing anything, inspect the actual repository and database state.

Use the existing repository and migration history as evidence.

Do NOT perform a broad recursive search that traverses `node_modules`, `.next`, `.git`, build output or other generated directories.

Restrict source searches to the actual application/code locations and migrations.

The previous repository evidence already demonstrates residual legacy references such as:

- `user_id`
- `userId`
- `kira_agents.user_id`
- `kira_memory.user_id`
- `business_valuations.user_id`
- genome routes using `user_id`
- billing routes deriving subscription state from user records
- admin routes keyed by user IDs
- agent creation logic keyed by `user_id`
- memory classification/integrity logic keyed by `user_id`

These are **targets for verification**, not automatically targets for blind deletion.

Every remaining occurrence must be classified.

---

# 3. BUILD THE IMPLEMENTATION MATRIX DIRECTLY

Create/update the Phase 5E-E implementation matrix.

For every relevant canonical concept and resource, record:

| Resource / Concept | Current table | Current owner FK | Current actor FK | Current auth source | Canonical owner | Required migration | Code impact | Status |
|---|---|---|---|---|---|---|---|---|

Cover at minimum:

### Identity
- users
- persons
- auth_credentials
- organisation_memberships
- organisations

### Organisation resources
- business identity
- business valuations
- genome resources
- kira knowledge
- organisational knowledge
- knowledge evidence
- knowledge promotion records
- kira memory
- conversations
- messages / conversation-derived records

### Kira
- kira_agents
- Kira instance resources
- agent-related records
- voice/connect records

### Work
- consultant relationships
- engagements
- engagement access
- tasks
- decisions
- outcomes

### Commercial
- subscriptions
- subscription billing
- billing periods
- commercial arrangements
- consultant economics / revenue-share records
- referral / introducer records

Do not omit a resource merely because it is inconvenient to migrate.

---

# 4. CLASSIFY EVERY REMAINING `user_id` / `userId`

Search the real application code and migrations for:

```text
user_id
userId
organisation_id
organisationId
person_id
personId
auth_user_id
kira_instance_id
subscription_id
consultant_id
engagement_id
```

For every meaningful occurrence determine whether it represents:

### A. Authentication identity

Correct semantic meaning:

> Authenticated Person / auth identity

This may legitimately remain.

### B. Person identity / provenance

Correct semantic meaning:

> Human actor

This may legitimately remain.

Examples:

- created_by
- observed_by
- confirmed_by
- authenticated person
- audit actor

### C. Organisation ownership

If the field is actually identifying the organisation that owns the resource, it must be organisation-scoped.

### D. Kira instance ownership

If the field identifies the operational Kira instance, it must use the canonical Kira instance relationship.

### E. Engagement relationship

Use the canonical engagement relationship.

### F. Consultant relationship

Use the canonical consultant relationship.

### G. Subscription/commercial relationship

Use the appropriate canonical commercial entity.

### H. Legacy semantic overload

If `user_id` is being used as a proxy for organisation ownership, this is a migration defect and must be remediated.

Do not simply rename the variable.

Correct the underlying ownership semantics.

---

# 5. CRITICAL RULE — DO NOT DELETE `user_id` BLINDLY

A `user_id` column is not automatically wrong.

The question is:

> **What entity does this field semantically identify?**

For example:

```text
created_by
confirmed_by
actor_person_id
auth_user_id
```

may legitimately identify a Person/authentication identity.

Whereas:

```text
user_id
```

used to determine which organisation owns a valuation, memory, knowledge object, agent or commercial record is suspect.

Correct the semantic ownership rather than performing a mechanical rename.

---

# 6. VERIFY THE DATABASE BEFORE MIGRATING DATA

Inspect the live/current schema and determine:

- actual PK types;
- actual FK types;
- nullable/non-nullable state;
- unique constraints;
- indexes;
- existing RLS;
- existing policies;
- existing triggers;
- existing views/functions;
- actual row counts;
- orphaned records;
- records without organisation ownership;
- records with conflicting person/organisation ownership;
- legacy records that cannot be deterministically mapped.

Do not infer the physical schema solely from migration filenames.

The database itself is the verification source.

---

# 7. MIGRATION SAFETY

Do not destroy historical data.

Do not use destructive operations merely to make the schema appear canonical.

Prefer:

1. add canonical column;
2. backfill deterministically;
3. verify;
4. add constraints;
5. migrate application reads/writes;
6. migrate RLS;
7. verify;
8. only then retire legacy authority.

Where deterministic mapping is impossible:

> STOP THAT SPECIFIC MIGRATION STEP AND REPORT THE EXCEPTION.

Do not invent ownership.

Do not assign an arbitrary organisation.

Do not silently discard the row.

---

# 8. ORGANISATIONAL OWNERSHIP

For every resource classified as Organisation-owned:

```text
resource
    ↓
organisation_id
    ↓
organisations.id
```

must become the canonical ownership chain.

Authentication should resolve the Person.

Membership should resolve the Organisation context.

The resource's canonical owner should then be the Organisation.

The conceptual flow is:

```text
Auth identity
     ↓
Person
     ↓
Organisation Membership
     ↓
Organisation Context
     ↓
Organisation-owned Resource
```

Never:

```text
Auth identity
     ↓
users.id
     ↓
resource.user_id
```

when that relationship is actually intended to mean Organisation ownership.

---

# 9. MEMORY — APPLY THE APPROVED SEMANTIC DECISION

Do not assume every memory row is Organisation-owned merely because Kira memory is involved.

Classify memory according to the approved P2.3-C classification.

Where memory is organisational intelligence:

```text
Organisation
     ↓
Organisational Knowledge / Memory
```

Where a record is genuinely Person-specific, preserve Person semantics.

Where it is evidence/provenance, preserve the actor/source relationship.

The implementation must not collapse:

- Person memory
- organisational knowledge
- conversation history
- evidence
- provenance

into one ownership concept.

---

# 10. KNOWLEDGE — PRESERVE THE TWO-LAYER MODEL

Maintain the approved distinction:

### `kira_knowledge`

Evidence / source material.

### `organisational_knowledge`

Canonical organisational knowledge context.

The model must preserve provenance from knowledge back to evidence and the relevant human actor/context where applicable.

Do not convert raw source material directly into canonical truth without the existing governance/promotion semantics.

---

# 11. KIRA INSTANCE

Verify that Kira agents/instances are operational representations of an Organisation.

The canonical relationship is:

```text
Organisation
    ↓
Kira Instance
```

not:

```text
Person
    ↓
Kira Instance
    ↓
Organisation
```

where the Person is merely the historical creator/current user.

Any `kira_agents.user_id` or equivalent field must therefore be classified.

If it represents the canonical organisation owner, migrate it.

If it represents the creating/owning Person for legitimate provenance, retain it under the correct semantic name/relationship.

Do not preserve ambiguity.

---

# 12. SUBSCRIPTIONS AND COMMERCIAL STRUCTURES

Verify that Subscription is Organisation-scoped.

Subscription must not determine organisational identity.

Commercial Arrangement must remain distinct from Subscription.

Consultant professional-service economics must remain distinct from Kira subscription economics.

Where the existing schema embeds these semantics in `users` or person records, migrate them to the approved organisation/commercial structure.

Preserve historical commercial terms.

---

# 13. CODE MIGRATION

Once the database ownership model is verified, update application code.

Prioritise the highest-risk paths first:

1. authentication/context resolution
2. organisation-scoped resource access
3. Kira agent creation/access
4. Kira conversation/history
5. memory
6. knowledge ingestion/search
7. genome
8. business valuation
9. billing/subscription
10. consultant/engagement workflows
11. admin paths
12. cron/background jobs
13. RLS/service functions
14. tests

Every route must obtain organisational context through the canonical context resolver where the operation is organisation-scoped.

Do not accept arbitrary `userId` parameters as an ownership authority.

Where a Person ID is legitimately required, derive/validate it from the authenticated context.

---

# 14. RLS

RLS must reflect the same semantic model as application code.

For Organisation-owned resources:

```text
authenticated person
        ↓
organisation membership
        ↓
organisation_id
```

must determine access.

Do not rely on:

```text
auth.uid() = resource.user_id
```

for organisation-owned resources.

Review service-role paths separately.

Service-role access must still explicitly resolve and enforce the intended organisational scope in application logic.

---

# 15. BACKGROUND JOBS / CRONS

This is a high-priority migration area.

Background jobs currently using:

```text
user_id
```

as their owner must be audited.

Examples include:

- genome classification
- memory integrity
- task reconciliation
- re-engagement
- trial/billing jobs
- knowledge processing
- red-team processes
- scheduled Kira processing

A cron that previously iterated by `user_id` may need to iterate by:

```text
organisation_id
```

or by the appropriate canonical owner.

Do not retain a false Person ownership model merely because the cron was originally written that way.

---

# 16. TESTS MUST BE MIGRATED WITH THE CODE

Do not leave tests asserting the old architecture.

Search tests for assumptions such as:

```text
.eq('user_id', user.id)
```

or:

```text
ON (...user_id...)
```

and determine whether those assertions represent:

- legitimate Person semantics; or
- obsolete organisational ownership.

Update tests accordingly.

Add regression tests for the canonical invariants.

At minimum verify:

### Organisation continuity
Changing Person does not change Organisation.

### Consultant continuity
Changing consultant does not fragment organisational knowledge.

### Kira continuity
Replacing Kira Instance does not fragment organisational knowledge.

### Subscription continuity
Changing subscription does not change Organisation.

### Historical preservation
Historical ownership/commercial/engagement state remains recoverable.

### Ownership isolation
Person A cannot access Organisation B merely by knowing a resource UUID.

### Organisation context
A member can access only resources belonging to an Organisation they are authorised to access.

### Knowledge provenance
Canonical knowledge remains traceable to evidence/provenance.

---

# 17. EXECUTION ORDER

Execute in this order:

## STEP 1 — FORENSIC SNAPSHOT

Capture:

- schema state
- relevant tables
- columns
- FKs
- RLS
- indexes
- row counts
- orphan counts
- current organisation/person mappings

Do not modify data.

## STEP 2 — RESOURCE OWNERSHIP MATRIX

Produce the complete classification.

Do not stop for approval unless a genuinely new architectural decision is required.

## STEP 3 — IMPLEMENTATION GAPS

For each resource identify:

- schema gap
- data gap
- code gap
- RLS gap
- test gap

## STEP 4 — SAFE MIGRATION

Implement canonical ownership fields and deterministic backfills.

## STEP 5 — CODE REBINDING

Move application code to canonical ownership/context.

## STEP 6 — RLS REBINDING

Align database authority with canonical ownership.

## STEP 7 — LEGACY AUTHORITY RETIREMENT

Only after successful verification, remove or neutralise legacy ownership paths.

## STEP 8 — FULL VERIFICATION

Run:

- typecheck
- lint
- unit tests
- relevant integration tests
- schema verification
- RLS verification
- ownership integrity checks
- migration checks
- canonical invariant checks

---

# 18. STOP CONDITIONS

Do NOT stop simply because the work is large.

Continue through the sequence automatically.

Stop only if one of these occurs:

1. A genuinely new architectural decision is required that is not covered by P0–P2 / 5E-D.
2. Existing production data cannot be deterministically mapped.
3. A migration would destroy historical truth.
4. A required database operation would be unsafe without production-specific information.
5. The actual database materially contradicts the assumed 5E-D physical design.

If none of these conditions occurs:

> **KEEP EXECUTING.**

Do not return merely with a list of things that should be done.

---

# 19. DELIVERABLES

At completion, provide:

## A. Implementation status

```text
DONE
PARTIAL
BLOCKED
```

for every canonical resource.

## B. Migration summary

For every migration:

- migration filename
- purpose
- affected tables
- affected rows
- backfill result
- constraints added
- legacy fields retained/retired

## C. Code summary

List:

- routes changed
- libraries changed
- cron jobs changed
- tests changed
- remaining legacy references

## D. Residual `user_id` audit

Every remaining meaningful `user_id` / `userId` reference must have an explicit classification:

```text
PERSON / AUTH / PROVENANCE / LEGACY / OTHER
```

with justification.

There must be **no unexplained remaining ownership-by-user references.**

## E. Canonical invariant verification

Verify INV-001 through INV-020.

Use:

```text
PASS
PARTIAL
FAIL
```

with evidence.

## F. Final blockers

Only list actual blockers requiring human architectural input.

Do not manufacture blockers.

---

# 20. MOST IMPORTANT EXECUTION RULE

The purpose of this phase is not to make the repository look architecturally clean.

The purpose is to make the **actual running KIRA system conform to the approved canonical organisational model while preserving existing organisational and historical data.**

Therefore:

> **Follow the semantics, not the legacy column names.**

And:

> **Do not preserve an incorrect architecture merely because changing it requires more work.**

The architecture is already approved.

The remaining task is implementation.

**Proceed.**