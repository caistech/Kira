# What Kira can do, and what she can't

**As at 2026-07-28.** The definitive list. Derived from the code — every CAN entry names the tool or
route that performs it, and every CANNOT entry is a thing with no path, not a thing we haven't
described well.

**Why this document exists.** An owner asked for his Xero balance and was interrogated for three
turns before being told no, because his agent's prompt described none of its own tools. The opposite
failure happened the same day: she said an email had been sent when it was sitting undrafted. Both
come from nobody having written down, in one place, what is actually true. When this list and the
code disagree, **the code is right and this file is a bug.**

---

## CAN — and does it now

### Get things done (`dispatch_task` → orchestrator → `approve_task`)

Everything here is **drafted, read back, and held** until the owner says go. Nothing sends on its
own, ever.

| Ask | What happens |
|---|---|
| **Draft a quote** for a client | Priced work written in the owner's voice, held for approval |
| **Draft an email** — follow-up, reply, introduction | Written and read back; the send needs a real address, and she asks for one rather than inventing it |
| **Set a reminder** for the owner | Scheduled against the owner's own timezone |

**The approval is structural, not a setting.** `dispatch_task` cannot send; only `approve_task` with
an explicit yes emits anything. A wrong quote that goes out is worse than a slow one.

### Answer from the accounts (`look_up_financials` → orchestrator `/v1/read` → Xero)

Read-only, answered immediately, nothing held and nothing changed. Requires the owner's Xero to be
connected.

| Ask | Returns |
|---|---|
| **What's in the bank?** | Balance per account and the total |
| **Who owes me?** | Count, total, how much is overdue, and the five oldest with names and amounts |
| **What do I owe?** | The same, for bills payable |
| **What does Xero have for us?** | Business name, base currency, financial year end |

**Verified live 2026-07-28** against a real connection, after re-consent with the widened scopes
(`accounting.settings.read`, `accounting.reports.profitandloss.read`,
`accounting.reports.banksummary.read`). All four return real values, not structurally-valid zeros.

⚠️ **`profit_and_loss` reaches the report and parses only ONE line out of it** — `Total Income`, no
expenses and no net profit. The scope is granted and the call succeeds; the row-walk in
`xero-read.ts` only picks up one section of Xero's nested report structure. It stays on the CANNOT
list until it returns the whole picture, because half a P&L is a worse answer than none.

**She says these figures; she never saves them.** She may remember what they *mean* — "money owed is
concentrated in a few clients" — and never the amounts, balances, invoice numbers or client names.
Operator decision, 2026-07-28, and the reason is this buyer specifically: he often has not told his
staff, his broker or his wife that he is selling.

### Know the business

| Ask | Tool |
|---|---|
| Remember something | `save_memory` |
| Recall what she was told before | `recall_memory` |
| Answer from a document the owner gave her | `search_knowledge` (uploads, contracts, reports, links) |
| Pick up where the last conversation ended | `get_conversation_context` |

### Run in the background (the orchestrator's own sweep, no one asks)

| What | Trigger |
|---|---|
| Chase an overdue invoice | 30+ days overdue, confirmed still unpaid at the moment of sending |
| Follow up an unanswered quote | No contact within the window |
| Flag an expiring obligation | Insurance, licence or certification nearing expiry |

Each one is **confirmed against the source before it fires** — chasing an invoice the client paid
this morning is the most embarrassing thing this system can do.

---

## CANNOT — no path exists

Not "not described well". There is no code that does these.

### Money

- **Pay anything.** No transfers, no bill payments, no card use.
- **Raise or send an invoice.** She can draft an email *about* one; she cannot create one in Xero.
- **Change anything in the accounts.** The Xero connection is read-only by construction — the
  transport hard-codes GET, so making it write would require changing the module, not passing a flag.
- **Read payroll or employee records.** Deliberately off the whitelist, though Xero would allow it.

### Other systems

- **Banks.** No connection of any kind. Balances come from Xero's view, not the bank's.
- **Calendars.** She cannot see, book, move or cancel anything.
- **Job management, CRM, inventory, suppliers.** No connections.
- **Ordering materials, booking trades, making bookings** of any kind.

### Herself

- **Send anything without approval.** Structural, not configurable.
- **Listen in the background.** She hears only when the owner opens a conversation and presses the
  button. *(Privacy mode — the wake-on-name model — is on the roadmap and not built. The public site
  says so in those words.)*
- **Build a new capability on request.** The agent-builder seam exists and `build()` deliberately
  throws rather than faking a spin-up. She notes what was asked; nothing yet acts on the note.
- **Tell the owner later when something becomes possible.** No notification path exists, so she must
  not promise one.

---

## What she does with a "no"

She says she can't **first** — before any clarifying question — then dispatches it anyway so the ask
is recorded, then says she has noted it. The unsupported row lands in `/admin/asked-for` and emails
the operator.

That last part is the point: **an out-of-reach request declined in conversation alone vanishes**, and
the list of what owners actually ask for is the only evidence of what to build next.

---

## How this list grows

A capability moves from CANNOT to CAN when three things are true: something can perform it, Kira has
a tool for it, and her prompt describes that tool. Missing the third is what made her deny having a
team while holding the tools to use one — so a new capability is not finished when it works, it is
finished when she knows she has it.

Adding a Xero resource is one line in `XERO_RESOURCES` plus its query. Adding a *system* is a
connector, an OAuth flow, and a decision about what may be remembered from it.
