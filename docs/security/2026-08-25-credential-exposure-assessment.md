# Credential Exposure Assessment — `.vercel-env-check`

> Date: 2026-08-25 · Author: automated audit session · Status: **awaiting rotation authorisation**

## Executive Summary

A local file `.vercel-env-check` — a `vercel env pull` artifact containing the full Vercel production environment — sat untracked on the developer's disk in plaintext. It was **never committed to Git, never pushed, never part of any remote repository state.** Exposure is local-disk-only; no Git-history exposure occurred. This document captures the evidence, the per-credential impact, and the recommended rotation plan.

---

## 1. Evidence: never committed or pushed

Three independent checks confirm the file has no Git provenance:

| Check | Command | Result |
|---|---|---|
| No commit on any local or remote ref | `git log --all --oneline -- .vercel-env-check` | Empty |
| No blob/tree object named `.vercel-env-check` in reachable history | `git rev-list --all --objects \| Select-String ".vercel-env-check"` | Empty |
| Not in index, not on disk post-remediation | `git ls-files --error-unmatch .vercel-env-check` + `Test-Path .vercel-env-check` | Both fail |

**Conclusion:** VERIFIED — no Git-history exposure. The file was a local artifact, now deleted.

---

## 2. How it was removed

1. `.gitignore` guard added at `.gitignore:34` — rule prevents accidental staging.
2. Local file deleted after confirming:
   - File header: `# Created by Vercel CLI` (provenance = pull artifact, values originate from Vercel).
   - Vercel CLI authenticated (`mcm-dennis`), project linked (`kira` / `prj_itVurDE9CD77K9rGWEQZNDmn33yz`).
   - Every value is recoverable on demand via `vercel env pull .vercel-env-check`.

Known consequence: three tracked operator scripts (`env-fingerprint-all.mjs`, `secret-fingerprint.mjs`, `webhook-probe.mjs`) read this file and will `ENOENT` until regenerated. These are ad-hoc diagnostic tools; regeneration is a one-line command.

---

## 3. What was in the file

84 total entries. Classification (no values shown):

| Class | Count | Meaning |
|---|---|---|
| `PLAINTEXT` | 39 | Values written in the clear on disk |
| `[SENSITIVE]` (never written to disk) | 33 | Vercel withheld these; the file holds the literal string `[SENSITIVE]` in their place |
| Empty | 12 | Git-metadata placeholders (`VERCEL_GIT_*`), `VERCEL_URL` |

The `[SENSITIVE]` class **includes all four Stripe secrets**, both Orchestrator secrets, all ElevenLabs webhook signing secrets, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `MNEMO_API_KEY`, `CRON_SECRET`, and `NODE_AUTH_TOKEN` — these were **never exposed on disk.**

---

## 4. Per-credential rotation plan

### P0 — highest blast radius; rotate first

#### 4.1 `SUPABASE_SECRET_KEY` (Kira project)

- **Service:** Supabase, project `kmrskyewwnwettlycpfe`
- **Prefix:** `sb_secret_` (new-format API key)
- **Production code use:** `lib/supabase/server.ts:8` (primary server-side Supabase client); `app/api/pubguard/scan/save/route.ts:13`; ~30+ operator scripts (`scripts/*.mjs`); GitHub Actions workflows (`gate.yml:203`, `memory-loop.yml:46`, `red-team.yml:37`)
- **Regenerate:** Supabase dashboard → project `kmrskyewwnwettlycpfe` → Settings → API → service_role key → rotate
- **Update after rotation:**
  - Vercel: production + preview environment variables
  - Local: `.env.local`
  - GitHub Actions: repository secret `SUPABASE_SECRET_KEY`
  - QA secrets: `cais-shared-services/.secrets/qa-secrets.json` (if present)
