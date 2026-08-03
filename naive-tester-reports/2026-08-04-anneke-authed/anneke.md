# Kira — Authenticated Walkthrough

Hi Dennis,

**Platform Feedback — Kira Authenticated Walkthrough**
Persona: Anneke (business advisory / broker, 25+ years walking owners through exit prep) | URL: https://kira-rho.vercel.app | Goal: sign in as a real customer, walk the part of the product people pay $999 a month for, then the operator console | Duration: ~95 min

A note before I start, because it changes how you should read the rest. I went in expecting to spend the session on the product. I found that **nobody can currently create an account, reset a password, or use a magic link on your live site.** All three return a 500. I confirmed it four separate times over roughly forty minutes. Everything else I say is written against a product that, as of right now, cannot take a new customer.

---

## Landing (regression check only)

Loads clean, tab title is *"Kira — your part-time general manager"*, the copy still reads well and still speaks to exactly one person. Nothing I was told was fixed today has come back: `/plan`, `/login` and `/signup` all render, I found no doubled `+ GST + GST`, and the mic emoji is gone from the voice button. The four-different-visual-identities thing is still true and I'll come back to it, because it turns out the authenticated side has a fifth.

One small thing on `/login` I only caught because I was watching for it: for the first second or so after the page arrives you get the heading *"Welcome back — sign in to your Kira"* and **no form at all**. Then two fields appear. It resolves inside a second so most people won't notice, but I did, twice, and my first instinct was "it's broken again."

---

## The User Path

This is the bulk of the run and where the value is.

### ❌ RELEASE BLOCKER — signup, password reset and magic link are all returning 500

I'll lead with it because everything else is downstream.

- `POST /auth/v1/signup` → **HTTP 500** (6.7s). On screen: *"We couldn't reach the auth provider. Try again in a moment."*
- `POST /auth/v1/recover` (forgot password) → **HTTP 500**, twice, twenty minutes apart.
- `POST /auth/v1/otp` (magic link) → **HTTP 500**.

Signing in with an existing email and password works perfectly — I did it a dozen times. So it is specifically **every path that has to send an email** that is down. That's one root cause, not three, and it smells like the Supabase auth mailer rather than your code.

What it means in operating terms: your funnel is live, your Stripe is on live keys (your own admin banner says *"Real cards are being charged"*), and a 66-year-old plumber who reads your landing page and clicks "Value my business" and likes the number **cannot become a customer today**. And the one existing customer who forgets their password on a Sunday cannot get back in and has no self-serve route. The on-screen message says "try again in a moment," which is the wrong promise — I tried across forty minutes.

I would not run another naive-tester round, or send another demo link, until this is green. Everything below is worth fixing but nothing below matters if this doesn't work.

### ❌ The dashboard contradicts itself in a single card

This is the one that made me sit up, because it's the number the whole product is anchored on.

On `/dashboard`, the hero card reads:

> **Your Business Value Gap — $138,000**
> *"That's the value locked in your head today — the difference between $926,000 (a business that needs you) and $1,060,000 (one that runs without you)."*

$1,060,000 − $926,000 = **$134,000**. The card states both numbers and then labels their difference as $138,000, four inches apart, in one paragraph.

And it isn't a typo. The valuation result page says **$134,000**. The `/plan` page says **$138,000** — and then prices you off it ("about 8.7% a year of what you stand to unlock", which is $11,988 ÷ $138,000). The four itemised drivers on the result page — owner dependence $48,200, documented systems $48,000, recurring revenue $24,000, client diversification $18,000 — sum to **$138,200**. So one screen shows the difference of the two rounded headline figures, another shows the sum of the unrounded components, and they are four grand apart.

I add up columns for a living. So does every accountant and every broker your customer will show this to. The first thing a sceptical 65-year-old does with a number he doesn't trust is check it against the other numbers on the same page, and this one fails that test in about eight seconds. It also undermines the single best thing on the whole result page — the honest paragraph explaining that you use US BizBuySell medians because no equivalent Australian dataset exists. That paragraph buys you enormous credibility. Then the arithmetic spends it.

**Opportunity:** pick one definition of the gap, compute it once, and render it everywhere from the same value. If the components genuinely don't sum to the headline (rounding), say so in one line — *"components are indicative and rounded; the gap is the difference between the two figures above"* — rather than letting the reader discover the mismatch himself.

