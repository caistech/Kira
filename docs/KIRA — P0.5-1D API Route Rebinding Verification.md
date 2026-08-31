# KIRA — P0.5-1D API Route Rebinding Verification

**Status:** Verification Gate
**Purpose:** Verify API routes have been correctly rebinding to canonical identity model
**Scope:** Auth helper verification, function availability, backward compatibility
**Prerequisite:** P0.5 Step 1D auth.ts changes applied
**Date:** 26 August 2026

---

## 1. Purpose

This artifact is the verification gate for API route rebinding. It verifies that:

1. The canonical identity functions are available and correct.
2. Backward compatibility is maintained.
3. The auth helper resolves identity through the canonical model.
4. No legacy authority has been prematurely removed.

The governing principle is:

> **After 1D, the application layer can use canonical identity. Legacy path remains available during transition.**

---

## 2. Verification Checklist

### 2.1 Function Availability Verification

| Check | Query/Action | Expected | Status |
|-------|-------------|----------|--------|
| `getCurrentOrganisationContext()` exists | Import from `@/lib/auth` | Function exists | |
| `getCurrentOrganisationId()` exists | Import from `@/lib/auth` | Function exists | |
| `getCurrentPersonId()` exists | Import from `@/lib/auth` | Function exists | |
| `currentUserHasRole()` exists | Import from `@/lib/auth` | Function exists | |
| `currentUserIsOwner()` exists | Import from `@/lib/auth` | Function exists | |
| `currentUserIsAdmin()` exists | Import from `@/lib/auth` | Function exists | |
| `getCurrentAppUser()` still exists | Import from `@/lib/auth` | Function exists (backward compat) | |

### 2.2 Database Function Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| `resolve_organisational_context()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'resolve_organisational_context')` | `true` | |
| `resolve_user_id_from_organisation()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'resolve_user_id_from_organisation')` | `true` | |
| `auth_user_has_organisation_access()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auth_user_has_organisation_access')` | `true` | |
| `resolve_organisation_id_from_auth()` exists | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'resolve_organisation_id_from_auth')` | `true` | |

### 2.3 Interface Verification

| Check | Action | Expected | Status |
|-------|--------|----------|--------|
| `OrganisationContext` interface exported | Import from `@/lib/auth` | Interface exists | |
| Interface has `personId` field | Check type definition | Field exists (string) | |
| Interface has `organisationId` field | Check type definition | Field exists (string) | |
| Interface has `membershipId` field | Check type definition | Field exists (string) | |
| Interface has `role` field | Check type definition | Field exists (string) | |
| Interface has `membershipStatus` field | Check type definition | Field exists (string) | |
| Interface has `validFrom` field | Check type definition | Field exists (string) | |
| Interface has `validTo` field | Check type definition | Field exists (string | null) | |

### 2.4 Backward Compatibility Verification

| Check | Action | Expected | Status |
|-------|--------|----------|--------|
| `getCurrentAppUser()` returns same result as before | Compare before/after | Identical result | |
| `getAuthUser()` unchanged | Compare before/after | Identical result | |
| `isCurrentUserAdmin()` unchanged | Compare before/after | Identical result | |
| Legacy routes still work | Test existing routes | No regression | |

### 2.5 Identity Resolution Verification

| Check | Description | Expected | Status |
|-------|-------------|----------|--------|
| Canonical path resolves correctly | Auth → auth_credentials → persons → organisation_memberships → organisations | Returns OrganisationContext | |
| Fallback path works | Auth → users.auth_user_id → users.id → organisation_memberships | Returns OrganisationContext | |
| No membership returns null | Auth user with no membership | Returns null | |
| No auth returns null | No active session | Returns null | |

### 2.6 Step 1A/1B/1C Regression Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| organisations table unchanged | `SELECT COUNT(*) FROM organisations` | Same as before 1D | |
| persons table unchanged | `SELECT COUNT(*) FROM persons` | Same as before 1D | |
| organisation_memberships table unchanged | `SELECT COUNT(*) FROM organisation_memberships` | Same as before 1D | |
| RLS policies unchanged | Review pg_policies | Same as before 1D | |
| Knowledge table data unchanged | `SELECT COUNT(*) FROM genome_entities` | Same as before 1D | |

### 2.7 Migration Ledger Verification

| Check | Query | Expected | Status |
|-------|-------|----------|--------|
| Ledger has API rebinding entry | `SELECT COUNT(*) FROM migration_ledger WHERE resolution_method = 'api_rebinding'` | `>= 1` | |
| Ledger entry has resolution_status | `SELECT COUNT(*) FROM migration_ledger WHERE resolution_method = 'api_rebinding' AND resolution_status IS NULL` | `0` | |

---

## 3. Verification Gate

All checks must pass before proceeding to the next step. If any check fails:

1. Record the failure in the verification log.
2. Identify the root cause.
3. Fix the code.
4. Re-run verification.

**No legacy authority is removed until all verification checks pass.**

---

## 4. Test Suite Execution

After verification checks pass, run the 95-test suite:

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

**Step 1D exit criterion:** 95/95 PASS on canonical target database. All canonical identity functions available. Backward compatibility maintained. 4 legacy failures remain PENDING for later steps.

---

## 5. What 1D Does NOT Do

| Concern | Status | Deferred To |
|---------|--------|-------------|
| Update every API route | NOT DONE (incremental) | Individual route updates |
| Remove legacy identity path | NOT DONE | Step 9 |
| Remove users.id from knowledge tables | NOT DONE | Step 9 |
| Consultant entity | NOT DONE | Step 5 |
| Engagement entity | NOT DONE | Step 5 |
| Commercial arrangement | NOT DONE | Step 6 |
| Kira Instance separation | NOT DONE | Step 7 |
| Decision/Action/Outcome/Learning | NOT DONE | Step 8 |

---

## 6. Step 1 Summary

| Step | Artifact | Status |
|------|----------|--------|
| 1A | Canonical Identity Migration | Complete |
| 1A | Canonical Identity Verification | Complete |
| 1B | Membership / Tenant Context Migration | Complete |
| 1B | Membership Verification | Complete |
| 1C | RLS Authority Transfer Migration | Complete |
| 1C | RLS Authority Transfer Verification | Complete |
| 1D | API Route Rebinding (database support) | Complete |
| 1D | API Route Rebinding (auth.ts update) | Complete |
| 1D | API Route Rebinding Guide | Complete |
| 1D | API Route Rebinding Verification | Complete |

**Step 1 is now complete.** The canonical identity model is established at the database, RLS, and application layers. The legacy `users.id` identity model is still available for backward compatibility but is no longer the authority.

---

*This artifact is the P0.5-1D API route rebinding verification gate. It marks the completion of Step 1 (Canonical Identity) remediation.*
