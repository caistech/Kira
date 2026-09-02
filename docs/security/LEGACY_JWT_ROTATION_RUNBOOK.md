# Legacy Supabase JWT Rotation Runbook v1.1

> **Status:** Planning document — DO NOT EXECUTE until explicitly authorised at the Go/No-Go checkpoint.
> **Created:** 2026-08-25 · **Author:** Automated session · **Review required:** Yes
> **v1.1 (2026-08-25):** Amended after pre-rotation readiness audit — added `NEXT_PUBLIC_SUPABASE_ANON_KEY` rotation steps (§1.5, §3), client sign-in smoke test V5a (§4), seven-cron transient-failure inventory + timing guidance (§1.7), corrected script count to 36 (§1.3), rollback impossibility evidence (§5).
> **Supabase project:** `kmrskyewwnwettlycpfe` (Kira)
> **Current deployment:** `98099b6` on `kiraexec.com`

---

## 0. Why this rotation is necessary

The legacy `service_role` JWT was present in the deleted `.vercel-env-check` artifact — a plaintext credential dump that sat untracked on disk. Although never committed to Git (verified via `git log --all --oneline -- .vercel-env-check` = empty, `git rev-list --all --objects` = no blob match), the credential must be treated as potentially exposed until rotated.

**Critical architectural constraint:** `sb_secret_` API keys are **incompatible** with this project's PostgREST path. Gate 1C testing (2026-08-25) proved that `createClient(NEXT_PUBLIC_SUPABASE_URL, sb_secret_key)` returns "Invalid API key" against the live Kira Supabase project. The legacy JWT is the **only working** service-role credential. This means rotation is a coordinated breaking-change operation, not a zero-downtime credential swap.

---

## 1. Pre-rotation inventory

### 1.1 Production consumers of `SUPABASE_SECRET_KEY`

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

### 1.3 Local/operator tooling (36 scripts)

36 scripts in `scripts/*.mjs` reference `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_KEY` (verified via `git grep` against HEAD). All read from `.env.local` at process start and will fail if the credential is invalid. This includes provisioning, patching, backfill, red-team (`red-team.mjs`), and diagnostic scripts (`verify-agent-fleet.mjs`). **Update `.env.local` before running any script.**

### 1.4 Vercel Production + Preview

Single environment variable entry (`SUPABASE_SECRET_KEY`, type=sensitive, targets=production+preview) managed via the Vercel Management API. Serverless functions read this at invocation time from the deployment's baked snapshot — **a redeploy is required** for changes to take effect in runtime.

### 1.5 Anon key dependency — `NEXT_PUBLIC_SUPABASE_ANON_KEY` (CRITICAL)

The `anon` key is a JWT **signed by the same legacy JWT secret**. Rotating the secret invalidates it and Supabase issues a **new anon key value** — exactly as for `service_role`. The rotation sequence MUST update BOTH keys' values.

The `anon` key is used by:
- Client-side SDK initialization — `lib/supabase/browser.ts:9` constructs the browser auth client from `NEXT_PUBLIC_SUPABASE_ANON_KEY` (used by 7 files)
- Client-side sign-in / sign-up / session flows (browser → Supabase Auth gateway)

**Build-time baking constraint:** because the variable is prefixed `NEXT_PUBLIC_*`, its value is compiled into the client JavaScript bundle at build time. Updating the Vercel env var alone is NOT sufficient — **a redeploy after updating the value is mandatory** to propagate the new anon key into browsers. Until that redeploy completes, all client-side authentication fails.

**Store updates required for the anon key (in addition to service_role):**
1. Vercel entry `NEXT_PUBLIC_SUPABASE_ANON_KEY` (id `dz5emxu7pehkfAYJ`, targets production+preview+development)
2. Local `.env.local`

However, the Kira architecture routes all database access through server-side API routes using the service-role key — the client-side anon key is used only for the Supabase Auth client (sign-in/sign-up flows). User sessions authenticated via Supabase Auth issue JWTs signed by the same secret — **all active sessions will be invalidated on rotation.**

