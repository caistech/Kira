# Legacy Supabase JWT Rotation Runbook v1

> **Status:** Planning document — DO NOT EXECUTE until explicitly authorised at the Go/No-Go checkpoint.
> **Created:** 2026-08-25 · **Author:** Automated session · **Review required:** Yes
> **Supabase project:** `kmrskyewwnwettlycpfe` (Kira)
> **Current deployment:** `98099b6` on `kiraexec.com`

---

## 0. Why this rotation is necessary

The legacy `service_role` JWT was present in the deleted `.vercel-env-check` artifact — a plaintext credential dump that sat untracked on disk. Although never committed to Git (verified via `git log --all --oneline -- .vercel-env-check` = empty, `git rev-list --all --objects` = no blob match), the credential must be treated as potentially exposed until rotated.

**Critical architectural constraint:** `sb_secret_` API keys are **incompatible** with this project's PostgREST path. Gate 1C testing (2026-08-25) proved that `createClient(NEXT_PUBLIC_SUPABASE_URL, sb_secret_key)` returns "Invalid API key" against the live Kira Supabase project. The legacy JWT is the **only working** service-role credential. This means rotation is a coordinated breaking-change operation, not a zero-downtime credential swap.

---

## 1. Pre-rotation inventory

### 1.1 Production consumers of `SUPABASE_SERVICE_ROLE_KEY`

