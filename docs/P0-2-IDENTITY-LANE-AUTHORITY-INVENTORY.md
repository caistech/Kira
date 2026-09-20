# P0-2 — IDENTITY, LANE AND AUTHORITY HARDENING: IMPLEMENTATION INVENTORY

Status: **AUDIT COMPLETE. NO CODE OR SCHEMA CHANGES YET.**
Date: 2026-09-20
Auditor: OpenCode (Kira engineering operator)

---

## 0. SESSION-SCOPE DETERMINATION

Canonical identity chain (deterministic, one path):

```
Auth user (jwt.sub)
  → auth_credentials (auth_user_id = jwt.sub, status='active')
  → persons (person_id)
  → organisation_memberships (person_id, status='active', valid_to null/future)
  → organisations (organisation_id)
  → selected_org_id override (only if the person has an ACTIVE membership for it)
```

Platform/functional role distinction:

- `admin` = platform authority (platform administration, provisioning, governance)
- `ceo` = functional/business owner role (org-level knowledge/data authority)
- subordinate users = org members, NOT CEO authority

There is no `owner` UI role. `owner` exists only in RLS policy tiers alongside `admin` (compat).

---

## 1. A1 — LEGACY `users` IDENTITY AUTHORITY

Current state: `kira_agents.user_id` is `NOT NULL REFERENCES users(id)`; `UNIQUE(user_id, journey_type)`; and `kira_agents_person_scope` migration added `person_id` + dropped the org unique index + replaced it with `kira_one_active_agent_per_person_journey (person_id, journey_type) WHERE status='active'`. **Both unique indexes CANNOT coexist long-term** (the person-scope migration did NOT drop the original `UNIQUE(user_id, journey_type)`).

The `organisations.id = users.id` bridge exists in p05 backfills (`UPDATE ... SET organisation_id = user_id` crutch) and function `get_organisation_id_from_user` returns `p_user_id`. Legacy comment: `UUID reuse: organisations.id = users.id (migration convenience only)`.

### Complete file inventory of `users` reads (26 files)

