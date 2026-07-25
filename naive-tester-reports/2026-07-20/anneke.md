# Kira — Naive-Tester Walkthrough

**Persona:** Anneke — Domain Operator, 50s, 25+ years running a real back-office operation | **URL:** https://kira-rho.vercel.app | **Goal:** Sign up as a business owner, go through onboarding/discovery, reach the real product, decide if I'd trust Kira with my operation; then lightly probe admin. | **Duration:** ~50 min

A note before I start: I came in cold, knowing only "Kira — an AI voice assistant." I signed up as a fresh non-admin (`anneke.test+…@gmail.com`), and I poked the way a real owner pokes — refresh, back button, "where does this button actually go." Overall I liked the front door a lot more than I liked what happened once I walked through it. Let me take you round.

---

## Landing

- First impression: genuinely lovely. Warm, human, not the usual grey SaaS wall. The "Not one AI for everyone — then meet YOUR Kira" hook lands, the Personal vs Business split is clear, and the "This is a partnership / here's what Kira needs from YOU" section is honest in a way I respect. This is the best-looking page in the whole product.
- Friction: you give me **two different front doors and I can't tell them apart.** Top-right has "Start as User" (→ `/signup`) AND a giant coral "Create Your Kira" (→ `/start`). They sound identical but go to completely different flows. As the owner I clicked the big button first, of course — and that took me somewhere different from where "sign up" would have. Pick one primary verb.
- Terminology, and I'm going to keep a tally because it matters: here you're a **"thinking partner"** and a **"personal AI guide."** Hold that thought.
- Nitpick, but I notice these things: the footer credits **"Created by Dennis McMahin"** — should that be McMah**on**? And the footer says **"© 2025"** in one line and **"© 2026"** two lines down. On a trust-based product ("your data isn't shared or sold, ever") a misspelled founder name and a wrong copyright year are exactly the small tells that make an operator hesitate.
- The embedded "Setup Kira learning about you…" chat mock-up is a nice touch — sets the expectation that this is conversational, not a form.

**Opportunity:** Collapse "Start as User" and "Create Your Kira" into ONE labelled path. Right now the two doors send two kinds of user into two different flows, and neither of us knows which is canonical.

---

## Signup

- It works, and auto-confirm is on — I never had to hunt for an email, which I appreciate.
- The identity wobble I flagged gets worse: the signup card subtitle is **"Your AI executive assistant that remembers you."** So in the space of two clicks I've been a *thinking partner*, a *personal guide*, and now an *executive assistant*. Those are three different products to me. A thinking partner challenges me; an executive assistant does things for me; a guide walks beside me. Which one am I buying? Decide, then say it the same way everywhere.
- Bug / real friction: **signup gives no feedback.** I filled First name / Email / Password, hit "Create account" — and the page just sat there on `/signup` with my details still in the boxes. No spinner, no "welcome," no redirect. Under the hood the account *was* created (the call succeeded), but as a human I concluded it had failed and clicked again, then gave up and went to "Sign in" manually. A silent success is indistinguishable from a failure. A first-time user will bounce here.
- Fields: First name, Email, Password. No last name (yet Settings later asks for one — so why not here?). And for a product that leads with a privacy promise, there's **no tick-box to accept terms/privacy at signup** — I'd expect one.

**Opportunity:** On "Create account," either drop me straight into the dashboard or show a clear "You're in — let's set up your Kira." The single most fixable trust-killer in the funnel.

---

## Login

- This page is done properly and I want to say so: **forgot-password link, a working password-eye toggle, AND a magic-link option** all present. That's the full kit. Signing in dropped me on `/dashboard` immediately.
- "Email me a magic link instead" is a nice, low-friction touch for someone like me who'll forget the password by tomorrow.

---

## Dashboard (the real user home)

