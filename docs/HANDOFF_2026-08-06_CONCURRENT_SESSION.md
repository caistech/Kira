# Handoff — 2026-08-06, second session in this repo

**From:** the session that shipped and verified PR #64 (Shah's two blockers).
**To:** the session currently editing `app/my-genome/page.tsx`, `app/plan/page.tsx`,
`lib/privacy.ts`, `lib/kira/prompts.ts`, `lib/genome/render.ts` and their tests.
**Why this file exists:** we were both in `C:\Users\denni\PycharmProjects\kira` at the same time,
on `main`, with one working tree between us. Your run even picked up my preview by accident — your
own harness note records the browser *"once restored a stale tab pointing at a
`fix-shah-auth-session` preview deployment."* Rather than edit around each other, this is the scope
of everything still open, with ownership marked, so you can fold what you want into your branch and
merge once.

**I have committed nothing.** Every dirty file in the tree is yours.

---

## 0. Read this first if you are touching how work is held, released or reported

**`cais-shared-services/DELEGATION_STANDARD.md`** was written today (2026-08-06, operator-directed)
and is the canonical agreement covering how work is captured, ordered, **held, released** and
reported — across Kira *and* the orchestrator. Dennis asked specifically that you have it to review
and fold into whatever you are contemplating now.

The parts most likely to touch live-bug work:

- **Do, approve and release are three decisions, not one.** A single `approved` flag cannot express
  "raise it, I've read it, don't send it until Friday" — which is the ordinary case, not the edge.
- **A hold must acquire a release condition or a review date, enforced in the tool signature.** Not
  the prompt. The reasoning is `record_refusal`: it sits in the prompt with an explicit instruction
  and is often simply not called. Anything you fix today by adding prompt text will fail the same way.
- **Captured ≠ confirmed.** A term we stated and the counterparty has not answered must not be
  recorded as agreed.
- **Every distilled rule names its enforcement point**, or is marked as judgement — so the standard
  reports its own coverage.

§0 of that document is the extractable block for the agent prompt. **Extract it, do not retype it** —
the tool list and prompt are already single-sourced with parity tests for exactly this reason.

---

## 1. Ownership — do not edit these, they are mid-flight in the other session

`app/my-genome/page.tsx` · `app/plan/page.tsx` · `lib/privacy.ts` · `lib/kira/prompts.ts` ·
`lib/genome/render.ts` · `lib/genome/render.test.ts` · `lib/kira/prompt-completeness.test.ts`

That work covers, and this document therefore does **not** re-scope:

- the confidentiality contradiction (`confidentialitySection` + `WHO_CAN_SEE_IT_SPOKEN`, with
  `lib/kira/confidentiality.test.ts` pinning page, policy and spoken answer together)
- the `"You said this on 3 August"` attribution on an entry the owner never said
- the third-person "Other things she has noted" list and its duplicates
- American spelling in her output

---

## 2. Already done — do not redo

**PR #64 is merged (`8923bd6`) and live in production (`8b7278b`, READY).** Both fixes were walked
end to end on production on 2026-08-06 as a genuinely new owner (signed up through the real
endpoint, confirmed, walked, account deleted afterwards):

```
GET /dashboard                  200   names the ABN requirement: true
GET /genome                     200
GET /setup/business             200
GET /admin (stale token)        307 -> /admin/login?error=not_admin
redirect carries auth cookie    YES
refresh token rotated           true
preserved cookie -> /dashboard  200
```

Your own report corroborates it independently: *"I opened a second tab: still signed in… Whatever
was throwing people out before appears to be fixed."*

One correction worth carrying: the PR body originally said the old refresh token is retired by the
clock. It is not — replaying it 35 seconds later, well past the 10-second reuse interval, is still
accepted. It dies the moment a **successor** is used, which is why this presented as a *multi-tab*
symptom and why a single tab looked fine. The PR body has been corrected; if that mechanism ends up
in `BUILD_REGISTER.md`, use the corrected wording.

---

## 3. Scope of remaining changes

Severity: **1** blocks a client or a demo · **2** blocks the next build · **3** real but survivable.

