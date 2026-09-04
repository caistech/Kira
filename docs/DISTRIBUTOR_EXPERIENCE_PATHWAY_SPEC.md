# Distributor Experience Pathway — Spec

**Status:** SPEC ONLY — nothing in this document is planned for build until approved.
**Owner:** Dennis (product)
**Date:** 2026-09-05

This spec records the decision for a three-way entry funnel and the discipline boundary around
the 4-tier white-label model. It is grounded in the code as it actually is (verified 2026-09-05),
not in the aspiration.

---

## 1. The decision

Everything that follows serves one sentence, agreed out loud:

> **Convince the distributor; let the distributor convince their clients.**

→ For now, distributors are **introducers only**. They experience **user-level Kira** under a
**common, previously-established org** — they do NOT get an admin level, and they do NOT manage
client orgs.

---

## 2. Current reality (verified in code)

| Fact | Where it lives |
|---|---|
| The 13 questions are the front door for **everyone** | `/business-valuation` (public), result routes to `/plan` (`app/business-valuation/page.tsx:425`) |
| But the 13 questions do **not** create the org — they are a shared experience + payload carrier | valuation parked in sessionStorage → carried through |
| The org chain (**persons → organisations → memberships → ownership**) is created **only** by `POST /api/identity/plan` | `app/api/identity/plan/route.ts:974` — takes `firstName`, `lastName`, `organisationId`, NOT valuation inputs |
| The pathway gate lives at `/plan` (`BetaRedeem` when signed out) | `app/plan/page.tsx` |
| Distributor = **introducer** (separate attribution table, NOT a tenant hierarchy) | `introducers` table, role `introducer`/`broker` (20260726000000) |
| Email invitation machinery for org membership already exists | `app/api/members/invite/route.ts` — owner/admin sends an invite; creates auth user, `persons` row, membership |
| Waitlist/enquiry capture for advisors exists (`/advisors`) | `app/advisors/page.tsx` + `AdvisorEnquiryForm` |
| On-demand, org-scoped Kira provisioning exists | `POST /api/kira/ensure` + `/talk` + `KiraBootstrap` |
| Current levels: **3** — corporate platform admin (`ADMIN_EMAILS`) / org admin (`owner`/`admin`) / org users | `lib/auth.ts`; `organisation_memberships.role` (20260826110000) |

**Current org hierarchy is 3 levels with NO distributor tier.** There is no table, FK, or RLS
policy that says "distributor admin oversees these client orgs."

---

## 3. The funnel (what this spec builds — when approved)

```
Landing OR /advisors
      ↓
13 questions  ← shared experience for EVERYONE
      ↓
Result + PATHWAY FORK (new)
   ├─ "I'm a business owner"          → Paid — greyed "coming soon", priced from PRICE_TIERS
   ├─ "I have a beta code"            → /plan → /api/identity/plan → portal   [unchanged]
   └─ "I work with business owners"   → distributor experience (below)
```

### 3.1 Distributor experience path (the deliverable)

1. Distributor lands (from `/advisors` or the fork) → **enquiry form** (captures name + which
   ICPs they serve) → success screen with a **"Try Kira yourself"** CTA.
2. "Try Kira yourself" → invite them as a member of a **common distributor/beta org** —
   reusing `app/api/members/invite` (emailed invitation, creates the account + `persons` row +
   membership).
3. They sign in and land on `/talk` → `KiraBootstrap` → `/api/kira/ensure` provisions their
   **user-level** Kira under the **common org**.
4. They experience Kira as a user — thinking "would I hand this to my client?" — which is
   exactly the Gate-1 reaction we want.
5. After the experience, they are offered an **introducer link** (already built — `introducers`
   table) to pass to clients. Introductions are attributed from the first click; **nothing
   collects while billing is switched off** (the `/advisors` disclosure already says this).

**Key constraint — the common org:**

- Distributors experience Kira under a common org we own and staff, **not** GlobalBuildTech
  (which is a real client/test org) and not one they administer.
- Recommended: **"Corporate AI Solutions"** as the distributor + beta-tester tenant.
- Invitations go out from that org so beta testers and distributors share one
  platform-managed home until a distributor's own client base justifies a tenant of their own
  (that is v2).

### 3.2 Beta path (unchanged)
Beta code → `/plan` → `/api/identity/plan` → portal. No change.

