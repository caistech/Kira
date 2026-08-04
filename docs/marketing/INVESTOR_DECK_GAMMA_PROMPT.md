# Investor deck — Gamma generation brief

**Written 2026-08-04.** Paste the whole thing below the rule into the text field at
`https://gamma.app/create/generate`. Everything above the rule is provenance, not part of the prompt.

**Sourced from the code and the docs, not from imagination** — `lib/valuation/model.ts` and
`sde-multiples.ts` (the SDE basis and the 9,500-transaction calibration), `lib/valuation/pricing.ts`
(the five bands, $499–$4,999 + GST, and the fractional-exec anchor they are priced against),
`docs/KIRA_EXEC_BROKER_CHANNEL_BRIEF.md` (the ICP, the introducer channel, arrears billing),
`docs/WHAT_KIRA_CAN_DO.md` (what she does and does not do — slides 5 and 7 claim nothing that file
does not support), and the PE feedback in memory `project-business-valuation-kira-gtm-signal`.

**Two deliberate omissions. Do not "fix" them without reading this.**

1. **No worked valuation example.** The obvious wedge slide is "$150k walk-away → $2.5M captured".
   It is left out because `docs/BUILD_REGISTER.md` A1–A4 records that the model exceeds its own cited
   BizBuySell range on size alone, and the size premium widens the ceiling while never touching the
   floor — so the gap, which is the number the deck would be selling on, grows super-linearly. Ray's
   walkthrough found the incentive problem in ninety seconds. An investor doing an hour of diligence
   finds the same thing, in a worse room. Put a figure back only once A1–A4 close, and use the
   defensible claim: documentation is worth roughly half a turn to a turn, mostly as a discount not
   taken and a shorter due diligence.
2. **Traction (slide 11) and the ask (slide 13) are bracketed placeholders.** Signed introducers,
   paying owners, revenue, raise size and milestones are Dennis's to fill. They were not invented.

**Have ready but not on a slide:** slide 10 claims model portability, which is true — the valuation
core is deterministic and the LLM sits behind one env var — but **ElevenLabs is the whole voice stack
and is not a config swap.** Disclose it when asked rather than being caught on it.

---

Create a 14-slide investor pitch deck for a seed-stage Australian B2B AI company called Kira Exec.

TONE AND DESIGN: Sober, confident, operator-to-operator. This is a deck for professional investors, not a consumer product launch. No emoji. Dark or deep-green editorial palette, generous whitespace, large type, one idea per slide. Charts where numbers appear. Avoid stock-photo people and avoid generic "AI brain" imagery.

Use the following content. Keep the slide order and the headline framing.

---

SLIDE 1 — TITLE
Kira Exec
The AI right hand that turns an owner-dependent business into a sellable asset.
Corporate AI Solutions · Brisbane, Australia · Seed round

---

SLIDE 2 — THE PROBLEM
A generation is trying to retire out of businesses nobody can buy.

Around 48% of Australian baby-boomer SME owners intend to exit within one to five years. Roughly a quarter have a documented succession plan.

Their business is discounted or simply unsellable for one reason: it runs on them. The pricing logic, the client history, the supplier workarounds, the reason a job is quoted the way it is — it lives in one head and it walks out the door at settlement.

A buyer will not pay an asset price for a job.

---

SLIDE 3 — WHY NOTHING FIXES IT TODAY
The advice exists. The execution doesn't.

Brokers, accountants and exit coaches all tell the same owner the same thing: document your business. Then they hand him a 40-page workbook.

He is 66, working six days a week, and has not told his staff, his broker or his wife that he is selling. He will never fill in a form.

The gap is not knowledge. It is capture.

---

SLIDE 4 — THE WEDGE
Start with the number, not the pitch.

A free, three-minute indicative valuation. No sign-up. No card. He answers ten plain questions by voice or by tapping and gets three figures:

- Walk-away — what the assets are worth if he closes the doors
- Worth today — what it trades at, priced on how dependent it is on him
- Worth once captured — the same business with the knowledge transferred

The distance between the last two is the product's entire pitch, expressed in his own money, before he has been asked for anything.

---

SLIDE 5 — THE PRODUCT
Kira captures the business while he works.

She is a voice-first executive assistant, not a chatbot. He talks to her between jobs, in the ute, at the end of the day. What she learns becomes the Business Genome — a structured, transferable record of how the business actually runs, across nine operating areas.