### 1.6 User-session impact

- All currently signed-in users will be **immediately signed out** (their session JWTs are signed by the old secret and will fail verification).
- New sign-ins after rotation will work immediately (new JWTs signed by the new secret) — **but only after the redeploy propagates the new anon key into browser bundles** (§1.5).
- **This is unavoidable with the legacy JWT rotation mechanism.**

### 1.7 Scheduled cron routes (7 jobs — transient failure exposure)

`vercel.json` schedules 7 cron jobs against SRK-dependent server routes. These run on Vercel's infrastructure against the currently-deployed functions; between JWT rotation and redeploy completion, any cron that fires will execute with an invalid baked credential and fail.

| Path | Schedule | Failure probability in a 5-min window |
|---|---|---|
| `/api/cron/reconcile-tasks` | every 20 min | ~25% |
| `/api/cron/memory-integrity` | hourly | ~8% |
| `/api/cron/reminders` | hourly | ~8% |
| `/api/cron/genome-classify` | hourly at :30 | ~8% |
| `/api/cron/red-team-drift` | daily 08:00 | negligible (time it away) |
| `/api/cron/trial-ending` | daily 09:00 | negligible (time it away) |
| `/api/cron/reengagement-emails` | daily 10:00 | negligible (time it away) |

**Expected behaviour during the window:** affected crons return errors and that run is skipped. Failures are **transient** — after the redeploy completes, subsequent runs self-heal with the new credential. No data corruption; some scheduled work may be delayed by one cycle. Do not treat cron failures during the window as rotation failures — verify via §4 checks instead.

**Timing guidance:** schedule the rotation to start **immediately after a `reconcile-tasks` run completes** (it fires at :00, :20, :40 — start at ~:01–:03 past). This maximises the window before the next 20-minute firing (~17 minutes of margin vs the ~5-minute maintenance window). Avoid rotating near the top of any hour (three hourly crons fire at :00, genome-classify at :30).

---

## 2. Pre-flight checks

Run these **before** beginning the rotation sequence. All must pass.

| # | Check | Command/Action | Expected |
|---|---|---|---|
| P1 | Production homepage | `curl -s -o /dev/null -w "%{http_code}" https://kiraexec.com` | 200 |
| P2 | Health endpoint | `curl -s -o /dev/null -w "%{http_code}" https://kiraexec.com/api/health` | 200 |
| P3 | SRK authenticated query | `node --env-file=.env.local -e "const {createClient}=require('@supabase/supabase-js');const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{autoRefreshToken:false,persistSession:false}});sb.from('users').select('id').limit(1).then(({error})=>console.log(error?'FAIL':'PASS'))"` | PASS |
| P4 | Current deployment commit | `git log --oneline -1` | `98099b6` (or whatever is current) |
| P5 | Vercel prod entry exists | Management API: `GET /v9/projects/prj_itVur.../env` → SRK entry with target=production | Present |
| P6 | GH Actions secret present | `gh secret list --repo caistech/Kira \| Select-String SUPABASE_SERVICE_ROLE` | Timestamp present |
| P7 | Local `.env.local` has SRK | `Select-String .env.local -Pattern '^SUPABASE_SECRET_KEY='` | Match found |
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
| **3.6** | Copy the new JWT secret value (shown once). **Also copy the NEW `anon` key value** — the dashboard reissues both after rotation | Dennis | Dashboard | Immediately after 3.5 |
| **3.7** | Update Vercel `SUPABASE_SECRET_KEY` — Production + Preview with new JWT value | Dennis | Dashboard or API | Within 1 minute of 3.5 |
| **3.7a** | Update Vercel `NEXT_PUBLIC_SUPABASE_ANON_KEY` (entry `dz5emxu7pehkfAYJ`, targets production+preview+development) with the new anon value | Dennis | Dashboard or API | Within 1 minute of 3.5 |
| **3.8** | Update GitHub Actions `SUPABASE_SECRET_KEY` with new JWT value | Coder or Dennis | `gh secret set` or Dashboard | Within 1 minute of 3.5 |
| **3.9** | Update local `.env.local`: line 75 (`SUPABASE_SECRET_KEY`) AND the `NEXT_PUBLIC_SUPABASE_ANON_KEY` line with the new values | Coder | Edit file | Within 1 minute of 3.5 |
| **3.10** | **Trigger Vercel redeploy** of current commit (no code change — env rebake). Mandatory for BOTH credentials: serverless functions read SRK at invocation; browser bundles have the anon key compiled in at build time (`NEXT_PUBLIC_*`) | Coder | `vercel --prod --yes` or Dashboard redeploy | Immediately after 3.7/3.7a |
| **3.11** | Wait for Vercel deploy to complete (Ready state) | Coder | `vercel` CLI or Dashboard | ~30–60 seconds |
| **3.12** | Run post-rotation verification (§4) | Coder | Terminal | After 3.11 |

