# Mobile Marcus — second run, standing in a car park, iPhone SE (375px)

Hi Dennis,

Second go at this on the phone. I'm going to say up front: the thing that stopped me last time is fixed. I got a number, and I could read most of it. Then I signed in and hit a wall.

Everything below is measured off the live site, not eyeballed. Screenshots in `screenshots/mobile-marcus/`.

---

## The two things you asked me to look at again

**1. Do the Next / Back buttons still have stuff sitting on them? No. Gone.**

I walked all eleven question screens and measured the actual pixel boxes at every one. Zero overlaps, every screen.

- Back: 72 × 44px. Next: 115 × 48px. Both labelled at 16px.
- I did a hit-test at the dead centre of each button — what's actually on top when a thumb lands there. Every screen returned the button itself, not something floating over it.
- There is no "Ask Kira" pill anywhere in the valuation flow now. Nothing to collide with.
- The "Report a problem" widget has learned to move. On the early questions it sits at y=746, well below the buttons at y≈450. On question 11, where the buttons drop to y=765, the widget shrinks to a 42 × 42 icon and jumps up to y=385 — out of the way. That's a genuine fix, not luck.

That was the whole reason I gave up last time. It's fixed.

**2. Is the result text at 16px now? Half of it.**

Measured on the result page:

- The main explanation — "A buyer isn't really paying for last year's profit…" and "That's the difference between selling a job and selling an asset" — **is 16px**. Line height 26px. I read that standing up, one-handed, no pinching. That's the improvement.
- But the "Where that value is hiding" cards — the four things that actually tell me what to *do* — are **14px**. "The business runs on you. A buyer sees that they are purchasing your job…" is 14px.
- Every money sub-label is **12px**: "WALK AWAY", "A buyer buying a job · ~2.4× SDE", "Runs & sells without you · ~4.2× SDE", "once captured" (× 4). "Transferability score: 36/100" is 14px white-on-purple.
- Full count on that page: **23 elements at 12px, 11 at 14px**, 28 at 16px+.

So the paragraph explaining the number got bigger and the numbers' own labels didn't. The bit I'd squint at is the bit telling me whether $722,727 is before or after debt.

On the landing page it's worse and unchanged: **29 at 14px, 7 at 12px, 3 at 10px**. The three 10px ones are the labels on your headline mini-chart — "Walk away", "Today", "Captured" — under figures that are themselves only 14px. That chart is your whole pitch and it's the smallest text on the page.

**Opportunity:** the 12px labels are attached to five-and-six-figure numbers. Push them to 14px minimum and the card body copy to 16px, and I never have to zoom on the page that's meant to sell me.

---

## Getting to the number — this bit is good

- Landing page: no sideways scroll, 375 exactly. Same for the valuation, result, plan and login pages.
- The intro screen tells me what I'm getting before I start: three numbers, 11 questions, ~3 minutes, nothing to sign up for. Good.
- The answer cards are big — full width, about 68px tall. I couldn't miss one if I tried. Tapping one highlights it, pauses for about half a second so I see what I picked, then moves on. That pause is the right call; I'd have thought it was broken if it jumped instantly.
- Next stays greyed out until I've answered. No guessing.
- The industry typeahead worked — typed "plumb", got "Plumbing / Construction", one tap.
- Question 8 ("if you took a 3-month holiday tomorrow") is the one that landed. That's the question that made me want the answer.

**The reload test — it passed.** I answered seven questions, hit reload, and came back to **Question 8 of 11**. Then I went out to the homepage and came back to the valuation, and it was *still* on Question 8. That is exactly the thing that matters for someone doing this between jobs, and it works.

**Small stuff:**
- The question card's top edge tucks under the sticky header when it auto-scrolls — the little icon and "Question 1 of 11" are clipped (see `03-q1.png`).
- Q11's money field is a raw number box with tiny up/down spinner arrows and no comma formatting. I typed 180000 and had to count the zeros back. On a phone those arrows are useless.
- "See my valuation" sits at y=765 with a height of 48 in an 812-tall screen — its bottom edge is 1px past the fold. Trivial, but it means the final button is never fully on screen without a nudge.

