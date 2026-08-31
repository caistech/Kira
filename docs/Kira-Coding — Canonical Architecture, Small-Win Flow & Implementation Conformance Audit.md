# Kira-Coding Brief — Audit the Current Kira Architecture Against the Canonical Model

## Objective

Audit the **current Kira implementation** against the attached/available:

**KIRA — Canonical Organisational Model**

Do not modify the canonical model to fit the current implementation.

The purpose of this exercise is to determine:

1. How closely the current Kira architecture conforms to the canonical organisational model.
2. Where the current implementation structurally or semantically diverges.
3. Whether the architecture can actually deliver the customer-facing promise we are now making.
4. Whether the **Small Win** is properly represented as the lead experience and architectural trigger for adoption, engagement and continuity.
5. What needs to change in the architecture, data model, orchestration and UI to make the promise real.

---

# 1. Treat the Canonical Model as the Architectural Reference

The canonical model establishes that Kira is fundamentally:

> **An organisational intelligence system whose enduring responsibility is to preserve, structure, contextualise and make useful the knowledge and relationships that constitute an organisation over time.**

The enduring anchor is the **Organisation**, not:

- the user;
- the founder;
- the current owner;
- the consultant;
- the subscription;
- the Kira instance;
- the conversation.

Audit the current implementation against this principle.

Specifically determine whether organisational identity and organisational memory currently survive:

- user changes;
- ownership changes;
- consultant changes;
- engagement changes;
- subscription changes;
- Kira-instance changes;
- technical rebuilds.

---

# 2. Audit Every Canonical Entity

For each of these:

- Organisation
- Person
- Ownership Period
- Consultant
- Engagement
- Kira Instance
- Subscription
- Commercial Arrangement
- Organisational Knowledge Context

identify:

### A. Where it exists today

Give exact implementation locations where possible:

- database tables;
- schemas;
- columns;
- TypeScript types;
- server actions;
- API routes;
- orchestration;
- agents;
- memory/knowledge services;
- UI components;
- authentication/tenant logic.

### B. Semantic conformance

Classify each as:

**GREEN — conformant**

**AMBER — partially conformant / ambiguous**

**RED — materially conflicts with canonical model**

### C. Architectural gap

Explain precisely what is missing or incorrectly modelled.

### D. Consequence

Explain what breaks because of the gap.

### E. Required decision

State what architectural decision is required.

Do not silently implement a workaround where the underlying semantic model is wrong.

---

# 3. Pay Particular Attention to Organisation vs User Scoping

We have already identified migration work around:

**user_id → organisation_id**

Audit the entire system for this issue.

Find all places where Kira knowledge, retrieval, memory, tasks, agents, research, documents or other organisational state is still effectively scoped to a person/user rather than the Organisation.

Identify:

- database fields;
- queries;
- RPCs;
- retrieval functions;
- APIs;
- agent context;
- prompts;
- UI assumptions;
- caching;
- session state.

Report whether each is:

**Organisation-centric / User-centric / Mixed / Unknown**

The architectural target is:

> **Persistent organisational intelligence belongs conceptually to the Organisation.**

---

# 4. Audit the Small-Win Flow

This is now a critical architectural requirement.

The **Small Win is not merely a marketing concept or UX flourish.**

It should be treated as a core part of the Kira operating architecture.

The intended flow is:

```text
Organisation enters Kira
        ↓
Kira establishes context
        ↓
Kira identifies a meaningful immediate opportunity
        ↓
        SMALL WIN
        ↓
User experiences tangible value
        ↓
Adoption
        ↓
Engagement
        ↓
Continued usage
        ↓
More organisational knowledge
        ↓
Better organisational intelligence
        ↓
More valuable future interactions
        ↓
Continuity
```

Audit whether the current architecture actually supports this loop.

---

# 5. Determine Whether the Small Win Is Currently "Front and Centre"

Do not merely search for the phrase "small win".

Determine whether the architecture itself naturally produces one.

Answer:

### Entry

What happens when an organisation first encounters Kira?

### Diagnosis

How does Kira determine what would constitute a useful immediate outcome?

### Action

Can Kira actually do something useful rather than simply describe what could be done?

### Outcome

Can Kira demonstrate that something useful happened?