- **Verify after rotation:**
  1. Server client constructs: `lib/supabase/server.ts` produces a valid client (test by hitting any server-rendered authenticated page)
  2. `scripts/provision-redteam-identity.mjs --dry-run` succeeds (reads service key)
  3. GitHub Actions: trigger `gate.yml` on a test push — must pass
  4. `scripts/verify-agent-fleet.mjs --dry-run` succeeds
- **Dependencies:** rotate FIRST — most other operations depend on this key.

#### 4.2 `PLATFORM_TRUST_SERVICE_KEY` (platform-trust project)

- **Service:** Supabase, project `ggwveltavnvvscgqekhy` (platform-trust)
- **Prefix:** legacy JWT format (219 chars)
- **Production code use:** consumed by `@caistech/platform-trust-middleware` (trust-gate.js) to construct a platform-trust Supabase client; accessed via `trustGate()`/`trustLog()`/`trustMeter()` re-exported through `src/lib/platform-trust.ts:16`; middleware guards write/delete API operations
- **Regenerate:** Supabase dashboard → project `ggwveltavnvvscgqekhy` → Settings → API → service_role → rotate
- **Update after rotation:**
  - Vercel: production + preview environment variables
  - Local: `.env.local`
- **Verify after rotation:**
  1. Any API route protected by `trustGate()` returns normally on a read (trust gate allows reads unconditionally; verify denial on a delete attempt with invalid scope = proves the middleware is configured and not silently bypassed)
  2. Check logs for absence of `[platform-trust] DENIED … Platform Trust not configured` errors
- **Dependencies:** independent of Kira service-role key — can rotate in parallel.

#### 4.3 `SUPABASE_ACCESS_TOKEN` (management / CLI)

- **Service:** Supabase (account-level personal access token for management API)
- **Prefix:** `sbp_`
- **Production code use:** ZERO — operator/CLI-only. Used by `supabase link`, `supabase db push`, etc. locally and potentially in CI migration steps.
- **Regenerate:** Supabase dashboard → Account → Access Tokens → create new token → delete old
- **Update after rotation:**
  - Local: `~/.supabase/config.json` (or wherever the CLI stores the token)
  - CI: any GitHub Actions step or local script calling `supabase` CLI with `--token` flag
- **Verify after rotation:**
  1. `supabase projects list` works
  2. `supabase inspect db table-stats --linked` succeeds
- **Dependencies:** no runtime impact — rotate independently, any time.

#### 4.4 `GITHUB_TOKEN` (fine-grained PAT)

- **Service:** GitHub
- **Prefix:** `github_pat_`
- **Production code use:** `app/api/pubguard/v2/analyzers/github.ts:6` (GitHub API calls for PubGuard repo scanning — stars, forks, issues, vulnerability alerts, SECURITY.md checks); `app/api/pubguard/v2/scan/route.ts:36` (passes token to analyzers at runtime)
- **Regenerate:** GitHub → Settings → Developer settings → Fine-grained tokens → generate new with matching repository access scopes
- **Update after rotation:**
  - Vercel: production + preview environment variables
  - Local: `.env.local`
- **Verify after rotation:**
  1. PubGuard scan page: scan a public GitHub repo — GitHub signals (repo age, stars, open issues, vulnerability check) must populate
  2. `app/api/pubguard/v2/analyzers/github.ts` returns data (test via the scan API directly)
- **Dependencies:** independent — no other credential depends on this.

---

### P1 — rotate after P0 is complete

#### 4.5 `VERCEL_API_KEY` + `VERCEL_TOKEN`

- **Service:** Vercel (API key for programmatic access; classic deployment token)
- **Production code use:** ZERO code references in tracked files. Operator/CLI tooling only. `VERCEL_TOKEN` appears only in a comment at `scripts/rebind-post-call-webhook.mjs:294`. `VERCEL_API_KEY` appears nowhere in tracked code.
- **Regenerate:** Vercel dashboard → Account Settings → Tokens → create new (scope to Corporate AI Solutions team as appropriate)
- **Update after rotation:**
  - Local: environment where `vercel` CLI is invoked
  - CI: any workflow step running `vercel` CLI commands
  - Note: `~/.vercel-token` (local file referenced in PROJECT_STATUS.md) is a *separate* scoped token — not the same credential; do not confuse them.
