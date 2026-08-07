# Kira Component Interface Specification

**Version 1.0.0 · Issued 8 August 2026**

**Proprietor:** Global Buildtech Australia Pty Ltd (ACN 672 395 685, ABN 54 672 395 685),
76–84 Brunswick Street, Fortitude Valley QLD 4006, Australia ("**GBTA**").

---

## 0. Statement of ownership and independent development

This specification, the interfaces it defines, and every adapter implementing it are the sole and
exclusive property of GBTA.

They were **conceived, authored, implemented and published by GBTA independently**, without
reference to, and prior to receipt of, any confidential information of any prospective component
supplier. The provenance evidence in §6 is contemporaneous, third-party attested, and predates any
architectural disclosure to GBTA under any confidentiality agreement.

Nothing in this specification is licensed, assigned, or granted to any other party by
implication, estoppel, or by the operation of any confidentiality agreement. A supplier
implementing an adapter against this specification acquires no right in the specification itself.

**Why this document exists.** GBTA's product is not any single component. It is the **contract each
component implements** — the thing that makes components interchangeable. Suppliers of orchestration,
memory, retrieval and execution are substitutable by design. The interface that makes them
substitutable is not.

---

## 1. Scope

This specification defines four interfaces ("**Seams**") across which a third-party component may be
plugged into the Kira product without modification to Kira.

| Seam | Interface | Direction | Status at issue |
|---|---|---|---|
| **1** | `SwarmCoordinator` | Kira → execution/orchestration component | **In production.** Three implementations exist (§3). |
| **2** | `MemoryGovernance` | Kira → semantic/experiential memory component | Interface defined; stub implementation is today's Mnemo wire. |
| **3** | `SystemOfRecord` | Execution component → structured record store | Interface defined; stub logs proposals only. |
| **4** | `AgentBuilder` | Third-party builder → Kira discovery output | Interface defined; stub maps discovery to spec. |

Seam 1 is normative and load-bearing; Seams 2–4 are defined and stubbed. All four are GBTA's.

---

## 2. Normative interface — Seam 1, `SwarmCoordinator`

A conforming component MUST implement the following contract. Canonical source of truth:
`lib/kira/swarm/coordinator.ts` (hash in §6).

```ts
interface SwarmCoordinator {
  dispatchIntent(intent: DispatchedIntent): Promise<DispatchResult>;
  getTaskState(taskGroupId: string, tenantId: TenantId): Promise<TaskStatus>;
  resolveApproval(
    taskGroupId: string,
    tenantId: TenantId,
    approve: boolean,
    patch?: { recipientEmail?: string },
  ): Promise<DispatchResult>;
  listTasks?(tenantId: TenantId, opts?: { statuses?: TaskState[]; limit?: number }): Promise<TaskSummary[]>;
}
```

**Task lifecycle (closed set).** `queued` · `awaiting_approval` · `scheduled` · `done` · `failed` ·
`unsupported`. A component MUST NOT introduce states outside this set; unrecognised values are
rejected at the boundary by `asTaskState`, which returns `null` rather than a fallback.

**Human-in-the-loop is a property of the interface, not of any implementation.** No outbound action
executes until the owner approves. A conforming component MUST honour `awaiting_approval` and MUST
NOT execute an outbound action on dispatch alone.

**Idempotency.** `intentId` is the idempotency key. One utterance MUST NOT dispatch twice.

**Tenancy.** `TenantId` is the canonical business-and-owner key and is the SAME key across tasks,
working memory and records (Seams 1, 2 and 3). A component MUST NOT key on any identifier of its own
that GBTA cannot reproduce.

**Provenance of recipients.** `recipientSource` distinguishes an address the owner spoke from one
resolved out of the owner's own contact book, because the two must be read back to him differently.

---

## 3. Substitutability is demonstrated, not asserted

Seam 1 has **three** independent implementations, all GBTA-authored, selected at runtime by the
`KIRA_SWARM_ADAPTER` environment variable with no change at any call site:

| Value | Implementation | Notes |
|---|---|---|
| `local` *(default)* | `LocalSwarmStub` | Fully self-contained. Runs the owned tasks end-to-end with **no third-party component present at all**. |
| `orchestrator` | `OrchestratorAdapter` → GBTA's own orchestrator | **The implementation currently serving production.** |
| *(reserved)* | third-party adapter | Plugs in at the same seam, same interface. |

The default is `local` deliberately: an unset or misspelt value must not route an owner's request at
a system nobody has pointed us at.

**This is the material fact for any commercial negotiation.** Substitutability here is not an
architectural claim to be tested under pressure later. A working alternative is already running in
production, and a second alternative runs with no external dependency whatsoever. A third-party
component would be *replacing something that already works*, not being replaced by something
hypothetical.

---

## 4. Standing rules

These are GBTA policy and are to be reflected in every component licence.

1. **GBTA authors and owns every adapter.** The glue between this interface and any component is
   written by GBTA, in a GBTA repository, under GBTA copyright — for every component without
   exception. A supplier-authored adapter is supplier copyright, and replacing that supplier then
   means rewriting the integration under time pressure without their cooperation.

