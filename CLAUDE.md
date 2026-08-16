# CLAUDE.md — Kira

## Global Guardrails

Global Corporate AI Solutions standards apply:
→ `~/.claude/CLAUDE.md`

Read that file first. Everything below is additive and project-specific.

---

## Risk Tier: STANDARD

Standard workflow contract applies. Flag regressions immediately. Faster iteration is
acceptable but patch-on-patch commits are not — fix the root cause.

---

## Project Purpose

Kira is a Next.js 16 AI voice agent platform with two verticals:
1. **Kira Core** — personalised AI life coach (ElevenLabs ConvAI + Supabase memory)
2. **PubGuard** — security scanning tool for writers/developers/users/analysts

Stack: Next.js 16 + TypeScript + Tailwind + Supabase + ElevenLabs + Stripe + Resend

---

## Architecture Patterns (follow these; do not introduce new ones)

### Supabase Clients
- **Browser components** → `lib/supabase/browser.ts` (`createBrowserClient` from `@supabase/ssr`)
- **API routes (write/admin)** → `lib/supabase/server.ts` (`createServiceClient` — service role)
- **PubGuard reads/writes** → `lib/pubguard/supabase.ts` (`getSupabaseClient`)
- **Never** fall back from service role key to anon key silently — throw if env var missing

### API Routes
- All routes are in `app/api/` — Next.js App Router convention
- Server components by default; client components only for voice widget and interactive UI
- Webhook routes must verify signatures before processing payload — no signature = reject

### ElevenLabs Integration
- Agent creation: `lib/supabase/client.ts` → `createKiraTools()`
- Webhook handling: `app/api/kira/webhook/route.ts` (HMAC-verified)
- PubGuard voice agent: `app/api/pubguard/webhook/route.ts`
- Central router: `app/api/webhooks/elevenlabs-router/route.ts`

### PubGuard Scan Pipeline
1. `POST /api/pubguard/v2/scan` → orchestrates all analyzers
2. Analyzers in `app/api/pubguard/v2/analyzers/` — one file per data source
3. Scoring in `app/api/pubguard/v2/scoring.ts`
4. Persistence via `lib/pubguard/supabase.ts::saveScanToSupabase()`
5. Voice formatting in `app/api/pubguard/webhook/route.ts::formatForVoice()`

### Database Migrations
- **Canonical location:** `supabase/migrations/` — these are the only files to run
- `app/api/pubguard/v2/supabase-migration.sql` is SUPERSEDED — do not run or modify
- All tables must have RLS enabled — never comment out RLS lines

---

## Security Rules (project-specific)

1. **Webhook secrets** — Never use `|| 'fallback-string'` for secrets. Throw at startup if missing.
2. **Supabase keys** — Service role key is required for write routes. No silent anon-key fallback.
3. **In-memory state** — `conversationState` Map in `app/api/pubguard/webhook/route.ts` and
   session state in `app/api/kira/setup-tools/route.ts` are documented as temporary. Before
   adding new in-memory state, check whether Supabase or a Redis-compatible store should be used.
4. **`NEXT_PUBLIC_` prefix** — Only anon Supabase key and Stripe publishable key use this prefix.
   Never prefix service role keys, private API keys, or webhook secrets with `NEXT_PUBLIC_`.

---

## Naming Conventions

- Database columns: `snake_case`
- TypeScript interfaces and types: `PascalCase`
- API request/response body fields: accept both `camelCase` and `snake_case` only at the API
  boundary (`save/route.ts` pattern) — internally normalise to `camelCase` immediately
- No dual-naming in internal code — pick one convention per function boundary

---

## Commit Discipline

- Commit messages must be descriptive: `fix webhook` is not acceptable; `fix: PubGuard webhook missing userId in tool_call state lookup` is.
- No "FIXED:" annotations in file headers — put the explanation in the commit message.
- No in-progress notes in code comments that survive into main (`// replace with Redis`
  is acceptable as a code comment; `// FIXED: Now passes userId` is not — delete it).

---

## Known State (as of 2026-08-16)

- **~1,220 automated tests across ~108 files.** ⚠️ A previous version of this section said *"No
  automated tests exist"* and stayed there for four months. It was true in April and became the most
  misleading line in the file — a fresh session read it and reasonably concluded the repo had no
  safety net. **Re-read this block before trusting it; date-stamped claims rot silently.**
- **Two live-network test files are flaky, not broken** — the Stripe billing integration (45s
  timeouts) and a Supabase token test. Both pass on re-run. Confirm a failure repeats before
  chasing it.
- **A source change to `lib/kira/prompts.ts` or `lib/kira/tool-manifest.mjs` reaches NO live agent.**
  Tools need `scripts/reprovision-kira-agents.mjs`; a prompt section needs its own additive patch
  script. Live prompts run ~2,600 chars larger than source (two sections were trimmed in source and
  trims only reach newly-minted agents) — that is expected, not drift to repair.
- **`readiness` is the frozen baseline; `readiness_now` is the evidenced figure.** Never recompute
  the first in place. See LLD §6B.
- **The Genome captures project activity more readily than business structure.** On the operator's
  own account: 96 filed memories, and six of nine areas hold nothing that answers a buyer question.
  The `area_agenda` tool + the `## WORKING ON ONE PART OF THE BUSINESS` prompt section are the fix,
  shipped 2026-08-16 and **not yet walked by a human**.
- `conversationState` in `app/api/pubguard/webhook/route.ts` is in-memory and not production-safe
  for multi-instance deployments. Replace with Supabase when load warrants it.
- `app/api/pubguard/v2/supabase-migration.sql` has RLS commented out — do not run this file.
- Dual migration files exist for `pubguard_scans` — canonical is `supabase/migrations/`.

## Environment Variables (required in Vercel)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          ← required; never fall back to anon key
ELEVENLABS_API_KEY
ELEVENLABS_WEBHOOK_SECRET          ← required; never use a hardcoded fallback
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
GITHUB_TOKEN                       ← for PubGuard GitHub analysis
SHODAN_API_KEY                     ← for PubGuard infrastructure scanning
SERPER_API_KEY                     ← for PubGuard news/social signals
PLATFORM_TRUST_SUPABASE_URL        ← optional; Platform Trust integration
PLATFORM_TRUST_SERVICE_KEY
PLATFORM_TRUST_PROJECT_ID
NEXT_PUBLIC_APP_URL
```
