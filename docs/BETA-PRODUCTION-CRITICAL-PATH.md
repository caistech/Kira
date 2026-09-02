# Beta Production Critical Path — Kira

**Status:** Active — critical path assessment in progress  
**Created:** 2026-08-25  
**Objective:** Get current Kira build into Production for controlled beta testers ASAP with V2 API-key architecture on the critical path, leaving remaining ~60 consumers on legacy JWT as documented Batch 2 debt.

---

## 1. Beta Critical Path Definition

A beta tester must be able to complete this journey end-to-end:

```
Landing → Sign-in → Start/Setup → Create Agent → Chat (text + voice) → Knowledge/RAG → History → Genome
```

### 1.1 Entry & Authentication

| Step | Path | Component | Auth |
|------|------|-----------|------|
| Landing | `app/page.tsx` | Public | None |
| Sign-in | `app/auth/callback/route.ts` | Server | Session |
| `/start` (setup flow) | `app/start/page.tsx` | Browser | V2 publishable ✅ |
| Onboarding | `app/onboarding/page.tsx` | Browser | **Legacy** ❌ |
| Draft creation | `app/setup/draft/[draftId]/page.tsx` | Browser | **Legacy** ❌ |

### 1.2 Agent Creation (Server)

| Step | Route | V2 Status |
|------|-------|-----------|
| Create agent from draft | `app/api/kira/create/route.ts` | ✅ Migrated |
| Load agent by ID | `app/api/kira/agent/route.ts` | ✅ Migrated |
| Complete agent setup | `app/api/kira/agent/complete/route.ts` | ❌ Legacy |

### 1.3 Communication (Text + Voice)

| Step | Route | V2 Status |
|------|-------|-----------|
| Start chat (signed URL) | `app/api/kira/chat/start/route.ts` | ✅ Migrated |
| Text chat | `app/api/kira/chat/text/route.ts` | ✅ Migrated |
| Chat history | `app/api/kira/chat/history/route.ts` | ✅ Migrated |
| Ask (public) | `app/api/kira/ask/route.ts` | ✅ Migrated |
| Voice telemetry | `app/api/voice/telemetry/route.ts` | ✅ Migrated |

### 1.4 ConvAI / Voice-Memory Core (Server)

| Component | V2 Status |
|-----------|-----------|
| `lib/kira/convai.ts` | ✅ Migrated |

### 1.5 Knowledge / RAG (Server)

| Component | V2 Status |
|-----------|-----------|
| `lib/kira/knowledge-tool.ts` | ✅ Migrated |
| `lib/kira/knowledge-search.ts` | ✅ Migrated |
| `lib/kira/knowledge-ingest.ts` | ❌ Legacy |
| `app/api/kira/knowledge/upload/route.ts` | ❌ Legacy |
| `app/api/kira/knowledge/url/route.ts` | ❌ Legacy |

### 1.6 Memory / Genome / Document (Server)

| Component | V2 Status |
|-----------|-----------|
| `lib/kira/recall.ts` | ✅ Migrated |
| `lib/kira/refusal.ts` | ✅ Migrated |
| `lib/kira/document.ts` | ✅ Migrated |
| `lib/kira/confirm.ts` | ❌ Legacy |
| `lib/kira/discovery.ts` | ❌ Legacy |
| `lib/kira/area-agenda.ts` | ❌ Legacy |

### 1.7 Authentication / Session (Core)

| Component | V2 Status |
|-----------|-----------|
| `lib/supabase/browser.ts` (`createClientV2`) | ✅ Migrated |
| `lib/supabase/server-session.ts` (`createSessionClientV2`) | ❌ Legacy (imports exist) |
| `lib/supabase/server.ts` (`createServiceClientV2`) | ✅ Available |
| `lib/auth.ts` | ✅ Migrated |

### 1.8 Supporting Infrastructure

| Component | Route/Path | V2 Status |
|-----------|------------|-----------|
| Resend webhook | `app/api/webhooks/resend/route.ts` | ✅ Migrated |
| PubGuard login | `app/pubguard/login/page.tsx` | ❌ Legacy |
| Admin execution | `lib/admin/exec.ts` | ✅ Migrated |

---

## 2. Critical-Path V2 Migration Status

