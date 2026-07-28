# Kira — advisor/introducer walkthrough

**Tester:** Anneke — business broker, 25+ years, ~180 owner clients on the book
**Date:** 28 July 2026 · **URL:** https://kira-rho.vercel.app
**Signed in as:** dennis@factory2key.com.au (non-admin), real login form, Mode A

Dennis,

You asked me to look at this as someone who'd be putting her own name on an introduction, not as someone browsing a website. So that's what I did. I ran a real client shape through the valuation, read the terms properly, signed in and went looking at what my client would actually own.

---

## Verdict, up front

**Would I sign up myself?** Yes, on this evidence — for one of my own businesses, today. The valuation is credible, the honesty is unusual, and the price is defensible.

**Would I send a client today?** **No.** Not because of the proposition — the proposition is the best-argued referral pitch I've been shown in years — but because of three things, in this order:

1. **You are in Stripe test mode and nobody is being billed.** `/plan` says it in plain words. `/advisors` does not say it anywhere. My commission is 10% of collected funds, and right now collected funds are zero, with no date given for when that changes. I would be introducing clients into a free beta and calling it a revenue stream to my principal. That's not a disclosure I can make.
2. **The Genome my client would actually receive is not the Genome you show on `/genome`.** I'll cover this in detail below. The example page is superb. The live page, on a real account, is a chronological dump of conversation notes filed under the wrong headings. Bob would ring me the day he opened it.
3. **Two different billing promises are live on the same site at the same time.** I can quote both. I cannot tell a client which one is true.

Fix those three and I'd start with two clients I trust to be forgiving. The rest is detail.

---

## `/advisors` — the introducer proposition

This is my page and it is genuinely well built. The framing — "your clients in their sixties, whose business runs on them" — is the right client and you describe him accurately. "You would list them tomorrow if the owner weren't the product" is the sentence, and it's true.

**The four answers are the best part of this build.** Every one of them carries a *How that is enforced* line, and that line is what separates a promise from a control. "Row-level security on every table" and "conversation content is outside what that role can query at all" are the answers I need, phrased the way a compliance officer wants to hear them: as a property of the system, not a policy someone observes. I have read a lot of vendor trust pages. Almost none of them do this. Whoever wrote "the difference between a rule and a guarantee" understood the assignment.

**But my compliance officer's actual questions are not all four of those.** She would come back with:

- **What is the entity behind these promises?** The briefing document says "Kira". The homepage footer says Global Buildtech Australia Pty Ltd, ABN 54 672 395 685, trading as Corporate AI Solutions. The `/advisors` page footer says neither, and has no Privacy link at all — on the page that is entirely about data handling. My file needs the entity name and ABN on the document itself.
- **Where is the introducer agreement?** There is a tickbox undertaking on the form. There is no agreement, no terms of the commission, nothing I sign. "10% of collected funds for the life of the subscription" is a payment obligation and it exists only as marketing copy on a page you can edit tomorrow. I need a document.
- **Where is the disclosure wording?** Slide 9 of the demo says "You disclose the commission; we supply the wording." You don't. It isn't on the page, in the FAQ, or in the briefing. That's an unfulfilled promise on the one operational thing I have to do.
- **What is your professional indemnity position?** "Ours to fix" is a good answer to "whose problem is it". It is not an answer to "who pays". If a client acts on an indicative number and it's wrong, my licence is exposed and yours isn't, because you're software and I'm the licensed party. That asymmetry is fine — it's normal — but say it out loud, because right now "ours to fix" reads warmer than it is.

**The briefing download is the wrong artefact.** "Download this as a one-page briefing" gives you `kira-adviser-briefing.md` — a raw Markdown file. On my machine that opens in Notepad with the `#` and `*` characters showing, or it doesn't open at all. It is not one page, it is not letterheaded, it carries no entity, no ABN, no contact, no reference number, and — critically — **no commission terms**, which is the part my principal actually needs to see. The four trust answers are the part I already understand; the money is the part she'll ask about.

