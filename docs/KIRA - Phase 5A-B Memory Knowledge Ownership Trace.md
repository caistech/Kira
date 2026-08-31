# KIRA - Phase 5A-B Memory & Knowledge Ownership Trace (Forensic, Read-Only)

**Status:** COMPLETE — INSPECTION ONLY (no code modified)
**Date:** 28 August 2026
**Authority:** KIRA - Canonical Organisational Model (P0.1) — LOCKED
**Scope:** Every write path to `kira_memory`, `kira_knowledge`, `organisational_knowledge` traced
  backwards (org resolution at write) and forwards (downstream readers).

---

## 1. The Three Memory Anchors (competitive, not complementary)

| Layer | Current anchor | Provenance | Canonical requirement |
| :--- | :--- | :--- | :--- |
| **kira_memory** | `user_id` (primary), `kira_agent_id` | `source_conversation_id`, `superseded_by` | Must be classified by semantic content; **organisational memory ultimately belongs to Organisation** (INV-020) |
| **kira_knowledge** | Mixed: `user_id` (upload/url) OR `organisation_id` (research) | `created_by`, `elevenlabs_document_id` | **Organisation-anchored** (INV-009, INV-010, INV-020) |
| **organisational_knowledge** | `organisation_id` ONLY | Full: `supplied_by`, `engagement_id`, `ownership_period_id`, `evidence_id`, `epistemic_state`, `superseded_by` | **Canonical knowledge context** (INV-011, INV-012, INV-020) |

---

## 2. Complete Writer Inventory & Classification

| # | Writer | File:Line | Org resolution at write | Data meaning | Correct canonical anchor | Classification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| W1 | **save_memory** (mid-call) | `uid-tools.ts:328` | **NONE** — `uid` from URL param, no org resolution | Organisational facts (owner assertions during call) | Organisation | **ORG-MEMORY VIOLATION** |
| W2 | **post-call distil** | `convai.ts:150` → `completeConversationMemory` | **NONE** — `userId` from `conversations.user_id`, no org resolution | Distilled organisational knowledge from voice calls | Organisation | **ORG-MEMORY VIOLATION** |
| W3 | **applyProfileExtraction** | `apply-profile.ts:57` | **NONE** — `userId` passed in, no org resolution | Profile briefing / client summary (org knowledge) | Organisation | **ORG-MEMORY VIOLATION** |
| W4 | **agent create seed** | `kira/create/route.ts:603,716` | `getCurrentOrganisationContext()` **called** (ctx.org exists) but memory inserts use `user_id` only | Agent onboarding context (org knowledge) | Organisation | **ACCESS-ONLY USER ANCHORING** |
| W5 | **confirm/deny fact** | `confirm.ts:273` | Upstream `facts_to_confirm` scoped by `user_id` (legacy) | Knowledge governance (verify/supersede) | Organisation | **ORG-MEMORY VIOLATION** |
| W6 | **genome redact** | `genome/redact/route.ts:65` | `getCurrentAppUser()` (legacy), update scopes `.eq('user_id', user.id)` | Knowledge mutation (owner redacts) | Organisation + authorised actor | **ORG-MEMORY VIOLATION** |
| W7 | **knowledge upload** | `knowledge/upload/route.ts:81` | `getCurrentOrganisationContext()` **called** but inserts `user_id` only | Uploaded documents (org knowledge) | Organisation | **ACCESS-ONLY USER ANCHORING** |
| W8 | **knowledge url** | `knowledge/url/route.ts:88` | `getCurrentOrganisationContext()` **called** but inserts `user_id` only | Linked external content (org knowledge) | Organisation | **ACCESS-ONLY USER ANCHORING** |
| W9 | **research finding** | `research/route.ts:423` | `resolveOrganisationFromUser` → `ctx.organisationId` written as `organisation_id` | Research findings (org knowledge) | Organisation | **CONFORMING** |
| W10 | **organisational_knowledge** | — | — | — | Organisation | **GREY — ZERO WRITERS** |

---

## 3. Downstream Readers (what consumes each layer)

