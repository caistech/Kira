# The Genome, formatted for the buyer's eye — draft for review

**Status** Shape DECIDED, nothing built. All five open decisions were taken by Dennis on 2026-08-02
and are recorded inline as ✅ DECIDED, each with what it obliges. What remains is the build.
**Date** 2026-08-02
**Why now** `/my-genome` diverges from the public example in three ways, and the root cause was never
a display bug: the example is hand-authored fixture data promising capabilities no derivation
produces. Rather than close that gap by fixing pixels, this starts from the question the document
exists to answer, and lets the answer decide the sections.

---

## 1. The reframe

A broker or buyer has seen hundreds of businesses. What they are given is always some version of the
same package: **detailed financials, plus a limited view of the operation.** They have vast
experience reading that package, and it does not answer the question they actually care about.

> **What they want is not more information about the business. It is an answer to: how hard will
> this be to take over, and what breaks first?**

Financials are backward-looking and they can already read them. What no vendor ever hands them is a
**takeover scorecard** — an honest account of which parts of the business run without the owner,
which parts live in his head, and which claims they can verify rather than take on trust.

That is the document Kira is uniquely able to produce, because she is the only party in the
transaction who has been talking to the owner every week about how the thing actually runs.

### The five things a broker wants and never gets

Concrete, so the format can be judged against them:

1. **Which relationships walk out the door with him** — named accounts, and who actually owns each
   relationship. Not "we have 240 customers."
2. **What breaks in week one** — the things that stop working the morning he does not come in.
3. **The recurring decisions only he makes**, and the rule he uses to make them. Pricing judgement,
   who gets credit, when to walk away from a job.
4. **What is committed but not delivered** — work sold, obligations attached, sitting in the middle.
5. **Which supplier and customer terms are personal to him** rather than contracted to the entity.

None of these appear in a financial pack. All of them are answerable from the Genome.

---

## 2. The output format — three axes, not one score

Every area of the business gets scored on three questions. They are independent, and collapsing them
into one number is what makes existing "business readiness" scores useless.

| Axis | The buyer's question | Where the data comes from |
|---|---|---|
| **Runs without him** | If he leaves, does this keep working? | Whether a flow has a named non-owner doer |
| **Written down** | Is it recorded anywhere but his head? | Whether the Genome holds it at all |
| **Verifiable** | Can I check this, or am I taking his word? | Provenance — the conversation it was said in |

**The third axis is the one that earns the product its fee.** "The pricing rule is X" is a claim a
buyer's accountant discounts. "The owner stated on 3 March that the pricing rule is X, here is the
recording" is evidence they can put in a file. The Genome already tracks provenance per entry
(`OwnerEntry.source`) and already counts how many entries are sourced — it is simply not presented
as the asset it is.

✅ **DECIDED (2026-08-02): verifiable means CONFIRMED BACK TO HIM.** Not merely traceable to a
conversation — she reads the fact back, he agrees, and the agreement is recorded.

Three consequences, and the first two are costs worth taking knowingly:

- **It cannot be backfilled.** Every fact captured to date is *sourced* at best, so the confirmed
  count starts at zero and grows only as she asks. The buyer view is thin at first and that is the
  honest state — a confirmation invented for existing rows would be the one lie this document cannot
  survive.
- **It is a build, and it needs a mechanism rather than a prompt.** "Confirmed" is a buyer-facing
  claim, which puts it squarely in the class this codebase has learned to enforce rather than
  request: a confirmation is a ROW — fact id, when it was read back, what he said — written by a
  tool call, never a state she can assert in prose. Everything about this product's history says a
  description would be ignored within the day.
- **It gives her a reason to re-open old ground**, which the conversation needs anyway. "Can I read
  something back to you from March?" is a natural turn and it is exactly the work the score wants
  done.

Three states, then: **asserted** (he said it) → **sourced** (traceable to the conversation he said it
in) → **confirmed** (read back and agreed). Only the third counts on this axis.

---

## 3. The areas — derived from the 140 flows, not invented

The section list should not be made up. It already exists, in
`orchestrator/TASK_REGISTRY.md`: ~140 flows across 15 groups, built against a deliberately maximal
avatar, each row classified by **tier** — where `H` (assisted) means *a human does this* and `M`
(mechanical) means *it runs itself*.

