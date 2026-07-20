# HANDOFF RESPONSE — voice consolidation: what landed, what's blocked upstream

**Date:** 2026-07-20 · **From:** Kira session (branch `fix/voice-memory-canonical-adoption`)
**Re:** `HANDOFF.md` (easy-claude-code / cais-shared-services voice-provisioning standardisation)

## What I did (safe subset — zero regression)

1. **Added `voice.config.ts`** (PRODUCT_STANDARDS §6). Kira runs *multiple* fixed agents plus
   per-user operational agents, so it's a small **map** (`voiceAgents.setupKira`, `.pubguard`)
   reading the current `NEXT_PUBLIC_*` ids in one place, not the template's single-agent shape.
   Per-user operational agent ids stay dynamic (resolved from `kira_agents` at runtime).
2. **Retired the dead CDN-embed fork.** Deleted `lib/kira/VoiceAgent.tsx` (raw
   `<elevenlabs-convai>` embed) and its only consumer `app/pubguard/scan/client.tsx`
   (`PubGuardScanClient` — imported nowhere, dead code), and stripped the `VoiceAgent`/
   `VoiceButton` re-exports from `lib/kira/index.ts`. `tsc --noEmit` clean.
3. `app/discovery` already consumes the canonical `DiscoveryWidget` — no change.

## What's BLOCKED (the handoff can't complete as written) — hub `VoiceWidget@0.4.9` capability gaps

The handoff says "swap the live surfaces to the hub `VoiceWidget`." But every *live* Kira voice
surface uses an ElevenLabs feature the hub widget@0.4.9 does **not** expose to the consumer:

| Surface | Needs | Widget @0.4.9 | Status |
|---|---|---|---|
| `app/start/page.tsx` (Setup Kira onboarding) | arbitrary **`dynamicVariables`** (`journey_type`) | only auto-injects `user_id` | **blocked** — migrating drops journey tailoring |
| `app/chat/[agentId]/page.tsx` (core coaching call) | **`signedUrl`** connect + bespoke full-page UX (pause/resume, transcript, modals) | agentId-only connect; floating-panel UX | **blocked** — would downgrade signed-URL→public-agentId and rewrite the UX |
| `app/pubguard/scan` `KiraVoiceWidget` | `clientTools` + first-message override | both supported | **deferred** — functionally migratable, but replaces PubGuard's bespoke user-type-themed panel; separate vertical, out of scope for this voice-memory branch |

**Asks of the hub `VoiceWidget` (cais-shared-services) so the live surfaces can migrate:**
1. **Expose a consumer `dynamicVariables?: Record<string,string>` prop** (today it only sets
   `user_id` internally). Unblocks `/start` (journey_type) and any dynamic-variable agent.
2. **Support `signedUrl` connect** (a `signedUrl?` prop, or a `getSignedUrl` async hook) so a
   surface can use the more-controlled signed-URL flow instead of a public agent id. Unblocks
   the chat coaching surface without a UX rewrite.
3. Until both land, `/start` and `/chat` stay on their current working code as **principled
   divergences** (documented here), not forks-to-retire.

## SECURITY flag-back to `@caistech/elevenlabs-convai` (found in Kira's pre-merge review)

Two findings in the package's webhook handlers (`dist/.../routes.js`), not in Kira's wiring:

1. **[P1] Tool webhooks have no auth.** The conversation/memory tool routes
   (`start_conversation`, `save_message`, `recall_memory`, `save_memory`, `update_topic`) verify
   **no** signature/secret — only `postCall` does. `resolveSession` grants identity from the
   body's **public** `elevenlabs_agent_id`. An unauthenticated caller can POST `start_conversation`
   with a victim's agent id, then `recall_memory` (reads the victim's memory) / `save_memory`
   (poisons it). **Fix at the package:** require a shared-secret header (ElevenLabs server-tool
   auth) on the tool routes, fail-closed, same as the post-call HMAC gate.
2. **[P1] Post-call HMAC fails OPEN when the secret is unset.** `routes.js` guards with
   `if (postCallSecret) { ...verify... }` — so an unset `ELEVENLABS_WEBHOOK_SECRET` /
   `DISCOVERY_POSTCALL_SECRET` skips verification and accepts forged transcripts. **Fix:** throw
   at route build if the post-call secret is missing (fail-closed), matching
   `mintAnonSessionToken`'s own `if (!secret) throw`.

(Kira can add a local guard for #2 today — throw-if-missing at its wiring — but the durable fix
is in the package so every consumer benefits. #1 has no clean Kira-side mitigation.)

## Shared-services ask to `@caistech/corporate-components` — AuthForm "confirmation-required" state

Not a Kira bug — a **portfolio-wide gap** surfaced while fixing Kira's email-link account-takeover.

The clean fix for that takeover is to require a CONFIRMED email before a signup can adopt an
existing app-user row, i.e. run with `mailer_autoconfirm: OFF`. But turning autoconfirm off breaks
login on every product whose signup UX has no post-signup **"check your email to confirm"** state:
the user signs up, isn't logged in, and hits "Email not confirmed" with no guidance (documented
Kira gotcha; it's why autoconfirm is pinned ON here today).

Since §8.5 dual-auth is mandated portfolio-wide and autoconfirm-OFF is the safer default (real
email verification), the canonical `AuthForm` should handle this natively:
1. **Post-signup "confirmation pending" state** — after `signUp`, if no session is returned, render a
   "we've emailed you a confirmation link" panel + a resend action, instead of attempting login.
2. **Confirm-callback handling** — the `?token_hash=&type=signup` verifyOtp path lands a session
   (the canonical `/auth/callback` already does `verifyOtp` — confirm it covers `type=signup`).
3. **"Email not confirmed" login error** — map it to the same "check your email / resend" affordance
   rather than a bare error.

**Extraction trigger:** if any second repo has already hand-rolled a confirmation-pending screen,
that's the 2nd-occurrence signal to build this into `AuthForm` now. Without it, every product that
tries autoconfirm-off re-discovers this gotcha.

## Not touched (Kira-side server bugs from the same review — Kira will fix, not shared-services)

Discovery distill silently dropping Client Profiles (schema `.min(1)` throwing on empty LLM
output + `processed_at` claimed before distill), `reprovision-kira-agents.mjs` clobbering the
discovery agent, `auth.users` delete-cascade defeated, unverified-email account linking under
autoconfirm. These are Kira-local and queued behind this.
