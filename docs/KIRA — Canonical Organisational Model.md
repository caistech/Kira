# KIRA — Canonical Organisational Model

**Status:** Architectural Foundation  
**Purpose:** P0.1 — Define the stable organisational reality that Kira must preserve  
**Scope:** Domain model and semantics; implementation-independent  
**Date:** 26 August 2026

---

## 1. Purpose

The purpose of this artifact is to define the **canonical organisational reality** that Kira must preserve across changes in people, ownership, consultants, engagements, commercial arrangements, Kira instances, software implementations and organisational history.

The governing question is:

> **What is the stable organisational reality that Kira must preserve even as people, consultants, engagements, commercial arrangements, Kira instances and software implementations change?**

Kira is not fundamentally a conversation system.

It is not fundamentally a CRM.

It is not fundamentally a consultant workflow tool.

It is not fundamentally a subscription record.

It is an **organisational intelligence system** whose enduring responsibility is to preserve, structure, contextualise and make useful the knowledge and relationships that constitute an organisation over time.

Therefore, the canonical model must represent the organisation independently of the software instance currently serving it.

The model must also distinguish the organisation itself from:

- the people associated with it;
- the people advising or working with it;
- the commercial relationship under which Kira is provided;
- the particular Kira instance serving it;
- the individual engagements occurring around it;
- and the knowledge accumulated about it.

These distinctions are architectural invariants, not implementation preferences.

---

# 2. Foundational Principle

## 2.1 The Organisation is the enduring anchor

The Organisation is the primary enduring business entity in the model.

People may leave.

Owners may change.

Consultants may change.

Consulting engagements may end.

Subscriptions may lapse or be replaced.

Commercial terms may change.

A Kira instance may be replaced, reconfigured, migrated or technically rebuilt.

Software architecture may change entirely.

The organisation nevertheless remains the organisational subject whose history and knowledge Kira is responsible for preserving.

Therefore:

> **Kira's memory belongs conceptually to the organisation, not to a particular conversation, person, consultant, subscription or software instance.**

This principle is foundational to the entire architecture.

---

# 3. Canonical Entities

The initial canonical model contains the following first-class concepts:

1. **Organisation**
2. **Person**
3. **Ownership Period**
4. **Consultant**
5. **Engagement**
6. **Kira Instance**
7. **Subscription**
8. **Commercial Arrangement**
9. **Organisational Knowledge Context**

Some of these are entities in their own right; others are temporal or relational constructs. They are nevertheless first-class concepts because collapsing them would destroy information required for organisational continuity.

---

# 4. Organisation

## 4.1 Definition

An Organisation is a persistent organisational entity whose identity exists independently of the people currently associated with it and independently of any particular Kira implementation.

An Organisation may be:

- privately owned;
- family owned;
- corporately owned;
- partnership based;
- undergoing succession;
- acquired;
- divested;
- restructured;
- dormant;
- merged;
- or otherwise changed over time.

The model must preserve the organisation's continuity through those changes.

## 4.2 Canonical characteristics

An Organisation has:

- a persistent identity;
- organisational attributes;
- a history;
- people associated with it;
- ownership history;
- engagements;
- commercial relationships;
- Kira service history;
- organisational knowledge;
- provenance concerning that knowledge.

Attributes that can change over time must not be treated as immutable organisational identity.

For example, the following are potentially temporal:

- legal name;
- trading name;
- ownership;
- leadership;
- industry;
- address;
- strategic direction;
- organisational structure;
- revenue;
- operational characteristics.

## 4.3 Organisational continuity

The model must distinguish:

**The organisation changed**

from:

**A different organisation now exists.**

This distinction is particularly important for:

- succession;
- acquisition;
- ownership transfer;
- restructuring;
- mergers;
- changes in management;
- consultant transitions.

Kira must not automatically interpret every material organisational change as the creation of a new organisational identity.

---

# 5. Person

## 5.1 Definition