| # | File | Line | What it does | Class |
|---|---|---|---|---|
| 1 | `app/api/kira/ensure/route.ts` | 148 | Resolve legacy id for `kira_agents.user_id` FK on mint | **MIGRATE** (write `user_id = person_id`-mapped legacy value only while FK stays; primary key = person) |
| 2 | `app/api/kira/create/route.ts` | 113 | Same legacy-id resolution for agent mint | **MIGRATE** (same) |
| 3 | `app/api/kira/chat/text/route.ts` | 277 | Agent ownership check against `users.id` | **MIGRATE** → `orgContext.personId` (canonical) |
| 4 | `app/drafts/page.tsx` | 59 | Resolve `users.id` then map to membership | **MIGRATE** → `getCurrentOrganisationContext()` personId directly (kills the bridge dependency) |
| 5 | `app/drafts/[draftId]/page.tsx` | 36 | SAME — the per-draft owner gate | **MIGRATE** → canonical personId |
| 6 | `app/settings/page.tsx` | 45 | Billing/subscription metadata read | **COMPATIBILITY** — documented boundary (stripe/subscription cols live on `users`); NOT identity authority |
| 7 | `app/settings/actions.ts` | 17,48 | `updateProfile` + `updateNotifications` write `users` | **MIGRATE**: profile→persons (already writes persons too, keep both for now); notifications→keep `users` field (COMPATIBILITY) until migrated to persons/credentials |
| 8 | `app/api/identity/plan/route.ts` | 665,679 | Resolve user→legacy id by auth_user_id/email for FK joins | **MIGRATE** → persons via auth_credentials |
| 9 | `app/api/onboarding/complete/route.ts` | 130,181 | Cross-table legacy user lookup | **MIGRATE** |
| 10 | `app/api/billing/cancel/route.ts` | 34,52 | Subscription metadata | **COMPATIBILITY** (billing still on users) |
| 11 | `app/api/billing/portal/route.ts` | 28 | Subscription metadata | **COMPATIBILITY** |
| 12 | `app/api/billing/usage/route.ts` | 39 | Usage/plan metadata | **COMPATIBILITY** |
| 13 | `app/api/beta/redeem/route.ts` | 106,127,144,167,892 | Beta code redemption | **COMPATIBILITY** (beta is legacy marketing surface) |
| 14 | `app/api/cron/reconcile-tasks/route.ts` | 138 | Legacy aggregation | **COMPATIBILITY** |
| 15 | `app/api/cron/reengagement-emails/route.ts` | 49,97 | Email campaign recipients | **COMPATIBILITY** |
| 16 | `app/api/cron/trial-ending/route.ts` | 46,109 | Trial notifications | **COMPATIBILITY** |
| 17 | `app/api/genome/share/route.ts` | 57 | Recipient legacy lookup | **MIGRATE** |
| 18 | `app/api/kira/email/send-kira-ready/route.ts` | 81 | Recipient email lookup | **MIGRATE** |
| 19 | `app/api/unsubscribe/route.ts` | 45 | Email unsubscribe | **COMPATIBILITY** |
| 20 | `app/admin/(panel)/page.tsx` | 30 | Platform admin list | **COMPATIBILITY** (admin THEATER — platform role gated by ADMIN_EMAILS) |
| 21 | `app/admin/(panel)/exec/[userId]/page.tsx` | 16 | Admin user drilldown | **COMPATIBILITY** (admin theater) |
| 22 | `lib/kira/swarm/stub.ts` | 334,375,394 | Orchestrator legacy user resolution | **MIGRATE** (agent ownership) |
| 23 | `lib/kira/swarm/orchestrator-adapter.ts` | 127 | Legacy user resolution | **MIGRATE** |
| 24 | `lib/introducer/index.ts` | 323,333 | Introducer cross-table | **MIGRATE** |
| 25 | `lib/genome/derive.ts` | 626 | Genome derivation | **MIGRATE** |
| 26 | `lib/voice-agent-checks.ts` | 70 | Voice config legacy lookup | **MIGRATE** |

### users-CATEGORY 2 keeps (explicit compat, isolated)
Billing (cancel/portal/usage), beta redeem, crons (3), unsubscribe, admin theater (2). These are **not identity authority** — they read subscription/email metadata that lives on `users`. They stay until the billing migration to org-scoped subscriptions. Document at each site.

---

## 2. A2 — IDENTITY RESOLVER INVENTORY

| Resolver | What | Source of truth | Session authority | Fallback | Verdict |
|---|---|---|---|---|---|
| `getAuthUser()` (lib/auth.ts:98) | Supabase auth user | `auth.getUser()` cookie | YES | none | **KEEP** (top of chain) |
| `getCurrentAppUser()` (lib/auth.ts:~370) | Canonical person shell | auth_credentials→persons | YES | null | **KEEP** (person shell used by UI) |
| `getCurrentOrganisationContext()` (lib/auth.ts:581) | person+org+membership+role+portalAccess | auth_credentials→membership→org | YES | null | **KEEP — THE canonical resolver** |
| `resolveOrganisationFromUser(userId)` (lib/auth.ts:864) | Org context from auth_user_id | same chain | YES | null | **WRAPPER** (keep; documented thin) |
| `resolveOrganisationForPerson(personId)` (lib/auth.ts:931) | Org from person | membership | caller-trusted input | null | **KEEP with precondition**: input MUST come from canonical source (the only callers: genomic actions) |
| `getSuperadminContext()` | Person + YES/NO platform admin | persons + ADMIN_EMAILS | YES | null | **KEEP** (platform tier) |
| `getDistributorContext()` | Legacy distributor row | distributor_portfolio | YES | null | **VERIFY** — legacy second model (A8). Keep only if genuinely used, else remove. |
| `getUserOrganisations()` | all memberships for list | membership | YES | [] | **KEEP** (org switcher) |

