# Decisions of record

> The product decisions that shape the code, in one place, with the reasoning that produced them.
>
> **Why this file exists.** Decisions made in conversation decay. Today alone, three separate rows in
> `BUILD_REGISTER.md` said "open" against things that had already shipped, and the LLD's valuation
> section warned against a re-weighting that had been done two days earlier — so the documents were
> steering away from the correct action. A decision that lives only in someone's memory is a decision
> the next session re-litigates or, worse, reverses without noticing.
>
> **The rule:** a decision belongs here the moment it is made, whether or not it is built. Where it is
> decided-but-unbuilt, that is stated — because the gap between the two is the thing most likely to
> end up in customer-facing copy before it is true.
>
> **Companion register:** architecture and implementation decisions for the Practice Intelligence
> workstream and the capability/entitlement model live in
> **`DECISIONS_PRACTICE_INTELLIGENCE.md`** (D1–D31, decided 2026-08-14). Kept separate because this
> file holds product *framing*; that one holds how the code is shaped.

---

## 1. Kira is a PROJECT that finishes, not an indefinite subscription

**Decided 2026-08-05. Framing: live. Trigger: not yet.**

Extraction is not the product. Getting knowledge out of the owner's head adds nothing to a buyer or a
seller **until it lands in the business's own systems**. So Kira is a **migration mechanism**: head →
system. The nine Genome areas moving from empty to filled are the progress bar of that migration.

**Her extraction job is to make herself redundant.** After that she may have a role as a day-to-day
assistant — but only if the owner finds that valuable in its own right, which is a *different*
product at a different price.

### What it settles

- **Enterprise knowledge tools are DESTINATIONS, not competitors.** Glean-class products index what
  is already written down — their own material never mentions eliciting undocumented knowledge,
  because it cannot. Adopting one costs nothing, since nothing else can feed it what Kira feeds it.
- **The pitch is an outcome, not a tool.** Independently the advice of an external founder reviewing
  the product cold.
- **Bounded lifetime value is intended, not a leak.** Arrears billing already suits work that ends.

### The honest half

**Redundancy is asymptotic, not terminal.** New staff, new clients, a changed process — the head
refills. The manual is never *finished*, so:

> the manual is never finished because the business keeps moving, and keeping it current is worth
> less per month than building it was.

That means a real price step-down, **offered before he asks for it**. Offering it unprompted is what
makes the framing credible; billing the build rate forever after promising completion is what would
destroy it.

---

## 2. The maintain rate — one third, NARROW

**Decided 2026-08-05. Live.** `MAINTAIN_FRACTION` in `lib/valuation/pricing.ts`; landing pricing
block and the FAQ ("Does this go on forever?") both derive from the constant rather than a typed
number.

**NARROW is the load-bearing half.** Maintenance is keeping the **manual** current. It is **not** the
day-to-day assistant — drafting, chasing, looking things up — which does not get cheaper when the
manual is done, because it was never about the manual, and is worth *most* at the moment he would be
stepping down.

So the transition is a **fork, not a discount**:

> keep it current for a third — or keep me at what you're paying now.

Folding the assistant into the maintain tier would cut its price by two thirds forever, by accident.

**A fraction rather than a flat price**, because flat is wrong at both ends: trivial revenue from a
$5M business, still steep for a $250k one. One decision covers all five bands. **Rounded down** to
the whole dollar — $166 is a third of $499 and $167 is not, and a promise about paying less is one an
owner checks with a calculator.

### The trigger — TWO of them, whichever comes first

**Amended 2026-08-09.** There are now two ways the step-down fires, and separating them is the whole
point, because one is a prediction and the other is a promise.

**Trigger A — "the manual is built". STILL NOT DECIDED.** Needs a defensible denominator — **register
B4, deactivation** — and until that exists a percentage is measured against an unknown total. **Her
raise / him confirm** remains the agreed mechanism for declaring it reached, matching the
confirmation loop that already exists for facts.

**Trigger B — a HARD CAP of 12 MONTHS at the full rate. DECIDED 2026-08-09, operator.** After twelve
months the account steps down to the maintain rate regardless of how much is still in his head.

**Why this is not the thing §2 refused to do.** The refusal was to *predict*: "typically nine to
fourteen months" is a forecast, we have six valuations and all six are internal, and a timeframe we
cannot honour is worse than none. A **ceiling is not a forecast** — it is a commitment we control and
can keep unilaterally, and it needs no denominator, only elapsed time. So the one promise the product
could not make and the one it can look identical on the page and are opposites underneath.

**What produced it.** A 66-year-old electrician doing the arithmetic on the result page: $200,000 of
gap against $999 + GST a month with nothing bounding it. *"I'm 66 and I want out inside two years.
$999 + GST a month with no stated end is an open cheque, and no man my age signs one of those."* He
also read the refusal correctly and generously — *"The refusal to estimate reads as evasion, when I
think it's actually caution."* The cap answers him without inventing data.

