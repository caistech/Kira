# Next build — scope for the three open naive-tester findings

**Written 2026-07-28 for a cold session.** Everything here comes from two independent naive-tester
walks of production (`naive-tester-reports/2026-07-28-1940/` — Ray, the 66-year-old exiting owner
who is the ICP, and Anneke, the broker who would refer him). Both reports are on disk with
screenshots; read your finding's section in them before building, because the *wording* of what they
noticed is often the specification.

**The gate is closed.** `PRODUCT_STANDARDS` §0.5 blocks sharing the production URL until a
naive-tester run passes. Four copy findings were fixed the same evening (commit `c0a53ac`); these
three are what remain. When they are done, re-run both personas against production and record the
PASS with `gate-check.mjs record kira naive-tester pass --deployment <live-id>`.

**Ray's verdict, which is the bar:** *would take the free valuation without hesitating, probably
start the beta — but would not yet trust it with 31 years of undocumented knowledge.* Every item
below is a reason for that second clause.

⚠️ **Two of the three descriptions below correct the testers.** They observed accurately and
inferred a cause that turns out to be wrong. Build against the verified cause, not the report.

---

## 1. The valuation forgets you — and it promised not to

**Severity: high. It breaks a promise made on screen, and it silently orphans another page.**

### What happens

`/business-valuation` says, above the first question:

> *"Your answers are kept on this device as you go, so you can stop and come back."*

Answer all eleven questions, refresh, and you are back at question one with nothing kept. `/plan`
then says *"Let's find your number first"*. Ray found it as a broken promise; Anneke found the same
thing from the other end — *"let me think about it overnight"* loses the price.

### Verified cause

`app/business-valuation/page.tsx` parks progress in **`sessionStorage`** (`PROGRESS_KEY`, ~line 230),
and `lib/valuation/share.ts` hands the finished valuation to `/plan` the same way. Both choices are
deliberate and documented in the files: these answers include **turnover and profit**, and
`localStorage` would leave them on a shared machine — a real concern for an owner who has told
nobody he is selling.

So this is not a bug to "fix" by switching storage. It is a **conflict between a privacy decision
and a copy promise**, and the build has to resolve it in one direction.

### The knock-on nobody spotted directly

`/what-she-does` is linked from `/plan` (above the price) and `/advisors`. Ray reported it as
"not linked from anywhere" — wrong, the links are in the served HTML. But `/plan` **dead-ends
without a valuation in sessionStorage**, so for anyone who did not walk the funnel in one sitting
the `/plan` link is unreachable. Two findings, one chain. Fixing persistence fixes both; if you
instead choose option B, `/what-she-does` needs a second entry point.

### Options (pick one deliberately — it is a privacy call, not a technical one)

- **A. Persist properly, keep the privacy posture.** Move progress to `localStorage` **with an
  explicit expiry** (e.g. 7 days) and a visible "clear my answers" control on the page. The promise
  becomes true; the shared-machine risk is bounded and disclosed rather than avoided.
- **B. Keep sessionStorage and change the copy.** *"Your answers stay in this tab — if you close it,
  you start again."* Cheapest, honest, and it keeps figures off the disk. But it makes `/plan`
  reachable only in one sitting, so `/what-she-does` must be linked from the nav or footer too.
- **C. Persist server-side against an anonymous id.** Best experience, most work, and it puts
  turnover and profit in the database *before* the owner has agreed to anything — which for this ICP
  is the wrong trade. Not recommended without an explicit operator decision.

**Recommendation: A**, with the expiry and the clear control. It is the only one that keeps the
promise already on screen.

### Done when

Complete the eleven questions, hard-refresh, and land back where you were with answers intact.
Open `/plan` directly in a new tab after a completed valuation and see the price rather than
"Let's find your number first". Whichever option, the on-screen sentence and the behaviour agree.

---

## 2. `/my-genome` reads like someone else's notes about you

**Severity: high. The Genome is the deliverable — this is the thing being sold.**

`/genome` (the public example) is, in both testers' words, the strongest trust artifact on the site:
a 31-year plumbing business, named counterparties, dated provenance, and an honest *"still only in
your head"* box. `/my-genome` — the real one, behind auth — does not resemble it.

### ⚠️ Correcting the report on two points

Anneke reported *"53 raw notes all filed under 'Where does revenue come from'"*. Measured against the
live database for the QA owner:

```
work-in 25 · none 14 · only-you 14 · delivery 7 · obligations 3
```

Classification IS working and IS spread. **But note that `work-in` = 25 is exactly `classifyLimit`**
(`lib/genome/derive.ts`, default 25 per page visit). One whole batch landing in a single section is
either a real classifier collapse on the first batch or a coincidence — **rule it out before
anything else**, because if the first batch always collapses, every new owner's first impression of
their Genome is a single overloaded section.

She also reported notes from **four different businesses**. That is real, and it is **not a tenancy
leak** — all of them belong to the one QA user id (the account has been used for several demos).
Verified: three distinct users hold memory rows in total, and the QA owner's own rows account for
all the businesses she saw. Do not go looking for an isolation bug; there isn't one here.

### The two things that are genuinely wrong

1. **Third person about the account holder.** Entries read *"Dennis intends to…"* under a heading
   that says **"You said this on"**. The memory `content` is written by the post-call distil as an
   observer's summary, and `/my-genome` renders it verbatim. A handover document that refers to its
   own owner in the third person does not read as his manual — it reads as a file kept on him, which
   for a man who has told nobody he is selling is precisely the wrong feeling.
