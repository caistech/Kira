# Kira — third walkthrough

**Ray, 66. Nolan Building. Thirty-five years. Turnover about $3.5M. Thinking about selling and I've told nobody.**
Tested 3 August 2026 against https://kira-rho.vercel.app, signed in as a real account, roughly an hour.

---

## The verdict, first line

**Yes — I'd send the handover document to my accountant today. That's the first time in three goes.** The document is clean: my sale plans are not in it, it says so in its own opening paragraph, and I checked, not assumed.

**But I would not yet keep using it, and the reason is small and specific: I pressed Remove on the one thing I've told nobody, and then downloaded my own data, and it was still there. Word for word. Twice.** Two other pages also tell me flatly that nobody reads my conversations, while a third tells me your support team can. Those are the two things standing between "safe" and "trusted", and neither is a big build.

---

## Landing

Better than most things sold to me. It talks like a person. It names me — "the owner in their sixties, three or four decades in, with a profitable business that runs on them" — and it's right, which is unsettling in the way a good salesman is unsettling. The plumbing example with $220k / $582k / $1.02M does more work than any paragraph on the page, because it's three numbers and I can hold three numbers.

The testimonials are gone. I noticed. Good. A page telling me other men my age already did this, with names I can't check, would have made me close the tab.

"Plans run from $499 + GST to $4,999 + GST /month" — with GST said out loud, at the top, unprompted. That's the first honest price I've read on a website this year.

**What I'd push back on.** The FAQ is where you lose me, and it's because it contradicts the rest of the site. Down there you explain, carefully, that I'm "never invoiced for the month I'm in", that each month is billed once it's finished, that I get three days' warning before every payment, and that cancelling is one click in Settings. That is a well-thought-out billing arrangement and I appreciated it. Then I got inside and every screen said the product is **free while in beta and nothing is charged**. And Settings said I have no card and no subscription, with "Manage billing" greyed out.

So which is it? Am I on a $999 arrears plan, or a free beta? Both stories are written with equal confidence. A man deciding whether to hand you a card reads that and concludes one of the two pages is out of date, and then wonders which other page is out of date.

`Opportunity:` The arrears explanation is genuinely unusual and worth selling — "you are never billed for the month you are in" is the kind of line that gets repeated to an accountant. But right now it's buried in an FAQ, contradicted three screens later, and doing nothing. Pick which one is true today, say it in one place, and let the other appear when it becomes true.

---

## The handover document — the gate

I downloaded it and read the whole thing, which is what I'd do before sending it to anyone.

**It passes.** Paragraph five, unprompted:

> *"It covers the business. It deliberately does not cover the owner's own position — his plans, his circumstances, or what he would accept — which are his to raise, not ours to disclose."*

And it holds. I searched it for "sell", "sale", "35 years", "told anyone". Nothing. The "Recorded, not yet filed" section at the bottom — which is exactly where a loose fact would end up — contains one line, about how I like to approve communications before they go out. That's a fact about how the business runs. It belongs in a handover pack. That's the right call.

That paragraph is also doing commercial work you may not have noticed. It's the paragraph I'd point at if my accountant asked "what is this thing and who wrote it". It reads like it was written by someone who has been in a due diligence room.

**Three things wrong with the document itself, none fatal:**

**1. My ABN is printed as `ABN 99999999999`.** Eleven digits in a row, unformatted, on line two, under my company name. In Settings the same number renders properly as "ABN 99 999 999 999". The document — the one a solicitor reads — is the only place it comes out as a blob. And 99 999 999 999 isn't a real ABN; it won't pass a checksum. Something let it in. I'll grant this is a test account, but the *formatting* difference between the two screens is real either way, and the buyer-facing one is the one that's wrong.

**2. The document contradicts my own page about how much is in it.** My Genome says *"2 things captured. 2 of them are dated to the conversation you said them in — that is what a buyer's accountant will want to see."* The document, at the bottom, says: *"Every entry above carries its provenance. 0 of 0 are dated to the conversation in which the owner stated them."* There is an entry above. It isn't zero. My accountant is precisely the sort of person who reads the small print at the bottom of a document and asks why it disagrees with the front page.

**3. It says "Recorded by Ray" and my emails go out signed "Pat Nolan".** Settings → business details has "How Kira signs off: Pat Nolan". Profile says Ray. The Genome says Ray. One account, two owners. If a quote goes to a customer signed by a man who doesn't work here, I find out about it from the customer.

