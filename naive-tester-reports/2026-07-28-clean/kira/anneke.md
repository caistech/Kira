# Kira — walkthrough feedback

Hi Dennis,

I spent the best part of an hour in Kira today, first as an owner running the free valuation, then as a signed-in user, then through the operator side. I've written it the way I'd say it to you over a glass of wine rather than as a bug list, but the bugs are in there and I've been blunt where I think you need it.

Short version up front, because it's the answer to your two questions: **I'd sign up for the trial myself tomorrow.** **I would not send a client to it today** — and the reason isn't the product, it's that your Stripe is in test mode and your prices don't say GST. Both are half-day fixes.

---

## Platform Feedback

| | |
|---|---|
| **Persona** | Anneke — Australian SME business advisor, 25+ years. I value owner-operator businesses and tell people what they'd have to fix before anyone would buy them. |
| **URL** | https://kira-rho.vercel.app |
| **Goal** | Would I sign up myself? Would I send one of my own clients to it today? |
| **Duration** | ~55 minutes, desktop 1440px and mobile 375px |
| **Accounts** | QA user (`dennis@factory2key.com.au`) and QA admin (`dennis+qaadmin@…`), both signed in through the real forms |

---

## 1. Landing page

- The positioning is the best I've seen on a product like this. "Most owners find out the hard way that a business runs on knowledge that lives only in their head — so a buyer pays for a job, not an asset." That is *exactly* the conversation I have four times a year and I've never seen it written down that cleanly. You've got the problem dead right.
- The hero ladder ($150k walk away → $600k today → $2.5M captured) is a 4.2× jump. I understand why it's there, but as a number it is not defensible and the people you most want — brokers and accountants — will bounce off it. A business that goes from owner-dependent to fully documented does not quadruple. It moves maybe 1.3–1.8×, and the rest of that gap is growth, margin and client mix, which capturing knowledge doesn't fix. **I'd halve the headline claim. It will convert better with sceptical advisors, not worse.**
- "Kira — your fractional exec" is good. "Business Genome" is good — memorable, and it names a thing an owner can picture handing over.
- The FAQ is genuinely excellent. The cancellation answer ("Settings → Manage billing… No phone call, no retention conversation"), the training-data answer, the data-deletion answer. That's the tone that earns trust with this cohort.
- **Nitpick:** the FAQ says "each Kira is focused on one business… you can create a separate Kira for each." Inside the app the nav says **"My Kiras"** and I found six of them on one account, including one tagged "Personal". So the marketing promises one exec who knows your business, and the product delivers a folder of bots. Those are different products. Pick one.
- Privacy and Terms are both real, dated, versioned, and carry the entity, ABN and street address. No placeholder text anywhere. That's more than most products at this stage do — credit where it's due.

**Opportunity:** put one real, named case on this page — even a de-identified one ("Brisbane plumbing contractor, $1.4m turnover, transferability 22 → 61 in eleven weeks"). The four testimonial cards all just say "Business" as the attribution, which reads as invented. An advisor discounts an anonymous testimonial to zero.

---

## 2. The free valuation — the best thing you've built, and the thing I'd fix first

I ran two: a $1.2m plumbing contractor with $280k SDE, and a declining $250k hair salon with $90k SDE.

**What's right, and I want to say it properly:**

- Asking for **SDE** and explaining it ("what's left after all costs, plus the salary and perks you pay yourself… if the business kept $150k and paid you $50k, enter $200,000") is correct and almost nobody does it. Most online valuation toys ask for "profit" and get an accounting NPAT, which produces garbage.
- I entered a profit higher than my turnover on purpose. It caught it: *"That's higher than the turnover you entered ($1,200,000)… did you mean to enter sales here?"* — and let me carry on anyway. Warn, don't block. That's the right call.
- I typed "alpaca yoga retreat" as an industry. It said *"No sector match… we'll use the overall market-average multiple — but a closer match gives a better number."* Honest degradation. Good.
- The provenance note at the bottom — that the multiples come from BizBuySell's 2025 US data, that AIBB's Australian database is members-only, that Australian brokers use the same US data for the same reason, and that this is an indicative benchmark not an Australian market quote — is the single most credible paragraph on your site. **Do not let anyone talk you into removing it.** It is the reason I'd trust the rest.
- The disclaimer that this is enterprise value before debt, and that lease terms and working capital aren't in it, is correct and clearly written.