### ❌ The Business Genome is filling up with Kira's notes about herself, not facts about the business

This is the deliverable. It's the reason someone pays you. So I looked hard at it.

I had two short conversations with her. Seven items landed in the Genome. **All nine areas** — where work comes from, pricing, how work gets done, money and terms, who buys, who does the work, what the business owns, licences and insurance, systems and records — still say *"Not captured — nothing here yet, this is still only in your head."* All seven items are sitting in **"Not yet filed (7)"**.

Here's what the seven actually are:

- *"Understanding the owner's current time and task allocation is necessary to identify areas of dependency."*
- *"Reducing dependency on the owner is a priority to make the business more sellable."*
- *"Reducing owner dependency is a key strategic priority to increase business sellability."*
- *"The business owner has not connected Xero accounting software to the assistant yet."*
- *"The business's current value cannot be determined without connecting Xero accounting software."*

None of those are facts about the business. The first is Kira narrating her own reasoning. The second and third are the same sentence twice. The fourth and fifth are software connection status. In the separate "Other things she has noted (8)" list it happens again — *"Only the owner and assistant have access to the conversations"* appears **three times** in slightly different words, and *"Google Drive is not connected"* appears twice.

So after a conversation the owner has a Genome that contains: her restating his goal back to him, twice; her noting what she can't do; and nothing at all about his business. If he opens `/my-genome` after his first proper session and sees that, he will conclude — correctly, on the evidence — that she isn't listening.

**Opportunity:** the extractor needs a hard filter. If a candidate fact is (a) about Kira, her connections or her capabilities, (b) a restatement of an instruction or a goal rather than an operating fact, or (c) semantically within a whisker of something already stored, it doesn't get written. You already have duplicate detection in the substrate; this looks like it isn't in the path.

### ❌ The handover document — the thing you'd send to a buyer's advisor — carries a fake ABN and Kira's private notes

I downloaded it. `/api/genome/export?format=md`.

Two problems, both serious for a document whose stated job is going to an advisor or a buyer.

**One.** The header reads `Nolan Building Co Pty Ltd · ABN 99 999 999 999`. That is not an ABN — it fails the checksum, it is eleven nines. I traced it: Settings → Your business holds `99999999999`, and the field accepted it. The business-name field above it does a **live ABR lookup** and it works beautifully (I typed "Nolan Building" and got six real registered entities with real ABNs and their states). But the manual ABN box under it is validated on **length only**. Whatever goes in there prints on the bottom of every email Kira sends on the owner's behalf — which your own copy correctly says Australian law requires — and on the top of the buyer handover document.

**Two.** The handover document says on `/my-genome` that it *"leaves out anything marked yours only"*. It does leave out the eight "other things she noted". But it **includes the whole "Recorded, not yet filed" block**, which is the seven items above. So the document you'd hand a buyer's advisor contains:

> *"The owner prefers to maintain strict control over communications and approvals, explicitly disagreeing with sending sensitive emails without prior approval, despite attempts to grant standing approval."*

I know what that is — it's the residue of somebody testing whether she can be talked into sending mail unsupervised. To a buyer's advisor reading it cold it says the owner is a control freak who nearly signed away his approval rights. It also sits next to *"reducing dependency on the owner is a priority to make the business more sellable"*, which tells the buyer exactly what the seller is worried about. You don't hand the other side your own weaknesses list.

**Opportunity:** unfiled facts should be *excluded* from the handover by default and included only once filed to an area, or at minimum the export should apply the same sensitivity filter to unfiled items that it applies to the "yours only" bucket. The safe default for a document leaving the building is "if we're not sure where it belongs, it doesn't go."

Credit where it's due, though: the provenance footer on that document is genuinely excellent — *"7 of 7 are dated to the conversation in which the owner stated them... none have yet been read back to the owner for confirmation."* That is exactly the language a due-diligence reader wants and I have never seen a tool this size do it. Please don't lose it.

### ❌ A signed-in paying customer clicking the main dashboard CTA lands in the anonymous marketing funnel

`/dashboard` → *"Answer the eleven questions"* → I'm dropped onto `/business-valuation`, which:

- loses the left navbar entirely and swaps to the marketing chrome
- says **"Nothing to sign up for"** to a person who is signed up
- says **"Nothing is sent anywhere until you decide to sign up"**
- says **"Your answers stay on this device"** — for a customer whose whole value proposition is that you hold his knowledge for him
- asks **"What should we call you?"** on a page whose own header, four lines above, reads **"You are signed in, Ray."**

I typed "Anneke" and the result page addressed me as Anneke while the header still said Ray. Two names, one screen.

This is the paid product's single most important first action and it is wearing the marketing site's clothes. For this buyer in particular — cautious, sixties, already unsure whether this is a real thing — being told "nothing is sent anywhere until you sign up" *after* he has paid you reads as either a bug or a bait-and-switch. Both cost you.

**Opportunity:** one flag on that route. Signed-in: keep the app chrome, prefill the name from the account, drop the four reassurances about not being signed up, and change "About 3 minutes. Nothing to sign up for" to something like "About 3 minutes. This sets your baseline."

### 🟡 The valuation does land — eventually — but not when you come back

When I finished the eleven questions and clicked **"Back to Kira"**, `/dashboard` still showed the empty state: *"Kira doesn't have a starting point for the business yet. Eleven questions..."* I'd have concluded the work was lost. It wasn't — on a later visit the dashboard was rebuilt around the valuation, with the gap card, the transferability score and the four-week plan. So it does persist; the return trip just renders stale.

Worth fixing, because the moment of maximum doubt for this customer is the ten seconds after he finishes a form and doesn't see his answer.

### 🟡 "0 conversations" — after I'd had a conversation

I sent two questions and got two good answers, both confirmed as `POST /api/kira/chat/text → 200`. `/dashboard` still reports **"Your business exec — 0 conversations"**, and the admin console independently reports **0 convos** for my agent. So typed conversations appear to count for nothing anywhere.

If typing is a real second interface — and it should be, half your ICP will not talk to a computer with staff in the room — then it needs to show up in the record. An owner who types to her for a week and sees "0 conversations" concludes nothing is being kept.

### 🟡 Two identical text boxes on the same screen, one output

`/talk` has a **"Type a message to Kira"** box with a Send button, and about 200px below it, inside the Kira widget, a **"Type your question"** box with its own Send button. Both work. Both feed the same transcript, which appears above the first one. I tested each independently and got sensible answers to both.

It isn't broken, it's just confusing — I genuinely didn't know which one was "the real one" and picked the top one because it was first. And the widget beneath keeps saying *"Welcome back — Kira remembers where you left off. Tap the mic to continue"* even after four messages have gone back and forth, which makes the lower half of the screen feel like a different, stale app.

### 🟡 The address field promises autocomplete and does nothing

Settings → Edit business details → `/setup/business`. Street address placeholder: **"Start typing the address"**. I typed "10 Ann Street Brisb" with real keystrokes, waited, then typed again with the network monitor cleared. **Zero network requests. No suggestions, ever.**

The contrast is what makes it stand out: the business-name field directly above it does a live registry lookup and is one of the nicest things in the product. So the page teaches you to expect lookup, then doesn't deliver it on the very next field.

### 🟡 The business-register dropdown opens by itself and covers two fields

Same page. Arriving to edit my address, the ABR autocomplete fires immediately off the pre-filled business name and drops a six-result panel over the top of the ABN and Trading name fields. So the first thing an owner sees on his own settings page is a list of *other people's* businesses obscuring his own details. Only suggest when he actually types.

### 🟡 Terminology and IA nitpicks

- The left nav says **Overview**, but the route is `/dashboard` and the CTA that gets you there says "Back to your account". Three names for one place.
- **"My Genome"** is the right name for the artefact but it's an odd label for a nav item — it reads like a settings page, not the product's main deliverable. In my world it'd be "The Business Genome" or just "Handover".
- The export names me **"Recorded by Ray"** and `/plan` greets me as **"You are signed in, Ray"**, but I never told it my name was Ray and the Profile first-name field says Ray with a blank surname. Whoever Ray is, he's on my documents.
- The valuation baseline is stamped **"taken 3 August 2026"**; it was taken on the 4th. Same one-day slip on the handover document ("Exported 3 August 2026"). Looks like a UTC/AEST issue. Trivial, except it's on a document you're telling people stays fixed and gets shown to a buyer.
- `/terms` says *"Last updated 26 July 2026 · version 2026-08-01.1"*. The version and the date disagree, on a page people tick a box to accept.
- Q3's helper text uses a hyphen — *"Profit, not sales - and add back..."* — where every other sentence in the product uses a proper dash. Same on the result page. It's the sort of thing that only shows up next to writing this good.

