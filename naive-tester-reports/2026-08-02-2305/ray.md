Hi Dennis,

Platform Feedback — Kira Walkthrough (second look)
Persona: Ray (66, exiting owner)  |  URL: https://kira-rho.vercel.app  |  Goal: would I let my accountant or my broker see this, and would I keep using it  |  Duration: ~75 min

**No. Still no — and for the same reason as last time.** The handover document, the one file you build to hand to an advisor, opens by promising it "deliberately does not cover the owner's own position — his plans, his circumstances", and then eleven paragraphs later prints "The owner is considering selling the business after running it for 35 years but has not told anyone yet." Same defect, same file, second walkthrough. What makes it worse this time is that the raw export shows your own system had already tagged that line `privateReason: "exit-intent"`. You know it's private. The document prints it anyway. That is not a missing feature, that is a guard that fires and gets ignored, and the one thing I cannot risk is the file I email my accountant being the file that tells him I'm selling.

Everything else below is worth reading, because a lot of it is genuinely good. But that is the gate, and it is shut.

---

Landing

- The headline does the job. "You spent thirty years building it. Now sell it for what it's actually worth." I read the whole page before touching anything, which is what I always do, and it never once made me feel like I was being sold to by someone half my age. The "For owners whose business still runs on them" line at the top is the first thing I've seen that describes me rather than a market segment.
- The walk-away / today / captured triple with the $438k gap on a real plumbing business is the single most persuasive thing on the page. It's a number, it's specific, and it's about somebody like me. Keep it.
- Prices carry "+ GST" everywhere on this page — $499 + GST to $4,999 + GST. Good. That is the difference between me trusting a number and me assuming you're hiding ten percent.
- The FAQ answer about advisors is the right level of blunt: "If an advisor introduced you, they can see that you signed up and how your valuation is moving — never what you and Kira discuss." That's the question I'd have asked and you answered it before I asked. It matters more than you probably think.
- Small thing: at 375px the "Sign in" in the header wraps onto two lines next to the orange button. Looks unfinished on the first screen a phone visitor sees.
- The "Report a problem" tab on the phone is a black square about 42px across pinned to the right edge, halfway down. Touch targets on a phone are supposed to be at least 44 — this is under, and it's the one control that's *always* there. More on where it sits below.

Opportunity: the FAQ says the AI providers you use are under paid terms that exclude training on customer data. That sentence is worth more than the whole "Every Kira is different" section, and it's buried at question seven. For a man deciding whether to type his turnover into a website, "we are contractually not allowed to train on you" is the headline, not the footnote.

---

User Path

**Signing in shows a code error before it shows a login box.**
Navigate to /login and the first thing that paints is a red box reading "AuthForm is missing a Supabase client. Pass createBrowserClient from @supabase/ssr (with supabaseUrl + supabaseAnonKey) or a pre-built supabaseClient prop." It's in the server HTML — `curl` the page and it's right there — and it gets replaced by the real form once the JavaScript settles. On your machine that's a blink. On my laptop, on the connection I have at the yard, it isn't. A man who is nervous about whether this thing is real sees a red error message full of code on the sign-in page and closes the tab. He does not report it. (04-login-flash.png / 05-login-settled.png)

**Where it lands, and getting around.**
Signing in drops me on /talk with Kira's face and a mic button. Fine. The left rail has Overview, My Genome, Knowledge, Settings, Sign out — it's on every page inside the app, the active item is marked, and on the phone it folds into a hamburger that has the same items. That part is done properly.

But two of the most important screens fall out of it entirely:

- **/business-valuation** loses the whole left rail. Mid-questionnaire, the only two links on the page are the Kira logo and the word "Kira", and both go to the public marketing home page. So if I get to question six and want to check something in my Genome, the only way back into my own account is the browser back button or typing an address. I don't type addresses.
- **/plan** — same. No rail, no way back to my dashboard.

**The eleven questions.**
The questions themselves are the best-written thing in the product. "If you took a 3-month holiday tomorrow, what happens? It would fall apart — I am the business." That is a question written by someone who has actually sat opposite an owner. The profit question explaining SDE with a worked example ($150k kept + $50k you pay yourself = enter $200,000) is exactly right for a man who has never used the letters SDE in his life.

Frictions in it:

- The intro, entered from *inside my own account*, says "Nothing to sign up for", asks "What should we call you? — First name (optional)", and closes with "Nothing is sent anywhere until you decide to sign up." I have signed up. I'm logged in. My business name is on the screen behind it. Being asked my first name by a product I'm already paying attention to is the moment it stops feeling like it knows me. (08-valuation-q1.png)
- The industry list has no plain builder in it. Typing "builder", "residential", "general" or "carpentry" returns nothing under Construction except Concrete, Heavy Construction, Electrical & Mechanical, HVAC, Painting & Trade, and Plumbing. I build houses. I ended up on "Heavy Construction", which is roads and civil, and that sets the multiple every number on the next page depends on. To your credit the no-match state is honest — "we'll use the overall market-average multiple — but a closer match gives a better number" — but the gap is real for the largest trade in the country.
- Credit where it's due: typing a full exact sector name auto-matches and says "Matched to Plumbing — we'll use that sector's average multiple". I went looking for a bug there and there isn't one.

**The result screen — the strongest page you have.**
$168,000–$252,000 walk away. $1,290,000 today. $2,270,000 captured. $982,000 locked in my head. Transferability 36/100.

This is talking to a customer, not selling to a stranger, and no price is quoted anywhere on it. The paragraph explaining *why* the gear figure is a range and the two business figures aren't — "putting a ± on them would be inventing a precision we do not have" — is the sentence that made me take the whole thing seriously. So is telling me where the multiples come from: US BizBuySell data, ~9,500 deals, no equivalent Australian dataset, "an indicative benchmark, not an Australian market quote". A broker told me my business is worth less than I think and gave me less working than that. (11-valuation-result.png, 12-result-top.png)

**The figures don't tie, and you're the one who taught me to check.**
Because that page makes a virtue of rounding, I checked the arithmetic. $2,270,000 − $1,290,000 = $980,000. The page says $982,000. The four "where the value is hiding" items add to exactly $982,000, so the gap is right and the two headlines are rounded — but the sum on screen doesn't work, and the whole reason I trust the page is that it told me it was being careful with precision. Then it gets worse across surfaces:

| Screen | Worth today | Gap |
|---|---|---|
| Result page | $1,290,000 | $982,000 |
| My Genome | $1,290,000 | $982,000 |
| /plan | — | **$981,990** |
| Handover document | **$1,286,802** | **$981,990** |

The document I'd hand an advisor quotes my business to the dollar — $1,286,802 — off eleven multiple-choice answers. He would laugh at it, and he'd be right to.

**/plan.**
It knows my valuation, which is the right instinct. It does not know I have an account. "You set your password and meet Kira right after" — I set my password an hour ago. And then:

**"Start now — free while in beta" drops you straight onto a Stripe card form, in test mode, in production.**
One click, no confirmation, no "here's what happens next", and I'm on a checkout page that says **Sandbox** in a black badge next to your company name, quotes "A$999.00 per unit, billed monthly based on usage", shows "Price varies" twice, and asks for my card and phone number. Three problems in one screen: (a) a man who has just been told "no card is charged" is now being asked for a card with no warning; (b) "per unit", "based on usage" and "Price varies" are not what you sold me — you sold me a monthly fee sized to my gap; (c) the A$999.00 has **no GST on it at all**, on the one screen in the entire product where the number actually matters. Every other price in the product carries "+ GST" correctly. This one doesn't. (14-stripe-sandbox-checkout.png)

I'd have stopped there in real life. The word "Sandbox" on a payment page is the end of the conversation.

**My Genome — good page, two broken promises.**
The nine areas, each with the buyer's-advisor question under it, and "Nothing here yet — this is still only in your head" for the empty ones, is a genuinely good piece of design. Naming what's missing is braver than hiding it and it's the reason the transferability score means anything.

The privacy paragraph is the right paragraph: "This page is yours. It is never shared with anyone you have referred or been referred by, and it is never shown to a buyer — only the handover document is, and that leaves out your own position. Our support team can see what Kira has captured when they need to keep the service running."

Two things break it.

1. **The handover document does not leave out my own position.** Covered at the top. Note also that the page says the document "leaves out anything marked *yours only* above" — nothing on the page is marked "yours only". There is no such marking visible anywhere. The promise references a label that doesn't exist on screen. (handover.md, raw.json)

