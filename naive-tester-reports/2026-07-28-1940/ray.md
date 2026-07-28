# Kira — walkthrough notes

Dennis,

You asked me to go through this as if I were thinking about selling. I did. I've written it the way I'd tell you over a coffee, so some of it is blunt. Take the blunt bits as a compliment — I wouldn't have bothered writing this much about something I didn't think was close.

**Persona:** Ray, 66. Plumbing business, 9 staff, 35 years. Thinking about selling, told almost nobody.
**URL:** https://kira-rho.vercel.app
**Goal:** does this understand my situation, would I trust it with things I've never written down, and would I pay for it.
**Duration:** about 50 minutes.

---

## VERDICT

**Would I sign up?** Yes — for the free valuation, without hesitating. And on the strength of the valuation I'd probably click through and start the beta, because you're not asking for a card and you're not pretending it's finished.

**Would I trust it with the things I've never written down?** Not yet. Three things stop me, and none of them are about the technology:

1. **The site can't keep its story straight about money.** Your pricing block says I'm never billed for the month I'm in. Two of your own FAQ answers, on the same page, say I get 30 days free and you'll want my card. Your plan page says nothing about a card at all. I've been sold things by people whose paperwork disagreed with their mouth before. That's the exact feeling.
2. **I can't tell whether she's plugged into my books.** One half of a page says she reads my bank balances and who owes me out of my accounting system. The other half of the same page says she has no connection to my bank, calendar or job software. Nobody tells me which accounting system, or that I'd have to connect it. I'm on MYOB.
3. **What's behind the login isn't what's on the front.** The front page is written for a bloke like me. The moment I sign in it's a grey screen that says "Hey there! 👋", a button called "Talk to the assistant", and an advert for your other products. And the example Genome you sell me — a 31-year-old plumbing business with 9 staff — is far better than the real one I was shown inside.

The valuation is the best thing you've built. The example Genome is the second best. Fix the money story and the tone break after login and you'd have me.

---

## 1. The front page

The first paragraph did what nothing else has managed: "This is for one person: the owner in their sixties, three or four decades in, with a profitable business that runs on them." And then, "Most owners start this before they've told anyone." That last line is the reason I kept reading instead of closing the tab. Nobody else says the quiet part.

Then the numbers under it — "a real plumbing business, run through the actual calculator", $220k walk away, $582k today, $1.02M captured. I'm a plumber. That's a good ambush.

What got in the way:

- **A button floating in the white space.** At laptop size, the pink "Find out in 3 minutes →" button sits off on its own to the left of the demo card, halfway down, not attached to anything. It reads like something that hasn't loaded properly, not like the main thing you want me to press. (Screenshot `02-landing-demo.png`.)
- **"1 of 13".** There's a card with a picture of an empty table and two chairs, a line of text, and buttons marked **Start** and **Hear Kira**. I pressed nothing, because I assumed "Start" started the valuation. It's actually a thirteen-slide story. Say so: "A 13-part story, about two minutes."
- **Words that mean nothing to me.** "Fractional exec" (twice in the page title and the hero). "Voice AI Suite". "Platform". "Onboarding" I didn't see, thank you. Genome I worked out from context, eventually, and I ended up liking it — but "fractional exec" I still don't know. A bloke who could tell you what a fractional exec is doesn't need this product.
- **The best page on the site isn't linked.** `/what-she-does` — the honest list of what she can't do — is not in the top menu, not in the footer, not anywhere I could reach it from the front page. I got there sideways. That page is what would close me. Put it in the nav, and put a line in the hero: "Here's what she can't do."

**Opportunity:** put one real named owner on the front page — first name, trade, town, the sentence "I told nobody for eight months." The testimonials you have are all attributed to "Business", which reads like you couldn't get anyone to put their name to it. For a product whose whole premise is that I haven't told anyone, one person willing to say it out loud is worth more than four anonymous quotes.

---

## 2. The money. This is the one to fix first.

You asked me to be pedantic about `/plan` and the billing copy. `/plan` itself is fine. **The rest of the site contradicts it in four places.**

