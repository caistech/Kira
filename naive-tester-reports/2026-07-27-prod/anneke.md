# Platform Feedback — Kira Walkthrough

Hi Dennis,

**Persona:** Anneke — 25+ years in Australian SME advisory. Business appraisals, exit readiness, and the conversation where you tell an owner their life's work is worth a third of what they'd hoped.
**URL:** https://kira-rho.vercel.app
**Goal:** Would I use this myself, and would I put my name on an introduction to a client?
**Duration:** ~50 minutes, 27 July 2026. Screenshots in `screenshots/anneke/`.

I'll say up front: this is a much better product than I expected to find. The valuation is the best free one I've walked in this market, and the advisor page is the clearest commission proposition I've read from a software company. There are three things that would stop me sending a client today, and none of them are hard to fix.

---

## Landing

- The proposition lands in one read. "A buyer pays for a job, not an asset" is exactly the sentence I've been saying to owners for twenty years, and I've never seen it on a software homepage. The three-number frame (walk away / today / captured) is the right frame — it's how I'd structure an appraisal conversation myself.
- The footer carries the entity, the ABN and a street address. `/privacy` and `/terms` are both live, dated 27 July 2026, and the privacy policy names the operating entity in section 1. That is not nothing — I've reviewed plenty of software my clients were being sold where the privacy link went to a hash.
- The body copy under the hero is grey on cream and fades out as you read it. On my laptop in a bright office it's genuinely hard. My clients are 55-70. That's the demographic you're writing for and it's the demographic that'll squint at it.
- "Kira — your fractional exec" is your browser tab title on every single page, including `/business-valuation` and `/dashboard`. If I've got four tabs open comparing tools I can't tell which is which.
- `/business-valuation` stacks two header bars — a "Kira by Corporate AI Solutions" strip and then a second "Kira / Currency" strip below it. Looks like two apps bolted together.
- Typing `/pricing` gives a 404. Your nav uses the `#pricing` anchor so nothing is actually broken, but it's a URL people guess.
- No voice agent on the homepage itself. She appears on the valuation page and inside the app, but the first surface — where a sceptical owner has the most questions — has no way to ask one.

**Opportunity:** Put a one-line "what a buyer would pay for a business like yours" teaser on the homepage using nothing but industry + turnover, before the 11 questions. Two fields, one number, then "want the real one?". You'd double the number of people who start the full valuation, and you'd have a captured email at the point of highest curiosity rather than the point of highest commitment.

---

## User Path — the valuation (the bit I actually care about)

I ran a plumbing contractor: $1.2M turnover, $200k profit, growing steadily, margins holding, a few big clients, "it would struggle" without me, systems mostly in my head, some recurring work, $250k of gear and stock.

**What's genuinely good:**

- Eleven questions, all in owner language, none of them jargon. Client concentration, owner dependency, documented systems, recurring revenue — those are the four things that actually move a multiple, and you asked all four. Most free calculators ask turnover and industry and stop.
- The live sanity checks are excellent. When I entered profit it came back with "That's a 17% margin on the $1,200,000 turnover you entered. Looks right?" When I deliberately entered profit ($500k) above turnover ($300k) it caught it: "Profit is what you keep after costs, so it should be lower than turnover — did you mean to enter sales here?" I've had clients hand me a "profit" figure that was their gross revenue. This catches that.
- The result is internally consistent, and I checked it. $802,375 minus $470,369 is $332,006, and the four uplift line items ($115,856 + $115,280 + $57,640 + $43,230) sum to exactly $332,006. Nothing double-counted, nothing hand-waved.
- The "why the number is what it is" section explains risk-pricing to a lay reader better than most brokers manage in person. The car service-history analogy is right.
- You disclose your method at the bottom. Good.

**What I'd have to caveat if I put this in front of a client:**