### A. `/talk` goes nowhere for a new owner — severity 1

**The finding.** Every "Talk to Kira" control — the floating FAB, the My Genome empty state, the
Knowledge link — points at `/talk`. On a brand-new account `/talk` silently returns to
`/dashboard`. Verified three ways in the walkthrough. On an established account it opens correctly.

**The mechanism, which is not what the symptom suggests.** `app/talk/page.tsx:34–43` reads
`kira_agents` for the signed-in owner; with no row, line 69 does `redirect('/dashboard')`. So this
is not a routing bug — **a new owner has no agent at all.** Confirmed independently: a fresh signup
walked through `/dashboard` and `/genome` had `kira_agents` = 0 rows.

Agents are only ever created by `POST /api/kira/create`, called from
`app/setup/draft/[draftId]/page.tsx:208` once a draft is approved. Nothing else provisions one.
`ensureUserAgent` — the canonical one-agent-per-user orchestration in
`@caistech/elevenlabs-convai` ≥0.7.1, which exists precisely so this loop is not hand-rolled — is
**called nowhere in this repo**.

**Also stale:** the redirect's own justification (`app/talk/page.tsx:59–68`) says it sends him to a
dashboard that has *"a 'You haven't met Kira yet' card that offers the conversation."*
`app/dashboard/page.tsx:253` records that card being **deliberately removed**. The fallback now
lands on a page that no longer contains the thing the fallback was pointing at.

**Scope.** Two parts; the second is not optional even if the first is deferred.

1. **Provision on the new-owner path.** Call `ensureUserAgent({ supabase, apiKey, userId, baseUrl,
   toolSecret, agent })` — it is idempotent and safe on every page load — at whichever moment this
   product decides an owner is entitled to a Kira. Note `ensureUserAgent` scopes the agent name per
   user internally (≥0.7.2), so do not pass one constant name; that is the BucketLyst failure where
   the second buyer silently got no agent.
2. **Never render a control that goes nowhere.** While no agent exists, either point the FAB at
   what does work for that owner, or disable it with the reason on screen. The one behaviour that
   must not survive is a button reloading the page it was pressed on.

**Decision for Dennis, not for the session:** whether a new owner gets a Kira at signup, after the
eleven questions, or only on payment. That is a cost and a product question — every provisioned
agent is a live ElevenLabs agent. Do not guess it in code.

**Verify:** create an account with no agent, load `/talk` → it must not silently return to
`/dashboard`; assert the FAB's target and its disabled/enabled state in the same run.

### B. The voice failure screen offers no way forward — severity 2

**The finding.** `/discovery` with no microphone renders **"Connection problem"** plus `[Mute]` and
`[End]` — two controls that assume a call is happening. No "check your microphone", no "type to her
instead". As the report puts it: *"A lot of men my age are on a desktop tower with no microphone at
all and don't know it. They will land exactly here."*

**Scope.** Offer the typing box in the same panel — the product already has it. This is the
`textFallback` path in `@caistech/elevenlabs-convai`; **check the installed version before
building anything local.** The package's `shouldUseTextFallback` only fired on a connection *error*
until **v0.12.0**, which added a stall timeout (`fallbackAfterMs`, default 8s). On an older version
the box appears somewhere between 0% and 100% of the time on identical code — measured across six
sweeps on Kira production. If this repo is below 0.12.0, the fix is the bump, not a local
workaround.

**Verify:** load the panel in a context with no microphone and assert the typing box appears
without a connection error first. Run it more than once — this defect passes about a third of
single runs.

### C. Mobile drawer is not full-height — severity 2

**The finding.** At 375px the nav drawer stops about two-thirds down; "Settings", "Sign out" and
the email render *on top of* the page content beneath. "Sign out" lands across "Document the core
systems", both unreadable. First thing you see when you open the menu on a phone.

**Scope.** `components/UserShell.tsx` — the drawer panel needs full viewport height and an opaque
background over a scrim. `h-screen` is the wrong unit on mobile browsers (the address bar makes
`100vh` taller than the visible area); use `h-dvh` with an `h-screen` fallback.

