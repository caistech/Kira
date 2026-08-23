# Project Status — Kira

> Auto-maintained by Claude Code. Read at session start, updated before session end.
> Last updated: 2026-07-31T03:00:00Z (reconstructed after an unexpected session closure —
> every claim below was re-verified live, not carried over from notes.)

## Current State
<!-- One of: ACTIVE_DEVELOPMENT | MAINTENANCE | BLOCKED | PAUSED | SHIPPED -->
**Status**: ACTIVE_DEVELOPMENT

## Session 2026-08-23 — red-team judge made pluggable (cost)

- `scripts/red-team.mjs`: new `LOCAL_JUDGE_MODEL` / `LOCAL_JUDGE_API` env vars route the WORDS
  judge to a local model (Ollama/LM Studio); `OPENAI_API_KEY` optional in that mode. Behaviour
  half + INCONCLUSIVE fail-safe untouched. Verified with `node --check`.
- Docs updated: `docs/HLD.md` (known-limitations bullet), `docs/TESTING.md` (red-team section).
- Not yet done: CI (`red-team.yml`) still hard-requires the OpenAI secret — intentional for now;
  revisit if a runner needs the free path.

## Verified as of this update (2026-07-31, end of session)

| Check | Result |
|---|---|
| Working trees | kira / orchestrator / cais-shared-services all clean, all pushed |
| Tests | **168 pass** (14 files) |
| Kira production | READY on `e880614` |
| Orchestrator production | READY on `382c2a9` |
| Live agent fleet | **11/11** carry the tool-honesty + typed-input prompt sections, verified independently |
| Voice | ✅ **operator-verified working** — reads naturally, recalls context, handles interruption |
| Text transport | ✅ **verified end to end** against production (auth, continuity, persistence, refusals, distil) |
| Share gate | ⛔ **CLOSED** — Ray failed round 4 |

## What was done this session

- Task mirror gap closed (`await` + a discovery pass); 3 lost tasks recovered live.
- Contact lookup built in the orchestrator; Drive + Contacts connected and granted.
- Valuation persistence, provenance, and the builder industry-matcher fix.
- Sign-in chrome: one Kira, business-named, marketing header and cross-sell removed.
- Genome: entity split (52 AI-business memories parked), register rewrite, headlines, coverage
  bands, "Still only in your head".
- Typing to Kira built and proven; the spoken welcome-back fixed.
- Two prompt sections applied to all 11 agents: never claim a check you did not make, and typed
  messages arrive as ordinary turns.
- Docs: `CONNECTOR_POLICY.md`, `CAPTURED_ASKS.md`, `OPEN_ITEMS.md`.

## What's Next

**START HERE: `docs/OPEN_ITEMS.md`** for everything outstanding, and `docs/CONNECTOR_POLICY.md` for
how to decide what gets built next.

**The immediate task — half-built, deliberately, at a clean line.** The orchestrator endpoint
`GET /v1/tenants/:tenantId/lookup?kind=drive|contacts&q=` is built and deployed (`382c2a9`); Kira has
nothing calling it. Remaining: tool webhook routes under `app/api/kira/webhooks/`, tool definitions
following `lib/kira/swarm/doing-tools-def.mjs`, a **gated** prompt section, wiring that section into
`scripts/patch-agent-capabilities.mjs`, then **deploy → reprovision → patch** in that order, then
verify against the live fleet rather than trusting the 200.

The other headline items:

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