### Expected invalidation behaviour

- **T+0 (step 3.5):** JWT secret rotated. Old `anon` and `service_role` JWT-based keys immediately invalid. All active user sessions invalidated. Server-side API routes fail until redeploy completes. Any cron firing in this window fails (§1.7) — transient, self-heals after 3.11.
- **T+30–60s (step 3.11):** Vercel redeploy completes. Serverless functions use the new service-role JWT; browser bundles carry the new anon key. API routes resume; client-side sign-in works for fresh page loads.
- **T+∞:** Old JWT secret cannot be restored (§5 — rollback is technically impossible).

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
| V5a | Client-side authentication (anon key) | Fresh browser session (hard-reload / incognito) → sign in as QA user on `kiraexec.com` → confirm sign-in succeeds and a client-side Supabase call completes | Sign-in works; no console auth errors. **If V5a fails while V3 passes, the anon key was not correctly propagated — recheck steps 3.7a/3.9/3.10** |
| V6 | GitHub Actions | Trigger `gate.yml` on a test push or manual dispatch — confirm pass | Green |
| V7 | Local tooling | `node --env-file=.env.local scripts/verify-agent-fleet.mjs --dry-run` (or similar) | Script runs without credential errors |
| V8 | Active sessions invalidated | Attempt to use a pre-rotation session token — should fail | 401 / redirect to sign-in |

---

## 5. Rollback strategy

### Is true credential rollback technically possible?

**No — rotation is a strictly invalidating operation.** Evidence:

1. Supabase documentation (`supabase.com/docs/guides/auth/signing-keys`): legacy JWT secret rotation replaces the signing secret; the docs describe going back to the legacy secret only in the context of the *Signing Keys migration* (where the legacy secret is retained as the imported key), not after a legacy→legacy rotation.
2. The dashboard's "Rotate JWT secret" action issues a **new** HMAC secret and immediately re-signs `anon`/`service_role` with it. The previous secret is not retained as an active verification key — tokens signed by it fail verification from T+0.
3. There is **no API endpoint and no dashboard control to restore a previously-rotated legacy JWT secret.** (The Management API exposes no such operation; the dashboard offers no "revert" once rotated.)

**Therefore: treat every step before 3.5 as reversible, and everything from 3.5 onward as fix-forward only.** The pre-flight checks (§2) and store staging are the entire safety net.

### Recovery path if new JWT fails after rotation

If the new JWT fails (e.g., misconfiguration prevents authentication):

1. **Immediate:** The new JWT value is the only working credential. Verify it was correctly propagated to all stores (Vercel SRK + anon, GH Actions, `.env.local` both values).
2. **If stores have the correct value but authentication fails:** The issue is likely on the Supabase side (e.g., the rotation didn't complete, or there's a propagation delay). Wait 5 minutes and retry.
3. **If the new JWT is lost/misplaced:** Re-retrieve via Dashboard (the current secret remains viewable) or re-copy the reissued keys from Settings → API Keys. Do NOT rotate again — that invalidates the now-working credential and compounds the incident.
4. **Maximum acceptable outage:** 10 minutes. If authentication is not restored within 10 minutes of rotation, escalate to Supabase support.

