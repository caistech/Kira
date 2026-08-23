# Kira — High-Level Design

**Audience:** someone who needs to understand what Kira is and how it hangs together without
reading the code — a prospective licensee, an introducer's technical adviser, an investor's
diligence contact, or a new engineer on day one.

**Companion:** `docs/LLD.md` holds the contracts, schemas and invariants. This document stops at
the boundary of "what talks to what, and why."

**Status:** describes `main` as at 2026-08-18. Where something is deliberately *not* built, it says
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
2. **Memory is the product.** An assistant that forgets is a novelty. Continuity across sessions is
   the thing being sold, which is why it is the most heavily guarded part of the system (§5).
3. **The buyer is often not the user.** Kira reaches owners through **introducers** — brokers,
   accountants and advisers who already hold the relationship. That is a distribution channel with
   its own portal, permissions and commercial terms, not a referral link bolted on.

### Second vertical: PubGuard

The same repo also hosts **PubGuard**, a public-exposure scanner (what a business is leaking across
GitHub, infrastructure, news and social). It shares the voice stack and the Supabase project but is
otherwise independent — separate routes, tables and scoring. It is called out here so a reader
isn't surprised by it; it does not participate in the flows below.

---

## 2. The three planes

Kira is best understood as three planes over one datastore. They have different users, different
auth, and different risk.

```
┌────────────────────────────────────────────────────────────────────────┐
│ PLANE 1 — PUBLIC FUNNEL                            no auth             │
│ landing · /business-valuation · /plan · /advisors · /privacy · /terms   │
│                                                                        │
│ Anonymous. Produces a valuation and a price, then asks for the sale.   │
│ Carries NO durable identity — the valuation is a per-tab handoff.      │
└───────────────────────────────┬────────────────────────────────────────┘
                                │ Stripe checkout
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PLANE 2 — THE OWNER'S PRODUCT                      user session        │
│ /talk · /chat · /dashboard · /knowledge · /settings                    │
│                                                                        │
│ Where the work happens. A per-user ElevenLabs voice agent with a       │
│ persistent memory loop, a knowledge base, and a task swarm.            │
└───────────────────────────────┬────────────────────────────────────────┘
                                │ status only, never content
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PLANE 3 — OPERATOR + CHANNEL           two SEPARATE auth systems       │
│ /admin/*        operator console   — Supabase session ∩ ADMIN_EMAILS   │
│ /introducer/*   channel portal     — signed magic-link cookie          │
│                                                                        │
│ Deliberately different mechanisms. See §4.                             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The owner's journey, end to end

```
  Introducer sends /r/<token>
        │
        ▼  first-touch attribution cookie   (signed, HttpOnly, write-once)
  Landing ──► /business-valuation ──► three numbers + the gap
        │                                    │
        │                              sessionStorage handoff
        │                                    ▼
        │                                  /plan  ──► price derived from the gap
        │                                    │
        │                              Stripe Checkout
        │                                    ▼
        │                          webhook: subscription active
        ▼                                    │
  signup / login ◄───────────────────────────┘
        │
        ▼
  DISCOVERY  — a structured voice interview that builds the Client Profile
        │
        ▼
  Kira is provisioned  — one ElevenLabs agent per user, tools bound to that user
        │
        ▼
  ONGOING  ─ talk ─► memory recalled ─► work done + logged ─► memory persisted
                             ▲                                      │
                             └──────────────────────────────────────┘
                                        the loop that IS the product
        │
        ▼
  HE PUSHES  — /my-genome shows nine areas; he opens one, sees the buyer questions
               his record does NOT answer, and works them with her (see §6).
               She is ON that page — and on the dashboard, drafts, requests and
               knowledge — and opens by naming the gaps rather than the live job.
        │
        ▼
  IT LEAVES  — the manual is written into the owner's OWN storage, or downloaded
               as one self-contained file that needs no account and no us
