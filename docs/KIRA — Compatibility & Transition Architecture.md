# KIRA — Compatibility & Transition Architecture

**Status:** Architectural Specification
**Purpose:** P0.3-G — Define the controlled path from user-centric implementation to organisation-centric canonical model
**Scope:** Identity, tenancy, data, access-control, and application compatibility transitions
**Prerequisite:** P0.3-A through P0.3-F, Forensic Audit of Identity/Tenancy Boundary
**Date:** 26 August 2026

---

## 1. Purpose and Governing Principle

This artifact defines the **transition architecture** that moves Kira from its current user-centric implementation to the canonical organisation-centric model established in P0.1–P0.3.

The governing principle is:

> **P0.3-G is an identity and tenancy transition plan, not a database migration plan.**

The forensic audit established that the current implementation has a fundamentally different identity ontology: `users.id` serves as both person identity and organisational identity. The transition must move from this conflation to a model where Organisation is the durable anchor, Person is independent, and knowledge belongs to the Organisation.

---

## 2. Five Migration Dimensions

The transition has five distinct but related dimensions. Each must be planned and executed independently.

| Dimension | Definition | Risk Level |
|-----------|-----------|------------|
| **Identity Migration** | Separating Person identity from Organisation identity | Critical |
| **Tenancy Migration** | Moving the tenant boundary from `user_id` to `organisation_id` | Critical |
| **Data Migration** | Restructuring data ownership and FK relationships | High |
| **Access-Control Migration** | Transitioning RLS policies from user-scoped to org-scoped | Critical |
| **Application Compatibility** | Maintaining legacy API behaviour during transition | High |

These are not sequential. Some overlap. All must be coordinated.

---

## 3. Transition States

### State 0: CURRENT (User-Centric)

```
auth.users
    ↓
public.users (id = person identity = org identity = tenant key)
    ↓
business_identity (1:1 with users)
    ↓
All knowledge tables (FK: user_id → users.id)
```

**Authority:** `users.id` is the universal key. There is no Organisation entity. There is no Person entity. Auth credential is coupled to Person identity. Tenancy is enforced via `user_id = auth.uid()`.

### State 1: BRIDGE (Organisation Introduced)

```
auth.users
    ↓
public.users (id = person identity, tenant key)
    ↓
organisations (NEW: backfilled from users + business_identity)
    ↓
organisation_id FKs (NEW: nullable on knowledge tables)
    ↓
All knowledge tables (FK: user_id → users.id, organisation_id → organisations.id)
```

**Authority:** `user_id` remains the primary anchor. `organisation_id` is derived and propagated. Legacy code continues to operate on `user_id`. New code can begin operating on `organisation_id`.

### State 2: MIGRATED (Organisation Authoritative)

```
auth.users
    ↓
persons (NEW: extracted from users)
    ↓
organisation_memberships (NEW: junction table)
    ↓
organisations (authoritative tenant boundary)
    ↓
organisation_id FKs (NOT NULL on knowledge tables)
    ↓
All knowledge tables (FK: organisation_id → organisations.id)
```

**Authority:** `organisation_id` is the primary tenant key. `user_id` is demoted to context. Legacy code is migrated to use `organisation_id`. RLS policies use `organisation_id`.

### State 3: TARGET (Full Canonical)

```
auth.users
    ↓
persons (independent identity)
    ↓
organisation_memberships (temporal roles)
    ↓
organisations (enduring subject)
    ↓
ownership_periods (temporal ownership)
    ↓
engagements (bounded interventions)
    ↓
knowledge (organisation-scoped, provenance-aware)
```

**Authority:** Organisation is the persistent anchor. Person, Auth, Ownership, Engagement, Subscription, Kira Instance are all temporal relationships around the Organisation.

---

## 4. Transition Questions and Answers

### Q1: What is the authoritative identity during each transition phase?

