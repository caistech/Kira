# Mobile Marcus — Kira walkthrough (phone, 375×812)

**Tester:** Mobile Marcus (only ever on his phone, fat thumbs, pinch-zooms small text, hates horizontal scroll and buttons that overlap)
**URL:** https://kira-rho.vercel.app
**Date:** 2026-07-20
**Viewport:** 375×812 (iPhone-ish), throughout
**Verdict up front:** I *could* get all the way from the landing page to a signed-up account and a Kira voice screen on my phone — so it's usable end-to-end. But it's rough. There's one screen that scrolls sideways, the text on some bits is too small, the little eye icon on the password box is thumb-proof, and worst of all that black "Report a problem" button plants itself right on top of the buttons I'm actually trying to press on nearly every screen. I mis-tapped because of it and got thrown somewhere I didn't ask for.

---

## Screen 1 — Landing page (/)

- Loads fast, looks nice. Big "Meet Kira / Then meet YOUR Kira" headline, colourful, I get what it is. No sideways scroll here — good.
- Tab says "Kira — Your Friendly Guide Through Anything". Not "Create Next App". Good, someone cared.
- The top bar on my phone is just the green K logo + "Kira" and a "Try Kira Free" button. That's it. No menu, no hamburger. When I went looking under the hood, the "Admin" and "Start as User" links are switched off on mobile, and "Sign in" is parked off the right edge somewhere I can't see or reach. So if I'm a returning user wanting to log in, the header gives me nothing — I have to scroll all the way down or hunt for a CTA. The signup buttons in the body work fine, so I can still start, but "where do I sign in?" is a real head-scratch.
- Some of the smaller paragraphs (the "Other AI assistants vs Your personal Kira" bullet lists, the FAQ) are 14px. I had to lean in. Anything under 16px and I'm squinting.
- **Opportunity:** Give the landing header a proper mobile menu (hamburger → Sign in / Pricing / How it works / About), and bump the 14px body text to 16px so I'm not pinch-zooming bullet lists.

## Screen 2 — Signup (/signup)

- Clean. "Create your Kira", three full-width boxes (First name, Email, Password), big teal "Create account" button. No sideways scroll. Boxes are a comfy 50px tall, 16px text — my thumbs are happy on the fields.
- The one gripe: the "show password" eye icon is a tiny 20×20 target tucked in the password box. My thumb is nowhere near that precise — I'd tap the box instead half the time. Make it a proper 44px tap area.
- I typed a fresh email, hit Create account, and boom — it logged me straight in and dropped me into the app. No email-confirmation hoop. On a phone that's exactly what I want.
- **Opportunity:** Fatten the eye toggle to a 44px tap target. Otherwise this page is doing its job.

## Screen 3 — Dashboard / authenticated home (/dashboard)

- This one has a real hamburger ("Open menu") top-right, and it opens a proper slide-in drawer with My Kiras / New Kira / Settings / Sign out and my email at the bottom. That's the mobile pattern I want — good.
- BUT: at the bottom of that open drawer, the "Settings" and "Sign out" items are half-hidden behind the floating black "Report a problem — get it SayFixed" pill. "Se…ttings" is literally sitting under it. When I reached for Sign out earlier, I mis-fired and got yanked over to a "/discovery" page I never asked for. That's the fat-thumb nightmare — the app's own report button is squatting on top of my menu.
- **Opportunity:** The "Report a problem" button must not overlap menu items or buttons. Either move it out of the way when the drawer is open, or give the drawer a solid background and push its items clear of it.

## Screen 4 — Discovery (/discovery)

- "Let's get to know you" — nice intro, a "Kira Discovery / Start a conversation" card, "Stage 1 of 6", "Done for now".
- **This page scrolls sideways.** The page is 416px wide on my 375px screen — ~41px hangs off the right. When I pushed on it I found the culprit: the ElevenLabs voice widget panel (`convai-panel`) is sitting shoved 41px to the right, poking off the edge. That's exactly the horizontal scroll I can't stand, and it's the *voice* bit that's doing it — the whole point of this product.
- And yes, the "Report a problem" pill is overlapping the bottom of the discovery card here too.
- **Opportunity:** Pin the voice widget inside the viewport (right: 0, max-width: 100vw) so the page stops sliding sideways. This one's the worst offender for me.

## Screen 5 — Journey chooser (/start)

- Dark, two big cards: "Personal Journey" and "Business Journey", each with "Start talking". Looks good, no sideways scroll here.
- Same overlap problem: the black report pill is sitting right on top of the "Business Journey" card's icon and title. It obscures the card I might want to pick.
- **Opportunity:** Same fix — keep that floating button off the cards.

## Screen 6 — Voice conversation setup (Personal → "Let's talk about work stuff")