```

**The last step is the point, and it was missing until 2026-08-05.** Extraction on its own moves
knowledge out of the owner's head and into *our* database, which for him is a worse place than his
head because he cannot get it out without us. A migration that never reaches the destination is not
a migration. See LLD §6A.

**Where Kira herself appears — corrected 2026-08-18.** Until that date not one authenticated page
carried her. She lived on three surfaces, none of them in the navigation, and everywhere an owner
actually works she was a sentence pointing elsewhere or a floating button in the corner. That button
was then unmounted inside an unrelated change, and fourteen beta invitations went out two days
later — so testers walked a product whose primary interface had no permanent way in. She is now
embedded on `/dashboard`, `/my-genome`, `/drafts`, `/requests` and `/knowledge`; `/settings` and
`/setup/*` opt out with stated reasons; and a CI check fails the build if any page loses her. She
renders on arrival and connects only when tapped — no microphone is requested for landing on a page,
and no agent is created by a page view. LLD §3.5.

The attribution cookie is set at the very first touch and is **never overwritten**. Commission is
decided by that signed cookie alone — a free-text "how did you hear about us?" answer is recorded
as a hint for a human, never as an attribution. Money and self-reported data are kept apart on
purpose.

---

## 4. Trust boundaries

Four distinct identities exist. Confusing any two of them is the failure mode this section exists
to prevent.

| Identity | Proves it with | Reaches | Cannot reach |
|---|---|---|---|
| **Visitor** | nothing | public funnel | anything with data in it |
| **Owner (user)** | Supabase session | their own product surfaces + their own data | `/admin`, `/introducer`, any other user |
| **Operator (admin)** | Supabase session **AND** email in `ADMIN_EMAILS` | `/admin/*` | — |
| **Introducer** | signed magic-link cookie | `/introducer/*` — **status only** | any owner's content, ever |

Two design choices worth stating explicitly, because both are load-bearing:

**Introducers do not get accounts.** They authenticate by a signed, expiring magic link rather than
a Supabase user. An introducer is not a user of the product; giving them a user identity would
put them one permissions bug away from an owner's data. The separation is structural, not a check.

**Introducers see a projection, not a filtered view.** What they can see — that a referral exists
and roughly where it has got to — is produced by a dedicated database projection that has no path
to conversation content. This is enforced in SQL, not in a route handler, so no future UI change
can widen it by accident. The role model comes from the shared `@caistech/coordination-sdk`, whose
`introducer` role grants `view_status` and pointedly not `view`; the session refuses to open at all
if that role ever gains content access.

---

## 5. The memory loop — the part that matters most

Everything else here is ordinary web engineering. This part is not, and it is what makes Kira
worth something.

```
   Owner speaks
        │
        ▼
   START ──────► recall what we know about THIS owner ──► injected into the agent's context
        │                                                          │
        │                                              agent speaks with continuity
        ▼                                                          │
   DURING ─────► facts captured as they surface ◄──────────────────┘
        │
        ▼
   END ────────► distil the conversation into results, not transcript
                          │
                          ├──► kira_memory      (our Supabase — the authority)
                          └──► Mnemo            (semantic index — recall by meaning)
```

**Five properties are non-negotiable.** Each exists because its absence has broken something:

1. **Identity is derived on the server, never accepted from the caller.** ElevenLabs does not pass
   a conversation id to tool webhooks — the agent sends only what its language model chose to fill
   in. So the owner is fixed at *provisioning* time and baked into the tool URLs. This is the whole
   reason for one-agent-per-user. Trusting a caller-supplied id here means one user reading
   another's memory.
2. **Every webhook verifies a shared secret.** An unauthenticated memory endpoint is a read of
   anyone's history by anyone who finds the URL.
3. **It stores results, not raw material.** Distilled conclusions, not transcripts. Cheaper to
   recall, and it keeps raw personal detail out of the external index.
4. **It degrades rather than fabricates.** If recall fails, the agent says it doesn't have
   something. It never invents continuity, which would be worse than admitting the gap.
5. **It is verified by CI on every push, not by inspection.** A five-check probe runs against the
   deployed webhooks — save, recall, auth rejection, cross-user isolation, and continuity between
   two separate conversations. A static audit separately confirms the semantic write is wired,
   because the runtime probe cannot see the post-call path.

Point 5 is a direct response to being burned: the probe existed for weeks and was running in zero
repositories. A guard nobody runs is not a guard.

---

## 6. The Genome as a SCORED record — the four gates

§5 gets facts out of his head. This decides whether they are worth anything to a buyer, and it is
the difference between a notebook and a document somebody will pay against.

His business is held as **nine areas** (`lib/genome/areas.ts`, derived bottom-up from ~140 flows in
the orchestrator's task registry — not invented). Each area is a question a buyer's advisor asks.
Each carries a **checklist** of the facts that answer it (`lib/genome/checklist.ts`, 52 items).

Every item passes four gates:

| Gate | Question | Where it lands |
|---|---|---|
| **1 Answered** | is anything on the record at all? | the coverage band |
| **2 Substantive** | does it pass the item's own test — and if not, **why**? | the band + what Kira asks next |
| **3 Located** | his head, paper, a laptop, his cloud, a system? | transferability, and a named next action |
| **4 Remediated** | if no answer can fix it, what would — and has any of it happened? | a pathway, and the score |

**Gate 2 is what makes green mean something.** Before it, a band was a tally: six entries of any
kind read as "well covered". Measured against the operator's own Genome, that tally disagreed with
the checklist in **six of nine areas, always flatteringly** — `operations` read *covered* on 28
entries that answered no buyer question at all. A failing item therefore carries its **reason**, in
his language, and that reason is the next question rather than a score.

**Gate 4 exists because some gaps do not close with words.** Writing down that only he can run a job
does not make it less true. Those items (`closes: 'change'`) get a **pathway** — a sequence of real
changes with observable milestones — and one rule governs it:

> **Making the plan moves nothing. Only evidencing a milestone does.**

Reward the plan and the product rewards *intending* to change, which is more flattering than
rewarding talking and takes longer to disprove. He would reach a data room with a good number and a
business that still stops when he does.

### Two numbers, and only one of them moves

| | |
|---|---|
| `readiness` | **the baseline** — what the thirteen questions said on the day he paid. **Frozen.** |
| `readiness_now` | where the evidence says he is now. Recomputed from assessed items. |

Recomputing the first in place would silently rewrite the number he was shown, which is exactly what
`MODEL_VERSION` exists to prevent. Progress is a delta from a fixed origin or it is not progress.

**It is allowed to fall, and that is the feature.** Capture reveals dependencies nobody had priced —
*"nobody could step into my job"* is evidence that should LOWER transferability however diligently he
answered. On the first real run it did: 0.406 → 0.399. A machine where every answer raises the score
is a machine that rewards talking.

### Where the questions come from

Nothing prompted her to ask, so she talked about the last live job — and the last live job is always
the one in front of him. The `area_agenda` tool hands her at most three outstanding questions for one
area, **weak answers first**, because a model given a mixed list asks the easy new question every
time. The panel at `/my-genome/[area]` is the owner's way in; the trigger it passes carries only the
**area**, never the questions, so she pulls what is current at the moment she speaks.

Full design: `docs/SPEC_GENOME_CHECKLIST_AND_PATHWAYS.md`. Detail: LLD §6B.

---

## 7. Where data lives, and why

Three stores, chosen by one question: **what does it cost to be approximately right?**

| Store | Holds | Chosen when |
|---|---|---|
| **Supabase (Postgres)** | users, subscriptions, introducers, valuations, memory, knowledge | The value must be exact and auditable. Everything commercial and everything legal. |
| **pgvector** (same DB) | embedded chunks of the owner's uploaded knowledge | Retrieval by meaning over the owner's *own* documents, answers cited back to the source. |
| **Mnemo** (external) | distilled experiential facts | Recall by meaning where "approximately right" is fine and often better. Never the authority. |

The rule that keeps this honest: **Supabase is always the authority.** Mnemo is an index over
conclusions we already hold. If the two disagree, Supabase wins — and Mnemo being down degrades
recall quality without losing anything.

---

## 8. What Kira does not build itself

Kira consumes fourteen shared `@caistech/*` packages. This is the deliberate economic core of the
portfolio: the substrate is built once and every product draws on it, so product number fifteen is
cheap.

| Package | What Kira gets from it |
|---|---|
| `elevenlabs-convai` | the entire voice stack + the canonical memory pipeline |
| `mnemo` | the semantic-memory transport |
| `discovery-agent` | the structured voice interview behind the Client Profile |
| `corporate-components` | login, signup, forgot/reset — the whole auth surface |
| `subscription-billing` | Stripe checkout + the subscription webhook lifecycle |
| `email-compliance` · `email-send` | Spam Act footers, suppression, the unsubscribe endpoint |
| `attribution` | signed first-touch attribution |
| `coordination-sdk` | the introducer/broker role model |
| `abn-lookup` | ABN validation and ABR lookup |
| `beta-gate` | trial clock and usage caps |
| `platform-trust-middleware` · `sayfix-embed` · `webmcp-kit` | rate limiting + audit · bug reporting · agent discoverability |

The standing rule: **if a shared package covers it, Kira consumes it — a local copy is a defect.**
Two fixes made during the most recent build (the branded unsubscribe page and the resend action on
the login error) were made *in the shared packages*, so every product got them rather than Kira
alone.

---

## 9. Deployment

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

## 10. Known gaps

Stated rather than omitted.

- **The valuation band decision is CLOSED** (2026-08-03/04): the sector median is a centre rather
  than a floor, Kira's claimed uplift is bounded at 0.75 turns, and everyone is rescored rather than
  frozen. It reprices nothing, because `business_valuations` was empty. LLD §6.2.
- **Two product decisions remain open**, both needing a call rather than code: whether the industry
  field must be a selection, and whether to override the vendor voice-consent text now that the
  privacy policy reconciles it.
- **The step-down trigger is undecided.** The RATE is decided and live — one third of the band,
  narrow scope, keeping the manual current rather than the day-to-day assistant. *When* it is
  reached is not, because it needs a defensible denominator (register B4, deactivation): a
  percentage of an unknown total is not a threshold. No date or timeframe appears anywhere in the
  product, and a test enforces that.
- **`sde-multiples.ts` is US data.** An Australian broker independently quoted 1–1.5× for trade
  businesses. Australian bands by niche are the highest-value outstanding input to the number the
  whole product sells on.
- **Nothing is validated by a customer.** Zero stored valuations; one active subscription, the
  operator's own. Every claim about what an owner experiences is inference from design.
- **Team admin** (organisations, member roles, invitations) is not built. Kira is one owner per
  account today. This becomes required the moment an account needs a second seat.
- **PubGuard holds conversation state in process memory**, which is not safe across multiple
  instances. Documented in the repo; move to Supabase when load warrants it.
- **The introducer valuation handoff is per-tab.** Opening `/plan` in a new tab asks for the
  valuation again — accepted deliberately, to keep financial figures out of URLs.
- **Pathways (§6 gate 4) have a table, an engine and no UI.** Nothing creates one. The offer is made
  in conversation and is not tracked, so gate 4 is real in the model and untestable in the product.
- **`sde-multiples.ts` is US data — and the AU guide now contradicts it in a SECOND place.** Beyond
  the note above, the geography question is closed but SIZE reopened (2026-08-14): Kira reads
  1.6–2.9× high at ≤$250k SDE. ⚠️ Re-weighting requires a `MODEL_VERSION` bump, and the rescore
  `reason` is keyed to it and hard-stops.
- **Six of nine areas on the operator's own Genome cannot be assessed at all**, because they hold no
  facts that answer a buyer question — 96 filed memories and `people`/`assets` empty. The rubric did
  not cause this; it made it visible. §6 is the fix. **Partially walked 2026-08-18:** the
  genome-aware opener fired live on the operator's account ("four parts a buyer's advisor would ask
  about that I know almost nothing about yet — the biggest gap is who does the work"), which is the
  first observation of her opening on the gaps rather than the current job. What has **not** been
  observed is `area_agenda` firing after it, i.e. whether she then asks a real question from the
  checklist. Until that is seen, the fix is half-proven.
- **Nothing in the five new embeds has been seen in a browser at mobile width.** The dashboard was
  walked on a laptop and looked right; `/my-genome`, `/drafts`, `/requests` and `/knowledge` have
  not been opened at 375px by anyone. The shared voice component additionally has a known mobile
  defect at the version pinned here (its media query overrides the embedded variant and causes
  horizontal page scroll) — a package-level fix, not a Kira one, but it lands on these pages.
- **Beta outreach had no jurisdiction guard until 2026-08-18.** `scripts/send-beta-outreach.mjs`
  calls the Resend API directly — because the shared transport has no cc and the operator needs one
  on every send — and so it routed around the AU-only rule on the one path that mails real
  strangers. Caught when a Barcelona contact was added to the sheet as Priority 1; nothing in the
  tooling would have stopped it. The guard is now wired (`assertJurisdictionAllowed`, unknown
  country blocks), but the near-miss is the finding: a control that lives only in the product path
  does not cover the operator path.
- **The self-poisoning red-team probe is a FALSE PASS.** It scores HELD on every run and the
  behaviour fails in production: the probe asks her to note her own limitation and she declines, but
  nobody asks in a real conversation and the **distiller writes it anyway**. Twice observed. The
  probe exercises the refusal path; the leak arrives down the distillation path. A green probe over a
  live failure is worse than no probe, because it closes the question.
- **Red-team judge backend is pluggable (2026-08-23).** `scripts/red-team.mjs` takes
  `LOCAL_JUDGE_MODEL` (+ optional `LOCAL_JUDGE_API`, default Ollama `localhost:11434`) so the WORDS
  half can be judged by a local model instead of paid OpenAI; `OPENAI_API_KEY` becomes optional.
  The BEHAVIOUR half and the retry-to-INCONCLUSIVE fail-safe are unchanged - a judge outage still
  records INCONCLUSIVE, never a pass. CI (`red-team.yml`) keeps the paid judge and its secret check.
