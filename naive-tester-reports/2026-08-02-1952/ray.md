Hi Dennis,

Platform Feedback — Kira Walkthrough
Persona: Ray (66, exiting owner) | URL: https://kira-rho.vercel.app | Goal: decide whether I'd let my accountant or my broker see this, and whether I'd keep using it | Duration: ~55 min

Before anything else: the writing on this thing is the best I've seen on a business website in a long time. Whoever wrote the hero paragraph and question 8 has actually sat across a table from someone in my position. I want to say that first, because most of what follows is criticism and I don't want it read as a verdict on the idea.

The verdict is: **no, I would not show this to my accountant today**, and it's not because the numbers are wrong. It's because of one file and one screen. I'll get to those.

---

## Landing

**The pitch lands.** "You spent thirty years building it. Now sell it for what it's actually worth." Then the paragraph underneath — that a buyer isn't buying an asset, they're buying me, and they price it accordingly. That's the sentence a broker said to me in about four hundred words and I resented him for it. Here it's forty words and I didn't. "Most owners start this before they've told anyone" is the line that made me keep reading instead of closing the tab. Somebody knows.

**The main button is broken.** The big pink "Find out in 3 minutes →" pill — the one thing you presumably want me to press — is sitting off in the left-hand margin of the page, squashed down to about the width of a business card, wrapped onto two lines, level with the middle of an unrelated picture card. It's not next to the paragraph it belongs to. It looks like something fell off. On a laptop at normal width I scrolled straight past it and found the smaller "Value my business" in the top corner instead. Technically: the button and the whole six-month slideshow module are siblings in one `flex-row items-center justify-center`, so at desktop widths the card eats the row and the button gets crushed into the leftover 166px. (`02-landing-cta.png`)

**"Your fractional exec."** That's in the browser tab and at the top of the app. I have no idea what a fractional exec is. Neither does my wife, neither does my accountant. I know what a part-time general manager is — you use that phrase further down the page and it's much better. Similar for "platform" and "onboarding" wherever they turn up.

**The pricing section is genuinely well done** and it's the reason I trusted the rest. $499 + GST to $4,999 + GST, GST stated, AUD stated, and the FAQ answers the three things I'd actually ring up about: what happens to my data if I cancel, will my information be used to train AI, and how do I cancel. The "you're never invoiced for the month you're in, and if you cancel that month is on us" is unusual enough that I read it twice. Keep all of that.

**Small things.** The "conversation you've had with yourself" carousel opens on a picture of an empty desk with two laptops on it, which says nothing. On a phone the top bar is cramped — "Sign in" wraps onto two lines and gets pinched between the logo and the orange button. And the "Every Kira is different / other AI assistants ❌" comparison block reads like a startup pitching other startups; it's the weakest writing on a strong page and it sits directly under the strongest.

*Opportunity:* the plumbing example with the three numbers ($220k / $582k / $1.02M) is the most persuasive thing on the page and it's buried below three screens of scrolling. That block, plus the hero paragraph, plus the button, is the whole landing page. Everything between them is delaying the only thing I want to do, which is find out my number.

---

## User Path

### Signing in dumps you somewhere with no way out

I signed in and landed on a page called `/talk`. A picture of Kira, a box to type in, a microphone, and the word "More" at the bottom. That's it. No menu. No settings. No sign out. Pressing "More" gives three choices: *Add knowledge*, *Share Kira*, *Complete project*. I don't know what any of those mean, and one of them is called **Share Kira**, which for a man who hasn't told his own staff he's selling is the exact word that makes me stop touching things. (`07-after-login.png`, `09-more-menu.png`)

I only found the real product because I guessed at `/dashboard` in the address bar. That page has everything — a proper menu down the left, My Genome, Knowledge, Settings, Sign out, and the valuation card. **None of it is reachable from the page you land on after signing in.** If I'd been on my own I'd have closed the tab and assumed I'd bought a chatbot.

