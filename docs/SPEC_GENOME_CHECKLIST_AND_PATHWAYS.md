# Spec — per-bucket rubrics, substance tests, and pathways

**Written 2026-08-15.** Builds on `GENOME_BUCKET_CHECKLIST.md` (the item list) and
`GENOME_BUYER_FORMAT.md` §2–3.3. Supersedes nothing; it is the missing *mechanism* under that draft.

---

## 0. What this is for, in one paragraph

An owner who is comfortable with Kira and wants to **push** has nowhere to push. The Genome shows
nine buckets in four bands, the bands are a tally of entries, and there is no way in. This spec adds
the way in: click a bucket, see what a buyer asks about it, see which of those questions your record
actually answers, and — where a question is answered *badly* — be told why and asked a better one.
Then, for the questions that no amount of talking can fix, a **pathway**: the sequence of real
changes that would close the gap, tracked over months, with the score moving only when a milestone
is actually evidenced.

---

## 1. The four gates

Every checklist item passes through four gates. Today only the first exists, and only as a count.

| # | Gate | Question | Where it lands |
|---|---|---|---|
| **1** | **Answered** | Is there anything on the record at all? | coverage band |
| **2** | **Substantive** | Does the answer pass the item's own test — and if not, *why*? | coverage band + Kira's coaching |
| **3** | **Located** | Where does it live: his head, paper, a laptop, his cloud, a system? | transferability + `moveUp` action |
| **4** | **Remediated** | If the honest answer is bad, what would make it good — and has any of it happened? | pathway + evidenced readiness |

Gate 2 is the one that stops a green bucket being meaningless. Gate 4 is the one that makes the
product an execution partner rather than an audit.

### 1.1 Why gate 2 cannot be a scorer alone

*"Six facts of any kind"* is the current bar. The fix is not a stricter count — it is that
**failing an item must produce the reason, in the owner's language, as the next question.**

> **People → "who could step into your job"**
>
> - weak: *"my son helps out"*
> - strong: *"Mark runs Tuesday and Thursday end to end, quotes to $8k without me, has done since March"*
> - the test: names a person · names what they decide without him · is true now
> - Kira says: *"'Helps out' doesn't tell a buyer whether the business runs on Tuesday if you're in
>   hospital. Who actually does — and what can they decide without ringing you?"*

A rubric that only scores produces a red bucket and a confused owner. A rubric that carries its own
failure reason produces the next sentence of the conversation.

### 1.2 Gate 4, and the one hard rule

Some gaps do not close with words. *"Nobody can step into my job"* is not fixed by writing it down;
it is fixed by someone stepping into the job. So Kira offers a **pathway** — and:

> ⚠️ **MAKING THE PLAN MUST NOT MOVE THE NUMBER. ONLY EVIDENCING A MILESTONE DOES.**

If agreeing a pathway lifts the score, the product rewards *intending* to change — more flattering
than rewarding talking and slower to disprove. He would arrive in a data room with a good number and
a business that still stops when he does. The plan is a commitment; the milestone is the fact.

---

## 2. How this compiles into the existing rubric

There are two rubrics today and they are **different shapes**, which is why "per-bucket rubrics that
roll up" is a decision rather than a wiring job.

- **`model.ts`** — five factors over ten points: `ownerDependence` 3.0, `systems` 2.0,
  `recurringRevenue` 1.75, `clientConcentration` 1.25, `growth` 2.0. Scored once, from the thirteen
  questions. This is `readiness`.
- **`areas.ts`** — nine areas, derived bottom-up from ~140 orchestrator flows. Owner-dependence is
  **not** an area; `areas.ts` calls it *the axis, measured per area*. Assets and Compliance map to
  none of the five factors.

Nine ≠ five, and forcing an area→factor map means pretending Assets moves the multiple. So:

> **The mapping is per ITEM, not per area.** `ChecklistItem.factor` is a `FactorKey | null`, and
> **null is the common case** — most items complete the handover document rather than change the
> price.

That is what lets the panel say something true: *"two of these five move your number; the other
three make your document complete."*

### 2.1 Two numbers, and why `readiness` is not touched

