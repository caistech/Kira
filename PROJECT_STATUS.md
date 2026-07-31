# Project Status — Kira

> Auto-maintained by Claude Code. Read at session start, updated before session end.
> Last updated: 2026-07-31T03:00:00Z (reconstructed after an unexpected session closure —
> every claim below was re-verified live, not carried over from notes.)

## Current State
<!-- One of: ACTIVE_DEVELOPMENT | MAINTENANCE | BLOCKED | PAUSED | SHIPPED -->
**Status**: ACTIVE_DEVELOPMENT

## Verified as of this update

| Check | Result |
|---|---|
| Working tree / branch | `main`, clean, nothing unpushed, no stashes |
| Tests | **139/139 pass** (11 files, `npx vitest run`) |
| Kira production | `dpl_C6Ztif6J4BLnfSw3a8Fg4FVeqkyn` **READY**, commit `8e226ae` = `origin/main` |
| Orchestrator production | `dpl_95r25ezSU9MrusPWQ3pzUKNtYLLw` **READY**, commit `a4650f9` = `origin/main` |
| `business_identity` in prod DB | **exists and populated** for the owner, `synced_to_orchestrator_at` stamped |

⚠️ Both repos ARE deployed. Older notes (incl. memory) said "neither repo is deployed yet" — that
was true when written and is not true now.

## What Was Just Done

The 29–31 July arc is one thread: **the owner asked Kira for things and nothing was sent.** Each
layer of that was a separate defect and each is now closed except the mirror.

- **2026-07-31 — Whose name is on the email (`f57bc82`, Kira) + `PUT /v1/tenants/:id/identity`
  (`f7a4775`, orchestrator).** `drainEmailOutbox` refuses to send without a tenant sender identity
  (Spam Act footer, REGULATORY_INCLUSIONS I6) and **nothing had ever collected one** — dispatch
  auto-provisions a tenant from an id and a name, so this was NULL for every future customer, not
  just the owner. `/setup/business` now gates the dashboard, writes `business_identity`, and pushes
  across the seam; `synced_to_orchestrator_at` is stamped only on a confirmed 200. Owner's row is
  now filled: *The Trustee for Factory2Key Unit Trust*, ABN 51700805298, reply
  `dennis@factory2key.com.au`.
- **2026-07-31 — Drive connect (`31b6e6e` Kira / `a824c55` orchestrator) and Settings → Connected
  accounts (`8e226ae` / `a4650f9`).** Tokens live in the orchestrator alongside the Xero ones —
  neither product holds the other's service-role key — so only the *fact* of a connection crosses
  the seam, never a credential. The status endpoint reports **granted** scope, not requested, and
  `null` renders as "we could not find out" rather than "not connected".
- **2026-07-31 — Drain unpinned + address guard (`ea5eb75`, orchestrator).** `/api/cron/drain` was
  hardcoded to `SEED_TENANT`, so no real customer's mail was ever drained; 13 `done` rows were seed
  traffic and made the system look healthy. Now drains every tenant, each in its own try/catch.
  `usableRecipient` refuses the spelled-aloud shape (`m-c-m-d-e-n-n-i-s@gmail.com`).
- **2026-07-30 — The status blob (`5611585`).** `/api/cron/reconcile-tasks` wrote the whole
  `TaskStatus` object into `kira_tasks.status`; its guard compared an object to a string so it
  rewrote the same damage every 20 min. Fixed with `live.status`, an `asTaskState()` runtime
  validator replacing three bare casts, a CHECK constraint applied to prod, and a "Still open"
  section on `/admin/asked-for` (which read only `unsupported`+`failed` — the reason the rows were
  invisible even after their status was correct).
- **2026-07-30 — First real client email went out**, incl. the $60,000 + GST quote for Trinh, with
  Resend provider ids and the completion callback landing `done`. Its formatting defects (run-on
  body, subject printed inside it, **no Reply-To** so client replies went to a mailbox belonging to
  neither party) fixed in `33c3682`.

## What's Next