| Phase | Authoritative Identity | Notes |
|-------|----------------------|-------|
| State 0 (Current) | `users.id` | Universal key for all operations |
| State 1 (Bridge) | `users.id` (primary) + `organisations.id` (derived) | Legacy code uses `user_id`. New code can use `organisation_id`. |
| State 2 (Migrated) | `organisations.id` (primary) + `users.id` (context) | Authority shifts. `user_id` becomes a lookup key for Person context. |
| State 3 (Target) | `organisations.id` (absolute) | `users.id` is demoted to auth credential link. Person identity is separate. |

### Q2: How is an existing `users.id` mapped to Organisation?

**Mapping rule:** Every `users.id` that has a `business_identity` record maps to exactly one Organisation.

**Backfill procedure:**
1. For each `users.id` with a `business_identity` record:
   - Create `organisations.id` = `users.id` (reuse UUID for zero-FK-change migration)
   - Copy `business_identity.legal_name` → `organisations.legal_name`
   - Copy `business_identity.abn` → `organisations.abn`
   - Copy `business_identity.entity_type` → `organisations.entity_type`
   - Copy `business_identity.industry` → `organisations.industry`
2. For each `users.id` WITHOUT a `business_identity` record:
   - Create `organisations.id` = `users.id`
   - Set `organisations.legal_name` = `users.first_name || ' ' || users.last_name` (derived)
   - Flag as `organisations.status = 'legacy_unverified'`

**Risk:** If two `users.id` records represent the same Organisation (duplicate accounts), they will create two Organisation records. **Mitigation:** ABN deduplication pass before backfill.

### Q3: How is an existing `users.id` mapped to Person?

**Mapping rule:** Every `users.id` maps to exactly one Person.

**Backfill procedure:**
1. For each `users.id`:
   - Create `persons.id` = `users.id` (reuse UUID)
   - Copy `users.email` → `persons.email`
   - Copy `users.first_name` → `persons.first_name`
   - Copy `users.last_name` → `persons.last_name`
2. Link `persons.id` to `auth.users.id` via `auth_credentials` table.

**Risk:** If the same Person has multiple `users.id` records (multiple accounts), they will create duplicate Person records. **Mitigation:** Email deduplication pass before backfill.

### Q4: How are existing business records attached to the new Organisation?

**Mapping rule:** Every `users.id` record with associated business data (genome, memory, knowledge, conversations) is linked to the backfilled Organisation via `organisation_id`.

**Procedure:**
1. Add `organisation_id UUID` column (initially nullable) to all knowledge tables.
2. Populate `organisation_id` = `users.id` (since `organisations.id` = `users.id` in the backfill).
3. Add trigger to populate `organisation_id` on insert for new records.
4. Verify referential integrity.

### Q5: How are existing genome records attributed to the Organisation?

**Mapping rule:** All `genome_entities`, `genome_facts`, `genome_relationships`, and `genome_events` records with `user_id = X` are attributed to `organisations.id = X`.

**Procedure:**
1. Backfill `organisation_id` = `user_id` on all genome tables.
2. The genome data now belongs to the Organisation, not the Person.
3. Supersession chains are preserved.
4. Historical attribution (who contributed the knowledge) is preserved via `source_type` and `source_id`.

### Q6: How does legacy code continue operating during migration?

**Mechanism:** Dual-read / dual-write with facade pattern.

**Write path:**
1. Legacy code writes to `user_id`-scoped tables (unchanged).
2. Trigger or application-layer hook writes to `organisation_id`-scoped tables (new).
3. During Bridge phase, both writes occur. During Migrated phase, only `organisation_id` writes occur.

**Read path:**
1. Legacy code reads from `user_id`-scoped queries (unchanged).
2. New code reads from `organisation_id`-scoped queries (new).
3. A compatibility layer translates `user_id` requests to `organisation_id` queries.

**Exit condition:** All legacy code paths are migrated to use `organisation_id`. Legacy read paths are deprecated.

