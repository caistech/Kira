# KIRA — P0.5-1C RLS Authority Transfer Verification

**Status:** Verification Gate
**Purpose:** Verify RLS authority has been correctly transferred from legacy user_id to canonical organisation_id
**Scope:** Policy verification, access control verification, cross-tenant isolation, service-role distinction
**Prerequisite:** P0.5 Step 1C migration applied to database
**Date:** 26 August 2026

---

## 1. Purpose

This artifact is the verification gate between RLS authority transfer (Step 1C) and API route rebinding (Step 1D). It verifies that:

1. Every protected row is authorized through canonical organisation membership.
2. Organisation is the tenant boundary.
3. Membership is the authority source.
4. Legacy user_id-based authority is removed.
5. Cross-organisation access is denied.
6. Historical membership does not confer current access.
7. Service-role operations remain explicitly distinguished.
8. Step 1A and 1B remain green.

The governing principle is:

> **After 1C, the database itself understands the canonical tenant authority. The application layer can then be rebinding without simultaneously debugging database authorization.**

---

## 2. Verification Checklist

### 2.1 Policy Existence Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| genome_entities has org_membership_access policy | `SELECT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'genome_entities' AND policyname = 'org_membership_access')` | `true` | |
| genome_facts has org_membership_access policy | `SELECT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'genome_facts' AND policyname = 'org_membership_access')` | `true` | |
| genome_relationships has org_membership_access policy | `SELECT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'genome_relationships' AND policyname = 'org_membership_access')` | `true` | |
| genome_events has org_membership_access policy | `SELECT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'genome_events' AND policyname = 'org_membership_access')` | `true` | |
| kira_memory has org_membership_access policy | `SELECT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kira_memory' AND policyname = 'org_membership_access')` | `true` | |
| kira_knowledge has org_membership_access policy | `SELECT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kira_knowledge' AND policyname = 'org_membership_access')` | `true` | |
| conversations has org_membership_access policy | `SELECT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'org_membership_access')` | `true` | |
| conversation_messages has org_membership_access policy | `SELECT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversation_messages' AND policyname = 'org_membership_access')` | `true` | |
| kira_agents has org_membership_access policy | `SELECT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kira_agents' AND policyname = 'org_membership_access')` | `true` | |

### 2.2 Legacy Policy Removal Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| No legacy policies on genome_entities | `SELECT COUNT(*) FROM pg_policies WHERE tablename = 'genome_entities' AND policyname != 'org_membership_access'` | `0` | |
| No legacy policies on genome_facts | `SELECT COUNT(*) FROM pg_policies WHERE tablename = 'genome_facts' AND policyname != 'org_membership_access'` | `0` | |
| No legacy policies on genome_relationships | `SELECT COUNT(*) FROM pg_policies WHERE tablename = 'genome_relationships' AND policyname != 'org_membership_access'` | `0` | |
| No legacy policies on genome_events | `SELECT COUNT(*) FROM pg_policies WHERE tablename = 'genome_events' AND policyname != 'org_membership_access'` | `0` | |
| No legacy policies on kira_memory | `SELECT COUNT(*) FROM pg_policies WHERE tablename = 'kira_memory' AND policyname != 'org_membership_access'` | `0` | |
| No legacy policies on kira_knowledge | `SELECT COUNT(*) FROM pg_policies WHERE tablename = 'kira_knowledge' AND policyname != 'org_membership_access'` | `0` | |
| No legacy policies on conversations | `SELECT COUNT(*) FROM pg_policies WHERE tablename = 'conversations' AND policyname != 'org_membership_access'` | `0` | |
| No legacy policies on conversation_messages | `SELECT COUNT(*) FROM pg_policies WHERE tablename = 'conversation_messages' AND policyname != 'org_membership_access'` | `0` | |
| No legacy policies on kira_agents | `SELECT COUNT(*) FROM pg_policies WHERE tablename = 'kira_agents' AND policyname != 'org_membership_access'` | `0` | |

### 2.3 Helper Function Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `auth_user_has_organisation_access()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auth_user_has_organisation_access')` | `true` | |
| `auth_user_organisation_id()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auth_user_organisation_id')` | `true` | |
| `auth_user_has_organisation_access()` uses membership, not users.id | Review function body | References `organisation_memberships`, not `users.id` as tenant key | |

### 2.4 RLS Enabled Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| genome_entities RLS enabled | `SELECT relrowsecurity FROM pg_class WHERE relname = 'genome_entities'` | `true` | |
| genome_facts RLS enabled | `SELECT relrowsecurity FROM pg_class WHERE relname = 'genome_facts'` | `true` | |
| kira_memory RLS enabled | `SELECT relrowsecurity FROM pg_class WHERE relname = 'kira_memory'` | `true` | |
| conversations RLS enabled | `SELECT relrowsecurity FROM pg_class WHERE relname = 'conversations'` | `true` | |
| organisations RLS enabled | `SELECT relrowsecurity FROM pg_class WHERE relname = 'organisations'` | `true` | |
| persons RLS enabled | `SELECT relrowsecurity FROM pg_class WHERE relname = 'persons'` | `true` | |
| organisation_memberships RLS enabled | `SELECT relrowsecurity FROM pg_class WHERE relname = 'organisation_memberships'` | `true` | |

