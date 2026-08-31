# P2.4 Strangler Fig Migration Plan

**Authority:** Dennis-approved Gate 4 decision (Strangler Fig, incremental)
**Date:** 2026-08-30
**Status:** READY TO EXECUTE

---

## Principle

New writes use `organisation_id`. Existing rows are backfilled incrementally. No big-bang schema swap. Every change is backward-compatible — the old path works until the new path is verified, then the old path is removed.

---

## Current State (verified)

| Layer | Status |
|---|---|
| **Schema** | `organisation_id` column exists on: `genome_*`, `kira_memory`, `kira_knowledge`, `conversations`, `conversation_messages`, `kira_agents`, `kira_tasks` |
| **Schema** | `organisation_id` MISSING on: `business_valuations`, `client_profiles`, `kira_drafts`, `genome_item_status` |
| **RLS** | P0.5 canonical org-scoped policies active on most tables |
| **Auth** | `getCurrentOrganisationContext()` / `resolveOrganisationFromUser()` / `resolveOrganisationForPerson()` available in `lib/auth.ts` |
| **Triggers** | `sync_organisation_id_*` triggers auto-populate `organisation_id` from `user_id` on write (bridge phase) |
| **Backfill** | P0.5 migrations backfilled `organisation_id = user_id` on genome/knowledge/conversations/kira_memory/kira_agents |
| **Application** | Many functions already accept org context but still carry `userId` parameters alongside |

---

## Phase 1: DEFECT Fixes (Immediate — Runtime Correctness)

These are genuine bugs causing incorrect behavior right now.

### 1.1 `lib/genome/file-manual.ts` — Identity Namespace Mismatch

**Problem:** Single `userId: string` parameter is simultaneously:
- Person id (for `resolveOrganisationForPerson` at line 79)
- `business_identity.user_id` (for `getBusinessIdentity` at line 72)
- Orchestrator tenant id (for URL at line 102)

These may not be the same identifier post-P0.5.

**Fix:**
- Change signature to `fileManual(organisationId: string, audience: Audience)`
- Resolve business identity via `organisationId` (business identity is org-owned per Gate 1)
- Use `organisationId` for orchestrator tenant URL
- Caller (`webhooks/file_manual/route.ts`) already has `orgContext` — pass `orgContext.organisationId`

### 1.2 `app/knowledge/page.tsx` — Chunk Coverage Scoping

**Problem:** Line 29 queries `kira_knowledge_chunks` with `.eq('user_id', ctx.personId)` while the docs query at line 23 already uses `.eq('organisation_id', ctx.organisationId)`.

**Fix:** Change chunk-coverage query to `.eq('organisation_id', ctx.organisationId)`.

### 1.3 `app/my-genome/[area]/page.tsx` + `actions.ts` — Deprecated Auth + user_id Keying

**Problem:**
- Line 50 uses `getCurrentAppUser()` (deprecated)
- Line 80 queries `genome_item_status` with `.eq('user_id', user.id)`
- `actions.ts` line 65 upserts with `user_id: user.id`, conflict key `(user_id, item_key)`

**Fix:**
- Replace `getCurrentAppUser()` with `getAuthUser()` + `resolveOrganisationForPerson()`
- Query `genome_item_status` with `.eq('organisation_id', orgContext.organisationId)`
- Upsert with `organisation_id: orgContext.organisationId`, conflict key `(organisation_id, item_key)`
- Add `organisation_id` column to `genome_item_status` (Phase 2)

---

## Phase 2: Schema Additions (Strangler — New Columns, Nullable Initially)

These migrations add `organisation_id` to the four tables that still lack it. All nullable initially for backfill.

### 2.1 `genome_item_status` — Add `organisation_id`

```sql
ALTER TABLE genome_item_status ADD COLUMN IF NOT EXISTS
    organisation_id UUID REFERENCES organisations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_genome_item_status_org
    ON genome_item_status (organisation_id, item_key);
```

Backfill from membership chain (same pattern as `kira_tasks`):
```sql
UPDATE genome_item_status g
   SET organisation_id = m.organisation_id
  FROM organisation_memberships m
 WHERE g.organisation_id IS NULL
   AND g.user_id IS NOT NULL
   AND m.person_id = g.user_id
   AND m.status = 'active'
   AND (m.valid_to IS NULL OR m.valid_to > NOW());
```

Quarantine unresolvable:
```sql
UPDATE genome_item_status
   SET quarantine_status = 'quarantined',
       quarantine_reason = 'genome_item_status org rebinding: no resolvable membership'
 WHERE user_id IS NOT NULL AND organisation_id IS NULL;
```

Rebind unique constraint:
```sql
ALTER TABLE genome_item_status DROP CONSTRAINT IF EXISTS genome_item_status_user_id_item_key_key;
ALTER TABLE genome_item_status
    ADD CONSTRAINT genome_item_status_org_item_uniq UNIQUE (organisation_id, item_key);
```

### 2.2 `business_valuations` — Add `organisation_id`

```sql
ALTER TABLE business_valuations ADD COLUMN IF NOT EXISTS
    organisation_id UUID REFERENCES organisations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_business_valuations_org
    ON business_valuations (organisation_id);
```

Backfill + quarantine (same pattern).

### 2.3 `client_profiles` — Add `organisation_id`

