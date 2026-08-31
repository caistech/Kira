# KIRA — P0.4 STAGE 1: MEMORY DEPENDENCY MAP + STAGE 2 CONTRACT PROPOSAL

**Date:** 2026-08-29
**Status:** Stage 1 COMPLETE (evidence-first, no code changed). Stage 2 contract PROPOSED for review.
**Preamble:** P0.4 is an architectural rebinding — Person/user-owned memory → Organisation-owned memory with Person retained as actor/provenance — not a set of isolated query fixes. This document is the map that makes Stage 3 a single execution against a known surface.

---

## 0. THE DEFECT, STATED ONCE

`kira_memory` declares organisational ownership in its schema and RLS, but every application path that reads or writes it resolves and keys identity as `user_id` (Person). The `organisation_id` column exists, was fleetingly backfilled `= user_id`, had an auto-stamp trigger dropped, and is **NULL for every row the application writes** — while RLS gates reads through `auth_user_has_organisation_access(organisation_id)` (which matches nothing). The database and the application disagree about what the memory belongs to. That is the seam P0.4 exists to close.

---

## 1. STAGE 1 — COMPLETE MEMORY DEPENDENCY MAP

### 1.1 Writes — where kira_memory is INSERTed/UPDATEd

| # | Path (file:line) | Shape | Org stamped? |
|---|---|---|---|
| W1 | `lib/kira/uid-tools.ts:329` — `handleKiraSaveMemory` | `insert({ user_id: uid, kira_agent_id, agent_id, memory_type, content, importance, source_conversation_id, ...})` | **NO** |
| W2 | `lib/kira/uid-tools.ts` dedupe scan (lines ~125-130) | `select(content).eq('user_id', uid).neq('active', false).limit(500)` — update path via existing row? no, it's a guard | n/a (read) |
| W3 | `lib/kira/apply-profile.ts:57` | `insert({ user_id: userId, kira_agent_id: a.id, memory_type:'context', content, importance:9, tags })` | **NO** |
| W4 | `app/api/kira/create/route.ts:603` | `insert({ user_id: user.id, kira_agent_id: savedAgent.id, memory_type:'context', content, importance:9, tags })` | **NO** |
| W5 | `app/api/kira/create/route.ts:722` | `insert(seeds.map(s => ({ user_id: user.id, kira_agent_id: savedAgent.id, ... })))` | **NO** |
| W6 | `lib/kira/confirm.ts:253` | `insert` into `kira_fact_confirmations` `({ memory_id, user_id, outcome, said, ... })` — sibling table, links by memory_id | n/a (FK table) |
| U1 | `lib/kira/confirm.ts:273` | `kira_memory.update(patch).eq('id', fact.id)` — scoped by **id only**, safe-by-prior-scoping (the row was fetched `.eq('user_id')` at line 224-229) | **NO** |
| U2-U9 | Update paths in convai distil writer + assistant-state re-filing (`lib/kira/convai.ts`, `memory-extract.ts`, `entity-sweep.ts`) | classification/refile/supersede by memory id + user | **NO** |
| W7 | Distil writer — dual write: `kira_memory` + Mnemo semantic index (`lib/kira/mnemo.ts:38` `mnemoAdd`) | via `save_memory` dual-write contract | Mnemo is person-keyed `.add(userId, fact)` |

**Abstraction check (Map Q5):** There is **no single saveMemory abstraction**. There *is* a canonical webhook `save_memory` (`app/api/kira/webhooks/save_memory/route.ts` + `app/api/convai/webhooks/save_memory/route.ts`) that routes to either `handleKiraSaveMemory` (new, `/lib/kira/uid-tools.ts`) or `kiraConvaiRoutes().saveMemory` (legacy convai package). But profile-briefing (W3), create-route seeding (W4/W5), and update/refile (U1/U2-U9) all bypass it and hand-roll their own `user_id`-keyed inserts. **This is the scatter the contract must unify.**

