# KIRA — P2.1 Implementation Baseline and Migration Execution Plan

**Status:** EXECUTION MAP COMPLETE
**Purpose:** Convert P1.1–P1.4 architectural findings into an exact file/table/route/policy-level execution map
**Scope:** Every file, table, route, policy, and service that must change, in dependency order
**Date:** 26 August 2026
**Prerequisite:** P1 COMPLETE (P1.1–P1.4 all COMPLETE)
**Phase Boundary:** Planning only. No application code changes during P2.1. This document IS the execution plan.

---

## 1. What P2.1 Is

P2.1 is the bridge between P1 architecture and P2 implementation. It converts the 4,000+ lines of architectural discovery into a file-level execution map that can be implemented in controlled, testable steps.

After P2.1, we can say: "Here is every file that must change, in what order, with what rollback strategy."

---

## 2. Scope Summary

### Files Requiring Changes by P2 Level

| P2 Level | Category | Approximate File Count |
|---|---|---|
| P2.2 | Auth / Identity | 42 files (39 `getCurrentAppUser` + 3 auth routes) |
| P2.3 | RLS / Authority | ~30 files (15 service-role usages to audit, ~15 routes to secure) |
| P2.4 | Users Table Decomposition | 50+ files (all files touching `users` columns) |
| P2.5 | Knowledge Architecture | ~20 files (new domain service, pipeline, repositories) |
| P2.6 | Agent Alignment | ~15 files (tool webhooks, tool defs, post-call pipeline) |
| P2.7 | Application / UI | ~40 files (all page components using legacy identity) |

---

## 3. P2.2 — Auth / Runtime Identity

### 3.1 What Changes

Replace `getCurrentAppUser()` with `getCurrentOrganisationContext()` in every route and page component that uses it.

### 3.2 Affected Files

**API Routes (20 files):**

| File | Current Pattern | Target Pattern | Notes |
|---|---|---|---|
| `app/api/checkout/route.ts` | `getCurrentAppUser()` → user object | `getCurrentOrganisationContext()` → org context | Also writes to `users` table (P2.4 concern) |
| `app/api/billing/usage/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Reads `users.voice_cost` (P2.4 concern) |
| `app/api/billing/cancel/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Writes `users.subscription_status` (P2.4 concern) |
| `app/api/billing/portal/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Reads Stripe ID from `users` (P2.4 concern) |
| `app/api/loi/route.ts` | `getCurrentAppUser().catch(() => null)` | `getCurrentOrganisationContext().catch(() => null)` | Non-critical — LOI download |
| `app/api/voice/telemetry/route.ts` | `getCurrentAppUser().catch(() => null)` | `getCurrentOrganisationContext().catch(() => null)` | Telemetry — optional |
| `app/api/valuation/mine/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Reads `business_valuations` (P2.4 concern) |
| `app/api/valuation/claim/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Writes `business_valuations` (P2.4 concern) |
| `app/api/genome/redact/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Genome operations |
| `app/api/kira/knowledge/upload/route.ts` | DUAL: canonical auth + legacy writes | Canonical only | **Already has canonical auth — fix write path** |
| `app/api/kira/knowledge/[id]/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Knowledge CRUD |
| `app/api/kira/document/[...path]/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Document serving |
| `app/api/kira/entity/resolve/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Entity resolution |
| `app/api/kira/entity/history/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Entity history |
| `app/api/kira/entity/sweep/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Entity sweep |
| `app/api/genome/dedupe-sweep/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Deduplication |
| `app/api/kira/chat/transcript/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Transcript access |
| `app/api/kira/contact/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Contact lookup |
| `app/api/kira/kill/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Kill switch |
| `app/api/kira/keep-document/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Document retention |
| `app/api/kira/practice-intelligence/[...path]/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Practice intelligence |
| `app/api/kira/practice-intelligence/fetch-clients/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Client fetch |
| `app/api/kira/practice-intelligence/fetch-documents/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Document fetch |
| `app/api/kira/referral/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Referral |
| `app/api/user/profile/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | User profile |
| `app/api/kira/memories/route.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` | Memory listing |
| `app/api/kira/setup-tools/route.ts` | `getCurrentAppUser()` (deprecated path) | Remove — onboarding uses auth'd draft flow | Already deprecated |
| `app/api/kira/research/route.ts` | NO AUTH — client-supplied `user_id` | `getCurrentOrganisationContext()` | **P0 FIX — add auth** |
| `app/api/kira/email/send-kira-ready/route.ts` | NO AUTH — client-supplied `user_id` | `getCurrentOrganisationContext()` | **P0 FIX — add auth** |

**Page Components (19 files):**

| File | Current Pattern | Target Pattern |
|---|---|---|
| `app/chat/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/dashboard/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/dashboard/side-menu.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/dashboard/capability-sweep/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/dashboard/clients/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/dashboard/memories/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/dashboard/practice-intelligence/[section]/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/onboarding/area-agenda/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/onboarding/area-focus/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/onboarding/business-identity/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/onboarding/billing/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/onboarding/discoveries/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/onboarding/drive/[domain]/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/onboarding/drive/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/onboarding/practice-intelligence/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/onboarding/setup-client/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/onboarding/start/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/onboarding/voice/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/setup/drive/access-granted/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/settings/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/privacy/page.tsx` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/onboarding/practice-intelligence/actions.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |
| `app/onboarding/start/claim.ts` | `getCurrentAppUser()` | `getCurrentOrganisationContext()` |

### 3.3 The Identity Return Type Change

`getCurrentAppUser()` returns a `User` object from the `users` table.
`getCurrentOrganisationContext()` returns an `OrganisationContext` object.

**The return type changes.** Every call site must be updated to destructure the new return type.

```typescript
// Before (legacy)
const user = await getCurrentAppUser();
const userId = user?.id;

