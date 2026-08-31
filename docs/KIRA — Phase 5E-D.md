# KIRA — Phase 5E-D
# Physical Design Specification — Approved Architecture → Exact PostgreSQL Design

**Status:** APPROVED ARCHITECTURAL DESIGN  
**Phase:** 5E-D  
**Purpose:** Translate the approved 5E-D architecture into the exact PostgreSQL physical design to be implemented in the subsequent implementation phase.

---

# 1. Status and Authority

This specification is the **physical design authority** for the 5E-D target architecture.

It supersedes the earlier architectural-only portions of 5E-D wherever those portions deliberately deferred exact PostgreSQL choices.

The following are already approved and therefore are not reopened here:

- Organisation is the canonical organisational anchor.
- `organisation_id` establishes organisational context only.
- Person/actor context is independent of Organisation.
- Kira Instance context is independent of Organisation ownership.
- Engagement is contextual and does not own memory.
- Provenance is independently represented.
- Semantic status is independent from confidence.
- Governance is independent from semantic status.
- Temporal meaning is independently preserved.
- Historical state is append-only and recoverable.
- Supersession is a first-class historical relationship.
- Ambiguous, unresolved and orphan records are quarantined.
- `kira_memory` remains the interaction/context layer.
- Structured Organisational Knowledge / Genome remains downstream.
- Compatibility is transitional infrastructure, not a second semantic authority.
- RLS is Organisation-primary but does not reduce authorisation to Organisation membership alone.

These principles derive directly from the approved 5E-D architecture and its mapping of the 5E-C invariants to physical consequences.

---

# 2. Physical Design Objective

The target is **not** a replacement copy of the existing `kira_memory` table.

The target is a normalised PostgreSQL representation of:

```text
Organisation
      │
      ▼
Target Memory
      │
      ├── Context
      ├── Provenance
      ├── Semantic State
      ├── Temporal State
      ├── Governance State
      └── History / Supersession
               │
               ▼
       Knowledge Processing
               │
               ▼
Structured Organisational Knowledge
```

The existing architecture explicitly requires supporting structures where lifecycle, cardinality, provenance or history are independent concerns.

---

# 3. PostgreSQL Design Conventions

## 3.1 Schema

The target structures shall reside in the existing application schema unless an implementation audit establishes that a dedicated schema is already used for the canonical domain.

For the purpose of this specification, the logical schema is:

```text
public
```

Existing canonical tables such as:

```text
organisations
persons
organisation_memberships
ownership_periods
kira_agents
engagements
```

remain authoritative where already established.

The implementation must use the existing canonical primary-key types rather than introducing parallel identity systems.

---

# 4. Target Tables

The target physical model consists of the following tables:

```text
kira_memory
kira_memory_provenance
kira_memory_history
kira_memory_supersession
kira_memory_quarantine
```

plus the already-existing canonical relationship tables:

```text
organisations
persons
kira_agents
engagements
organisation_memberships
ownership_periods
```

and the existing Structured Organisational Knowledge / Genome structures.

No second Organisation identity table is introduced.

---

# 5. `kira_memory`

## 5.1 Purpose

`kira_memory` remains the **interaction/context memory table**.

It is not the canonical Genome.

It represents a memory item that may participate in:

- conversational continuity;
- contextual recall;
- preferences;
- transient context;
- evidence capture;
- candidate knowledge processing.

The existing architecture explicitly preserves this boundary.

---

## 5.2 Exact columns

| Column | PostgreSQL type | Null | Default | Purpose |
|---|---|---:|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Stable memory identity |
| `organisation_id` | `uuid` | NO | none | Canonical Organisation anchor |
| `person_id` | `uuid` | YES | none | Canonical Person/actor context |
| `kira_agent_id` | `uuid` | YES | none | Kira Instance context |
| `engagement_id` | `uuid` | YES | none | Optional Engagement context |
| `content` | `text` | NO | none | Memory/context content |
| `semantic_status` | `text` | NO | `'asserted'` | Semantic disposition |
| `confidence` | `numeric(5,4)` | YES | none | Independent assessment strength |
| `observed_at` | `timestamptz` | YES | none | Time information was observed/provided |
| `effective_from` | `timestamptz` | YES | none | Beginning of applicable period |
| `effective_to` | `timestamptz` | YES | none | End of applicable period |
| `governance_state` | `text` | NO | `'normal'` | Independent governance treatment |
| `created_at` | `timestamptz` | NO | `now()` | Record creation |
| `updated_at` | `timestamptz` | NO | `now()` | Last current-record update |