### 1.2 Reads — where memory is retrieved/searched

| # | Path (file:line) | Scope key | Org boundary? | Class */
|---|---|---|---|---|
| R1 | `lib/kira/recall.ts:65-75` — recall handler | `.eq('user_id', conv.user_id)` + `.eq('active', true)` + `.ilike(content)` + optional `.eq('agent_id')` | **NO** | DEFECT (org resource, person filter) |
| R2 | `lib/kira/recall.ts:62` — Mnemo search | `mnemoSearch(conv.user_id, query, 6)` | **NO** | DEFECT (person-keyed semantic lane) |
| R3 | `lib/kira/uid-tools.ts` `get_conversation_context` | conversation→user RPC | **NO** | DEFECT |
| R4 | `lib/kira/confirm.ts:224-229` — unconfirmedFacts | `.eq('user_id', userId)` `.limit(500)` | **NO** | DEFECT |
| R5 | `lib/kira/confirm.ts` facts_to_confirm | via R4 owner-scoped candidates | **NO** | DEFECT |
| R6 | `lib/kira/mnemo.ts` search | `.eq(ownerKey)` | **NO** | DEFECT |
| R7 | `lib/kira/key-risk.ts`, `swarm/open-tasks.ts` | readTaskLedger by `user_id` | **NO** | DEFECT |
| R8 | `lib/kira/convai.ts` post-call + sweep helpers | user/agent | **NO** | DEFECT |
| R9 | `lib/kira/other-businesses.ts:30` | memoryTable by owner | **NO** | DEFECT |
| R10 | `app/api/kira/chat/history/route.ts` | conversation-scoped | NO | DEFECT |
| R11 | `app/api/cron/genome-classify/route.ts:40-51` | `.select('user_id')` → batch owners | **NO** | DEFECT (background) |
| R12 | admin: `app/admin/(panel)/exec/[userId]/page.tsx:58` | `.eq('user_id', userId)` memory list | **NO** | INSPECTION-BY-PERSON (intent is per-user exec view; see 1.4) |
| R13 | `lib/genome/derive.ts`, `business-genome/extract.ts`, `post-call-hook.ts` | genome projection FROM kira_memory | NO | DEFECT (downstream consumes person-keyed feed) |
| R14 | `app/api/genome/redact/route.ts:118`, `app/api/genome/export/route.ts` | read kira_memory + Mnemo | NO | DEFECT |

`*` classification: ORGANISATION_OWNERSHIP / PERSON_ACTOR / AUTH_ID / LEGACY_COMPAT / DEFECT. **Every memory read classifies DEFECT** — none carries an organisation boundary.

### 1.3 Background — memory processed without an authenticated request

| # | Path | Read/write | Scope key | Org? | Notes |
|---|---|---|---|---|---|
| B1 | `app/api/cron/memory-integrity/route.ts:40-74` | read `convai_memory` `.select('id,user_id,agent_id').not('agent_id','is',null)` + read `convai_agents` `.select('id,user_id')` | user_id↔agent.user_id cross-check | **NO** | Watchdog encodes **legacy invariant** ("memory owner must equal agent owner, by user_id"). Must become org-aware (memory.organisation_id == agent.organisation_id). Reads service-role. |
| B2 | `app/api/cron/genome-classify/route.ts:40-51` | read `kira_memory` `.select('user_id')` → distinct owners batch → classify → write genome | user_id | **NO** | Reconstructs ownership from user_id (silent paradigm revert risk). |
| B3 | `lib/kira/memory-extract.ts` — distillation | write kira_memory | conversation/user | **NO** | Prompt-level distillation, saves via convai writer. |

### 1.4 Admin paths

