# Kira Architecture Redesign — Project & Design Directive

**Document type:** Coding Assistant Project / Design Directive  
**Status:** Authoritative implementation direction  
**Purpose:** Review the existing Kira architecture, identify the gap between the current implementation and the target architecture described below, then design and implement the new architecture without unnecessarily disturbing working capabilities.

---

## 1. Executive Directive

Kira is to be redesigned around a hierarchical, context-driven architecture in which **Talk is the primary discovery and context-establishment mechanism at each organisational level**, while the underlying application uses a stable, structured data model to persist the important information extracted from those conversations.

The critical architectural principle is:

> **Prompts and interviews are flexible conversational interfaces to a canonical data model. They are not the data model themselves.**

The interview questions may evolve without requiring a mechanistic application workflow rewrite. However, information identified as important must be explicitly mapped to canonical organisation, consultant, framework, agreement, genome, capability and related records.

The implementation must support:

1. Corporate AI Solutions as the top-level Portfolio Administration environment.
2. Kira Project as a project within that portfolio.
3. Kira Project administration of distributors, business consultants and other partners.
4. A Consultant Portal for each consultant/distributor.
5. Consultant `/talk` as a professional discovery interview that establishes a Consultant Genome and captures the consultant's methodology/framework.
6. A formal Kira–Consultant Operating Agreement produced from that discovery and agreed with the consultant.
7. Consultant-managed client organisations.
8. Client `/talk` as the full initial business discovery interview, including the existing 13 important questions, but embedded in a broader conversational interview rather than implemented as a rigid questionnaire.
9. A Business Genome for each client organisation.
10. A structured mechanism for determining how Kira should operate within a consultant's particular methodology and for a particular client.
11. Versioned, machine-readable operating agreements and authorised capabilities.
12. Preservation of existing working Kira capabilities wherever they remain compatible with the new architecture.

This directive is **not** permission to immediately rewrite the application.

The coding assistant's first task is analysis.

---

# 2. Required Development Sequence

The coding assistant MUST execute the work in this order:

### Phase 1 — Analyse and Review

Inspect the existing Kira repository, architecture, database schema, authentication/identity model, portals, routes, Talk implementation, agent configuration, prompts, extraction logic, organisation model, permissions, and relevant existing workflows.

Do not assume the existing architecture is accurately represented by prior documentation.

Determine what actually exists in the code and database.

### Phase 2 — Gap Analysis

Produce a documented gap analysis between:

**CURRENT STATE**

and

**TARGET STATE defined in this document.**

The gap analysis must distinguish:

- Already implemented and reusable
- Implemented but requiring modification
- Partially implemented
- Architecturally incompatible
- Missing
- Unknown / requiring verification

Do not propose rebuilding components merely because they are not identical to the target description.

### Phase 3 — Scope

Convert the gap analysis into an implementation scope.

Identify:

- Database changes
- Identity and tenancy changes
- Portal and route changes
- Prompt/agent changes
- Extraction/schema changes
- New domain objects
- Permissions and authorisation
- Versioning
- Migration requirements
- Backward compatibility requirements
- Testing requirements
- Deployment risks

Separate:

**MUST HAVE**

from:

**SHOULD HAVE**

and:

**FUTURE / OUT OF SCOPE**

### Phase 4 — Design

Produce the target technical design before implementation.

The design must cover:

- Organisation hierarchy
- Identity model
- Consultant model
- Client organisation model
- Framework model
- Consultant Genome
- Business Genome
- Kira–Consultant Operating Agreement
- Capability authorisation
- Talk/discovery architecture
- Structured extraction architecture
- Prompt versioning
- Data provenance
- Agreement versioning
- Permissions
- Auditability
- Existing Kira compatibility

### Phase 5 — Build

Only after the analysis, gap analysis, scope and design have been completed should implementation begin.

Build incrementally.

Do not perform an uncontrolled rewrite.

After each significant migration or architectural change, verify the actual result against the intended design.

---

# 3. Target Hierarchy

The target hierarchy is:

```text
CORPORATE AI SOLUTIONS
    │
    └── Portfolio Administration
            │
            └── KIRA PROJECT
                    │
                    ├── Project Administration
                    │
                    ├── Distributors
                    │      ├── Business Consultants
                    │      ├── Coaches
                    │      ├── Accountants
                    │      └── Other Partners
                    │
                    └── Consultant Portals
                            │
                            ├── Consultant A
                            │      │
                            │      ├── Consultant Genome
                            │      ├── Consultant Framework
                            │      ├── Kira Operating Agreement
                            │      │
                            │      └── Client Organisations
                            │              │
                            │              ├── Client A
                            │              │      ├── Business Genome
                            │              │      ├── Knowledge
                            │              │      ├── Requests
                            │              │      ├── Workflows
                            │              │      └── Measurement
                            │              │
                            │              └── Client B
                            │
                            └── Consultant B
```

The exact implementation may differ where the existing identity and tenancy architecture provides a better technical representation, but the logical hierarchy must remain intact.

---

# 4. Corporate AI Solutions Portfolio Administration

Corporate AI Solutions is the platform-level owner/admin environment.

It should provide the administrative control required to:

- Manage Kira Projects
- Manage project configuration
- Onboard distributors/consultants
- Manage commercial/platform relationships
- Control platform-level configuration
- Maintain appropriate administrative oversight

Do not introduce a redundant "owner" role if the existing canonical identity model already uses an `admin` platform role and `ceo` as a functional role.

The existing canonical identity architecture should be reviewed and reused where appropriate.

---

# 5. Kira Project Administration

Kira Project is a project within the Corporate AI Solutions portfolio.

The Kira Project Admin Portal is responsible for establishing and administering the distribution ecosystem.

This includes:

- Consultants
- Coaches
- Accountants
- TAB-type organisations
- Other distributors
- Partner relationships
- Access/configuration
- Project-level commercial or capability settings

The project administration layer must remain separate from the client organisation layer.

---

# 6. Consultant Portal

A consultant/distributor is an organisation-level participant in the Kira Project ecosystem.

When a consultant first enters their portal, the primary experience should be:

```text
/talk
```

rather than a complex administrative onboarding wizard.

The purpose of the first Talk session is **professional discovery**.

It is not merely account setup.

---

# 7. Consultant Discovery / Consultant Genome

The Consultant Talk session should conduct a professional discovery interview designed to understand:

- Consultant identity
- Consulting business
- Target client profile
- Industries served
- Services
- Engagement models
- Diagnostic process
- Delivery process
- Commercial model
- Existing methodologies
- Frameworks
- Measures and outputs
- Client journey
- Information required from clients
- Areas where Kira could assist
- Areas that must remain consultant-led
- Desired interaction between consultant and Kira
- Desired interaction between Kira and the consultant's clients

The result is a structured **Consultant Genome**.

The transcript is supporting evidence.

The structured extracted data is the operational representation.

---

# 8. Consultant Framework Capture

The consultant discovery must also identify and capture the consultant's framework or methodology.

Examples include:

- STAR
- HI-MAP
- TAB methodologies
- Value Builder
- Proprietary consultant frameworks
- Hybrid methodologies

The architecture MUST NOT hard-code each external methodology into Kira's core.

Instead, Kira should capture the framework as structured knowledge.

A framework may contain concepts such as:

```text
framework
├── name
├── owner
├── description
├── principles
├── stages
├── diagnostic_method
├── outputs
├── client_actions
├── measurements
├── terminology
├── constraints
└── Kira integration opportunities
```

The exact schema must be determined during the design phase after reviewing the existing database.

---

# 9. Kira–Consultant Operating Agreement

This is a core domain object.

After Kira has understood the consultant and their framework, Kira should produce a proposed operating model.

Conceptually:

```text
Consultant Genome
        +
Consultant Framework
        ↓
Kira Fit Analysis
        ↓
Proposed Kira Operating Model
        ↓
Consultant Review
        ↓
Agree / Amend
        ↓
Kira–Consultant Operating Agreement
```

The principle is:

> **Kira proposes. The consultant authorises.**

The agreement defines how Kira is permitted to operate within that consultant's methodology and client relationships.

It should identify, where applicable:

### Kira responsibilities

Examples:

- Business discovery
- Knowledge capture
- Business Genome maintenance
- Action reinforcement
- Information collection
- Progress monitoring
- Preparation of information for consultant sessions
- Identification of emerging gaps
- Agreed workflow execution

### Consultant responsibilities

Examples:

- Professional judgement
- Strategic advice
- Methodology ownership
- Client relationship
- Decisions reserved for the consultant
- Approval of changes to the operating model

### Restricted activities

Explicitly identify what Kira must not do.

The agreement should be machine-readable rather than existing only as a document.

Potential conceptual fields include:

```text
consultant_id
framework_id
version
status
effective_date
approved_by
approved_at

authorised_capabilities
restricted_capabilities

kira_responsibilities
consultant_responsibilities

client_interaction_rules
data_access_rules
escalation_rules

measurement_requirements
```

The actual schema must be designed against the existing database.

---

# 10. Agreement Versioning

The Kira–Consultant Operating Agreement must be versioned.

Example:

```text
Agreement v1
    ↓
Initial client deployment
    ↓
Consultant requests additional Kira capability
    ↓
Proposed amendment
    ↓
Consultant approval
    ↓
Agreement v2
```

Historical versions must remain auditable.

Kira should be able to establish:

```text
Why did Kira perform this action?
        ↓
Which capability permitted it?
        ↓
Which operating agreement authorised it?
        ↓
Which consultant approved that agreement?
        ↓
Which framework was being applied?
```

This is a key governance requirement.

---

# 11. Consultant Client Organisations

Once the consultant has established their own context, they can create client organisations.

The consultant provides an initial baseline.

This may include:

- Business name
- Industry
- Location
- Approximate size
- Current engagement
- Consultant's understanding of the business
- Known problems
- Current objectives
- Relevant methodology/framework
- Other known context

This information represents the **consultant's initial view of the client**.

It must not be treated as the client's authoritative Business Genome.

---

# 12. Client Portal

The client organisation should follow the same fundamental interaction pattern.

On first entry, the client goes directly to:

```text
/talk
```

The first Talk session is the **full Business Discovery Interview**.

It is not simply a technical agent setup process.

The client should be told that the first session requires approximately:

**60–90 minutes**

and is intended to understand the business comprehensively.

The experience should feel like a professional business interview conducted by Kira.

---

# 13. Client Discovery Interview

The interview should cover the existing 13 important questions already established in Kira.

However:

**Do not implement the 13 questions as a rigid 13-step UI workflow unless analysis proves that this is technically necessary.**

They are part of the discovery methodology.

Kira should be able to:

- Ask the important questions
- Follow answers
- Probe
- Clarify
- Identify dependencies
- Explore contradictions
- Ask contextual follow-up questions
- Capture relevant information
- Maintain conversational continuity

The goal is to understand how the business actually works.

The result is a **Business Genome**.

---

# 14. Prompt Flexibility / Stable Data Contract

This is one of the most important architectural requirements.

The prompts should be allowed to evolve.

For example, a question may change from:

> "How do you manage sales?"

to:

> "Walk me through what happens from the moment a prospect first contacts you until they become a customer."

The application must not require a database redesign merely because the conversational question changes.

Instead, important concepts should map to stable extraction targets.

Conceptually:

```text
Conversation
    ↓
LLM interpretation
    ↓
Structured extraction
    ↓
Canonical data fields
    ↓
Database records
```

Therefore:

> **The question is not the data field.**

A question is merely one conversational method of discovering the information required by the data model.

---

# 15. Important Responses Must Have Explicit Persistence Targets

For every important discovery item, the implementation should identify:

- What information is being extracted
- Why it matters
- Which canonical entity owns it
- Which table/record/field stores it
- Whether it is authoritative
- Provenance/source
- Confidence where appropriate
- Whether consultant or client supplied it
- Whether it has been confirmed

The exact table design must be determined during the gap analysis/design phase.

Do not blindly create one enormous "genome JSON" field if the existing architecture or future querying requirements justify normalised records.

Likewise, do not over-normalise simple contextual information merely for theoretical purity.

Use the smallest robust data model that supports the required behaviour.

---

# 16. Consultant Perspective vs Client Perspective

Kira must preserve the distinction between:

### Consultant perspective

"What the consultant understands about the client."

and:

### Client perspective

"What the client tells Kira about their own business."

These are not necessarily identical.

The system should preserve provenance.

Conceptually:

```text
Client Organisation
    │
    ├── Consultant-derived context
    │
    └── Client-derived context
```

The Business Genome should ultimately be capable of distinguishing:

- Known
- Reported
- Inferred
- Confirmed
- Disputed
- Unknown

where appropriate.

Do not silently overwrite one perspective with another.

---

# 17. Kira Fit Analysis

Once the following exist:

```text
Consultant Genome
+
Consultant Framework
+
Client Business Genome
+
Operating Agreement
```

Kira should be able to determine how it should operate for that specific client.

Conceptually:

```text
CONSULTANT
    ↓
FRAMEWORK
    ↓
OPERATING AGREEMENT
    ↓
CLIENT
    ↓
BUSINESS GENOME
    ↓
KIRA FIT
    ↓
AUTHORISED ACTIONS / WORKFLOWS
```

The Kira Fit layer should identify:

- Relevant Kira capabilities
- Relevant information
- Relevant workflows
- Required measurements
- Escalation points
- Consultant-only activities
- Client-facing activities
- Opportunities for automation
- Areas requiring consultant judgement

The implementation must preserve the distinction between:

**what Kira can technically do**

and

**what Kira is authorised to do in this relationship.**

---

# 18. Framework-Agnostic Core

Kira's core architecture should remain methodology-agnostic.

STAR should not become "the STAR version of Kira."

HI-MAP should not become "the HI-MAP version of Kira."

Instead:

```text
Kira Core
    +
Framework Definition
    +
Operating Agreement
    +
Client Business Genome
    =
Configured Kira Behaviour
```

This is essential to support multiple distribution partners without creating separate codebases or hard-coded methodology branches.

---

# 19. Talk as a Core Architectural Pattern

Talk should be treated as a reusable Kira capability, not merely a route.

At each organisational level it establishes the context required for Kira to operate at that level.

Conceptually:

```text
Portfolio / Project Talk
        ↓
Project Context

Consultant Talk
        ↓
Consultant Context

Client Talk
        ↓
Business Context
```

The exact routes may remain `/talk`, but the underlying context and extraction schema must be scoped to the active organisation and role.

---

# 20. Existing Architecture Must Be Reconciled, Not Discarded

The coding assistant MUST first inspect the existing architecture.

In particular, review and preserve compatible elements of the existing:

- Authentication
- `auth_credentials`
- `persons`
- `organisation_memberships`
- `organisations`
- `ownership_periods`
- Platform `admin` role
- Functional `ceo` role
- Selected organisation handling
- Existing Kira identity
- `/talk`
- `/dashboard`
- `/my-genome`
- `/knowledge`
- `/drafts`
- `/requests`
- Existing ElevenLabs/voice architecture
- Existing orchestrator architecture
- Existing data extraction
- Existing permission model
- Existing beta flow

The current canonical identity principle remains important:

> **There should not be a UI-level "owner" identity that replaces the canonical organisation/member model.**

The target architecture must be reconciled with what actually exists in code.

---

# 21. Agent Identity and Context

Kira should remain one coherent Kira identity across the user's authorised experience.

The context changes by:

- Organisation
- Role
- Project
- Consultant relationship
- Client relationship
- Framework
- Operating Agreement

The system should not create unnecessary separate Kira identities merely because the context changes.

The architecture should instead provide Kira with the correct contextual scope.

---

# 22. Permissions and Governance

The redesign must explicitly address:

- Who can create consultants
- Who can create client organisations
- Who can see consultant information
- Who can see client information
- What the consultant can see
- What the client can see
- What Corporate AI Solutions can administer
- What Kira can access
- What Kira can modify
- What requires consultant approval
- What requires client approval
- What requires platform administration

No service-role bypass should be introduced merely to simplify implementation.

Use the proper application identity, membership and permission model.

---

# 23. Data Provenance

Important extracted information should have a traceable origin.

Where practical, the architecture should allow Kira to identify:

- Source conversation/session
- Speaker/source
- Extraction time
- Schema/field
- Prompt or extraction version
- Confirmation status
- Last updated
- Who confirmed or amended the information

This becomes increasingly important as the Business Genome becomes operationally significant.

---

# 24. Prompt and Extraction Versioning

Prompts and extraction schemas should be independently versionable.

A change to conversational wording should not automatically constitute a change to the underlying data model.

Conversely, a change to the canonical extraction schema must be explicit and migration-aware.

The implementation should make it possible to determine:

> Which prompt/extraction version produced this piece of structured information?

---

# 25. Implementation Principles

The coding assistant must follow these principles:

### Do not rewrite working systems without evidence.

### Do not create speculative abstractions.

### Do not duplicate existing identity/organisation concepts.

### Do not hard-code individual consultant methodologies into Kira core.

### Do not make the 13 questions a rigid UI workflow unless required.

### Do not treat transcripts as the canonical business data model.

### Do not treat prompts as the canonical data model.

### Do not give Kira authority merely because Kira technically has a capability.

### Do not bypass existing security architecture for convenience.

