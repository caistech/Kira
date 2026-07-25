# Platform Feedback — Kira Walkthrough

Hi Dennis,

**Persona:** Anneke Vermeulen — 25 years around owner-operated Australian businesses; ex-business broker, now working alongside accountants on exit readiness.
**URL:** https://kira-rho.vercel.app
**Goal:** (1) As an owner — would I sign up, and do I understand exactly what I'll be charged and when? (2) As an advisor — would I put my name to this in front of my own clients?
**Duration:** ~50 min. Screenshots in `naive-tester-reports/2026-07-26-prod/anneke/`.

**Short answer up front, because you'd want it that way:** the thinking behind this is the best I've seen anyone put into the owner-exit problem. The valuation questionnaire is better than tools I've paid for. And I would not sign up today, and I would not send a client to it today — for three reasons that are all fixable in an afternoon: **the checkout is running in Stripe Sandbox**, **the price on your pricing page is $249 and the price at checkout is $99**, and **the voice agent asks my client to consent to their conversations being "shared with third-party service providers"** on a product whose entire promise is that their knowledge stays theirs. Details below.

---

## Landing Page

- The headline does the job. *"Your business is your biggest asset. Do you actually know what it's worth?"* — that is the question I have asked in a hundred kitchen-table meetings, and the sub-line ("a buyer pays for a job, not an asset") is exactly right. Whoever wrote this has actually sat in the room. The three-number frame (walk away / today / captured) is the clearest articulation of goodwill-vs-owner-dependence I've seen aimed at a layperson.
- **The illustrative numbers oversell what your own engine will produce.** The hero card shows Walk away $150k → Today $600k → Captured **$2.5M**. That's a 4× uplift. I then ran the real valuation as a plumbing business and got Today $861,847 → Captured $1,089,300 — a **1.27×** uplift. An owner who reads "$1.9M gap" on the landing and then gets told his gap is $227k feels the wind go out of the sails at exactly the wrong moment. Either dial the hero example back to something the engine can actually produce, or label it explicitly as one business's result.
- **"Admin" sits in the public top nav**, between About and Sign in, greyed out — and it's in the mobile hamburger too. No customer should be shown the staff door. My clients are 55-70 and cautious; a link labelled "Admin" on a page asking for their card reads as "this was built in a hurry."
- **The footer "Privacy" link goes to `#`.** It does nothing. On a product asking a business owner to pour their entire operation into an AI, a dead privacy link is not a nitpick — it is the single thing a suspicious owner will click. There's also **no Terms link in the main footer at all**, even though you've now got a good `/terms` page. It's linked from `/advisors` and `/signup` but not from the front door.
- Footer "Pricing" points to `/#pricing` while the header "Pricing" goes to `/pricing`. Two different destinations, same label.
- Terminology: you use seven different labels for one funnel — "Value my business", "Find out in 3 minutes", "What's my business worth?", "Start with my valuation", "Start free — first month", "Try Kira Free", "Start building your Business Genome". Owners of this vintage navigate by remembering the button. Pick two: one for the valuation, one for the subscribe.
- The FAQ answer on payment is genuinely good and now says the right thing — free first month, card at signup, nothing charged that day, payment a month later, email 3 days before, cancel and pay nothing. No surviving "7-day trial" anywhere on the site. That part landed.
- But **the landing FAQ never states a price.** Neither does `/terms`. An owner has to click through the valuation and reach `/plan` before a dollar figure appears. That's a deliberate-feeling withhold, and cautious buyers read it as one.

**Opportunity:** Add a "What a documented business is actually worth at sale" one-pager an advisor can forward — real ranges by sector, sourced to the BizBuySell data you're already citing. Right now the only shareable artefact is a sales page. Give me something I can attach to an email to a client without it looking like I'm selling him software.

---

## Business Valuation (the hook)

This is the best part of the product and it is very good. Eleven questions, plain English, each with a "why we're asking" line. Q3 echoing back the turnover I entered ("If the business turned over $1,800,000 but you kept $200k…") is a lovely touch. Q8 — *"If you took a 3-month holiday tomorrow, what happens?"* — is precisely the question that determines the multiple, and you've flagged it as such. AUD default, ex-GST, correct.

Then it fell over.