She also does the work: drafts quotes and follow-up emails in his voice, sets reminders, chases overdue invoices, answers questions from his accounts.

Everything she produces is drafted, read back, and held. Nothing sends without an explicit yes. That is structural, not a setting.

---

SLIDE 6 — THE DELIVERABLE
The Business Genome is what gets sold with the business.

Nine areas, each scored on where it sits today versus where it needs to be, with the specific value each gap is costing at sale. It is the document his broker asks for, his buyer's lawyer diligences, and his successor runs the business from.

It is also the retention mechanism: it is cumulative, it only exists because he kept talking to her, and it is worthless to a competitor product.

---

SLIDE 7 — WHY HE TRUSTS IT
Trust is the product, not a feature.

- She never sends anything without approval
- She reads his accounts, and never stores a balance, an invoice number or a client name
- She says what she cannot do before she asks a clarifying question, and logs the request rather than pretending
- Refusals are enforced in server code, not in a prompt

This matters because of who he is. He is narrating his life's work into a phone, and he often has not told anyone he is selling.

---

SLIDE 8 — BUSINESS MODEL
Priced as a fraction of what he stands to unlock.

Monthly subscription, banded on the profit he reports, from $499 to $4,999 per month plus GST — positioned against the $3,000–$10,000 a month a fractional GM or chief of staff costs.

First month free. Billed in arrears, so he is never charged for the month he is in, and a cancellation before the bill falls due waives it entirely.

Show this as a simple five-band table.

---

SLIDE 9 — GO TO MARKET
The channel is the people already holding these owners.

Business brokers have a dead pile: owners they appraised and shelved as too owner-dependent to list. They have nothing to give those people today.

Kira is that thing, and it brings the listing back sellable at a higher multiple — which pays the broker more.

Brokers and accountants join as introducers: co-branded valuation reports, a unique link, a pipeline board showing which shelved owner is getting closer to sellable, and a recurring share of collected subscription revenue whether or not the business ever sells.

Hard boundary: an introducer sees status and score, never conversation content.

---

SLIDE 10 — WHY THIS IS DEFENSIBLE
The moat is the harness, not the model.

The valuation engine is deterministic code — SDE multiples calibrated on 9,500+ closed transactions — not a language model guessing. The methodology is the IP and an acquirer owns it outright.

Above the model sits the layer that is genuinely hard: memory governance, identity scoping, refusal enforcement, approval gating, and orchestration across connected systems. It feeds context to whatever model reasons. The model is a swappable input.

Every product in the portfolio runs on one shared substrate of 50+ internal packages, so each new vertical ships in weeks rather than quarters.

---

SLIDE 11 — TRACTION
Present this as an honest status board, not a hockey stick.

- Product live in production, in daily use by a real operating business
- Voice, memory, approval-gated task execution and read-only accounting integration all verified working end to end
- Adversarial red-team suite running unattended on a schedule, with measured pass rates rather than a single green run
- First introducer conversations underway
- [DENNIS: insert current signed introducers, owners onboarded, and any revenue here — leave the row out rather than inflate it]

---

SLIDE 12 — VALIDATION
A private-equity principal reviewed the build and gave three things:

- This is licensable technology, not a services business
- The path is: build it out for one real client, collect letters of intent from future buyers, then raise on that
- Offered as a potential exit vehicle, with a floor in the nine figures, plus strategic partners for US market entry

The same advice arrived independently from a second senior operator the same week: prove it on one client before scaling the channel.

---

SLIDE 13 — THE ASK
[DENNIS: fill in]

Raising $[AMOUNT] to [18/24] months of runway.

Use of funds, roughly:
- Channel — sign and support the first cohort of broker and accountant introducers
- Product — the Genome buyer format, the introducer portal, and the commission ledger
- Evidence — a funded cohort of owners taken from valuation to a documented, transferable business, producing the case studies the channel sells on

Milestone this buys: [N] introducers sending, [N] paying owners, and the first completed sale where the Genome is in the data room.

---

SLIDE 14 — WHY NOW
Three things had to be true at once, and now are.

The largest transfer of small-business ownership in Australian history is underway. Voice models became good enough that a 66-year-old will talk to one without being taught how. And the cost of capturing structured knowledge from unstructured conversation fell by an order of magnitude in eighteen months.

The window is the retirement cohort itself. It does not reopen.

Closing line: A business that runs without him is worth more than one that doesn't. We make that transition something he can talk his way through.