### 🟡 The floating buttons sit on top of the words

At 375px on `/dashboard`, the black **"Report a problem"** pill and the orange **"Talk to Kira"** button land squarely across the Week 1 card and cover the end of *"the things only you know — just by talkin[g]"*. At 1440px the same voice button covers the end of the "Meet Kira" paragraph. Neither is catastrophic, but on a phone it looks like a rendering fault, and covering the sentence that explains what the product does is bad luck twice over.

### ⚠️ Two authenticated pages crashed the browser tab, repeatedly

I want to be careful here because my test harness is known to be fragile against this app, so treat this as a signal and not a verdict. But the pattern discriminated: `/dashboard`, `/my-genome`, `/settings`, `/knowledge`, `/plan` and the valuation flow all loaded reliably many times over ninety minutes. **`/talk` and `/discovery` produced hard renderer crashes** ("page crashed", "target crashed") again and again, and the crash almost always came on the redirect into `/talk` immediately after login. It also got worse the longer the browser had been alive, which is the shape of a memory leak rather than a one-off.

I could not walk `/discovery` at all as a result — its content never rendered once.

If there's any chance an owner on a five-year-old laptop with twelve tabs open hits this, it's worth an hour with the profiler on the voice widget.

### ✅ What genuinely works, and works well

I'd be doing you a disservice if I only listed problems.

- **Password sign-in is rock solid.** A dozen logins, no failures.
- **She refuses to make things up.** I asked "what is my business worth right now?" and got *"I can't see your business accounts right now because your Xero isn't connected to me yet."* That is exactly right, and it is the single hardest thing to get an AI to do. Most tools in this space would have invented a number.
- **Her second answer was a good consultant's answer.** I asked how to make the business less dependent on me and she asked me how I split my time and what only I can do. That's the right next question.
- **The valuation methodology disclosure** — admitting the multiples are US data because AIBB's database is members-only, and saying the number is a floor not a ceiling — is more honest than most licensed valuers manage. Keep it word for word.
- **Consequence clarity on the paywall is textbook.** "Start now" opens a panel that says *"The next screen asks for your card. It is saved, not charged. Your first payment is $999 + GST at the end of your first month, and we email you three days before it. Cancel before then and the month is written off"*, with **Continue to Stripe** and **Not yet**. Every displayed price carries **+ GST**, correctly, and the valuation figures correctly carry none. That's the right distinction and most people get it wrong.
- **The 404 page** is the best-written 404 I've read: *"Nothing is wrong with your account and nothing has been lost... If you followed a link from us and landed here, it is worth telling us — that is our mistake to fix, not yours."* Two routes out, no dead end.
- **Settings is complete.** Profile, business identity, connected accounts, plan and usage with a real meter, password with a visibility toggle, notifications, signed-in devices, delete account. Sensible section-by-section saves.
- **`/terms` and `/privacy` are live, real, and contain no placeholder text.**

---

## The Admin Path

I kept strictly to what I was asked to walk — portal access and Settings. I did not touch Introducers, LOIs, Asked-for or Trust, and I did not go near "Sign out on all devices" or "Delete account" in either portal.

**Portal access ✅.** `/admin/login` is a distinct page with its own title (*"Admin sign in · Kira"*), its own chrome, and the full auth pattern (forgot password, visibility toggle, magic link). The admin account signs in and lands on a proper operator console: persistent left rail (Overview, Kira Exec, Introducers, LOIs, Asked for, Trust, then Settings and Sign out anchored at the bottom), active-route indicator, explanatory header (*"Operator view of Kira. Accounts, agents, and conversation volume across every account."*).

**The LIVE billing banner is excellent.** *"Real cards are being charged. Stripe is running on the live key."* Prominent, unambiguous, exactly what an operator needs to see on arrival. I confirmed it independently — the checkout session your app minted for me was a `cs_live_…`, not a test session. I abandoned it without entering a card.

