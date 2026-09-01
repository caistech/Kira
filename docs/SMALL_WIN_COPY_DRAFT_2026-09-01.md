# Small-Win Copy Draft — 2026-09-01 (v1, uncommitted)

Purpose: give Kira a two-wins narrative on the marketing face and in the product.
The small win comes FIRST (near-term, private, provable); the long win second (the exit).

Owner definition (unchanged): the person in their sixties, decades in, whose business runs
on them. Everything that matters is in their head, not on paper.

Sequencing principle (from the canonical Small-Win audit doc, §4–7):
- The long win is the value unlock — documented enough to sell as an asset, not a job.
- The small win is the on-ramp — Kira proves herself by making it safe for the owner to be
  away for a month or two, so the long win feels real instead of abstract.
- The small win is therefore measured by the 30-Day (or 60-Day) Absence question:
  **"Can you actually leave your own business?"** When the answer becomes "yes", the premise
  of the whole product is proven in the near term, in private, before anyone is told he plans
  to leave.

The small win's honest mechanism (owner's framing, 2026-09-01):
> being able to take time off (a month or two) — because Kira lets him monitor things while
> he's away, and/or because his replacement operates via Kira as though the owner were still
> available to ask.

NOTE: this repo's confirmed model is ONE Kira per organisation, with people as tenants in that
org (P0.5). So the replacement does not get a separate Kira — they get access to the SAME
organisational Kira, scoped to their position. The copy below reflects that.

---

## PART A — LANDING / MARKETING COPY

### A1. A new section on the landing page (this is the heart of the ask)

Proposed placement: immediately after the three-step "Built to sell" section
(LandingClassic.tsx:368–396), or folded into it as a fourth beat. The section reframes
"Step 3: sell an asset" by first proving the near-term version.

Section headline:

> **Start with the smaller win: take two months off.**
> The big win is selling it as an asset. The small win is leaving your business and seeing it
> still run — a month, two months, while you're away.

Body (owned voice, plain, no hype):

> Most owners can't leave their own business. Not for a fortnight — the phone follows them,
> the yard doesn't run, the one big customer calls. Even the thought of a proper break
> probably feels like it isn't on the table.
>
> The long win — the one you'll have heard people talk about — is turning what's in your head
> into an Operating Manual the business can be sold with. That's the asset value, and it's
> why most owners start.
>
> But Kira's first job is the win you can feel this month: **she makes it safe to be away.**
> She keeps an eye on the things that would normally pull you back, and plays your part while
> you're gone. Your replacement — a manager, a family member, a stand-in — works through Kira,
> so when a question comes up that only you could answer, they ask Kira and get the answer
> you'd have given. It's as though you were still there to ask, but you're not.

Two sub-cards (short, imperative):

> **While you're away — she watches.** Kira monitors the business and surfaces what actually
> needs you, so you're not carrying it mentally on a beach.
>
> **While you're away — she answers for you.** The person running things in your absence asks
> Kira "what would the owner do here?" and gets your way of doing it, not a guess.

Closing line before the CTA:

> So before anyone's told you're thinking of leaving — before it's even a decision — you get
> to test the whole premise privately. Can you be away for two months? When Kira makes the
> answer yes, you'll know the asset is real.

CTA (reuse existing): *"What's my business worth?"* — a 3-minute valuation shows the number
today and the gap you're leaving on the table.

### A2. Hero / value-block revision (optional, smaller change)

The hero currently sells the long win immediately ("Now sell it for what it's actually
worth", "Built to sell"). Add one line under the hero that names the small win first, so the
near-term proof is the opening note rather than buried:

> Kira's first promise: you take two months off and the business doesn't skip a beat.
> Her second promise: when it comes time, you sell it as an asset, not a job.

### A3. Pricing-page note (app/plan) [already partly done]

The /plan page now always shows the paid path, the beta path, the "no beta code yet"
contact line and the "already have an account — sign in" link. No copy change needed there
for the small win unless you want a supporting line near the "part-time GM" block.

---

## PART B — IN-PRODUCT, FIRST-INTERACTION OUTCOME

The small win must be a DELIVERABLE, not just a promise. Kira drives toward a concrete,
near-term, private outcome in the first weeks:

### B1. The onboarding commitment (what Kira tells the owner early)

During the first setup conversation, Kira states the near-term goal explicitly:

> "Let's aim at something you can feel quickly: by the time a month or two has passed, you'll
> be able to hand the business to [replacement's name] for a while — and they'll be able to
> run it through me, asking the questions that would normally need you. That's the first win.
> The second win, when you're ready, is selling it for what it's worth. We build the first
> one first."

### B2. The first-interaction deliverable: a "run-without-you" milestone

Kira structures the early weeks around producing evidence the owner CAN be away:

1. **Day 1–7 — the "what actually needs you" list.** Kira interviews the owner for the handful
   of things that only he can do, decide on, or answer — the moments that make him
   unreplaceable. This becomes a concrete, finite list (not an infinite to-do).
2. **Week 2–4 — the handover-first document.** For each item on the list, Kira captures the
   owner's decision rules: "when X happens, do Y; if Z, call me only if…". This is the seed
   of the Operating Manual, but aimed at the near-term audience: his replacement, not a buyer.
3. **Week 4–6 — the "give it a commander's test".** Kira proposes a short real absence with
   the replacement working through her — starting small (a day, then a week), increasing
   length as the owner's confidence builds, up to a month or two.
4. **After each absence — the debrief.** Kira reports what surfaced, what the replacement
   asked, and what still needed the owner. Each absence lengthens.

The measured outcome is exactly the small win: **the owner can point to a real period when the
business ran without him** — because Kira monitored it, and because whoever stood in could ask
her and get his answers.

### B3. The product surfaces this "you-can-be-away" state

- The owner's dashboard shows a **"You were away"** record: e.g. *"You were away for 2 weeks
  in September. Kira handled 14 questions from {replacement}; 3 needed you, all caught before
  they cost anything."*
- The Genome/Operating Manual view lets the owner mark an item as *"answered by your
  replacement via Kira"* so the handover proof compounds.

---

## PART C — WHAT IS DELIBERATELY NOT CLAIMED

Honesty rules that must hold (they are the difference between a promise and a trap):

- Kira does not claim the business runs without the owner, full stop. She claims it runs
  without him **for a defined absence**, with a named, functioning stand-in, and she is honest
  about what still needed him.
- The small win is private. The owner can test being away without announcing an exit — the
  copy must never imply that setting up a replacement is the same as telling staff he's selling.
- "Two months" is an aspiration, not a guarantee; the copy should say the test starts small
  (a day, a week) and lengthens as it proves out — never promise a deadline in month one.

---

## OPEN QUESTIONS (for the owner, before this is wired in)

1. Landing: slot as a new full section (A1), or a smaller hero amendment (A2), or both?
2. In-product: is the dashboard "You were away" record + a named replacement in scope for this
   pass, or is B2 (the interview framing + Commander's test) the only in-product change for now?
3. The existing "How it works" section (LandingClassic.tsx:399–445) still says "We create a
   unique Kira just for you" — which now conflicts with the confirmed per-organisation model
   (one Kira, people as tenants). Flag for a copy fix in the same pass?
