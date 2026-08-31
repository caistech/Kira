# KIRA — P0.3-G.1 Migration Safety Refinement

**Status:** Architectural Amendment to P0.3-G
**Purpose:** Resolve 7 architectural inconsistencies in the transition architecture before freezing into executable tests
**Scope:** Identity resolution, RLS, rollback, dual-write, Person independence, Migration Ledger
**Prerequisite:** P0.3-G (Compatibility & Transition Architecture)
**Date:** 26 August 2026

---

## 1. Purpose

P0.3-G establishes the correct transition direction: user-centric → organisation-centric. This amendment resolves 7 architectural inconsistencies that, if left uncorrected, would make P0.3-H validate a flawed transition rather than validate the canonical model.

The governing principle of this amendment is:

> **UUID equality during migration does not imply entity identity.**

---

## 2. Refinement 1: UUID Reuse = Migration Optimisation, Not Semantic Identity

P0.3-G states:

```
organisations.id = users.id
persons.id = users.id
```

This is a migration convenience that minimises FK changes. It must never be interpreted as evidence that Person and Organisation are the same entity.

### Rule

> **UUID reuse is a migration optimisation only. The equality may cease to hold in future migrations. Developers must never write `organisation_id = user_id` or `person_id = user_id` as if these are semantically equivalent.**

### Implementation

The backfill procedure reuses `users.id` as the initial UUID for both `organisations.id` and `persons.id`. This is a technical decision to avoid rewriting every FK in the database during Phase 1. It is not a statement about the relationship between Person and Organisation.

Future migrations may introduce new UUIDs for `organisations.id` or `persons.id` if deduplication, consolidation, or external identity systems require it. The migration ledger (Refinement 10) records which `users.id` mapped to which canonical UUID.

---

## 3. Refinement 2: Identity Resolution Replaces Simplistic Deduplication

P0.3-G describes "ABN deduplication pass" and "Email deduplication pass" as if these are straightforward operations. They are not.

### The Problem

Suppose:
- `users.id = A`, `business_identity.abn = 123`
- `users.id = B`, `business_identity.abn = 123`

If we deduplicate Organisations before migration, which Organisation gets UUID `A`? What happens to existing records belonging to `B`?

Likewise:
- `user A → john@example.com`
- `user B → john@example.com`

This does not necessarily mean they are the same Person.

### Identity Resolution

Replace simplistic deduplication with **Identity Resolution** — a formal process that determines whether multiple legacy records represent the same canonical entity.

**Resolution outcomes:**

| Outcome | Meaning | Action |
|---------|---------|--------|
| **ONE → ONE** | One legacy record maps to one canonical entity | Direct mapping |
| **ONE → MANY** | One legacy record contains data for multiple canonical entities | Split with attribution rules |
| **MANY → ONE** | Multiple legacy records represent one canonical entity | Consolidate with mapping table |

### Consolidation Mapping Table

```sql
CREATE TABLE legacy_identity_map (
    legacy_user_id UUID NOT NULL,          -- source users.id
    canonical_person_id UUID NOT NULL,     -- target persons.id
    canonical_organisation_id UUID NOT NULL, -- target organisations.id
    resolution_method TEXT NOT NULL,        -- 'direct', 'abn_match', 'email_match', 'manual'
    confidence NUMERIC(3,2) NOT NULL,       -- resolution confidence
    resolved_at TIMESTAMPTZ NOT NULL,       -- when resolved
    resolved_by TEXT NOT NULL,              -- who resolved (system/human)
    notes TEXT                              -- additional context
);
```

### Constraints

- MANY → ONE resolution requires an explicit identity-resolution decision recorded in `legacy_identity_map`.
- MANY → ONE resolution must preserve the historical records of all legacy entities. No data is destroyed.
- The mapping table is immutable once created. Corrections are additive (new rows with updated `resolution_method`).

---

## 4. Refinement 3: Shadow RLS Evaluation Before Authority Transfer

P0.3-G describes parallel RLS policies that are ORed. This creates a serious problem: if the legacy policy allows access but the canonical policy denies it, the row is still accessible. The legacy policy remains authoritative in practice.

### The Fix

Replace parallel permissive policies with **shadow evaluation**.

**Phase 1: Shadow Evaluation**

