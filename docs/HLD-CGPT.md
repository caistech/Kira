# Kira — High-Level Design (HLD)

**Status:** Working architectural baseline — 10 September 2026  
**Document role:** Product and system architecture  
**Source of truth:** The repository, deployed behaviour, database schema/migrations, and verified operational configuration. This document must not be used to override the code.

## 1. Purpose

Kira is being built to help profitable privately owned physical businesses become less dependent on their owner and more transferable.

The primary market problem is the **Baby Boomer Business Owner (BBBO) transition problem**: valuable businesses can remain heavily dependent on an ageing owner because critical knowledge, decisions, relationships and operating judgement remain embedded in that person.

Kira provides a continuous interaction layer that captures and organises that knowledge, turns interactions into evidence, identifies gaps, supports business change, and progressively improves evidence of transferability.

Kira is therefore not fundamentally a voice product. Voice is a primary interface.

Kira is not:
- a receptionist;
- a generic chatbot;
- merely a knowledge-management system;
- a replacement for a consultant or adviser;
- an exit-readiness questionnaire;
- a valuation calculator.

## 2. Strategic outcome

The intended progression is:

Owner interaction
→ captured evidence
→ organised business knowledge
→ Operating Manual / Genome
→ maturity assessment
→ identified gaps
→ actions and pathways
→ reduced owner dependency
→ stronger transferability evidence
→ potentially improved business value and transition options.

The core product question is:

> **Can the business increasingly operate, make decisions and retain its capability without everything depending on the owner?**

Valuation is downstream of this problem, not the definition of Kira.

## 3. Design principles

1. **Owner-first:** normal business interaction is the preferred source of knowledge.
2. **Evidence over assertion:** Kira must not manufacture readiness or knowledge.
3. **Progressive capture:** the system grows through use rather than a one-off documentation exercise.
4. **Business ownership:** owners should be able to export/store their knowledge and avoid unnecessary platform lock-in.
5. **Human advisers remain important:** Kira augments consultants and advisers rather than replacing them.
6. **Organisation-aware:** business knowledge and permissions must be scoped to the correct organisation and person.
7. **Fail closed for security:** missing or invalid secrets/authentication do not silently grant access.
8. **Current code beats old documentation:** implementation status must be verified.
9. **Separate interface from intelligence:** voice is an interface to a broader orchestration, memory and business-evidence system.
10. **Make Kira progressively less necessary:** the ultimate measure of success is increased business capability and owner independence.

## 4. Product model

### 4.1 Interaction

The owner talks with Kira through the web application and voice interface.

Interactions can produce:
- conversation evidence;
- durable business knowledge;
- documents and supporting evidence;
- decisions;
- tasks;
- unresolved questions;
- changes to business topics;
- requests for further exploration.

### 4.2 Memory and knowledge

The system distinguishes transient conversation context from durable business knowledge.

Supabase remains authoritative for application state. Mnemo is an indexing/retrieval component, not the authority for business state.

The strategic direction is:

Kira
→ Orchestrator
→ specialist/agent processing
→ Mnemo/retrieval
→ Memory Governance
→ governed business memory.

Implementation details are subject to the CURRENT/TARGET status rules in the LLD.

### 4.3 Operating Manual / Genome

The accumulated evidence is organised around the questions a buyer, adviser or owner needs answered about how the business actually operates.

The terminology may evolve, but the architectural concept remains:

> an evolving, evidence-backed representation of the business's operating reality.

## 5. Maturity Model

The maturity model is central to the product.

A useful conceptual progression is:

1. **Interaction Evidence** — Kira is learning through real interactions.
2. **Knowledge and Evidence** — facts, documents, decisions, tasks and operating knowledge become organised.
3. **Operating Manual / Genome** — the accumulated evidence is structured by business areas.
4. **Assessment** — coverage, substance and evidence strength are evaluated.
5. **Maturity** — the business can see where it is strong, weak or open.
6. **Pathways and Milestones** — gaps translate into practical change.
7. **Transferability Evidence** — progress demonstrates reduced owner dependency and greater operational resilience.

Plans or intended actions do not themselves increase readiness. Evidence does.

## 6. System context

At a high level:

Owner / CEO
    ↕
Kira web and voice interfaces
    ↓
Kira application
    ↓
Orchestration / agent processing
    ↓
Memory + knowledge + evidence
    ↓
Genome / Operating Manual
    ↓
Assessment + maturity + pathways
    ↓
