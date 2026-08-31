# KIRA CODING — EXECUTION & VERIFICATION DIRECTIVE
## Phase 5E-E → Implementation Execution

**Authority:**  
- KIRA Canonical Organisational Model — LOCKED
- P0–P2 architectural decisions already completed
- 5E-D — Physical Target Schema & Migration Mapping — LOCKED
- 5E-E — Implementation Preparation & Execution Specification — LOCKED/APPROVED
- Actual KIRA repository and Supabase migration state are the verification source of truth

**Mode:** EXECUTION + FORENSIC VERIFICATION

---

## 1. Mission

Stop producing further architectural designs.

Your task now is to **execute the approved migration/implementation plan against the actual KIRA repository and database state**, while continuously verifying that implementation remains faithful to the locked canonical model.

The objective is to move KIRA from:

> **architecturally specified**

to:

> **physically implemented, verified, tested and migration-safe.**

Do not redesign the canonical model.

Do not reinterpret its invariants to accommodate legacy code.

Do not create another architecture document unless explicitly required as an execution artifact.

Where existing implementation conflicts with the locked architecture, **change the implementation**, not the architecture.

---

# 2. Non-Negotiable Authority

The following are immutable during this execution phase:

### Canonical subject

**Organisation is the enduring organisational subject.**

### Identity separation

The following must remain distinct:

- Person
- Organisation
- Authentication identity
- Organisation membership/context
- Ownership
- Consultant relationship
- Engagement
- Kira Instance
- Subscription
- Commercial Arrangement
- Organisational Knowledge
- Evidence
- Conversation/interaction history

### Core invariants

All INV-001 through INV-020 remain authoritative.

In particular:

- INV-001 Organisation persistence
- INV-002 Person/role separation
- INV-003 Ownership temporalisation
- INV-004 Consultant first-class status
- INV-005 Engagement first-class status
- INV-006 Consultant/Introducer separation
- INV-007 Engagement/Subscription separation
- INV-008 Kira/Organisation separation
- INV-009 Memory/Instance separation
- INV-010 Conversation/Knowledge separation
- INV-011 Knowledge provenance
- INV-012 Temporal knowledge
- INV-013 Commercial truth
- INV-014 Commercial versioning
- INV-015 Paid Kira service
- INV-016 Consultant economics separation
- INV-017 Continuity
- INV-018 No implementation-defined semantics
- INV-019 Historical preservation
- INV-020 Organisational subject primacy

---

# 3. First Rule — Inspect Before Editing

Before making any code or migration change:

1. Inspect the current repository.
2. Inspect the relevant migration history.
3. Inspect the actual schema where possible.
4. Inspect existing implementation of the affected resource.
5. Identify current foreign keys and ownership columns.
6. Identify RLS policies.
7. Identify application routes/services touching the resource.
8. Identify tests covering the resource.
9. Determine whether the approved migration has already been partially implemented.
10. Determine whether existing data could be affected.

Do **not** assume that the repository state matches the architectural documents.

The repository/database is the physical verification source.

---

# 4. Treat Existing `user_id` Usage as Suspicious, Not Automatically Wrong

The presence of `user_id` does not itself prove an architectural violation.

For every remaining `user_id` / `userId` reference determine its semantic meaning.

Classify it as one of:

### A. Authentication identity

Valid where the value represents the authenticated Supabase auth identity.

### B. Person identity

Valid where the value explicitly identifies a Person.

### C. Provenance actor

Valid where the value identifies the person who performed an action or supplied evidence.

### D. Organisation ownership

INVALID if represented merely through a Person/user identifier where canonical ownership requires Organisation.

### E. Legacy compatibility

Temporary only.

Every compatibility reference must have an explicit reason and a migration/removal path.

### F. Unknown

Stop and investigate.

Do not blindly rename fields.

The goal is semantic correctness, not textual replacement.

---

# 5. Execute Resource Ownership Migration

Use the approved 5E-D resource migration mapping as the authority.

For every resource identified as Organisation-owned:

1. Ensure a canonical `organisation_id` exists.
2. Populate it from the authoritative Person → Membership → Organisation relationship where required.
3. Validate that every migrated row resolves to exactly the intended organisation.
4. Establish the appropriate foreign key.
5. Establish appropriate indexes.
6. Update RLS.
7. Update server-side queries.
8. Update writes/inserts.
9. Update mutations/deletes.
10. Update background jobs.
11. Update admin interfaces.
12. Update tests.
13. Remove reliance on Person ownership where no longer semantically required.

Do not perform destructive deletion of legacy ownership information until the approved migration plan explicitly permits it.

