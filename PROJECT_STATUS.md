# Project Status — Kira

> Auto-maintained by OpenCode. Read at session start, updated before session end.
> Last updated: 2026-09-21

## Current State
<!-- One of: ACTIVE_DEVELOPMENT | MAINTENANCE | BLOCKED | PAUSED | SHIPPED -->
**Status**: ACTIVE_DEVELOPMENT

## What Was Just Done
<!-- Updated at end of each session. Most recent first. -->
- **`05313cc` (pushed, UNVERIFIED LIVE — session ended before re-test)** — the deeper bug a
  REAL walkthrough found: `/plan`'s post-redemption redirect (`window.location.assign(...)`)
  never carried the org's journey lane forward — it always sent a fresh member to bare `/talk`
  with no `?journey=`, so `/api/kira/ensure` minted their agent as `'business'` regardless of
  which org they'd just joined. Every fix in `7f19b91` (below) was correct and simply never
  reached for a real invited partner. Fixed: `/api/identity/plan` POST now returns
  `identity.organisationType`; `/plan/page.tsx` redirects to `/talk?journey=consultant` for any
  non-`client_org` lane. **FIRST THING NEXT SESSION: create a fresh test org, send a real
  invite, redeem it, and confirm via DB query that `kira_agents.journey_type='consultant'`
  this time** — this was verified BROKEN live before the fix but not yet verified FIXED.
  Full narrative + 4 other findings (business-genome tests polluting prod, QA admin identity
  was unprovisioned) in memory `project_kira_distributor_onboarding_2026-09-21.md`.
- `7f19b91` — fixed 3 gaps on the distributor-onboarding path ahead of inviting 3 real
  partners: (1) deleted the dead `research_practice` stub; (2) `getKiraPrompt` had NO branch for
  `journeyType === 'consultant'` — it fell through to `getBusinessPrompt` (the fractional-exec,
  "capture your business to sell it" persona). Added `getConsultantPrompt`. (3)
  `currentUserIsDistributor()` / `callerIsDistributor()` required an existing
  `distributor_portfolio` row to unlock the `/distributor` portal or
  `provisionClientOrganisation` — a chicken-and-egg a brand-new partner could never escape. Both
  now also recognise active membership in an `org_type='distributor'` org. (4)
  `sendInvitationEmail`'s link pointed at `/?code=` (dead) instead of `/plan?code=`. (5) new
  `InviteToOrganisationForm` on `/admin/organisations` + `inviteToOrganisationAction` — the
  missing UI to invite someone into an org Dennis just created; email copy branches by org_type
  ("Welcome to the Kira Partnership Team" for partners vs the original beta-tester copy for
  client_org). `tsc`/`eslint`/`next build` all clean; full test suite green (failures both runs
  were confined to unrelated `business-genome/*` DB-timeout flakes, confirmed passing 64/64 in
  isolation).
- `eb52352` — org_type selector on admin create-org form + latent portals bug fix.
  `portals.portal_level DEFAULT 'business'` violated its own CHECK (portfolio/project/
  distributor/client_org); every portals writer now sets `portal_level` + `journey_type`
  explicitly; migration `20260921130000` drops both defaults.
- `d5ddba0` — fixed 29 pre-existing test failures across 10 files (full suite: 1984 passed /
  0 failed). Relocated the `/plan` first-paint guard to `/business-valuation` (money-answer
  moved homes when `/plan` became the beta/identity gate).
- (earlier this month) Lane-aware /talk provisioning (`?journey=`), consultant-genome
  extraction seam from /talk interviews, portal-lane autobootstrap, chain-of-truth hierarchy.

## What's Next
<!-- Prioritised list of pending work. Updated each session. -->
- [x] **`05313cc` re-verified live, CONFIRMED WORKING (2026-09-21).** Full real-stack test:
      created a real `org_type='distributor'` org, minted a real invitation, redeemed it as a
      genuinely new person (unauthenticated → `/api/beta/redeem` → magic-link exchange →
      `/api/identity/plan`, matching the real browser flow exactly), called
      `/api/kira/ensure` with `journey=consultant`, and confirmed via DB query
      `kira_agents.journey_type = 'consultant'`. Then pulled the LIVE ElevenLabs prompt for
      that agent and confirmed it contains the consultant-partner opening line, not the
      business fractional-exec one. All test orgs/persons/agents (DB rows + real ElevenLabs
      agents) from this verification have been deleted. **Safe to invite the 3 real partners.**