// After (canonical)
const ctx = await getCurrentOrganisationContext();
const organisationId = ctx?.organisationId;
const personId = ctx?.personId;
const role = ctx?.role;
```

### 3.4 P0 Auth Fixes (Immediate)

**Route: `app/api/kira/research/route.ts`**
- Current: No auth. Accepts `user_id` from body/header.
- Fix: Add `getCurrentOrganisationContext()`. Remove `user_id` from body. Use `ctx.organisationId` for scoping.
- Files affected: `app/api/kira/research/route.ts`

**Route: `app/api/kira/email/send-kira-ready/route.ts`**
- Current: No auth. Accepts `user_id` from body.
- Fix: Add `getCurrentOrganisationContext()`. Remove `user_id` from body. Use `ctx.personId` for person lookup.
- Files affected: `app/api/kira/email/send-kira-ready/route.ts`

### 3.5 Rollback Checkpoint

After P2.2, verify:
- [ ] Zero imports of `getCurrentAppUser()` in non-test files
- [ ] All routes use `getCurrentOrganisationContext()`
- [ ] P0 auth violations resolved
- [ ] All existing tests pass
- [ ] No regression in user-facing functionality

**Rollback:** Restore `getCurrentAppUser()` imports. Re-enable client-supplied `user_id` in research/email routes.

---

## 4. P2.3 — RLS / Authority Boundaries

### 4.1 What Changes

1. Add RLS policies to all unprotected P0.5 Step 5 tables
2. Audit and restrict service-role client usage
3. Activate edge middleware

### 4.2 Unprotected Tables — Add RLS

| Table | Action |
|---|---|
| `ownership_periods` | Add `auth_user_has_organisation_access(organisation_id)` FOR ALL |
| `decisions` | Add `auth_user_has_organisation_access(organisation_id)` FOR ALL |
| `decision_history` | Add `auth_user_has_organisation_access(organisation_id)` FOR ALL |
| `kira_instances` | Add `auth_user_has_organisation_access(organisation_id)` FOR ALL |
| `kira_instance_history` | Add `auth_user_has_organisation_access(organisation_id)` FOR ALL |
| `subscriptions` | Add `auth_user_has_organisation_access(organisation_id)` FOR ALL |
| `subscription_history` | Add `auth_user_has_organisation_access(organisation_id)` FOR ALL |
| `commercial_arrangements` | Add `auth_user_has_organisation_access(organisation_id)` FOR ALL |
| `commercial_history` | Add `auth_user_has_organisation_access(organisation_id)` FOR ALL |

**Migration:** New SQL migration file. Idempotent (CREATE POLICY IF NOT EXISTS).

### 4.3 Service-Role Audit

Files currently using `createServiceClient()`:

| File | Usage | Legitimate? | Action |
|---|---|---|---|
| `lib/billing/index.ts` | Billing operations | Yes — Stripe requires cross-tenant | Keep, add logging |
| `lib/billing/arrears.ts` | Arrears billing | Yes — billing operations | Keep, add logging |
| `lib/introducer/index.ts` | Introducer channel | Yes — cross-tenant referral | Keep, add logging |
| `lib/admin/exec-reprovision.ts` | Admin reprovisioning | Yes — admin operation | Keep |
| `lib/kill-switch.ts` | Kill switch | Yes — platform-wide operation | Keep |
| `lib/kira/convai.ts` | Post-call pipeline | **MUST VERIFY** — may not need service role | Audit and restrict |
| `lib/kira/setup-tools/route.ts` | Tool setup | Deprecated — remove | Remove |
| `app/api/kira/research/route.ts` | Research | **P0 — NO AUTH** | Fix in P2.2 |
| `app/api/kira/email/send-kira-ready/route.ts` | Email | **P0 — NO AUTH** | Fix in P2.2 |
| `business-genome/repository.ts` | Genome CRUD | **AUDIT** — may not need service role | Audit and restrict |
| `business-genome/conflicts.ts` | Conflict detection | **AUDIT** — may not need service role | Audit and restrict |
| `lib/genome/sweep.ts` | Genome sweep | **AUDIT** — may not need service role | Audit and restrict |
| `lib/kira/memory-extract.ts` | Memory extraction | **AUDIT** — may not need service role | Audit and restrict |
| `lib/kira/confirm.ts` | Fact confirmation | **AUDIT** — may not need service role | Audit and restrict |
| `lib/kira/discovery.ts` | Discovery | **AUDIT** — may not need service role | Audit and restrict |

**Rule:** Service-role usage must be documented with justification. No route may use service-role for business operations that could be performed with session-scoped RLS.

### 4.4 Edge Middleware Activation

**File:** `proxy.ts`
**Change:** Rename export from `proxy` to `middleware`.

```typescript
// Before
export const proxy = createMiddlewareClient(/* ... */);