**Terminology.** Step 5 of "How it works" is "Privacy mode is on the roadmap, not built". That is a disclosure, and it's an admirable one, but it's sitting inside a numbered *how it works* sequence as though it were a step. Steps 1–4 are things that happen. Step 5 is a thing that doesn't. Pull it out into its own block.

**Opportunity:** ship an actual introducer pack — a PDF carrying the entity and ABN, the four answers, the commission terms, a one-paragraph suggested disclosure I can paste into my own email, and a countersignable agreement. That single document converts this from "an interesting page" to "something I can put in front of my licensee on Monday". Right now the argument is finished and the paperwork isn't started.

---

## `/what-she-does` — can and can't

I like this page a lot and I did not expect to. Putting the "can't" list on the same page as the "can" list, at the same weight, is the move that makes me believe the first list.

**The advisor distinction lands.** "We wouldn't do that" versus "it cannot do that" is exactly the right frame and *What holds it* delivers on it: "the connection is read-only in the code that carries it, not in a permission that could be widened. Adding a write would mean rewriting that module." That is a control, not a policy. Same for "drafting and sending are separate steps with separate calls. There is no configuration in which drafting sends."

Three things I'd change:

- **"Nothing at all" reads as a bug.** Every other card in that list is a quoted thing you'd say — *"Draft a quote for the Wilson job."* Then the last one is `Nothing at all` with no quote marks, followed by a paragraph describing several things she does do. On a scan it reads as "she does nothing at all". You mean "ask her for nothing at all — she does these anyway". Put it in quotes or relabel it *Without being asked*.
- **"Talk you through your profit and loss" is in the wrong list.** It's under *She can't do these*, and the body says she can reach the report and reads the income line out of it. That's a partial can, filed under can't. A client will take away "she reads my P&L". Move it to a third state, or say plainly: *she reads one line of it and we've turned the rest off until it's whole.*
- **The advisor section links "The introducer terms →"** back to `/advisors`, which is marketing copy, not terms. Same gap as above.

**Opportunity:** this page is your strongest sales asset for my channel and you're treating it as a footnote. It's the page I would send a sceptical client *before* the valuation, not after. Give it a link from the homepage nav.

---

## `/plan` — billing

**The contradiction is real and I can quote both sides.** These are all live right now, on the same site:

| Surface | What it says |
|---|---|
| Homepage pricing block | "You're **never invoiced for the month you're in** — each month is billed once it has finished, and if you cancel, that month is on us." |
| Settings → Plan & usage | "Each month is billed when it finishes, for the month just gone — and if you cancel, the month you're in is never billed." |
| Homepage FAQ | "You get **30 days to try her**; you're not invoiced until those 30 days are up." |
| Homepage FAQ | "Why do you need my card if **the first 30 days are free**? … Nothing is charged for 30 days, you get three days' warning before the first payment." |
| `/advisors` FAQ | "They get **30 days to try her**, aren't invoiced until then." |
| `/advisors` FAQ | "**Their free 30 days pay nothing**, because nothing is collected yet." |
| `/plan` beta note | "no card is charged, no real subscription is created, and **nothing will come out in 30 days**." |

Those are two different commercial models. Arrears-with-the-current-month-waived is not a 30-day trial, and they don't produce the same answer to "when does Anneke's first commission land?" Under one, month one is billed at the end of month one and I'm paid. Under the other, month one is free and I'm paid from month two. **Nobody can tell me which.** The homepage FAQ and the `/advisors` FAQ are the stale ones; the pricing block and Settings are the new model.

**The bigger problem is the one that isn't a contradiction: payments aren't live.** `/plan` says it clearly and repeatedly — "Beta · payments not live — Stripe is in test mode", "Nothing is charged while we are in beta", "we will email you before billing is switched on". Fine, and honest, on the page the *client* sees. But `/advisors` — the page selling me a revenue stream — says "10% of what the owner pays, monthly, on funds we have actually collected" and never mentions that collections are currently zero with no switch-on date. That's the gap between the two pages that would embarrass me. A broker reading `/advisors` cold concludes this is live revenue.