```sql
-- Authoritative policy (legacy, still active)
CREATE POLICY "legacy_user_access" ON kira_memory
  FOR ALL USING (user_id = auth.uid());

-- Shadow policy (evaluated but NOT granting access)
-- Implemented as a function that returns the canonical access decision
CREATE FUNCTION canonical_access_check(table_name TEXT, record_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Evaluate whether the canonical policy would allow access
  RETURN EXISTS (
    SELECT 1 FROM organisation_memberships
    WHERE organisation_id = (
      SELECT organisation_id FROM kira_memory WHERE id = record_id
    )
    AND person_id = (
      SELECT id FROM persons WHERE auth_user_id = auth.uid()
    )
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql;
```

**Phase 2: Audit Divergence**

Log every access where:
- Legacy policy allows, canonical policy denies
- Legacy policy denies, canonical policy allows

**Phase 3: Authority Transfer**

Once divergence reaches zero:
1. Remove legacy policy.
2. Canonical policy becomes authoritative.

**Phase 4: Remove**

Drop legacy policy definitions.

### Key Distinction

> **Parallel evaluation, not parallel authority.** The legacy policy remains the sole authority during Phase 1. The canonical policy is evaluated for audit purposes only. Authority transfers explicitly at Phase 3.

---

## 5. Refinement 4: Service-Role Isolation Separated from RLS

P0.3-G states: "All critical access goes through service-role client (bypasses RLS), so the dual-policy phase is low-risk for production data."

This makes the architectural argument weaker. If critical operations bypass RLS, then RLS is no longer the isolation boundary for those operations.

### The Fix

Service-role operations are outside the RLS migration boundary and must independently enforce Organisation context.

**Architecture:**

```
Browser/Session Client
    ↓
RLS (session-level isolation)
    ↓
Application Code

Service-Layer Client (service_role)
    ↓
No RLS (bypassed)
    ↓
Application-enforced Organisation context
```

**Rule:**

> **Service-role operations must enforce Organisation context at the application layer. RLS is the isolation boundary for session-client access only. Both isolation mechanisms must be independently validated.**

### P0.3-H Testing

The test suite must validate both:
1. Session-client isolation via RLS
2. Service-layer Organisation context enforcement

---

## 6. Refinement 5: Rollback = Authority Rollback, Not Schema Destruction

P0.3-G claims "additive migration with deprecation, not deletion" but then describes rollback actions that are destructive: "Remove organisation_id columns. Drop organisations table."

These statements cannot simultaneously be true.

### The Fix

Rollback is authority rollback, not schema destruction.

**Phase 1 (Bridge) Rollback:**
- `organisation_id` columns remain.
- `organisations` table remains.
- Legacy `user_id` remains authoritative.
- Canonical data remains (but is not authoritative).

**Phase 2 (Migrated) Rollback:**
- `organisation_id` columns remain.
- `organisations` table remains.
- `persons` table remains.
- Legacy `user_id` authority temporarily restored.
- Canonical data remains.

**Phase 3 (Target) Rollback:**
- `organisation_id` columns remain.
- `organisations` table remains.
- `persons` table remains.
- `organisation_memberships` table remains.
- Legacy authority temporarily restored.

### Key Principle

> **Rollback restores the previous authority state. It does not destroy schema or data. All tables and columns created during migration persist through rollback.**

---

## 7. Refinement 6: Dual-Context Persistence Replaces Ambiguous Dual-Write

P0.3-G describes a "dual-write" strategy where legacy code writes to `user_id`-scoped records and a trigger writes to `organisation_id`-scoped records. This creates a consistency problem: two records representing the same logical fact.

### The Fix

Replace dual-write with **dual-context persistence**: one record, two contextual identifiers.

**Mechanism:**

```
Single Record:
    id = UUID
    user_id = X          (legacy context, retained temporarily)
    organisation_id = Y   (canonical context, added during migration)
    ... other fields ...
```

**Write path:**
1. Application writes to the single record.
2. `user_id` is populated from the authenticated user (legacy context).
3. `organisation_id` is populated from the backfilled mapping (canonical context).
4. Both identifiers coexist on the same record.

**Read path:**
1. Legacy code reads via `WHERE user_id = ?` (unchanged).
2. New code reads via `WHERE organisation_id = ?` (new).
3. Both queries return the same records.

### Key Principle

> **One coherent organisational memory, not parallel memories. The canonical model explicitly requires organisational knowledge to survive implementation changes. Dual-write creates parallel memories; dual-context persistence preserves one.**

---

## 8. Refinement 7: Person Independence Wording Corrected

P0.3-G states: "Person becomes independent of Organisation at State 3."

The canonical model says Person is already conceptually independent of Organisation. The implementation simply does not yet conform.

### The Fix