`Opportunity:` The provenance footer is the best idea in the document and it's currently sabotaging itself. "Every entry carries its provenance, and here is how many are dated" is exactly what shortens due diligence — it's the difference between a claim and evidence. Get the count right and put it at the *top*, not the bottom. That footer, correct, is worth more to me than three of the section headings.

---

## The raw export, and Remove — where I stopped trusting it

The page splits the two downloads and explains why: the handover document leaves out anything marked "yours only", and the raw file is "everything we hold, including those — that one is for you." Clear. I understood it first read.

So I tested it. On My Genome, under "Not yet filed", was this:

> *"The owner is considering selling the business after running it for 35 years but has not told anyone yet."*
> *Yours only — kept out of the handover document, because it touches on that you are thinking about selling.*

I pressed **Remove**. The confirmation asked: *"Remove this from your Genome, your recall and your export?"* — Yes, remove it / Keep it. That's a good question to be asked. It names all three places. I said yes.

**What went right, and I want to be fair about it, because it's the thing I expected to fail:** the store didn't just hold one copy of that sentence. It held three — the one on screen, plus two near-identical restatements I could not see and had no button for. **Removing the visible one killed all three.** I checked the file before and after. I also checked the operator console afterwards and they were gone from there too. Whoever built that thought about it properly. Most systems would have deleted the row I clicked and left the twins.

**What went wrong:**

**(a) The removed line is still in the file I download.** I re-exported the raw data straight after. There it is, twice, verbatim — flagged inactive and marked "owner:redacted", but the sentence is sitting in the file in plain English. That file is the one you tell me to keep, the one that's mine if I stop paying, the one I might forward to a solicitor without opening it. The dialog said it would leave my export. It didn't leave my export.

I understand the engineering argument — you're showing me an honest record of what was removed rather than pretending it never existed. That argument is fine for a log. It's wrong for the file you hand a customer and call his own data. **If I ask you to delete the one thing I haven't told my wife, "we kept a copy and labelled it deleted" is not delete.**

**(b) A sentence that says the same thing survived, because it was filed as being about your software.** Still live in my export after the removal:

> *"The owner expects the assistant to act as a right hand on the business side, including organizing knowledge and documents to improve business clarity and value for a potential sale."*

Read that as my broker would. It says I'm preparing the business for sale. It doesn't appear anywhere on My Genome, so there's no Remove button next to it, so I have no way of knowing it exists unless I open the JSON — which no owner my age is going to do. The redaction was thorough about the exact words and blind to the meaning.

**(c) The page shows me 2 of the 12 things you're holding.** The headline says "2 things captured". The export shows twelve live facts. The other ten are things like "the owner has not connected their Google account" and "only the owner and assistant have access to the conversations" — housekeeping, mostly harmless. But the page also says *"Anything here can be taken back — use Remove on the entry itself"*, and ten of the twelve aren't on the page, so there is no entry and no Remove. The promise is scoped to what's visible and doesn't say so.

`Opportunity:` The redaction machinery is better than the product is getting credit for — it found and killed two restatements I couldn't see. Say that out loud. "When you remove something, we also remove the other ways she wrote it down" is a sentence I'd repeat to another owner, and right now nothing on the page tells me it happens. Then finish the job: strip redacted text from the export rather than tombstoning it, and run the same net over facts filed as being about your software.

---

## Who can actually read this

This is the part that decided the second half of my answer.

**My Genome** tells me, plainly and in the middle of the page: *"Our support team can see what Kira has captured when they need to keep the service running."* Fine. Honest. Every business has support staff. I've had a bookkeeper for twenty years.

**But `/plan` — the page I read *before* I pay — says the opposite, twice:**
- *"You only ever talk to Kira. Behind her is software that does the work and keeps the record — not a team of people. Nobody reads your conversations."*
- *"STEP 5 — Your knowledge stays yours. Everything Kira captures is private and protected — only you, and anyone you choose, can ever see it."*

And the landing FAQ adds a third version, where an advisor who introduced me can see that I signed up and how my valuation is moving.

Three statements, three different answers, and **the honest one is the only one I couldn't see until after I'd signed up.** That's the wrong way round. If the true answer is "our support team can see what she's captured", say it on the page where I'm deciding, in those words, and I'll accept it. Finding it afterwards is what makes a man wonder what else he'll find afterwards.

Then I logged in as an operator, which settled it.