**On the price itself.** `$999/month + GST` with the GST stated — good, and thank you, that's the first thing I check. On a $436,710 gap that's 2.7% a year and I can defend it to a client. But: both the homepage and `/advisors` insist "there is no price list, and that is deliberate", then `/plan` renders a card headed **GROWTH PLAN — $999/month**, which looks exactly like a price list. If the number genuinely scales with the gap, show the arithmetic on screen ("your gap is $X; that's $Y a month, 2.7% a year"). Otherwise you've argued yourself into a corner for nothing.

**`/plan` cannot be revisited.** Type the URL directly, or come back tomorrow, and you get "Let's find your number first — take the 3-minute valuation and it'll bring you right back here". I completed the whole eleven questions and then went to `/plan` and got the gate. It only works if you arrive by clicking the button on the results screen. So the client who says "let me think about it overnight" loses the price. That's a dead end on your conversion page.

**Opportunity:** one billing sentence, written once, rendered from one place, on every surface. And put the beta/payments-not-live status on `/advisors` in the same breath as the 10%, in your own words, before I find it myself. You get enormous credit everywhere else on this site for saying the awkward thing first. This is the one place you didn't.

---

## The valuation — 11 questions

I ran a plumbing business: $2.4M turnover, $260k SDE, growing steadily, margins holding, client base stable, well spread, would struggle without the owner, processes mostly in his head, some recurring, $220k of gear.

Result: walk away $220,000 · worth today $671,544 (~2.6× SDE) · captured $1,051,391 (~4.0× SDE) · gap $379,847 · transferability 44/100.

**As a piece of appraisal logic, this is sound.** The SDE definition on question 3 is better than most broker intake forms — "add back what you pay yourself, plus interest, depreciation and one-offs" with a worked example. Question 8 ("if you took a 3-month holiday tomorrow") is the right question and you've correctly called it the single biggest driver. 2.6× rising to 4.0× on a trade business of that size is inside the range I'd argue in a listing appraisal.

**Things I'd raise as a broker:**

- **The multiples are US data and I had to scroll to the bottom to learn it.** "Sector medians are BizBuySell's 2025 US small-business sale data… we use it as an indicative benchmark, not an Australian market quote." That disclosure is honest and well-reasoned — including *why* there's no equivalent AU dataset, which I happen to know is true. But it's the last paragraph on the page, below the CTA. It's the first thing a buyer's advisor will attack. Put it next to the number.
- **The bridge includes something Kira cannot deliver.** Your uplift breakdown is: owner dependence +$152,394, documented systems +$151,635, **recurring revenue & contracts +$75,818**, all captioned "once captured". Documenting knowledge does not create recurring revenue. Turning ad-hoc domestic work into contracts is a commercial strategy change, not a capture exercise. That's ~20% of the headline gap attributed to something the product doesn't do, sitting under a label that says it does. Split it out: "what Kira closes" versus "what you'd need to change in the business".
- **"Matched to plumbing"** — lowercase, echoing what I typed. When I picked from the dropdown it said "Matched to Plumbing". Show me the canonical sector name so I can see it resolved to a real row, not just accepted my word.
- **Your own worked example doesn't reproduce.** The homepage says "A real plumbing business, run through the actual calculator — walk away $220k / today $582k / captured $1.02M", and demo slide 3 says "$2.4M turnover, $260k owner earnings: roughly $438,000". I entered exactly $2.4M and $260k and got $671,544 / $1,051,391 / $379,847. Different answers to the other nine questions explain it — but "run through the actual calculator" is an invitation to check, and I'm the sort who checks. Publish the answer set alongside it, or soften the claim.
- **Fields I'd want and didn't get:** headcount, premises lease and term, whether the owner draws a market salary, debt and equipment finance, WIP and debtor ageing. You do disclaim debt in the footnote — "this is the value of the business, before debt" — but a $2.4M plumbing business with $400k of equipment finance is a different conversation and the client won't make that subtraction himself.

