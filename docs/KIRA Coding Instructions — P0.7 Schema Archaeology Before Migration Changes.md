# KIRA Coding Task — P0.7 Schema Archaeology

## Objective

Before making **any changes** to the P0.7 migrations, establish the exact schema and implementation contract that already exists in the repository.

The P0.7 migrations must operate against the **real existing schema**, not an assumed schema and not a schema inferred from the P0.7 migration filenames alone.

This task is **READ-ONLY**.

Do not modify, create, rename, delete, format, or regenerate any files.

Do not run migrations.

Do not run `supabase db reset`.

Do not run `supabase migration up`.

Do not push anything to Supabase.

Do not "fix" discrepancies yet.

The only objective is to inspect and report.

---

# 1. Prove the repository/session first

Use the **same PowerShell session** in which the investigation is being performed.

Run:

```powershell
Write-Host "=== CURRENT LOCATION ===" -ForegroundColor Cyan
Get-Location

Write-Host "`n=== KIRA ROOT MARKERS ===" -ForegroundColor Cyan
Get-ChildItem -Force |
    Where-Object {
        $_.Name -in @(
            ".git",
            "supabase",
            "pyproject.toml",
            "package.json"
        )
    } |
    Select-Object Name, FullName

Write-Host "`n=== GIT ROOT ===" -ForegroundColor Cyan
git rev-parse --show-toplevel

Write-Host "`n=== SUPABASE MIGRATIONS ===" -ForegroundColor Cyan
Get-ChildItem .\supabase\migrations -File |
    Sort-Object Name |
    Select-Object Name, Length
```

Confirm that:

```text
Get-Location
```

and:

```text
git rev-parse --show-toplevel
```

identify the same Kira repository.

If they do not agree, STOP.

Do not continue against an uncertain working directory.

---

# 2. Locate every migration that creates the target tables

We need the migrations that create or materially establish these tables:

```text
organisational_knowledge
evidence
knowledge_evidence_links
migration_ledger
organisations
users
ownership_periods
```

Search the entire migration directory.

Use:

```powershell
$targets = @(
    "organisational_knowledge",
    "evidence",
    "knowledge_evidence_links",
    "migration_ledger",
    "organisations",
    "users",
    "ownership_periods"
)

foreach ($target in $targets) {
    Write-Host "`n=== $target ===" -ForegroundColor Cyan
    Get-ChildItem .\supabase\migrations -File |
        Select-String -Pattern $target -SimpleMatch |
        Select-Object Path, LineNumber, Line
}
```

Also perform a broader search for table creation:

```powershell
Get-ChildItem .\supabase\migrations -File |
    Select-String -Pattern `
        "CREATE TABLE", `
        "CREATE TABLE IF NOT EXISTS", `
        "ALTER TABLE", `
        "DROP TABLE", `
        "RENAME TABLE" |
    Select-Object Path, LineNumber, Line
```

The objective is to identify the **authoritative migration(s)** for each table.

Do not assume that the first migration containing the table name is necessarily the creator.

---

# 3. Read the complete creator migrations

For each target table, identify the migration that actually creates it.

Then read the **entire migration file**, not merely the matching line.

At minimum establish:

### organisations

Record:

- table name
- columns
- data types
- nullable/non-nullable
- defaults
- primary key
- foreign keys
- unique constraints
- check constraints
- indexes
- triggers
- RLS
- policies
- comments
- subsequent alterations

### users

Record the same.

Pay particular attention to whether `users` is:

- an application user table;
- an auth-linked table;
- linked to `auth.users`;
- organisation-scoped;
- person-like;
- or serving another semantic role.

Do not infer equivalence between `users` and the canonical `Person` entity.

### ownership_periods

Record:

- organisation FK
- owner FK
- temporal columns
- start/end semantics
- current-state mechanism
- constraints preventing overlapping periods, if any
- whether ownership percentages or other ownership metadata exist
- indexes

### organisational_knowledge

Record:

- identity columns
- organisation relationship
- content/value fields
- status/state fields
- timestamps
- provenance fields
- temporal fields
- supersession fields
- confidence/evidence fields
- foreign keys
- constraints
- indexes
- triggers/RLS

### evidence

Record:

- evidence identity
- source fields
- actor/user relationships
- organisation relationship
- timestamps
- source/reference metadata
- content/hash fields
- provenance semantics
- constraints
- indexes
- RLS

### knowledge_evidence_links

Record:

- knowledge FK
- evidence FK
- cardinality
- uniqueness
- relationship constraints
- indexes
- deletion behaviour

### migration_ledger

Record:

- all columns
- primary key
- unique constraints
- migration identifiers
- timestamps
- status fields
- checks
- purpose
- how existing migrations use it

---

