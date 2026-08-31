# KIRA CODING DIRECTIVE
## P0.6 — Canonical Organisational Model Implementation, Traceability & Remediation

**Status:** EXECUTE  
**Authority:** KIRA Canonical Organisational Model — P0.1  
**Phase:** P0.6 Implementation Traceability and Remediation  
**Date:** 26 August 2026

---

## 1. Mission

Execute a forensic implementation audit of the current Kira codebase against the **KIRA — Canonical Organisational Model**.

The purpose is to establish whether the current implementation actually conforms to the canonical organisational reality defined by P0.1.

Where implementation conflicts with the canonical model:

1. identify the conflict;
2. record the exact implementation location;
3. determine the semantic risk;
4. determine whether remediation is required;
5. remediate the implementation where the canonical model requires it;
6. preserve existing functionality;
7. preserve the P0.5 organisation-level RLS authority boundary;
8. verify the result;
9. capture evidence.

**Do not modify the canonical organisational model to accommodate the existing implementation.**

The canonical model is the authority.

---

# 2. Governing Architectural Principle

The implementation must preserve this fundamental reality:

> **Kira instances, consultants, engagements, subscriptions and commercial arrangements may change. The organisation's identity, history and governed organisational knowledge must remain coherent across those changes.**

The canonical organisational subject is **Organisation**.

It is not:

- the authenticated user;
- `users.id`;
- a consultant;
- a Kira instance;
- a subscription;
- a conversation;
- a Supabase auth identity;
- or any transient software object.

Organisational knowledge belongs conceptually to the Organisation and must survive changes in users, consultants, engagements, subscriptions and Kira instances.

---

# 3. Mandatory Canonical Concepts

Audit the implementation against all nine canonical concepts:

1. Organisation
2. Person
3. Ownership Period
4. Consultant
5. Engagement
6. Kira Instance
7. Subscription
8. Commercial Arrangement
9. Organisational Knowledge Context

Also audit the following mandatory separations:

- Organisation ≠ Person
- Organisation ≠ Kira Instance
- Organisation ≠ Subscription
- Consultant ≠ Introducer/Distributor
- Consultant ≠ Engagement
- Engagement ≠ Subscription
- Subscription ≠ Commercial Arrangement
- Conversation ≠ Organisational Knowledge
- Current State ≠ Historical Truth

These are architectural boundaries, not optional implementation preferences.

---

# 4. Existing P0.5 Authority Boundary

The P0.5 migration established `organisation_id` as the canonical tenant/isolation boundary.

Therefore:

> **`organisation_id` is the authoritative organisational security context.**

Do not reintroduce `users.id` as an organisational authority boundary.

Do not create alternate tenant resolution paths.

Do not infer organisational authority from:

- request body user IDs;
- URL user IDs;
- client-supplied organisation IDs;
- conversation ownership;
- Kira instance ownership;
- subscription ownership;
- consultant identity.

Where a route requires organisational context, resolve it through the established canonical authentication/organisation context mechanism.

All RLS-sensitive operations must remain aligned with the organisation-level authority chain established during P0.5.

---

# 5. Phase A — Establish Repository Context

Before modifying anything:

```powershell
Set-Location C:\Users\denni\PycharmProjects\Kira

git status
git branch --show-current
git log --oneline -10
```

Confirm:

- correct repository;
- current branch;
- clean/dirty working tree;
- recent migration history.

Do not operate against another project such as `cais-shared-services`.

Capture the initial Git state as audit evidence.

---

# 6. Phase B — Read Architectural Authority

Before coding, inspect:

- the canonical organisational model;
- P0.5 migration decisions;
- P0.5 forensic verification;
- P0.6 work already completed;
- `lib/auth.ts`;
- current organisation-context utilities;
- current RLS implementation;
- route-level authentication patterns.

Treat the canonical model as semantic authority.

Do not infer architectural meaning from legacy implementation simply because legacy code currently works.

---

# 7. Phase C — Full Implementation Traceability Audit

Construct the P0.6 traceability matrix.

For every canonical concept determine:

| Field | Required |
|---|---|
| Canonical Concept | Yes |
| Existing Implementation | Yes |
| File / Location | Yes |
| Database Representation | Yes |
| API Representation | Yes |
| Auth / Authority Representation | Yes |
| Conformance | Yes |
| Gap | Yes |
| Risk | Yes |
| Required Decision | Yes |
| Remediation | Yes |
| Verification | Yes |

Use these conformance classifications:

### CONFORMANT

Implementation correctly represents the canonical meaning.

### PARTIAL

Concept exists but implementation is incomplete, ambiguous or insufficiently separated.

### CONFLICTING

Implementation directly violates canonical semantics.

### MISSING

Canonical concept has no adequate implementation.

### UNKNOWN

Insufficient evidence exists to determine conformance.

Do not classify by intuition.

Every finding must have a source location.

---

# 8. Phase D — Search for Legacy Authority Patterns

Perform a repository-wide forensic search for legacy tenant and identity assumptions.

At minimum inspect for:

```text
user_id
users.id
auth.uid()
organisation_id
org_id
tenant_id
owner_id
consultant_id
subscription_id
kira_instance_id
conversation ownership
current user
request body user identifiers
URL user identifiers
```

Do not automatically replace every occurrence.

Each occurrence must be semantically classified.

For every `user_id` occurrence determine:

1. Is this Person identity?
2. Is this organisational membership?
3. Is this historical provenance?
4. Is this legitimate personal ownership?
5. Is this incorrectly being used as tenant authority?

Only the last category is necessarily a defect.

---

# 9. Phase E — API Route Audit

Audit every Kira API route.

For each route determine:

### Authentication

- Is the caller authenticated?
- How is identity resolved?
- Is the identity trusted from the authentication context?

### Organisation authority

- How is `organisation_id` resolved?
- Can the caller provide or override it?
- Is organisation membership verified?
- Does the route accidentally use `user_id` as tenant authority?

### Data access

- Which tables are accessed?
- What RLS policy governs them?
- Does the route perform additional application-level filtering?
- Is that filtering consistent with canonical semantics?

### Semantic context

Determine whether the route operates on:

- Organisation;
- Person;
- Engagement;
- Consultant;
- Kira Instance;
- Subscription;
- Commercial Arrangement;
- Organisational Knowledge;
- Conversation/evidence.

Do not collapse these concepts merely because they currently share a database relationship.

---

# 10. Phase F — Knowledge Boundary Audit

Treat organisational knowledge as a separate semantic layer from raw conversation history.

Audit code that:

- stores memories;
- retrieves memories;
- generates summaries;
- persists facts;
- stores conversation context;
- retrieves conversation history;
- creates embeddings;
- performs semantic search;
- writes knowledge records.

Determine whether the implementation distinguishes:

> **Evidence**

from:

> **Organisational Knowledge**

The system must not assume that everything said in a conversation automatically becomes canonical organisational memory.

Where provenance exists, preserve it.

Where provenance is required but absent, record the gap.

Do not invent a knowledge-governance implementation unless the current architecture supports it.

---

# 11. Phase G — Temporal Integrity Audit

Audit whether the implementation incorrectly models current state as permanent truth.

Specifically inspect:

- organisation ownership;
- consultants;
- engagements;
- subscriptions;
- commercial terms;
- Kira instances;
- organisational knowledge;
- organisational roles.

Identify code that overwrites historical state where the canonical model requires preservation.

The system must conceptually support:

> current truth

and:

> historical truth.

Do not destroy historical relationships merely because they are no longer current.

---

# 12. Phase H — Consultant / Engagement / Commercial Separation

Explicitly audit whether the implementation incorrectly collapses:

```text
Consultant
Engagement
Subscription
Commercial Arrangement
Introducer / Distributor
```

These are separate concepts.

A consultant may participate in an engagement.

An engagement is a bounded body of work.

A subscription represents Kira service entitlement.

A commercial arrangement governs the broader economic/contractual relationship.

An introducer/distributor is a channel relationship.

The same person or company may occupy multiple roles, but the roles must remain semantically distinct.

---

# 13. Phase I — Kira Instance Independence

Audit every implementation location where a Kira instance/tenant/deployment is treated as the organisation itself.

The implementation must permit:

```text
Organisation
    │
    ├── Kira Instance A
    │
    ├── Kira Instance B
    │
    └── Historical Kira Instance C
```

without creating separate organisational identities.

Replacing a Kira instance must not require:

- recreating the organisation;
- copying organisational memory;
- destroying historical knowledge;
- changing organisational identity;
- migrating history as if it belonged to the old instance.

If the current implementation violates this principle, classify it as a canonical conflict.

---

# 14. Phase J — Remediation

After the traceability audit, remediate defects in controlled batches.

### Priority P0

Remediate immediately where there is:

- incorrect tenant isolation;
- organisation identity corruption;
- cross-organisation access risk;
- `user_id` incorrectly acting as tenant authority;
- Kira instance incorrectly acting as organisation identity;
- RLS bypass;
- client-controlled organisation authority.

### Priority P1

Remediate:

- consultant/engagement semantic collapse;
- subscription/engagement semantic collapse;
- missing organisation context;
- knowledge/ conversation semantic collapse;
- loss of historical state;
- incorrect commercial ownership semantics.

### Priority P2

Record but do not block the migration for:

- naming inconsistencies;
- non-critical structural debt;
- documentation gaps;
- implementation improvements that do not affect canonical integrity.

---

# 15. Route-by-Route Change Discipline

For every route modified:

### BEFORE

Record:

- current file;
- current authority path;
- current organisation resolution;
- current user resolution;
- tables accessed;
- RLS dependencies;
- semantic purpose.

### CHANGE

Make the smallest change necessary to conform to the canonical model.

Do not perform unrelated refactoring.

Do not rewrite working code simply for stylistic consistency.

### AFTER

Verify:

- authentication;
- organisation authority;
- RLS compatibility;
- response semantics;
- error handling;
- TypeScript correctness;
- route-specific behaviour.

Then record the result.

---

# 16. Do Not Perform Mechanical Substitution

This is a forensic semantic migration.

Do **not** perform:

```text
user_id → organisation_id
```

as a global replacement.

That would be architecturally unsafe.

Instead determine the meaning of each occurrence.

For example:

```text
Person identity
```

may legitimately remain a person identifier.

Whereas:

```text
tenant authority
```

must use the canonical organisation authority.

The distinction must be explicit.

---

# 17. Database Verification

After application changes, verify the database assumptions.

Confirm:

- organisation-level RLS remains authoritative;
- knowledge tables remain protected by organisation membership;
- legacy `user_id` tenant policies are not reintroduced;
- no `USING (true)` policy creates unintended exposure;
- application queries remain compatible with RLS;
- organisation context is correctly propagated.

Do not weaken RLS to make application code work.

If application code conflicts with RLS, fix the application unless there is an explicitly approved architectural decision otherwise.

---

# 18. Test Requirements

Execute appropriate:

### Static checks

```powershell
npm run lint
npm run typecheck
```

if available.

### Build

```powershell
npm run build
```

if applicable.

### Repository tests

Execute the project's existing test suite.

### Security tests

Verify:

1. User from Organisation A cannot access Organisation B.
2. A caller cannot override organisation context through request payload.
3. A caller cannot obtain another organisation's knowledge by changing an ID.
4. A replaced Kira instance does not break organisational continuity.
5. Consultant changes do not transfer organisational identity.
6. Subscription changes do not change organisational identity.

Use the project's existing testing mechanisms where available.

Do not invent a new test framework merely to satisfy this directive.

---

# 19. Evidence Requirements

Every material remediation must produce evidence.

Capture:

- Git commit/hash;
- changed files;
- before/after authority path;
- relevant search results;
- tests executed;
- test results;
- build result;
- RLS verification;
- traceability classification;
- unresolved issues.

Evidence must be reproducible.

Do not report:

> "Looks good."

Report:

> what was tested, where, how, and with what result.

---

# 20. Git Discipline

Before beginning remediation:

```powershell
git status
```

After each coherent remediation batch:

```powershell
git diff --stat
git diff
```

Do not commit unrelated changes.

Use coherent commits.

Recommended commit structure:

```text
P0.6: trace organisation authority in API routes
P0.6: remediate organisation context violations
P0.6: preserve canonical knowledge boundary
P0.6: remediate consultant and engagement semantics
P0.6: add canonical traceability verification
```

Do not create a commit merely because files changed.

Each commit must represent an architecturally coherent unit.

---

# 21. Stop Conditions

STOP and report rather than guessing if:

- canonical meaning is ambiguous;
- two architectural interpretations are possible;
- database schema contradicts the canonical model;
- an RLS change would be required;
- historical data migration is required;
- a destructive migration appears necessary;
- an existing production dependency would be affected;
- a route's authority cannot be established confidently;
- a Kira instance appears to be serving as the organisation identity;
- knowledge ownership cannot be determined safely.

Do not silently choose a semantic interpretation.

Record the issue as:

```text
ARCHITECTURAL DECISION REQUIRED
```

with:

- evidence;
- competing interpretations;
- affected files;
- security/data risk;
- recommended decision.

---

# 22. Required Final Deliverable

At completion, produce the **P0.6 Implementation Traceability Matrix** containing:

| Canonical Concept | Implementation | Location | Conformance | Gap | Risk | Remediation | Verification |
|---|---|---|---|---|---|---|---|
| Organisation | | | | | | | |
| Person | | | | | | | |
| Ownership Period | | | | | | | |
| Consultant | | | | | | | |
| Engagement | | | | | | | |
| Kira Instance | | | | | | | |
| Subscription | | | | | | | |
| Commercial Arrangement | | | | | | | |
| Organisational Knowledge Context | | | | | | | |

Also produce an invariant matrix covering:

```text
INV-001 through INV-020
```

For every invariant report:

- PASS;
- PARTIAL;
- FAIL;
- NOT YET IMPLEMENTED;
- or BLOCKED / DECISION REQUIRED.

---

# 23. Required Executive Result

The final report must answer these questions explicitly:

1. Does Organisation now function as the canonical organisational subject?
2. Is `organisation_id` the canonical tenant authority?
3. Has the legacy `users.id → tenant` path been fully eliminated?
4. Are Person and organisational roles separated?
5. Is ownership temporalised?
6. Are Consultant and Engagement separate?
7. Are Consultant and Introducer/Distributor separate?
8. Are Engagement and Subscription separate?
9. Are Subscription and Commercial Arrangement separate?
10. Is Kira Instance independent from Organisation identity?
11. Does organisational knowledge survive Kira instance replacement?
12. Is conversation separated from organisational knowledge?
13. Is knowledge provenance represented or explicitly identified as a gap?
14. Is historical truth preserved?
15. Are commercial terms historically recoverable?
16. Are organisation-level RLS controls intact?
17. Can a user from Organisation A access Organisation B?
18. Are all known P0/P1 semantic conflicts remediated?
19. What remains unresolved?
20. Is Kira ready for the next architectural phase?

---

# 24. Definition of Done

P0.6 is complete only when:

- the full implementation traceability matrix exists;
- all nine canonical concepts have been audited;
- INV-001 through INV-020 have been assessed;
- all P0 authority/security conflicts are resolved;
- all P1 semantic conflicts are either resolved or explicitly accepted as architectural decisions;
- `organisation_id` remains the canonical tenant boundary;
- no legacy tenant authority has been unintentionally reintroduced;
- relevant routes have been audited;
- database/RLS assumptions have been verified;
- tests/build/type checks have been executed where available;
- evidence has been captured;
- unresolved architectural questions are explicitly recorded;
- Git state is understood;
- no unrelated refactoring has been introduced.

The implementation must be judged against the canonical model.

**Do not alter the canonical model to make the implementation appear conformant.**

---

# 25. Final Instruction to Kira Coding

Execute this directive now.

Work systematically from:

**canonical model → traceability → semantic audit → controlled remediation → verification → evidence.**

Do not optimise for the number of files changed.

Optimise for:

**architectural correctness, tenant isolation, organisational continuity, historical integrity and provable conformance.**

If a conflict exists between the existing code and the canonical organisational model, the conflict must be surfaced and resolved explicitly.

The objective is not merely to make the code compile.

The objective is to establish that the Kira implementation actually represents the organisational reality that Kira is required to preserve.