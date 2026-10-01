# Kira — High-Level Design

**Audience:** someone who needs to understand what Kira is and how it hangs together without
reading the code — a development team assessing or taking over the codebase, a prospective
licensee, an introducer's technical adviser, an investor's diligence contact, or a new engineer on
day one. A development team should start at §0.

**Companion:** `docs/LLD.md` holds the contracts, schemas, invariants and the development workflow.
This document stops at the boundary of "what talks to what, and why."

**Status:** describes `main` as at 2026-10-02. Where something is deliberately *not* built, it says
so — an HLD that quietly omits the gaps is worse than none.

---

## 0. For a development team — read this first

**Kira is functionally complete enough for beta testing and is not production-ready.** It was built
by one founder over roughly six months with AI coding assistance, on a shared package layer reused
across the founder's portfolio. Security, governance and hardening have not been independently
reviewed. §12 lists the gaps we know about; expect to find more.

### 0.1 The three repositories

| Repository | What it is | Deploys to | Database |
|---|---|---|---|
| **`Kira`** (this repo) | The product: Next.js 16 app — owner, consultant/distributor, introducer and admin portals; voice and typed chat; memory; Business Genome; valuation; billing | Vercel, `kiraexec.com` (also `kira-rho.vercel.app`), auto-deployed from `main` | Supabase project `kmrskyewwnwettlycpfe` (Mumbai region) |
| **`orchestrator`** | Separate Next.js service that decides "what should happen and who must approve it": back-office tasks Kira dispatches, Google/Microsoft/Xero connectors, document filing, the email-suppression and beta-code boundary | Vercel, `connect.kiraexec.com` | Its own Supabase project, plus scoped service access to Kira's for the email boundary |
| **`cais-shared-services`** | Monorepo of `@caistech/*` npm packages consumed by Kira, the orchestrator and ~10 other products — most importantly `@caistech/elevenlabs-convai` (the voice agent + memory loop) | Published to GitHub Packages (`npm.pkg.github.com`) | — |

The orchestrator keeps its own design documents in its `docs/` (`HLD.md`, `LLD.md`,
`SYSTEM_OF_RECORD_PORT.md`). `cais-shared-services/SHARED_SERVICES.md` catalogues every package.

### 0.2 Reading order

1. This document, §1–§2B (what it is, what talks to what, who is who).
2. `docs/LLD.md` §2 (identity) and §3 (the voice + memory subsystem) — where most defects have been.
3. `docs/LLD.md` §11 (development workflow) before running anything.
4. `docs/BUILD_REGISTER.md` — newest first. Every significant change with its root cause, fix, and
   an explicit **NOT verified** list. It is the most honest account of the system's real state.

### 0.3 Sources of truth, in order

The code and the live database win over the LLD; the LLD wins over this document; the build register
records history and must not be read as current specification. Where any two disagree, trust the
higher one and correct the lower.

### 0.4 What this document will not tell you

- **Live state.** Agent configuration lives in ElevenLabs, not the repo, and a source change does
  not reach a live agent until it is re-provisioned or patched (LLD §6B, "Reaching the fleet").
- **Which uncommitted work is in flight.** Several AI-assisted sessions have worked on this codebase
  concurrently; check `git status` and the register before assuming the tree is quiescent.

---

## 1. What Kira is

A privately-owned business is usually worth less than its owner thinks, for one reason: **the
operating knowledge lives in the owner's head.** A buyer purchasing that business is buying a job,
and prices it accordingly.

Kira is an **AI executive assistant that extracts that knowledge by talking to the owner** — a few
minutes at a time — and turns it into documented, transferable systems. The commercial framing is
the *value gap*: what the business is worth today versus what it would be worth if it could run
without the owner.

Three things follow from that, and they shape every decision below:

1. **Voice is the interface, not a feature.** Owners will talk for ten minutes and will not fill in
   a form. The product only works if speaking to Kira is the path of least resistance.
2. **Memory is the source material, not the product.** An assistant that forgets is a novelty. Memory
   is the Interaction Evidence that powers the **Maturity Model** (the Business Understanding product).
   Continuity across sessions is the source material that enables learning, which is the thing being sold.
3. **The buyer is often not the user.** Kira reaches owners through **introducers** — brokers,
   accountants and advisers who already hold the relationship. That is a distribution channel with
   its own portal, permissions and commercial terms, not a referral link bolted on.

### Second vertical: PubGuard

The same repo also hosts **PubGuard**, a public-exposure scanner (what a business or individual
has already posted that could be used against them). PubGuard shares the voice agent, the memory
loop and the suppression layer, but its product surface is completely separate.

---

## 2. System context

```
  Owner / consultant / admin (browser or phone)
        │  HTTPS (Supabase session cookie)              voice: WebSocket to ElevenLabs
        ▼                                               (signed URL minted by Kira)
┌──────────────────────────────────────────────┐        ┌──────────────────────────────┐
│ KIRA  (Next.js on Vercel, kiraexec.com)       │◀──────▶│ ElevenLabs Conversational AI │
│  portals · /talk · /chat · typed chat route   │ tool   │  one agent per person, in a  │
│  tool webhooks · post-call webhook · crons    │ calls +│  workspace shared with other │
│  memory distil · Genome · valuation · billing │ post-  │  portfolio products          │
└──────┬─────────────┬──────────────┬───────────┘ call   └──────────────────────────────┘
       │             │              │  HTTP + shared secret
       ▼             ▼              ▼
  Supabase       OpenAI         ORCHESTRATOR (connect.kiraexec.com, own repo + DB)
  (Postgres,     (chat on the    tasks/approvals · Google/Microsoft/Xero connectors ·
  Auth, RLS,     text transport, document filing · email suppression · beta codes
  pgvector)      extraction,
                 embeddings)    Also: Stripe (billing) · Resend (email) · Mnemo (semantic memory)
```

