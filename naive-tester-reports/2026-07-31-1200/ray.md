Hi Dennis,

Platform Feedback — Kira Walkthrough
Persona: Ray, 66, construction/trades, 35 years in, thinking about selling and has told nobody | URL: https://kira-rho.vercel.app | Goal: work out what this is, whether it understands my situation, and whether I'd trust it with 35 years I've never written down | Duration: ~75 min

---

## Landing page

- The headline is the best thing on the site. "You spent thirty years building it. Now sell it for what it's actually worth." — that's my situation, in my words, and "Most owners start this before they've told anyone" told me you'd actually met someone like me. I read the whole paragraph, which I don't usually do.
- Then, directly above that headline, the first thing on the page: "⚡ Part of the Corporate AI Solutions Voice AI Suite →". And near the bottom: "Kira is part of a suite of specialized AI Voice Agents… Explore the Marketplace →". Halfway down you tell me "Every Kira is different… not a generic bot", and I'd just been told it's one of a range. You can't sell me a thing that's mine and advertise the catalogue it came out of on the same page. Cut both.
- **The main button is floating in the margin.** At laptop width, "Find out in 3 minutes →" is a pink pill sitting on its own out to the LEFT of a picture card, level with an illustration, nowhere near the paragraph it belongs to. It reads like a sticker somebody dropped on the page. I nearly missed it and went to the smaller "What's my business worth?" further down instead. (`01a-landing-hero-1440.png`, `02-landing-scroll900.png`)
- The illustration next to it is an empty table with two blank white rectangles on it. My first read was "image didn't load".
- **"Walk away $220k" is never explained on that page.** Three boxes: Walk away $220k · Today $582k · Captured $1.02M, and the only caption explains the gap between the last two. Walk-away is the number that stings — it's the one that says thirty-five years is worth a truck and some scaffold — and it's the only one you don't define. You DO define it properly one click later on the valuation page. Move that sentence up. Right now the most alarming number on your homepage is the unlabelled one. (`02-landing-scroll900.png`)
- Four testimonials. All four attributed to the same word: "Business". No name, no trade, no town, not even "plumber, 58, Bendigo". Anonymous praise reads as invented praise — and the quotes are good ones, which makes it worse. Either get one real owner to put his first name and his trade to it, or drop the section.
- "your fractional exec" is in the browser tab and all over the copy. I know what a foreman is and I know what a bookkeeper is. "Fractional exec" is a word from your world, not mine. "Business Genome" I'll forgive because you linked it and explained it — do the same or better for this one.
- On the phone (375px): "Sign in" wraps onto two lines in the header — "Sign / in" squeezed between the logo and the orange button. Looks broken. And the black "Report a problem" tab sits directly on top of the hero paragraph, covering the words while I'm trying to read them. (`03-landing-375-top.png`) The hamburger menu itself is fine — big items, easy to hit.
- Opportunity: put a discreet "nobody sees this but you" line in the hero, next to the CTA. Every objection I have on this page is the same objection — who else finds out. You answer it beautifully three screens down and on the advisors page. I might not get that far.

---

## The free valuation (/business-valuation)

- The intro screen is the strongest page you have for someone like me. It names the three numbers before asking anything, says "About 3 minutes. Nothing to sign up for", and then: *"Your answers are kept on this device as you go, so you can stop and come back — for 7 days, on this device only. Nothing is sent anywhere until you decide to sign up."* That paragraph is worth more than the whole testimonials block. It's the only place on the site that answers "what happens to this if I close the laptop" before I have to ask.
- **The save-and-come-back promise holds.** I put answers in, hard-refreshed the page, and it reopened on the same question with the answers intact. That works.
- **"Clear my answers" is there and it works.** It's on every question, top-right, and it genuinely wipes the lot back to the start. For a man who's about to type his turnover into a website on a shared office computer, that button is not a nicety — it's the reason I'm willing to start. Good.
- **The turnover box has no commas.** The grey example inside it says "e.g. 2,000,000". Then I type and get `2400000` — seven bare digits, no grouping, in an 18px font. I genuinely could not tell at a glance whether I'd typed 2.4 million or 24 million, and that one field drives every number you then show me. One stray zero and your valuation is out by a factor of ten and I'll never know. Format it as I type. (`11-step-after-turnover-fill.png`)
- The industry box: I typed "builder", the way I'd say it. The only match offered was **"Heavy Construction"**. I do houses and small commercial — heavy construction is roads and bridges, and it'll be carrying a different multiple. There was nothing else on the list and no "none of these fit". Typing "plumbing" matched cleanly, so the machinery works; the trade list just doesn't have the words tradesmen use. (`06-q1-industry.png`, `07-q1-plumbing-nomatch.png`)
- There is no "Sign in" link anywhere on this page. If I did this last month, came back today and want to pick up my account, my only route is to go back to the homepage and find it there.
- Opportunity: after the turnover box, echo the number back in words — "$2,400,000 — two point four million, is that right?". One line, and it removes the single largest source of a wrong valuation you have.
- Scope note on this section: I could not get through all 11 questions to the result screen and the plan offer. That is a tooling problem at my end, not yours — see the scope note at the bottom. So I have not seen your price, and I can't tell you whether it shows "+ GST".

