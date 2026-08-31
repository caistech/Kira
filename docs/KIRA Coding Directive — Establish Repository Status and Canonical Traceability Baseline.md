# KIRA Coding Directive — Establish Repository Status and Canonical Traceability Baseline

## Objective

Establish the current implementation state of the **Kira repository** and prepare the implementation traceability baseline against the canonical organisational model.

This is an **AUDIT-FIRST, READ-ONLY** operation.

Do not modify application code, database schemas, migrations, routes, configuration, or canonical architectural documents during this directive.

The canonical organisational model is the governing semantic authority.

It must not be altered to accommodate the current implementation.

## 1. Repository Context

The Kira repository is expected at:

`C:\Users\denni\PycharmProjects\Kira`

Do not perform this audit against:

`cais-shared-services`

unless a dependency/reference relationship is discovered and needs to be documented.

First:

```powershell
Set-Location "C:\Users\denni\PycharmProjects\Kira"
```

Verify:

```powershell
Get-Location
Test-Path ".git"
Get-ChildItem -Force
```

If `.git` does not exist, STOP and report that the Kira repository cannot be established from this location.

## 2. Git Status

Execute:

```powershell
git status --short --branch
git log --oneline -10
git branch --show-current
git remote -v
```

Report:

- current branch;
- HEAD commit;
- working-tree modifications;
- untracked files;
- whether the repository is ahead/behind its upstream;
- any suspicious or unexpected changes.

Do not reset, checkout, clean, stash, commit, pull, push, or otherwise mutate Git state.

## 3. Project State

Inspect, where present:

```text
.context/
.context/PROJECT_STATE.md
PROJECT_STATUS.md
CLAUDE.md
README.md
TASK_REGISTRY.md
```

Use PowerShell-compatible commands.

Do not use Unix syntax such as:

```text
ls -la
```

Use:

```powershell
Get-ChildItem -Force
```

and:

```powershell
Get-ChildItem -Force .context
```

Read the relevant state/context documents.

Report the most recent declared project state and identify whether it agrees with the actual Git/worktree state.

## 4. Canonical Model

Locate the canonical organisational model available to this project.

The governing semantic model establishes these first-class concepts:

1. Organisation
2. Person
3. Ownership Period
4. Consultant
5. Engagement
6. Kira Instance
7. Subscription
8. Commercial Arrangement
9. Organisational Knowledge Context

The model explicitly requires separation between these concepts and establishes 20 canonical invariants.

In particular, preserve these boundaries:

- Organisation ≠ Person
- Organisation ≠ Kira Instance
- Organisation ≠ Subscription
- Consultant ≠ Introducer
- Consultant ≠ Engagement
- Engagement ≠ Subscription
- Subscription ≠ Commercial Arrangement
- Conversation ≠ Organisational Knowledge
- Current State ≠ Historical Truth

## 5. Existing Implementation Inventory

Perform a read-only inventory of the Kira implementation.

At minimum inspect:

```text
app/
lib/
components/
supabase/
scripts/
migrations/
types/
```

and any other relevant application/domain directories actually present.

Identify where the implementation currently represents:

- organisations;
- users/people;
- organisation membership;
- owners;
- consultants;
- introducers/distributors;
- engagements;
- Kira instances;
- subscriptions;
- commercial arrangements;
- organisational knowledge/memory;
- conversations;
- authentication context;
- tenant context;
- organisation_id;
- RLS policies;
- temporal/history fields.

Do not assume the names above correspond directly to database tables or TypeScript types.

Search semantically as well as by exact name.

Useful searches include:

```powershell
Get-ChildItem -Recurse -File app,lib,supabase,scripts,migrations,types -ErrorAction SilentlyContinue
```

and targeted searches for:

```text
organisation_id
organization_id
organisation
organisationId
tenant_id
tenantId
consultant
engagement
subscription
commercial
ownership
owner
memory
knowledge
conversation
kira_instance
instance
introducer
distributor
```

Use the appropriate PowerShell search mechanism rather than assuming Unix `grep` is available.

## 6. Traceability Matrix

Construct an audit matrix with these columns:

| Canonical Concept | Existing Implementation | Location | Conformance | Gap | Risk | Required Decision |
|---|---|---|---|---|---|---|

Populate it for:

- Organisation
- Person
- Ownership Period
- Consultant
- Engagement
- Kira Instance
- Subscription
- Commercial Arrangement
- Organisational Knowledge Context

Do not force a false conformance classification.

Use:

- CONFORMANT
- PARTIAL
- CONFLICT
- MISSING
- UNKNOWN

where appropriate.

## 7. Invariant Audit

Audit all 20 canonical invariants individually.

For each:

```text
INV-xxx
Status:
Evidence:
Implementation location:
Violation/Gaps:
Risk:
Required decision:
```

Pay particular attention to:

### INV-001
Organisation identity must persist independently of people, consultants, engagements, subscriptions and Kira instances.

### INV-003
Ownership must be temporal rather than merely current-state ownership.

### INV-006
Consultant and Introducer/Distributor relationships must remain distinct.

### INV-007
Engagement lifecycle must remain independent of subscription lifecycle.

### INV-008
Kira Instance must never become Organisation identity.

### INV-009
Organisational knowledge must survive Kira Instance replacement.

### INV-010
Conversation history must not be treated as equivalent to organisational memory.

### INV-011
Material organisational knowledge must have recoverable provenance.

### INV-014
Commercial changes must preserve historical commercial truth.

### INV-017
Replacement of consultant, Kira instance, subscription or commercial arrangement must preserve organisational continuity.

### INV-020
Persistent Kira intelligence must ultimately be anchored to Organisation.

## 8. Authentication / Tenant / RLS Audit

Because recent Kira work has involved rebinding API routes to canonical `organisation_id` context, explicitly audit whether the current implementation consistently derives organisation context from the canonical authority boundary.

For every relevant API route:

- identify how authenticated identity is established;
- identify how organisation context is derived;
- identify whether `organisation_id` is client supplied;
- identify whether organisation context is inferred from membership;
- identify whether Supabase/RLS provides the final isolation boundary;
- identify any route that bypasses the canonical context;
- identify any route that still relies on legacy tenant/user semantics.

Do not modify routes during this audit.

Produce a list:

```text
ROUTE
Current context source
Canonical context source
Conformance
Risk
Required rebinding
```

## 9. Database / Schema Audit

Inspect current schema/migrations sufficiently to determine whether the canonical concepts are represented explicitly or collapsed into other concepts.

Pay special attention to:

- organisation identity;
- membership;
- ownership history;
- consultant relationships;
- engagement records;
- Kira instances;
- subscriptions;
- commercial arrangements;
- knowledge/memory;
- provenance;
- timestamps;
- historical records;
- foreign-key relationships;
- RLS policies.

Do not create migrations.

Do not alter schema.

## 10. Critical Architectural Question

Explicitly determine whether the current Kira implementation has accidentally made any of these transient concepts the effective organisational identity:

```text
user
auth user
membership
tenant
subscription
Kira instance
consultant
conversation
```

If yes, document the exact implementation location and consequence.

This is an architectural finding, not merely a coding issue.

## 11. Route Rebinding Relationship

The current route-rebinding work must be evaluated against the canonical model.

Do not assume that changing a route to use `organisation_id` automatically establishes canonical conformity.

Verify:

```text
authentication
    ↓
person identity
    ↓
organisation relationship
    ↓
canonical organisation
    ↓
RLS / authority boundary
    ↓
route operation
```

Identify routes where this chain is incomplete or semantically incorrect.

## 12. Output

Produce a concise audit report containing:

### A. Repository Status

- branch
- HEAD
- working tree
- recent commits
- project state

### B. Canonical Traceability Matrix

The nine canonical concepts and their current implementation status.

### C. Invariant Audit

INV-001 through INV-020.

### D. Authority/RLS Audit

Routes and database boundaries that do or do not conform.

### E. Architectural Conflicts

List only genuine conflicts supported by evidence.

### F. Required Decisions

Separate:

1. confirmed implementation defects;
2. missing implementation;
3. architectural decisions requiring human approval;
4. safe mechanical remediation;
5. issues requiring further forensic audit.

### G. Recommended Next Batch

Recommend the smallest safe next implementation batch based on evidence.

## 13. Hard Constraints

DO NOT:

- modify source code;
- modify database schema;
- create migrations;
- modify RLS policies;
- rebind routes;
- rename entities;
- alter canonical documents;
- commit changes;
- push changes;
- reset the repository;
- delete files;
- invent missing semantics.

DO:

- inspect;
- trace;
- compare;
- classify;
- document;
- report evidence;
- identify architectural conflicts.

## Completion Criterion

The directive is complete only when we can answer:

> Where does each canonical organisational concept currently exist in Kira, where does it not exist, and where does the implementation conflict with the canonical model?

Do not proceed into remediation until this audit baseline has been reported.