# 4. Search for every subsequent alteration

The creator migration is not enough.

For each of the seven target tables, search all migrations for:

```text
ALTER TABLE <table>
CREATE INDEX ... <table>
CREATE UNIQUE INDEX ... <table>
CREATE TRIGGER ... <table>
CREATE POLICY ... <table>
DROP ...
RENAME ...
```

Also search for direct references to the table.

For example:

```powershell
Get-ChildItem .\supabase\migrations -File |
    Select-String -Pattern "organisational_knowledge" -SimpleMatch |
    Sort-Object Path, LineNumber
```

Repeat for every target.

The goal is to reconstruct:

```text
initial schema
    ↓
subsequent alterations
    ↓
current repository-defined schema
```

Do not report only the initial schema.

---

# 5. Locate get_current_knowledge()

Search the entire repository:

```powershell
Get-ChildItem . -Recurse -File |
    Select-String -Pattern "get_current_knowledge" -SimpleMatch |
    Select-Object Path, LineNumber, Line
```

Then identify the actual implementation.

Inspect:

- SQL function definition;
- migration that creates/updates it;
- application callers;
- RPC wrappers;
- tests;
- TypeScript/Python callers;
- any related helper functions.

If it is a PostgreSQL function, inspect its **complete definition**.

Determine exactly:

1. Function parameters
2. Parameter types
3. Return type
4. Tables referenced
5. Columns referenced
6. Current-state logic
7. Supersession logic
8. Temporal logic
9. Evidence/provenance logic
10. Organisation scoping
11. Security context
12. RLS/security-definer behaviour
13. Ordering
14. Duplicate handling
15. Error behaviour

Do not infer its semantics from its name.

---

# 6. Locate supersede_knowledge()

Search:

```powershell
Get-ChildItem . -Recurse -File |
    Select-String -Pattern "supersede_knowledge" -SimpleMatch |
    Select-Object Path, LineNumber, Line
```

Inspect the complete implementation and all callers.

Determine exactly:

1. Function parameters
2. Parameter types
3. Return type
4. Tables modified
5. Columns modified
6. Whether old knowledge is updated
7. Whether new knowledge is inserted
8. How supersession is represented
9. Whether evidence is required
10. Whether evidence links are created
11. Whether temporal state is changed
12. Whether current-state semantics are preserved
13. Transaction behaviour
14. Security context
15. RLS implications
16. Error conditions
17. Existing test coverage

Again: do not infer semantics from the function name.

---

# 7. Inspect callers before drawing conclusions

Search for all application references:

```powershell
Get-ChildItem . -Recurse -File |
    Select-String -Pattern `
        "get_current_knowledge", `
        "supersede_knowledge", `
        "organisational_knowledge", `
        "knowledge_evidence_links", `
        "evidence" |
    Select-Object Path, LineNumber, Line
```

Separate:

```text
schema definitions
database functions
application callers
tests
documentation
```

Where documentation conflicts with executable SQL/code, report the conflict.

Do not silently reconcile it.

---

# 8. Establish the exact current schema contract

After inspection, produce a table like:

| Table | Creator Migration | Subsequent Alterations | PK | Key FKs | Temporal Columns | State/Supersession | Evidence/Provenance | RLS | Notes |
|---|---|---|---|---|---|---|---|---|---|
| organisations | | | | | | | | | |
| users | | | | | | | | | |
| ownership_periods | | | | | | | | | |
| organisational_knowledge | | | | | | | | | |
| evidence | | | | | | | | | |
| knowledge_evidence_links | | | | | | | | | |
| migration_ledger | | | | | | | | | |

Every populated cell must be based on the repository.

---

# 9. Establish the function contract

Produce:

| Function | Location | Parameters | Returns | Reads | Writes | Current-State Logic | Supersession Logic | Security | Tests |
|---|---|---|---|---|---|---|---|---|---|
| get_current_knowledge() | | | | | | | | | |
| supersede_knowledge() | | | | | | | | | |

Again, this must describe the **actual implementation**.

---

# 10. Compare against P0.7 — but do NOT modify it

Only after the existing schema and functions are understood, inspect:

```text
20260827000000_p07_temporal_query_patterns.sql
20260827010000_p07_...
```

and all other P0.7 migrations.

Determine what each P0.7 migration assumes about:

- organisational_knowledge
- evidence
- knowledge_evidence_links
- migration_ledger
- organisations
- users
- ownership_periods
- get_current_knowledge()
- supersede_knowledge()

Create an explicit assumption matrix:

| P0.7 Component | Assumption | Actual Existing Schema | Match? | Consequence |
|---|---|---|---|---|
| temporal knowledge query | | | | |
| current knowledge function | | | | |
| supersession | | | | |
| evidence linkage | | | | |
| ownership context | | | | |
| migration ledger | | | | |

Do not repair mismatches at this stage.

---

# 11. Critical architectural rule

Use the canonical organisational model as the **semantic reference**, but do not force the database to match it during this investigation.

The canonical model establishes meaning.

The existing migrations establish the actual implementation.

We are trying to determine:

```text
CANONICAL SEMANTICS
        ↓
