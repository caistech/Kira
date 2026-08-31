# Decisions — Practice Intelligence, entitlements and the capability architecture

> Companion to `DECISIONS.md`, which holds **product framing**. This holds the **architecture and
> implementation** decisions for the Practice Intelligence workstream and the capability/entitlement
> model it sits inside.
>
> **The rule is the same as its parent:** a decision belongs here the moment it is made, whether or
> not it is built, and the gap between decided and built is stated — because that gap is what a later
> session re-litigates or silently reverses.
>
> **All 31 decided 2026-08-14** unless noted. Status column is honest: `decided` means agreed and not
> yet built.

---

## 1. Time-sensitive — the cost rises if deferred

### D1 — Tool name: go GENERIC · `decided`

`research_practice` → a generic organisation-research tool with a **sector parameter**. The domain
pack (vendor signatures, directory hosts, page-path hints, people-prompt wording) is selected
server-side from that parameter.

**Why now:** the tool is bound in six places *and* in vendor state once provisioned. Renaming before
the first fleet reprovision is a code change; after it, it is a fleet operation, and orphaned vendor
tool objects cannot be reliably deleted (the vendor refuses deletes it believes are in use).

**Consequence:** one tool for all sectors rather than one tool per sector — which also protects the
function-calling menu from growth, the measured failure mode that cost this product a model.

⚠️ **This must land before D6 (reprovision).**

### D2 — Entitlements are TWO-LEVEL (distributor → end-user) · `decided`

Shape it now; the distributor tier can stay unused. We sell to distributors who clip per active
end-user, so a distributor must be able to say *"all my users get Drive read-only, nobody gets Gmail
write."* A single-level design would be rebuilt the first time that is asked, touching every call site.

### D3 — `verify-agent-fleet.mjs` changes in the SAME change as entitlements · `decided`

Non-negotiable. It compares live agent tools against `toolDefsFor(...)`; once that is
entitlement-aware, an un-updated fleet check reports every non-full-plan user as drifted. A drift
detector that cries wolf is switched off, and then the first failed downgrade is invisible.

---

## 2. Blocking — answered

| # | Decision | Outcome | Status |
|---|---|---|---|
| **D4** | Fix the fabrication defects before anything else | **Yes — fix first.** Sequencing anything ahead of it is not defensible | `agreed, in progress` |
| **D5** | Brave API key | Operator to verify and add `BRAVE_SEARCH_API_KEY` | `open — operator` |
| **D6** | Authority to modify the live system prompt | **Granted** | `granted` |
| **D7** | Authority to reprovision the live agent fleet | **Granted** | `granted` |

---

## 3. Shaping

### D8 — JS-rendered sites: accept and report honestly · `decided`

No headless rendering. A site we cannot read produces an explicit *"this site requires JavaScript — I
could not read it"* verdict, never "nothing found". Rendering stays available as a later option;
third-party structured sources are the preferred escape hatch if coverage becomes a real problem.

### D9 — Corporate-entity traversal: after the loop is proven · `decided`

practice → parent → operator → executives is where the value actually was in the HBF case, and a
human did all of it. It becomes a bounded extension of the same tool, **after** the end-to-end
conversation loop is proven — not before.

### D10 — Persistence of research findings: leave as is · `decided`

Nothing persisted for now. Accepted consequence: a second pass on the same target re-spends and
accumulates nothing. Revisit with `kira_memory` / Mnemo when the loop is proven, per `DATA_STANDARD`
(authoritative facts to a table, distilled conclusions to Mnemo).

### D11 — Prompt budget: the RELOCATION TRANCHE · `decided`

Move ~12.5k of tool-usage prose out of the system prompt and onto the tool descriptions it belongs
to — descriptions are sent as the function schema regardless and cost nothing against the prompt
budget. Not a raise; the budget test's own note says the next section added should be the tranche,
not another raise.

