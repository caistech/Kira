# Beta outreach — 2026-09-01 (single-tester gate, then group A, then group B)

**Supersedes:** `docs/BETA_P1_OUTREACH_2026-08-17.md`, `docs/BETA_REPLIES_2026-08-17.md`,
`docs/BETA_FOLLOWUP_EMAILS.md`. Those remain as historical artifacts; **all future sends use this doc.**
Drafted 2026-09-01. **Nothing has been sent from this revision.** Approvals first.

What changed since the August drafts (verified against the live site before writing this):
- **Wording.** The public surface now says **Operating Manual / handover document**, not *Business
  Genome* (Phases 1–2, commits `4b74b3a`→`cf7b7b3`). Ray's walkthrough rejected "Genome" as startup
  jargon; the emails below use the owner's vocabulary throughout.
- **The broker-safe sell.** The "handover" is now a promoted first-class feature — private items are
  auto-stripped and the document is safe to send to a broker. That is now a headline promise, so the
  outreach copy leads with it rather than burying it.
- **Gated rollout.** Per the operator's instruction, we do **not** fan out to all 36 entries at once.
  We prove the end-to-end path with **exactly one internal test user first** — before any real
  recipient gets an email.

---

## The single-tester gate (do this FIRST — before any real send)

**Designated internal test user** (already in `data/beta-testers.json`, group A — this is the only
account the test run may use before rollout):

| Field | Value |
|---|---|
| email | `mcmdennis+nonclaudetest@hmail.com` |
| name | Dentester34 Smith |
| code | `DENW-4567-8902` |
| group | A |
| status | `trial_started_at` null, `usage_count` 0 |
| comment | **"Needs request for acting as beta tester - no code offered yet"** |

**Why this gate exists.** The code `DENW-4567-8902` is minted but the account has never redeemed it
(`no code offered yet`), so the account does not yet exist. We use this one account to walk the full
journey against production before any real-eyed recipient sees a link:

```
Landing → /plan?code=DENW-4567-8902 → valuation (13 questions) → set password
→ login → /dashboard → /start → create agent → chat (text + voice)
→ /my-genome (Operating Manual) → download broker-safe handover → share
```