| Layer | Readers | Scoping | Notes |
| :--- | :--- | :--- | :--- |
| **kira_memory** | `recall.ts` (Mnemo + substring), `confirm.ts`, `genome/derive.ts`, `webhooks/recall_memory` | All **user-scoped** (`.eq('user_id', ...)`) | Genome render, recall tool, confirmation queue all key by user |
| **kira_knowledge** | `knowledge-ingest.ts` (chunking), `knowledge-search.ts`, `webhooks/search_knowledge` | Mixed: upload/url user-scoped; research org-scoped | RAG retrieval pipeline |
| **organisational_knowledge** | **ZERO READERS** | — | Canonical sink exists but no operational pipeline consumes it |

---

## 4. Organisation Resolution Trace — Per Writer

### W1 — save_memory (uid-tools.ts)
```
INPUT: ElevenLabs tool call with ?uid=<user_id>
        ↓
uidFrom(req) → raw user_id (baked at agent provision)
        ↓
NO org resolution (no getCurrentOrganisationContext())
        ↓
INSERT kira_memory { user_id: uid, kira_agent_id, NO organisation_id }
        ↓
DOWNSTREAM: recall.ts (user_id), confirm.ts (user_id), genome/derive (user_id)
```
**Defect:** Organisational facts written to user partition. Person → memory, not Person → Organisation → memory.

### W2 — post-call distil (convai.ts)
```
INPUT: ElevenLabs post-call webhook (conversation_id)
        ↓
conversations.user_id → userId
        ↓
NO org resolution (despite conversations having organisation_id column)
        ↓
completeConversationMemory() → INSERT kira_memory { user_id, ... }
        ↓
DOWNSTREAM: recall.ts (user_id), genome/derive (user_id)
```
**Defect:** Voice-distilled organisational knowledge written to user partition.

### W3 — applyProfileExtraction
```
INPUT: discovery.ts (voice) OR discovery/ingest route (API)
        ↓
meta.subjectId OR user.id → userId
        ↓
NO org resolution (userId passed through)
        ↓
INSERT kira_memory { user_id, ... } briefing for active agents
        ↓
DOWNSTREAM: recall.ts, genome/derive (user_id)
```
**Defect:** Client profile summary (organisational knowledge) written to user partition.

### W4 — agent create seed
```
INPUT: POST /api/kira/create
        ↓
getCurrentOrganisationContext() → ctx (has organisationId, personId)
        ↓
ctx.personId used as user_id for memory insert
        ↓
INSERT kira_memory { user_id: ctx.personId, NO organisation_id }
        ↓
DOWNSTREAM: recall.ts, genome/derive
```
**Defect:** Organisation context available at write boundary but **discarded**; seed memory anchored to person.

### W5 — confirm/deny fact
```
INPUT: POST /api/kira/webhooks/confirm_fact?uid=<user_id>&handle=X
        ↓
uid → user_id
        ↓
facts_to_confirm SELECT .eq('user_id', user_id)
        ↓
UPDATE kira_memory .eq('id', fact.id) (user-scoped upstream)
```
**Defect:** Knowledge governance operates on user-scoped facts.

### W6 — genome redact
```
INPUT: POST /api/genome/redact (authenticated user)
        ↓
getCurrentAppUser() (legacy) → user
        ↓
UPDATE kira_memory .eq('id', id).eq('user_id', user.id)
```
**Defect:** Legacy auth + user-scoped mutation of organisational knowledge.

### W7/W8 — knowledge upload/url
```
INPUT: POST /api/kira/knowledge/upload|url
        ↓
getCurrentOrganisationContext() → ctx (organisationId available)
        ↓
userId = ctx.personId
        ↓
INSERT kira_knowledge { user_id: userId, NO organisation_id }
        ↓
RAG ingest → kira_knowledge_chunks (user_id)
```
**Defect:** Org context available but discarded; document knowledge anchored to person.

### W9 — research finding (CONFORMING)
```
INPUT: POST /api/kira/research (HMAC-authenticated tool)
        ↓
resolveOrganisationFromUser() → ctx (organisationId)
        ↓
INSERT kira_knowledge { organisation_id: ctx.organisationId, created_by: 'kira', NO user_id }
        ↓
RAG ingest → kira_knowledge_chunks (organisation_id via knowledge_id)
```
**Correct:** Pure org-anchored; user identity only as provenance (not ownership).

---

## 5. Classification Matrix