| Category | Path | Migrated? | Notes |
|----------|------|-----------|-------|
| **Auth (Browser)** | `app/start/page.tsx` | ✅ | Uses `createClientV2()` |
| **Auth (Server Session)** | `lib/auth.ts` | ✅ | Uses `createServiceClientV2()` |
| **Agent Create** | `app/api/kira/create/route.ts` | ✅ | Uses `createServiceClientV2()` |
| **Agent Load** | `app/api/kira/agent/route.ts` | ✅ | Uses `createServiceClientV2()` |
| **Chat Start** | `app/api/kira/chat/start/route.ts` | ✅ | Uses `createServiceClientV2()` |
| **Text Chat** | `app/api/kira/chat/text/route.ts` | ✅ | Uses `createServiceClientV2()` |
| **Chat History** | `app/api/kira/chat/history/route.ts` | ✅ | Uses `createServiceClientV2()` |
| **Public Ask** | `app/api/kira/ask/route.ts` | ✅ | Uses `createServiceClientV2()` |
| **ConvAI Core** | `lib/kira/convai.ts` | ✅ | Uses `createServiceClientV2()` |
| **Knowledge Tool** | `lib/kira/knowledge-tool.ts` | ✅ | Uses `createServiceClientV2()` |
| **Knowledge Search** | `lib/kira/knowledge-search.ts` | ✅ | Uses `createServiceClientV2()` |
| **Recall** | `lib/kira/recall.ts` | ✅ | Uses `createServiceClientV2()` |
| **Refusal** | `lib/kira/refusal.ts` | ✅ | Uses `createServiceClientV2()` |
| **Document** | `lib/kira/document.ts` | ✅ | Uses `createServiceClientV2()` (dynamic import) |
| **Voice Telemetry** | `app/api/voice/telemetry/route.ts` | ✅ | Uses `createServiceClientV2()` |
| **Resend Webhook** | `app/api/webhooks/resend/route.ts` | ✅ | Uses `createServiceClientV2()` |
| **Admin Exec** | `lib/admin/exec.ts` | ✅ | Uses `createServiceClientV2()` |

**Critical Gaps (must migrate before Production):**
- `lib/supabase/server-session.ts` → `createSessionClientV2()` for auth callback
- `app/auth/callback/route.ts` → `createSessionClientV2()`
- `app/onboarding/page.tsx` → `createClientV2()`
- `app/setup/draft/[draftId]/page.tsx` → `createClientV2()`
- `lib/kira/knowledge-ingest.ts` → `createServiceClientV2()`
- `app/api/kira/knowledge/upload/route.ts` → `createServiceClientV2()`
- `app/api/kira/knowledge/url/route.ts` → `createServiceClientV2()`
- `app/api/kira/agent/complete/route.ts` → `createServiceClientV2()`

---

## 3. Remaining Legacy Consumers — Batch 2 Debt

