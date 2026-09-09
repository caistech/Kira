# Kira — High-Level Design

**Audience:** someone who needs to understand what Kira is and how it hangs together without
reading the code — a prospective licensee, an introducer's technical adviser, an investor's
diligence contact, or a new engineer on day one.

**Companion:** `docs/LLD.md` holds the contracts, schemas and invariants. This document stops at
the boundary of "what talks to what, and why."

**Status:** describes `main` as at 2026-09-10. Where something is deliberately *not* built, it says
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

## 3. The voice agent

One ElevenLabs Conversational AI agent per owner. The agent is created at onboarding and lives as
long as the owner's account. Agent state is persisted to Supabase (`elevenlabs_agents`) and
re-created if the ElevenLabs side is deleted.

Tools exposed to the agent:

- `save_message` — append to the owner's conversation transcript
- `start_conversation` — create a new conversation record
- `update_conversation` — rename, retag, or close a conversation
- `search_memory` — semantic search over the owner's accumulated transcripts (RAG over pgvector)
- `write_knowledge` — store a structured fact extracted from conversation
- `read_knowledge` — retrieve a structured fact
- `list_knowledge` — list facts by category
- `create_task` — create a follow-up task for the owner
- `complete_task` — mark a task complete
- `search_tasks` — search tasks

The tool surface is deliberately narrow. The agent does not execute code, make HTTP requests, or
reach external APIs directly. All side effects go through the tools above, which are implemented
in the Kira application and secured by the owner's session.

---

## 4. The memory loop

The memory loop is the source material. Every conversation with the agent produces a transcript. That
transcript is:

1. Stored verbatim in `conversations`.
2. Chunked, embedded and written to `memory_chunks` (pgvector) for semantic search.
3. Passed to a structured extractor that writes durable facts to `knowledge`.
4. Linked to tasks created during or after the conversation.

**Invariant:** no conversation is ever discarded. The transcript is the canonical record; chunks
and extracted knowledge are derived and can be regenerated.

The extractor is an LLM prompt with a strict JSON schema. It is not a chat model — it is a
structured-information extractor. The schema is versioned and lives in `lib/kira/memory-extractor.ts`.

### Memory privacy

All memory data is scoped to the owner's user id. Row-level security enforces this at the database
layer. There is no cross-owner search, no shared index, no multi-tenant leakage.

---

## 5. The knowledge system

`knowledge` holds structured facts extracted from conversations:

```typescript
type Knowledge = {
  id: string;
  user_id: string;
  category: 'business' | 'personal' | 'financial' | 'legal' | 'contacts' | 'preferences' | 'other';
  key: string;
  value: string;
  confidence: number;     // 0–1, extractor's self-reported confidence
  source_conversation_id: string | null;
  created_at: string;
  updated_at: string;
};
```

The extractor decides what is worth keeping. It does not hallucinate — it only extracts what is
explicitly stated or strongly implied in the transcript.

### Knowledge in the voice agent

The agent can call `write_knowledge`, `read_knowledge`, `list_knowledge`. This means the agent
can both learn from and act on the owner's accumulated knowledge within the same conversation.

### Knowledge in the swarm

The swarm (see §6) can also read knowledge, so owner facts are available to background agents.

---

## 6. The swarm

A set of background agents that run on a schedule or are triggered by events:

- **Daily catch-up** — reviews the day's conversations, extracts any missed knowledge, creates
  follow-up tasks.
- **Weekly synthesis** — summarises the week's activity, highlights decisions, surfaces risks.
- **Compliance check** — scans for regulatory/compliance signals in new knowledge.
- **Valuation refresh** — re-runs the valuation model when financial knowledge changes.
- **Trial monitor** — enforces trial limits and sends lifecycle emails.

The swarm runs in the Kira application (Next.js cron routes) and uses the same Supabase client
and tooling as the voice agent. It is not a separate service.

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
| `supabase-client` | browser / server / service-role clients |
| `mnemo` | the semantic-memory transport |
| `discovery-agent` | the structured voice interview behind the Client Profile |
| `corporate-components` | login, signup, forgot/reset — the whole auth surface |
| `subscription-billing` | Stripe checkout + the subscription webhook lifecycle |
| `email-compliance` → `email-send` | Spam Act footers, suppression, the unsubscribe endpoint |
| `attribution` | signed first-touch attribution |
| `coordination-sdk` | the introducer/broker role model |
| `abn-lookup` | ABN validation and ABR lookup |
| `beta-gate` | trial clock and usage caps |
| `platform-trust-middleware` → `sayfix-embed` → `webmcp-kit` | rate limiting + audit → bug reporting → agent discoverability |

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
  f