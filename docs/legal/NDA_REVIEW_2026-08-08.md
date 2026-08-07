# Mutual NDA — review against the current Kira / orchestrator build

**Date:** 8 August 2026 · **Document reviewed:** `Mutual NDA.pdf` (3 pages, 15 clauses)
**Reviewer:** engineering, not legal. This is an analysis of how the draft interacts with what is
actually built. **Have a lawyer settle the wording** — particularly clauses 8, 5 and 14.

---

## 0. Status of the document

It is an **unexecuted template**. The parties are "NEWCO1" (a private company registered in South
Africa) and "NEWCO2"; registration numbers, addresses, names, dates and signature blocks are all
blank or `*`. Nothing is committed, so every point below is still negotiable at no cost.

Governing law is **South Africa**, with exclusive jurisdiction in South African courts (clause 14).

---

## 1. The fact that changes the analysis

The premise that GBTA depends on a third party's orchestrator is **not correct as at today**.

Production runs on **`github.com/caistech/orchestrator`** — a GBTA repository, 43 commits, sole
author Dennis McMahon, first commit 27 July 2026. Kira selects it through `KIRA_SWARM_ADAPTER =
orchestrator`. A second implementation, `LocalSwarmStub`, runs the same interface with **no external
component at all** and is the default.

So the position is not "the supplier is swappable in principle." It is:

> **The interface is GBTA's, the adapter is GBTA's, and two working implementations already exist —
> one of them serving production. A third-party component would be replacing something that already
> works.**

That is the strongest form of the argument, and it is evidenced rather than asserted
(`docs/KIRA_COMPONENT_INTERFACE.md` §6: GitHub-attested, cryptographically signed commit dates).

**One qualification, stated plainly.** Swappable in principle and swappable in practice diverge once
a component holds accumulated state. Orchestration is close to stateless and genuinely swappable.
**Semantic memory is not** — see §4.

---

## 2. Clause 8 — the clause to refuse

> *"Any trademark, patent or other intellectual property rights **flowing from either party's
> consideration of confidential information** disclosed to them by the other party shall belong to
> the disclosing party."*

**This is the one that matters, and it is worse than a misallocation of improvements.**

"Flowing from consideration of" is extremely wide. It is not limited to derivative works, to
improvements to the disclosed material, or to anything embodying it. On its face it reaches anything
a party creates *after thinking about* what it received.

The wording is symmetric; **the effect is not**. Whoever discloses more architecture acquires the
larger claim. If GBTA takes deep architectural disclosure from a component supplier and then
develops the interface layer, the supplier has an argument that the interface — **the exact mechanism
by which that supplier can be replaced** — belongs to them.

**Position:** replace clause 8 entirely with each party retaining its own intellectual property, plus
an express statement that the Kira component interface, its specification and all adapters are
GBTA's. No assignment by operation of the confidentiality agreement, in either direction.

**Mitigation already in place:** the interface predates any such disclosure and the dates are
third-party attested (§6 of the spec). That is a defence, not a substitute for fixing the clause —
a defence costs money to run in a South African court.

---

## 3. Clause 5 — the missing exception

Clause 5 excludes only information that is already known, in the public domain, or expressly
non-confidential. It omits the two standard carve-outs that matter most here:

- **Independent development** — material developed without reference to the confidential
  information. Its absence is what gives clause 8 its reach. GBTA is actively building in the same
  space; without this carve-out, work already underway becomes contestable merely because a related
  disclosure was received.
- **Rightful receipt from a third party** without a duty of confidence.

There is also **no residuals clause** — nothing permitting use of unaided memory of general
know-how — and **no feedback carve-out**, so comments GBTA gives on a supplier's component could be
argued to be encumbered.

**Position:** add all four.

---

## 4. Where substitutability actually dies — Mnemo and Seam 2

Orchestration is swappable today. **Accumulated semantic memory is the exception**, and it is the
component GBTA's product gets its compounding value from — Kira is worth more to an owner the longer
he uses her, and that accrual lives in the memory lane.

Current state, factually:

- `@caistech/mnemo` is **GBTA's own transport client** — GBTA code, GBTA repository.
- Seam 2 (`MemoryGovernance`) is **GBTA's interface**, defined 25 July 2026, currently satisfied by a
  stub over the Mnemo wire.
- Kira holds a **per-user Mnemo scope**, and already has `find` and `forget` — so single-fact
  deletion works.
- **There is no tested bulk export of Mnemo-held memory.** `app/api/genome/export/route.ts` exports
  the Genome from GBTA's own Supabase. That is not the same thing.

