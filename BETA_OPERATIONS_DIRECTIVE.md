# BETA OPERATIONS & EVIDENCE DIRECTIVE

**Baseline deployment (immutable):** `dpl_DcbvoZvLMskuBFtEE3iT6uPKuFjX` — `kiraexec.com`
**Declared:** 2026-08-25
**Source status:** BETA_READY (see `PROJECT_STATUS.md`, `BETA-READY-DECLARATION.md`)

---

## Governance Rule

> **Beta is an evidence-generation phase, not a building permission.**
>
> Observe → capture evidence → classify → reproduce → remediate → regression test → controlled deploy.
>
> NOT: Something looks wrong → change architecture → deploy → hope.

We have substantially answered "Can we build Kira?".
The next question: **"Can real people use Kira reliably enough that we can learn what the product actually needs?"**

---

## 1. Beta Operations

### Operational Runbook
- [ ] Document production configuration reproducibility (Vercel project settings, env var inventory, domain aliases, protection bypass secret location)
- [ ] Define **beta incident** classification (P0–P3 with SLOs)
- [ ] Define escalation paths (engineer → lead → product owner)
- [ ] Rollback procedure: single command to `kira-enurqnnvr` (documented in `BETA-READY-DECLARATION.md`)
- [ ] Canary monitoring activated (Vercel logs + custom error budgets)

### What Constitutes a Beta Incident
| Severity | Definition | Response |
|---|---|---|
| P0 | Complete beta-path break (auth, agent create, chat, voice all down) | Immediate rollback or hotfix within 30 min |
| P1 | Single critical feature degraded (e.g. voice start fails, knowledge ingestion broken) | Fix within 4h or feature flag off |
| P2 | Partial degradation / workaround exists | Fix in next controlled deploy |
| P3 | Cosmetic / non-blocking UX issue | Backlog, no urgent deploy |

---

## 2. Observability

### Required Capture (per request/turn)
| Field | Source |
|---|---|
| Request ID (Kira `request_id`) | Middleware / route logger |
| User ID (hashed) | Session |
| Route / action | `request.nextUrl.pathname` |
| Model / provider selected | `ELEVENLABS_CONFIG.llm`, voice ID |
| Latency (ms) | `performance.now()` at route entry/exit |
| Outcome | `success` / `error` / `degraded` |
| Error class | `user_error` \| `provider_error` \| `infra_error` \| `auth_error` |
| Upstream status | ElevenLabs HTTP status, Supabase error code |
| Retry count | If applicable |

### Distinction Rules
- **User/application errors:** 4xx from validation, missing draft, bad input — not infra faults
- **Model/provider failures:** 5xx from ElevenLabs, OpenAI, Supabase timeouts, rate limits
- **Infra errors:** Vercel cold starts, DNS, network partitions
- **Auth errors:** session expiry, cookie parse failure, missing env var

### Evidence Retention
- Structured logs → Vercel Logs + Supabase `kira_logs` (existing)
- No raw user content in logs (transcripts, prompts) — only hashes/lengths
- Minimum 30-day retention for beta window

---

## 3. Tester Onboarding

### Journey
1. Invitation email → `/signup` (V2 publishable key path)
2. Email confirmation (admin or self-serve)
3. `/start` → onboarding → draft brief
4. Agent creation → first conversation
5. Knowledge upload (URL + file)
6. Voice start
7. Feedback form (embedded)

### Provisioning
- Self-serve signup (current flow works)
- Admin confirm bypass for seeded testers
- Cohort tags in Supabase (`beta_cohort`, `invited_by`)

### Feedback Mechanism
- In-app "Report issue" → structured JSON to `kira_feedback` table
- Weekly summary digest to product owner

### Known Limitations (documented to testers)
- Mixed V1/V2 architecture (draft/create on legacy JWT)
- Voice provider = ElevenLabs only (single provider)
- No multi-tenant isolation yet (single-operator beta)
- WebSocket voice may reconnect on network change

---

## 4. Evidence Capture

### Per-Interaction Structured Record
```json
{
  "test_id": "uuid",
  "tester_id": "hashed",
  "cohort": "string",
  "workflow": "signup|draft|create|chat|knowledge|voice",
  "model_provider": "elevenlabs|openai|supabase",
  "latency_ms": 0,
  "outcome": "pass|fail|degraded",
  "error_mode": null|"validation|provider_5xx|timeout|auth|unknown",
  "expected": "string",
  "actual": "string",
  "reproducible": true|false,
  "severity": "P0|P1|P2|P3",
  "notes": "string"
}
```

### Collection Points
- Automated: every route pushes to `kira_telemetry` (new table)
- Manual: tester "Report issue" button
- Session: end-of-session summary prompt

---

## 5. Controlled Remediation

### Classification Before Fix
Every defect/issue gets:
1. **Evidence link** (telemetry ID, feedback ID, log trace)
2. **Classification** (user error / provider / infra / code defect)
3. **Reproduction** (steps, minimal test case)
4. **Impact radius** (single route / cross-cutting / data integrity)

### Fix Rules
- Fix is isolated to the smallest surface (route / lib / config)
- Regression test added (unit or integration) before merge
- No opportunistic refactoring, no architecture changes
- Production baseline protected: deploy only via `--target=production` with inspect gate

### Verification
Every remediation must show:
- Before/after telemetry for the same workflow
- Regression suite green
- No new TypeScript/build errors

---

## Execution-Boundary Audit (Parallel Track)

Per the architectural invariant: **Kira MUST NOT independently execute business work**. Every Kira feature that can cause a business effect must pass through the Orchestrator boundary.

### Audit Checklist (Ongoing)
- [ ] Scan all `lib/kira/*.ts` for direct external API calls (Stripe, ElevenLabs management, SendGrid, Supabase mutations beyond session/identity)
- [ ] Verify all mutations route via `orchestrator-adapter.ts` → Orchestrator
- [ ] Document any exceptions with explicit owner sign-off
- [ ] Enforce in PR review: "Does this call Orchestrator for business effects?"

---

## Baseline Protection

| Artifact | Status |
|---|---|
| `dpl_DcbvoZvLMskuBFtEE3iT6uPKuFjX` | **Immutable reference** — no further deploys without evidence-justified slice |
| `kira-enurqnnvr` | Rollback target, pinned |
| Legacy JWT | Active, documented, rotation scheduled post-Batch 2 |
| Test suite | 1,627 pass baseline — any deploy must meet or exceed |
| TypeScript | Clean on migrated code — any deploy must meet |

---

## Next Review Gate

**Weekly** (every Monday 09:00 AWST):
1. Incident count by severity
2. Evidence capture completeness (% of sessions with full telemetry)
3. Tester NPS / qualitative feedback themes
4. Remediation velocity (classified → fixed → verified)
5. Execution-boundary audit progress
6. Decision: continue beta / narrow scope / pause / next slice justified

---

This directive supersedes all prior build-phase directives for Kira. The codebase is now in **evidence mode**.