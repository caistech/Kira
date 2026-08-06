# Build register — Kira

> ## L. 2026-08-05 — what closed, and what this day changed
>
> **⚠️ SEVERAL ROWS IN THIS FILE WERE STALE AND STEERED AWAY FROM THE CORRECT ACTION.** K1 and K2 were
> marked open after being fixed; the LLD warned against a valuation re-weighting that had been done
> two days earlier; the nine-area row said unbuilt when `areas.ts` had shipped it. Found by re-reading
> the register against `git log`, not by anyone noticing. **Check the code before trusting a row here.**
>
> **The reported problem** — "she is drifting, no recollection of the Lot 442 conversation, talking
> over me" — resolved into three causes, none of them the model. Full account: `docs/DRIFT_AND_GUARDS.md`.
>
> | Closed | |
> |---|---|
> | Recall showed **10 of 91** memories, importance-ordered; 71 unreachable | union of importance + recency lanes, `none` excluded. Live, verified on the real agent |
> | Prompt asserted a **January signup snapshot** as fact ("diesel injectors") | removed from the prompt entirely — a caveat had already been tried and failed |
> | `recall_memory` had **no observable trigger** | rewritten; the description is the enforcement point, not the prompt |
> | Prompt named **three tools that do not exist** | tool list generated from the attached set; `tool-manifest.mjs` is the one list |
> | Persona upgrade **silently no-op for six months** | heading-anchored span replace; `unreachable` now counts as a failure |
> | **K1** handover carried private notes · **K2** fake ABN accepted | both were already fixed; rows were stale |
> | **A1–A4** valuation overclaim | fixed 08-03/04. Landing carried pre-correction figures for two days — gap overstated **2.25×** — now pinned to the calculator by a test |
> | **No write path** — everything terminated in our database | renderer → `file_manual` → orchestrator → Drive. **Verified with ten real documents, updated in place on re-run, read back out** |
>
> | New / still open | |
> |---|---|
> | **B4 deactivation** | now **commercially load-bearing**: the step-down trigger needs its denominator |
> | **K3a** pre-`genome_about` rows | unreachable by the guard; needs the reviewed re-classification pass |
> | **K19** checksum-valid but fake ABN | narrower than first written — the manual box is a genuine fallback |
> | **Owner-copy filing** | only the buyer copy has ever been filed to Drive |
> | **`sde-multiples.ts` is US data** | an AU broker quoted 1–1.5× for trades; AU bands by niche is the highest-value input outstanding |
> | **`patch-agent-capabilities.mjs` must NOT be run** | it reorders sections and puts live prompts back out of step with source |
> | **Nothing is validated by a customer** | zero stored valuations; one active subscription, the operator's own |
>
> **Decisions of record now live in `docs/DECISIONS.md`** — the project framing, the ⅓ narrow maintain
> rate, the valuation band, no-vendor-lock, and the Drive scope default.

> **Every open item, in one place, with what blocks what.** Written 2026-08-02 because the same
> things kept being raised, agreed, skipped, and rediscovered a fortnight later — usually because
> they were recorded in a naive-tester report, a memory file, a code comment or a chat message, and
> no single surface held all of them at once.
>
> **The rule that keeps this honest:** an item leaves this file only when it is *done and observed*,
> not when it is *built*. Kira's recurring failure mode is a correct edit that is silently defeated
> downstream, so "shipped" and "working" are separate columns on purpose.
>
> **The rule that stops it becoming a graveyard** *(operator, 2026-08-02)*: **close items one at a
> time, and close them NOW unless something genuinely blocks them.** If an item surfaces mid-session
> and nothing depends on it, resolve it rather than adding a row — recording is a cost, not progress,
> and a queued item that keeps being deferred never closes. B12 was found while closing B1, filed,
> and then closed in the same session under this rule: twenty minutes, and it removed a live defect
> from a real conversation path. Only a genuine dependency (the `Blocked by` column) justifies
> queuing. **One theme per session** — that is what makes closing one at a time affordable.
>
> **Sources swept:** `OPEN_ITEMS.md`, `NEXT_SESSION.md`, `GENOME_BUYER_FORMAT.md` §8,
> `naive-tester-reports/2026-08-01-ray/ray.md`, the project memory files, a live audit of the
> ElevenLabs fleet, the prod database, and a real export pulled from the synthetic QA identity.

**Type** — `BUG` broken now · `MISS` needed and absent · `DEC` needs Dennis · `PROVE` built but never
observed working · `DEBT` works but overclaims or will bite.
**Sev** — `1` blocks a client or a demo · `2` blocks the next build · `3` real but survivable · `4` noted.

---

## A. The valuation model — the credibility problem

Raised 2026-08-02 by an external read of the valuation PDF, then confirmed against the code. The
model exceeds its own cited source, and the transferability score *is* the multiple rather than
sitting beside it.

| ID | Item | Type | Sev | Blocks | Detail |
|---|---|---|---|---|---|
| **A1** | Multiples inflate above the cited dataset | DEBT | **1** | broker channel | `ceiling = min(8, sector × 1.6 + sizePremium)`. A&E at $3M SDE → 6.67×; hardware at $3M → 7.60×. `sde-multiples.ts` says the BizBuySell range is ~1.5–6.6× *across all sectors*. The model can exceed its own source on size alone. |
| **A2** | No micro-SME discount; the size adjustment only adds | DEBT | **1** | A1 | `sizePremium = clamp(log10(profit/250k) × 2, 0, 3)` — zero below $250k SDE, never negative. Market practice discounts small businesses 20–30% for illiquidity. We do the opposite at the top and nothing at the bottom. |
| **A3** | Size premium widens the ceiling only, never the floor | DEBT | **1** | A1 | So the *gap* — the number the product sells on — grows super-linearly with profit. The model overclaims hardest for exactly the businesses big enough for a broker to look at. |
| **A4** | Transferability score drives the valuation (§6 violation) | DEBT | **1** | Genome buyer view | `applied = floor + readiness × spread`. §6 requires the score never read as a second valuation; it is not a second number, it is the *same* number. A broker who discounts the valuation discounts the scorecard with it. |
| **A5** | SDE vs EBITDA never disambiguated on screen | DEBT | 2 | — | SDE multiples are *lower* than EBITDA multiples for the same business, so "6.6×" reads better than it is. Nothing on the page says which is which. |
| **A6** | Walk-away is the raw `tangibleAssets` input | DEBT | 3 | — | `walkAway = inputs.tangibleAssets`, unmodified. Not a modelling error — an asset figure printed beside a going-concern figure with nothing reconciling them. Know this before "fixing" the ratio. |
| **A7** | Re-weighting re-prices baselines already shown | DEC | **1** | A1–A3 | `MODEL_VERSION = '2026-07-24.1'`, recorded on every snapshot, and those snapshots are the origin the introducer's movement column measures from. Needs a call: bump-and-freeze existing, or re-score everyone. |
| **A8** | `$7.76M` block renders as washed-out overlapping grey in print/PDF | BUG | 2 | — | Reported from a saved PDF. Unverified whether it is the print stylesheet or a capture artifact. If real, the artifact an owner takes to his accountant is broken. |

⚠️ **A1–A4 ARE ALSO A PRICING PROBLEM, not only a credibility one** *(team meeting, 2026-08-02;
operator-confirmed)*. The monthly rate is *"a dynamic based on a percentage of that gap"*
(`priceForGap`, live, with the **$499 + GST floor as the base**) — so a model that inflates the gap
**overcharges**, and a broker who discounts the valuation is disputing the invoice, not just the
scorecard. That raises **A7 from a scoring question to a billing one**: re-weighting changes what
existing owners would have been quoted.

✅ **The pricing model is NOT in conflict** — an earlier reading of this register said it was, and
that was wrong. The gap-derived range on a $499 base **is** the current model and stands; the
*"budget airline — low charge to get in, the add-ons are enormous"* framing describes the **add-on
tier above it** (voice humanisation, specialist agents), not a replacement base.

**A1–A4 are one decision, not four fixes.** The defensible claim (documentation is worth roughly
half a turn to a turn, and mostly shows up as a discount *not taken* and a shorter DD) is about an
eighth of what the model currently asserts, and it is a claim a broker will nod at.

---

## B. The Genome rubric — decided, almost entirely unbuilt

Shape decided in `GENOME_BUYER_FORMAT.md` (six ✅ decisions). Build items in dependency order.