---

## Signing in

- Clean. Email, password with a working show/hide eye, "Forgot password?", "Email me a magic link", "Need an account? Sign up". Nothing to complain about. (`21-login.png`)
- Signing in as an ordinary user took me straight to my own Kira — a real home screen with my own sidebar, not a locked door. Good.
- Out of curiosity I typed `/admin` into the address bar while signed in as myself. It bounced me straight out with: *"That account isn't an operator account. If you came here to use Kira, sign in as a user instead."* — and made "sign in as a user" a link. That's how it should be done: I couldn't get in, I wasn't made to feel like a criminal, and I wasn't stranded. (`20-admin-as-user.png`)

---

## Inside the app — the chrome

- Sidebar is Overview / My Genome / Knowledge, with Settings and Sign out anchored at the bottom and my email underneath. Three items. Nothing about "My Kiras", no "+ New Kira", no banner selling me other agents. Inside the product, "one assistant, yours" holds completely. It's only the shop window that contradicts it.
- **The business name is hidden underneath your logo bar on a laptop.** The app does put "Factory2Key" at the top of the sidebar — I can see it in the page's own contents — but it's positioned at the very top-left corner, directly under the fixed white "Kira by Corporate AI Solutions" bar, which covers it. On my laptop, my sidebar is headed with YOUR company name and mine is invisible. On the phone it displays correctly. (`18-business-name-occluded.png`, `19-settings.png` vs `26-genome-375.png`) This is one of the small things that decides whether this feels like my tool or your product with me logged into it. Worth fixing today.
- **The welcome-back line is broken English and cut off mid-word.** Word for word, on my home screen: *"Last time you talked about The user reiterated the need for a streamlined onboarding wizard for third-party clients, emphasizing a detailed, conversational approach akin to an executive assistant. The goal is to map all user ac. Tap the mic to carry on."* Two sentences shoved together with no join, written about me in the third person as "the user", in language I have never used in my life, and stopping halfway through the word "account". This is the first sentence the product says to me every time I come back. (`16-authed-overview.png`)
- Opportunity: that greeting should be one short line in her voice — "Last time we were on Lot 109 and the survey for Roger. Want to pick that up?" You already have the material. It's the framing that's wrong, not the memory.

---

## Inside the app — on the phone (375px)

- **The chat home scrolls sideways.** The page is 407px wide inside a 375px screen, so the text runs off the right edge — "Kira remembers where you left off" is clipped mid-line. Every other page I checked was fine; this is the one I land on. (`24-authed-375-chat.png`)
- The microphone said **"Not supported"** in red, with nothing else — no reason, no "check your browser", no alternative. Voice is the whole promise; if it can't start on someone's phone, red text with no next step means they close the tab and never mention it. Give it a sentence and a way to type instead.
- The "More" menu opens a panel whose bottom item is covered by the black "Report a problem" tab. Same widget, same collision as on the homepage. (`25-authed-375-menu.png`)

---

## My Genome — the thing you're actually selling

I'll be blunt here, because this is what I'd be paying for.