- "How it works" steps, and a voice widget at the bottom ("Need help? / Start a call"), plus a "Review Framework (talk to Kira first)" button that's greyed out until I talk.
- At the bottom of this screen it's a total pile-up: the voice "Start a call" widget, the "Review Framework" button, AND the report pill are all stacked on top of each other in the same corner. I genuinely can't tell what my thumb is going to hit down there.
- I tapped "Start a call" → a "Terms and conditions" consent box popped up (recording/storage consent). The box itself fits the phone fine — but the report pill overlaps its "Cancel" and "Agree" buttons at the bottom. Again.
- I tapped "Agree" and instead of a voice call starting, I got thrown to an **admin login page** ("Kira Admin / Operator access only") with a hidden `?error=not_admin` in the URL. As a normal person I have no idea why agreeing to talk to Kira just tried to shove me into an operator login. Nothing on that page even tells me what went wrong — it just looks like a random login screen. (Note: I'm on a headless test phone with no microphone, so the actual call couldn't run — but the bounce to admin is not a mic thing, it's a wrong turn.)
- **Opportunity:** Two things — (1) the voice widget + Review button + report pill need to stop dogpiling in the bottom corner; (2) a user action (agreeing to voice terms) should never route me toward `/admin/login`, and if a real error happens, *show me the error*, don't drop me on a silent login page.

## Screen 7 — Admin login (/admin/login) — quick glance

- Renders clean on the phone: "Kira Admin / Operator access only", full-width Email + Password, Sign in, magic-link, Forgot password. No sideways scroll. Proper mobile auth page. Tab title "Admin sign in · Kira". Nice.
- The only issue is the one above: when I got bounced here with `?error=not_admin`, there was **no visible message** telling me why. Silent.

## Login page (/login) — seen while signing out

- Worth a note because it's the best-built screen: "Welcome back", full-width Email + Password with a visibility toggle, Sign in, "Email me a magic link instead", Forgot password, Create an account. All full-width, all reachable, no sideways scroll. This is how the rest should feel.

---

## Standards Check (mobile)

| Rubric item | Result | Evidence |
|---|---|---|
| No horizontal scroll at 375px | ❌ | /discovery scrollWidth 416 vs 375 viewport (~41px off-screen). Culprit: `convai-panel` voice widget at left=41→right=416. Landing/signup/login/admin-login are clean. |
| Touch targets ≥44px, no collisions | ❌ | Password "show" eye = 20×20px. Floating "Report a problem" pill overlaps primary actions on drawer (Settings/Sign out), /start (Business Journey card), voice conversation (Start a call + Review Framework), and the Terms modal (Cancel/Agree). I mis-tapped from the drawer into /discovery. |
| Body text ≥16px | ❌ | Landing comparison-list + FAQ paragraphs at 14px (4 of first 12 `<p>` under 16px). Form inputs are 16px (fine). |
| Nav collapses to usable mobile pattern | 🟡 partial | Dashboard has a real hamburger drawer ✅. Landing header has NO menu — Admin/Start-as-User are display:none, Sign in is off-screen (x=703), no hamburger to reveal them. |
| Forms full-width, inputs usable, submit reachable | ✅ | Signup/login/admin-login inputs 279px wide × 50px, submit 48px full-width. Good. |
| Modals fit the phone | 🟡 | Terms & conditions modal fits the viewport, but the report pill overlaps its Cancel/Agree buttons. |
| Voice surface reachable + usable on mobile | 🟡 | Reachable (widget loads, "Start a call" + consent flow present) but the widget causes the /discovery horizontal scroll, piles up with other controls at the bottom, and the "Agree" action bounced me to /admin/login. Actual call couldn't be verified (no mic on test phone). |
| Tab title = product name | ✅ | "Kira — Your Friendly Guide Through Anything" / per-page titles ("Create account · Kira", "Sign in · Kira", "Admin sign in · Kira"). Never "Create Next App". |

**Top mobile findings by severity**
1. **HIGH — the "Report a problem" floating pill collides with the primary action on almost every screen** (drawer Settings/Sign out, /start cards, voice Start-a-call, Terms Cancel/Agree). It caused a real mis-tap. Systemic, not one page.
2. **HIGH — /discovery scrolls sideways ~41px**, caused by the voice widget poking off the right edge. It's the flagship feature doing it.
3. **MEDIUM — voice consent "Agree" routed me (a normal user) to /admin/login with a silent `?error=not_admin`.** Confusing dead-end; no error shown.
4. **MEDIUM — landing header has no mobile menu / "Sign in" is unreachable from the top** (returning users are stuck).
5. **MEDIUM — password "show" eye is a 20px target** — fat-thumb miss.
6. **LOW — 14px body text** on landing lists/FAQ (pinch-zoom territory).
7. **LOW — recurring 404 in the console ~every 60s** (some background poll failing; not visible to me, but it's noise).

**Is it usable end-to-end on a phone?** Yes — I signed up, got logged straight in, reached the dashboard, picked a journey, and got to the voice screen. So the path exists. But it's rough enough that a normal person would get annoyed: the report button keeps landing on the button I want, one screen slides sideways, and agreeing to talk to Kira threw me at an admin login. Fix the overlap and the discovery overflow first — those two hit every visit.

---

## Scope note

I only used the live site at https://kira-rho.vercel.app on a 375×812 phone viewport — I didn't read any code, docs, or repo. I signed up with a fresh throwaway email (`marcus.test+…@gmail.com`, non-admin), which auto-confirmed and logged me straight in. I couldn't fully test a live voice call because the test phone has no microphone, so "voice usable" is judged on whether the widget renders and the flow is reachable, not on hearing Kira talk. Screenshots for each screen are under `./naive-tester-reports/2026-07-20/screenshots/mobile-marcus/`.

Marcus
