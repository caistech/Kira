# Orchestrator — Connor's exploration report

Hi Dennis,

**Persona:** Curious Connor (explorer, edge-case finder, route-guesser)
**URL:** https://orchestrator-corporate-ai-solutions.vercel.app
**Goal:** Work out what this is, whether I can get in, and whether anything is exposed that shouldn't be.
**Duration:** ~40 minutes equivalent
**Credential:** one operator secret, read at runtime from disk. Never pasted here.

I poked at this the way I poke at everything — guessed routes, tampered with query params, tried a wrong secret, an empty one, back/forward, refresh, a fake cookie, and an XSS payload. Here's what I found, section by section.

---

## 1. Landing page (`/`)

- Clean and honest. One heading ("Orchestrator"), one paragraph explaining it decides "what should happen across the business and who must approve it," and a single link: **"Open the review queue →"**. That's the whole page. For an internal tool that restraint is fine — it tells me exactly what this is without marketing fluff.
- Tab title is real: *"Orchestrator — what should happen, and who must approve it"* — not "Create Next App". Meta description is set too. Good.
- **Surprise:** there's **no favicon** — `/favicon.ico` returns 404 and the page declares no icon `<link>`. Minor, but it's the default-feather situation the checklist calls out.
- The landing is fully public (200, no gate), which is correct — nothing sensitive on it.
- **Opportunity:** the landing is a dead-end-of-one — the only forward action is the queue link, which then bounces me to a login I can't pass without the secret. A one-line "operators only" hint on the landing would set expectations before the wall.

## 2. The gate (`/queue` → `/login`)

