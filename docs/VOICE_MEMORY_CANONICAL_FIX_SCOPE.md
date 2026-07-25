# Voice Memory — Canonical Fix Scope

**Goal:** Fix the memory-persistence failure **once, in the canonical layer**, so every voice product
in the portfolio inherits it — not a Kira-only patch.
**Owner:** Dennis McMahon · **Status:** scoped, not built · **Last updated:** 2026-07-20

Companion to the diagnosis (this session) and `OWNER_OPERATOR_AI_EA_MODEL.md`. Governed by
`cais-shared-services/VOICE_MEMORY_STANDARD.md` + `DATA_STANDARD.md`.

---

## 0. The principle

Do **not** patch Kira's bespoke loop. **Replace it with the portfolio-canonical loop** so the fix
propagates to all voice products. The canonical layer already exists:

- **`@caistech/elevenlabs-convai`** — the shared voice stack: `handleStartConversation` (recall),
  `handlePostCallWebhook` + `distillConversationToMemory` (distil/persist), `handleSaveMemory` /
  `handleRecallMemory`, server-derived identity, HMAC verify, React `VoiceWidget`.
- **`VOICE_MEMORY_STANDARD.md`** — the rubric `/voice-auditor` enforces.
- **Mnemo** — the memory backend (`DATA_STANDARD.md` §6 names voice-agent memory as Mnemo target #2).

This fix is therefore also **the first real build of the Mnemo integration** — it feeds directly into
the partner thesis in `OWNER_OPERATOR_AI_EA_MODEL.md` §5B.

---

## 1. Root causes being fixed (evidenced this session)

| # | Failure | Evidence |
|---|---|---|
| RC1 | **No memory tools on any agent** | every agent has `tool_ids: []` / `tools: []`; prompt says to call `save_memory` but it doesn't exist → **0 tool calls across all 25 conversations** |
| RC2 | **No post-call distillation** | post-call webhook only dumps raw transcript; nothing distils into `kira_memory` (storage ≠ memory) |
| RC3 | **Table schism / orphan tables** | webhook writes `kira_conversations`/`kira_messages`/`kira_logs` (in **no migration**); recall path reads canonical `conversations` + `get_conversation_context` (**0 rows**) |
| RC4 | **Agent-level post-call webhook empty** | new agent `platform_settings.webhooks: {}` → its transcripts never arrive |
| RC5 | **`kira_memory` empty portfolio-wide** | 0 rows, every user, ever → recall always cold |

Net: all three loop legs (recall / capture / distil) are non-functional. Only carry-over is the
one-sentence `save-framework-draft` objective baked into the agent prompt at creation.

---

## 2. The canonical Kira memory model (single source → all agents inherit)

### Step 1 — Attach the memory tools to every agent  *(root blocker; do first)*
- `lib/supabase/client.ts::createKiraTools` results must be written to each agent's `tool_ids`.
- Make provisioning **idempotent** and **back-fill existing agents** (`scripts/provision-existing-agents.mjs`):
  create-or-reuse the two tools, then PATCH every `kira_agents` row's ElevenLabs agent to include the
  tool ids.
- **Acceptance:** every agent's `tool_ids` is non-empty; a live call shows a `recall_memory` /
  `save_memory` tool call in the ElevenLabs transcript.

### Step 2 — Wire all three loop legs through the shared package
Replace the four competing hand-rolled paths (`/api/kira/tools`, `/api/webhooks/elevenlabs-router`,
`/api/kira/webhook`, `/api/kira/webhooks/*`) with the `@caistech/elevenlabs-convai` loop:
- **Recall on connect** — `handleStartConversation` → semantic recall (Mnemo), identity
  **server-derived at connect** (`conversation_id`), never a client-passed `user_id`.
- **Capture-as-you-go** — the in-call save tool (works once Step 1 lands).
- **Post-call distillation** — `handlePostCallWebhook` → `distillConversationToMemory` → persist.
  **This is the safety net** that persists even when the agent never calls save mid-call (fixes RC2).
- **Acceptance:** the loop runs end-to-end recall→distil→persist→recall; observable in logs.

### Step 3 — Kill the table schism (RC3)
- One canonical family: `conversations` / `conversation_messages` / `kira_memory` +
  `get_conversation_context`.
- **Delete** the writes to `kira_conversations` / `kira_messages` / `kira_logs`; migrate any needed
  columns onto the canonical tables via an idempotent migration (RLS on).
- **Acceptance:** no route references a non-migration table; recall reads what the webhook wrote.

### Step 4 — Bind + verify the post-call webhook on every agent (RC4)
- Set the agent-level (or workspace) post-call webhook on **every** agent; **HMAC-verify** every
  inbound webhook (secret captured at creation, stored sensitive, unverified → 401).
- **Acceptance:** a completed call produces a verified webhook hit and a persisted memory row.

### Step 5 — Back it with Mnemo per the Data Standard
- **Mnemo (D3):** distilled, non-PII conclusions + continuity ("this user prefers X", "resolved Y").
- **Structured (D1):** authoritative facts stay in tables — never Mnemo'd.
- **Degrade-don't-fake** on recall failure; persist idempotent; TTL + delete-cascade + a user memory
  surface.
- **Acceptance:** a second session recalls the first via semantic search with zero keyword overlap.

---

## 3. Propagation — the "all products get the update" part

Because the fix lands in `@caistech/elevenlabs-convai`, every voice product inherits it. Per the
**shared-change propagation rule ("no orphaned consumers")**, this is **not done** until:

- [ ] `@caistech/elevenlabs-convai` bumped; the loop is the package default.
- [ ] `SHARED_SERVICES.md` + `VOICE_MEMORY_STANDARD.md` updated in the same change.
- [ ] Each consuming repo reconciled (code + UI + Supabase tables) — Singify, Connexions,
      discovery-agent, etc.
- [ ] Kira migrated onto the package loop (its bespoke routes deleted, not left dormant).
- [ ] `/voice-auditor` **behavioural** pass per repo: the "welcome-back" recall actually fires and is
      observable (presence-only is not sufficient).

---

## 4. Verification

- **Regression re-run:** the exact owner-operator flow — setup surface → new agent call #1 →
  reconnect → **assert call #2 recalls call #1** (the failure that started this).
- **Unit test** the distiller (transcript → memory rows) — required by this repo's CLAUDE.md
  no-untested-scorer rule.
- **Live DB check:** `kira_memory` gains rows after a completed call (currently 0 portfolio-wide).

---

## 5. Sequencing

1. **Step 1 + Step 2** (tools + loop) — nothing persists without these; smallest path to a working loop.
2. **Step 3 + Step 4** (tables + webhook binding) — makes it correct and reliable.
3. **Step 5 + §3 propagation** — makes it the portfolio standard on Mnemo.

Suggested kickoff: `/spec` to turn this into an executable spec, or `/plan-eng-review` to
pressure-test the shared-package architecture first (it touches multiple repos).
