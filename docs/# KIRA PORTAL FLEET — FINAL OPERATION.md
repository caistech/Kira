# KIRA PORTAL FLEET — FINAL OPERATIONALISATION DIRECTIVE

**Status:** Authoritative build directive
**Objective:** Close all remaining gaps between the designed portal-lane architecture and a genuinely operative, tested, deployed Kira fleet.

---

# 1. PURPOSE

The objective of this directive is to take the Kira portal architecture from its current partially implemented state to a **fully operative, internally consistent, production-ready system**.

The coding assistant must:

1. audit what actually exists;
2. identify what is missing, contradictory, incomplete, or falsely assumed to be complete;
3. implement the missing pieces;
4. apply and verify all required Supabase migrations;
5. enforce the canonical portal UI architecture;
6. implement the correct `/talk` journey behaviour;
7. implement distributor/consultant/client recursion;
8. ensure onboarding and provisioning workflows are differentiated correctly;
9. run real tests;
10. perform a genuine end-to-end acceptance test;
11. deploy;
12. verify the deployed system;
13. report only evidence-backed completion.

**No completion claim may be made merely because code exists on disk or a Vitest test is green.**

---

# 2. NON-NEGOTIABLE ARCHITECTURAL TRUTH

There is:

* **ONE authentication seam**
* **ONE `/talk` seam**
* **ONE Kira identity/context model**
* **ONE canonical portal shell**
* **ONE organisation hierarchy**
* **multiple journey contexts**
* **multiple lane-specific capabilities**

A lane is **not a separate login system**.

A person authenticates through the canonical auth seam and enters `/talk`.

The system determines:

```text
WHO IS THIS PERSON?
+
WHICH ORGANISATION ARE THEY OPERATING IN?
+
WHAT IS THEIR ROLE?
+
WHAT TYPE OF LANE IS THIS?
+
WHAT ACTION ARE THEY PERFORMING?
+
WHAT OUTPUT SHOULD THIS interaction PRODUCE?
```

The system then configures the conversation and resulting workflow accordingly.

---

# 3. IMPORTANT CORRECTION — DO NOT USE journey_type AS THE ENTIRE CONTROL SYSTEM

`journey_type` is an important lane discriminator, but it must **not** be overloaded to represent every possible workflow.

The architecture must distinguish at least:

```text
identity
organisation
membership
org_type
journey_type
current workflow/action
expected output
permissions/capabilities
```

Conceptually:

```text
WHO AM I?
    ↓
identity + membership
    ↓
WHERE AM I?
    ↓
organisation / hierarchy
    ↓
WHAT LANE?
    ↓
journey_type + org_type
    ↓
WHAT AM I DOING?
    ↓
workflow/action
    ↓
WHAT MUST RESULT?
    ↓
output contract
```

Do not create multiple independent voice-agent infrastructure stacks merely because these contexts differ.

The preferred architecture remains:

```text
ONE /talk
     ↓
context resolution
     ↓
appropriate Kira configuration
     ↓
appropriate workflow
     ↓
appropriate output
```

---

# 4. CANONICAL LANE MODEL

The fleet must support the following conceptual hierarchy.

## Lane A — Corporate AI Solutions / Portfolio Owner

Example:

```text
corporateaisolutions.com
    ↓
sign in
    ↓
/talk
```

Context:

```text
owner / CEO
org_type = owner/business portfolio context
journey_type = business
```

Purpose:

* capture the owner's own business/portfolio genome;
* expose the organisations they own/control;
* provision downstream organisations.

Primary recursion action:

```text
Add New Org
```

---

# 5. LANE B — DISTRIBUTOR

Example:

```text
kiraexec.com
    ↓
sign in
    ↓
/talk
```

The distributor is the fleet/distribution layer.

The distributor may:

* complete its own onboarding;
* establish its distributor identity and operating model;
* configure downstream provision;
* add consultants;
* manage downstream organisations;
* maintain distributor-level knowledge/configuration.

The distributor's own onboarding is **not the same workflow** as adding a downstream organisation.

---

# 6. LANE C — CONSULTANT

Example:

```text
distributor-minted URL
    ↓
sign in
    ↓
/talk
```

Context:

```text
journey_type = consultant
```

The consultant onboarding must capture:

* consultant identity/context;
* methodology;
* frameworks;
* services;
* target clients;
* consulting model;
* relevant operating practices;
* how Kira is intended to operate within the consultant's methodology.

Expected persistence includes the existing consultant structures, including:

```text
consultant_frameworks
consultant_genomes
```

subject to the actual schema audit.

The consultant must then be able to:

```text
Add Client
```

---

# 7. LANE D — CLIENT BUSINESS

Example:

```text
consultant-minted client URL
    ↓
sign in
    ↓
/talk
```

Context:

```text
journey_type = business
```

The client's `/talk` must capture the client's own business context/genome.

The resulting data belongs to the client's organisation and must never accidentally land in:

* the consultant's genome;
* the distributor's genome;
* another client's organisation;
* another user's memory.

The client's organisation may subsequently participate in another downstream recursion where authorised.

---

# 8. CRITICAL DISTINCTION: ONBOARDING VS PROVISIONING

The system must explicitly distinguish these two classes of interaction.

## A. SELF-ONBOARDING

A person enters `/talk` to tell Kira about:

* themselves;
* their organisation;
* their methodology;
* their business;
* their operating environment.

This produces a **genome/configuration/profile**.

Examples:

```text
Distributor onboarding
Consultant onboarding
Client business onboarding
Owner onboarding
```

## B. PROVISIONING

A person enters the portal or invokes an appropriate action to create/provision another organisation/person.

Examples:

```text
Owner → Add New Org
Distributor → Add Consultant
Consultant → Add Client
```

Provisioning must:

1. validate authority;
2. create the correct organisation/hierarchy relationship;
3. create the appropriate downstream record;
4. establish the correct lane;
5. generate the invitation;
6. generate the canonical destination;
7. ensure the recipient enters the correct `/talk` context;
8. prevent cross-organisation leakage;
9. record the relationship.

Do **not** confuse “create the next organisation” with “perform that organisation's onboarding.”

---

# 9. CANONICAL RECURSION

The operative chain must be:

```text
CAIS OWNER
   │
   │ Add New Org
   ▼
DISTRIBUTOR
   │
   │ Add Consultant
   ▼
CONSULTANT
   │
   │ Add Client
   ▼
CLIENT BUSINESS
```

The recursion may continue where authorised.

There must never be a manually invented portal URL.

The canonical destination must be generated by the system.

---

# 10. URL RULE

The canonical architecture is:

```text
AUTH
  ↓
/talk
  ↓
resolved journey/context
```

A custom organisation path may be used where already established by the product architecture, but it must resolve into the same canonical authentication and `/talk` system.

Do not create independent login pages for:

* distributors;
* consultants;
* clients;
* project portals.

If a URL is minted for an organisation, it must ultimately resolve to the organisation's authenticated Kira context.

---

# 11. ONE KIRA IDENTITY

The same Kira identity/context must remain coherent across:

```text
/talk
/dashboard
/my-genome
/knowledge
/drafts
/requests
/settings
```

The page changes.

The Kira identity does not.

The organisation/user context does not silently change because the user navigated between pages.

---

# 12. PERMISSION MODEL

Audit and enforce permissions for:

```text
platform owner/admin
distributor
consultant
client organisation owner/admin
client team member
```

At minimum establish clearly:

### Platform owner

Can:

* create/manage distributor relationships;
* view appropriate portfolio hierarchy;
* administer platform-level configuration.

### Distributor

Can:

* manage its own distributor context;
* add authorised consultants;
* manage organisations within its permitted tree.

### Consultant

Can:

* manage own consultant genome;
* manage own methodology/framework;
* add/manage authorised client organisations.

### Client owner/admin

Can:

* manage own business;
* manage own team;
* manage own knowledge;
* manage authorised business configuration.

### Ordinary team member

Must not automatically receive:

* organisation provisioning authority;
* knowledge-base administration;
* consultant configuration;
* platform administration.

Do not assume role permissions from the UI alone. Enforce them server-side/database-side.

---

# 13. KNOWLEDGE BASE GOVERNANCE

The knowledge base must support easy addition of:

* uploaded files;
* documents;
* URLs;
* other approved information sources.

This capability must be available through the canonical portal UI.

However, knowledge governance must distinguish:

```text
authoritative organisational knowledge
+
user/team contributions
```