**Opportunity:** format the money fields as I type ($180,000) and drop the spinner arrows on mobile. It's the only place I had to concentrate.

---

## The result and the price — genuinely well done

- Three numbers stacked in cards, big figures, no chart to squint at. $180,000 / $722,727 / $1,248,102 and a $525,375 gap. Clear.
- The "Why the number is what it is" section, with the car service-history analogy, is the best writing on the site. I understood why a buyer discounts me.
- The disclaimers underneath are honest — value before debt, US sector data used as a benchmark not an Australian quote. I trust a number more when someone tells me what's wrong with it.
- The pricing page states the consequence *before* I click, properly: $999/month, 30 days free, card saved today, nothing charged, email three days before the first payment, cancel and pay nothing. That's the clearest money page I've read on a phone.
- CTA buttons there are 275 × 88 and 124 × 44 — no problem hitting them.

**Opportunity:** none on the money page. Leave it alone.

---

## Signing in — where it fell over

I signed in with a real account and typed the details into the form.

- **It took over 25 seconds.** The button said "Signing in…" and then nothing happened for long enough that I checked whether I'd lost signal. No spinner, no progress, no "this can take a moment". In a car park on 3 bars I'd have tapped it again and assumed I'd double-charged something.
- It did eventually work. I landed on the chat page and Kira said "Welcome back — Kira remembers where you left off." Nice touch.

Then two real problems:

- **There is no navigation on the page I land on.** I listed every button and link on that page: the Kira logo, "Explore All Agents →", Expand, "Talk to the assistant", "More options", "Report a problem". **No hamburger, no Settings, no Sign Out.** I checked — the menu button that exists everywhere else is not on this page at all.
  - "More options" gives me Add knowledge / Share Kira / Complete project / Put it in writing. Nothing about my account.
  - I only found Settings by typing `/settings` into the address bar. It's there and it's excellent — profile, plan and usage, password, notifications, delete account, Manage billing, Sign out — with a proper 44 × 44 menu button and 272 × 44 drawer items.
  - Your own FAQ says "cancelling takes one click in Settings". From where the product actually puts me after login, it takes zero clicks and one URL I'd have to guess. That's not a nitpick, that's the page where I'd want to cancel.

- **The chat page scrolls sideways.** Page width 391px in a 375px screen — 16px of slop. I could push the whole page left with a thumb and the header banner slides off the right edge (`22-chat-sideways.png`). It's the chat panel itself: it's set to a full 375px wide but starts 16px in from the left. Every other page on the site is exactly 375. This is the one that isn't.

- Also: the page I land on *after paying* opens with an ad — "Tired of generic AI? Kira is just one of our specialized Voice AI agents. Explore All Agents →". I'm already in. Selling me the suite on my own home screen reads badly.

**Opportunity:** put the same hamburger that's on `/settings` onto the chat page, and swap that top banner for the user's own thing — "your Business Genome: 36/100" or whatever moves. That's the screen they'll open every day.

---

## Thumbs and small targets

Measured, not guessed:

- **Marketing header hamburger: 30 × 44px.** Same as last time. 14px too narrow. It's also crammed against the "Value my business" button with a 12px gap.
- The header on the landing page is jammed: logo, "Kira", "Sign in", "Value my business →", hamburger, all in 375px. **"Sign in" wraps onto two lines** and its box (x129–174) starts at exactly the pixel where the Kira wordmark link ends (x24–129). Zero gap. Aim slightly left of "Sign in" and you hit the logo and go nowhere.
- **"Forgot password?" is 103 × 15px. "Sign up" is 43 × 15px.** Fifteen pixels tall. Those are the two links you need when you're locked out and standing up, and they're the smallest things on the page.
- The SayFix bubble on the result page is 42 × 42 and clipped by the right screen edge — under 44 either way.
- Good news: the app-side hamburger (`/settings`) is **exactly 44 × 44** and the drawer items are **272 × 44**. Whoever did that one did it right. The marketing header just hasn't caught up.

**Opportunity:** copy the app header's 44px hamburger into the marketing header, drop "Sign in" into the drawer on mobile, and give the auth links a padded 44px hit area.

---

## The report-a-problem widget

