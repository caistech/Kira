# Kira — Low-Level Design

**Audience:** an engineer who has read `docs/HLD.md` and now has to change something without
breaking it, or a technical reviewer checking that the claims in the HLD are actually implemented.

**How to read this:** each section states the contract, then the **invariants** — the properties
that must survive any future change. An invariant is not a style preference. Each one is here
because breaking it causes a specific, named failure.

**Status:** `main` as at 2026-10-02. Added this revision for development-team handover: §2.0
(canonical identity), §3.2 invariant 4 (webhook identity), §7 corrections, §9 (complete environment
variables), §11 (development workflow), §12 (operations). Corrected: §3.1 turn-taking, §3.2 route
table, §7 invariant 5, §9 invariant 4 — each had drifted from the code.

---

## 1. Stack and layout

Next.js 16 (App Router) · TypeScript · Tailwind · Supabase · ElevenLabs · Stripe · Resend, on
Vercel.

```
app/
  (public)          landing (app/page.tsx — the 3-variant front door, §1A)
                    · business-valuation · plan · advisors · privacy · terms · unsubscribe
                    · consultant-preview (landing-variant preview)
  talk chat dashboard knowledge settings      the owner's product
  my-genome drafts requests genome-knowledge  the owner's product (continued)
  manage/             org management (members, invitations, settings)
  admin/            operator console          gated by middleware + ADMIN_EMAILS
  distributor/      distributor management portal
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

**Invariant:** a missing `SUPABASE_SECRET_KEY` (API route) or `SUPABASE_PUBLISHABLE_KEY` (browser/server-session) **throws**. It must never silently fall back to legacy JWT credentials (`SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — a write path that quietly degrades to legacy credentials fails in a way that looks like a data bug months later, far from the cause.

**Invariant (API Key Model — Target Architecture):** New code MUST use V2 clients (`createClientV2`, `createServiceClientV2`, `createSessionClientV2`). Legacy clients (`createClient`, `createServiceClient`, `createSessionClient`) are retained ONLY for unmigrated callers and MUST NOT be used in new code. The API Key Model (`sb_secret_` / `sb_publishable_`) is the target architecture. Phase 0 validation complete (Preview only); Production remains on legacy JWT pending explicit authorisation for full migration.

---

## 1A. The landing surface — the front door

`app/page.tsx` is a thin dispatcher. It decides which of three maintained landing components to
render, carries the beta-code arrival, and otherwise adds nothing — the landing itself is the
component.

```
NEXT_PUBLIC_LANDING_VARIANT  (unset) → "consultant"   LandingConsultant   PRIMARY since 2026-09-10
                                  "new" →              LandingNew         owner-facing rebuild
                               "classic" →            LandingClassic     previous safe default
```

Module-scope constant in `app/page.tsx`; compared as a string, so a misspelled value falls through
to the consultant default rather than half-enabling anything. Must be `NEXT_PUBLIC_` — the value is
read in the browser.

**Invariants**

1. **All three variants share the same link surface.** Each routes to exactly
   `/business-valuation`, `/sample-genome`, `/login`, `/signup`, `/privacy`, `/terms` (plus the
   in-page anchors they declare). A variant must NOT invent a route or a fake phase in the journey —
   the valuation is the converge point for every hero.
2. **The beta code is carried, never consumed, on the landing.** `BetaCodeCarrier`
   (`components/BetaCodeCarrier.tsx`) reads `?code=` and parks it in `sessionStorage` under
   `kira_beta_code`; redemption happens only at `/plan` at the BetaRedeem step. Parking is
   context, not redemption — nothing on the landing validates it. A code is bound to one email and
   single-use, so holding it in the tab is safe.
3. **The landing voice widget writes nothing to a person's Genome.** It answers from
   `/api/kira/ask` and is safe to submit junk into. Do NOT add the `@accepts-input`
   marker to `/signup` or the auth pages — the portfolio audit really submits against production
   on every push.
4. **The headline figures are pinned, not remembered.** `lib/valuation/landing-example.test.ts`
   and `lib/valuation/headline-numbers.test.ts` compute the example from the model and assert each
   landing shows `$220k · $626k · $821k` and the $195k gap, and reference
   `HEADLINE_NUMBERS` rather than restating the labels. Changing the model is allowed; changing a
   landing and leaving it behind is not (this is the guard the 2026-08-04 2.25× gap overstatement
   exists for). A new landing variant MUST be added to both test surfaces.
5. **The consultant page is a variant, not a divergence.** It reuses the exact link set, the same
   voice assembly, the same pricing primitives (`PRICE_TIERS`, `FULL_RATE_PERIOD_CAP`,
   `formatPrice`) and the same `ADVISOR_FAQ`. Positioning copy differs; structure and shop-window
   facts do not.

### 1A.1 Guest vs invited experience

An invited tester arrives at `/?code=…`. BetaCodeCarrier parks the code; the chosen variant renders;
the tester walks valuation → confirm name → the sandbox org as CEO. Under the consultant default,
the door speaks to the adviser (the BBBO mission, the ecosystem, "what's in it for me") and the
journey behind it is the owner's. That split — consultant-flavoured door, owner-flavoured product —
is deliberate and is what the beta invitation emails describe. `/consultant-preview` exists only as
a deployable preview of the consultant variant; it is not part of the main visitor journey.

