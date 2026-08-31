# KIRA — P0.5-1D API Route Rebinding Guide

**Status:** Implementation Guide
**Purpose:** Guide for updating existing API routes to use canonical identity model
**Scope:** Before/after patterns for every API route pattern
**Prerequisite:** P0.5 Step 1D auth.ts changes applied
**Date:** 26 August 2026

---

## 1. Purpose

This guide shows how to rebind existing API routes from the legacy `users.id` identity model to the canonical `organisation_id` identity model.

The governing principle is:

> **Routes should stop asking "What is this user's business/user ID?" and instead establish: authenticated Person → Membership → Organisation.**

---

## 2. Identity Resolution Pattern

### Legacy Pattern (DO NOT USE for new code)

```typescript
import { getCurrentAppUser } from '@/lib/auth';

const user = await getCurrentAppUser();
if (!user) { /* 401 */ }

// user.id is used as:
// - Person identity
// - Organisation identity
// - Tenant isolation key
// - All knowledge table FKs
const userId = user.id;
```

### Canonical Pattern (USE for all new code)

```typescript
import { getCurrentOrganisationContext, getCurrentOrganisationId } from '@/lib/auth';

// Option 1: Full context (when you need role, person, membership details)
const ctx = await getCurrentOrganisationContext();
if (!ctx) { /* 401 */ }

// ctx.organisationId — the canonical tenant key
// ctx.personId — the human identity
// ctx.role — the membership role
// ctx.membershipId — the specific membership

// Option 2: Just organisation_id (simpler, for most data access)
const organisationId = await getCurrentOrganisationId();
if (!organisationId) { /* 401 */ }
```

---

## 3. Migration Strategy: Backward-Compatible Rebinding

The strategy is **not** to change every API route at once. Instead:

1. **Add canonical functions** (Step 1D — done)
2. **Update routes incrementally** — each route updated one at a time
3. **Keep legacy path working** — `getCurrentAppUser()` still works
4. **Remove legacy path** (Step 9) — only after all routes are updated

### Route Update Pattern

```typescript
// BEFORE (legacy):
const user = await getCurrentAppUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const userId = user.id;

// Query by user_id
const { data } = await supabase
  .from('genome_entities')
  .select('*')
  .eq('user_id', userId);

// AFTER (canonical):
const organisationId = await getCurrentOrganisationId();
if (!organisationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// Query by organisation_id
const { data } = await supabase
  .from('genome_entities')
  .select('*')
  .eq('organisation_id', organisationId);

// For backward compatibility during transition, also set user_id on writes:
const user = await getCurrentAppUser();
const { data } = await supabase
  .from('genome_entities')
  .insert({
    organisation_id: organisationId,
    user_id: user?.id, // backward compat — remove in Step 9
    // ... other fields
  });
```

---

## 4. Route-by-Route Rebinding Map

### Knowledge Routes

| Route | Current Pattern | Canonical Pattern |
|-------|----------------|-------------------|
| `app/api/genome/query/route.ts` | `user.id` → query `user_id` | `organisationId` → query `organisation_id` |
| `app/api/genome/entities/route.ts` | `user.id` → query `user_id` | `organisationId` → query `organisation_id` |
| `app/api/knowledge/search/route.ts` | `user.id` → query `user_id` | `organisationId` → query `organisation_id` |
| `app/api/kira/webhooks/save_memory/route.ts` | `user.id` → insert `user_id` | `organisationId` → insert `organisation_id` + `user_id` |

### Conversation Routes

| Route | Current Pattern | Canonical Pattern |
|-------|----------------|-------------------|
| `app/api/kira/conversations/route.ts` | `user.id` → query `user_id` | `organisationId` → query `organisation_id` |
| `app/api/kira/conversations/[id]/route.ts` | `user.id` → query `user_id` | `organisationId` → query `organisation_id` |

### Agent Routes

| Route | Current Pattern | Canonical Pattern |
|-------|----------------|-------------------|
| `app/api/kira/agents/route.ts` | `user.id` → query `user_id` | `organisationId` → query `organisation_id` |
| `app/api/kira/agents/[id]/route.ts` | `user.id` → query `user_id` | `organisationId` → query `organisation_id` |

### Business Identity Routes

| Route | Current Pattern | Canonical Pattern |
|-------|----------------|-------------------|
| `app/api/user/business-identity/route.ts` | `user.id` → query `user_id` | `organisationId` → query `organisation_id` |
| `app/api/user/profile/route.ts` | `user.id` → query `user_id` | `personId` → query `person_id` |

### Admin Routes

| Route | Current Pattern | Canonical Pattern |
|-------|----------------|-------------------|
| `app/api/admin/users/route.ts` | Service-role (no user context) | Service-role (no change needed) |
| `app/api/admin/organisations/route.ts` | Service-role (no user context) | Service-role (no change needed) |

---

## 5. Write Operations: Dual-Key Strategy

During the transition period, write operations should populate BOTH `organisation_id` and `user_id`:

```typescript
// Write with both keys during transition
const { data } = await supabase
  .from('genome_entities')
  .insert({
    organisation_id: organisationId,  // canonical
    user_id: userId,                  // legacy — remove in Step 9
    // ... other fields
  });
```

This ensures:
- New queries can use `organisation_id`
- Legacy queries still work with `user_id`
- Transition is gradual, not a big-bang cutover

---

## 6. Read Operations: Organisation-First

Read operations should use `organisation_id` as the primary filter:

```typescript
// Read with organisation_id (canonical)
const { data } = await supabase
  .from('genome_entities')
  .select('*')
  .eq('organisation_id', organisationId);

// RLS will also enforce organisation_id via org_membership_access policy
```

The RLS policy from Step 1C provides a second layer of enforcement. Even if the application code forgets to filter by `organisation_id`, the RLS policy will deny access to rows from other organisations.

---

## 7. Error Handling

```typescript
// Canonical error handling
const organisationId = await getCurrentOrganisationId();
if (!organisationId) {
  return NextResponse.json(
    { error: 'Unauthorized: No active organisation membership' },
    { status: 401 }
  );
}
```

---

## 8. Testing

After updating each route, verify:

1. Route works with canonical identity
2. Route works with legacy identity (backward compat)
3. RLS enforces organisation isolation
4. Cross-organisation access is denied

---

*This guide is the P0.5-1D API route rebinding reference. Each route should be updated one at a time, with verification after each change.*