Tasks / documents / adviser collaboration / valuation evidence

The Orchestrator is a separate service boundary used for privileged/stateful capabilities. Kira should not hold privileged database credentials for capabilities deliberately migrated behind that boundary.

## 7. Identity, people and organisations

The canonical identity model is:

Supabase Auth
→ auth_credentials
→ persons
→ organisation_memberships
→ organisations

Ownership is represented separately through ownership-period data.

Important rules:
- an Auth user is not itself the Person domain object;
- `persons.auth_user_id` is not the canonical identity relationship;
- `auth_credentials.auth_user_id` is the bridge to Supabase Auth;
- organisation membership carries role/access attributes;
- membership validity is time-aware where applicable;
- selected organisation context is held separately from identity.

The application must resolve the current organisation context from a valid selected organisation where permitted, otherwise from a valid membership.

## 8. Portal and role architecture

Kira must support more than a simple organisation switcher.

A person may have multiple legitimate contexts, including:
- business owner / CEO;
- organisation administrator;
- CAIS/Kira corporate administrator;
- other future ecosystem roles.

The portal context determines what the user is allowed to see and do.

Known route families include:
- `/dashboard`
- `/my-genome`
- `/plan`
- `/admin/*`
- `/corporate-admin` (TARGET/VERIFY until confirmed implemented)

A portal selector is conceptually different from an organisation selector because the same person can have different responsibilities within the same or different organisations.

## 9. Voice architecture

Each owner/business relationship can have a dedicated ElevenLabs agent provisioned and persisted in Kira's agent records.

Important properties:
- no automatic microphone connection merely because the voice UI is visible;
- no agent provisioning merely because a page loads;
- user action is required to initiate voice interaction;
- agent identity is established by trusted provisioning/configuration rather than caller-supplied identity;
- webhook requests are authenticated using the canonical tool secret;
- missing tool secrets fail closed;
- post-call processing uses authenticated verification.

The `/talk` experience represents the beginning of a relationship when no prior conversation exists. It must not imply that Kira is continuing an earlier conversation when the interaction is actually first-time setup.

## 10. Conversation lifecycle

The conceptual lifecycle is:

1. user starts interaction;
2. identity and organisation context are resolved;
3. Kira/voice agent is connected;
4. conversation context is established;
5. messages/interactions are captured;
6. useful evidence is identified;
7. durable memory/knowledge is governed and persisted;
8. tasks or follow-up actions may be created;
9. post-call processing completes;
10. resulting evidence becomes available to the relevant Genome/Operating Manual areas.

The system must not treat every utterance as durable knowledge.

## 11. Genome assessment

The Genome is assessed by business area rather than pretending every question has equal evidence.

The current architecture includes:
- a defined checklist;
- substance/evidence tests;
- area-level assessment;
- bands such as empty/thin/building/covered;
- explicit handling for weak evidence;
- explicit handling for unassessed/outage cases.

Assessment failure must not be interpreted as proof that the business lacks the information.

The assessment layer must never guess an answer merely to improve a score.

## 12. Readiness and pathways

Readiness is an arithmetic/evidence-derived result, not a language-model opinion.

Hard-won invariants include:
- readiness baseline is not silently recomputed in place;
- plans do not move readiness;
- weak evidence does not automatically count as answered;
- model/version information is retained where required;
- numeric finiteness is checked before comparisons;
- pathway gates use evidenced items and evidence dates rather than intentions alone.

The exact active schema and implementation must be confirmed against the current repository.

## 13. Valuation

Valuation is a measurement layer downstream of business transferability.

The intended model separates:
- baseline valuation;
- current/evidenced readiness;
- owner-dependency/buyer-risk discount;
- bounded Kira-attributable uplift;
- reported business profit;
- sector multiple centre/band.

The system must not represent an arbitrary model output as guaranteed market value.

Australian niche-specific evidence remains an area for continued strengthening. Existing external benchmark sources must be clearly identified as benchmarks rather than universal market truth.

## 14. Adviser and consultant ecosystem

Kira is designed to work with the wider professional ecosystem.

### Business owner
Provides the operating reality and owns the transition objective.

### Consultant/adviser
Uses the accumulated evidence to understand the business continuously and spend more time on strategy, decisions and change.

### Distribution partner
Introduces Kira to appropriate business owners and may participate in the commercial/distribution model.

### Technology partner
Can integrate complementary capability into the ecosystem.

### CAIS/Kira operator
Provides platform governance, product operations and corporate administration.

