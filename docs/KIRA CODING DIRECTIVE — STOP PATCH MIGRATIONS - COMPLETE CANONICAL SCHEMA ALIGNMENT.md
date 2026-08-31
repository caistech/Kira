# KIRA CODING DIRECTIVE
## Stop Patch Migrations and Complete Canonical Schema Alignment

**Status:** AUTHORITATIVE EXECUTION DIRECTIVE  
**Priority:** P0 / P1 BLOCKER  
**Objective:** Bring the current Kira Supabase implementation into exact alignment with the canonical organisational model and get the updated Kira version into a production-ready state.

---

# 1. EXECUTIVE DECISION

The current migration process is to be **stopped at this boundary**.

Do **not** create any further patch migrations.

Do **not** attempt to fix individual migration failures one at a time.

Do **not** modify the canonical organisational model to accommodate the current database.

Do **not** guess at missing columns, tables or relationships.

Do **not** continue applying migrations whose assumptions conflict with the authoritative current schema.

The authoritative architectural sequence is now:

```text
CURRENT SUPABASE STATE
        ↓
EXACT CURRENT → TARGET MAPPING
        ↓
FORMAL P1.3 GAP / ARCHITECTURE DECISION
        ↓
FORMAL P1.4 TARGET PRODUCTION ARCHITECTURE
        ↓
APPROVED MIGRATION PLAN
        ↓
SINGLE CONTROLLED SCHEMA/DATA MIGRATION
        ↓
APPLICATION CODE ALIGNMENT
        ↓
VALIDATION / TESTING
        ↓
PRODUCTION-READY KIRA
```

The objective is to **finish the architectural correction cleanly**, rather than continue accumulating migration patches.

---

# 2. AUTHORITATIVE SOURCES

Use the following as the authoritative sources of truth.

## TARGET STATE

`docs/KIRA — Canonical Organisational Model.md`

This defines the canonical organisational reality and invariants INV-001 through INV-020.

The canonical model is authoritative.

The implementation must be brought into alignment with it.

**Do not redefine the canonical concepts to fit the existing implementation.**

The canonical model explicitly establishes:

- Organisation as the enduring organisational subject;
- Person as distinct from organisational roles;
- Ownership Period as temporal;
- Consultant as a first-class relationship;
- Introducer/Distributor as distinct from Consultant;
- Engagement as a first-class concept;
- Kira Instance as separate from Organisation;
- Subscription as separate from Organisation and Commercial Arrangement;
- Commercial Arrangement as a separate economic/contractual concept;
- Organisational Knowledge as separate from conversation history;
- provenance as mandatory conceptually;
- temporal/historical truth as preservable;
- organisational continuity across consultant, subscription, commercial and Kira-instance changes.

See the canonical model for the complete definitions and INV-001–INV-020.

## CURRENT STATE

Use the **current Supabase schema audit already completed for this project** as the authoritative CURRENT state.

Do not reconstruct the current schema from assumptions or from old migration files.

Where the current database and migration history disagree, the **actual current database/schema audit wins for CURRENT STATE**.

Where the current implementation and the canonical model disagree, the **canonical model wins for TARGET STATE**.

---

# 3. PRIMARY OBJECTIVE

Produce an exact and executable transformation from:

> CURRENT KIRA IMPLEMENTATION

to:

> TARGET KIRA IMPLEMENTATION

without losing organisational data, historical information, provenance or existing production functionality.

The resulting system must satisfy the canonical model rather than merely make the migrations pass.

---

# 4. FIRST TASK — FREEZE MIGRATION ACTIVITY

Before doing anything else:

1. Stop creating new patch migrations.
2. Do not repair individual migration failures by adding compatibility columns.
3. Do not create duplicate tables simply because an old migration expects them.
4. Do not rename canonical concepts to match legacy terminology.
5. Do not silently discard legacy data.
6. Do not delete tables or columns merely because they appear obsolete until their mapping has been established.
7. Do not run destructive SQL against production.
8. Do not alter production schema as part of this analysis phase.

Existing migrations may be inspected as evidence.

They are **not authoritative definitions of the current schema**.

---

# 5. SECOND TASK — ESTABLISH EXACT CURRENT STATE

Using the existing authoritative Supabase schema audit, establish the complete current implementation.

For every relevant table identify:

- table name;
- purpose;
- primary key;
- foreign keys;
- organisation relationship;
- person relationship;
- user relationship;
- tenant relationship;
- ownership semantics;
- temporal semantics;
- provenance semantics;
- knowledge semantics;
- relationship semantics;
- decision semantics;
- conversation semantics;
- Kira-instance semantics;
- subscription semantics;
- commercial semantics;
- data volume where available;
- whether production/application code currently depends on it.