### Design rule

`semantic_status`, `confidence`, `governance_state`, temporal columns and organisational context are **separate dimensions**.

No column may be interpreted as a substitute for another.

This directly implements the approved distinction that organisation resolution answers where a record belongs, provenance answers where it came from, semantic disposition answers what it represents, temporal state answers when it applies, and governance answers how it may be treated.

---

# 6. Identity

## 6.1 `id`

`kira_memory.id` is the immutable identity of the memory item.

It must never be reused.

It must remain stable across:

- semantic updates;
- governance changes;
- Kira Instance replacement;
- consultant changes;
- Engagement completion;
- Subscription changes;
- historical supersession.

---

# 7. Organisation Anchor

## 7.1 `organisation_id`

```text
uuid NOT NULL
```

Foreign key:

```text
REFERENCES organisations(id)
```

This is the authoritative organisational anchor.

It answers:

> Whose organisational context is this?

It does **not** answer:

- whether the content is true;
- whether it is validated;
- whether it is current;
- whether it is trusted;
- whether it is governed;
- whether a particular user may access it.

The final target requires `organisation_id NOT NULL`, but unresolved records must reach quarantine before that boundary is enforced.

---

# 8. Person Context

## 8.1 `person_id`

```text
uuid NULL
REFERENCES persons(id)
```

This replaces the semantic use of legacy `user_id` where the underlying identity can be resolved to the canonical Person.

It is contextual.

It is **not** the organisational owner.

The design must not impose:

```text
person_id → organisation_id
```

as a universal identity rule.

A person may have relationships with multiple organisations.

The approved architecture explicitly requires `user_id` to remain contextual rather than becoming the canonical organisational anchor.

---

# 9. Kira Instance Context

## 9.1 `kira_agent_id`

```text
uuid NULL
REFERENCES kira_agents(id)
```

This records the operational Kira Instance involved with the memory.

It is not the owner.

It must not be used as a substitute for:

```text
organisation_id
```

Historical Kira Instances remain valid references.

Replacing a Kira Instance therefore does not require rewriting memory ownership.

---

# 10. Engagement Context

## 10.1 `engagement_id`

```text
uuid NULL
REFERENCES engagements(id)
```

This is contextual only.

It allows Kira to answer:

> Which engagement produced, consumed or contextualised this memory?

It does not mean:

```text
engagement owns memory
```

The Organisation remains the canonical subject.

The approved model explicitly permits an optional Engagement reference while prohibiting Engagement from becoming the knowledge owner.

---

# 11. Content

## 11.1 `content`

```text
text NOT NULL
```

This stores the interaction/context memory content.

It remains intentionally separate from the Structured Organisational Knowledge model.

A memory can therefore contain information that is:

- conversational;
- contextual;
- temporary;
- preference-related;
- evidence;
- a candidate for later knowledge extraction.

It does not automatically become a canonical business fact.

---

# 12. Semantic Status

## 12.1 `semantic_status`

Use:

```text
text NOT NULL
```

with a controlled CHECK constraint.

Approved semantic vocabulary:

```text
asserted
observed
inferred
validated
disputed
superseded
rejected
```

The implementation must reject arbitrary values.

Example constraint:

```text
CHECK (
    semantic_status IN (
        'asserted',
        'observed',
        'inferred',
        'validated',
        'disputed',
        'superseded',
        'rejected'
    )
)
```

The status describes semantic disposition.

It does not represent confidence or governance.

---

# 13. Confidence

## 13.1 `confidence`

Use:

```text
numeric(5,4) NULL
```

with:

```text
CHECK (
    confidence IS NULL
    OR confidence >= 0
    AND confidence <= 1
)
```

Thus:

```text
0.0000 → 1.0000
```

is the valid range.

`confidence = 0.9000` means strong assessment.

It does not mean:

```text
semantic_status = validated
```

An example valid state is:

```text
semantic_status = 'asserted'
confidence = 0.9000
```

This distinction is mandatory. The approved architecture explicitly requires status and confidence to survive independently.

---

# 14. Temporal State

The physical design uses explicit temporal columns.

## 14.1 `observed_at`

```text
timestamptz NULL
```

Represents when the information was observed, supplied or otherwise encountered.

It must not automatically be replaced by migration time.

---

## 14.2 `effective_from`

```text
timestamptz NULL
```

Represents the beginning of the period during which the memory is understood to apply.

---

## 14.3 `effective_to`

```text
timestamptz NULL
```

Represents the end of the applicable period.

