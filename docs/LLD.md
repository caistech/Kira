# Kira — Low-Level Design

**Audience:** an engineer who has read `docs/HLD.md` and now has to change something without
breaking it, or a technical reviewer checking that the claims in the HLD are actually implemented.

**How to read this:** each section states the contract, then the **invariants** — the properties
that must survive any future change. An invariant is not a style preference. Each one is here
because breaking it causes a specific, named failure.

**Status:** `main` as at 2026-07-27.

---

## 1. Stack and layout

Next.js 16 (App Router) · TypeScript · Tailwind · Supabase · ElevenLabs · Stripe · Resend, on
Vercel.

```
app/
  (public)          landing · business-valuation · plan · advisors · privacy · terms · unsubscribe
  talk chat dashboard knowledge settings      the owner's product
  admin/            operator console          gated by middleware + ADMIN_EMAILS
  introducer/       channel portal            gated by a signed cookie
  api/              ~45 route handlers        see §3
lib/
  kira/             voice agent, memory, knowledge, swarm       the core
  billing/          Stripe mode, trial gate, subscription adapter
  introducer/       magic links, attribution, owner projection
  email/            sender identity, commercial sends, suppression
  valuation/        the model, sector multiples, pricing, handoff
  supabase/         browser · server (service role) clients
supabase/migrations/   the ONLY migrations that run
```

### Supabase client selection — invariant

| Context | Use | Never |
|---|---|---|
| Browser component | `lib/supabase/browser.ts` | a service-role client |
| API route (write/admin) | `lib/supabase/server.ts` → `createServiceClient()` | anon key |

**Invariant:** a missing `SUPABASE_SERVICE_ROLE_KEY` **throws**. It must never silently fall back
to the anon key — a write path that quietly degrades to anon permissions fails in a way that looks
like a data bug months later, far from the cause.

---

## 2. Identity and authorisation

### 2.1 The four identities

Enforced in `middleware.ts`, plus per-route checks.

```
/admin/*         Supabase session  AND  email ∈ ADMIN_EMAILS      → else redirect
/introducer/*    valid signed introducer cookie                   → else /introducer/expired
/talk /chat …    Supabase session                                 → else /login
everything else  public
```

**Invariants**

1. **`ADMIN_EMAILS` is checked at the callback, after authentication — never at the form.** A
   non-admin who can authenticate must be *rejected*, not *hidden from*. Gating the form only
   hides the door.
2. **The QA user identity is never in `ADMIN_EMAILS`.** `QA_TEST_USER_EMAIL` must fail to reach
   `/admin`; that failure is itself a test. A test identity in the admin set is a real security
   defect, not a test-config convenience.
3. **No route or flag may skip authentication.** There is no test bypass and none may be added —
   it would be a critical vulnerability of the same severity as an unguarded endpoint.

### 2.2 Introducer sessions

Introducers hold **no Supabase account**. Flow:

```
issueMagicLink(introducerId)
  → 32 random bytes, base64url
  → store only the HASH in introducer_magic_links, with expires_at (7 days)
  → return the plaintext token once, in the URL

/introducer/enter/<token>
  → hash, look up, reject if unknown | revoked | expired | introducer suspended
  → set the session cookie
```

**Invariants**

1. **Only the hash is stored.** A database read must not yield working credentials.
2. **Every failure mode returns the same result** — `resolveMagicLink` returns `null` for unknown,
   expired, revoked and suspended alike, and all four land on one page with one message.
   Distinguishing them tells an attacker which tokens exist.
3. **The role model is re-checked at session open.** If `canViewContent(role)` is ever true for an
   introducer, the session is refused outright. Belt and braces against a future change to the
   shared role model quietly widening access.

### 2.3 The owner projection

`ownerProjection(introducerId)` returns referral **status only**. The restriction lives in a
database projection, not in the route.

**Invariant:** conversation content, valuation figures and owner contact details must never be
reachable through an introducer path. Because the boundary is in SQL, a future UI change cannot
widen it by accident. The privacy policy states this as *fact*, which it can only do while this
holds.

---

## 3. The voice + memory subsystem

The most safety-critical part of the codebase.

### 3.1 Provisioning

One ElevenLabs agent per user, via `ensureUserAgent` from `@caistech/elevenlabs-convai`. Idempotent
— safe to call on every page load. Binding row in `kira_agents`.

**Why one agent per user, and not one shared agent:** ElevenLabs **does not pass the conversation
id to server-tool webhooks.** The agent sends only the parameters its language model chose to fill
in. So there is nothing trustworthy in the request that identifies the caller — the owner must be
fixed at *provisioning* time and baked into the tool URLs (`?uid=<user>`).