The CEO/owner or explicitly authorised administrator must control authoritative organisational knowledge.

If subordinate/team agents/users are allowed to contribute knowledge, those contributions must:

1. be attributed;
2. be versioned;
3. not silently overwrite authoritative material;
4. be distinguishable from primary documentation;
5. be subject to approval/review where required;
6. preserve source/provenance.

No subordinate agent should be able to silently change canonical business truth.

---

# 14. VOICE-AGENT ARCHITECTURE

Do not multiply voice agents unnecessarily.

The system should prefer:

```text
shared voice infrastructure
        +
context-specific system instructions
        +
organisation context
        +
journey context
        +
workflow
        +
output contract
```

The voice layer should therefore be modular.

For example:

```text
Voice Layer
     ↓
Kira Context Resolver
     ↓
Journey
     ↓
Workflow
     ↓
Orchestrator
     ↓
Memory / Genome / Knowledge
     ↓
Database
```

The voice vendor must remain replaceable.

Do not hard-code business logic into ElevenLabs-specific implementation.

---

# 15. OUTPUT CONTRACTS

Each journey must have an explicit expected output.

At minimum define and test:

### Business onboarding

Output:

```text
business genome
organisation context
owner dependence information
business knowledge/memory
```

### Consultant onboarding

Output:

```text
consultant genome
consultant framework information
consultant methodology
consultant configuration
```

### Distributor onboarding

Output:

```text
distributor profile/genome
distribution configuration
downstream provisioning authority/configuration
```

### Provisioning action

Output:

```text
new organisation
relationship
membership/invitation
lane
destination
audit record
```

The conversation must not simply “talk successfully.”

It must produce the correct structured outcome.

---

# 16. CANONICAL PORTAL UI

All admin and portal pages must follow the canonical UI structure already established by:

```text
cais-shared-services
```

Do not create bespoke portal shells.

The canonical structure must include:

* left-hand navigation;
* consistent branding;
* consistent page shell;
* consistent content area;
* account/user controls;
* logout positioned at the bottom of the left navigation;
* responsive behaviour;
* consistent active-page indication.

Lane-specific differences should primarily be:

```text
navigation items
permissions
data
actions
configuration
```

not completely different page structures.

---

# 17. SHARED SHELL IMPLEMENTATION

Identify the canonical shell in `cais-shared-services`.

Then establish a single reusable implementation.

For example, conceptually:

```text
<PortalShell
    lane={lane}
    organisation={organisation}
    capabilities={capabilities}
>
    {children}
</PortalShell>
```

Do not duplicate sidebar code across individual pages.

If multiple competing sidebar implementations currently exist:

1. identify them;
2. determine the canonical implementation;
3. consolidate;
4. migrate pages;
5. remove obsolete variants;
6. test all affected routes.

---

# 18. SUPABASE DATABASE AUDIT

Perform an actual schema audit.

Do not infer the schema from TypeScript.

Verify the live database for:

```text
organisations
organisation_memberships
persons
auth_credentials
ownership_periods
portals
portal_configs
consultant_frameworks
consultant_genomes
distributor-related structures
knowledge structures
invitation structures
role structures
```

Use the actual schema currently deployed.

For every required table/column:

```text
LOCAL MIGRATION EXISTS?
REMOTE MIGRATION APPLIED?
COLUMN EXISTS?
TYPE CORRECT?
NULLABILITY CORRECT?
FOREIGN KEY CORRECT?
UNIQUE CONSTRAINT CORRECT?
RLS CORRECT?
INDEX REQUIRED?
```

Produce an audit report.

---

# 19. MIGRATIONS

If a required schema change is missing:

1. create a proper migration;
2. apply it to the intended Supabase environment;
3. verify it remotely;
4. verify application code against it;
5. run relevant tests;
6. record the migration.

Do not merely edit an existing migration that may already have been applied.

Do not claim migration completion until the remote schema confirms it.

---

# 20. IMPORTANT CURRENT INCONSISTENCY TO RESOLVE

Audit:

```text
scripts/autobootstrap-portals.mjs
scripts/autobootstrap-portals.test.ts
```

The previously observed implementation appears to write to:

```text
portals
```

while the test was described as checking for:

```text
portal_configs
```

This must be resolved based on the actual intended schema.