Open-ended current information has:

```text
effective_to IS NULL
```

---

## 14.4 Temporal constraint

The target table must enforce:

```text
effective_to IS NULL
OR effective_from IS NULL
OR effective_to >= effective_from
```

Migration time must never overwrite known historical timing.

The approved design explicitly requires preservation of observation time, effective meaning and historical interpretation rather than relying solely on `created_at`.

---

# 15. Governance State

## 15.1 `governance_state`

Use:

```text
text NOT NULL DEFAULT 'normal'
```

with controlled vocabulary:

```text
normal
pending_review
restricted
governed
```

Governance state is intentionally independent of semantic status.

Therefore all of the following are valid:

```text
asserted + pending_review
validated + restricted
disputed + governed
```

Governance cannot be inferred from:

- status;
- confidence;
- confirmation;
- organisation membership.

This follows the approved 5E-D governance architecture.

---

# 16. Audit Timestamps

## 16.1 `created_at`

```text
timestamptz NOT NULL DEFAULT now()
```

## 16.2 `updated_at`

```text
timestamptz NOT NULL DEFAULT now()
```

These are implementation/audit timestamps.

They are **not** substitutes for:

```text
observed_at
effective_from
effective_to
```

---

# 17. `kira_memory_provenance`

## 17.1 Purpose

Provenance is a separate first-class structure because a memory may have:

- one source;
- multiple sources;
- subsequent confirmation;
- inferred derivation;
- contradictory sources.

The approved architecture explicitly rejects reducing provenance to one `source_conversation_id`.

---

## 17.2 Exact columns

| Column | Type | Null | Purpose |
|---|---|---:|---|
| `id` | `uuid` | NO | Provenance record identity |
| `memory_id` | `uuid` | NO | Referenced memory |
| `source_type` | `text` | NO | Nature of source |
| `source_id` | `uuid` | YES | Source object identifier where applicable |
| `source_reference` | `text` | YES | Precise source location/reference |
| `source_conversation_id` | `uuid` | YES | Conversation source where applicable |
| `person_id` | `uuid` | YES | Person who supplied/captured information |
| `kira_agent_id` | `uuid` | YES | Kira Instance involved |
| `observed_at` | `timestamptz` | YES | Source observation time |
| `confirmed_by_person_id` | `uuid` | YES | Person who confirmed information |
| `confirmed_at` | `timestamptz` | YES | Confirmation time |
| `metadata` | `jsonb` | YES | Additional source-specific metadata |
| `created_at` | `timestamptz` | NO | Audit timestamp |

---

# 18. Provenance Source Types

Controlled `source_type` values:

```text
conversation
document
system
person
inference
migration
other
```

The vocabulary describes source origin.

It does not describe truth.

For example:

```text
source_type = conversation
semantic_status = asserted
confidence = 0.60
```

is valid.

Likewise:

```text
source_type = system
semantic_status = disputed
confidence = 0.90
```

is valid.

---

# 19. Provenance Relationships

Foreign keys:

```text
memory_id
    → kira_memory(id)

person_id
    → persons(id)

kira_agent_id
    → kira_agents(id)

confirmed_by_person_id
    → persons(id)
```

`source_conversation_id` should reference the existing conversation entity if a canonical conversation table exists.

If no canonical conversation table exists, it remains an external/source identifier and must not be converted into an artificial semantic ownership relationship.

---

# 20. Multiple Provenance

There is no uniqueness constraint on:

```text
memory_id
```

in `kira_memory_provenance`.

Therefore:

```text
one memory
    ↓
many provenance records
```

is explicitly supported.

This allows a memory to have:

```text
conversation source
+
document source
+
person confirmation
```

without overwriting earlier evidence.

---

# 21. `kira_memory_history`

## 21.1 Purpose

History is append-only.

The current memory row represents current materialised state.

The history table represents the recoverable transition record.

This separation prevents updates from destroying historical truth.

The approved architecture requires a first-class event/history mechanism covering creation, confirmation, validation, update, contradiction, rejection, supersession and governance changes.

---

## 21.2 Exact columns