```sql
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS
    organisation_id UUID REFERENCES organisations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_org
    ON client_profiles (organisation_id);
```

Backfill + quarantine (same pattern).

### 2.4 `kira_drafts` — Add `organisation_id`

```sql
ALTER TABLE kira_drafts ADD COLUMN IF NOT EXISTS
    organisation_id UUID REFERENCES organisations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_kira_drafts_org
    ON kira_drafts (organisation_id);
```

Backfill via `kira_agents.draft_id` join (kira_drafts has no user_id — the link is through agents).

---

## Phase 3: Application Layer Migration (Incremental, File by File)

Each file is migrated independently. Old path stays until new path is verified.

### 3.1 Wave 1 — Core Lib Functions (highest impact, most callers)

| File | Change |
|---|---|
| `lib/kira/knowledge-search.ts` | Already resolves org from person. Remove `userId` param, accept `organisationId` directly. |
| `lib/kira/knowledge-tool.ts` | Same — accept `organisationId` instead of `userId`. |
| `lib/kira/apply-profile.ts` | Already calls `resolveOrganisationForPerson(userId)`. Change to accept `OrganisationContext`. |
| `lib/kira/confirm.ts` | Same pattern. |
| `lib/kira/discovery.ts` | Same pattern. |
| `lib/kira/area-agenda.ts` | Same pattern. |
| `lib/kira/capability-sweep.ts` | Same pattern. |
| `lib/kira/entity-sweep.ts` | Same pattern. |

**The pattern:** Every function that currently takes `userId: string` and then calls `resolveOrganisationForPerson(userId)` should instead accept `ctx: OrganisationContext` directly. The caller already has it.

### 3.2 Wave 2 — Admin Tooling

| File | Change |
|---|---|
| `lib/admin/exec.ts:119` | `client_profiles` query: change `.in('user_id', userIds)` to `.in('organisation_id', orgIds)` |
| `lib/admin/exec.ts:177` | Agent stitching: change `a.user_id === u.id` to membership-based join |
| `lib/admin/exec-reprovision.ts` | Accept org context, scope by `organisation_id` |
| `app/admin/(panel)/exec/[userId]/page.tsx` | Org-scoped queries with person filter |

### 3.3 Wave 3 — Client Components

| File | Change |
|---|---|
| `app/knowledge/KnowledgeManager.tsx` | Rename `userId` prop to `personId` for clarity; server routes already ignore it |
| `app/knowledge/page.tsx` | Pass `ctx.personId` (already does — rename for clarity) |

### 3.4 Wave 4 — Billing / Introducer

| File | Change |
|---|---|
| `lib/billing/index.ts` | Scope by `organisation_id` (Gate 1: org owns subscription) |
| `lib/introducer/index.ts` | Keep person-scoped (introducer relationship is per-person via membership) |

### 3.5 Wave 5 — Tests

Update test scaffolding to use `organisationId` instead of `userId` where the test exercises org-scoped behavior.

---

## Phase 4: Cleanup (After All Waves Complete)

1. Remove `getCurrentAppUser()` from `lib/auth.ts` (deprecated since P0.5)
2. Remove `sync_organisation_id_*` triggers (no longer needed once all writes set `organisation_id` explicitly)
3. Remove `get_organisation_id_from_user()` bridge function
4. Drop `quarantine_status` / `quarantine_reason` / `quarantined_at` columns from tables where all rows are resolved
5. Update `RESOURCE_MIGRATION_MATRIX.md` — mark all LEGACY/OP entries as RESOLVED
6. Update `PROJECT_STATUS.md` — mark P2.4 as COMPLETE

---

## Execution Order

| Step | What | Risk | Verification |
|---|---|---|---|
| 1 | Fix 3 DEFECTs (1.1–1.3) | Low — surgical | `npx tsc --noEmit` + `npm run build` |
| 2 | Schema migrations (2.1–2.4) | Low — nullable columns, no drops | `supabase db push` to preview, verify columns exist |
| 3 | Backfill + quarantine | Low — idempotent, no destructive ops | Row counts: `organisation_id IS NULL AND user_id IS NOT NULL` should be 0 or quarantined |
| 4 | Wave 1 lib functions | Medium — most callers | `npx tsc --noEmit` + full build + `npm run test` |
| 5 | Wave 2 admin | Low — admin-only surface | Manual verification on admin panel |
| 6 | Wave 3 client | Low — cosmetic rename | Build passes |
| 7 | Wave 4 billing/introducer | Medium — payment path | Stripe test mode end-to-end |
| 8 | Wave 5 tests | Low — test-only | All tests pass |
| 9 | Phase 4 cleanup | Low — removal of dead code | Full build + test suite |

---

## Rollback Strategy

Every phase is independently reversible:
- **Phase 1:** Revert the file changes (git revert)
- **Phase 2:** `ALTER TABLE ... DROP COLUMN organisation_id` (nullable, no FK dependency from app code yet)
- **Phase 3:** Revert the file changes — old `userId` path still works
- **Phase 4:** Only after Phase 3 is fully verified and deployed

---

## NOT In Scope (Deferred)

- `business_valuations` canonical ownership decision (Person? Organisation? Engagement output?) — deferred per P2.3 completion boundary
- Removing `user_id` columns entirely — that's Phase 5, after the Strangler Fig is complete
- Subscription entity redesign (Gate 1) — separate workstream