| # | Path | Read/write | Scope | Notes |
|---|---|---|---|---|
| A1 | `app/admin/(panel)/exec/[userId]/page.tsx:58` + `lib/admin/exec.ts` | read `kira_memory` `.eq('user_id', userId)` | by-Person | The page ALREADY resolves org lens for business_valuations/knowledge (lines 42-56: `organisation_memberships`→`orgIds`) but **memory is still keyed on user_id**. Intent per UI comment line 49-50: "knowledge... read through the organisations they belong to — never keyed on their own user_id". **Memory did not get the same treatment — this is the inconsistency.** For a user spanning multiple orgs, memory is shown unpartitioned. Decision required (1.5). |
| A2 | `lib/admin/exec.ts:91-126` | read business_valuations/knowledge by orgIds | org | memory read remains user-keyed only in A1. |

### 1.5 Decision points the contract must resolve (flagged, not decided here)

1. **Admin (A1):** is the exec view an *Organisation* lens (resolve user→memberships→`organisation_id` partition) or a *Person* lens (keep user_id for provenance inspection, but then tag org per memory)? The page's own comment says org lens; memory was simply left behind. **Recommend org partition + per-row provenance.**
2. **Recall R1/R2:** recall currently keyed per-user. Under org-first, recall must be org-scoped (`.eq('organisation_id', orgId)`) with Person as filter only when the caller IS the memory's actor and the org context is the same. Agent scoping stays as an additional operational filter.
3. **Background B1 watchdog:** extend/cross-check to `memory.organisation_id == agent.organisation_id` (keeps the user cross-check as provenance).
4. **Background B2 classify:** derive org from the row's `organisation_id` (authoritative), not from `user_id` resolution.
5. **Dedupe (W2, U2-U9):** dedupe boundary is `organisation_id + normalised content`, not `user_id + content`. Two orgs with same fact = distinct.

### 1.6 Provenance / Instance / Conversation / Dedupe / RLS / Tests (Map Q6–Q11)

- **Provenance (Q6):** Person enters at `user_id` (activation, recall identity, confirm owner, profile). Under the contract it becomes `person_id`/actor — preserved, not removed.
- **Instance (Q7):** `kira_agent_id`/`agent_id` on memory row (W1/W3/W4/W5, R1 optional filter). Operational context; NEVER owner.
- **Conversation (Q8):** `source_conversation_id` (W1) + `convai_memory` conversation links (R1, get_conversation_context RPC). Evidence/source context; never owner.
- **Dedupe (Q9):** current boundary = `user_id` + normalised content (W2 comment lines 119-130 details the bounded scan, 500-limit, isNearDuplicate). **Org-unaware → cross-org false-dedupe risk.**
- **RLS (Q10):** ONE policy only: `kira_memory_org_member_select` = `auth_user_has_organisation_access(organisation_id)` for SELECT. No INSERT/UPDATE policies → writes are service-role only (no RLS write boundary). On NULL-org rows the SELECT boundary matches nothing. So RLS is *defined org-first* but the app never feeds it.
- **Tests (Q11):** to inventory in Stage 4 — expected legacy expectations in `save-memory-dedupe.test.ts`, `memory-entity.test.ts`, `confirmation-offer.test.ts` (per own manifest hint: `expect(handler).not.toMatch(/.from\('\n'\)/)` etc.). These will need updating to the org-first contract, not merely augmented.

### 1.7 The real defect, in one line

> **`organisation_id` is the declared owner everywhere and the actual owner nowhere; `user_id` is the actual owner everywhere and the declared owner nowhere. Person identity was allowed to become memory-ownership authority.**

---

## 2. STAGE 2 — LOCKED ORGANISATION-FIRST MEMORY CONTRACT

**APPROVED 2026-08-29** with two amendments. Both are folded in below; everything else is locked as originally proposed.

### Amendment 1 — `ctx` is authoritative, not a duplicated argument

The contract receives an already-resolved organisational context. It never accepts an independently supplied organisation ID that could disagree with that context. "Resolve once at the boundary" is therefore technically enforceable, not merely procedural.