- `/queue` 307-redirects to `/login?next=%2Fqueue`. The login page is well-written: *"The review queue shows real client names, overdue amounts and drafted messages, so it is not public."* It states **why** it's gated, which is more than most gates do.
- The field is a proper `type="password"`, `autocomplete="current-password"`, `required`. Native HTML `<form method="post" action="/api/login">` with a hidden `next` field.
- **Wrong secret / empty secret:** both rejected at the API — 303 back to `/login?e=1`, **no cookie set**. The `?e=1` state renders a clear "That secret was not accepted." message. (I couldn't get the inline error to render on a headless form-submit — no `/api/login` request fired from the automated click — but the API behaviour and the `?e=1` message are both correct, so a real human clicking Continue will see it.)
- **Auth bypass attempts all failed (good):** a garbage cookie value, an empty cookie, and a *truncated* copy of the real token all 307 straight back to login. Only the exact secret works.
- **§2 auth-pattern gaps:** no forgot-password, no magic-link, no password-visibility toggle. For a single shared-secret internal tool that's a defensible design, but it's worth naming — there's no self-serve recovery if the secret is lost, and no toggle to check what you typed.
- **Opportunity:** rate-limiting. I could hammer `/api/login` with guesses and nothing pushed back (no lockout, no delay, no CAPTCHA on repeated failures). For a 64-char secret that's low-risk, but a simple per-IP throttle on failed attempts would close the brute-force door entirely.

## 3. Behind the gate — the review queue

Once authenticated, the queue is exactly what the copy promised: three held items, each a card showing the flow number, the delegation reason ("held because reaches a customer and commits us"), the recipient, and the **drafted message verbatim** with amounts and client names (Northline Group $18,750 / 67 days overdue, Marla Whitfield, Tamworth Rural Supplies). Each has **"Approve and send"** (green) and **"Discard"**.

- **I did NOT click either button on any item** — you told me approving fires real outbound email and discarding is also a state change. I looked, described, and left them alone.
- The recipients in the current queue are all `@example.invalid` — placeholder/test addresses that can't deliver. So this looks like seeded demo data, not live customer sends. Good call for a shared demo URL.
- Consequence clarity (§9) is **present**: the panel header spells out "Approving puts it in the outbox — it is sent by the next drain, and recorded before it is attempted." So the operator knows what the green button does before pressing it. What I could *not* verify (deliberately, without clicking) is whether there's a **second confirm step** on the click itself — "Approve and send" fires straight from a single button in the markup, and for an irreversible customer-facing send I'd want a confirm dialog naming the recipient, not a one-click primary button. Flagging as "verify by design," not asserting a bug.
- Mechanism: Approve/Discard are Next.js **server actions** (POST to `/queue` with a hidden `taskId` and an action id), gated by the same session cookie. So they can't be driven by an unauthenticated caller — that's the right shape.
- **§4 authenticated-chrome — FAIL:** the queue page has **no nav, no header, no `/settings`, no Sign Out, zero links**. It's a bare list. There is no way to log out from the UI, and `/api/logout` returns 404. The only way a session ends is the 12-hour cookie expiry. On a shared or borrowed machine, an operator can't end their own session.

## 4. Public routes I went looking for

Guessed a pile of routes. Results:

- `/admin`, `/outbox`, `/flows`, `/sweep`, `/settings`, and every `/api/*` I guessed (`/api/queue`, `/api/approve`, `/api/send`, `/api/drain`, `/api/cron`, `/api/logout`, `/api/health`) → **404**. Nothing leaks through a guessable REST endpoint; the real actions are server-actions, not addressable GETs.
- `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/.well-known/agent.json` → 404 (fine for a private tool — it *shouldn't* be agent-discoverable or indexed).
- Gated pages carry `X-Robots-Tag: noindex` — good, the queue won't show up in search.
- **`/unsubscribe` → 200 (public).** With no/invalid token it shows *"That link isn't valid — it may have been altered in transit. Reply to any message from Orchestrator and we'll take you off the list by hand."* That's a graceful degrade with a human fallback — exactly right for an unsubscribe surface, and it doesn't leak whether any given token/email exists.
- **Opportunity:** the unsubscribe page is the one public surface that will be seen by *recipients* (not operators), yet it carries no sender identity / entity / contact beyond "reply to a message." If real commercial email goes out from here, that page (and the emails) need the sender's legal entity + ABN + a real reply path to sit right with the Spam Act.

## 5. Security-flavoured findings (the things I'd want you to see)

**a) Open redirect on `/api/login`.** The `next` value is honoured verbatim on a *successful* login. I sent `next=https://evil.example.com/pwn` and got `Location: https://evil.example.com/pwn`; `next=//evil.example.com` also worked (protocol-relative). So a crafted link like `/login?next=https://attacker.site` will, the moment the operator authenticates, bounce them off to an attacker-controlled page. It only fires on the correct secret (wrong secret redirects back to `/login`), which limits it, but it's still a real phishing pivot and trivial to fix: allow only same-origin, path-relative `next` values (must start with a single `/`, reject `//` and absolute URLs).

**b) The session cookie IS the secret, verbatim — and it never rotates.** The `orch_operator` cookie value is literally the operator secret string (not a hash, not a per-session token). Two logins produce the identical value. It's set `Secure; HttpOnly; SameSite=lax` with a 12h expiry, which are all good flags — but the consequences of the design are: the cookie is *exactly as sensitive as the secret* (anywhere it's stored or logged is a secret leak), there's no per-session identity, and **there is no revocation short of changing the global secret for everyone**. If that cookie ever escapes (a server access log that records cookies, a shared machine, a support screen-share), the attacker has the reusable master secret, not a session you can kill. I'd swap to a signed, rotating session token derived from the secret rather than the secret itself.

