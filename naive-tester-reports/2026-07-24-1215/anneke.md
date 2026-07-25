Hi Dennis,

Platform Feedback — Kira Walkthrough
Persona: Anneke  |  URL: https://kira-rho.vercel.app  |  Goal: set up a new Kira + check both front doors  |  Duration: ~45 min

**COACH PAGE: UNREACHABLE (blocked at voice-only onboarding — no microphone, no text fallback)**

I got further than I expected. I created a real account, confirmed the email, landed in the authenticated app, and drove the "Create your Kira" flow all the way to the Setup Kira onboarding screen. That screen is a *voice-only* conversation — you talk, Kira builds a brief, the "Review Framework" button goes green, and only then can a Kira (and its coach page) be created. On a machine with no working microphone there is no keyboard/text way through. So I could not reach the per-Kira coach/chat page to confirm whether it renders or throws. What I *can* tell you: **every authenticated page I did reach — /dashboard, /start, /settings — rendered cleanly with no client-side exception.** There was no "Application error" anywhere in the flow I could touch.

---

Landing (/)
- Loads fast, real tab title ("Kira — Your Friendly Guide Through Anything"), custom green-K favicon, zero console errors. Good first impression.
- The copy is genuinely strong. The "$150k walk-away / $600k today / $2.5M captured — the $1.9M gap is the knowledge in your head" framing is exactly the pitch that lands with an owner who's spent 25 years being the business. I've watched people realise that in a room; this page says it in three numbers.
- One thing nags me: the page can't decide what Kira *is*. Landing says "friendly guide / thinking partner / life coach." The signup card calls her "your AI executive assistant." The dashboard calls them "personal AI assistants." Three different job titles for the same product. An operator reading closely (me) starts wondering which one I'm actually buying.
- The hero leads hard with *business valuation*, but the headline product name and the whole "Every Kira is different / personal guide" section is about personal coaching. It's two products sharing a front door. That's workable, but the two CTAs ("Value my business" vs "Create a personal Kira") could be clearer about being two doors.
- Opportunity: pick ONE noun for Kira and use it everywhere — "guide," "assistant," or "coach," not all three. Terminology drift is the fastest way to make a polished product feel unfinished.

Business valuation (/business-valuation) — the free, no-signup path
- This is the best no-friction hook on the site: "Nothing to sign up for," a clean 11-question wizard with a progress bar, currency selector, and a live "Ask Kira" voice widget. Smart — you let a skeptical owner feel the value before asking for anything.
- The microcopy is excellent and shows someone who's actually valued businesses wrote it. Q2's "Total sales — everything the business invoices or takes in over a year, before any costs come out. We ask about profit on the next screen" is exactly the turnover-vs-profit confusion I'd have to untangle for a client in person. Nicely pre-empted.
- Two nitpicks. First, the default display currency is **GBP** — odd for a product that lists USD first and reads AU/US. I'd default to the visitor's locale or at least USD. Second, on Q1 ("What industry?") I typed "landsca" for landscaping and got **no autocomplete suggestions at all** — the field just accepted free text and enabled Next. The instruction says "Start typing and pick the closest match," which promises a dropdown that never appeared. Either show matches or drop the "pick a match" language.
- Opportunity: surface the industry list as real suggestions (even 30 sectors) — an owner who can't find their trade in a "smart" field quietly loses trust in the number you're about to show them.

Voice agent (the "Ask Kira" / "Need help?" widget)
- It renders correctly everywhere I looked: a bottom-right "Need help? Start a call" panel with an animated orb, "Powered by ElevenLabs Agents." Clicking it pops a proper **Terms & conditions consent gate** first ("I consent to the recording, storage, and sharing of my communications...") before any call. That consent-before-record step is the right instinct and rare to see done — good.
- With no mic it degrades to a small "An error occurred / Not supported / Close" card. That's an acceptable failure for my headless setup — it didn't crash the page.
- My real concern is on the **Setup Kira onboarding** screen (see below): the ONLY voice control is that same small "Need help? Start a call" support-styled widget in the corner. The page instructs "Kira will start talking — just listen and respond," but nothing auto-starts and there's no big obvious "Begin conversation" button. A first-timer stares at a screen that says she's talking, hears nothing, and doesn't know the tiny "Need help?" bubble in the corner IS the thing to click. That's a labeling/hierarchy mismatch on the single most important step of the funnel.
- Opportunity: give the onboarding its own prominent, center-stage "Start the conversation" launcher, labeled as onboarding — not the generic "Need help?" support bubble.

Signup + email confirmation (/signup)
- Clean: First name, Email, Password with a working show/hide eye toggle, "Create account." Subtitle "Your AI executive assistant that remembers you" (see the naming drift above).
- Submitting sent a real confirmation email and showed a tidy "Confirm your email" screen with Resend / Back to sign in / Use a different email. Good options, no dead end.
- The email arrived and the confirmation link worked — it activated the account and dropped me straight into /dashboard. The whole auth round-trip is solid.
- Minor: no password strength hint or confirm-password field. Not a blocker for a coaching product, but worth a rule.

User login (/login)
- Textbook auth page: email + password, show-password toggle, "Email me a magic link instead," "Forgot password?", "Create an account." This is the pattern done right. Nothing to complain about.

