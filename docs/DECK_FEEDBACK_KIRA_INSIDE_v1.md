# Kira Inside v1 — deck feedback, checked against the code

**Reviewed 2026-08-15** against the repository at `f469365`, not against memory or the register.
Written so it can be actioned directly: every item says the claim, the verdict, and — where the
claim overstates — a replacement that is true today.

**The deck is largely accurate.** Most of what it asserts is built and testable. Two claims are not,
and one of them is the central asset slide, which is why this is worth doing before the deck meets
money.

---

## 1. THE CLAIM THAT DOES NOT HOLD, AND IT IS THE ASSET SLIDE

> **THE DIFFERENTIATED ASSET — The Business Genome is the asset.** *"A structured model of how an
> organisation actually runs, across nine operating areas — each scored on where it sits today
> against where it needs to be, with the value of the gap attached."*

**Three claims in one sentence. One is true.**

| Claim | Status |
|---|---|
| nine operating areas | ✅ **True.** `lib/genome/areas.ts`, derived bottom-up from ~140 flows in the orchestrator's task registry, held as data so a broker can re-order them |
| "scored on where it sits today" | ✅ **True as of today.** Four coverage bands per area, rendered on three surfaces |
| **"against where it needs to be"** | ❌ **Does not exist.** There is no target state, no per-area checklist, no definition of done. `docs/GENOME_BUCKET_CHECKLIST.md` is a draft proposing one |
| **"with the value of the gap attached"** | ❌ **Does not exist.** The gap is ONE number for the whole business. No area carries a figure, and nothing computes one |

⚠️ **Why this matters more than the words.** An investor who takes the slide at face value will ask
to see one area scored against its target with a dollar figure on it. There is nothing to show. The
demo would have to change the subject, on the slide the raise is built on.

**Suggested replacement, true today:**

> A structured model of how an organisation actually runs, across nine operating areas — each showing
> what has been captured, what is still only in the owner's head, and where it lives today. The
> per-area target state and the value attached to each gap are the next build, and the reason the
> reference implementation exists.

That is weaker and it is defensible. It also converts the gap into roadmap, which is a normal thing
for a seed deck to have and a much better position than a claim that collapses under a demo.

---

## 2. "RUNNING END TO END" IS GENEROUS

> **REFERENCE IMPLEMENTATION — Proven end to end in one vertical.**
> **WHERE THIS GOES / NOW:** *"Kira Exec running end to end as the reference implementation."*

**What is genuinely true:** the funnel, valuation, checkout, beta redemption, account creation, agent
provisioning, voice and text transports, the Genome capture loop, the buyer's export, and — as of
today — the onboarding gate and the share path.

**What is not:** **no owner has ever completed a Genome.** Beyond that, three things the deck's
reader would assume from "end to end" are inert:

- **Readiness never recomputes.** Written once at signup by two writers, both signup-time. The
  dashboard says "we grow this every week"; nothing grows it.
- **`ensureTrial` is called by nothing** except the beta path added today, so the trial clock has
  never started for a paying customer.
- **The Gmail access levels** are a type, a component nothing renders, and nine passing tests
  (register Q3).

**Suggested replacement:**

> Kira Exec is the reference implementation and is live: owners sign up, pay, and build a Genome by
> voice. Closing the loop from first conversation to a handover document in a real customer's hands
> is what the next quarter is for.

⚠️ **"Proven" is the word to change.** Built, live, and in front of real owners is true. Proven
implies an outcome nobody has yet produced.

---

## 3. CLAIMS THAT HOLD — CITE THEM WITH CONFIDENCE

| Claim | Evidence |
|---|---|
| "Approval-gated execution. Nothing sends without explicit approval. Structural, not a setting." | ✅ Real. Approval gate, refusal records with `declined_because`, the entity guard. Red-team suite scores by RATE, not a single run |
| "Enforced in server code. Refusals are architectural constraints, not prompt-level guidance." | ✅ Real for the guards that have been red-teamed — entity separation moved 0/3 → 3/3, refusal record 0/6 → 6/6 |
| "Scoped identity and memory. Per-tenant isolation." | ✅ Real. Identity is server-derived at connect, never a client-supplied id |
| "Zero financial data retention. Reads the accounts; stores no balance, invoice number or client name." | ✅ **Documented as an explicit operator decision** in `lib/kira/financials.ts` — *"Conclusions, yes. Figures, never."* The query surface is structurally constrained: the agent names one of a fixed set of resources and never supplies a URL, filter or date range. **See caveat below** |
| "50+ internal packages" | ✅ 53 in `SHARED_SERVICES.md` |
| "Three-lane memory spine" | ✅ Matches `DATA_STANDARD`'s three stores — structured / owned RAG / experiential |
| "Brokers & accountants… introducer channel in build" | ✅ Real: introducer portal, magic-link entry, `view_status` without `view` |
| "An introducer or partner sees status and score, never conversation content" | ✅ **Strong claim, strongly built.** `@caistech/coordination-sdk` gives referring parties `['view_status']` WITHOUT `view`, and eight tests pin that wall |