| Consumer | File:Line | Impact if JWT invalidated |
|---|---|---|
| **Primary server client** | `lib/supabase/server.ts:8` | All server-side routes requiring elevated DB access break |
| PubGuard scan save | `app/api/pubguard/scan/save/route.ts:13` | PubGuard scan persistence fails (has anon fallback — degrades but doesn't 500) |
| PubGuard Supabase client | `lib/pubguard/supabase.ts:33` | Same as above — anon fallback |
| Introducer config | `lib/introducer/index.ts:27` | Introducer routes fail |
| Billing integration test | `lib/billing/billing.integration.test.ts:36` | Test-only — not deployed |

### 1.2 GitHub Actions workflows

| Workflow | Line | Step | Impact |
|---|---|---|---|
| `gate.yml` | 203 | Sentinel cleanup | Job fails — sentinel not cleaned |
| `memory-loop.yml` | 46 | Memory sync | Job fails — memory sync halted |
| `red-team.yml` | 37 | Security testing | Job fails — red-team run halts |

All three read the secret at job start. Updating the GitHub Actions secret **before** running any workflow is sufficient — no coordination needed beyond sequencing.

### 1.3 Local/operator tooling (~30 scripts)

All scripts in `scripts/*.mjs` that read `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` will fail if the credential is invalid. This includes provisioning, patching, backfill, and diagnostic scripts. **Update `.env.local` before running any script.**

### 1.4 Vercel Production + Preview

Single environment variable entry (`SUPABASE_SERVICE_ROLE_KEY`, type=sensitive, targets=production+preview) managed via the Vercel Management API. Serverless functions read this at invocation time from the deployment's baked snapshot — **a redeploy is required** for changes to take effect in runtime.

### 1.5 Anon key dependency

The `anon` JWT key is derived from the same legacy JWT secret. **Rotating the JWT secret invalidates BOTH `anon` and `service_role` JWT-based keys simultaneously.** The `anon` key is used by:
- All client-side Supabase calls (browser → Supabase gateway)
- Client-side SDK initialization (`createClient(url, anonKey)` in browser)

However, the Kira architecture routes all database access through server-side API routes using the service-role key — the client-side anon key is used only for the Supabase Auth client (sign-in/sign-up flows). User sessions authenticated via Supabase Auth issue JWTs signed by the same secret — **all active sessions will be invalidated on rotation.**

### 1.6 User-session impact

- All currently signed-in users will be **immediately signed out** (their session JWTs are signed by the old secret and will fail verification).
- New sign-ins after rotation will work immediately (new JWTs signed by the new secret).
- **This is unavoidable with the legacy JWT rotation mechanism.**

---

## 2. Pre-flight checks

Run these **before** beginning the rotation sequence. All must pass.

| # | Check | Command/Action | Expected |
|---|---|---|---|
| P1 | Production homepage | `curl -s -o /dev/null -w "%{http_code}" https://kiraexec.com` | 200 |
| P2 | Health endpoint | `curl -s -o /dev/null -w "%{http_code}" https://kiraexec.com/api/health` | 200 |
| P3 | SRK authenticated query | `node --env-file=.env.local -e "const {createClient}=require('@supabase/supabase-js');const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});sb.from('users').select('id').limit(1).then(({error})=>console.log(error?'FAIL':'PASS'))"` | PASS |
| P4 | Current deployment commit | `git log --oneline -1` | `98099b6` (or whatever is current) |
| P5 | Vercel prod entry exists | Management API: `GET /v9/projects/prj_itVur.../env` → SRK entry with target=production | Present |
| P6 | GH Actions secret present | `gh secret list --repo caistech/Kira \| Select-String SUPABASE_SERVICE_ROLE` | Timestamp present |
| P7 | Local `.env.local` has SRK | `Select-String .env.local -Pattern '^SUPABASE_SERVICE_ROLE_KEY='` | Match found |
| P8 | No `sb_secret_` keys active | Supabase Management API: `GET /api-keys` → filter type=secret → count | 0 |
| P9 | `vercel` CLI authenticated | `vercel whoami` | Account name returned |
| P10 | `gh` CLI authenticated | `gh auth status` | Token present |
| P11 | Supabase Management token available | `SUPABASE_ACCESS_TOKEN` in `.env.local` | Present |

---

## 3. Rotation sequence

### Estimated maintenance window

**~5 minutes** from JWT rotation trigger to production redeploy completing. During this window:
- All server-side API routes using `lib/supabase/server.ts` will fail (500/401)
- PubGuard scan persistence will fail (anon fallback — degraded but not broken)
- All active user sessions will be invalidated (forced sign-out)

### Step-by-step

| Step | Action | Who | Tool | Timing |
|---|---|---|---|---|
| **3.1** | Confirm pre-flight checks P1–P11 all pass | Coder | Terminal | Before any changes |
| **3.2** | Open Supabase Dashboard JWT settings page — **do not click anything yet** | Dennis | Browser | — |
| **3.3** | Open Vercel environment variables page — **do not edit anything yet** | Dennis | Browser | — |
| **3.4** | Open GitHub Actions secrets page — **do not edit anything yet** | Dennis | Browser | — |
| **3.5** | **Click "Rotate JWT secret"** in Supabase Dashboard | Dennis | Dashboard | **T+0 — clock starts** |
| **3.6** | Copy the new JWT secret value (shown once) | Dennis | Dashboard | Immediately after 3.5 |
| **3.7** | Update Vercel `SUPABASE_SERVICE_ROLE_KEY` — Production + Preview with new JWT value | Dennis | Dashboard or API | Within 1 minute of 3.5 |
| **3.8** | Update GitHub Actions `SUPABASE_SERVICE_ROLE_KEY` with new JWT value | Coder or Dennis | `gh secret set` or Dashboard | Within 1 minute of 3.5 |
| **3.9** | Update local `.env.local` line 75 with new JWT value | Coder | Edit file | Within 1 minute of 3.5 |
| **3.10** | **Trigger Vercel redeploy** of current commit (no code change — env rebake) | Coder | `vercel --prod --yes` or Dashboard redeploy | Immediately after 3.7 |
| **3.11** | Wait for Vercel deploy to complete (Ready state) | Coder | `vercel` CLI or Dashboard | ~30–60 seconds |
| **3.12** | Run post-rotation verification (§4) | Coder | Terminal | After 3.11 |

### Expected invalidation behaviour

- **T+0 (step 3.5):** JWT secret rotated. Old `anon` and `service_role` JWT-based keys immediately invalid. All active user sessions invalidated. Server-side API routes will fail until redeploy completes with the new credential baked in.
- **T+30–60s (step 3.11):** Vercel redeploy completes. Serverless functions now use the new JWT. API routes resume functioning. New user sign-ins work.
- **T+∞:** Old JWT secret cannot be restored (Supabase does not permit rollback — see §5).

---

## 4. Post-rotation verification

Run these immediately after step 3.11 completes.

| # | Check | Command/Action | Expected |
|---|---|---|---|
| V1 | Production homepage | `curl -s -o /dev/null -w "%{http_code}" https://kiraexec.com` | 200 |
| V2 | Health endpoint | `curl -s -o /dev/null -w "%{http_code}" https://kiraexec.com/api/health` | 200 |
| V3 | SRK authenticated query | Same as P3 — `createClient` → `users.select('id').limit(1)` | PASS |
| V4 | PubGuard SRK path | Trigger a PubGuard scan via `/api/pubguard/v2/scan` — confirm scan initiates | 200 or scan-started response |
| V5 | Authenticated app path | Sign in as QA user → verify dashboard loads with data | Authenticated page renders |
| V6 | GitHub Actions | Trigger `gate.yml` on a test push or manual dispatch — confirm pass | Green |
| V7 | Local tooling | `node --env-file=.env.local scripts/verify-agent-fleet.mjs --dry-run` (or similar) | Script runs without credential errors |
| V8 | Active sessions invalidated | Attempt to use a pre-rotation session token — should fail | 401 / redirect to sign-in |

---

## 5. Rollback strategy

### Can Supabase restore the previous JWT secret?

**No.** Per Supabase documentation (`supabase.com/docs/guides/auth/signing-keys`):
> "Why is deleting the legacy JWT secret disallowed? This is to ensure you have the ability, should you need it, to go back to the legacy JWT secret. **In the future this capability will be allowed from the dashboard.**"

The legacy JWT secret **cannot be deleted**, but it also **cannot be restored after rotation** — once rotated, the new secret is permanent. There is no "revert to previous JWT" button.

### Recovery path if new JWT fails after rotation

If the new JWT fails (e.g., misconfiguration prevents authentication):

1. **Immediate:** The new JWT value is the only working credential. Verify it was correctly propagated to all stores (Vercel, GH Actions, .env.local).
2. **If stores have the correct value but authentication fails:** The issue is likely on the Supabase side (e.g., the rotation didn't complete, or there's a propagation delay). Wait 5 minutes and retry.
3. **If the new JWT is lost/misplaced:** Generate a new JWT via `supabase gen signing-key` or re-rotate via Dashboard — but note this creates a THIRD secret, compounding the problem.
4. **Maximum acceptable outage:** 10 minutes. If authentication is not restored within 10 minutes of rotation, escalate to Supabase support.

### Maximum acceptable outage

**10 minutes.** Beyond this, user-facing functionality (sign-in, dashboard, PubGuard) is degraded. The production site remains partially functional (homepage, health endpoint don't touch Supabase), but all authenticated operations fail.

---

## 6. Operational risks

| Risk | Severity | Mitigation |
|---|---|---|
| **JWT invalidation — all active sessions signed out** | HIGH | Announce maintenance window to affected users before rotation. Expect all users to need to re-sign-in. |
| **Serverless deployment propagation delay** | MEDIUM | Vercel deployments typically complete in 30–60s. If longer, check deployment logs. |
| **GitHub workflow failures** | LOW | Update GH secret BEFORE any workflow runs. Failed workflows can be re-run after secret update. |
| **Local tooling drift** | LOW | Update `.env.local` during rotation. Any scripts run between rotation and update will fail with clear error messages. |
| **Anon key consequences** | MEDIUM | The `anon` JWT key is invalidated simultaneously. Client-side Supabase Auth (sign-in/sign-up) will fail until the browser SDK picks up the new anon key (happens automatically on page reload after redeploy). No persistent data loss. |
| **No rollback capability** | HIGH | Accept once rotation is triggered. Verify stores are correct BEFORE clicking "Rotate JWT secret." |
| **`sb_secret_` incompatibility** | INFO | Already proven via Gate 1C. Do not attempt `sb_secret_` as a fallback. The legacy JWT is the only working path. |
| **Old JWT remains extractable from Supabase** | MEDIUM | Per docs, the legacy JWT secret can still be extracted from Supabase settings until it's migrated to the new Signing Keys system. After rotation, the old secret is the "previously used" key — still technically visible but no longer trusted. Plan a follow-up migration to asymmetric Signing Keys. |

---

## 7. Go / No-Go checklist

**All items must be confirmed before triggering rotation (step 3.5).**

| # | Gate | Confirmed by |
|---|---|---|
| G1 | Pre-flight checks P1–P11 all pass | Coder |
| G2 | Vercel dashboard open, ready to update `SUPABASE_SERVICE_ROLE_KEY` | Dennis |
| G3 | GitHub Actions secrets page open, ready to update | Dennis or Coder |
| G4 | `.env.local` updated or ready to update immediately | Coder |
| G5 | No active deployments in progress on Vercel | Coder |
| G6 | Maintenance window communicated (if applicable) | Dennis |
| G7 | QA user sign-in test planned for post-rotation verification (V5) | Coder |
| G8 | Supabase Dashboard JWT settings page open, "Rotate JWT secret" button visible | Dennis |
| G9 | New JWT value will be copied IMMEDIATELY after rotation (shown once) | Dennis |
| G10 | This runbook has been reviewed and approved | Dennis |

**Rotation is authorised only when all 10 gates are confirmed.**

---

## Appendix A: Supabase key inventory (as of 2026-08-25)

| Key | Type | Status | Notes |
|---|---|---|---|
| `anon` | legacy JWT | Active | Invalidated on rotation — client-side auth |
| `service_role` | legacy JWT | Active | **THE credential being rotated** |
| `default` | publishable | Active | New-format key — not involved in rotation |
| `sb_secret_` keys | secret | **0 remaining** | All deleted during investigation |
| Legacy JWT secret | shared secret | Active | Underlying HMAC secret for all JWT signing |

## Appendix B: Verified infrastructure

| Component | Value |
|---|---|
| Supabase project | `kmrskyewwnwettlycpfe` |
| Supabase URL | `https://kmrskyewwnwettlycpfe.supabase.co` |
| Vercel project | `prj_itVurDE9CD77K9rGWEQZNDmn33yz` |
| Vercel team | `corporate-ai-solutions` |
| GitHub repo | `caistech/Kira` |
| Production URL | `https://kiraexec.com` |
| Current deployment | `98099b6` (READY) |
| Platform-trust project | `ggwveltavnvvscgqekhy` (separate — not affected) |

## Appendix C: Key learnings from this session

1. **`vercel env run` serves deployment snapshots**, not live cloud state — pre-deploy verification through that channel is unreliable for sensitive variables.
2. **`sb_secret_` API keys are incompatible** with this project's current PostgREST path — `createClient(..., sb_secret_)` returns "Invalid API key." The project has not migrated to the new Signing Keys system.
3. **PowerShell pipe to `vercel env update`** caused encoding corruption — never pipe secrets through PowerShell pipelines to the Vercel CLI.
4. **Supabase Management API `PATCH /v9/env`** silently ignores the `value` field for sensitive variables — use DELETE + POST create instead.
5. **`vercel env pull --environment production`** correctly pulls production env but **redacts sensitive values** — cannot be used to verify sensitive credential contents.
6. **The API Gateway's 5-minute propagation throttle** is real — key state changes (create/delete) may not be immediately effective.