Do not make the test green merely by matching strings.

The test must verify the actual intended behaviour.

---

# 21. AUTObOOTSTRAP / PORTAL URL LOGIC

Review `autobootstrap-portals.mjs`.

Determine whether it is actually required in production.

If retained:

* make it deterministic;
* make it idempotent;
* ensure it does not overwrite valid custom URLs;
* ensure it cannot create an invalid lane;
* ensure it respects organisation ownership;
* ensure it cannot cross organisation boundaries;
* ensure it does not require service-role access from an end-user request;
* ensure errors are visible and actionable.

If it is merely a development/test artefact, clearly separate it from production behaviour.

Do not leave ambiguous infrastructure in the production path.

---

# 22. `/talk` CONTEXT RESOLUTION

Audit the actual `/talk` implementation.

It must determine the authenticated context from trusted server-side information.

Do not trust arbitrary client-supplied query parameters for security-sensitive organisation selection.

A query such as:

```text
?journey=consultant
```

may provide a requested entry context, but the server must verify that the authenticated user is authorised for that journey and organisation.

The effective context should be derived from:

```text
authenticated user
+
membership
+
organisation
+
organisation type
+
relationship
+
authorised journey
```

---

# 23. SECURITY REQUIREMENT

A user must never be able to change:

```text
?journey=business
```

to:

```text
?journey=consultant
```

or change an organisation identifier and gain access to another lane.

Every request must resolve against server-side authority.

Test:

* URL tampering;
* organisation ID tampering;
* journey tampering;
* invitation reuse;
* expired invitations;
* unauthorised Add Client;
* unauthorised Add Consultant;
* cross-tenant data access.

---

# 24. INVITATION FLOW

The invitation system must be fully operative.

Test:

```text
provision
 ↓
invite created
 ↓
recipient receives/gets invitation
 ↓
recipient authenticates
 ↓
recipient lands in correct organisation
 ↓
correct journey selected
 ↓
/talk starts with correct context
 ↓
genome/output goes to correct organisation
```

No manual database intervention should be required.

---

# 25. ORGANISATION HIERARCHY

Verify that hierarchy relationships are explicit and queryable.

The system must be able to answer:

```text
Who owns this organisation?
Who provisioned it?
Which distributor is above it?
Which consultant is responsible for it?
Which clients belong to this consultant?
Which users belong to this organisation?
What can this user see?
What can this user create?
```

Do not infer hierarchy from URLs.

URLs are navigation.

Database relationships are authority.

---

# 26. TEST STRATEGY

Use several layers of testing.

## Unit tests

Test:

* context resolution;
* journey selection;
* permissions;
* output mapping;
* URL generation;
* recursion rules.

## Integration tests

Test:

* database writes;
* organisation creation;
* membership creation;
* invitation creation;
* genome persistence;
* knowledge persistence.

## UI tests

Test:

* sidebar;
* navigation;
* logout;
* lane-specific actions;
* Add Distributor;
* Add Consultant;
* Add Client;
* Add New Org.

## End-to-end acceptance

Prove the complete chain.

---

# 27. REQUIRED END-TO-END ACCEPTANCE TEST

The following must be executable and repeatable.

```text
TEST START
    ↓
CAIS owner authenticates
    ↓
CAIS /talk
    ↓
owner genome/context created
    ↓
Add Distributor
    ↓
distributor organisation created
    ↓
invitation generated
    ↓
distributor authenticates
    ↓
distributor /talk
    ↓
distributor onboarding output created
    ↓
Add Consultant
    ↓
consultant organisation created
    ↓
consultant invitation generated
    ↓
consultant authenticates
    ↓
consultant /talk
    ↓
consultant genome created
    ↓
consultant framework data created
    ↓
Add Client
    ↓
client organisation created
    ↓
client invitation generated
    ↓
client authenticates
    ↓
client /talk
    ↓
client business genome created
    ↓
verify all records belong to correct organisations
    ↓
TEST END
```

This is the acceptance gate.

---

# 28. DATA ISOLATION ACCEPTANCE

At the end of the test, prove:

```text
CAIS owner
    cannot see unrelated private client data

Distributor
    cannot see unrelated distributor data

Consultant
    can see only authorised clients

Client A
    cannot see Client B

Client user
    cannot modify distributor/consultant configuration
```