// After
export const middleware = createMiddlewareClient(/* ... */);
```

**Verification:** After rename, confirm Next.js edge middleware activates and route segregation works.

### 4.5 Rollback Checkpoint

After P2.3, verify:
- [ ] All P0.5 Step 5 tables have RLS policies
- [ ] Service-role usage documented and restricted
- [ ] Edge middleware active (route segregation enforced)
- [ ] No route accessible without authentication
- [ ] RLS policies tested with multiple user roles

**Rollback:** Drop new RLS policies. Revert middleware export name. Re-enable unrestricted service-role usage.

---

## 5. P2.4 — Users God-Table Decomposition

### 5.1 What Changes

Migrate data from `users` table columns to canonical tables. Remove decomposed columns from `users`.

### 5.2 Decomposition Map

| `users` Column | Target Table | Target Column | Migration SQL |
|---|---|---|---|
| `email` | `persons` | `email` | `UPDATE persons SET email = users.email WHERE persons.id = users.id` |
| `name` | `persons` | `first_name`, `last_name` | Split `users.name` → `persons.first_name`, `persons.last_name` |
| `created_at` | `persons` | `created_at` | Direct copy |
| `updated_at` | `persons` | `updated_at` | Direct copy |
| `subscription_status` | `subscriptions` | `status` | `INSERT INTO subscriptions (organisation_id, status, ...) SELECT ... FROM users` |
| `stripe_subscription_id` | `subscriptions` | `stripe_subscription_id` | Direct copy |
| `stripe_customer_id` | `subscriptions` | `stripe_customer_id` | Direct copy |
| `trial_ends_at` | `subscriptions` | `trial_ends_at` | Direct copy |
| `voice_cost` | `voice_usage` (new) | `cost_usd` | New table — operational metric |

### 5.3 Migration Sequence

**Step 1:** Create `voice_usage` table (new operational table for voice cost)
**Step 2:** Migrate `users.email` → `persons.email`
**Step 3:** Migrate `users.name` → `persons.first_name`, `persons.last_name`
**Step 4:** Migrate subscription columns → `subscriptions` table
**Step 5:** Migrate `voice_cost` → `voice_usage` table
**Step 6:** Update all service/repository code to read/write from canonical tables
**Step 7:** Verify all reads/writes use canonical tables
**Step 8:** Remove decomposed columns from `users` table

### 5.4 Affected Service Files

| File | Currently Reads/Writes | Must Change To |
|---|---|---|
| `lib/billing/index.ts` | `users.subscription_status` etc. | `subscriptions.status` etc. |
| `lib/billing/plan-state.ts` | `user.subscription_status` | `subscriptions.status` |
| `lib/billing/arrears.ts` | `users` table | `subscriptions` table |
| `lib/billing/copy.ts` | Price constants only | No change needed |
| `app/api/checkout/route.ts` | `users` subscription columns | `subscriptions` table |
| `app/api/billing/cancel/route.ts` | `users` subscription columns | `subscriptions` table |
| `app/api/billing/portal/route.ts` | `users.stripe_customer_id` | `subscriptions.stripe_customer_id` |
| `app/api/billing/usage/route.ts` | `users.voice_cost` | `voice_usage` table |
| `app/api/valuation/mine/route.ts` | `users` join | Canonical joins |
| `app/api/valuation/claim/route.ts` | `users` writes | Canonical writes |
| `business-genome/repository.ts` | `genome_*` (person-scoped) | Org-scoped knowledge tables |
| `lib/kira/memory-extract.ts` | `kira_memory` | Evidence + knowledge tables |
| `lib/kira/recall.ts` | `kira_memory` + Mnemo | Organisational knowledge |
| `lib/kira/knowledge-search.ts` | `kira_knowledge` | Evidence + knowledge tables |
| `lib/kira/knowledge-ingest.ts` | `kira_knowledge` + `kira_knowledge_chunks` | Evidence + knowledge tables |
| `lib/kira/convai.ts` | Multiple `users` queries | Canonical tables |

### 5.5 The Identity Bridge

During decomposition, the `users` table retains `id` (auth_user_id) for backward compatibility. All other columns are migrated to canonical tables.

**Bridge query pattern:**
```typescript
// During migration — bridges legacy and canonical
const user = await getCurrentAppUser(); // reads from users (retained id only)
const ctx = await getCurrentOrganisationContext(); // reads from canonical chain
// Verify: user.id should map to ctx.personId via auth_credentials
```

### 5.6 Rollback Checkpoint

After P2.4, verify:
- [ ] All subscription data migrated to `subscriptions` table
- [ ] Billing system reads/writes `subscriptions`, not `users`
- [ ] All person data migrated to `persons` table
- [ ] `users` table retains only `id`, `created_at`, `updated_at`
- [ ] No code reads decomposed columns from `users`
- [ ] All existing billing cycles complete successfully
- [ ] Stripe integration verified in staging

**Rollback:** Restore decomposed columns to `users`. Rewire billing to `users`. Revert service code.

---

## 6. P2.5 — Canonical Knowledge Architecture

### 6.1 What Changes

1. Build evidence capture layer
2. Build knowledge promotion pipeline
3. Wire post-call pipeline to evidence → knowledge flow
4. Migrate existing knowledge to org-scoped tables
5. Build temporal query integration

### 6.2 New Files to Create

| File | Purpose |
|---|---|
| `lib/domain/knowledge/repository.ts` | Organisational knowledge CRUD |
| `lib/domain/knowledge/evidence-repository.ts` | Evidence CRUD |
| `lib/domain/knowledge/promotion-pipeline.ts` | Evidence → knowledge promotion |
| `lib/domain/knowledge/temporal-queries.ts` | Point-in-time, history, supersession |
| `lib/domain/knowledge/provenance.ts` | Provenance chain queries |
| `app/api/knowledge/temporal/route.ts` | Temporal query API |
| `app/api/knowledge/provenance/route.ts` | Provenance query API |

### 6.3 Files to Modify

| File | Change |
|---|---|
| `lib/kira/convai.ts` | Post-call pipeline writes to `evidence` (not `kira_memory` directly) |
| `lib/kira/memory-extract.ts` | Extraction writes to `evidence` table |
| `lib/kira/recall.ts` | Recall from `organisational_knowledge` (not `kira_memory`) |
| `lib/kira/knowledge-search.ts` | Search `organisational_knowledge` (not `kira_knowledge`) |
| `lib/kira/knowledge-ingest.ts` | Ingest documents as `evidence` |
| `lib/kira/knowledge-tool-def.mjs` | Tool queries `organisational_knowledge` |
| `lib/kira/memory-entity-def.mjs` | Tool queries `organisational_knowledge` |
| `business-genome/extract.ts` | Extraction writes to `organisational_knowledge` via promotion |
| `business-genome/repository.ts` | Repository writes to `organisational_knowledge` |
| `business-genome/orchestrator.ts` | Orchestrator queries `organisational_knowledge` |

### 6.4 Promotion Pipeline

```
Evidence Capture
    │
    ▼