Setup Kira onboarding (/start → Personal Journey) — the critical step
- The journey chooser (Personal vs Business, "Not sure? Pick one — Kira will help you figure it out") is friendly and clear.
- The Personal setup screen is nicely designed (dark theme, Kira avatar, "How it works" 1-2-3-4). But it is **voice-only**. "Review Framework" stays disabled ("talk to Kira first") until a voice conversation produces a brief. No mic → "Not supported" → no framework → no Kira → **no coach page.**
- This is my biggest finding: **the entire core funnel has a single hard dependency on a working microphone, with no text alternative.** A landscaper standing in a noisy yard, someone on a shared office machine, anyone with a flaky headset, or a user who simply prefers to type — all of them hit a wall at the exact moment you're trying to convert them. In my world that's the difference between a signed client and a "I'll come back to it" that never comes.
- Opportunity: add a "Prefer to type?" text-chat fallback for the setup conversation. It also fixes the "degrade, don't fake" problem — right now the honest failure is a terse "Not supported," when it could be "No mic? Type your answers instead."

Authenticated dashboard (/dashboard — "My Kiras")
- Renders cleanly. Left nav (My Kiras / New Kira / Settings / Sign out) with my email at the bottom, an explanatory header, a sensible empty state ("You don't have a Kira yet"), and a "Go deeper (optional) → Start discovery" longer-conversation option. This is a proper authenticated home, distinct from admin. Good.

Settings (/settings)
- Has the right bones: explanatory header, Profile (first/last/email + Save), Password (Update), Account (Delete account — and it says "Permanently delete your account... This cannot be undone," which is the consequence-before-click discipline I want to see).
- Missing a **Notifications** section — the portfolio settings pattern wants Profile / Password / Notifications / Account. Small gap, but it's a gap.

Admin door (/admin/login and /admin)
- Separate, correctly gated. /admin/login is its own "Kira Admin — Operator access only" page with its own auth. Hitting /admin while logged in as my ordinary user bounced me to /admin/login?error=not_admin with a plain-English message: "That account isn't an operator account. If you came here to use Kira, sign in as a user instead." That's exactly right — two doors, cleanly separated, no facade, and the user flow reaches a real user home (/dashboard). Full marks on the dual-portal split.

PubGuard (/pubguard)
- This one genuinely impressed me. Polished dark landing (traffic-light GREEN/AMBER/RED system, "14 Automated Security Tests," four clear personas). I picked "User," entered facebook/react from the example chips, and ran a real scan.
- It *works end to end*: live progress ("0/12 tests," phase-by-phase — GitHub REST, NVD/CVE, Serper news, OSV.dev dependencies), then a real result: **GREEN, "Safe to recommend," Security Score 98/100, 0 critical/high/medium/low, "No CVEs found in NVD database,"** with Summary/Findings/Technical/Sources tabs. For a "free" tool that's a credible, useful output, not a party trick.
- Two nitpicks: the page shows a **doubled header** (the Kira brand bar stacked on top of the PubGuard brand bar), and the browser tab title stays the generic "Kira — Your Friendly Guide Through Anything" on PubGuard pages instead of saying PubGuard. Minor polish.

Console / technical notes
- On /dashboard an Apollo analytics tracker is **blocked by the site's own Content-Security-Policy** ("violates ... script-src") — so that tracking isn't firing. Worth a look if you rely on that data.
- A benign "Multiple GoTrueClient instances detected" Supabase warning appears — not fatal, but worth tidying.
- The only 404s in the network log were my own manual route probes (/chat, /coach, /kira, /today) — those are 404 by design, not product bugs.

Other Strategic Feature Suggestions
- Add a typed fallback for onboarding (this is the one I'd prioritise — it's a conversion cliff, not a nice-to-have).
- Let a valuation-flow visitor save/email their three numbers — right now the free demo has no capture at the end, which wastes a warm lead.
- Unify the product noun (guide/assistant/coach) across landing, signup, and dashboard.
- Default currency to locale, and populate the industry field with real suggestions.
- Give PubGuard its own tab title and a single header.

Standards Check (portfolio non-negotiables)
- ✅ §1 Responsive: Landing at 375px had no horizontal scroll (scrollWidth == clientWidth == 375) and reflowed to a clean single column; valuation and PubGuard reflow too.
- ✅ §2 Auth-page pattern: Login has forgot-password link, password eye toggle, AND magic-link; signup has the eye toggle; real confirmation email round-trip worked.
- ✅ §4 Authed chrome + Settings: Persistent left nav (My Kiras/New Kira/Settings/Sign out) on every authed page; /settings reachable in one click with Profile/Password/Account — but **Notifications section is missing**.
- ✅ §5 Explanatory header: Every surface opened with a what/why line (dashboard, settings, valuation, login all had one; empty state kept it).
- ✅ §6 Voice agent: Renders from the chrome with a consent gate; reachable in ≤3 clicks — but on the onboarding step it's the generic "Need help?" bubble with no text fallback.
- ✅ §7 Scaffold metadata: Real title + custom green-K favicon (not the Next.js feather); note PubGuard pages keep the generic Kira title.
- ✅ §8.5 Dual-portal separation: User flow reaches /dashboard (a real user home distinct from /admin); /admin rejects a non-admin with a clear message. No facade.
- ✅ §9 Codicils: Delete-account states "cannot be undone"; voice call requires recording consent before connecting; next actions are obvious throughout. (No address fields on the paths I walked; industry uses an autocomplete-style field.)

Scope note: I spent ~45 minutes. Covered end to end: landing, business-valuation demo (through Q2), the "Ask Kira" voice widget + consent gate, full signup → email-confirm → authenticated dashboard, /start journey chooser, the Personal Setup Kira onboarding, /settings, /admin/login + the /admin non-admin gate, and a full working PubGuard scan. **Blocked from the per-Kira coach/chat page** because the Setup Kira onboarding is voice-only and this test environment has no microphone or text fallback — so the single most important verification (coach page loads vs. client-side exception) is *unverified*, though nothing else in the reachable authenticated app threw an exception.

Thanks,
Anneke