---

# 6. Resource-by-Resource Execution

For each affected resource create an execution record internally containing:

```text
RESOURCE
---------
Current owner:
Canonical owner:
Current ownership column:
Target ownership column:
Migration source:
Data migration required:
FK required:
RLS change required:
Application changes required:
Background-job changes required:
Tests required:
Legacy compatibility required:
Removal condition:
Verification result:
```

Do this for every resource in the approved migration matrix.

Do not skip a resource because it appears to be "probably already fixed."

Verify it.

---

# 7. Knowledge Layer — Special Handling

The distinction between:

### `kira_knowledge`

and:

### `organisational_knowledge`

is authoritative.

Treat them according to the approved knowledge architecture.

Do not collapse them.

Do not treat raw conversation history as organisational memory.

For knowledge-related implementation verify:

- organisation ownership;
- evidence/provenance;
- source identity;
- creator/provenance actor;
- temporal semantics;
- promotion state;
- historical preservation;
- RLS;
- retrieval;
- ingestion;
- semantic search;
- chunk ownership;
- memory/knowledge boundaries.

Any route that accepts a caller-supplied organisation or user identifier must be examined for authority escalation.

---

# 8. Kira Instance Separation

Verify that:

> Kira Instance ≠ Organisation.

For all agent/Kira-instance flows determine:

- how the instance identifies its Organisation;
- how authenticated Person identity is resolved;
- whether `user_id` is legacy Person ownership or incorrectly acting as Organisation identity;
- whether replacing an instance preserves organisational knowledge;
- whether instance creation can accidentally create organisational identity;
- whether agent-level RLS is aligned with Organisation authority.

The following architectural property must hold:

```text
Organisation
     │
     ├── Kira Instance A
     ├── Kira Instance B
     └── Kira Instance C
```

not:

```text
Kira Instance
     │
     └── defines Organisation
```

---

# 9. Subscription / Commercial Structures

Execute the approved commercial mapping.

Verify that:

- Subscription is Organisation-scoped.
- Commercial Arrangement is distinct from Subscription.
- Consultant economics remain distinct from Kira subscription economics.
- Historical commercial terms are preserved.
- Pricing changes do not rewrite historical truth.
- Consultant revenue-share structures are not encoded into Organisation identity.
- Introductory/white-label experiences do not accidentally create a free-service semantic model.

Do not redesign the commercial model during execution.

---

# 10. Ownership Temporalisation

Verify the actual `ownership_periods` implementation.

The required question is not:

> "Does the table exist?"

The required question is:

> "Can KIRA reconstruct ownership history correctly?"

Verify:

- owner Person;
- Organisation;
- start date;
- end date where applicable;
- overlapping periods;
- historical ownership;
- current ownership;
- transitions;
- RLS;
- application usage.

If the physical structure exists but historical ownership cannot actually be reconstructed, classify INV-003 as **PARTIAL** and implement the approved remediation.

---

# 11. Consultant / Engagement Execution

Verify the actual implementation of:

```text
Organisation
   │
   ├── Consultant Relationship
   │
   └── Engagement
          │
          ├── consultant participation
          ├── organisational participants
          └── organisational knowledge
```

Ensure that:

- Consultant ≠ Engagement.
- Consultant ≠ Introducer.
- Engagement ≠ Subscription.
- completed engagements remain historical;
- consultant replacement does not destroy organisational continuity;
- engagement-produced knowledge remains attached to the Organisation.

---

# 12. Authentication vs Authorisation vs Ownership

Maintain this three-layer distinction everywhere:

```text
AUTHENTICATION
Who is this Person?

        ↓

ORGANISATIONAL CONTEXT
Which Organisation(s) may this Person act within?

        ↓

RESOURCE OWNERSHIP
Which Organisation owns this resource?
```

Never infer resource ownership merely from:

```text
auth.uid()
```

and never assume:

```text
Person = Organisation
```

unless the canonical schema explicitly establishes that relationship.

---

# 13. Route Audit

Perform a targeted audit of all application routes and services touching:

- authentication;
- organisation context;
- users/persons;
- knowledge;
- memory;
- genome;
- conversations;
- messages;
- Kira agents;
- Kira instances;
- subscriptions;
- billing;
- valuations;
- tasks;
- consultant relationships;
- engagements;
- ownership;
- commercial structures;
- background jobs;
- admin interfaces.

For each route determine:

```text
AUTHENTICATION SOURCE
        ↓
PERSON
        ↓
ORGANISATION CONTEXT
        ↓
RESOURCE OWNER
```