- **The SDE definition contradicts itself on the same screen, and it's the number everything runs on.** The question label says profit is "what's left after all costs, **plus** the salary and perks you pay yourself." The helper text three lines below says "if you turned over $1,200,000 but you kept $200k **after** costs and your own pay, enter $200,000." Those are two different numbers — for an owner drawing $120k, they're $120k apart, which at 2.4× is nearly $300k of valuation. I read that twice and I'm still not certain which you want. An owner will not read it twice.
- **The data is American.** "BizBuySell's 2025 small-business sale data (~9,500 closed deals, market average ~2.5× SDE)." That's a US marketplace, on a product that defaults to AUD, carries an Australian ABN and is being sold to Australian owners through Australian brokers. Australian small-business multiples don't track US ones, and Australian brokers here typically talk adjusted net profit or EBITDA, not SDE. I'm not saying the number is wrong — I'm saying I can't defend it to a client who asks "where's that from?", and I will be asked.
- **"Walk away $250,000" is just the number I typed in, undiscounted.** In a real close-down, vans, tools and stock fetch 40-60% of what an owner thinks they're worth. Calling book value the walk-away floor overstates the one number an owner should be pessimistic about.
- **You never say whether the $470,369 includes the gear.** In an Australian small-business sale, plant and equipment is usually inside the price and stock is at valuation on top. Until the result page says which, the number isn't quotable — and that's the difference between a conversation-starter and a document.
- **No debt, no lease, no working capital.** A plumbing business with $400k of equipment finance against those vans is worth $400k less than one that owns them. You don't ask. Same for a premises lease with five years to run versus month-to-month, and for how long they've been trading. Those are appraisal basics and their absence is the first thing a broker will notice.
- **The industry field accepts anything.** I typed "underwater basket weaving", got no matches, no warning, and Next was still enabled — straight through to question 2. Whatever sector multiple got applied, I never found out. The helper text says "pick the closest match from the list" but nothing enforces it.
- **The profit-above-turnover warning doesn't block, and the result page carries no flag.** Warn-don't-block is a defensible choice, but then the resulting valuation should say "these figures didn't reconcile" on the result screen. It doesn't — you get the same confident three numbers.
- Small things: the currency and turnover fields are bare number inputs with no thousands separators, so `1200000` sits there as an unreadable run of digits while you're typing it. And the field has no visible label at all beyond a `$` — just a box.

**Opportunity:** Add one screen after the result: "What this number assumes." Four lines — SDE basis, whether plant is in or out, no debt adjustment applied, source of the multiple. That single screen is the difference between something I forward to a client and something I quietly don't. It costs you nothing and it's the thing that makes an advisor comfortable attaching their name.

---

## User Path — the account

Signed up fresh (`annekekira2707@mailinator.com`), confirmed by email, landed on `/dashboard` — "My Kiras". A real user home, clearly not the admin console. That works.

- The confirmation email is properly branded — product name, sender voice, not the stock Supabase "Confirm your signup". Arrived in under a minute.
- The app chrome is right: persistent left rail (My Kiras / Knowledge / New Kira), Settings and Sign Out anchored at the bottom, your email underneath. Every page opens with a plain-English line saying what it's for, including the empty state. At 375px it collapses to a hamburger and nothing overflows sideways.
- **The Settings page is telling brand-new users things that aren't true.** Sixty seconds after signing up, with no card ever requested, "Plan & usage" says: *"Your card is on file and the first payment comes out at the end of it"* (no card exists), *"$0.00 of $20 used"*, *"Your free month has ended"* (day zero), and *"You've reached the fair-use ceiling for the free month"* — which flatly contradicts the $0.00-of-$20 meter sitting directly above it. Four statements, three false, two mutually exclusive. Screenshot `21-user-settings.png`. If I sent a client here and their first look at billing said their free month had ended and their card was on file, I'd get a phone call, and it wouldn't be a friendly one. This is the single thing I'd fix before anything else.
- **The valuation doesn't follow you in.** I ran the valuation, got a $332,006 gap, and the whole pitch is "see the gap, then close it." I signed up and the dashboard has no idea any of that happened. No number, no gap, no "here's what we're working towards." The emotional thread that got me to sign up is dropped at the door.
- My first name was auto-filled as "annekekira2707" — the local part of my email address. Cosmetic, but it's the first personal detail the product shows me about myself and it's wrong.
- On desktop the "Talk to Kira" voice button sits *underneath* the black "Report a problem" widget in the bottom-right corner — you can see the orange edge poking out behind it. Your voice agent is the product's differentiator and it's partly hidden by the bug reporter. On mobile they separate properly.
- The signup consent line says "I agree to the Terms" and links Terms only. Given you collect turnover and profit figures, the Privacy Policy — which is good, and which you've clearly just written — should be linked at the same tickbox.
- The FAQ promises "everything Kira has captured about your business is exportable at any time." I couldn't find an export control in Settings. If it's elsewhere it isn't where an owner would look.

**Opportunity:** Carry the valuation into the account and make it the dashboard's spine — the three numbers, the transferability score out of 100, and the four uplift line items as an actual checklist she works through with you. Right now the valuation is a lead magnet that's thrown away on conversion. It should be the product's progress bar. It's also the exact thing you're promising to show introducers ("how their valuation is moving") — and you can't show movement in a number you didn't keep.

---

## Admin Path

Signed in with the operator account. `/admin` bounced me through a dedicated `/admin/login`, which is right.