Also, the moment I arrived it said "Welcome back — Kira remembers where you left off." I'd never been there. Nought conversations. Don't tell me you remember me when you don't; it's the one claim the whole product rests on.

Smaller: the logo changes from the pink circle on the website to a green square in the app. I noticed and wondered if I was on the right site.

### The eleven questions — this part is good

I did the whole thing. Roughly $3.4M turnover, $520k after everything including what I pay myself, growing steadily, margins getting squeezed, a few big clients, and if I took three months off it would struggle.

- **Question 8 — "If you took a 3-month holiday tomorrow, what happens?"** with the options "It would fall apart / I am the business" through to "It would run fine / Fully under management" is the best question on the internet about my business. That's the conversation, right there.
- **Question 3** asks for profit *with my own wages added back*, then gives a worked example ($150k kept + $50k paid to me = enter $200,000). I'd have got that wrong without the example. Good.
- **The industry list** is decent — carpentry, electrical, earthmoving, landscaping all found something. But it doesn't know the word **joinery**, which is what half the blokes I know call their business. To its credit it said so plainly ("No sector match for 'joinery' — you can carry on, we'll use the overall market average") instead of pretending. That honesty is worth more than the coverage. Add the Australian trade words anyway.
- Question 4's answers are inconsistently written: two of the four have a plain-English line underneath ("Ticking along about the same") and two don't. Looks half-finished.
- The turnover box has little up/down spinner arrows on it. If I scroll the page with the cursor over that box I'll change my turnover without knowing.

### The result — the numbers are sound, the copy is selling to me again

Walk away $180k–$270k. Worth today $1,440,000 at 2.8× SDE. With my knowledge captured $2,600,000 at 5.0×. Gap $1,160,000, transferability 34/100.

I did the arithmetic because that's what I do. 520 × 2.8 = 1.456. 520 × 5 = 2.6. The four "where the value is hiding" line items add to $1,159,000 against a stated gap of $1,160,000. 40–60 cents on $450k of gear is $180k–$270k. **It all ties out.** That matters more to me than anything you could write.

And the note about where the multiples come from — that it's BizBuySell US data, ~9,500 deals, that there is no equivalent Australian dataset, that the AIBB database is members-only, that Australian brokers use the same US numbers for that reason, and that it's indicative and should be checked locally — is the single most credible paragraph on the site. Most people would have hidden that. I'd show *that paragraph* to my accountant.

**But three things are wrong with this screen, and I gather they're the ones you wanted looked at:**

1. **It quotes me a monthly fee.** In the box at the bottom: *"For your business that comes to **$1,999 + GST a month** — about 2.1% a year of what you stand to unlock."* I am already a paying customer sitting inside my own account. Being handed a price again reads like a second invoice, and it turned a moment where I was quietly impressed into a moment where I was being sold to. (`28-result-price.png`)
2. **The heading is "Your indicative valuation / Ray, this is what your business could be worth."** Not "That's your starting point". From inside the app, "starting point" is right — it's the number I'm going to be measured against. "What your business could be worth" is a sales headline.
3. **The button says "Start building your Business Genome" and it goes to `/plan`** — not back to Kira.

And `/plan` is a dead end. It says: *"Let's find your number first. This page is built around the value gap in your business. Take the 3-minute valuation and it'll bring you right back here."* I had **just finished it**, from a button on my own dashboard, and the page it sent me to told me to go and do it. The only two links on it send me back to the valuation. Round in a circle. (`36-plan.png`) Meanwhile the dashboard has my figures on it perfectly well, so `/plan` is looking in the wrong place for them.

**One more number problem.** The result page rounds to $1,440,000 and $2,600,000 and then explains, carefully and well, *why* it rounds — "putting a ± on them would be inventing a precision we do not have." Then the dashboard, My Genome and the operator screen all show $1,441,595 and $2,600,775, to the dollar. You've argued for rounding and then not done it three screens later. Pick one. A man who's just been told precision would be dishonest and is then shown five significant figures notices.