- **Your example is excellent. Your real one isn't the same product.** The public example page (`/genome`) shows entries with proper headings — *"Three builders supply roughly 60% of turnover"* — then the detail underneath: Hartley since 1998, none on a written contract, work allocated by a Friday phone call. Each section carries a "78% documented" score, and each has a "Still only in your head" list naming what's missing. That is a handover manual. I looked at that and thought yes, I want that. (`27-example-genome.png`)
- **What's actually in my account is a list of notes about me.** No headings. No per-section score. No "still in your head" list. Just sentence after sentence in the third person: *"The business wants to track the email sent to IRIS and needs a way to provide access to emails for better support."* — *"Tasks are tracked entirely through mental capture and conversation with the assistant."* Nobody talks like that, and I certainly don't. It reads like minutes somebody took about me, which is the exact opposite of what you promised. (`17-my-genome-top.png`)
- **Things are filed under headings they don't answer.** Under *"How work comes in — Where does revenue come from, and does it depend on you?"* the first three entries are: a plan to build a phone-recording system, an email address for a surveyor, and seven overdue invoices in Xero. Under *"How the work gets done — Does the business run when you are not on site?"* there's *"Diesel injectors in a van are being fixed."* A buyer's accountant reading that learns nothing about my business, and I'd be embarrassed to hand it over.
- **It's recording notes about your software as if they were my business knowledge.** *"The system identifies and tags forgotten or later-mentioned tasks, prioritizes them, and integrates learnings into the overall business system."* and *"The onboarding process is empathetic and flexible, resembling a good executive assistant…"* — that's a description of Kira, sitting in the middle of a document meant to describe me. That's the entry that would make me stop paying.
- **Duplicates.** *"Tracking emails sent to IRIS is required, and email access is needed for better support."* is immediately followed by *"The business wants to track the email sent to IRIS and needs a way to provide access to emails for better support."* Same fact, twice, back to back.
- **Two different provenance styles, one of them missing the year.** Most entries say "You said this on 28 July 2026". Others say "Captured 30 July — conversation not recorded". You make a real selling point of every entry being dated to the conversation — then two of my forty-four aren't, and the label changes without explaining why.
- American spelling throughout — "prioritizes", "organizing", "analyzing". On an Australian product for an Australian owner. Small, but a buyer's accountant will notice it, and so did I.
- The good bits, credited honestly: empty sections say *"Nothing here yet — this is still only in your head"*, which is exactly the right tone. The counter — "44 things captured, plus 3 documents you have shared. 41 of them are dated to the conversation you said them in" — is concrete and I believed it. And "Download the handover document" / "Download the raw data" are both sitting right there, which backs up the promise that I keep this if I leave.
- One thing nobody's mentioned to you, I'd guess: the first item on that page is a purple banner reading **WORTH TODAY $1,504,565**, full width, in white on purple. If I open this in the office and anyone walks past my shoulder, my valuation is the largest thing on the screen. I've told nobody I'm selling. There needs to be a way to blur or collapse those figures by default.
- Opportunity: the gap between the example and the real thing is your single biggest risk. Whatever is turning conversations into entries needs to produce a headline and a body, in second person, filed against the question it answers — and to refuse the entry if it can't say which question it answers. Right now the demo sells a manual and the product delivers a diary.

---

## Knowledge

- Straightforward and well written. *"Anything showing 'Kira can read this' is searchable in conversation — just ask about it, no need to re-share. Remove anything that's out of date so Kira doesn't work from a stale copy."* That last clause is the kind of practical warning that makes me trust the rest. Files list what they are, and how many sections she's read. No complaints.

---

## Settings

- Genuinely thorough, and better than most things I use. Profile, my business details (name, registered entity, ABN, address, where replies go), connected accounts, plan, password, notifications, delete account. Delete says "Permanently delete your account and everything in it. This cannot be undone." — consequence stated before I click. Good. (`19-settings.png`)
- **Connected accounts tells me about Drive and Contacts, and says nothing at all about email.** Word for word: *"Drive: read and write"* and *"Contacts: can look up an address by name (saved and auto-saved contacts)"*. That's plainly put and I appreciate it. But you sell me on the homepage with *"She drafted the follow-up to a client while I was still on site"*, and my own Genome contains the line "email access is needed for better support" — so either she's in my Gmail and you haven't listed it, or she isn't and the ad overstates it. For a man who hasn't told his wife he's selling, "which mailbox can it read" is not a detail. List Gmail explicitly, granted or not granted.
- **I cannot find out what I pay.** The plan card says "You're on a paid plan" — twice, in the same box, the same sentence printed under itself — and shows "$0.00 of $20 used" for voice. Nowhere in the product is there a monthly figure. To learn what leaves my account I have to click "Manage billing" and go off to somebody else's site. Your whole pricing story is "you'll see your own number before you decide" — so show me my own number, here, permanently, with "+ GST" on it. A 66-year-old checking what he's signed up to should not have to leave the app to find out.
- Password has a proper show/hide eye. Notifications is a single clear toggle with plain English. Fine.

---

## Other Strategic Feature Suggestions

- **A "nobody can see this" page.** One screen, linked from the top of the Genome, listing in plain English: who can see what (nobody), what the introducer sees (that I signed up and that a number moved), what happens to it if I stop paying, where it's stored and in which country. You have every one of those answers already — they're written beautifully on the advisors page, aimed at brokers. Point them at me. I'm the one who's frightened.
- **A "hide the numbers" switch.** Default the valuation banner to hidden with a "show" tap. Costs you nothing, and it's the difference between opening this in front of my bookkeeper or not opening it at all.
- **Let me correct an entry.** The Genome is going to be wrong sometimes — mine already has a diesel injector filed as an operating procedure. If I can't strike an entry out myself, I'll stop trusting the document, and the document is the product.
- **A one-page "what I'd hand my accountant" preview.** Not the full export — one page, on screen, so I can see what a buyer would actually read before I commit six months to it.
- **Give the testimonials a first name and a trade.** Four anonymous quotes attributed to "Business" do you more harm than no quotes at all.