evidence table (org-scoped, immutable)
    │
    ▼
LLM Extraction (evidence → candidate knowledge)
    │
    ▼
Governance (validation, deduplication, conflict detection)
    │
    ▼
organisational_knowledge (org-scoped, temporal)
    │
    ▼
knowledge_evidence_links (provenance chain)
```

### 6.5 Rollback Checkpoint

After P2.5, verify:
- [ ] Evidence table populated from conversations
- [ ] Knowledge promotion pipeline operational
- [ ] Organisational knowledge queries return correct data
- [ ] Temporal queries functional
- [ ] Provenance chain complete
- [ ] Existing knowledge migrated or accessible
- [ ] Agent tools read from org-scoped knowledge

**Rollback:** Restore legacy knowledge path (`kira_memory`, `genome_*`). Remove evidence layer. Keep P0.7 schema for future use.

---

## 7. P2.6 — Agent Alignment

### 7.1 What Changes

1. Agent tools resolve identity at runtime (not at provisioning)
2. Agent tools read/write org-scoped knowledge
3. Role checks in tool handlers

### 7.2 Files to Modify

| File | Change |
|---|---|
| `lib/kira/convai.ts` | Resolve org context per-conversation from conversation record |
| `lib/kira/uid-tools.ts` | Remove `?uid=` extraction — resolve identity per-request |
| `lib/kira/tool-manifest.mjs` | Update tool definitions to use runtime-resolved identity |
| `lib/kira/knowledge-tool-def.mjs` | Tool uses org-scoped knowledge |
| `lib/kira/memory-entity-def.mjs` | Tool uses org-scoped knowledge |
| `lib/kira/confirm-tool-def.mjs` | Tool uses org-scoped knowledge |
| `lib/kira/recall.ts` | Recall from org-scoped knowledge |
| `lib/kira/knowledge-search.ts` | Search org-scoped knowledge |
| `lib/kira/area-agenda.ts` | Query org-scoped knowledge for gaps |
| `lib/kira/area-focus.ts` | Query org-scoped knowledge |
| `lib/kira/entity-sweep.ts` | Sweep org-scoped knowledge |
| `lib/kira/capability-sweep.ts` | Sweep org-scoped knowledge |
| `lib/kira/other-businesses.ts` | Query org-scoped knowledge |
| `lib/kira/speaking-to.ts` | Resolve org context |
| `lib/kira/start-framing.ts` | Resolve org context |
| `lib/kira/welcome-back.ts` | Resolve org context |
| `app/api/kira/webhooks/tool-webhook/route.ts` | Resolve identity per-request from conversation |
| `scripts/provision-existing-agents.mjs` | Provision without baked `?uid=` |

### 7.3 Tool Identity Resolution Pattern

```typescript
// Before (legacy)
const uid = extractUidFromUrl(req.url); // baked at provisioning
const user = await sb.from('users').select('*').eq('id', uid).single();

