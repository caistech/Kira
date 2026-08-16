# Kira — walkthrough by Ray, 16 August 2026

Hi Dennis,

I'm 66. Thirty-five years in electrical and mechanical contracting, fourteen on the books, about $3.2m through the door. I've been turning over the idea of getting out for a couple of years and I haven't said it out loud to anyone, including my wife most weeks. A broker told me last year my business was worth "maybe two times", which I thought was rude and privately suspected was right.

So I'm the man you built this for. I went in properly — read the front page top to bottom before I touched anything, did the thirteen questions honestly, put in a code you gave me, and then spent most of my time inside the paid part, which is what you asked for. Here's what happened, screen by screen.

Short version: **the valuation is the best thing I have seen from a business like yours, and the thing behind the paywall is not finished.** The two are far enough apart that if I'd paid $999 a month on the strength of the first one, I'd have been on the phone within the week.

---

## The front page

I read the lot. It's long and I didn't mind that — I'm not in a hurry and I don't trust short.

What landed: "the thing you would be selling is mostly you." That's the whole business in nine words and it's the reason I kept going. "Most owners start this before they've told anyone" — you knew to say that, and you said it early. Good.

What I noticed and filed away: the plumber example is a plumber, and then the "real one" example I found later is *also* a plumbing business. Two plumbers. It started to feel like there's one worked example in the building and everything else is dressing. Small thing, but I'm the sort who notices when the same photo turns up twice in a brochure.

The pricing is honest and unusually so. "Billed after the month, and if you cancel the month is on us" and "after 12 months you drop to a third whether or not we think it's done" — that's a man not trying to trap me. The "+ GST" is on every figure. The bit about your fee being set by *my reported profit* and not by the gap you calculate is the single smartest sentence on the page, because it's the first objection I had.

**Opportunity:** put a second worked example on there from a business that isn't a trade — a small manufacturer, an equipment hire yard, anything. Right now the whole product is evidenced by one plumber, and blokes like me read that as "he's done this once."

---

## The invitation code

You gave me a code and a link. I pasted `kiraexec.com/plan?code=6JUG-L7W3-94K4` into the bar.

The page sat completely blank for the better part of twenty seconds. Not slow — *nothing*. White. I reloaded it because I assumed I'd broken it, and then it came up and said: **"Let's find your number first. This page is built around the value gap in your business. Take the 3-minute valuation and it'll bring you right back here."**

Not one word about the code. It wasn't rejected, it wasn't held, it wasn't mentioned. As far as that page was concerned I'd never had one. There is no "invitation code" link anywhere on `/plan` until *after* you've done the valuation — I checked the whole page.

That's two problems on top of each other. The blank twenty seconds is the worse one, because a page that's blank and a page that's broken look identical, and I have no way to tell which I'm looking at. I hit the same thing later on `/sample-genome` — the page you link as "See a real one" — blank for eighteen seconds, then fine after a manual reload. Both times the server was actually fast (the page comes down in under three seconds if you fetch it plainly); it's whatever happens in the browser afterwards that stalls.

The second problem is that you sent me a code and the code's own URL pretends not to know about it.

**Opportunity:** if someone arrives with `?code=`, say so at the top before anything else — *"Your invitation is recognised. First, three minutes on the numbers."* Then I know the thing in my hand is real, and the valuation stops feeling like a hoop and starts feeling like step one.

---

## The valuation — thirteen questions

This is excellent and I want to be clear that I mean it.

The questions are the right questions and they're in my language. "If you took a 3-month holiday tomorrow, what happens?" — I have thought about that at 3am and never had anyone ask me. "Your processes, pricing and know-how are… mostly in my head, I just know how it all works." Yes. That's it exactly.

The help text under the profit question — add back your own salary, add back the interest because the buyer's valuing the business not your loans, worked through with actual numbers — is better than the explanation my accountant gave me, and he charges by the hour.

Two nitpicks:

- The industry question says **"Start typing and pick the closest match"**. It's a plain dropdown. You can't type into it. I tried, then scrolled sixty-odd options.
- On the page itself the heading and the intro paragraph get overlapped by the bar at the top as you scroll — the sentence reads "...the hardest thing to value.Answer 13" with the word "Kira" sitting on top of it. It's cosmetic but it's on the first screen of the free product. (`05-valuation-back-no-selection.png`)

**Opportunity:** let me type in that industry box. My trade is "electrical and mechanical contracting" and I'd have found it in two keystrokes instead of scrolling past forty things that aren't me.

