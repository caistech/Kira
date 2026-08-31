# API Key Model Migration — Live Inventory

**Status:** Phase 1 Authorised — Batch 1 in progress  
**Target:** Zero active dependencies on `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`  
**Current Phase:** Batch 1 — Production Server Consumers  
**Validation Target:** Preview only (Production frozen)

---

## Migration Legend

| Symbol | Meaning |
|--------|---------|
| 🟢 | Migrated + Verified on Preview |
| 🟡 | Migrated — Pending Verification |
| 🔴 | Not Yet Migrated |
| ⚪ | Legacy (intentionally kept as fallback) |
| 📝 | Documentation Only |

---

## Batch 1 — Production Server Consumers (Privileged / Service-Role)

### lib/supabase/server.ts consumers — API Routes

| # | File | Type | Current Import | Target | Status | Notes |
|---|------|------|----------------|--------|--------|-------|
| 1 | `app/api/kira/agent/route.ts` | Server Route | `createServiceClientV2` | `createServiceClientV2` | 🟢 | Phase 0 — Done |
| 2 | `app/api/kira/agent/complete/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 3 | `app/api/kira/chat/start/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 4 | `app/api/kira/chat/text/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 5 | `app/api/kira/chat/history/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 6 | `app/api/kira/ask/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 7 | `app/api/kira/conversation/context/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 8 | `app/api/kira/create/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 9 | `app/api/kira/draft/create/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 10 | `app/api/kira/email/send-kira-ready/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 11 | `app/api/kira/webhooks/save-framework-draft/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 12 | `app/api/kira/webhooks/task-events/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 13 | `app/api/kira/knowledge/[id]/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 14 | `app/api/kira/knowledge/upload/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 15 | `app/api/kira/knowledge/url/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 16 | `app/api/kira/research/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 17 | `app/api/kira/discovery/ingest/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 18 | `app/api/valuation/mine/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 19 | `app/api/valuation/claim/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 20 | `app/api/valuation/match-industry/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 21 | `app/api/beta/redeem/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 22 | `app/api/genome/manual/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 23 | `app/api/genome/export/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 24 | `app/api/genome/share/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 25 | `app/api/genome/redact/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 26 | `app/api/loi/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 27 | `app/api/refer/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 28 | `app/api/advisors/enquiry/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 29 | `app/api/billing/cancel/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 30 | `app/api/voice/telemetry/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 31 | `app/api/webhooks/resend/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 32 | `app/api/onboarding/complete/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 33 | `app/unsubscribe/route.ts` | Server Route | `createServiceClient` | `createServiceClientV2` | 🔴 | |

### Cron Routes (Server-Side Privileged)

| # | File | Type | Current Import | Target | Status | Notes |
|---|------|------|----------------|--------|--------|-------|
| 34 | `app/api/cron/reconcile-tasks/route.ts` | Cron | `createServiceClient` | `createServiceClientV2` | 🔴 | High-frequency (20 min) |
| 35 | `app/api/cron/memory-integrity/route.ts` | Cron | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 36 | `app/api/cron/reminders/route.ts` | Cron | `createServiceClient` | `createServiceClientV2` | 🔴 | (check if exists) |
| 37 | `app/api/cron/genome-classify/route.ts` | Cron | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 38 | `app/api/cron/red-team-drift/route.ts` | Cron | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 39 | `app/api/cron/trial-ending/route.ts` | Cron | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 40 | `app/api/cron/reengagement-emails/route.ts` | Cron | `createServiceClient` | `createServiceClientV2` | 🔴 | |

### Lib Modules — Server-Side Privileged Consumers

| # | File | Type | Current Import | Target | Status | Notes |
|---|------|------|----------------|--------|--------|-------|
| 41 | `lib/auth.ts` | Auth Library | `createServiceClient`, `createSessionClient` | `createServiceClientV2` / `createSessionClientV2` | 🔴 | `getCurrentAppUser`, `isCurrentUserAdmin` |
| 42 | `lib/billing/index.ts` | Billing | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 43 | `lib/billing/arrears.ts` | Billing | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 44 | `lib/valuation/snapshots.ts` | Valuation | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 45 | `lib/valuation/recompute-readiness.ts` | Valuation | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 46 | `lib/kill-switch.ts` | Feature Flag | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 47 | `lib/admin/exec.ts` | Admin | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 48 | `lib/admin/exec-reprovision.ts` | Admin | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 49 | `lib/kira/convai.ts` | ConvAI | `createServiceClient` | `createServiceClientV2` | 🔴 | Core voice webhook factory |
| 50 | `lib/kira/area-agenda.ts` | Genome | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 51 | `lib/kira/capability-sweep.ts` | Genome | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 52 | `lib/kira/entity-sweep.ts` | Genome | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 53 | `lib/kira/knowledge-tool.ts` | Knowledge | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 54 | `lib/kira/knowledge-search.ts` | Knowledge | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 55 | `lib/kira/knowledge-ingest.ts` | Knowledge | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 56 | `lib/kira/uid-tools.ts` | Utils | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 57 | `lib/kira/confirm.ts` | Genome | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 58 | `lib/kira/recall.ts` | Memory | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 59 | `lib/kira/discovery.ts` | Discovery | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 60 | `lib/kira/refusal.ts` | Safety | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 61 | `lib/kira/refusal-sweep.ts` | Safety | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 62 | `lib/kira/document.ts` | Document | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 63 | `lib/kira/swarm/drafts.ts` | Swarm | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 64 | `lib/kira/swarm/orchestrator-adapter.ts` | Swarm | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 65 | `lib/kira/swarm/stub.ts` | Swarm | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 66 | `lib/kira/swarm/tool-handlers.ts` | Swarm | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 67 | `lib/kira/swarm/open-tasks.ts` | Swarm | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 68 | `lib/introducer/index.ts` | Introducer | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 69 | `lib/introducer/introducer.integration.test.ts` | Test | `createClient` (direct) | N/A | 🔴 | Test file |
| 70 | `lib/billing/billing.integration.test.ts` | Test | `createClient` (direct) | N/A | 🔴 | Test file |
| 71 | `lib/pubguard/supabase.ts` | PubGuard | `createClient` (direct, `supabaseKey`) | `createServiceClientV2` | 🔴 | Has anon fallback |
| 72 | `lib/voice-agent-checks.ts` | Voice QA | `createClient` (direct, SRK) | `createServiceClientV2` | 🔴 | |
| 73 | `lib/genome/derive.ts` | Genome | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 74 | `lib/genome/dedupe-sweep-apply.ts` | Genome | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 75 | `lib/genome/file-manual.ts` | Genome | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 76 | `lib/genome/access-log.ts` | Genome | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 77 | `lib/business-identity/store.ts` | Business ID | `createSessionClient` | `createSessionClientV2` | 🔴 | Requires RLS migration first |

### App Actions (Server Components / Server Actions)

| # | File | Type | Current Import | Target | Status | Notes |
|---|------|------|----------------|--------|--------|-------|
| 78 | `app/settings/actions.ts` | Action | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 79 | `app/my-genome/[area]/actions.ts` | Action | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 80 | `app/admin/(panel)/introducers/actions.ts` | Action | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 81 | `app/introducer/expired/actions.ts` | Action | `createServiceClient` | `createServiceClientV2` | 🔴 | |
| 82 | `app/auth/callback/route.ts` | Route | `createSessionClient` | `createSessionClientV2` | 🔴 | Session exchange |

---

## Batch 2 — Browser / Session Consumers

### Browser Components (Client-Side)

| # | File | Type | Current Import | Target | Status | Notes |
|---|------|------|----------------|--------|--------|-------|
| 83 | `app/start/page.tsx` | Page | `createClientV2` | `createClientV2` | 🟢 | Phase 0 — Done |
| 84 | `components/BetaRedeem.tsx` | Component | `createClient` | `createClientV2` | 🔴 | |
| 85 | `components/auth/AuthForm.tsx` | Component | `createClient` | `createClientV2` | 🔴 | |
| 86 | `components/SignOutEverywhere.tsx` | Component | `createClient` | `createClientV2` | 🔴 | |
| 87 | `components/SignOutButton.tsx` | Component | `createClient` | `createClientV2` | 🔴 | |
| 88 | `components/PasswordChange.tsx` | Component | `createClient` | `createClientV2` | 🔴 | |
| 89 | `app/onboarding/page.tsx` | Page | `createClient` | `createClientV2` | 🔴 | |
| 90 | `app/setup/draft/[draftId]/page.tsx` | Page | `createClient` + direct `@supabase/supabase-js` | `createClientV2` | 🔴 | |
| 91 | `app/pubguard/login/page.tsx` | Page | `createClient` | `createClientV2` | 🔴 | |

### Server Session Consumers

| # | File | Type | Current Import | Target | Status | Notes |
|---|------|------|----------------|--------|--------|-------|
| 92 | `lib/auth.ts` | Auth | `createSessionClient` | `createSessionClientV2` | 🔴 | `getCurrentAppUser` |
| 93 | `lib/business-identity/store.ts` | Business ID | `createSessionClient` | `createSessionClientV2` | 🔴 | Requires RLS migration |
| 94 | `app/auth/callback/route.ts` | Route | `createSessionClient` | `createSessionClientV2` | 🔴 | PKCE callback |

---

## Batch 3 — Operator / Test Scripts (36+ scripts)

### Provisioning & Agent Management

| # | File | Type | Current Credential | Target | Status | Notes |
|---|------|------|-------------------|--------|--------|-------|
| 95 | `scripts/provision-existing-agents.mjs` | Provisioning | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 96 | `scripts/provision-qa-accounts.mjs` | Provisioning | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 97 | `scripts/provision-redteam-identity.mjs` | Provisioning | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 98 | `scripts/provision-reviewer.mjs` | Provisioning | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 99 | `scripts/provision-discovery-agent.mjs` | Provisioning | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 100 | `scripts/create-missing-agent.mjs` | Provisioning | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 101 | `scripts/reprovision-kira-agents.mjs` | Provisioning | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 102 | `scripts/reprovision-agent-full.mjs` | Provisioning | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 103 | `scripts/reprovision-agent-full.mts` | Provisioning | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 104 | `scripts/reconcile-agents.mjs` | Provisioning | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 105 | `scripts/purge-trial-agents.mjs` | Provisioning | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |

### Agent Patching

| # | File | Type | Current Credential | Target | Status | Notes |
|---|------|------|-------------------|--------|--------|-------|
| 106 | `scripts/patch-agent-capabilities.mjs` | Patching | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 107 | `scripts/patch-agent-area-work.mjs` | Patching | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 108 | `scripts/patch-agent-ask-this-now.mjs` | Patching | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 109 | `scripts/patch-agent-call-debrief.mjs` | Patching | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 110 | `scripts/patch-agent-model-and-greeting.mjs` | Patching | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 111 | `scripts/patch-agent-no-document-offers.mjs` | Patching | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 112 | `scripts/patch-agent-tool-inventory.mjs` | Patching | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 113 | `scripts/patch-agent-value-questions.mjs` | Patching | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 114 | `scripts/check-agent-names.mjs` | Patching | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 115 | `scripts/defuse-shadow-agents.mjs` | Patching | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 116 | `scripts/find-user-agents.mjs` | Patching | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |

### Backfill & Data Migration

| # | File | Type | Current Credential | Target | Status | Notes |
|---|------|------|-------------------|--------|--------|-------|
| 117 | `scripts/backfill-genome-register.mjs` | Backfill | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 118 | `scripts/backfill-knowledge-chunks.mjs` | Backfill | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 119 | `scripts/backfill-mnemo-memory.mjs` | Backfill | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 120 | `scripts/backfill-kira-conversations.mjs` | Backfill | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 121 | `scripts/reclassify-genome.mjs` | Backfill | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |

### Diagnostics & Verification

| # | File | Type | Current Credential | Target | Status | Notes |
|---|------|------|-------------------|--------|--------|-------|
| 122 | `scripts/verify-agent-fleet.mjs` | Diagnostic | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 123 | `scripts/probe-auth-adoption.mjs` | Diagnostic | `SUPABASE_SERVICE_ROLE_KEY` + `ANON` | `SUPABASE_SECRET_KEY` + `PUBLISHABLE` | 🔴 | |
| 124 | `scripts/analyze-voice-agent.ts` | Diagnostic | `createClient` (direct) | `createServiceClientV2` | 🔴 | TS file |
| 125 | `scripts/onboard-tester.mjs` | Diagnostic | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 126 | `scripts/mint-beta-code.mjs` | Diagnostic | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |
| 127 | `scripts/rebind-post-call-webhook.mjs` | Diagnostic | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` | 🔴 | |