A Person represents a human individual who may have one or more relationships with an Organisation.

A Person is not inherently an:

- owner;
- client;
- consultant;
- introducer;
- distributor;
- employee;
- director;
- advisor.

Those are **roles or relationships**, not intrinsic identities.

A person may hold multiple roles simultaneously or sequentially.

## 5.2 Role separation

For example, the same person could theoretically be:

- an owner of Organisation A;
- a director of Organisation B;
- a consultant to Organisation C;
- an introducer to Organisation D.

The canonical model must therefore avoid encoding role semantics directly into the identity of the Person.

The identity is:

> **Person**

The organisational relationship determines what that person means in a particular context.

---

# 6. Ownership Period

## 6.1 Definition

Ownership Period represents the temporal relationship between an Organisation and an owner.

Ownership must not be represented solely as a current Organisation → Person field.

The model must preserve ownership history.

Conceptually:

**Person → owns → Organisation**

is insufficient.

The canonical relationship is:

**Person → Ownership Period → Organisation**

where the Ownership Period has temporal boundaries and contextual information.

## 6.2 Why this matters

A business may have:

- Founder ownership;
- family ownership;
- management ownership;
- external acquisition;
- partial ownership;
- succession;
- sale;
- subsequent resale.

Kira's organisational memory must be able to answer not merely:

> Who owns the organisation now?

but also:

> Who owned it previously?

> When did ownership change?

> What knowledge was created under each ownership period?

> What decisions occurred before and after the transition?

This is essential to Kira's long-term organisational intelligence proposition.

---

# 7. Consultant

## 7.1 Definition

Consultant represents a person or consulting organisation acting in an advisory, facilitative, transformation, coaching or professional capacity in relation to an Organisation.

Consultant is deliberately separated from Introducer/Distributor.

A consultant is not merely a channel through which Kira was acquired.

The consultant has a substantive relationship with the organisation.

## 7.2 Consultant relationship

The canonical relationship is:

**Consultant ↔ Organisation**

and, where applicable:

**Consultant → Engagement → Organisation**

The Consultant may therefore participate in:

- diagnosis;
- strategy;
- organisational improvement;
- succession preparation;
- operational transformation;
- implementation;
- ongoing advisory work;
- interpretation of organisational intelligence.

## 7.3 Consultant is not an Organisation attribute

The current consultant must never become the identity of the organisation.

Changing consultant must not require:

- creating a new Organisation;
- abandoning organisational memory;
- creating a new organisational history;
- transferring memory by destructive copying.

The consultant relationship is temporal.

The Organisation persists.

---

# 8. Introducer / Distributor

## 8.1 Definition

An Introducer or Distributor represents a party that introduces, refers, distributes or otherwise facilitates access to Kira.

This relationship is commercially and structurally different from consultancy.

The canonical model must preserve the distinction between:

**Introducer → Organisation**

and:

**Consultant → Organisation**

These relationships must never be collapsed merely because the same person or company may sometimes perform both functions.

## 8.2 Why the distinction is mandatory

An introducer may:

- generate the relationship;
- refer a client;
- distribute Kira;
- receive commercial consideration;
- facilitate onboarding.

A consultant may:

- diagnose;
- advise;
- deliver professional services;
- interpret Kira outputs;
- conduct engagements;
- work with the client over an extended period.

These are materially different relationships.

A single party may perform both roles, but the roles remain distinct.

---

# 9. Engagement

## 9.1 Definition

An Engagement is a bounded substantive relationship or body of work undertaken in relation to an Organisation.

Engagement is a first-class domain concept.

It is not equivalent to:

- a Kira conversation;
- a subscription;
- a consultant relationship;
- a commercial agreement;
- a project record.

An Engagement may involve one or more people, consultants, commercial arrangements and Kira-supported activities.

## 9.2 Examples

An Organisation may have engagements relating to:

- succession preparation;
- business valuation preparation;
- strategic planning;
- operational improvement;
- organisational restructuring;
- acquisition preparation;
- leadership transition;
- process documentation;
- implementation of recommendations.

Multiple engagements may exist simultaneously or sequentially.

## 9.3 Engagement lifecycle

An Engagement may progress through states such as:

**proposed → accepted → active → paused → completed → terminated**

The exact implementation states are not prescribed by this model.

The invariant is that engagement state and lifecycle must be represented independently of subscription state and Kira instance state.

## 9.4 Consultant and Engagement

A consultant may participate in one or more engagements.

An engagement may involve:

- one consultant;
- multiple consultants;
- internal organisational participants;
- external specialists.

Therefore:

> **Consultant and Engagement must not be represented as a single relationship.**

The consultant is the actor.

The engagement is the bounded body of work.

---

# 10. Kira Instance

## 10.1 Definition

A Kira Instance represents a particular operational manifestation of Kira serving an Organisation.

It may represent a particular:

- deployment;
- configuration;
- tenant;
- agent identity;
- voice interface;
- software environment;
- service instance;
- or other implementation-level representation.

## 10.2 Critical distinction

The Kira Instance is **not the organisation**.

It is also not the organisation's memory.

It is an operational interface through which Kira accesses and contributes to the Organisation's organisational knowledge.

Therefore:

> **Replacing a Kira Instance must not destroy the Organisation's identity or organisational knowledge.**

## 10.3 Multiple instances

An Organisation may have:

- one Kira instance;
- multiple Kira instances;
- historical Kira instances;
- replacement instances;
- different interfaces or deployments.

The model must allow these to exist without fragmenting the organisation's identity.

---

# 11. Subscription

## 11.1 Definition

A Subscription represents the commercial entitlement or recurring service relationship under which Kira is provided to an Organisation.

A Subscription is not:

- the Organisation;
- the Kira Instance;
- the Engagement;
- or the Commercial Arrangement as a whole.

## 11.2 Subscription lifecycle

A Subscription may:

- commence;
- renew;
- change tier;
- be suspended;
- expire;
- be cancelled;
- be replaced.

The Organisation remains independent of these events.

## 11.3 Commercial invariant

Kira is not a free service.

Any white-label or introductory experience offered by a consultant must not be interpreted as establishing a free Kira service model.

A consultant may use an introductory or white-label Kira experience as a relationship-building mechanism, including the Kira 13 Questions, but once Kira is engaged as a service it is a paid commercial service.

The model must therefore preserve the distinction between:

- an introductory experience;
- a commercial Kira service;
- consultant professional services.

---

# 12. Commercial Arrangement

## 12.1 Definition

Commercial Arrangement represents the contractual/economic relationship governing one or more commercial parties, services, entitlements, fees, revenue shares or other commercial terms.

It is deliberately broader than Subscription.

## 12.2 Why Subscription is insufficient

A Kira relationship may involve:

- GBTA / Global BuildTech as Kira developer/provider;
- a consultant;
- an Organisation;
- subscription fees;
- consultant fees;
- revenue sharing;
- referral arrangements;
- tiered pricing;
- changing commercial terms.

These relationships cannot safely be compressed into a single subscription record.

## 12.3 Versioning

Commercial terms are temporal.

The model must therefore support:

**Commercial Arrangement Version 1**

followed by:

**Commercial Arrangement Version 2**

without rewriting historical truth.

For example:

- pricing may change;
- subscription tiers may change;
- revenue sharing may change;
- consultant terms may change;
- service scope may change.

Historical commercial truth must remain recoverable.

---

# 13. Organisational Knowledge Context

## 13.1 Definition

Organisational Knowledge Context is the canonical conceptual anchor for knowledge about an Organisation.

It represents structured organisational knowledge rather than raw conversation history.

This distinction is fundamental.

A conversation is an **event/source**.

Organisational knowledge is an **interpreted, contextualised organisational fact, belief, decision, relationship, capability, constraint, preference, process or other meaningful organisational knowledge object**.

