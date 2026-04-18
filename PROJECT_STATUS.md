# Project Status — Kira

> Auto-maintained by Claude Code. Read at session start, updated before session end.
> Last updated: 2026-04-18T00:55:00Z

## Current State
<!-- One of: ACTIVE_DEVELOPMENT | MAINTENANCE | BLOCKED | PAUSED | SHIPPED -->
**Status**: ACTIVE_DEVELOPMENT

## What Was Just Done
<!-- Updated at end of each session. Most recent first. -->
- **2026-04-18 — ConvAI model migration across 4 repos.**
  ElevenLabs began rejecting `eleven_turbo_v2_5` on English agents
  ("English Agents must use turbo or flash v2"). Swapped to
  `eleven_flash_v2` in F2K, Kira, Connexions, and caistech/cais-shared-services
  (v0.1.3 tagged and published). Kira: 6 call sites in commit `4a5e7cb`
  plus 7th site `/api/kira/create` aligned in `990c40e`. Smoke-tested
  end-to-end against real ElevenLabs API via `scripts/smoke-convai.mjs`
  (commit `0df393a`) — PASS.
- **2026-04-18 — Platform Trust middleware landed.** Commit `d7736e6`
  adds security gate middleware and `.env.example`. Rebased onto
  upstream main before push.
- **2026-04-18 — Project guardrails committed.** `CLAUDE.md` added
  (commit `5941ed5`) with Kira-specific rules on Supabase client
  boundaries, webhook secret handling, and PubGuard pipeline layout.

## What's Next
<!-- Prioritised list of pending work. Updated each session. -->
- [ ] Migrate all 7 ElevenLabs agent-creation call sites to import
      from `@caistech/elevenlabs-convai` shared package, which handles
      language-aware model selection automatically (removes the
      hardcoded `eleven_flash_v2` scattered across files).
- [ ] Replace in-memory `conversationState` Map in
      `app/api/pubguard/webhook/route.ts` with Supabase-backed
      store — not multi-instance safe on Vercel.
- [ ] Same for session state in `app/api/kira/setup-tools/route.ts`.
- [ ] Add unit tests — no automated tests exist. Start with PubGuard
      scoring functions (per CLAUDE.md convention: any PubGuard
      analyzer/scoring change needs at least one test).
- [ ] Delete or retire `app/api/pubguard/v2/supabase-migration.sql`
      (superseded; RLS commented out — dangerous if run).

## Blockers
<!-- Anything preventing progress. Include who/what is needed to unblock. -->
- (none)

## Key Decisions Made
<!-- Important architectural or product decisions, with rationale. -->
- **Model choice: `eleven_flash_v2` over `eleven_turbo_v2`.** Both are
  allowed for English agents per ElevenLabs error message. Picked
  `eleven_flash_v2` for 75ms latency and explicit conversational-AI
  optimization. `eleven_turbo_v2_5` remains available behind
  `voiceModel` override for future multilingual agents.
- **Smoke test shape: direct ElevenLabs call, not via `/api/kira/create`.**
  The API route uses its own hardcoded config; smoking the route
  doesn't verify the fix applied to the 6 other call sites. Script
  sends the exact payload shape from `lib/elevenlabs/createConvaiAgent.ts`.

## Active Branches
<!-- Git branches with in-progress work. -->
- `main` — clean, all commits pushed

## Environment Notes
<!-- Deployment URLs, env vars needed, external service dependencies. -->
- Vercel production: `kira-rho.vercel.app` (fallback in
  `app/api/kira/create/route.ts`; override via `NEXT_PUBLIC_APP_URL`)
- Supabase: project ID in `.env.local` (not committed)
- Required env vars documented in `.env.example` (commit `d7736e6`)
- ElevenLabs smoke-test artifact: any agent named `SMOKE_DELETE_ME_*`
  in the dashboard is safe to delete.

## Session Log
<!-- One line per Claude Code session. Auto-appended. -->
| Date | Duration | Summary |
|------|----------|---------|
| 2026-04-18 | ~1h | ConvAI model migration verified end-to-end; 7 call sites on `eleven_flash_v2`; smoke test + CLAUDE.md + PROJECT_STATUS.md committed |
