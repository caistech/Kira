# Platform Feedback — Kira Walkthrough (second pass)

Hi Dennis,

Persona: Ray, 66, builder, 35 years, thinking about selling and has told nobody.
URL: https://kira-rho.vercel.app | Goal: work out what this is and whether I'd hand it 35 years of what's in my head | Duration: ~55 min | Viewports: 1440px and 375px

I'll say up front: this is a lot better than it was this morning. Most of what you fixed has held, and the valuation and the Genome now read like a real product rather than a demo. So the things below are the things that are actually left, not a re-run of the last list.

---

## Landing page

- The hero does the job. "You spent thirty years building it. Now sell it for what it's actually worth." — that's me, and the paragraph under it ("Most owners start this before they've told anyone") is the line that stopped me closing the tab. Whoever wrote that has met someone like me.
- The marketplace / Voice AI Suite cross-sell is gone. Good. That was the thing that made it feel like a software shop rather than something for me.
- **The main button is in the wrong place.** At 1440px, "Find out in 3 minutes →" floats out in the left margin, level with the middle of the story card, attached to nothing. It reads like a mistake, not a call to action. The headline is centred, the card is centred, and the one thing you want me to press is stranded off to the side. Screenshot: `03-hero-cta.png`.
- **"Pricing" in the top nav goes to a section with no price on it.** I clicked it first, because that's what I do. It jumps to "See the number. Then decide." which explains why there's no price list. I understand the reasoning, and the FAQ covers it well — but the nav item is called Pricing and there is no price. Either rename it or put the band on it. A man who has been sold to for forty years reads "no price shown" as "expensive".
- **The testimonials are still anonymous.** Four quotes, all attributed to "Business". Not a name, not a trade, not a town. "My whole business was in my head. Kira got it out" is exactly the thing I'd want to believe, and an unattributed quote is the one form of evidence I discount to zero. One real first name and trade ("Col, plumber, Bendigo") beats four anonymous ones.
- Two separate 1-2-3 sequences on the same page — "Built to sell" counts 1,2,3 and then "How it works" starts again at 1,2,3. Reading top to bottom it looks like step 3 is followed by step 1.
- Thirteen slides in the hero carousel. I read two and moved on.
- Opportunity: put the plumbing example's three numbers ($220k / $582k / $1.02M) directly under the headline instead of behind a carousel. The numbers are the argument. Everything else is decoration around them.

## The free valuation

This is the strongest part of the product and I'd say that to anyone.

- The intro page is exactly right: eleven questions, three minutes, nothing to sign up for, and it tells me my answers stay on this machine. I tested stopping and coming back — it does resume where I left off. That matters to someone who might get called out to a site halfway through.
- The questions are written in my language, not accountants' language. "If you took a 3-month holiday tomorrow, what happens? — It would fall apart / I am the business" is the best-written question on the site. That is the conversation I've been having with myself for two years.
- **You have no category for a builder.** This is the one that would actually cost you the sale. I typed the word I'd type — "builder" — and got one option: **Heavy Construction**. I tried "home building": Heavy Construction again. I tried "carpentry": **Painting & Trade Contracting**. Heavy construction is roads, bridges and civil earthworks. I build houses. The list under "construction" has Concrete, HVAC, Plumbing, Painting, Electrical, Building Materials and Heavy Construction — and no plain building or general contracting. Since the sector multiple is where the entire number comes from, you are quietly pricing residential builders off a civil-works multiple. Given who this product is aimed at, that's the biggest thing left in it. Screenshot: `04-industry-suggestions.png`.
- Small thing: on the profit-trend question, two of the four options have a plain-English sub-line ("Ticking along about the same") and two don't. The two without felt like something hadn't loaded.
- Opportunity: after I pick an industry, show me the multiple it's about to use and let me disagree. "Heavy Construction — around 2.5× SDE. Not you? Pick another." Right now the single most important input to my number is a guess made by a search box.

## The result