**State 2:**
- Person entity introduced.
- Organisation authority established.
- Person ↔ Organisation relationship represented via `organisation_memberships`.

**State 3:**
- Person identity fully decoupled from legacy `users` implementation.
- Temporal memberships/roles become authoritative.
- Auth credentials linked to Person, not Organisation.

### Key Principle

> **Person does not become independent in State 3. The implementation finally conforms to an identity that was already conceptually independent.**

---

## 9. Revised State Model

| State | Meaning | Authority |
|-------|---------|-----------|
| **0 — Current** | Legacy user-centric implementation | `user_id` |
| **1 — Bridge** | Organisation introduced; legacy implementation retained; canonical model shadowed | `user_id` (authoritative), `organisation_id` (shadowed) |
| **2 — Migrated** | Organisation becomes tenancy authority; Person entity introduced | `organisation_id` |
| **3 — Canonical** | Person, temporal roles, ownership, engagements, and governed knowledge fully represented | Organisation + Person relationship model |

### Critical Distinction

> **State 1 has one authority, not two.** The canonical model is shadowed for audit purposes. Authority transfers explicitly at State 2.

> **State 2 authority transfer is an explicit governance boundary.** Technical rollback remains possible, but the authority transfer is treated as irreversible in practice. Once Organisation is authoritative, reverting to `user_id` authority requires explicit governance approval.

---

## 10. Migration Ledger

Introduce a **Migration Ledger** — an immutable record of every migration decision.

### Schema

```sql
CREATE TABLE migration_ledger (
    ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_user_id UUID NOT NULL,          -- source users.id
    canonical_person_id UUID,              -- target persons.id (nullable until Phase 3)
    canonical_organisation_id UUID NOT NULL, -- target organisations.id
    source_table TEXT NOT NULL,             -- source table name
    source_record_id UUID NOT NULL,         -- source record ID
    migration_phase TEXT NOT NULL,          -- 'bridge', 'migrated', 'canonical'
    resolution_status TEXT NOT NULL,        -- 'confirmed', 'derived', 'probable', 'ambiguous', 'insufficient'
    resolution_method TEXT NOT NULL,        -- 'direct', 'abn_match', 'email_match', 'manual'
    resolution_reason TEXT,                 -- why this mapping was chosen
    migration_timestamp TIMESTAMPTZ NOT NULL, -- when migrated
    validation_status TEXT NOT NULL,        -- 'pending', 'validated', 'failed'
    rollback_status TEXT NOT NULL,          -- 'active', 'rolled_back'
    notes TEXT
);
```

### Purpose

The Migration Ledger provides:
- An immutable explanation for why every legacy record resolved to a specific Organisation.
- A complete audit trail for identity resolution decisions.
- A foundation for debugging when duplicate users, multiple owners, consultants, or merged organisations appear.
- Direct support for the canonical requirement that provenance and historical truth remain recoverable.

### Constraints

- The Migration Ledger is append-only. Records are never updated or deleted.
- Every migration operation must create a corresponding Migration Ledger entry.
- The Ledger is the authoritative source for "why does this old user now resolve to this Organisation?"

---

## 11. Revised Rollback Strategy

| Phase | Rollback Action | Data Impact | Schema Impact |
|-------|----------------|-------------|---------------|
| Phase 1 (Bridge) | Restore `user_id` authority. Canonical data remains but is not authoritative. | None | None |
| Phase 2 (Migrated) | Restore `user_id` authority. Person entity remains. Canonical data remains. | None | None |
| Phase 3 (Canonical) | Restore `user_id` authority. All canonical entities remain. | None | None |

**Invariant:** No tables or columns are dropped during rollback. Rollback restores the previous authority state without destroying schema or data.

---

## 12. Revised Exit Criteria for P0.3-G

This phase is complete when:
1. The `Organisation` entity exists and is mapped for all existing users.
2. The `legacy_identity_map` table is populated with resolution decisions for all users.
3. The `migration_ledger` table is populated with migration decisions for all records.
4. The dual-context persistence mechanism is operational (one record, two identifiers).
5. RLS shadow evaluation is operational and divergence is zero.
6. Service-layer Organisation context enforcement is validated.
7. Authority rollback has been tested at every phase boundary.
8. Person entity exists with independent identity.
9. The transition path to P0.3-H (Architectural Test Suite) is fully defined and tested.

---

*This amendment resolves the 7 architectural inconsistencies in P0.3-G. P0.3-G as amended by P0.3-G.1 is now ready to serve as the basis for P0.3-H (Architectural Test Suite).*