### 1A.2 Testing and verification

The `@public-route` marker on `app/page.tsx` feeds the portfolio-gate's public-route and
first-paint audits; the `@accepts-input open=".convai-btn"` marker feeds the landing-audit that
really submits against production every push. Both apply to whatever variant is selected at deploy
time, because the marker lives in the dispatcher file, not in any component.

---

## 2. Identity and authorisation

### 2.0 The canonical identity model — read before touching any query

Defined and enforced in `lib/auth.ts` (its header lists twenty hard rules; they are the spec).

| Table | Key | Holds | Notes |
|---|---|---|---|
| `auth.users` | `id` | the Supabase login | an **authentication** identity, never a person id |
| `auth_credentials` | `auth_credential_id` | `auth_user_id` → `person_id`, `status`, `selected_org_id` | the **only** bridge from a login to a person; `person_id` is immutable through the helpers |
| `persons` | `person_id` | name, email | **the canonical person** |
| `organisation_memberships` | `membership_id` | `organisation_id`, `person_id`, `role` (`owner`/`member`/`superadmin`), `status`, `valid_from`/`valid_to`, `portal_access`, `can_spend` | access requires an active, time-valid row; unique on `(organisation_id, person_id, role)` |
| `organisations` | `organisation_id` | names, ABN, address, `country`, `org_type`, `parent_organisation_id` | the ownership key for data |
| `ownership_periods` | — | person ↔ organisation, `status='current'` | ownership is temporal and separate from membership |
| `users` | `id` | **legacy** application user | do not use for identity or organisation resolution; still referenced by older columns and provenance |

**Resolution functions — use exactly one per context:**

| Caller | Function | Source of identity |
|---|---|---|
| Browser request / server component / server action | `getCurrentOrganisationContext()` | the Supabase session cookie → credential → person → membership (honouring `selected_org_id` only if a valid membership exists) |
| Agent tool webhook, cron, background job | `resolveOrganisationForPerson(personId)` | an explicit `person_id` — for tool webhooks, the `?uid=` baked into the tool URL |

Both return the same `OrganisationContext` (`organisationId`, `personId`, role data).

**Invariants**

1. **Data is organisation-owned.** New rows carry `organisation_id`; `user_id` records which person
   (provenance) and holds the **`person_id`**, not a legacy `users.id` (§3.6, invariant 3).
2. **A client-supplied organisation id is never authority.** Organisation comes from the resolved
   context.
3. **Server-side identity resolution uses the service client**, because the identity tables may
   themselves require organisation context to read.
4. **Redeeming an invitation does not create a membership for an existing account.** The redeem
   route mints a sign-in link and pins `selected_org_id`, which grants nothing without a membership
   (rule 15 above). An invited person who already has a login needs their membership created
   explicitly (HLD §7A).

### 2.1 The five identities

Enforced in `middleware.ts`, plus per-route checks.

```
/admin/*         Supabase session  AND  email ∈ ADMIN_EMAILS      → else redirect
/introducer/*    valid signed introducer cookie                   → else /introducer/expired
/distributor/*   Supabase session  AND  distributor-org membership → else 403 (see 2.4)
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

### 2.4 Distributor identity — added 2026-09-22

Unlike an introducer, a distributor/consultant IS a full Supabase account holder (`kira_agents.
journey_type IN ('consultant','distributor')`). `callerIsDistributor()` (`app/distributor/(panel)/
actions.ts`) checks two paths — an active `distributor_portfolio` row, OR active membership in an
`org_type='distributor'` organisation (the fallback exists so a brand-new partner with zero clients
yet, who therefore has no portfolio row, can still reach `/distributor` and provision their first
one — without it the route is unreachable on exactly the first use).

**RLS invariant (migration `20260921140000_distributor_content_access_gate.sql`):** a bare,
unapproved `distributor_portfolio` row grants ONLY `view_status` — never read/write of a client's
`conversations` / `kira_memory` / genome rows. That requires a separate, approved
`operating_agreements` row (`auth_user_has_distributor_content_agreement()`). Before this migration,
`auth_user_can_read_org_row()`'s first gate delegated straight to `auth_user_has_organisation_access()`
— which already folded in the Tier-2 distributor fallback — so a distributor with zero agreements had
unrestricted content access. `auth_user_has_organisation_access()` itself is untouched and remains
canonical for org-administration surfaces (`organisations`, `portals`); only content tables narrowed.

---

## 3. The voice + memory subsystem

The most safety-critical part of the codebase.

### 3.1 Provisioning

One ElevenLabs agent per person. Binding row in `kira_agents`. Minted by Kira's own routes, not by
a helper in the shared package:

| Route | When it mints | Notes |
|---|---|---|
| `/api/kira/create` | An approved `kira_drafts` row is redeemed | Two branches — **create** (new person) and **reuse** (PATCH an existing agent). Both are idempotent. |
| `/api/kira/ensure` | On demand, behind `/talk` | Self-service provisioning for a person with no agent yet. |

Both release the draft claim on failure, so a failed mint strands a draft as `used` with no agent
behind it — recoverable by retrying, which is why the release is there.

**The reuse branch must send `conversation_config.turn` too.** A PATCH that omits a key leaves a
deployed agent on whatever it was minted with, so a reuse PATCH without `turn` would silently revert
any fleet-wide change the first time an agent is re-briefed. Same for the LLM pin — see below.

**Turn-taking and model are part of the agent, not preferences.** `KIRA_TURN_CONFIG`
(`lib/kira/turn-config.ts`: `turn_eagerness: 'patient'`, `turn_timeout: -1`) and
`llm: DEFAULT_AGENT_LLM` (`gpt-4.1-mini`) are sent on **every** creation path (this route's create
*and* reuse branches, `/api/kira/ensure`, and the legacy factory in `lib/kira/elevenlabs.ts`). See
§3.6A and HLD §3.

**Creation order (both routes):** create the ElevenLabs agent → set the origin allowlist → attach
tools and enable overrides (read back, one retry) → bind the post-call webhook (read back, one retry)
→ write the `kira_agents` row. Each step is logged to `kira_logs` under one request id; a step that
fails is logged as an error with its observed state, never as success.

**Why one agent per person, and not one shared agent:** ElevenLabs **does not pass the conversation
id to server-tool webhooks.** The agent sends only the parameters its language model chose to fill
in. So there is nothing trustworthy in the request that identifies the caller — the person must be
fixed at *provisioning* time and baked into the tool URLs.

**Identity resolves through `person_id`, not `user_id`.** A person can belong to several
organisations with different `user_id`s. Tools keyed off the session's `user_id` wrote to the wrong
owner's data — a live production bug, fixed in `4bd06c7`.

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
| `save_message` | transcript capture — **route exists, tool filtered out** of the manifest (see below) |
| `update_topic` | topic tracking — **route exists, tool filtered out** of the manifest |
| `search_knowledge` | retrieval over the owner's uploaded documents |
| `discovery_agenda` | the mandatory one-time discovery interview gate |
| `dispatch_task` / `approve_task` | the swarm's do-work path |
| `check_tasks` | read-only: what is open, what went out |
| `look_up_financials` | Xero read path |
| `search_drive` / `read_document` / `keep_document` | Google Drive: find, read, retain |
| `lookup_contact` | contact resolution |
| `record_refusal` / `facts_to_confirm` / `confirm_fact` | the refusal and fact-confirmation loop |
| `area_agenda` | the nine business areas |
| `file_manual` | writes the operating manual into the owner's own storage (via the orchestrator) |
| `research_organisation` | practice intelligence on another organisation |
| `save-framework-draft` | persist a framework draft |
| `task-events` | callback from the orchestrator with task lifecycle events |
| `post-call` | **distil + persist** — the live binding is `https://kiraexec.com/api/kira/webhooks/post-call` |