This must be tested through actual requests/data access, not merely visually through the UI.

---

# 29. KNOWLEDGE BASE ACCEPTANCE

Test:

```text
CEO/admin uploads document
        ↓
document enters knowledge base
        ↓
source recorded
        ↓
correct organisation attached
        ↓
Kira can retrieve/analyse it
```

Then test subordinate contribution:

```text
team member contribution
        ↓
attributed
        ↓
does not overwrite authoritative source
        ↓
review/approval mechanism works if required
```

---

# 30. CANONICAL URL ACCEPTANCE

For every lane:

```text
owner
distributor
consultant
client
```

verify:

* URL resolves;
* authentication works;
* invitation works;
* correct organisation selected;
* correct journey loaded;
* correct Kira context loaded;
* correct navigation loaded;
* `/talk` works;
* logout works.

Do not claim a URL is operative merely because it exists in documentation.

---

# 31. DO NOT CREATE MULTIPLE PORTALS UNNECESSARILY

The system is not:

```text
Owner Portal
Distributor Portal
Consultant Portal
Client Portal
```

as four separate applications.

It is:

```text
Kira Platform
     ↓
Canonical authentication
     ↓
Canonical portal shell
     ↓
organisation + role + lane + capability
     ↓
appropriate experience
```

The user experiences a different lane.

The platform remains one coherent system.

---

# 32. TEST THE SHARED NAVIGATION

Every page in every lane must be checked.

At minimum:

```text
Dashboard
My Genome
Knowledge
Requests
Settings
Talk
Organisation-specific pages
Provisioning pages
```

Verify:

* sidebar present;
* correct active item;
* correct lane-specific items;
* logout bottom-left;
* no duplicate navigation;
* no broken routes;
* no inconsistent shell.

---

# 33. CLEAN UP THE REPOSITORY

Audit all recent additions including:

```text
docs/
scripts/
tests/
temporary files
```

Remove:

* accidental `%TEMP%/`;
* malformed documentation files;
* duplicate training documents;
* obsolete experimental scripts;
* dead tests;
* contradictory directives;
* generated artefacts not intended for source control.

Do not delete useful work without understanding its purpose.

---

# 34. GIT TRUTH

Before declaring completion:

```text
git status
git diff
git log
```

must be inspected.

There must be no unexplained:

```text
modified files
deleted files
untracked files
```

unless intentionally part of the final change.

Commit all intended work.

Push the final commit.

Record the commit SHA.

---

# 35. DEPLOYMENT TRUTH

After the final commit:

1. deploy the actual production application;
2. wait for deployment completion;
3. verify deployment status;
4. verify production routes;
5. verify production environment variables;
6. verify production database connection;
7. verify authentication;
8. verify `/talk`;
9. verify lane resolution;
10. verify critical provisioning flows.

Do not say “deployed” because a Git push succeeded.

---

# 36. LIVE ACCEPTANCE

The final acceptance must exercise the actual deployed environment.

At minimum:

```text
production auth
production /talk
production organisation resolution
production database writes
production invitation
production lane resolution
production genome persistence
production navigation
production logout
```

Where external voice-provider behaviour cannot safely be automated, document exactly what was tested and what remains provider-dependent.

---

# 37. TEST REPORT FORMAT

At completion produce a concise evidence table:

| Area                  | Result    | Evidence                  |
| --------------------- | --------- | ------------------------- |
| Auth seam             | PASS/FAIL | route/test                |
| `/talk`               | PASS/FAIL | test                      |
| Owner lane            | PASS/FAIL | evidence                  |
| Distributor lane      | PASS/FAIL | evidence                  |
| Consultant lane       | PASS/FAIL | evidence                  |
| Client lane           | PASS/FAIL | evidence                  |
| Provisioning          | PASS/FAIL | evidence                  |
| Genome capture        | PASS/FAIL | database evidence         |
| Knowledge             | PASS/FAIL | database/e2e evidence     |
| Permissions           | PASS/FAIL | test                      |
| RLS                   | PASS/FAIL | database evidence         |
| Shared sidebar        | PASS/FAIL | route/UI evidence         |
| Logout                | PASS/FAIL | route/UI evidence         |
| Supabase migrations   | PASS/FAIL | migration/schema evidence |
| Production deployment | PASS/FAIL | deployment evidence       |
| Full recursion        | PASS/FAIL | E2E evidence              |