**Credit where it's due:** the mid-flow save works. I lost the browser twice and came back to question 6 with my answers intact, exactly as the intro promises. **But the *result* doesn't save.** After completing all eleven, local storage held nothing but the bug-widget's position. That's why `/plan` gates you.

**Opportunity:** the transferability score (44/100, and 34/100 on a weaker set) is the most sellable object in this whole build and you're burying it under three dollar figures. Brokers manage numbers that move. "We took Bob from 34 to 61 in four months" is a case study; "we found a $438k gap" is a brochure.

---

## `/genome` (the example) versus `/my-genome` (the real one)

This is where I stopped and changed my answer.

**The example on `/genome` is outstanding.** "Three builders supply roughly 60% of turnover — Hartley Constructions, Vaughan Homes and Ridge Developments. All three came through the owner personally; Hartley since 1998. None are on a written contract — work is allocated by a phone call to the owner, usually on a Friday. *You confirmed this · Conversation, 12 March*."

That is a due diligence answer. Customer concentration with named counterparties, no contracts, owner-routed — that's the exact disclosure that kills deals at week six when a buyer's accountant finds it himself. Surfacing it at listing is worth real money. The section percentages, the two-state provenance (*You confirmed this* vs *Captured — not yet confirmed*), and above all the **"Still only in your head"** blocks naming what's missing rather than glossing it — that's how an honest information memorandum should read. Would it shorten due diligence? The discovery half of it, yes, materially.

**Then I opened My Genome on a live account.** Under the heading *"How work comes in — Where does revenue come from, and does it depend on you?"*, in order:

- "Wants to track emails sent to IRIS and recognizes email access is needed for better support." — *You said this on 28 July 2026*
- "Wants to find the current balance in Xero for Global Buildtech Australia as a one-off task."
- "Dennis is following up with Dave regarding soil testing on Lot 109, needing it completed by August 7, 2026."
- "Dennis plans to attract equity partners for Factory to Key to secure about 40% equity…"
- "Dennis is preparing to submit a document response to Iress, owners of XPlan…"

Fifty-three entries, spanning at least four different businesses, every one of them filed under "where does revenue come from". They're not answers to that question — they're a chronological transcript of whatever was last discussed, bucketed into a heading it doesn't belong to. And they're written in the third person ("Dennis is following up…") under a label that says "**You** said this on 25 July 2026".

I understand this is a test account with messy input. It doesn't matter. **What it tells me is that the categorisation and distillation layer isn't doing the job the example page advertises**, and the example page is what I'd be showing my client. If Bob opens My Genome after four weeks and sees "Wants to find the current balance in Xero" filed under how his business earns money, he doesn't ring you. He rings me, and he says "Anneke, what have you signed me up to."

Related, and it matters to a broker specifically: **there's no "as at" date on the Genome itself**, and no version. A handover document a buyer's accountant reads cold has to state what date it speaks as of. Individual entries are dated — which is excellent and genuinely unusual — but the artefact isn't.

The export buttons are there — *Download the handover document* and *Download the raw data* — which is the right answer to my "if he sells or dies" question, and it's self-serve as promised. I didn't open them, because at 53 miscategorised notes I already know what's in them.

**Opportunity:** two states for a Genome entry, surfaced honestly — *raw capture* and *filed*. Show the client "31 things captured, 12 filed into your Genome, 19 still to be sorted". You'd be describing exactly what the system actually does, you'd be consistent with the honesty everywhere else on this site, and I could show a client the difference. What you have now silently claims all 53 are Genome-grade.

---

## Signing in

I signed in successfully three times and failed twice, and the failures are the finding.

**A failed sign-in shows the user nothing at all.** On one attempt with verified-correct credentials in both fields (I checked the DOM values before clicking), the page stayed on `/login`, no message appeared anywhere, and the console logged two `400` responses. On another the page simply sat there for a long time before eventually landing. Either way, from the chair of a 65-year-old plumber: *I typed my email and my password, I pressed the button, and nothing happened.* He'll try once more, then decide the thing is broken, then tell me about it.