**The voice path is not Kira → ElevenLabs only.** The browser talks to ElevenLabs directly; during
the call ElevenLabs calls *back into* Kira for every tool the agent uses (`/api/kira/webhooks/*`,
authenticated by a shared secret header) and once more when the call ends (the post-call webhook,
HMAC-signed), which is how the conversation is recorded and distilled into memory.

**The typed path does not use ElevenLabs at all.** `/api/kira/chat/text` reads the live agent's
prompt from ElevenLabs, then runs the same tools server-side against OpenAI. One agent, two
transports, one memory (LLD §3.6).

**Orchestrator** is a separate deployed service (`connect.kiraexec.com`, its own repository and
database) that Kira calls over HTTP. Its roles, by Kira call site:

| Role | Kira caller |
|---|---|
| Back-office task dispatch + approvals (when `KIRA_SWARM_ADAPTER=orchestrator`; otherwise a local stub handles three task kinds) | `lib/kira/swarm/*` |
| Google / Microsoft connect and connection status | `lib/connectors/*` |
| Documents in the owner's own storage (read, retain, file the operating manual) | `lib/kira/document.ts`, `lib/genome/file-manual.ts` |
| Accounting figures (Xero) | `lib/kira/financials.ts` |
| Contact lookup | `lib/kira/lookup.ts` |
| Business identity sync (the sender identity on outbound mail) | `lib/business-identity/sync.ts` |
| Email suppression, alert throttle, owner enrichment | `lib/email/*` |
| Beta-code operations | `lib/billing/beta-codes.ts` |

For the email boundary and beta codes Kira is an **unprivileged caller**: it authenticates with one
of two scoped, non-interchangeable credentials — `kira-webhook` (suppressions, alert throttle, owner
enrichment) and `kira-public` (beta codes) — and holds no service-role key for those capabilities
(LLD §5B). Other call sites use `ORCHESTRATOR_SECRET`.