- **The result contradicts my answers.** I answered Q8 with the worst available option — *"It would fall apart. I am the business"* (I confirmed it in the result URL: `ownerDependence: i_am_the_business`). The narrative came back: *"You have done the hard part. **A buyer can largely see how this business runs without you**, so there is little left for them to discount."* Then two lines later, in the same panel: *"The small remaining gap is **the business runs on you**."* And under "Where that value is hiding": *"**The business runs on you.** A buyer sees that they are purchasing your job."* The page contradicts itself twice on the single most important variable. Screenshot `05-valuation-result.png`. Transferability came back **69/100** for a business the owner just told you collapses without him. That number should be in the 20s. If I show this to a client and he says "but I told it I'm the whole business" — I have no answer, and I've spent credibility I don't get back.
- **The industry field accepts anything.** The helper text says *"Pick the closest match from the list — we'll use its sector-average multiple."* I typed `zzqq nonsense trade`, Next enabled itself, and it sailed through to Q2 and into a valuation. Screenshot `03-q1-nonsense-industry-accepted.png`. The whole model hangs off the sector multiple. If it isn't a match from your list, the button should not be live.
- The valuation page **drops the main navigation** — logo only. From a live valuation there is no way to reach Pricing, Terms or About without going back to the homepage. The header is also doubled: a "Kira by Corporate AI Solutions" bar sitting on top of a second "Kira / Currency" bar.
- No email capture at the result. I understand the "no sign-up" promise and I respect it — but the result is a shareable, printable document about *my* business and there's no "email this to me". Owners of this generation will not screenshot it; they will lose it, and you'll never know they were there.
- **The inputs are base64 in the URL** (`/plan?v=eyJpbnB1dHM...`). Decodable and editable. Not a security hole, but if that link ends up in an email chain, the owner's turnover and profit are sitting in it in plain sight once anyone thinks to decode it. Owners are extremely touchy about their numbers travelling.
- Minor: the "profit trend" options give a sub-caption to three of four choices but "Growing steadily" gets none.

**Opportunity:** Let an advisor run the valuation *on behalf of* a client and send them the result. That is the actual workflow — I sit with the owner, I fill it in, I hand him the number. Right now the tool assumes the owner drives it, which is the least likely path for a 62-year-old plumber. A "run this with your client" mode is the difference between a novelty and something I use every week.

---

## Pricing

**This is the finding that stops me cold.**

- `/pricing` says: **"Kira Exec — from $249/month"** and *"One monthly plan for the exec, starting at $249/month."*
- `/plan` (the checkout page) says: **"Starter plan — $99/month."**
- Stripe charges: **A$99.00/month.**

Two-and-a-half times apart, on the same site, on the same day. If I quote $249 to a client and he's charged $99, I look careless. If it ever went the other way I'd be finished. There is no "Starter" tier mentioned on `/pricing` at all, and no "Exec" tier mentioned at checkout — so it doesn't even read as two products. Fix this before anything else.

- `/pricing` is the only page that says **"ex-GST"**. `/plan` doesn't mention GST. Stripe shows A$99.00 with no GST line. For an Australian product, that needs resolving explicitly: is it $99 + GST = $108.90, or $99 inc? Every one of my clients is registered and will ask, because they want to know what they're claiming back.
- The `/plan` page is otherwise the clearest statement of terms on the site and I'd hold it up as the model: *"A full month free — nothing charged today / We email you 3 days before the first payment / Cancel any time before then and pay nothing."* That's honest and I'd repeat it to a client word for word.
- But `/plan` — the page where a card is entered — carries **no link to Terms or Privacy**. Just "Secure checkout by Stripe · billed by Corporate AI Solutions."
- The two data-retention answers are good and I'd want them in front of a client: no training on customer data, 30-day retention after cancellation, exportable at any time. Move those up.

**Opportunity:** Publish an advisor-facing rate card — one page, the real price, GST treatment, what the commission is on. Right now I'd have to reverse-engineer it from three pages that disagree.

---

## Plan / Checkout

- **The checkout is running in Stripe Sandbox in production.** Session id is `cs_test_…` and the Stripe page carries a black **"Sandbox"** badge next to your business name. Screenshot `07-stripe-sandbox.png`. Nothing entered here creates a real subscription. Everything downstream of the funnel — signups, commission, the advisor dashboard "who signed up" — is untested against a live payment. This is the release blocker.
- The Stripe page says **"30 days free"**, **"Total after trial"** and the button reads **"Start trial"**. Your own copy deliberately avoids the word "trial" — "your first month is free". The owner clicks "Start free — first month" and lands on a page talking about a trial. Not a mis-statement of terms, but it's the one moment where a nervous buyer is reading every word, and the vocabulary changes under him. Stripe lets you set that product description and trial wording; make it match.
- "By subscribing, you authorise Corporate AI Solutions to charge you according to **the terms**" — "the terms" is not a link. The only linked terms on that page are Stripe's and Link's.
- **A$99.00 and 25 August 2026 are stated clearly** — that part is exactly right, and better than most SaaS I sign up to.