Last one: after I finished, the dashboard asked me *"There's a business valuation saved on this device… That's mine — use it / Not mine — discard it. If someone else used this computer, discard it."* I started it from a button on that same dashboard, ninety seconds earlier, signed in as me. Asking whether it's mine is right when someone does it logged out, and odd when the app watched me do it.

### My Genome — the deliverable, and the problem

This is the page the whole thing is for, and mostly it's excellent. Sections framed as the questions a buyer's advisor will ask. Every entry dated to the conversation I said it in. Every entry with a **Remove** on it. And this line, which is exactly the promise I need:

> *"Only you can see this page. Nobody at Corporate AI Solutions reads it, and it is not shared with anyone you have referred or been referred by."*

And under "Things only you know", one entry marked:

> *"Yours only — kept out of the handover document, because it touches on that you are thinking about selling."*

That is the single best thing in the product. Somebody understood the actual fear.

**Then I downloaded the handover document — the one you say is "built to be sent to an advisor or a buyer" — and it contains this:**

> *"The business owner prefers to keep control over when and how sensitive communications, **such as announcing a sale to customers**, are sent…"*

The entry you tagged as private was correctly held back. The **same fact, in a different entry that nobody tagged**, walked straight into the file I'm meant to hand a buyer. And two paragraphs above it, the document says of itself:

> *"It covers the business. It deliberately does not cover the owner's own position — his plans, his circumstances, or what he would accept — which are his to raise, not ours to disclose."*

It says that, and then does the opposite, in the same file. If I'd emailed that to my accountant on your say-so I'd have found out I was selling from him. That is the whole product failing at the one job I'm paying it for. A per-entry sensitivity flag is not enough — the export needs to be screened for the subject matter, not just for the flag, and until it is, the download button is a loaded gun. **This is the reason my answer is no.**

Two smaller things on that page: the header says "**3 things captured**" while the first five sections all say "Not captured — nothing here yet, this is still only in your head", which had me thinking it was broken until I scrolled far enough to find them. And two of the three captured facts say the same thing in different words ("Owner controls sensitive communications timing" and "Owner controls all communications and approvals"). If that's how it accumulates, in six months I'll have four hundred entries and forty facts.

### Settings, Knowledge, and the email warning

Settings is complete and plainly written — profile, business details, connected accounts, plan and usage, password, notifications, signed-in devices, delete account. Every destructive thing says what it will do before you press it. The business details form does a **real ABN lookup** — I typed "Nolan Building" and got five actual ABNs with states. That's the sort of thing that tells me a grown-up built it. (The street address next to it is just a plain box, though; if you're doing lookups for the ABN, do them for the address too.)

A yellow warning sat on my dashboard and my settings page: *"Emails can't go out yet — everything else is working."* I nearly stopped there, because "can't send email" reads as "broken". It gave me a **Try again** button, I pressed it, and it fixed itself. Fine — but if one press fixes it, press it yourself before showing me the warning.

Knowledge page: empty, explains itself properly, tells me what to do. No complaints.

Voice: there's a "Talk to Kira" button on every page in the app. I didn't use it — I'm not talking to a computer with the office door open — but it's there and it's obvious.

*Opportunity:* the thing I would actually pay for, and which isn't offered anywhere, is **"show me what my accountant will see before I send it."** A preview of the handover document, with a plain "here is what has been held back and why" list beside it, that I read and approve once. That single screen would have caught the leak above, and it turns your biggest liability into your best feature. Right now the download is an act of faith.

*Opportunity:* nowhere does it ask **when** I'm thinking of going. Two years versus six months changes everything about what I should do first, and it's the first question any broker asks me. The four-week plan on the dashboard is generic; tied to a date it would be a reason to come back on Monday.

---

## Admin Path

Signed in as the operator account. It works, it's gated properly, it's laid out sensibly: Overview, Kira Exec, Introducers, LOIs, Asked for, Trust, and Settings and Sign out at the bottom. Reads cleanly on a phone too. A plain banner at the top says billing is on test keys and no real money moves, which is the right kind of honest.