**Action:** no new resolver. All page loaders/actions that need org context call `getCurrentOrganisationContext()`. Kill `resolveOrganisationFromUser` OR fold to a documented 1-liner if found redundant. No independent identity invention anywhere.

---

## 3. A3 — CONSULTANT / DISTRIBUTOR LANE MODEL

### Exact canonical model (defined before any schema change)

**Ownership:**
- EVERY agent row owns to a `person_id` (active agents MUST have non-null person_id — existing CHECK).
- `user_id` remains a legacy FK column for the transition, backfilled/written to the mapped legacy `users.id` where it must remain for FK integrity, but is NEVER identity authority. New rows: `person_id` is authoritative.
- `organisation_id` is present (p05) and reliable for org scoping of conversations/agents.
- One active agent per person per journey — `kira_one_active_agent_per_person_journey` is the canonical unique index.

**Journey types (THE model):**
```
business      — an organisation owner/executive (the classic CEO-lane Kira)
consultant    — a consultant running their own client business (darren-cron lane)
distributor   — a distributor provisioning organisations below (kira-exec lane)
personal      — KEEP as legacy-deprecated journey value, never minted (business-only since 2026)
```

`journey_type` becomes `TEXT` free-form OR a CHECK extended to the four values. **Decision: relax the CHECK to `('personal','business','consultant','distributor')`** — smallest change that lets the runner and ensure mint consultant agents. No separate tables for lanes; lane is an attribute of `kira_agents.journey_type` + `organisations.org_type`.

**Lane resolution rule (§6):** the user's lane is the `journey_type` of their resolved own agent (resolveCanonicalKiraAgent already returns it). If no own agent → KiraBootstrap/ensure path, which provisions according to org_type of the resolved org (business default; consultant when org_type='consultant'). `/talk` stays the single entry seam; `?journey=` is NEVER authority — it is only a deep-link hint that the resolver validates against the member's actual lane.

### Schema delta (migration 3) — VERIFIED live 2026-09-20

Live state confirmed via migration ledger:
- `UNIQUE(user_id, journey_type)` **already dropped** (20260830170000 dropped the constraint + index, created org-scoped `kira_one_active_agent_per_org_journey`; 20260907090000 replaced that with person-scoped `kira_one_active_agent_per_person_journey (person_id, journey_type) WHERE status='active'`). **No unique-constraint work needed.**

REMAINING schema work:
1. Relax `kira_agents.journey_type` CHECK → `('personal','business','consultant','distributor')`.
2. `ALTER TABLE kira_agents ALTER COLUMN user_id DROP NOT NULL` — new consultant agents minted via person_id with nullable legacy user_id. FK to `users` stays (compat).
3. Backfill consultant orgs' agents: none exist yet — runner mints them.
4. Confirm `consultant_frameworks.framework_type` CHECK includes `'consulting'`.
5. RLS on `consultant_frameworks`, `consultant_genomes` — DONE (P0-1 migration).

---

## 4. A4 — FALLBACK / ARBITRARY AGENT PICKERS

| # | Site | Finder | Fallback behaviour | Class |
|---|---|---|---|---|
| 1 | `lib/kira/resolve-agent.ts:95-107` | person-scoped | `firstBusiness ?? first active` (own agents ONLY), then `reason:'none'` | **KEEP** — already hardened. Fix stale header comment (lines 16-17 still describe org-fallback). |
| 2 | `app/requests/page.tsx:69` | org-wide | `find(business) ?? [0]` — **FIRST ARBITRARY ORG AGENT** | **MIGRATE** → `resolveCanonicalKiraAgent` |
| 3 | `app/api/kira/research/route.ts` (conversation keying) | conversation.user_id | None (org check present) | VERIFY lax: confirm 403 on cross-org session |
| 4 | `app/api/kira/agent/route.ts:47` | elevenlabs_agent_id | single | **KEEP** (org-scoped gate present: `agent.organisation_id === orgContext.organisationId`) |
| 5 | `app/api/kira/chat/start/route.ts:47` | elevenlabs_agent_id | single | **KEEP** (org-scoped gate present) |
| 6 | `app/api/kira/chat/text/route.ts:277` | legacy users.id compare | falls back to admin allow | **MIGRATE** → person compare |
| 7 | `components/KiraShapeSection.tsx:50` | canonical | none (uses resolver) | **KEEP** |
| 8 | `app/talk/page.tsx:54` | canonical | none | **KEEP** |
| 9 | `components/KiraShape.tsx` client | agentId from section | — | **KEEP** |
| 10 | `lib/kira/convai.ts:289` | agent.user_id legacy | `return { userId: agent.user_id }` when no caller | **COMPATIBILITY** (webhook no-session path); tighten later |
| 11 | `lib/kira/knowledge-tool.ts`, `recall.ts`, `memory-contract.ts` | conversation.user_id | person-scoped reads | VERIFY person vs org scoping |