**The full, current list is `docs/OPEN_ITEMS.md`** — written 2026-07-31 and kept there so it is not
buried in a status file. The headline items:

- [ ] **Verify a Factory2Key sending domain in Resend** (a DNS change on a *subdomain*, not website
      access) and resolve `from` per tenant — F2K mail currently shows a corporateaisolutions.com
      From address under a Factory2Key footer.
- [ ] **Re-run naive-tester and record the pass.** The production URL stays share-blocked until then.
- [ ] **Operator decisions:** the one refused Genome rewrite, three unplaceable memories, the four
      tasks awaiting approval (approving sends under F2K's ABN), and Roger's email address.
- [ ] **Prove live:** contact lookup by voice, the genome-classify sweep, a valuation carrying into
      an account across a closed tab, one full doing-loop round trip.

## Blockers
- **Owner decision, not code:** Roger's email address for the Lot 109 contour-survey quote.
- Nothing else blocking; both prod deploys are green.

## Key Decisions Made
- **Sender identity is a dedicated endpoint, not a field on `DispatchRequest.context`.** Whose name
  is on the email is decided once by a human against the register; carried on every dispatch it
  becomes a value that drifts, and the failure mode is mail going out under the wrong ABN.
- **Credentials never cross the Kira ↔ orchestrator seam.** Google and Xero refresh tokens are
  standing access to a business's documents and finances, so the orchestrator holds them and only
  the *fact* of a connection is returned — explicit column list, never `select *`.
- **The tenant is a signed claim, not a query parameter** on the Drive connect route (`/api/*` sits
  outside the middleware matcher, so a bare `?tenant=` would be reachable by a stranger).
- **`kira_tasks` is a read model.** Approval and send state are decided from the orchestrator; Kira's
  table is what the owner's surfaces are built on and is never authoritative.
- **Valuation figures stay off disk** (`sessionStorage`) — a privacy call, which is why finding 1 is
  a copy-vs-storage conflict to resolve deliberately rather than a bug to switch.

## Active Branches
- `main` — clean, all commits pushed, deployed to production on both repos.

## Environment Notes
- Kira prod: `kira-rho.vercel.app` · project `prj_itVurDE9CD77K9rGWEQZNDmn33yz` · team
  `team_hwN7IFtd2Fo3DCj9C67ZwI1t`. Supabase `kmrskyewwnwettlycpfe`.
- Orchestrator prod: project `prj_jHqRPUYBJhnlI9CSGNf35iYALocL`, same team. Supabase
  `xuzvurmprexhalnxgsdu` (tables `tasks` + `effects`; `effects.kind`/`request`, **not** `type`).
- The local `vercel` CLI token (`~/.vercel-token`) is scoped to `mcmdennis-7206s-projects` and
  **cannot read these projects** — use the Vercel MCP tools with the ids above instead.
- QA credentials come from `cais-shared-services/.secrets/qa-secrets.json` at run time — never
  copied into this repo.

## Session Log
| Date | Duration | Summary |
|------|----------|---------|
| 2026-04-18 | ~1h | ConvAI model migration verified end-to-end; 7 call sites on `eleven_flash_v2` |
| 2026-07-30 | — | Status-blob bug fixed (validator + CHECK constraint + "Still open" panel); first real client emails sent incl. the $60k Trinh quote |
| 2026-07-31 | — | Business identity collected + synced across the seam; Drive connect both sides; Settings → Connected accounts; drain unpinned from SEED_TENANT; **session closed unexpectedly after `8e226ae`** |
| 2026-07-31 | — | Status reconstruction: tests 139/139, both prods verified on `main`, mirror gap re-measured (4 awaiting vs 1 mirrored) |
| 2026-07-31 | — | Mirror gap CLOSED (await + discovery pass; 3 lost tasks recovered live). Contact lookup built both sides. Valuation persistence. Sign-in chrome: one Kira, business-named, cross-sell removed. Genome register + entity split (52 AI-business memories parked, 44 rewritten). Migration ledger reconciled 39/39 |