### 2.5 Access Control Verification

| Check | Description | Expected | Status |
|-------|-------------|----------|--------|
| Member can read own organisation's data | User with active membership can SELECT from knowledge tables | Access granted | |
| Non-member cannot read other organisation's data | User without membership cannot SELECT from other organisation's knowledge | Access denied | |
| Member can write to own organisation's data | User with active membership can INSERT/UPDATE knowledge tables | Access granted | |
| Non-member cannot write to other organisation's data | User without membership cannot INSERT/UPDATE other organisation's knowledge | Access denied | |
| Expired membership denies access | User with expired membership cannot read knowledge | Access denied | |
| Inactive membership denies access | User with inactive membership cannot read knowledge | Access denied | |

### 2.6 Cross-Tenant Isolation Verification

| Check | Description | Expected | Status |
|-------|-------------|----------|--------|
| Organisation A cannot read Organisation B's knowledge | Two different organisations, no cross-membership | Access denied | |
| Organisation A cannot write to Organisation B's knowledge | Two different organisations, no cross-membership | Access denied | |
| Membership in Organisation A does not grant access to Organisation B | User with membership in A only | Access denied to B | |

### 2.7 Historical Membership Verification

| Check | Description | Expected | Status |
|-------|-------------|----------|--------|
| Expired membership does not grant current access | Membership with `valid_to < NOW()` | Access denied | |
| Historical ownership does not grant current access | Ownership period with `status = 'historical'` | Access denied | |
| Future membership does not grant current access | Membership with `valid_from > NOW()` | Access denied | |

### 2.8 Service-Role Distinction Verification

| Check | Description | Expected | Status |
|-------|-------------|----------|--------|
| Service-role bypasses RLS | Service-role client can read all rows regardless of membership | Access granted | |
| Service-role does not implicitly become a member | Service-role access does not create membership records | No membership created | |
| Application enforces Organisation context independently | Service-layer code checks organisation_id before returning data | Organisation context enforced | |

### 2.9 Step 1A/1B Regression Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| organisations table unchanged | `SELECT COUNT(*) FROM organisations` | Same as before 1C | |
| persons table unchanged | `SELECT COUNT(*) FROM persons` | Same as before 1C | |
| auth_credentials table unchanged | `SELECT COUNT(*) FROM auth_credentials` | Same as before 1C | |
| organisation_memberships table unchanged | `SELECT COUNT(*) FROM organisation_memberships` | Same as before 1C | |
| ownership_periods table unchanged | `SELECT COUNT(*) FROM ownership_periods` | Same as before 1C | |
| Knowledge tables unchanged | `SELECT COUNT(*) FROM genome_entities` | Same as before 1C | |
| All organisation_id values still valid | `SELECT COUNT(*) FROM genome_entities WHERE organisation_id NOT IN (SELECT organisation_id FROM organisations)` | `0` | |

### 2.10 Migration Ledger Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Ledger has authority transfer entry | `SELECT COUNT(*) FROM migration_ledger WHERE migration_phase = 'bridge' AND resolution_method = 'authority_transfer'` | `>= 1` | |
| Ledger entry has resolution_status | `SELECT COUNT(*) FROM migration_ledger WHERE resolution_method = 'authority_transfer' AND resolution_status IS NULL` | `0` | |

---

## 3. Verification Gate

All checks must pass before proceeding to Step 1D. If any check fails:

1. Record the failure in the verification log.
2. Identify the root cause.
3. Fix the migration.
4. Re-run verification.

**No API routes are rebinding until all verification checks pass.**

---

## 4. Test Suite Execution

After verification checks pass, run the 95-test suite against the migrated state:

| Test Layer | Expected Result |
|-----------|----------------|
| A. Migration Safety (33) | 33 PASS |
| B. Canonical Conformance (44) | 44 PASS |
| C. State Transition (18) | 18 PASS |
| **Total** | **95/95 PASS** |

### Reclassification of Pending Legacy Failures

| Test ID | Previous Classification | New Classification | Reason |
|---------|------------------------|-------------------|--------|
| B5.1 | PENDING (Step 5) | PENDING (Step 5) | Engagement not yet created |
| B6.1 | PENDING (Step 7) | PENDING (Step 7) | Kira Instance not yet separated |
| B7.1 | PENDING (Step 6) | PENDING (Step 6) | Subscription not yet separated |
| B8.6 | PENDING (later) | PENDING (later) | Conversation/knowledge separation not yet addressed |

**Step 1C exit criterion:** 95/95 PASS on canonical target database. All access control checks pass. No legacy policies remain. 4 legacy failures remain PENDING for later steps.

---

## 5. What 1C Does NOT Do

| Concern | Status | Deferred To |
|---------|--------|-------------|
| API route rebinding | NOT DONE | Step 1D |
| Legacy authority retirement | NOT DONE | Step 9 |
| Consultant entity | NOT DONE | Step 5 |
| Engagement entity | NOT DONE | Step 5 |
| Commercial arrangement | NOT DONE | Step 6 |
| Kira Instance separation | NOT DONE | Step 7 |
| Decision/Action/Outcome/Learning | NOT DONE | Step 8 |

---

*This artifact is the P0.5-1C RLS authority transfer verification gate. It must pass before proceeding to Step 1D (API Route Rebinding).*