The consultant proposition is architectural, not merely promotional:

> Kira gives an adviser a continuously developing evidence base about the client's business without requiring the adviser to reconstruct the business from scratch at every engagement.

Kira should not position itself as eliminating the consultant.

## 15. Beta architecture

The current beta is intentionally separate from commercial billing.

Known strategic beta principles:
- testers are associated with the CAIS Beta organisation;
- beta access is controlled through beta onboarding/code mechanisms;
- beta users use the user portal;
- no credit card is required for beta;
- beta users are not charged;
- beta UI should not rely on a generic “Beta — free” pricing card.

Beta seed/test data is intentional where explicitly identified as such.

The exact currently deployed beta-code and membership implementation must be verified against the repository.

## 16. Orchestrator

`connect.kiraexec.com` is a separate service boundary.

The architectural purpose is to isolate privileged/stateful operations from the main Kira application.

Known scoped credentials include:
- `kira-webhook` for webhook-oriented privileged operations;
- `kira-public` for intentionally public/beta-code operations.

The exact endpoint inventory is maintained in the LLD and must be reconciled with the deployed Orchestrator.

## 17. Write-back and ownership

Kira should support rendering business knowledge into owner-controlled destinations.

The principle is:

> Kira helps create and organise the knowledge; the owner should not have to remain dependent on Kira to possess it.

Export/write-back may include:
- Operating Manual documents;
- Markdown/JSON;
- approved audience-specific views;
- external storage/system-of-record destinations.

Audience and approval controls are server enforced.

## 18. Email and compliance

Email is an operational capability rather than the product's core value.

The platform uses Resend for email delivery where implemented.

Compliance architecture includes suppression handling, with migrated suppression capabilities behind the Orchestrator.

Outbound beta/partner communications should remain governed by explicit consent/contact data and should support relationship-specific messaging.

## 19. Shared infrastructure

The Kira repository contains or has historically contained shared packages for capabilities including:
- Supabase clients;
- Mnemo;
- discovery/agent tooling;
- corporate UI;
- subscription/billing;
- email compliance/send;
- attribution;
- coordination;
- ABN lookup;
- beta gating;
- platform trust middleware;
- embed/WebMCP tooling.

Shared packages must not be described as active dependencies unless confirmed by the current import graph.

## 20. Security model

Core security principles:
- server-side authorization;
- organisation and person scoping;
- RLS where applicable;
- no caller-supplied identity accepted as authoritative;
- webhook secrets fail closed;
- privileged operations isolated behind the Orchestrator;
- audience/approval checks enforced server-side;
- no production credentials embedded in client code;
- no authentication bypasses for QA or convenience.

## 21. Deployment

Current known infrastructure includes:
- Next.js application on Vercel;
- production domain `kiraexec.com`;
- valid production subdomain `globalbuildtech.kiraexec.com`;
- preview deployment `kira-rho.vercel.app`;
- Orchestrator at `connect.kiraexec.com`;
- Supabase;
- ElevenLabs;
- Stripe for commercial billing where enabled;
- Resend for email.

Current deployment constraint:

The Vercel Hobby plan does not support the current set of frequent cron schedules. The repository has multiple cron jobs with hourly/sub-hourly intent. These must either be consolidated/reworked, moved to a suitable execution mechanism/plan, or deliberately deferred before deployment can be considered clean.

## 22. Documentation status rules

Every significant architectural statement should be classified:

- **CURRENT** — implemented and verified.
- **TARGET** — agreed design not yet fully implemented.
- **STRATEGIC** — product/market direction.
- **VERIFY** — requires repository/deployment confirmation.

The documents must never convert a TARGET or STRATEGIC statement into CURRENT merely because a directive has been written.

## 23. Current known gaps / verification items

The following require explicit verification before being treated as complete:
- portal selector/context implementation;
- exact current organisation-scoped Genome schema;
- final Memory Governance implementation;
- exact active Orchestrator endpoint inventory;
- Supabase API Key Model production migration status;
- corporate-admin route and permissions;
- commercial billing versus beta separation in deployed code;
- current cron execution strategy;
- current shared-package import graph.

## 24. Long-term direction

Kira's long-term purpose is not to create another system the owner must operate forever.

The direction is:

> **Talk to Kira → Kira learns → evidence accumulates → gaps become visible → the business changes → owner dependency falls → transferability improves.**

The strongest proof of the product is not how much Kira can say.

It is how much the business can increasingly do without the owner having to be the answer to everything.