**Test credentials.** This account's password is set at redemption (the beta path sets it at the end,
per the follow-up emails). The engine-run session drives it via the standard tester pipeline — see
`docs/TESTING.md` — using `QA_TEST_USER_EMAIL`/`QA_TEST_USER_PASSWORD` from the canonical
`cais-shared-services/.secrets/qa-secrets.json` **only for the automated engine reservation**. The
real `mcmdennis+nonclaudetest@hmail.com` redemption is a manual/operator step: the operator (or the
engine with the operator's explicit go) redeems `DENW-4567-8902` and sets the password.

**Gate criteria — only when all green do we move to group A:**
1. `/plan?code=DENW-4567-8902` accepts the code, holds it, and reaches the valuation.
2. Valuation completes; no card is asked; no charge occurs.
3. Password set; `/login` with that email+password reaches `/dashboard`.
4. Admin cross-access check: this account is **not** in `ADMIN_EMAILS` (user ∉ admin, invariant in
   TESTING.md).
5. `/my-genome` renders as "Your Operating Manual" with the Broker-Safe download working.
6. The broker-safe handover leaves out a test-flagged private item.

**Rollout stop if any gate fails** — fix, then re-walk the gate with the same single account.

---

## The send medium

Everyone goes to the **public URL with their code in the link** — `?code=` — never a bare domain and
never a magic link. This is the hard rule from the August rounds (Shani's bug: a code typed at the
pricing step bypassed the beta door and he took the visible free-signup path). Every send from here
uses the code-in-link form.

Email **sent** with `scripts/send-beta-outreach.mjs`, cc `dennis@corporateaisolutions.com`,
Reply-To the same, one recipient per run. Mint fresh codes with `scripts/mint-beta-code.mjs`, each
bound to that person's email.

---

## Draft A — the original-access two things (does not apply to the gate user; for group A/B)

**Subject:** Kira — your access code, and a change to how you start

> Hello {FirstName},
>
> A short note, because what I sent you before no longer matches what happens.
>
> **What Kira is for, so you are judging the right thing.**
>
> Most owner-run businesses are worth less than the owner thinks, and the reason is nearly always
> the same: the pricing, the judgement, the relationships and the "we don't do it that way" all live
> in one man's head. A buyer is not buying an asset, he is buying a job — and he prices it
> accordingly.
>
> Kira's whole job is to get that knowledge out of his head and onto paper, by talking to him rather
> than handing him a form. The deliverable is a handover document: his business in the nine areas a
> buyer's advisor works through, every line dated to the day he said it, his to keep whether or not
> he keeps paying us. Anything he marks private is kept out of the broker's copy — so the document he
> hands over is safe to put in front of an advisor or a buyer.
>
> Two things worth knowing before you start, because they are unusual and they are deliberate. It is
> priced as a **project, not a subscription** — after twelve months it drops to a third whether or
> not the work is done, because it is meant to end. And she is trying to make herself **redundant**:
> the point is the document, not the relationship.
>
> **What has changed since I last wrote.** Previously an invitation dropped you straight onto the
> dashboard. That skipped the part that makes Kira worth anything — the valuation your figures are
> measured from, and the first conversation where she learns how the work actually gets done. People
> landed on a screen with nothing in it and, fairly enough, left.
>
> So you now walk the same path a paying owner walks:
>
> 1. Open **https://kiraexec.com/plan?code={CODE}**. It carries your code with it, so there is
>    nothing to type and no need to sign in.
> 2. It will confirm the code is held, then ask thirteen short questions about a business. Three
>    honest numbers at the end.
> 3. That brings you back with the code already applied. No card is asked for and nothing is charged.
> 4. Then have a conversation with Kira.
>
> About twenty minutes in total, and you can stop and come back. If you already made an account with
> me earlier, the code step will ask you to sign in instead — that is expected rather than a fault,
> and the valuation you have just done carries across.
>
> If your mail program strips the link, go to **https://kiraexec.com** and use **{CODE}** at the
> "Been invited to the beta?" line on the pricing page.
>
> **It is a beta, and it is worth saying what that means.** Some things are not built yet — she
> cannot write documents for you, and sending email on your behalf is not switched on. Some things
> are limited by where you are: parts of the product are set up for Australia first, so from the US,
> Canada or New Zealand you will see gaps that are geography rather than bugs. Neither is hidden —
> the product tells you when it cannot do something.
>
> What I want back is not a bug list, though I will take one. It is two things:
>
> 1. What the experience was actually like — where it was confusing, where it dragged, where you
>    would have stopped if I were not watching.
> 2. Whether you would put this in front of a business owner in his sixties who is quietly thinking
>    about selling — and if not, what is missing before you would.
>
> That second one is the whole question for me. Most of you would be the person handing Kira to that
> owner rather than the owner himself, and your read on whether he would trust it is worth more than
> mine.
>
> One thing worth knowing before you begin: what you tell her is kept, and it is what builds the
> handover document at the end. So use a real business if you have one, or a plausible one if you
> would rather not.
>
> Dennis

---

## Draft B — follow-up / re-invite for those who hit the wrong path

Only relevant to specific recipients from the August round; no current recipient in this revision is
known to be in this state. Kept for when a follow-up is needed.

**Subject:** Kira — the path you took was broken, and here is the fixed one

> Hi {NAME},
>
> Short note, because I owe you an apology.
>
> You tried to use your beta code last week and hit a bug. The pricing page offered two "no card"
> options — one for beta testers (correct) and one for general signups (wrong). The second one was
> more visible than the first. You took the sensible path, and it bypassed the entire beta setup.
>
> That is my fault, not yours. The page has now been fixed — there is only one path for beta testers
> now, and it carries your code in the link.
>
> Here is the working link:
>
> https://kiraexec.com/plan?code={CODE}
>
> Click it, answer the thirteen questions (about three minutes), and at the end you'll set a password
> and go straight in. No card, nothing to type, no confusion.
>
> What I most want from you at this point: does she stop on something a buyer would stop on? If you
> tell her one man does all the pricing, or that one customer is forty per cent of revenue on a
> handshake, a good adviser would interrupt. That is the failure I am least confident about.
>
> Thank you for your patience with this. You found a real bug and I have fixed it for everyone who
> comes after you.
>
> Dennis

---

## Draft C — never-tried reminder

For group C recipients who received codes but never attempted signup. Code-in-link form.

**Subject:** Kira — your code is waiting (and the link that does the work)

> Hi {NAME},
>
> I sent you a beta code last week. You may not have had time to look at it, or the instructions may
> not have been clear — either way, here is a link that does the work:
>
> https://kiraexec.com/plan?code={CODE}
>
> Click it, answer the thirteen questions (about three minutes), and at the end you set a password and
> go straight in. No card, nothing charged, no confusion. Anything you mark private is kept out of
> the copy you hand a buyer, and the operating manual it builds is yours to keep whether or not you
> stay with us.
>
> What I most want to know when you've walked it: would you put this in front of a business owner in
> his sixties who is quietly thinking about selling — and if not, what's missing before you would?
>
> Dennis

---

## Rollout order (this revision)

| Step | Who | When |
|---|---|---|
| 0 | Gate: `mcmdennis+nonclaudetest@hmail.com` (`DENW-4567-8902`) | internal, before any send |
| 1 | Group A (7 entries) | after gate green |
| 2 | Group B (12 entries) | after group A read-back |
| — | remaining ungrouped entries in `beta-testers.json` | reviewed per-status (some may be no-account/nudge only) |

One recipient per `send-beta-outreach.mjs` run. **None of this has been sent.**

*Status: draft for approval per the beta-review convention. Update this doc's status line and this
rollout table as the gate passes.*