| Column | Type | Null | Purpose |
|---|---|---:|---|
| `id` | `uuid` | NO | History/event identity |
| `memory_id` | `uuid` | NO | Memory affected |
| `event_type` | `text` | NO | Material state transition |
| `previous_status` | `text` | YES | Previous semantic status |
| `new_status` | `text` | YES | Resulting semantic status |
| `previous_confidence` | `numeric(5,4)` | YES | Previous confidence |
| `new_confidence` | `numeric(5,4)` | YES | Resulting confidence |
| `previous_governance_state` | `text` | YES | Previous governance state |
| `new_governance_state` | `text` | YES | Resulting governance state |
| `previous_content` | `text` | YES | Previous content where materially changed |
| `new_content` | `text` | YES | Resulting content |
| `actor_person_id` | `uuid` | YES | Person responsible for transition |
| `kira_agent_id` | `uuid` | YES | Kira Instance involved |
| `engagement_id` | `uuid` | YES | Engagement context |
| `provenance_id` | `uuid` | YES | Supporting provenance |
| `occurred_at` | `timestamptz` | NO | Time transition occurred |
| `metadata` | `jsonb` | YES | Additional event information |
| `created_at` | `timestamptz` | NO | Event persistence time |

---

# 22. History Event Types

Controlled values:

```text
created
updated
confirmed
validated
contradicted
rejected
superseded
governance_changed
```

The event is not itself the semantic state.

It records the transition.

---

# 23. Append-Only History Rule

`kira_memory_history` must not be treated as a normal mutable table.

Application semantics shall be:

```text
INSERT history event
```

rather than:

```text
UPDATE historical event
```

or:

```text
DELETE historical event
```

Any correction to historical interpretation must itself produce another historical event.

Historical truth is therefore preserved rather than rewritten.

---

# 24. `kira_memory_supersession`

## 24.1 Purpose

Supersession is a first-class relationship.

The legacy:

```text
superseded_by
```

field is not authoritative.

The target representation explicitly records:

```text
old memory
    ↓
superseded by
    ↓
new memory
```

The approved architecture requires the complete historical chain and its associated event/provenance to remain recoverable.

---

## 24.2 Exact columns

| Column | Type | Null | Purpose |
|---|---|---:|---|
| `id` | `uuid` | NO | Relationship identity |
| `superseded_memory_id` | `uuid` | NO | Older memory |
| `superseding_memory_id` | `uuid` | NO | Replacement memory |
| `history_event_id` | `uuid` | YES | Supersession event |
| `reason` | `text` | YES | Reason for replacement |
| `occurred_at` | `timestamptz` | NO | Time of supersession |
| `created_at` | `timestamptz` | NO | Audit timestamp |

---

# 25. Supersession Constraints

Both memory references must point to `kira_memory(id)`.

The following must be prohibited:

```text
superseded_memory_id = superseding_memory_id
```

Therefore:

```text
CHECK (
    superseded_memory_id <> superseding_memory_id
)
```

A unique constraint should prevent duplicate identical relationships:

```text
UNIQUE (
    superseded_memory_id,
    superseding_memory_id
)
```

---

# 26. Cross-Organisation Supersession

Supersession must not silently cross organisational boundaries.

The implementation must enforce:

```text
superseded_memory.organisation_id
=
superseding_memory.organisation_id
```

This should be enforced through implementation-level integrity rather than relying solely on application discipline.

The preferred implementation is a database trigger or equivalent integrity mechanism because ordinary independent foreign keys cannot express this cross-row condition.

---

# 27. Supersession Chain

The physical model must support:

```text
A → B → C
```

where:

```text
A.superseded_by = B
B.superseded_by = C
```

is represented through relationship rows rather than a single mutable pointer.

The resulting history remains queryable in both directions:

```text
What replaced A?
```

and:

```text
What was replaced by C?
```

---

# 28. No Destructive Supersession

The following pattern is forbidden:

```text
DELETE A
INSERT B
```

with no relationship.

The correct pattern is:

```text
A remains
    ↓
supersession relationship
    ↓
B exists
```

This directly implements the approved non-destructive historical rule.

---

# 29. `kira_memory_quarantine`

## 29.1 Purpose

Quarantine is the physical boundary protecting the final Organisation constraint.

Records are placed here when organisation context cannot safely be resolved.

Required states:

```text
ambiguous
unresolved
orphan
```

No arbitrary Organisation may be invented merely to satisfy:

```text
organisation_id NOT NULL
```

The approved migration architecture explicitly requires AMBIGUOUS, UNRESOLVED and ORPHAN records to be isolated before final enforcement.

---

# 30. Exact Quarantine Columns

