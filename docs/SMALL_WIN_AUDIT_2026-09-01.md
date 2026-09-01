# Kira Small-Win / 30-Day-Absence Conformance Audit — 2026-09-01 (v1, uncommitted)

Scope: run the canonical audit (docs/Kira-Coding — Canonical Architecture, Small-Win Flow &
Implementation Conformance Audit.md) against the CURRENT architecture, and reconcile it with the
confirmed product model: **one Kira per organisation, people as tenants within that org**.

This is a READ/report deliverable. No code was changed to produce it. Cross-referenced against the
small-win copy draft (docs/SMALL_WIN_COPY_DRAFT_2026-09-01.md).

---

## 1. Executive Verdict

**Alignment: moderate and improving, with one foundational piece present and the two things the
Small-Win actually depends on missing.**

The architectural substrate for the whole vision is now real and correct: the product has moved to
**organisation-as-tenant, people-as-members, one shared Kira per organisation** (P0.5). That is the
right foundation for both the small win and the eventual multi-seat product.

But the **Small Win — the thing the canonical doc says must be "front and centre" — is not delivered
as an experienced outcome today**:

1. The small win ("I can be away for a month or two") is not an architectural outcome; it is
   currently only a marketing promise. Nothing in the product drives toward or measures it.
2. The **30-Day Absence Test cannot yet be passed with confidence**, because a second tenant in the
   same organisation (the owner's replacement) cannot actually be set up and used end-to-end today.
3. There is **no role-scoped access** on the shared knowledge, and **no spend/lifecycle guardrail**
   — so "set up my replacement, scoped to what their position should see and cannot spend" is not
   yet real.

---

## 2. Canonical Architecture Conformance (focus: Small-Win-relevant invariants)

Verdict labels: ✅ Green (present and wired) · 🟡 Amber (present at data layer, not wired) · 🔴 Red (absent).

| Invariant | Status | Evidence |
|---|---|---|
| Organisation is the tenant boundary | ✅ | `org=organisations`; RLS authority is `auth_user_has_organisation_access` on `organisation_id` (20260826120000). |
| Person ↔ organisation membership is the authority source | ✅ | `auth_credentials`→ person → `organisation_memberships`; temporal (`valid_from/to`), `status` (20260826110000 / 20260826120000). |
| People are tenants within one org | ✅ | Multiple `person_id` rows per `organisation_id`; roles `owner/admin/consultant/employee/advisor/member` (20260826110000:24). |
| Multiple people realistically set up today (invite flow) | 🔴 | No invite/team-admin UI or endpoint found; memberships only backfilled from legacy. Not user-driven. |
| Role-scoped visibility on shared knowledge | 🔴 | `auth_user_has_organisation_access` checks active membership only — **ignores `role`** (20260826120000:30-76). No role filter on `genome_*`, `kira_memory`, `conversations`, `kira_knowledge`. |
| Admin (owner) has control distinct from plain member | 🟡 | `check_organisation_membership(…, p_required_role)` + `role IN ('admin','owner')` exist (20260827205246) but gate admin actions, not knowledge visibility. |
| One Kira per organisation (shared) | ✅ | `kira_instances` subordinate to org; unique active per `(org, journey_type)`; "knowledge belongs to Organisation" (20260826180000:22-37). |
| Spend / lifecycle guardrail per role ("no spend discretion") | 🔴 | No permission/capability/spend-limit field or role found on any membership/instance model. |
| Small Win generation / execution / confirmation | 🔴 | No first-interaction-deliverable mechanism; nothing drives toward or records "business ran without owner". |
| 30-Day (Absence) resilience | 🔴 | Nothing measures "what would be missed / what stopped happening" over an absence. |

---

## 3. Small-Win / Adoption / Continuity Audit

**Is the Small Win architecturally front-and-centre today? — No.**

Trace the canonical flow (§4) against the code:

```
Organisation enters Kira        -> ✅ valuation → account → org membership
Kira establishes context        -> ✅ onboarding/valuation context
Kira identifies an opportunity  -> 🟡 describes value; no concrete near-term deliverable offered
SMALL WIN                       -> 🔴 NOT PRODUCED
User experiences tangible value -> 🟡 the promise is told, not demonstrated
Adoption -> engagement -> ...   -> 🔴 no reinforcing loop anchored on a delivered win yet
```

The product's real adoption driver today is the **valuation** (a win in itself — "I got a number"),
which is good but generic: it is the *diagnosis*, not the Small-Win outcome the canonical model
demands ("Kira did something useful and I felt it"). The proposed small win — **"I can be away for
a month or two, and I now have proof the business ran without me"** — is concrete, private, near-term
and directly proves the product premise. It is the right candidate; it is simply not implemented.

Where the loop breaks:
- No mechanism makes the owner aware Kira is driving toward a near-term deliverable (being away).
- No surface records the absence outcome or shows the owner it compounds.
- A replacement tenant cannot be added, so the "she answers for you / monitors while you're away"
  mechanism has no person on the other end in practice.

---

## 4. Customer Promise vs Current Product

Question: *Can Kira currently deliver the promise we make?*

- **"See the number in 3 minutes"** — ✅ TRUE (the valuation works).
- **"Capture your knowledge into an Operating Manual"** — 🟡 PARTIALLY TRUE (capture exists; the
  *handover-during-an-absence* use of it does not).
- **"You can take two months off — she monitors and answers for you"** (the new small-win promise) —
  🔴 NOT YET TRUE. The data model allows a second tenant and a shared org-Kira, but there is no
  way to set that replacement up, no role-scoped visibility, and no absence-deliverable.
- **"Each relevant person gets access scoped to their position"** (multi-seat) — 🔴 NOT YET TRUE.
  Role-scoped visibility and per-position spend limits do not exist.

---

## 5. Priority Remediation Plan

### P0 — must change before scaling / before the beta-promise is credible

**1. Provide a way to add a second person as a tenant in the org (the replacement).**
  - Why: every other piece of the small win and the multi-seat vision hangs off this. Without a
    settable tenant there is no "replacement operates via Kira", and no 30-Day-Absence test.
  - Affected: an invite/membership API + a settings surface to add a person and pick a role; an
    RLS path that lets an `owner` create a membership row in their own org.
  - Dependency: membership write policy (currently none for non-service-role).
  - Expected outcome: owner can set up a named replacement as a same-org tenant.

**2. Introduce a role-scoped visibility model on the shared knowledge.**
  - Why: "scoped to their position" and "the handover copy leaves out your position" are not
    enforceable today. A first cut can be conservative: a `visibility` tier on knowledge rows
    (owner-only vs org-wide) so the owner's position/plans stay owner-only by default.
  - Affected: `auth_user_has_organisation_access`/new policy using `role`; a `visibility` column on
    the knowledge tables; the private/handover document renderer.
  - Test: a second tenant must NOT see owner-position rows unless granted.

**3. Add a spend/lifecycle guardrail per role (the "limited-admin, no spend discretion" ask).**
  - Why: this is the safety boundary the owner needs before handing a shared Kira to a replacement
    or CFO. Define a non-spend role (e.g. `employee`/a `can_spend=false`) enforced on checkout,
    provisioning and any paid-action routes.
  - Test: a personnel role reaches chat/capture but every spend/provision route 403s.

### P1 — before broader beta

**4. Drive the product toward the small-win deliverable (B2 copy in the draft).**
  - A first-conversation commitment ("by a month or two you can be away"), a "what actually needs
    you" list, then a shortening handover document, then a real short absence with the replacement.
  - Surface: an "absences / you were away" record on the dashboard so the win is shown, not told.

### P2 — once core is stable

**5. Rename/repoint the "How it works" section on the landing page.**
  - LandingClassic.tsx:399–445 still says "We create a unique Kira just for you" and "Setup Kira".
    With the confirmed per-org model it should read "one Kira for your business; you and your team
    work through her, each with your own seat."

**6. Wire the approved copy into the landing + /plan and the first-conversation prompt.**

---

## Final Question (the canonical gate)

> *If we gave the current Kira implementation to 10 beta partners tomorrow and asked each to apply
> the 30-Day Absence Test — "Can you go a month without Kira?" — would the architecture create
> enough value, continuity and accumulated organisational intelligence that the answer would
> meaningfully be "No"?*

**Honest answer: No — not yet.**

- A single owner *accumulating* context over months might genuinely miss Kira (that part is
  plausible), but the definitive proof you asked for — **can the owner be away and have a
  replacement run the business through Kira** — cannot pass today, because a replacement tenant
  cannot be set up, has no role-scoped view, and there is no spend guardrail. The absence outcome
  is in no way constructed, measured or surfaced.
- The foundation (org-as-tenant, people-as-members, shared org-Kira) is correctly laid, so the
  gap is **wiring, not re-architecture**. P0 items 1–3 are the difference between "the model
  supports it" and "a partner can do it".

---

*Produced read-only. Nothing above was committed or deployed. Committed this session: the /plan and
/talk page fixes (55369ec, not pushed). Uncommitted: docs/SMALL_WIN_COPY_DRAFT_2026-09-01.md (this
audit's companion), data/beta-testers.json, naive-tester-reports/.*