### Q7: When does Organisation become the authoritative tenant boundary?

**Answer:** At the completion of Phase 2 (State 2: MIGRATED).

**Trigger:** When the following conditions are met:
1. All knowledge tables have `organisation_id` NOT NULL.
2. All RLS policies use `organisation_id` as the primary filter.
3. All API routes resolve `organisation_id` from the authenticated user.
4. All legacy `user_id`-based RLS policies are deprecated.
5. Validation tests confirm no cross-tenant data access.

### Q8: When does Person become independent of Organisation?

**Answer:** At the completion of Phase 3 (State 3: TARGET).

**Trigger:** When the following conditions are met:
1. `persons` table exists with independent identity.
2. `organisation_memberships` table exists with temporal roles.
3. `auth_credentials` table exists linking Auth to Person.
4. All `users.id` references are replaced with `persons.id` in application code.
5. A Person can belong to multiple Organisations.

### Q9: How are existing sessions/authentication preserved?

**Mechanism:** Auth credential bridge.

**Procedure:**
1. `auth.users.id` remains the authentication anchor throughout all phases.
2. `users.auth_user_id` continues to link auth to application identity.
3. The `getCurrentAppUser()` function in `lib/auth.ts` is updated to resolve:
   - `auth.users.id` → `users.id` (unchanged)
   - `users.id` → `persons.id` (new, 1:1 mapping)
   - `users.id` → `organisations.id` (new, 1:1 mapping in Bridge phase)
4. Sessions continue to work. Auth tokens are unchanged.

**Risk:** None. Auth credentials are independent of domain identity changes.

### Q10: How are existing API contracts kept compatible?

**Mechanism:** Facade pattern with context reconstruction.

**Procedure:**
1. Legacy API routes remain active (e.g., `/api/kira/memory`, `/api/genome/query`).
2. Internally, legacy routes are reimplemented to use the canonical service layer.
3. Where legacy routes lack `organisation_id`, the facade infers it from the authenticated `user_id`.
4. New API routes use `organisation_id` explicitly (e.g., `/api/organisations/:id/knowledge`).

**Exit condition:** All legacy routes are migrated or deprecated. Facade layer is removed.

### Q11: How is RLS transitioned without creating an isolation outage?

**Mechanism:** Parallel policy with audit logging.

**Procedure:**
1. **Phase 1:** Add `organisation_id`-based RLS policies alongside legacy `user_id` policies. Both policies are active (RLS policies are ORed).
2. **Phase 2:** Log any access where the two policies diverge. This identifies data that belongs to one Organisation but is accessible via another user's auth.
3. **Phase 3:** Once consistency is verified, disable the legacy `user_id`-based policies.
4. **Phase 4:** Remove legacy policies.

**Risk:** During Phase 1, both policies are active, which means access is broader than intended. **Mitigation:** All critical access goes through service-role client (bypasses RLS), so the dual-policy phase is low-risk for production data. Session-client access is monitored.

### Q12: How is rollback handled at every migration stage?

**Mechanism:** Additive migration with deprecation, not deletion.

**Procedure:**
1. **Phase 1 rollback:** Remove `organisation_id` columns. Drop `organisations` table. Legacy code is unchanged.
2. **Phase 2 rollback:** Re-enable legacy `user_id`-based RLS policies. Disable `organisation_id` policies. Legacy code resumes.
3. **Phase 3 rollback:** Remove `persons` table. Re-link `users.id` to auth. Legacy code resumes.

**Invariant:** No existing data is deleted during any migration phase. All changes are additive. Rollback is always possible without data loss.

### Q13: What proves that an Organisation's historical memory has not been fragmented or duplicated?

**Validation procedure:**
1. **Pre-migration snapshot:** Record the count and hash of all knowledge records per `user_id`.
2. **Post-migration verification:** Record the count and hash of all knowledge records per `organisation_id`.
3. **Comparison:** Counts must match. Hashes must match (for non-temporal fields).
4. **Supersession chain verification:** Verify that all `supersedes` chains are intact.
5. **Provenance verification:** Verify that all `source_type` and `source_id` references resolve correctly.