**Supabase Authentication Model (API Key Model — Target Architecture):**
As of 2026-08-25, Kira is migrating from the legacy JWT-based authentication
(`SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) to Supabase's **API Key Model**
(`SUPABASE_SECRET_KEY` / `sb_secret_...` for service-role equivalence,
`SUPABASE_PUBLISHABLE_KEY` / `sb_publishable_...` for anon/browser equivalence).
Phase 0 validation (representative slice: one server route + one browser page) is complete and
deployed to Preview only. Production remains on the legacy JWT model. Full migration requires
explicit authorisation. See `docs/SUPABASE_API_KEY_MODEL_MIGRATION_VALIDATION.md` and
`docs/security/LEGACY_JWT_ROTATION_RUNBOOK.md`.

---

## 2A. The portal fleet — four surfaces, not one

A new engineer reasonably assumes "the portal" is one thing. It is four, built from two codebases
against three databases, and confusing any two of them is a class of bug the product has already
hit.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                  CORPORATE AI SOLUTIONS (separate repo)                 │
│  corporateaisolutions.com/portfolio-admin                               │
│  Supabase: corporate-ai-solutions (different project, different DB)     │
│                                                                         │
│  Dennis's portfolio admin. Creates distributor orgs, invites partners,  │
│  manages the commercial hierarchy. CANNOT see any owner's business      │
│  data — different database, no cascade, by design.                      │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │ creates distributor orgs + invites
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  KIRA PROJECT PORTAL (this repo)                        │
│  kiraexec.com                                                           │
│  Supabase: Kira (kmrskyewwnwettlycpfe)                                 │
│                                                                         │
│  Three authenticated surfaces, one auth seam, one canonical /talk:       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  /admin/*            Operator console                          │     │
│  │  10 sub-pages: organisations, distributors, introducers,       │     │
│  │  beta-testers, invitations, exec, trust, loi, admission,       │     │
│  │  asked-for. Gated by middleware + ADMIN_EMAILS.                 │     │
│  │  Dennis's operations surface — NOT a user-facing portal.       │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  /distributor         Distributor management portal            │     │
│  │  Manages: client orgs, portfolio view, CreateClientOrgForm.    │     │
│  │  KiraShapeSection here is about the distributor's OWN practice │     │
│  │  — not the client's. Client orgs get their own Kira below.     │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  Owner end-user platform — the product itself                  │     │
│  │                                                                 │     │
│  │  /talk          Primary entry — the mic, on-demand provision.  │     │
│  │  /chat/[id]     Full chat page (same component as /talk).      │     │
│  │  /dashboard     Overview + KiraShape inline.                   │     │
│  │  /my-genome     The nine business areas + KiraShape inline.    │     │
│  │  /knowledge     Document library + KiraShape inline.           │     │
│  │  /drafts        AI-drafted documents + KiraShape inline.       │     │
│  │  /requests      Owner requests + KiraShape inline.             │     │
│  │  /genome-knowledge  Per-area knowledge + KiraShape inline.     │     │
│  │  /settings      Account settings.                              │     │
│  │  /manage/*      Org management (members, invitations, kira).   │     │
│  │                                                                 │     │
│  │  Seven of these mount KiraShapeSection — the inline widget     │     │
│  │  that accepts typed input and therefore owes a distil flush.   │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  /introducer/*    Introducer portal                             │     │
│  │  Brokers/advisers who refer owners. Separate layout,           │     │
│  │  separate session, @caistech/attribution for signed attribution.│     │
│  │  No access to client data — referrals only.                     │     │
│  └─────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘
```

**What trips people up:**

1. **`/admin` and `/distributor` live on the same domain and share the same auth seam** as the
   owner's platform. A distributor is a *different kind of user*, not a different deployment. The
   middleware checks `org_type` on session creation, not at the route level — so a distributor who
   navigates to `/dashboard` sees an empty owner view rather than an error, and a new admin who
   types `/distributor` sees a page that doesn't know who they are.

2. **The corporate-ai-solutions repo is a *different database entirely*.** The HLD §7A already
   states this, but it bears repeating here: there is no cascade between the two Supabase projects,
   and a distributor created at `/admin/organisations` in the Kira repo will NOT appear in the
   corporate-ai-solutions repo's own `/portfolio-admin`. The two are reconciled by the
   `autobootstrap-portals` cron, not by a shared schema.

3. **`/talk` is the single canonical entry for *every* journey type.** A business owner, a
   consultant, and a distributor all reach `/talk`. The journey lane is carried in the URL
   (`?journey=consultant`) and resolved server-side by `resolveCanonicalKiraAgent` — it is never
   inferred from the page the user is on. The same `KiraShape` component is used on all seven
   authenticated pages; the only difference is which agent the server resolves.

4. **The introducer portal is deliberately separate** — different layout, different middleware, no
   access to client data. An introducer *refers*; they never see what Kira captured.

---

## 2B. Identity, organisations and tenancy

Most of the serious defects in this codebase have been identity defects, so this is worth reading
before anything else in the LLD.

```text
Supabase Auth user (login)  ──▶  auth_credentials  ──▶  persons  ──▶  organisation_memberships  ──▶  organisations
   auth.users.id                  the ONLY bridge        person_id      role, status, valid dates       org_type, parent
                                  (+ selected_org_id)                                                   (hierarchy)
                                                         persons  ──▶  ownership_periods   (ownership is separate from membership)
```

- **A person is not a login and not a legacy user.** `auth.users.id` is an authentication identity;
  `persons.person_id` is the canonical person; the older `users` table and its `users.id` are
  **legacy** and must not be used to resolve identity or organisation (`lib/auth.ts` header rules).
- **Organisations form a hierarchy:** a root `project` org ("Kira") → `distributor` orgs
  (consultants/partners) → `client_org`s (the businesses they bring in). An owner who signs up
  directly gets their own organisation.
- **Organisation access requires an active, time-valid membership.** `selected_org_id` on the
  credential chooses between several memberships but grants nothing on its own.
- **Data is organisation-owned.** Conversations, memory, tasks and documents carry
  `organisation_id` (the ownership key) and a `user_id` that records *which person* (provenance).
- **Two ways the server learns who is calling, and they must not be mixed up:**
  1. **Browser requests** carry a Supabase session cookie → `getCurrentOrganisationContext()`.
  2. **Agent tool calls** come from ElevenLabs servers and carry **no cookie**. The person is baked
     into each tool's URL as `?uid=<person_id>` when the agent is provisioned, and resolved with
     `resolveOrganisationForPerson(uid)`. A tool handler that reaches for the session instead fails
     for every caller — this happened twice (LLD §3.2, invariant 4).

**Why one agent per person:** ElevenLabs does not tell a tool webhook which conversation or caller it
belongs to, so the caller's identity must be fixed when the agent is created. One agent per person
is what makes `?uid=` trustworthy.

**Isolation is mostly enforced in application code, not by the database.** Every table has row-level
security, but server routes and tool webhooks use the service-role key, which bypasses it. Tenant
isolation on those paths therefore depends on each query filtering by the right `organisation_id`.
RLS protects only what the browser reads directly. An independent review of this boundary is the
single most valuable security work outstanding.

---

## 3. The voice agent

One ElevenLabs Conversational AI agent per person, living as long as the account. Agent
state is persisted to Supabase (`kira_agents`) and re-created if the ElevenLabs side is deleted.

**Identity.** `kira_agents` carries both `user_id` and `person_id`. Every *person-scoped tool call
resolves identity through `person_id`*, not `user_id` — a person can be a member of several
organisations with different `user_id`s, and a tool that trusted the session's `user_id` wrote to
the wrong owner's data. This was a live production bug, fixed in `4bd06c7`.

**Provisioning.** Agents are minted by Kira's own routes, not by a shared helper:
`/api/kira/create` (from an approved draft) and `/api/kira/ensure` (on demand, behind `/talk`).
Both are idempotent. A PATCH that omits part of `conversation_config` leaves a deployed agent on
whatever it was minted with — see the `turn` note below, which is a live instance of that.

**The kill switch.** `haltState('conversations')` is checked at the top of both the voice start
route and the text route. When it fires, both return 503 immediately — the owner sees "Kira is
briefly unavailable", and no tools run, no memory is written, no vendor time is spent. It is a
hard stop on a misbehaving agent, not a retry.

**Turn-taking is set explicitly, not inherited** — one constant, `KIRA_TURN_CONFIG`
(`lib/kira/turn-config.ts`), on every creation path. Two separate vendor settings matter:
`turn_eagerness` decides when she thinks the person has *finished speaking* (`patient`, so a pause
mid-thought is not taken as the end of a turn), and `turn_timeout` decides how long she waits in
*silence* before re-prompting (vendor default 7 seconds — the "are you still there?" nag). Kira sets
`turn_timeout: -1`, so an owner who goes to fetch a file returns to a quiet line. The first fix
changed only the first setting; the nag survived until the second was found. Confirmed by a tester
on 2026-10-02 (30 seconds of silence, not interrupted).

**The post-call webhook binding is verified, not assumed.** Without it no voice call is recorded,
distilled or remembered, and nothing errors. Creation binds it last and reads it back (LLD §3.6A).

**The LLM is pinned to `gpt-4.1-mini` (portfolio default) and must not be overridden per-agent.**
`gpt-4o-mini` was measured *dropping tool calls* as a long conversation proceeds, which silently
disables the whole memory loop: the agent simply stops calling `recall_memory` / `save_memory`, and
there is no error anywhere to see. A correctly-wired loop still ends up as an agent that
"doesn't remember".

### The tool surface

Nineteen tools on the business journey, authored in `lib/kira/tool-manifest.mjs`. Generated from
that manifest, not hand-maintained here — if this list and the manifest disagree, the manifest
wins.

**Conversation and memory (from `@caistech/elevenlabs-convai`):**
`get_conversation_context` · `recall_memory` · `save_memory`

**Kira's own:**
`search_knowledge` · `discovery_agenda` · `dispatch_task` · `approve_task` · `look_up_financials` ·
`check_tasks` · `search_drive` · `read_document` · `keep_document` · `lookup_contact` ·
`record_refusal` · `facts_to_confirm` · `confirm_fact` · `area_agenda` · `file_manual` ·
`research_organisation`

The package also defines `save_message` and `update_conversation_topic`, and the manifest
**deliberately filters both out**. They ask the model to do filing the post-call webhook already
performs, and it shows in the data — roughly one saved message per fifteen calls. The cost is not
storage, it is *attention*: every tool is an entry in the function-calling menu of a small model on
a long call, which is the exact case where dropping tool calls is measured.

`discovery_agenda` is **first** in the list, matching the prompt instruction to call it before
anything else — the mandatory one-time discovery interview gate. Six of the tools
(`dispatch_task`, `approve_task`, `search_drive`, `read_document`, `keep_document`, `lookup_contact`)
reach Google's APIs and so are business-journey only; the personal journey is a coach and gets
neither.

The tool surface is deliberately narrow. The agent does not execute code, make HTTP requests, or
reach external APIs directly. All side effects go through the tools above, implemented as webhook
routes in the Kira application. Those routes have **no user session**: each is authenticated by a
shared secret header (`x-convai-tool-secret`) and learns whose data it is acting on from the
`?uid=<person_id>` baked into its URL at provisioning (§2B). Anything that writes to an owner's
account outside Kira (sending email, filing documents) additionally requires an explicit approval
the server enforces, not one the prompt merely requests.

---

## 4. The memory loop

The memory loop is the source material. Every conversation with the agent produces a transcript. That
transcript is:

1. Stored verbatim in `conversations` and `conversation_messages`.
2. Passed to a structured extractor that writes durable facts to `kira_memory` — extracted memory,
   scoped to the owner, retrieved by `recall_memory` and surfaced to the agent in the prompt.
3. Linked to tasks created during or after the conversation.
4. Owner-uploaded documents and URLs are a *separate* path — they land in `kira_knowledge` and are
   retrieved by `search_knowledge` (see §5). Conversation-extracted memory and uploaded documents do
   not share a table, and the agent has a different tool for each.

**Invariant:** no conversation is ever discarded. The transcript is the canonical record; extracted
memory and documents are derived and can be regenerated.

**Post-distil sweeps (run in order after every distil):**

1. **Entity sweep** (`forgetParkedEntityLeaks`) — the distil is a *second writer* that
   paraphrases, so a fact about *another business* that `save_memory` correctly parked can be
   re-filed by the distil in wording the parking filter never matched. This sweep removes the
   semantic copy.
2. **Capability claims sweep** (`refileAssistantCapabilityClaims`) — the distil does not know the
   bounds the tools follow, so it can write down Kira's own limitations as facts about the business
   (e.g. "the business has no email system" when what was said was "I cannot send email"). This
   sweep re-files those as assistant state, not business fact.
3. **Genome classification** (`classifyPendingMemories`) — unclassified memories (no
   `genome_section`) are assigned to one of the nine areas. Without this, the Genome page
   regresses: a typed conversation adds facts that never appear in any area, so the count goes up
   while the coverage bar goes *down*. Measured on the operator's own account: nine typed facts,
   all unclassified, coverage visibly worse after talking to her.
4. **Deduplication sweep** (`sweepDuplicateMemories`) — runs *after* classification so that a
   classified row is never parked in favour of an unfiled twin. The ordering is load-bearing.

The extractor is an LLM prompt with a strict JSON schema. It is not a chat model — it is a
structured-information extractor. It lives in `lib/kira/memory-extract.ts`; the distil → dedupe →
persist → semantic-index sequence it plugs into is `completeConversationMemory` in
`@caistech/elevenlabs-convai`.

**The distil trigger is a contract, not a detail.** The post-call webhook is the *voice* path's
distil trigger. The *text* path is separate: a typed message must be explicitly flushed to the
distil pipeline, or it is written to `conversation_messages` and never extracted. Every UI surface
that lets the owner type therefore owes a flush (see LLD §3.6). When this was missed on the inline
`KiraShape` surfaces, facts the owner typed on the portal were persisted but silently never became
memory — a hole with no error anywhere to see.

### Memory privacy

Memory rows are owned by the organisation (`organisation_id`) and attributed to a person (`user_id`
holds the canonical `person_id`). Server paths — including every tool webhook and the distil — use
the service-role key, so isolation there is enforced by each query's `organisation_id` filter, not by
row-level security (§2B). The semantic index in Mnemo is partitioned per person (scope
`kira-user-<id>`) and holds distilled facts only, never transcripts. There is no cross-owner search
or shared index **by design**; that the design holds on every path has not been independently tested.

⚠️ 9 of 90 `kira_memory` rows (2026-10-02) are still attributed to a legacy `users.id` rather than a
`person_id` — written before the 2026-10-01 identity fix. They are invisible to recall for their
owners until migrated (§12).

---

## 5. The knowledge system

`kira_knowledge` holds **owner-supplied documents and URLs** — what he uploaded, what he pasted a
link to, what research produced. It is a document table, not a key/value fact store:

```typescript
type Knowledge = {
  id: string;
  user_id: string;                              // references users(id)
  kira_agent_id: string | null;                 // which Kira it belongs to
  source_type: 'kira_research' | 'user_upload' | 'user_url' | 'user_note';
  title: string;
  url: string | null;                           // set for source_type 'user_url'
  summary: string;
  key_points: string[];
  relevance_note: string | null;
  raw_content: string | null;                   // the extracted document body
  tags: string[];
  topic: string | null;
  token_count: number;
  search_session_id: string | null;
  created_by: 'kira' | 'user';
  created_at: string;
  updated_at: string;
};
```

**Facts extracted from conversation do not live here** — they go to `kira_memory` (§4). The
distinction is load-bearing: `kira_memory` is what the agent *remembers being told*, and
`kira_knowledge` is what it *has been handed*. Conflating them is how an agent ends up quoting a
document as if it were something the owner said.

The extractor decides what is worth keeping. It does not hallucinate — it only extracts what is
explicitly stated or strongly implied in the transcript.

**Uploads are size-capped at 4 MB.** The cap is enforced twice — client-side before the request,
server-side before `formData()` — because a request over the platform's body limit is rejected
*before* it reaches the route, which produced an opaque error with no indication which file or how
large. The server guard exists because the client one is advisory and bypassable.

**The RAG pipeline.** A document that reaches `kira_knowledge` is not yet searchable. The
`ingestKnowledgeDocument` pipeline extracts text (via ElevenLabs as a commodity parser), chunks it
(~1500 chars, 200-char overlap, paragraph/sentence boundary-aware), embeds each chunk, and stores
the vectors in `kira_knowledge_chunks`. Only then can `search_knowledge` retrieve it. Extraction
can lag a beat behind a fresh upload — the pipeline polls briefly rather than racing — so a
document uploaded then immediately asked about may return empty on the first try.

### Knowledge in the voice agent

`search_knowledge` is the agent's **only** path into `kira_knowledge`, and it is **read-only** — it
takes a single `query` and returns passages with their source. There is no tool that writes to
`kira_knowledge`, and that is deliberate: documents enter by owner action (upload or pasted URL via
`/api/kira/knowledge/upload`), so what she can retrieve is bounded by what he chose to give her.

`keep_document` is unrelated despite the name — it retains a document in the owner's **Google
Drive**, part of the write-back path (LLD §6A), not the knowledge library.

**A document only reaches the agent if it is attached to that owner's `kira_agents` row.** Storing
it in `kira_knowledge` without the agent link leaves it in the library and invisible to her — a
silent failure that looks identical to "the knowledge doesn't work".

---

## 6. The swarm (task dispatch) and scheduled jobs

### 6.1 The swarm — how "do this for me" becomes work

When the owner asks for something to be *done* (a quote, an email, a reminder), the agent calls
`dispatch_task`. Kira hands every such intent to one interface, `SwarmCoordinator`
(`lib/kira/swarm/coordinator.ts`), obtained from `getSwarmCoordinator()`, which picks a back end from
`KIRA_SWARM_ADAPTER`:

| Value | Back end | Handles |
|---|---|---|
| unset / `local` (default) | `LocalSwarmStub` (`lib/kira/swarm/stub.ts`) | three task kinds — quote, email, reminder — drafted, held for the owner's approval, then executed; anything else is captured, never dropped |
| `orchestrator` | `OrchestratorAdapter` over HTTP to the orchestrator's `/v1/dispatch` | the orchestrator's task registry, with results returned by callback to `/api/kira/webhooks/task-events` |

The seam is a **wire contract**, not shared types, so the back end can be swapped by configuration.
Nothing leaves on the owner's behalf without his approval (`approve_task`); state lives in
`kira_tasks`. ⚠️ The production value of `KIRA_SWARM_ADAPTER` is an environment setting and is not
visible in the repository — confirm it before reasoning about which back end handled a task.

### 6.2 Scheduled jobs

Next.js cron routes under `app/api/cron/*`, scheduled in `vercel.json`, authenticated by
`CRON_SECRET`. Same database and tooling as the rest of the app, not a separate service. Schedules
are in LLD §12.

- `memory-integrity` — audits the extracted memory for drift and gaps.
- `genome-classify` — classifies memories into the nine Genome areas.
- `capture-consultant-genomes` — creates a placeholder genome for consultant agents without one.
- `red-team-drift` — runs red-team probes and mails on a change in result.
- `reconcile-tasks` — reconciles open tasks against what actually happened.
- `reminders` / `reengagement-emails` / `trial-ending` — lifecycle and trial messaging.
- `auto-record-absence` — records the working pattern of absent owners.
- `autobootstrap-portals` — writes each organisation's canonical portal URL (hourly).

There is no scheduled "weekly synthesis" or "valuation refresh" job.

---

## 7. The introducer channel

Introducers (brokers, accountants, advisers) onboard owners through a signed magic-link flow.
The introducer portal is a separate authenticated area (`/introducer/*`) with its own middleware
and cookie-based session.

Introducers can:

- Invite owners with a pre-filled onboarding link.
- View aggregate pipeline metrics for their invited owners.
- Receive attribution for owners who convert.

Attribution is signed (`@caistech/attribution`) and survives cookie deletion.

---

## 7A. The distributor/consultant channel (org hierarchy) — added 2026-09-22

A **second** partner channel, distinct from §7's introducer channel (introducers refer; they hold no
Supabase account and never touch a client's data). Distributors and consultants are full account
holders who bring Kira to businesses they already work with, under their own methodology.

**The hierarchy.** `organisations.org_type` (`portfolio` | `project` | `distributor` | `client_org`)
+ a self-referential `parent_organisation_id` (migration `20260921000000_chain_of_truth_hierarchy.sql`,
anti-cycle-guarded). One `project`-type root row — legal_name `"Kira"` — was created this session
(`20260922000000_org_hierarchy_root.sql`) as the single row inside Kira's own database that
distributor orgs parent under; it is the one row `parent_organisation_id` is deliberately left NULL
on. `portfolio`-type (Corporate AI Solutions itself) is deliberately not modelled here — that lives
in the *separate* `corporate-ai-solutions` repo's own Supabase project (`/portfolio-admin`), a
different database entirely; the two are NOT the same "Kira project portal" and there is no cascade
between them (an explicit, locked decision — see the register).

**The chain, end to end:**
1. Admin creates a distributor org at `/admin/organisations` (`createOrganisationAction`) — sets
   `org_type='distributor'`, `parent_organisation_id` = the root, and lands a `portals` row
   (`/talk?journey=consultant`).
2. Admin invites the partner (`inviteToOrganisationAction` → `/api/admin/invitations`, real API
   route, admin-session-gated). Email variant `'partner'` (see `lib/invitation/invitation-service.ts`).
3. The partner redeems (`/plan?code=…` → `/talk?journey=consultant`) and gets a `journey_type=
   'consultant'` `kira_agents` row (`getKiraPrompt` branches on `journeyType`, `lib/kira/prompts.ts`).
   ⚠️ **A partner who ALREADY has a Kira login gets no membership from redemption** — the redeem
   route mints a sign-in link and pins `selected_org_id`, which is honoured only when a membership
   exists. Create their `owner` membership when inviting them (done for Darshil Patel, 2026-10-01).
4. The partner's own onboarding conversation runs `getConsultantPrompt` — she asks about their
   practice (who they work with, methodology, outcomes, where Kira should fit) and captures it via
   the same tool-calling pattern used for the client-owner journey, never a parallel pipeline. The
   consultant genome is extracted at the end of a voice call AND of a typed session (typed-only
   interviews produced an empty genome until 2026-10-01).
5. The partner provisions their own clients at `/distributor` (`provisionClientOrganisation`) — a
   plain form today (voice-driven provisioning here is deliberately deferred, see below), which
   sets `org_type='client_org'`, parents the new org under the PARTNER's own org (not the root), and
   auto-grants a `distributor_portfolio` entry.

**⚠️ Persona correctness is load-bearing and was a real, live bug.** `getConsultantPrompt` and
`getBusinessPrompt` (the client-owner journey) must NEVER share the same "WHO YOU ARE" philosophy —
a consultant/distributor partner is not selling their own business, and being told "you are building
YOUR exit" mid-onboarding is the wrong persona bleeding into the wrong journey. Found live 2026-09-22
(routing was correct — `journey_type` was right in the DB — the PROMPT CONTENT was wrong). Fixed via
`lib/kira/exec-philosophy.mjs`'s `consultantPhilosophyFor()`, a sibling to `execPhilosophyFor()` that
shares the persona-neutral operational sections (rapport-fast, act-don't-discuss, human-in-the-loop)
but rewrites the two owner-specific ones. A source fix alone does not reach an already-provisioned
live agent — see `scripts/patch-consultant-philosophy.mjs`, the reusable sweep-and-patch tool.

**RLS closed a real gap the same day:** a bare, unapproved `distributor_portfolio` row used to grant
a distributor unrestricted read/write of a client's org-visibility content with zero
`operating_agreements` check. Closed via `auth_user_has_direct_org_membership()` +
`auth_user_has_distributor_content_agreement()` (migration `20260921140000`) — not yet exploited, the
distributor portal only ever displayed `organisations.legal_name` at the time.

**Narrative consistency (2026-09-22) — the invitation email, the `/talk` first screen, and Kira's own
opening conversation tell ONE story, in one fixed order:** what this does for the partner's practice
→ what it means for their clients → how to start. Never client-benefit-first — a partner should
finish the first screen thinking *"this extends my own practice,"* not *"another AI tool to sell."*
All three artifacts (`lib/invitation/invitation-service.ts`'s `'partner'` variant,
`app/chat/[agentId]/page.tsx`'s `isFirstTimePartner` block, `getConsultantPrompt`'s question list)
were rewritten in lockstep to the same seven things a partner is asked to describe.

**Deliberately not built (Phase 2, scoped out on purpose 2026-09-22):** voice-driven client
provisioning at `/distributor` — today's plain form stays, with explanatory copy added so a partner
isn't confused by the *unrelated* voice widget PRODUCT_STANDARDS §6 requires on every authenticated
route (that widget continues the partner's OWN practice conversation; it is not about the client
being provisioned). An outside-model review found that voice-driven ADMIN org creation would only
ever capture one string (`legal_name`) — disproportionate machinery for the value — and that the
genuinely urgent goal (onboarding real partners) needed no new build at all, since steps 1–4 above
already existed and were verified live. That finding is recorded, not silently dropped: any future
voice-driven-provisioning work should read it first rather than re-deriving the same conclusion.

---

## 8. The landing pages (the front door)

The commercial front door is `app/page.tsx`, a thin dispatcher over **three real, maintained landing
variants** in `components/landing/`:

| Variant | File | Audience |
|---|---|---|
| Consultant | `LandingConsultant.tsx` | **PRIMARY since 2026-09-10** — positions Kira for business advisers/consultants and the BBBO ecosystem |
| Owner ("New") | `LandingNew.tsx` | owner-facing rebuild, used as the owner-flavoured door for code-carrying journeys where configured |
| Owner ("Classic") | `LandingClassic.tsx` | onwards-safe fallback, the previous default |

**Selection** happens once at module scope in `app/page.tsx`:

```
NEXT_PUBLIC_LANDING_VARIANT = "consultant" (default) | "new" | "classic"
```

Unset defaults to the consultant variant. The prefix is load-bearing (must be `NEXT_PUBLIC_` or it
resolves to undefined in the browser). Rollback is a Vercel env change plus redeploy — the switch is
one static branch, and both owner variants remain maintained.

**Why the consultant variant is primary.** The BBBO model is *"the business owner is the
beneficiary; the ecosystem provides the capability."* Kira is one technology capability inside that
ecosystem, not the whole answer — and business consultants are one of the capability providers. The
consultant page answers the consultant's "what's in it for me", states the BBBO mission (1,000
businesses by 31 Dec 2026, 10,000 by 31 Dec 2027, maximising proven True-Value), and positions
Kira's role as *persistent business intelligence between the consultant's engagements* — capture,
organisational memory, surfacing gaps, continuity — never a replacement for the human adviser.

**All three variants share:**

- The **own link set**: valuation, sample genome, sign-in, sign-up, privacy, terms. No variant
  invents routes or offline flows; the valuation is the shared converge point from the hero.
- The **`BetaCodeCarrier`** mounted in `app/page.tsx`: it parks a `?code=` from the URL into
  sessionStorage so an invited beta tester keeps their code through the valuation into `/plan`
  where redemption happens. The beta code is context, not redemption; nothing on the landing
  validates or consumes it (see `components/BetaCodeCarrier.tsx`).
- The **voice agent surface** (`VoiceWidget` + a text-fallback `/api/kira/ask` form). The landing
  agent answers from `/api/kira/ask` and writes nothing to a person's Genome.
- The **guard-tested figures**: the three headline numbers and the example gap are pinned by
  `lib/valuation/landing-example.test.ts` and `lib/valuation/headline-numbers.test.ts` so a landing
  can never drift from the calculator (the 2.25× overstatement of 2026-08-04 is the failure this
  guard exists for).

**Guest vs invited experience.** An invited beta tester arrives with `?code=` and — depending on the
configured variant — lands on the consultant page and *then* walks the owner journey through the
valuation and into the sandbox org. The page copy speaks to the adviser at the door; the product
they reach is the owner's experience. That split is deliberate and is what the beta programme
emails describe.

---

## 9. Shared-packages first

Kira consumes shared packages from `@caistech/*` rather than forking. The standing rule: **if a
shared package covers it, Kira consumes it — a local copy is a defect.** Two fixes made during the
most recent build (the branded unsubscribe page and the resend action on the login error) were made
*in the shared packages*, so every product got them rather than Kira alone.

| Package | Purpose |
|---|---|
| `elevenlabs-convai` | **The voice agent, its tools, the conversation lifecycle, and the shared type surface.** Agent creation/update, tool definitions (`createConversationTools`), signed-URL minting, `DEFAULT_AGENT_LLM`, the post-call distil trigger. The single most important package — Kira cannot run without it. |
| `mnemo` | the semantic-memory transport (the `recall_memory` / `save_memory` partner) |
| `discovery-agent` | the structured voice interview behind the Client Profile |
| `corporate-components` | login, signup, forgot/reset — the whole auth surface |
| `subscription-billing` | Stripe checkout + the subscription webhook lifecycle |
| `email-compliance` → `email-send` | Spam Act footers, suppression, the unsubscribe endpoint |
| `attribution` | signed first-touch attribution |
| `coordination-sdk` | the introducer/broker role model |
| `abn-lookup` | ABN validation and ABR lookup |
| `beta-gate` | trial clock and usage caps |
| `portfolio-gate` (dev dependency) | the CI audit runner behind `gate.yml` — deploy status, route/auth smoke, public-route and first-paint checks, memory-loop gate. Not runtime access control. |
| `sayfix-embed` | the "Report a problem" bug-reporting button on every page |
| `webmcp-kit` | agent discoverability (`/llms.txt`, structured data) |
| `platform-trust-middleware` · `mapbox` | installed; not imported directly by Kira code (address lookup reaches Mapbox through `corporate-components`) |
| `brave-search` · `extractors` | web search and website-content extraction for `research_organisation` (`lib/kira/practice-intelligence/research.ts`) |
| `kira-testing-client` | red-team runner client (`scripts/red-team.mjs`). ⚠️ Installed as a **local file dependency** (`file:../cais-shared-services/packages/kira-testing-client`): clone `cais-shared-services` beside `Kira` or `npm install` fails (LLD §11). |

---

## 10. Email Suppression and Compliance

Email suppression persistence has been migrated behind the Orchestrator authenticated boundary. Kira
no longer directly uses a Supabase service-role key for this capability.

- **SuppressionStore:** `lib/email/suppressions.ts` now implements `@caistech/email-compliance`'s
  `SuppressionStore` interface via `OrchestratorSuppressionStore`, which proxies requests to the
  Orchestrator's `/api/v1/kira/email/suppressions` endpoint using a secure webhook credential.
- **Authoritative Record:** `email_suppressions` remains the canonical, global suppression authority,
  consulted before all commercial email sends.
- **Security:** Kira is an unprivileged caller; it does not hold the Supabase service-role credential
  required to write directly to suppression tables.
- **Verification:** End-to-end production verification completed on 24 August 2026, confirming
  normalisation, idempotency, and secure boundary enforcement.

---

## 11. Deployment

| Concern | Choice |
|---|---|
| Hosting | Vercel, Next.js App Router. Server components by default. **Every push to `main` deploys to production** via the Vercel Git integration; there is no staging environment and no branch protection yet. |
| Database | Supabase (Postgres + pgvector + Auth), Mumbai region, row-level security on every table |
| Voice | ElevenLabs Conversational AI, one agent per person, in a workspace shared with other portfolio products |
| LLM | OpenAI (`gpt-4.1-mini` for the agent and the typed transport; extraction and embeddings also OpenAI) |
| Payments | Stripe, monthly in arrears; live/test selected by an explicit environment flag |
| Email | Resend, on the verified subdomain `updates.corporateaisolutions.com` |
| Scheduled jobs | Vercel cron (`vercel.json`) — ten jobs, listed in LLD §12 |
| Secrets | Vercel environment variables, marked sensitive, production + preview only |

**CI (GitHub Actions, `.github/workflows/`):**

| Workflow | When | What it checks |
|---|---|---|
| `gate.yml` | every push and PR | typecheck, lint, build, unit tests, route/auth smoke, app-chrome and voice-reachability checks, design tokens, deploy status, public routes |
| `memory-loop.yml` | daily + pushes touching the loop | the five-check memory probe against the deployment (LLD §3.4) |
| `health-sensors.yml` | every 6 hours | production health probes |
| `red-team.yml` | Mondays | adversarial conversations against the agent, scored by observed side-effects |
| `naive-tester.yml` | on deployment + Mondays | a scripted persona walking the live product in a browser |

The unit suite is ~2,000 tests (Vitest). It is strong on logic and weak on integration: several of
the worst defects passed every test because the test exercised a mock, not the database or the
vendor (§12).

### 11.1 Security model at a glance

| Boundary | Control |
|---|---|
| Browser → Kira | Supabase session cookie; middleware gates `/admin` (session + `ADMIN_EMAILS` allowlist), `/distributor` (distributor membership), owner routes (session), `/introducer` (signed cookie, no Supabase account) |
| ElevenLabs → Kira tool webhooks | Shared secret header; fail-closed (unset secret → 500, wrong secret → 401); person from the baked `?uid=` |
| ElevenLabs → Kira post-call | HMAC signature over the raw body; unsigned → 401 |
| Kira → orchestrator | Per-caller shared secrets; email/beta-code callers are scoped and non-interchangeable |
| Stripe → Kira | Webhook signature; idempotent on event id |
| Server → database | Service-role key on server paths (bypasses RLS — isolation is in the queries, §2B); publishable key in the browser (RLS applies) |
| Emergency stop | `haltState('conversations')` — returns 503 on voice start and the typed route; no tools run, nothing is written |
| Outbound writes on the owner's behalf | Server-enforced explicit approval (`approved === true`), never prompt-only |

### 11.2 Third-party processors

| Processor | Receives | Region / note |
|---|---|---|
| Supabase | All application data | Mumbai, India |
| Vercel | Requests, logs | Global edge |
| ElevenLabs | Voice audio, transcripts, agent prompts | Workspace shared across portfolio products |
| OpenAI | Typed conversation turns, extraction and embedding inputs | — |
| Mnemo | Distilled facts only (no transcripts), per-person scopes | External semantic memory |
| Resend | Outbound email content and addresses | — |
| Stripe | Billing identities | — |
| Google / Microsoft / Xero | Via the orchestrator, only for owners who connect them | OAuth, per-owner consent |

---

## 12. Known gaps

Stated rather than omitted. As at 2026-10-02.

### 12.1 Production-readiness gaps (the work a development partner is being asked to scope)

| Area | Gap |
|---|---|
| Tenant isolation | Server paths use the service-role key, so isolation depends on every query filtering by `organisation_id`. No automated cross-tenant test suite exists; the distributor → client hierarchy multiplies the cases (§2B, §7A). |
| Type safety in CI | Until 2026-10-02 neither CI nor the production build checked types (`next.config.js` sets `ignoreBuildErrors: true`; the CI step called an `npm run typecheck` script that did not exist, and `--if-present` skipped it silently). `main` failed `tsc` for over a week unnoticed. The `typecheck` script now exists, so CI checks types; the production build still does not. |
| Integration testing | ~2,000 unit tests, mostly against mocks. Three tools were broken for weeks while their tests passed (§12.2). There is no test that exercises a real database schema or a real vendor callback in CI beyond the memory probe. |
| Release process | Every push to `main` deploys to production. No staging, no branch protection, no required review. |
| Observability | Vercel runtime logs are not reachable by the build tooling (permission scope), and retention is short. Silent failures — wrong identity, unbound webhook, tool returning "not found" — produce no alert. |
| Shared vendor workspace | All portfolio products share one ElevenLabs workspace; a misconfigured script can affect other products' agents. |
| Data residency | Supabase is in Mumbai; the product's first market is Australia. Not yet decided whether that is acceptable to clients. |
| Supabase key model | Migration from the legacy JWT keys to the API-key model was validated on Preview only (2026-08-25); production status should be confirmed. |
| Email outside Australia | Kira will not send email for non-Australian businesses until each country's law is implemented (LLD §5.1A). |

### 12.2 Defect classes seen repeatedly — check for more of each

1. **Session identity in a webhook.** `file_manual` resolved the organisation from a browser session
   inside an ElevenLabs tool webhook (no session exists) — it had never filed anything. Fixed
   2026-10-02. Audited the same day: every other webhook path resolves identity with
   `resolveOrganisationForPerson(uid)`; a new handler that calls `getCurrentOrganisationContext()`
   reintroduces the bug.
2. **Code ahead of the schema.** `confirm_fact` inserted columns the table did not have — zero rows
   ever written, test green against a mock. Fixed 2026-10-02 with a migration-backed column check.
3. **Legacy id vs person id.** Typed memory, voice conversation rows and tool calls were all, at
   different times, written under the legacy `users.id` and read by `person_id`. Fixed 2026-09-30 /
   10-01; **9 of 90 `kira_memory` rows still carry a legacy id** and need migrating.
4. **Concurrent writes to the same vendor object.** The post-call webhook binding was erased by a
   concurrent allowlist write on 4 of 5 new agents, each logging success. Fixed 2026-10-01 by
   sequencing and read-back.
5. **A setting changed in source but not in the fleet.** Agent configuration lives in ElevenLabs; a
   source change reaches no live agent until re-provisioned or patched.

### 12.3 Not verified

- **`confirm_fact` and `file_manual` after the 2026-10-02 fixes:** no real confirmation has been
  written yet (a test write would manufacture a fact on a real person's record). Filing additionally
  needs the owner to have connected document storage; for one who has not, the expected result is an
  honest "nowhere to file", not a filed manual.
- **Typed turns shown in the transcript and the "Copy conversation as text" button**
  (`@caistech/elevenlabs-convai` 0.17.2/0.17.3): not exercised in a browser.
- **Accounts created before migration `20260907090000`** — whether every `kira_agents.user_id`
  resolves to a `persons` row was not checked.

### 12.4 Closed decisions (for context)

- **Valuation band** (2026-08-03/04): the sector median is a centre rather than a floor, Kira's
  claimed uplift is bounded at 0.75 turns, and everyone is rescored. See LLD §6.2.
- **Silence re-prompt** (2026-10-01/02): `turn_timeout: -1`; confirmed by a tester (§3).