That tier column is already an owner-dependence measure. The registry says so itself: *"it holds the
operational flows that the owner-dependence factor measures — a task running without the owner is a
row in here."*

Collapsing the 15 flow groups into areas a broker recognises:

| Buyer-facing area | From flow groups | The question it answers |
|---|---|---|
| **Demand** | 4.1 Getting attention | Where does work come from, and does it come to *him*? |
| **Pricing & quoting** | 4.2 Scoping and quoting · 4.7 Catalogue and pricing ops | Could someone else reach his number? |
| **Delivery** | 4.3 Winning and setting up · 4.4 Delivering · 4.8 Fulfilment | Does the work happen without him on site? |
| **Cash & working capital** | 4.5 Money in · 4.6 Money out and supply | Who chases, who approves, what are the terms? |
| **Customers** | 4.9 Keeping the client | Who owns each relationship? |
| **People & labour** | 4.10 People · 4.11 Contractors | Who does what, and who holds them to it? |
| **Assets** | 4.12 Assets, fleet and equipment | What is owned, leased, or personally held? |
| **Compliance & obligations** | 4.13 Obligations | What must not lapse, and who watches it? |
| **Management & records** | 4.14 Running the thing · 4.15 Data hygiene | Does the business have a memory of its own? |

**The current six Genome sections map onto these cleanly** — this is a widening, not a rewrite:
`work-in`→Demand, `pricing`→Pricing, `delivery`→Delivery, `suppliers`→Cash, `obligations`→Compliance.

### The one structural change: "Things only you know" stops being a section

Today it is a bucket. It should be **the score**, not a place. Every area has a portion that lives
only in his head — that portion *is* owner-dependence, and a buyer wants it **per area**, because
"pricing is entirely in his head" and "the yard tidy-up is in his head" are not the same risk.

---

## 3.1 The ranked architecture — by department and visibility

The §3 areas are derived bottom-up from how work flows. This is the same business seen top-down, as
a **buyer** ranks it: ordered by what moves the price or kills the deal, not by what an org chart
would put first.

The ranking principle is blunt: **a buyer is pricing risk, and every line below is a discount he
applies when he cannot see it.** "Visibility" is therefore not "does the department exist" — it is
**what artifact makes the claim checkable by someone who does not trust you yet.**

| # | Department / function | What a well-managed company has | What the buyer wants VISIBILITY of | If invisible |
|---|---|---|---|---|
| **1** | **Revenue & customer base** | Contracted or repeat revenue, spread across accounts, owned by the entity | Revenue by customer over 3 years; concentration; **who owns each relationship**; contracts that survive a change of control | The single biggest discount. Unowned relationships are assumed to leave |
| **2** | **Owner dependence & management depth** | A second line who decides, not just executes | The decisions only the owner makes, and the rule behind each; what happens in week one without him; any deputy with real authority | Deal-breaker at the top end. Caps the buyer pool to owner-operators |
| **3** | **Financial integrity** | Clean, reconciled, normalised accounts; add-backs defensible | P&L / balance sheet / cash flow that tie to the bank; **working capital**, so he knows what he must fund on day one; personal expenses separated | Not a discount, a **delay** — and delays kill deals |
| **4** | **Pricing & margin mechanics** | A pricing method someone else can apply | How a price is actually reached; margin by job type; who may discount and by how much; the last rate rise and whether it stuck | The buyer assumes margin is the owner's judgement and will not survive him |
| **5** | **Delivery & operations** | Repeatable process, known capacity, quality that does not depend on one pair of hands | WIP and committed-but-undelivered work; capacity limits; rework/warranty history; what is documented vs habitual | Priced as execution risk; also the commonest source of post-completion disputes |
| **6** | **People & labour** | Documented roles, current contracts, known key-person risk | Who is actually critical; tenure; contracts and restraints; who is likely to leave on announcement; contractor vs employee status | Key-person risk transfers straight into an earn-out or a holdback |
| **7** | **Legal, compliance & obligations** | Licences current, insurance adequate, no live disputes, contracts assignable | The obligations calendar and who watches it; **change-of-control clauses**; disputes open or threatened; regulatory history | Cheap to fix, expensive to discover late. Erodes trust in everything else |
| **8** | **Suppliers & inputs** | Terms held by the entity, alternatives known | Key suppliers, terms, and whether those terms are **personal to the owner**; single-source exposure; price-rise pass-through | A personal supplier term is a hidden cost increase on day one |
| **9** | **Assets, fleet & premises** | Register, condition known, capex planned; lease terms clear | What is owned vs leased vs **personally held by the owner**; deferred maintenance; the premises lease and whether it transfers | Straight balance-sheet adjustment, and the premises can end the deal |
| **10** | **Systems, data & IP** | The business has a memory of its own | Where records live; who has access; what is documented; IP and brand actually owned by the entity | The quiet one. Determines whether everything above can be verified at all |

