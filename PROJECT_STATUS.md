# Project Status — Kira

> Auto-maintained by OpenCode. Read at session start, updated before session end.
> Last updated: 2026-09-21

## Current State
<!-- One of: ACTIVE_DEVELOPMENT | MAINTENANCE | BLOCKED | PAUSED | SHIPPED -->
**Status**: ACTIVE_DEVELOPMENT

## What Was Just Done
<!-- Updated at end of each session. Most recent first. -->
- **(uncommitted)** — fixed 3 gaps on the distributor-onboarding path ahead of inviting 3 real
  partners: (1) deleted the dead `research_practice` stub; (2) `getKiraPrompt` had NO branch for
  `journeyType === 'consultant'` — it fell through to `getBusinessPrompt` (the fractional-exec,
  "capture your business to sell it" persona), so every partner's first /talk call opened with the
  wrong pitch entirely. Added `getConsultantPrompt`. (3) `currentUserIsDistributor()` /
  `callerIsDistributor()` required an existing `distributor_portfolio` row to unlock the
  `/distributor` portal or `provisionClientOrganisation` — a chicken-and-egg that meant a brand-new
  partner could never reach either. Both now also recognise active membership in an
  `org_type='distributor'` org. (4) `sendInvitationEmail`'s link pointed at `/?code=` — the
  redemption surface is `/plan?code=`, so every invitation email sent through this system linked to
  the marketing homepage and silently dropped the code. Fixed. Confirmed `NEXT_PUBLIC_APP_URL` is
  correctly `https://kiraexec.com` (a wrong-host variant of this same bug was flagged earlier today
  and appears already resolved). (5) `/api/admin/invitations` always minted into the CALLER's own
  org context — no way to invite a partner into a distributor org created via `/admin/organisations`.
  Now accepts an optional `organisationId` override, gated on `isCurrentUserAdmin()` (not just org
  membership) to avoid a cross-tenant mint. **Not yet wired into any UI** — usable via direct POST
  today; `/admin/organisations` has no "invite" affordance yet. `tsc --noEmit` clean, targeted tests
  green (36/36); full suite not re-run this pass.
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
- [ ] **Before inviting the 3 partners**: add an "Invite" affordance to `/admin/organisations`
      (email + first/last name field, posts to `/api/admin/invitations` with the new org's
      `organisationId`) so Dennis doesn't have to hand-craft the POST. The API side is done.
- [ ] Send-invitation email copy still says "Kira Beta Testing Programme" — fine for a beta
      tester, wrong register for a partner being onboarded as a distributor. Worth a distinct
      template/subject line before the 3 sends, not functionally broken.
- [ ] `createOrganisationAction` never sets `organisations.parent_organisation_id` — the
      chain-of-truth hierarchy column exists (migration `20260921000000`) but nothing populates
      it, so distributor orgs aren't actually linked under a parent. Nothing reads this column
      yet (feeds unbuilt truth-comparison/memory-push features), so not blocking, but cheap to
      fix now while it's fresh.
- [ ] Not yet verified live: does completing `/talk?journey=consultant` actually land the new
      partner with an active `organisation_memberships` row in the org Dennis created for them?
      Traced the identity/plan code path but did not walk it end-to-end in a browser — this is
      the one link in the chain that's reasoned-through, not observed.
- [ ] Tighten the consultant/distributor extraction prompt
      (`lib/kira/consultant-genome-extract.ts` `EXTRACTION_PROMPT`) so a distributor interview
      is not forced into a "consultant-with-methodology" shape. Lower priority now that the live
      interview itself asks the right questions — a thin answer here degrades gracefully (nulls),
      it doesn't feel wrong to the partner the way the old prompt did.
- [ ] area_agenda firing after the genome-aware opener, and the 5 voice embeds at 375px mobile —
      both still unverified live (carried over from the previous session).

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