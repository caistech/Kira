# Kira Exec broker channel — build state & next-session positioning

**As of:** 2026-07-26 (B built + verified; C1-C3 built). **Read with:** `KIRA_EXEC_BROKER_CHANNEL_BRIEF.md` (the plan)
+ `REUSE_AUDIT.md` (signed-off reuse verdicts) + `GARETH_SHAH_INTEGRATION_SEAMS.md` (#23 tenancy resolved).

---

## Where we are

- **Phase 0 reuse audit — DONE + signed off** (`REUSE_AUDIT.md`). No feature code was written until sign-off.
- **Workstream E (tenancy) — RESOLVED** (`GARETH_SHAH_INTEGRATION_SEAMS.md` #23): memory/task/record scope
  stays the **flat owner `tenantId`** (Gareth + Shah build to it unchanged); the introducer is a **read-only
  status-projection overlay** keyed separately (`introductions` relation), mapping onto `coordination-sdk`
  participant roles. **Gareth is unblocked** — the parked beta-invite (Gmail draft) can go out.
- **Workstream A (landing rebuild) — DEFERRED** by operator choice (channel-first). Design skills installed
  for when it resumes: `frontend-ui-engineering`, `frontend-design-principles`, `frontend-design` (in
  `~/.claude/skills/`). NOT installed: `nextlevelbuilder/ui-ux-pro-max` (code-execution surface — audit before use).
- **Workstream B — BUILT + LIVE-VERIFIED (PR #22, CI green, unmerged).** All three steps done:
  1. **`@caistech/subscription-billing@0.1.0` published** — checkout builder (fixed price OR dynamic
     `price_data`, trial, card-on-file) + an idempotent, out-of-order-safe webhook reducer over a
     caller-supplied table adapter. Converges Kira (`users`) + LaunchReady (`profiles`); **neither
     fork was idempotent or ordering-safe.** 28 tests.
  2. **Kira wired** — trial 7→30 days, card at signup, beta-gate `costCap: 20` + warn band, cost
     accrued from the post-call duration (records, never gates), `Settings → Plan & usage` meter,
     `/api/billing/portal` (Kira had no cancel path at all), and a daily cron mailing owners 3 days
     before the first charge. Migration `20260725180000` **applied to prod** + recorded.
  3. **`@caistech/email-send@0.1.0` published** — Resend transport fulfilling `nudge-core`'s
     `EmailTransport` + composing `email-compliance`'s footer. 11 tests. Kira's other templates
     still use the local `lib/email/resend.ts` — migrate them when next touched.
  ✅ **Verified 2026-07-26** against real Stripe test mode + real Supabase (6 tests). `VOICE_COST_PER_MINUTE_USD`
  is still an estimate ($0.10) — recalibrate after a month of real ElevenLabs invoices.
- **Workstream C — C1/C2/C3 BUILT + gaps closed** (see below): shared role model + attribution published, and the
  Kira-side introducer board, referral resolver and attribution capture shipped. The INVITE flow is
  the gap — nothing creates an introducer yet.

## Decisions locked (2026-07-25) — do not re-litigate
- **Commission: 10%** of the subscription, **paid monthly on collected funds only**, **term =
  LIFETIME-of-subscription** (per attributed owner, while collected). Trial month pays nothing.
- **Card at signup: YES** (card-on-file).
- **Trial: first month free**, fair-use capped at **~$20 of tokens**, **warn-not-hard-cut** (surface usage).
- **Valuation figures: keep current** (brief §A.3 "fix figures" overridden — held).
- **CTAs: keep three for now** (brief §A.3 single-CTA overridden — held).
- **Attribution: first-touch, 90-day window** (per brief §C.4) — but the OWNER↔INTRODUCER earn is lifetime.
- **Email: introducer is always the sender, we never are** (brief §C.2). v1 = compose-and-hand-off.

---

## Next session — pick up here, in this order

### Workstream B — close it out (small)
1. ✅ **Live Stripe test-mode run — DONE 2026-07-26.** 6 integration tests in
   `lib/billing/billing.integration.test.ts` against a real test-mode subscription + real Supabase:
   trialing recorded at checkout, redelivery deduped, out-of-order ignored, bad signature rejected,
   cancellation clears the id. Refuses to run against a live key; self-cleaning.
2. ✅ **PR #22 MERGED 2026-07-26** (carried B + C + the C-gap items; deployed to production).
3. Migrate Kira's remaining templates in `lib/email/resend.ts` onto `@caistech/email-send` (the
   trial reminder already uses it), and set `EMAIL_SENDER_*` in Vercel so the identification footer
   is actually attached — it degrades to no-footer without them.
4. Recalibrate `VOICE_COST_PER_MINUTE_USD` after real ElevenLabs invoices.

### ✅ Production config — CLOSED 2026-07-26

All three gaps found by checking the Vercel + Stripe APIs are now fixed, and the fixes are proven
against production rather than assumed:

- **Stripe webhook — WORKS FOR THE FIRST TIME.** No endpoint had ever been registered and
  `STRIPE_WEBHOOK_SECRET` was set in NO environment, so Kira's webhook had never run (pre-existing:
  the old handler read the same unset variable). Test-mode endpoint registered (6 events) + secret
  set `sensitive` on production+preview. **Verified live:** creating a real test-mode subscription
  produced `customer.subscription.created` and `customer.subscription.deleted` rows in
  `stripe_webhook_events` on prod — signature verified, event claimed, idempotency working.
  Verification rows cleaned up. *A LIVE-mode endpoint is still owed when a live key goes in.*
- **`CRON_SECRET` set** (`sensitive`, production+preview) — and the guard now **fails closed**:
  `rejectUnauthorisedCron()` returns 503 when the secret is missing instead of silently skipping
  the check, which is what made both endpoints publicly callable. **Verified live:** both cron
  routes now return 401 in production without the correct bearer.
- **`RESEND_API_KEY` moved to production+preview** (`sensitive`) — production can send email at
  last, including the trial reminder and the introducer invites.
- **`ATTRIBUTION_SECRET` set** — without it `@caistech/attribution` falls back to signing
  first-touch cookies with the Supabase service-role key, so rotating that key would silently
  invalidate every attribution. Set before any real cookies existed.
- ℹ️ Production's `STRIPE_SECRET_KEY` is still a **TEST** key (prod checkouts land in Stripe test
  mode), so no real money moves yet.