**Three things to notice, because they shape the product:**

- **Ranks 1, 2 and 4 are exactly what Kira is for.** They are the questions a data room cannot
  answer, because the answers are not in documents — they are in the owner's head. Everything
  Kira captures in conversation lands in the top half of a buyer's priority list.
- **Rank 3 is not our job and we must not imply it is.** Financials come from the accountant. The
  Genome's contribution to rank 3 is separating what is personal from what is the business, which is
  something only the owner knows.
- **"Change of control" appears three times** (1, 7, 9) and almost no vendor thinks about it before
  diligence. A contract that terminates on sale is worth nothing to a buyer, and finding out late
  re-opens the price. This is a strong candidate for something Kira asks about early — it is cheap to
  answer and expensive to discover.

✅ **DECIDED (2026-08-02): the ranking is OURS TO ASSERT, then verify with external eyes.**

We publish this order as our position and build on it now; Anneke, Andrew Cooke and any broker who
will sit still are asked to re-order it afterwards. Asserting first is deliberate — a ranking
assembled by committee from people who have never seen the product would describe the pack they
already receive, which is the thing this replaces.

What that obliges: the order must be **cheap to change**. It is a weighting, so it lives as data the
scorecard reads, never as the sequence sections happen to be written in. When a broker moves a row,
that is a config change and a re-score, not a rebuild — and the re-score must be visible rather than
silent, because a number that moved without explanation is worse than one that never moved.

---

## 4. This is what makes the percentage honest

The reason `/my-genome` shows bands rather than percentages is documented and correct: a percentage
needs a denominator, nobody knows how many facts a pricing section *should* hold, and false precision
in a buyer-facing document is the wrong failure.

**The registry supplies the denominator.** Not "how full is your Genome" (unanswerable) but "of the
flows this business actually has, how many are transferable" (countable). The number becomes
defensible in front of the buyer it is shown to, which is the only test that matters.

**And the denominator is per-business, by deactivation.** The registry's own provisioning rule:
*"provisioning a new tenant is deactivation, not extension."* A 12-person fencing contractor has no
inter-branch transfer and must not be scored for lacking it. Start from the maximal set, switch off
what does not apply, and the remainder is his denominator. Without this the score punishes small
businesses for being small, which would be worse than the bands it replaced.

✅ **DECIDED (2026-08-02): Kira PROPOSES the deactivation, the owner confirms, rejects, or keeps it.**

The agentic answer with a human gate — she does the tireless part, he keeps the judgement. She
notices from conversation that he has one site and no trade accounts and proposes switching those
off; he says yes, or says "no, keep it, I'm about to open a second yard."

Three things follow:

- **A rejected deactivation is not a no-op.** The area stays in his denominator and scores zero until
  it is filled, which is the honest reading: he has told us it applies and we hold nothing about it.
- **The deactivation record is itself buyer-relevant.** "The owner states this business has no
  inter-branch transfer" is an answer, and a buyer who sees a missing area will ask why. Store who
  decided and when, exactly as facts are stored — a denominator that changed for unrecorded reasons
  is a number nobody can defend.
- **A proposal is not a decision.** She must never deactivate on inference alone, because a silently
  shrunken denominator inflates the score, and inflating the score is the one direction of error this
  document cannot afford.

---

## 4.1 Where the questions get asked — two entry states, one instrument