**c) Thin security headers.** Only `Strict-Transport-Security` is present. Missing: `Content-Security-Policy`, `X-Frame-Options` / `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. On a page that self-describes as showing real client names, overdue amounts and drafted messages, the absence of frame-ancestors/X-Frame-Options means the authenticated queue can be framed (clickjacking) — an operator tricked into clicking a framed "Approve and send" is the worst case. `SameSite=lax` on the cookie blunts cross-site POST, but the headers are cheap and should be there.

**d) No reflected XSS (good).** I threw `next="><script>alert(1)</script>` and `INJECTMARKER"><b>` at the login page. React HTML-escapes it into the hidden input (`value="&quot;&gt;&lt;script&gt;..."`) — no execution. So `next` is safe to *display*; it's only unsafe as a *redirect target* (finding a). `GET /api/login` correctly returns 405.

## 6. Connor behaviours (back/forward/refresh/weird input)

- **Refresh mid-view:** queue survives a reload cleanly (server-rendered), no lost state, no double-submit prompt.
- **Back button** from `/queue` lands on `/` as expected; forward re-enters the queue while the session holds. No broken history states.
- **Weird inputs:** empty and whitespace secrets are blocked by the `required` attribute client-side and rejected server-side; long/emoji values just fail auth like any wrong secret. Nothing crashed or 500'd.
- **Responsive (§1) — passes:** at 375px there's no horizontal scroll (`scrollWidth == innerWidth`), body text is 16px, all six action buttons measure ~44px tall, and the queue reflows to clean stacked cards. At 1280px it's a centred single column. No fork, no overflow.

---

## Other Strategic Feature Suggestions

- **A real session model.** Sign-out control in the chrome + a `/api/logout` that clears the cookie, and a rotating signed token instead of the raw secret. This one change fixes findings 5b and the §4 sign-out gap together.
- **A confirm step on "Approve and send"** that names the recipient and the amount ("Send to ap@example.invalid — INV-0918, $18,750?"). For an action that commits you to a customer, a single green button is a slip away from an unintended send. Same for Discard (it's a state change you can't undo either).
- **An audit trail / "sent" view.** The queue shows what's *held*, but there's no visible record of what's already been approved and drained. Operators reviewing money-facing sends will want to see "what did I approve, and did it actually go?"
- **Rate-limit + lockout on `/api/login`.** Cheap insurance against secret-guessing, and it costs almost nothing.
- **Sender identity on the unsubscribe/email surfaces.** The one page recipients see needs the legal entity, ABN and a real reply path if commercial mail is going out.

---

## Standards Check

- **§1 Responsive** — ✅ Pass. 375px: no h-scroll, 16px body, ~44px buttons, stacked cards; 1280px clean centred column.
- **§2 Auth-page pattern** — ❌ Fail. No forgot-password, no magic-link, no password-visibility toggle (single shared-secret gate; defensible but flagged).
- **§4 Authed chrome + Settings + Sign Out** — ❌ Fail. `/queue` has no nav, no `/settings`, no Sign Out; `/api/logout` is 404 — no way to end a session but 12h expiry.
- **§5 Explanatory header** — ✅ Pass. Landing, login and queue each open with a plain what/why paragraph; the "held because…" reasons are on every card.
- **§6 Voice agent** — — n/a. Internal operator approval tool; no nuanced-input surface that calls for a voice clarifier. No voice surface present.
- **§7 Scaffold metadata** — 🟡 Partial. Tab title + description are real (pass), but `/favicon.ico` 404s and no icon is declared (default-feather situation).
- **§8 Team admin** — — n/a. Legitimately single-operator (one shared secret, no user accounts); no team layer expected.
- **§9 Codicils (consequence clarity / no dead ends)** — 🟡 Partial. Consequence of "Approve and send" is stated in the panel header (good), but the fire-off is a single un-confirmed click; queue is a chrome-less dead-end with no onward navigation or sign-out.

**Tally:** 2 ✅ · 2 ❌ · 2 🟡 · 3 —

---

## Scope note

Everything here came from the live URL and the one operator secret I was handed. I did not read any of the product's source, docs, config or memory. I did **not** click "Approve and send" or "Discard" on any queue item, and did not trigger any outbound action — the queue's held items and the drain were left untouched. The secret and the session cookie (which turn out to be the same string) are deliberately kept out of this report. Security observations are black-box, from HTTP responses and rendered behaviour only.

Thanks,
Connor