**❌ The admin Settings link leaves the admin portal, and `/admin/settings` is a 404.** The sidebar item labelled "Settings" points at `/settings` — the customer settings page. Click it and the entire chrome changes to the end-user product. There *is* a way back (the user nav gains an `/admin` item when you're an operator), so it isn't a trap, but it's disorienting: you're in "Kira Admin", you click Settings, and you're suddenly in a customer account. And `/admin/settings`, which is the URL anyone would guess, returns a 404. Either build a thin admin settings page or relabel the item "My account".

**Settings → Profile / Password / Notifications** are the same shared page I walked in detail on the user path — Profile bound correctly to the admin's own email, password field with the eye toggle, notifications with a save. I could not complete a *submit* test on the admin's copy because the browser tab crashed on that navigation four times running; the page itself is the same component I successfully exercised as the user, so I'm recording it as **observed, not submitted**.

**Data quality on the console:**
- **Conversations: 717** across the estate, but every agent in the "Recent agents" list shows 0, 1 or 2 convos. Those two numbers don't obviously reconcile, and my own agent shows 0 after I'd conversed with it. Whatever "conversations" counts, it isn't what the per-agent column counts.
- **`Kira_Trinh_DevelopingThe_7f1c` is listed twice**, identical name, type and count. A duplicate agent row for a real customer.
- 22 users, 18 agents — four accounts with no agent. Two of them show "—" under Linked, so presumably that's the explanation, but there's no column that tells you *why* an account is unlinked or what to do about it.

**No voice surface in the admin portal.** The customer product has "Talk to Kira" on every screen; the operator console has none. Not necessarily wrong, but worth a deliberate decision rather than an accident, given voice is the product's whole mechanism.

**Opportunity:** the console tells you *how many* — users, agents, conversations. It doesn't tell you *what needs you*. For an operator running a book of owners, the screen I'd actually want is: who signed up and never had a conversation, whose Genome is still empty after two weeks, whose card is about to be charged for the first time, and which agents are throwing errors. Counts are a scoreboard; the operator needs a worklist.

---

## Cross-Path Issues

**✅ The user flow reaches a real user home distinct from `/admin`.** Signing in with the non-admin account lands on **`/talk`**, inside the customer chrome, with a working left navbar (Overview / My Genome / Knowledge / Settings / Sign out) and the account email in the footer. No facade, no bounce into an admin gate.

**✅ A plain user cannot reach `/admin/*`.** I tested `/admin`, `/admin/users`, `/admin/settings` and `/admin/login` while signed in as the non-admin. Every one redirected to `/admin/login`. I then typed the *user's own* credentials into the admin login form and got a clean, correct rejection: **"That account isn't an operator account."** with a link back to the customer sign-in. That is exactly right — it rejects at the right layer and it tells the person where they should be going instead.

**✅ An admin can reach the user side,** and the nav grows an `/admin` link so they can get back.

**🟡 The `?next=` redirect is inconsistent.** Hitting `/discovery` while signed out sends you to `/login?next=%2Fdiscovery` and returns you afterwards. Hitting `/knowledge` while signed out sends you to a bare `/login` with no `next`, so you're dumped on `/talk` and have to navigate again. Same for a session that expires mid-flow.

**🟡 Five visual identities, not four.** The known landing / valuation / checkout / login split is still there, and the authenticated app adds a fifth: the customer product's sidebar with an orange-red business name and purple buttons, versus `/plan` and `/business-valuation` which drop the sidebar entirely and revert to marketing chrome mid-session. Moving from `/dashboard` to `/plan` doesn't feel like navigating within one product; it feels like being bounced out to the website.

**🟡 Page titles are set on maybe a third of routes.** `/settings`, `/dashboard`, `/knowledge`, `/login`, `/signup`, `/admin/login`, `/admin` and the 404 all have proper titles. `/my-genome`, `/plan`, `/business-valuation`, `/talk`, `/commit`, `/pubguard`, `/onboarding` and `/discovery` all fall back to the generic *"Kira — your part-time general manager"*. Nothing says "Create Next App", so it isn't a fail — but an owner with six tabs open can't tell his Genome from his dashboard.

---

## Other Strategic Feature Suggestions

**Give the owner a "what's still missing" worklist, not a wall of "Not captured".** `/my-genome` currently shows nine areas, all empty, each with a question. It already groups them intelligently ("still only in your head" vs "Kira hasn't been shown these yet — these usually live in a system or a filing cabinet"), which is a genuinely good idea. But it's still nine red lights on day one. Owners like mine respond to *one* next thing. Show the single highest-value gap, with the dollar figure attached to closing it — you already compute exactly that on the valuation page.

**Let the advisor see the transferability score move.** You've built the score, you've said "this is the number to watch go up", and the privacy copy already promises an introducer sees progress and never contents. A monthly one-line email to the introducer — *"Pat Nolan: 39 → 44"* — is the entire referral engine, costs almost nothing, and gives the broker a reason to keep sending you people.

**Read facts back and mark them confirmed.** Your own export footer says nothing has been confirmed yet, and that confirmation is "most of what this is worth". I agree completely — an unverified claim in a data room is worth close to zero. Whatever the roadmap is, that's the feature that turns this from an interesting artefact into something an advisor will actually accept.

**Sell the Genome, not the software.** The strongest thing in this product is a markdown document organised by the exact questions a buyer's advisor asks. That is the thing I would show a client. The dashboard, the four-week plan and the value gap are all in service of it. If it were mine, the first authenticated screen would be a live preview of that document filling in, not a plan card.

**Validate the ABN against the register you're already calling.** You have the ABR lookup working. Run the manual entry through the same call and refuse eleven nines. It costs one request and it stops a fake ABN reaching both a legal email footer and a due-diligence document.

---

## Standards Check (portfolio non-negotiables)

| Item | Verdict | Evidence |
|---|---|---|
| Responsive — 375px and 1440px, no horizontal scroll | ✅ | `/dashboard` at 375: `scrollWidth 375 = clientWidth 375`; at 1440: `1440 = 1440`. Layout reflows to single column, hamburger appears. |
| Touch targets ≥44px, body text ≥16px on mobile | ✅ | Buttons and nav items on the 375px dashboard are comfortably above 44px; body copy legible at default size. |
| Nav collapses to a usable mobile pattern | ✅ | Left rail becomes a hamburger at 375px on `/dashboard`. |
| Auth pattern — forgot-password link | ✅ present / ❌ works | Link present on `/login` → `/auth/forgot-password`, page renders correctly. **Submission returns HTTP 500 twice.** |
| Auth pattern — password visibility toggle | ✅ | `[button] "Show password"` on `/login`, `/signup`, `/admin/login`, and Settings → Password. |
| Auth pattern — magic link | ❌ | Button present on `/login` and `/signup`; `POST /auth/v1/otp` → **HTTP 500**. |
| Signup works | ❌ | `POST /auth/v1/signup` → **HTTP 500** (6.7s), on-screen error, no account created. |
| Persistent left navbar on authenticated pages | 🟡 | Present on `/talk`, `/dashboard`, `/my-genome`, `/knowledge`, `/settings`, `/setup/business` and all of `/admin`. **Absent on `/plan` and `/business-valuation`**, which revert to marketing chrome. |
| `/settings` with Profile / Password / Notifications / Account | ✅ | All four sections present, plus business identity, connected accounts, plan & usage, signed-in devices. Sign Out in the nav on every authenticated page. |
| Explanatory header on every page/panel | ✅ | Checked on `/dashboard`, `/my-genome`, `/knowledge`, `/settings`, `/setup/business`, `/admin`. Empty states keep theirs — `/knowledge` empty state is a good example. |
| Voice surface reachable in ≤3 clicks — and it works | 🟡 | "Talk to Kira" FAB on every customer page (0 clicks). The **typed** fallback genuinely works: two questions submitted, `POST /api/kira/chat/text → 200` both times, real answers returned. **The mic itself I could not test** — no microphone in this environment. **No voice surface anywhere in the admin portal.** |
| Scaffold metadata — tab title is the product name | 🟡 | No "Create Next App" anywhere. But ~8 authenticated routes including `/my-genome` and `/plan` fall back to the generic root title. |
| Dual-portal separation — user home ≠ `/admin` | ✅ | Non-admin login lands `/talk`, full customer chrome. |
| Cross-access — plain user blocked from `/admin/*` | ✅ | Four admin routes all redirect to `/admin/login`; user credentials rejected there with *"That account isn't an operator account."* |
| Consequence clarity on irreversible / cost-incurring actions | ✅ | Paywall states card-saved-not-charged, first charge amount + GST, 3-day warning and cancellation waiver **before** the click, with a "Not yet" escape. |
| Zero dead ends | ✅ | Including the 404, which offers two routes out. |
| Every displayed price carries a tax qualifier | ✅ | `$999/month + GST` on `/plan` in all four places it appears; the arrears explainer repeats it. |
| Valuation figures correctly carry no tax suffix | ✅ | $926,000 / $1,060,000 / $138,000 / gear range all bare, correctly. |
| Legal surfaces present and not placeholders | ✅ | `/terms` and `/privacy` both live with real content; no `REPLACE` markers. (Terms' "last updated" date and version string disagree.) |
| On-screen arithmetic ties | ❌ | Dashboard states $926,000, $1,060,000 and labels the difference $138,000. Result page says $134,000. Components sum to $138,200. |

---

## Scope note

**Reached and walked, hostname asserted on every measurement:**
`/` · `/login` · `/signup` · `/auth/forgot-password` · `/talk` (incl. two live typed conversations) · `/dashboard` (375 and 1440) · `/my-genome` (incl. full fact list) · `/knowledge` · `/settings` (full) · `/setup/business` · `/business-valuation` (all 11 questions + full result page) · `/plan` (incl. pricing and the pre-checkout panel) · `checkout.stripe.com` (session minted, abandoned without a card) · `/terms` · `/privacy` · the 404 page · `/api/genome/export?format=md` (downloaded and read end to end) · `/admin/login` · `/admin` · `/admin/settings` (404).
Redirect behaviour confirmed for `/personal-journey` → `/business-valuation`, `/create-kira` → `/start`, `/introducer` → `/introducer/expired`.

**Reached only as an HTTP probe — content never rendered or never read:** `/commit`, `/onboarding`, `/pubguard`, `/start`.

**Never reached, and why:**
- **`/discovery`** — the one route I most wanted. The browser tab crashed on it every single time; its content never rendered once.
- **`/chat/[agentId]`** — no route into it surfaced from the customer UI I walked.
- **The doing loop (dispatch → approve → send)** — never surfaced. Nothing in the authenticated UI offered me a task to approve, and I would not have fired real outreach if it had.
- **`/introducer/*` and `/r/[token]`** — I have no valid referral token; the bare `/introducer` route redirects to an expired-link page.
- **`/admin/exec`, `/admin/introducers`, `/admin/loi`, `/admin/asked-for`, `/admin/trust`** — deliberately not opened; outside the bounds I was given.
- **`/setup/*` beyond `/setup/business`** — no other setup route surfaced through use.
- **The microphone.** No mic in this environment, so every voice claim in this report is about the *typed* path only. Whether she actually speaks, hears, and remembers across a real call is untested by me and remains an operator-only check.
- **Admin Settings → Password / Notifications *submitted*.** Observed as the same shared page bound to the admin's own account; the submit test crashed the tab four times and I stopped rather than report a result I hadn't got.
- **"Sign out on all devices" and "Delete account"** — untouched by instruction, in both portals.

**Not verified:** whether the signup/reset/magic-link 500s are a Supabase mailer outage or a configuration problem — I only observed the status codes and the response times. Whether the `/talk` and `/discovery` crashes are the product or my harness. Whether the 717 conversation count is wrong or just counting something other than the per-agent column. Whether the `$4,200` gap discrepancy is rounding by design or a genuine second calculation.

---

The bones of this are better than I expected. The refusal to invent a number, the honesty about the US dataset, the provenance footer on the export, the consequence panel before checkout — those are the marks of someone who has thought about what it means to be trusted by a nervous 65-year-old with his life's work on the table. That's the hard part and you've done it.

What's letting it down is the last ten per cent, and it's letting it down in exactly the places this buyer checks: the arithmetic doesn't tie, the Genome is full of the assistant talking about herself, the handover document carries a made-up ABN, and — today — nobody can sign up at all.

Fix the 500s tonight. Fix the arithmetic tomorrow. Then I'd be happy to put this in front of a client.

Thanks,
Anneke