| Column | Type | Null | Purpose |
|---|---|---:|---|
| `id` | `uuid` | NO | Quarantine record identity |
| `legacy_memory_id` | `uuid` | YES | Original memory identity |
| `legacy_user_id` | `uuid` | YES | Original actor identity |
| `legacy_kira_agent_id` | `uuid` | YES | Original Kira Instance |
| `legacy_source_conversation_id` | `uuid` | YES | Original conversation |
| `legacy_organisation_id` | `uuid` | YES | Original organisation value if present |
| `content` | `text` | YES | Original memory content |
| `resolution_status` | `text` | NO | Quarantine classification |
| `candidate_organisation_ids` | `uuid[]` | YES | Candidate organisations |
| `resolution_reason` | `text` | NO | Why resolution failed |
| `resolution_evidence` | `jsonb` | YES | Evidence used |
| `review_status` | `text` | NO | Review lifecycle |
| `review_decision` | `text` | YES | Resolution decision |
| `reviewed_by_person_id` | `uuid` | YES | Reviewing person |
| `reviewed_at` | `timestamptz` | YES | Review time |
| `resolved_organisation_id` | `uuid` | YES | Organisation selected after review |
| `resolved_memory_id` | `uuid` | YES | Target memory after resolution |
| `created_at` | `timestamptz` | NO | Quarantine timestamp |
| `updated_at` | `timestamptz` | NO | Last review/update |

---

# 31. Quarantine Resolution Status

Controlled values:

```text
ambiguous
unresolved
orphan
```

These represent why the record cannot currently cross the canonical boundary.

---

# 32. Quarantine Review Status

Controlled values:

```text
pending
in_review
resolved
retained
```

A quarantined record remains recoverable even when the final decision is:

```text
retained
```

---

# 33. Organisation Resolution

Migration must use the approved 5E-B resolution sequence:

```text
1. kira_agent_id → kira_agents.organisation_id

2. user/person relationship →
   unambiguous organisation relationship

3. conversation →
   corroborating evidence
```

Conflicting evidence produces:

```text
AMBIGUOUS
```

not an arbitrary winner.

This resolution sequence is explicitly preserved in the approved migration design.

---

# 34. Quarantine Is Not Deletion

Quarantine must preserve sufficient information to reconstruct the migration decision.

At minimum, the original:

- memory identity;
- actor;
- Kira Instance;
- conversation;
- content;
- organisation evidence;
- resolution reasoning

must remain recoverable.

No unresolved record may simply disappear from the migration because it does not fit the target schema.

---

# 35. Compatibility Layer

The compatibility mechanism is an **application/service adapter backed by explicit target structures**, rather than creating a competing semantic schema.

Its purpose is to allow existing application behaviour to continue while application code migrates.

The approved architecture states that compatibility may expose legacy-compatible fields, provide legacy-style reads and preserve UI expectations, but may not manufacture semantics.

---

# 36. Compatibility Rules

The adapter may translate:

```text
target organisation_id
→ legacy-compatible organisation context
```

and:

```text
target semantic state
→ legacy-compatible projection
```

where required.

It must never:

```text
user_id → organisation ownership
```

or:

```text
organisation_id → truth
```

or:

```text
confidence → validation
```

or:

```text
current state → historical truth
```

---

# 37. Legacy `genome_section`

Legacy:

```text
genome_section
```

must not be promoted into the target memory semantic model.

It may survive temporarily as:

- migration metadata;
- compatibility metadata;
- existing UI support;
- historical reference.

It does not define the Structured Genome classification model.

The approved architecture explicitly distinguishes row-level legacy classification from the downstream Genome's entity/fact/relationship/attribute model.

---

# 38. Legacy Field Mapping

| Legacy field | Target |
|---|---|
| primary key | `kira_memory.id` |
| `user_id` | `person_id` / provenance actor |
| `kira_agent_id` | `kira_memory.kira_agent_id` |
| `source_conversation_id` | `kira_memory_provenance.source_conversation_id` |
| `organisation_id` | `kira_memory.organisation_id` |
| content/body | `kira_memory.content` |
| confirmation data | semantic state / provenance / history |
| confidence | `kira_memory.confidence` |
| `superseded_by` | `kira_memory_supersession` |
| timestamps | target audit/temporal columns according to semantic meaning |
| `genome_section` | compatibility/migration metadata |
| unclear semantic fields | explicit migration mapping or quarantine |
| obsolete fields | legacy/deprecation layer |

This follows the approved migration mapping rather than mechanically copying legacy columns.

---

# 39. Index Design

The target design requires indexes supporting the principal access patterns.

## 39.1 Organisation

```text
kira_memory(organisation_id)
```

Primary tenancy/access index.

---

## 39.2 Organisation + temporal

