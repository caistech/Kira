# KIRA — P0.4-D Architectural Test Harness

**Status:** Executable Architecture Specification
**Purpose:** Define the executable test harness that proves Kira's organisational architecture
**Scope:** 95 canonical tests, synthetic database, test classification, exit criteria
**Prerequisite:** P0.4-C (Gap Classification & Decision Register), P0.3-H (Architectural Test Suite)
**Date:** 26 August 2026

---

## 1. Purpose and Governing Principle

This artifact defines the **Architectural Test Harness** — the executable specification of Kira's organisational architecture. It implements the 95 tests from P0.3-H against a synthetic isolated database.

The governing principle is:

> **The harness must test the architecture, not the current implementation.**

The synthetic database begins from canonical target semantics. It is also capable of representing the legacy failure modes identified in P0.4-A/B/C. This allows the harness to prove both that the canonical model works AND that the current implementation fails where expected.

---

## 2. Test Result Classification

Every test result must be classified into one of four categories:

| Classification | Definition | Action |
|---------------|------------|--------|
| **CANONICAL PASS** | Target architecture behaves correctly | Record as pass |
| **EXPECTED LEGACY FAILURE** | Test detects a known defect registered in P0.4-C | Record as expected failure, trace to P0.4-C gap |
| **HARNESS DEFECT** | Test itself is invalid or ambiguous | Fix the test |
| **UNREGISTERED ARCHITECTURAL CONFLICT** | Implementation violates a rule not captured in P0.4-C | Register new gap in P0.4-C, then reclassify |

**Exit criterion:** 95/95 tests pass on canonical target semantics. Known legacy defects produce EXPECTED LEGACY FAILURE. Zero UNREGISTERED ARCHITECTURAL CONFLICTS remain.

---

## 3. Synthetic Database Design

### 3.1 Canonical Target Database

The primary test database is seeded with canonical target semantics:

```sql
-- Canonical tables (simplified for test harness)
CREATE TABLE organisations (
    organisation_id UUID PRIMARY KEY,
    legal_name TEXT NOT NULL,
    abn TEXT UNIQUE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE persons (
    person_id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE auth_credentials (
    auth_credential_id UUID PRIMARY KEY,
    person_id UUID REFERENCES persons(person_id),
    auth_provider TEXT NOT NULL,
    auth_user_id TEXT NOT NULL,
    status TEXT DEFAULT 'active'
);

CREATE TABLE organisation_memberships (
    membership_id UUID PRIMARY KEY,
    organisation_id UUID REFERENCES organisations(organisation_id),
    person_id UUID REFERENCES persons(person_id),
    role TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ
);

CREATE TABLE ownership_periods (
    ownership_period_id UUID PRIMARY KEY,
    organisation_id UUID REFERENCES organisations(organisation_id),
    person_id UUID REFERENCES persons(person_id),
    status TEXT DEFAULT 'current',
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ
);

CREATE TABLE engagements (
    engagement_id UUID PRIMARY KEY,
    organisation_id UUID REFERENCES organisations(organisation_id),
    title TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ
);

CREATE TABLE kira_instances (
    kira_instance_id UUID PRIMARY KEY,
    organisation_id UUID REFERENCES organisations(organisation_id),
    status TEXT DEFAULT 'active',
    version INTEGER DEFAULT 1,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ
);

CREATE TABLE subscriptions (
    subscription_id UUID PRIMARY KEY,
    organisation_id UUID REFERENCES organisations(organisation_id),
    status TEXT DEFAULT 'trial',
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ
);

CREATE TABLE commercial_arrangements (
    commercial_arrangement_id UUID PRIMARY KEY,
    organisation_id UUID REFERENCES organisations(organisation_id),
    arrangement_type TEXT NOT NULL,
    version INTEGER NOT NULL,
    terms JSONB NOT NULL,
    status TEXT DEFAULT 'active',
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ
);

CREATE TABLE knowledge (
    knowledge_id UUID PRIMARY KEY,
    organisation_id UUID REFERENCES organisations(organisation_id),
    content TEXT NOT NULL,
    confidence NUMERIC(3,2),
    source_type TEXT,
    source_id UUID,
    observed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'current',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE decisions (
    decision_id UUID PRIMARY KEY,
    organisation_id UUID REFERENCES organisations(organisation_id),
    decision_text TEXT NOT NULL,
    alternatives JSONB,
    rationale TEXT,
    confidence NUMERIC(3,2),
    status TEXT DEFAULT 'current',
    observed_at TIMESTAMPTZ
);

CREATE TABLE actions (
    action_id UUID PRIMARY KEY,
    organisation_id UUID REFERENCES organisations(organisation_id),
    decision_id UUID REFERENCES decisions(decision_id),
    title TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE outcomes (
    outcome_id UUID PRIMARY KEY,
    organisation_id UUID REFERENCES organisations(organisation_id),
    action_id UUID REFERENCES actions(action_id),
    expected TEXT,
    actual TEXT,
    variance TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE learnings (
    learning_id UUID PRIMARY KEY,
    organisation_id UUID REFERENCES organisations(organisation_id),
    outcome_id UUID REFERENCES outcomes(outcome_id),
    what_changed TEXT NOT NULL,
    confidence_delta NUMERIC(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies (canonical target)
ALTER TABLE knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON knowledge
    FOR ALL USING (organisation_id IN (
        SELECT organisation_id FROM organisation_memberships
        WHERE person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
        AND status = 'active'
    ));
```

