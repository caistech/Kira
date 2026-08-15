# The bucket checklist — what would make "green" mean something

**Draft for review, 2026-08-15.** Companion to the bucket dashboard (`components/GenomeBuckets.tsx`)
and to `GENOME_BUYER_FORMAT.md` §2–3.2.

---

## 0. The problem this exists to fix

The dashboard now shows nine buckets in four bands. The bands come from `deriveOwnerGenome`, which
computes them like this:

| Band | Rule today |
|---|---|
| empty | 0 entries |
| thin | 1–2 entries |
| building | 3–5 entries |
| covered | **6 or more entries** |

So **"well covered" currently means six facts of any kind.** Six trivial notes about the people in a
business score identically to the three that would actually survive due diligence. That is adequate
for *"is this area getting attention"* and it is not an answer to a broker asking **"green on what
basis?"** — which is the first question anyone will ask, and the question the whole product's
credibility rests on.

The fix is a denominator. Not a made-up one — `OwnerSection.coverage` is right that inventing six
and dividing by it puts a precise-looking number on a guess — but a **defensible** one.

---

## 1. The principle: the checklist is derived, not invented

Every area in `lib/genome/areas.ts` already carries a `buyerQuestion` — the question a buyer's
advisor actually asks about that part of a business. It was derived bottom-up from ~140 flows in the
orchestrator's task registry rather than dreamed up.

**The checklist is that question, itemised.** Nothing new is being invented; the existing question is
being broken into the facts that answer it.

That matters for the same reason the areas themselves were derived: when a broker challenges a green
bucket, the answer is *"because these six things a buyer always asks are on the record"* — not
*"because our algorithm said 6."*

## 2. How the bands would work

**Not a percentage.** Items are marked **required** (a buyer always asks) or **supporting** (a buyer
asks when it matters). Then:

| Band | Rule |
|---|---|
| **empty** | nothing answered |
| **thin** | at least one item answered |
| **building** | more than half the *required* items answered |
| **covered** | **every required item answered** |

"Well covered" then means something a person can say out loud and defend: *every question a buyer
always asks about this area has an answer on the record.* Supporting items add depth without being
able to hold a bucket red.

⚠️ **Bands stay bands.** The count exists to define the boundaries; it is never printed. The reason
is unchanged from `coverage`'s own note — and commercially, "amber, and here are the two things
missing" is a conversation, while "58%" is an argument.

---

## 3. The nine checklists

Required items are **bold**. Everything else is supporting.

### Customers — *"who buys, and who owns the relationship"* (rank 1)
> Buyer asks: revenue by customer over three years, concentration, and who owns each relationship.

- **The top customers named, with roughly what share each is**
- **Who inside the business owns each of those relationships** — a name, not "me"
- **Which of them are contracted, and which are at-will**
- Which would follow you personally if you left
- How long the main ones have been buying
- Anything unusual about how a big one is served

*Matteo factor: customer concentration — the single largest discount a buyer applies.*

### Pricing — *"could someone else reach his number?"* (rank 4)
- **How a price is actually arrived at** — list, cost-plus, market, or judgement
- **The rates or margins themselves, written down**
- **What a non-standard job does to the price, and who decides**
- Who may discount, and how far
- Where the price list lives, if there is one
- When prices last moved and what triggered it

*Matteo factor: earnings consistency.*

### Operations — *"does the work happen without him on site?"* (rank 5)
- **The steps of a standard job, start to finish**
- **Who does each step**
- **What you personally still do on a normal job**
- The quality check, and who signs it off
- What goes wrong most often, and the fix
- Any job type only you can run

*Matteo factor: seller involvement, transferability.*

### People — *"who does the work"* (rank 6)
- **Everyone who works in the business, named, with their role**
- **Employed, contractor or casual, for each**
- **Who is genuinely critical — who the business would struggle without**
- **Who could step into your job**
- Tenure for each
- Who has a written contract; who has a restraint
- Who would leave if the business sold

*Matteo factor: management structure — the +0.5x to +1.0x line on his table.*

### Compliance — *"what must not lapse, and who is watching it?"* (rank 7)
- **Every licence and registration held, with its expiry**
- **Every insurance policy, with its renewal date**
- **Who watches that calendar**
- Anything currently in dispute
- Any contract with a change-of-control clause