**Verify:** screenshot at 375×812 with the drawer open; assert no page text is painted under the
drawer's footer block.

### D. Floating controls sit on the content — severity 2

**The finding.** Independently observed by both sessions. At **375px** the SayFix "Report a
problem" pill and the orange mic cover the end of the Week 1 card's sentence. At **1440px** the
"Talk to Kira" pill covers the right half of the **Start discovery** button — a control covering a
control.

**Scope.** `app/layout.tsx` mounts both; `components/TalkFab.tsx` is ours, the pill is
`@caistech/sayfix-embed`. Two separable pieces:

- **Ours:** give the FAB a safe-area offset and keep it clear of the primary CTA at `lg:`.
- **The package:** SayFix ≥0.7.0 added content-occlusion sampling (`collectContentConflicts`) for
  exactly this. Check the installed version before styling around it. Host opt-out per element is
  `data-sayfix-avoid="false"`. Dennis has already ruled the content-blindness a defect rather than
  a limitation, so if the version is current and it still lands on the card, that is a package
  report, not a local hack.

**Verify:** at 375 and 1440, assert no floating element's bounding box intersects a text node or a
button in the primary column.

### E. Signup is unrecoverable if the email never arrives — severity 2

**The finding.** The confirm-email panel offers only **"Use a different email"**. Someone whose
confirmation never lands can only create a second orphaned account. Reached independently by both
sessions.

**Scope.** `@caistech/corporate-components` **v0.8.0** added an optional `onResend` to
`ConfirmEmailPanel` for precisely this dead end — signup resends via `signInWithOtp` (one control
covers both "my link expired" and "I can't get in", which is the pair a stuck person cannot
distinguish about themselves). Bump if needed, pass the prop. It is purely additive.

**Verify:** sign up, land on the panel, assert a resend control exists and that pressing it issues
a request.

### F. Four tab titles fall back to the marketing title — severity 3

**The finding.** `/my-genome`, `/talk`, `/discovery` and `/business-valuation` all render
*"Kira — your part-time general manager"*. *"With six tabs open I can't tell them apart."*

**Scope.** None of those four files exports `metadata` (confirmed). Add one each, matching the
`Overview · Kira` pattern already used on `/dashboard`. `/my-genome` belongs to the other session —
coordinate or leave it to them.

**Verify:** `curl` each route and assert the `<title>` contains the page name.

### G. The valuation page does not know who it is talking to — severity 3

**The finding.** It greets *"You are signed in, **dennis+ray**"* — the email prefix used as a name,
when Settings has a first-name field — and then asks *"What should we call you?"*. The same page
tells a signed-in man *"Nothing to sign up for"* (`app/business-valuation/page.tsx:514`).

**Scope.** Read the profile name when there is one and fall back to asking, not to the email prefix;
make the "nothing to sign up for" line conditional on there being no session. The same
email-prefix-as-name appears in the sign-off field — fix the class, not the instance.

**Verify:** load the page signed in with a first name set, and again signed out; assert the greeting
and the sign-up line differ appropriately.

### H. The dashboard opens with what she cannot do — severity 3

**The finding.** No explanatory header (the one page missing one), and for a new owner the first
thing on the page is the limitation card. *"The limitation is honestly written and I'd want to know
eventually, but it shouldn't be the first sentence of the product."*

**Scope.** Add the explanatory header per the house rule; keep the amber card — it tested well and
took *"thirty seconds to accept"* — but not as the opening line.

### I. The workspace name reads "Kira" when no business name is set — severity 3

*"The sidebar says Kira, the page says Kira, and the assistant is called Kira. I couldn't tell what
I was looking at."* Fall back to the owner's name or "Your business", never to the assistant's name.

---

## 4. Register rows this leaves open

`docs/BUILD_REGISTER.md` already carries the 2026-08-06 entry for Shah's two bugs. Two additions
belong with whoever commits next:

1. **Both are now observed working in production**, not merely shipped — the register keeps
   "shipped" and "working" as separate columns on purpose, and this is the second column.