- Good news first: this is a **real, authenticated home, and it is not the admin panel** — persistent left nav (My Kiras / New Kira / Settings / Sign out + my email at the bottom), a proper explanatory header, and on mobile it collapses to a clean hamburger. The chrome here is right.
- Now the problem. From the empty state, the one obvious button for a brand-new user with no Kira is **"Set up your first Kira."** I clicked it. **It 404s.** `/setup` → "This page could not be found." The single most important action for a first-time user — make my first Kira — is a dead link. And it's not silent: it fires a repeating 404 in the background every time the dashboard prefetches it.
- Making it worse: the dashboard offers **three** "get started" buttons that don't agree — "Start discovery" (→ `/discovery`, works), "Set up your first Kira" (→ `/setup`, **404**), and the landing's "Create Your Kira" (→ `/start`, works but a *different* flow again). So of the three ways to begin, one is broken and the other two are separate experiences. A new user has a one-in-three chance of hitting a wall on their very first click.

**Opportunity:** Fix or remove `/setup` today — it's the first thing a new user touches. Then decide whether "discovery," "setup," and "start" are one onboarding or three, because right now they're three.

---

## Discovery (`/discovery`)

- The framing is good: "Let's get to know you… a relaxed conversation, not a form… each session makes Kira know you better," shown as **Stage 1 of 6.** For a voice product that needs my context, this is the right promise.
- I hit "Start a conversation." The widget switched to a live call state (Mute / End controls appeared) and the server accepted the session — so the plumbing is real. It then showed **"Connection problem,"** which I'll put down to my test environment having no microphone rather than a server fault (the backend call succeeded). I couldn't complete a spoken call from here, so I'm reporting on the surface, not the conversation quality.
- Chrome inconsistency: **`/discovery` has no left navbar.** Every other logged-in page carries the persistent rail; this one drops it entirely (just a logo header + "Done for now →"). It's not a dead end — the exit link is there — but it feels like a different app for a moment.

**Opportunity:** Keep the persistent chrome on the discovery page too, or make the chrome-less "focus mode" a deliberate, consistent pattern (and use it on both voice flows, not one).

---

## Setup / "Start" journey (`/start`)

- This is the *other* live onboarding, reached from the landing's big button. It's a well-designed dark "Personal Journey vs Business Journey" picker → "Start talking" → a voice screen: **"Let's talk about work stuff… Kira will create a brief for you to review… the Review Framework button turns green when ready."** Nicely done visually.
- But now I've met a **fourth and fifth vocabulary word**: my output here is a **"brief"** / a **"framework."** Over on `/discovery` it was **"stages."** On the dashboard it's a **"Kira."** So depending on which button I pressed, the thing I'm building is called a Kira, a discovery, a brief, or a framework. Same person, five words.
- Under the hood this flow uses a **different voice engine than discovery** (a raw embedded ElevenLabs widget here vs a server-minted session on `/discovery`). I only noticed because they behave slightly differently, but two voice UIs in one product is a maintenance and consistency smell — the day one breaks, the other won't, and support won't know which "Kira voice" the customer means.

**Opportunity:** One onboarding, one word for the artifact, one voice integration. Right now `/start` and `/discovery` are two products wearing the same logo.

---

## Chat / the actual product

- I never reached it. Because `/setup` is dead and the two working flows are both **voice conversations I couldn't complete headlessly**, I couldn't get to a live, named "Kira" I could talk to day-to-day. So I can't tell you whether the core promise — a Kira that remembers me and builds on it — actually delivers. That's the thing I most wanted to evaluate as someone deciding whether to hand over my operation, and the funnel wouldn't let me get there. For a real buyer that's the whole decision, and it's currently gated behind a broken button and a mic.

**Opportunity:** Make sure there's at least one path to a *persistent, named Kira* that survives the conversation, and surface it even before the voice call completes — a business owner wants to see the "it remembers me" payoff before committing.

---

## Admin (probed lightly, as instructed)

- Segregation is solid, and I tried to break it:
  - As my logged-in **non-admin** user, hitting `/admin` bounced me to `/admin/login?error=not_admin`. Correct.
  - Typing my non-admin credentials into the admin login **rejected me** and kept me on the error page. Correct — the allowlist holds.
  - **Logged out**, `/admin` → `/admin/login` and `/dashboard` → `/login`. Clean.
- The admin login ("Kira Admin — Operator access only") carries the same full auth kit (magic link, forgot password, eye toggle). Consistent with the user side.
- This is the most trustworthy part of the build. Whoever wired the auth middleware did it properly.