EXISTING DATABASE IMPLEMENTATION
        ↓
P0.7 ASSUMPTIONS
        ↓
CONFORMANCE / CONFLICT / GAP
```

Do not reverse this into:

```text
P0.7 assumption
        ↓
invented schema interpretation
```

---

# 12. Important semantic checks

Pay particular attention to these architectural invariants from the canonical model:

### Organisation identity

`organisations` must be understood as the enduring organisational subject.

Do not assume a `user_id`, Kira instance, subscription, or consultant is the organisation identity.

### Person versus user

Do not automatically equate:

```text
users = Person
```

unless the implementation actually establishes that semantic relationship.

### Ownership temporalisation

Determine whether `ownership_periods` genuinely preserves ownership history or merely records current ownership.

### Knowledge versus evidence

Determine whether:

```text
evidence
```

is the source/provenance layer and:

```text
organisational_knowledge
```

is the interpreted organisational knowledge layer.

This distinction is central to the canonical model.

### Supersession

Determine whether supersession is:

- destructive;
- append-only;
- status-based;
- temporal;
- pointer-based;
- version-based;
- or some combination.

### Current knowledge

Determine exactly how the system distinguishes:

```text
current knowledge
```

from:

```text
historical/superseded knowledge
```

### Temporal correctness

Identify whether temporal semantics use:

- `created_at`;
- `effective_at`;
- `valid_from`;
- `valid_to`;
- `superseded_at`;
- another mechanism;
- or no true temporal mechanism.

Do not assume timestamps imply temporal truth.

---

# 13. Migration ledger investigation

Because `migration_ledger` is explicitly involved, determine:

- who writes to it;
- who reads it;
- whether it duplicates Supabase's migration tracking;
- its primary purpose;
- expected identifier format;
- whether P0.7 assumes rows already exist;
- whether it is application-level or migration-level state;
- whether it has any triggers or policies.

This is especially important before modifying any P0.7 migration that attempts to write or validate against it.

---

# 14. No destructive or state-changing commands

During this task, do NOT run:

```text
supabase db reset
supabase db push
supabase migration up
supabase migration repair
supabase migration squash
supabase migration repair
DROP TABLE
ALTER TABLE
CREATE TABLE
CREATE OR REPLACE FUNCTION
```

Do not modify migration files.

Do not modify functions.

Do not create temporary migrations.

Do not edit the database.

This phase is strictly investigative.

---

# 15. Deliverable

Return one investigation report with these sections:

## A. Repository/session proof

Show the verified repository root and migration directory.

## B. Table provenance

For each target table:

- creator migration;
- subsequent alterations;
- final repository-defined structure.

## C. Exact schema

Provide the exact relevant columns, constraints, indexes, FKs and temporal/state semantics.

## D. Function implementations

Provide the exact contracts and behaviour of:

- `get_current_knowledge()`
- `supersede_knowledge()`

## E. Call graph / usage

Identify important application and database callers.

## F. P0.7 assumptions

Identify what P0.7 currently assumes.

## G. Conformance matrix

Classify each P0.7 assumption as:

```text
MATCH
MISMATCH
AMBIGUOUS
MISSING
```

## H. Architectural risks

Identify only risks demonstrated by the repository.

Do not speculate.

## I. Required decisions

List the decisions that must be made before P0.7 is changed.

## J. Recommended next action

Conclude with the smallest safe next step.

---

# 16. Definition of Done

This investigation is complete only when we can answer, from the repository itself:

1. Where was `organisations` created?
2. What is its current repository-defined schema?
3. Where was `users` created?
4. What does `users` actually represent?
5. Where was `ownership_periods` created?
6. How is ownership history represented?
7. Where was `organisational_knowledge` created?
8. What makes knowledge current?
9. What makes knowledge historical/superseded?
10. Where was `evidence` created?
11. What does evidence represent?
12. How does evidence link to knowledge?
13. Where was `knowledge_evidence_links` created?
14. Where was `migration_ledger` created?
15. What is its actual purpose?
16. Where is `get_current_knowledge()` implemented?
17. What exact schema does it query?
18. Where is `supersede_knowledge()` implemented?
19. What exact schema does it modify?
20. What does P0.7 assume that differs from reality?

Only after all 20 questions are answered should we begin designing or modifying the P0.7 migrations.

**Do not make the migration changes in this task.**