### 3.2 Legacy Failure Mode Database

A second test database is seeded with legacy failure modes:

```sql
-- Legacy tables (representing current Kira implementation)
CREATE TABLE legacy_users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    auth_user_id UUID,
    subscription_status TEXT DEFAULT 'trial',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT DEFAULT 'active'
);

CREATE TABLE legacy_business_identity (
    user_id UUID PRIMARY KEY REFERENCES legacy_users(id),
    legal_name TEXT,
    abn TEXT,
    entity_type TEXT,
    owner_name TEXT
);

-- Legacy knowledge tables (FK to user_id, not organisation_id)
CREATE TABLE legacy_kira_memory (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES legacy_users(id),
    content TEXT,
    memory_type TEXT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy RLS (wide open on genome tables)
-- No RLS on genome tables (USING (true) equivalent)
```

---

## 4. Test Harness Architecture

### 4.1 Test Structure

```
tests/
├── architecture/
│   ├── identity/
│   │   ├── organisation_persistence.test.ts
│   │   ├── person_separation.test.ts
│   │   ├── auth_separation.test.ts
│   │   ├── membership_temporal.test.ts
│   │   └── uuid_reuse_not_semantic.test.ts
│   ├── authority/
│   │   ├── organisation_context_explicit.test.ts
│   │   ├── membership_establishes_authority.test.ts
│   │   ├── tenant_isolation_follows_org.test.ts
│   │   ├── legacy_users_id_not_authority.test.ts
│   │   └── service_role_org_context.test.ts
│   ├── temporal/
│   │   ├── ownership_history.test.ts
│   │   ├── consultant_history.test.ts
│   │   ├── engagement_lifecycle.test.ts
│   │   ├── subscription_history.test.ts
│   │   └── commercial_versions.test.ts
│   ├── knowledge/
│   │   ├── knowledge_belongs_to_org.test.ts
│   │   ├── kira_instance_not_owner.test.ts
│   │   ├── conversation_not_knowledge.test.ts
│   │   ├── provenance_survives_replacement.test.ts
│   │   └── historical_not_rewritten.test.ts
│   └── relationships/
│       ├── consultant_neq_introducer.test.ts
│       ├── consultant_neq_engagement.test.ts
│       ├── engagement_neq_subscription.test.ts
│       └── subscription_neq_commercial.test.ts
├── migration/
│   ├── identity_resolution.test.ts
│   ├── uuid_reuse_safety.test.ts
│   ├── dual_context_persistence.test.ts
│   ├── rls_shadow_evaluation.test.ts
│   ├── service_role_isolation.test.ts
│   ├── authority_transitions.test.ts
│   ├── authority_rollback.test.ts
│   └── migration_ledger_integrity.test.ts
└── state_transition/
    ├── state_0_to_1.test.ts
    ├── state_1_to_2.test.ts
    ├── state_2_to_3.test.ts
    ├── rollback_at_boundary.test.ts
    └── forbidden_transitions.test.ts
```