**Now the problems.**

- **Q1 doesn't recognise the ordinary Australian word for most trades.** I tested it properly. Every one of these returns "No sector match": *plumber, electrician, cafe, hairdresser, hairdressing, accounting, childcare, physio, civil, earthmoving, labour hire, aged care*. You have to type "plumb", "elect", "coff", "child", "hair" — the truncated stem — to get a hit. A 58-year-old sparky types "electrician", is told there's no match for his trade, and gets silently valued on the market average. **This is the first question in your funnel and it is quietly degrading the number that the entire product rests on.** It needs synonyms and it needs to match anywhere in the string, not just the front.
- **The categories are American.** "Day Care & Child Care", "Ice Cream & Frozen Yogurt", "Nursery & Garden Centers", "Liquor Stores", "Machine Shops", "Hair Salons & Barber Shops". An Australian owner says *childcare, gelato, garden centre, bottle shop, engineering workshop, hairdresser*. You've disclosed that the data is American, which is honest — but you don't need to leave the American *spellings* on the buttons. Relabel the list to Australian English and keep the same underlying mapping.
- **The "captured" number is not credible at the top end, and it's badly wrong at the bottom.** My plumber came out at ~2.5× today (fine) and **~4.2× captured**. A $1.2m-turnover trades business does not sell on 4.2×, documented or not, because the buyer pool is other owner-operators, not funds. My hair salon — *declining* profit, *squeezed* margins, *shrinking* client base, transferability **0/100** — came out at $98,100 today (1.1×, about right) and **$281,547 captured, 3.1× SDE**. That's telling a woman with a dying salon that writing down her processes will nearly triple what it's worth. It won't. The model appears to price trend, margin and client concentration into "today" and then assume the "captured" state has fixed all three. **Cap the captured multiple by sector and by size, and don't let a declining business show a growth-shaped uplift.**
- **The walk-away number is just the gear number back.** I typed $180,000 of plant and stock, and "Walk away" was $180,000. That's not what a walk-away is. A forced sale of trade plant and stock fetches 30–60% of written-down value, and then you're paying redundancy, lease make-good and the cost of chasing the debtor book. My clients get a nasty shock here. Discount it, and say you're discounting it.
- **The currency selector relabels but doesn't convert.** I switched from AUD to GBP on my results and $689,343 became **£689,343**. Same digits. That's not a display currency, it's a symbol swap, and it makes the number roughly twice as big in real terms. Worse: it's sticky. When I logged in, my dashboard and *your* operator "Kira Exec" screen both showed my value gap as **£752,919** for an Australian business, and there is no currency control anywhere in the signed-in app to put it back.

**Opportunity:** you're one field away from the thing advisors actually want. Add "how long have you been trading" and "is the premises leased or owned, and how long is left on the lease". Lease term is the single most common reason a small business sale falls over in Australia, and you're not asking about it.

---

## 3. Price and plan page

- The consequence copy before the button is genuinely good: *"Your card is saved today but nothing is charged. The first payment of $999 comes out 30 days from now, and we email you three days before. Cancel before then and you pay nothing."* That is how it should be written. No complaints.
- **There is no GST anywhere on this site.** I searched. Landing, plan page, Terms, advisors page, settings, the advisor commission section — the word does not appear once. You are an Australian company with an ABN in your own footer, defaulting to AUD, quoting $999/month and $499/month to Australian business owners. Every one of those owners is registered for GST and every one of them will read $999 as the amount leaving the account. If it's plus GST, say **"$999/month + GST"**. If it's inclusive, say so. This is not a copy preference — it's the first thing my clients' bookkeepers ask and the first thing that makes an invoice dispute.
- **The fee is set by your own estimate of the benefit, and nothing says so.** $183k gap → $499/month. $480k gap → $999/month. So the higher Kira values the gap, the more Kira charges. I understand the logic and I even like the framing, but you have to disclose it, because right now the vendor is producing an unaudited number and then pricing off it. An accountant will spot that in about four seconds and it will cost you the referral.
- On the numbers: $499/month is $5,988 a year to a salon owner whose entire take-home is $90,000. That's 6.7% of her income. She will not pay it, and the "3.3% a year of what you stand to unlock" framing won't land, because she isn't unlocking anything — she's being told a hypothetical future sale might be higher. **The floor plan is priced above what the bottom of your market can carry.**
- "Growth plan" and "Starter plan" are decent names, but they appear to be purely gap-derived. If an owner runs the valuation twice with slightly different answers and gets a different plan name and price, that's going to feel arbitrary. Consider showing the band boundaries.

