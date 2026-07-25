# Kira Exec broker channel — build state & next-session positioning

**As of:** 2026-07-26 (Workstream B built). **Read with:** `KIRA_EXEC_BROKER_CHANNEL_BRIEF.md` (the plan)
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
- **Workstream B — BUILT (PR #22, awaiting live Stripe test).** All three steps done:
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
  **Not yet done:** a real Stripe test-mode checkout → webhook run. Do that before this touches a
  live card. `VOICE_COST_PER_MINUTE_USD` is an estimate ($0.10) — recalibrate after a month of
  real ElevenLabs invoices.

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
1. **Live Stripe test-mode run:** checkout → `checkout.session.completed` → confirm `users` shows
   `trialing` + `last_stripe_event_at`, then replay the event and confirm the reducer answers
   `duplicate`. This is the one thing PR #22 could not verify.
2. **Merge PR #22** once that passes.
3. Migrate Kira's remaining templates in `lib/email/resend.ts` onto `@caistech/email-send` (the
   trial reminder already uses it), and set `EMAIL_SENDER_*` in Vercel so the identification footer
   is actually attached — it degrades to no-footer without them.
4. Recalibrate `VOICE_COST_PER_MINUTE_USD` after real ElevenLabs invoices.

### Workstream C — introducer portal v1 (compose-and-hand-off)
1. **Extend `@caistech/coordination-sdk`** (reuse, per audit rows 1+2+3): add `introducer`/`broker` to
   `ParticipantRole` + `ROLE_ACTIONS` (`allowed_actions: ['view_status']`); reuse its hardened magic-link
   engine for the introducer→owner invite. Kira adds a 3rd route-prefix branch (`/introducer`) in
   `middleware.ts` + a check in `lib/auth.ts` (do NOT extend `ADMIN_EMAILS`).
2. **Extract F2K-Projects first-touch attribution → `@caistech/attribution`** (NEW shared package). Per audit
   row 8: lift `F2K-Projects/src/lib/attribution/first-touch.ts` + the immutability trigger from
   `supabase/migrations/0063_roi_portal_attribution.sql`. Matches §C.4 (first-touch, 90-day, immutable, +
   a "who told you about Kira?" fallback field at signup).
3. **Introducer dashboard** — owner list with **status + valuation movement over time** (the retention hook).
   Hard boundary: introducers see status/scores, **never** content/transcripts/memory (enforce server-side,
   the status-projection overlay from #23). Content-wall precedent: `universal-interviews` "public
   presentation fields only" route + deny-by-default RLS.
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