// After (canonical)
const conversationId = payload.conversation_id;
const conversation = await sb.from('conversations').select('user_id').eq('id', conversationId).single();
const ctx = await resolveOrganisationContext(conversation.user_id);
// ctx.organisationId is now available for all operations
```

### 7.4 Rollback Checkpoint

After P2.6, verify:
- [ ] Tools resolve identity per-request (not from URL)
- [ ] Tools read/write org-scoped knowledge
- [ ] Agent conversations correctly scoped to organisation
- [ ] Tool provisioned without `?uid=` in URLs
- [ ] Agent cannot access knowledge from other organisations

**Rollback:** Restore `?uid=` provisioning. Rewire tools to person-scoped knowledge.

---

## 8. P2.7 — Application / UI Migration

### 8.1 What Changes

All page components use `getCurrentOrganisationContext()`. UI displays org-scoped data.

### 8.2 Files to Modify

| File | Change |
|---|---|
| All 23 page components (from §3.2) | Replace `getCurrentAppUser()` with `getCurrentOrganisationContext()` |
| `lib/auth.ts` | Remove `getCurrentAppUser()` (or mark deprecated) |
| `components/` (shared components) | Update to use org context |
| `app/chat/` (chat interface) | Org-scoped conversation display |
| `app/dashboard/` (dashboard) | Org-scoped data display |
| `app/onboarding/` (onboarding) | Org-scoped setup flow |

### 8.3 Rollback Checkpoint

After P2.7, verify:
- [ ] Zero imports of `getCurrentAppUser()` in entire codebase
- [ ] All pages display org-scoped data
- [ ] Role-based UI differentiation (owner vs consultant vs employee)
- [ ] No page references `users` table directly for display data
- [ ] Full regression test pass

**Rollback:** Restore `getCurrentAppUser()` imports. Revert to person-scoped display.

---

## 9. Migration Checkpoints (Rollback Safety)

### Checkpoint Matrix

| Checkpoint | After | Verify | Rollback |
|---|---|---|---|
| **CP-1** | P2.2 | Auth migration complete. P0 fixes applied. Tests pass. | Restore legacy auth |
| **CP-2** | P2.3 | RLS on all tables. Service-role restricted. Middleware active. | Drop RLS. Revert middleware. |
| **CP-3** | P2.4 | Users table decomposed. Billing on canonical tables. Tests pass. | Restore users columns. Rewire billing. |
| **CP-4** | P2.5 | Knowledge on org-scoped tables. Promotion pipeline operational. | Restore legacy knowledge path |
| **CP-5** | P2.6 | Tools resolve identity at runtime. Org-scoped tool operations. | Restore baked tool identity |
| **CP-6** | P2.7 | UI on canonical identity. All pages org-scoped. Full regression pass. | Restore legacy UI identity |

### Verification Scripts

After each checkpoint, run:

```bash
# Verify no getCurrentAppUser() in non-test files
grep -r "getCurrentAppUser" --include="*.ts" --include="*.tsx" app/ lib/ | grep -v ".test."