```
// lib/kira/memory-contract.ts  (NEW — canonical memory boundary)
schema MemoryContext {
  organisationId: string      // SOLE authoritative organisation ID, resolved once at the boundary
  authUserId?: string         // authenticated user identity that produced this context (AUTH_ID)
  resolvedFrom: string        // 'active-membership' | 'membership' | 'admin-org-lens' (audit)
}

saveMemory(ctx, {
  personId?,             // actor/provenance (formerly user_id) — never becomes owner
  kiraInstanceId?,       // kira_agent_id / agent_id — operational context
  conversationId?,       // source_conversation_id — evidence context
  memoryType, content, importance, tags,
}: SaveMemoryInput): Promise<SaveMemoryResult>

recallMemory(ctx, {
  query?,             // optional substring
  actorPersonId?,     // optional actor filter (Person remains provenance)
  kiraInstanceId?,    // optional operational context
  limit=8,
}): Promise<RecallResult>
```

### Amendment 2 — one ownership boundary, not necessarily two functions

Specialised operations may exist behind the same canonical boundary for classification, admin, projection, background work — e.g. `getPendingMemoriesForOrganisation(ctx)`, `getMemoriesForAdminView(ctx)`. The architectural requirement is **one ownership boundary**, and every such operation must enforce `organisation_id = ctx.organisationId` internally. Stage 3 is not artificially coupled to only two functions.

### Contract rules (non-negotiable, locked)

1. `ctx.organisationId` is the **sole authoritative** organisation ID. No operation input may carry an organisation ID (`ctx.organisationId ?? input.organisationId` is forbidden). `personId` is actor/provenance, optional, and **never** participates in ownership resolution.
2. Organisation is resolved ONCE, at the route/auth boundary, via the single canonical resolver `getOrganisationContext()` — the same one already used by org-first routes. The context object is threaded through; memory code never resolves org itself.
3. **No fallback.** `organisationId ?? personId` is forbidden; `organisation_id = user_id` is forbidden. If organisational context is unavailable → explicit `RESULT_BLOCKED` (no authoritative row created); caller decides quarantine/fail. Never silently create an unowned memory.
4. Every write stamps `organisation_id` from `ctx.organisationId`. Every read filters `.eq('organisation_id', ctx.organisationId)`.
5. Dedupe boundary = `organisation_id + normaliseFact(content)`. Cross-org identical content is never merged. (Organisation A / Person 1 "we use X" → Memory A; Organisation B / Person 2 "we use X" → Memory B — independent.)
6. `user_id` remains on the row as **person/actor provenance** (semantic rebind: `user_id = owner` becomes `user_id = provenance`; physical column rename is a separate decision). Preserved through every update path.
7. Distil/convai/entity-sweep/memory-extract writers are refactored to call the canonical boundary, never to insert directly.
8. Background (B1/B2), admin (A1), genome projections (R13/R14) and recall (R1/R2) all consume the same boundary — one ownership truth.

### Stage 3 hard acceptance criteria (locked)

For every successful `kira_memory` INSERT:
- `organisation_id IS NOT NULL`
- `organisation_id` came from the canonical organisational context (`ctx.organisationId`)
- `user_id`, if present, represents **Person provenance only**

For every `kira_memory` SELECT:
- `organisation_id` is part of the ownership boundary

Forensic test after Stage 3:
- **No application memory writer may directly call `.from('kira_memory').insert(...)`, `.update(...)`, or read via `.from('kira_memory')` outside the canonical memory boundary.**

`ctx.organisationId` (sole authority) → memory `organisation_id`; `personId` → memory `user_id`; `kiraInstanceId` → `kira_agent_id`.

---

### Ownership-paradigm shift this enforces

```
BEFORE:  Person → user_id → kira_memory
AFTER:   Authenticated user → Person → Organisation Membership → Organisation
                                                       ↓
                                                 Organisational Memory
                                                       ↑
                                               Person = provenance/actor
```