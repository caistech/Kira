# The Genome, formatted for the buyer's eye — draft for review

**Status** DRAFT. Nothing here is built. Decisions marked ⬜ are Dennis's.
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

⬜ **Decision: does "verifiable" mean sourced-to-a-conversation, or confirmed-back-to-him?** The
second is stronger and is a build (she has to ask, and record the answer). The first exists today.

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

⬜ **Decision: is this ranking ours to assert?** It is a hypothesis built from how buyers price risk,
not from transactions we have run. It should be put to Anneke and Andrew Cooke as a list to re-order
before it becomes the spine of a score — the same validation §7 asks for, applied to this table
first, because the order is what the whole scorecard inherits.

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

⬜ **Decision: who deactivates?** Kira inferring it from conversation is the agentic answer and can
be wrong invisibly. An operator/broker confirming it is reliable and adds a step.

---

## 5. What the owner sees vs what the buyer sees

Same data, two renderings, and conflating them is the trap.

- **The owner** sees a number that goes up when he talks to her, and never a deficiency report. The
  gap analysis is *her* work list, not his homework — she steers the conversation towards the empty
  cells and he watches it move. A 66-year-old handed a 350/820 report card closes the tab.
- **The buyer** sees the scorecard, the three axes per area, and the provenance. Blunt, because the
  buyer's alternative is assuming the worst.

⬜ **Decision: when does the owner first see a number?** On day one it is a first impression formed
before she knows anything. Framing it as *"what a buyer can currently verify"* is true, is not a
judgement of him, and starting low is then the point rather than an insult.

⬜ **Decision: is the buyer view ever shown without the owner's sign-off?** It must not be — but it
changes what the export is for, and it is his business.

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

## 7. What to validate before building

The categories should come from what a broker actually asks for, not from us. The nine areas above
are derived from a flow registry built for an operations thesis, not from a transaction. One
conversation with Anneke or Andrew Cooke, asking *"what do you always have to dig for, and what do
you never get at all?"*, either confirms this list or reshapes it — cheaply, before anything is
built on it.

The five things in §1 are the specific list to test.