### 4.2 Test Execution Pattern

Each test follows this pattern:

```typescript
// Example: organisation_persistence.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase, seedCanonicalData, seedLegacyData } from '../helpers';

describe('INV-001: Organisation Persistence', () => {
  let canonicalDb: Database;
  let legacyDb: Database;

  beforeAll(async () => {
    canonicalDb = await createTestDatabase('canonical');
    legacyDb = await createTestDatabase('legacy');
  });

  afterAll(async () => {
    await canonicalDb.cleanup();
    await legacyDb.cleanup();
  });

  it('CANONICAL PASS: Organisation exists independently', async () => {
    // Seed canonical database
    const org = await seedCanonicalData.organisation(canonicalDb);
    const person = await seedCanonicalData.person(canonicalDb);
    
    // Verify Organisation exists without Person
    const result = await canonicalDb.query(
      'SELECT * FROM organisations WHERE organisation_id = $1',
      [org.organisation_id]
    );
    expect(result.rows).toHaveLength(1);
  });

  it('EXPECTED LEGACY FAILURE: Organisation does not exist independently', async () => {
    // Seed legacy database (users.id IS the organisation)
    const user = await seedLegacyData.user(legacyDb);
    
    // Verify no independent Organisation entity
    const result = await legacyDb.query(
      'SELECT * FROM organisations WHERE organisation_id = $1',
      [user.id]
    );
    expect(result.rows).toHaveLength(0); // Expected failure
    
    // Record: EXPECTED LEGACY FAILURE, traced to P0.4-C gap 4.2
  });

  it('CANONICAL PASS: Organisation survives Person change', async () => {
    const org = await seedCanonicalData.organisation(canonicalDb);
    const person = await seedCanonicalData.person(canonicalDb);
    await seedCanonicalData.membership(canonicalDb, org, person);
    
    // Deactivate Person
    await canonicalDb.query(
      'UPDATE persons SET status = $1 WHERE person_id = $2',
      ['inactive', person.person_id]
    );
    
    // Verify Organisation persists
    const result = await canonicalDb.query(
      'SELECT * FROM organisations WHERE organisation_id = $1',
      [org.organisation_id]
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].status).toBe('active');
  });
});
```

### 4.3 Test Classification Recording

Each test result is recorded with classification:

```typescript
interface TestResult {
  testId: string;
  testName: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  classification: 'CANONICAL_PASS' | 'EXPECTED_LEGACY_FAILURE' | 'HARNESS_DEFECT' | 'UNREGISTERED_ARCHITECTURAL_CONFLICT';
  p04cGapId?: string; // Reference to P0.4-C gap if EXPECTED_LEGACY_FAILURE
  evidence?: string;  // Supporting evidence for classification
}
```

---

## 5. Complete Test Inventory (95 Tests)

### Layer A: Migration Safety Tests (33 Tests)

#### A1: Identity Resolution (7 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| A1.1 | ONE→ONE direct mapping | CANONICAL PASS | — |
| A1.2 | ONE→MANY split | CANONICAL PASS | — |
| A1.3 | MANY→ONE consolidation | CANONICAL PASS | — |
| A1.4 | Ambiguous resolution | CANONICAL PASS | — |
| A1.5 | Insufficient evidence | CANONICAL PASS | — |
| A1.6 | Resolution provenance immutable | CANONICAL PASS | — |
| A1.7 | Source history preserved | CANONICAL PASS | — |

#### A2: UUID Reuse (3 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| A2.1 | UUID reuse is migration convenience | CANONICAL PASS | 4.1 |
| A2.2 | UUID equality does not imply entity identity | CANONICAL PASS | 4.1 |
| A2.3 | UUID equality may cease to hold | CANONICAL PASS | 4.1 |

#### A3: Dual-Context Persistence (5 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| A3.1 | One record, two identifiers | CANONICAL PASS | 4.11 |
| A3.2 | No duplicate records | CANONICAL PASS | 4.11 |
| A3.3 | Legacy read path works | CANONICAL PASS | 4.11 |
| A3.4 | Canonical read path works | CANONICAL PASS | 4.11 |
| A3.5 | Write populates both identifiers | CANONICAL PASS | 4.11 |