This is worth stating plainly because a direct-call test **hides the bug**: the test supplies a
conversation id, so identity resolution appears to work, and then fails in every real call. That
mistake cost weeks.

### 3.2 Webhook routes

Mounted under `/api/kira/webhooks/*`:

| Route | Purpose |
|---|---|
| `start_conversation` | open a conversation, recall prior memory into context |
| `recall_memory` | mid-call recall |
| `save_memory` | mid-call capture |
| `save_message` | transcript capture |
| `update_topic` | topic tracking |
| `search_knowledge` | retrieval over the owner's uploaded documents |
| `dispatch_task` / `approve_task` | the swarm's do-work path |
| `post-call` | distil + persist (`/api/convai/webhooks/post-call`) |

**Invariants**

1. **Every tool webhook verifies `x-kira-tool-secret`.** Unverified → 401. Kira uses a
   product-specific header name rather than the package default, so anything probing this must be
   told the header (`memory-loop.config.json` carries it).

   ⚠️ **Read this before changing it.** `toolSecretOk()` is **fail-OPEN when
   `KIRA_TOOL_WEBHOOK_SECRET` is unset** — it returns `true`. That was deliberate for rollout: the
   guard had to be deployable before every agent had been re-provisioned to send the header, and
   the alternative was 401ing live agents mid-call. It is **active in production** (the CI probe
   asserts a wrong secret is rejected with 401, and it passes), but the *code* does not enforce
   it. An environment that loses the variable loses the guard silently.

   This is interim. `@caistech/elevenlabs-convai` ≥0.6.0 now offers `toolSecret` natively, so the
   durable fix is to move onto it and make the check fail-closed. Until then, treat "the secret is
   set in every environment" as an operational requirement, not a code guarantee.
2. **The post-call webhook verifies its HMAC.** Unsigned → 401.
3. **Identity is server-derived on every path.** `start_conversation` resolves from the agent
   binding; `save`/`recall` derive from the conversation row. **No path may accept a
   caller-supplied `user_id`.**

### 3.3 The post-call pipeline

```ts
completeConversationMemory(sb, {
  conversationId, elevenlabsConversationId, userId,
  extract: memoryExtractor,
  tables: KIRA_CONVAI_TABLES,
  semantic: { scopePrefix: 'kira-user-' },   // ← FROZEN
})
```

One canonical call does distil → dedupe → persist to `kira_memory` → index into Mnemo.

**Invariants**

1. **`scopePrefix` is frozen at `kira-user-`.** Every stored fact is keyed by it. Change it and
   every prior memory is orphaned — present in the index, unreachable by recall.
2. **Distilled results only.** No transcripts, no raw personal data leaves our infrastructure.
3. **Mnemo is never the authority.** Supabase holds the fact; Mnemo indexes it. Mnemo unavailable
   degrades recall quality and loses nothing.
4. **Memory failures are logged, never thrown.** A failed persist must not break the call the owner
   is having.

### 3.4 CI verification

`memory-loop.config.json` drives a probe on every push:

```json
{ "webhookPath": "/api/kira/webhooks", "memoryTable": "kira_memory",
  "expectContinuity": true, "startRoute": "start_conversation",
  "toolSecretHeader": "x-kira-tool-secret" }
```

Five runtime checks — save succeeds · recall finds it · a wrong secret is rejected (401) · a
different uid does **not** see the fact · a *new* conversation sees the previous one — plus a
static audit that the semantic write is wired, which the runtime probe structurally cannot observe
(the dual-write happens in the post-call path the probe never triggers).

**Invariant:** these run in CI, not on request. The probe previously existed and ran nowhere, and
the bug reached production twice. A product with genuinely no cross-session memory declares
`"semanticMemory": false` — **the omission is declared, never silent.**

---

## 4. Billing

`@caistech/subscription-billing` over Stripe.

### 4.1 Mode switching

```
STRIPE_LIVE_MODE unset | "false"  → STRIPE_SECRET_KEY_TEST  + STRIPE_WEBHOOK_SECRET_TEST
STRIPE_LIVE_MODE == "true"        → STRIPE_SECRET_KEY_LIVE  + STRIPE_WEBHOOK_SECRET_LIVE
```

**Invariants**

1. **Test is the default**, including when the variable is absent. Taking real money must require
   an explicit act.
