# Measured systemisation — the product, not the favour

**For review.** Drafted 11 August 2026, out of the Peter McDowell call.

---

## The thesis, in one line

**Kira already claims that how systemised a business is drives what it sells for. Today that claim
rests on eleven self-reported answers. This measures it instead — from the systems the business
already runs on — and shows the owner it moving.**

## Where it came from, because the provenance is the argument

Three things said by three different people inside a week, which are the same thing:

> **Peter McDowell**, who has taken five companies through ISO 9001 and ran Australia's
> second-largest air conditioning manufacturer:
> *"The value of your company is a multiple of the quality of your standard operating procedures."*

> **Neil Mulcahy**, chairman, on SME valuation:
> *"There's no external valuation for unlisted, non-capital-raising SMEs… there's a market in that
> alone."*

> **Kira's own build register**, on the valuation model:
> the model asserted more than its cited source supports, and the fix was to claim *less*.

Peter states the mechanism. Neil says the measurement is the asset. The register says our version of
the measurement is not yet evidence. This is the piece that resolves all three.

## What it is

Four layers. The first three are delivery; the fourth is the product.

1. **The standard** — the SOPs and the quality manual, structured so a machine can check against them
   rather than a person reading them.
2. **The gate** — nothing leaves the business that has not been brought to the standard.
3. **The nudge** — every step with a date gets one, so following the procedure is the path of least
   resistance rather than an act of discipline.
4. **The score** — an objective, trended, **comparable** measure of how systemised the business
   actually is, computed from what happened rather than from what anyone says happened.

## ⚠️ What it measures — and the trap it must not fall into

Peter has been complaining for thirty years that quality systems stopped being about quality and
became about documentation. **A score that measures box-ticking rebuilds that disease and puts a
dashboard on it.** He would spot it immediately, and he would be right.

So the rubric measures **the outcome each procedure exists to produce**, not whether the procedure
was acknowledged:

| Compliance theatre — do not score this | Quality — score this |
|---|---|
| checklist completion rate | re-work and return-visit rate |
| procedures acknowledged | jobs over estimate, and why |
| documents filed | audit non-conformances, and time to close |
| nudges cleared | warranty callbacks per hundred jobs |
| training records signed | late completions against schedule |

**Most of this is already in SimPro and Xero.** Return visits against the same job, unbilled labour,
estimate versus actual — computed from systems the business already pays for. That matters twice
over: it is cheap, and it is not arguable, because it is his own data.

One exception, kept deliberately separate and weighted low: **evidence-at-close** (photos, sign-offs).
It is a tick-rate and behaves like one — but it is what an ISO auditor asks for, so it earns its place
as an audit-readiness sub-score rather than as quality.

**You cannot score in week one.** Month one is a baseline, not a grade. Saying so protects the number
from the first person who checks it.

## The two value claims, and why they must stay separated

This is the part that decides whether the product survives contact with a sceptical operator.

**Operational value — measurable now, in dollars, this quarter.**
Re-work avoided, callbacks reduced, jobs no longer running over, hours not spent re-doing work. Real,
attributable, and the owner can check it against his own P&L.

**Enterprise value — the mechanism, stated as a mechanism.**
*"The multiple your business trades at is a function of this. I will measure the movement and show it
to you. Converting that movement into a dollar figure is an estimate until enough businesses that
did this have actually sold — and I will tell you which of the two you are looking at, every time."*

⚠️ **Do not price a compliance gain as an enterprise-value gain until it is calibrated.** *"Your score
rose 30 points, so your business is worth $400k more"* is a causal claim with no evidence behind it,
and it is the exact failure the register already logs against the valuation model, arriving from a
new direction. The man most likely to buy this is the man most likely to check it.

**The calibration path**, so the claim becomes real rather than staying careful forever:
measured systemisation → realised sale multiple, gathered from business brokers (Finn Business Sales
is already in the contact list), the AIBB, and eventually Kira's own cohort. That dataset does not
exist for private Australian SMEs. It is what Neil meant by *"a market in that alone"*, and it can
only be built out of measured data — never out of self-reported answers.