| ID | Item | Type | Sev | Blocked by | Detail |
|---|---|---|---|---|---|
| ~~**B1**~~ | ~~`confirmed` count rendered nowhere~~ | — | — | — | ✅ **CLOSED 2026-08-02 (`b47ff7c`)** — see *Closed* below. |
| ~~**B12**~~ | ~~She asks him to confirm facts the Genome throws away~~ | — | — | — | ✅ **CLOSED 2026-08-02 (`fe200fe`)** — see *Closed* below. |
| **B2** | Nine-area model does not exist in code | MISS | 2 | — | `derive.ts` still ships the original six sections. **Gates B3–B6 and C1–C3.** ✅ **Shape now fully decided** — `GENOME_BUYER_FORMAT.md` §3.2 (2026-08-02): nine areas with the ten ranks as weighting, `only-you` re-filed with an `owner_dependent` bridge flag, `about: software` split into `assistant`/`systems`, the location ladder, and the whose-Genome test. What remains is the build plus a reviewed re-classification. |
| **B15** | Corrupted proper nouns propagate, and nothing checks them | BUG | **1** | — | **IRESS → "IRIS" ×3** and **F2K → "S2K" ×2** in the real Genome, both phonetic and both voice-transcription shaped. Provable from the data: one row spells *"Iress Open"* correctly, so the same entity is stored two ways and the wrong spelling outnumbers the right one 3:1. Proper nouns are the highest-value content here — clients, systems, lots, people — and once one memory is wrong, later distils reinforce it. The register-rewrite guard checks proper nouns *survive a rewrite*; nothing checks they were right **at capture**. A handover document naming two systems the business does not use is confidently wrong in front of an advisor. **Mitigation is B1's confirmation loop** — reading a fact back catches this immediately, which is a stronger argument for confirmation than the buyer-evidence one §2 makes. **Folded into the B2 conversation 2026-08-02** (`GENOME_BUYER_FORMAT.md` §3.2, with the argument cross-linked from §2): it is the same rows — the entity-spanning `none` row carrying *"IRIS and XPlan"* is exactly what the `systems` split promotes into Management & records, so **the re-classification publishes this defect rather than creating it** — and the four new areas are almost entirely proper nouns. ⚠️ **Not mitigated by the loop alone, and this is why it stays open after B1 closed:** the channel that corrupted the name is the channel checking it, so a **spoken** read-back of "IRIS" gets agreement and promotes the error to `confirmed`, the strongest label the document has. The catch requires the fact seen **spelled** — typed transport or `/my-genome`. Two undecided mechanisms: offer spell-sensitive facts in text, or flag an entity stored two ways before it is ever offered. |
| **B16** | Pre-guard CAS rows sit in the Factory2Key Genome | BUG | 2 | — | Three-plus rows about IRESS/XPlan — Corporate AI Solutions work, operator-confirmed — predate the `save_memory` entity guard and sit in the F2K Genome. `split-genome-entity.mjs` exists and the 52 already-parked memories are the CAS corpus, so the machinery is there; this is a reviewed pass. ⚠️ **One row spans BOTH entities** (*"…Lot 91, Lots 109 and 442, and integration with IRIS and XPlan…"*) — parking loses the F2K half, keeping it carries CAS content across. Splitting one fact in two is a rewrite of the owner's record and is an operator call. That same row is `none/?` and is the one most likely to surface into the Genome under B2's re-classification: corrupted name, wrong entity, and about to become visible. |
| **B17** | On a local-storage answer she should offer the migration, not record the gap | MISS | **2** ⬆ | B2 | §3.2 decided the behaviour: a human exec assistant gets records into the cloud rather than noting that she cannot reach them, which turns an empty area from a report card into an offer and produces a **real** transferability gain. ⚠️ Bounded by what exists — Drive read/search/file only, **no folder creation, no write, no OneDrive connector**. "I'll arrange either one" is the overclaim class removed elsewhere in this product. Either build the OneDrive connector or scope her offer and say so plainly. |
| **B3** | `only-you` retired as a section, becomes the per-area axis | MISS | 2 | B2 | Evidence it is urgent: in the QA export **5 of 6 sections are empty and everything landed in `only-you`**; on the red-team account it holds 115 of 233 classified rows. The taxonomy is functioning as five sections plus a bucket. |
| **B4** | Deactivation — she proposes, he confirms, both recorded | MISS | 2 | B2 | §4. Without it there is no denominator, so every percentage after it is indefensible. |
| **B5** | Three-axis score, weighted by the §3.1 ranking, held **as data** | MISS | 2 | B2, B4 | §3.1 obliges the ranking to be cheap to re-order. It is currently prose in a markdown table — the one form that makes a broker's re-order a rewrite. |
| **B6** | Two renderings + the buyer-view sign-off **gate with a mechanism** | MISS | **1** | B5 | §5 decided: never shown to anyone without per-release sign-off naming who and when. See **B7** for why this is severity 1. |
| ~~**B7**~~ | ~~The export has no sensitivity filter at all~~ | — | — | — | ✅ **CLOSED 2026-08-02 (`a30922e`)** — see *Closed* below. |
| ~~**B13**~~ | ~~LLM privacy verdict — measured, retired~~ | — | — | — | ✅ **CLOSED 2026-08-02 (`38597ad`)** — measured and rejected, not shipped. See *Closed* below. |
| ~~**B14**~~ | ~~Software facts misfiled and reaching the buyer's document~~ | — | — | — | ✅ **CLOSED 2026-08-02 (`e92ed1c`)** — see *Closed* below. |
| **B8** | Public example still promises fabricated precision | DEBT | 2 | — | `/genome` renders `example.ts`: per-section percentages (78/54/41), an overall figure, three confidence levels — all hand-authored. §6 requires this resolved *before* the scorecard ships. Same class as the removed testimonials. |
| ~~**B9**~~ | ~~Near-duplicate facts survive the dedupe~~ | — | — | — | ✅ **CLOSED 2026-08-02 (`40b265d`)** — see *Closed* below. |
| **B10** | Memory-poisoning residue reads badly | DEBT | 3 | — | Two surviving entries are contorted artifacts of Ray's attack ("…despite indicating standing approval…"). Not a security issue since the sweep landed; a quality one in a buyer-facing document. |
| ~~**B11**~~ | ~~`§8` says "Nothing here is started"~~ | — | — | — | ✅ **CLOSED 2026-08-02** — see *Closed* below. |

---

## C. Onboarding and the two entry states

Decided 2026-08-02, `GENOME_BUYER_FORMAT.md` §4.1. All blocked by **B2**.

| ID | Item | Type | Sev | Blocked by | Detail |
|---|---|---|---|---|---|
| ~~**C1**~~ | ~~Direct signup gets **no valuation at all**~~ | — | — | — | ✅ **CLOSED 2026-08-02 (`fa9301d`)** — 10/10 against production. See *Closed* below. Detail retained here: Both writers originate from the eleven questions (Stripe metadata, device handoff). A broker-referred client who signs up without running them has no gap, no baseline snapshot, and the introducer's movement column has nothing to move — *inert rather than broken*. `/r/[token]` lands on the home page, so this is the channel most likely to produce it. **Measured against prod: 18 of 22 accounts have no baseline**, including four real people on business agents (`carme.plasencia@aromics.es`, `andrew@aerion.com.au`, `trinh@bucketlyst.com.au`, `shhahhussain@gmail.com`). **What shipped:** the dashboard renders a `NoBaselineYet` invitation when the account has no `business_valuations` row — gated on the **row, not the gap** (a valuation that computed to zero is still a baseline he gave us) and skipped for personal-journey-only owners (`lib/valuation/baseline-invite.ts`, 5 tests; verified against prod to invite 16 and skip the 2 personal-only). The link carries `?from=app`, which turns the result page's `/plan` CTA into `/dashboard`, relabels it *"Back to Kira"* and **suppresses the price quote** — a paying owner was being re-quoted a monthly fee under a button selling him what he already has. Attachment then runs through the existing `ClaimStoredValuation` on `UserShell`. **An invitation, not a gate:** §4.1 decides the baseline eventually blocks as onboarding block 1, but that is **C3** and walling the dashboard today would trap every existing owner. **To observe:** sign up clean → see the card → run the eleven → confirm *"that's mine"* → a `business_valuations` row **and** a baseline snapshot exist. |
| **C2** | The eleven answers never seed the Genome | MISS | 2 | B2 | They sit in `business_valuations.inputs` as JSON; `derive.ts` reads only three scalars. Without this, onboarding re-asks what he answered minutes earlier. |
| **C3** | Onboarding question set — **4 blocks**, open/block/block/skip | MISS | 2 | B2, C2 | **Origin (first, no gate)** · Baseline (skipped if claimed) · Scope (always) · Depth (skippable). **Block 0 added 2026-08-02** — *why did you start this, what problem were you solving, what gap did you see* — decided to go **in front of everything**. It is not a warm-up: it is the only source in the model for **competition** and for **what we sell**, the two holes §3.2 names, and it surfaces founding owner-dependence (rank 2) unprompted, which is the one thing he would deny if asked directly. ⚠️ Must land as **facts not narrative**; must not be rendered as a form field; runs straight at **H3**'s do-not-infer-exit rule; and is the likeliest place to file the wrong entity's origin against the wrong Genome. |
| ~~**C6**~~ | ~~Two onboarding interviews built in parallel~~ | — | — | — | ✅ **NOT AN ISSUE — resolved by the operator 2026-08-02, same day it was raised.** Gareth's advisor-agent interview skill **folds into what we have**; it is not a second interrogation. §4.1's four blocks remain the question set. Kept as a closed row rather than deleted, because "two interviews" is an obvious-looking inference from the meeting notes and would otherwise be re-raised. |
| **C5** | `isUsableInputs` guards 4 of the 9 fields the model requires | BUG | 3 | — | Found while verifying C1. `ValuationInputs` has nine required fields; the claim route's guard checks `industry`, `annualProfit`, `ownerDependence`, `systems` and waves the rest through. A payload missing the other five passes validation, reaches `computeValuation`, produces non-finite numbers from score-map lookups on `undefined`, and dies at the insert as *"Could not save valuation"* — **the owner loses the baseline and is told nothing useful**, which is C1's own failure class re-entering through the front door. Not reachable from our current client, which sends all nine; the live risk is a **stale cached client** or the next field added to the model, at which point every in-flight payload starts failing the write while validation keeps saying yes. Fix is to validate against the model's actual shape, or have `computeValuation` refuse non-finite output rather than return it. |
| **C4** | Pre-fill must not count as confirmation | DEC | 3 | C3 | Constraint recorded in §4.1; needs enforcing when C3 is built, or day one opens high and never moves. |