The eleven pre-signup questions (`app/business-valuation/page.tsx`) were being asked to do two jobs
at once: be a low-friction hook that produces a figure worth signing up for, and be the measurement
baseline. They are good at the first and were never designed for the second — four of the buyer's
top ten areas in §3.1 have no question at all, and every answer is self-reported, so none of them can
ever score on the verifiable axis.

✅ **DECIDED (2026-08-02): the eleven stay exactly as they are. The serious question set moves into
signed-in onboarding.**

Pre-signup stays a **hook** — general, cheap, few questions, produces a number. Onboarding becomes
the **instrument** — per-area, sets the denominator, gives the gap analysis something to measure
against. Two jobs, two places, one of which he only reaches after deciding he wants this.

**But there are two ways in, and the second one has no eleven answers to build on.** A client who
arrives through a broker's referral link (`/r/[token]`, which drops the cookie and lands him on the
home page) may sign up without ever running the valuation. Today that path gets **no
`business_valuations` row at all** — both writers originate from the eleven, one via Stripe checkout
metadata and one via the device handoff — so he has no gap, no baseline snapshot, and the
introducer's "valuation movement" column has nothing to move. Inert rather than broken, which is
worse, because it looks like it is working.

So onboarding is **one instrument in three blocks**, and what he sees depends only on what is
already known about him:

| Block | Ran the eleven | Straight in | Gate |
|---|---|---|---|
| **1. Baseline** — the eleven, unchanged | skipped (already claimed) | **asked here** | **blocks** |
| **2. Scope** — which of the nine areas exist, mostly yes/no | asked | asked | **blocks** |
| **3. Depth** — one open question per active area | asked | asked | skippable |

**The ceiling on the question count is therefore not a number — it is whatever has not been answered
yet.** And the gate rule is: **block on what the measurement cannot exist without, skip on what Kira
will get anyway.** Without block 1 there is no number; without block 2 there is no denominator, so
every percentage after it is a lie. Block 3 is Kira's actual job, and blocking on it builds the
deficiency report §5 says loses him.

Four things this obliges:

- **The eleven answers seed the Genome as facts**, rather than dying in `business_valuations.inputs`
  as JSON, which is where they sit today. Otherwise onboarding re-asks what he answered four minutes
  earlier — the exact friction this split removes, and worse than friction: it teaches a 66-year-old
  that the product does not listen, which is the fear it exists to answer.
- **A pre-filled field he clicked past is NOT a confirmation.** It will be tempting to count
  review-at-onboarding on the verifiable axis. That would open day one at a high number that then
  never moves — the failure §5 warns about, in the one direction this document cannot afford.
  Onboarding answers are **asserted**; verifiable stays near zero until she reads something back.
- **Block 1 must be the same eleven at the same `MODEL_VERSION`**, not a variant tuned for the
  signed-in context. Two cohorts whose baselines came from different instruments are not comparable,
  and cross-owner comparison is precisely what the broker channel would buy.
- **Block 2 is where §4's deactivation actually starts.** Kira cannot propose a deactivation at
  onboarding — she has no conversation to infer from yet — so this is the owner *declaring* scope.
  Her proposals refine it later, against the record he set here.

One second-order consequence, noted rather than decided: a referred client never sees the gap figure
that makes people sign up, because he signed up on a broker's word first. That argues his first
session should **end** on the number rather than open with it — the payoff rather than the hook.

---

## 5. What the owner sees vs what the buyer sees

Same data, two renderings, and conflating them is the trap.

- **The owner** sees a number that goes up when he talks to her, and never a deficiency report. The
  gap analysis is *her* work list, not his homework — she steers the conversation towards the empty
  cells and he watches it move. A 66-year-old handed a 350/820 report card closes the tab.
- **The buyer** sees the scorecard, the three axes per area, and the provenance. Blunt, because the
  buyer's alternative is assuming the worst.

✅ **DECIDED (2026-08-02): he sees a number on DAY ONE**, framed as *"what a buyer can currently
verify."*

Starting low is the point rather than an insult, because the sentence is true and is not about him:
on day one a buyer can verify nothing, since nobody has told us anything yet. The number describes
the state of the record, not the quality of his business, and the wording has to carry that every
time it appears — "what a buyer can verify today", never "your score".