So the architecture diagram says swappable and the data says otherwise. Owning the client and the
interface does not help if the accumulated state cannot leave.

GBTA already tells customers that egress governance is the product. **Apply it to ourselves.**

**Position — required in the Mnemo licence:**
1. An express **export right**: all stored records and derived structures, in a documented format
   another provider can ingest, **on demand and on termination**.
2. Exercisable without cooperation being a negotiation.
3. **Test it once, now**, and keep the artefact. An untested export path is a claim, not a
   capability, and diligence will ask for a demonstration rather than a clause reference.

---

## 5. Clauses that are operationally impossible as drafted

These are not adversarial, but they cannot be complied with by a company that ships software.

- **Clause 7 — no copies without prior written consent.** Integration requires the material to exist
  in a repository, in CI, in logs, and in automated backups. Literal compliance is impossible.
  *Fix:* permit copies reasonably necessary for the permitted purpose, plus routine automated
  backups.
- **Clause 9 — return on demand of "any note, analysis, or memorandum prepared by any of the
  parties", "immediately".** This reaches GBTA's **own** analysis and cannot reach immutable backups.
  *Fix:* return-or-destroy at the receiving party's election, within a stated period, with a standard
  exception for archival backups and for one copy retained for legal-compliance purposes.
- **Clause 2.2 — oral disclosures must be confirmed in writing within 14 days.** A trap that runs
  both ways; most oral disclosure will not be confirmed, and is then arguably unprotected.
  *Fix:* either delete, or make protection automatic for information a reasonable person would treat
  as confidential.

---

## 6. Clause 3 — the permitted purpose is too narrow to build under

Use is limited to *"evaluating and formulating further contractual arrangements."* **Integrating a
component is outside that purpose.** The moment GBTA writes an adapter against material received
under this agreement, it is arguably in breach.

*Fix:* extend the purpose to include evaluation, integration and testing — or, better, sign a
separate development/licence agreement before any build work begins and leave the NDA to the
evaluation phase it was drafted for.

---

## 7. Clause 14 — governing law

South African law, exclusive South African jurisdiction. For an Australian entity that means any
dispute — including one about who owns the interface — is fought at long distance and material cost.
The practical effect is that **marginal breaches will not be enforced by GBTA**, which asymmetrically
favours the other side.

*Position:* seek Australian or a neutral jurisdiction, or at minimum non-exclusive jurisdiction so
GBTA can sue where the assets and the customers are. If South African law is non-negotiable, that is
a reason to be *more* insistent on clauses 8 and 5, not less — the paperwork has to do the work the
courtroom realistically will not.

---

## 8. Counterparty due diligence

If the contracting party is an entity rather than an individual:

- **Warranty of title** that the entity owns all intellectual property in what it licenses,
  *including from its own contractors*. A company can only license what it owns, and a
  contractor-copyright gap is the common failure — GBTA has the same exposure and should expect the
  question in return.
- **Indemnity** if that warranty proves wrong.
- **Change of control / insolvency:** does the licence survive the entity being wound up or sold, and
  does it bind an acquirer? An orchestration or memory supplier acquired by a competitor is the
  scenario the wind-down period in §9 exists for.

---

## 9. Two terms to refuse outright

1. **Any exclusivity or non-compete** preventing GBTA from integrating a competing orchestration,
   memory or retrieval provider. It arrives framed as reasonable protection for the supplier's
   investment, and it quietly deletes the swap option that the whole architecture exists to preserve.
2. **Any licence terminating on dispute without a wind-down.** GBTA needs 6–12 months' continuity on
   termination to execute a swap. Without it the exit exists on paper only — and a supplier who knows
   that prices accordingly at renewal.

---

## 10. Sequence — what to do, in order

1. ✅ **Publish and date the interface spec** — done, `docs/KIRA_COMPONENT_INTERFACE.md` v1.0.0, tag
   `interface-spec-v1.0.0`. This had to happen **before** taking deep architectural disclosure, and
   it now has.
2. **Do not sign this draft as-is.** Clauses 8 and 5 first; then 3, 7, 9; then 14.
3. **Test a Mnemo export** and keep the artefact. This is the one item where the architecture
   currently overstates the position, and it is engineering work, not drafting.
4. **Keep adapters GBTA-authored** — a standing rule, in every component licence, no exceptions.
5. Send the **Mnemo terms** for review of the export right and change-of-control assignability.

---

*Prepared for Global Buildtech Australia Pty Ltd (ABN 54 672 395 685). Engineering analysis; not
legal advice.*