---

## D. Agent fleet and behaviour

| ID | Item | Type | Sev | Detail |
|---|---|---|---|---|
| ~~**D1**~~ | ~~`Kira_Trinh_DevelopingThe_7f1c` is on 15 tools with no confirmation section~~ | — | — | ✅ **CLOSED 2026-08-02** — and **the item was wrong as written**. See *Closed* below. |
| ~~**D2**~~ | ~~Duplicate agent rows~~ | — | — | ✅ **CLOSED 2026-08-02** — real, but not where the item said. See *Closed* below. |
| **D3** | She often does not call `record_refusal` at all | BUG | 2 | Reproduced post-deploy; runtime logs show `check_tasks` and `search_drive` and not one `record_refusal`. Prose with no mechanism. The typed transport is where a mechanism is cheap — the tool-call decision is in our code. |
| **D4** | Speculation persists | BUG | 2 | *"it looks like everything is already done on that."* `taskLedgerSection` forbids that sentence **verbatim, as the anti-example**, and it still does not hold. |
| **D5** | 2 agent-name mismatches remain | BUG | 4 | Both synthetic identities. `first_name` on `dennis+qauser` and `dennis+redteam` is the email local part — and it prints into the export as *"Recorded by dennis+qauser"*. |

---

## E. Never proven live

Built, plausibly correct, never observed working. This section is the one that most often gets
mistaken for done.

| ID | Item | Sev | Who can prove it | Detail |
|---|---|---|---|---|
| **E1** | Naive-tester round 5 → the share gate | **1** | Dennis | ⛔ Prod URL is share-blocked and has never passed a naive-test. Remediation is done but **unjudged**. Ray is the gate, not Anneke. |
| **E2** | One full doing-loop round trip | **1** | Dennis (voice) | dispatch → approve → send → callback → `done`. Long-standing; zero `done` rows. |
| **E3** | Drive + contact lookup by voice | 2 | Dennis (mic) | Both halves exist and scopes are granted. "Find my Lot 91 files" and "Roger at Quantum Surveys" are the two first tests. Headless has no mic. |
| **E4** | Valuation full path after the change | 2 | anyone | Run → close tab → sign up next day → see the baseline. Not walked since the confirm gate + 2-day TTL landed. |
| **E5** | Drift cron: authenticated invocation + real send | 2 | first 08:00 fire | Route deployed and fails closed (401). `CRON_SECRET` is `type=sensitive` so it cannot be probed from a dev machine — correct posture. `?dry=1` checks it without consuming a fingerprint. |
| **E6** | Red-team **inconclusive** branch | 3 | a real judge outage | Added 2026-08-02 (`cb4267d`). Schema verified live; drift logic covered by tests that fail without it; the branch itself has never executed. |
| **E7** | `genome-classify` straggler sweep | 3 | observation | Runs at :30. Write-time path is wired; the sweep has never been seen running. |
| ~~**E9**~~ | ~~**C1** — a clean signup reaching a baseline~~ | — | — | ✅ **OBSERVED 2026-08-02**, 10/10 against production with the QA baseline parked and restored. What remains is the **client-rendered result copy** under `?from=app` (heading / no price / "Back to Kira"), which needs a browser — folded into the next `/naive-tester` run rather than tracked separately, since a fresh-signup persona walks it anyway. |
| **E8** | Settings price positive path | 3 | first subscriber | `getSubscriptionPrice()` reads the real monthly from Stripe; no subscribed account exists, so only the null path has ever rendered. |

---

## F. Billing and go-live

✅ **GOING LIVE IS NOW ONE VARIABLE.** Both blockers below turned out to be already satisfied when
checked against the live Stripe account (2026-08-03) rather than trusted from this file. Live secret
key, live webhook signing secret, a registered and enabled live endpoint, and a live portal with
cancellation disabled are all in place. What remains is setting **`STRIPE_LIVE_MODE=true`** in Vercel
and redeploying — an operator decision about taking real money, not a build task. `lib/billing/copy.ts`
makes every sentence on every surface follow that one flag.

| ID | Item | Type | Sev | Detail |
|---|---|---|---|---|
| ~~**F1**~~ | ~~Live-mode Stripe webhook endpoint does not exist~~ | — | — | ✅ **ALREADY DONE — the entry was wrong.** Verified against the live Stripe account 2026-08-03: an **enabled** endpoint exists at `https://kira-rho.vercel.app/api/stripe/webhook` carrying `checkout.session.completed`, `customer.subscription.created/updated/deleted`. `STRIPE_WEBHOOK_SECRET_LIVE` is set in Vercel production+preview, and `stripeWebhookSecret()` refuses to fall back to the test secret when live. |
| ~~**F2**~~ | ~~`configure-billing-portal.mjs` never run against LIVE~~ | — | — | ✅ **ALREADY DONE — the entry was wrong.** Dry-run against LIVE 2026-08-03 reports configuration `bpc_1SrG1G…` with `subscription_cancel: false` — *"already disabled — nothing to do."* So the portal's cancel door is shut in live and the only cancel path is `/api/billing/cancel`, which passes `invoice_now: false` and honours the waiver. The reasoning in the original entry stands and is why the script exists; only the claim that it had never been run was untrue. |

---

## G. Blocking a real client (Factory2Key)