**Rule:** any picker doing `find(...) ?? agents[0]` or `?? list[0]` on org-won agents is a violation. Net migrations: requests/page.tsx, chat/text ownership, plus UNKNOWN-lax lines in research + the three kira library modules (verify person scope).

---

## 5. A5 — ADMIN vs CEO vs SUBORDINATE MATRIX

| Operation | Required role | Current enforcement | Delta |
|---|---|---|---|
| Manage organisational Kira (manage/kira) | superadmin **or** org CEO | `getSuperadminContext` only | **MIGRATE** → also allow org ceo (orgHandler role `ceo`/`owner`) |
| Org settings/config (manage/settings) | superadmin or org CEO | `getSuperadminContext` | **MIGRATE** |
| Manage members (manage/members) | superadmin or org CEO | page-level role check | verify |
| /team | `['admin','superadmin']` membership role | team/page.tsx:19 | **MIGRATE** enforce server-side; add ceo |
| Knowledge write (upload/url/ingest) | CEO/org authority | present? upload route org-gates (person) | **MIGRATE** add CEO-tier check for authoritative org rows |
| Genome writes (my-genome actions) | caller themselves | `resolveOrganisationForPerson(authUser.id)` | **KEEP** (self-referential, correct) but swap to canonical context |
| Admin panel (15 pages) | platform admin allowlist | `isCurrentUserAdmin` (ADMIN_EMAILS) | **KEEP** |
| Beta/admission | platform admin | same | **KEEP** |
| Discover/outreach cron | platform | cron | **KEEP** |

**Delta:** add a canonical server-side `requireOrgCeo()` helper = orgContext + membership role in (ceo, owner, admin) → gateway for manage/kira, manage/settings, manage/members, team, knowledge authority writes. Subordinate staff get NO inheritance — knowledge contributions from non-CEO become a future governed workflow (explicitly out of scope, documented).

---

## 6. A7/D4 — SERVICE-CLIENT + SERVER-ACTION INVENTORY

### Session-scoped conversion candidates (RLS covers them — org-scoped policies verified present)

`app/knowledge/page.tsx`, `app/dashboard/page.tsx` (agent/conversation reads), `app/requests/page.tsx`, `app/drafts/*`, `app/settings/page.tsx` (billing split), `app/talk/page.tsx`, `components/KiraShapeSection.tsx`, `app/genome-knowledge/*`, `app/my-genome/[area]/actions.ts`, `app/manage/*` loaders, `app/team/page.tsx`.

These convert `createServiceClientV2()` reads to `createSessionClientV2()`; RLS (`auth_user_has_organisation_access`) enforces org + membership. Read-only loaders first; write actions only after role gate added (D4).

### Genuinely privileged (service-clIENT KEEP, MUST carry explicit auth check)

`api/kira/ensure`, `api/kira/create`, `api/kira/chat/start`, `api/kira/chat/text`, `api/kira/agent`, webhooks (operational tools — signed-secret), `api/cron/*` (8), `api/billing/*` (3), `api/beta/redeem`, `admin/*` theater (15), `api/members/*`, `api/owner/provision`, `api/onboarding/complete`, `api/genome/*`, `api/identity/plan`.