2. **"The raw data is everything we hold" is not true.** The page says two things are captured. The raw JSON export contains two. Your admin console, on the same account, lists **twelve** memory facts — including four separate near-identical restatements of the sale intention, and this one, which you should read out loud:

   > "The owner explicitly restricts access to all conversation content to only himself and the assistant; no other party, including accountant or staff, can access this information without his permission."

   That sentence — me telling Kira nobody else may see this — is displayed verbatim on an operator screen. I'm not saying you shouldn't have support access; you disclose it and that's fair. I'm saying the export button labelled "everything we hold" hands me two of twelve, and the ten it withholds include the four copies of my secret. If I ever compared the two I'd never trust the product again. (21-admin-manage-ray.png)

**The handover document's own provenance line contradicts the app.**
The document says "Every entry above carries its provenance. **0 of 0** are dated to the conversation in which the owner stated them." My Genome says "2 things captured. **2 of them** are dated to the conversation you said them in — that is what a buyer's accountant will want to see." The raw JSON agrees with the app (`sourced: 2`). So the file I'd send the accountant tells him none of it is sourced, when it is. You've made the document undersell itself.

**Settings.**
Complete and calm. Profile, business details, connected accounts, plan and usage, password with a show/hide eye, notifications, sign-out-everywhere, delete account. "There's no card on your account, so nothing can be charged" is a good sentence for a suspicious man. Business details runs a real ABR lookup — I typed "Nolan Building" and got four real companies back with their ABNs and states, which is exactly right. (16-settings.png, 18-setup-business.png)

Two notes: the street address is four plain text boxes with no lookup, while the company field has one — inconsistent, and the address goes on the bottom of every email you send for me. And the account is currently sitting on ABN 99 999 999 999, which is not a valid ABN, and that number flows straight into the handover document and (per your own copy) into every email footer. Nothing stops it.

**On the phone, two floating buttons sit on the words.**
On My Genome at 375px, the orange "Talk to Kira" mic covers the text of "Nothing here yet — this is still only in your head" in the card behind it, and the black "Report a problem" tab overlaps the right edge of the "How work is priced and quoted" card. Further up it sits across the sentence "2 things captured. 2 of them are dated…". Neither is fatal, but I'm reading a page about what a buyer can see and there's a button parked on top of the sentence. (23-genome-mobile.png, 24-genome-mobile-fab-overlap.png)

On desktop the "Report a problem" tab overlaps the top-right corner of the dashboard card but doesn't cover any text. That one's fine.

**Small language thing that landed oddly.**
My own Genome page asks "Where does work come from, and does it come to **him** personally?", "Could someone else reach **his** number?", "Does the work happen without **him** on site?" I understand these are the buyer's advisor's questions. But on my own screen, about my own business, being referred to in the third person reads like I've walked in on two people discussing me. On the example Genome at /genome you use "the owner", which is easier to take.

**The example Genome (/genome) is the best page in the product — and it doesn't match the product.**
"Three builders supply roughly 60% of turnover. Hartley Constructions, Vaughan Homes and Ridge Developments. All three came through the owner personally; Hartley since 1998. None are on a written contract — work is allocated by a phone call to the owner, usually on a Friday." That is the thing. That is what I want and I'd pay for it. Show me that earlier.

But it has six sections with different names to the nine on my real Genome page. I was sold "How work comes in / Suppliers and terms / Things only you know" and given "Where the work comes from / Money in, money out and terms / Systems & records". Nobody dies, but the demo and the product should use the same words.

Opportunity: the example shows "You confirmed this · Conversation, 12 March" against each line, and my real page says nothing has been read back to me yet. That read-back loop is the whole value — a fact I've confirmed is worth ten a machine inferred. Get that visibly running early, because it's the difference between notes about me and a document about my business.

Opportunity: nowhere does the product acknowledge that I might be doing this without telling anyone, even though it clearly knows — it captured that fact within minutes. A single line on the Genome page saying "nothing here is visible to your staff, your accountant or your family unless you send it" would do more for me than any feature on the roadmap. Right now I have to infer it.

---

Admin Path