- **Verify after rotation:**
  1. `vercel whoami` returns the correct account
  2. `vercel project ls --scope corporate-ai-solutions` lists the kira project
- **Dependencies:** independent of all other rotations.

#### 4.6 `ADMIN_KEY` + `ADMIN_SECRET_KEY` (pair)

- **Service:** Kira (app-level admin authentication — symmetric 32-byte key pair)
- **Production code use:** **ZERO** references in any tracked file at HEAD (`.ts`, `.tsx`, `.mjs`, `.js`, `.yml`, `.json`). No `.env.example` entry. No route, middleware, or library reads these variables.
- **Status:** DEAD CONFIGURATION — phantom credentials set in Vercel but never consumed.
- **Recommended action:** Remove from Vercel env entirely (both prod + preview). Do not rotate a credential that no code uses — rotation of dead config adds noise without benefit. If a future admin API feature requires them, new values will be generated at that time.
- **Dependencies:** none. Remove at any point.

#### 4.7 `ELEVENLABS_API_KEY` (server-side)

- **Service:** ElevenLabs (Conversational AI API key)
- **Prefix:** `sk-` (164 chars)
- **Production code use (server-only):** `lib/kira/discovery.ts:73`, `lib/kira/document.ts:88,355`, `app/api/kira/chat/text/route.ts:82,117`, `app/api/kira/start/route.ts:9`, `app/api/kira/create/route.ts:37`, `app/api/kira/knowledge/[id]/route.ts:35`, `app/api/kira/knowledge/upload/route.ts:8`, `app/api/kira/knowledge/url/route.ts:8`, `app/api/kira/agent/complete/route.ts:5`, `lib/admin/exec-reprovision.ts:82`, plus ~15 operator scripts. All are server-side API routes or server scripts; **no client-side references.**
- **Regenerate:** ElevenLabs dashboard → Profile → API Keys → regenerate key
- **Update after rotation:**
  - Vercel: production + preview environment variables
  - Local: `.env.local`
  - QA secrets: `cais-shared-services/.secrets/qa-secrets.json`
- **Verify after rotation:**
  1. Start a new Kira chat session via `/api/kira/start` — returns 200 with a signed URL
  2. Ingest a document via `/api/kira/knowledge/upload` — returns 200
  3. `scripts/provision-redteam-identity.mjs --dry-run` succeeds
- **Dependencies:** rotate AFTER Supabase service-role key (some scripts require both); independent of NEXT_PUBLIC cleanup.

---

## 5. `NEXT_PUBLIC_ELEVENLABS_API_KEY` — client-bundle exposure analysis

### What it is

A Vercel environment variable carrying the ElevenLabs API key under the `NEXT_PUBLIC_` prefix, which in Next.js marks a variable for build-time inlining into client JavaScript bundles.

### Current status: **zero code references, zero exposure**

- `git grep -n "NEXT_PUBLIC_ELEVENLABS_API_KEY" HEAD` across all tracked `.ts`, `.tsx`, `.mjs`, `.js` files: **zero matches.**
- Only tracked-file references: `.env.example` (historical documentation) and migration plan docs.
- Historical introduction: commits `114ee63` ("update kira" — PubGuard v2 refactor) and `8cf1cff` ("fixed kira again" — KiraVoiceWidget.tsx added) both touched code that once consumed this var. All such client-side usage has since been removed.
- The current `components/KiraVoiceWidget.tsx` (live at HEAD) imports `VoiceWidget` from `@caistech/elevenlabs-convai/react` and has **no** reference to `NEXT_PUBLIC_ELEVENLABS_API_KEY` or any other client-side ElevenLabs credential.

### Why the exposure class is different from the other credentials

