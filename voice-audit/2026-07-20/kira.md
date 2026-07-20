# Voice placement map — Kira (kira)
**Audited:** 2026-07-20, live against `https://kira-rho.vercel.app` (prod) + repo scan.
Current: `@caistech/elevenlabs-convai` consumed? **yes** · canonical loop mounted? **yes** (`lib/kira/convai.ts`) · `@caistech/discovery-agent` (discovery)? **yes**.

## Placement map

| Surface / flow | Verdict | Function | Why | Integration shape |
|---|---|---|---|---|
| `/chat/[agentId]` — operational Kira | **Required** | **Coaching** | THE product value — the personalised voice thinking-partner | `@elevenlabs/react` `useConversation` + signed-URL connect; canonical memory loop via `/api/kira/webhooks/*` |
| `/discovery` — deep discovery | **Required** | Coaching | draws the operator's world out → Client Profile | `@caistech/discovery-agent` `DiscoveryWidget` + `/api/convai/webhooks/*` |
| `/start` — Setup Kira onboarding | **Required** | Guide/clarifier | voice-led intake that drafts the framework | `<elevenlabs-convai>` CDN embed (SETUP_KIRA agent) — migrate to hub `VoiceWidget` when it gains `dynamicVariables` (see `HANDOFF_RESPONSE.md`) |
| `/pubguard/scan` — PubGuard | Required (PubGuard vertical) | Coaching | voice security-scan | hub widget (post-shared-services migration) |
| `/dashboard`, `/settings`, landing, `/admin` | Not-needed | — | static/navigational; a label serves them | — |

**Recommended `voice_agent_status`: present.** Every Required surface has a voice agent rendered.

## Behavioural memory-loop check (the point of this audit) — VOICE_MEMORY_STANDARD rule 14

Verified server-side (a mic-driven live call can't run headlessly). Findings:

- **Persist leg — PASS.** Canonical tables hold real data: `conversations`=22, `conversation_messages`=418. (The branch's whole purpose — the old loop wrote phantom tables; this now persists to the real ones.)
- **Recall leg (welcome-back) — WAS BROKEN, NOW FIXED.** `get_conversation_context()` filtered `AND c.status = 'active'`, but finished conversations are `'completed'` → `has_history` was **always false** even with completed conversations full of messages (the storage≠memory trap). Fixed in `20260720600000_fix_welcome_back_recall.sql` (`status IN ('active','completed')`), applied to prod + verified live: `has_history: true`, greeting now references the prior conversation's topic. **PASS after fix.**
- **Distilled-memory leg (`kira_memory`) — UNPROVEN.** `kira_memory`=0 rows. The operational `kiraConvaiRoutes` has no `onConversationComplete` distil seam wired, so nothing distils to `kira_memory` post-call; the layer only fills if the agent calls `save_memory` mid-call. Welcome-back works off conversation history (above), so it's not blocking — but the richer "important facts" recall is not yet demonstrated. **Follow-up: wire an operational post-call distil (or confirm `save_memory` is exercised) and re-audit.**

## Security/plumbing (repo scan + live)
- HMAC/secret: post-call webhooks fail-closed on missing secret ✓; tool webhooks now require `KIRA_TOOL_WEBHOOK_SECRET` (verified 401 for unauthenticated) ✓.
- Identity server-derived (agent binding / signed token, never client `user_id`) ✓.
- Allowlist set on agents at provision ✓; workspace-bound webhook (not deprecated per-agent) ✓.

## Verdict
Voice **present** on every Required surface; the **welcome-back recall now fires** (was silently broken — the headline fix). Outstanding: the distilled-`kira_memory` leg is unproven (no post-call distil wired for operational agents) and the live mic-driven call + `/start` widget migration remain.