**Opportunity:** None urgent — this is the one area I'd sign off. If anything, borrow this team's discipline for the onboarding routes.

---

## Cross-Path Issues

- A user **cannot** reach admin by any route I tried (link, direct URL, admin-login with user creds). Good.
- Dead ends found: **`/setup` (hard 404)** is the serious one, sitting on the primary new-user CTA. Secondary: submitting "forgot password" **silently redirected me to the homepage with no "check your email" confirmation** — I genuinely couldn't tell if it had sent, which is the same silent-feedback problem as signup.

---

## Other Strategic Feature Suggestions

- **Pin the identity.** Write one sentence — "Kira is a voice thinking-partner that learns your context and remembers it" — and use those exact nouns on landing, signup, dashboard, and both onboarding flows. The five-word drift (guide / thinking partner / executive assistant / brief / framework) is the single biggest reason I'd hesitate: I can't tell what I'm buying.
- **One onboarding.** Merge `/start`, `/discovery`, and the dead `/setup` into a single "Create your first Kira" journey. Three doors, one broken, is worse than one door.
- **Show the memory before I commit.** The whole pitch is "she remembers you." Let me *see* a saved profile/brief after the first exchange — that's the "I want that" moment for an operator.
- **Settings for a real business.** Today it's just Profile + Password. If I'm running an operation I'd expect Notifications, a way to delete my account/data (you promise privacy — prove it with a delete button), and eventually company/team fields.
- **Fix the trust tells:** founder name spelling, the 2025-vs-2026 copyright, and add the terms/privacy acknowledgement at signup.

---

## Standards Check

- ✅ **Tab title / favicon** — tab reads "Kira — Your Friendly Guide Through Anything"; `/favicon.ico` returns 200. Not "Create Next App."
- ✅ **Auth-page pattern** — login has forgot-password, password eye-toggle, AND magic-link; reset page loads and accepts a submit.
- ✅ **Dual-portal** — user flow reaches a real authenticated home (`/dashboard`) distinct from `/admin`; not a facade.
- ✅ **Explanatory header** — every page/panel I saw opens with what-it-is / what-to-do (landing, dashboard, discovery, settings, start).
- ✅ **Voice agent reachable** — core to the product, ≤3 clicks (dashboard → Start discovery → live widget); server session confirmed.
- ✅ **Responsive** — no horizontal scroll at 375px; landing + dashboard render intentionally at desktop; nav collapses to a usable hamburger on mobile. (Couldn't re-confirm 1440 after a mid-session browser crash, but earlier desktop captures were clean.)
- ❌ **Authed chrome consistency** — dashboard/settings have the persistent left nav + Settings + Sign out, but **`/discovery` drops the navbar entirely.** "Persistent on every logged-in page" is violated.
- ❌ **Settings completeness** — only Profile + Password. No Notifications, no Account section (no delete-account / sign-out-everywhere).
- ❌ **Zero dead ends** — **`/setup` is a hard 404 on the primary new-user CTA**; forgot-password submit gives no confirmation (silent redirect to homepage); signup success is silent with no redirect.

---

## Scope note

Time: ~50 min. **Covered:** landing (desktop + mobile), signup (real account, auto-confirm), login, dashboard, `/discovery` voice surface, `/start` Personal/Business journey voice surface, `/setup` (404), settings, forgot-password, and the full admin cross-path matrix (non-admin→admin, admin-login rejection, logged-out redirects). **Blocked / not covered:** completing an actual spoken voice conversation (no microphone in the headless environment — I verified the widgets mount and the server session starts, but not the conversation itself); reaching a live, named, persistent "Kira" chat (gated behind the broken `/setup` and the voice calls); the admin panel interior (only probed the gate, as instructed); a clean 1440px re-verification after a browser crash reset my viewport mid-session.

Honest bottom line: the storefront is charming and the auth is genuinely well built, but the moment I tried to actually *make my Kira* the floor gave way — a 404 on the main button, a silent signup, and five names for the same thing. I wouldn't hand over my operation yet. Fix the onboarding and pin the identity and I'd happily come back for a second look.

Anneke