Do not infer semantic meaning from the table name alone.

Trace actual:

- schema;
- constraints;
- indexes;
- functions;
- triggers;
- routes;
- services;
- repositories;
- frontend usage;
- Edge Functions;
- authentication/context helpers;
- existing migration dependencies.

---

# 6. THIRD TASK — BUILD THE EXACT CURRENT → TARGET MAPPING

Create the formal mapping for **every relevant existing table and column**.

Each current table/column must receive exactly one primary classification:

### KEEP

The existing table/column already represents the target concept correctly.

No semantic migration is required.

### RENAME

The underlying concept is correct but the name is wrong.

Example:

```text
current concept = target concept
current name ≠ target name
```

Rename rather than duplicate.

### ALTER

The existing table/concept is valid but requires structural or semantic modification.

Examples:

- wrong FK;
- wrong nullability;
- wrong ownership;
- wrong temporal structure;
- wrong relationship;
- missing constraint;
- incorrect data type;
- incorrect semantics.

### ADD

The target concept or attribute does not currently exist.

A new table/column/relationship is required.

### MERGE

Multiple existing structures represent the same target concept and must be consolidated.

Determine:

- canonical surviving structure;
- source structures;
- data migration;
- collision handling;
- application references;
- deprecation sequence.

### SPLIT

An existing table combines multiple concepts that the canonical model explicitly requires to remain separate.

For example:

```text
Person
Organisation
Kira Instance
Subscription
Commercial Arrangement
```

must not be collapsed merely because the existing implementation combines them.

### MIGRATE

Existing data must be transformed into a different target representation while preserving its meaning/history.

### DEPRECATE

The structure has no place in the target architecture but must remain temporarily while dependencies are removed.

### DELETE

Only where it is conclusively demonstrated that:

- the structure is obsolete;
- data has been safely migrated or is genuinely disposable;
- application dependencies are removed;
- no historical meaning is lost;
- deletion is explicitly included in the approved migration sequence.

---

# 7. REQUIRED MAPPING FORMAT

Produce a formal matrix containing at minimum:

| CURRENT TABLE | CURRENT COLUMN | CURRENT SEMANTIC | TARGET CONCEPT | TARGET TABLE | TARGET COLUMN | CLASSIFICATION | DATA MIGRATION REQUIRED | CODE IMPACT | RISK | DECISION |
|---|---|---|---|---|---|---|---|---|---|---|

Do not produce a high-level summary only.

The mapping must be sufficiently exact that another engineer can implement the migration without having to rediscover the architecture.

---

# 8. SPECIAL AUDIT — USER_ID SEMANTIC OVERLOAD

Give special attention to every remaining use of:

```text
user_id
users.id
auth.users.id
tenant_id
account_id
owner_id
```

Determine what each reference actually means.

For every occurrence classify it as one or more of:

```text
Person
Organisation
Membership
Authentication identity
Resource owner
Actor/provenance
Kira Instance
Legacy tenant
Other
```

The canonical model does not permit these concepts to remain semantically conflated.

The historical root architectural defect was the overloading of `users.id`.

The migration must therefore explicitly identify and eliminate remaining semantic ambiguity.

---

# 9. ORGANISATION OWNERSHIP AUDIT

Every persistent organisational resource must be audited.

Determine whether its canonical owner is:

```text
Organisation
Person
Membership
Consultant
Engagement
Kira Instance
Subscription
Commercial Arrangement
Evidence/Source
Other
```

Do not assume that because a resource currently contains `user_id`, it is correctly Person-owned.

Where the canonical model requires Organisation ownership, migrate it accordingly.

This applies particularly to:

- organisational knowledge;
- knowledge/evidence;
- genome structures;
- business valuations;
- organisational memory;
- engagements;
- commercial structures;
- Kira instances;
- subscriptions;
- other persistent business resources.

---

# 10. KNOWLEDGE ARCHITECTURE AUDIT

Preserve the distinction between:

```text
Conversation
      ↓
Evidence / Source Material
      ↓
Knowledge Processing / Governance
      ↓
Organisational Knowledge
```

Do not collapse:

```text
conversation_messages
```

into organisational memory.

Do not assume that every conversational statement is canonical organisational knowledge.

Audit the existing:

- `kira_knowledge`;
- `organisational_knowledge`;
- `genome_*`;
- evidence;
- provenance;
- memory;
- conversation;
- ingestion;
- promotion;
- source/reference structures.

Map each one explicitly against the canonical knowledge model.

---

# 11. GENOME AUDIT