**Second-order benefit:** under entitlements the prompt becomes a function of the capability set, so
every tenant gets a smaller prompt than today — attacking instruction dilution directly.

### D12 — Office-hours behaviour lives in `exec-philosophy.mjs` · `decided`

Cross-cutting adversarial reasoning (challenge before researching, evidence vs inference, willingness
to conclude "this is weak") belongs to the fractional-exec persona, not to Practice Intelligence.
Encoding it in a domain tool means it only fires for that domain. **Gated on D11** — there is no room
until the tranche lands.

### D13 — Build entitlements AFTER Practice Intelligence proves out · `decided`

### D14 — Entitlement source of truth: KIRA ADMIN · `decided`

Kira owns the user, the Stripe webhook and the admin panel that already reprovisions agents. **No
Orchestrator mirror** — the Orchestrator keeps enforcing what it already enforces per tenant
(`connections`, `delegation_policy`, `requiresSenderIdentity`), which is *authority to execute*, a
different question from *entitlement to have*.

Decisive argument: Practice Intelligence never touches the Orchestrator, so the Orchestrator could
not be the source of truth for the first capability we intend to sell.

### D15 — Control plane: BOTH, resolved from stored inputs · `decided`

```
effective = resolve(stripe_plan, distributor_policy, admin_override)
```

Store the inputs, derive the output. An admin toggle must never write into the field the Stripe
webhook writes — two writers on one column is a failure this codebase has already taken. Overrides
are reasoned, attributed and logged.

### D16 — Read and write are SEPARATE entitlements per connector · `decided`