---

## Standards Check (portfolio non-negotiables)

- **Responsive** — ❌ The signed-in chat home measures 407px wide inside a 375px viewport, and body text clips off the right edge (`24-authed-375-chat.png`). Landing, Genome and Settings were all clean at 375 and 1440; this is the one page a user lands on. Touch targets and 16–18px body text were fine everywhere I measured.
- **Auth-page pattern** — ✅ `/login` and `/admin/login` both carry a forgot-password link, a working show/hide eye toggle (44×44, `aria-label`, `tabindex=-1`) and "Email me a magic link" (`21-login.png`).
- **Authenticated chrome + Settings** — ✅ Persistent sidebar on every signed-in page; Overview / My Genome / Knowledge with Settings and Sign out pinned at the bottom; `/settings` carries Profile, Password, Notifications and Account. Separate finding: the business name in that chrome is rendered underneath the fixed header on desktop and is invisible.
- **Explanatory header** — ✅ Every page opens with what it is and what to do — Genome, Knowledge and Settings all do it well, and empty Genome sections keep theirs ("Nothing here yet — this is still only in your head").
- **Voice agent** — ✅ "Talk to Kira" sits in the chrome on every signed-in page and the mic is one tap from the home screen. Caveat: on mobile it rendered "Not supported" in red with no explanation or fallback.
- **Scaffold metadata** — ✅ Real titles throughout: "Sign in · Kira", "Settings · Kira", "Knowledge · Kira", "Admin sign in · Kira". Nothing reading "Create Next App".
- **Dual-portal separation** — ✅ User sign-in lands at `/chat/agent_…`, a real user home distinct from `/admin`; `/admin` as a non-admin redirects to `/admin/login?error=not_admin` with a plain-English message and a link back to the user login (`20-admin-as-user.png`).
- **Consequence clarity** — ✅ Delete account states "This cannot be undone" before the click; the plan card states the cancellation consequence next to the cancel control. I did not click either (both destructive/billing).
- **Zero dead ends** — ❌ Mobile voice fails to a bare red "Not supported" with no next step; and the 404 page (reached by typing `/pricing`) is a bare "This page could not be found." with no link home (`23-pricing-404.png`). Nav links themselves are sound — the header "Pricing" is an on-page anchor, not a broken route.
- **Prices** — — No price is displayed anywhere I could reach, so the GST rule was never triggered. That is itself the finding: Settings says "You're on a paid plan" with no monthly figure. The one place a price is promised — the end of the valuation — I could not reach (see scope note). The advisors FAQ does state "All prices are quoted excluding GST (or the equivalent tax where your client is based)", so the wording exists; it just isn't next to a number I can see.

---

## VERDICT: **FAIL** for the share gate

The Genome — the one thing you are actually selling — reads as third-person machine notes about me, including notes about your own software filed as my business knowledge, while the demo version of the same page reads like the handover manual you promised; ship that to a real owner and he pays for six months and gets a diary.

Runners-up that would each have been enough on their own: the signed-in home screen greets him in broken, truncated English on every visit, and it scrolls sideways on a phone.

None of it is deep. The bones of this are good — the valuation intro, the privacy answers, the admin bounce, the Settings page and the example Genome are all better than most things I use. It's the join between the promise and the delivery that isn't ready to put in front of somebody's client.

---

## Scope note

About 75 minutes. Covered: landing page at 1440 and 375, the valuation intro and questions 1–2 (plus the save/resume and clear-answers behaviour), user login, the `/admin` probe as a non-admin, the signed-in chat home at both widths, My Genome at both widths, Knowledge, Settings, the public example Genome, and the privacy/terms pages (both live, dated, no placeholder text left in them).

Could not reach: **the valuation result screen and the plan/price offer**. The browser I was given is shared with another automated session that kept navigating my tab out from under me mid-flow — I watched it sign in, jump to `/advisors`, and overwrite my saved answers with a hairdressing business I never entered. That cost most of the hour. I have deliberately thrown away three findings that only appeared while that was happening (a "the wizard advances by itself" reading, a "typing turnover resets the form" reading, and a "turnover gets clamped to 250000" reading) — I could not reproduce any of them from a clean restart, and I'd rather tell you nothing than have you revert a working fix on my say-so. Everything reported above was re-observed on a clean session.

Also untested: the Genome downloads (present, not exercised), "Cancel my plan" and "Delete account" (destructive), and the forgot-password and magic-link emails (no mailbox access).

Thanks,
Ray