---

## The operator console

Clean, fast, well organised. Overview / Kira Exec / Introducers / LOIs / Asked for / Trust. The "TEST billing — no real money moves" banner across the top is the right kind of loud.

**Kira Exec** lists the owners by name, email, value gap and transferability. Mine reads: *Ray, trial, $859,000 gap, $1,090,000 → $1,950,000, Transferability 34/100, Architecture & Engineering, 9 memory facts.* The numbers tie to my own screens exactly.

Then I opened my own record from the operator side. It lists **all nine of my facts, in full, verbatim.** Including, and I am not making this up, this one:

> *"The owner explicitly restricts access to all conversation content to only himself and the assistant; no other party, including accountant or staff, can access this information without his permission."*

That sentence is displayed on a screen the owner didn't know existed. There is a joke in there but I'm not laughing, because before I pressed Remove, the line directly above it would have been the one about selling after 35 years and having told nobody.

I'm not saying you shouldn't have this screen — you need it to run the service, and My Genome does disclose it. I'm saying `/plan` promises me it doesn't exist. **Fix the promise, not the screen.**

There's also an "Open their Kira" button next to each owner, which opens the customer's own Kira. I didn't press it. But it exists, and it makes "nobody reads your conversations" harder to defend than a support ticket does.

One small thing: the Kira Exec header says *"This view excludes test accounts and personal Kiras"*, and then lists two accounts with "QA" in the name. Either the filter isn't running or the sentence is wrong.

`Opportunity:` You have every owner's transferability score, gap and engagement on one screen. That is a book of introductions waiting to be made. The man at the top with a $4.26M gap and 72/100 transferability is either about to sell or about to be sold to, and you know it before his broker does. Nothing on that screen currently does anything with it.

---

## Pricing and the card

**The step before the card is the best-built thing in the product.** I pressed "Start now" and instead of being thrown at a payment form I got:

> *"The next screen asks for your card. Nothing is charged — billing is not switched on yet. Stripe still needs the details to set the account up, and we will email you before anything is ever billed. Because billing is off, Stripe shows a 'Sandbox' badge on that page: that is our test mode, not a fake payment page."* — Continue to Stripe / Not yet.

Warning me about the Sandbox badge *before* I see it is the single most trust-building thing on the site. I'd have backed out at that badge otherwise, and told nobody why. "Not yet" as the second option, instead of nothing, is right too.

**Then the Stripe page undoes some of it.**

- **No GST anywhere.** Your site says $999/month **+ GST** on every screen, correctly and consistently. The Stripe page says **A$999.00** and stops. That's the last number I read before handing over a card, and it's the only one missing the tax. Read alone it says $999 leaves my account; the real figure is $1,098.90. If a page has to carry the qualifier, it's that one.
- **"Then A$999.00 per unit, billed monthly based on usage."** Per *unit*? What's a unit? Everything you've told me says one flat monthly fee for one business. "Based on usage" tells a man who has just been promised a fixed price that the price is not fixed.
- **"Price varies"** appears twice, on the line item and on the subtotal, with no number next to it.

I've been quoted by suppliers for thirty-five years. "Price varies" on the invoice line is where I stop and ring someone.

`Opportunity:` The $999 is defended better than any price I've seen — 1.4% a year of the $859,000 you say I'm leaving behind, and the arithmetic checks out. That framing survives contact with an accountant. It just needs to survive contact with Stripe. Fixed-price product, fixed-price checkout, and put the GST line on it.

---

## The example Genome — it doesn't match mine

`/genome` shows a worked example and says the handover pack is *"the same sections you see above"*.

It isn't. The example has **six** sections. My real Genome and my real handover document have **nine**. Missing from the example:

- **Who does the work** — who's critical, tenure, who leaves on announcement
- **What the business owns** — owned vs leased vs held in my own name
- **Systems & records** — where records live, who can reach them

Those three are not filler. **"Who leaves the day I announce" is the question that keeps me awake**, and it's the one missing from the sales page. So is "what's held in my own name", which is the first thing my accountant asked me about when I mentioned any of this to him. You are selling me a smaller product than you're actually building.

The order is also different (Licences sits fifth in the example, eighth in mine), and one heading asks a different question in each place — "Money in, money out and terms" asks about input costs in the example and about who chases and approves in mine.

