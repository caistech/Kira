# The Owner-Operator AI Executive Assistant
### Product essence & integration thesis
**For:** Gareth Newman (agent swarms + memory harness) · Shah / Mnemo (semantic memory)
**From:** Dennis McMahon, Corporate AI Solutions · *working draft for partner discussion*

> The customer example below is an **anonymised avatar** — personal details have been stripped for
> sharing. §5A is written for Gareth, §5B for Shah; send the whole thing or just the relevant brief.

---

## 1. The problem

The **hands-on owner-operator.** Our avatar: the owner of a small civil / earthmoving contractor —
a strong operator with a handful of staff and a yard full of equipment (graders, loaders, tankers).
The business runs **entirely in his head.** Systems are weak. He works 15-hour days, invoicing lags,
he re-checks every job, and miscommunication with the crew costs him time and money.

Critically, **he does not want to become a corporate machine.** He's watched the bigger,
process-heavy competitor and rejects that identity — he wants to stay personally, physically
involved, in the truck and on the site. Hiring a human executive assistant (~$80k/yr plus the
overhead of managing another person) doesn't fit how he works.

He is the avatar for a very large market: the owner-operators whose businesses are trapped inside
their own heads.

## 2. The product, in one line

> A **voice-first AI executive assistant** that lives on the owner's phone, captures the knowledge
> in his head *as he works*, and drives a back-office that runs itself — with him **in the loop, not
> in the weeds.**

The feel: he keeps it open like Siri. *"Hey Kira — just got a call from [client], new job at
[site]."* He talks the way he already talks. It could be **100 short exchanges a day.** He is never
pulled off the job to "do admin" — the admin happens around him.

## 3. The architecture — three layers on a memory spine

**Layer 1 — Voice front-end (the EA he talks to).** Always-on, phone-native, proactive. Behaves
like a great intern/EA: asks the clarifying questions a good assistant would (existing client?
address? urgency? timeline? who's free? are their tickets current?), extracts what's in his head,
and reads it back to confirm. **Human-in-the-loop** on anything that leaves the building — an
invoice doesn't go out until he taps approve.

**Layer 2 — Swarm coordinator + agent swarm (the back-office that does the work).** The voice layer
is the funnel; the **coordinator decomposes** each interaction into tasks and dispatches them to
specialised agents — CRM, scheduling/dispatch, quoting, invoicing, compliance. Mechanical work (pull
a record, sync Xero) is a plain **API call**; the swarm's value is the **analysis and decision
layer**, not burning tokens to move data.

**Layer 3 — The business backbone (system of record).** A generic business-operations spine — the
standard departments as structured "empty categories" (CRM, jobs/projects, finance, HR, compliance).
Built **once, generic to any business**, then **populated by the swarm** and integrated with what the
owner already uses (Xero, ConnectTeam, …). *(We already run a Checkpoint-style project/ops backend
that seeds this.)*

**The spine through all three — persistent memory.** For this to feel like an *executive assistant*
and not a *dictaphone*, it must **know the owner, the business, its people, its clients and its
history**, and **accumulate** that across every interaction. Memory is not a feature here — it is the
substrate the other three layers stand on.

## 4. The memory architecture — where each of us owns a lane

This is the crux of *"between us we can build this."* Memory is **not one store — it's three**, with a
clean division of responsibility. Keeping them distinct is what makes the product robust for real
businesses.

| Memory type | What it holds | Owner of the lane |
|---|---|---|
| **System-of-record (structured)** | Exact, auditable business facts — clients, jobs, quotes, invoices, schedules | The business backbone (Layer 3) |
| **Working / orchestration memory** | Live task state, cross-agent shared context, "what the swarm is doing right now" | **Gareth — swarm + memory harness** |
| **Experiential / semantic memory** | Who the owner is, how he works, patterns, prior decisions, "what we learned last time," cross-session continuity | **Mnemo — Shah** |

You never ask semantic memory for an invoice total, and you never trap evolving conversational memory
in a rigid table. Each partner's technology maps to **exactly one lane**, and they compose.

## 5A. Where Gareth's swarms + memory harness fit

- The **swarm framework is Layer 2** — the thing that turns a 20-second voice exchange into a
  *completed* back-office operation (client verified → job scheduled → operator dispatched → quote
  drafted for approval).
- The **memory harness gives the swarm its working memory**: shared operating context so agents
  don't re-derive state, durable task/orchestration state, and the *always-current background* the
  owner assumes is there when he says "you've got all the background."
- **The upgrade:** today the voice agent can *talk about* the work; with the swarm it can *do* the
  work. That is the leap from demo to product.

## 5B. Where Mnemo fits

- Mnemo is the **experiential / semantic long-term memory** — the layer that makes the assistant feel
  like it genuinely *knows* the owner and the business, session after session, across ~100
  interactions a day.
- **Positioned correctly:** Mnemo holds **distilled, non-PII conclusions and continuity** — *"this
  owner prefers X," "we resolved Y last week," "this client always Z"* — **not** raw transcripts and
  **not** the authoritative invoice/job facts (those stay in the structured backbone). That
  separation is exactly what keeps it safe to deploy into a real business.
- **The upgrade:** it closes the gap that kills every voice EA — the assistant that forgets (see §6).

## 6. Why memory is make-or-break — a live failure

We ran this exact flow last week. The owner spent **16 minutes** briefing the assistant in depth,
reconnected **45 seconds later**, and it had forgotten everything:

> *"I hope you haven't forgotten that last 20 minutes."* → *"I don't have access to past
> conversations."*

The assistant only ever knew the **one-sentence objective** baked in at setup. That hole is precisely
what the Gareth + Mnemo integration fills — and why the memory harness isn't a nice-to-have, it **is**
the product.

## 7. What "deployable anywhere" means

Build the **engine once** — voice front-end + swarm coordinator + generic backbone + the three-lane
memory model. Ship a **vertical in days** by *configuring, not rebuilding*: the owner's terminology,
their tools (Xero / ConnectTeam / …), their departments. Earthmoving today; any owner-operated SMB
tomorrow. That is the commercial shape — **one engine, many businesses.**

## 8. The ask

A working session between the three of us to agree **three seams**:
1. the **swarm-coordinator ↔ voice-layer** contract (how intent becomes dispatched tasks),
2. the **working-memory ↔ semantic-memory** boundary (Gareth's harness ↔ Mnemo),
3. the **backbone integration** surface (how the swarm reads/writes the system of record).

Agree those three seams and we have a product that drops into any business owner's phone.