### Other

| # | File | Type | Current Credential | Target | Status | Notes |
|---|------|------|-------------------|--------|--------|-------|
| 128 | `scripts/phase0_*.mjs` | Phase 0 Test | Various | N/A | ⚪ | Scratch/test files — not migrated |
| 129 | `scripts/create_and_test.ps1` | Scratch | N/A | N/A | ⚪ | Scratch files — not migrated |
| 130 | `scripts/deploy_preview.ps1` | Scratch | N/A | N/A | ⚪ | Scratch files — not migrated |

---

## Summary Counts

| Category | Total | Migrated (🟢) | In Progress (🟡) | Remaining (🔴) | Legacy/Exempt (⚪) |
|----------|-------|---------------|------------------|----------------|-------------------|
| Batch 1 — Server Routes | 33 | 1 | 0 | 32 | 0 |
| Batch 1 — Cron Routes | 7 | 0 | 0 | 7 | 0 |
| Batch 1 — Lib Modules | 33 | 0 | 0 | 33 | 0 |
| Batch 1 — App Actions | 5 | 0 | 0 | 5 | 0 |
| **Batch 1 Subtotal** | **78** | **1** | **0** | **77** | **0** |
| Batch 2 — Browser | 9 | 1 | 0 | 8 | 0 |
| Batch 2 — Session | 3 | 0 | 0 | 3 | 0 |
| **Batch 2 Subtotal** | **12** | **1** | **0** | **11** | **0** |
| Batch 3 — Scripts | 36 | 0 | 0 | 36 | 4 |
| **GRAND TOTAL** | **126** | **2** | **0** | **124** | **4** |

---

## Verification Checklist Per Migration

For each migrated consumer, verify:

- [ ] Code compiles (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] Relevant unit tests pass
- [ ] Preview deployment succeeds
- [ ] Functional test on Preview:
  - [ ] Server route: responds correctly (200/403/404 as expected)
  - [ ] Browser component: auth flow works, session persists
  - [ ] Script: runs without credential errors
- [ ] No legacy credential referenced in migrated path

---

## Next Actions

1. **Batch 1a:** Migrate high-value server routes (Kira/ConvAI core, valuation, genome)
2. **Batch 1b:** Migrate cron routes
3. **Batch 1c:** Migrate lib modules
3. **Batch 1d:** Migrate app actions
4. **Batch 2:** Browser/session consumers
5. **Batch 3:** Scripts (grouped by function)

*Update this file after each batch completion.*