**Still owed on email:** `EMAIL_SENDER_NAME` / `EMAIL_SENDER_EMAIL` / `EMAIL_SENDER_ABN` are unset,
so outgoing mail currently ships **without the Spam Act identification footer** (the code degrades
rather than failing the send, and logs a warning). Set them before any volume.

### Workstream C — introducer portal v1 (compose-and-hand-off)

**C1 + C2 (the shared pieces) — DONE 2026-07-26.**
- ✅ **`@caistech/coordination-sdk@0.4.0` published** — `introducer`/`broker` roles added, the only
  roles with `['view_status']` **without `view`**. Exports `ROLE_ACTIONS` / `allowedActionsFor` /
  **`canViewContent(role)`** — call that at every content-serving boundary in Kira. Referring parties
  also get an empty `ROLE_PROMPTS` entry so the AI-email pipeline can't write them from contents.
- ✅ **`@caistech/attribution@0.1.0` published** — F2K's first-touch extracted and generalised
  (HMAC-signed HttpOnly cookie, 90-day window, first-touch-wins, + `migration.sql`'s immutability
  trigger with audited override). Wire format pinned compatible with F2K's live cookies.
- **Still to wire in Kira:** the `/introducer` route-prefix branch in `middleware.ts` + a check in
  `lib/auth.ts` (do NOT extend `ADMIN_EMAILS`); the `/r/[token]` resolver + signup capture using
  `@caistech/attribution`; a "who told you about Kira?" fallback field at signup; and the
  `magic_links` / `participants` tables (coordination-sdk ships no migration — the consumer owns them).

**C3 substrate — DECIDED 2026-07-26: PRODUCT-LOCAL in Kira**, built to the F2K-Projects pipeline
shape so a later `@caistech` extraction is a lift, not a rewrite. (coordination-sdk's tables are
issue-shaped and live in the coordination project's own Supabase — wrong home for Kira's
introducers. Its ROLE MODEL is still consumed.)