- **The walk-away number is fixed.** "$192,000 – $288,000 — what a quick auction on $480,000 of gear typically returns (40–60c in the dollar)." The range now agrees with its own caption, and the arithmetic works. That was the thing that made me distrust the whole page this morning, and it's gone.
- Three numbers, plainly labelled, plus "the value locked inside your head right now: $902,027" and a transferability score. No jargon, no GST suffix on the valuation figures (correctly — they aren't prices). Screenshot: `06-result-top.png`.
- The "where that value is hiding" breakdown — owner dependence +$314,770, documented systems +$313,204 — is the part that made me think about it after I closed the tab.
- The US data note is now written honestly and in full ("BizBuySell's 2025 US small-business sale data... indicative benchmark, not an Australian market quote"). It's still the last paragraph on a long page, under two other disclaimers. I'd move one sentence of it up next to the numbers. Being told this after I've already got attached to $2m reads as a walk-back; being told it beside the number reads as honesty.
- Opportunity: "Save / print this" is there but I had to hunt for it. For my situation the killer feature is emailing myself a PDF I can look at on my own, twice, before I mention it to anybody. Make that the second button.

## The plan page and the price

- **$999/month + GST** appears twice, both times with the qualifier. Nobody has to guess.
- "Free while we are in beta. $999 + GST/month once billing goes live — we will tell you first." Fine, and the arrears explanation ("you're never invoiced for the month you're in") is genuinely reassuring.
- **"Beta · payments not live — Stripe is in test mode."** I know what Stripe is only because my bookkeeper mentions it. "Test mode" tells me the software is a test. Say "we're not taking payments yet" and leave the plumbing out of it.
- Tiny: it's "$999/month + GST" in one place and "$999 + GST/month" in the other.

## Signing in

- Forgot password, show/hide password, and magic link are all there. No complaints.
- The card has no heading — it opens with "Use your password, or get a one-time magic link by email." One line saying "Sign in to Kira" would settle me that I'm in the right place.

## Inside the app

- **The business name is now visible.** "Factory2Key" sits at the top of the left rail on every page, and the marketing header is gone from all of them. Held.
- **The greeting is clean.** "Welcome back — Kira remembers where you left off. Tap the mic to continue." No half-sentence about onboarding wizards. Held. Screenshot: `19-chat.png`.
- **No raw agent name with someone else's first name.** Held.
- **But the dashboard now lists six cards all called "Kira."** Business, Business, Business, Personal, Business, Business — two of them with "0 conversations". There is no name, no business, nothing to tell them apart. Your own FAQ says "each Kira is focused on one business". I have six and I can't tell you what any of them is for, and two appear to be empty. Screenshot: `17-dashboard.png`.
- **Dates are in American format.** "last 7/30/2026", "last 7/25/2026" — on a page that everywhere else writes "28 July 2026". 7/25 could be July or it could be nonsense; I had to work it out.
- **The valuation I just did did not follow me in.** I answered eleven questions and got $1,164,511 today / $902,027 locked / 34 out of 100. I sign in and the dashboard tells me $1,504,565 / $813,863 / 49 out of 100, with no explanation of where those came from and no way to redo it from inside the app. If I'd done that valuation ten minutes earlier I would now be looking at two different sets of numbers about my own business, and I'd trust neither.
- The floating orange "Talk to Kira" button sits directly on top of the purple "Start talking to Kira" button on the dashboard. Two buttons, same job, overlapping.

## The Genome — mine vs your example

I did what you'd expect: I opened your public example and my own side by side.

**What's genuinely fixed.** Every entry now leads with a plain statement of fact ("Active projects under Factory to Key include Lot 91, Lot 442, and Lot 109 in Geraldton"), every section carries a coverage label, and there's a "Still only in your head" panel at the bottom naming what's empty. Mine is thin — nine things — and thin-but-honest reads fine. I'd rather see six real facts and a list of what's missing than forty invented ones. Screenshot: `14-my-genome-full.png`.

**Where it still isn't the same product.** Three specific things:

1. **Your example scores each section as a percentage — "78% documented", "22% documented" — and gives an overall "on the page, not in your head: 62%". Mine gives a word: Building, Only a start, Not captured.** A word doesn't move. A percentage does, and the whole promise is "this number goes up every time you talk to her".
2. **Your example distinguishes "You confirmed this" from "Captured — not yet confirmed".** Mine only ever says "You said this on 25 July 2026". The confirmed/unconfirmed split is the thing that would make a buyer's accountant take the document seriously, and it's the thing that would make me trust that Kira isn't just writing down whatever she thought she heard.
3. **Your example lists, per section, the actual questions still missing — "why the fourth builder stopped calling in 2023 — and whether that relationship is recoverable".** That is the single most impressive line on your public page, because it proves she knows what she doesn't know. Mine names one whole section ("How work is priced and quoted") and stops. Section titles are not questions.

Two smaller things in mine: the entry titles mix registers — "Manage lot 109 operations with key consultants" is a to-do, not a fact about the business — and one captured "fact" is my own email address recorded as a supplier detail ("Contact details dennis@factory2key.com.au are provided for Roger at Quantum Surveys"). That's a mechanical detail of a task, not something a buyer's advisor needs.

## Talking to her without a microphone

This is the one I'd stop on.

My office PC is a tower with no microphone. I clicked "Talk to the assistant" and got:

- a **text box** — "Type or paste to the assistant" with a Send button. Good, that's the fix, and it's there.
- underneath it, in red: **"Requested device not found."** That is a computer talking to a programmer. It doesn't say what device, or that it means my microphone, or that I can type instead.
- above it, still: **"Ready when you are — tap the mic below to talk with Kira"** and "Tap the mic to continue." There is no mic button on the screen any more. The page is telling me to do something it has just removed.

Then I typed a real sentence about how I price jobs, and pressed Send.

**Nothing happened.** The box emptied, no message appeared on screen, no reply came, no error. I waited. I did it twice, on two clean restarts, and checked the browser console both times — no errors, nothing. The box takes what you type and drops it.

I'd rather have had the red error on its own. A dead end I can see is honest; a box that swallows 35 years of knowledge and says nothing is the thing that would make me close the tab and never mention it to anyone. Screenshots: `21-no-mic.png`, `22-typed-message.png`.

(Method, so you can reproduce it: I made the browser report no microphone, which is what a machine without one does, then clicked the mic button and typed into the box that appeared.)

Opportunity: don't wait for the failure. Put "No microphone? Type to her instead" on the screen from the start, as a second button next to the mic. Half your buyers are sitting at a desktop tower in a demountable office on a building site.

## Settings

- Thorough, and better than I expected. Profile, business name with the registered entity and ABN and address, connected accounts, plan, password, notifications, delete account. The line "The name, ABN and address that appear at the bottom of every email Kira sends for you" is exactly right — I want to know what goes out under my name.
- **"You're on a paid plan"** — while the plan page told me it's free during beta and nothing is charged. I'd read that as "they've started billing me."
- "$0.00 of $20 used" with no explanation of what the $20 is or whether it includes GST. It's described as a fair-use allowance for voice, but it's shown as dollars, so it looks like a bill.
- I did not press "Cancel my plan" or "Delete account" — not my account to break — so I can't tell you whether they confirm properly. Both name their consequence in the text above them.

## Admin

Went to /admin as myself. Bounced to an admin login with "That account isn't an operator account. If you came here to use Kira, sign in as a user instead." Correct, and plainly said. Only gap: no link back to the user sign-in from that page, so it tells me where to go and doesn't take me.

## Phone

Checked everything at 375px. No sideways scrolling anywhere. Text is a readable size. The landing collapses to a hamburger, and inside the app the left rail collapses to a hamburger with the same items. The Genome numbers stack properly.

- **/advisors now has working navigation at 375px** — Home, Example, Pricing and Request access are all there and reachable. Held.
- On /advisors the word "Kira" and the word "Home" touch with no gap — reads as "KiraHome".
- The "Report a problem" tab and the orange mic both sit on top of body text on a phone. On the landing the tab covers the middle of the paragraph that explains what this is.

---

## Fixes re-checked

- **/my-genome resembles the public example** — **PARTIALLY HELD.** Plain statement of fact per entry ✅, coverage label per section ✅, "Still only in your head" panel ✅. Not yet the same product: word labels instead of percentages, no confirmed/unconfirmed distinction, and the missing-questions list names a section rather than the actual questions. Thin-but-honest reads fine; it's the vocabulary that diverges.
- **Signed-in greeting** — **HELD.** "Welcome back — Kira remembers where you left off. Tap the mic to continue." Clean, no garbled memory string.
- **Business name in the chrome / marketing header gone** — **HELD.** "Factory2Key" at the top of the left rail on dashboard, genome, knowledge and settings; no marketing header on any signed-in page.
- **No microphone → text input** — **PARTIALLY HELD, AND WORSE IN ONE WAY.** The text box exists. It only appears after you press a mic button that then fails, the failure is still a raw red "Requested device not found", the page still instructs you to tap a mic that's gone, and **typing into the box produces nothing at all** — reproduced twice from clean restarts, no console errors.
- **Walk-away figure is a range agreeing with its caption** — **HELD.** "$192,000 – $288,000" against "$480,000 of gear... 40–60c in the dollar". Arithmetic checks out. (The landing's example card still shows a single "$220k", but it carries no 40–60c caption, so nothing contradicts itself.)
- **Marketplace / Voice AI Suite cross-sell gone from the landing** — **HELD.** Searched the full page text; neither term appears.
- **/advisors navigation at 375px** — **HELD.** Nav renders and all four links are reachable; no horizontal scroll.
- **Dashboard no longer prints a raw internal agent name with another person's first name** — **HELD**, but replaced by six cards all named "Kira", two of them empty, with nothing to tell them apart.

---

## Other strategic suggestions

- **Let me put my own valuation in, and keep it.** The number on my dashboard should be the number I got from the eleven questions, with a "these are my answers, change them" link. Right now the free tool and the paid product disagree about my business and neither explains itself.
- **Show the transferability score moving.** "49/100 — we grow this every week" is a promise. Show me last month's, this month's, and which single conversation moved it. That's the only proof that talking to her did anything, and it's the thing I'd show my accountant.
- **A "what I'd tell a buyer today" one-pager.** You already have "Download the handover document". Put a version of it on screen — one page, the six sections, what's documented and what isn't, stated honestly. That's the artefact I'd actually take to a broker, and it's what turns this from software into evidence.
- **Say what happens if I die.** Blunt, but it's what men my age are actually thinking about. A documented business that my wife or my kids could hand to someone is worth more than any multiple you can show me, and nobody on this site says it.

---

## Standards check

- ✅ **Responsive** — 375px and 1440px both clean; scrollWidth equals clientWidth on landing, advisors, valuation and genome; 16px base text; hamburger on landing and inside the app; choice buttons on the valuation are full-width and well over 44px.
- ✅ **Auth-page pattern** — forgot-password link, show-password toggle, and "Email me a magic link" all present on /login.
- ✅ **Authenticated chrome + Settings** — persistent left rail on every signed-in page, Settings and Sign out anchored at the bottom with the account email, /settings reachable in one click.
- ✅ **Explanatory header** — every page opens with what it is and what to do. The valuation intro and the Genome header are the best two on the site. Only /login is thin (a sentence, no heading).
- ✅ **Voice agent** — "Talk to Kira" floats on every signed-in page; one click.
- ✅ **Scaffold metadata** — "Kira — your fractional exec" / "For brokers & accountants · Kira". Product name present. ("Fractional exec" is a phrase I've never heard, but that's a copy note, not a standards fail.)
- ✅ **Dual-portal separation** — user sign-in lands on /dashboard, a real user home; /admin bounces a non-admin to /admin/login?error=not_admin with a plain explanation.
- ⚠️ **Consequence clarity** — Delete account and Cancel my plan both name their consequence in the text above the button. I did not press either, so I can't confirm the confirm step.
- ❌ **Zero dead ends** — the no-microphone text box takes what you type and does nothing with it, with no message. Also: the not-an-admin page tells you to sign in as a user without linking there.
- ✅ **Prices show + GST** — $999/month + GST in both places on /plan. Valuation figures correctly carry no suffix. One soft spot: Settings shows "$0.00 of $20 used" with no qualifier on the $20.

---

## VERDICT: FAIL

**A man with no microphone can now find the text box, type 35 years of knowledge into it, press Send, and watch it vanish with no message — which is a worse failure than the dead end it replaced, and it sits directly on the one action the whole product is for.**

Second and third, if you want them ranked: the industry list can't classify a builder, so the number the entire product rests on is computed off a civil-works multiple; and the valuation I did as a stranger doesn't follow me into the account, which then shows me different figures for my own business without explaining where they came from.

Everything else on this page is polish, and honestly the polish is good now. Fix the text box and I'd sign in again.

---

*Scope note: I did not press Cancel my plan or Delete account, and I did not complete a live voice conversation (no real microphone). The no-microphone behaviour was produced by making the browser report no audio device, which is what a desktop without one does; I reproduced it twice from clean restarts before writing it up. The browser tab crashed repeatedly on the voice pages during this run; where that happened I re-ran from a clean start and only reported what I could reproduce. The account I used holds another business's data (Factory2Key), so the number of Kira agents and the contents of the Knowledge page may be testing residue rather than what a new owner would see — the point stands that the screen gives me no way to tell them apart.*

Thanks,
Ray