**But the "Kira Exec" screen is the second reason my answer is no.** It lists every real customer by name and email with, in a card each: their value gap, what they're worth today, what they'd be worth captured, their transferability score, their industry, their document count, their conversation count — and two buttons, **"Open their Kira"** and **"Manage"**.

I pressed Manage on somebody. I got the filenames of their uploaded documents and **their memory, 105 facts, in full sentences**, including things like who holds sign-off authority in their business and how their approval gates work.

You told me on My Genome that "nobody at Corporate AI Solutions reads it". This screen exists to read it. I'm not saying you're doing anything improper with it — you probably need it to support people. I'm saying **the product makes a promise on one screen that another screen in the same product disproves**, and if a customer ever sees both, you've lost him permanently. Either the sentence has to change to something true ("our support team can see this if you ask us to look"), or the operator view has to stop showing the contents. You can't ship both. (`38-admin.png`, `39-admin-exec-manage.png`)

Two smaller admin things: every date is American — `8/1/2026` for the first of August — on an Australian product, and the "Joined" column is cut off on a laptop. And the **Settings** link in the admin menu goes to the *customer* settings page, so I clicked it, left the operator console, and had no way back except the address bar.

---

## Cross-Path Issues

- **User cannot reach admin — correctly.** Signed in as a plain customer I went to `/admin` and got "That account isn't an operator account", with a link back to Kira. Clean. Good. ✅
- **The privacy promise and the operator console disagree.** Covered above. This is the cross-path finding that matters.
- **The app has two front doors and they don't know about each other.** Signing in lands you at `/talk` with no navigation; everything of value lives at `/dashboard`. Same product, two different chromes, no link between them.
- **The valuation lives in two places at once.** The dashboard reads it from my account and shows it. `/plan` reads it from the browser and says I haven't done it. Same figure, two sources of truth, and the sales page is on the wrong one.
- **The "Report a problem" tab sits on top of the page content** on nearly every screen — over the agent name in the admin list, over the hero text on the phone. Minor, but it's on every page so you see it a lot.

---

## Other Strategic Feature Suggestions

- **Show me the broker's number next to yours.** I've already been told by a broker that I'm worth less than I think, and I half-believe him. Your $2.6M "captured" figure is 5× my earnings. He'd say 3×. If you let me type in what I've been told and then show me, in the same view, where his number and yours differ and why, you win the argument instead of avoiding it. Right now I'm left holding two numbers and no way to reconcile them, and I'll trust the man I can ring.
- **A "who else knows" setting, set on day one.** One screen: nobody / my accountant / my wife / my broker. Everything else — what gets exported, what gets emailed, what appears in a shared link — obeys it. You've clearly thought about this (the sensitivity tagging, the introducer wall, the export split) but it's scattered through the product as good intentions rather than one switch I control. Given who you're selling to, that switch *is* the product.
- **Print my valuation as a one-page PDF with my logo off it.** There's a "Save / print this" and I didn't dare press it, because I don't know what it puts on the page or where it goes. If the sheet were plainly a plain sheet — my figures, your methodology paragraph, no branding, no link — I'd print it and put it in a drawer, and that's the artefact that eventually gets shown to my accountant.
- **Say what happens if I die.** Half the reason people my age start this is that nothing is written down and their family would be stuffed. Nobody wants to say it out loud. One line in the FAQ about who can get the Genome out if I can't would do more for conversion than the comparison table.

---

## Standards Check (portfolio non-negotiables)