There's no spinner text, no "signing you in…", no error, no lockout notice, no "too many attempts". Whatever the underlying cause — and I'd guess a rate limit given how many times I logged in — the user-facing behaviour is silence.

The page itself is right: forgot-password link, a working show/hide toggle, magic link as an alternative. It's only the failure path that's mute.

**Also:** signing in with `?next=/genome` ignored the destination and dropped me on a chat URL like `/chat/agent_2601kfd19tnxerkax81canwt81yn`. Not fatal, but it means a link I email a client doesn't land where I sent them.

**And:** `/settings` while unauthenticated correctly bounces to login. `/admin` as my non-admin account correctly bounces to `/admin/login?error=not_admin` with a genuinely helpful message — *"That account isn't an operator account. If you came here to use Kira, sign in as a user instead."* That's how a blocked path should read.

**Opportunity:** an error message. One line. It's twenty minutes of work and it's currently the difference between a client who gets in and a client who tells his mates the AI thing didn't work.

---

## The signed-in product

Persistent left rail on every page — My Kiras, My Genome, Knowledge, New Kira, with Settings and Sign out anchored at the bottom and the account email underneath. Settings has Profile, Plan & usage, Password, Notifications and Account with delete. That's a complete, grown-up shell and it's more than most products this age have.

Two things I'd change before a client of mine sees it:

- **The stock photo.** Kira is a young woman in a call-centre headset. My client is 65, selling the business he built, about to tell a machine things he hasn't told his wife. A headset stock photo says "offshore call centre", not "fractional exec". It also, on that screen, is the *only* representation of who he's talking to — the button says "Talk to the assistant", and nowhere on that page does it say she's AI. Everywhere else on this site you're scrupulous about that. Not here.
- **"Tired of generic AI? Kira is just one of our specialized Voice AI agents. Explore All Agents →"** — a black marketing banner across the top of the paying customer's workspace, linking out to other products. In a product I introduced him to, as his private business record. Take it out of the authenticated app.

Settings carries the fair-use line: "$0.00 of $20 used… Your plan includes a fair-use allowance for voice." Twenty dollars of what? On a $999 plan, a $20 meter reads like a phone bill about to go over. And it tells the customer roughly what you pay, which he'll then divide by 999. Say it in minutes or hours of conversation, or don't say it.

---

## Other Strategic Feature Suggestions

1. **An introducer pack, on letterhead.** Entity, ABN, the four answers, the commission terms, a signable schedule, and a paragraph of suggested disclosure wording I can paste into my own email. One PDF. This is the single thing standing between "interesting" and "I'll take it to my licensee".

2. **Sell the score, not the gap.** Transferability out of 100 is the number a broker can move, report on, and put in a case study. Make it the headline on my dashboard, show its trajectory, and let me sort my client list by it. "Three of your clients moved above 60 this quarter" is a reason for me to log in. A dollar gap is a reason to look once.

3. **A pre-listing readiness report.** You are already 80% of the way to the document I pay a corporate advisory firm four figures for: sections, percentages complete, named gaps, dated evidence. Package it as *Listing Readiness*, let me generate it for a client at the point I take the mandate, and you've turned a subscription into a deliverable I can charge for. That's when I introduce clients without being asked.

4. **A distinction the site keeps blurring: captured versus verified.** Everything in the Genome is the owner's own account of his business. That is enormously useful and it is not evidence. Say so once, clearly, and it *strengthens* the pitch — because then "documented" means what a buyer's advisor thinks it means, and you stop competing with due diligence and start feeding it.

5. **Tell the client what I can see, on the page where he signs up.** The homepage FAQ discloses it well — "If an advisor introduced you, they can see that you signed up and how your valuation is moving — never what you and Kira discuss." But a client arriving on my link goes to the valuation and then to `/plan`, and `/plan` says "Nobody reads your conversations" and "only you, and anyone you choose, can ever see it" with no mention of me at all. The disclosure needs to be where he consents, not in an accordion on a page he skipped.