### 3.3 Paid path (built, disabled)
Button present, priced from `PRICE_TIERS` (never type a price the bands can move underneath —
`lib/valuation/pricing`), **no Stripe call** until ready. Flipping it on later is a feature
flag + copy change, not a rebuild.

---

## 4. V2 spec — the 4-tier white-label model (SPEC ONLY, DO NOT BUILD)

This is the destination the distributor path is the stalking-horse for. It is **not** the current
model and **must not** be built today.

### 4.1 The 4 tiers

```
Tier 1  Corporate platform admin     (us)        oversees → Tier 2
Tier 2  Distributor admin            (partner)   oversees → Tier 3
Tier 3  Org admin / owner            (ICP tenant) oversees → Tier 4
Tier 4  Org users                    (end users)
```

- **Tier 1 → 2:** a distributor is elevated from introducer to tenant. THE platform grants them a
  distributor tenant (their own `organisations` row in a higher-level role, plus a client-org
  *association*).
- **Tier 2 → 3:** the distributor manages a **portfolio of client orgs** — invites the ICP's
  owner/admin, sees org health (not conversations), and is the billing point for their client
  orgs.
- **Tier 3 → 4:** unchanged from today (owner/admin manages their own org's users).
- **White-label:** given the distributor holds the client relationship, a white-labelled surface
  for Tier 1–3 is the natural end-state — "your clients, you manage, we clip the ticket" —
  but this is a **product decision for v2 approval**, not implied by this spec.

### 4.2 Known data-model gaps (what v2 would have to add)

Current schema cannot hold Tier 2 without changes. These are the **gaps to close when v2 is
approved**, recorded now so nothing sneaks in sideways:

1. **Distributor is a first-class subject** — not a row in `introducers` but either a new
   `distributors` table or an elevated `organisation_memberships.role` with org-scope.
2. **Client-org association** — a relationship "distributor ↔ client orgs they administer",
   which the current `organisations` / `memberships` model has no column for (membership is
   member→org, one org at a time for context).
3. **Billing point of truth** — v2 invoicing is the distributor's tenant; today billing is
   per-org (`business_valuations`, subscriptions).
4. **RLS** — four-tier visibility (platform sees all; distributor sees their portfolio's org
   health; org admin sees their org; user sees their own) is a meaningful policy expansion.
5. **Role admissions floor** — new roles must satisfy the current rules (ownership is temporal in
   `ownership_periods`, `role='owner'` alone does not prove ownership, `superadmin` is a role not
   ownership) or amend them consciously.

### 4.3 Why not build it now (the discipline boundary)

Per the thin-MVP rubric: **experience is the whole promise; scale infrastructure is zero until
validated.** The 4-tier hierarchy is scale infrastructure. Building it today would be building the
paid distributor SaaS before a single distributor has said *"I'd give this to my clients."* The
v2 build is triggered by that validated reaction, not by the roadmap.

---

## 5. What gets built when this spec is approved (open questions)

Before implementation, these need answers (owner: Dennis):

- [x] Confirm the common org. **Verified 2026-09-05** (full `organisations` table dump): there is
      **no "Corporate AI Solutions" org in the database.** What exists: Factory2Key,
      Global Buildtech, h4hl, and 15 test orgs (Genome Extract/Repository Test, Manufacturer Test,
      Plumbing Co Test — repeated from the 09-02→09-04 test/reset cycles). So the common
      distributor/beta org **must be created** as part of the approved build. GlobalBuildtech stays
      a separate real test tenant. For the three known identities, the org mapping today is:
      `dennis@factory2key.com.au` → Factory2Key · `mcmdennis@gmail.com` → Global Buildtech ·
      `dennis@corporateaisolution.com` → corporate platform admin (email allowlist, not an org).
- [ ] `/advisors` enquiry → auto-invite via `app/api/members/invite` — who stamps approval, or is
      the invite fully automatic on enquiry submit?
- [ ] Invitation copy — what the emailed invite says about the beta/distributor framing.
- [ ] The paid button — display price source confirmed (`PRICE_TIERS[0].monthly` floor vs band).
- [ ] Fork copy — the three options on the fork surface, on `/business-valuation` result and/or
      landing.

**Not in scope (explicitly deferred to v2):** 4-tier roles, distributor tenant management,
white-label surfaces.