2. **`STRIPE_LIVE_MODE=true` with `STRIPE_SECRET_KEY_LIVE` unset throws.** It must never fall back
   to a test key — a live checkout silently running in test mode takes an order and no money.
3. **Live and test keys occupy different variables.** Putting a live key in the test slot is caught
   by the guard rather than discovered in reconciliation. (This exact mistake has been made once,
   and the guard caught it.)

### 4.2 Webhook lifecycle

`stripe_webhook_events` gives idempotency on `event.id`; `last_stripe_event_at` guards
out-of-order delivery.

**Invariant:** a **failed** apply *releases* its idempotency claim. Otherwise Stripe's retry — the
mechanism that exists to recover from exactly that failure — is discarded as a duplicate, and the
subscription silently never activates.

### 4.3 Trial and fair use

`@caistech/beta-gate`: 30-day trial, a **$20 cost cap** on voice, warning at 80%.

**Invariant:** voice cost is accrued **after** the call, and only ever recorded. A cap must never
cut someone off mid-sentence; it warns.

---

## 5. Email

### 5.1 Sender identity

One source: `lib/email/sender.ts` over `senderFromEnv` from `@caistech/email-compliance`, reading
the portfolio-canonical `EMAIL_SENDER_*` variables.

**Invariant:** two failure modes, deliberately different.

- **Send paths throw** when identity is unset. A commercial email without identification is a
  breach of the Spam Act — it must not go out.
- **Render paths degrade** (`senderIdentityOrNull`). Refusing to show someone their unsubscribe
  confirmation because an operator forgot an environment variable punishes the recipient for our
  mistake.

### 5.2 Commercial vs transactional

| | Footer | Unsubscribe | Suppression checked |
|---|---|---|---|
| **Commercial** (campaign, re-engagement) | required | required | **yes — before send** |
| **Transactional** (receipt, reset, magic link) | required | no | no |

**Invariants**

1. **The suppression list is consulted before every commercial send**, and suppression is a *state*
   — a list re-import must not resurrect someone who opted out.
2. **Suppression is keyed by email, not user id.** Someone who unsubscribes, deletes their account
   and signs up again with the same address has still told us to stop.
3. **A bare `GET /unsubscribe` does not unsubscribe.** Mail clients and security scanners pre-fetch
   links; a mutating GET opts people out that no human ever clicked. Confirmation is a POST, which
   is also what RFC 8058 one-click uses.
4. **An invalid token returns a neutral 200.** "That address isn't on our list" turns the endpoint
   into an address oracle.
5. **Australia only.** `assertJurisdictionAllowed` hard-throws for non-AU recipients until that
   country's compliance is implemented. Email only — LinkedIn is not gated.

---

## 6. Valuation

`lib/valuation/`: `model.ts` (the computation), `sde-multiples.ts` (sector multiples),
`pricing.ts` (price from the gap), `share.ts` (the handoff).

### 6.1 The handoff — invariant

The valuation travels between `/business-valuation` and `/plan` in **`sessionStorage`**, never in
the URL.

It previously rode in `/plan?v=<base64>`. base64 is an *encoding*, not encryption — so the owner's
turnover, profit and owner-dependence sat in browser history, in the `Referer` header of every
outbound click, in server and proxy logs, and in the email chain the moment someone forwarded it to
their accountant.

- `sessionStorage`, not `localStorage`: this is a handoff, not a document. `localStorage` leaves
  someone's turnover on a shared machine with nothing to clear it.
- Legacy `?v=` links are still **read**, then re-parked and the query stripped, so an old link stops
  leaking the moment it is opened.
- Accepted cost: opening `/plan` in a **new tab** loses it and asks for the valuation again.

### 6.2 Known open issue

`readiness` is a weighted average (owner-dependence 3, systems 2, recurring 2, concentration 1.5,
growth 1.5). `i_am_the_business` scores 0, but the other four carry 7 of 10 — so someone who says
the business collapses without them can still reach the **"high"** band and be told *"a buyer can
largely see how this business runs without you"*, while the weakness line built from the same
answer says *"the business runs on you."*

**This is unresolved and needs an operator decision**, because the honest fix (re-weighting) is a
*repricing* of numbers already shown to people. Do not silently "fix" it in passing.

---

## 7. Data model

Principal tables (`supabase/migrations/` is the **only** canonical location — the file at
`app/api/pubguard/v2/supabase-migration.sql` is superseded and must not be run).