`MODEL_VERSION` exists so a stored snapshot stays interpretable, and re-weighting *"would silently
rewrite everyone's history"*. Recomputing `readiness` in place does exactly that.

So this spec adds a **second** number and leaves the first frozen:

| column | meaning | writers |
|---|---|---|
| `readiness` | **the baseline.** What the thirteen questions said, on the day. | the existing two, at signup. Unchanged. |
| `readiness_now` | **where he is now**, from evidenced items. | the recompute |

The dashboard already says *"Transferability at your baseline"* — that copy becomes literally
correct rather than a hedge, and the movement is expressible as a delta from a fixed origin, which
is the only honest way to show progress.

⚠️ `readiness-claims.test.ts` guards that `readiness` has exactly two writers. That guard stays and
is **extended**, not relaxed: a third writer of `readiness` is still a defect; `readiness_now` is a
different column with its own writer.

### 2.2 The number may go DOWN, and that is the feature

Capture reveals dependencies nobody had priced. *"Who could step into your job — nobody"* is
evidence that should **lower** `ownerDependence`, not raise it, however diligently he answered.

A machine where every answer raises the score is a machine that rewards talking. *"Your number moved
down $180k, and here is the sentence that did it"* is the most credible thing this product can say,
and it is the moment he decides to fix the dependency — which is the entire point of the project.

---

## 3. Data model

### 3.1 `lib/genome/checklist.ts` — data, not prose

Held as data for the same reason `areas.ts` is: when the list is challenged, that must be a config
change and a re-score, never a rebuild.

```ts
export type FactorKey =
  | 'ownerDependence' | 'systems' | 'recurringRevenue' | 'clientConcentration' | 'growth';

export interface SubstanceTest {
  /** Observable conditions, ALL of which must hold. Written so a person can check them. */
  tests: string[];
  /** What a thin answer sounds like. Drawn from real answers where possible. */
  weakExample: string;
  /** What a substantive one sounds like. */
  strongExample: string;
  /** What Kira says when it fails — the reason IS the coaching. */
  coaching: string;
}

export interface ChecklistItem {
  key: string;                 // stable, never renumbered — it is what an entry is matched to
  area: AreaKey;
  required: boolean;           // required items are what "covered" means
  buyerItem: string;           // the buyer's phrasing, for the handover document
  ownerPrompt: string;         // the same thing asked of the owner, for Kira's agenda
  substance: SubstanceTest | null;   // null on supporting items — presence is enough
  factor: FactorKey | null;    // null = completes the document, does not move the price
  closes: 'fact' | 'document' | 'change';
}
```

`closes` is the routing key for gate 4:

- **`fact`** — he tells her; done.
- **`document`** — the thing exists but is not written; she drafts it, he approves, it files back
  to Drive. This is what `full` Drive access is *for*.
- **`change`** — the business has to change. **Pathway.**

### 3.2 Assessment — `genome_item_status`

One row per (user, item). Written by the assessor, read by the bands, the panel and the recompute.

| column | |
|---|---|
| `item_key` | stable id from `checklist.ts` |
| `status` | `open` · `weak` · `answered` |
| `why` | why it is weak, in the owner's language — the coaching, instantiated against what he said |
| `evidence` | entry ids that support it — so a green item can be defended, not just asserted |
| `assessed_at`, `model_version` | a verdict is only readable if you know what produced it |

⚠️ **No backfill, same rule as confirmations.** An item marked answered because something in the
area vaguely touched it is the lie the document cannot survive. Unsure ⇒ `open`, and Kira has
something to ask — which is the good outcome, not the failure.

### 3.3 Pathways — `genome_pathways` + `genome_pathway_milestones`

Only for `closes: 'change'` items.