6. **A second condition on the channel.** You have one: only clients I already act for, and I tell them I'm paid. Add a second: I don't introduce a client who is already under offer or in due diligence. Mid-deal is exactly when this looks like a distraction and exactly when a deal falls over for unrelated reasons that get blamed on the new thing.

---

## Standards Check

- **§1 Responsive** — ✅ `/`, `/advisors`, `/what-she-does`, `/genome`, `/business-valuation` all scrollWidth 375 = clientWidth 375 at 375px; body font 16px; layout reflows cleanly; nav collapses to logo + primary CTA.
- **§2 Auth-page pattern** — ✅ `/login` has Forgot password, a working Show password toggle, and "Email me a magic link". (The failure path shows no message — logged as a bug above, not a pattern failure.)
- **§4 Authenticated chrome + Settings** — ✅ Persistent left rail on every authed page (My Kiras / My Genome / Knowledge / New Kira), Settings + Sign out anchored bottom with account email; `/settings` carries Profile, Plan & usage, Password, Notifications, Account/Delete.
- **§5 Explanatory header** — ✅ mostly. Every page I opened leads with what-it-is/what-to-do — `/genome`, `/my-genome`, `/settings`, `/business-valuation` all do. ❌ the authenticated chat landing has none; it opens on "Hey there! 👋" with no statement of what the screen is for.
- **§6 Voice agent** — ✅ "Talk to Kira" is in the authenticated chrome on every page and the chat surface is one click away; the marketing pages carry "Hear Kira" on the demo carousels.
- **§7 Scaffold metadata** — ✅ Titles are real and page-specific: "Kira — your fractional exec", "For brokers & accountants · Kira", "What Kira does — and what she doesn't · Kira", "Sign in · Kira". Favicon is a green K, not the default.
- **§8.5 Dual-portal separation** — ✅ Signed in as the non-admin identity and reached a real user home (`/chat/agent_…`) with its own nav, distinct from `/admin`; `/admin` correctly rejected to `/admin/login?error=not_admin` with a plain-language explanation.
- **§9 Codicils** — ⚠️ Mixed. Destructive actions state consequences before the click ("Permanently delete your account and everything in it. This cannot be undone"; "if you cancel, the month you're in is never billed") — I did not click Delete account or Cancel my plan, so the confirm step itself is unverified by me. Dead end found: `/plan` reached directly dead-ends on a valuation gate with no way to recover a completed valuation. Address/business autocomplete: the advisor Firm field is *described* as a business-register lookup ("Start typing your firm's name and pick it from the business register") and has a `firm_abn` field behind it, but I could not get text into it through the browser tooling, so I have **not** verified it fires — flagging as unverified, not as a failure.

---

## Scope note

Public pages `/`, `/advisors`, `/what-she-does`, `/genome`, `/business-valuation`, `/plan`, `/login`, `/admin`; authenticated `/settings`, `/my-genome`, `/chat/agent_…` as the non-admin QA identity, typed into the real login form. Full 11-question valuation completed twice. Briefing at `/api/trust` downloaded and read in full. Billing copy verified against the served HTML, not just the rendered accordions.

Not covered: the voice conversation itself (I did not talk to Kira — no microphone), the two Genome exports, `/knowledge`, `/start`, the advisor dashboard (I have no advisor account), and the Request Access form submission. The browser tooling crashed repeatedly during this walk; anything that looked broken immediately after a crash I re-probed from a clean state before reporting it, and I have discarded two findings that didn't survive that — an apparent industry-matcher fault and an apparent session drop. Neither is a real defect as far as I can tell.

Per your instruction I have not re-raised the walk-away figure versus its 40–60c caption, the to-the-dollar precision on an indicative number, the placement of the US-data disclosure relative to the figure (though I've noted it once, because it's the thing a buyer's advisor attacks first), or the anonymous "Business" testimonials.

---

Send me the introducer pack and turn the billing on, and I'll give you two names.

Anneke