---

## The result

Walk away $192k–$288k. Worth today $1,130,000. Captured $1,320,000. Gap $190,000. Transferability 30/100.

I sat with that for a minute. It's more than the broker said and less than I'd hoped, which is about where truth usually sits.

What made me believe it, in order:

1. **You showed the workings.** 2.9× sector median, band 2.1× to 4.2×, hard floor 1.5× and ceiling 5×, and *why* — "below about eighteen months of profit a seller doesn't sell, he keeps working it." That is exactly how I'd think about it if I were buying.
2. **You told me what you'd left out.** The property isn't in the figures, and then you told me the thing I genuinely had not thought about: a buyer will re-work my profit at market rent. I've been charging the business under the odds for eleven years. You just told me my number moves down when someone works that out, and you told me *before* trying to sell me anything. That bought you more credit than the rest of the page combined.
3. **The range for the gear is a range and the business figures aren't**, and you explained why rather than putting a fake ± on everything.

The honesty here is the product. Whatever else you do, don't let anyone tidy this page up.

**Opportunity:** put a "print this" instruction next to the print button aimed at what I'd actually do with it — *"Take this to your accountant."* Right now it's a button. Make it an errand, because if I hand this to Geoff at the accountant's, you've got a second reader who tells other owners.

---

## The number changed, and I noticed

The valuation said the gap is **$190,000**.

The `/plan` page said **"There's $184,000 locked in your head"**, twice.

My dashboard says **$190,000**.

My Genome page says **$184,000**, in big white letters in a purple box.

Same session. Same account. Same answers. Four screens, two numbers, six grand apart.

I know it's only 3%. That is not the point. The one thing you are selling me is a number, and the number is different depending on which of your own pages I'm standing on. If I showed this to my accountant that's the first thing he'd circle, and I'd look like a mug. It also undermines the very best thing about the valuation page, which is that it showed its workings — because clearly the workings aren't shared between the pages.

**Opportunity:** one number, computed once, stored once, read everywhere. And if the two are genuinely different things — one before debt, one after, say — then label them differently, because right now both say "locked in your head".

---

## Getting in

Code entered on `/plan`, accepted straight away, told me the account was for `dennis+betatester2@...` (which I understood was the arrangement), password, tick the terms, in. Clean. Took under a minute. No complaints.

The plan card is good: "Nothing is charged today — your card is saved, not billed", "We email you 3 days before every payment", "Cancel any time — the month you are in is never billed". Consequences stated before the click, which is more than most.

---

## The dashboard

Landed on it directly, which I appreciated — no bouncing me through a setup thing.

Then three stacked boxes before any of the actual product (`08-dashboard-first.png`):

1. "There's a business valuation saved on this device — that's mine / not mine"
2. "Kira can't send email as you yet"
3. "FIRST THING — 0 of 3 done — **Ray, start with where the business stands today. Thirteen short questions...** Answer the questions"

That third box is asking me to do the valuation. I had *just done it*. It was sitting in box one, waiting for me to claim it. So the page is simultaneously telling me it has my valuation and telling me to go and do my valuation.

I clicked "That's mine — use it". It said **"Saved. Bringing the rest of the page up to date…"** — and then didn't. Still 0 of 3. Still "start with where the business stands today". I sat there long enough to feel silly. It was only when I reloaded the page by hand that it caught up and said 1 of 3 done with my figures in it.

You wrote the words "bringing the page up to date" and then didn't bring the page up to date. That's a small bug with a big cost, because it's the first instruction I followed inside the paid product and it appeared to do nothing.

Once it did refresh, the dashboard is genuinely good. The four-week plan reads like a plan, not a pitch. "Your baseline, taken 16 August 2026. It stays fixed so progress is measured from one starting point" — I understand exactly what that means and why.

**Opportunity:** if a valuation is already on the device, don't offer me the choice *and* the chore. Merge boxes one and three: *"We found your valuation from ten minutes ago — $190,000 gap. Is that yours?"* One box, one decision.

---

## My Genome — the nine funnels

This is the screen you most wanted an answer on, so I'll be careful.

**Do I understand what they're telling me? No. I understood the words underneath them, and I ignored the pictures.**

Here's what I actually see (`10-my-genome.png`, `21-funnels-after-chat.png`): nine funnel shapes. Seven have a small **red** block sitting in the narrow bottom. Two are empty outlines. Underneath each is a yellow "You told us" or a pink "Nothing yet" badge and a sentence.