2. **A–I above are not filed anywhere yet.** A is severity 1 and is the same new-owner path that
   has now produced three separate defects; it deserves a row of its own rather than a bullet.

---

## 5.5 THE ACCEPTANCE QUESTION — added 2026-08-07, operator-set

> **When the current work is finished: can Kira and the orchestrator complete these five tasks end
> to end — the ones the operator currently does by hand, forgets, or simply never gets to?**

These are not hypothetical. They are the real follow-ups generated by ONE business day (6 August,
the Betta Roads PO) and they are the right acceptance corpus precisely because the correct answer is
already known and dated. Treat this as a **regression fixture**, not an anecdote — the same way
`test-task-loop.mjs` earns its keep by asserting the negatives rather than the happy path.

| # | The task | Verdict today | What blocks it |
|---|---|---|---|
| 1 | **Joe** — get his mobile, agree a 4:30am go/no-go text for Monday, float Tue/Wed as drier | **Partial** | No weather source. No travel-time reasoning (Pinjarra→Breera, 1h45 → leave 5:00 → text by 4:30). **Known-unknown detection**: noticing she does NOT hold Joe's mobile is a different capability from answering a question, and nothing does it. The conditional wait ("if no text by 4:30, tell me") has no mechanism |
| 2 | **Paul** — *"next Friday"* written on a Thursday is ambiguous; ask whether it's the 7th or the 14th | **Closest to achievable** | Needs only inbound email she can already read, plus today's date. Narrow, mechanical, high yield. **Start here** — it is the smallest complete instance of the whole thesis |
| 3 | **Invoice** — $3,500 + GST to Betta Roads Pty Ltd atf Bright Family Trust, ref PO 0001 / QU-0053 | **Nearest to end-to-end already** | The orchestrator has Xero, and rules 45/46 already chase at 30/60/90 days once it exists. Missing: `ingest` for the photographed PO, a term store holding the $550 basis, and **approve ≠ release** (raise it now, send when Paul confirms) |
| 4 | **Heath** — a note before Monday; he is the account, Simon only signed | **Only if capture works** | The PO says Breera/Simon. **Nothing anywhere says HAS Earthworks/Heath** — it exists solely in a conversation. This task is the honest test of whether the capture layer works, because the right behaviour depends on a fact no document contains |
| 5 | **Shah** — tell him his two blockers are fixed and live | **The purest test** | No PO, no invoice, no calendar entry — **no artifact demands it**, which is exactly why a human forgets it. Needs a link from bug report → fix → deploy state → the person who reported it |

### What the five collectively demand

Eight things, and both repos are missing the same ones:

1. **`ingest`** — three of five begin with an artifact (a photo, a thread, a call) that has no door.
2. **The deal/matter object** — four only make sense inside "the Betta Roads deal"; #5 inside "the Shah report".
3. **Terms with a source and a confirmed state** — the $550 basis, pay-when-settled, Heath-not-Simon.
4. **Approve separated from release** (#3).
5. **Event-waits** — *if no text by 4:30*, *when Breera settles*, *when the fix is live*.
6. **Known-unknown detection** (#1) — noticing an absence.
7. **Order** — which of the five is today and which is next week.
8. **One batched return** — five tasks, ONE message. Five notifications is a worse product than the notebook.

### What must NOT be automated

All five are outbound to real people, so all five sit at `approve_before_send`. The judgement calls —
whether to concede the $1,500, whether Monday is on, what tone Heath gets — stay with the operator.
The machine's job is that none of them is **forgotten**, not that any of them is **decided**.

### How to score it

Given the 6 August material as input, does the system independently produce these five, with the
right dates, hold them correctly, and return them as one message? Anything less than five is a
number, not a failure — record which, and why.

---

## 5. Merging

Fold whatever you take into your branch and merge once. Anything you leave, say so in the register
rather than dropping it — an item that is neither done nor recorded is the failure mode this
register exists to stop.

If you would rather not carry A–I, say which and I will take them on a branch off `main` **after**
you have merged, so the tree is only ever dirty in one session at a time. That sequencing is the
actual lesson here: two sessions, one working tree, and a checkout in one silently reverts the
other.