**Opportunity:** offer a fixed-price, time-boxed "exit-readiness capture" — say $2,500 for eight weeks — alongside the subscription. That is a product I can put in a client engagement letter. A rolling $999/month is a product I have to justify every quarter.

---

## 4. Signed in as an owner

Logging in dropped me straight onto `/chat/agent_2601kfd…`.

- **That page is a cul-de-sac.** No left nav. No Settings. No Sign out. No link back to "My Kiras". The only three things on the page that go anywhere are: the Kira logo, which takes a *paying customer* back to the public sales page with "Value my business →" in the header; "Explore All Agents", which sends them off to a different product's marketplace; and "Report a problem". If I'd landed there as a real customer I would have assumed I wasn't logged in properly.
- The chrome you need already exists — `/dashboard` has a proper persistent left nav (My Kiras, Knowledge, New Kira, Settings, Sign out, plus the account email) and it collapses to a working hamburger drawer on mobile with 44px targets. **It just isn't on the page login sends people to.** That's a routing/layout fix, not a build.
- **The dark banner selling other AI agents sits at the top of the paid product.** "Tired of generic AI? Kira is just one of our specialized Voice AI agents. Explore All Agents →" — I've already bought. Marketing a sibling product to a subscriber inside the thing they're paying for is the kind of small thing that makes a $999/month purchase feel cheap.
- **It's voice only.** There is no text box. Nowhere. I clicked "Talk to the assistant" and got Mute / End and a bare red **"Not supported"** with no explanation of what wasn't supported or what to do about it. On a locked-down office laptop, an older iPad, or in an open-plan office, that's the whole product gone. Give me a typing fallback and give the error a sentence.
- **The Business Genome doesn't exist as a place.** It's the name of the deliverable, it's in the hero, it's in the FAQ, it's the justification for the fee, it's what the valuation says closes the gap — and there is no screen for it. I looked. No nav item, and `/genome`, `/business-genome`, `/my-genome` are all 404. If I'm paying $999/month to build a transferable asset, I want to *see* the asset. I want to open it, read it, watch it fill up, and print it for a buyer's due diligence pack. Right now I'm buying a promise I can't inspect.
- **There's no export**, despite the FAQ ("Everything Kira has captured about your business is exportable at any time") and the privacy policy saying the same. Settings has Profile, Plan & usage, Password, Notifications, Delete account — no export button. That's a stated commitment the product doesn't honour.
- Settings itself is good: the plan card shows "$0.00 of $20 used · 30 days left in your free month" with a fair-use explanation, Manage billing is there, and the copy is calm. No complaints.
- Knowledge page is good and the header explains itself well ("Anything showing 'Kira can read this' is searchable in conversation — just ask about it, no need to re-share").
- **My Kiras are named by a machine.** `Kira_Business_Dennis_7f1c`, `Kira_Dennis_HowTravel_7f1c`, `Kira_Trinh_DevelopingThe_7f1c` — truncated mid-word, and two of them are byte-identical duplicates with 0 conversations. Let me name them, or name them from the goal in plain English.
- **Dates are American.** "last 7/25/2026". To an Australian that's the 7th of July. Same format in the operator screens.
- **"Put it in writing" is the wrong thing to have in a customer's menu.** From the chat's More menu I landed on `/commit`, which is a letter-of-intent form: "I'd start a paid plan now", "I'd commit to a paid pilot", "Monthly you'd commit", "Peers you'd refer", and a signature line agreeing *"I'm recording this as a genuine expression of intent, and I'm happy for **Dennis** to follow up."* Your own admin screen calls these "validation + financing evidence". That's founder fundraising instrumentation, and it is sitting one click from a paying customer's chat window under a label that reads like "have Kira document this". Take it out of the customer menu and put it behind its own link you send deliberately.

**Opportunity:** the "first 4 weeks" plan on the dashboard (capture → document → reduce dependence → handovers) is the best structure in the whole product and it's completely passive. Make it a live checklist that ticks itself off as Kira captures things, and put the transferability score movement against it. That is the screen that makes someone renew in month two.

---