---

# 38. NO FALSE GREEN

The following are explicitly prohibited:

* claiming Vitest green without the actual Vitest output;
* claiming a migration is applied without checking the remote schema;
* claiming deployment without checking deployment status;
* claiming a live URL works because the URL is documented;
* claiming an invitation works because code exists;
* claiming `/talk` recursion works because a test file exists;
* claiming a genome was created without verifying the database record;
* claiming a UI is canonical without checking the actual rendered implementation;
* hiding failed tests;
* replacing a failed integration test with a source-string test simply to obtain green;
* treating a training document as proof of implementation.

**Tests must test behaviour, not merely the presence of code words.**

---

# 39. MINIMUM ACCEPTANCE CRITERION

This project is not operational until the following statement is demonstrably true:

> A user can authenticate through the canonical Kira authentication seam, enter `/talk`, be placed into the correct organisation/lane context, complete the appropriate onboarding conversation, have the correct structured output persisted to the correct organisation, use the canonical portal shell, exercise only authorised capabilities, provision the next organisation where permitted, invite that organisation's user, and have the next user repeat the same process in their own correct lane — without manual database intervention.

---

# 40. IMPLEMENTATION ORDER

Follow this order.

### PHASE 1 — AUDIT

Do not build.

Audit:

```text
repository
routes
auth
/talk
organisation schema
migrations
RLS
portal tables
consultant tables
voice configuration
shared services
sidebar
invitations
provisioning
tests
deployment
```

Produce the gap list.

### PHASE 2 — DATABASE

Fix migrations/schema/RLS/relationships.

Verify remotely.

### PHASE 3 — CONTEXT ENGINE

Implement/verify:

```text
identity
organisation
role
org_type
journey_type
workflow/action
capabilities
output contract
```

### PHASE 4 — `/talk`

Make `/talk` correctly resolve context.

### PHASE 5 — ONBOARDING

Implement:

```text
owner onboarding
distributor onboarding
consultant onboarding
client onboarding
```

with differentiated output contracts.

### PHASE 6 — PROVISIONING

Implement:

```text
Add New Org
Add Distributor
Add Consultant
Add Client
```

according to the actual permitted hierarchy.

### PHASE 7 — INVITATIONS

Complete the full recipient journey.

### PHASE 8 — PORTAL SHELL

Consolidate all pages onto the canonical `cais-shared-services` shell.

### PHASE 9 — KNOWLEDGE

Implement governed knowledge ingestion and attribution.

### PHASE 10 — TESTING

Unit → integration → UI → E2E.

### PHASE 11 — DEPLOYMENT

Deploy the final code.

### PHASE 12 — LIVE ACCEPTANCE

Run the full recursion in the deployed environment.

### PHASE 13 — CLEANUP

Remove obsolete experiments/docs/scripts.

### PHASE 14 — FINAL REPORT

Report only evidence-backed results.

---

# 41. FINAL DELIVERABLE

The coding assistant must finish with:

```text
1. Final architecture state
2. Database migration list
3. Database verification result
4. Files changed
5. Tests executed
6. Actual test results
7. End-to-end result
8. Production deployment result
9. Production URL verification
10. Remaining known limitations, if any
11. Final git commit SHA
```

If something is not proven, state:

```text
NOT PROVEN
```

rather than:

```text
GREEN
```

---

# 42. FINAL OPERATING PRINCIPLE

The objective is not to produce more documentation.

The objective is not to produce more test files.

The objective is not to produce more “seams.”

The objective is:

```text
DESIGNED
   ↓
IMPLEMENTED
   ↓
DATABASE APPLIED
   ↓
TESTED
   ↓
INTEGRATED
   ↓
DEPLOYED
   ↓
LIVE VERIFIED
   ↓
OPERATIVE
```

The Kira fleet is complete only when it reaches the final state.

**Build from the existing architecture. Reuse the existing auth, identity, `/talk`, organisation hierarchy, shared services and voice abstraction wherever they are sound. Do not introduce parallel architectures merely to make a lane work.**

**Most importantly: inspect first, then fix. Do not assume anything from previous agent reports.**