| ID | Item | Type | Sev | Detail |
|---|---|---|---|---|
| **G2** | Per-tenant `from` **and sender identity** resolution | DEBT | 3 ⬇ | **ORCHESTRATOR HALF DONE AND OBSERVED 2026-08-03** (`orchestrator@21bce58`): `tenants.from_email` added (migration `007`, applied to `xuzvurmprexhalnxgsdu`, column verified present), resolved per tenant in `drainEmailOutbox`, settable via `PUT /v1/tenants/:id/identity` (`fromEmail` on the wire contract). **F2K is set to `Factory2Key <noreply@updates.factory2key.com.au>`** with `reply_email` `dennis@factory2key.com.au`; every other tenant is deliberately `NULL` and falls back, with the fallback REPORTED per tenant (`DrainReport.usedFallbackFrom`) rather than silent. ⚠️ **What remains is narrower than this row originally said, and the reason matters.** The prior text named `lib/kira/swarm/stub.ts:281`/`:315` as the live defect. They are not live: `KIRA_SWARM_ADAPTER` **is** set in Vercel Production (the `STATE.md` line saying it is deliberately unset is stale), and the orchestrator DB shows real dispatches arriving — 12 tasks on the F2K tenant, 139 on red-team. So owner-behalf mail goes through the orchestrator path that is now fixed. The stub is the **fallback**, and `getSwarmCoordinator()` falls back to it on any unrecognised value — so a misspelt env var silently routes owner-behalf mail back through Kira's hardcoded CAS domain with Global Buildtech's ABN. That is a latent hole worth closing, not a live one. Kira's *own* product mail (magic link, welcome-back) correctly stays CAS; do not move it. |
| **G7** | Client sending-domain setup is not an onboarding step | MISS | 2 | **Decided 2026-08-03: it belongs in onboarding, collected by a FORM, never extracted from a voice conversation.** `DATA_STANDARD`'s decider — a DKIM key, a subdomain and an ABN are exact strings where being approximately right is total failure (D1 → STRUCTURED), so transcribing a 217-char base64 key by voice is a guaranteed defect. Form collects: the subdomain, **who controls their DNS** (self / registrar / IT provider — F2K's went via a Leapfrog Freshdesk ticket, a different workflow), entity + **ABN** + postal + phone + contact email (`senderFromEnv()` throws without name+email; the Spam Act footer is invalid without ABN and postal), the **sign-off name** Kira uses for them, and reply-to. System then creates the domain via the Resend API, emits the DNS rows as a **copy-paste block or file — never inline in prose** (F2K's values "kept getting mangled" in email), and polls to verified. **The portfolio-wide version of this — the form fields, the "form not talk" reasoning, and all five DNS traps — is written up canonically in `cais-shared-services/CLIENT_HANDOVER_KIT.md` §6.5** (not duplicated here on purpose; one source, per the anti-fork rule). Build alignable with that doc's self-serve key wizard. Blocks the 2nd tenant, not F2K. |
| **G3** | The one refused Genome rewrite | DEC | 3 | Dropping "Factory to Key" as the subject reads naturally *if* this Genome is F2K's; erases who if not. |
| **G4** | Three memories the entity classifier could not place | DEC | 3 | Two are Kira feature requests whose use case is F2K work. |
| **G5** | Four tasks awaiting approval | DEC | 2 | Approving one sends under **Factory2Key's ABN**. The AI-related ones were tests — discard rather than approve. |
| **G6** | Roger's email for the Lot 109 contour survey | DEC | 3 | Task `562ccf05` has `request.to = null` and the drain correctly refuses. `lookup_contact` may now resolve it. |

---

## H. UI, landing and product decisions

| ID | Item | Type | Sev | Detail |
|---|---|---|---|---|
| **H1** | SayFix pill overlays hero copy at 375px + the dashboard card | BUG | 2 | **Dennis owns the scope.** The engine avoids controls and is blind to content. ⚠️ Do **not** pass `position` as a local fix — it is handed to the engine as a weighted preference (+8) and that is what parked the widget on the Back button for an entire valuation. |
| **H2** | AI-generated face on the landing page | DEC | 3 | Dennis: leave for now. Objection is consistency — a fake person illustrating a *don't fake it* argument. |
| **H3** | Ray's Opportunity items | DEC | 3 | 12th question · selling the refusal on the landing page · example Genome beside the hero · private mode · broker paragraph. ⚠️ On the 12th question: **do not assume exit intent.** If retirement or sale comes up it is a learning; inferring it from a valuation run is not. |
| **H4** | Over-promise attack: 5/5 held, no fix written | — | 4 | Either Ray hit a flake or the attack does not reproduce his case (his trigger was a document *name*; ours is a generic Drive ask). Writing a fix now would guard nothing. |
| **H5** | Range asymmetry — resolved by explanation, deliberately | — | 4 | The sector table has one median and no within-sector dispersion, so any ± would be invented. **If someone "fixes" this later by adding a band, they are fabricating.** |

---

## I. Residuals and known traps

| ID | Item | Sev | Detail |
|---|---|---|---|
| **I1** | Register rewrite can shift meaning the guard cannot see | 3 | It checks figures and proper nouns survive; it cannot catch *"Dennis is based in Perth"* → *"The business is based in Perth"*. Originals in `kira_memory.content_original`; `--revert --apply` restores. |
| **I2** | `billing.integration.test.ts` flakes | 3 | Stateful against live Stripe test mode. Failed once on the out-of-order assertion, then passed in isolation and on three full runs. **If CI goes red there, suspect this before anything else.** |
| **I3** | Four memories still name the owner | 4 | All `none`-classified, so filtered out of the Genome and never displayed. |
| **I5** | **Public voice widget dies for ~1 in 5 visitors — `@caistech/elevenlabs-convai`, not Kira** | **1** | Click "Talk to the assistant" with no working mic and the panel opens; the text box then appears in **~570ms** or **never**. Measured on prod `5a7562b` across six sweeps in one afternoon on unchanged code, the box appeared **0%, 40%, 50%, 70%, 80% and 100%** of the time; failing attempts stayed empty past 30s, showing a mic button the visitor cannot use. Cause is exact: `widget-logic.js` → `shouldUseTextFallback()` returns the fallback only when `status === 'error'`, and Kira supplies an `agentId` so `canConnect` is true. **The text box is gated on the voice connection FAILING first, and there is no timeout** — a WebRTC attempt that neither connects nor errors leaves the panel dead forever. Affects every consumer using `textFallback`, so the fix belongs in the package (fall back on a timeout, not only on `error`). Ray's original defect — box takes the question and says nothing — is **fixed**: 0 silent submissions in 14. Caught by `portfolio-gate-audit-input-response`; a single run passes ~1/3 of the time, which is why that check reports a rate. |
| **I4** | Second Kira account for Global Buildtech | 4 | Deferred by decision, not blocked. Architecture supports it — tenant = user id. The 52 parked memories are the corpus. ⚠️ **`tenant = user id` is now a known future constraint, not just a note** — §3.2 decided (2026-08-02) that **Kira survives the sale and changes bosses**, which requires the business-scoped half to move to a new owner account while the personal half stays with or is destroyed for the seller. That is a migration, not a config flag. `B7`'s sensitivity split is the mechanism that makes it possible; the privacy policy must describe succession **before** it happens (`REGULATORY_INCLUSIONS` I1 gap). |

---

---

## J. Round-5 reconciliation — verified 2026-08-03

The eight items left open by the concurrent session (`docs/HANDOFF_2026-08-03_CONCURRENT_SESSION.md` §4)
from `naive-tester-reports/2026-08-03-0526/ray.md`. **Checked against the code, one at a time.** Two
could not be settled from source and say so rather than guessing.

| # | Item | Verdict |
|---|---|---|
| ~~**J1**~~ | ~~Stripe checkout: no GST on the figure; "per unit / based on usage / Price varies"~~ | ✅ **CLOSED 2026-08-03, both halves, both observed.** **Half one — the GST suffix now renders** ("Kira Business Plan — Growth (+ GST)", twice), and the root cause was never copy: `ensureMeteredPrice` is idempotent on the lookup key so `productName`/`productDescription` apply only at Product creation, and Stripe **refuses to update a Product it auto-created** (confirmed by trying). The Growth product predated the suffix commit by ten days, so the fix was inert from the moment it shipped. Fixed by bumping `PRICE_LOOKUP_PREFIX` (`kira` → `kira-gst`), documented at the constant as the only mechanism by which checkout copy can change. **Half two — the fixed figure now sits beside the pay button:** *"$999 + GST each month. You are charged after the month has finished, never in advance — cancel before then and that month is on us."* Verified in the rendered DOM on `checkout.stripe.com`, host-asserted. Required `customText` on `@caistech/subscription-billing` (**v0.4.0**, published, catalog updated) — Kira is its only consumer, so propagation was one bump. ⚠️ **What remains is Stripe's and cannot be changed:** `Price varies` ×2, `A$0.00 due today`, `per unit`. All true — an arrears subscription is metered, so the amount genuinely is not known until the month closes. If a tester reads those as evasion again, the only remaining answer is owning the payment page with Payment Element, which is a project and carries PCI surface Kira does not have today. |
| **J2** | Free-beta vs arrears contradiction | ✅ **FIXED 2026-08-03** — and it was worse than filed. `lib/faq.ts` told introducers *"while we are in beta, payments are switched off entirely — nothing is being collected from anyone yet"*, which went **false the moment `STRIPE_LIVE_MODE` was flipped**, in the answer that sets their commission expectations. Removed. The same pass caught a second falsehood **I introduced**: the pricing answer still said the fee "is set to the size of that gap" after `f91e0cd` moved the band onto reported profit. Rewritten, and it now states the separation as the reassurance it is. |
| **J3** | "Recorded by Ray" vs emails signed "Pat Nolan" | ⚠️ **UNRESOLVED FROM SOURCE.** `export/route.ts:68` builds the name from `first_name`/`last_name` on the app user, so the mismatch is data, not logic — almost certainly the same root as **D5** (synthetic identities whose `first_name` is the email local part). Needs the account inspected; not closable by reading code. |
| ~~**J4**~~ | ~~Example Genome has 6 sections, the real one has 9~~ | ✅ **CLOSED 2026-08-03.** `people`, `assets` and `systems` added to `lib/genome/example.ts` in the same fictional plumbing business — the three omitted were the ones a due-diligence list opens with, on the ONE page a prospect sees before he pays. **It fell behind silently because `areas.test.ts` pinned `GENOME_AREAS` at nine and nothing pinned the example to `GENOME_AREAS`.** `example.test.ts` now compares the two directly — a sorted-key comparison, so a failure names the missing area instead of reporting `6 !== 9` — plus every area having entries and the gaps list being non-empty (an example where nothing is still in his head describes a business that does not need the product). **Mutation-proven:** removing `systems` fails naming `"systems"`; restoring it passes. ⚠️ **This GROWS B8 rather than resolving it** — three more hand-authored `coverage` figures now exist and `overallCoverage` averages nine instead of six, so the headline number moves. B8 still owns that decision. Fixed in passing: `/genome`'s `.grad-genome` and `.grad-coral` were `#a78bfa`/`#8b5cf6`/`#f472b6` — AI purple and pink, `DESIGN.md` §7's named anti-pattern, on the page just promoted into the hero as "See a real one". |
| ~~**J5**~~ | ~~Kira Exec claims it excludes test accounts, then lists two~~ | ✅ **CLOSED 2026-08-03.** Both halves fixed, because either alone leaves a lie on the screen. `isNonClientAccount()` now filters the cohort: the canonical QA identities (plus-tagged on OUR domains only) and everyone in `ADMIN_EMAILS`. **Deliberately conservative** — it does NOT pattern-match "test" or "qa" anywhere in an address, because a real owner at `test@bigplumbing.com.au` or a business called QA Plumbing must never silently vanish. Excluding a real client is the worse of the two errors: a stranger in the list is visible, a missing client is not, and 4 tests pin that direction specifically. The **sentence was also corrected** — it no longer claims to exclude personal Kiras by filtering, because it doesn't: they never enter, since the cohort is built from valuation / LOI / paid signals. Claiming the right outcome for the wrong reason is how this row was created. |
| **J6** | `/plan` has no sidebar; back link paints late | ⚠️ **PARTIALLY EXPLAINED.** `app/plan/layout.tsx` exists but mounts only `BackToAccount` — deliberately, per its own comment: `/plan` is a **public** page and the full shell would frame marketing as an app screen. So "no sidebar" is by design; "paints late" is the real half and is unverified. ⚠️ Separately, `BackToAccount` is still `amber-200/amber-50` — off-palette since `DESIGN.md`. |
| **J7** | Mic FAB overlays body text on My Genome | ⚠️ **NOT VERIFIED — needs an authenticated live pass.** Behind auth, so unreachable from source. Note the landing widget added in `625389d` is `placement="floating"` and is a **different mount**; this row is about My Genome's own FAB. |
| ~~**J8**~~ | ~~Raw export $1,094,292 vs $1,090,000 everywhere else~~ | ✅ **CLOSED 2026-08-03.** The JSON spread the derived genome verbatim while the markdown and every screen went through `formatMoneyApprox`, so the attachment contradicted the document to the dollar. `approxNumber()` is the numeric half of that same rule (3 significant figures) and is spread AFTER `...g`, which makes it an override rather than a competing second set of fields; each figure now also carries `…Displayed` — the exact string that was on screen — so the two can be checked without re-deriving anything. **Why round rather than keep the precision:** the figure comes from eleven multiple-choice answers, so digits past the third are arithmetic, not knowledge, and the product's most persuasive paragraph is the one explaining that. 4 tests pin `approxNumber` against `formatMoneyApprox` directly, so they cannot drift apart again. |

**Net: ZERO confirmed open — five fixed (J1, J2, J4, J5, J8), three unverifiable from source (J3, J6, J7) awaiting one live authenticated pass.**
J3 and J7 need a live authenticated pass; J6's remaining half needs a browser. None of them should be
marked done on a reading, which is the rule this section exists to honour.

---

## K. 2026-08-04 — the open list, numbered and prioritised

Written because the day's findings were reported one at a time as they were hit and never
consolidated, which is exactly the failure this register exists to prevent. Everything below is
either OPEN or was closed today; nothing is carried from chat without being stated here.

**Standing fact that sets the priority:** Stripe is **LIVE** (`{"live":true}`, `sk_live_` in the live
slot, real `cs_live_` sessions minted). Anything that misleads or exposes a paying customer outranks
everything else.

**Also established today, and it changes how the rest reads:** there are exactly TWO stored
valuations — the QA synthetic account and Dennis's own. **No customer has ever come through the
funnel.** An earlier note in this session called `7f1c4e2f` "a real owner"; it is Dennis. Every claim
about what a customer would experience is inference from design, not observation.

### P0 — would damage a paying customer

| # | Item | Type | State | Detail |
|---|---|---|---|---|
| ~~**K1**~~ | ~~Buyer handover carries Kira's PRIVATE notes~~ | — | ✅ **CLOSED 2026-08-04 (`f8edb7a`)** | New `how-he-works` private reason, anchored on the owner as subject plus an approval/permission/priority verb — never on "approval" alone, so "the Marlow job needs council approval" still travels. Placed last, which the tests caught: first draft claimed a sentence belonging to `exit-intent`. 102 genome tests. |
| ~~**K2**~~ | ~~Manual ABN field accepts a fake ABN~~ | — | ✅ **CLOSED 2026-08-03 (`3292712`)** — the row was stale when the K-list was written | `validateAbn` (the ABR's own weighted modulus, arithmetic — cannot fail open on an outage) now runs server-side in `app/setup/business/actions.ts:68`, so `99 999 999 999` is rejected before it can reach the handover or a Spam Act footer. ⚠️ **Residual, tracked as K19:** modulus-valid ≠ real. |
| **K19** | A checksum-valid but non-existent ABN still saves | MISS | **OPEN** | K2's residue. `AbnLookupField` **already reverse-resolves** — `components/AbnLookupField.tsx:77` sends `abn=<11 digits>` and the route returns the registered entity name — but the *manual* `abn` box in `BusinessIdentityForm` bypasses it entirely and is only checksum-checked. Two fields asking for one thing is also a real cost for a 66-year-old. Fix: the manual field runs the same reverse lookup on blur and shows the resolved entity back for confirmation; degrade to the modulus check alone when the ABR is unreachable. |
| **K3** | Kira's own meta-notes leak into the Genome | BUG | **HALF CLOSED 2026-08-04** | ⚠️ **The earlier diagnosis was wrong and the correction matters** — see K3a/K3b below. |
| ~~**K22**~~ | ~~AU-only jurisdiction guard not wired into the send path~~ | MISS | ✅ **CLOSED 2026-08-06** — orchestrator `66db700`. `checkCommercialJurisdiction` in `src/connectors/email.ts`, refuse-before-claim so the row stays pending and goes out unchanged if the clearance widens. **Scoped to COMMERCIAL sends, and that is the whole design:** the package guard throws on an *unknown* country as well as a disallowed one, and nothing tags contacts — so applying it to every send refuses an Australian tradesman emailing an Australian client at gmail, which is most of them. That is an outage wearing compliance as a costume. Transactional mail is recipient-initiated inside an existing relationship and exempt or consent-inferred in every regime concerned. Country from **ccTLD only** — no IP geolocation, name heuristics or provider guessing, each of which gives a confident answer that is sometimes wrong, and a wrong country here either blocks a legitimate send or waves through the one this exists to stop. 18 tests. **Residual:** a `.com` belonging to a genuinely foreign business is undetectable; a commercial send to one is *refused* (unknown blocks) rather than mis-sent, which is the safe direction. Original entry below. | `PRODUCT_STANDARDS` §9 requires `assertJurisdictionAllowed(recipientCountry)` in the send path: a non-AU recipient hard-throws until that country's consent/identification/unsubscribe rules are configured, and an **unknown** country blocks too. Grepped the orchestrator 2026-08-06 — `assertJurisdictionAllowed`, `recipientCountry` and `SUPPORTED_OUTREACH_JURISDICTIONS` appear **nowhere** in `src/` or `app/`. `@caistech/email-compliance` ≥0.2.0 ships it; nothing calls it. So Kira will currently send commercial email to any address in any country. **Why it is P0 rather than housekeeping: the exposure is the OWNER's, not ours.** He is the named sender — his entity, his ABN in the footer — so a send into CASL or GDPR/PECR territory is his breach, committed by a tool he bought to be safe. He has no way to know it happened. **Found sideways** while checking whether a Canadian tester could exercise the send path; the answer was yes, which is the bug. **Fix:** country on the contact record, `assertJurisdictionAllowed` in `src/connectors/email.ts` beside the existing compliance call, unknown-country blocks, and the refusal surfaces to the owner as a reason rather than a failure. ⚠️ LinkedIn is exempt (platform compliance) — scope is EMAIL only. Note this also gates the whole distributor story: a distributor with any offshore client cannot be onboarded until it exists. |

**K3, measured against production 2026-08-04** (717 active rows, read-only). The register previously
recorded this as "the `about=software → none` filter already hides 14/24 rows… the defect is the
handful that escape". That framing implied a leaky guard. **The guard leaks nothing:**

```
                         visible in Genome    about=assistant/software that leaked
dennis@factory2key              23                          0
dennis+redteam@                240                          0
dennis+qauser@                   2                          0
```

`derive.ts:782` enforces `about=assistant → section='none'` **in code**, and it has never once been
wrong. It simply never fires, because the classifier answered `business` or `systems`. **A guard
cannot catch a verdict that was never reached.** Two distinct defects were wearing one label:

| ID | Item | Type | State | Detail |
|---|---|---|---|---|
| **K3a** | Rows sectioned before `genome_about` existed are unreachable by the guard | DEBT | **OPEN** | `genome_about IS NULL` on **7 of 23** visible rows on the real Genome and **233 of 240** on the red-team account — sectioned by the pre-2026-08-02 classifier, which had no `about` concept. They can never be re-asked: `classifyPendingMemories` selects `.is('genome_section', null)`, so a row that already has a section is skipped forever, and `classifyForReview` — the path that would re-ask them — **writes nothing by design and has never been applied.** Mostly benign business facts, which is why this is DEBT and not the P0. Closing it is a reviewed run of the existing review path, and it is the same pass **B16** needs. |
| ~~**K3b**~~ | ~~The distiller writes Kira's own state in the business's voice~~ | — | ✅ **CLOSED 2026-08-04** | **This is what actually reached a buyer-facing area.** On the real Genome: *"There is an unresolved issue to verify access to the Gmail account to locate contacts like Chris Newton and Roger"* filed `business → **customers**`, and *"Google Contacts is the primary source for email addresses…; other lists are not accessible for this purpose"* filed `systems → systems`. Structural, not careless: the distiller reads a transcript in which Kira was *doing* the task, and her working state comes out in the third person — at which point "access to the Gmail account is unresolved" is grammatically identical to a fact about the business's records. The `systems` category added on 2026-08-02 to stop rank 10 being empty is *verbatim* the shape her connector notes take, so the split widened the aperture; and `derive.ts:790` then promotes `about=systems + section='none'` **into** the systems area — one-way, toward disclosure. **Fix:** the decision moved to the only place that still has the evidence. The distiller tags its own notes `assistant-state` (`lib/kira/memory-extract.ts`), and `classifyPendingMemories` files those `none`/`assistant` **without asking the model at all**. Filed, not deleted — `none` renders in the owner's "everything else you have told me" list, so he can still see it and remove it. The tag rides in `DistilledMemory.tags`, which already survives the canonical save into `kira_memory.tags`, so no `@caistech/elevenlabs-convai` change and no orphaned consumers. Both halves mutation-verified (reverting either turns the tests red); 10 new tests, 468 suite-wide. |

⚠️ **K3b is shipped, not yet observed.** It changes only *new* distils — the two rows named above are
already sectioned and are K3a's population, not this fix's. Observation is one voice or typed session
in which Kira hits a connector problem, followed by checking the resulting row is `none`.

### P1 — credibility with the buyer this product is written for

| # | Item | Type | State | Detail |
|---|---|---|---|---|
| **K4** | Four visual identities | DEBT | **OPEN** | Landing, valuation, checkout and login each look like a different product. Ray: "I can't tell if I'm still on the same website." Needs a design decision, not a fix. |
| **K5** | `/genome` paints slowly | BUG | **OPEN, unexplained** | It server-renders 3,935 characters, so the handoff's "move `'use client'` down" diagnosis was wrong. Cause unknown; invisible to an HTML fetch. |
| **K6** | Two competing scores | DEBT | **OPEN** | "Transferability 32/100" on the valuation vs "On the page 57%" in the Genome. Both are called "the number to watch". |
| **K7** | No debt field | MISS | **OPEN** | "Roughly what do you owe?" then "after debt, about $X to you." The only number the owner actually cares about. |
| **K8** | Nothing asks what the broker already said | MISS | **OPEN** | Every one of these owners has had that conversation. Engaging with it is the difference between being understood and being sold to. |
| **K9** | Voice text box takes 8–13s when the connection stalls | DEBT | **OPEN** | Enormously better than never (which is what it was), but an "or type instead" offered up front beats any timer. |
| **K20** | The paid agent could invent "I watch what you do" the same way the landing one did | DEBT | **OPEN, judged not worth a fleet re-provision yet** | The landing agent said it live, and nothing in any prompt contains the word — she generated it from "you are noticing how he actually operates". `prompts.ts` is safer ("capture as you go — save the business facts", "as you learn what they are working on"): conversation-framed, no observation language. But the same invention is available to it, and this is the claim this audience is least able to forgive, since they are being asked to connect email, Drive and accounts. Not fixed pre-emptively because it means re-provisioning ten live agents, which has twice caused a real regression here (tools stripped to 15/17, four prompt sections deleted). Fold the "never say you watch" line in at the NEXT reprovision that is happening anyway; assert it in `prompt-completeness.test.ts` at the same time. Evidence, if wanted first: check a paid transcript for observation verbs. |

### P2 — verification owed

| # | Item | Type | State | Detail |
|---|---|---|---|---|
| **K21** | Supabase custom SMTP silently REVERTED to the built-in mailer | BUG | **FIXED 2026-08-05, but the cause is unknown** | Two reset emails, same subject, different senders: **27 Jul from `noreply@updates.corporateaisolutions.com`** (Resend, correct) and **3 Aug from `noreply@mail.app.supabase.io`** (built-in mailer, 2/hr). So it was configured and then undone — this was never a missing setup. Nothing announces it: auth mail keeps flowing, from an address no recipient recognises, at a rate that dies under any real use, and the only symptom is a tester saying "I never got the email" — which reads as their spam filter. Re-applied via the Management API (`smtp.resend.com:465`, sender `Kira`, `rate_limit_email_sent: 30`). **Owed:** find what reverted it (a project pause/restore, a dashboard save, a config sync?) and add `smtp_host` to a periodic check — `PRODUCT_STANDARDS` §9 already requires the auth smoke-test to FAIL, not warn, when email is on the built-in mailer, and nothing enforces that here. Note the trap: `POST /auth/v1/recover` returns **200 regardless** (it deliberately hides whether the address exists), so it cannot be used to verify sending. The authoritative signal is the Resend send log.|

| # | Item | Type | State | Detail |
|---|---|---|---|---|
| **K10** | Signup never verified end to end | PROVE | **OPEN** | `recover` returns 200 and `otp` throttles (proving the mailer sends), but signup itself was not exercised because it creates a real account. One manual signup closes it. |
| **K11** | Share gate still closed | PROVE | **OPEN** | No naive-tester PASS has ever been recorded against any deployment. |
| **K12** | Genome baseline never seen on mobile | PROVE | **OPEN** | Verified rendering at desktop on the QA account only; 375px unchecked. |
| **K23** | Is production actually missing two valuations? | PROVE | **OPEN** | K17's residue, and the only thing standing between the backup and deletion. The backup holds **4** valuations / **5** snapshots; the register's standing position is that production holds **2**. Nobody has read the two tables since, so "production is short by two" is inference from an older note, not an observation — and the opposite result (prod holds all four) would make the backup redundant and deletable today. One read of `business_valuations` + `business_valuation_snapshots` against the four ids in `C:\Users\denni\.kira-backups\README.md` settles it. Attempted 2026-08-06; the command was denied, so this is blocked on Dennis rather than on effort. If prod *is* short: decide restore-or-discard per row — Gareth can re-run in three minutes (K16), so discard may be right, but make it deliberately. |

### P3 — portfolio / infrastructure

| # | Item | Type | State | Detail |
|---|---|---|---|---|
| **K13** | `@caistech/report-generator` emits CORRUPT PDFs on Linux | BUG | **OPEN** | `bad XRef entry`. Ruled out: version drift, a read-before-flush race, and the Node version (raising CI 20→24 made it WORSE). Cause is the platform. Whole suite skipped in CI, declared not deleted. Producing valid PDFs is that package's entire job. |
| **K14** | Other voice products still carry the old widget | DEBT | **OPEN** | Singify, BucketLyst, ExecutorAI keep the emoji launcher and the error-only text fallback until each bumps `@caistech/elevenlabs-convai` to ≥0.12.1. |
| **K15** | `single-statement` check not built | MISS | **OPEN** | The last of the six mechanised checks. Would have caught the pricing-block-vs-FAQ contradiction and ExecutorAI's three simultaneous commercial models. |

| **K18** | `/start` is still the pre-Exec generic helper | DEBT | **OPEN** | "Meet Kira · Your friendly guide · Let's talk about work stuff · Review Framework", on the raw ElevenLabs CDN embed rather than the canonical widget. It is ALSO the provisioning flow (draft → /setup/draft/[id] → /api/kira/create → /chat/[agentId]), so it cannot simply be retired — every brand-new owner passes through it, and the operator walking the real funnel on 2026-08-04 hit it immediately after paying. Rebuilding it onto the Exec shape is the fix; pointing the dashboard at `talkHref` (done) only helps owners who already have an agent. |

### Operator only — nobody else can do these

| # | Item | Detail |
|---|---|---|
| ~~**K16**~~ | ✅ **CLOSED 2026-08-06** — Dennis has told Gareth. He now knows before looking, which was the whole of it. Original: *"Gareth has not been told his valuation was deleted. Real person, $4.26M gap, and the model has now changed underneath it as well. He can re-run in three minutes; he should not find out by looking."* |
| ~~**K17**~~ | ✅ **CLOSED 2026-08-06** — moved to `C:\Users\denni\.kira-backups\`, which is **outside every git repo**, with a `README.md` recording what it holds and the condition for deleting it. Verified after the move: both temp paths gone, file parses, record counts unchanged (4 valuations, 5 snapshots). Outside-a-repo rather than a gitignored directory *inside* one, because a `.gitignore` is one edit away from not applying and this is real turnover and profit against real `user_id`s. ⚠️ **Deliberately moved, NOT deleted:** `PRODUCT_STANDARDS` §9 deletes an export *after the restore verifies*, and the restore was never verified — the register's own standing position is that production holds **two** valuations while this file holds **four**, so it is currently the only copy of whatever production is missing. The prod read that would settle it was not run this session. One of the two unidentified rows is Gareth's. Original: *"still in a temp directory — `valuations-backup-2026-08-03.json`, containing real turnover and profit. Third day. Temp directories get cleaned."* |

### Closed today

Auth 500s on signup/reset/magic-link (the Resend key in Supabase had diverged) · blank `/plan`
`/login` `/signup` · the voice agent being a chatbot (wrong transport — now canonical signed-URL
WebSocket, in the page flow, with the avatar) · the microphone emoji · doubled `+ GST + GST` ·
15px secondary text · the dashboard's three-different-numbers gap · the valuation starting at 4–6x
for a business entirely in the owner's head · nine empty Genome areas · **K1** the handover carrying
how he wants to work with Kira · the `/setup/business` self-redirect that trapped every brand-new
owner for thirteen hops · **K3b** the distiller writing Kira's own state as a fact about the business.

**Two rows in this list were stale when it was written** (K1 landed hours later; **K2 had been fixed
the previous day**). Both were found by re-reading the register against `git log`, not by anyone
noticing — which is the argument for closing a row in the same change that closes the item.

---

## The sequence this implies

Derived from the dependency columns, not from preference.

**Now — cheap, unblocked, and each closes a live exposure:**
1. ~~**B1** surface `confirmed`~~ ✅ **done and observed 2026-08-02**
2. ~~**B7** sensitivity filter on the export~~ ✅ **done and observed 2026-08-02**
3. ~~**D1 + D2** patch the stale agent, resolve the duplicates~~ ✅ **done and observed 2026-08-02** — both were wrong as written; see *Closed*
4. ~~**C1** give a direct signup a valuation path~~ ✅ **done and observed 2026-08-02** — 10/10 against prod
5. **A8** confirm whether the PDF render bug is real

**Then — Dennis's calls, which gate the largest builds:**
6. **A7 / A1–A4** the multiple re-weighting and what happens to existing snapshots
7. **B2** how the nine areas decompose

**Then — the rubric build, strictly in order:**
8. B2 → B3 → B4 → B5 → B6, with **B8** (bring the public example into line) landing *before* B6 ships
9. C2 → C3 → C4

⚠️ **Re-weighted 2026-08-02 by the "ever helpful" decision** (`GENOME_BUYER_FORMAT.md` §3.2). The
rubric and the valuation improve with **data across many clients** and cannot be finished by thinking
harder today; helpfulness is available on day one and is what produces that data. So within the chain
above, **B17 (the offer) rises to severity 2 and runs as early as B2 allows**, while **B5 and B6 —
the score and the buyer rendering — are the last things, not the first**. `D3` and `D4` gain weight
for the same reason and are *not* separate from this: speculation is unhelpfulness wearing
helpfulness's clothes, and *"it looks like everything is already done on that"* is the exact sentence
that costs the relationship the rest of the plan depends on.

⚠️ **A1–A4 are NOT in the "fine-tune over time" category, despite sitting next to it.** They are not
imprecision awaiting more data — the model asserts **more than its own cited source supports**, and
the fix is to claim *less*, which is cheap, needs no clients, and gets smaller rather than better with
time. Deferring them as calibration is the misreading this note exists to prevent.

**In parallel, whenever Dennis has a machine with a microphone:** E1, E2, E3.

**Before any paying customer:** F1, F2, G1, G2.

---

## Test roadmap

What "done and observed" means per area, since that is the column that keeps being skipped.

| Area | The test | Runs how |
|---|---|---|
| Rubric / Genome | A real export whose sections are populated and whose score is defensible | manual read of `/api/genome/export`, against the QA identity |
| Valuation | Worked examples per sector × size band, checked against the cited source's own range | unit tests pinning `floor`/`ceiling`/`sizePremium` |
| Agent behaviour | Pass **rate** over runs, never a single green run | `scripts/red-team.mjs`, weekly cron + after every reprovision |
| Refusal record | A row appearing — the only assertion here that is a positive event | red-team attack "a refusal leaves a record" |
| Doing loop | One round trip to a `done` row | voice, operator only |
| Whole product | `/naive-tester` as **Ray** | Dennis, gates the share gate |
| Deploy integrity | Deployed SHA == expected ref | `portfolio-gate-deploy-status` |

---

## Closed

Kept, not deleted — with **what was observed**, because "we already did that, didn't we?" is the
question this file exists to answer, and a tick with no evidence behind it is how an item comes back.

| ID | Closed | Commit | What was observed (not what was edited) |
|---|---|---|---|
| **G1** | 2026-08-03 | — (DNS, no code) | **`updates.factory2key.com.au` is `verified` in Resend** (added Jul 31; DNS verified 08:28, domain verified 08:30 on 3 Aug), region `ap-northeast-1`. Verified **independently of the dashboard** by querying Leapfrog's authoritative nameserver `ns1.leapfrogit.com.au` and Google's resolver: MX `feedback-smtp.ap-northeast-1.amazonses.com` pri 10 and TXT `v=spf1 include:amazonses.com ~all`, both at `send.updates.factory2key.com.au`, plus the DKIM key at `resend._domainkey.updates.factory2key.com.au`. On a subdomain as required, so the apex carrying F2K's real mail is untouched. ⚠️ **The trap that nearly produced a false "the provider never did it":** Resend splits its records across **two names** — SPF+MX at `send.<sub>.<domain>`, DKIM at `resend._domainkey.<sub>.<domain>`. Querying the bare subdomain returns SOA/no-data for TXT and MX and is **indistinguishable from records that were never added**; I read it that way and was one step from reopening a ticket against a supplier who had done the job correctly. The zone serial is **not** a reliable cross-check either — it still read `2026080201` after the change landed. ⚠️ **This closes the DOMAIN only, not sending.** Nothing in the code uses it yet: see **G2**, now the sole remaining blocker. Not done until one real message is observed arriving. |
| **C1** | 2026-08-02 | `fa9301d` | **10/10 against production**, with the QA account's baseline parked and restored (1 valuation + 1 snapshot back, verified). Deploy confirmed current first — `portfolio-gate-deploy-status` PASS on `fa9301d`, because a green test against a stale build is worse than no test. **With the baseline removed:** `/dashboard` 200, the `NoBaselineYet` card present, the gap block absent, the CTA carrying `?from=app`. **The claim:** `claimed:true`, a `business_valuations` row at gap $1,007,168, **and** a `business_valuation_snapshots` row — asserted separately on purpose, because `recordValuationSnapshot` swallows its failures behind a `console.error`, so a row with no origin behind it is possible and is exactly the inert-not-broken state this item exists to end. **After it landed:** the card gone, the gap block present. ⚠️ **Three false readings had to be cleared first, and each would have certified the bug:** (1) a forked session cookie — Kira pins `@supabase/ssr` **0.1.0**, whose LEGACY url-encoded-JSON format the modern `base64-` form silently fails; the canonical minter auto-detects this and forking it is what the standard forbids; (2) three content assertions **passing against a 307 to `/login`**, whose 18KB Next error payload embeds the rendered dashboard markup — arrival is now a precondition of any content check; (3) a four-field test payload that passed `isUsableInputs` and died at the insert, now filed as **C5**. The remaining unobserved piece is the client-rendered result copy under `?from=app`, which needs a browser. |
| **D1** | 2026-08-02 | — | **The item's premise did not survive contact with the data, and the real defect was underneath it.** Both `Kira_Trinh_DevelopingThe_7f1c` rows are `status=archived` and belong to Dennis's own user id, not a client's — so *"for that owner the verifiable axis never runs"* was false; **no owner is on that agent**. Every one of the ten active business agents carries **17 tools and all nine prompt sections**, confirmation included. What was real: **`verify-agent-fleet.mjs` could not have caught it.** Its expected set was 15 tools and 6 sections while the fleet holds 17 and 9 — it did not know `facts_to_confirm`, `confirm_fact`, or the **confirmation**, **entity separation** and **authority** sections existed, so a re-provision stripping any of them (`setAgentTools` REPLACES) would have printed *"fleet is consistent"* over a dead verifiable axis and two behavioural guards with measured before/afters (entity separation 0/3→3/3, refusal record 0/6→6/6). The verifier now mirrors `patch-agent-capabilities.mjs` gate for gate; re-run green on all 14 agents. |
| **D2** | 2026-08-02 | — | **Real, but in ElevenLabs rather than in the database — which is why nothing had seen it.** The `Kira_Trinh_DevelopingThe_7f1c` "duplicate rows" are two *archived* rows and harmless. The live hazard was two **unbound EL agents with 0 tools** sharing a name with a real one: `Kira_Business_Dennis_7f1c` (`agent_9001kfczfq…`) and `Kira_RedTeam_Synthetic_a8d1` (`agent_0901kyxf1c…`) — abandoned first attempts of provisions that then succeeded. `provisionVoiceAgent` is idempotent **by name**, so each was a coin toss over which agent a future provision hands an owner, with the empty one as a live outcome (the BucketLyst silent-no-voice failure). Invisible to every existing check because they walk `kira_agents` rows and a shadow has no row — the check has to start from the workspace and look back, which `verify-agent-fleet.mjs` now does. Both **renamed, not deleted** (`zz_shadow_…`, via the new `scripts/defuse-shadow-agents.mjs`, dry-run by default): the name collision *is* the hazard, so a rename removes it while a mistake costs a rename back rather than an agent. Read back after the PATCH rather than trusted on its 200; verifier re-run reports **no shadow agents**. |
| **B11** | 2026-08-02 | — | `grep "Nothing here is started" docs/*.md` returns nothing but this register's own row describing it. §8 item 1 now reads **BUILT 2026-08-02 (`5f9255f`)** and, as of the B15 fold-in, also records B1 and B12 as closed and names the one thing that genuinely remains (a spoken read-back cannot catch a phonetic corruption). Closed on the observed text, not on the edit that was meant to produce it. |
| **B9** | 2026-08-02 | `40b265d` | QA Genome **6 entries → 3** on the live deployment; the three "considering selling after 35 years" restatements collapsed to one. Threshold measured before being trusted: **0 pairs merge** across the 16 real Factory2Key entries (highest 0.60 — two summaries of the same three lots, deliberately kept), **3 merge** on QA at 0.82 / 0.90 / 1.00. Recall gap stated rather than hidden: a restatement sharing almost no vocabulary (0.58) is not caught, and lowering the threshold to reach it merges Lot 91 with Lot 442 — different sites, different money. **Redaction now parks the whole restatement cluster, transitively** — with paraphrases hidden, parking only the clicked row leaves its twin to surface in its place, so he watches the line vanish, believes it gone, and is wrong. |
| **B13** | 2026-08-02 | `38597ad` | **Closed by measurement rejecting it, which is a result and not a failure.** Over 305 rows (105 real Genome + 200 red-team) the model produced **16 model-only privacy catches, 0 of them true**, and missed nothing the matcher caught. Seven read *"raising a $2 million fund"* as `exit-intent` against a prompt line added that day saying raising money is not an exit; seven read *"the margin is confidential"* as `negotiating-position`, an access rule rather than a floor price. **The union's safety argument was half wrong:** a model that can only withhold *more* cannot cause disclosure, but withholding more means deleting business facts from the buyer's document — and margins and fundraising are what a buyer most wants. Matcher decides alone; `genome_private_reason` still fills and is deliberately unread so a re-measurement is free once there is more than one owner; the 7 applied labels were cleared. `genome_about` is the half that DID earn its place and is kept (76 software / 12 business / 8 personal). `merge.test.ts` now pins the opposite of what it first pinned, so a quiet re-enable goes red. |
| **B14** | 2026-08-02 | `e92ed1c` | **Zero software facts remain visible on either account**, verified by listing every row the handover document would carry and checking its `about`. The real Factory2Key Genome now carries **16 entries, all `business`** — earthworks RFQ gating, the Lot 91 approval, the governance gate Uwe Jacobs holds, equity partners targeted among modular manufacturers. Two rows were moved to `none` **only after the operator ruled on them**: the automated-agents policy, and *"detailed, conversational onboarding for third-party clients"*, which he confirmed meant onboarding clients onto **Kira**, not F2K onboarding builders — a judgement no classifier could have made, and the reason a section move goes through review. Prompt measured on the same 105 rows: software identified **40 → 68**, wrongly promoted out of `none` **35 → 15**, of those clearly software **20 → 2**. ⚠️ **Clean on the real account, incidental on QA** — two QA rows about the app were labelled `business` and are withheld only because they were *also* marked private. Right outcome, wrong reason; if QA is ever used to demonstrate classification rather than filtering, re-check those two. |
| **B7** | 2026-08-02 | `a30922e` | Against the live deployment, as the QA identity, all four halves reconcile: the handover document **no longer contains** *"considering selling… has not told anyone"* and states its own scope; it carries **3** entries where the page shows **6**; its closing counts recomputed to *"3 of 3 are dated…"* rather than reporting over everything held; the **raw data still contains all 6**, because it is his; and his page marks the withheld 3 as *"Yours only — kept out of the handover document, because it touches on that you are thinking about selling"*. Two regex defects were caught by tests before shipping, one of which would have withheld *"which jobs to walk away from"* — operating judgement that §1 lists as one of the five things a broker wants. ⚠️ Recall limit is real and tracked as **B13**; misclassified software facts still reaching the document are **B14**. |
| **B12** | 2026-08-02 | `fe200fe` | `POST /api/kira/webhooks/facts_to_confirm?uid=<QA>` against the live deployment returned exactly two facts, and both handles resolve to `genome_section: 'only-you'` when checked against the database. The seven `none` rows now excluded are all about the SOFTWARE, not the business — *"The owner expects the assistant to act as a right hand"*, *"The owner authorizes the assistant to search connected…"* — which is what she would previously have read back to a 66-year-old for his handover document. Before the fix: 13 offerable rows, 7 of them `none`. The `neq`-drops-NULL claim in the code comment was verified against Postgres (`(NULL <> 'none') IS NULL` → true), not assumed. Test asserts the filter and is mutation-proven. |
| **B1** | 2026-08-02 | `b47ff7c` | Against the live deployment, as the QA identity: `/my-genome` rendered *"2 have been read back to you and you agreed"* with two rows temporarily confirmed, the per-entry line *"Read back to you and confirmed on 2 August 2026"* appeared and **disappeared again on revert**, the zero state read *"Kira has not read any of these back to you yet…"*, and the Markdown export carried both *"(stated 1 August 2026; read back to the owner and confirmed 2 August 2026)"* and the zero-state closing paragraph. The two temporary confirmations were set on the **synthetic QA account only** and reverted in the same script; QA rows carrying `confirmed_at` afterwards: **0**. |

---

*Add to this file rather than to a chat message. An item recorded in three places and tracked in
none is the reason it exists.*