`create_operational_kira/` holds only a `route.ts.example` — **not a mounted route**. An older
post-call route also exists at `/api/convai/webhooks/post-call` (and older copies of the conversation
routes under `/api/convai/webhooks/*`); `memory-loop.config.json` still points its post-call probe
there. Live agents are bound to the `/api/kira/webhooks/post-call` path above; treat the
`/api/convai` tree as legacy and confirm with a workspace webhook listing before relying on it.

**A mounted route is not a held tool.** `save_message` and `update_topic` are implemented and
mounted, but `toolDefsFor` filters them out — they ask the model to do filing the post-call webhook
already performs, and every extra tool is attention the model spends on a long call. See HLD §3 for
the measured cost. Do not add a tool back without that argument.

**The post-call webhook is the VOICE path's distil trigger only.** The text path has its own
contract — see §3.6.

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
3. **Identity is server-derived on every path.** Tool calls take the person from the `?uid=` baked
   into the tool URL at provisioning. `get_conversation_context` may also receive a platform-filled
   `user_id` (ElevenLabs' own dynamic variable, for shared organisation agents); it is honoured only
   after checking that person holds a seat on the agent's organisation, and otherwise returns an
   empty context rather than falling back. **No path may trust a `user_id` the language model
   chose.**
4. **A tool webhook resolves identity with `resolveOrganisationForPerson(uid)` — never
   `getCurrentOrganisationContext()`.** ElevenLabs' servers call these routes; there is no browser
   session, so the session lookup returns null for every caller. `file_manual` did exactly this and
   told every owner "No organisation membership found" until 2026-10-02 — it had never filed
   anything. Audited 2026-10-02: no other webhook path uses the session lookup.
5. **A write a tool performs must match the live schema, and its test must prove it.** `confirm_fact`
   inserted two columns the table did not have from 2026-08-31 to 2026-10-02 — zero rows ever, test
   green against a mock. `lib/kira/confirm.test.ts` now checks every inserted column against
   `supabase/migrations/`; copy that pattern for any tool that inserts.

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

**The distil trigger is transport-dependent.** Voice distils on the `post-call` webhook. Text
distils on `{ end: true }` sent as a `navigator.sendBeacon` from the browser — see §3.6.

**Post-distil sweeps (both transports, same code path):**

1. **Entity sweep** (`forgetParkedEntityLeaks`) — the distil paraphrases, so a fact about another
   business that `save_memory` correctly parked can be re-filed by the distil in wording the
   parking filter never matched. This removes the semantic copy.
2. **Capability claims sweep** (`refileAssistantCapabilityClaims`) — the distil is a second writer
   that doesn't know the bounds the tools follow; it can write down Kira's own limitations as facts
   about the business. This re-files them as assistant state.
3. **Genome classification** (`classifyPendingMemories`) — unclassified memories are assigned to
   one of the nine areas. Without this, the Genome page regresses: facts are saved but never
   appear in any area, so the count goes up while the coverage bar goes *down*. Measured on the
   operator's own account: nine typed facts, all unclassified, coverage visibly worse after talking
   to her.
4. **Dedup sweep** (`sweepDuplicateMemories`) — runs *after* classification so a classified row is
   never parked in favour of an unfiled twin. The ordering is load-bearing.

**Invariants**

1. **`scopePrefix` is frozen at `kira-user-`.** Every stored fact is keyed by it. Change it and
   every prior memory is orphaned — present in the index, unreachable by recall.
2. **Distilled results only.** No transcripts, no raw personal data leaves our infrastructure.
3. **Mnemo is never the authority.** Supabase holds the fact; Mnemo indexes it. Mnemo unavailable
   degrades recall quality and loses nothing.
4. **Memory failures are logged, never thrown.** A failed persist must not break the call the owner
   is having.
5. **The sweeps run before `distilled_at` is stamped.** A failed sweep is retried by the next
   trigger; a stamp written before the sweep completes would skip it permanently.

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

Mounted on **seven** pages: `/dashboard`, `/drafts`, `/genome-knowledge`, `/knowledge`,
`/my-genome`, `/requests`, `/talk`. `/settings` and `/setup/*` opt out by name with a stated reason.
(Audited 2026-09-30 — the list was previously incomplete, missing `/genome-knowledge` and `/talk`.
All seven accept **typed** input, which is why §3.6's two invariants apply to every one.)

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

### 3.6 The text transport — added 2026-09-30

Kira has **two transports into the same agent**: voice (ElevenLabs, the signed-URL call) and text
(`/api/kira/chat/text`, a typed fallback that runs the same tools server-side against the same
LLM). The text path is not a lesser copy — for an owner in a truck it is the only reachable one, so
it carries the same invariants.

`/api/kira/chat/text` is a tool-calling loop, not a passthrough. It resolves the agent by
`person_id` (never `user_id` — see §3.1), caps a message at **4000 characters** and the loop at
**4 tool rounds**, and binds `?uid=` to `agent.person_id` for every person-scoped handler.

**The discovery gate is enforced here, not merely requested.** On a fresh conversation the first
round pins `tool_choice` to `discovery_agenda`, so the interview *cannot* be skipped by a model
that simply forgets the instruction in its prompt. This is the one place the gate is mechanical
rather than persuasive.

#### Invariant 1 — the conversation id must survive a reload

`typedConversationId` is persisted to `localStorage` (key `kira-typed-conv-<agentId>`), by **both**
surfaces that accept typing: `app/chat/[agentId]/page.tsx` and `components/KiraShape.tsx`.

It was not persisted before 2026-09-30, and the failure was unusually well-camouflaged: every
reload minted a fresh empty conversation row while the transcript was re-hydrated from the
database. The owner saw his full history on screen; the model received **no** prior turns. It
presents as "she forgets everything" and as "she keeps restarting the same interview", and the
visible transcript actively argues against it being a backend problem. Rejecting that read is the
whole lesson.

#### Invariant 2 — a typed message must be flushed to distil

The voice path distils on the `post-call` webhook. **The text path has no call, so it has no such
trigger.** A typed message is written to `conversation_messages` and is *not* extracted into
`kira_memory` until a flush arrives.

`KiraShape` therefore owes a flush, and uses the same trigger set as `app/chat/[agentId]/page.tsx`:
`visibilitychange` (when hidden — the one that fires on a phone) · `pagehide` · a 3-minute
`setInterval`. Each sends a `navigator.sendBeacon` to `/api/kira/chat/text` with `{ end: true }`.

`KiraShape` had no flush at all before 2026-09-30. Typed on the inline widget — `/dashboard`,
`/my-genome`, `/knowledge`, `/drafts`, `/requests`, `/genome-knowledge`, `/distributor` — the
message was persisted and **never** became memory. There is no error, no log, and nothing to grep
for: the data is all there, the extraction simply never ran.

**Rule for any new typing surface: a surface that writes typed messages owes a distil flush.**
Cost of the extra beacons is one indexed query — the route compares `created_at` against
`distilled_at` and skips when nothing is newer — not one LLM pass.

#### Invariant 3 — one identity across both transports (added 2026-10-01)

Every row a conversation produces — `conversations.user_id`, `conversation_messages.user_id`,
`kira_memory.user_id` — carries the **canonical `person_id`**, on BOTH transports. Voice reads
history and memory by `person_id` (`get_conversation_context`, `recall_memory`), so a row under the
legacy `users.id` is invisible to her: John Orian typed for an hour and her next voice call opened on
"this is our first conversation".

- The text route writes `agent.person_id ?? agent.user_id` and passes `userId` to
  `completeConversationMemory` — without `userId` the pipeline stops after the distil and never
  dedupes, which filed the same facts eight times.
- A voice post-call whose conversation had no start row is inserted by the hub as `agent.user_id`
  (legacy). `onConversationComplete` (`lib/kira/convai.ts`) realigns that row and its messages to the
  agent's `person_id` **before** the distil runs.
- Consultant-journey sessions extract the consultant genome at the end of a TYPED session too, not
  only after a voice call.

### 3.6A Agent provisioning invariants (added 2026-10-01)

**Turn-taking is one constant.** Every creation path takes `KIRA_TURN_CONFIG`
(`lib/kira/turn-config.ts`). `turn_eagerness` (when she decides he has finished) and `turn_timeout`
(how long she waits in silence before re-prompting — vendor default 7s) are different settings;
confusing them is how the "are you still there?" nag survived its first fix. `turn_timeout` is `-1`.
Pinned by `lib/kira/turn-config.test.ts`.

**The post-call webhook is bound LAST and read back.** Allowlist → tools/overrides →
`bindPostCallWebhookVerified` (`lib/kira/post-call-binding.ts`). All three write `platform_settings`;
run concurrently, a later write erased the binding on 4 of 5 agents while every bind logged success,
and an unbound agent's calls are never recorded, distilled or remembered. Pinned by
`lib/kira/post-call-binding.test.ts`. Repair tool for live agents:
`scripts/fix-agent-turn-and-postcall.mjs` (dry run by default).

### 3.7 The knowledge-upload contract — added 2026-09-30

`POST /api/kira/knowledge/upload` accepts a file and/or a URL for the owner, writes to
`kira_knowledge` + `kira_knowledge_chunks`, and **attaches the result to his canonical
`elevenlabs_agent_id`**. That last step is the contract, not a detail — a document stored without
the agent link is in the library and invisible to the agent, which is indistinguishable from
"knowledge is broken."

**4 MB is a hard ceiling, enforced on both sides.** The platform rejects an oversized body *before*
it reaches the route, so the server-side guard (before `formData()`) exists to turn that opaque
platform error into a message naming the file and its size; the client-side guards on all three
upload surfaces (`KnowledgeManager`, `app/setup/knowledge`, `app/chat/[agentId]`) exist to catch it
before the round trip. The client check is advisory; the server check is the control.

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

### 5.1A The owner's business identity — country first (added 2026-10-01)

`lib/business-identity` + `components/BusinessIdentityForm.tsx` + `app/setup/business/actions.ts`.
Mail Kira sends FOR an owner carries HIS entity, not ours. The **country** (ISO code, `COUNTRIES`,
blank = Australia) is asked first and decides the rest:

- **Australia** — ABR lookup, ABN (modulus-checked), AU state code, 4-digit postcode, the
  authority-to-send checkbox, the AU address lookup. Unchanged.
- **Elsewhere** — registered name, free-text state/province/region, a shape-only postal code, no ABN
  (stored `null`), no authority checkbox, no Mapbox lookup (it is Australia-biased).

**Invariant: saving is not sending.** `canSend()` is false for any non-AU business (the §5.2
jurisdiction guard), the orchestrator push is skipped for it (it would be refused for the missing
ABN), and the dashboard, settings and form say plainly that Kira cannot send email outside Australia
yet — rather than showing "add your business details" or "out of sync" banners it could never clear.
A saved non-AU record counts as done for the setup gate. Pinned by
`lib/business-identity/country.test.ts`.

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

**Status as at 2026-10-02:** all Kira-side adapters are committed and deployed with `main` —
`lib/billing/beta-codes.ts` (last change `3c772fb`, 2026-09-09), `lib/email/suppressions.ts`
(`5c23346`, 2026-09-03), `lib/email/unanswered-request.ts` (`b8f8fa3`). The business identity no
longer lives in a `business_identity` table: it is stored on `organisations` and read with the
service client (`lib/business-identity/store.ts`). The orchestrator-side endpoints are documented in
the orchestrator repository; their deployment state is not visible from this one. (The 24 August
version of this table recorded several of these as uncommitted; that state is history, kept in the
build register.)

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
`SUPABASE_SECRET_KEY`.

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

Design: `docs/SPEC_GENOME_CHECKLIST_AND_PATHWAYS.md`. Where its inputs come from: HLD §4 (the
memory loop).

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
2. **`readiness` is never recomputed in place.** It is the baseline at Level 1 (Assessment Complete) of the Maturity Model. `recompute-readiness.ts` re-derives the five sub-scores by re-running `computeValuation` on the stored `inputs` (only the composite was ever persisted) and **self-checks**: if the recomputed composite no longer matches the stored one the model has moved, and it REFUSES — a delta that is partly evidence and partly a re-weighting cannot be separated afterwards.
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
| Identity (canonical, §2.0) | `auth_credentials`, `persons`, `organisation_memberships`, `organisations`, `ownership_periods` |
| Identity (legacy / onboarding) | `users` (legacy — not for identity resolution), `client_profiles` (the business owner's discovery profile, gates discovery), `setup_sessions` |
| Org hierarchy (added 2026-09-21/22) | `organisations` (`org_type`: portfolio/project/distributor/client_org, self-referential `parent_organisation_id`, anti-cycle-guarded), `organisation_memberships`, `portals` (per-org canonical `/talk` URL, `journey_type`), `distributor_portfolio` (a distributor's client orgs), `beta_codes` (invitations, `betaType`/variant), `consultant_frameworks`, `consultant_genomes`, `operating_agreements`, `truth_comparisons` (chain-of-truth §7A of the HLD; the latter three exist in schema, not yet consumed by application code as at 2026-09-22) |
| Voice + memory | `kira_agents` (`journey_type`: personal/business/consultant/distributor — governs which persona `getKiraPrompt` selects, see HLD §7A), `conversations`, `conversation_messages`, `kira_memory`, `kira_logs` |
| Knowledge | `kira_knowledge`, `kira_knowledge_chunks` (pgvector), `knowledge_files`, `knowledge_urls` |
| Consultant | `consultant_genomes` (consultant identity/target/services/frameworks — read by `discovery_agenda` when `journey_type` is consultant/distributor), `consultant_frameworks` (methodology principles/stages) |
| Work | `kira_tasks`, `kira_drafts`, `kira_research_sessions` |
| Write-back | `drive_documents` (where each area of the manual lives in the owner's own storage — the idempotency map, §6A) |
| Genome scoring | `genome_item_status` (one verdict per owner per checklist item), `genome_pathways`, `genome_pathway_milestones` (§6B), `kira_fact_confirmations` (append-only record of facts read back to the owner and his answer — `said`, `outcome`, `organisation_id`) |
| Commercial | `business_valuations` (⚠️ `readiness` = frozen baseline; `readiness_now` = evidenced, §6B), `beta_trials`, `beta_usage`, `stripe_webhook_events`, `loi_commitments` |
| Channel | `introducers`, `introducer_magic_links`, `introductions`, `attribution_overrides`, `advisor_enquiries` |
| Email | `email_logs` (every send, incl. `email_type='invitation'`; Resend id; open/click timestamps), `email_suppressions` |
| Observability | `voice_connect_events` (§7.1 — one row per voice connection attempt), `kira_logs` (every agent-provisioning step, by request id) |
| PubGuard | `pubguard_scans`, `pubguard_reports` |

**Invariants**

1. **RLS is enabled on every table.** Never commented out, never disabled "temporarily".
2. **Migrations are idempotent** (`IF NOT EXISTS`, guarded `ALTER`) and applied via CLI.
3. **Verify the linked project ref before every `db push`.** The portfolio runs several live
   Supabase projects and a migration pushed to the wrong one may not error — it just lands in the
   wrong place.
4. **Columns are `snake_case`; TypeScript is `PascalCase`/`camelCase`.** Dual naming is accepted
   only at the API boundary and normalised immediately inside it.
5A. **Org-hierarchy-aware tables (added 2026-09-21/22 — `kira_agents`, `conversations`,
   `kira_memory`, `portals`, `organisation_memberships`) scope by `organisation_id`, resolved via
   `resolveCanonicalKiraAgent`/`getCurrentOrganisationContext` — never a bare `person_id`/`user_id`
   lookup.** This is the current, correct pattern (`KiraShapeSection.tsx`'s own comment: "ownership
   never comes from the legacy user row"). Invariant 5 below predates this and describes an older
   layer; the two are not in conflict for tables not yet migrated onto the org model, but a reader
   should treat 5A as the live rule for anything organisation-scoped.
5. **A `user_id` column on a content table holds a `person_id` — never an `auth.users.id`.**
   *Corrected 2026-10-02: this invariant previously said these columns hold the legacy `users.id`.*
   The canonical model (§2.0) moved them to `person_id`, and code that still wrote the legacy id was
   the cause of the memory split in §3.6 invariant 3. Two consequences a migration author must know:
   (a) a column named `user_id` may hold either id on rows written before the fix — **9 of 90
   `kira_memory` rows still carried a legacy `users.id` on 2026-10-02**; (b) none of these columns has
   a foreign key, so the database will not catch a wrong id. Never key a new table on
   `auth.users.id`: it joins to nothing, and its RLS silently matches no rows (caught in review on
   `genome_item_status`).
6. **Older RLS policies still compare against the legacy `users` table** (for example
   `kira_fact_confirmations`' "own confirmations readable" policy joins `users.id`). Rows written with
   a `person_id` will not match those policies for browser reads. Server reads use the service client
   and are unaffected; an audit of policies against the canonical model is outstanding.

### 7.1 Voice-connect telemetry — added 2026-08-18

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

Every variable the code reads (`process.env.*` across `app/`, `lib/`, `components/`, 2026-10-02),
grouped by purpose. Values live in Vercel; a local copy comes from `vercel env pull` (§11). Never
commit one.

| Group | Variables | Notes |
|---|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (browser) · `SUPABASE_PUBLISHABLE_KEY` (server session) · `SUPABASE_SECRET_KEY` (service role) | Legacy names still read in places: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (`lib/voice-agent-checks.ts`). See §1 for the client rules. |
| Voice | `ELEVENLABS_API_KEY` · `ELEVENLABS_WEBHOOK_SECRET` (post-call HMAC) · `KIRA_TOOL_WEBHOOK_SECRET` / `CONVAI_TOOL_SECRET` (tool header) · `KIRA_TOOL_WEBHOOK_SECRET_PREVIOUS` (rotation only — delete after) · `VOICE_COST_PER_MINUTE_USD` | Agent/voice ids for special-purpose agents: `KIRA_SETUP_AGENT_ID`, `KIRA_LANDING_AGENT_ID`, `NEXT_PUBLIC_SETUP_KIRA_AGENT_ID`, `NEXT_PUBLIC_PUBGUARD_AGENT_ID`, `KIRA_VOICE_ID`, `NEXT_PUBLIC_KIRA_VOICE_ID`, `NEXT_PUBLIC_ELEVENLABS_VOICE_ID`. The retired separate discovery agent still reads `DISCOVERY_AGENT_ID`, `DISCOVERY_SESSION_SECRET`, `DISCOVERY_POSTCALL_SECRET` (`lib/kira/discovery.ts`). |
| LLM | `OPENAI_API_KEY` · `OPENAI_BASE_URL` · `KIRA_TEXT_MODEL` · `KIRA_EXTRACTION_MODEL` · `JINA_API_KEY` (knowledge reranking) | The voice agent's model is set on the agent (§3.1), not here. |
| Orchestrator | `ORCHESTRATOR_URL` · `ORCHESTRATOR_SECRET` · `ORCHESTRATOR_WEBHOOK_SECRET` · `ORCHESTRATOR_PUBLIC_SECRET` · `ORCHESTRATOR_CALLBACK_SECRET` (authenticates its calls to `task-events`) · `KIRA_SWARM_ADAPTER` | §5B and HLD §2 |
| Billing | `STRIPE_LIVE_MODE` · `STRIPE_SECRET_KEY_TEST` / `_LIVE` · `STRIPE_WEBHOOK_SECRET_TEST` / `_LIVE` | Legacy single-slot `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` still read. §4.1 |
| Email | `RESEND_API_KEY` · `RESEND_WEBHOOK_SECRET` · `UNSUBSCRIBE_SECRET` · `EMAIL_SENDER_NAME` / `_EMAIL` / `_ABN` / `_POSTAL` / `_PHONE` (portfolio-canonical) · `EMAIL_FROM` · `ADVISOR_ENQUIRY_TO` | §5 |
| Memory | `MNEMO_API_KEY` | read inside `@caistech/mnemo` |
| App | `NEXT_PUBLIC_APP_URL` (`https://kiraexec.com` — baked into agent tool URLs) · `NEXT_PUBLIC_SITE_URL` · `ADMIN_EMAILS` · `CRON_SECRET` · `NEXT_PUBLIC_LANDING_VARIANT` · `KIRA_DEFAULT_TIMEZONE` · `DEFAULT_ENVIRONMENT` · `NEXT_PUBLIC_VENDOR_PHONE` / `_EMAIL` / `_CALENDLY` · `ABR_GUID` (ABN lookup) | |
| Research / PubGuard | `BRAVE_SEARCH_API_KEY` / `BRAVE_API_KEY` · `SERPER_API_KEY` · `SHODAN_API_KEY` · `GITHUB_TOKEN` · `NVD_API_KEY` | |
| Install time | `NODE_AUTH_TOKEN` | GitHub Packages token for `@caistech/*` (§11) |

**Invariants**

1. **No secret carries a `NEXT_PUBLIC_` prefix.** That prefix ships the value to every browser; only
   the publishable keys, public URLs and public agent/voice ids above use it.
2. **Secrets are marked `sensitive` on Vercel, production + preview only — never `development`.**
3. **No fallback strings for secrets, ever.** `|| 'fallback'` on a webhook secret converts an
   authentication failure into an open endpoint.
4. **The tool secret fails closed.** *Corrected 2026-10-02 — this invariant previously said "fail-open",
   contradicting §3.2.* With neither `KIRA_TOOL_WEBHOOK_SECRET` nor `CONVAI_TOOL_SECRET` set,
   `requireToolSecret()` throws and every tool route answers 500: the voice agent stops working
   rather than running unauthenticated. Set it in every environment that serves tool calls.
5. **`NEXT_PUBLIC_APP_URL` is baked into every live agent's tool URLs at provisioning.** Changing it
   changes nothing for existing agents until they are re-provisioned.

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

---

## 11. Development workflow

### 11.1 Getting it running

1. **Clone two repositories side by side** — `Kira` and `cais-shared-services` in the same parent
   directory. `@caistech/kira-testing-client` is a local file dependency
   (`file:../cais-shared-services/packages/kira-testing-client`); without the sibling clone
   `npm install` fails.
2. **Registry access.** Every other `@caistech/*` package installs from GitHub Packages. The
   committed `.npmrc` reads the token from the environment, so export a GitHub token with
   `read:packages` as `NODE_AUTH_TOKEN` before `npm install`. A 401 at install is this token.
3. **Node:** current LTS (CI uses `lts/*`; Vercel builds on its default runtime). Package manager:
   **npm** (`package-lock.json`).
4. **Environment:** `vercel env pull .env.local --environment=production` (needs access to the
   Vercel project). Values marked sensitive come back blank and must be supplied separately.
   `.env.local` is gitignored.
5. **Run:** `npm run dev`. Voice needs a reachable `NEXT_PUBLIC_APP_URL` for ElevenLabs to call the
   tool webhooks; locally that means a tunnel, or testing tools by calling the routes directly.

### 11.2 Checks before a change

| Command | Checks |
|---|---|
| `npm run typecheck` | `tsc --noEmit`. **The production build does not type-check** (`ignoreBuildErrors: true` in `next.config.js`); this and CI are the only places types are checked. |
| `npm run lint` | ESLint |
| `npm test` | Vitest, ~2,000 tests (~15 s). Two files touch live services (a Stripe integration test, a Supabase token test) and can time out; re-run before chasing them. |
| `npm run build` | compiles; does not catch type errors (above) |
| `node scripts/check-app-chrome.mjs` · `check-voice-reachable.mjs` · `check-design-tokens.mjs` | the same structural checks CI runs |

**Tests against mocks prove the logic, not the integration.** Where code writes to a table, assert
the columns against `supabase/migrations/` (see `lib/kira/confirm.test.ts`). Where code calls a
vendor, verify with a read-back in the code itself (see `lib/kira/post-call-binding.ts`).

### 11.3 Database migrations

- Write them in `supabase/migrations/`, idempotent (`IF NOT EXISTS`, guarded `ALTER`/constraints).
- Kira's project is **`kmrskyewwnwettlycpfe`**. The portfolio has several live Supabase projects;
  confirm the linked ref before `supabase db push` — a migration pushed to the wrong project may not
  error.
- The CLI migration history was empty when the project was adopted. Migrations have also been
  applied through the Supabase Management API's SQL endpoint and then recorded by inserting the
  version into `supabase_migrations.schema_migrations`. Check that table before assuming a migration
  is or is not applied.

### 11.4 Deploying

Push to `main` → Vercel builds and deploys production; GitHub records a deployment with its status.
There is no staging environment, no branch protection and no required review (HLD §12.1). Confirm a
deploy with `gh api repos/<owner>/Kira/deployments?sha=<sha>` and its statuses, or the Vercel
dashboard.

### 11.5 Changing live agents

Agent configuration lives in ElevenLabs. A source change reaches no existing agent until it is
pushed to the fleet:

| Change | How it reaches live agents |
|---|---|
| Tool list or tool definitions | `scripts/reprovision-kira-agents.mjs` (reads `toolDefsFor`). ⚠️ It applies by default and `setAgentTools` **replaces** the list. |
| A prompt section | its own additive patch script (`scripts/patch-agent-*.mjs` — anchored, dry-run by default, read-back after write, refuses when the anchor is missing). Never regenerate a live prompt wholesale: that discards owner-specific context. |
| Turn-taking or post-call binding | `scripts/fix-agent-turn-and-postcall.mjs <agent ids> [--apply]` — dry run by default, reads every agent back. |

The ElevenLabs workspace is shared with other products: always pass explicit agent ids, never
"every agent in the workspace".

### 11.6 Shared packages

`@caistech/*` packages are developed in `cais-shared-services/packages/<name>`, versioned with a
CHANGELOG entry, built (`npm run build`), published to GitHub Packages (`npm publish`, with a
`NODE_AUTH_TOKEN` that has `write:packages`), then installed at the new version in each consumer.
A change to a shared package is not done until every consumer that needs it is updated and tested —
the catalogue of consumers is `cais-shared-services/SHARED_SERVICES.md`.

### 11.7 Recording what changed

Every significant change gets a `docs/BUILD_REGISTER.md` entry (newest first): trigger, root cause,
fix, and an explicit **NOT verified** list. A change that alters a contract or invariant updates this
document and the HLD in the same commit.

---

## 12. Operations

### 12.1 Scheduled jobs (`vercel.json`, all UTC, all authenticated by `CRON_SECRET`)

| Path | Schedule | Does |
|---|---|---|
| `/api/cron/memory-integrity` | 02:00 daily | audits extracted memory |
| `/api/cron/reconcile-tasks` | 03:00 daily | reconciles open tasks against outcomes |
| `/api/cron/genome-classify` | 04:30 daily | classifies unfiled memories into Genome areas |
| `/api/cron/capture-consultant-genomes` | 05:00 daily | placeholder genome for consultant agents without one |
| `/api/cron/auto-record-absence` | 06:00 daily | records absent owners' working pattern |
| `/api/cron/reminders` | 07:00 daily | reminders |
| `/api/cron/red-team-drift` | 08:00 daily | red-team probes; mails on a change |
| `/api/cron/trial-ending` | 09:00 daily | trial-ending notices |
| `/api/cron/reengagement-emails` | 10:00 daily | re-engagement email |
| `/api/cron/autobootstrap-portals` | :45 hourly | writes each organisation's canonical portal URL |

### 12.2 Where to look when something is wrong

| Question | Source |
|---|---|
| Did agent provisioning succeed, step by step? | `kira_logs` by `request_id` |
| Did a voice connection fail, and was the vendor reachable? | `voice_connect_events` (`scripts/voice-connect-report.mjs`) |
| What did the agent actually call, and what came back? | ElevenLabs conversation detail (`/v1/convai/conversations/<id>`): `tool_calls` and `tool_results` per turn |
| Was a call recorded and distilled? | `conversations` (`elevenlabs_conversation_id`, `distilled_at`), then `kira_memory` |
| Is an agent bound to the post-call webhook? | the agent's `platform_settings.workspace_overrides.webhooks.post_call_webhook_id` |
| Did an email go out, and was it opened? | `email_logs` (Resend id, `opened_at`, `clicked_at`) |
| Runtime errors | Vercel runtime logs — short retention, and **not currently reachable by the build tooling's token scope** |

Most of the serious defects so far produced **no error at all**: a tool returning "not found", an
agent with no webhook, a row written under the wrong identity. The table above is how they were
found. Monitoring that detects *absence* — calls with no conversation row, tools that never succeed —
does not exist yet and is the most useful observability work outstanding.

### 12.3 Emergency stop

`haltState('conversations')` (`lib/kill-switch`) makes the voice start route and the typed route
return 503 immediately: no tools run, nothing is written, no vendor time is spent. Use it for a
misbehaving agent; it is a stop, not a retry.