The example itself is good work, by the way. "Three builders supply roughly 60% of turnover. Hartley since 1998. None are on a written contract — work is allocated by a phone call to the owner, usually on a Friday." That's not a demo, that's a real finding, and it's uncomfortable in the way it should be.

And the "Privacy mode — on the roadmap, and not built yet" section: telling me a feature doesn't exist, on the sales page, with the reason being that I probably haven't told my family — that bought you more credit than any feature on the page. Do more of that.

`Opportunity:` Put the three missing sections into the example, weakest-first. An owner who sees "Who does the work — 22% documented, and here's the man who'd walk" recognises his own business faster than one who sees a well-documented licence calendar.

---

## Getting around

No dead ends anywhere I looked. Mid-questionnaire on `/business-valuation` there's "Back to your account" in the header, and it's there on `/plan` too, alongside "Redo my valuation". The 404 page I hit by typing a wrong address said *"Nothing is wrong with your account and nothing has been lost"* — which is exactly the sentence a man my age needs at that moment.

Two notes:

- **`/plan` has no proper navigation.** Just "Back to your account". Every other signed-in page has the full sidebar with Settings and Sign out. On the page where I'm deciding to spend $999 a month, I can't reach Settings to check what I already have.
- **The "Back to your account" link appears late.** On first paint it isn't there; a second later it is. Small, but I read a page before I touch it — that's how I've always done it — and on the first read there was no way back.

---

## My Genome, as a page

It addresses me directly and doesn't flatter me. "$1,090,000 worth today, $859,000 locked in your head, 34 out of 100." No sugar on it. The nine areas each carry the question a buyer's advisor will ask, and the empty ones say *"Nothing here yet — this is still only in your head"* rather than pretending. That last phrase does more to make me want to talk to her than the whole landing page did.

Splitting "still only in your head" from "these usually live in a filing cabinet — tell Kira where they are" is a good distinction. One is work; the other is pointing at a drawer.

The "yours only" label with its reason attached — *"kept out of the handover document, because it touches on that you are thinking about selling"* — is precisely right. It tells me what it is, where it won't go, and why. That's the label that let me test the gate at all.

---

## On a phone

I mostly work off a phone in the ute. Three floating buttons sit on top of the words.

1. **My Genome** — the orange "Talk to Kira" mic covers the sentence *"...of them are dated to the conversation you said them in — that is what a buyer's accountant will want to see."* Two lines unreadable. Measured, not guessed: the button is 64×56 at the bottom right and that text line runs underneath it.
2. **`/plan`** — the black "Report a problem" bar sits across *"Everything Kira captures becomes your Business Genome: the operating brain of the company, yours to keep and hand over."* Screenshot attached; it's the clearest of the three.
3. **The landing page** — the "Report a problem" tab is pinned to the right edge and sits over body copy in at least two places as you scroll, including *"Because every business is different. Yours deserves an exec who knows it inside out."*

No sideways scrolling anywhere, the menu collapses to a hamburger properly, the type is big enough. It's just the floating buttons, and it's the same button twice.

`Opportunity:` The "Report a problem" tab is on every page, at a fixed height, in the reading column. On a phone it isn't a help button, it's a smudge on the page. Move it to a corner, or fold it into the menu.

---

## Cross-path

Signed in as an ordinary user, I typed `/admin` into the address bar. Bounced to an operator login with *"That account isn't an operator account"* and a link back to the normal product. Nothing leaked, and it told me what happened rather than dumping me somewhere. Correct.

---

## Other strategic feature suggestions

**Tell me what a bad answer costs before I give it.** The valuation asks for profit and explains it better than my accountant does — *"if the business kept $150k after costs and paid you $50k in salary and perks, add them together and enter $200,000"*. That's the clearest explanation of SDE I've read. But nothing tells me the whole number hinges on that one field. One line — "this is the number the valuation runs on; get it wrong and everything after is wrong" — would make me go and look it up rather than guessing.

**The gap needs to move visibly, or I'll stop.** Everything is built around $859,000 locked in my head. The dashboard says "we grow this every week". Nothing shows me last week's number. Give me one line — "34 → 37 since we started" — and I'll keep talking to her for a year. Without it, I'm being asked to trust that unpaid conversations are worth something, which is exactly the thing I'm bad at.

**The three duplicates were the interesting find.** She wrote the same fact down three different ways in one conversation. It got cleaned up when I removed it, but nothing surfaced it to me beforehand, and my export is padded with restatements. Show me: "she has this three ways; is this one thing or three?" A man who is told a machine has recorded him three times, and asked to confirm which, believes the machine is being careful. It's also a rare thing you can charge for.