---

## Signup

- **The terms checkbox is unticked by default and genuinely blocks submission** — I confirmed `required: true` and the browser refuses with *"Please check this box if you want to proceed."* Correct behaviour. ✅
- The wording — *"I agree to the Terms, including emails about Kira. I can unsubscribe any time"* — is honest and bundles the marketing consent visibly rather than hiding it. Good.
- The **"How did you hear about Kira?"** field is present and optional. Fine, though if the advisor channel is the strategy, a free-text box is a weak substitute for attribution — I'd expect the introducer's name to be pre-filled from the link, not typed from memory by an owner who won't remember it.
- **No resend-confirmation path.** I signed up, then tried to log in, and got *"We need to verify your email first. Check your inbox for the confirmation link we sent."* — clear and well-worded, but there is no "send it again" button. For this demographic, "it's not in my inbox" is the single most common support call you will get, and right now it has no self-serve answer.
- The native browser validation tooltip on the checkbox is easy to miss on a phone. A visible inline error under the checkbox would be safer.

---

## User Portal

**Not reached — and I want to be straight about why.** The QA credentials I was given were blocked by permissions on this machine, so I did what a real prospect does: I signed up. Account creation works, but the account requires email confirmation and I have no access to that mailbox. So the authenticated owner experience — the persistent navbar, Settings, the Business Genome, the ongoing Kira conversations — is **unverified in this pass**. Treat every rubric item that depends on being signed in as untested, not as passed.

What I can say from outside: the gate itself behaves correctly. `/admin`, `/admin/settings` and `/introducer/dashboard` all redirect unauthenticated visitors rather than erroring or flashing content. Login has forgot-password, a password visibility toggle and a magic-link option. There is no facade — signup goes to a real confirmation flow, not into the admin gate.

---

## Advisors — `/advisors`

I read this one as the intended reader, and I'll give it the credit it deserves before the criticism: **this is the most honest partner page I have read in this industry.** "10% of what the owner pays, on funds we have actually collected." "First-touch attribution, and it cannot be quietly reassigned." "You will never see their conversations — that boundary is built into the system, not a policy we promise to follow." "We never contact your clients to sell around you." Those four sentences answer the exact four fears every broker has about referring anyone to anything. Whoever wrote them has been burned by a referral programme before.

Now the problems.

- **Nowhere does it say what 10% is in dollars, and the number is bad.** 10% of $99 is **$9.90 a month**. To an accountant that's under $120 a year per client. To a broker whose fee on a business sale is $30k-$80k, $9.90/month is not an incentive — and it is *worse than nothing*, because I now have to disclose a commission to my client for a sum that makes me look cheap. If I have to tell a man I've acted for since 2011 that I'm being paid to introduce him to something, the number needs to be worth the conversation. My honest advice: either raise the price, or raise the rate materially for advisors, or drop the commission entirely and sell it to me as a tool that raises my listings' multiples — which is a far stronger pitch and one I'd actually run with. Right now the page argues both and the commission undercuts the professional framing.
- **No ABN field on the form** (and no ABN anywhere on the site — see below). You cannot pay commission to an Australian firm without one. If you're serious about this channel, collect the ABN at the request stage and use a lookup, not free text.
- **The form doesn't capture the "one condition."** The page states clearly that I must only send it to owners I hold a current listing or engagement with, and that I must disclose the commission — and says *"you confirm it when you join."* There is no confirmation. No checkbox, no attestation. The one compliance-load-bearing term of the whole channel is unrecorded.
- **Nothing to read before I commit.** There's no agreement, no sample monthly statement, no PDF. "The terms, plainly" is a nicely-written box on a marketing page. I'm not signing my clients' names to a box on a marketing page. Put up a two-page introducer agreement I can send to my own compliance person.
- **No GST treatment on the commission.** Am I invoicing you? Are you raising a recipient-created tax invoice? Is the 10% plus GST? Every Australian firm will ask this in the first email.
- Submission worked cleanly and the confirmation was warm: *"Thanks — that's with us. We'll be in touch shortly with your link and a dashboard login."* But it **contradicts the line directly above it**: the form says *"A person reads these — you'll hear back from us, not an autoresponder"*, and the confirmation says *"reply to the confirmation email."* Small, but it's the first thing you've told me that isn't quite true.
- The confirmation replaces the form and offers **no next action** — no "see what a client sees", no "run a sample valuation". Dead end at the exact moment I'm most engaged.
- The `/advisors` header only carries Pricing and Request access. From an advisor page I can't reach About or Terms without scrolling to the footer.