The corollary is that **it must move in the first session.** A number that sits at its opening value
while he talks for twenty minutes teaches him the number is decorative, and he will not look at it
again.

✅ **DECIDED (2026-08-02): NEVER. The buyer view is not shown to anyone without the owner's sign-off.**

No exception for a broker who introduced him, no exception for a demo, no exception for us. He is
usually selling before he has told his staff or his family; a scorecard of his business reaching
anyone he did not release it to is the single worst thing this product could do, and it would be
irreversible in the only way that matters — someone would have read it.

That makes sign-off a **gate with a mechanism**, not a setting: an explicit act, per release, that
names who it is for and when, and is recorded. It also makes the introducer's view a different
document — the referring party sees that his client is progressing, never the contents (the same wall
`@caistech/coordination-sdk` draws for `introducer`/`broker` roles, which grant `view_status` without
`view` for exactly this reason).

---

## 6. Guard rails

- **It must never read as a second valuation.** He already gets a dollar figure. Two numbers moving
  independently will be conflated. Different unit, different placement, and one sentence saying what
  this measures: transferability, not worth.
- **Fixed rubric, not per-business invented.** A target Kira derives per owner is unfalsifiable and
  kills the cross-owner comparison — which is what the broker channel would actually buy ("my clients
  average X, yours is Y").
- **She never reads the rubric out.** The moment it becomes a checklist she works through, it is an
  interview, not a conversation. It routes her; it is invisible to him.
- **The public example comes down to what the product does**, or the product comes up to the example.
  Shipping a scorecard while the example still promises hand-authored precision repeats the exact
  debt the invented testimonials were removed for.

---

## 7. Validation — after asserting, not before

Per the §3.1 decision, this is our position and we build on it. Validation runs alongside rather than
in front, and it is one conversation with Anneke or Andrew Cooke:

> *"What do you always have to dig for, and what do you never get at all?"*

Put to them, in this order: the **ten-row ranking** (ask them to re-order it — that order is what the
whole scorecard inherits), then the **five things in §1**, then the nine areas. What comes back is a
re-weighting, which the §3.1 decision already obliges us to make cheap.

**The one answer that would change the shape rather than the weights** is a row nobody thought of
appearing at the top. Worth asking for explicitly, because a broker will otherwise reorder what is in
front of them rather than name what is missing.

---

## 8. What the decisions leave to build

In dependency order. **Tracked as B1–B11 and C1–C4 in `BUILD_REGISTER.md`** — that file is the
status of record; this list is the shape.

1. ✅ **The confirmation record** (§2) — **BUILT 2026-08-02** (`5f9255f`): `facts_to_confirm` +
   `confirm_fact`, a row per read-back, live on the business agents. ⚠️ **But the count it produces
   is rendered nowhere** — not on `/my-genome`, not in the export (register **B1**). Until that is
   closed the verifiable axis exists in the database and nowhere a human can see it.
2. **The area model** (§3) — nine areas, with the flow registry's tier data behind them as the
   denominator, and `only-you` retired as a section in favour of the per-area owner-dependence axis.
   **This gates everything below it, and §4.1's onboarding set as well.** The evidence that it is
   overdue: in a real export pulled 2026-08-02, five of the six current sections were empty and
   every captured fact had landed in `only-you`.
3. **Deactivation** (§4) — her proposal, his confirmation, both recorded. Begins from the scope the
   owner declares at onboarding (§4.1 block 2).
4. **The score** — three axes per area, weighted by the §3.1 ranking, held as data so a broker can
   move a row.
5. **The two renderings** (§5) — his, which moves in the first session; the buyer's, behind the
   sign-off gate of §5. ⚠️ **The sign-off gate is more urgent than it reads.** The export today
   applies no sensitivity filter whatsoever: the QA identity's entire Genome is *"the owner is
   considering selling after 35 years and has not told anyone"*, and it renders straight into the
   document this section describes as being for a buyer's accountant (register **B7**).
6. **The onboarding question set** (§4.1) — three blocks, block/block/skip, with the eleven seeded
   forward as facts.

The public example (`lib/genome/example.ts`) comes down to what the product does, or up to it, before
any of this ships — a page promising hand-authored precision beside a scorecard built on confirmed
facts repeats exactly the debt the invented testimonials were removed for.
