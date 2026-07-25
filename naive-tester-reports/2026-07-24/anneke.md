Hi Dennis,

**Persona:** Anneke — 50s, 25 years running my own trades/services business, now weighing up retiring and selling it. Sharp on business, cautious with tech, allergic to jargon.
**URL:** https://kira-rho.vercel.app (desktop, 1440×900)
**Goal:** Understand what this is, take the valuation, see the gap, weigh up the plan, and try to sign in / create an account.
**Duration:** ~50 minutes (the test browser was flaky and cost me a lot of restarts — that's a harness issue, not yours).

I went in as the exact person you're aiming this at, so I'll be candid. There's a lot here that's genuinely good, and a few things at the money end that would stop me dead.

---

## The landing page

This landed well with me. "Your business is your biggest asset — do you actually know what it's worth?" is the right hook for someone in my chair. The three-number teaser (Walk away $150k → Today $600k → Captured $2.5M, "$1.9M gap is the knowledge in your head") made the point in one glance. The "built to sell, for what it's really worth" and "sell an asset, not a job" language is spot on — that's the fear that keeps me up at night, put plainly.

Two small snags a careful reader notices:
- The headline teaser uses **dollars** ($150k / $600k / $2.5M), but the moment I start the actual valuation it flips to **pounds (£)** by default (more on that below). For an Australian owner that's an immediate "hang on, is this even for me?"
- Right at the bottom the free offer says **"$12/month"** and "Create your Kira. Free. 30 days free. No credit card." Keep that number in mind — it does not survive contact with the business plan.

**Opportunity:** Detect my country (or just default the currency to where the visitor is) and carry ONE currency consistently from the teaser through to checkout. Mixing $ and £ on the same journey reads as sloppy, and for a trust-heavy purchase like this, sloppy is expensive.

## The valuation (the 3-minute questionnaire)

This is the best part of the whole product, and I'd happily recommend it on its own. Eleven questions, plain language, and every one had a little explainer that spoke my language — "SDE (profit plus your own pay)", "if you took a 3-month holiday tomorrow, what happens?", "your processes and know-how — where does it actually live?". That holiday question is the whole ballgame and you've put it front and centre. Good.

The result page genuinely impressed me:
- Three numbers: Walk away £150,000 · Worth today £513,599 (~2.6× SDE, "a buyer buying a job") · With knowledge captured £802,375 (~4.0× SDE, "runs & sells without you").
- The gap called out in big type: **£288,776 "locked inside your head right now"**, with a Transferability score of 44/100.
- A "Why the number is what it is" section that used a buying-a-used-car analogy (service history = full price; what you can't prove, the buyer discounts). That's exactly how I'd explain it to my brother-in-law. It made me believe the number.
- A per-driver breakdown (Owner dependence +£115,856, Documented systems +£115,280, Recurring revenue +£57,640) and a proper methodology footnote citing BizBuySell's 2025 data (~9,500 closed deals, ~2.5× SDE average). Citing a real source moved me from "AI toy" to "someone's thought about this."

The one persistent irritant: it's all in **£**. There's an AUD option in the currency dropdown, but it kept resetting to GBP every time I moved forward, and my selection never carried through to the result or the plan. As an Aussie, being quoted my life's work in British pounds is jarring and slightly undermines all that lovely credibility-building.

**Opportunity:** Lock the currency the moment I pick it (or geo-default it) and carry it end-to-end. And consider letting me email/save the result before you ask for anything — I'd have forwarded that gap number to my accountant on the spot, which is free word-of-mouth for you.

## The plan (where you ask for the money)

Here's where I got cold feet, and I want to be honest because this is the bit that decides whether you get paid.

1. **The price is a shock, and it contradicts the landing page.** The landing sells "$12/month" and "30 days free, no credit card." The business plan is **£249/month**. I understand these are probably two different products (personal Kira vs the business one), but I arrived here straight off the business hook, and going from an advertised $12 to £249 with no bridge feels like a bait. You even frame it as "about 1.0% a year of what you stand to unlock," which is a fair argument — but make the argument BEFORE the sticker, not after.

2. **"Start my 4-week plan" isn't a 4-week plan.** I clicked it expecting a fixed four-week program. It goes straight to a **recurring monthly £249 subscription, "billed monthly until you cancel," £249 due today** — no free trial visible at checkout, despite all the "4 weeks and beyond / 30 days free" language upstream. Calling a rolling monthly subscription a "4-week plan" is the kind of thing that gets a business owner offside fast. Say plainly: "£249/month, cancel anytime, first charge today."

3. **The company name at checkout isn't yours.** The Stripe page is headed **"Global Buildtech Australia."** That name appears NOWHERE else — not on the site, not in the emails, nowhere. I'm about to hand over a card and the merchant is a company I've never heard of. For me that's a hard stop; I'd close the tab and assume I'd been redirected to a scam. (I stopped at this screen and did not enter any card details.)

4. **The "how it works" got too clever for me.** "She hands it to the orchestrator," "a swarm of agents does the work," "Mnemo remembers it instantly," "the Memory Governance Layer keeps it yours." I'm a plumber, not a programmer. I don't care about orchestrators or Mnemo — I care that my knowledge gets out of my head, stays private, and makes the business sellable. You say that too ("just talk, Kira does the building"), and that line alone is enough. The tech-stack tour makes it feel like I'm buying software instead of an outcome.

**Opportunity:** Reconcile the pricing story (one product, one price, or a clear "personal $12 / business £249" split shown up front); rename "4-week plan" to what it actually is; get the Stripe/merchant name to read "Kira" or "Corporate AI Solutions"; and cut the agent/Mnemo/governance jargon down to one plain sentence about privacy.

## Signing in / creating an account (the bit you asked me to lean on)

Good news here — this is solid.

- **/login** has everything I'd want: a **Forgot password?** link, a **show/hide (eye) toggle** on the password, AND an **"Email me a magic link instead"** option. I tested the password toggle — it flips the field from dots to plain text correctly.
- **Forgot password** works: I entered an email and got "If that email has an account, a reset link is on its way." That's the right, discreet wording — it doesn't tell a stranger whether I'm a customer.
- **Magic link** fired ("Working…"), but then dumped me back on the marketing homepage rather than a clear "check your inbox" screen. I was left unsure whether it actually sent. Minor, but a confused user resends three times.
- **Signup** worked properly. I created a throwaway account; it asked me to **confirm my email** first (a nicely branded "Welcome to Kira" email arrived within a minute — good, real email delivery is working). After I clicked the confirmation link I landed on a **real user dashboard (/dashboard) — "My Kiras"**, NOT some admin gate. That's the right outcome. The dashboard has a proper left nav (My Kiras / New Kira / Settings / Sign out) with my email shown.
  - One nitpick: the signup page subheading calls Kira **"Your AI executive assistant that remembers you"** — "executive assistant" is a different, cooler personality than the warm "friendly guide / thinking partner / business-succession coach" everywhere else. Pick one voice. (I typed a throwaway "@example.com" address first and got a blunt "Error sending confirmation email" — a real address worked fine, so undeliverable domains are being rejected, but the error doesn't tell the user that.)

- **Settings** (from the dashboard) is genuinely complete: Profile (name/email + Save), Password (with the eye toggle + Update), Notifications (email-updates toggle + Save), and an Account section with **Delete account — "This cannot be undone."** Per-section saves, clear consequence on delete. No complaints.

- **Admin gate** is correct. Logged in as an ordinary user, I tried to open **/admin** and got bounced to /admin/login with a clear message: *"That account isn't an operator account. If you came here to use Kira, sign in as a user instead."* Exactly what should happen — a normal person cannot get into the operator area.

**Opportunity:** After a magic-link send, show a plain "Check your email — we sent a sign-in link to X" screen instead of bouncing to the homepage. And align the signup subheading to the "guide/coach" voice you use everywhere else.

## Voice ("Ask Kira")

There's an "Ask Kira" button sitting on the valuation and result screens, so a voice helper is reachable while I'm answering questions — good, because that's exactly where I'd want to ask "what counts as profit?" I didn't test the live conversation (no mic in this run), but the affordance is where it should be.

---

## Standards Check

- **§2 Auth-page pattern** — ✅ Login has forgot-password, password eye-toggle, AND magic link; forgot-password flow works with a privacy-safe message.
- **§4 Authed chrome + Settings** — ✅ /dashboard and /settings both carry a persistent left navbar + Settings + Sign out; Settings has Profile/Password/Notifications/Account. (Note: the /plan and valuation conversion pages drop that chrome even when logged in — acceptable as pre-purchase pages, but worth a glance.)
- **§5 Explanatory header** — ✅ Every screen opens with what-it-is / what-to-do (valuation intro, dashboard "My Kiras", settings "Manage your account", plan page all have one).
- **§6 Voice agent** — ✅ "Ask Kira" reachable on the valuation surfaces (≤1 click).
- **§7 Scaffold metadata** — ✅ Tab title reads "Kira — Your Friendly Guide Through Anything" / "Create account · Kira" etc. Not a default.
- **§8.5 Dual-portal** — ✅ User signup reaches a real /dashboard distinct from /admin; a non-admin is correctly blocked from /admin with a clear message. No facade.
- **§9 Codicils (consequence clarity + no dead ends)** — ⚠️ Partial. Delete-account states "cannot be undone"; the plan states "£249/month, cancel anytime" before the click. BUT the pricing story is contradictory ($12/mo advertised vs £249/mo charged), "Start my 4-week plan" bills a recurring monthly sub with £249 due today and no visible free trial, and the Stripe merchant reads "Global Buildtech Australia" (a name found nowhere in the product) — all of which undermine informed consent at the point of payment.

**Scope note:** Desktop only (1440×900), anonymous + one throwaway confirmed user account; I completed the full 11-question valuation, reached the live Stripe checkout, confirmed the £249/month price, and STOPPED — no card details entered, no payment made. A separate mobile pass covered the mobile landing/valuation.

The engine and the auth are in great shape. It's the seam between the free "$12 guide" marketing and the £249 business subscription — plus a stranger's company name at checkout — that would lose me at the till. Fix the money story and the currency, and I'd actually buy this.

Anneke
