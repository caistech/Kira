# Build register — Kira

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
| **B2** | Nine-area model does not exist in code | MISS | 2 | — | `derive.ts` still ships the original six sections. **Gates B3–B6 and C1–C3.** |
| **B3** | `only-you` retired as a section, becomes the per-area axis | MISS | 2 | B2 | Evidence it is urgent: in the QA export **5 of 6 sections are empty and everything landed in `only-you`**; on the red-team account it holds 115 of 233 classified rows. The taxonomy is functioning as five sections plus a bucket. |
| **B4** | Deactivation — she proposes, he confirms, both recorded | MISS | 2 | B2 | §4. Without it there is no denominator, so every percentage after it is indefensible. |
| **B5** | Three-axis score, weighted by the §3.1 ranking, held **as data** | MISS | 2 | B2, B4 | §3.1 obliges the ranking to be cheap to re-order. It is currently prose in a markdown table — the one form that makes a broker's re-order a rewrite. |
| **B6** | Two renderings + the buyer-view sign-off **gate with a mechanism** | MISS | **1** | B5 | §5 decided: never shown to anyone without per-release sign-off naming who and when. See **B7** for why this is severity 1. |
| ~~**B7**~~ | ~~The export has no sensitivity filter at all~~ | — | — | — | ✅ **CLOSED 2026-08-02 (`a30922e`)** — see *Closed* below. |
| **B13** | LLM privacy verdict — **built and deployed, benefit NOT demonstrated** | PROVE | 3 | — | The machinery shipped (`cd1d6b9`/`e92ed1c`): the classifier now returns a `private` verdict off the existing call, stored on the row, and render-time privacy is the **union** of matcher and model so the model can only ever withhold more, never less. **But on 105 rows of the real Factory2Key Genome it found exactly one row the matcher missed, and that one was a false positive** (*"Dennis has two businesses and is interested in discussing both"* → `not-yet-told`, which is not what that sentence says). So the recall gain this item exists for is **unproven on real data**. Do not close it on the code existing. Next evidence: run the dry run over an account with richer conversational history, or accept that the matcher is sufficient and retire the column. |
| **B14** | Software facts misfiled — **fixed forward, 24 rows still misfiled** | BUG | 2 | — | The prompt now treats `software` as the default suspicion with the concrete indicator list restored, and `about=software` forces `section='none'` **in code** rather than by request. Measured improvement on the same 105 rows: software correctly identified **40 → 68**, rows wrongly pulled out of `none` **35 → 15**, of those clearly software **20 → 2**. New facts classify correctly from `e92ed1c`. **What remains:** 24 existing rows whose section the classifier wants to move were deliberately NOT applied — the operator chose labels-only, because a section move changes what he sees on his own page. They keep `genome_privacy_classified_at IS NULL`, so a later reviewed pass will pick them up unchanged. |
| **B8** | Public example still promises fabricated precision | DEBT | 2 | — | `/genome` renders `example.ts`: per-section percentages (78/54/41), an overall figure, three confidence levels — all hand-authored. §6 requires this resolved *before* the scorecard ships. Same class as the removed testimonials. |
| **B9** | Near-duplicate facts survive the dedupe | BUG | 2 | — | QA export: 6 entries are really 2 facts, each stated 2–3 times as paraphrases. The `derive.ts` dedupe normalises the string, so paraphrase passes. Its own comment says this is how a document reads as generated rather than written. |
| **B10** | Memory-poisoning residue reads badly | DEBT | 3 | — | Two surviving entries are contorted artifacts of Ray's attack ("…despite indicating standing approval…"). Not a security issue since the sweep landed; a quality one in a buyer-facing document. |
| **B11** | `§8` says "Nothing here is started" | DEBT | 4 | — | Stale — B1's dependency (the confirmation record) shipped 16 minutes after that line was written. |

---

## C. Onboarding and the two entry states

Decided 2026-08-02, `GENOME_BUYER_FORMAT.md` §4.1. All blocked by **B2**.

| ID | Item | Type | Sev | Blocked by | Detail |
|---|---|---|---|---|---|
| **C1** | Direct signup gets **no valuation at all** | **BUG** | **1** | — | Both writers originate from the eleven questions (Stripe metadata, device handoff). A broker-referred client who signs up without running them has no gap, no baseline snapshot, and the introducer's movement column has nothing to move — *inert rather than broken*. `/r/[token]` lands on the home page, so this is the channel most likely to produce it. |
| **C2** | The eleven answers never seed the Genome | MISS | 2 | B2 | They sit in `business_valuations.inputs` as JSON; `derive.ts` reads only three scalars. Without this, onboarding re-asks what he answered minutes earlier. |
| **C3** | Onboarding question set — 3 blocks, block/block/skip | MISS | 2 | B2, C2 | Baseline (skipped if claimed) · Scope (always) · Depth (skippable). |
| **C4** | Pre-fill must not count as confirmation | DEC | 3 | C3 | Constraint recorded in §4.1; needs enforcing when C3 is built, or day one opens high and never moves. |

---

## D. Agent fleet and behaviour