**Exit condition:** All five verification checks pass for every Organisation.

### Q14: What constitutes completion of the migration?

**Completion criteria:**
1. All knowledge tables have `organisation_id` NOT NULL.
2. All RLS policies use `organisation_id` as the primary filter.
3. All legacy `user_id`-based RLS policies are removed.
4. All API routes resolve `organisation_id` from the authenticated user.
5. The `persons` table exists with independent identity.
6. The `organisation_memberships` table exists with temporal roles.
7. The `ownership_periods` table exists.
8. Historical memory verification passes for all Organisations.
9. All architectural tests (P0.3-H) pass.
10. No legacy code paths remain that operate on `user_id` as the tenant key.

---

## 5. Dual-Read / Dual-Write Strategy

### 5.1 Write Path

```
Application Code
    ↓
Canonical Service Layer
    ├── Write to organisations table (new)
    ├── Write to knowledge tables with organisation_id (new)
    └── Write to legacy tables with user_id (compatibility)
```

During the Bridge phase, both writes occur. During the Migrated phase, only `organisation_id` writes occur. Legacy writes are disabled.

### 5.2 Read Path

```
Application Code
    ↓
Canonical Service Layer
    ├── Read from knowledge tables WHERE organisation_id = ? (new)
    └── Read from legacy tables WHERE user_id = ? (compatibility)
```

During the Bridge phase, both reads are available. During the Migrated phase, only `organisation_id` reads occur. Legacy reads are disabled.

### 5.3 Consistency Check

During the Bridge phase, a periodic consistency check compares:
- Records written via `user_id` path
- Records written via `organisation_id` path

Any divergence is logged and investigated before proceeding to the Migrated phase.

---

## 6. RLS Transition Plan

### Phase 1: Parallel Policy (Bridge)
```sql
-- Legacy policy (still active)
CREATE POLICY "users_select_own" ON kira_memory
  FOR ALL USING (user_id = auth.uid());

-- New policy (added)
CREATE POLICY "org_members_select" ON kira_memory
  FOR ALL USING (organisation_id IN (
    SELECT organisation_id FROM organisation_memberships
    WHERE person_id IN (SELECT id FROM persons WHERE auth_user_id = auth.uid())
  ));
```

### Phase 2: Audit & Log
- Monitor for access where legacy policy allows but new policy denies.
- Investigate and resolve any discrepancies.

### Phase 3: Switch
- Remove legacy policy.
- New policy is the sole access control.

### Phase 4: Remove
- Drop legacy policy definitions.

---

## 7. Rollback Strategy

| Phase | Rollback Action | Data Impact |
|-------|----------------|-------------|
| Phase 1 (Bridge) | Drop `organisation_id` columns. Drop `organisations` table. | None. Legacy tables unchanged. |
| Phase 2 (Migrated) | Re-enable legacy `user_id` RLS policies. Disable `organisation_id` policies. | None. Data unchanged. |
| Phase 3 (Target) | Remove `persons` table. Re-link `users.id` to auth. | None. Data unchanged. |

**Invariant:** No existing data is deleted during any migration phase.

---

## 8. Exit Criteria for P0.3-G

This phase is complete when:
1. The `Organisation` entity exists and is mapped for all existing users.
2. The system can query historical state without reliance on the current active `user_id`.
3. The dual-read/dual-write strategy is operational and consistent.
4. RLS policies have been transitioned to `organisation_id`-based isolation.
5. The transition path to P0.3-H (Architectural Test Suite) is fully defined and tested.
6. Rollback has been tested at every phase boundary.

---

*This artifact is the P0.3-G compatibility and transition architecture. It is ready to serve as the basis for P0.3-H (Architectural Test Suite).*