## 5. Operator / admin side

- Login segregation is clean. As the non-admin user, `/admin` bounced me to `/admin/login?error=not_admin` with a plain-English message and — importantly — a working "sign in as a user" link, so no dead end. As admin, the portal opened properly with its own left nav (Overview, Kira Exec, Introducers, LOIs, Settings, Sign out).
- **The banner at the top of Overview says: "TEST billing — No real money moves. Stripe is on test keys — flip STRIPE_LIVE_MODE to true and redeploy to go live."** Dennis, this is the finding that decides my answer on sending clients. Your public site has a live-looking checkout that says "Secure checkout by Stripe · billed by Corporate AI Solutions", takes a card, and states a $999 charge in 30 days — and none of it is real. Anyone who signed up in the last however-long is not a customer and won't be billed. If I'd introduced a client into that and it came out later, it costs me the relationship, not just the referral. **Nothing else on this list matters until that flag flips.**
- The "Kira Exec" cohort view is well-judged — value gap, transferability, conversations, agents, documents, memory facts per owner, with test accounts excluded. That's the right operator dashboard.
- It shows my owner's value gap as **£752,919** with the range £577,870 → £1,330,789, for an account on an Australian product. Same currency bug, now in front of the operator.
- Admin "Settings" in the left nav points at `/settings` — the *user* settings page. Clicking it drops you out of the admin shell into the customer shell with a different nav. Mildly disorienting; either build an admin settings page or label it "My account".
- On mobile the admin nav collapses properly and the two tables scroll horizontally rather than clipping, which is right — though there's no visual cue (shadow or fade) that there's more to the right, so it reads as truncated.

---

## 6. The advisor channel — this is where I actually live

This page is aimed at me, so I read it hardest.

- The terms are clear and generous: 10% of collected funds, monthly, for the life of the subscription, first-touch attribution that "cannot be quietly reassigned", nothing to join, no exclusivity, paid to me or my firm. That's a better deal than most referral programmes I'm in and the honesty about "collected funds only" is the part that tells me you've thought about it.
- **"You only send it to owners you already hold a current listing or engagement agreement with, and you tell them you are paid a commission"** — and there's a tickbox in the registration form recording exactly that. Good. That's the right condition and it's the right place for it.
- What's missing for an Australian advisory practice: **the GST treatment of the commission.** Is the 10% plus GST? Do you issue a recipient-created tax invoice, or do I invoice you? My bookkeeper asks this before I've finished reading the page. Right now there's nothing.
- The disclosure obligation deserves one more sentence. For an accountant, a referral commission engages APES 110, and "tell them" isn't enough — it needs to be in writing and it usually needs to be in the engagement letter. **Give me a template disclosure paragraph I can paste.** That removes the single biggest reason an accountant quietly doesn't take up a referral deal.
- The ABN lookup on the "Firm" field is excellent and unexpected — I typed "Deloitte" and got seven real ABR entries with ABNs and states. Exactly right. (Small display bug: one entry shows a postcode of "0000" with no state.)
- The "Pricing" link in this page's header goes to `/#pricing` on the consumer landing page, which explains that there is deliberately no price list. So the page I'm sent to as an advisor to find out pricing tells me pricing doesn't exist. Point it at something written for advisors.

**Opportunity:** the thing that would make me actually use this isn't the commission — it's a **client-facing valuation report I can put my own logo on**. Give me a branded PDF of the three numbers, the transferability score and the four gap drivers, and I will run it on every business in my book as a conversation-opener, and every one of those becomes a Kira link. Right now "Save / print this" gives me a page with your branding on it, which I can't put in front of a client as my work.

---

## Other strategic feature suggestions

