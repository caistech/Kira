# Mobile Marcus — Naive Tester Walkthrough

Hi Dennis,

**Persona:** Mobile Marcus — small-business owner, checking this out one-handed on my phone between jobs. Fat thumbs, I pinch-zoom anything small, and I call out anything that scrolls sideways or where buttons crowd each other.
**URL:** https://kira-rho.vercel.app
**Goal:** Land on the site, take the "What's my business worth?" valuation end-to-end, and see the result — is it usable one-handed on a phone?
**Device:** 375×812 (iPhone-class), simulated intermittent one-handed use.
**Duration:** ~30 minutes.

---

## Screen 1 — Landing page

First impression on the phone: clean, warm, and it actually loads fast. The hero — "Your business is your biggest asset. Do you actually know what it's worth?" — lands hard. As a bloke who's spent years building a business that only runs because I'm there, that hit home. The little "$150k → $600k → $2.5M" stepped graphic sells the idea in one glance. Good.

- **(a) Horizontal scroll:** None. Page width matched my screen exactly (375=375). Nothing hangs off the edge.
- **(b) Tap targets:** The big orange "Value my business" button up top is fat and thumb-friendly. Fine.
- **(c) Text size:** All readable. No pinch-zooming needed.
- **(d) Nav:** Here's my first gripe. On the phone the top bar shrinks to just the Kira logo, a cramped two-line "Sign in", and the "Value my business" button. The other menu items I could see referenced — How it works, Pricing, About, Admin — **just vanish. There's no hamburger menu.** They're buried down in the footer instead. If I wanted to check pricing before diving in, I'd have no obvious way from the top of the page — I'd have to scroll all the way down. That "Sign in" text also wraps awkwardly onto two lines in the tight space.
- **(e) Forms/inputs:** N/A here.

**Opportunity:** Add a proper hamburger/drawer so the nav links (Pricing especially — people want the price before they commit) are reachable from the top on mobile, not only from the footer.

---

## Screen 2 — Valuation intro ("What is your business actually worth?")

Tapped "Value my business" and landed on a good intro screen. Clear header, a plain-English promise ("three honest numbers, plus the gap that's hiding inside your own head. Takes about 3 minutes. Nothing to sign up for."), and a "Here's what you'll find out" card. This is exactly the reassurance a nervous first-timer needs. The "Start" button is big and pink — easy to hit.