**What it costs, stated because it binds every client not yet met.** Maximum revenue at the full rate
becomes **12 × band** — $11,988 + GST at the $999 band — then a third indefinitely. Open-ended before.
One active subscription exists (the operator's own), so nothing is repriced retroactively.

**It must be enforced, not merely stated.** A published cap that nothing implements is the `J2`
failure exactly: a pricing sentence that went false the moment a flag flipped. The mechanism is
cheap because arrears already bills through a Billing Meter where the **Price carries the amount and
the meter controls only WHEN** (`unitAmount` is the monthly fee, `value` is always 1) — so the
step-down is a subscription-item price swap at a period boundary, and `reportPeriodIfNew` already
runs at exactly that moment. Ship the copy and the swap together or neither.

⚠️ **`maintain-rate.test.ts` asserts the FAQ contains NO timeframe** (`not.toMatch(/\d+\s*months?/)`).
That guard was right for trigger A and is wrong for trigger B. Replace it deliberately: assert the
**cap** is stated AND that no *estimate* is — a ceiling is allowed, a prediction is not. Deleting the
assertion instead would drop the guard that stops "typically nine to fourteen months" appearing.

---

## 3. The valuation band — centre, not floor

**Decided 2026-08-03, corrected 2026-08-04. Live.** Full detail in LLD §6.2.

Register A1–A4: the sector median was treated as a **floor** and then multiplied. The correction
separates two quantities that had been collapsed into one band — **where you are** (the buyer's
discount, wide, the market's claim) from **what Kira moves** (`SPREAD = 0.75` turns, bounded, ours).

**Rescore everyone rather than freeze existing snapshots** (operator, 2026-08-04). This repriced
nothing: `business_valuations` was empty.

---

## 4. No vendor lock — the destination is swappable

**Decided 2026-08-05. Partially built.** Orchestrator `docs/SYSTEM_OF_RECORD_PORT.md`; Kira
`docs/GENOME_WRITE_BACK.md`.

**Kira must never know where the manual went.** It renders documents and says "file these"; the
orchestrator resolves the destination from what the tenant has connected. A caller with no opinion
about the vendor cannot be locked to one, and swapping becomes a change on one side of an HTTP
boundary rather than a refactor.

**The floor adapter needs no vendor at all** — a download that opens with no account, no network and
no us. That single guarantee is what makes "you are not locked in" a true statement rather than a
reassurance, and it is what a buyer's advisor actually needs, since he will not be given a login.

One deliberate deviation, recorded rather than hidden: **`download` lives in Kira, not behind the
port**, because it needs no credentials and routing bytes out and back would buy nothing. The rule
that remains: anything needing a token goes behind the port; anything needing nothing does not.

---

## 5. Drive scope defaults to `picked`

**Decided 2026-08-05. Live.** Orchestrator `app/api/connect/google/route.ts`.

`readonly` is the only access level that **cannot write**, so an owner taking the old default could
never have his manual filed back into his own Drive. Fixing it later means asking a cautious
sixty-something for a second consent months after the first, which does not happen.

`picked` (`drive.file`) is also the **least** privilege of the three — files this app created, nothing
else — and avoids Google's restricted-scope verification and third-party security assessment. Least
privilege, write-capable and least paperwork is a rare alignment.

Changed while exactly **one** owner was connected, on `full`, so nobody was affected.

---

## 6. The channel is part of the task, not a delivery detail

**Decided 2026-08-07.** Not yet built — this is the shape the first ingest slice must produce.

The Betta Roads follow-up to Paul — *is "next Friday" the 7th or the 14th?* — was scoped as "draft a
question and send it", and the send silently meant **email**, because email is the channel that
exists. Look at what the relationship actually runs on: Paul answers from `bettaroadswa@icloud.com`,
signs off *"This message has been sent from my mobile phone"*, and his replies are two lines long. A
one-line question about a date is an **SMS**. Putting it in his inbox is the wrong channel for the
message and slower than the right one.

So the output carries the channel and the reason for it:

> *"This should go to Paul by text, not email — he replies from his phone and this is a one-line
> question. Draft ready."*

She drafts, names the channel, and **holds**. The operator sends it from his own phone.

**Why this shape rather than building the connector.** It tests the three capabilities the slice is
actually for — ingest, ambiguity detection, and the dispatch→approve→release loop that has never
completed once — while deferring WhatsApp/SMS entirely. And it stops the first slice teaching her the
habit that everything is an email, which would then have to be untaught.

⚠️ **A message she cannot send is not a failure state.** "Drafted, wrong channel for me to send, here
it is" is a completed task. Anything that treats an unsendable channel as an error will quietly push
every message back onto email, which is the defect this decision exists to prevent.

## 7. WhatsApp — recommendation on the table, NOT yet decided

Recorded so it stops being re-analysed. Full analysis: `CAPTURED_ASKS.md` §2, 2026-07-31.

**The recommendation, unactioned for a week:** do not put his mobile number at risk — for this ICP the
number **is** the business. Split the ask: **ingest and read** to capture what was agreed; **outbound
client messaging on Meta Cloud API with a separate business number**.

The two routes fail differently, which is the whole decision. **Unipile as-me** sends from his
existing number into his real chats, and extends a shared package we already own — but it holds a
WhatsApp Web session, outside Meta's terms, with a real risk of the number being **banned**. **Meta
Cloud API** is official, but needs a dedicated number that can no longer be used in the normal
WhatsApp app, business verification, and pre-approved templates outside a 24-hour reply window.

This is the "never risk an asset that IS the business" rule in `CONNECTOR_POLICY.md` §A meeting a
real ask. **Operator decision outstanding.**

⚠️ **Also unrecorded anywhere: the wider social set.** Facebook, X, and the rest were raised and never
captured — `CAPTURED_ASKS.md` covers email, WhatsApp, phone, Drive and attachments, and mentions
LinkedIn only incidentally via `@caistech/unipile-channels`. That is a gap in the record, not a
decision that went the other way.

---

## 8. `/about` is Kira's page, not the portfolio's

**Decided 2026-08-09. Copy: not yet rewritten. The mechanical half is live (`c45a71f`).**

`kiraexec.com/about` was Corporate AI Solutions' page — the thesis, the marketplace, Longtail AI
Ventures, *"a suite of AI Voice Agent platforms"* — on a product domain, in front of a 66-year-old
deciding whether to hand over his books.

**The decision is whose page it is, not what colour it is.** It carries the founder story from the
landing page at full length, on the same cream palette, and the portfolio material comes off. Ray:
*"I genuinely thought I'd clicked through to a different company… That paragraph made me trust you.
This page took it back."* And the constructive half — *"You already wrote the right About page. It's
just on the wrong URL."*

**The URL stays.** For this ICP an About page is itself a trust artifact: he opened it before typing
a turnover figure, *"because that's what a suspicious man does before he types a turnover figure into
a website."* Redirecting it to a landing anchor saves a surface and costs the destination he was
looking for.

**Already shipped in `c45a71f`** (mechanical, no tone judgement): the duplicate footer, the hardcoded
`© 2025` sitting above a live `© 2026`, and two links to `corporate-ai-solutions.vercel.app` — a raw
hosting address that reads exactly as he read it, *"the parent company doesn't have a website."*

⚠️ **Two consequences, neither of them copy.** (1) The portfolio story now has **no destination** from
this product, and inventing one is a separate decision — it is deliberately not solved here. (2) The
page carries **P14**, which is not tone but a factual contradiction: *"Every agent learns, adapts,
and gets better with every conversation"* against the landing's *"not sold, not pooled, not used to
train anyone's model."* That is the third confirmed instance of the class **K15**'s unbuilt
`single-statement` check exists to catch, and it is the sentence this audience is least able to
forgive. It must go with the rewrite, not after it.

---

## 9. Debt is asked; premises, WIP and timing come after the result

**Decided 2026-08-09. Not yet built.** Register **P7**, absorbing **K7**.

A buyer asks four things the eleven questions never did: **debt**, **the premises**, **WIP and
retentions**, and **when he wants out**. All four are real. They do not all belong in the same place.

**Debt becomes the twelfth question**, and the result page gains *"after debt, about $X to you."*
That is the number he actually cares about: *"you could have asked in one box and shown me the number
I actually care about, which is what lands in my pocket… That's the number I'd screenshot and show my
wife."* Today it is a disclaimer at `app/business-valuation/page.tsx:1190` telling him to do the
subtraction himself.

**The other three go on an optional refine screen after he has seen a number** — where he is most
motivated, and where they cost the funnel nothing.

**Why the split rather than all four in the form.** The intro promises *"About 3 minutes"*, and the
eleven questions are the highest-praised surface in the entire report — the profit guard, Q8, the SDE
worked example. That funnel just carried the first PASS this product has recorded. Adding four
questions to it breaks a promise and puts the best thing here at risk to fix a gap that a later
screen fixes just as well.

**Debt is free of the model, which is why it can go first.** `lib/valuation/model.ts` has no concept
of debt. So this is page-level arithmetic exactly like A6's realisable range: **no `MODEL_VERSION`
bump, no rescore of the six stored valuations, and no change to anyone's price**, since pricing runs
off reported profit rather than the gap.

⚠️ **Two traps in the other three.** The premises is usually a yard held in a **super fund** — a
*separate* asset, so it must be named and excluded, never added to the business figure. And *"when do
you want out"* brushes **H3**'s do-not-infer-exit rule: asking him directly is fine and is what he
asked for; inferring it from the fact that he ran a valuation is not.