#### A4: RLS Shadow Evaluation (5 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| A4.1 | Legacy policy is authoritative | CANONICAL PASS | 4.12 |
| A4.2 | Canonical policy is evaluated but not granting | CANONICAL PASS | 4.12 |
| A4.3 | Divergence is logged | CANONICAL PASS | 4.12 |
| A4.4 | Divergence reaches zero before authority transfer | CANONICAL PASS | 4.12 |
| A4.5 | Canonical policy becomes authoritative | CANONICAL PASS | 4.12 |

#### A5: Service-Role Isolation (4 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| A5.1 | Service-role bypasses RLS | CANONICAL PASS | 4.12 |
| A5.2 | Service-layer enforces Organisation context | CANONICAL PASS | 4.12 |
| A5.3 | Session-client isolation via RLS | CANONICAL PASS | 4.12 |
| A5.4 | Service-layer isolation is independent | CANONICAL PASS | 4.12 |

#### A6: Authority Transitions (5 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| A6.1 | State 0 authority is user_id | EXPECTED LEGACY FAILURE | 4.1 |
| A6.2 | State 1 authority is user_id with shadow | CANONICAL PASS | 4.1 |
| A6.3 | State 2 authority is organisation_id | CANONICAL PASS | 4.1 |
| A6.4 | State 3 authority is Organisation + Person model | CANONICAL PASS | 4.1 |
| A6.5 | Authority transfer is explicit | CANONICAL PASS | 4.1 |

#### A7: Authority Rollback (5 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| A7.1 | Rollback restores previous authority | CANONICAL PASS | 4.1 |
| A7.2 | Rollback preserves data | CANONICAL PASS | 4.1 |
| A7.3 | Rollback preserves schema | CANONICAL PASS | 4.1 |
| A7.4 | Rollback preserves Migration Ledger | CANONICAL PASS | 4.1 |
| A7.5 | Rollback is non-destructive | CANONICAL PASS | 4.1 |

#### A8: Migration Ledger Integrity (6 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| A8.1 | Ledger is append-only | CANONICAL PASS | — |
| A8.2 | Every migration has a ledger entry | CANONICAL PASS | — |
| A8.3 | Ledger records resolution method | CANONICAL PASS | — |
| A8.4 | Ledger records confidence | CANONICAL PASS | — |
| A8.5 | Ledger records validation status | CANONICAL PASS | — |
| A8.6 | Ledger is authoritative source for identity mappings | CANONICAL PASS | — |

### Layer B: Canonical Conformance Tests (44 Tests)

#### B1: Organisation Persistence (6 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| B1.1 | Organisation exists independently | CANONICAL PASS | 4.2 |
| B1.2 | Organisation survives Person change | CANONICAL PASS | 4.2 |
| B1.3 | Organisation survives Auth change | CANONICAL PASS | 4.2 |
| B1.4 | Organisation survives Subscription change | CANONICAL PASS | 4.2 |
| B1.5 | Organisation survives Consultant change | CANONICAL PASS | 4.2 |
| B1.6 | Organisation survives Kira Instance change | CANONICAL PASS | 4.2 |

#### B2: Person/Role Separation (5 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| B2.1 | Person exists independently | CANONICAL PASS | 4.3 |
| B2.2 | Person has multiple roles | CANONICAL PASS | 4.3 |
| B2.3 | Person identity survives membership change | CANONICAL PASS | 4.3 |
| B2.4 | Person identity survives ownership change | CANONICAL PASS | 4.3 |
| B2.5 | Auth credential is separate from Person | CANONICAL PASS | 4.3 |

#### B3: Ownership Temporalisation (5 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| B3.1 | Ownership period is temporal | CANONICAL PASS | 4.5 |
| B3.2 | Only one current ownership | CANONICAL PASS | 4.5 |
| B3.3 | Historical ownership survives | CANONICAL PASS | 4.5 |
| B3.4 | Ownership change does not destroy Organisation | CANONICAL PASS | 4.5 |
| B3.5 | Ownership change is recorded with provenance | CANONICAL PASS | 4.5 |