| Classification | Writers | Meaning |
| :--- | :--- | :--- |
| **CONFORMING** | W9 (research) | Org-anchored, provenance preserved, no user ownership |
| **ACCESS-ONLY USER ANCHORING** | W4 (agent create), W7 (upload), W8 (url) | Org context **available at write boundary** but discarded; user_id used as ownership instead of provenance |
| **ORG-MEMORY VIOLATION** | W1 (save_memory), W2 (distil), W3 (apply-profile), W5 (confirm), W6 (redact) | **No org resolution at write**; user_id is the effective ownership key for organisational memory |
| **GREY — UNWIRED** | W10 (organisational_knowledge) | Canonical destination exists (schema, RLS, provenance columns) but **zero writers, zero readers** |

---

## 6. Canonical Invariant Cross-Reference

| INV | Status per trace | Finding |
| :--- | :--- | :--- |
| INV-009 (Memory/Instance separation) | **VIOLATED** | Live memory in `kira_memory` tied to user/agent, not org; survives neither person change nor instance replacement |
| INV-010 (Conversation/Knowledge separation) | **PARTIAL** | Conversations distinct from knowledge layer, but knowledge layer is user-anchored |
| INV-011 (Knowledge provenance) | **PARTIAL** | `kira_memory` has `source_conversation_id`, `superseded_by`; `organisational_knowledge` has full provenance but unused |
| INV-012 (Temporal knowledge) | **PARTIAL** | `kira_memory.superseded_by` exists; `organisational_knowledge` has `effective_from/to`, `is_current`, `epistemic_state` but unused |
| INV-020 (Organisational subject primacy) | **VIOLATED** | 8/9 writers anchor to person; only research anchors to org; canonical org_knowledge sink unwired |

---

## 7. Architectural Signal

The canonical model's **organisational_knowledge** table already exists with the correct schema:
- Pure `organisation_id` anchor (no user_id)
- Full provenance (`supplied_by`, `engagement_id`, `ownership_period_id`, `evidence_id`)
- Epistemic states (`asserted`, `observed`, `inferred`, `validated`, `disputed`, `superseded`, `historical`, `current`, `unknown`)
- Temporal validity (`effective_from`, `effective_to`, `is_current`)
- Supersession chain (`superseded_by`, `supersession_reason`)

**But it has zero application writers and zero readers.**

The implementation currently pumps organisational facts into `kira_memory` (user-anchored) and `kira_knowledge` (mixed), while the canonical destination sits empty.

---

## 8. Remediation Categories (NOT implementation plan — trace findings only)

| Writer | Semantic object | Canonical destination | Required action |
| :--- | :--- | :--- | :--- |
| W1 (save_memory) | Organisational fact | organisational_knowledge (or kira_memory + org_id) | RE-ANCHOR or REDIRECT |
| W2 (distil) | Distilled org knowledge | organisational_knowledge | REDIRECT |
| W3 (apply-profile) | Client profile summary | organisational_knowledge | REDIRECT |
| W4 (agent create) | Agent onboarding context | kira_memory + organisation_id | RE-ANCHOR |
| W5 (confirm) | Knowledge governance | organisational_knowledge (supersession) | REDIRECT + SPLIT |
| W6 (redact) | Owner-initiated mutation | organisational_knowledge (with actor provenance) | REDIRECT + SPLIT |
| W7 (upload) | Document knowledge | kira_knowledge + organisation_id | RE-ANCHOR |
| W8 (url) | Linked content | kira_knowledge + organisation_id | RE-ANCHOR |
| W9 (research) | Research finding | kira_knowledge + organisation_id | KEEP (already conforming) |
| W10 (org_knowledge) | Canonical knowledge | organisational_knowledge | **NEW PIPELINE** (promotion layer) |

---

## 9. Next Gate

**Phase 5A-B COMPLETE. FROZEN.**

The trace establishes that:
1. Three competing memory anchors exist (not one uniformly wrong model)
2. The canonical destination (`organisational_knowledge`) is structurally correct but operationally absent
3. 5 writers are genuine organisational-memory violations; 3 have org context but discard it
4. Only 1 writer (research) is fully conforming

**No code changes made.** This trace report is the basis for the controlled remediation design (Phase 5C).