| ID | Item | Type | Sev | Detail |
|---|---|---|---|---|
| **D1** | `Kira_Trinh_DevelopingThe_7f1c` is on 15 tools with no confirmation section | BUG | 2 | Live fleet audit 2026-08-02. The other three business agents carry 17 + the section. For that owner the verifiable axis never runs. |
| **D2** | Duplicate agent rows | BUG | 2 | `Kira_Trinh_DevelopingThe_7f1c` ×2; `Kira_RedTeam_Synthetic_a8d1` ×2, the second with **0 tools**. The `ensureUserAgent` duplicate-name defect recorded against BucketLyst. |
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
| **E8** | Settings price positive path | 3 | first subscriber | `getSubscriptionPrice()` reads the real monthly from Stripe; no subscribed account exists, so only the null path has ever rendered. |

---

## F. Billing and go-live

| ID | Item | Type | Sev | Detail |
|---|---|---|---|---|
| **F1** | Live-mode Stripe webhook endpoint does not exist | MISS | **1** | Test mode only. |
| **F2** | `configure-billing-portal.mjs` never run against LIVE | MISS | **1** | Stripe's portal cancel **cannot waive** — it invoices either way. Two doors, one of which breaks the arrears promise, is not a promise. Test and live portals are separate configurations. |

---

## G. Blocking a real client (Factory2Key)

| ID | Item | Type | Sev | Detail |
|---|---|---|---|---|
| **G1** | F2K has no sending domain in Resend | MISS | **1** | From: is still `noreply@updates.corporateaisolutions.com` — a construction client receives F2K mail from the AI company. Needs **DNS records on a subdomain** (`updates.factory2key.com.au`), not the apex, which carries their real mail. |
| **G2** | Per-tenant `from` resolution | MISS | 2 | `drainEmailOutbox` already accepts `from`; it comes from one env var and needs resolving per tenant. Small. |
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
| **I4** | Second Kira account for Global Buildtech | 4 | Deferred by decision, not blocked. Architecture supports it — tenant = user id. The 52 parked memories are the corpus. |

---

## The sequence this implies

Derived from the dependency columns, not from preference.

**Now — cheap, unblocked, and each closes a live exposure:**
1. ~~**B1** surface `confirmed`~~ ✅ **done and observed 2026-08-02**
2. ~~**B7** sensitivity filter on the export~~ ✅ **done and observed 2026-08-02**
3. **D1 + D2** patch the stale agent, resolve the duplicates
4. **C1** give a direct signup a valuation path
5. **A8** confirm whether the PDF render bug is real

**Then — Dennis's calls, which gate the largest builds:**
6. **A7 / A1–A4** the multiple re-weighting and what happens to existing snapshots
7. **B2** how the nine areas decompose

**Then — the rubric build, strictly in order:**
8. B2 → B3 → B4 → B5 → B6, with **B8** (bring the public example into line) landing *before* B6 ships
9. C2 → C3 → C4

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
| **B7** | 2026-08-02 | `a30922e` | Against the live deployment, as the QA identity, all four halves reconcile: the handover document **no longer contains** *"considering selling… has not told anyone"* and states its own scope; it carries **3** entries where the page shows **6**; its closing counts recomputed to *"3 of 3 are dated…"* rather than reporting over everything held; the **raw data still contains all 6**, because it is his; and his page marks the withheld 3 as *"Yours only — kept out of the handover document, because it touches on that you are thinking about selling"*. Two regex defects were caught by tests before shipping, one of which would have withheld *"which jobs to walk away from"* — operating judgement that §1 lists as one of the five things a broker wants. ⚠️ Recall limit is real and tracked as **B13**; misclassified software facts still reaching the document are **B14**. |
| **B12** | 2026-08-02 | `fe200fe` | `POST /api/kira/webhooks/facts_to_confirm?uid=<QA>` against the live deployment returned exactly two facts, and both handles resolve to `genome_section: 'only-you'` when checked against the database. The seven `none` rows now excluded are all about the SOFTWARE, not the business — *"The owner expects the assistant to act as a right hand"*, *"The owner authorizes the assistant to search connected…"* — which is what she would previously have read back to a 66-year-old for his handover document. Before the fix: 13 offerable rows, 7 of them `none`. The `neq`-drops-NULL claim in the code comment was verified against Postgres (`(NULL <> 'none') IS NULL` → true), not assumed. Test asserts the filter and is mutation-proven. |
| **B1** | 2026-08-02 | `b47ff7c` | Against the live deployment, as the QA identity: `/my-genome` rendered *"2 have been read back to you and you agreed"* with two rows temporarily confirmed, the per-entry line *"Read back to you and confirmed on 2 August 2026"* appeared and **disappeared again on revert**, the zero state read *"Kira has not read any of these back to you yet…"*, and the Markdown export carried both *"(stated 1 August 2026; read back to the owner and confirmed 2 August 2026)"* and the zero-state closing paragraph. The two temporary confirmations were set on the **synthetic QA account only** and reverted in the same script; QA rows carrying `confirmed_at` afterwards: **0**. |

---

*Add to this file rather than to a chat message. An item recorded in three places and tracked in
none is the reason it exists.*