⚠️ **The "what you NEED" half is deliberately out of scope.** `areas.ts` flags it and the flag is
right: asserting which licences a business like his *must* hold is a claim about regulatory
obligation, and per `DATA_STANDARD` that wants an authoritative citable source, never inference. The
checklist covers what he HAS. A gap analysis is a separate product with a separate risk profile.

### Cash — *"money in, money out and terms"* (rank 8)
- **The payment terms you give customers**
- **Who chases overdue money, and at what point**
- **Who may approve spending, and up to what amount**
- **Whether any supplier terms are personal to you rather than to the business**
- Roughly how much is tied up in stock and unbilled work at any time
- Anything the business owes beyond what the valuation captured

*Matteo factor: working capital — named twice in his guide, captured nowhere in ours.*

### Assets — *"what the business owns"* (rank 9)
- **What is owned outright**
- **What is financed or leased, and what is still owing**
- **What is held in your own name or your super fund rather than the business**
- **The premises: owned or leased, how long is left, and does the lease transfer**
- Anything due for replacement in the next couple of years
- Deferred maintenance anyone would notice

### Systems & records — *"where records live, who can reach them"* (rank 10)
- **What software the business runs on** — accounting, jobs, payroll, CRM
- **Who has admin access to each**
- **Where the files actually live**
- **Whether the domain, brand and IP are owned by the business or by you personally**
- What is written down versus what is habit
- What happens to access if you are unavailable

> ⭐ **This one has a second payoff.** "What software does the business run on" is also the connector
> routing question — Google, Microsoft, or neither. Asking it here answers it once for both purposes.
> See `BRIEF_ORCHESTRATOR_DRIVE_FILE_SCOPES.md`.

### Demand — *"where the work comes from"* (rank **null**)
- **The main sources of new work, roughly ranked**
- **Whether new work comes to you by name**
- The split between repeat and new
- What marketing exists, and who runs it

⚠️ **Demand's rank is deliberately null and it is an open decision, not an oversight.** `areas.ts`
says a scorer "must refuse a null rank loudly rather than multiply it by zero and produce a confident
number over a question nobody answered." A checklist gives Demand a coverage band regardless — but
whether it should carry weight in any *score* remains unanswered, and this document does not answer
it.

---

## 4. Three traps to avoid building

**1. Don't let the checklist become a form.** The product's whole thesis is that a 66-year-old will
talk and will not fill in fields. The checklist is the *scorer's* denominator and Kira's agenda — it
is not a screen he works through. He should discover it exists only as "two things left in this
area", if at all.

**2. Matching a captured fact to a checklist item is the actual build.** `classifyPendingMemories`
already files entries into *areas* with an LLM. Extending it to file into *items* is the same
machinery one level down, and it is where the effort is — not in writing this list.

**3. Don't backfill.** Same rule as confirmations: an item marked answered because something in the
area vaguely touched it is the lie the document cannot survive. If the classifier is unsure, the item
stays open and Kira has something to ask about — which is the good outcome, not the failure.

---

## 5. What this does NOT settle

- **Whether "all green" may be described as sale-ready.** It may not, on today's data, and the
  component test enforces that. Even with a full checklist, Matteo's own tables put **sector and size
  first**: a perfectly systemised café is still 1.0–2.5x. The defensible claim is *"the top of your
  sector's range"*, which is exactly what the model already computes.
- **Whether a confirmed item outranks a captured one.** `GENOME_BUYER_FORMAT` §2 says verifiable
  means read back and agreed, and that is a third axis rather than more of the first. A checklist
  item answered-but-unconfirmed and one answered-and-confirmed are not the same asset. Probably: the
  checklist drives the *bucket*, confirmation drives the *buyer's document*.
- **Who ratifies the list.** These items are my drafting from each area's existing `buyerQuestion`.
  They should be reviewed by someone who does this for a living — and Matteo Melis is the obvious
  reviewer, since his guide is already the source for half the model. Asking him is also a
  relationship move rather than only a technical one.

---

## 6. Suggested shape when it is built

`lib/genome/checklist.ts`, as **data, not prose** — for exactly the reason `areas.ts` is data: when a
broker moves or adds an item, that must be a config change and a re-score, never a rebuild.

```ts
export interface ChecklistItem {
  key: string;            // stable id — never renumbered, it is what an entry is matched to
  area: AreaKey;
  required: boolean;      // required items are what "covered" means
  /** The buyer's phrasing, for the handover document. */
  buyerItem: string;
  /** The same thing asked of the owner, for Kira's agenda. */
  ownerPrompt: string;
}
```