- **§1 Responsive** — ✅ 375px and 1440px both clean on landing, dashboard, my-genome, settings and admin. `scrollWidth == clientWidth` at both widths (no horizontal scroll), body text 16px, both portals collapse to a hamburger, admin table becomes stacked cards. (Separate desktop layout bug on the hero CTA logged under Landing — it's a flex-row defect, not a breakpoint failure.)
- **§2 Auth-page pattern** — ✅ `/login` and `/admin` both carry a Forgot password link, a working Show password toggle, and "Email me a magic link". *Reset delivery itself not exercised — no test mailbox in this run.*
- **§4 Authenticated chrome + Settings** — ❌ **RELEASE-BLOCKING.** `/talk`, which is where signing in actually lands you, has no left navbar, no Settings, no Sign Out and no link to `/dashboard`; its only menu is Add knowledge / Share Kira / Complete project. The rest of the app (`/dashboard`, `/my-genome`, `/knowledge`, `/settings`) has a correct persistent nav with Settings and Sign Out — you just can't get to it from the landing page after login.
- **§5 Explanatory header** — ✅ Dashboard, My Genome, Knowledge, Settings, the valuation intro and both admin screens all open with what-it-is / what-to-do / why-it-matters, and the Knowledge empty state keeps its header. `/talk` is thin ("Ready when you are") but not absent.
- **§6 Voice agent** — ✅ "Talk to Kira" is a fixed control on every authenticated page; `/talk` is one click from it. Not spoken to — no microphone in this environment.
- **§7 Scaffold metadata** — ✅ Titles are "Kira — your fractional exec", "Overview · Kira", "Settings · Kira", "Admin sign in · Kira". Custom `/favicon.ico` + apple-touch-icon. No "Create Next App" anywhere.
- **§8.5 Dual-portal separation** — ✅ Walked as the non-admin `dennis+qauser@…`: reaches a real user home (`/dashboard`) that is not `/admin`, and `/admin` returns "That account isn't an operator account" with a route back. Admin account reaches `/admin`. No facade. *(The `/talk` landing problem is a §4 failure, not a §8.5 one — the user area exists and works.)*
- **§9 Codicils (observable)** — ❌ **RELEASE-BLOCKING**, three counts:
  1. **Dead end.** The valuation result's primary CTA → `/plan` → "Let's find your number first" → back to the valuation. A completed valuation is visible on `/dashboard` at the same moment.
  2. **The handover export discloses the sale.** The tagged entry is withheld; an untagged entry containing "such as announcing a sale to customers" is included, in a document whose own preamble promises it excludes the owner's position.
  3. **Address field has no address lookup** (plain `street` / `locality` / `postcode` inputs with browser autofill attributes only). ABN lookup ✅ — real ABR results, correctly implemented. Consequence-before-click ✅ on delete account, sign-out-everywhere, and the discard-valuation choice.
- **Prices carry tax** — ✅ Landing "$499 + GST to $4,999 + GST /month"; result page "$1,999 + GST a month"; currency FAQ states AUD, excluding GST.
- **Valuation figures carry NO tax suffix** — ✅ $1,440,000 / $2,600,000 / $1,159,180 / $180,000–$270,000 all bare, correctly.

**Also failing the brief you flagged (not a rubric line, but you asked):** under `?from=app` the result heading is "Your indicative valuation / Ray, this is what your business could be worth" (expected "That's your starting point"); a monthly price **is** quoted; the final CTA is "Start building your Business Genome" → `/plan` (expected "Back to Kira" → `/dashboard`). All three expectations missed. The `?from=app` parameter is on the URL throughout, so it's reaching the page and not being honoured.

---

**Scope note.** About 55 minutes. Covered: landing at 1440 and 375, sign-in as the non-admin QA user, the post-login `/talk` surface, `/dashboard`, all eleven valuation questions answered end-to-end with the result and its arithmetic checked, `/my-genome` including the markdown handover export, `/knowledge`, `/settings` and the business-details form, `/plan`, the user→admin block, then the admin console as the operator account across Overview, Kira Exec and one Manage detail view, at 1440 and 375. Not covered: the voice agent (no microphone — noted as reachable only), the password-reset and magic-link emails (no test mailbox), Stripe checkout (test keys, no card), "Start discovery", the Google Drive connection, the anonymous logged-out valuation path, and — deliberately, per instruction — Delete account and Sign out on all devices.

Thanks,
Ray
