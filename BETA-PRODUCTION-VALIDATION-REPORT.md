# BETA-PRODUCTION-VALIDATION-REPORT

**Date:** 2026-08-25
**Supabase JWT API-key migration (V1 legacy → V2 new key model) — Beta launch readiness**

---

## 1. Exact Preview deployment tested

| Field | Value |
|---|---|
| URL | `https://kira-ajcoep9x5-corporate-ai-solutions.vercel.app` |
| Deployment ID | `dpl_CQK5LBZdmct4wgogXKqBc67z3c5V` |
| Target | `preview` (inspect-verified) |
| Status | ● Ready |
| Commit base | `f63dfa9` + working-tree V2 migration |
| Deploy method | `npx vercel deploy --scope=corporate-ai-solutions --target=preview` |

Production remains pinned to `kira-enurqnnvr` (`dpl_DrqrK4sPjiNSvzd7osD7mBFVNnFj`). No Production deployment occurred during validation.

---

## 2. Credential proof (no values exposed)

| Proof | Method | Result |
|---|---|---|
| Server paths use `SUPABASE_SECRET_KEY` | Static audit of all critical-path files + factory definition (`createServiceClientV2`, lib/supabase/server.ts:19) | ✅ PASS |
| Browser paths use `SUPABASE_PUBLISHABLE_KEY` | Static audit (`createClientV2`, lib/supabase/browser.ts:15) + live signup/sign-in via publishable key | ✅ PASS |
| Session paths use V2 client | Static audit (`createSessionClientV2`, lib/supabase/server-session.ts:40) + live `/auth/callback` execution (307 designed redirect) | ✅ PASS |
| No critical-path reads of legacy creds | Grep audit: `SUPABASE_SECRET_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` appear only in a comment (fixed), a `.example` file, and the Batch-2 legacy factories themselves | ✅ PASS |
| V2 privileged ops retain RLS bypass | Live admin API calls via secret key (user list, email-confirm); live REST read of `kira_logs`; all service-role-equivalent operations succeeded | ✅ PASS |
| Browser auth/session behaviour works | Live signup → email-confirm (admin) → password sign-in returned session; ssr cookie accepted by Preview server routes (authenticated journey ran) | ✅ PASS |

Live credential exercises performed against the production Supabase project with the V2 keys:
signup ✅ · password sign-in ✅ · admin confirm ✅ · REST select ✅ · every authenticated Preview route ✅.

---

## 3. Unauthenticated smoke results (Preview)

All requests carried the automation protection-bypass header only (Vercel Deployment Protection was enabled; earlier unprotected results were the challenge page and were discarded).

| Surface | Result | Notes |
|---|---|---|
| `/` | 200 | Correct dpl marker, Kira landing renders |
| `/start` | 200 | Sign-in gate page renders |
| `/login` | 200 | Renders |
| `/signup` | 200 | Renders |
| `/unsubscribe` | 200 | Healthy after preview-only `UNSUBSCRIBE_SECRET` config fix (env issue, not code) |
| `GET /auth/callback` (no params) | 307 → `/login?error=auth_callback` | Designed failure path; proves `createSessionClientV2` executes server-side without env crash |
| `GET /api/kira/agent` | 400 `agentId is required` | Route logic reachable through V2 client |
| `GET /api/kira/chat/history` (no session) | 200 `{"messages":[]}` | Designed degrade (route.ts:38) |
| `GET /api/kira/chat/start` | 405 | POST-only, expected |

---

## 4. Complete authenticated journey (continuous transaction, one brand-new user)

Smoke user created through the real signup path, then email-confirmed via admin API to obtain a session.

| # | Step | Route | Client class | HTTP | Succeeded | Unexpected auth/credential error |
|---|------|-------|--------------|------|-----------|-------------------------------|
| 1 | Draft create | `POST /api/kira/draft/create` | **LEGACY — known Batch 2 dependency — expected temporary mixed architecture** | 200 | ✅ `draftId=1ea7db36…` | None |
| 2 | Agent creation | `POST /api/kira/create` | **V2** | 500 → **200 on retry** | ✅ `agent_6601m0va…` | None (failure was ElevenLabs vendor-side, see §6) |
| 3 | First text conversation | `POST /api/kira/chat/text` | **V2** | 200 | ✅ Coherent reply referencing the draft objective; `conversationId` issued | None |
| 4 | History persistence | `GET /api/kira/chat/history` | **V2** | 200 | ✅ Both turns returned oldest-first | None |
| 5 | Knowledge URL ingestion | `POST /api/kira/knowledge/url` | **V2** | 200 | ✅ ElevenLabs doc `1NU5xNxL…` attached | None |
| 6 | Voice start | `POST /api/kira/chat/start` | **V2** | 200 | ✅ Signed ConvAI WebSocket URL issued | None |

