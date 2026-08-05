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

### ⚠️ The trigger is NOT decided

No date and no threshold appears anywhere, in code or copy, and a test asserts no timeframe in the FAQ
answer. "When the manual is built" needs a defensible denominator — **register B4, deactivation** —
and until that exists a percentage is measured against an unknown total.

What the copy says instead is true: *"we don't put a date on it, because it depends entirely on how
much of the business is still only in your head."*

**Her raise / him confirm** is the agreed mechanism for declaring it reached, matching the
confirmation loop that already exists for facts.

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