- Signing in at /admin/login with the operator account lands on a working console: 22 users, 18 agents, 708 conversations, recent users and agents. The left rail is Overview / Kira Exec / Introducers / LOIs / Asked for / Trust / Settings / Sign out. It works on the phone too — hamburger, cards stack, no sideways scroll. (20-admin-overview.png, 22-admin-mobile.png)
- Straight-talking banner at the top: "TEST billing — No real money moves. Stripe is on test keys — flip STRIPE_LIVE_MODE to true and redeploy to go live." Good that you know. Bad that the customer-facing /plan page doesn't, and sends people to a Sandbox checkout anyway.
- **Kira Exec** lists every real owner with name, email, value gap, before/after figures, transferability score, industry, conversation/agent/document/memory counts, an "Open their Kira" button and a "Manage" link. I could see another owner's gap of $4,260,000 and their $15.3M business sitting one row below mine. That's the operator's job and I don't object to it existing — but it is a long way from the mental picture your copy paints, and it is the screen that has to match the promise exactly.
- **Manage** on an owner shows every memory fact verbatim, as covered above. This is where the "everything we hold" export claim dies.
- **/plan** tells prospects "You only ever talk to Kira. Behind her is software that does the work and keeps the record — not a team of people. **Nobody reads your conversations.**" The distilled content of my conversations is printed, in full sentences, on an operator screen. Whether or not a human ever looks, that sentence is stronger than the product can support. My Genome's wording ("our support team can see what Kira has captured when they need to keep the service running") is honest. Make /plan say the same thing. If those two ever get quoted back at you side by side, only one of them survives.
- **Introducers** is clear and the model is stated up front: "They can see their owners' progress — never their conversations", 10% of what the owner pays, monthly. I did not add an introducer because doing so sends them live emails, so I could not verify what an introducer actually sees. Marked "—" below.
- **Trust** is the page I did not expect and the one that would move me most as a buyer of this product. 87% of 500 attacks held across 25 runs, eight named attack classes, breaches listed by name and time, and a header telling me to read the rate over time rather than the last run because the suite is non-deterministic. Two of the eight are sitting at 61% and 66% — "entity separation" and "a refusal leaves a record" — and you show that rather than hide it.

Opportunity: that Trust page is a sales asset and it's locked behind the operator login. A version of it — pass rates, the eight things people have tried, the honest low numbers — shown to *me* would answer the question I actually have, which is not "is it clever" but "can it be talked into things". Nobody else selling AI to owners my age is publishing their failure rate. That's a moat and it's currently in a cupboard.

---

Cross-Path Issues

- A non-admin account hitting /admin, /admin/users or /admin/exec is bounced to /admin/login?error=not_admin with "That account isn't an operator account" and a "Sign in to use Kira →" button back to the product. Correct behaviour and a courteous message. (19-not-admin.png)
- The user path reaches a real product home (/talk, /dashboard) that is nothing like /admin. No facade.
- The operator account can sign in through the *user* login form and lands in the user app — which is right, since the operator is also a user.
- The one real cross-path problem is the promise mismatch already described: /plan's "Nobody reads your conversations" versus what /admin/exec/:id renders. Two surfaces of the same product telling opposite stories about the same data.
- Also worth noting: leaving the app for the Stripe checkout and coming back left me signed out and staring at /login again. Twice. If a customer bails out of checkout, they should land back where they were, not at a sign-in box.

---

Other Strategic Feature Suggestions

- **Publish the failure rate.** Covered above. The Trust page, cleaned up and shown to prospects, is the single most differentiating thing you have, and it costs nothing to expose.
- **Let me set the boundary rather than infer it.** One control on the Genome page: "This entry is mine, not the business's." Show me which lines are flagged, let me flag more, and print that flag on the handover document as the reason a line is absent. You already store `privateReason`. Surface it, and the file becomes a document I'd hand over with confidence instead of one I'd have to read line by line first — and reading it line by line is exactly the work I'm paying you to remove.
- **A "what your accountant will see" preview button.** Next to the download, a button that renders the handover document on screen with a one-line header: "this is what leaves; everything else stays." I would press that before I pressed anything else, and today the only way to find out is to download a file and read it.
- **The valuation should follow the account, not the device.** "Your answers stay on this device — for 7 days, on this device only" is honest, and right for a stranger. For someone signed in it's a bug in disguise: I start on the office computer, finish at the kitchen table, and it's gone. Save it against the account the moment I'm logged in.
- **Give the builders a home.** Add residential/general building, carpentry and civil as distinct sectors. Construction is the biggest small-business category in the country and the list currently sends every house builder to the wrong multiple.
- **Kill the beta card ask.** If nothing is charged, don't ask for a card. "Free while in beta" followed immediately by a Stripe form is the exact shape of every sign-up trap I've been burned by, and I am not the only 66-year-old who reads it that way.

---

Standards Check (portfolio non-negotiables)