**Critical success criterion: MET.** A brand-new beta user can go signup → draft → Kira creation → first conversation → knowledge → voice on the current mixed V1/V2 Production candidate. The remaining legacy consumers do not prevent beta launch.

Telemetry/webhook routes (`voice/telemetry`, `webhooks/resend`) are statically proven V2 and execute at runtime wiring level; end-to-end vendor-signed webhook replay was not exercised in this pass (requires genuine ElevenLabs/Resend payloads).

---

## 5. Failures and severity

| Failure | Severity | Classification | Resolution |
|---|---|---|---|
| `ElevenLabs create failed: 500` on first agent-creation attempt | **Medium, transient, external** | Vendor crash (`{"status":"internal_server_error"}` per kira_logs); NOT Supabase/V2 — all prior pipeline steps logged success | Isolation proved key valid (creator tier, quota fine), endpoint healthy, payload shape accepted (4 incremental local tests incl. large prompt all OK); retry succeeded and route's idempotent existing-agent path recovered cleanly |
| Vercel build failure `/unsubscribe` | Low | Missing Preview env var (`UNSUBSCRIBE_SECRET`) — configuration, not code | Fixed by adding the var to Preview scope only (encrypted) |
| Accidental Production deploy earlier this session | Incident (closed) | CLI `--prod=false` mis-targeted production | Rolled back to `kira-enurqnnvr`; safe deploy method re-established |

## 6. Regression checks

- Full suite: **1,627 passed / 1 failed / 7 skipped** — identical to pre-migration baseline (only known text-tools + middleware failures)
- TypeScript: 14 errors confined to pre-existing untouched files (`lib/voice-agent-checks.ts`, `scripts/send-beta-invite.ts`, stale `.next` validator artifact) — none in migrated code
- Production build: passes locally; Preview build passes after env fix
- `/unsubscribe`: healthy on Preview

---

## 7. Remaining Batch 2 legacy consumers (~14 files, still on legacy JWT — active by design)

`app/unsubscribe/route.ts` · `app/api/stripe/webhook/route.ts` · `app/api/kira/draft/create/route.ts` · `app/api/kira/start/route.ts` · `app/api/kira/webhooks/save-framework-draft/route.ts` · `app/api/kira/webhooks/create_operational_kira/route.ts` · `app/api/admin/exec/route.ts` · `lib/billing/index.ts` · `lib/billing/arrears.ts` · `lib/introducer/index.ts` · `lib/kill-switch.ts` · `lib/kira/{confirm,capability-sweep,discovery,entity-sweep,area-agenda}.ts` · `lib/kira/swarm/*`

These functioned during the journey where exercised (draft create) and remain covered by the still-active legacy JWT.

## 8. Security caveat

**The exposed legacy JWT remains active** in Production/Preview/local scopes and is still read by the Batch 2 factories above. This is an accepted temporary mixed-architecture state. Beta can launch under it; rotation/removal must follow the runbook after Batch 2 completes.

## 9. Cleanup notes (non-blocking)

- Smoke artifacts: throwaway user `preview-smoke-*` (confirmed), one draft, one agent row, one ElevenLabs agent (`agent_6601m0va…`, recommend deletion to keep workspace headroom), one ElevenLabs knowledge doc
- Vercel: automation protection-bypass secret generated (stored locally, not committed); consider rotating after validation window
- `UNSUBSCRIBE_SECRET` exists in Preview scope now; Production already had it

## 10. Proposed Production deployment procedure

```powershell
# 1. Pre-flight: confirm working tree = validated tree; baseline tests green
# 2. Ensure Production scope has SUPABASE_SECRET_KEY + SUPABASE_PUBLISHABLE_KEY (already present per Phase 0)
# 3. Deploy
npx vercel deploy --token=$vtok --scope=corporate-ai-solutions --target=production
# 4. Inspect gate
npx vercel inspect <url> --scope=corporate-ai-solutions   # expect target=production
# 5. Smoke: / , /login , /auth/callback redirect, /unsubscribe, authenticated chat turn
# 6. Watch vercel logs for [supabase] env errors for 15 min
```

Rollback: `vercel rollback kira-enurqnnvr-corporate-ai-solutions.vercel.app --scope=corporate-ai-solutions`

## 11. Recommendation

# GO ✅

For Production deployment of the V2 critical-path migration. All credential gates pass, the full beta journey succeeds as one continuous transaction on the exact candidate build, regressions are at baseline, and the sole journey failure was a transient ElevenLabs vendor crash from which Kira recovered idempotently. Legacy JWT stays active and unrotated; Batch 2 migration proceeds post-launch per runbook.