## 13.2 Knowledge is not conversation history

Kira must not equate:

> "Everything that has ever been said to Kira"

with:

> "The organisation's memory."

Conversation history may contain:

- questions;
- misunderstandings;
- corrections;
- temporary statements;
- speculation;
- obsolete information;
- personal opinions;
- irrelevant material.

Organisational Knowledge Context must therefore exist above raw interaction history.

## 13.3 Knowledge provenance

Organisational knowledge must be capable of carrying provenance.

At minimum, the conceptual model must support questions such as:

- Who provided this information?
- When was it provided?
- In what context?
- Was it directly observed?
- Was it inferred?
- Was it confirmed?
- Has it subsequently been contradicted?
- Why does Kira currently believe it?
- What engagement produced or validated it?
- What organisational period did it relate to?
- Is it current or historical?

The implementation may use different mechanisms to achieve this.

The canonical requirement is that provenance exists.

---

# 14. Knowledge State

Organisational knowledge should conceptually support distinctions such as:

- asserted;
- observed;
- inferred;
- validated;
- disputed;
- superseded;
- historical;
- current;
- unknown.

These are semantic states rather than prescribed database values.

The critical invariant is:

> **Kira must be able to distinguish what it knows from what it merely heard.**

---

# 15. Core Relationship Model

The canonical relationship structure can be represented conceptually as:

```text
                         ┌──────────────────┐
                         │      Person      │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
               Ownership      Consultant     Introducer
                Period          Role           Role
                    │             │             │
                    └─────────────┼─────────────┘
                                  │
                         ┌────────▼────────┐
                         │   Organisation  │
                         └───────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
         Engagement       Kira Instance       Subscription
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ Commercial Arrangement │
                    └─────────────────────────┘

                         Organisation
                              │
                              ▼
                Organisational Knowledge
                      Context / Memory
```

This is a semantic model only.

It does not prescribe database tables, foreign keys, APIs or software classes.

---

# 16. Critical Separations

The following distinctions are mandatory.

## 16.1 Organisation ≠ Person

An organisation is not its owner, founder, CEO or primary contact.

## 16.2 Organisation ≠ Kira Instance

Kira is a service/interface serving the organisation.

The organisation's identity must survive Kira replacement.

## 16.3 Organisation ≠ Subscription

Subscription status must never determine whether the organisation historically existed.

## 16.4 Consultant ≠ Introducer

A consultant relationship is substantive professional involvement.

An introducer/distributor relationship is a channel/commercial relationship.

The same party may perform both roles, but the relationships remain separate.

## 16.5 Consultant ≠ Engagement

A consultant is an actor.

An engagement is a body of work.

## 16.6 Engagement ≠ Subscription

An engagement may occur independently of subscription state.

A subscription may support multiple engagements.

## 16.7 Subscription ≠ Commercial Arrangement

A subscription represents service entitlement.

A commercial arrangement represents the broader economic/contractual relationship.

## 16.8 Conversation ≠ Organisational Knowledge

A conversation is evidence.

Organisational knowledge is the contextualised organisational interpretation derived from evidence.

## 16.9 Current State ≠ Historical Truth

The current state must never erase the historical state.

---

# 17. Temporal Model

Time is intrinsic to the canonical model.

Relationships and attributes must be understood as potentially temporal.

Examples include:

- ownership;
- consultant relationships;
- engagements;
- subscriptions;
- commercial terms;
- organisational roles;
- organisational knowledge;
- Kira instances.

The model must therefore support the conceptual distinction between:

**Current truth**

and:

**truth at a historical point in time.**

This does not prescribe a particular temporal database technique.

It establishes a semantic requirement.

---

# 18. Organisational Continuity Through Change

The model must support scenarios such as the following.

### Scenario A — Ownership changes

Founder sells the organisation.

Result:

- Organisation remains the same canonical organisational subject;
- Ownership Period ends;
- new Ownership Period begins;
- historical knowledge remains associated with the organisation;
- historical provenance remains intact.

### Scenario B — Consultant changes

Consultant A completes their work.

Consultant B begins a new engagement.

Result:

- Organisation remains unchanged;
- Consultant A's historical relationship remains;
- Consultant B receives appropriate access to relevant organisational knowledge;
- the transition does not require reconstructing organisational memory.

### Scenario C — Kira is technically rebuilt

A new Kira implementation replaces the old implementation.

Result:

- Kira Instance A becomes historical;
- Kira Instance B becomes active;
- Organisation remains unchanged;
- organisational knowledge remains unchanged;
- the new instance inherits appropriate continuity.

### Scenario D — Subscription tier changes

Organisation moves from one paid Kira tier to another.

Result:

- Subscription history is preserved;
- Commercial Arrangement history is preserved;
- Organisation remains unchanged;
- organisational knowledge remains unchanged.

### Scenario E — Engagement ends

A consulting engagement concludes.

Result:

- Engagement becomes historical/completed;
- consultant relationship may remain active or end;
- organisational knowledge produced by the engagement remains part of the organisation's history;
- subscription may continue independently.

### Scenario F — Commercial model changes

Kira's pricing or consultant revenue-share model changes.

Result:

- new commercial terms become effective;
- historical commercial terms remain recoverable;
- existing organisational history is not rewritten.

---

# 19. Commercial Model Invariants

The canonical model must reflect the following commercial truths.

## 19.1 Kira is a paid service

Kira is never fundamentally modelled as a free service.

A consultant may provide an introductory experience, such as a white-label version of the Kira 13 Questions, as part of relationship development.

That does not establish a free Kira service relationship.

## 19.2 Consultant services are distinct

Consultant professional fees are separate from Kira service fees.

Kira's commercial model must not assume that consultant human-work fees are simply part of Kira subscription revenue.

## 19.3 Revenue sharing is a commercial relationship

Where Kira revenue is shared between Global BuildTech and a consultant, this is represented as a commercial arrangement.

It must not be embedded invisibly into Organisation or Subscription identity.

## 19.4 Pricing is mutable

Kira tiers, prices and commercial arrangements may change over the lifetime of the company.

Therefore:

> **Current pricing must never overwrite historical commercial truth.**

---

# 20. Consultant-Led Kira Model

The canonical model must explicitly support Kira operating as a **scale enabler for consultants**.

The consultant's value is not merely customer acquisition.

Kira can enable the consultant to:

- reduce low-value discovery effort;
- establish an initial organisational baseline;
- capture organisational knowledge;
- identify issues and opportunities;
- create structured outputs;
- prioritise follow-on work;
- maintain organisational continuity between engagements;
- scale advisory capacity;
- create a richer ongoing client relationship.

This creates two distinct but complementary value dimensions.

### Client value

Kira produces useful organisational intelligence for the Organisation.

### Consultant value

Kira creates a scalable substrate for diagnosis, engagement, follow-on work and relationship continuity.

The model must support both without allowing consultant interests to overwrite organisational identity.

---

# 21. Knowledge and Engagement Relationship

Engagements are important producers and consumers of organisational knowledge.

Conceptually:

```text
Engagement
    │
    ├── produces ──► Organisational Knowledge
    │
    ├── consumes ──► Organisational Knowledge
    │
    └── involves ──► People / Consultants
```

This enables Kira to distinguish:

- knowledge existing before an engagement;
- knowledge discovered during an engagement;
- knowledge validated during an engagement;
- recommendations resulting from an engagement;
- outcomes resulting from an engagement.

This is essential if Kira is to become persistent organisational intelligence rather than simply a conversational assistant.

---

# 22. Knowledge and Ownership Relationship

Knowledge must also be temporally contextualised against ownership.

For example:

> "The founder prefers X."

may be true historically but no longer operationally relevant.

Where appropriate, Kira should be able to understand:

- who established the practice;
- when it was established;
- whether it remains current;
- who subsequently changed it;
- why it changed.

This allows Kira to preserve institutional history without confusing historical practice with current practice.

---

# 23. Kira Instance and Organisational Knowledge

A Kira Instance may:

- capture evidence;
- retrieve knowledge;
- generate interpretations;
- produce outputs;
- facilitate interactions.

But it does not own the canonical knowledge.

The conceptual flow is:

```text
Human interaction
       ↓
Evidence
       ↓
Knowledge processing / governance
       ↓
Organisational Knowledge Context
       ↓
Future Kira instances / engagements / authorised users
```

This is one of the most important architectural boundaries in the model.

---

# 24. Identity and Access Implications

Although access control is outside the scope of this artifact, the canonical model creates necessary distinctions for future access architecture.

Access may depend on:

- Organisation;
- Person;
- role;
- Engagement;
- commercial relationship;
- knowledge sensitivity;
- provenance;
- time.

Therefore, access cannot safely be derived solely from:

> "Who owns this Kira account?"

That implementation concept is too narrow for the canonical model.

---

# 25. Canonical Lifecycle View

The overall organisational lifecycle can be understood as:

```text
Organisation exists
       │
       ├── People become associated
       │
       ├── Ownership changes
       │
       ├── Consultant relationships form
       │
       ├── Engagements occur
       │
       ├── Organisational knowledge accumulates
       │
       ├── Kira service begins
       │
       ├── Subscription changes
       │
       ├── Commercial arrangements evolve
       │
       ├── Kira instances change
       │
       ├── Consultants change
       │
       └── Ownership may change
                    │
                    ▼
          Organisation continues
          with preserved history
```

Kira's architectural responsibility is to preserve the continuity represented by this lifecycle.

---

# 26. What This Model Deliberately Does Not Define

This artifact does not prescribe:

- database tables;
- SQL schemas;
- ORM models;
- API structures;
- event schemas;
- vector databases;
- graph databases;
- embeddings;
- agent architecture;
- frontend architecture;
- authentication implementation;
- specific memory technologies;
- specific CRM integrations;
- specific deployment architecture.

Those are implementation decisions.

They must be evaluated against this canonical model rather than defining it.

---

# 27. Implementation Traceability

Every canonical concept should eventually be traceable to:

1. current implementation;
2. current implementation location;
3. degree of semantic conformity;
4. missing implementation;
5. conflicting implementation;
6. required architectural decision;
7. migration implications;
8. test coverage.

The resulting audit should therefore be able to answer:

> **Where does this canonical concept currently exist in Kira?**

and:

> **Where does the current implementation violate the canonical meaning?**

This artifact is the reference point for that subsequent audit.

---

# 28. Canonical Invariants

The following are non-negotiable architectural rules.

### INV-001 — Organisation persistence

Organisation identity must persist independently of people, consultants, engagements, subscriptions and Kira instances.

### INV-002 — Person/role separation

Person identity must be distinct from organisational roles.

### INV-003 — Ownership temporalisation

Ownership must support historical periods rather than representing only current ownership.

### INV-004 — Consultant first-class status

Consultant relationships must be explicitly represented.

### INV-005 — Engagement first-class status

Engagement must be explicitly represented as a domain concept.

### INV-006 — Consultant/Introducer separation

Consultant and Introducer/Distributor relationships must never be implicitly collapsed.

### INV-007 — Engagement/Subscription separation

Engagement lifecycle must remain independent of subscription lifecycle.

### INV-008 — Kira/Organisation separation

A Kira Instance must never become the canonical identity of the Organisation.

### INV-009 — Memory/Instance separation

Organisational knowledge must survive replacement of a Kira Instance.

### INV-010 — Conversation/Knowledge separation

Raw conversation history must not be treated as equivalent to organisational memory.

### INV-011 — Knowledge provenance

Material organisational knowledge must have conceptually recoverable provenance.

