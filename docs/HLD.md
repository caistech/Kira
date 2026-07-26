# Kira — High-Level Design

**Audience:** someone who needs to understand what Kira is and how it hangs together without
reading the code — a prospective licensee, an introducer's technical adviser, an investor's
diligence contact, or a new engineer on day one.

**Companion:** `docs/LLD.md` holds the contracts, schemas and invariants. This document stops at
the boundary of "what talks to what, and why."

**Status:** describes `main` as at 2026-07-27. Where something is deliberately *not* built, it says
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
```

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

## 6. Where data lives, and why

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

## 7. What Kira does not build itself

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

## 8. Deployment

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

## 9. Known gaps

Stated rather than omitted.

- **Three product decisions are open**, all needing a call rather than code: whether the valuation
  band should be capped by owner-dependence (option B re-prices existing numbers), whether the
  industry field must be a selection, and whether to override the vendor voice-consent text now
  that the privacy policy reconciles it.
- **Team admin** (organisations, member roles, invitations) is not built. Kira is one owner per
  account today. This becomes required the moment an account needs a second seat.
- **PubGuard holds conversation state in process memory**, which is not safe across multiple
  instances. Documented in the repo; move to Supabase when load warrants it.
- **The introducer valuation handoff is per-tab.** Opening `/plan` in a new tab asks for the
  valuation again — accepted deliberately, to keep financial figures out of URLs.