- Clean console. Left nav (Overview / Kira Exec / Introducers / LOIs), Settings and Sign out at the bottom, explanatory header on each page. Counts up top: 17 users, 16 Kira agents, 35 conversations.
- The "TEST billing — Stripe is on test keys" banner is honest and prominent. Worth stating plainly though: as of today the product cannot take a payment, which means the commission I'd be earning as an introducer is theoretical.
- The "Joined" column is truncated mid-value — "7/25/2C" — and the dates are US month/day/year on an Australian product. Small, but it's the kind of thing an Australian accountant notices in the first ten seconds.
- The Introducers page empty state reads: *"Add the first broker above. Prove one brokerage will send ten owners before building anything more elaborate around them."* That's your own strategy note sitting in the product UI. Fine while it's only you in here — but it's shipped code, and it reads as an internal to-do.
- The "Firm ABN" field on the add-introducer form is a plain text box. Your public advisor form does a proper business-register lookup and confirms the match. The operator-facing one doesn't. That's backwards — the operator is the one entering an ABN they'll be paying commission against.
- Zero introducers, zero introductions, zero paying. So the entire advisor channel is untested in production.
- Real customer emails are visible in Recent users. Appropriate for an operator console, but if a second operator ever gets access you'll want a masking rule.

**Opportunity:** Give the introducer record a "last statement sent" and "commission accrued" column from day one, even at zero. The first thing a broker will ask on month two is "where's my statement," and the page that answers it should exist before the first introducer does — not after.

---

## What an advisor actually gets — `/advisors`

This is the strongest page on the site and I want to be specific about why, because it's rare.