- **(a) Horizontal scroll:** None.
- **(b) Tap targets:** "Start" button is 127×60 — great. The currency dropdown top-right is a decent size too.
- **(c) Text size:** Fine.
- **(d) Nav:** Same shrunk top bar as the landing.
- **(e) Currency selector:** Defaulted to **AUD** under the hood (good, I'm Australian) — though the little select box visually rendered "GBP" at one point, which made me second-guess it. Worth a look; the displayed symbol and the actual selection didn't feel in sync (more on this at the turnover screen).

**The real problem here:** the floating purple **"Ask Kira" chat pill sits right on top of the text.** In item 3 of the "what you'll find out" list, the words "…business that runs, and sells, without you" are literally covered by the Ask Kira button. There's also a black chat bubble near the top-right that overlaps the intro paragraph. On a phone these floating widgets don't get out of the way of the content — they park themselves over the words I'm trying to read.

**Opportunity:** Give the floating "Ask Kira" / "Report a problem" widgets some bottom padding or a collision rule so they never overlap body text. This recurs on almost every screen (see below) and is the single most consistent mobile annoyance.

---

## Screen 3 — Question 1 of 11: Industry

Good: it tells me "Question 1 of 11" so I know how long this'll take, and there's a progress bar. The field is full-width and 16px — comfortable to type in one-handed.

But this is a genuine functional issue: the field says **"Start typing and pick the closest match"** and has a dropdown caret (▼) — so I expect a list of industries to appear as I type. **It never does.** I typed "plumbing", "construction", "plu" — nothing dropped down, no suggestions, ever. It just quietly accepts whatever free text I type. Worse, because there's no picker constraining me, I managed to end up with junk like "constructionConstruction" in the box and it happily let me proceed. For a "pick the closest match" control that's confusing — either it's a picker (show me options) or it's a free text box (drop the caret and the "pick a match" wording).

- **(a) Horizontal scroll:** None.
- **(b) Tap targets:** Field is 285×60 — fine.
- **(c) Text size:** 16px, readable.
- **(d) Nav:** Same shrunk bar. Also, the sticky "Kira" header overlaps the faded hero title as you scroll — a little messy but not blocking.
- **(e) Inputs:** Full-width, usable one-handed. Just the missing dropdown lets me down.

**Opportunity:** Make the industry field actually surface matches as I type (or remove the caret + "pick the closest match" promise if it's intentionally free text). Right now it over-promises and under-delivers.

---

## Screen 4 — Question 2 of 11: Annual turnover

Number field with a currency prefix. Good contextual copy ("everything the business invoices… before any costs come out"). Number keyboard would pop on a real phone — nice.

**Bug:** the prefix on this field showed **"£" (pounds)** — even though I'd selected AUD and the next screen (profit) correctly shows "$". So the turnover field's currency symbol is out of sync with the selected currency. A small-business owner who selected AUD and then sees a £ sign will wonder whether the whole thing is even set to the right country.

Two smaller things: the placeholder text is **cut off** — it reads "e.g. 2000000 (total sales" with no closing bracket, clipped by the field width. And the tiny up/down number-spinner arrows are well under 44px — but since I'd just type the number, that's a non-issue in practice.

- **(a) Horizontal scroll:** None. **(b) Field 285×64, good; spinner arrows tiny.** **(c) 18px, readable.** **(d)** shrunk nav. **(e)** full-width, one-handed OK.

**Opportunity:** Fix the £/$ mismatch so the turnover prefix follows the selected currency, and stop truncating the placeholder.

---

## Screen 5 — Question 3 of 11: Annual profit

This screen is well done. The "$" prefix is correct here, and the hint is genuinely helpful — it even echoes my own numbers back: "If the business turned over $800,000 but you kept $200k after costs and your own pay, enter $200,000." That's the kind of hand-holding that stops an owner fat-fingering turnover into the profit box. Placeholder is again slightly clipped ("e.g. 200000 (profit, not s…"), same truncation pattern as turnover.

- **(a)** No hscroll. **(b)** field 64px tall, good. **(c)** 18px. **(d)** shrunk nav. **(e)** full-width. The "Ask Kira" pill again overlaps the footer text at the bottom.

---

## Screens 6–12 — Questions 4 to 11 (the choice questions + assets)

This is the best part of the flow on mobile. Each choice question (profit trend, margins, client base, revenue spread, the 3-month-holiday question, systems/know-how, locked-in revenue) uses **large full-width option cards (~285×60)** with the answer and a plain-English sub-line. Tapping one **auto-advances** to the next question — no hunting for a "Next" button. One-handed this feels great; I could thumb through the whole thing quickly.

The questions themselves are sharp and a bit confronting in a good way — "If you took a 3-month holiday tomorrow, what happens?" is exactly what a buyer thinks. Q11 (gear/vehicles/stock value) correctly shows the "$" prefix.

- **(a)** No horizontal scroll on any question. **(b)** Option cards and buttons all comfortably ≥44px. **(c)** Text readable throughout. **(d)** Nav unchanged. **(e)** The one input screen (assets) is full-width and fine.
- Recurring: the "Ask Kira" pill keeps parking over the bottom option / Back button area. It never fully blocked me from tapping, but it crowds the bottom of nearly every question card.

**Opportunity:** The auto-advance choice cards are a genuinely good mobile pattern — keep them. Just lift the floating widget off the bottom controls.

---

## Screen 13 — The Result ("Your indicative valuation")

Worth the three minutes. On the phone this reads top to bottom cleanly:

- **Three number cards, stacked:** Walk away **$150,000** ("sell the gear, close the doors"), Worth today **~$571k (~2.9× SDE)** ("a buyer buying a job"), With your knowledge captured **~$802k (~4.0× SDE)** ("runs & sells without you"). Each has a one-line explanation — I understood all three at a glance.
- **The gap:** a bold purple gradient card — "The value locked inside your head right now **$262,896**" — with a **Transferability score: 54/100**. This is the emotional punch and it lands.
- **"Why the number is what it is":** a plain-English narrative (the used-car / service-history analogy is a nice touch).
- **"Where that value is hiding":** three reason cards, each with a dollar uplift — Owner dependence +$115,856, Documented systems +$57,640, Recurring revenue +$57,640.
- CTAs to build the "Business Genome", plus Save/print and Start over, and an honest disclaimer citing BizBuySell 2025 data.

- **(a) Horizontal scroll:** None (375=375) — even with all the cards and the wide gradient panel.
- **(b) Tap targets:** CTAs are large.
- **(c) Text size:** Readable throughout.
- **(d/e):** N/A / fine.
- **The same collision:** the "Ask Kira" pill overlaps the gradient gap card — it covers part of "…Business Genome and they become transferable". On the single most important, most persuasive card on the whole site, a floating button is sitting on the copy. Fix that one first.
- **Minor:** the result heading "This is what your business could be worth" gets partly clipped by the sticky Kira header as it scrolls. And re-running with the same inputs gave me slightly different "worth today" numbers across attempts — probably my answers varied, but if the multiple has any randomness, an owner who refreshes and sees a different number will lose trust. Worth confirming it's deterministic.

---

## Screen 14 — /plan page (empty state, no valuation)

Went straight to /plan without a valuation. Good defensive design: it gates with "Let's find your number first — This page is built around the value gap in your business. Take the 3-minute valuation and it'll bring you right back here" and a "Find my gap" button. No dead end, no broken page. Renders clean on mobile, no horizontal scroll, good tap target.

---

## Screen 15 — /plan page (with valuation) + Stripe

Completing the valuation carries the result into /plan via a URL-encoded state param (`/plan?v=…`), so the plan page opens showing my actual gap ("There's $262,896 locked in your head. Kira helps you set it free."). Nicely done — the number follows me.

The plan page itself is long but reads well on the phone: benefit cards, a 5-step "what happens when you talk to Kira", a "You could unlock $262,896" card, and a **Growth Plan at $249/month** with a feature checklist and "Start my 4-week plan" CTA. Note: the "Report a problem" widget overlaps the "Just talk. Kira does the…" heading here — same widget-collision pattern.

**Stripe check (guardrail respected):** I tapped "Start my 4-week plan" once. It routed to a **live Stripe checkout** (`checkout.stripe.com`, `cs_live_…`) for "Kira Business Plan — Growth, **A$249.00/month**", with Apple Pay, email, Card and Klarna options. The Stripe page is fully mobile-responsive. **I STOPPED here — no card details entered, no payment made.**

- One trust note for a naive buyer: the Stripe merchant name shown is **"Global Buildtech Australia"** ("By subscribing, you authorise Global Buildtech Australia to charge you…"), not "Kira" or "Corporate AI Solutions". The line item does say "Kira Business Plan", but the top-of-page merchant name could make a cautious buyer pause and wonder who's charging their card.

**Opportunity:** If possible, set the Stripe statement/merchant display name to something the buyer recognises from the site (Kira / Corporate AI Solutions), or add a one-line "billed by Global Buildtech Australia" note on the plan page before the click so there's no surprise at checkout.

---

## Standards Check (mobile-observable)

- **§1 Responsive — works at 375px, no horizontal scroll:** ✅ Every screen measured 375=375 — landing, valuation intro, all 11 questions, result, and both /plan states. No sideways scroll anywhere.
- **§1 Touch targets ≥44px:** ✅ (with a nit) Buttons ~60px, option cards ~60px, inputs 60–64px — all thumb-friendly. Only the number-input spinner arrows are sub-44px, but typing makes them irrelevant.
- **§1 Body text ≥16px:** ✅ Inputs measured 16–18px; body copy readable without zoom.
- **§1 Primary CTA reachable with a thumb:** ✅ "Value my business", "Start", auto-advancing choice cards, and "Start my 4-week plan" all sit within thumb reach.
- **§1 No tap-target/content collisions:** ❌ The floating "Ask Kira" (and "Report a problem") widgets overlap body text on multiple screens — valuation intro item 3, Q3/Q4 bottom controls, the result gap card, and a plan-page heading. Most consistent mobile defect. (Rubric-adjacent; flagging as a finding per persona contract.)
- **§5 Explanatory header on each screen:** ✅ Valuation intro, every question (title + sub-line), the result, and /plan all carry a clear plain-English header.
- **§7 Browser tab title is the product name:** ✅ "Kira — Your Friendly Guide Through Anything" contains the product name on every page. (Nit: it's the same generic title on /business-valuation and /plan — not page-specific, but the product name is present, so it passes.)

**Other findings (not in the rubric but real):**
- ❌ Industry autocomplete (Q1) never shows suggestions despite the caret + "pick the closest match" copy; accepts garbled free text.
- ❌ Currency symbol mismatch: turnover (Q2) shows "£" while AUD is selected and profit (Q3) shows "$".
- ⚠️ Placeholder text clipped on turnover and profit fields.
- ⚠️ No mobile hamburger — top-nav links only reachable via footer.
- ⚠️ Stripe merchant name "Global Buildtech Australia" may not be recognised by a "Kira" buyer.

---

## Scope note

I walked the live site only (no code, no docs) at 375×812: landing → the full 11-question valuation (industry, turnover, profit, all choice questions, currency) → the result screen → both states of /plan → the Stripe checkout hand-off. I did **not** enter any payment details and no money moved. I did not test signed-in / account flows, the personal-Kira path, admin, or desktop. The SPA keeps its progress in client-side state that resets on a full page reload, so I re-ran the questionnaire a couple of times to capture screens — the "worth today" figure differed slightly between runs, which is worth confirming is deterministic.

Marcus