1. **Make the transferability score the spine of the whole product.** It's the best asset you have — one number, moves weekly, tied directly to sale price. Show its history. Show what moved it. Email it monthly. That's the thing that keeps a subscription alive past month three, and it's the thing I'd quote in a client meeting.
2. **Ask about the lease and the trading history.** Two questions, and they're the two most common deal-killers in Australian small business sales. Their absence is the tell that the model is imported from US data rather than built here.
3. **Sell the exit event, not the subscription.** "Exit-ready in 90 days, fixed fee, here's the pack you hand a buyer" is a purchase decision an owner makes once and an advisor can recommend without ongoing exposure. A rolling monthly AI fee is a decision they revisit every month, and they'll churn on the first quiet quarter.
4. **Separate the marketing consent from the Terms tick at signup.** Right now it's one checkbox: "I agree to the Terms, including emails about Kira." Bundling marketing consent into acceptance of terms is a weak consent basis and it's the kind of thing that shows up in an audit. Also, the tick links to Terms but not to your Privacy policy — which is a shame, because your privacy policy is one of the better ones I've read and it's doing you no work sitting in the footer.
5. **"Choose your path"** on `/start` offers exactly one path. Either add the second one or change the copy.
6. **Give me a co-branded onboarding.** If I introduce a client, let them see "introduced by Anneke" on the welcome screen. It makes the introduction feel like advice rather than a link drop, and it makes the first-touch attribution visible to the person it protects.

---

## Standards Check

| # | Standard | Verdict | Evidence |
|---|---|---|---|
| §1 | Responsive | ✅ | Clean at 375px and 1440px on landing, valuation, plan, dashboard, settings, admin. No horizontal page scroll anywhere. Body text 16px. Nav collapses to a hamburger drawer with 44px targets. Admin tables use `overflow-x: auto` rather than clipping. |
| §2 | Auth-page pattern | ✅ | `/login` and `/admin/login` both have a "Forgot password?" link, a working show/hide password toggle, and "Email me a magic link". Signup mirrors it. (I did not test actual email delivery.) |
| §4 | Authed chrome + Settings | ❌ | Present and good on `/dashboard`, `/settings`, `/knowledge`, `/admin` — but **absent on `/chat/…`, which is where login lands you**. No nav, no Settings, no Sign out; the only exits are the public marketing home and an external marketplace. |
| §5 | Explanatory header | ❌ | Dashboard, Settings, Knowledge, Admin and the empty states are all good. The primary product surface `/chat` gives only "Hey there! 👋 Tap the mic below" — no what-it-is / why-it-matters. |
| §6 | Voice agent | ✅ | Voice is the product and it's zero clicks from the chrome; the session connected (Mute/End). Separately: the no-mic fallback is a bare red "Not supported" with no explanation and no text alternative — noted above as a defect, not a §6 failure. |
| §7 | Scaffold metadata | ✅ | Titles are real throughout: "Kira — your fractional exec", "My Kiras · Kira", "Settings · Kira", "Admin · Kira", "For brokers & accountants · Kira". Custom favicon and apple-touch-icon. |
| §8 | Team admin | ✅ | `/admin` exists with an operator allowlist and its own nav (Overview / Kira Exec / Introducers / LOIs). Customer side is legitimately single-owner. |
| §8.5 | Dual-portal separation | ✅ | User login reaches a real user home (`/chat/…` → `/dashboard`) distinct from `/admin`. As a non-admin, `/admin` returned `?error=not_admin` with a clear message and a link back to the user sign-in. No facade. |
| §9 | Codicils | ❌ | **No tax qualifier on any price** — "GST" appears nowhere on the site despite AUD default, an AU entity and ABN in the footer, and $999/$499 monthly prices. Plus a dead-end at `/chat`, and `/commit` (founder LOI capture) exposed in the customer menu. Consequence clarity before checkout is good, and ABN lookup on the advisor firm field is correctly wired. |

**Tally: 6 ✅ · 3 ❌ · 0 —**

---

## Scope note

Everything above comes from the live site only — I didn't read a line of your code, docs or notes. I ran two complete valuations (a $1.2m plumbing contractor and a declining $250k salon), signed in through the real forms as both the QA user and the QA admin, and walked landing / valuation / plan / chat / dashboard / settings / knowledge / advisors / signup / admin and its sub-pages at both 375px and 1440px. I did **not** complete a Stripe checkout, did not run any destructive admin action (no delete-account, no sign-out-everywhere), did not test email delivery for magic links or password reset, and did not have a microphone available, so I could not hear Kira speak or judge the conversation quality — which is, of course, the part the whole product actually turns on. Screenshots are in `./screenshots/`.

One last thing. The reason I'd sign up personally is that the valuation instrument is *good* — better than most of the paid tools in my industry — and the honesty in the footnotes is the kind of thing that takes years to learn to write. Fix the industry matcher, put GST on the prices, flip the Stripe flag, and build the Business Genome a room of its own, and I'll put it in front of a client the same week.

Thanks,

**Anneke**
