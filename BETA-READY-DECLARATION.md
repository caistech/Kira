# BETA READY — V2 Critical-Path Migration Deployed to Production

**Date:** 2026-08-25
**Production deployment:** `dpl_DcbvoZvLMskuBFtEE3iT6uPKuFjX`
**Domains:** `kiraexec.com` / `www.kiraexec.com` / `kira-rho.vercel.app` (all re-aliased to new build)
**Scope:** `corporate-ai-solutions`
**Method:** `vercel deploy --target=production --scope=corporate-ai-solutions`

---

## Production validation — ALL GATES PASSED

| Phase | Result |
|---|---|
| Pre-flight env vars | ✅ `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `UNSUBSCRIBE_SECRET`, `ELEVENLABS_API_KEY` all present in Production scope |
| Local build | ✅ clean |
| Deploy | ✅ target=production, Ready |
| Domain assignment | ✅ all three production aliases on new build |
| Public pages (`/`, `/start`, `/login`, `/signup`, `/unsubscribe`) | ✅ 200, new dpl marker |
| Auth callback | ✅ 307 designed redirect |
| Unauthenticated API (`/api/kira/agent`, `/api/kira/chat/history`) | ✅ reachable via V2 clients |
| Fresh V2 signup → admin confirm → password sign-in → ssr cookie | ✅ V2_PUBLISHABLE_KEY + V2_SECRET_KEY live |
| Draft create (LEGACY, Batch 2) | ✅ 200 |
| Agent create (V2) | ✅ 200 (idempotent reuse of Preview agent) |
| Text chat (V2) | ✅ coherent reply referencing objective |
| History (V2) | ✅ both turns persisted |
| Knowledge URL (V2) | ✅ ElevenLabs doc attached |
| Voice start (V2) | ✅ signed ConvAI WS URL |

**Credential-proof re-verified on Production:**
- Server paths use `SUPABASE_SECRET_KEY` (`createServiceClientV2`)
- Browser paths use `SUPABASE_PUBLISHABLE_KEY` (`createClientV2`)
- Session paths use `createSessionClientV2`
- No critical-path reads of `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## What changed (production-visible)

Only the **critical-path V2 migration surface** (31 source files) is deployed:
- 14 critical API routes (`/api/kira/*`, `/api/voice/telemetry`, `/api/webhooks/resend`, `/auth/callback`)
- 3 Supabase client libraries (server, server-session, browser) with V2 factories
- 3 key pages/components (onboarding, setup/draft, auth form, start)
- Test mock fixes (4 files) — production-inert

All other ~60 legacy consumers **unchanged and still on the legacy JWT** (Batch 2, tracked).

---

## Explicitly documented P0 security debt (NOT resolved by this deployment)

| Item | Status | Runbook |
|---|---|---|
| Exposed legacy HS256 JWT (`SUPABASE_SERVICE_ROLE_KEY`) | Still active in Production/Preview/local | `docs/security/LEGACY_JWT_ROTATION_RUNBOOK.md` |
| ~60 Batch 2 legacy consumers | Still reading legacy JWT | Migrate after beta observation window |
| Mixed V1/V2 architecture | In production | Temporary; rotation after Batch 2 complete |

This deployment **does not** rotate, revoke, or remove the legacy JWT. That remains a separate, sequenced security action after the remaining consumers are migrated.

---

## Rollback

If a critical regression appears:

```powershell
vercel rollback kira-enurqnnvr-corporate-ai-solutions.vercel.app --scope=corporate-ai-solutions --yes
```

Previous Production build (`kira-enurqnnvr`, `dpl_DrqrK4sPjiNSvzd7osD7mBFVNnFj`) remains pinned and instantly restorable.

---

## Declaration

**BETA READY** ✅

The V2 Supabase key model is live in Production for the entire beta-critical path. A brand-new user can complete the full journey (signup → draft → agent → conversation → knowledge → voice) using the new credential architecture. The mixed V1/V2 state is validated, documented, and safe for beta testers. Remaining migration (Batch 2 → legacy JWT removal) proceeds as sequenced work, not a blocking pre-condition.