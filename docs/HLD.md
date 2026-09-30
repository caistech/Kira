# Kira — High-Level Design

**Audience:** someone who needs to understand what Kira is and how it hangs together without
reading the code — a prospective licensee, an introducer's technical adviser, an investor's
diligence contact, or a new engineer on day one.

**Companion:** `docs/LLD.md` holds the contracts, schemas and invariants. This document stops at
the boundary of "what talks to what, and why."

**Status:** describes `main` as at 2026-09-30. Where something is deliberately *not* built, it says
so — an HLD that quietly omits the gaps is worse than none.

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
┌─────────────┐     ┌──────────────────────────┐
│   Owner     │────▶│     Voice agent          │
│  (human)    │     │  (ElevenLabs Conv. AI)   │
└─────────────┘     └───────────┬──────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────┐
│                 Kira App (Next.js)              │
│  ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │  Talk    │ │  Memory  │ │  Knowledge /   │  │
│  │  route   │ │  loop    │ │  Swarm         │  │
│  └──────────┘ └──────────┘ └────────────────┘  │
└────────────────────────┬────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌─────────┐     ┌──────────┐     ┌──────────────┐
   │Supabase │     │ ElevenLabs│    │  Orchestrator │
   │ (RDS)   │     │  (Voice)  │    │ (Auth/State)  │
   └─────────┘     └──────────┘     └──────────────┘
```

**Orchestrator** is a separate deployed service (`connect.kiraexec.com`) that owns privileged
Supabase access and mediates stateful operations on behalf of Kira and other portfolio products.
Kira is an **unprivileged caller** to the Orchestrator. It authenticates with one of two scoped,
non-interchangeable webhook credentials — `kira-webhook` (email boundary: suppressions, alert
throttle, owner enrichment) and `kira-public` (beta codes) — and never holds a Supabase
service-role key for the migrated capabilities.

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

One ElevenLabs Conversational AI agent per owner, living as long as the owner's account. Agent
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

**Turn-taking is set explicitly, not inherited.** The ElevenLabs default for
`conversation_config.turn.turn_eagerness` is `normal`, which reads ~7 seconds of user silence as
end-of-turn and has the agent talk over a person who is merely thinking. Kira sends `patient` on
every creation path. The product's entire surface is a voice call, so this is a correctness
requirement, not a preference.

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
reach external APIs directly. All side effects go through the tools above, which are implemented
in the Kira application and secured by the owner's session.

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
structured-information extractor. The schema is versioned and lives in `lib/kira/memory-extractor.ts`.

**The distil trigger is a contract, not a detail.** The post-call webhook is the *voice* path's
distil trigger. The *text* path is separate: a typed message must be explicitly flushed to the
distil pipeline, or it is written to `conversation_messages` and never extracted. Every UI surface
that lets the owner type therefore owes a flush (see LLD §3.6). When this was missed on the inline
`KiraShape` surfaces, facts the owner typed on the portal were persisted but silently never became
memory — a hole with no error anywhere to see.

### Memory privacy

All memory data is scoped to the owner's person id. Row-level security enforces this at the database
layer. There is no cross-owner search, no shared index, no multi-tenant leakage.

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

### Knowledge in the swarm

The swarm (see §6) can also read knowledge, so owner facts are available to background agents.

---

## 6. The swarm

Background jobs, implemented as Next.js cron routes under `app/api/cron/*` — the same Supabase
client and tooling as the voice agent, not a separate service. What actually ships:

- `memory-integrity` — audits the extracted memory for drift and gaps.
- `genome-classify` — classifies genome entries.
- `capture-consultant-genomes` — pulls in consultant genomes.
- `red-team-drift` — runs red-team probes for behavioural drift.
- `reconcile-tasks` — reconciles open tasks against what actually happened.
- `reminders` / `reengagement-emails` / `trial-ending` — lifecycle and trial messaging.
- `auto-record-absence` — records the working pattern of absent owners.
- `autobootstrap-portals` — provisions distributor/consultant portals.

There is no scheduled "weekly synthesis" or "valuation refresh" job in the codebase; if one is
needed it does not exist yet.

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
4. The partner's own onboarding conversation runs `getConsultantPrompt` — she asks about their
   practice (who they work with, methodology, outcomes, where Kira should fit) and captures it via
   the same tool-calling pattern used for the client-owner journey, never a parallel pipeline.
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
| `portfolio-gate` | portfolio-level access control for the distributor/consultant hierarchy |
| `platform-trust-middleware` → `sayfix-embed` → `webmcp-kit` | rate limiting + audit → bug reporting → agent discoverability |
| `brave-search` | web search (used by research_organisation) |
| `extractors` | document text extraction (used by knowledge ingest) |
| `mapbox` | mapping (used by the valuation and address flows) |
| `kira-testing-client` | shared test utilities for the Kira test suite |

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
| Hosting | Vercel, Next.js App Router. Server components by default. |
| Database | Supabase (Postgres + pgvector + Auth), row-level security on every table |
| Voice | ElevenLabs Conversational AI, one agent per user |
| Payments | Stripe, live/test selected by an explicit environment flag |
| Email | Resend, on a verified sending subdomain |
| Secrets | Vercel environment variables, marked sensitive, production + preview only |

**CI gate on every push:** typecheck → lint → build → route smoke → auth smoke → memory-loop probe
→ static voice-memory audit. Green is the bar. Nothing about the memory loop is taken on trust.

---

## 12. Known gaps

Stated rather than omitted.

- **The valuation band decision is CLOSED** (2026-08-03/04): the sector median is a centre rather
  than a floor, Kira's claimed uplift is bounded at 0.75 turns, and everyone is rescored rather than
  frozen at a historical multiple. See BUILD_REGISTER entry for `LLD 6`.

- **Voice timing with `turn_eagerness: patient` is unverified by listening** (2026-09-30): the
  config change was reasoned from the reported symptom and applied across all 30 agents; nobody has
  been on a call with a real microphone since. If she still interrupts, the next lever is
  `soft_timeout_config.timeout_seconds` (currently disabled at `-1`), not a prompt change. The
  relevant entry is BUILD_REGISTER AA.

- **`KiraShape` distil flush has not been verified end-to-end in production** (2026-09-30): the
  code path and trigger set are in place and typechecked; no typed-then-reload-then-verify cycle
  has been run against a real deployment. See BUILD_REGISTER AA.

- **The text-transport `person_id` fix** (2026-09-30, `4bd06c7`) was live-verified against one
  fresh account; whether any account created **before** the `20260907090000` migration carries a
  `kira_agents.user_id` that does not resolve to a `persons` row was not checked. Voice transport
  was reasoned about, not re-tested.