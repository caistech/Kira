# Spec — dated obligations ("the thing that deregistered a company")

**Origin.** One of the operator's own companies was **deregistered because nobody tracked the fee
payment date**. That is not an anecdote about tidiness; it is the product's whole promise reduced to
its hardest case — a single fact, with a date, where forgetting it costs something you cannot buy
back.

**The owner-facing promise, in one sentence:**

> *"I read what you've already got and found fourteen dated obligations. Four fall inside ninety
> days. One of them is your company's annual review fee."*

---

## Why this is not a reminder app

Anyone can build a reminder list. **The operator did not get deregistered for lack of a calendar** —
he got deregistered because the date was not anywhere he would look.

Which kills the obvious product: asking an owner *"what are your renewal dates?"* only ever captures
the dates he already knows, and those were never the risk. **The value is entirely in the discovery
pass.** The reminder is the cheap half and it is already built.

---

## What already exists (this is why the build is small)

| Piece | Status |
|---|---|
| `search_drive` + `read_document` | **live tools** — she already finds and reads the owner's documents |
| `look_up_financials` | **live** — read-only Xero: `bills_you_owe`, `invoices_owed_to_you`, `profit_and_loss`, `bank_balances` |
| `kira_tasks.due_at` + `scheduled` status | **live** (migration `20260727150000`) |
| Hourly sweep that delivers anything past due | **live** (`app/api/cron/reminders`) — idempotent by status, retries on transient failure |
| `facts_to_confirm` / `confirm_fact` | **live** — the read-back-and-agree loop |

**Missing: only the discovery pass and the offer.** Nothing here needs a new table, a new clock, or a
new delivery path.

---

## ⚠️ What she can and cannot read — decide the copy around this, not around what we wish

**Drive: yes.** `scopesFor()` in the orchestrator requests `BASE + DRIVE + CONTACTS`.

**Email: NO.** There is **no Gmail scope anywhere in the Google connection**. Renewal notices that
only ever arrived by email are invisible, and that is most of them for a lot of owners.

This is the single most important constraint in the spec, and it must shape the owner-facing wording.
Adding Gmail is a separate decision with its own consent and verification cost — **do not spec around
it as though it were there.**

**Xero: partially.** `bills_you_owe` surfaces dated payables, which catches some obligations, but an
ASIC annual review fee is not typically an entered bill until it is.

---

## The flow

1. **Sweep** — `search_drive` across the owner's connected Drive for the document classes that carry
   obligations: insurance schedules, licence and registration certificates, ASIC statements, leases,
   service contracts, vehicle registration, trade tickets, software agreements.
2. **Extract** — for each candidate, pull `{ what it is, who issues it, the date, the consequence of
   missing it, the source document }`. ⚠️ **Do not fork a document text extractor.** `read_document`
   already does this work, and `SHARED_SERVICES` lists generic PDF/docx text extraction as an OPEN
   extraction candidate belonging in `@caistech/dataroom-core`, explicitly *not* forked per product.
3. **Offer for confirmation, never assume** — each finding goes through the existing
   `facts_to_confirm` loop. A date she inferred from a PDF is exactly the kind of fact that must be
   read back before anything is relied on. *"Your public liability looks like it renews on 14
   October. Is that right?"*
4. **On confirm → schedule** — write a `kira_tasks` row, `kind: 'reminder'`, with `due_at` set to a
   lead time appropriate to the obligation (a licence needs weeks, an invoice needs days). The
   existing sweep delivers it. Nothing new.
5. **Restate coverage every time** — see below.

---

## The rule that decides whether this is safe to ship

**A tracker that misses one is worse than none.** The owner stops carrying the dates himself and
hands his vigilance to a system that then fails silently — which is precisely the failure that cost
the operator a company, rebuilt in software and sold back to him.

So it must state its own reach out loud, every time it reports:

> *"That is everything I can see in your Drive. I cannot read your email, and I cannot see paper in a
> drawer — so if a renewal only ever arrives by post or by email, it will not be in this list."*

Degrade, don't fake — the same rule already applied to her recall. **Never render a count as though
it were complete.** "Fourteen I can see" is honest; "you have fourteen obligations" is a lie with a
company attached to it.

---

## What NOT to build

- **Not a new product.** Gate 0 blocks a new card while the board is untriaged, and this needs none —
  it is a Kira capability that writes into a table with a clock already behind it.
- **Not a compliance calendar UI.** The surface is conversation plus the existing task ledger. A
  calendar page is the audit-shaped version of this: it hands back a view instead of a finding.
- **Not a second extractor.** See step 2.
- **Not legal or compliance advice.** She reports what a document says and when. She does not tell an
  owner what he is obliged to do.

---

## Staging

**Stage 1 — the discovery pass, one owner, spoken.** Sweep Drive, extract candidates, read them back
through `facts_to_confirm`, schedule the confirmed ones. No new UI. This is the whole demo.

**Stage 2 — the first-run payload.** Run it automatically when an owner first connects Drive. This
solves a real cold-start problem: today a new owner connects Drive and Kira has nothing to say about
his business. This gives her something true to say on day one, sourced from his own material — which
is exactly the *"I want that"* reaction the thin-MVP rubric is scored on.

**Stage 3 (only if it earns it) — the recurring sweep.** Re-read on a schedule so new documents get
picked up. Defer: it needs a dedupe story against already-confirmed obligations, and Stage 1 proves
the value without it.

---

## Where it earns its keep outside the product

**Friday, at Peter's.** *"What is the next date that, if you miss it, costs you something you cannot
buy back?"* — then go and find them. It is a priced leak sourced from his own systems, and the fix
has **no AI in it at all**, which is the most persuasive thing available to hand a man who already
uses Claude.

**And it answers the question that ended the Neil call.** He asked for case studies and heard "still
building" three times. *"A Perth business we looked at was ninety days from a lapse nobody had
diaried"* is a sentence that does not currently exist, and this is the cheapest way to earn it.
