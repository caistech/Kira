# Claude Code brief — Kira Exec: repositioning + introducer channel

**Owner:** Dennis McMahon, Corporate AI Solutions
**Repos in scope:** `kira` (primary), `cais-shared-services` (canonical), plus all other CAS repos for audit
**Date:** 2026-07-25

---

## PHASE 0 — REUSE AUDIT (mandatory, blocking)

> **Do not write a single line of feature code until Phase 0 is complete and I have signed off on
> `REUSE_AUDIT.md`.** The working assumption is that **most of what follows already exists somewhere
> in the portfolio.** Building a second version of something we already own is the single most
> expensive mistake available here — it forks the moat, doubles the maintenance, and breaks the
> "one canonical, many products" thesis.

### 0.1 Inventory these first

- `cais-shared-services/SHARED_SERVICES.md` — the catalog. Read it end to end before anything else.
- `cais-shared-services/DATA_STANDARD.md` — data rules; the portal must comply.
- Every `@caistech/*` package: name, version, what it exports, which products consume it.
- The other product repos — **Connexions, Universal Interviews, LaunchReady, RaiseReady**, and any
  repo I've forgotten. Search them, don't assume.

### 0.2 Specific things I suspect already exist — verify each

| Capability needed | Where I suspect it lives | Verify |
|---|---|---|
| Dual/multi-role auth portal (user + admin) | portfolio §8.5 standard, likely `kira` + others | Can it take a **third** role (introducer) or does it hard-code two? |
| Invite-a-third-party flow (magic link, tokenised invite) | Universal Interviews / RaiseReady | Reusable as the broker→owner invite? |
| Multi-party dashboard (one party sees many subjects' status, not their content) | Universal Interviews / Connexions | Closest existing analogue to the broker pipeline board |
| Stripe subscriptions, trials, webhooks, cancellation | `kira`, LaunchReady, RaiseReady | Is there a shared billing package, or has each repo forked it? |
| Resend transactional email + templates | portfolio-wide | Shared sender/template layer, or per-repo? |
| Scoring / readiness assessment output | LaunchReady, RaiseReady | Any reusable scoring + report-render engine? |
| Referral / attribution tracking | anywhere | Probably absent — confirm before building |
| Commission or payout ledger | anywhere | Probably absent — confirm before building |
| Voice + memory core | `@caistech/elevenlabs-convai@0.7.0` | **Consume it. Never fork it.** |

### 0.3 Deliverable

Produce `docs/REUSE_AUDIT.md` with one row per capability:

`capability | exists? | repo + path + version | fit (reuse as-is / extend / build new) | if extend: where the change belongs (product repo vs shared package) | risk of forking`

Then **stop and wait for sign-off.**

### 0.4 Standing rules once building starts

- Anything reusable across products belongs in `cais-shared-services`, not in `kira`.
- Changes to a `@caistech/*` package require a version bump and a note on which products consume it.
- Never fork a canonical package to move faster. Raise it with me instead.

---

## CONTEXT — what changed

Kira Exec's target is now explicit: **the baby-boomer owner-operator approaching exit with no
successor and no plan.** ~48% of Australian boomer SME owners intend to exit within 1–5 years;
roughly a quarter have a documented succession plan. Their business is discounted or unsellable
because the operating knowledge lives in their head. Kira captures it — as they work, by voice —
into a Business Genome, turning an owner-dependent job into a transferable asset.

**One product, one story, one funnel.** The consumer/companion-AI positioning is retired.

---

## WORKSTREAM A — landing page rebuild

### A.1 DELETE — old-Kira positioning, remove entirely

These sell "a personalised AI companion." That frame competes with the exit story and loses.

1. "Every Kira is different" section (whole block, incl. ✨ header)
2. The comparison table "Other AI assistants vs Your Kira" — all eight bullets
3. "How it works 🛠️ — from first hello to your personalized guide in under 5 minutes" — all three steps
4. "Setup Kira learns you" / "YOUR Kira is born" / the `You → Setup Kira → YOUR Kira` diagram
5. "This is a partnership" — both columns and the four-paths line
6. Heading "Real things. Not party tricks." and the footer line beneath the testimonials
7. Testimonials: remove the pricing-decision and BAS ones. **Keep** "my whole business was in my head"
   and "drafted the follow-up while I was on site."
8. FAQ: remove "What do you mean 'my own Kira'?", "Is this like ChatGPT?", "Can I have more than one Kira?"

**Keep the honesty principle** (she admits what she doesn't know, she pushes back) — but as a single
FAQ line, not a section that asks the visitor to commit to homework before they've seen their number.

### A.2 New page spine — in this order, nothing else above the fold

1. **The number** — hero: what's it worth? Free, 3 minutes, no sign-up, no card.
2. **The gap** — today vs transferable, with honest labelled figures.
3. **Why the gap exists** — it's all in your head; a buyer pays for a job, not an asset.
4. **What Kira does about it** — captures it while you work, by voice. Business Genome.
5. **Peer proof** — named, with trade, town, staff count.
6. **The offer** — first month free, decide after.
7. FAQ → footer.

### A.3 Copy constraints

- **Name the person.** Somewhere high: no family successor, no obvious buyer, nothing written down,
  and you haven't told anyone yet. Right now the page describes a problem, not *him*.
- **Kill "fractional exec"** on the public page. Consultant jargon. Use right hand / offsider / 2IC.
  Keep "fractional exec" for internal and architecture docs.
- **One CTA label** everywhere. Currently three ("Value my business", "Find out in 3 minutes",
  "What's my business worth?"). Pick one.
- **One time claim.** "3 minutes" and "under 5 minutes" currently contradict.
- **Cut emoji to near zero.** 🧰💰✅📋💷🙋‍♀️🏦 against a 60–78 audience signals *not for me*.
- **Fix the valuation figures.** $600k → $2.5M reads as a 4.2× uplift from documentation and destroys
  credibility with exactly the sceptical owner we want. Show a defensible range (owner-dependent
  multiple vs documented multiple), label every bar, explain "walk away $150k".
- **Add a trust line above the fold** — where his data is stored, who can see it, that it's his.
  He is about to narrate his life's work into a phone.

### A.4 Design

Read `/mnt/skills/public/frontend-design/SKILL.md` before touching UI. Match existing CAS branding —
prominent but not obtrusive, per the portfolio standard. Test at large text sizes; this audience
zooms.

---

## WORKSTREAM B — offer and billing change

Replace "7 days free" — too short to demonstrate a Business Genome, which is cumulative.

- **First month free. Card captured at signup. First charge on day 30.** Cancel any time before then
  and no charge is ever made — so no refunds to process.
- **Reminder email 3 days before first charge.** Feels like it invites cancellation; actually prevents
  chargebacks, which cost more than the refunds we're avoiding.
- **Fair-use ceiling on the trial month.** Voice minutes are real COGS at ~100 exchanges/day. Cap
  generously enough to prove value, tightly enough that a freeloader can't run up a large bill. Surface
  usage in-app; don't hard-cut without warning.
- **From month 2:** cancel any time, service runs to end of paid period, no pro-rata refunds.
- Public copy: *"Your first month is free. We'll only charge you if you're still using it."*

**Open decision for me:** whether to drop the card at signup entirely. Default is card-on-file; we can
test card-free later if signup friction proves costly with this cohort.

---

## WORKSTREAM C — introducer portal (brokers, then accountants)

Business brokers are the primary channel. The pitch is their **dead pile**: owners they've appraised
and shelved as too owner-dependent to list. They currently have nothing to give those people. Kira is
that thing, and it brings the listing back sellable — at a higher multiple, which pays them more.

Accountants are the same mechanic, longer lead, higher trust. Build the role generically as
**introducer**, not `broker`, so accountants and advisers reuse it.

### C.1 Product decision — no separate broker product

Earlier idea of a separate "readiness score" for broker-sourced owners is **dropped**. Same product,
same valuation, one funnel. Broker-sourced reports get:
- co-branding (introducer name/logo)
- a closing line: *"This is indicative. [Name] at [Brokerage] can give you the real number."*

### C.2 Email — introducer is always the sender, we are never the sender

Non-negotiable. We do not send marketing email to an introducer's client list. Three implementations,
**check Phase 0 first — an invite/magic-link flow may already exist**:

- **v1 (build first): compose-and-hand-off.** Portal drafts the email (their name, their brand,
  disclosure line included), one click opens it prefilled in their own mail client. Zero deliverability
  risk, zero DNS setup, tracking runs off the unique link. Proves whether introducers actually send.
- **v2: OAuth their mailbox** (Gmail/Outlook). Sends through their mailbox — lands in their Sent
  folder, replies go to them. This is the quality version. Build once v1 shows send volume.
- **Not recommended:** Resend with their From address. Needs DKIM records on their domain; a two-person
  brokerage will take weeks, and it fails DMARC into spam if they don't.

Contacts may be stored for the introducer's own list view, held **on their behalf**, used for nothing
else, deletable by them. State this in the introducer terms. Once an owner signs up themselves they are
our customer and normal rules apply.

### C.3 Portal features

- Introducer signup + verification; nominate payee (individual **or** brokerage entity — many firms
  prohibit staff taking third-party commissions personally).
- Unique co-branded link per introducer.
- Owner list with **status and readiness/valuation movement over time** — e.g. *Mick: 31 → 58 this
  quarter*. This is the retention hook: no broker has a system that tells them which shelved owner is
  getting closer to sellable.
- **Hard boundary: introducers see status and scores, never conversation content, transcripts, or
  memory.** Enforce server-side, same discipline as server-derived identity in the memory loop.
- Commission statement view.
- Disclosure line baked into every email template — a licensed agent recommending a service they earn
  from has a conflict to disclose. Non-removable.

### C.4 Attribution

- **First-touch, 90-day window** — rewards the introducer who did the educating.
- Plus a *"who told you about Kira?"* field at signup as fallback for the owner who reads the email,
  does nothing, and signs up direct three weeks later.
- Log every attribution event immutably; this will be disputed eventually.

---

## WORKSTREAM D — introducer commission ledger

Introducers are paid a **recurring proportion of the subscription fee**, whether or not the business
ever sells. That's the channel's whole appeal: income from clients they can't list yet.

- **Pay on collected revenue only.** Trial month pays nothing. Commission starts on first paid month,
  stops on cancellation. Self-solves clawbacks and makes spray-and-pray pointless.
- **Term:** default to a fixed window (e.g. 24 months, matching the 3–5 year succession-prep horizon)
  rather than lifetime. Make rate and term **config, not hard-code** — they will change.
- **Rate:** set off contribution margin after voice + LLM + infra, not off SaaS norms that assume 85–90%
  gross margin. **Do not pick a number without me.**
- **GST/invoicing:** RCTI (we self-bill on their behalf) — nobody will reliably invoice us monthly.
- **Monthly payout run** with statement per introducer; reconcile against Stripe collected revenue.
- **Do not also discount the owner** through the introducer link — that pays for the same referral twice
  and trains introducers to compete on price rather than trust.

---

## WORKSTREAM E — tenancy (architectural, decide before building C or D)

The introducer channel introduces an **org tier above the owner**: introducer → many owners, with
scope-limited visibility (status yes, content no). Cross-cutting item #23 in
`GARETH_SHAH_INTEGRATION_SEAMS.md` currently assumes a flat `tenantId` = business + owner.

**Resolve this now.** Retrofitting an org tier through the three memory lanes after Gareth builds to a
flat key is expensive and will leak. Propose a key shape that carries the introducer relationship
without making the introducer part of the owner's memory scope, and update the seams doc so Gareth and
Shah build to the right thing.

---

## GUARDRAILS

- Phase 0 first. No feature code before `REUSE_AUDIT.md` is signed off.
- Never fork `@caistech/elevenlabs-convai` or any canonical package.
- Server-derived identity and scope everywhere. Introducer visibility enforced server-side.
- Comply with `DATA_STANDARD.md`.
- Privacy Act / Spam Act: we never send to an introducer's clients; consent, sender ID and unsubscribe
  live with the introducer's own send. **Flag anything here for a lawyer rather than deciding it in
  code** — the introducer agreement, the disclosure wording, and the data-handling terms all need one.
- Keep `GARETH_SHAH_INTEGRATION_SEAMS.md` current as the tenancy decision lands.

---

## SEQUENCE

1. Phase 0 reuse audit → sign-off
2. Workstream E tenancy decision → sign-off
3. Workstream A landing page (independent, ships first, no channel dependency)
4. Workstream B billing change
5. Workstream C portal v1 (compose-and-hand-off)
6. Workstream D ledger
7. Workstream C v2 (OAuth send) — only once v1 shows introducers actually send

**Reality check before over-building:** sign five introducers and see whether they send anything.
Broker sales cycles are slow and relationship-driven. Prove one brokerage sends ten owners before we
build the full portal.

---

## DECISIONS I OWE YOU

- Commission rate and term
- Card at signup: yes/no
- Trial fair-use ceiling
- Final valuation figures for the gap module
- Single CTA wording