If the route instead performs:

```text
auth user
   ↓
user_id
   ↓
resource
```

determine whether that is semantically legitimate.

If not, rebind it.

---

# 14. Eliminate Caller-Supplied Ownership Authority

Any route accepting parameters such as:

```text
userId
user_id
organisationId
organisation_id
```

must be inspected.

A caller-supplied identifier must never become authoritative merely because it was supplied by the client.

Where organisation context is required:

> derive it from authenticated identity + canonical membership/context unless the operation is explicitly an authorised administrative/service operation.

Where an identifier is supplied for lookup:

> verify that the authenticated actor has authority over the referenced resource.

Pay particular attention to:

- GET routes;
- mutation routes;
- admin routes;
- webhook routes;
- ElevenLabs callbacks;
- cron jobs;
- ingestion routes;
- knowledge routes;
- genome routes.

---

# 15. RLS Verification

Do not assume that successful SQL migrations imply correct security.

For every migrated Organisation-owned resource verify:

### Positive case

An authorised member can access the organisation's resource.

### Negative case

A member of Organisation A cannot access Organisation B's resource.

### Historical case

Historical records remain accessible only where the canonical authority permits.

### Cross-person case

Two authorised Persons within the same Organisation can access Organisation-owned resources appropriately without requiring identical Person IDs.

### Cross-instance case

Replacement Kira Instances preserve appropriate Organisation-level continuity.

### Anonymous case

Anonymous/public functionality cannot gain authenticated Organisation-owned data.

---

# 16. Database Verification

After migrations execute database-level verification.

Check:

- tables;
- columns;
- data types;
- foreign keys;
- indexes;
- constraints;
- unique constraints;
- nullability;
- RLS enabled state;
- RLS policies;
- functions;
- triggers;
- views;
- migration history.

Where possible compare:

```text
EXPECTED TARGET SCHEMA
        vs
ACTUAL DATABASE SCHEMA
```

Do not declare completion because migration files exist.

The actual database must conform.

---

# 17. Data Verification

For every data migration:

1. Count source rows.
2. Count migrated rows.
3. Identify null target ownership.
4. Identify ambiguous mappings.
5. Identify orphaned rows.
6. Identify duplicate mappings.
7. Identify cross-organisation mappings.
8. Verify representative records manually.
9. Verify historical records.
10. Verify records created after migration.

No silent data loss.

No silent reassignment.

No "best guess" ownership.

Any ambiguous mapping must be surfaced explicitly.

---

# 18. Application Verification

Run the repository's relevant:

- type checks;
- lint;
- unit tests;
- integration tests;
- migration tests;
- schema tests;
- RLS tests;
- knowledge tests;
- auth tests;
- route tests.

Then run targeted tests for every modified subsystem.

Do not weaken or delete tests merely because they conflict with the new architecture.

Where a test encodes obsolete semantics, replace it with a test encoding the canonical semantics.

---

# 19. Regression Verification

Particular attention must be given to existing working functionality.

Verify:

- sign-in;
- organisation resolution;
- Kira creation;
- Kira agent access;
- conversation history;
- chat;
- knowledge ingestion;
- knowledge search;
- memory retrieval;
- genome functionality;
- billing;
- subscription cancellation;
- admin access;
- consultant workflows;
- engagement workflows;
- scheduled jobs;
- webhooks;
- email;
- public/anonymous paths.

The migration must not produce a superficially correct schema while breaking operational Kira.

---

# 20. Migration Discipline

Follow these rules:

### NEVER

- rewrite historical migrations unnecessarily;
- modify the canonical model;
- delete data to make constraints pass;
- disable RLS to make tests pass;
- weaken constraints to accommodate legacy code;
- silently map ambiguous users to organisations;
- preserve `user_id` semantics merely because changing them is inconvenient;
- mark work complete based solely on compilation.

### PREFER

- additive migrations;
- explicit data backfills;
- explicit compatibility periods;
- deterministic mappings;
- constraints;
- indexes;
- RLS;
- verification queries;
- regression tests;
- removal of legacy paths only after successful migration.

---

# 21. Legacy Compatibility

Legacy structures may remain temporarily where required for safe migration.

However every retained legacy path must answer:

1. Why does it still exist?
2. What canonical concept does it map to?
3. Is it read-only or writable?
4. What prevents it becoming a second source of truth?
5. What migration step removes it?
6. What verification proves it is safe to remove?

A comment such as:

> "legacy compatibility"

is insufficient.

Document the actual semantic reason.

---

# 22. Completion Gate

Do not report:

> COMPLETE

until all of the following are true:

### Schema

- Target schema physically exists.
- Foreign keys are correct.
- Constraints are correct.
- Indexes are correct.
- RLS is correct.

### Data

- Required rows are migrated.
- No unexplained orphaned ownership.
- No unexplained cross-organisation mappings.
- Historical data remains intact.

### Application

- Routes use canonical organisational context.
- Resource ownership is canonical.
- Legacy user ownership is removed where required.
- Background jobs use canonical ownership.
- Admin paths are verified.

### Security

- Cross-organisation access is prevented.
- Authorised same-organisation access works.
- Caller-supplied IDs cannot bypass authority.
- Webhook/service paths are correctly scoped.

### Knowledge

- Evidence remains distinguishable from organisational knowledge.
- Provenance survives.
- Temporal semantics survive.
- Knowledge remains organisation-anchored.

### Continuity

The system can preserve organisational continuity through:

- person changes;
- ownership changes;
- consultant changes;
- engagement changes;
- subscription changes;
- Kira instance replacement.

### Tests

All relevant verification and regression tests pass.

---

# 23. Required Execution Report

At the end of each execution cycle, report only:

## EXECUTION STATUS

**Phase:** 5E-E  
**Status:** PASS / PARTIAL / BLOCKED

### 1. Changes actually made

List concrete files, migrations, functions, routes and schema objects changed.

### 2. Database state verified

List actual schema/data/RLS verification performed.

### 3. Tests executed

List commands and results.

### 4. Canonical invariants affected

For example:

```text
INV-001 PASS
INV-003 PARTIAL
INV-008 PASS
INV-009 PASS
INV-020 PASS
```

### 5. Remaining violations

Only real unresolved implementation violations.

### 6. Blockers

Only issues preventing safe execution.

### 7. Next execution action

State the single highest-value next implementation action.

Do not produce speculative future architecture.

---

# 24. Current Repository Evidence

The current repository already contains substantial canonical migration work, including:

- canonical identity migrations;
- membership/tenant context;
- RLS authority transfer;
- API rebinding;
- consultant relationships;
- engagement model;
- consultant engagement access;
- commercial structures;
- Kira instance separation;
- decision lifecycle;
- legacy authority retirement;
- knowledge object schema;
- evidence schema;
- knowledge promotion pipeline;
- temporal query patterns;
- existing-data migration;
- verification suite;
- organisation-scoped Kira knowledge;
- semantic organisation search;
- organisation-scoped knowledge chunks;
- organisation repair migrations;
- Phase 0/1 resource ownership and RLS migrations.

Therefore:

> **Do not recreate these concepts. Inspect them, verify them, complete them where necessary, and integrate remaining application code against them.**

The repository search already demonstrates remaining legacy `user_id` paths in areas including:

- admin;
- genome;
- cron jobs;
- memory integrity;
- task reconciliation;
- Kira agent flows;
- Kira chat;
- Kira creation;
- Kira email;
- knowledge ingestion;
- research;
- billing.

These are **targets for forensic verification**, not automatic defects.

Determine their semantics before modifying them.

---

# 25. Immediate First Action

Begin immediately with:

### STEP 1 — Build the physical execution inventory

Inspect:

```text
supabase/migrations/
app/
lib/
tests/
```

excluding:

```text
node_modules
.git
.next
dist
build
```

Then map the actual implementation against the approved 5E-D resource migration matrix.

### STEP 2 — Identify the first unresolved resource

Select the highest-priority resource that is:

- canonically Organisation-owned;
- physically still Person/user-owned or ambiguously owned;
- actively used by production routes;
- safe to migrate without speculative redesign.

### STEP 3 — Execute one resource completely

Do not scatter partial changes across ten resources.

For the selected resource:

```text
schema
→ data
→ FK
→ RLS
→ server code
→ background code
→ tests
→ verification
```

Complete and verify it before moving to the next resource.

### STEP 4 — Repeat

Proceed resource-by-resource until the approved migration matrix is exhausted.

---

# 26. Final Instruction

You are no longer being asked:

> "What should Kira's architecture be?"

That question has already been answered.

You are being asked:

> **"Does the actual KIRA implementation now embody the locked architecture, and if not, make it so safely and prove it?"**

Execute.

Verify.

Test.

Record evidence.

Resolve implementation defects.

Preserve data.

Preserve security.

Preserve organisational continuity.

Do not redesign the architecture.

**The canonical model is the authority.  
The actual repository/database is the verification source.  
The implementation must conform to both the approved migration specification and the canonical invariants.**