## What already exists

The delivery layer is substantially built, under other names:

| Need | Already in Kira |
|---|---|
| Hold and retrieve the procedures | `file_manual`, `keep_document`, `read_document`, `search_drive` |
| Nudge with a date | `kira_tasks.due_at` + `scheduled`, hourly sweep, idempotent |
| Human approval before anything goes out | `dispatch_task` → `approve_task` |
| A non-technical user | voice, plus the typed transport |
| Financial truth | read-only Xero: `profit_and_loss`, `invoices_owed_to_you`, `bills_you_owe` |

**Genuinely new: the rubric, the scoring engine, and a SimPro connector.** Everything else is pointing
existing machinery at a different job.

## Staging

**Stage 1 — Just HVAC.** One entity, one division (service and maintenance), founder-configured, no
multi-tenancy. Baseline in month one, first real score in month two. This is the thin slice and it is
also a paid engagement.

**Stage 2 — the second entity. This is the actual test of the product.**
Not "does it work again" but **how long it takes**. See below.

**Stage 3 — the cohort.** Enough entities that the scores are comparable across businesses rather
than only across time, which is when the benchmark starts to exist.

## The inheritance test — what "his second entity inherits it" has to mean

Mechanically, deploying entity number two must be **configuration plus connection, not a build**:

- **The standard** is a template — the procedure-for-procedures, the 9001 skeleton, a sector SOP set.
  Entity-specific content, not entity-specific code.
- **The rubric is defined once** and is identical everywhere. That is what makes the scores
  comparable, and comparability is the whole reason a portfolio operator installs it in all of them.
- **The connectors are the same** — SimPro, Xero, Drive.
- **The score is the same number**, so *"Just HVAC is at 71, Click WA is at 43"* is a sentence that
  means something.

**The falsifiable test: if the second entity takes more than a day to stand up, it is not a product
yet — it is a service being performed twice.** Measure it and record the number.

## Distribution — who onsells this

Peter is not a customer; he is a book. All Skills Group is explicitly a holding structure for "the
just group" — just HVAC, just solar, just water — plus his son's Walcott Group, Click WA, and the
Min Solar relationship. If it works once, he deploys it several times and introduces it himself.

Beyond him, the distributor archetypes worth testing, in order of how much book they already hold:

- **Quality and certification consultants** — they take companies through 9001 by hand today, charge
  for it, and have client lists. This makes their delivery cheaper and their result measurable.
- **Industry associations** (AMCA and equivalents) with member trade contractors.
- **Business brokers**, who want a defensible systemisation number at listing.
- **Accounting firms** with trade-business clients, per the existing distributor thesis.

## What would make this fail

- **It scores tick-rates.** Peter names the disease; we build it. Fatal, and quickly.
- **We monetise the enterprise-value claim before it is calibrated.** One sceptical accountant unpicks
  it and the whole number loses its authority — including the parts that were sound.
- **The second entity costs as much as the first.** Then it is consulting with a dashboard, it
  re-chains the operator, and it works against the reason for building anything.
- **SimPro turns out to be closed.** Then the outcome metrics have to come from somewhere else, and
  the cheap part of the diagnostic stops being cheap. **Verify before promising.**
- **We call it a new product.** Gate 0 blocks a new card while the board is untriaged, and it is not
  one: this is Kira's `readiness` axis given real data, plus a delivery layer she mostly has.

## Open decisions

1. **Is this Kira, or does it carry its own name to trade buyers?** It is Kira's thesis measured, but
   "SOPs and quality" sells into businesses that would never buy an exit-planning tool. The product is
   the same; the door is different.
2. **How much of Stage 1 does Peter pay for**, given he is also the design partner and the reference?
3. **Who owns the benchmark dataset**, and what does an owner get told about their data being in it?
   That has to be settled before the second entity, not after the tenth.
4. **SimPro access** — API, or export-and-parse? This decides the cost of every deployment after the
   first.

---

**One line, if nothing else survives:** *the score is the product; the SOPs are how you earn the right
to measure it.*