#### B4: Consultant Separation (4 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| B4.1 | Consultant ≠ Introducer | CANONICAL PASS | 4.6 |
| B4.2 | Consultant relationship is temporal | CANONICAL PASS | 4.6 |
| B4.3 | Consultant replacement does not destroy Organisation | CANONICAL PASS | 4.6 |
| B4.4 | Consultant knowledge belongs to Organisation | CANONICAL PASS | 4.6 |

#### B5: Engagement Separation (5 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| B5.1 | Engagement is first-class | CANONICAL PASS | 4.7 |
| B5.2 | Engagement has temporal boundaries | CANONICAL PASS | 4.7 |
| B5.3 | Engagement ≠ Conversation | CANONICAL PASS | 4.7 |
| B5.4 | Engagement knowledge belongs to Organisation | CANONICAL PASS | 4.7 |
| B5.5 | Engagement context is not organisational knowledge | CANONICAL PASS | 4.7 |

#### B6: Kira/Organisation Separation (4 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| B6.1 | Kira Instance is separate from Organisation | CANONICAL PASS | 4.8 |
| B6.2 | Kira Instance replacement does not destroy Organisation | CANONICAL PASS | 4.8 |
| B6.3 | Kira Instance knowledge belongs to Organisation | CANONICAL PASS | 4.8 |
| B6.4 | Multiple Kira Instances per Organisation | CANONICAL PASS | 4.8 |

#### B7: Subscription/Commercial Separation (4 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| B7.1 | Subscription is separate from Organisation | CANONICAL PASS | 4.9 |
| B7.2 | Subscription expiry does not destroy Organisation | CANONICAL PASS | 4.9 |
| B7.3 | Commercial Arrangement is temporal | CANONICAL PASS | 4.10 |
| B7.4 | Pricing is not hardcoded | CANONICAL PASS | 4.10 |

#### B8: Knowledge/Conversation Separation (6 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| B8.1 | Knowledge belongs to Organisation | CANONICAL PASS | 4.11 |
| B8.2 | Knowledge survives Person change | CANONICAL PASS | 4.11 |
| B8.3 | Knowledge survives Consultant change | CANONICAL PASS | 4.11 |
| B8.4 | Knowledge survives Subscription change | CANONICAL PASS | 4.11 |
| B8.5 | Knowledge survives Kira Instance change | CANONICAL PASS | 4.11 |
| B8.6 | Conversation is evidence, not knowledge | CANONICAL PASS | 4.11 |

#### B9: Provenance (5 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| B9.1 | Every knowledge item has provenance | CANONICAL PASS | 4.11 |
| B9.2 | Provenance is immutable | CANONICAL PASS | 4.11 |
| B9.3 | Provenance traces to source | CANONICAL PASS | 4.11 |
| B9.4 | Confidence is explicit | CANONICAL PASS | 4.11 |
| B9.5 | Confidence is calculated correctly | CANONICAL PASS | 4.11 |

#### B10: Historical Preservation (5 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| B10.1 | Superseded records persist | CANONICAL PASS | 4.11 |
| B10.2 | Supersession chains intact | CANONICAL PASS | 4.11 |
| B10.3 | Historical state reconstructible | CANONICAL PASS | 4.11 |
| B10.4 | Historical ownership preserved | CANONICAL PASS | 4.5 |
| B10.5 | Historical memberships preserved | CANONICAL PASS | 4.4 |

#### B11: Continuity Through Replacement/Change (6 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| B11.1 | Organisation survives Person replacement | CANONICAL PASS | 4.2 |
| B11.2 | Organisation survives Consultant replacement | CANONICAL PASS | 4.2 |
| B11.3 | Organisation survives Subscription change | CANONICAL PASS | 4.2 |
| B11.4 | Organisation survives Kira Instance replacement | CANONICAL PASS | 4.2 |
| B11.5 | Organisation survives Ownership transfer | CANONICAL PASS | 4.2 |
| B11.6 | Organisational knowledge survives all changes | CANONICAL PASS | 4.11 |

### Layer C: State Transition Tests (18 Tests)

#### C1: State 0 → State 1 (Bridge) (7 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| C1.1 | Organisation created from legacy user | CANONICAL PASS | 4.2 |
| C1.2 | Person created from legacy user | CANONICAL PASS | 4.3 |
| C1.3 | Membership created | CANONICAL PASS | 4.4 |
| C1.4 | Knowledge recontextualised | CANONICAL PASS | 4.11 |
| C1.5 | Legacy functionality preserved | CANONICAL PASS | 4.1 |
| C1.6 | Migration Ledger populated | CANONICAL PASS | — |
| C1.7 | Rollback to State 0 succeeds | CANONICAL PASS | 4.1 |