This is not a "plaintext-on-disk" issue — it is a **build-time configuration classification issue.** Even though the var is set in Vercel env, if no client code reads `process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY`, Next.js never inlines it into the built JS bundle. The value never reaches the browser. **The exposure was eliminated by code removal, not by configuration fix.**

However, the var persists as a configuration hazard: any future developer adding a client component that references `process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY` would silently re-expose the key in the production bundle. The root cause is the env var's existence under a `NEXT_PUBLIC_` prefix.

### Minimum safe fix (no code change required)

1. **Delete the `NEXT_PUBLIC_ELEVENLABS_API_KEY` variable from Vercel** (production + preview).
2. Verify no build errors result (`next build` must succeed without the var).
3. The server-side `ELEVENLABS_API_KEY` (non-`NEXT_PUBLIC_`) remains correctly in place and is the only key the application needs — no breakage.

This eliminates the configuration hazard entirely. No code change is required because no current code references the variable.

---

## 6. Recommended rotation sequence

Execute in order; each step verified before proceeding to the next.

```
Phase 1: P0 — infrastructure credentials
  ├─ [A] Rotate SUPABASE_SECRET_KEY (Kira)  ← rotate first, most dependents
  │       Update: Vercel prod+preview, .env.local, GitHub Actions secrets, qa-secrets.json
  │       Verify: server client, CI workflows, fleet scripts
  ├─ [B] Rotate PLATFORM_TRUST_SERVICE_KEY (platform-trust) — parallel with [A]
  │       Update: Vercel prod+preview, .env.local
  │       Verify: trustGate/trustMeter operational, no "not configured" errors
  ├─ [C] Rotate SUPABASE_ACCESS_TOKEN — parallel with [A]+[B]
  │       Update: local ~/.supabase, CI if applicable
  │       Verify: supabase CLI commands succeed
  └─ [D] Rotate GITHUB_TOKEN — parallel with [A]+[B]+[C]
          Update: Vercel prod+preview, .env.local
          Verify: PubGuard GitHub analyzer returns data

Phase 2: P1 — application credentials
  ├─ [E] Rotate VERCEL_API_KEY + VERCEL_TOKEN
  │       Update: local env, CI vercel CLI steps
  │       Verify: vercel whoami, project ls
  ├─ [F] Remove ADMIN_KEY + ADMIN_SECRET_KEY from Vercel env (no rotation — dead config)
  └─ [G] Rotate ELEVENLABS_API_KEY (server) — after [A] completes
          Update: Vercel prod+preview, .env.local, qa-secrets.json
          Verify: chat session, document ingestion, provisioning scripts

Phase 3: configuration hygiene (parallel with any phase)
  └─ [H] Delete NEXT_PUBLIC_ELEVENLABS_API_KEY from Vercel env (no rotation needed — unused var)
          Verify: next build succeeds without it
```

**Dependencies summary:**
- [A] must complete before [G] (ElevenLabs scripts need both keys).
- All other steps are independent and can execute in any order or parallel.
- Phase 3 [H] can execute at any point — it removes dead configuration.

**Post-rotation full verification:**
1. Trigger a Vercel deployment from `main` (`e086205`) — must build and deploy successfully.
2. Smoke test: `/start` page loads, voice session starts, `/dashboard` renders authenticated content.
3. PubGuard scan: scan a GitHub repo — all analyzers return data.
4. CI: trigger `gate.yml` — must pass.
5. `scripts/provision-redteam-identity.mjs --qa-user --dry-run` succeeds.

---

## 7. What this document does NOT cover

- P2 credentials (ElevenLabs webhook signing secrets, provider keys for Gemini/Grok/Voyage/OpenAI, RESend key) — lower blast radius, rotate after P0/P1.
- Actual secret values — deliberately omitted; no value, partial value, hash, or token is printed anywhere in this document.
- Automatic rotation — all rotations require manual action and explicit authorisation.
