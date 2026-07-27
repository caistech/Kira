# Naive-tester — Kira production, 2026-07-27

**Target:** https://kira-rho.vercel.app · commit `2a29d2e` · deployment `dpl_EpaNF5SB…`
**Personas:** Anneke (Australian SME business advisor, ~50 min) · Mobile Marcus (trades owner, 375px, ~30 min)
**Verdict: FAIL — the URL share gate stays closed.**

Anneke's summary is the fairest one-liner: *"Not quite — but I'm one fix away, not five."*
Both testers rated the core artefact — the valuation result screen — as genuinely strong. What
stopped them was a handful of screens that say things which are not true.

---

## The three that block a referral

**1. The Settings page lies to a brand-new account.** Sixty seconds after signup, with no card ever
taken, one screen said *"Your card is on file and the first payment comes out at the end of it"*,
*"$0.00 of $20 used"*, *"Your free month has ended"* **and** *"You've reached the fair-use
ceiling"* — four claims, three false, two contradicting each other on the same card.

Anneke's own words on why this outranks everything else: *"I can defend a number I have to caveat.
I cannot defend a screen that tells my client they're being charged when they aren't."* For a
channel built on an advisor putting their name to an introduction, this is the finding that matters.

**2. The SDE definition contradicts itself on the same screen.** Q3's label says profit *"after all
costs, **plus** the salary you pay yourself"*; the helper text below says *"kept $200k **after**
costs and your own pay"*. Those are different numbers, and for an owner-operated SME the difference
is most of SDE. This is the single input the entire valuation runs on — a wrong reading doesn't
produce a slightly-off number, it produces a wrong one, confidently.

**3. The valuation is discarded at conversion.** Anneke ran the flow, got a $332,006 gap, signed up
— and the dashboard knew nothing about it. Two consequences: the owner loses the thing that made
them sign up, and **the introducer board's new "valuation movement" column has nothing to move**,
which silently defeats the feature merged this morning.

*Working hypothesis, needs confirming:* the valuation→account link is written in the **paid**
onboarding path from Stripe session metadata. A free/direct signup never passes through it, so the
valuation is orphaned. If that's right it's a small fix and a large effect.

---

## Mobile — the widgets are fighting the product

Marcus's headline is a collision, not a styling nit: **"Ask Kira" sits on top of `Next` and "Report
a problem" sits on top of `Back`, on every one of the 11 question screens.** He mis-tapped twice.
The same two widgets also cover the hero headline, the question help text, the third result number,
and the "Sign up" link on `/login`.

Both of those widgets are portfolio-mandated (voice agent, SayFix). On a phone they are obstructing
the primary flow they exist to support.

Alongside that: **10px chart labels**, 11 elements at 12px, 27 at 14px including "Sign in"; the
landing page's own $150k/$600k/$2.5M graphic is the least readable thing on it; the hamburger
measures 30×44 jammed beside an orange CTA.

⚠️ **The two testers disagree here.** Anneke marked touch targets and text size ✅ at 375px; Marcus
marked both ❌ with measurements. Marcus measured; Anneke eyeballed. The recorded verdict follows
the measurements.

---

## Credibility findings an accountant will raise

- **US data on an Australian product.** Multiples come from BizBuySell's 2025 US deals, on an
  AUD-default product with an AU ABN sold through AU brokers. We currently cite this dataset as a
  *strength* in the advisor-facing governance answers. An accountant will ask, and *"US deals"* is
  not a defensible answer to *"is this my client's market?"*
- **Missing appraisal basics** — no debt or finance, no lease, no working capital, no years trading.
  Enterprise value is presented as though it were what lands in the owner's pocket.
- **Industry autocomplete accepts anything.** *"Underwater basket weaving"* — no match, no warning,
  Next stayed enabled, an unknown multiple applied silently.
- **11 questions, sold as "a few questions / 3 minutes."** Say the real number on the Start button.
- **Progress isn't durable** — answers live in the tab; a reload returns to the intro with no
  resume. Costly for a phone user answering between jobs.

---

## What passed, and is worth protecting

- **Dual-portal separation PASSES** — signup lands `/dashboard` "My Kiras", not admin; a user hitting
  `/admin` gets `/admin/login?error=not_admin` with clear copy. This is readiness check #43, the
  facade test, and it passes cleanly.
- **Full auth pattern** on both portals: forgot-password, eye toggle, magic link.
- **Chrome, Settings, Sign Out, explanatory headers, tab title, favicon** — all pass.
- **The results screen** — three readable numbers, plain-English reasoning, the used-car analogy,
  four dollar-valued gap items, transferability scored 36/100, sourced disclaimer.
- **`/advisors` is strong** — 10% monthly on collected funds, first-touch attribution, the
  progress-never-conversations boundary, live ABR firm lookup. Gaps: it's a waitlist with no demo
  dashboard, no quotable price for the advisor's own client, and nothing yet on the
  compliance/disclosure position a licensed broker needs (that material now exists in
  `docs/ADVISOR_AI_GOVERNANCE_ANSWERS.md` — it just isn't on the page).

---

## Run conditions — read before trusting every line

- **The QA user credential failed on production.** `dennis@factory2key.com.au` was rejected by both
  testers; the admin account worked first time. Both accounts exist, are confirmed and are bridged —
  so the password in the canonical `qa-secrets.json` does not match what production has. Marcus lost
  the whole authenticated half to this; Anneke worked around it with a fresh mailinator signup.
- **Both testers shared one `/browse` daemon**, because they were launched in parallel. Each
  reported the other hijacking tabs and viewport. Both flagged affected observations as
  caveated rather than confirmed. Run these sequentially next time.

---

## Recommended order

1. Settings billing copy — say only what is true for that account's actual state.
2. SDE wording — one definition, stated once, in the label and the helper.
3. Persist the valuation across signup on every path, not just paid checkout.
4. Move the two floating widgets off the primary controls on mobile.
5. Type scale — nothing below 16px in body copy; fix the chart labels.
6. Decide the AU-data position before an accountant asks.

1–3 are what Anneke said would change her answer. She offered to run it on three clients next week
if they're done.