#### C2: State 1 → State 2 (Migrated) (5 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| C2.1 | Authority transfers to organisation_id | CANONICAL PASS | 4.1 |
| C2.2 | RLS policies updated | CANONICAL PASS | 4.12 |
| C2.3 | Legacy policies deprecated | CANONICAL PASS | 4.12 |
| C2.4 | Knowledge ownership verified | CANONICAL PASS | 4.11 |
| C2.5 | Rollback to State 1 succeeds | CANONICAL PASS | 4.1 |

#### C3: State 2 → State 3 (Canonical) (5 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| C3.1 | Person fully decoupled from users | CANONICAL PASS | 4.3 |
| C3.2 | Temporal memberships authoritative | CANONICAL PASS | 4.4 |
| C3.3 | Ownership periods exist | CANONICAL PASS | 4.5 |
| C3.4 | Engagements exist | CANONICAL PASS | 4.7 |
| C3.5 | Rollback to State 2 succeeds | CANONICAL PASS | 4.1 |

#### C4: Forbidden Transitions / Invariant Violations (6 Tests)

| Test ID | Test Name | Classification Target | P0.4-C Gap |
|---------|-----------|----------------------|------------|
| C4.1 | Organisation cannot be deleted | CANONICAL PASS | 4.2 |
| C4.2 | Person cannot be deleted | CANONICAL PASS | 4.3 |
| C4.3 | Knowledge cannot be orphaned | CANONICAL PASS | 4.11 |
| C4.4 | Ownership cannot be duplicated | CANONICAL PASS | 4.5 |
| C4.5 | Membership cannot be duplicated | CANONICAL PASS | 4.4 |
| C4.6 | Authority cannot transfer without governance | CANONICAL PASS | 4.1 |

---

## 6. Expected Legacy Failure Tests

When run against the legacy failure mode database, the following tests are expected to fail:

| Test ID | Expected Failure | P0.4-C Gap | Evidence |
|---------|-----------------|------------|----------|
| B1.1 | Organisation does not exist independently | 4.2 | No `organisations` table |
| B1.2 | Organisation does not survive Person change | 4.2 | `users.id` IS the Organisation |
| B2.1 | Person does not exist independently | 4.3 | No `persons` table |
| B2.2 | Person cannot have multiple roles | 4.3 | 1:1 `users` → `business_identity` |
| B3.1 | Ownership period is not temporal | 4.5 | `owner_name TEXT` only |
| B5.1 | Engagement is not first-class | 4.7 | No `engagements` table |
| B6.1 | Kira Instance is not separate from Organisation | 4.8 | `kira_agents.user_id` FK |
| B7.1 | Subscription is not separate from Organisation | 4.9 | `users.subscription_status` |
| B8.1 | Knowledge does not belong to Organisation | 4.11 | FK to `user_id`, not `organisation_id` |
| B8.6 | Conversation is treated as knowledge | 4.11 | No evidence/knowledge separation |

---

## 7. Exit Criteria

P0.4-D is complete when:

1. All 95 tests are implemented in the test harness.
2. The synthetic canonical database executes all 95 tests with CANONICAL PASS.
3. The legacy failure mode database produces EXPECTED LEGACY FAILURE for all registered gaps.
4. Every test failure is traced to a P0.4-C gap or a newly registered architectural decision.
5. Zero UNREGISTERED ARCHITECTURAL CONFLICTS remain.
6. Zero HARNESS DEFECTS remain.
7. The test harness is integrated into the CI/CD pipeline.
8. The test harness executes in isolation (no production data, no production schema).

---

## 8. Completion Criterion

The Architectural Test Harness is complete when it answers:

> **Can we demonstrate, through repeatable tests, that the canonical target architecture works correctly AND that the current implementation fails where expected?**

If the answer is yes, the harness is an executable specification of Kira's organisational architecture.

---

*This artifact is the P0.4-D architectural test harness. It is ready for implementation against the synthetic test database.*