**A short "what your accountant will ask you" pack.** The document already lines up against due diligence questions. Half a page of the questions my accountant is about to ask, and which ones I can't answer yet, is a thing I'd forward to him unprompted — which is how you'd get in front of him without me having to explain what you are.

**Somebody has to name what "not yet built" means for my staff.** The privacy-mode note says today Kira only listens when I open a conversation and press the button. Good. But nothing tells me what happens the first time I use her with an employee in the room. That's the moment this either survives or doesn't, and it isn't addressed anywhere.

---

## Standards check

| # | Standard | Result | Note |
|---|---|---|---|
| §1 | Responsive | ❌ | No horizontal scroll at 375 or 1440; nav collapses; type ≥16px; targets ≥44px. **But three floating buttons overlay body text on mobile** — My Genome, /plan, landing. |
| §2 | Auth page pattern | ✅ | Forgot-password, working password-visibility toggle, magic link, sign-up route. First paint is a clean grey skeleton — nothing broken-looking. |
| §4 | Authenticated chrome | ⚠️ | Persistent sidebar with Settings + Sign out on /talk, /dashboard, /my-genome, /settings and all admin pages. **`/plan` has no navbar** — only "Back to your account", and that appears a beat after first paint. |
| §5 | Explanatory header | ✅ | Every page I opened. My Genome, Settings, Kira Exec and the admin owner detail all open with what-it-is / what-to-do. |
| §6 | Voice reachable | ✅ | Floating "Talk to Kira" on every signed-in page, one click. Not testable further — no microphone on this machine. |
| §7 | Scaffold metadata | ✅ | Tab title "Kira — your part-time general manager"; own favicon and apple-touch-icon. |
| §8.5 | Dual portal | ✅ | User lands on `/talk`, a real product home, nothing to do with `/admin`. Non-admin hitting `/admin` is rejected with a reason and a way back. |
| §9 | Consequence before an irreversible click | ✅ | Remove asks "Remove this from your Genome, your recall and your export?". The card step warns about the card, the sandbox badge and offers "Not yet". Best-in-class. |
| §9 | Every price carries its tax | ❌ | Correct and consistent on every Kira page ("+ GST"). **Absent on the Stripe checkout**, which is the last screen before the card. |
| §9 | ABN validates | ❌ | ABR lookup on the edit form works well (live register search). But the stored value is `99 999 999 999`, which is not a valid ABN, and it prints unformatted in the handover document. |
| §9 | Address autocomplete | ✅ | Street field is an autocomplete ("Start typing the address"), with suburb / state / postcode broken out. |
| §9 | Zero dead ends | ✅ | Including the 404, which is the best-written page on the site. |
| — | **The handover gate** | ✅ | **No sale intent in the document.** States its own exclusion in paragraph five. "Recorded, not yet filed" carries only a business fact. |
| — | Removal completeness | ⚠️ | Reaches hidden restatements and the operator console — better than expected. **Does not leave the raw export**, and a same-meaning fact filed as "about the software" survives. |
| — | Privacy claims consistent | ❌ | `/plan` says nobody reads your conversations; My Genome says support can see what's captured; the operator console displays all of it verbatim. |

---

## Scope — what I did not reach

- **The valuation result screen.** I got three questions in twice; the browser died mid-run both times, not the product. Marked "—". The three figures do tie across everywhere else I could see them: My Genome, the handover document, the raw export, `/plan`, the dashboard and the operator console all agree on $1,090,000 / $859,000 / $1,950,000 / 34-of-100. The only wobble is rounding — the raw file holds $1,094,292 where every screen shows $1,090,000.
- **Voice.** No microphone on this machine. Reachability only; I make no claim either way about whether she works.
- **Payment.** I read the Stripe page and did not complete it.
- **Delete account and Sign out everywhere.** Not touched, deliberately.
- **Knowledge, Introducers, LOIs, Asked for, Trust.** Ran out of time.
- This is a test account with seeded data, including some obviously synthetic rows. Where that affected a finding — the dummy ABN, the "Pat Nolan" sign-off — I've said so rather than dressing it up.

---

**Two things, and I'd sign up.** Take the removed lines out of the file you hand me. And make the page I read before I pay say the same thing about who can see my business as the page I read after.

The document is right. That was the hard part, and it's done.

Ray