Four things go wrong, and they compound:

**1. Red means bad. It has meant bad my whole life.** Nine red-bottomed shapes is nine warning lights on a dashboard. Your caption says "the colour shows how much of each one Kira has captured so far — not how good that part of the business is", and I read that sentence, and it did not survive contact with the colour. The picture won. I looked at that and my gut said *the business is in trouble in nine places*.

I'm not guessing about this. Later on I asked Kira herself what the red meant, and she told me: *"The nine funnels all being red on your Genome page means those key areas of your business still lack enough detail to be buyer-ready."* Your own assistant reads it as an alarm. If she can't hold the distinction your caption is making, I've got no chance.

**2. A funnel means things leak out.** Every funnel I've seen in thirty-five years of business — sales funnel, enquiry funnel — is a picture of *loss*. Wide at the top, narrow at the bottom, most of it doesn't make it through. So the shape is already telling me a story about things falling out, and then you're using it to mean the opposite: a container filling up. Those fight each other.

**3. The fill is at the narrow end, so it always looks worse than it is.** One band out of five at the *bottom* of a funnel is a tiny wedge. Even when it moves to two bands it'll barely change. You have picked the one shape where progress is least visible.

**4. There's no number.** Not "1 of 5". Not "20% captured". Not "2 of 9 areas done". Just a shape. I cannot tell whether I'm at the start, a third of the way, or nearly there, and there's nowhere on the page that tells me.

Then I found `/sample-genome` and it clicked, and made it worse. A **finished** funnel is green at the top, pale green, brown, and **still red at the bottom** (`25-sample-genome-funnels.png`). So the red is permanent. It's a green-to-red gradient running downwards — which is a traffic light, not a gauge. Complete and empty both have red in them, and the only way to tell them apart is to count bands.

**What would work for me:** a bar, or a jar, or a fuel gauge — anything that fills upward and is *one colour, getting more of it.* Grey for empty, filling with the same green. Plus a number: "2 of 9 areas answered". If you must keep the funnel, at least turn it up the other way so the fill is visible, and stop using red for "not yet". Amber for "you mentioned it", green for "done", grey for "nothing", and nothing red at all until something is actually *wrong*.

The badges and sentences, on the other hand, work well. **"You told us how the work actually gets done is in your head, not written down."** That's my business, in my words, back at me. I read all nine of those and I got it immediately. The pictures added nothing and cost you my trust for the first thirty seconds.

**Opportunity:** try shipping it with the funnels removed entirely and just the nine cards with their badges and sentences. I'd bet money it tests better. The picture is doing negative work.

---

## Clicking a funnel — the area panel

The funnels are clickable, but nothing says so. No underline, no arrow, no "view", no change when I hover that I'd trust. There's a small "Open your Genome" link at the top right of the box which I did click — **and it goes to the page I'm already on.** Nothing happens. I clicked it three times.

I only found out the funnels were clickable by accident. A bloke my age doesn't go poking at pictures to see if they do something.

When I did get in (`11-area-demand.png`), here's the entire screen:

> **← All nine areas**
> **Where the work comes from**
> A buyer's advisor asks: Where does work come from, and does it come to him personally?
> **Not checked yet**
> Kira has not captured anything about this part of your business yet. Once she has, checking it will tell you which of a buyer's questions you have actually answered.
> [ Check this area ] ← greyed out
> Filling in every area takes you to the top of your sector's range.

That's it. Half a screen of content and a wall of white space to the right.

You asked me whether the empty state reads as *honest* or as *broken*. Here's my honest answer:

**The sentence reads honest. The screen reads broken.** And the screen is what I looked at first.

Specifically:

- **"Check this area" is greyed out and doesn't say why.** I clicked it. Nothing. No tooltip, no message, no explanation. A greyed button with no reason is the universal sign of software that isn't finished. I never saw the message you wanted me to judge — *"Nothing could be checked yet, talk to Kira about this area first"* — because the button won't let me press it. You wrote a good honest refusal and then made it unreachable.
- **There is no "Talk to Kira about this area" button.** I looked. It isn't there on any of the nine. So the one thing the page tells me to do — talk to her — has no door on the page telling me it. I have to remember it, go back, find the nav, find the chat, and then somehow raise the topic myself.
- **It contradicts the page I just came from.** One click earlier the card for this exact area said *"You told us your client base is steady."* One click later: *"Kira has not captured anything about this part of your business yet."* Which is it? I told you or I didn't. That's not a subtlety I'm going to work out; it's just wrong.
- **Zero next action.** The only live thing on the page is "← All nine areas". Every one of the nine is identical.

