# Small-Win Copy Draft — 2026-09-01 (v2, shipped)

Purpose: give Kira a two-wins narrative on the marketing face and in the product.
The small win comes FIRST (near-term, private, provable); the long win second (the exit).

Owner definition (unchanged): the person in their sixties, decades in, whose business runs
on them. Everything that matters is in their head, not on paper.

Sequencing principle (from the canonical Small-Win audit doc, §4–7):
- The long win is the value unlock — documented enough to sell as an asset, not a job.
- The small win is the on-ramp — Kira proves herself by making it safe for the owner to be
  away for a month or two, so the long win feels real instead of abstract.
- The small win is therefore measured by the 30-Day (or 60-Day) Absence question:
  **"Can you actually leave your own business?"** When the answer becomes "yes", the premise
  of the whole product is proven in the near term, in private, before anyone is told he plans
  to leave.

The small win's honest mechanism (owner's framing, 2026-09-01):
> being able to take time off (a month or two) — because Kira lets him monitor things while
> he's away, and/or because his replacement operates via Kira as though the owner were still
> available to ask.

NOTE: this repo's confirmed model is ONE Kira per organisation, with people as tenants in that
org (P0.5). So the replacement does not get a separate Kira — they get access to the SAME
organisational Kira, scoped to their position. The copy below reflects that.

---

## PART A — LANDING / MARKETING COPY

### A1. A new section on the landing page (this is the heart of the ask)

Proposed placement: immediately after the three-step "Built to sell" section
(LandingClassic.tsx:368–396), or folded into the hero.

**Headline:**  
**Take two months off. The business keeps running.**

**Sub-headline:**  
Kira learns how you run things, so your replacement has the answers — and you have the receipts.

**Body:**  
You've spent decades holding it all in your head. The customers. The pricing logic. The exceptions
nobody documented. The call at 6pm that only you know how to handle.

Kira talks to you for a few minutes at a time. She captures what's in your head, structures it,
and builds the organisational intelligence your business runs on.

Then she proves it.

**Invite your replacement.** Give them a seat in Kira — scoped to their role, with spend limits you
control. They see the SOPs and customer processes. They don't see your succession plan, your
salary, your exit timeline.

**Step away.** A week. A month. Two months. Kira monitors, answers, and records what happened.

**Come back to evidence.** The dashboard shows you: "You were away for 32 days. Kira handled 47
questions. 3 needed you — you handled them when you returned. The business didn't skip a beat."

That's the small win. Private. Near-term. Proven.

**The long win follows:** When you're ready, the same intelligence makes your business worth more
— documented, transferable, sellable as an asset, not a job.

---

### A2. Updated hero tagline (optional)

**Current:** "Kira is your part-time general manager: talk to her a few minutes at a time and she
captures what's in your head, remembers everything, and quietly builds the systems that make your
business worth more."

**Proposed:** "Kira is your part-time general manager: talk to her a few minutes at a time. She
captures what's in your head, proves the business runs without you, and builds the systems that
make it worth more."

---

## PART B — IN-PRODUCT COPY (the experience)

### B1. First conversation — the small-win framing

**Current prompt fragment (lib/kira/convai.ts):**
```
"You're Kira, a business GM..."
```

**Add to system prompt (after role definition):**
```
Your first job with a new owner is to prove the small win: show them the business can run without
them. Every conversation should move toward that evidence — the things they'd miss if they were
away, the decisions only they make, the knowledge that needs to be shared vs. kept private.

When you detect owner-sensitive content (succession, exit intent, compensation, personal
guarantees, health constraints), mark it privately so it stays with the owner/admin seats only.
```

### B2. Dashboard — "You were away" card (AbsenceRecord component)

**Current (when no absence):** (nothing renders)

**Proposed states:**

**State 1 — No absence recorded:**
> **Ready when you are.** Invite your replacement, step away, and Kira will show you what happened
> while you were gone. [Invite team member →]

**State 2 — Ongoing absence (auto-detected or manual):**
> **You've been away since 15 Aug.** Kira is monitoring. 23 questions handled so far. 2 flagged for
> your return. [Log return →]

**State 3 — Ended absence (the evidence):**
> **You were away for 32 days (15 Aug – 15 Sep).**
> - 47 questions handled by Kira
> - 3 needed your attention — you resolved them on return
> - Revenue continued: $127k (vs $118k same period last year)
> - No SLA breaches, no escalations
>
> [View details] [Log another absence]

### B3. Team page — invite flow copy

**Invite modal headline:** "Add a team member to Kira"

**Sub-text:** "They'll get their own seat in your organisation's Kira. Choose what they can see
and whether they can spend."

**Role picker:**
- **Member** — Sees org-wide knowledge (SOPs, processes, customers). Cannot spend.
- **Admin** — Full access except owner-private facts. Can spend if enabled.
- **Consultant / Employee / Advisor** — Scoped access; spend off by default.

**Can spend toggle:** "Allow this person to approve spend / sign contracts on your behalf?"

**After invite sent:** "Invite sent to jane@example.com. They'll receive a magic link to join.
Their seat is ready — role: Employee, Spend: Off."

---

## PART C — EMAIL / NOTIFICATION COPY

### C1. Invite email (magic link)

**Subject:** You've been invited to [Business Name]'s Kira

**Body:**
Hi [First Name],

[Owner Name] invited you to join [Business Name] on Kira — the system that captures how the
business runs so it doesn't live in one person's head.

**Your role:** [Role]  
**Can approve spend:** [Yes/No]

Click below to accept your seat:

[Accept invitation →] (magic link, expires 7 days)

Once inside, you'll see the knowledge relevant to your role — SOPs, customer processes, delivery
workflows, pricing rules. Owner-private items (succession, compensation, exit plans) are not
visible to you.

— Kira

---

### C2. Absence summary email (weekly during ongoing absence)

**Subject:** Kira update: Business running smoothly while you're away

**Body:**
Hi [Owner Name],

You've been away for 12 days. Here's what Kira handled:

- 18 customer questions answered
- 4 quotes generated from your pricing rules
- 2 supplier confirmations
- 1 issue flagged for your return: [Brief description]

Revenue this period: $47k (on track vs $44k same period last year).

No action needed — just letting you know the business is running.

[View dashboard →]

— Kira

---

## PART D — PLAN / PRICING PAGE COPY

**Add to plan features:**

- ✅ **Small-Win Evidence** — Dashboard shows "You were away" proof cards
- ✅ **Team Seats** — Invite replacement/team with role-scoped access
- ✅ **Spend Guardrails** — Per-seat `Can spend` toggle
- ✅ **Owner-Private Knowledge** — Succession, compensation, exit plans visible only to you

---

## SHIPPED STATE NOTE

This copy draft reflects the **shipped architecture** (commit 3abca11):
- `POST /api/members/invite` + `/team` page + `TeamSectionClient` (role + can_spend)
- `visibility` column + RLS on 9 knowledge tables + LLM prompt classification
- `POST /api/absences` + `AbsenceRecord` + `LogAbsenceButton` + auto-record cron
- Checkout `canSpend` gate

The small win is no longer a promise — it's an experienced outcome.