| File | Function | Prod Relevance | Beta Relevance | Priority |
|------|----------|----------------|----------------|----------|
| `app/api/kira/agent/complete/route.ts` | Complete agent setup | High | Medium | P1 |
| `app/api/kira/conversation/context/route.ts` | Conversation context | Medium | Low | P2 |
| `app/api/kira/draft/create/route.ts` | Draft creation | Medium | Medium | P2 |
| `app/api/kira/email/send-kira-ready/route.ts` | Email alert | Low | Low | P3 |
| `app/api/kira/webhooks/save-framework-draft/route.ts` | Webhook | Low | Low | P3 |
| `app/api/kira/webhooks/task-events/route.ts` | Webhook | Low | Low | P3 |
| `app/api/kira/knowledge/[id]/route.ts` | Knowledge item | Medium | Medium | P2 |
| `app/api/kira/knowledge/upload/route.ts` | Knowledge upload | Medium | Medium | P2 |
| `app/api/kira/knowledge/url/route.ts` | Knowledge from URL | Medium | Medium | P2 |
| `app/api/kira/research/route.ts` | Research | Low | Low | P3 |
| `app/api/kira/discovery/ingest/route.ts` | Discovery | Medium | Low | P2 |
| `app/api/valuation/mine/route.ts` | Valuation | Medium | Low | P2 |
| `app/api/valuation/claim/route.ts` | Valuation | Low | Low | P3 |
| `app/api/valuation/match-industry/route.ts` | Valuation | Low | Low | P3 |
| `app/api/beta/redeem/route.ts` | Beta codes | Medium | High | P1 |
| `app/api/genome/manual/route.ts` | Genome | Medium | Medium | P2 |
| `app/api/genome/export/route.ts` | Genome | Medium | Medium | P2 |
| `app/api/genome/share/route.ts` | Genome | Low | Low | P3 |
| `app/api/genome/redact/route.ts` | Genome | Low | Low | P3 |
| `app/api/loi/route.ts` | LOI | Low | Low | P3 |
| `app/api/refer/route.ts` | Referral | Low | Low | P3 |
| `app/api/advisors/enquiry/route.ts` | Advisors | Low | Low | P3 |
| `app/api/billing/cancel/route.ts` | Billing | High | Low | P2 |
| `app/unsubscribe/route.ts` | Unsubscribe | Low | Low | P3 |
| `app/api/cron/reconcile-tasks/route.ts` | Cron (20min) | High | Low | P2 |
| `app/api/cron/memory-integrity/route.ts` | Cron | Medium | Low | P3 |
| `app/api/cron/genome-classify/route.ts` | Cron | Low | Low | P3 |
| `app/api/cron/red-team-drift/route.ts` | Cron | Low | Low | P3 |
| `app/api/cron/trial-ending/route.ts` | Cron | Medium | Low | P3 |
| `app/api/cron/reengagement-emails/route.ts` | Cron | Low | Low | P3 |
| `lib/billing/index.ts` | Billing | High | Medium | P2 |
| `lib/billing/arrears.ts` | Billing | High | Low | P2 |
| `lib/valuation/snapshots.ts` | Valuation | Medium | Low | P3 |
| `lib/valuation/recompute-readiness.ts` | Valuation | Medium | Low | P3 |
| `lib/kill-switch.ts` | Kill switch | High | High | P1 |
| `lib/kira/area-agenda.ts` | Genome | Medium | Medium | P2 |
| `lib/kira/capability-sweep.ts` | Genome | Low | Low | P3 |
| `lib/kira/entity-sweep.ts` | Genome | Low | Low | P3 |
| `lib/kira/knowledge-ingest.ts` | Knowledge | **Critical Gap** | **Critical Gap** | **P0** |
| `lib/kira/uid-tools.ts` | Utils | Medium | Low | P2 |
| `lib/kira/confirm.ts` | Genome | Medium | Medium | P2 |
| `lib/kira/discovery.ts` | Discovery | Medium | Low | P2 |
| `lib/kira/refusal-sweep.ts` | Safety | Low | Low | P3 |
| `lib/kira/swarm/*` (5 files) | Swarm | Low | Low | P3 |
| `lib/introducer/index.ts` | Introducer | Low | Low | P3 |
| `lib/pubguard/supabase.ts` | PubGuard | Medium | Medium | P2 |
| `lib/voice-agent-checks.ts` | Voice QA | Low | Low | P3 |
| `lib/genome/derive.ts` | Genome | Medium | Medium | P2 |
| `lib/genome/dedupe-sweep-apply.ts` | Genome | Low | Low | P3 |
| `lib/genome/file-manual.ts` | Genome | Low | Low | P3 |
| `lib/genome/access-log.ts` | Genome | Low | Low | P3 |
| `lib/business-identity/store.ts` | Business ID | Medium | Medium | P2 |
| `app/settings/actions.ts` | Settings | Medium | Low | P2 |
| `app/my-genome/[area]/actions.ts` | Genome | Medium | Medium | P2 |
| `app/admin/(panel)/introducers/actions.ts` | Admin | Low | Low | P3 |
| `app/introducer/expired/actions.ts` | Introducer | Low | Low | P3 |
| `app/pubguard/login/page.tsx` | PubGuard login | Medium | Medium | P2 |
| `components/BetaRedeem.tsx` | Beta redeem | Medium | High | P1 |
| `components/auth/AuthForm.tsx` | Auth form | **Critical Gap** | **Critical Gap** | **P0** |
| `components/SignOutEverywhere.tsx` | Sign out | Medium | Low | P2 |
| `components/SignOutButton.tsx` | Sign out | Medium | Low | P2 |
| `components/PasswordChange.tsx` | Password | Medium | Low | P2 |
| Scripts (36) | Ops/maintenance | N/A | N/A | Batch 3 |

---

## 4. Validation Gates (Pre-Production)

### 4.1 Static Validation
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes (production build)
- [ ] `npm run lint` passes
- [ ] No new TypeScript errors introduced