Nine identical dead ends is the answer to your question. Not homework I'll never do — homework doesn't have a door. This is a room with no door at all.

**Opportunity:** replace the greyed button entirely. Put one live button on that panel: **"Tell Kira about this"** — and have it open the conversation with her already asking the buyer's question at the top of the panel. *"Ray — where does your work come from, and does it come to you personally?"* Then the nine areas stop being a report card and become nine short conversations, which is what you're actually selling. That single change turns the worst screen in the product into the best one.

---

## Talking to Kira

From the dashboard, "Start talking to Kira →". I have no microphone on this machine, so I used the type option, which was easy to find and clearly labelled. Credit for that.

Then the tone falls off a cliff.

The page I landed on says **"Review Framework"** and, at the bottom, **"Listening for your framework..."**. The next screen is headed **"Review Your Framework"** with fields called **Primary Objective**, **Key Context**, **Success Definition (Optional)** and **Constraints** (`14-setup-draft.png`).

Dennis. I've just come from a page that said "You spent thirty years building it" and "the conversation you have had with yourself". Now I'm filling in a Primary Objective and a Success Definition. That's a consultant's intake form. That is the exact language I've been dodging for a decade. If a young fella in a good shirt used the words "success definition" at me I'd know the meeting was going nowhere.

It's also the wrong shape. The button says "Create My Kira" and the text says "before creating your Kira" — but I *already created an account*, I already paid attention to a page that said "No forms, no setup. Just start talking." Now there's a form. It asked me for my name and my town again, which I'd already given it on the valuation.

And the whole thing took about twenty seconds after I pressed Create, with nothing on screen telling me it was working.

**Opportunity:** kill that screen. If you need the same three facts, have her ask them in the first two lines of the conversation, which is what you promised. Failing that, at minimum rename the fields: "What do you want to sort out?" / "Anything I should know?" / "What would good look like?" — same boxes, no jargon, and "framework" deleted from the product.

---

## The conversation itself

Once I got in, it works. It's fast enough (about ten to twelve seconds a reply) and she understood me.

I told her: *"Most of it is repeat commercial builders I have known for twenty years, and two of them ring me directly on my mobile."*

She said: *"Got it: most work comes from repeat commercial builders known for about 20 years, and two call you directly on your mobile. Want me to capture anything about those key clients, or move on to how you manage these relationships?"*

So I gave her the real one. The thing I don't say out loud:

*"Bartlett Constructions is about 30 per cent of our turnover, I have known Mick Bartlett since 1994 and he only ever deals with me. If I went tomorrow I honestly think that work would go with me."*

Her reply, in full: *"Got it — Bartlett Constructions is 30% of turnover, Mick Bartlett has dealt only with you since 1994, and the work would likely leave if you did. **Anything else on the big clients and repeat work, or something new?**"*

That's the moment the product lost me, and I want you to see why.

I have just handed her the single most expensive fact about my business. Thirty per cent of a $3.2m turnover walks out the door with me. Your own front page says the gap is $190,000 and that the gap *is* the stuff in my head — well, that sentence is most of it. A part-time general manager, a real one, would have stopped dead and said: *"Ray. That one is worth more than everything else we'll talk about this month. Here's what a buyer does with that, and here's the three things we do about it over the next year."*

She said "Anything else?"

She's a very good note-taker. She is not, on this evidence, the thing the front page sold me — "asks the questions you haven't thought of", "pushes back when something is unclear". In four exchanges she pushed back on nothing and asked me nothing I hadn't already raised.

To be fair, when I later asked her directly *"what did I tell you about Bartlett Constructions and what should I do about it?"*, she remembered it perfectly and gave a sensible answer — reduce the dependency, document the relationship. The memory works. It's the initiative that's missing. She'll answer well if I know what to ask, which is precisely the thing a bloke who's never sold a business doesn't know.

And she never once used the number. Not "$190,000", not "that's most of your gap", not "your transferability score moves when we fix this". You have built an entire product around one figure and she doesn't seem to know it exists.