### Prefer incremental, testable migrations.

### Preserve existing functionality unless deliberately replaced.

---

# 26. Required Gap Analysis Deliverable

Before coding, produce a document covering at least:

| Area | Current State | Target State | Gap | Recommended Change | Risk |
|---|---|---|---|---|---|
| Portfolio | | | | | |
| Kira Project | | | | | |
| Consultant | | | | | |
| Client Organisation | | | | | |
| Talk | | | | | |
| Consultant Genome | | | | | |
| Framework | | | | | |
| Operating Agreement | | | | | |
| Business Genome | | | | | |
| Extraction | | | | | |
| Permissions | | | | | |
| Identity | | | | | |
| Versioning | | | | | |
| Auditability | | | | | |
| Existing UI | | | | | |
| Existing agents | | | | | |
| Existing database | | | | | |

The assistant must cite actual files, routes, components, migrations and database objects where possible.

Do not describe assumed architecture as fact.

---

# 27. Required Design Deliverable

Before implementation, produce:

1. Target architecture diagram
2. Entity/data model
3. Organisation hierarchy
4. Identity/permission model
5. Consultant discovery flow
6. Client discovery flow
7. Framework model
8. Operating Agreement model
9. Kira Fit model
10. Prompt/extraction architecture
11. Provenance model
12. Versioning model
13. Migration plan
14. Testing strategy
15. Rollback strategy

---

# 28. Required Build Strategy

Implementation should proceed in controlled increments.

Suggested sequence:

### Stage A
Establish/reconcile organisation and consultant hierarchy.

### Stage B
Implement Consultant Talk and Consultant Genome extraction.

### Stage C
Implement Framework capture.

### Stage D
Implement Kira Fit proposal.

### Stage E
Implement Consultant Operating Agreement and approval/versioning.

### Stage F
Implement consultant client organisation creation.

### Stage G
Transform Client `/talk` into the full discovery interview.

### Stage H
Implement Business Genome structured extraction.

### Stage I
Connect Framework + Agreement + Business Genome into client-specific Kira behaviour.

### Stage J
Migrate existing Kira portal functions to the new context model.

### Stage K
Regression testing and production verification.

This sequence may be changed if the gap analysis demonstrates a better dependency order.

---

# 29. Acceptance Criteria

The redesign is successful when:

### Corporate AI Solutions

Can administer the Kira Project ecosystem.

### Kira Project

Can administer consultants/distributors.

### Consultant

Can enter their portal and conduct the initial `/talk` discovery.

### Consultant Genome

Is created from the conversation as structured data.

### Consultant Framework

Can be captured without hard-coding the framework into Kira core.

### Kira

Can analyse the consultant/framework combination and propose an operating model.

### Consultant

Can approve, reject or amend the proposed Kira operating model.

### Operating Agreement

Is stored as structured, versioned, auditable data.

### Consultant

Can create client organisations.

### Client

Can enter `/talk` and undertake the full initial business discovery.

### Business Genome

Is created from that discovery as structured data.

### Important questions

Can change in the prompt without requiring a rigid workflow rewrite.

### Important information

Is still mapped to stable canonical data targets.

### Kira

Can determine its authorised role for a client using:

**Consultant + Framework + Operating Agreement + Business Genome.**

### Existing Kira

Continues to operate correctly unless deliberately superseded.

---

# 30. Final Instruction to the Coding Assistant

Do not start by coding.

Start by **understanding what exists**.

Then:

```text
REVIEW
   ↓
CURRENT-STATE ARCHITECTURE
   ↓
GAP ANALYSIS
   ↓
SCOPE
   ↓
TARGET DESIGN
   ↓
MIGRATION PLAN
   ↓
IMPLEMENTATION
   ↓
TEST
   ↓
VERIFY
```

The objective is not to reproduce this document literally in code.

The objective is to translate the architectural principles into the **simplest robust implementation that fits the existing Kira codebase**.

Where the existing implementation already solves part of the problem, reuse it.

Where the target architecture conflicts with the existing implementation, document the conflict and make the smallest justified architectural change.

Where requirements are ambiguous, identify the ambiguity explicitly rather than inventing behaviour.

The end state should be a Kira platform in which:

> **Kira discovers the organisation, understands the methodology, agrees its role with the consultant, discovers the client's actual business, and then operates within an explicit, structured and auditable context.**

The conversational experience can evolve.

The underlying organisational and governance model remains stable.