### 4.2 Automated Tests
- [ ] Full test suite runs: 1,627+ pass baseline maintained
- [ ] Pre-existing failures: 2 (middleware.test.ts, text-tools.test.ts) — documented, not new
- [ ] Targeted tests for all migrated critical-path consumers pass
- [ ] No regressions in existing test coverage

### 4.3 Preview Deployment
- [ ] Preview deployment succeeds (Vercel)
- [ ] Build logs show no errors
- [ ] Deployment status: READY

### 4.4 Functional Smoke Tests (Preview)
| Test | Expected | Verified |
|------|----------|----------|
| `/start` loads, sign-in works | ✅ | |
| Agent creation from draft | ✅ | |
| Text chat with agent | ✅ | |
| Voice chat (ConvAI) starts | ✅ | |
| Knowledge search returns results | ✅ | |
| Chat history loads | ✅ | |
| Recall/refusal paths work | ✅ | |
| Document operations work | ✅ | |
| Voice telemetry records | ✅ | |
| Resend webhook processes | ✅ | |

### 4.5 Credential Proof (Preview)
- [ ] Migrated routes authenticate via `SUPABASE_SECRET_KEY` (server)
- [ ] Browser components authenticate via `SUPABASE_PUBLISHABLE_KEY`
- [ ] No critical-path route reads `SUPABASE_SECRET_KEY`
- [ ] No critical-path route reads `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] V2 service client bypasses RLS as expected
- [ ] V2 browser client enforces RLS as expected
- [ ] Session create/refresh works with publishable key

---

## 5. Production Deployment Plan

### 5.1 Pre-Deploy Checklist
1. All validation gates pass
2. Critical gaps migrated (see §2)
3. Preview smoke tests pass
4. Rollback plan documented
5. Monitoring dashboards verified

### 5.2 Deployment Steps
1. Add `SUPABASE_SECRET_KEY` and `SUPABASE_PUBLISHABLE_KEY` to Vercel Production environment
2. **Do NOT remove** `SUPABASE_SECRET_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Production
3. Deploy `main` branch to Production
4. Verify Production health (canary check)
5. Run Production smoke tests (subset of Preview tests)

### 5.3 Rollback Strategy
- **Immediate:** Revert to previous Production deployment (`e086205`) via Vercel dashboard
- **Credential:** Legacy JWT remains active — no credential rollback needed
- **Time to rollback:** < 2 minutes

---

## 6. Known Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Unmigrated legacy path fails in Production | Medium | Medium | Legacy JWT still active; monitor errors |
| V2 session refresh edge case | Low | High | Preview validation; canary monitoring |
| Knowledge upload/ingest not migrated before beta | Medium | Medium | Document as known limitation; manual workaround |
| Beta tester hits unmigrated path | Low | Medium | Log all legacy-client usage; prioritize Batch 2 |
| Credential exposure persists | High | High | **Explicit:** Legacy JWT remains exposed until Batch 2 complete; track as P0 security item |

---

## 7. Security Position — Explicit

> **The legacy `SUPABASE_SECRET_KEY` JWT remains exposed and active in Production.**
>
> This deployment does **not** complete the credential remediation. It moves beta traffic to the secure V2 path while retaining the exposed credential as a temporary compatibility layer for Batch 2 consumers.
>
> **Do not claim the security remediation is complete.**
>
> The credential exposure remains an outstanding P0 security item until:
> 1. Batch 2 migration completes
> 2. Legacy variables removed from all environments
> 3. Legacy JWT revoked in Supabase dashboard

---

## 8. GO/NO-GO Gate

| Criterion | GO? | Evidence |
|-----------|-----|----------|
| All critical gaps migrated | | |
| Static validation passes | | |
| Automated tests pass (baseline maintained) | | |
| Preview deployment succeeds | | |
| Functional smoke tests pass | | |
| Credential proof verified | | |
| Rollback plan ready | | |
| Security position acknowledged | | |

**All GO criteria must be met before Production deployment.**

---

## 9. Post-Production — Batch 2 Programme

After beta stability confirmed:

1. Migrate all Batch 2 consumers (P0 → P1 → P2 → P3)
2. Preview validation
3. Production deployment
4. Observation period
5. Remove legacy environment variables
6. Revoke legacy JWT in Supabase
7. Delete legacy factory functions

---

## 10. Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Architecture Owner | | | ⏳ Pending |
| Security Owner | | | ⏳ Pending |
| Beta Programme Lead | | | ⏳ Pending |

---

*This document is the single source of truth for the Beta Production Critical Path. Update it as migration status changes.*