**Opportunity:** The real product for me isn't a referral link — it's a **pre-sale readiness report** I can put in a listing appraisal. If Kira could produce a two-page "transferability report" with the owner's name on it that I attach to my appraisal, I'd introduce every vendor I take on, commission or not, because it makes *my* appraisal look better and shortens my due diligence. That's a channel. $9.90 a month is not.

---

## Terms — `/terms`

Genuinely good drafting. Plain English, "the short version" summary at the top, and clause 2 draws the decision-support-not-professional-advice line properly. Clause 3 on introducer visibility matches what `/advisors` promises, which is the sort of consistency that reassures a professional reader. Clause 6 on billing matches `/plan` and the FAQ word for word. Well done.

What's missing, and an accountant will spot every one of these in about ninety seconds:

- **No ABN.** I checked the landing page, `/terms`, `/pricing`, `/advisors` and `/about` — the string doesn't appear anywhere on the site. I do not know which legal entity I'm contracting with, and neither does my client. For an Australian business taking recurring card payments and sending commercial email, this is not optional.
- **No registered/postal address.** Same reason.
- **No governing law or jurisdiction clause.** The ACL is referenced but not the governing state.
- **No privacy policy.** Clause 3 covers data lightly, but there's no separate policy, and the footer link to one is dead. Clause 8 gives me `legal@corporateaisolutions.com`; the introducer page gives me `hello@`; `/about` gives me `dennis@`. Three addresses, no contact page.
- **No price in the Billing clause.** "Your first month is free... billed monthly in advance" — but no amount. Given `/pricing` and `/plan` disagree, the Terms is exactly where the number should be nailed down.
- Clause 6's "fair-use allowance" on the free month isn't quantified. If it exists, say what it is.

---

## Unsubscribe — `/unsubscribe`

- **Correct behaviour on the thing that matters:** a plain GET with no token does *not* silently unsubscribe. It returns *"That link isn't valid."* I also tried `?token=abc123`, `?email=...` and `?t=deadbeef` — all correctly rejected. ✅
- Everything else about the page is wrong. It is **completely unbranded** — no logo, no header, no footer, grey background, a single white card. Screenshot `10-unsubscribe-no-token.png`. If I've clicked unsubscribe out of a Kira email and land on an anonymous grey page, my honest first thought is "phishing" and my second is "I'll just mark it as spam", which is worse for you than the unsubscribe.
- It says *"Reply to any message from Kira and we'll take you off the list by hand"* — but gives no email address, and offers no link back to the site. Total dead end.
- I couldn't test the confirmation-step path without a valid token, so the brief's key question — does a valid link show a confirm step rather than acting immediately — remains **unverified**.

---

## Introducer — `/introducer` and `/introducer/expired`

- `/introducer` with no session correctly redirects to `/introducer/expired`. No error, no blank screen. ✅ Same for `/introducer/dashboard`. ✅
- The message is clear: *"Sign-in links last seven days and can only be used from the account they were sent to."*
- **But the only recovery is to email a human.** *"Email hello@corporateaisolutions.com and we'll send another."* There is no "send me a new link" form. So every advisor, every eighth day, has to email you and wait to see their own dashboard. That is not a dashboard, that's a request queue. And it directly undercuts what `/advisors` sells me — "a dashboard login." Put a one-field "email me a fresh link" box on that page; it's twenty minutes' work and it's the difference between a channel that runs itself and one that runs through your inbox.
- Seven days is also short for this audience. My reporting rhythm is monthly. Make it thirty, or give advisors a password like everyone else.

---

## Admin Portal

**Not reached.** The admin credentials I was given were blocked by permissions on this machine, and there is no bypass — nor should there be. What I could verify from outside:

- `/admin` and `/admin/settings` both redirect an unauthenticated visitor to `/admin/login`. No content flash, no error. ✅
- `/admin/login` is a separate, correctly-branded surface ("Kira Admin") with its own forgot-password and magic-link. ✅
- Attempting to sign in with my newly-created non-admin owner account was rejected — though at the "verify your email first" stage, so I could not distinguish an allowlist rejection from an unconfirmed-account rejection. **The admin allowlist itself is untested in this pass.**
- Everything behind the admin gate — navbar, settings, the introducer/commission management, whatever reporting exists — is **unverified**.

---

## Cross-Path Issues

- **"Admin" is advertised in the public customer navigation** on both desktop and mobile. A customer-facing marketing site should not signpost the operator entrance. Move it to a bookmark.
- Route separation is otherwise clean: user auth at `/login`, admin at `/admin/login`, introducer on token links, and each gate holds against an unauthenticated probe. I found no path from the user side into `/admin`.
- **Three separate identity systems with three separate recovery stories:** owners get password + magic link + forgot-password; admins get the same; advisors get a seven-day emailed link with no self-serve renewal. The advisor — the person you most need to keep engaged — has the worst of the three by a distance.
- The user portal being unreachable in this pass means I cannot confirm the owner side isn't a facade. Everything public points at a real product; I just couldn't get behind the door.

---

## Voice Agent — the one that worries me most

"Ask Kira" is on the valuation page, one click, and it opens. Then:

- **The consent modal is generic ElevenLabs boilerplate**, and it says this: *"By clicking 'Agree,' and each time I interact with this AI agent, I consent to the recording, storage, and **sharing of my communications with third-party service providers**, and as described in the Privacy Policy."* Screenshot `16-voice-call-attempt.png`.

  Read that next to your own copy. `/pricing` says *"What you tell Kira stays between you and your business, private and permissioned."* `/plan` says *"Your knowledge stays private and yours to keep."* `/terms` clause 3 says *"we do not sell it."* And the modal a client must click through to speak to her says her conversations are shared with third parties, and points at a Privacy Policy that **does not exist and is not linked**.

  I could not send a client into that. Not because I think you're doing anything untoward — I don't — but because if he reads it and rings me, I have nothing to say. This is your most important trust surface and it's currently rendering the vendor's default text. Replace it with your own wording, in your own voice, linked to your own privacy policy.
- **"Powered by ElevenLabs Agents"** is visible on the widget on a customer-facing page. You are selling *"your own Kira, not a generic bot"*. Showing the engine badge undercuts exactly that.
- The panel header just says **"Need help?"** — not "Ask Kira about your valuation". Generic where it should be specific.
- **When it fails, it fails badly.** With no microphone available, the widget returned **"An error occurred / Not supported"** and a Close button. No explanation, no "your browser or device doesn't have a microphone", no text-chat fallback. Screenshot `17-voice-after-agree.png`. A 62-year-old on a five-year-old iPad will get that message and conclude the product is broken. Given that voice *is* the product, that fallback matters more here than anywhere.

---

## Other Strategic Feature Suggestions

1. **Advisor-run valuations.** Let me run it with the client in front of me and email him the result under my letterhead. That's the real workflow, and it makes me a distributor instead of a link-forwarder.
2. **A transferability report I can attach to an appraisal.** Two pages, the owner's name on it, the gap and the top three fixes. This is the artefact that would get me using Kira weekly regardless of commission.
3. **Re-value on a schedule.** The whole promise is "watch the number move." Prompt the owner quarterly, show the delta, and email the advisor the same delta. That single loop is what turns a $99/month subscription into something an owner renews for five years — and it's what makes 10% worth having.
4. **A "hand it to your successor" export.** Half my sellers aren't selling to a stranger, they're handing to a son, a daughter, or the foreman. "Business Genome, exported as a handover pack" is a different and possibly bigger product than "sell for more."
5. **Price the advisor tier separately.** A broker with forty listings doesn't want 10% of $99 forty times; he wants a firm licence he can put on every vendor he signs. That's a real distributor deal and it's the shape your own channel page is one step away from.
6. **Put a name and a company behind it.** `/about` says "Built by one developer. Solo AI developer." I understand the honesty and I like the person it describes. But an owner is being asked to put the entire operating knowledge of his life's work into it, and a broker is being asked to stake a client relationship on it. "One bloke" is a liability at this decision, not a charm. Lead with the ABN, the entity, the data handling and the retention policy; keep the founder story further down the page.

---

## Standards Check (portfolio non-negotiables)