`createServiceClientV2` is **not** being mass-replaced (≈90 sites). It is replaced only at the listed session-conversion loaders, and at privileged call sites an explicit authority check must precede access (A5 helper).

### D4 — server actions requiring authority

All actions under `app/*/actions.ts`: `settings/actions.ts` (profile/notifications — self), `my-genome/[area]/actions.ts` (self genome — OK), `admin/(panel)/*/actions.ts` (platform admin — gate with `isCurrentUserAdmin`), `manage/*` if present.

**Rule:** no server action trusts body/params for who. Every action: `getCurrentOrganisationContext()` + (required role) → object ids come from params/form only to *identify*; permission always from session.

---

## 7. DEPENDENCY ORDER

```
1. SCHEMA (migration 3): drop UNIQUE(user_id,journey_type); relax journey CHECK; user_id nullable.
     UNBLOCKS: A3 consultant minting, A1 agent-mint paths, runner live run.
2. RESOLVER CONSOLIDATION (A2): no new resolver; standardise page/action calls to
     getCurrentOrganisationContext(). Low risk, done with the A1 sweeps.
3. A1 MIGRATIONS (ownership paths): ensure/create/chat-text/identity-plan/onboarding/genome-share/
     send-kira-ready/swarm stub+adapter/introducer/derive/voice-agent-checks — swap to canonical person.
4. A4 PICKERS: requests/page.tsx, chat/text ownership; verify research + knowledge-tool/recall/
     memory-contract; fix resolve-agent header comment.
5. A5 ROLE MATRIX: requireOrgCeo() + gate manage/kira, manage/settings, manage/members, team,
     knowledge-authority writes. + add orgCeo tier to RLS manage policies if needed.
6. A7 SESSION SWEEPS: convert listed loaders to createSessionClientV2 (RLS-covered). Actions
     keyed with role gate from #5.
7. TESTS (below per directive §11). 8. BUMP + commit + push + Vercel verify.
```

## 8. ACCEPTANCE TESTS (vitest, behaviour not strings)

- identity: auth→person→membership deterministic; org substitution fails (403); 401 where no session
- agent: own resolves; no fallback to another person's agent; org mismatch fails
- roles: ceo op succeeds for ceo; subordinate denied; admin platform-only; client-supplied role cannot elevate
- consultant/distributor: lane = own agent journey_type; client org distinct; lane never silently becomes ceo
- legacy users: production identity path independent of `users`
- service client: org read RLS-session-scoped; privileged op requires explicit authority
- server actions: unauthorised org/role fails; client-supplied identity cannot override session

## 9. RISKS / ROLLBACK

- **RISK (highest: RESOLVED):** dropping `UNIQUE(user_id, journey_type)` — already done in prior migrations (person-scoped index live). Nothing to roll back.
- **RISK:** relaxing journey CHECK doesn't affect data; `user_id DROP NOT NULL` is backward-compatible (old rows keep user_id). Rollback = re-add NOT NULL after backfill.
- **RISK:** relaxing CHECK doesn't affect data; `user_id DROP NOT NULL` is backward-compatible (old rows keep user_id). Rollback = re-add NOT NULL after backfill.
- **RISK:** settings billing split could regress stripe display → keep legacy read isolated behind try/catch documented degrade.
- **RISK:** member/team role relax could open manage surface to a member → requireOrgCeo() is per-session org-checked, never derived from client.
- **RISK:** session-scoped sweep could surface latent RLS gaps at runtime → run against live, smoke the five journeys (login → identity → org → lane → agent → /talk → dashboard).
- Rollback of any file change = revert commit + redeploy; schema rollback = apply inverse migration only if no data written post-push.

## 10. OUT-OF-SCOPE (documented)

- Billing org-scoped subscription migration (keeps `users` for billing metadata)
- Beta/email-campaign/cron legacy `users` reads (Category 2)
- New knowledge contribution workflow for subordinate staff (documented future)
- Redesign of portal UI