```text
kira_memory(
    organisation_id,
    effective_from,
    effective_to
)
```

Supports historical/current organisational queries.

---

## 39.3 Organisation + semantic status

```text
kira_memory(
    organisation_id,
    semantic_status
)
```

Supports semantic filtering.

---

## 39.4 Organisation + governance

```text
kira_memory(
    organisation_id,
    governance_state
)
```

Supports governance-aware retrieval.

---

## 39.5 Person context

```text
kira_memory(person_id)
```

Supports actor-context queries.

---

## 39.6 Kira Instance

```text
kira_memory(kira_agent_id)
```

Supports operational-instance history.

---

## 39.7 Engagement

```text
kira_memory(engagement_id)
```

Supports engagement-context retrieval.

---

## 39.8 Provenance

```text
kira_memory_provenance(memory_id)
```

Supports source lineage.

---

## 39.9 History

```text
kira_memory_history(
    memory_id,
    occurred_at
)
```

Supports chronological history retrieval.

---

## 39.10 Supersession

```text
kira_memory_supersession(
    superseded_memory_id
)
```

and:

```text
kira_memory_supersession(
    superseding_memory_id
)
```

support traversal in both directions.

---

# 40. Partial Index for Current Memory

A partial index should support current/open-ended memory:

```text
WHERE effective_to IS NULL
```

with:

```text
(organisation_id, semantic_status)
```

This avoids treating historical records as current merely because they remain physically present.

---

# 41. Foreign-Key Rules

## `kira_memory`

```text
organisation_id
    → organisations.id

person_id
    → persons.id

kira_agent_id
    → kira_agents.id

engagement_id
    → engagements.id
```

The default implementation policy should preserve historical memory when related contextual entities are retired.

Therefore destructive cascading deletes are prohibited for historical memory.

Preferred behaviour:

```text
ON DELETE RESTRICT
```

or:

```text
ON DELETE SET NULL
```

depending on whether the referenced entity's lifecycle permits deletion.

The implementation must not allow deletion of a canonical Organisation while memories still depend on it.

---

# 42. History Foreign Keys

History references:

```text
memory_id → kira_memory.id
actor_person_id → persons.id
kira_agent_id → kira_agents.id
engagement_id → engagements.id
provenance_id → kira_memory_provenance.id
```

Historical rows must never be deleted merely because a contextual actor, engagement or Kira Instance becomes inactive.

---

# 43. RLS Architecture

RLS is Organisation-primary.

The security path is:

```text
authenticated identity
        ↓
Person
        ↓
Organisation membership / authorised relationship
        ↓
Organisation
        ↓
Memory
```

not:

```text
authenticated identity
        ↓
user_id
        ↓
memory rows
```

The approved architecture explicitly states that Organisation establishes tenancy/context while final authorisation may additionally depend on Person, role, Engagement, sensitivity, provenance, governance and time.

---

# 44. RLS Policy Principle

For ordinary organisational users:

```text
memory.organisation_id
```

must match an Organisation to which the authenticated Person has an authorised relationship.

For privileged/service roles, access must still be explicit.

No policy may grant access merely because:

```text
memory.person_id = authenticated_person
```

unless that access is independently authorised.

---

# 45. Cross-Organisation Isolation

The following must be impossible:

```text
Person A
Organisation A
        ↓
query
        ↓
Organisation B memory
```

simply because Person A happens to have:

```text
person_id
```

on a memory belonging to Organisation B.

Organisation remains the primary security partition.

---

# 46. Governance-Aware RLS

Governance state may further restrict access.

For example:

```text
governance_state = restricted
```

must not automatically become visible merely because:

```text
organisation_id
```

matches.

The RLS architecture therefore has two conceptual layers:

```text
Organisation boundary
        +
Authorisation/governance rules
```

---

# 47. RLS and Quarantine

Quarantine records must not become visible to ordinary application memory queries.

Quarantine access must be restricted to authorised migration/review roles.

A quarantined record must not accidentally appear as normal organisational memory.

---

# 48. Current-State Materialisation

`kira_memory` represents the current materialised memory state.

`kira_memory_history` represents historical transitions.

This gives:

```text
current state
+
append-only history
```

rather than forcing every read to reconstruct state from events.

This is appropriate for Kira because existing application behaviour requires efficient interaction/context retrieval while historical truth must remain recoverable.

---

# 49. Update Protocol

A material change to a memory follows:

```text
BEGIN
   │
   ├── lock current memory
   │
   ├── capture previous state
   │
   ├── update kira_memory
   │
   ├── insert kira_memory_history event
   │
   └── COMMIT
```