The existing `genome_*` structures must be compared directly against the authoritative canonical knowledge model and the actual current schema.

Do not assume that an old migration's expected columns exist.

For example, if a migration expects fields such as:

```text
subject
predicate
object
description
severity
supplied_by
engagement_id
kira_instance_id
```

but the authoritative current `genome_entities` / `genome_facts` structures use different fields, treat that as a migration-design defect.

Do not patch the current schema simply to satisfy the old migration.

Instead:

1. establish the actual current structure;
2. establish the target semantic structure;
3. map the two;
4. determine the required data transformation;
5. replace the broken migration approach with the correct migration.

---

# 12. CONSULTANT / INTRODUCER / ENGAGEMENT AUDIT

Ensure these concepts remain distinct.

The target architecture requires:

```text
Consultant
        ↕
Organisation

Consultant
        ↓
Engagement
        ↓
Organisation

Introducer / Distributor
        ↓
Organisation
```

Do not collapse Consultant and Introducer merely because the same person/company can perform both functions.

Do not collapse Consultant and Engagement.

Do not collapse Engagement and Subscription.

Identify every current implementation where these concepts are combined and classify it as:

```text
KEEP
ALTER
SPLIT
ADD
MERGE
MIGRATE
```

as appropriate.

---

# 13. KIRA INSTANCE AUDIT

Ensure that:

```text
Organisation
        ↓
Kira Instance
```

is represented as a service/implementation relationship.

The Kira Instance must never become the canonical Organisation identity.

Audit all tables, routes and code paths that currently use:

- instance IDs;
- tenant IDs;
- agent IDs;
- bot IDs;
- deployment IDs;
- user IDs;

as possible substitutes for Organisation identity.

A technical rebuild or replacement of Kira must not require organisational memory to be recreated.

---

# 14. SUBSCRIPTION / COMMERCIAL AUDIT

Preserve the distinction:

```text
Organisation
      ↓
Subscription
      ↓
Kira service entitlement
```

versus:

```text
Commercial Arrangement
      ↓
economic / contractual relationship
```

Consultant professional-service fees must remain conceptually distinct from Kira service fees.

Revenue sharing must remain a commercial relationship.

Pricing changes must preserve historical commercial truth.

Audit all current subscription, billing, plan, pricing, consultant economics and revenue-share structures accordingly.

---

# 15. TEMPORAL / HISTORICAL AUDIT

For every concept that can change over time determine whether historical truth is preserved.

At minimum audit:

- ownership;
- consultant relationships;
- engagements;
- Kira instances;
- subscriptions;
- commercial arrangements;
- organisational roles;
- organisational knowledge.

Ask for every relevant structure:

> Can Kira determine what was true at a previous point in time?

If not, classify the gap.

Do not solve temporal problems by simply overwriting current values.

---

# 16. P1.3 — FORMAL GAP / ARCHITECTURE DECISION

After completing the mapping, produce the formal P1.3 architecture decision.

P1.3 must contain:

1. Current-state summary.
2. Canonical target-state summary.
3. Complete CURRENT → TARGET mapping.
4. Every material semantic mismatch.
5. Every table requiring migration.
6. Every column requiring migration.
7. Every duplicate concept.
8. Every overloaded concept.
9. Every missing canonical concept.
10. Every ownership defect.
11. Every temporal defect.
12. Every provenance defect.
13. Every knowledge-layer defect.
14. Every application-code dependency.
15. Migration risks.
16. Data-loss risks.
17. Required architectural decisions.
18. Explicit decisions that are now CLOSED.

The purpose of P1.3 is to make the architecture unambiguous **before SQL is written**.

---

# 17. P1.4 — TARGET PRODUCTION ARCHITECTURE

Then produce the formal P1.4 target production architecture.

P1.4 must define the intended production implementation of the canonical model.

It should specify:

- target tables;
- target columns;
- primary keys;
- foreign keys;
- ownership;
- temporal structures;
- relationship structures;
- provenance structures;
- knowledge structures;
- Kira-instance relationships;
- subscription relationships;
- commercial relationships;
- organisational boundaries;
- authentication boundaries;
- authorisation boundaries;
- resource ownership boundaries.

The target architecture must explicitly show how the implementation satisfies INV-001 through INV-020.

---

# 18. NO SQL UNTIL P1.3 / P1.4 ARE COMPLETE

Do not write migration SQL until:

```text
P1.3 = COMPLETE
P1.4 = COMPLETE
CURRENT → TARGET = COMPLETE
```

The SQL must be derived from the approved target architecture.

Not the other way around.

Do not use SQL experimentation as a substitute for architectural decisions.

