# Kira — Low-Level Design

**Audience:** an engineer who has read `docs/HLD.md` and now has to change something without
breaking it, or a technical reviewer checking that the claims in the HLD are actually implemented.

**How to read this:** each section states the contract, then the **invariants** — the properties
that must survive any future change. An invariant is not a style preference. Each one is here
because breaking it causes a specific, named failure.

**Status:** `main` as at 2026-08-18.

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
| Browser component | `lib/supabase/browser.ts` → `createClientV2()` (publishable key) | a service-role client |
| API route (write/admin) | `lib/supabase/server.ts` → `createServiceClientV2()` (secret key) | anon key |
| Server component / action (session) | `lib/supabase/server-session.ts` → `createSessionClientV2()` (publishable key) | service-role client |

**Invariant:** a missing `SUPABASE_SECRET_KEY` (API route) or `SUPABASE_PUBLISHABLE_KEY` (browser/server-session) **throws**. It must never silently fall back to legacy JWT credentials (`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — a write path that quietly degrades to legacy credentials fails in a way that looks like a data bug months later, far from the cause.

**Invariant (API Key Model — Target Architecture):** New code MUST use V2 clients (`createClientV2`, `createServiceClientV2`, `createSessionClientV2`). Legacy clients (`createClient`, `createServiceClient`, `createSessionClient`) are retained ONLY for unmigrated callers and MUST NOT be used in new code. The API Key Model (`sb_secret_` / `sb_publishable_`) is the target architecture. Phase 0 validation complete (Preview only); Production remains on legacy JWT pending explicit authorisation for full migration.

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

1. **Every tool webhook verifies `x-convai-tool-secret`.** Unverified → 401. This is the package's
   canonical header — Kira no longer defines a product-specific name, so nothing probing it needs to
   be told the header and `memory-loop.config.json` carries no override. The legacy
   `x-kira-tool-secret` is **not accepted**; it was removed once the audit showed zero callers on it
   (13/13 agents re-provisioned, all 41 Kira workspace tools migrated).

   ✅ **Fail-CLOSED** (corrected 2026-08-01 — this section previously said the opposite). An unset
   `KIRA_TOOL_WEBHOOK_SECRET` / `CONVAI_TOOL_SECRET` makes `requireToolSecret()` **throw**, so the
   route answers **500** and serves nothing; a caller presenting the wrong secret gets **401**. The
   two are deliberately different answers: a 401 tells an attacker they guessed wrong, a 500 tells
   the operator to fix their environment.

   The rollout-era fail-open behaviour (returning `true` when the secret was unset, so the guard
   could ship before every agent sent the header) is **gone**. It was the worst shape a security
   control can have — an environment that lost the variable lost the guard while every route kept
   answering 200, indistinguishable from the outside from one that was working. The doc outlived
   the fix by long enough to be the more dangerous artifact of the two: code that is safe and a
   document that says it isn't will eventually be reconciled in the wrong direction.

   `KIRA_TOOL_WEBHOOK_SECRET_PREVIOUS` accepts the outgoing value during a rotation and **must be
   deleted afterwards** — a "previous" that outlives its rotation is a second live credential
   nobody is tracking.
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
{ "webhookPath": "/api/kira/webhooks", "postCallPath": "/api/convai/webhooks/post-call",
  "memoryTable": "kira_memory", "conversationsTable": "conversations",
  "agentsTable": "kira_agents", "identityMode": "uid",
  "expectContinuity": true, "startRoute": "start_conversation" }
```

No `toolSecretHeader` — the probe uses the package's canonical `x-convai-tool-secret`.

Five runtime checks — save succeeds · recall finds it · a wrong secret is rejected (401) · a
different uid does **not** see the fact · a *new* conversation sees the previous one — plus a
static audit that the semantic write is wired, which the runtime probe structurally cannot observe
(the dual-write happens in the post-call path the probe never triggers).

**Invariant:** these run in CI, not on request. The probe previously existed and ran nowhere, and
the bug reached production twice. A product with genuinely no cross-session memory declares
`"semanticMemory": false` — **the omission is declared, never silent.**

**Also in `gate.yml`, and for the same reason:**

| Check | Asks |
|---|---|
| `check-app-chrome.mjs` | does every authenticated route render inside the app chrome? (§4) |
| `check-voice-reachable.mjs` | can an owner REACH the conversation from every authenticated route? (§6) |
| `check-design-tokens.mjs` | does UI code paint with tokens rather than raw hex? |

`check-voice-reachable.mjs` was added 2026-08-18 after the persistent mic was unmounted inside a
commit about something else, leaving six routes with no way to reach Kira at all — while the build,
the tests, the chrome check and every reachability probe stayed green and correct, because none of
them asked whether the PRIMARY INTERFACE was present. It scores an **embedded shape** separately
from a **text link**: satisfying §6 with a sentence pointing elsewhere is not the same as her being
on the page, and an earlier version that conflated the two reported a page as having a voice surface
while the operator was looking at one with none.

### 3.5 Where the shape is mounted — added 2026-08-18

Four distinct things share the word "widget", and conflating them has now cost real work. The
vocabulary is fixed in `CLAUDE.md`; the short version:

| Term | What it is |
|---|---|
| **Vendor embed** | ElevenLabs' `<elevenlabs-convai>` CDN element. **Not used here.** |
| **Transport component** | `@caistech/elevenlabs-convai/react`'s `VoiceWidget`. Portfolio-shared. A PART. |
| **The Kira shape** | The product surface composed from it: avatar, name, transcript, mic, text fallback, owner-gated signed URL. |
| **TalkFab** | A `<Link href="/talk">`. Navigation. **Unmounted 2026-08-18.** |

**`components/KiraShape.tsx`** (client) renders the shape; **`components/KiraShapeSection.tsx`**
(server) resolves the owner's agent and passes it in, so a page mounts her in one line and cannot
get the lookup subtly different from its neighbours.

Mounted on `/dashboard`, `/my-genome`, `/drafts`, `/requests`, `/knowledge`. `/settings` and
`/setup/*` opt out by name with a stated reason.

**Two invariants, both load-bearing:**

1. **Rendering is not connecting.** No `autoConnect`. She is visibly present; nothing is spent and
   no microphone is requested until the owner taps. A permission prompt on arrival reads, to this
   ICP, as an application that started listening to him.
2. **No agent is provisioned on page load.** An owner without one gets an honest "Set up Kira" in
   the same frame. Provisioning from a page VIEW would create real vendor resources from crawlers
   and double-renders, into a workspace shared by eleven products.

**The opener.** `buildGenomeOverviewFirstMessage` (`lib/kira/area-focus.ts`) primes her on
`/my-genome` — it names how many areas a buyer would ask about that she knows nothing about, offers
the worst one, and stops. It carries the **trigger only**; `area_agenda` is hers to call once he
picks, because this page renders once and the call runs twenty minutes. Without it she opens on
whatever was raised last, which is always the live job. When a page supplies an opener the
welcome-back banner is suppressed, so the screen cannot contradict the voice.

⚠️ **Observed live 2026-08-18** — she spoke the opener on the operator's own account ("four parts…
the biggest gap is who does the work"). What has NOT been observed is `area_agenda` firing after it.

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
   - a list re-import must not resurrect someone who opted out.
2. **Suppression is keyed by email, not user id.** Someone who unsubscribes, deletes their account
   and signs up again with the same address has still told us to stop.
3. **A bare `GET /unsubscribe` does not unsubscribe.** Mail clients and security scanners pre-fetch
   links; a mutating GET opts people out that no human ever clicked. Confirmation is a POST, which
   is also what RFC 8058 one-click uses.
4. **An invalid token returns a neutral 200.** "That address isn't on our list" turns the endpoint
   into an address oracle.
5. **Australia only.** `assertJurisdictionAllowed` hard-throws for non-AU recipients until that
   country's compliance is implemented. Email only - LinkedIn is not gated.

---

## 5B. Orchestrator Boundary — Suppression, Throttle, Owner Enrichment, Beta Codes

Kira's suppression, alert-throttle, owner-enrichment, and beta-code operations are mediated through
the Orchestrator at `https://connect.kiraexec.com`. Kira is an **unprivileged caller** — it does not
hold a Supabase service-role key for these capabilities.

**Migration status as at 2026-08-24 (stated, not implied):**

| Side | State |
|---|---|
| **Orchestrator endpoints** (§5B.2–5B.5) | LIVE and production-tested (commits `24e7f73`, `c420b3c` on branch `feat/microsoft-graph-files`). ⚠️ Branch and commits not yet pushed; prod was deployed from the local tree. |
| Kira beta-codes adapter (`lib/billing/beta-codes.ts`) | COMMITTED and pushed (`b69e577`), deployed with `main`. |
| Kira suppression adapter (`lib/email/suppressions.ts`) | In the working tree, uncommitted. E2E production verification recorded 24 Aug. |
| Kira throttle/owner adapters (`lib/email/unanswered-request.ts`) | Committed `b8f8fa3` (defect fixes applied: verdict-returning throttle claim, real escape entities, replyTo + transactional compliance on send). Not yet deployed. |
| `business_identity` RLS migration (`20260824100000_business_identity_rls.sql`) + session-client switch in `lib/business-identity/store.ts` | Both in the working tree, uncommitted. **Hard ordering constraint:** the migration must be applied to the Supabase project BEFORE this store change deploys, or every business-identity read/write returns zero rows/errors. Migration application to prod UNVERIFIED. |

### 5B.1 Caller identities

The Orchestrator enforces caller authentication via `ORCHESTRATOR_CALLERS` (JSON array of caller
records, stored as a Sensitive Vercel environment variable). Each caller record has:

```json
{
  "id": "string",
  "secret": "string",
  "tenants": ["string"]
}
```

Kira uses two distinct caller identities:

| Caller | Purpose | Secret (env var) | Orchestrator endpoints |
|---|---|---|---|
| `kira-webhook` | Suppression, alert throttle, owner enrichment | `ORCHESTRATOR_WEBHOOK_SECRET` | `/api/v1/kira/email/suppressions`, `/api/v1/kira/email/alert-throttle`, `/api/v1/kira/email/alert-owner` |
| `kira-public` | Beta-code operations (peek/claim/link/release) | `ORCHESTRATOR_PUBLIC_SECRET` | `/api/v1/kira/beta-codes` |

**Invariant:** `ORCHESTRATOR_WEBHOOK_SECRET` and `ORCHESTRATOR_PUBLIC_SECRET` are **never
interchangeable**. `kira-public` is rejected with 403 on `kira-webhook` endpoints.

### 5B.2 Suppression endpoint

**Kira adapter:** `lib/email/suppressions.ts` → `OrchestratorSuppressionStore`

Implements `@caistech/email-compliance`'s `SuppressionStore` interface:

```typescript
interface SuppressionStore {
  isSuppressed(email: string): Promise<boolean>;
  suppress(email: string, reason: 'unsubscribe'|'bounce'|'complaint'|'manual', detail?: string): Promise<void>;
  resubscribe?(email: string): Promise<void>;
}
```

**Orchestrator route:** `POST /api/v1/kira/email/suppressions`

| Action | Body | Semantics |
|---|---|---|
| `add` | `{ email, reason, detail? }` | Idempotent upsert on `email` (normalised: `trim().toLowerCase()`) |
| `remove` | `{ email }` | Delete by email |
| `check` | `{ email }` | Returns `{ isSuppressed: boolean }` |

**Authentication:** `x-orchestrator-secret: ORCHESTRATOR_WEBHOOK_SECRET` → `callerIs(auth, 'kira-webhook')`

**Persistence:** `email_suppressions` table in Kira Supabase project, accessed via Orchestrator's
`kiraClient()` (service-role client scoped to Kira project).

**Verification (24 Aug 2026):** End-to-end production test passed — unsubscribe token generation,
POST `/unsubscribe`, Orchestrator suppression add, and final check all returned expected results.

### 5B.3 Alert throttle endpoint

**Kira adapter:** `lib/email/unanswered-request.ts` → `claimThrottleDurable()`

**Orchestrator route:** `POST /api/v1/kira/email/alert-throttle`

```typescript
// Request
{ utterance: string }

// Response (success)
{ version: "1", allowed: true }

// Response (throttled)
{ version: "1", allowed: false, reason: "duplicate within the window" | "ceiling of 5 per 10m reached" }
```

**Semantics:**
- Dedupe key: `SHA256(utterance.trim().toLowerCase().slice(0, 500))`
- Window: 10 minutes
- Ceiling: 5 unique utterances per window
- Retention: 24 hours
- Atomic claim via `upsert(..., { onConflict: 'utterance_key' })`

**Kira fallback:** In-memory throttle (`function throttled()`) on Orchestrator error — blast-radius
reducer only, not authoritative.

### 5B.4 Owner enrichment endpoint

**Kira adapter:** `lib/email/unanswered-request.ts` → `resolveOwnerDurable()`

**Orchestrator route:** `POST /api/v1/kira/email/alert-owner`

```typescript
// Request
{ userId: string }

// Response
{ version: "1", owner: string | null }
```

**Semantics:** Fail-soft — returns `{ owner: null }` on any error (unknown UUID, DB down, etc.).
Looks up `users` table for `full_name` / `email`.

### 5B.5 Beta-code endpoint

**Kira adapter:** `lib/billing/beta-codes.ts`

**Orchestrator route:** `POST /api/v1/kira/beta-codes`

Supported actions: `peek`, `claim`, `link`, `release`.

**Authentication:** `x-orchestrator-secret: ORCHESTRATOR_PUBLIC_SECRET` → `callerIs(auth, 'kira-public')`

**Production verification (24 Aug 2026):** Caller authentication boundary confirmed — valid
`ORCHESTRATOR_PUBLIC_SECRET` with invalid action returned HTTP 400 (business validation reached);
invalid secret returned HTTP 401.

### 5B.6 Environment variables (Kira production)

| Variable | Purpose | Sensitivity |
|---|---|---|
| `ORCHESTRATOR_URL` | Orchestrator base URL (`https://connect.kiraexec.com`) | Sensitive (project policy) |
| `ORCHESTRATOR_WEBHOOK_SECRET` | `kira-webhook` caller credential | Sensitive |
| `ORCHESTRATOR_PUBLIC_SECRET` | `kira-public` caller credential | Sensitive |
| `UNSUBSCRIBE_SECRET` | HMAC secret for unsubscribe tokens (no service-role fallback) | Sensitive |

**Invariant:** `UNSUBSCRIBE_SECRET` **must be set explicitly**. No fallback to
`SUPABASE_SERVICE_ROLE_KEY`.

---

## 6. Valuation

`lib/valuation/`: `model.ts` (the computation), `sde-multiples.ts` (sector multiples),
`pricing.ts` (price from **reported profit** — see below), `share.ts` (the handoff).

⚠️ `pricing.ts` used to price from the **gap** and this document said so. It does not any more, and
the change is deliberate rather than incidental: pricing on the gap made the same tool both the
author of the number and the beneficiary of it being large. A tester in the ICP found it in about
ninety seconds — *"a number I like, that you've told me not to rely on, from a company that gets paid
more if the number is bigger."* The band now comes from the profit the owner **states**; the gap
appears only as a descriptive fraction.

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

### 6.2 The multiple band — resolved 2026-08-03/04

**This section previously said the re-weighting was unresolved and must not be "fixed" in passing,
because it would reprice numbers already shown to people. Both halves are now out of date.** It was
rebuilt, and there were no stored valuations to reprice — `business_valuations` is empty.

What was wrong (register A1–A4): the sector median was treated as a **floor** and then multiplied,
so the ceiling exceeded the cited BizBuySell range on size alone, the size adjustment only ever
ADDED, and the gap grew super-linearly with profit — overclaiming hardest for exactly the businesses
a broker would look at.

The correction rests on one fact in `sde-multiples.ts`: **the sector figure is a CENTRE, not a
floor** — the median of businesses that actually sold, at average readiness. So readiness now
interpolates from an absolute floor to the sector-scaled ceiling, and two quantities that had been
collapsed into one narrow band are separated:

| | |
|---|---|
| **Where you are** | the buyer's discount. Ranges widely. **Not our claim — the market's.** |
| **What Kira moves** | `SPREAD = 0.75` turns. Bounded. **Our claim, and deliberately small.** |

Documentation is worth roughly half a turn to a turn, showing up mostly as a discount NOT taken and
a shorter due diligence. It does not turn a 1.5× business into a 5× one; that needs a manager and
recurring contracts, which is a different business rather than a written-down one.

`MODEL_VERSION` is stamped on every snapshot. Operator decision 2026-08-04: **rescore everyone**
rather than freeze existing snapshots.

⚠️ **The landing figures are generated from this model and were left behind by it** — for two days
the page showed a gap of $438k where the model returned $195k, a 2.25× overstatement, with
walk-away and today matching to the dollar so nothing looked stale.
`lib/valuation/landing-example.test.ts` now computes the example and asserts both landing pages
carry what comes out. **Change the model and that test tells you which page to change.**

⚠️ **`sde-multiples.ts` is US BizBuySell data.** A Finn Group broker independently quoted 1–1.5× for
Australian trade businesses. Australian bands by niche are the highest-value outstanding input to
this model, and are a data change rather than a model change.

---

## 6A. The write-back — getting the manual out of us

Added 2026-08-05. Kira is sold as a project that finishes, and her extraction job is to make herself
redundant. That only means something if the knowledge lands somewhere the business keeps: until this
existed, every path terminated in our database, which for an owner is a worse place than his own head
because he cannot get it out without us.

**`lib/genome/render.ts` — pure.** Genome in, documents out. No database, no network, no
`server-only`, because the two things that must never regress are only testable if the module can be
called with a literal object:

1. **The private filter** reuses `buyerView` (moved to `lib/genome/buyer-view.ts` so `lib` does not
   import a route). It is NOT re-implemented — a second copy of a privacy filter is a second thing
   that can be wrong, and the first cost a handover carrying the owner's negotiating posture.
2. **Escaping is a security control.** Every string is the owner's own dictated text, in a document
   he hands to an advisor. Applied at every interpolation including the area key used as an element id.

**Block elements, not styled spans.** Presentation that depends on our CSS is presentation we do not
control: `<span>` with `display:block` renders correctly in a browser and is destroyed on import to
Google Docs, which produced *"…Lot 109 in Geraldton.stated 31 July 2026"* in the document a buyer
opens. Unit tests could not have caught it — the HTML was correct and the loss happened in Google's
importer.

**Two shapes from one source:** `renderAreas()` (one document per area — for a destination where each
is separately editable) and `renderSingleFile()` (one self-contained file — for download; nine files
in a zip is a worse artefact for a 66-year-old and his accountant).

**Three destinations, one of which needs nobody:**

| Path | Route | Notes |
|---|---|---|
| Download | `GET /api/genome/manual?audience=owner\|buyer` | **No default audience** — a default guessing "owner" files his position into a folder he then shares. Filename shouts which copy it is, because by the time he attaches it the banner inside is not on screen. |
| Owner's own storage | `file_manual` tool → `POST {orchestrator}/api/v1/tenants/:id/record` | Kira never learns the destination — that is the anti-lock-in guarantee. See orchestrator `docs/SYSTEM_OF_RECORD_PORT.md`. |
| Markdown / JSON | `GET /api/genome/export` | The pre-existing export; still there. |

**Idempotency is the caller's, deliberately.** Drive keys on id, not name, and matching on title
would break the moment the owner renames a document — which he is supposed to be able to do, because
it is his. So `drive_documents` maps `(user_id, audience, area_key, destination) → ref`. Audience is
in the key so the two renderings can never collide on one file. **Refs are stored even on a partial
run** — they are not a record of success, they are what stops the next attempt duplicating what did
land.

**Two guards, both server-enforced rather than asked for in the prompt** (`file_manual`'s route):
`audience` must be present, and `approved` must be **literally `true`** — not `!== false`, because an
absent field means she never asked and the point of the gate is that silence is a no.

---

## 6B. Genome scoring — the checklist, the assessment, and the second number

Design: `docs/SPEC_GENOME_CHECKLIST_AND_PATHWAYS.md`. Architecture: HLD §6.

### Modules

| File | Does |
|---|---|
| `lib/genome/checklist.ts` | 52 items over the nine areas. Each carries `required`, a `SubstanceTest`, a `factor` (or null) and `closes: fact\|document\|change`. **Data, not prose** — a disputed item is a config change and a re-score, never a rebuild. |
| `lib/genome/checklist-bands.ts` | Band from item status. `empty` / `thin` (any answered) / `building` (>half required) / `covered` (**all** required). ⚠️ A `weak` item counts as NOT answered. |
| `lib/genome/checklist-assess.ts` | One LLM call **per AREA**, not per entry — substance depends on everything he has said, and two entries can jointly answer an item neither answers alone. Degrades to all-open; never guesses `answered`. |
| `lib/valuation/evidenced-readiness.ts` | The arithmetic. Blends the baseline sub-score with the evidenced one in proportion to coverage. |
| `lib/valuation/recompute-readiness.ts` | The caller. Reads the valuation, re-derives the baseline factors from stored `inputs`, writes `readiness_now`. |
| `lib/genome/pathway.ts` | Gate 4. `evidencedItemKeys` is the scorer's only door and reads `evidencedAt` and nothing else. |
| `lib/kira/area-agenda.ts` + `area-agenda-tool-def.mjs` | The `area_agenda` tool — up to three outstanding questions, **weak first**. |
| `lib/kira/area-focus.ts` | The opener when he arrives from `/my-genome/[area]`. Carries the AREA only. |

### Four things that are not obvious and will be got wrong

1. **The factor map is per ITEM, not per area, and `factor: null` is the common case.** Nine areas do
   not map onto the model's five factors — owner-dependence is the *axis* (measured per area, not an
   area), and Assets and Compliance evidence none of them. Mapping per area forces you to pretend
   Assets moves the multiple. This is also what lets the panel say *"two of these move your number,
   the rest complete your handover document."*
2. **`readiness` is never recomputed in place.** It is the baseline he was shown when he paid.
   `recompute-readiness.ts` re-derives the five sub-scores by re-running `computeValuation` on the
   stored `inputs` (only the composite was ever persisted) and **self-checks**: if the recomputed
   composite no longer matches the stored one the model has moved, and it REFUSES — a delta that is
   partly evidence and partly a re-weighting cannot be separated afterwards.
   ⚠️ **Finiteness is checked BEFORE the drift comparison.** `Math.abs(a - b) > 0.005` passes
   silently on NaN, so a malformed `inputs` row would have read as "no drift" and written NaN.
   ⚠️ **`model_version` is on `valuation_snapshots`, not `business_valuations`** — selecting it here
   errors, and would surface only at runtime as "the number never moves".
3. **A plan moves nothing.** For `closes: 'change'` items only a milestone with `evidenced_at` set
   counts, and **partial progress counts for zero**: half a successor is not half a business that
   runs without him.
4. **All-open is what an OUTAGE looks like.** `computeEvidencedReadiness` treats a set with no
   verdict at all as *unassessed* and leaves the baseline alone; the assess action likewise stores
   nothing. Reading all-open as "everything is missing" would crater a valuation over a missing API
   key.

### Reaching the fleet

A prompt section added to `prompts.ts` changes what the NEXT agent is minted with and touches nothing
live. Tools flow through `scripts/reprovision-kira-agents.mjs` (which reads `toolDefsFor`, so a new
manifest entry is automatic); a prompt section needs its own additive patch script —
`scripts/patch-agent-area-work.mjs`, anchored at the confirmation heading, dry-run by default,
read-back after write, and it **refuses rather than appending** when the anchor is absent.

⚠️ **`setAgentTools` REPLACES the list.** Two pending fleet changes from different trees means
whoever reprovisions second drops the other's tools, and it looks exactly like a clean run.

⚠️ **Live prompts run ~2,600 characters LARGER than source** and that is expected: `confirmationSection`
and `KNOWLEDGE_BUILDING` were trimmed in source and trims only reach new agents. Never "fix" it by
regenerating a live prompt — that discards owner-specific context built at creation.

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
| Write-back | `drive_documents` (where each area of the manual lives in the owner's own storage — the idempotency map, §6A) |
| Genome scoring | `genome_item_status` (one verdict per owner per checklist item), `genome_pathways`, `genome_pathway_milestones` (§6B) |
| Commercial | `business_valuations` (⚠️ `readiness` = frozen baseline; `readiness_now` = evidenced, §6B), `beta_trials`, `beta_usage`, `stripe_webhook_events`, `loi_commitments` |
| Channel | `introducers`, `introducer_magic_links`, `introductions`, `attribution_overrides`, `advisor_enquiries` |
| Email | `email_logs`, `email_suppressions` |
| Observability | `voice_connect_events` (§3.6 — one row per voice connection attempt) |
| PubGuard | `pubguard_scans`, `pubguard_reports` |

**Invariants**

1. **RLS is enabled on every table.** Never commented out, never disabled "temporarily".
2. **Migrations are idempotent** (`IF NOT EXISTS`, guarded `ALTER`) and applied via CLI.
3. **Verify the linked project ref before every `db push`.** The portfolio runs several live
   Supabase projects and a migration pushed to the wrong one may not error — it just lands in the
   wrong place.
4. **Columns are `snake_case`; TypeScript is `PascalCase`/`camelCase`.** Dual naming is accepted
   only at the API boundary and normalised immediately inside it.
5. **Genome tables key on `users.id`, NEVER `auth.users.id`.** Every agent / conversation /
   `kira_memory` row references `users.id` (see `20260720100000_auth_link.sql`), and the Genome is
   derived by app user id throughout. A table keyed the other way joins to nothing and its RLS
   silently matches no rows — caught in review on `genome_item_status`, which was drafted against
   `auth.users` and would have returned an empty panel to every owner forever.

### 3.6 Voice-connect telemetry — added 2026-08-18

A voice connection is the one step in this product that fails on the CLIENT, in someone else's
browser, on someone else's network. Everything else leaves a server-side row; this left nothing. A
beta tester granted his microphone, saw "Not connected", and gave up — and by the time he described
it the runtime logs had rolled past (retention reaches roughly ninety minutes). Three sessions went
on reconstructing one sentence from an email, and the answer was still a guess.

`voice_connect_events` — `user_id` (null before sign-in, deliberately: an anonymous visitor who
cannot connect is a lost visitor), `surface`, `outcome`
(`connected` | `signed_url_failed` | `error` | `stalled`), `detail`, `reachable`, `user_agent`.

⚠️ **`reachable` is the column it was built for.** On failure the browser probes ElevenLabs
directly. `false` means that network cannot reach the vendor at all — a corporate proxy or
firewall, nothing fixable here. `true` on a failure means it reached the vendor and still failed,
which is ours. Without that one bit every future report is the same unresolvable argument.

`connected` is recorded on purpose: a table holding only failures cannot answer "how often", and
three failures mean something different at thirty attempts than at three.

Contract: fire-and-forget, never blocks or throws on the connect path; the detail string is redacted
**on both sides** (the signed URL carries a conversation signature and must never land in a row);
identity is derived from the session, never from the payload; the route always answers 204, because
it is called immediately after something already failed.

Read it with `scripts/voice-connect-report.mjs` — written at the same time as the writer, since a
table nothing reads is storage rather than observability.

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
- [ ] **Touched `prompts.ts` or `tool-manifest.mjs`? A source change reaches NO live agent.** Tools
      need `reprovision-kira-agents.mjs`; a prompt section needs its own additive patch script. Then
      read one agent back by hand — a tool-less agent looks completely normal
- [ ] **Added a prompt section? It is a raise, and `prompt-size.test.ts` will say so.** The answer is
      the relocation tranche, not a bigger ceiling: move tool-usage prose onto the tool description
      she reads at the moment of choosing, and ratchet the ceiling DOWN by what you saved
- [ ] **Wrote a guard with a numeric comparison? Prove it can fire on the worst input.**
      `Math.abs(a - b) > threshold` passes silently on NaN, because every comparison with NaN is
      false. A guard that cannot fail on garbage is not a guard
- [ ] **Built something with tests and no caller?** Grep for the **importer**, not the export. A
      component nothing renders, an optional field no caller sets and a branch nothing reaches are
      all invisible to tsc, vitest and the build — this is the repo's most common defect class

**The rule that generates most of the above:** if a shared `@caistech/*` package covers what you
are about to write, consume it. A local copy is not a shortcut — it is the defect the next person
inherits.