**C3 — BUILT 2026-07-26.** Migration `20260726000000` applied to prod + recorded: `introducers`,
`introducer_magic_links` (SHA-256-hashed tokens), `introductions`, `attribution_overrides`,
`users.referrer_id`/`first_touch_at`/`referral_source_text`, `introducer_owner_projection()`, and the
first-touch immutability trigger. All RLS-on. Shipped: `/r/[token]` resolver, `/introducer/enter/
[token]` magic-link sign-in, the `/introducer` board (status + valuation movement, responsive),
`/introducer/expired`, a middleware branch on its own session cookie (NOT `ADMIN_EMAILS`), and
attribution capture in `/api/onboarding/complete`. **Immutability verified against the live DB:**
NULL→value allowed, reassignment blocked (23514), override audited.

**C gaps CLOSED 2026-07-26** — the channel is now usable end to end:
- ✅ **Invite flow** — adding an introducer emails BOTH links (their referral link + a 7-day
  sign-in link) in one step, through `@caistech/email-send`. An introducer row with no invite sent
  is a broker who thinks they're set up and isn't. Referral tokens use an alphabet without 0/O/1/l
  (brokers read them aloud).
- ✅ **Admin surface `/admin/introducers`** — list with per-introducer introduction + paying counts
  (from `introductions`, so "sent" means someone genuinely opened the link), add form, re-send,
  suspend/restore. Suspend revokes live sign-in links IMMEDIATELY but deliberately does NOT touch
  attribution — access and commission are separate questions. Every server action re-checks
  `isCurrentUserAdmin()` itself: a server action is a callable endpoint, not just a page.
- ✅ **"How did you hear about Kira?"** on signup via the canonical AuthForm's `extraFields`, shown
  ONLY when there is no signed attribution cookie (a typed answer contradicting a signed one is a
  dispute waiting to happen). Migration `20260726120000` carries it through
  `link_or_create_app_user` to `referral_source_text` — never `referrer_id` (a hint, not a
  commission). The old 3-arg signature is DROPPED so nothing can silently keep using it and lose
  the answer.
- 5 committed integration tests cover the invite mechanics against the live DB (link resolves +
  activates, tokens hashed at rest, revoked refused, suspended refused, unknown refused).

⚠️ **Needs `@caistech/coordination-sdk@0.4.1`** — 0.4.0 was `"type": "module"` with extensionless
relative imports, so it could not be imported outside a bundler (Next built fine; vitest/node
failed). Fixed + published; pre-existing since 0.3.1.

**Remaining in C:** C4 (co-branded report) + C5 (compose-and-hand-off introducer email) below.

3. ~~Introducer dashboard~~ **DONE** (status + valuation movement, content wall enforced server-side).
4. **Co-branded report** — extend `@caistech/report-generator` `ReportBrand` with a `coBrand`/secondary-logo
   field (audit row 7); closing line *"This is indicative. [Name] at [Brokerage] can give you the real number."*
5. **Introducer email v1** = compose-and-hand-off (portal drafts, one click opens prefilled in THEIR mail
   client; disclosure line non-removable; tracking off the unique link). Store contacts on the introducer's
   behalf only.

### Workstream D — commission ledger (greenfield)
- Per audit row 10: build a **commission ledger** (product-local first, extract on 2nd consumer). **Pay on
  collected revenue only**, **10%**, **lifetime**, starts first paid month, stops on cancellation. **RCTI**
  (self-bill on the introducer's behalf), **monthly payout run** + statement per introducer, **reconcile
  against Stripe collected revenue**. `@caistech/deal-model` informs rate math only — not the ledger.
- Nominate-payee: individual **or** brokerage entity. Do NOT also discount the owner (pays the referral twice).

### Then Workstream C v2 (OAuth send) — ONLY after v1 shows introducers actually send.

---

## Guardrails carried forward
- **Reality check:** prove one brokerage sends ten owners before building the full portal (brief §SEQUENCE).
- Never fork `@caistech/elevenlabs-convai` or any canonical package; extend + version-bump + update the
  `SHARED_SERVICES.md` catalog + reconcile consumers in the same change.
- Server-derived identity + scope everywhere; introducer visibility enforced server-side.
- Privacy Act / Spam Act: **flag the introducer agreement, disclosure wording, and data-handling terms for a
  lawyer** — do not decide them in code (brief §GUARDRAILS).
- Landing redesign (A), when it resumes, re-opens the audited site → **re-run naive-tester + re-clear the
  URL-share gate** before re-sharing the URL.