2. **No component holds state GBTA cannot export.** Any component that accumulates state on GBTA's
   behalf must provide an export of that state — source records, boundaries, and derived
   structures — in a documented format another provider can ingest, exercisable **on demand and on
   termination**. The export must be **tested at least once**; an untested export path is a claim,
   not a capability, and diligence will ask for a demonstration.

3. **No exclusivity.** GBTA does not accept any term restricting it from integrating a competing
   orchestration, memory, retrieval or execution provider. Such a term deletes the substitutability
   this specification exists to create.

4. **Wind-down on termination.** Any component licence must survive termination for a continuity
   period sufficient to execute a swap (GBTA's position: 6–12 months). Termination on dispute with
   immediate effect makes the exit exist on paper only.

5. **The seam is a wire contract, not shared types.** Components integrate over HTTP against this
   specification. GBTA does not adopt a supplier's types, packages or repository layout, because
   doing so converts a replaceable component into an embedded one.

6. **Distinct credentials in each direction.** The outbound secret proves Kira to the component; the
   callback secret proves the component to Kira. They are different values, so that a leaked
   environment on one side cannot forge traffic in the other direction.

---

## 5. Relationship to confidentiality agreements

This specification is **published GBTA material**, not confidential information of any counterparty.

Where GBTA enters a confidentiality agreement with a prospective component supplier:

- This specification and its implementations are **pre-existing GBTA property** as evidenced in §6,
  and fall outside anything the counterparty discloses.
- GBTA does not accept any clause under which intellectual property "flowing from" a party's
  consideration of disclosed confidential information vests in the discloser. Under a component
  architecture such a clause does not merely misallocate improvements — it can be argued to reach
  **the interface layer itself**, which is the exact mechanism by which the discloser can be
  replaced. Each party must retain its own intellectual property, with an express statement that the
  Kira interface, this specification and all adapters are GBTA's.
- Any confidentiality agreement must carve out **independently developed material** and **residuals**.
  Without an independent-development exception, work GBTA was already doing becomes contestable
  merely because a related disclosure was received.

See `docs/legal/NDA_REVIEW_2026-08-08.md` for the clause-level analysis of the draft in hand.

---

## 6. Provenance — verifiable dates

Every artefact below is committed to `github.com/caistech/Kira`, a private GBTA repository whose
entire history (489 commits at issue) contains **no third-party human author**.

Dates are attested by GitHub server-side, and the commits carry **verified cryptographic
signatures** (`verification.verified: true` via the GitHub API), so authorship and timestamp are not
merely locally asserted.

| Artefact | First committed | Commit | Merged (server-attested, UTC) |
|---|---|---|---|
| `lib/kira/swarm/coordinator.ts` — **the interface** | 2026‑07‑25 | `a5d1ecf28` | 2026‑07‑25T09:29:05Z (PR #17) |
| `lib/kira/integration/seams.ts` — Seams 2–4 | 2026‑07‑25 | `a5d1ecf28` | 2026‑07‑25T09:29:05Z (PR #17) |
| `docs/GARETH_SHAH_INTEGRATION_SEAMS.md` | 2026‑07‑25 | `a5d1ecf28` | 2026‑07‑25T09:29:05Z (PR #17) |
| `lib/kira/swarm/stub.ts` — reference impl. #1 | 2026‑07‑25 | `a5d1ecf28` | 2026‑07‑25T09:29:05Z (PR #17) |
| `lib/kira/swarm/orchestrator-adapter.ts` — the adapter | 2026‑07‑28 | `c766f86e4` | 2026‑07‑27T23:46:28Z (PR #52) |
| GBTA orchestrator (reference impl. #2), `github.com/caistech/orchestrator` | 2026‑07‑27 | `6c28141` | — sole author Dennis McMahon |

**Content anchor.** Git object hashes of the specified files at repository state
`240e6da491287f810f074fdbc5cb695e07939e79`:

```
493b6a4f856a7a127621dc4432f3375f98076a0f  lib/kira/swarm/coordinator.ts
c5317f418afb74d8de79800043414a25cecb5d35  lib/kira/swarm/index.ts
472b8c935c4637a901534ffd9260eb7069b08992  lib/kira/swarm/orchestrator-adapter.ts
b55a48ef215f5453a90ecf8139763b4b15b3361c  lib/kira/swarm/stub.ts
e897e909099b1d5c20f0fc85e03d5b08ddb6126b  lib/kira/integration/seams.ts
d0f1cc7ee03bc0f58dc7d3759bd98946a7561110  docs/GARETH_SHAH_INTEGRATION_SEAMS.md
```

Any party may verify these with `git hash-object <path>` against the stated commit, and may verify
the dates and signatures independently through the GitHub API without GBTA's cooperation.

**This version is fixed by the annotated tag `interface-spec-v1.0.0`.** Subsequent versions increment
and do not overwrite; the dated chain of versions is itself the evidence.

---

## 7. Change control

Amendments to this specification are made only by GBTA. A component supplier may propose a change;
adoption is at GBTA's discretion and does not transfer any right in the amended specification.

Breaking changes increment the major version. A supplier's adapter is written against a stated
version and GBTA maintains the seam, not the supplier's implementation of it.

---

*© 2026 Global Buildtech Australia Pty Ltd. All rights reserved.*