The history record and current-state update must occur transactionally.

There must never be a committed current-state change for which the corresponding historical transition is silently absent.

---

# 50. Supersession Protocol

Supersession follows:

```text
BEGIN
   │
   ├── create replacement memory
   │
   ├── insert supersession relationship
   │
   ├── mark old memory superseded
   │
   ├── insert supersession history event
   │
   └── COMMIT
```

The old memory remains physically present.

---

# 51. Migration Protocol

The migration is explicitly a semantic translation.

The approved migration sequence is:

```text
LEGACY
   ↓
ANALYSED
   ↓
ORGANISATION RESOLUTION
   │
   ├── RESOLVED → TARGET
   │
   ├── AMBIGUOUS → QUARANTINE
   │
   └── UNRESOLVED / ORPHAN → QUARANTINE
```

This is the approved migration state model.

---

# 52. Migration Organisation Resolution

The migration implementation must apply:

### Primary

```text
kira_agent_id
    →
kira_agents.organisation_id
```

### Secondary

```text
user_id
    →
canonical Person
    →
unambiguous Organisation relationship
```

### Tertiary

```text
conversation
    →
corroborating evidence
```

Conflicts result in:

```text
AMBIGUOUS
```

not silent assignment.

---

# 53. Migration Invariants

The following are mandatory implementation tests.

### MIG-001

No silent organisation assignment.

### MIG-002

Ambiguous evidence remains ambiguous.

### MIG-003

Every quarantined row retains its legacy identity.

### MIG-004

Provenance survives.

### MIG-005

Historical state survives.

### MIG-006

Recoverable status survives.

### MIG-007

Confidence remains independent.

### MIG-008

Known temporal meaning survives.

### MIG-009

Kira Instance continuity survives.

### MIG-010

Person context survives.

### MIG-011

Structured knowledge remains downstream.

These are explicitly defined in the approved migration architecture.

---

# 54. Final `organisation_id NOT NULL` Gate

The final constraint:

```text
organisation_id NOT NULL
```

may only be enforced after:

1. every eligible record has been classified;
2. resolved records have an approved Organisation;
3. ambiguous records are quarantined;
4. unresolved records are quarantined;
5. orphan records are quarantined;
6. provenance has been preserved;
7. historical relationships have been migrated;
8. cross-organisation validation has passed.

The constraint is therefore a **data-integrity conclusion**, not a migration mechanism.

---

# 55. Structured Genome Boundary

The target architecture ends the `kira_memory` semantic responsibility at:

```text
interaction/context memory
+
evidence
+
candidate knowledge
```

It does not make `kira_memory` responsible for the complete Structured Genome.

The downstream pipeline remains:

```text
kira_memory
     ↓
knowledge processing
     ↓
validation / governance
     ↓
Structured Organisational Knowledge
     ↓
Genome entities / facts /
relationships / attributes
```

Legacy `genome_section` must not collapse this boundary.

---

# 56. Data Integrity Rules

The implementation must enforce:

### DI-001

`organisation_id` cannot be NULL in authoritative memory.

### DI-002

`confidence` must be between `0` and `1`.

### DI-003

`semantic_status` must use the approved vocabulary.

### DI-004

`governance_state` must use the approved vocabulary.

### DI-005

`effective_to` cannot precede `effective_from`.

### DI-006

A memory cannot supersede itself.

### DI-007

Duplicate supersession relationships are prohibited.

### DI-008

Supersession cannot silently cross Organisations.

### DI-009

History cannot be silently deleted.

### DI-010

Quarantined records cannot appear as authoritative memory.

### DI-011

Organisation identity cannot be derived from Person identity alone.

### DI-012

Kira Instance identity cannot substitute for Organisation identity.

---

# 57. What Must NOT Be Added

The implementation must not introduce:

```text
memory.user_id as organisation owner
```

or:

```text
memory.kira_agent_id as organisation owner
```

or:

```text
memory.engagement_id as knowledge owner
```

or:

```text
confidence = validation
```

or:

```text
governance = status
```

or:

```text
superseded_by as authoritative history
```

or:

```text
genome_section as canonical Genome classification
```

or:

```text
conversation = organisational truth
```

These would recreate the semantic collapses that 5E-D was specifically designed to eliminate.

---

# 58. Implementation Sequence

The subsequent implementation phase shall proceed in this order:

```text
1. Verify existing canonical table PK/FK types
        ↓
2. Create target supporting structures
        ↓
3. Create target constraints
        ↓
4. Create indexes
        ↓
5. Create history/supersession integrity mechanisms
        ↓
6. Create quarantine
        ↓
7. Implement migration-resolution staging
        ↓
8. Migrate resolved records
        ↓
9. Validate quarantine/resolution counts
        ↓
10. Activate compatibility adapter
        ↓
11. Enable target-authoritative reads
        ↓
12. Enable target-authoritative writes
        ↓
13. Activate RLS
        ↓
14. Enforce final organisation_id NOT NULL boundary
        ↓
15. Deprecate legacy semantic fields
```

No destructive legacy deletion occurs before migration validation and application dependency verification.

---

# 59. Acceptance Test Matrix

| Test | Expected Result |
|---|---|
| Replace Kira Instance | Memory remains with same Organisation |
| Change Person relationship | Historical memory remains |
| Change Consultant | Memory does not move |
| Complete Engagement | Memory remains valid |
| Change Subscription | Memory unchanged |
| Supersede memory | Old record remains |
| Traverse A → B → C | Full chain recoverable |
| Multiple sources | All provenance remains |
| Asserted + high confidence | Remains asserted |
| Validated + restricted | Valid state |
| Governance change | Does not alter semantic status |
| Ambiguous organisation | Quarantine |
| Unresolved organisation | Quarantine |
| Orphan record | Quarantine |
| Person in multiple organisations | No leakage |
| Conversation source | Not treated as truth |
| Legacy `genome_section` | Does not become Genome semantics |
| Historical query | Prior state recoverable |
| Current query | Historical records not mistaken for current |
| Cross-organisation supersession | Rejected |

---

# 60. Physical Authority Model

After implementation:

```text
organisations
    ↓
canonical organisational identity

kira_memory
    ↓
interaction/context memory

kira_memory_provenance
    ↓
evidence lineage

kira_memory_history
    ↓
historical state transitions

kira_memory_supersession
    ↓
replacement lineage

kira_memory_quarantine
    ↓
unresolved migration boundary

Structured Organisational Knowledge
    ↓
canonical structured business knowledge
```

Each structure has one responsibility.

No structure is permitted to silently become another structure's semantic authority.

---

# 61. Final Design Principle

The physical PostgreSQL model is therefore:

```text
                 ORGANISATION
                      │
                      ▼
                KIRA MEMORY
                      │
       ┌──────────────┼───────────────┐
       │              │               │
       ▼              ▼               ▼
   PROVENANCE      SEMANTICS       TEMPORAL
       │          status/conf.       STATE
       │              │               │
       └──────────────┼───────────────┘
                      │
                 GOVERNANCE
                      │
                      ▼
               HISTORY / EVENTS
                      │
                      ▼
                SUPERSESSION
                      │
                      ▼
             KNOWLEDGE PROCESSING
                      │
                      ▼
        STRUCTURED ORGANISATIONAL
                KNOWLEDGE
```

The decisive rule remains:

> **Organisation resolution determines where a memory belongs. Provenance determines where it came from. Semantic status determines what it represents. Confidence determines the strength of assessment. Temporal state determines when it applies. Governance determines how it may be treated. History determines how it changed. Supersession determines what replaced it. None may be silently substituted for another.**

---

# 62. Phase Boundary

This specification now completes the transition from:

```text
5E-C
Target Semantic Meaning
```

to:

```text
5E-D
Exact PostgreSQL Physical Design
```

The next phase is no longer another architectural-definition phase.

It is:

```text
5E-E — PostgreSQL Implementation & Migration
```

That phase may now produce:

- actual SQL DDL;
- migration scripts;
- indexes;
- constraints;
- triggers;
- RLS policies;
- quarantine migration;
- compatibility adapter;
- data validation;
- application changes.

Those implementation artefacts must conform to this specification and must not redefine its semantics.

---

# 63. 5E-D Acceptance Statement

> **The KIRA 5E-D physical design is approved as the PostgreSQL implementation target. The design preserves Organisation as the canonical organisational anchor while independently representing Person context, Kira Instance context, Engagement context, provenance, semantic status, confidence, temporal state, governance, historical state and supersession. Unresolved organisational context is quarantined before the final `organisation_id NOT NULL` boundary. Historical records remain recoverable. Compatibility remains transitional. `kira_memory` remains the interaction/context layer and Structured Organisational Knowledge remains downstream.**

**5E-D → READY FOR IMPLEMENTATION**

No further semantic approval is required unless implementation discovers a conflict with the locked canonical architecture.