---

# 19. MIGRATION PLAN

Once P1.3 and P1.4 are complete, produce **one coherent migration plan**.

The migration plan must state:

### Phase A — Schema preparation

Create/alter target structures required by the architecture.

### Phase B — Data migration

Transform existing data into the canonical structures.

Preserve:

- IDs where safe;
- historical records;
- timestamps;
- provenance;
- relationships;
- organisational continuity.

Where IDs must change, produce explicit old-ID → new-ID mappings.

### Phase C — Application migration

Update:

- backend routes;
- services;
- repositories;
- Edge Functions;
- frontend calls;
- auth/context helpers;
- webhooks;
- billing;
- knowledge ingestion;
- knowledge retrieval;
- agent execution;
- memory;
- analytics.

### Phase D — Compatibility/deprecation

Where temporary compatibility is unavoidable:

- identify it explicitly;
- document its purpose;
- establish removal criteria;
- do not allow compatibility structures to become permanent architecture.

### Phase E — Validation

Validate schema, data, application behaviour and architectural invariants.

### Phase F — Cleanup

Only after validation:

- remove deprecated structures;
- remove obsolete code paths;
- remove obsolete migrations where appropriate;
- remove semantic aliases that are no longer required.

---

# 20. MIGRATION SAFETY RULES

The migration must be:

- deterministic;
- idempotent where practical;
- transactionally safe where practical;
- reversible where practical;
- observable;
- testable;
- data-preserving.

Before any destructive operation, demonstrate:

1. what is being removed;
2. what replaces it;
3. how the data is preserved;
4. how application dependencies are migrated;
5. how the result is validated.

No:

```text
DROP TABLE
DROP COLUMN
TRUNCATE
DELETE
```

merely to make a migration pass.

---

# 21. APPLICATION CODE MUST FOLLOW THE TARGET MODEL

Once the target architecture is approved, audit application code against it.

The code must not reintroduce the same semantic defects through convenience helpers.

Particular attention must be paid to code that:

- resolves the current user;
- resolves the current organisation;
- creates resources;
- reads resources;
- assigns ownership;
- records provenance;
- ingests knowledge;
- creates engagements;
- creates subscriptions;
- processes billing;
- invokes Kira;
- handles agent webhooks;
- manages consultant access.

The distinction must remain:

```text
Authentication
    =
Who is this Person?

Authorisation / Organisational Context
    =
Which Organisation and memberships does this Person currently act within?

Resource Ownership
    =
Which canonical entity owns this resource?

Provenance
    =
Which Person/actor supplied or created this information?
```

These must not be collapsed back into `user_id`.

---

# 22. TEST AGAINST THE CANONICAL ARCHITECTURAL TEST

The finished implementation must be able to answer all 20 questions defined in the canonical model, including:

1. What organisation is this?
2. Who has been associated with it?
3. Who owns it now?
4. Who owned it previously?
5. Which consultants have worked with it?
6. What engagements have occurred?
7. Which engagements are active?
8. What Kira instances have served it?
9. What subscriptions has it had?
10. What commercial arrangements governed the relationship?
11. What organisational knowledge has accumulated?
12. Where did that knowledge come from?
13. What was believed at a particular point in time?
14. What has subsequently changed?
15. What knowledge remains relevant today?
16. What knowledge is historical?
17. What organisational work should a consultant undertake next?
18. What can safely carry forward when a consultant changes?
19. What can safely carry forward when Kira is technically rebuilt?
20. What commercial history must remain intact?

If the implementation cannot answer these because multiple concepts remain collapsed together, the migration is not complete.

---

# 23. INVARIANT VALIDATION

Produce an explicit validation matrix:

| INVARIANT | TEST | RESULT | EVIDENCE |
|---|---|---|---|
| INV-001 | Organisation persists independently | PASS/FAIL | ... |
| INV-002 | Person/role separation | PASS/FAIL | ... |
| INV-003 | Ownership temporalisation | PASS/FAIL | ... |
| INV-004 | Consultant first-class | PASS/FAIL | ... |
| INV-005 | Engagement first-class | PASS/FAIL | ... |
| INV-006 | Consultant/Introducer separation | PASS/FAIL | ... |
| INV-007 | Engagement/Subscription separation | PASS/FAIL | ... |
| INV-008 | Kira/Organisation separation | PASS/FAIL | ... |
| INV-009 | Memory/Instance separation | PASS/FAIL | ... |
| INV-010 | Conversation/Knowledge separation | PASS/FAIL | ... |
| INV-011 | Knowledge provenance | PASS/FAIL | ... |
| INV-012 | Temporal knowledge | PASS/FAIL | ... |
| INV-013 | Commercial truth | PASS/FAIL | ... |
| INV-014 | Commercial versioning | PASS/FAIL | ... |
| INV-015 | Paid Kira service | PASS/FAIL | ... |
| INV-016 | Consultant economics separation | PASS/FAIL | ... |
| INV-017 | Continuity | PASS/FAIL | ... |
| INV-018 | No implementation-defined semantics | PASS/FAIL | ... |
| INV-019 | Historical preservation | PASS/FAIL | ... |
| INV-020 | Organisational subject primacy | PASS/FAIL | ... |

