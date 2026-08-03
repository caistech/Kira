Hi Dennis,

Platform Feedback — Kira Walkthrough
Persona: Ray, 66, exiting owner | URL: https://kira-rho.vercel.app | Goal: explore cold, run the free valuation, decide whether I'd hand this my card and what's in my head | Duration: ~50 min

Straight up: the writing on this thing is the best I've seen aimed at someone like me. Whoever wrote "This is for one person: the owner in their sixties, three or four decades in, with a profitable business that runs on them" has actually sat across from one of us. And "Most owners start this before they've told anyone" is the sentence that stopped me scrolling, because it's true and nobody says it out loud.

Then I clicked the buttons, and three of the four pages behind them showed me a blank screen. That's the whole review in two paragraphs.

---

**The front page — right words, two headers**

There are two brand bars stacked on top of each other. A white "K Kira by Corporate AI Solutions" strip, and then underneath it a second sticky one with the avatar and the menu. Two `<header>` elements, confirmed. When you scroll, the top one slides up *behind* the sticky one and you get a ghost of the logo bleeding through the second bar. On the phone the two of them eat about 130 pixels before a single word of your headline. It's the first thing on the page and it looks like a build mistake, which is a rough way to open when your whole pitch is "we're the careful ones".

At 1440 the hero sits in the left 60% and the right 40% is empty white. Fine as a deliberate choice, but the voice card then floats into that empty space and, further down, sits directly on top of the one paragraph that explains what makes her different from every other AI — "She gets things done and clos... and every conversation builds on the las..." I read the whole page, so I noticed. Most won't; they'll just miss your differentiator.

The woman in the avatar looks like a stock call-centre render. You've written a page insisting this isn't a generic assistant, and then put the most generic possible face on it.

Opportunity: kill one header, and make the hero use the full width — a second column with the plumbing numbers next to the headline would do more work than white space. And either commission a real illustration or drop the face entirely; a monogram would be more honest than a synthetic customer-service woman.

---

**"Talk to the assistant" — it takes the question and eats it**

You put a voice agent on the public page with no account needed. Good instinct, that's exactly the low-commitment thing a suspicious bloke will try before anything else.

I clicked it. It didn't start a conversation — it silently turned into a text box saying "Type your question". No explanation of why. So I typed the question I actually wanted answered: *"Who else can see what I tell you? My staff don't know I'm selling."* Pressed Send. The box cleared. Nothing came back. No answer, no "thinking", no error message. I did it again with Enter instead of the button — same. I checked: not one network request left the page either time. The question just went into a hole.

That's the worst possible failure for this specific product. Not because a chat widget broke, but because the question I asked it is *the* question your buyer has, and the tool that promises to remember everything visibly forgot it in front of me. If a mic was required and I didn't have one, say so. Swallowing the question and clearing the box is what a broken form does.

Opportunity: the text fallback has to answer, or the widget has to admit it can't. And when it does answer, that particular question deserves a canned, exact reply — who can see it, under what circumstances, and for how long. Put it in writing on the page too, not just in the widget.

---

**The pricing story contradicts itself, on the one point you're proudest of**

On the pricing block: *"Which band you land in depends on the size of your gap."*

In the FAQ, four inches down the same page: *"her monthly fee is set by the size of your business — the annual profit you tell us, **not the gap we calculate**. That distinction matters: the tool that works out what your business is worth has nothing to gain from the number being bigger."*

Those cannot both be true. And the FAQ version is the one you're leaning on for credibility — you're explicitly telling me the calculator has no incentive to inflate. The pricing block above it says the calculator's output sets my bill. A bloke who's been told by a broker that his number is wrong reads that and thinks: *right, so the bigger my gap, the more they charge me.* You've handed the objection to me for free.

Then on the result page: "For your business that comes to $999 + GST a month." No working. Nowhere does it say which input produced $999. You made a virtue of the distinction and then never showed it.

Opportunity: pick one basis, say it once, and show the arithmetic on the result page — "$999 is 3.5% of the $340,000 profit you entered; it does not move with the gap." One line, and the whole trust argument lands instead of collapsing.

---

**The valuation itself — genuinely good, and a different website**

Clicking through drops you into what looks like a completely different product. Cream background, a different typeface, an orange-to-pink gradient wordmark, a purple gradient brain icon, pink pill buttons. The sober left-aligned page I'd just been reading was replaced by something that looks like a wellness app. Then the checkout page is a *third* look (centred, purple-to-pink gradient hero, sparkles), and the login is a *fourth* (grey and white). Four identities in one product. I'm being asked to trust these people with the thing I haven't told my wife, and I can't tell if I'm still on the same website.