What `/plan` says (this is the new story, and it's clear):
> "$999/month + GST. Free while we are in beta. $999 + GST/month once billing goes live — we will tell you first."
> "Beta · payments not live — Stripe is in test mode."
> "We email you before billing is switched on. Cancel any time before then and pay nothing."
> "You set your password and meet Kira right after."

What the pricing block on the front page says (also the new story):
> "You're never invoiced for the month you're in — each month is billed once it has finished, and if you cancel, that month is on us."

And then, further down the *same* front page, in the FAQ:

- **"What does it cost, and when do I pay?"** → *"You get **30 days** to try her; you're **not invoiced until those 30 days are up**, and you can cancel any time."*
- **"Why do you need my card if the first 30 days are free?"** → the whole question assumes a card and a 30-day trial. *"Nothing is charged for 30 days, you get three days' warning before the first payment, and cancelling takes one click in Settings."*

And on the advisor page, twice more:

- *"They get 30 days to try her, aren't invoiced until then."*
- *"Their free 30 days pay nothing, because nothing is collected yet."*

And in the fine print at the bottom of `/plan` itself:

- *"nothing will come out in 30 days"* — which, sitting under a heading about beta, reads like a trial all over again.

So on one site I am told: (a) you never bill me for a month I'm in, (b) I get 30 days free then you bill me, (c) you need my card up front, (d) you don't mention a card at all and I just set a password. **Those are four different deals.** For someone who is already suspicious of being sold to, this is disqualifying on its own. Delete every "30 days" on the site and say the arrears thing once, in the same words, in all four places.

Other things in the money section:

- **"$999/month + GST" with GST stated.** Good. That's the number I'd repeat to my wife, and I'd have been annoyed to find GST on top later.
- **"about 2.7% a year of what you stand to unlock."** I checked it: $999 × 12 = $11,988 against my gap of $436,710 = 2.7%. It holds up. Say that arithmetic out loud on the page — "$11,988 a year against a $436,710 gap" — because "2.7%" is a percentage and $11,988 is money, and I think in money.
- **"There is no price list, and that is deliberate... her fee is set to the size of the value gap."** I ran a second, much bigger business through the calculator (a $7.3M gap) to see whether the price moved. I couldn't get the plan page to show me a price for it — see the bug in section 3 about answers not being kept — so I can't tell whether the banded pricing is real or whether it's $999 for everybody. If it is $999 for everybody, that paragraph is a story, and it's the sort of story I'd find out about in month three and resent.
- **"GROWTH PLAN"** as a badge implies there are other plans. There aren't. Drop the badge or add the others.

**Opportunity:** one line under the price that says what happens on the day I cancel — "you'll never receive an invoice after you cancel, including for the month you're in." That single sentence does more work than the whole FAQ.

---

## 3. The valuation — the best thing here

Eleven questions, plain English, no sign-up, three minutes. I'd send this to two blokes I know before I'd tell them what it was for.

The questions are good, and one of them is very good. **Question 8: "If you took a 3-month holiday tomorrow, what happens?"** with the options running from "It would fall apart — I am the business" through to "It would run fine — fully under management". My accountant has done my books for nineteen years and has never asked me that. Question 9 ("Your processes, pricing and know-how are… mostly in my head") is the same. Whoever wrote those two has actually sat in a shed with someone like me.

**What I got** (plumbing, $1.8M turnover, $260k profit, growing steadily, margins squeezed, a few big builders, "it would struggle", mostly in my head, some recurring, $180k of gear):

> Walk away $180,000 · Worth today $595,727 (~2.3× SDE) · With your knowledge captured $1,032,437 (~4.0× SDE)
> **The value locked inside your head right now: $436,710.** Transferability score 34/100.

That's roughly what the broker told me, and the third number is roughly what I thought it was worth. Seeing both on one screen, with the difference named and priced, is the whole product. If you cut everything else, keep this.

The "Why the number is what it is" paragraph is the best writing on the site:

> "It is the same as buying a car sight unseen on the seller's promises: you would knock the price down to cover the unknown unknowns, because you are the one who wears it if things turn out worse than described."

That's the first time anyone has explained the discount to me instead of just applying it. And the breakdown underneath — owner dependence +$152,394, documented systems +$151,635, recurring revenue +$75,818, client concentration +$56,863 — is the bit I'd screenshot and send to my accountant.

### The industry question — you asked me to be pedantic, so:

**It works.** I typed **"it development"**, clicked away, and after a wait it came back **"Matched to IT & Software Services — that's the sector average we'll use."** I then changed the box to **"motor"** and it came back **"Matched to Auto Repair & Service."** The answer followed what I'd typed, both times. No stickiness.

But three things around it:

- **It's slow, and the slowness looks like a fault.** While it thinks, the box says *"Checking 'it development' against our sector list…"* and the **Next button greys out and changes to "Checking…"**. It sat there long enough — several seconds, more than once — that I assumed it had hung and started looking for something to click. Compare: typing "plumb" pops a suggestion **instantly**. So the fast path teaches me the field is instant, and then the slow path looks broken. Either make the wait obvious ("this one's not in the list, give me a moment while I work it out") or don't grey the button out.
- **It sometimes tells you it's given up when it hasn't.** In one run I saw *"No sector match for 'it development'. You can carry on — we'll use the overall market-average multiple"* — the same phrase that a moment later became a correct match. If that message can appear before the answer arrives, some people will accept it and take a worse number than they should.
- **It answers in two different voices.** Pick "Plumbing / Construction" from the dropdown and it says **"Matched to plumbing"** — lower case, my typed word, and it's dropped the "Construction". Type something it has to think about and it says **"Matched to IT & Software Services"** — proper name, properly capitalised. Two mechanisms showing through the paint.

### Bug: my answers are not kept, and the page says they are

Under the Start button it says:

> "Your answers are kept on this device as you go, so you can stop and come back."

They are not, in any useful sense. The progress is held in the browser's *session* storage — it survives a refresh in that tab and nothing else. Close the tab, or come back tomorrow, and eleven questions are gone. Worse: I completed the whole thing, refreshed, and was dumped back on question 1 with nothing kept at all, and the `/plan` page then said **"Let's find your number first"** as though I'd never been there.

I am 66 and I answer the phone. I will get interrupted at question 6, and the next time I open that tab I will not do it again. That sentence is a promise you're not keeping — either keep it properly or take the sentence out.

### And one thing you should move, not fix

At the very bottom, below the fine print, is this:

> "Sector medians are BizBuySell's 2025 US small-business sale data — ~9,500 closed deals... There is no equivalent Australian dataset at this granularity... We use it as an indicative benchmark, not an Australian market quote."

I respect that enormously. It's the single most honest paragraph on the site. But it's the *last* thing on the page, after four figures in Australian dollars. I found out my number came off US sales data after I'd already believed it. Put one line up near the number: "Built on US sale data — there's no Australian equivalent; here's why," linking down. Being told a limitation before I rely on it is trust. Being told after is a disclaimer.

**Opportunity:** let me email or print the result to myself without an account. There's a "Save / print this" button, which is good — but the thing I actually want is the one-page version I could put in front of my accountant, with the four "where the value is hiding" figures on it, and *nothing with your logo shouting SELL YOUR BUSINESS across the top*, because that page might get left on a desk.

---

## 4. `/what-she-does` — you asked for my judgement on the "can't" half

**It reads honest, and it made me believe the first half more, not less.** That's the answer. It is not a list of failures. It's the page I'd have written if I were trying to convince someone like me.

The sentences that did it:

> "Not 'not yet, ask us nicely'. There is no setting that turns these on."

> On the profit and loss: "She can reach the report and currently reads only the income line out of it, **which is half an answer and worse than none**. Until she can give you the whole picture she will not pretend to."

> On listening: "She hears you only when you open a conversation and press the button. Waking on her name, with a pause you control, **is on the roadmap and is not built** — you should know exactly that before you say a word to her."

Nobody writes "half an answer and worse than none" about their own product unless they mean it. And the background-listening one is the exact question I would have asked and expected to be fobbed off about. Keep every word of that page.

Now the problems:

- **The contradiction about my books.** In the "ask her for these" list: *"What's in the bank?" — "Balance on each account and the total, **read from your accounting system**"* and *"Who owes me?" — "She reads it straight out of your accounting system."* Four items later, in the can't list: *"**Touch your bank, calendar or job software** — She has no connection to any of them."* I read that twice and I still don't know whether she's in my books or not. And **nowhere on that page** does it say which accounting system, or that I'd have to connect it, or how, or what she can see once she's in. That's the single biggest unanswered question on the site for me, because "connected to my accounts" is exactly the thing I'd have to explain to my bookkeeper, who doesn't know I'm thinking of selling.
- **"Nothing at all" as a heading.** It sits over the card about her chasing overdue invoices and expiring licences unprompted. I assume it means "you say nothing at all and she does this anyway", but on first read it looks like a label that failed to load. Call it "Without being asked".
- **The bottom third is written to my broker.** "If you're introducing a client… what you get paid… your dashboard." I'm the client. Reading about somebody earning a commission on me, on the page I came to for reassurance, is a jolt. It's handled well — the "you see progress, never their conversations" part is genuinely reassuring — but it should be behind its own link, not appended to my page.
- **It's not linked from anywhere.** Said it above; saying it again because it's the cheapest win on this list.

---

## 5. `/genome` — the example

A plumbing business, 31 years old, 9 staff. I don't know whether that was aimed at me or luck, but it landed.

What works:

- **The dating.** "You confirmed this · Conversation, 12 March" against "Captured — not yet confirmed · Conversation, 2 April". That distinction is the difference between a document and a story, and a buyer's accountant will go straight to it.
- **"Still only in your head"** — and then: *"Why the fourth builder stopped calling in 2023 — and whether that relationship is recoverable."* I sat back at that one. That is exactly the question a buyer asks that I'd have no good answer to. Naming the gaps rather than hiding them is what makes the other 78% believable.
- **"Three builders supply roughly 60% of turnover… None are on a written contract — work is allocated by a phone call to the owner, usually on a Friday."** That is my business. Down to the Friday.
- **"On the page, not in your head — 62%"** with the number moving as you talk. I want that number to go up. That's a better hook than any of the marketing copy.

What doesn't:

- **Only one of the seven sections has anything in it.** "How work is priced and quoted 54%", "How the work gets done 41%", "Suppliers and terms 83%", "Things only you know 22%" — headings and a percentage, no content. I tried to open one and couldn't (my browser was playing up, so I won't swear it's broken). But if six of the seven don't open, six of the seven are wallpaper, and the one that *is* open is the one that sells the product. Open two of them.
- **"Things only you know — 22% documented"** is the section I most want to read and it's the emptiest. Of course it is — but it's also the one that decides whether I believe you can get that stuff out of me. Show me three examples of what "things only you know" looks like written down.

---

## 6. Signing in — and where you land

The login page is right: forgot password, a show/hide eye on the password, and "Email me a magic link". No complaints.

Where you land is another matter. **This is where the product changes personality.**

The front page is warm, yellow, and written for me. One click later I'm on a pale grey screen that says:

> **Hey there! 👋**
> Tap the mic below to talk with Kira — she picks up where you left off.
> [ 🎙 **Talk to the assistant** ]

And along the top of my own account, a black banner:

> ⚡ **Tired of generic AI?** Kira is just one of our specialized Voice AI agents. **Explore All Agents →**

I have just been sold something, and the first thing my account does is advertise other products at me. Take that off the logged-in side. It's the equivalent of a bloke handing me a business card for his mate's firm while I'm signing his invoice.

Other things on that screen:

- **"Talk to the assistant."** She's called Kira everywhere else — in the hero, the FAQ, the Genome, the page title. The one button where I actually meet her calls her "the assistant". Call her Kira.
- **"My Kiras" and "New Kira"** in the left menu. The whole pitch was *your own* Kira, one per business. Plural Kiras and a button to make another one contradicts that in the first three seconds. And I can't tell the difference between "My Genome" and "Knowledge" — which one holds what?
- **Nothing on the screen mentions my business.** No name, no valuation, no "here's where you're up to", no "start here". After I've just told you my turnover, my profit and that the business would struggle without me, being greeted with "Hey there! 👋" is cold.
- **Clicking the Kira logo while signed in takes me back to the sales page** — the demo, the pricing, the FAQ — with no obvious way back to my account. I got stuck there once.

**Opportunity:** the first authenticated screen should be the Genome progress bar and one sentence: *"You're at 12%. The quickest win is ten minutes on how you price a job — shall we?"* You've already got the number, and it's the number I care about. Greet me with my own scoreboard, not a wave.

---

## 7. `/my-genome` — mine, not the example

The frame is right, and one line in particular:

> "53 things captured, plus 3 documents you have shared. **49 of them are dated to the conversation you said them in — that is what a buyer's accountant will want to see.**"

That clause is the whole product in one sentence. And being told 49 of 53, rather than rounding it to "all", is exactly the kind of honesty the rest of the site trades on.

But what's actually inside doesn't read like a business document. Filed under **"How work comes in — Where does revenue come from, and does it depend on you?"** I found:

> "Wants to track emails sent to IRIS and recognizes email access is needed for better support."
> "Wants to find the current balance in Xero for Global Buildtech Australia as a one-off task."
> "Is focused on collaboration or integration of Executor AI within the financial planning ecosystem in Australia, particularly through XPlan."

None of those are answers to "where does revenue come from". They're notes-to-self filed in the wrong drawer. The example Genome sorted things beautifully; the real one has put the shopping list in the accounts folder.

And the voice is wrong. Entries read **"Dennis intends to put Executor.AI up for sale"** — third person, using my own first name — under a heading that says **"You said this on 25 July 2026"**. Pick one. A handover document that talks about me in the third person reads like a file somebody keeps *on* me, not a document I own. If a buyer's accountant is going to read this cold, it wants to read like minutes, not like surveillance notes.

Also, plain English: "recognizes email access is needed for better support" is not how anyone talks. If she's writing down what I said, write down what I said.

**Opportunity:** let me correct an entry, and let me delete one. Half of what's in there is going to be slightly wrong, and if I can't fix it I'll stop trusting the whole file. A pencil icon next to each line, and a "that's not right" that she picks up next time we talk, would do more for my confidence than another feature.

---

## 8. Settings

Better than I expected. Plan and fair-use allowance, Manage billing, Cancel my plan, Password, Notifications, Delete account. **Both of the dangerous ones tell you what they do before you press:** "Permanently delete your account and everything in it. This cannot be undone." That's the right way round.

Two things:

- **"You're on a paid plan."** Every other page on the site says payments aren't live and nothing can be charged. This one says I'm on a paid plan. Given section 2, this is the last place you want another version of the money story.
- **There's no profile.** No name, no business name, no phone, no trade. The whole premise is that she knows my business — and the settings page doesn't know what it's called. That's also where I'd expect to find "export everything", which you promise repeatedly on the marketing pages ("yours to keep", "if you stop paying us, you keep it") and which I couldn't find anywhere inside. If the export is the reassurance, put the button where a worried person will look for it.

---

## 9. The admin door

I typed `/admin` into the address bar, because I'm exactly the sort of person who does. It bounced me to an operator sign-in with:

> "That account isn't an operator account. If you came here to use Kira, sign in as a user instead."

Correct, clearly worded, and it didn't let me anywhere near. Good.

**But: on one of those loads, the sign-in box rendered this where the form should have been:**

> "AuthForm is missing a Supabase client. Pass `createBrowserClient` from `@supabase/ssr` (with `supabaseUrl` + `supabaseAnonKey`) or a pre-built `supabaseClient` prop."

Screenshot: `44-settings.png`. On the next load the form appeared normally (`45-admin-blocked.png`), so it may be a flash while the page assembles rather than a permanent break — I'd want a developer to reproduce it rather than take my word. But of all the pages on the site to show me a programming error, the one guarding the door is the worst. If your locked door can stutter, I stop believing the sentence on the advisor page about my data being isolated "by the database, not by application code remembering to filter".

Small thing: from that rejection page the only way out is the "sign in as a user" link. There's no link home.

---

## 10. On the phone

I did most of this on a laptop, but I checked the phone because that's where I'd actually do it — sitting in the ute between jobs.

Good: nothing runs off the side of the screen, the text is a proper readable size, and the eleven questions are genuinely easy to do one-handed. That matters more than anything else on the phone and you've got it right.

Two irritations:

- **The top bar is cramped.** The logo, then "Sign in" wrapped onto two lines, then a big yellow "Value my business" button, then a hamburger — all fighting for the same inch. "Sign in" broken across two lines looks like something's gone wrong.
- **The black "Report a problem" tab parks itself on top of the paragraph I'm reading.** On the front page it sat directly over the middle of the hero text. On the valuation page it sat over the footer. It's the one thing on screen that follows me around, and it's the one thing I don't want.

---

## Other Strategic Feature Suggestions

1. **A "don't tell anyone yet" mode, said out loud on the front page.** Your copy already knows this is the real fear ("Most owners start this before they've told anyone"). Turn it into a feature with a name. No emails to my business address unless I say so; nothing that shows up on a shared screen; a plain-English line about what would happen if my bookkeeper opened my laptop. You'd own something no competitor would think to build, because they haven't understood the customer.

2. **A number I can put in front of my accountant without your branding on it.** The four "where the value is hiding" figures on one page, in a form I can print. That page becomes a conversation with a professional I already trust, and it's the cheapest referral engine you'll ever build.

3. **Tell me what it costs me to do nothing.** You show me a $436,710 gap. Show me the other half: at my age, every year I don't start is a year of the business still running on me. One line — "the owners who close this gap take 18 months to do it" — turns an interesting number into a reason to start this month rather than next year.

4. **Let me nominate one person who can see it if something happens to me.** I'm 66. The reason my knowledge isn't written down is the same reason my wife couldn't run the business for a fortnight if I came off a ladder. A named "if something happens to me, this person gets the handover document" is worth more to me than most of what's on the feature list — and it's a reason to start capturing today rather than when I'm ready to sell.

5. **Say which accounting system, on every page that mentions accounts.** Xero appeared once, inside a Genome entry, by accident. If it's Xero-only, say so early — I'd rather find out on the front page than after I've told her about my suppliers.

---

## Standards Check

- **§1 Responsive** — ✅ At 375px and 1440px there's no sideways scroll (scrollWidth = clientWidth at both), body text is 16px, the questionnaire is comfortable on a phone and the nav collapses to a hamburger. Marked down in prose, not here: the mobile header is cramped and "Sign in" wraps to two lines.
- **§2 Auth-page pattern** — ✅ `/login` has "Forgot password?", a working show/hide toggle on the password field, and "Email me a magic link". I did not exercise the reset email itself.
- **§4 Authenticated chrome + Settings** — ✅ with a caveat. Persistent left nav on every signed-in page (My Kiras / My Genome / Knowledge / New Kira), Settings and Sign out anchored at the bottom with the account email. `/settings` has Plan/Billing, Password, Notifications and Account/Delete. **No Profile section at all** — no name, business name or phone anywhere.
- **§5 Explanatory header** — ❌ on the signed-in side. The marketing pages and the valuation all open with a proper what-this-is paragraph (`/genome`, `/what-she-does` and `/business-valuation` are exemplary). The first authenticated screen opens with "Hey there! 👋 Tap the mic below" — that's a greeting, not an explanation of what the surface is or what to do.
- **§6 Voice agent** — ✅ "Talk to the assistant" is on the signed-in home, one click from anywhere, plus a "Talk to Kira" affordance on the app pages. I did not put a microphone to it, so I'm confirming reachability only.
- **§7 Scaffold metadata** — ✅ Real titles, not the framework default: "Kira — your fractional exec", "Sign in · Kira", "What Kira does — and what she doesn't · Kira", "For brokers & accountants · Kira". Nitpick: `/business-valuation` and `/genome` both fall back to the generic site title rather than naming the page.
- **§8.5 Dual-portal separation** — ✅ Signed in as the non-admin user I landed on a real user home distinct from `/admin`, with my own Genome behind it. Typing `/admin` bounced me to `/admin/login` with "That account isn't an operator account." Not a facade. Marked in prose: the admin login flashed a raw `AuthForm is missing a Supabase client` error on one load.
- **§9 Codicils** — ❌. Consequences: good — "Cancel my plan" and "Permanently delete your account and everything in it. This cannot be undone" both state the outcome before the click. Dead ends: the admin rejection page has no route home, and signing in then clicking the logo strands you on the sales page with no way back to your account. Address autocomplete: no address field appeared in anything I touched, so nothing to judge (—). **The reason this is a ❌ is the billing contradiction** — four different accounts of what I'll be charged and when, on pages that link to each other, is the clearest possible failure of "the next action is obvious and honestly described".

---

## Scope note

What I didn't get to, and why:

- **I never actually talked to Kira.** No microphone at this end. Everything I say about her voice, memory and manner is from what the pages claim, not from using her. That's the biggest hole in this report — the product is a conversation and I only read the box it came in.
- **I didn't create a new account** (I signed in with the test user you gave me), so I haven't seen signup, the password-reset email, or what a genuinely empty Genome looks like on day one. Given my whole objection in section 6 is "the inside doesn't match the outside", the day-one empty state is the screen I'd most want walked next.
- **I couldn't open the collapsed sections on `/genome`.** My browser fell over twice on that page. Treat "six of seven sections have no content" as unconfirmed.
- **I couldn't confirm whether the price actually moves with the gap.** I ran a much larger business through the calculator, but the result didn't survive the trip to `/plan` (see section 3), so I never saw a second price.
- **The 13-slide demo, the "Hear Kira" narration, and the advisor request-access form** I looked at but didn't work through.
- My browser crashed and reloaded pages under me several times during this. Where something looked wrong I re-checked it before writing it down; anything I couldn't re-check is flagged as such above.

I've been told by a broker that what I've built is worth less than I think. Your calculator told me roughly the same thing, and then it was the first thing that explained *why*, and the first thing that offered to do something about it other than lower my expectations. That's why I've bothered with all this. Sort out the money story and make the inside feel like the outside, and I'd give it a go.

Ray