Drive read ≠ Drive read/write; Gmail read ≠ Gmail read/write; accounting likewise. Maps onto a
boundary that already exists and is enforced (`class: 'read' | 'effect'` in the Orchestrator's tool
register; Kira's own read/write tool split).

### D17 — Plan → capability mapping lives in OUR config · `decided`

Not in Stripe metadata. Capabilities are the primitive; Stripe only knows about plans. Mapping must
be mode-aware — a Stripe price id belongs to exactly one mode.

### D18 — Missing entitlement argument: THROW · `decided`

`toolDefsFor` / `toolsSection` are `.mjs` with no type checking, so a missed call site would silently
default. Failing open gives away paid capability; failing closed silently removes it. Throwing forces
every call site to declare, consistent with the Orchestrator register's `validate()`.

### D19 — Downgrade takes effect at PERIOD END · `decided`

Not on payment failure — that is dunning, not a decision. Warn before cutting.
**Deletes stay out of the payment path:** revocation detaches the tool from the agent; vendor
workspace cleanup belongs to the periodic prune, because vendor deletion can be refused.

### D20 — Memory PERSISTS on downgrade; capability stops · `decided`

It is the owner's own business knowledge and deleting it on a billing event is hostile. She keeps
what she learned, loses the ability to refresh it, **and must say so plainly** — the third honesty
state (`not built` / `it failed` / `not on your plan`) must never collapse into the other two.

### D21 — `runTextTool` bypassing webhook routes: leave for now · `decided`

Recorded as known: `runTextTool` calls handlers in-process, so any check placed in a webhook route is
enforced on voice and skipped on text. **This is already true today** for the tool secret and the
disclosure gate. When entitlement checks land, they must sit at the shared choke point (inside the
capability function), not in the route.

---

## 4. Deferred — flagged, safe to leave

| # | Decision | Outcome |
|---|---|---|
| **D22** | Vendor names in the `BookingStatus` **type** — the only coupling that would force duplication for a second sector | Generalise (vendor as data, not a type member) **when next touching the result contract for another reason** |
| **D23** | Naming (`researchPractice`, `PracticeResearchResult`, the directory) | Leave — cost is constant, no urgency. ⚠️ Partially superseded by D1, which renames the *tool*; the internal symbols can follow later |
| **D24** | Orchestrator EVT draft path (~10 lines, mirrors the `sweeper.ts` insert) | On the todo list — needed only when outreach actually hands off |
| **D25** | Research-evidence seam: pass evidence in the dispatch payload vs Orchestrator re-fetch | **Decide before Phase 4**, not during |
| **D26** | Domain-pack extraction to `@caistech/*` | Waits for a second consumer (2nd-occurrence rule) |
| **D27** | What triggers Opportunity Discovery becoming real | **Provisional: a user asking Kira to research a non-practice sector.** ⚠️ Recorded as the operator's suggestion and **not yet confirmed** — needs a decision on whether that is a trigger to *build*, or a trigger to *decide* |
| **D28** | Retire the dormant Serper stack | **Yes — retire.** ⚠️ **Precondition:** `app/api/pubguard/v2/analyzers/news.ts` and `app/api/pubguard/v2/scan/route.ts` are **live consumers** of `lib/serper/client.ts`. Only `lib/kira/research-tools.ts` and `app/api/kira/research/route.ts` are dormant. Retire the dormant half; PubGuard's dependency is a separate decision |

---

## 5. External review and housekeeping

| # | Decision | Outcome |
|---|---|---|
| **D29** | External brief redaction | **REVERSED same day. Anonymise the client.** Initially decided as "share the concrete case"; the brief was un-redacted and then re-anonymised on the operator's instruction. The organisation, its booking vendor and the two model-fabricated names are all withheld; the measurements in §4 stay verbatim, because the numbers are the evidence and they carry no identity. An NDA route is offered in the closing note if the concrete case would materially help the reviewer. **Standing rule this sets: a real commercial target is not named in a document going to an external party by default** |
| **D30** | Appendix A3 (detection algorithm) | **Keep it in.** Review quality is worth more than the secrecy — the moat is the substrate and methodology, not a domain-matching regex |
| **D31** | Commit the brief and this register | **Yes** |

---

## Execution order that follows from the above

1. **D4** — fix the fabrication defects (grounding guard, visible-text floor, honest status, JS
   verdict, the `book`-inside-`facebook` false positive).
2. **D1** — rename to the generic tool + sector parameter, **before any reprovision**.
3. **D5** — Brave key.
4. **D11** — the relocation tranche, then **D12** office-hours behaviour.
5. **D7** — reprovision the fleet; prove the loop end to end.
6. **D9** — corporate-entity traversal.
7. **D13** — entitlements (D2, D14–D20 apply), with **D3** in the same change.

**Not started, deliberately:** D24, D25, D26, D27, the Opportunity Discovery framework.

---

## 6. Maturity Model & P2.3 Gate Decisions (Admin Approved 2026-08-30)

### D32 — Maturity Model is the primary product architecture · `decided, approved`

The Business Understanding Maturity Model (Levels 0–7) is the architectural invariant.
"Learning" (the process of refining the Business Genome) is the product. Memory is Interaction Evidence.
Readiness is Level 1 (Assessment Complete), not a "paid" feature. The 13-question assessment is the Spark.

### D33 — Gate 1: First-Class Subscription Entity · `decided, approved`

Move to `Organisation → Subscription`. Person is the Commercial Actor (initiates, administers, pays);
Organisation is the enduring anchor.

### D34 — Gate 2: Knowledge stores re-scoped · `decided, approved`

`kira_knowledge` re-scoped to Organisation as "Evidence". Governance process promotes to
`organisation_knowledge`. Organisational intelligence survives personnel changes (INV-020).

### D35 — Gate 3: Memory = Interaction Evidence · `decided, approved`

`kira_memory` is Interaction Evidence (source material). The Genome (governed, interpreted, classified
facts) is the Product. Lifecycle: Evidence → Governance → Knowledge.

### D36 — Gate 4: Strangler Fig migration · `decided, approved`

Proceed via incremental migration. New writes use `organisation_id`. Gradual backfill of existing rows.
No big-bang schema swap.