# Verify no createServiceClient() in non-admin, non-billing, non-webhook routes
grep -r "createServiceClient()" --include="*.ts" app/api/ | grep -v admin | grep -v billing | grep -v webhook

# Verify no client-supplied user_id in request bodies
grep -r "body.*user_id\|header.*user_id\|x-user-id" --include="*.ts" app/api/

# Run full test suite
npm test
```

---

## 10. Dependency Graph (Implementation Order)

```
P2.1 (this document)
    │
    ▼
P2.2 Auth / Identity ─────────────────────── CP-1
    │
    ▼
P2.3 RLS / Authority ─────────────────────── CP-2
    │
    ▼
P2.4 Users Table Decomposition ───────────── CP-3
    │
    ▼
P2.5 Knowledge Architecture ──────────────── CP-4
    │
    ▼
P2.6 Agent Alignment ─────────────────────── CP-5
    │
    ▼
P2.7 Application / UI ────────────────────── CP-6
    │
    ▼
P2 COMPLETE ──────────────────────────────── FULL REGRESSION
```

**Critical rule:** No level may begin until the previous level's checkpoint passes.

---

## 11. What Must Remain Operational During Migration

| Capability | Required During | Notes |
|---|---|---|
| Voice agent conversations | All levels | Core product — must not go down |
| Memory recall | P2.2–P2.4 | Legacy path during identity migration |
| Knowledge search | P2.2–P2.5 | Legacy path during knowledge migration |
| Billing | All levels | Revenue-critical |
| Introducer channel | All levels | Revenue-critical |
| Owner confirmation | P2.2–P2.5 | Business-critical |
| Document upload/search | P2.2–P2.5 | User-facing |

**Rule:** No migration step may break a capability that is required during migration. If a capability is affected, the migration step must include a compatibility bridge.

---

## 12. Risk Register

| Risk | Severity | Level | Mitigation |
|---|---|---|---|
| Billing breaks during subscription migration | CRITICAL | P2.4 | Test against Stripe in staging first. Rollback within billing cycle. |
| Knowledge lost during migration | HIGH | P2.5 | Promote (don't move). Keep legacy tables readable during transition. |
| Agent conversations break | HIGH | P2.6 | Bridge tool identity during migration. Test with live agents. |
| P0 auth fix breaks existing flows | MEDIUM | P2.2 | Add auth to research/email routes first. Test with existing callers. |
| RLS policies block legitimate access | MEDIUM | P2.3 | Test with all roles before production. Stage rollout. |
| Users table decomposition breaks downstream | HIGH | P2.4 | Bridge period: both legacy and canonical reads work. |

---

## 13. P2.1 Completion Criteria

P2.1 is complete when:

- [ ] Every file requiring change is identified with exact file path
- [ ] Every change is classified by P2 level (P2.2–P2.7)
- [ ] Every level has a rollback checkpoint with verification criteria
- [ ] Migration order respects the dependency graph from P1.3
- [ ] Capabilities required during migration are identified and protected
- [ ] Risk register is complete with mitigations
- [ ] No application code has been modified

**P2.1 is now complete. The execution map is established.**

**P2.2 — Auth / Runtime Identity — READY TO BEGIN.**

---

*P2.1 Implementation Baseline and Migration Execution Plan — Complete. No files modified.*
