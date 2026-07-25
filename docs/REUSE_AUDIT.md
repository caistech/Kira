# REUSE_AUDIT.md — Kira Exec introducer/broker channel (Phase 0)

**Status:** Complete — **awaiting sign-off.** No feature code has been written.
**Date:** 2026-07-25
**Method:** read-only inspection of the local portfolio (`C:/Users/denni/PycharmProjects/*`) + the
`@caistech/*` catalog. Three parallel research passes (auth/invite · billing/email · dashboard/scoring/ledger).
**Brief:** `docs/KIRA_EXEC_BROKER_CHANNEL_BRIEF.md` §0.

---

## 0. Headline findings (read these first)

1. **The closest existing analogue is `F2K-Projects` — which the brief did not name.** It's an "agent ROI
   portal" that already implements: **first-touch referral attribution** (HMAC-signed, HttpOnly, 90-day,
   DB-enforced immutable via a `BEFORE UPDATE` trigger), a **per-subject pipeline board an agent watches**,
   and a **co-brand logo model** (`agencies.logo_url`, "co-brand logo, approved before activation"). It is
   the single best reference for the introducer channel — but it stops short of commission payout, and it's
   **product-local (not packaged)**, so reuse means *extract*, not copy.

2. **`@caistech/coordination-sdk` v0.3.1 is the reuse hub for three capabilities at once:** the extensible
   **role model** (`ParticipantRole` enum + `ROLE_ACTIONS` map — adding `introducer` is a one-line config
   change, the *only* place in the portfolio where a 3rd role isn't new gating code), a **hardened
   magic-link invite** (random-bytes token stored SHA-256-hashed, expiry, revocation, accept flow), and a
   **multi-party status board** (dashboard hooks + realtime). Caveat: its data model is issue/task-centric
   and it **ships no SQL migration** (the consumer owns the tables).

3. **Two capabilities are already forked twice and have no shared home — the channel is the reason to
   converge them:** **Stripe subscription billing** (Kira `users` vs LaunchReady `profiles`, different
   shapes) and **Resend transactional send** (Kira SDK path vs raiseready-core raw-fetch path). A white-label
   broker channel cannot resell three different billing/email shapes.

4. **Genuinely greenfield (build-new, nothing to fork):** the **commission/payout ledger** (monthly run,
   RCTI self-billing, Stripe reconciliation). Confirmed absent portfolio-wide.

5. **`@caistech/beta-gate` is the one trial/cap capability already shared and adopted** (LaunchReady). It
   needs a small **extend** for Workstream B, not a fork.

---

## 1. The audit table (brief §0.3 format)

| # | Capability | exists? | repo + path + version | fit | if extend: where the change belongs | fork risk |
|---|---|---|---|---|---|---|
| 1 | **3rd role (introducer) on user+admin** | partial | Extensible role model only in `@caistech/coordination-sdk` **v0.3.1** (`src/types` `ParticipantRole`, `src/server/magic-links.ts` `ROLE_ACTIONS`). Kira is 2-role-hardcoded (`lib/auth.ts` `ADMIN_EMAILS`, `middleware.ts` two route sets, **no role column** in `users`). CAS re-implements the same allowlist independently. | **extend** | Add `introducer`/`broker` to coordination-sdk's role enum + action map (shared); Kira adds a 3rd route-prefix branch in `middleware.ts` + a check in `lib/auth.ts` (product). | **High** if bolted onto `ADMIN_EMAILS` (duplicates ad-hoc allowlist per repo); **Low** if via coordination-sdk. |
| 2 | **Invite-a-third-party (tokenised/magic-link)** | **yes** | `@caistech/coordination-sdk` **v0.3.1** `src/server/magic-links.ts` (hashed token, 7-day expiry, revoke, accept — hardened). Weaker: `universal-interviews/app/api/invites/*` (plain UUID, no expiry check, not single-use). Kira `app/api/refer/route.ts` = attribution tag only, **not** a secure invite. | **reuse-as-is / extend** | Reuse coordination-sdk magic-link engine; add broker action set (shared). Broker portal hosts the `/magic/[token]` accept page + owns `magic_links`/`participants` tables (package ships no migration). | **Medium-High** if built new (re-invents token security). |
| 3 | **Multi-party status board (status, not content)** | partial | `F2K-Projects/src/lib/roi/pipeline.ts` + `app/agent/(portal)` (closest: agent watches introduced-buyers' status). `@caistech/coordination-sdk` `src/hooks/use-coordination-dashboard.ts` (many-subjects board + realtime, but issue-centric). Content-wall precedent: `universal-interviews` "public presentation fields only" route + deny-by-default RLS (`20260519221711`). Time-series precedent: `Connexions` `agent_drift_snapshots` + `app/dashboard/drift`. | **extend** | Either extend coordination-sdk (add owner+valuation-trend rows + broker role) **or** lift the F2K-Projects pipeline pattern into the Kira product repo. Copy universal-interviews' content-wall RLS discipline. | **Medium-High** (coordination-sdk is issue-shaped; F2K pipeline is product-local). |
| 4 | **Stripe subscriptions/trials/webhooks/cancel** | partial (**forked 2×, no shared package**) | Kira `app/api/checkout/route.ts` + `app/api/stripe/webhook/route.ts` (`stripe ^20.2.0`, dynamic `price_data`, `trial_period_days:7`, **no cancel/portal**). LaunchReady `app/api/stripe/{checkout,webhook,portal}/route.ts` (`^20.1.0`, fixed `priceId`, has portal, **no trial**). `@caistech/api-key-auth` `src/stripe/index.ts` = API-key issuance billing (best idempotency, but bound to `api_keys`). raiseready-core = token-proxy, **no Stripe**. | **build-new (shared) + extend product** | New `@caistech/subscription-billing` (checkout-session builder + idempotent webhook reducer over a caller-supplied table adapter, mirroring api-key-auth's `event.id` idempotency). Kira keeps its **valuation-derived price** local. | **High** (already 2 divergent table shapes; a 3rd kills white-label). |
| 5 | **Trial clock + fair-use cap (Workstream B)** | partial (**already shared + adopted**) | `@caistech/beta-gate` **v0.1.0** (`ensureTrial`/`status`/`extend`/`convert`/`gate`, `beta_trials`+`beta_usage`). Adopted: `LaunchReady/lib/beta-gate.ts` (`trialDays:14`). | **extend** | In `@caistech/beta-gate` (shared): (a) `trialDays:30`; (b) a **$-denominated** cap (`costCap` + `record(...,{costUsd})`) since caps today are unit-counts, not "$20 of tokens"; (c) a **soft-warn band** (return `pctUsed`/`warn`) since it hard-cuts today. Needs a token→USD price source passed in. | **Medium** (only fork risk is if Kira copies it locally instead of extending). |
| 6 | **Resend transactional send + templates** | partial (**forked 2×, no shared sender**) | Kira `lib/email/resend.ts` (SDK, 3 local templates, from `updates.corporateaisolutions.com`). raiseready-core `app/api/email/founder-welcome/route.ts` (raw `fetch` to Resend, derives `noreply@<slug>`). `@caistech/nudge-core` defines an `EmailTransport` interface **the caller must fill with Resend** (unfulfilled). `@caistech/email-compliance` = footer/`assertCompliant` only. | **build-new (shared) + keep templates local** | New `@caistech/email-send` = a Resend-backed `EmailTransport` impl that plugs into nudge-core + composes email-compliance's footer. Product templates stay local. | **High** (2 forks + a latent 3rd; divergent from-domains + footers = a compliance/deliverability risk for a resold channel). |
| 7 | **Readiness score + branded report render** | partial (score+render exist **separately**; co-brand does not) | Score: `raiseready-core/lib/ai/scoring.ts` (`analyzeDeck`→`ReadinessAssessment`, **product-specific** pitch-deck rubric). Render: `@caistech/report-generator` **v0.1.1** (`src/types.ts` `ReportBrand`, **single brand only**), `@caistech/dataroom-core` **v0.1.1**. Co-brand precedent (product-local): `F2K-Projects` `agencies.logo_url`. Kira's `lib/valuation` is the score source (per brief). | **extend** | Add `coBrand`/`secondaryLogoSvg` to `@caistech/report-generator` `ReportBrand` (shared — additive, low-risk). Keep the scoring rubric **in the Kira product repo** (rubrics are product-specific; promote to shared only on a 2nd consumer). | **Low-Medium** (report-generator is cleanly typed; scoring is product-local by nature). |
| 8 | **Referral / first-touch attribution** | **yes** | `F2K-Projects/src/lib/attribution/first-touch.ts` + `supabase/migrations/0063_roi_portal_attribution.sql` — HMAC-signed, HttpOnly, per-estate cookie, **90-day first-touch**, **immutability trigger** + audited override. Weak variants: Kira `app/api/refer` (`referrals` table, capture-only), PrelabzAI `?intro=`, UniversalLingo `referred_by`. | **extend / extract** | Extract the F2K first-touch module into a new shared `@caistech/attribution` (currently product-local with F2K env/tables). Matches the brief's "first-touch, 90-day, immutable log" ask exactly. | **High** as-is (product-local) — extract before reuse. |
| 9 | **Commission calculation (per referral)** | partial | `@caistech/deal-model` (`src/model.ts` computes an "Introducer" fee + "Agents" commission as **deal-modeling waterfall line items**) — not "commission owed to introducer X for converted referral Y". | **build-new** | New commission logic (product or shared); deal-model informs *rate math* only. Ours is simpler: 10% of collected sub, lifetime, per attributed owner. | **Low.** |
| 10 | **Payout/commission ledger (RCTI, monthly run, Stripe reconcile)** | **no** | None found in any repo (grep `ledger`/`RCTI`/`payout_run`/`reconcile…stripe` = only marketing copy + node_modules). Confirmed greenfield. | **build-new** | New shared `@caistech/commission-ledger` (or product-local first, extract on 2nd consumer): monthly payout run, RCTI self-bill, reconcile against Stripe **collected** revenue. | **None** (greenfield). |
| 11 | **Voice + memory core** | **yes** | `@caistech/elevenlabs-convai` **v0.7.0** — Kira already loop-secure. | **reuse-as-is** | — **Consume, never fork** (brief guardrail). | **None** (consume). |

---

## 2. What this means for the build — recommendation rollup

**Extend a shared package (converge, don't fork):**
- `@caistech/coordination-sdk` → add `introducer`/`broker` role + action set (covers capability 1 + 2, and is
  a candidate substrate for 3).
- `@caistech/beta-gate` → 30-day trial + `$`-denominated cap + soft-warn band (capability 5 / Workstream B).
- `@caistech/report-generator` → `coBrand`/secondary-logo field (capability 7).

**Build a new shared package (nothing to reuse, and the channel forces convergence):**
- `@caistech/subscription-billing` (capability 4) — the two existing forks are the argument for it. Kira keeps
  its valuation-derived price local.
- `@caistech/email-send` (capability 6) — a Resend `EmailTransport` that fulfils nudge-core + wraps
  email-compliance. Templates stay per-product.
- `@caistech/attribution` (capability 8) — **extract** the F2K-Projects first-touch module (don't re-invent).
- **Commission ledger** (capability 10) — greenfield; product-local first is acceptable, extract on a 2nd
  consumer.

**Keep product-local (Kira repo):**
- The valuation engine (already there) and the readiness/score rubric (product-specific).
- The broker portal's route-prefix auth branch + its `magic_links`/`participants`/owner-status tables.

**Consume, never touch:**
- `@caistech/elevenlabs-convai@0.7.0`.

---

## 3. Cross-references the brief flagged

- **Workstream E (tenancy).** The introducer org-tier maps naturally onto **coordination-sdk's
  project → participants(role)** model. Resolve the `tenantId` shape (cross-cutting #23 in
  `GARETH_SHAH_INTEGRATION_SEAMS.md`) *with that role model in mind* — the introducer is a participant scoped
  to an owner's **status**, never inside the owner's **memory scope**. This is the decision that must land
  before Gareth builds, and before the parked Gareth beta-invite goes out.
- **Content wall (C.3).** Reuse `universal-interviews`' "public presentation fields only" + deny-by-default
  RLS discipline, enforced server-side — same posture as the memory loop's server-derived identity.
- **Design (A.4).** The referenced `/mnt/skills/public/frontend-design/SKILL.md` is the Anthropic **cloud**
  skills path and is **not present on this machine** — a locally-installed design skill (the safe
  pure-guidance packs from the review) would fill that role when Workstream A runs.

---

## 4. Decisions banked (from you, 2026-07-25)

- Commission **rate 10%**, paid **monthly on collected funds** (trial pays nothing).
- Commission **term: lifetime-of-subscription** (per attributed owner, while collected).
- **Card at signup: yes** (card-on-file).
- **Trial: first month free, fair-use capped at ~$20 of tokens** (warn-not-hard-cut).
- **Valuation figures: keep current.** **CTAs: keep three for now.** (Both override brief §A.3 for now.)

## 5. Still owed before the relevant workstream builds
- None blocking Phase 0. (All §"Decisions I owe you" now answered except the deferred CTA-consolidation and
  the figures, both intentionally held.)

---

## 6. Sign-off gate

Per the brief: **no feature code until this is signed off.** On sign-off, the brief's sequence is
Phase 0 → **Workstream E tenancy** (resolve with coordination-sdk's role model; update the seams doc) →
Workstream A (landing) → B (billing) → C (portal v1) → D (ledger). The reality check stands: prove one
brokerage sends ten owners before building the full portal.

**Awaiting your sign-off (or corrections) on the fit/where-it-belongs calls above.**