It's clever and it's half-solved. It genuinely avoids the *buttons* now — that's the whole reason the Next/Back collision is gone. But it doesn't avoid *text*:

- On the pricing page it sits squarely over the "Just talk. Kira does the building." heading (`14-plan.png`).
- On the result page it floats over the middle of the "Why the number is what it is" paragraphs (`11-result-gap.png`).
- On the valuation intro it covers item 3 of "Here's what you'll find out" (`02-val-intro.png`).

It knows where my buttons are. It doesn't know where my sentences are.

**Opportunity:** it already avoids controls; teach it to avoid headings too, or just park it as a small tab on the right edge on mobile.

---

## Would I carry on?

Yes — up to the point I signed in. Getting the number was quick, the number was believable, and the price page didn't hide anything. I'd have paid attention.

But the first thing I see after signing in is a page with no way to my account and a layout that slides sideways under my thumb. If I'd just put a card in, that would worry me more than any of the small text.

---

## Standards Check

| Item | | Evidence |
|---|---|---|
| Responsive at 375px | ⚠️ | Landing / valuation / result / plan / login all exactly 375. Chat page is 391 vs 375 viewport. |
| No horizontal scroll | ❌ | `/chat/agent_…`: scrollWidth 391, clientWidth 375. `.convai-panel--embedded` is 375px wide starting at x=16. |
| Touch targets ≥44px | ❌ | Marketing hamburger 30×44; "Forgot password?" 103×15; "Sign up" 43×15; SayFix bubble 42×42. App hamburger 44×44 and drawer items 272×44 pass. |
| Body text ≥16px | ❌ | Result page: 23 elements at 12px, 11 at 14px. Landing: 29 at 14px, 7 at 12px, 3 at 10px. Main result narrative is 16px/26px — that half passes. |
| Nav collapses to thumb-reachable mobile pattern | ⚠️ | Landing drawer opens with 327×48 items; `/settings` drawer 272×44. But the hamburger is 30px wide on marketing pages. |
| Login: forgot-password | ✅ | "Forgot password?" link present on `/login` (target only 15px tall). |
| Login: password visibility toggle | ✅ | "Show password" button on `/login` and on `/settings` → Update password. |
| Login: magic-link option | ✅ | "Email me a magic link" button below the divider. |
| Nav on every authed page | ❌ | `/chat/agent_…` has no menu button at all — controls are logo, Explore All Agents, Expand, Talk to the assistant, More options, Report a problem. |
| Reachable /settings | ❌ | Exists and is complete, but unreachable from the post-login landing page; found only by typing the URL. |
| Sign Out | ⚠️ | Present in the `/settings` drawer (272×44). Absent from the page you land on after signing in. |
| Explanatory header on every page | ✅ | Landing, valuation intro, `/plan`, `/settings` ("Manage your account…"), `/login` ("Use your password, or get a one-time magic link…") all carry one. |
| Voice surface ≤3 clicks from chrome | ⚠️ | "Talk to the assistant" is 1 click after login. Zero voice or clarifier anywhere in the 11-question valuation, which is the part with the nuance. |
| Tab title is the product name | ✅ | "Kira — your fractional exec"; `/login` is "Sign in · Kira". |
| Cost/irreversible actions state consequence first | ✅ | `/plan` states $999/month, 30 free days, card saved not charged, 3-day warning email, cancel-and-pay-nothing — all before the button. |
| Zero dead ends | ⚠️ | Valuation flow has none, and resume-after-reload works. The post-login chat page is the dead end. |
| Forms full-width and one-handed | ⚠️ | Login and settings fields are full-width. Q11's money field uses tiny number spinners and no comma formatting. |
| Modals full-screen on mobile | — | Didn't hit a modal. Menus render as full-width drawers. |

---

*Scope note: one pass at 375 × 812 on the public landing, the full 11-question valuation and result, `/plan`, `/login`, and the authenticated `/chat` and `/settings` pages, signed in with the QA user account. All pixel values are computed values read off the live pages. I did not test the voice call itself (no mic), Stripe checkout, or the advisor pages. The browser tab crashed twice during long automated runs — I'm putting that down to my own tooling rather than the site, but flagging it in case it isn't.*

Thanks,
Marcus