The questions themselves are the strongest part of the build. Question 3 in particular — "What's left after all costs, plus the salary and perks you pay yourself... If the business kept $150k after costs and paid you $50k in salary and perks, add them together and enter $200,000" — that is the first time anybody has explained SDE to me in a way I didn't have to re-read. Question 8, the three-month holiday one, is the right question and you say so plainly.

The money field works well: type 2400000 and it becomes 2,400,000 with "$2.4 million" underneath. I've fat-fingered a zero on an ATO form before, so I appreciate that more than you'd think. Small thing: the "$" prefix sits a couple of pixels below the digits' baseline, which looks like a misalignment rather than a design.

"Sector: Plumbing · change" carrying across all eleven screens is right, and having "change it" again on the result — with "This sets the multiple, so if it is wrong the number is too" — is exactly the honesty I want.

Two friction points. The multiple-choice questions have no Next button; they wait about a second and then the screen changes under you. I read slowly and deliberately, and having the page move on its own while my eyes are still on the options I didn't pick is unsettling. And the line I most needed — *"kept on this device only, for 7 days, nothing is sent anywhere until you sign up"* — is below the Start button. That's the sentence that decides whether a man who's told nobody will type his turnover in at all. Put it above.

Opportunity: run one visual language through valuation, checkout and login. And move the "nothing leaves this device" promise to the top of the first screen, in the same size as the rest.

---

**The result — the arithmetic doesn't tie, and I checked**

Plumbing, $2.4M turnover, $340k SDE, flat, margins squeezed, top client 10–30%, "it would struggle" without me, "mostly in my head", $380k of gear.

- Walk away: $152,000–$228,000 (40–60c on $380k) ✓
- Worth today: $874,000, ~2.6× SDE ✓
- With knowledge captured: $1,020,000, ~3.0× ✓
- **Value locked in your head: $147,000**

$1,020,000 minus $874,000 is $146,000. Not $147,000. Your four contributing items below it (51,300 + 51,000 + 25,500 + 19,100) sum to $146,900, which is where the 147 comes from — you've rounded the two headline figures independently and then quoted an unrounded gap.

I know that's a thousand dollars on a million. It doesn't matter what it is. The gap figure is the number the entire product is built on, it's the number you print in giant type on a purple panel, and it's the one number a suspicious 66-year-old with a calculator will check first — because it's a two-number subtraction sitting right there on the screen. Getting it not-quite-right is worse than being out by fifty grand somewhere I can't see, because I *can* see this one.

The sourcing paragraph is the best thing on the page and I want to say so properly: telling me the multiples come from BizBuySell's 2025 US data, that there is no equivalent Australian dataset, that the AIBB's is members-only, and that Australian brokers use the same US data for that reason — that's a level of candour I have never had from a broker. That paragraph alone moved me.

Which is why the paragraph after it hurts. "This is a floor, not a ceiling... there is no rule that says a business on 1× cannot fetch 3× or 4× when the circumstances are right." Where did 1× come from? You just told me 2.6×. And more to the point: you've now covered yourself in both directions — if my real sale beats your number you were "deliberately conservative", and if it doesn't, it was "indicative only". Read cold, it stops being a limitation and starts being an argument. The honest half is the sourcing paragraph. That one's insurance. Cut it back to one sentence — "this is what the sale data supports and nothing more; a real sale can land above it" — and it reads honest again.

And the thing nobody has engaged with: I have already been told by a broker that this business is worth less than I think. Your number is $874,000. Is that more or less than his? You don't know, and you don't ask. That's the live conversation in my head, and the tool talks straight past it.

Opportunity: (1) derive the gap from the two rounded figures so a calculator agrees with you; (2) add a question — "has anyone given you a number yet? what was it?" — and speak to it directly on the result page. Even "your broker's figure is likely a multiple of EBIT rather than SDE, here's why they differ" would make me feel understood rather than sold to.

Also: there's no debt. You do say in the small print that it's before loans and I should subtract equipment finance. But what I actually want to know is what lands in my account. One optional field — "roughly what do you owe?" — and one line under the headline would answer the only question that matters to me.

---

**The buy page was blank for fifteen seconds**

I clicked "Start building your Business Genome". It went to /plan, and for fifteen seconds I looked at an empty cream page with a header and a footer and nothing in between. No spinner, no skeleton, nothing. No errors in the browser either. I ran it twice. Then eventually it filled in.