### INV-012 — Temporal knowledge

The model must support current and historical organisational knowledge.

### INV-013 — Commercial truth

Commercial arrangements must be represented independently from organisational identity.

### INV-014 — Commercial versioning

Changes to commercial terms must preserve historical commercial truth.

### INV-015 — Paid Kira service

The commercial model must represent Kira as a paid service, while permitting distinct introductory experiences.

### INV-016 — Consultant economics separation

Consultant professional-service fees must remain conceptually distinct from Kira service fees.

### INV-017 — Continuity

Replacement of a consultant, Kira instance, subscription or commercial arrangement must not destroy organisational continuity.

### INV-018 — No implementation-defined semantics

Database or software structures must not redefine canonical organisational meaning.

### INV-019 — Historical preservation

Historical relationships and states must not be destroyed merely because they are no longer current.

### INV-020 — Organisational subject primacy

Kira's persistent intelligence must ultimately be anchored to the Organisation rather than to a transient interaction, person, consultant or software instance.

---

# 29. Architectural Test

The canonical model should be considered successful only if Kira can conceptually answer all of the following without reconstructing history from unrelated implementation records:

1. **What organisation is this?**
2. **Who has been associated with it?**
3. **Who owns it now?**
4. **Who owned it previously?**
5. **Which consultants have worked with it?**
6. **What engagements have occurred?**
7. **Which engagements are active?**
8. **What Kira instances have served it?**
9. **What subscriptions has it had?**
10. **What commercial arrangements have governed the relationship?**
11. **What organisational knowledge has accumulated?**
12. **Where did that knowledge come from?**
13. **What was believed at a particular point in time?**
14. **What has subsequently changed?**
15. **What knowledge remains relevant today?**
16. **What knowledge is historical?**
17. **What organisational work should a consultant undertake next?**
18. **What can be safely carried forward when a consultant changes?**
19. **What can be safely carried forward when Kira is technically rebuilt?**
20. **What commercial history must remain intact?**

If the implementation cannot answer these questions because the concepts have been collapsed together, that is an architectural defect rather than merely a data-access inconvenience.

---

# 30. Canonical Summary

The stable organisational reality represented by Kira is:

> **An enduring Organisation, associated over time with People and Ownership Periods, served through potentially changing Kira Instances, supported by Consultants and bounded Engagements, governed by Subscriptions and Commercial Arrangements, and accumulating an enduring body of provenance-aware Organisational Knowledge.**

Everything else is implementation, interface, transaction, relationship, evidence or temporal state.

The central architectural principle is therefore:

> **Kira instances, consultants, engagements, subscriptions and commercial arrangements may change. The organisation's identity, history and governed organisational knowledge must remain coherent across those changes.**

This is the canonical boundary against which the existing Kira implementation should now be audited.

---

# 31. Next Artifact: Implementation Traceability Matrix

The next architectural artifact should map each canonical concept and invariant against the existing Kira implementation.

For each concept, the audit should identify:

| Canonical Concept | Existing Implementation | Conformance | Gap | Risk | Required Decision |
|---|---|---|---|---|---|
| Organisation | TBD | TBD | TBD | TBD | TBD |
| Person | TBD | TBD | TBD | TBD | TBD |
| Ownership Period | TBD | TBD | TBD | TBD | TBD |
| Consultant | TBD | TBD | TBD | TBD | TBD |
| Engagement | TBD | TBD | TBD | TBD | TBD |
| Kira Instance | TBD | TBD | TBD | TBD | TBD |
| Subscription | TBD | TBD | TBD | TBD | TBD |
| Commercial Arrangement | TBD | TBD | TBD | TBD | TBD |
| Organisational Knowledge Context | TBD | TBD | TBD | TBD | TBD |

That audit should **not modify the canonical model to fit the existing implementation**.

Where the implementation conflicts with the canonical model, the conflict should be recorded explicitly and resolved as an architectural decision.