- [x] Cleaned up ~150 leftover test-fixture organisations from production (`Genome Repository
      Test Org`, `Manufacturer Test`, `Plumbing Co Test`, `D1 Diag Co`, `F1 Acceptance Co`,
      etc., plus their `genome_entities`/`genome_facts`/`genome_events`/`kira_agents`/
      `organisation_memberships`/`portals`/`beta_codes` rows) — this is what was crashing the
      `/admin/organisations` invite dropdown. 9 real organisations remain.
- [ ] **Root cause still open**: `business-genome/repository.test.ts`, `extract.test.ts`,
      `e2e-validation.test.ts` use `createServiceClientV2()` — the exact same client the live
      app uses — with no separate test Supabase project or `.env.test`. Every run of that
      suite writes fresh garbage into PRODUCTION. Fixing this properly means provisioning a
      separate test Supabase project and rewiring the suite/CI — a real project, not a quick
      fix. Until it's done, running that suite (including via `vitest run` with no file filter)
      re-pollutes prod every time.
- [ ] Landing page: Dennis wants a repositioned distributor/consultant CTA — zero cost/friction
      to become a distributor (a phone call, then onboarded), no fees until they onboard a real
      paying client, and even then billing is monthly in arrears. Not started.
- [ ] `createOrganisationAction` still never sets `organisations.parent_organisation_id`.
      Deliberately left unset rather than guessed — there is no "Kira project" org row inside
      Kira's own DB to point at (that concept lives in the separate CAS `portfolio_projects`
      table), so populating it now would invent a hierarchy rather than complete one. Needs a
      decision on what the local parent chain should actually be before this is safe to fill in.
- [ ] Tighten the consultant/distributor extraction prompt
      (`lib/kira/consultant-genome-extract.ts` `EXTRACTION_PROMPT`) — lower priority now that
      the live interview asks the right questions (confirmed above).
- [ ] area_agenda firing after the genome-aware opener, and the 5 voice embeds at 375px mobile —
      both still unverified live (carried over from an earlier session).

## Blockers
<!-- Anything preventing progress. Include who/what is needed to unblock. -->
- (none) — migration `20260921130000` applied to live Supabase 2026-09-21 (defaults dropped,
  verified NULL). No known blockers.

## Key Decisions Made
<!-- Important architectural or product decisions, with rationale. -->
- `/plan` is now a beta-redemption + identity gate; the money-answer lives on
  `/business-valuation` (uses `priceForProfit`/`FULL_RATE_PERIOD_CAP` from charging constants).
- Dashboard never redirects an empty account to `/start` — it renders the outstanding
  onboarding step in place (`nextOnboardingStep`/`OnboardingGate`); `/talk?welcome=1` marks a
  just-arrived paid owner; beta converges through `/auth/callback → /plan?code=`.
- `portals.portal_level`/`journey_type` have NO valid DB default — every writer supplies them
  explicitly so an omission fails loudly (NOT NULL) rather than silently (CHECK).
- Admin-created org mints the invite journey by org_type: `client_org` → business lane, other
  lanes → consultant lane.

## Active Branches
<!-- Git branches with in-progress work. -->
- `main` — production

## Environment Notes
<!-- Deployment URLs, env vars needed, external service dependencies. -->
- Vercel: Corporate AI Solutions (scope `corporate-ai-solutions`)
- Supabase: Kira / `kmrskyewwnwettlycpfe`

## Session Log
<!-- One line per OpenCode session. Auto-appended. -->
| Date | Duration | Summary |
|------|----------|---------|
| 2026-09-21 | — | Fixed 29 pre-existing test failures; org_type selector; portals default bug fix + migration (unapplied); recorded bug knowledge |