- **Responsive** — ✅ (with one ❌ inside it). No horizontal scroll at 375px on any of `/`, `/pricing`, `/advisors`, `/business-valuation`, `/terms`, `/login`, `/signup`, `/admin/login`, `/plan` (scrollWidth == clientWidth == 375 on all nine). Body text 16px throughout. Nav collapses to a working hamburger drawer. **Touch targets: ❌** — every footer link measures 18-20px high (About, How it Works, Pricing, Privacy, Longtail AI Ventures, corporateaisolutions.com), well under 44px. The 375px header is also cramped: "Sign in" and "Value my business →" both wrap to two lines.
- **Auth-page pattern** — ✅ `/login` has a forgot-password link, a "Show password" toggle and "Email me a magic link". `/signup` and `/admin/login` the same. Reset flow itself not walked (no mailbox access).
- **Authenticated chrome + Settings** — **untested.** Could not reach an authenticated surface; QA credentials were blocked and my own signup requires email confirmation. Not a pass, not a fail — unverified.
- **Explanatory header** — ✅ on `/pricing` (literally "What this page is / What to do here / Why it matters"), `/business-valuation`, `/advisors`, `/terms`, `/signup`, `/login`. ❌ on `/unsubscribe` — no header, no branding, no context at all.
- **Voice agent** — ❌. Present and one click from the chrome, so placement passes. It fails on substance: vendor-default consent text that contradicts the product's privacy promise, an unlinked non-existent Privacy Policy, a visible "Powered by ElevenLabs Agents" badge, and a raw "An error occurred / Not supported" with no fallback when the mic is unavailable.
- **Scaffold metadata** — ✅ Tab titles are real and page-specific: "Kira — your fractional exec", "For brokers & accountants · Kira", "Terms · Kira", "Unsubscribe · Kira", "Link expired · Kira", "Admin sign in · Kira". Favicon is a custom `/favicon.ico` plus an apple-touch-icon, not the default feather. Minor: `/about` and `/business-valuation` fall back to the generic site title.
- **Dual-portal separation** — ✅ on the evidence available. `/admin`, `/admin/settings`, `/introducer/dashboard` all redirect unauthenticated visitors; user signup goes to a real confirmation flow, not into the admin gate; no user→admin path found. The full "user reaches a real home distinct from /admin" assertion is **unverified** because I couldn't confirm my account.
- **Consequence clarity** — ✅ for money. `/plan` states plainly that the card is saved, nothing is charged today, $99 comes out a month later, with 3 days' email warning and free cancellation before then — before the click. ❌ for the advisor form: it submits an application to a commission arrangement with no confirmation of the stated "one condition" and no agreement to read first.
- **Zero dead ends** — ❌. Footer "Privacy" → `#`, does nothing. `/unsubscribe` has no link anywhere and no contact address. The `/advisors` success state offers no next action. `/introducer/expired` offers only "email a human". Login's "verify your email" state has no resend.
- **Address / ABN lookup** — ❌. No address fields exist to check. The `/advisors` "Firm" field is plain free text with **no ABN field at all**, on a form whose entire purpose is registering a party you intend to pay commission to. No ABN appears anywhere on the site.

---

## Scope note

~50 minutes. **Covered:** landing (desktop 1440 + mobile 375), the full 11-question valuation end-to-end including a deliberate bad-input pass, the result page, `/plan`, the Stripe checkout page (stopped short of entering a card — the Sandbox badge is where any sane person stops), `/pricing`, `/terms`, `/advisors` including a real form submission, `/unsubscribe` with four token variants, `/introducer` + `/introducer/expired`, `/signup` including the required-checkbox enforcement test and a real account creation, `/login` including a failed sign-in, `/about`, the voice widget through to its consent modal and failure state, unauthenticated probes of `/admin`, `/admin/login`, `/admin/settings`, `/introducer/dashboard`, and a nine-page mobile overflow sweep.

**Blocked:** the authenticated user portal and the entire admin portal. The supplied QA credentials could not be read on this machine, and the account I created myself needs an email confirmation I can't retrieve. No bypass was sought or used. Anything behind a login is unverified in this pass and should be re-walked with working credentials before you treat this report as complete.

**If you fix three things this week:** the Stripe sandbox key, the $249-vs-$99 contradiction, and the voice consent modal. Then the owner-dependence contradiction in the valuation narrative, because that's the one that costs you credibility with the people you most need to believe you.

I'd like to see this again once those are done. The bones are genuinely excellent — better than anything else aimed at this problem — and I don't say that often.

Thanks,
Anneke
