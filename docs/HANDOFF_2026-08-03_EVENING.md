# Handoff — 2026-08-03, evening

**Written at context exhaustion.** Everything below is either committed and pushed, or explicitly
listed as not done. Read `docs/BUILD_REGISTER.md` §J and this file together.

---

## Where things stand

Production is **`1b7af0b`** on `main`, Stripe is **LIVE**, the landing serves **`LandingNew`** via
`NEXT_PUBLIC_STYLE_NEW=true`, and `MODEL_VERSION` is **`2026-08-03.1`**.

⚠️ **The URL-share gate is BLOCKED and should be.** Three FAILs are recorded against deployment
`dpl_AuA6meR4…` from Ray round 6. Do not share the production URL — even with the operator — until a
clean run is recorded.

---

## 1. Ray round 6 — five fixed, three open

Report: `naive-tester-reports/2026-08-03-ray-round6/ray.md`. Fixes in `1b7af0b`.

**Fixed:** doubled GST on the live payment page (`price()` already appends the suffix; two call sites
appended it again) · the voice widget swallowing questions · two stacked headers *and* footers ·
the pricing block contradicting the FAQ · the gap arithmetic (measured: **84.9%** of realistic cases
did not tie on screen).

**STILL OPEN, in priority order:**

1. **Blank pages — the most expensive finding.** `/plan` blank ~15s, `/genome` 8s+, `/login` ~7s. No
   spinner, no console error. *"Fifteen seconds of white on the page where you ask for my card is not
   a slow page, it's a broken one, and I have no way to tell the difference."*
   **Investigation got this far and no further:** `/genome` and `/plan` are both `'use client'` at the
   top level, so nothing paints until hydration — and `/genome` renders `EXAMPLE_GENOME`, which is
   **static data and has no reason to be a client component at all**. `/login` IS a server component
   but renders a placeholder until mounted (deliberate — see `53babf7`, it was showing a developer
   error server-side). Likely fix: server-render the first screen of each; `/genome` may simply need
   the `'use client'` moved down to the accordion.
2. **Four visual identities** — landing, valuation, checkout, login each look like a different
   product. `DESIGN.md` exists; nothing applies it beyond the hex-literal gate, which cannot see
   typefaces or gradients.
3. **Mobile** — voice button 24px tall at 375 (needs 44), several secondary lines at 15px, an emoji
   left in the voice button, and a hamburger drawer that painted white in 3 attempts. **That last one
   needs a real handset** — it may be a headless artefact.

Also unfixed, lower: no debt field ("what lands in my account"), two competing scores
(`Transferability 32/100` vs `On the page 57%`), nothing asks what the broker already told him.

---

## 2. The next run is the AUTHENTICATED one, and it has never happened

**8 of 42 routes have ever been tested.** Ray's persona *"will not create a second account"*, so both
rounds ended at the paywall — the funnel is tested twice and the paid product zero times.

Never naive-tested: `/dashboard` `/my-genome` `/settings` `/chat/[agentId]` `/knowledge` `/discovery`
`/create-kira` `/onboarding` `/commit` `/setup/*` `/personal-journey`, **the whole `/admin` portal**,
the introducer channel, the auth-recovery paths, the doing loop (`E2`: still zero `done` rows), and
PubGuard.

**Do it as one run, both portals** (`PRODUCT_STANDARDS` §8.5), with a persona who *would* sign up —
Anneke, not Ray. Canonical identities: `QA_TEST_USER_EMAIL` / `QA_TEST_ADMIN_EMAIL`, Mode A typing
the real form. Admin agent bounded to VT_A1–A4; **sign-out-everywhere and delete-account are
operator-run, never agent-run.**

---

## 3. Build this before trusting another round of fixes

`scripts/walk-the-path.mjs`, wired into `portfolio-gate` beside `check-app-chrome.mjs` and
`check-design-tokens.mjs`. It would have caught **six of Ray's eight**:

| Assertion | Catches |
|---|---|
| `<header>`/`<footer>` count === 1 per public page | duplicated chrome |
| First paint of every CTA target has body text < 2s | the blank pages |
| Submit to every text input → assert a response or a network call | the swallowed question |
| Every rendered price matches the tax suffix exactly once | `+ GST + GST` |
| One statement of any policy/basis in the codebase | copy contradicting copy |
| Displayed derived figures tie against displayed inputs | the gap arithmetic |

The reasoning is now canon in **`cais-shared-services/TESTING_STANDARD.md`** (auto-imported into
every session). Read it before the next run.

---

## 4. Open elsewhere

- **`G5`** — four F2K tasks awaiting approval. Approving one sends under Factory2Key's ABN. Operator only.
- **`B8`** — the public example's hand-authored coverage figures; J4 **grew** this (6 → 9 areas).
- **`G2` residual** — `getSwarmCoordinator()` falls back to the local stub on any unrecognised value,
  and that stub's `sendEmail` is hardcoded to the CAS domain. Latent, not live.
- **`J3` `J6` `J7`** — unverifiable from source; the authenticated run settles them.
- **Gareth's valuation was deleted** with the rest (real person, $4.26M gap, retired model). He has
  not been told. Backup: session scratchpad `valuations-backup-2026-08-03.json` — **a temp directory,
  containing real turnover and profit. Move it or lose it.**

---

## 5. One process note, because it caused most of today

Five of Ray's eight were shipped that same morning by a session that verified every one of its own
changes and said so truthfully. The failures were: verifying the **edit** rather than the **journey**,
proving **presence** and reporting **function**, and fixing the **instance** rather than the **class**.

If you fix the three open items, walk the whole path afterwards — landing → valuation → result →
`/plan` → the card screen, at 375 and 1440 — before saying they are done.