2. **Chit-chat is in the document.** 14 rows classified `none` plus whatever sits unclassified. The
   classifier already has a `none` bucket and the prompt tells it to use it freely; the page needs to
   honour that and keep them out of the owner-facing manual entirely.

### Build

- **Distil in the owner's register.** Change the summarisation so a memory is stored as a statement
  of the business, not a report about a person: *"Pricing on commercial jobs is cost plus 18%"*, not
  *"Dennis says he prices commercial jobs at cost plus 18%"*. Fix it at write time in the distil, not
  by string-munging at render. Existing rows need a one-off backfill pass — write a script, do not
  hand-edit.
- **Exclude `none` from the Genome view** (keep the rows; they are still memory, just not manual).
- **Investigate the first-batch classification** as above; if it collapses, the fix is likely in
  `CLASSIFY_SYSTEM` (`lib/genome/derive.ts`) — the `work-in` description is the broadest of the six
  and may be absorbing anything mentioning a client.
- **Classify eagerly, not on page visit.** 25-per-visit means a new owner's Genome fills in over
  several visits, which reads as the product forgetting things. Classify on write (post-call distil)
  and leave the page read-only.

### Done when

A fresh owner's `/my-genome` reads in the same voice as `/genome`, contains no chit-chat, and every
entry is in a section a plumber would agree with. The provenance dates already work — do not break
them.

---

## 3. The product changes character the moment you sign in

**Severity: medium — but it is the moment the sale is won or lost, and both testers hit it.**

Everything before login is warm, plain-English and aimed squarely at a 60-something owner. Then:

| Where | What Ray saw | File |
|---|---|---|
| `/chat/[agentId]` | *"Hey there! 👋"* — generic, emoji, addresses nobody | `app/chat/[agentId]/page.tsx:239` |
| The chrome | *"Talk to the assistant"* — she is **Kira** everywhere else | (button label; find in the chat surface) |
| Nav + dashboard | *"My Kiras"*, *"+ New Kira"* — **plural**, contradicting the one-Kira pitch | `components/UserShell.tsx:12,17`, `app/dashboard/page.tsx:6,63,105` |
| His own account | A black banner advertising the operator's **other AI agents** | `components/KiraBranding.tsx` |
| Overall | Warm yellow marketing → grey app shell; nothing referencing his business | — |

The plural is the substantive one. The entire pitch is *one* exec who learns *your* business; a nav
that offers to make another undoes it silently, and it is the first thing he sees after paying.

### Build

- **One Kira, named.** Retire "My Kiras" / "New Kira" from the owner-facing nav. If multiple agents
  must exist for operators, put that behind `/admin`, not in the owner's chrome. Decide what the
  dashboard is called when it is not a list — probably just the business's name.
- **She is Kira, not "the assistant".** One name everywhere.
- **Greet him as himself.** The first authenticated screen should reference his business or his last
  conversation — the data is already there (`conversations.last_topic` is populated and the
  connect-time recall works). A generic "Hey there 👋" after a landing page that named his exact
  situation is the tone break in one line.
- **Carry the warmth through the gate.** Not a redesign — the shell needs the landing page's palette
  and register so signing in feels like continuing, not switching products.
- **Remove the cross-sell from authenticated surfaces.** Advertising other products inside the
  account of a man paying $999/month for discretion is the wrong instinct. Keep it on marketing
  pages if it earns its place there.

### Done when

Sign in as a non-admin and the first screen names his business, calls her Kira, offers no way to
create a second one, and looks like the same product he was reading five minutes earlier.

---

## Two smaller things, logged but not asserted

- **`/admin/login` rendered `AuthForm is missing a Supabase client…` in place of the form** on one
  load, then recovered on the next (`screenshots/ray/44-settings.png`). Looks like a hydration flash.
  Needs a dev repro before anyone changes code — do not "fix" it blind.
- **The industry matcher briefly showed *"No sector match"* for a string that later matched.** The
  matcher itself is verified working and now follows the box (both confirmed live). But a transient
  wrong answer here lets someone accept the market-average multiple prematurely, which changes their
  valuation. Worth making the pending state unmistakable rather than letting a stale "no match"
  linger.

---

## Before you start

- Read the two reports in `naive-tester-reports/2026-07-28-1940/`. Their phrasing is the spec.
- `docs/WHAT_KIRA_CAN_DO.md` and `lib/capabilities.ts` are the current truth about capabilities —
  `lib/capabilities.ts` is the single source rendering `/what-she-does`. If you change what the
  product does, change that file and both surfaces follow.
- The tooling caution is real: the `/browse` daemon crashed ~12 times across the two runs. One `$B`
  chain per unit of work, each starting with its own `goto`, re-snapshot after every navigation,
  `$B stop` to clear a wedge. **Discard anything implausible immediately after a crash and re-probe**
  — a crash-corrupted result has already caused one correct fix to be wrongly reverted.
- Two guards failed today by never looking at what they guarded: a patch script that asserted "marker
  present" while stacking four copies of a prompt section, and a completeness grep run with
  `head -20` that missed the file it existed to find. Both are fixed. The lesson generalises — when
  you write a check, make it fail on the thing you are actually afraid of.