**Opportunity:** give her one rule — when the owner says something that moves the number, say so, in dollars, immediately. *"That's roughly $60,000 of your gap in one sentence."* That's the moment I'd tell my mate at the golf club about. Everything else in the product is a report; that's the product.

---

## Where the conversation went — and this is the bit that spooked me

I went back to My Genome to see it fill in.

The funnels: **unchanged.** Same red. The card for "Where the work comes from" said exactly what it said before I'd spoken. I clicked into the area: still **"Not checked yet"**, still *"Kira has not captured anything about this part of your business yet"*, still a greyed-out button. The header still says "It grows every time you talk to her". It plainly didn't.

Then I scrolled further down that page than I had before, and found things I wasn't expecting. In order, on the one page:

- **"Nothing is filled in yet"**
- **"8 things captured."**
- then all nine areas, each marked **"Not captured"**
- then a box headed **"Not yet filed (8) — Kira has these but has not worked out where they belong yet. They are not lost."**

Four statements about the same thing on one page, and they don't agree. Nothing / eight / not captured / eight unfiled.

And inside that last box (`20-not-yet-filed.png`), written about me in the third person:

> · If **the owner** left, the work from Bartlett Constructions would likely leave as well.
> · **The owner** has known Mick Bartlett since 1994...
> · What **he** said **he** wants to work on, in his own words when **he set me up**: I run an electrical and mechanical contracting business...
> · **His** own valuation, from the eleven questions **he** answered before signing up: worth today $1,130,000... **These are HIS figures from HIS answers — never ask him to send them to me.**

That last line is a note the machine has written to itself about me, in capitals, and it's sitting on my own screen.

I know, rationally, that this is the plumbing showing. But sit where I'm sitting. I have just told this thing that I'm selling and nobody knows. Two clicks later I'm reading it referring to me as "the owner" and "he", and giving itself instructions about what not to ask me. It stopped feeling like something I own and started feeling like a file somebody's keeping on me. That is the precise fear your front page went to real trouble to disarm — "it ends up in your filing cabinet, not ours" — and this undoes it in one screen.

Two smaller things in the same box: the same Mick Bartlett fact is in there **twice**, worded slightly differently (entries 2 and 6), so the count of eight is partly padding. And it says **"the eleven questions he answered"** — it was thirteen. You advertise thirteen on three separate pages.

**Opportunity:** never show me the raw notes. If something can't be filed yet, say so in my language and in the second person: *"I've picked up 5 things about your clients that I haven't filed yet — have a look and tell me if I've got them right."* Same information, same honesty, and it reads like she's working for me instead of about me. And whatever else — get "never ask him to send them to me" off my screen today.

---

## Coming back to the conversation

I navigated away and came back to the chat. **The transcript was gone.** Blank page, "Ready when you are". Meanwhile the voice panel beside it says "Welcome back — Kira remembers where you left off."

She does remember — I tested it and she recalled Bartlett fine. But I can't see any of it. On a phone-sized screen my dashboard also shows the agent as **"0 conversations"** after I'd had one.

So: she remembers, the page doesn't show it, and the counter says it never happened. For a man being asked to pour thirty-five years into this thing, "where did what I said go?" is not a small question.

**Opportunity:** show the transcript. It's the receipt. It's also the thing I'd scroll back through at night thinking "did I tell her about the retentions?"

---

## Settings, Knowledge, sign-in

No complaints, and I'll say so plainly because everything above is criticism.

- **Settings** is the best-written page in the product. Profile, business details, connected accounts, plan and usage ("There's no card on your account, so nothing can be charged"), password, notifications, sign out everywhere, delete account. Every section says what it does and what happens. "Signs you out of Kira everywhere — this browser, your phone, and any machine you have used and left signed in. You can sign back in whenever you like; nothing is deleted." That is how you write for me.
- **Sign-in page** has forgot-password, a show-password eye, and a magic-link option. All three there, all obvious.
- **Knowledge** is clear about what it does and why. "Remove anything that's out of date so Kira doesn't work from a stale copy" — good, that's the instruction I'd have needed.
- **The nav** stays with me on every page and collapses to a proper menu on a phone.

---

## On a phone

I looked at it on a phone-sized screen because I'd probably use it in the ute.

Mostly fine — nothing runs off the side, the menu collapses properly, the funnels go two across and stay readable. Two things:

- The black **"Report a problem"** button floats over the text in the bottom corner and covers it. On the area panel it sits right on top of the explanation and I lost the end of the sentence (`24-area-375.png`). Same on the Genome page.
- Some of the smaller text is around 14px. I wear glasses for close work and I was leaning in. On a page where the small print is the part that builds trust, that's the wrong place to save space.