Same story on "See a real one" — that's your second-biggest CTA and it appears twice on the front page — which goes to /genome and shows a header and nothing else for at least eight seconds. And the login page: 6.6 seconds to first content, 7.8 to loaded, blank the whole time.

So the three pages behind your three main buttons are all blank-then-appear. I'll be blunt about what that costs you: I'm the man who closes the tab and mentions it to nobody. Fifteen seconds of white on the page where you ask for my card is not a slow page, it's a broken one, and I have no way to tell the difference. Whatever's happening — client-side rendering waiting on something, a hydration stall — the fix is the same: put something on the screen from the server on the first paint. Even the price card as static text would do it.

Opportunity: server-render the first screen of /plan, /genome and /login. This is, on its own, worth more than any copy change in this report.

---

**The checkout, once it appeared — and a typo in the price**

When it loads it's good. $999/month + GST, big and clear. "Billed at the end of each month, for the month just gone. Cancel any time and the month you are in is on us." "Nothing is charged today — your card is saved, not billed." "We email you 3 days before every payment." That is a genuinely fair deal and it's stated where I can see it before I click. I did not click, and I wouldn't on a first visit — but I read all of it, which is more than I do on most.

Then in the grey print directly under the button:

> "at the end of each month you pay **$999 + GST + GST** for the month just finished"

GST twice. On the price. On the payment page. In live mode.

I know what it is. But sitting where I'm sitting, that's the sentence that tells me how carefully these people handle numbers, three inches below a button that saves my card. And it's in the smallest, faintest text on the page — about 12px grey on cream — which is the wrong size and the wrong contrast for the paragraph that contains the actual billing terms. The terms should be the *most* readable thing in that card, not the least.

The button says "Start now". Nothing is charged, so that's defensible, but "Save my card and start" would say what it does, and with a man like me, telling him exactly what the click does is worth more than making it sound easy.

Opportunity: fix the GST doubling today. Then bump the terms paragraph to normal body size and colour. Nothing in that box should be quieter than the price.

---

**Privacy — you've written the right sentence, then said the wrong one twice**

This is the section that decides whether I hand you what's in my head, so I read every word.

*"It is never shown to a buyer and never shared with anyone who referred you. The handover document leaves out your own position — your plans, your circumstances, what you would accept."*

That is exactly right, and it's the most valuable sentence in the whole product. Somebody understood that the thing I'm most afraid of isn't a data breach, it's my broker or my accountant finding out what I'd take.

But then, twice on the same page, in two different sections: *"Our support team can see what she has captured when they need to keep the service running."* Saying it once is honest. Saying it twice is the thing I now can't stop thinking about — because "our support team" is a room of strangers who can read that I'm selling, and I haven't told my wife. Honest is right. Vague and repeated is not.

And in the FAQ: *"If an advisor introduced you, they can see that you signed up and how your valuation is moving."* Nobody introduced me, so it doesn't bite — but if one had, that's a leak I'd want on the front page, not the FAQ.

Opportunity: say it once, and say it precisely. Who, under what circumstance, is it logged, can I turn it off, can I see when it happened. A line in Settings saying "no one has accessed your Genome" would be worth more to me than any feature you could build.

---

**On the phone**

No sideways scrolling at 375, body text is 16px, the menu collapses to a hamburger. The basics hold.

Two things. The voice button is 24 pixels tall on the phone — I have plumber's hands and I'd miss it — and it's got a little microphone emoji in it, which is the only emoji left on a page you clearly cleaned up on purpose. Several bits of secondary text drop to 15px, including the "Free · no sign-up" line under your main CTA.

And one I can't fully stand behind, so take it as "go check this on a real handset": when I tapped the hamburger, the screen painted white. The menu items are all there in the page — I checked, they're laid out at 50px each and marked visible — but nothing rendered except the two floating widgets that sit on their own layer. That pattern (only the top-most floating layers survive) is what a stacking-order problem looks like: a white overlay landing above the drawer instead of behind it. It reproduced three times for me. It might be my browser. Please open it on a phone before you dismiss it, because if it's real then the menu is unusable on mobile and nobody will tell you.

Opportunity: 44px minimum on the voice button, drop the emoji, 16px floor on the CTA sub-lines, and someone with a real phone taps that hamburger today.

---

**Signing in**

The login page is the tidiest screen in the product. Forgot password, a working show/hide eye on the password field, and "Email me a magic link" as an alternative. Nothing to complain about, except that it's the fourth visual identity and there's no way back to the site except the logo.

---

**Two scores, one idea**