| Group | Tables |
|---|---|
| Identity | `users`, `client_profiles`, `setup_sessions` |
| Voice + memory | `kira_agents`, `conversations`, `conversation_messages`, `kira_memory`, `kira_logs` |
| Knowledge | `kira_knowledge`, `kira_knowledge_chunks` (pgvector), `knowledge_files`, `knowledge_urls` |
| Work | `kira_tasks`, `kira_drafts`, `kira_research_sessions` |
| Commercial | `business_valuations`, `beta_trials`, `beta_usage`, `stripe_webhook_events`, `loi_commitments` |
| Channel | `introducers`, `introducer_magic_links`, `introductions`, `attribution_overrides`, `advisor_enquiries` |
| Email | `email_logs`, `email_suppressions` |
| PubGuard | `pubguard_scans`, `pubguard_reports` |

**Invariants**

1. **RLS is enabled on every table.** Never commented out, never disabled "temporarily".
2. **Migrations are idempotent** (`IF NOT EXISTS`, guarded `ALTER`) and applied via CLI.
3. **Verify the linked project ref before every `db push`.** The portfolio runs several live
   Supabase projects and a migration pushed to the wrong one may not error — it just lands in the
   wrong place.
4. **Columns are `snake_case`; TypeScript is `PascalCase`/`camelCase`.** Dual naming is accepted
   only at the API boundary and normalised immediately inside it.

---

## 8. The introducer self-serve link

`app/introducer/expired/actions.ts` — a public, unauthenticated endpoint that emails a sign-in
link. Two things it must never become:

**Not an email oracle.** The response is byte-identical for unknown, suspended and valid addresses,
with randomised delay so timing does not reconstruct the distinction. Introducers are named brokers
with commercial relationships to their own clients; "is X signed up with Kira" is not ours to
confirm to whoever types an address.

**Not a mailbomb.** A per-address cooldown (`introducers.last_link_sent_at`, 5 minutes) — anyone
can post any address, so each accepted request mails someone who may not have asked.

**Invariant:** the cooldown lives in the **database**, not in process memory. Vercel gives each
lambda its own memory; an in-process limiter limits one instance and lets every other one through.

---

## 9. Environment variables

Required in production:

```
NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY · SUPABASE_SERVICE_ROLE_KEY
ELEVENLABS_API_KEY · ELEVENLABS_WEBHOOK_SECRET · KIRA_TOOL_WEBHOOK_SECRET
STRIPE_LIVE_MODE · STRIPE_SECRET_KEY_TEST/_LIVE · STRIPE_WEBHOOK_SECRET_TEST/_LIVE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RESEND_API_KEY · UNSUBSCRIBE_SECRET · CRON_SECRET
EMAIL_SENDER_NAME/_EMAIL/_ABN/_POSTAL/_PHONE      (portfolio-canonical)
MNEMO_API_KEY · ADMIN_EMAILS · NEXT_PUBLIC_APP_URL · ABR_GUID
```

**Invariants**

1. **No secret carries a `NEXT_PUBLIC_` prefix.** Only the Supabase anon key and the Stripe
   publishable key use it. That prefix ships the value to every browser.
2. **Secrets are marked `sensitive` on Vercel, production + preview only — never `development`.**
3. **No fallback strings for secrets, ever.** `|| 'fallback'` on a webhook secret converts an
   authentication failure into an open endpoint.
4. **`KIRA_TOOL_WEBHOOK_SECRET` must be set in every environment.** The guard it drives is
   fail-open when it is missing (§3.2) — losing the variable loses the protection without any
   error. This is the one place where an unset variable is more dangerous than a wrong one.

---

## 10. Changing this system safely

Before a change ships:

- [ ] `npx tsc --noEmit` clean, lint 0 errors, `npm run build` compiles
- [ ] Touched the memory loop? The five-check probe passes against the deployment
- [ ] Touched voice? `/voice-auditor`, both user and admin surfaces
- [ ] Touched a shared package? **Every consumer reconciled** — a shared bump made in isolation
      breaks consumers, hides new data behind un-updated UI, or 500s writes against a schema that
      lacks the column
- [ ] Touched UI? Verified at 375px **and** 1440px, tap targets ≥44px, body text ≥16px
- [ ] Touched email? Commercial sends carry the footer and consult suppression
- [ ] Migration written idempotent, and the **linked project ref verified** before push
- [ ] Fixed a bug? Recorded in the bug-knowledge protocol so the next occurrence is one search away

**The rule that generates most of the above:** if a shared `@caistech/*` package covers what you
are about to write, consume it. A local copy is not a shortcut — it is the defect the next person
inherits.
