# Handoff — to the session working Ray's list, 2026-08-03

**From:** a second session that ran concurrently with yours this morning and has now stood down.
**Status:** advisory. Nothing here needs my involvement — check and resolve as you see fit.

We were both in this repo at the same time. You committed `3cba1c5` while I was mid-read and my
working tree went clean underneath me twice. No work was lost, but that is luck rather than design,
so the first section is the protocol and the rest is what I found.

---

## 1. Two commits are in, and they are UNPUSHED

| Repo | Commit | What |
|---|---|---|
| `kira` | `66470a7` | `docs/BUILD_REGISTER.md` (G1 closed, G2 → Sev 1, G7 added) + `docs/REBRAND_QUESTIONNAIRE.md` |
| `cais-shared-services` | `1976eac` | `CLIENT_HANDOVER_KIT.md` §6.5 |

Both are **docs only** — no product code, no tests touched. Both branches sit **1 ahead of
origin/main**. I did not push because you may have work in flight; push or fold them in as suits.

I committed straight to `main` rather than branching, deliberately: `git checkout -b` switches the
working tree *you* are using, which is the exact harm described above.

---

## 2. What changed in the register, so you do not redo it

- **G1 CLOSED.** `updates.factory2key.com.au` is verified in Resend (08:30 today). Verified
  independently of the dashboard against Leapfrog's authoritative nameserver and Google's resolver.
- **G2 raised to Sev 1** — with the domain live it is the only thing between a verified F2K domain
  and F2K mail actually leaving as F2K. It now names the two exact call sites.
- **G7 added** — client sending-domain setup as an onboarding form step.

### ⚠️ The DNS trap — do not repeat my mistake

**Resend splits its records across two names.** SPF + MX live at `send.updates.<domain>`; DKIM lives
at `resend._domainkey.updates.<domain>`. Querying the bare `updates.<domain>` returns SOA/no-data for
both TXT and MX and is **indistinguishable from records that were never added**. I read it exactly
that way and was one step from having Dennis reopen a ticket against an IT provider who had done the
job correctly. The zone serial is no help either — it still read `2026080201` after the change had
landed. If you touch this, query `send.updates.<domain>`.

---

## 3. G2 is a real live defect, not a tidy-up

`lib/email/resend.ts:25` hardcodes `Kira <noreply@updates.corporateaisolutions.com>` and `EMAIL_FROM`
is set in **no** environment. Owner-behalf sends — `lib/kira/swarm/stub.ts:281` and `:315` — call that
same `sendEmail()`. So a Factory2Key quote reaches a Factory2Key customer **from the AI company's
domain, with Global Buildtech's ABN in the compliance footer**.

Both halves must move together: a per-send `from` on the owner's verified domain **and**
`compliance.sender` carrying the owner's entity + ABN. `@caistech/email-send` already supports the
override, so this is wiring rather than a package change.

**Do not move Kira's own product mail.** Magic link, "your Kira is ready" and the welcome-back nudge
correctly carry the CAS identity — Kira is a Global Buildtech product writing to its own users. Only
owner-behalf mail changes.

Blocked on Dennis for one input: Factory2Key's ABN and registered postal address.

---

## 4. Please reconcile the round-5 list — I do not know what you closed

From `naive-tester-reports/2026-08-03-0526/ray.md`, `3cba1c5` closed six findings. **Eight were
outstanding when I stood down**, and you have committed nine times since, so some are likely done.
I have not verified any of them and did not want to guess in the register:

1. Stripe checkout — no GST on the figure; "per unit", "based on usage", "Price varies" ×2
2. Free-beta vs arrears contradiction (FAQ vs every in-app screen)
3. "Recorded by Ray" vs emails signed "Pat Nolan"
4. Example Genome has 6 sections; the real one has 9
5. Kira Exec claims it excludes test accounts, then lists two QA accounts (`app/admin/(panel)/exec/page.tsx:17`)
6. `/plan` has no sidebar; the back link paints late
7. Mic FAB overlays body text on My Genome (ours); the SayFix tab is H1, Dennis's scope
8. Raw export `$1,094,292` vs `$1,090,000` on every screen

**Item 1 is not a copy fix, and has already been attempted as one.** `53babf7` put `taxSuffix()` into
the Stripe *product name*; Ray still recorded "no GST anywhere" because he reads the figure, not the
line-item title. "Per unit / based on usage / Price varies" is what Stripe renders for a **metered**
price, and metered is what the arrears model requires. It needs `custom_text` on the session stating
the fixed monthly amount with GST, or Stripe Tax.

---

## 5. The newer report has findings I could not see in the register

`naive-tester-reports/2026-08-03-ray-prod/ray.md` — logged out, first-time visitor, ~45 min. Note its
scope: he stopped at the card, so it **does not** verify §4 above. Two hard FAILs against portfolio
non-negotiables, both apparently introduced by the landing rebuild:

- **Voice (§6) FAIL** — no conversational widget on any public page; the only voice surface is a
  pre-recorded mp3. For a product sold as *"you only ever talk to Kira"*, that fails on the page
  where the buyer is deciding.
- **Typography (§1) FAIL** — 15 blocks of body copy at 14px on mobile, below the 16px floor.
- **Palette + emoji** — green brand, pink buttons, purple numbers, emoji headings (💰 🛠️ 🤝 🏦).
  Emoji in headers is also against §5. His words: *"written for me and then decorated by someone
  thirty years younger."*

**And one that is not a bug and is recorded nowhere.** He noticed within ninety seconds that the
monthly fee is a percentage of the gap the same tool calculates — so the bigger the number shown,
the more he is charged. Combined with the (genuinely admirable) footnote saying the multiples come
from US data, he concluded: *"a number I like, that you've told me not to rely on, from a company
that gets paid more if the number is bigger."* This is adjacent to A1–A3 but it is a **pricing-model
decision for Dennis**, not a modelling defect. It deserves a `DEC` row; I did not add one because
the wording is his call.

---

## 6. Protocol, if we overlap again

- The register's own rule holds: an item leaves it when **done and observed**, not when built. G1 is
  closed on an independent DNS query, not on the Resend dashboard, for that reason.
- Before a re-test, run `portfolio-gate-deploy-status`. The round-5 run started 22 minutes after the
  last commit, and several "repeats" in it were things edited but never checked on the deployed site.
- New file rather than an edit to a shared doc when both sessions are live — which is why this is its
  own file and not a section appended to `NEXT_SESSION.md` (stale since 26 July anyway).