- It answers, in order, every question I would ask: what I'm paid (10% of what they pay you, monthly), on what (collected funds only, never invoices), for how long (the life of the subscription — five years means five years), attribution (first-touch, "it cannot be quietly reassigned"), what I can see (whether they opened my link, whether they signed up, how their valuation is moving — never their conversations), what it costs me (nothing, no minimum, no exclusivity), and whether you'll go around me (no, and you don't email my clients).
- The one condition — only send it to owners I already hold a listing or engagement with, and disclose that I'm paid — is the right condition, and putting it as a tickbox rather than buried in terms is the correct instinct. I'd sign that.
- The Firm field does a live Australian business-register lookup. I typed "Global Buildtech" and got the correct entity with its ABN and state, then "matched on the business register" as confirmation. That's the level of care that tells me the people building this know who they're building for.
- "Progress only — never their conversations. That boundary is built into the system, not a policy we promise to follow." That's the sentence that would let me make the introduction. It's also the sentence I would need you to be able to prove.

Where I'd push back:

- **It's a waitlist, not a channel.** "Request access" and a person reads it. There's no way for me to see my own dashboard before I commit — "See what a client sees" links to the valuation, which is what my *client* sees, not what *I* see. I'm being asked to attach my professional name to a commission arrangement on the strength of a marketing page. Give me a live demo dashboard with fake owners on it.
- **I'd be introducing a client to a price I cannot quote.** The fee is set per-business off their own valuation gap, and there's no price list anywhere by design. I understand the logic. But when a client rings me and asks "what's it going to cost me," "run the valuation and it'll tell you" is not an answer a broker likes giving. At minimum give advisors a private band table — "for a business with a gap of $250k-$500k, expect $X-$Y a month."
- **Nothing addresses the compliance question.** A licensed broker taking an ongoing commission for referring a client to a third-party service has disclosure obligations beyond "tell them you're paid." I'd want a one-pager I can hand my compliance person: who holds the client relationship, what happens to the data if I cease being an introducer, who's liable if the valuation figure ends up in a listing document. Nothing on the page or in the Terms speaks to it.
- Minor: the undertaking tickbox only responds when you click the label text, not the box itself. I noticed because I was clicking precisely.
- I could not confirm my "Request access" submission went through end-to-end — my browser tooling dropped the session mid-submit twice. The form validated, the ABN matched, the submit button enabled. I'm not reporting that as broken; I'm reporting that I didn't see the confirmation.

**Opportunity:** Build the advisor a *client-ready artefact*. Right now the introduction I make is a bare link. What I actually want to send my client is a two-page PDF with their three numbers, the four gaps, and my firm's logo on it — a "pre-sale readiness snapshot, prepared by Anneke." That's a document I'd be proud to send, my client keeps it, my name is on it, and your link is inside it. You'd convert a channel of reluctant link-forwarders into a channel of people using your tool as their own deliverable.

---

## Cross-Path Issues

- Non-admin user hitting `/admin` and `/admin/introducers` is redirected to `/admin/login?error=not_admin` with the message *"That account isn't an operator account. If you came here to use Kira, sign in as a user instead."* Correct behaviour and unusually polite about it.
- Admin and user portals both have their own left nav, both have Settings and Sign Out, and the admin's is visibly a different console. No leakage either way that I could find.
- One inconsistency worth naming: the ABN treatment. Public advisor form = live register lookup with confirmation. Admin introducer form = plain text box. Same data, two standards.
- Note for your records: the documented QA user credential (`dennis@factory2key.com.au`) did not authenticate on production — "That email and password don't match." The admin account signed in first time on the same form. I walked the user path by signing up fresh instead.

---

## Other Strategic Feature Suggestions

1. **Ask for debt.** One question — "roughly how much finance is against the business (equipment, vehicles, overdraft)?" — and subtract it. Without it you're publishing enterprise value and an owner is reading it as what lands in their pocket. That gap is where advisors get angry phone calls.
2. **Let the owner sanity-check against a comparable.** Even "businesses like yours in your sector typically sell for 2.0×-3.0× — you're at 2.4×" would move the number from an assertion to a position.
3. **Re-run and show movement.** The gap number is only interesting the second time you see it. Prompt a re-valuation at 90 days and show the two side by side. That's also the exact thing the introducer dashboard promises to display.
4. **A succession-timeline question.** "When do you want to be out — under 2 years, 2-5, 5+, no plan?" It changes the advice entirely, it's the question every owner is already thinking about, and it's the single best segmentation signal you could capture for free.
5. **Give her something to say on the homepage.** The voice agent is your differentiator and she's absent from the surface where scepticism is highest. "Ask her whether this is right for your business" is a stronger CTA than a third "What's my business worth?" button.
6. **Australianise the numbers or say plainly that you haven't.** Either source AU multiples or add one line: "based on US transaction data, adjusted; Australian sale prices vary." Honesty about the limitation costs you far less than being caught by an accountant.

---

## Standards Check

| Item | Result | Evidence |
|---|---|---|
| Responsive 375 / 1440, no h-scroll | ✅ | `scrollWidth == innerWidth` at both widths on landing, valuation, dashboard; mobile collapses to hamburger drawer (`23-dashboard-mobile.png`) |
| Touch targets ≥44px, body ≥16px mobile | ✅ | Choice-card buttons and CTAs are full-width blocks at 375px; body copy legible without zoom |
| Nav collapses to usable mobile pattern | ✅ | Marketing nav → hamburger; app left rail → drawer, same items |
| Auth-page pattern (forgot / show-password / magic-link) | ✅ | All three present on `/login` and `/admin/login` (`11-signin.png`); signup also offers magic link |
| Reset flow actually delivers | — | Not exercised; I verified the *signup* confirmation email delivers and is branded, but did not run a password reset |
| Persistent left navbar on authed pages | ✅ | Present on `/dashboard`, `/settings`, and every `/admin/*` page |
| Reachable /settings (Profile / Password / Notifications / Account) | ✅ | All four sections present, one click from the rail (`21-user-settings.png`) |
| Sign Out present | ✅ | Bottom of the left rail in both portals |
| Explanatory header on every page/panel | ✅ | Including empty states — "You don't have a Kira yet. Have a short conversation and Kira builds one around your goal." |
| Voice agent reachable ≤3 clicks from chrome | ✅ with fault | "Ask Kira" on the valuation opens an ElevenLabs call panel; "Talk to Kira" in-app — but on desktop it sits under the "Report a problem" widget, and there's no voice on the homepage |
| Tab title is the product name | ✅ | "Kira — your fractional exec" (nit: identical on every route) |
| Favicon is not the default feather | ✅ | Custom `/favicon.ico` + apple-touch-icon |
| Dual-portal separation (user home ≠ /admin) | ✅ | Signup → `/dashboard` "My Kiras"; user hitting `/admin` → `/admin/login?error=not_admin` (`22-user-hits-admin.png`) |
| Irreversible actions state consequence + confirm | ✅ | "Permanently delete your account and everything in it. This cannot be undone." stated before the button |
| Zero dead ends | ⚠️ | `/pricing` is a 404 if typed (in-app links use the `#pricing` anchor, so nothing in the UI is broken) |
| Address autocomplete | — | No address fields anywhere in the flows I walked |
| Business/ABN fields use register lookup | ⚠️ | Public advisor Firm field ✅ live ABR lookup with match confirmation; admin "Firm ABN" ❌ plain text |

---

**Scope note:** ~50 minutes. I covered the landing page, the full 11-question valuation twice (once coherent, once with deliberately broken figures), the result page and its arithmetic, `/advisors` including the ABR lookup and form validation, signup → email confirmation → dashboard → settings, the admin console (Overview, Introducers), and cross-path auth in both directions. I did not walk "Create your Kira", the discovery conversation, the Knowledge page, LOIs, Kira Exec, the password-reset email, or a live voice conversation — and I could not confirm my advisor "Request access" submission landed.

**Would I refer a client today?** Not quite — but I'm one fix away, not five. Correct the SDE wording, and stop the Settings page telling a brand-new account that its free month has ended and its card is on file. Do those two and I'd run this on three clients next week and send you what they say. The billing copy in particular: I can defend a number I have to caveat, I cannot defend a screen that tells my client they're being charged when they aren't.

Thanks, Anneke