No invariant may be marked PASS based solely on intention.

There must be implementation evidence.

---

# 24. REQUIRED OUTPUT PACKAGE

Return the work as the following artifacts:

```text
P1.3 — Current State → Target State Gap & Architecture Decision
P1.4 — Target Production Architecture
P2.x — Approved Schema & Data Migration Plan
CURRENT → TARGET — Complete Table/Column Mapping
INVARIANT VALIDATION — INV-001 → INV-020
APPLICATION ALIGNMENT — Code Paths Requiring Change
DATA MIGRATION — Old Structure → New Structure
DEPRECATION REGISTER — Structures to Remove After Cutover
```

Also provide a concise executive summary containing:

```text
WHAT WE HAVE
WHAT IS WRONG
WHAT THE TARGET IS
WHAT WILL CHANGE
WHAT DATA WILL MOVE
WHAT WILL BE DELETED
WHAT CODE WILL CHANGE
WHAT RISKS EXIST
WHAT IS NOW CLOSED
WHAT REMAINS
```

---

# 25. EXECUTION AUTHORITY

There are now two distinct stages.

## STAGE 1 — ARCHITECTURAL COMPLETION

Kira Coding is authorised to:

- inspect;
- audit;
- map;
- trace;
- classify;
- document;
- identify conflicts;
- produce P1.3;
- produce P1.4;
- produce the migration plan;
- identify required code changes.

Kira Coding is **not authorised to modify production schema during this stage**.

## STAGE 2 — IMPLEMENTATION

Only after the CURRENT → TARGET mapping, P1.3, P1.4 and migration plan are complete and accepted:

Kira Coding may:

- create the migration;
- execute schema changes;
- migrate data;
- update application code;
- run validation;
- remove deprecated structures.

The implementation must follow the approved architecture.

If implementation reveals a genuine architectural contradiction, **stop and report the contradiction**.

Do not silently patch around it.

---

# 26. DEFINITION OF DONE

This work is complete only when:

- [ ] Current Supabase schema is completely mapped.
- [ ] Every relevant current table has a target disposition.
- [ ] Every relevant current column has a target disposition.
- [ ] All `user_id` semantic overload has been identified.
- [ ] Organisation ownership is canonical.
- [ ] Person identity is separate from organisational roles.
- [ ] Ownership is temporal.
- [ ] Consultant relationships are first-class.
- [ ] Introducer/Distributor relationships are distinct.
- [ ] Engagements are first-class.
- [ ] Kira Instances are separate from Organisation identity.
- [ ] Subscriptions are separate from Organisation identity.
- [ ] Commercial Arrangements are separate from Subscription.
- [ ] Consultant economics are separate from Kira service economics.
- [ ] Conversation is separate from organisational knowledge.
- [ ] Knowledge provenance is preserved.
- [ ] Historical knowledge/state is preserved.
- [ ] Organisational continuity survives Kira-instance replacement.
- [ ] Organisational continuity survives consultant changes.
- [ ] Organisational continuity survives subscription changes.
- [ ] Organisational continuity survives commercial changes.
- [ ] P1.3 is complete.
- [ ] P1.4 is complete.
- [ ] Migration plan is complete.
- [ ] Application code impact is identified.
- [ ] Data migration paths are defined.
- [ ] Destructive operations are explicitly justified.
- [ ] INV-001 through INV-020 are testable.
- [ ] No unresolved architectural ambiguity remains.
- [ ] No patch migration is required to make the system work.
- [ ] The resulting implementation is capable of supporting the updated Kira production release.

---

# 27. FINAL INSTRUCTION

The goal is **not** to get the next migration to pass.

The goal is to get Kira's implementation structurally correct.

Do not optimise for:

> "How do we make the existing migrations stop failing?"

Optimise for:

> **"What must the Kira database and application actually look like to faithfully implement the canonical organisational model?"**

Then migrate the current system to that target.

We are ending the patch-migration cycle now.

**Establish the truth. Map the truth. Decide the target. Migrate once. Validate. Ship.**