### Maximum acceptable outage

**10 minutes.** Beyond this, user-facing functionality (sign-in, dashboard, PubGuard) is degraded. The production site remains partially functional (homepage, health endpoint don't touch Supabase), but all authenticated operations fail.

---

## 6. Operational risks

| Risk | Severity | Mitigation |
|---|---|---|
| **JWT invalidation — all active sessions signed out** | HIGH | Announce maintenance window to affected users before rotation. Expect all users to need to re-sign-in. |
| **Cron job failures during window (§1.7)** | MEDIUM | 7 scheduled crons hit SRK-dependent routes; `reconcile-tasks` fires every 20 min (~25% chance of firing in a 5-min window). Transient — skipped runs self-heal next cycle. Mitigate via timing guidance: start rotation ~:01–:03 past a reconcile-tasks completion. |
| **Anon-key propagation requires redeploy** | HIGH | `NEXT_PUBLIC_*` values are compiled into browser bundles at build time. Client-side sign-in stays broken until the redeploy completes — even if the Vercel env var is already updated. Sequence 3.7a → 3.10 is mandatory ordering. Verify with V5a. |
| **Serverless deployment propagation delay** | MEDIUM | Vercel deployments typically complete in 30–60s. If longer, check deployment logs. |
| **GitHub workflow failures** | LOW | Update GH secret BEFORE any workflow runs. Failed workflows can be re-run after secret update. |
| **Local tooling drift** | LOW | Update `.env.local` during rotation (both SRK and anon lines). Any scripts run between rotation and update will fail with clear error messages. |
| **Anon key consequences** | MEDIUM | The `anon` JWT key is invalidated simultaneously and reissued with a new value (§1.5). Client-side Supabase Auth fails until redeploy propagates the new value into bundles. No persistent data loss. |
| **No rollback capability** | HIGH | Rotation is strictly invalidating — no technical rollback exists (§5). Accept once rotation is triggered; pre-flight checks and store staging are the entire safety net. |
| **`sb_secret_` incompatibility** | INFO | Already proven via Gate 1C. Do not attempt `sb_secret_` as a fallback. The legacy JWT is the only working path. |
| **Old JWT remains extractable from Supabase** | MEDIUM | Per docs, the legacy JWT secret can still be extracted from Supabase settings until it's migrated to the new Signing Keys system. After rotation, the old secret is the "previously used" key — still technically visible but no longer trusted. Plan a follow-up migration to asymmetric Signing Keys. |

---

## 7. Go / No-Go checklist

**All items must be confirmed before triggering rotation (step 3.5).**

| # | Gate | Confirmed by |
|---|---|---|
| G1 | Pre-flight checks P1–P11 all pass | Coder |
| G2 | Vercel dashboard open, ready to update `SUPABASE_SECRET_KEY` **and** `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dennis |
| G3 | GitHub Actions secrets page open, ready to update | Dennis or Coder |
| G4 | `.env.local` ready to update immediately (both SRK line 75 and anon key line) | Coder |
| G5 | No active deployments in progress on Vercel | Coder |
| G6 | Maintenance window communicated (if applicable) | Dennis |
| G7 | QA user sign-in test planned for post-rotation verification (V5 + V5a) | Coder |
| G8 | Supabase Dashboard JWT settings page open, "Rotate JWT secret" button visible; API Keys page open for reissued `anon` value | Dennis |
| G9 | New JWT **and** new anon values will be copied IMMEDIATELY after rotation | Dennis |
| G10 | Rotation start time chosen per §1.7 timing guidance (just after a reconcile-tasks run, away from :00/:30 cron cluster) | Coder |
| G11 | This runbook (v1.1) has been reviewed and approved | Dennis |

**Rotation is authorised only when all 11 gates are confirmed.**

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