- A pathway belongs to (user, item_key) and has an `intent` (what good looks like, in his words),
  and a `worth` (what closing it is estimated to move — from the item's factor weight × the spread).
- Milestones are ordered, each with `evidence_kind` (what would prove it) and `evidenced_at`.
- **`evidenced_at` is the only thing the recompute reads.** Not `agreed_at`, not the milestone
  existing. See §1.2.

---

## 4. Bands from the checklist

Replaces the entry tally. Same four names, defensible boundaries.

| Band | Rule |
|---|---|
| `empty` | nothing answered |
| `thin` | at least one item `answered` |
| `building` | more than half the **required** items `answered` |
| `covered` | **every required item `answered`** |

A `weak` item counts as **not answered** for the band and **does** appear in the panel with its
reason — that is the whole point of gate 2. Supporting items add depth and can never hold a bucket
below `covered`.

⚠️ **Bands stay bands; the count is never printed.** *"Amber, and here are the two things missing"*
is a conversation. *"58%"* is an argument.

---

## 5. The surface

`/my-genome/[area]` — reached by clicking a funnel. Not a new top-level page, and **not a form**.

```
People — who does the work
A buyer asks: who is genuinely critical, and who could step into your job.

ON RECORD (4)
  ✓ Everyone named, with their role          4 people, from 3 conversations
  ✓ Employed / contractor / casual           …

NEEDS A BETTER ANSWER (1)
  ! Who could step into your job
    You said "my son helps out". That does not tell a buyer whether the business
    runs on a Tuesday if you are in hospital.
    → Who actually does — and what can they decide without ringing you?

NOT YET (2)
  · Who has a restraint
  · Who would leave if the business sold

    [ Work through these with Kira — about 10 minutes ]

Two of these move your number. The rest complete your handover document.
```

The button starts a session scoped to the area. Per `VOICE_MEMORY_STANDARD`, the click passes only
the **trigger** (`focus_area=people`) as a per-session override — Kira **pulls** the open items
through a tool, so she is never fed values that were stale by the time she spoke.

---

## 6. What Kira must not do

**She maps; she does not advise on employment.** A pathway for *"nobody can step into your job"*
runs straight at pay, contracts, restraints, and possibly making his own role redundant. She can
sequence a handover. She must not draft an employment contract, opine on entitlements, or advise on
termination. This is a named boundary in the prompt **and a red-team probe**, because a
plausible-sounding wrong answer here has consequences for a real person and a real employee.

**Framing.** *"Get someone into your role"* reads as *you are replaceable* to a man who built the
business and has not told his family he is selling. The true version is the saleable one:

> *The business has to work without you. That is the thing you are selling.*

Written once, reused. Not improvised per conversation.

---

## 7. What this does NOT settle

- **All-green ≠ sale-ready.** Sector and size dominate; a perfectly systemised café is still
  1.0–2.5×. The defensible claim stays *"the top of your sector's range"*, which the model already
  computes. The panel must not imply otherwise and the component test should enforce it.
- **Demand's rank is still `null`.** A checklist gives Demand a coverage band regardless, but
  whether it carries weight in a *score* is undecided, and `areas.ts` demands a scorer refuse a null
  rank loudly rather than multiply by zero. So Demand items carry `factor: null` for now — coverage
  yes, price no.
- **Confirmed vs merely captured.** `GENOME_BUYER_FORMAT` §2 makes confirmation a third axis. For
  now: the checklist drives the **bucket**, confirmation drives the **buyer's document**.
- **Who ratifies the list.** Derived from each area's `buyerQuestion`, held as data, corrected when
  challenged. The test is that a dispute produces a config change and a re-score, not a rebuild.

---

## 8. Build order

1. `lib/genome/checklist.ts` — items, substance tests, factor map ✅
2. `lib/genome/checklist-bands.ts` — bands from item status ✅
3. `lib/genome/checklist-assess.ts` — entries + items → per-item verdict (LLM, degrade-don't-fake) ✅
4. `lib/valuation/evidenced-readiness.ts` — `readiness_now` from evidenced items ✅
5. `lib/genome/pathway.ts` — pathway shape + the milestone rule ✅
6. migration — `genome_item_status`, `genome_pathways`, `genome_pathway_milestones` ✅
7. `/my-genome/[area]` — the panel ✅
8. Kira's tool + the scoped session — **orchestrator side, briefed separately**

Steps 1–7 are this build. Step 8 is what turns the panel's button into a conversation, and it needs
the other repo.