⚠️ **Caveat on zero financial data retention, worth resolving before it is challenged.** The
*policy* is documented and the *query* surface is structurally constrained. Whether the **retention**
rule is enforced in code or is a prompt-level instruction I did not establish — and the slide
directly above it claims refusals are "architectural constraints, not prompt-level guidance", so an
investor's technical diligence will test exactly that seam. Worth ten minutes to confirm which it is.

**Precision note, not a correction:** valuation inputs — turnover, profit, debt, tangible assets,
work in progress — ARE stored, in `business_valuations`. The claim is scoped to "the accounts" so it
is not false, but a reader may hear "zero financial data" more broadly than it is meant. Consider
"stores no figures from the accounting system" to close the gap.

---

## 4. UNSOURCED STATISTICS

> **48%** intend to exit within five years · **25%** have a documented succession plan

No source in the deck and I cannot verify either. Both are load-bearing for the ICP argument and
both are the kind of number a diligent reader looks up. **Add the source on the slide.** If neither
can be sourced to something citable, they should come out — the argument survives without them
("most of these businesses are discounted because they run on one person" needs no statistic), and an
unsourced number that turns out wrong costs more than it earned.

---

## 5. TWO POSITIONING POINTS FROM COMPETITOR READING

**Gravitee (gravitee.io) validates your table-stakes framing, and you should say so.** They are an
API-management company that has extended into agent governance: identity, access, MCP governance, LLM
cost controls, A2A traffic auditing, sold to enterprises. That is precisely the layer your
DEFENSIBILITY slide concedes:

> *"Identity scoping, approval gating, policy enforcement, audit lineage. Increasingly bought off the
> shelf from API and agent-management vendors — we build to that standard rather than claim it as an
> edge."*

**Naming a real vendor there makes the concession credible rather than modest.** A reader who knows
the space will think of exactly that category; showing you have already placed it — and drawn the
line above it at organisational memory — is stronger than the abstraction.

**The FDE / Varick Agents framing sharpens the DISCOVER claim, and exposes a gap in it.** Their audit
artifact is a one-page operating map with five fields: current-state workflow, **future-state
workflow**, **selected use case**, boundaries, and **expected business value — hours, cost and errors,
quantified**. Two observations:

- Their "future-state" and "expected business value" are precisely the two fields §1 above says the
  Genome does not have. An independent framework arriving at the same two fields is good evidence the
  claim is the right one to make — and a good reason to make it as roadmap rather than as fact.
- **"Find the workflow worth rebuilding" is a selection step Kira does not have.** DISCOVER claims to
  surface where automation creates value; today the product captures nine areas and ranks nothing. If
  the deck keeps the DISCOVER claim, that ranking is the thing to build behind it.

**And the strategic line worth stealing:** an FDE is a person costing ~$1M/year, available only to
enterprises. Kira Exec is that audit productised for a business that could never hire one. That is a
sharper articulation of the Exec thesis than "part-time general manager", and a reader who knows the
FDE role will recognise it instantly.

---

## 6. WHAT CHANGED TODAY, IF THE DECK IS BEING UPDATED NOW

Several things that were not true this morning are true at `f469365`, and the asset slide can lean on
them once §1 is corrected:

- **The nine areas are now VISIBLE** as a scored map on three surfaces — the owner's dashboard, his
  own Genome, and the public sample — with four bands and a fifth "You told us" state that shows what
  his own pre-signup answers already located.
- **The sample is now a finished Genome** at `/sample-genome`, labelled SAMPLE, showing what a
  completed one looks like rather than a half-done one.
- **The owner can send it.** A Share path emails the buyer's copy — private entries stripped — to his
  broker or accountant, from him, with a preview of exactly what the recipient receives.
- **Both entry paths land on one gated dashboard**, so onboarding is decided by state rather than by
  which door he came through.

That last group is what makes "the Genome is the asset" demonstrable rather than described. It is
worth a screenshot in the deck; it did not exist yesterday.

---

## Summary for whoever updates this

1. **Rewrite the asset slide's scoring sentence** (§1) — the only change that is not optional.
2. **Soften "proven end to end"** to built-and-live (§2).
3. **Source or remove the two statistics** (§4).
4. **Name the vendor category** on the defensibility slide (§5).
5. **Consider the FDE framing** for the Exec thesis (§5).
6. Optionally, screenshot the scored nine-area map now that it exists (§6).

Everything else stands up to being checked.