---

## Standards Check

| Item | | Evidence |
|---|---|---|
| Responsive (375 & 1440, no side-scroll, ≥44px targets, ≥16px text) | ❌ | No horizontal scroll at either width and nav collapses correctly — but the floating "Report a problem" button overlays body text at 375px on `/my-genome/demand` and `/my-genome`, and secondary copy renders at 14px on mobile. Two text links measure 20px and 17px tall. |
| Auth-page pattern (forgot password / show password / magic link) | ✅ | `/login` has all three; show-password toggle present as a real button. |
| Authenticated chrome + Settings | ✅ | Persistent left nav on every signed-in route, collapsing to "Open menu" at 375px; `/settings` reachable in one click with Profile, Business, Password, Notifications, Signed-in devices and Account sections. |
| Explanatory header on every page | ✅ | Every page opens with what-it-is/what-to-do. Weakest is the area panel, which explains itself but offers nothing to do. |
| Voice agent reachable in ≤3 clicks | ✅ | "Talk to the assistant" on `/start` and on the chat page, one click from the dashboard. Could not test the voice itself — no microphone. |
| Scaffold metadata (real tab title) | ✅ | "Kira — your part-time general manager", "Overview · Kira", "Where the work comes from · Your Genome · Kira". Real titles throughout, served in the HTML. |
| Consequence clarity | ✅ | Billing consequences stated before every click ("nothing charged today", "3 days' warning", "the month you're in is never billed"); delete-account and sign-out-everywhere both spell out what happens. |
| Zero dead ends | ❌ | All nine area panels end in a greyed-out button with no explanation and no alternative action. "Open your Genome" links to the page you are already on. "Bringing the rest of the page up to date…" required a manual reload. |
| Prices show tax | ✅ | "+ GST" on every figure I saw — landing, plan page, FAQ, and the valuation result ("$999 + GST a month"). |

---

## Scope — what I did and didn't cover

About seventy minutes, on a laptop at 1440px with spot checks at 375px, in one session on 16 August 2026.

**Covered:** the full landing page; the invitation-code URL and the bare `/plan` page; all thirteen valuation questions and the result page; code redemption and account creation; the dashboard before and after adopting the valuation; My Genome; all nine area panels; the `/start` text path; the setup form; four exchanges of real conversation with Kira and a memory-recall test; Knowledge; Settings; the sign-in page; `/sample-genome`; and a mobile pass over the dashboard, My Genome and an area panel.

**Could not reach:**
- **Voice.** No microphone on this machine. Everything I say about Kira comes from typing to her, and the voice experience is the one you actually built — a face-to-face conversation might well push back where the text one didn't. Treat every judgement about her manner as provisional.
- **Anything that takes weeks.** The four-week plan, whether the funnels fill over time, whether the handover document is any good, whether she keeps her word about updating documents instead of making new ones. I saw one afternoon of a product sold on months.
- **The documents.** I saw the three download buttons and didn't press them; I've no real Genome to download yet.
- **Google Drive, email sending, billing.** No card on the account, no business details entered, nothing connected. So the whole "she files it into your own Drive" promise — which is a big part of why I'd trust this — is untested by me.
- **The advisor/broker side.** Never saw it and wouldn't have.

---

## What I'd actually do

If you asked me tonight whether I'd keep paying $999 a month: **not yet, but I'd stay on the list.**

The valuation earned my trust in about eight minutes, which is fast for a bloke like me. The conversation is decent and her memory is real. Settings, the pricing, the honesty about what she can't do — all of it is the work of someone who's been on my side of the desk.

But the part I'd have paid for is the part that isn't wired up. The nine areas are the deliverable — that's the document I'd hand a buyer — and today they're nine identical dead ends that don't move when I talk, painted in a colour that says something's wrong, contradicting each other on the same page, with the machine's private notes about "the owner" visible underneath.

Fix three things and I'd sign:

1. **Put a live "Tell Kira about this" button on every area panel**, opening the conversation with the buyer's question already asked.
2. **Make the picture tell the truth** — one number, one colour, filling upward, nothing red until something is actually wrong.
3. **Make the areas move when I talk to her**, and get the raw notes off my screen.

You've built the hard half. The half that's missing is the half I'd notice on day one.

Ray