- ✅ **§1 Responsive** — 375px and 1440px both work on landing, dashboard, genome, settings and admin; `scrollWidth` equals `innerWidth` on every page checked; nav folds to a hamburger with the same items.
- ❌ **§1 Touch targets / occlusion** — the "Report a problem" tab measures 42×42 at 375px (under 44), and on My Genome at 375px both the mic FAB and that tab render on top of body text (24-genome-mobile-fab-overlap.png).
- ✅ **§2 Auth-page pattern** — forgot-password link, eye toggle on the password field, "Email me a magic link" all present on both the user and admin forms.
- ❌ **§2 Auth page renders a developer error** — the server HTML of /login contains "AuthForm is missing a Supabase client. Pass createBrowserClient from @supabase/ssr…" and paints it before hydration replaces it (04-login-flash.png).
- ✅ **§4 Authenticated chrome** — persistent left rail with Settings and Sign Out on /talk, /dashboard, /my-genome, /knowledge, /settings, /setup/business and every /admin route; active-route marked.
- ❌ **§4 Chrome missing on two authenticated journeys** — /business-valuation and /plan drop the rail; mid-questionnaire the only links are the logo and "Kira", both to the public marketing home.
- ✅ **§4 Settings page** — Profile, Business, Password, Notifications, Devices, Account, all reachable in one click from the rail.
- ✅ **§5 Explanatory header** — every page I opened leads with what-it-is/what-to-do, including the empty Knowledge page and the empty Genome sections.
- ✅ **§6 Voice reachable** — "Talk to Kira" is in the chrome on every authenticated page and /talk is one click from the rail. Reachability only; no microphone here.
- ✅ **§7 Scaffold metadata** — `<title>` is "Kira — your part-time general manager" (and "Sign in · Kira" behind auth); /favicon.ico returns 200 as an icon, plus an apple-touch-icon. No "Create Next App".
- ✅ **§8.5 Dual-portal separation** — user path reaches /talk and /dashboard, distinct from /admin; non-admin hitting any /admin route is rejected at /admin/login?error=not_admin with a plain-English message and a way back.
- ❌ **§9 Consequence clarity** — "Start now — free while in beta" on /plan goes straight to a Stripe checkout demanding card details, with no statement of consequence and no confirm step.
- ❌ **§9 Price without tax qualifier** — the Stripe checkout shows "A$999.00 per unit" with no GST anywhere on the page. Every other price surface carries "+ GST" correctly, and the valuation figures correctly carry none.
- ❌ **§9 Zero dead ends** — abandoning the eleven questions from inside the app has no route back to the account; the only exits are the marketing home page.
- ⚠️ **§9 Address / ABN fields** — company field runs a real ABR lookup ✅; street address is four plain text inputs with no autocomplete ❌, and an invalid ABN (99 999 999 999) is stored and printed into the handover document and the email footer without validation.
- ❌ **Stated-promise integrity** — the handover document contradicts its own opening paragraph; "the raw data is everything we hold" returns 2 of 12; "0 of 0 are dated" contradicts the app's "2 of them are dated"; "Nobody reads your conversations" contradicts /admin/exec/:id.
- — **Introducer visibility** — could not verify what an introducer actually sees without sending live emails to a real address.
- — **Voice behaviour and memory** — no microphone on this machine; reachability only.
- — **Password reset, magic link, delete account, sign-out-everywhere** — not exercised (the last two are operator-verified by rule; the first two need a mailbox).

Scope note: about 75 minutes. Covered the public landing at both viewports, the sign-in flow, the full eleven-question valuation end to end from inside the app, the result screen, /plan, the Stripe checkout it opens, My Genome, both exports read in full, Knowledge, Settings, the business-details editor, the example Genome at /genome, the 404 page, and the admin console (Overview, Kira Exec, an owner detail page, Introducers, Trust) on desktop and phone. Not covered: voice, password reset, magic link, introducer dashboard, LOIs, "Asked for", Google Drive connection, and anything requiring a second account. The browse daemon died three times mid-session; anything odd around those moments was retested from clean before it went in here, and one thing I had written down as an industry-search bug turned out to be the search working correctly and has been removed.

Last thing, and I mean it kindly. The parts of this that are good are *very* good — the eleven questions, the result page, the example Genome, the Trust page. Someone has thought hard about a man in my position and it shows. Which is exactly why the handover document matters so much: it is the one artefact that leaves the building, and right now it is the only part of the product that would do me harm.

Thanks,
Ray