The valuation gives me "Transferability score: 32/100". The example Genome page gives me "On the page, not in your head: 57%". Same concept, two names, two scales. I couldn't tell you which one I'm supposed to watch go up, and you tell me on both pages that it's "the number to watch".

Opportunity: one number, one name, one scale, everywhere.

---

**Would I hand it my card, and would I trust it with what's in my head?**

The card — not today. Not because of the price. $999 against a $147,000 gap is arguable and you argue it well. It's that the page asking for my card was blank for fifteen seconds and then had GST written twice next to the amount. I'd want to come back in a month and see if it's steadier.

What's in my head — closer than you'd think, and that surprised me. The sentence about the handover leaving out my own position, and the paragraph admitting the multiples come from US data because Australia hasn't got the dataset, did more for me than anything else. Both of those are you telling me something that doesn't flatter you. Do more of that and less of the floor-not-ceiling cushioning, and I'd have a conversation.

---

Other Strategic Feature Suggestions

- **Something I can take to the broker.** A one-page PDF: my three numbers, the multiple used, where the data came from, and the four things that are discounting me. Right now I can't take your view into the room where I'm being talked down, and that room is where my decision actually gets made.
- **"Who have you told?" as a first-class setting.** Not a checkbox in a privacy policy — a visible state at the top of my account: *Nobody. Not your accountant, not your broker, not your staff.* With an access log under it. For this customer that is a feature, not a policy.
- **Ask what the broker said.** One question, huge payoff. Every one of us has had that conversation and half resents it. Be the thing that engages with it.
- **A debt line.** "Roughly what do you owe?" then "after debt, about $X to you." That is the number I care about and nobody in this category ever shows it.
- **Name the sector cohort size.** "Plumbing: median from N closed sales." When you tell me the sample, I trust the median. When you don't, I assume it's small.
- **A "what your kids would need" mode.** Half of us aren't selling to a stranger, we're handing it to a son or daughter who doesn't know the supplier who'll do us a favour at 4pm on a Friday. Same Genome, different framing, and it's a much easier first conversation than "I'm selling."

---

Standards Check (portfolio non-negotiables)

- **Responsive 375 + 1440:** PASS — scrollWidth equals clientWidth at both (375/375, 1440/1440); no horizontal scroll anywhere I went.
- **Touch targets ≥44px / text ≥16px on mobile:** FAIL — "Talk to the assistant" is 24px tall at 375; several secondary lines including the CTA sub-line render at 15px, footer copyright at 12px, checkout billing terms ~12px.
- **Nav collapses to a usable mobile pattern:** PASS with a flag — hamburger with aria-label "Open menu", drawer contains all five links at 50px each; but the drawer painted white in three attempts (see mobile section — needs a real-handset check).
- **Auth: forgot-password link:** PASS — "Forgot password?" present beside the password label on /login.
- **Auth: password visibility toggle:** PASS — 44px button, aria-label "Show password", eye icon.
- **Auth: magic-link option:** PASS — "Email me a magic link" below the sign-in button.
- **Explanatory header on every page:** PASS — landing, /business-valuation, /plan and /genome each open with what-it-is / what-to-do / why-it-matters.
- **Voice agent reachable from the chrome in ≤3 clicks:** FAIL — reachable in one click, but it does not work: question submitted, input cleared, zero network requests, no answer and no error, twice.
- **Browser tab title is the product name:** PASS — "Kira — your part-time general manager"; "Sign in · Kira" on login.
- **Consequence clarity on cost-incurring actions:** PASS with a defect — arrears billing, "nothing charged today", 3-day warning and cancellation all stated above and below the pay button; but the terms paragraph reads "$999 + GST + GST" and is the smallest, faintest text on the card.
- **Zero dead ends:** FAIL — /plan blank ~15s, /genome blank 8s+, /login blank ~7s, all with no spinner and no console error; the public assistant swallows submitted questions with no response.

---

Scope note: I ran the full 11-question valuation once, as a plumbing contractor ($2.4M turnover, $340k SDE, $380k of gear), at 1280–1440 and again at 375. I walked up to the payment screen and read it in full but did not click "Start now", did not enter card details and did not create an account — so nothing behind the login (navbar, settings, sign-out, content/IP acknowledgement) was tested. There is no address or ABN field anywhere in the free flow, so that standard didn't apply. The browser I used crashed repeatedly on this app and I re-verified the hostname after every step; anything I couldn't confirm twice, I've flagged as needing a check on real hardware rather than stated as fact.

Thanks,
Ray