### Memory

Is the resulting outcome captured as organisational knowledge?

### Continuity

Does that outcome become useful context for the next interaction?

### Re-engagement

Does the architecture create a natural reason for the organisation to return?

---

# 6. Audit the Adoption Loop

Test whether the current architecture can produce this sequence:

```text
Useful first interaction
        ↓
"I got something valuable from this."
        ↓
Reason to come back
        ↓
Kira learns more
        ↓
Kira becomes more useful
        ↓
User relies on Kira more
        ↓
Kira becomes embedded in organisational activity
```

Identify where this loop currently exists and where it breaks.

This is important because the product proposition is not simply:

> "AI can answer questions."

The proposition is closer to:

> **Kira becomes increasingly useful because it understands the organisation over time.**

The architecture must therefore create a reinforcing loop between **value → usage → knowledge → greater value**.

---

# 7. Audit the 30-Day Absence Test

The Small Win also creates a concrete test for beta testers, partners and distributors.

The test is:

> **If the organisation stopped using Kira for 30 days, what would they miss?**

Determine whether the current architecture gives us a meaningful way to answer this.

Specifically assess whether, after 30 days, Kira has accumulated enough organisational context, activity, commitments, knowledge or pending opportunities that the organisation would notice its absence.

Identify:

- what would be lost;
- what would stop happening;
- what would become harder;
- what would no longer be remembered;
- what follow-up would disappear;
- what organisational intelligence would become inaccessible.

Then determine:

> **If the answer is currently "not much", what architectural or product changes are required?**

This should become a practical beta-test criterion.

---

# 8. Audit Organisational Knowledge as a Compounding Asset

The canonical model explicitly distinguishes:

**Conversation**

from:

**Organisational Knowledge.**

Audit whether current Kira implementation genuinely makes this distinction.

Determine:

- what enters the system as evidence;
- what becomes knowledge;
- how knowledge is contextualised;
- how provenance is retained;
- how knowledge becomes current/historical;
- how contradictory information is handled;
- how superseded information is handled;
- how knowledge is retrieved;
- how knowledge is reused by future agents/interactions.

The critical question is:

> **Does every useful interaction make Kira materially more useful for the organisation's future?**

If not, identify why.

---

# 9. Audit Engagement Continuity

The architecture must support:

```text
Organisation
    ↓
Engagement 1
    ↓
Knowledge produced
    ↓
Engagement 1 completed
    ↓
Engagement 2
    ↓
Existing organisational intelligence reused
```

Determine whether this is currently possible.

Especially test:

- consultant A → consultant B;
- engagement A → engagement B;
- Kira instance A → Kira instance B;
- current owner → future owner.

The objective is that organisational history does not need to be reconstructed every time a relationship changes.

---

# 10. Audit Consultant-Led Distribution

The canonical model explicitly supports Kira as a **scale enabler for consultants**.

Audit whether the current architecture supports this model:

```text
Consultant / Partner
        ↓
Introduces Kira
        ↓
Organisation experiences Small Win
        ↓
Kira establishes organisational baseline
        ↓
Kira identifies opportunities / issues
        ↓
Consultant sees where human intervention creates value
        ↓
Engagement
        ↓
Knowledge captured
        ↓
Future engagement becomes easier / more valuable
```

Distinguish carefully between:

- Consultant;
- Introducer;
- Distributor;
- Organisation;
- Engagement;
- Kira service.

Do not collapse these concepts merely because current implementation may do so.

---

# 11. Audit Customer-Facing Promise vs Architecture

Compare the **current customer-facing UI/content** against what the architecture can genuinely deliver.

For every major customer-facing promise, classify:

**SUPPORTED NOW**

**PARTIALLY SUPPORTED**

**NOT CURRENTLY SUPPORTED**

**ARCHITECTURALLY POSSIBLE BUT NOT IMPLEMENTED**

For each mismatch, provide:

- UI/content location;
- underlying architectural capability;
- gap;
- risk;
- recommended resolution.

The objective is not to make the messaging smaller to fit the current product.

The objective is to determine:

> **Can the architecture actually deliver the promise?**

---

# 12. Audit the Full Flow

Map the current implementation against this target flow:

```text
ORGANISATION
     │
     ▼
ENTRY / CONTEXT
     │
     ▼
INITIAL DIAGNOSIS
     │
     ▼
SMALL WIN
     │
     ▼
IMMEDIATE VALUE
     │
     ▼
ADOPTION
     │
     ▼
ONGOING ENGAGEMENT
     │
     ▼
ORGANISATIONAL KNOWLEDGE
     │
     ▼
AGENT / KIRA INTELLIGENCE
     │
     ▼
NEXT BEST ACTION
     │
     ▼
FURTHER VALUE
     │
     └───────────────► CONTINUITY
```

For each stage identify:

- current implementation;
- relevant files/components;
- data produced;
- agent(s) involved;
- missing capability;
- architectural risk.

---

# 13. Identify Architectural Bottlenecks

Do not limit the audit to obvious schema issues.

Look for systemic bottlenecks such as:

- user-centric assumptions;
- conversation-centric memory;
- fragmented organisational state;
- lack of temporal modelling;
- missing provenance;
- agent outputs not becoming durable knowledge;
- knowledge not feeding future interactions;
- no clear Small Win mechanism;
- no measurable outcome;
- no continuity mechanism;
- consultant/organisation coupling;
- Kira instance/organisation coupling;
- subscription/organisation coupling;
- UI promises exceeding backend capability.

Rank findings by:

**P0 — architectural blocker**

**P1 — important**

**P2 — improvement**

---

# 14. Produce an Implementation Traceability Matrix

Return a table in this form:

| Canonical Concept / Invariant | Current Implementation | Location | Conformance | Gap | Risk | Required Change |
|---|---|---|---|---|---|---|

Include all 20 canonical invariants from the Canonical Organisational Model.

---

# 15. Produce a Small-Win Traceability Matrix

Also produce:

| Stage | Current Capability | Implementation Location | Conformance | Gap | Required Change |
|---|---|---|---|---|---|
| Organisation entry | | | | | |
| Context establishment | | | | | |
| Opportunity detection | | | | | |
| Small Win generation | | | | | |
| Small Win execution | | | | | |
| Outcome confirmation | | | | | |
| Knowledge capture | | | | | |
| Follow-up | | | | | |
| Re-engagement | | | | | |
| Continuity | | | | | |
| 30-day absence resilience | | | | | |

---

# 16. Report Back in Five Sections

Return the audit in this structure:

## 1. Executive Verdict

Give a blunt assessment:

> **How aligned is the current Kira architecture with the canonical model?**

Use an overall percentage only if it can be justified.

Also state the 3–5 biggest architectural issues.

---

## 2. Canonical Architecture Conformance

Report the entity/invariant audit.

Clearly identify:

- Green;
- Amber;
- Red.

---

## 3. Small-Win / Adoption / Continuity Audit

Answer:

> **Is the Small Win actually architecturally front-and-centre today?**

Then explain the complete flow and where it currently breaks.

---

## 4. Customer Promise vs Current Product

Answer:

> **Can Kira currently deliver the promise we are making to customers, partners and collaborators?**

Separate:

- already true;
- partially true;
- not yet true;
- technically possible but not wired together.

---

## 5. Priority Remediation Plan

Give a prioritised sequence:

### P0
Must change before scaling.

### P1
Should change before broader beta.

### P2
Can follow once the core architecture is stable.

For every recommended change include:

- why;
- affected components;
- dependency;
- expected outcome;
- test required.

---

# 17. Important Instruction

**Do not code changes as part of this audit unless explicitly requested.**

First establish the architectural truth.

Do not rationalise an existing implementation simply because it already exists.

Do not change the canonical model to make the implementation appear compliant.

Where the current implementation and canonical model conflict:

> **Report the conflict explicitly.**

The purpose of this audit is to give us a clear architectural baseline from which implementation work can then be prioritised.

---

# Final Question

End the report by answering this directly:

> **If we gave the current Kira implementation to 10 beta partners tomorrow and asked each one to apply the "30-Day Absence Test" — "Can you go a month without Kira?" — would the architecture currently create enough value, continuity and accumulated organisational intelligence that the answer would meaningfully be "No"?**

If not:

> **What specifically has to change to make the answer "No"?**