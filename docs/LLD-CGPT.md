# Kira — Low-Level Design (LLD)

**Status:** Working implementation-level baseline — 10 September 2026  
**Purpose:** Technical implementation reference  
**Rule:** Repository/database/deployment verification overrides this document.

## 1. Status convention

- **CURRENT** — verified implementation.
- **TARGET** — agreed implementation direction.
- **STRATEGIC** — product direction, not necessarily code.
- **VERIFY** — known/expected but not recently verified.

When uncertain, use VERIFY rather than inventing implementation.

## 2. Technology stack

Known stack:
- Next.js 16.x / TypeScript;
- Tailwind;
- Supabase;
- ElevenLabs;
- Stripe;
- Resend;
- Vercel;
- separate Orchestrator at `connect.kiraexec.com`.

Known development environment includes Windows/PowerShell, PyCharm and the Kira repository.

The exact dependency versions should be read from `package.json`, lockfiles and deployment configuration rather than maintained manually here.

## 3. Repository structure

The application has historically been organised around:
- App Router routes;
- public/authenticated surfaces;
- voice/chat surfaces;
- dashboard/user portal;
- knowledge/Genome surfaces;
- admin surfaces;
- API routes;
- `lib/` domain/service modules;
- migrations;
- shared packages.

The current directory tree must be verified before adding new architecture.

## 4. Canonical identity model

The domain relationship is:

`Supabase Auth`
→ `auth_credentials`
→ `persons`
→ `organisation_memberships`
→ `organisations`

Ownership is represented separately through ownership-period records.

Rules:
1. Supabase Auth user ID is authentication identity, not the Person domain object.
2. `persons.auth_user_id` is not the canonical relationship.
3. `auth_credentials.auth_user_id` is text and joins to the Supabase Auth UUID with the appropriate cast.
4. `organisations.legal_name` is the legal organisation name field.
5. Memberships are organisation/person relationships with role and access attributes.
6. Membership validity can include `valid_from`/`valid_to`.
7. Membership uniqueness includes organisation, person and role.
8. `portal_access` and `can_spend` are authorization attributes, not identity attributes.
9. `auth_credentials.selected_org_id` represents selected organisation context where valid.

## 5. Organisation-context resolution

`getCurrentOrganisationContext` is the conceptual resolver.

Resolution order:
1. authenticate the caller;
2. resolve the Person through the canonical credential bridge;
3. inspect selected organisation;
4. accept selected organisation only if the person has a valid permitted membership;
5. otherwise resolve a valid time-current membership;
6. return organisation, person, role/access context;
7. fail rather than invent context.

A stale/invalid selected organisation must never grant access.

## 6. Portal context

Portal context is separate from organisation selection.

Potential contexts include:
- user/CEO;
- organisation admin;
- CAIS corporate admin.

Routes:
- user: `/dashboard`, `/my-genome`, `/plan`;
- organisation admin: `/admin/*`;
- corporate admin: `/corporate-admin` — VERIFY until confirmed.

A future/current `PortalSelector` must select an authorised portal context, not merely change organisation.

Do not document a PortalSelector as CURRENT until it exists in the repository and is exercised.

## 7. Authentication and authorization

Authentication is handled through Supabase Auth.

The callback surface currently known is:

`/auth/callback/route.ts`

It handles the supported magic-link/token callback patterns and redirects into the application.

Authorization must be server enforced.

Do not use:
- email strings as a general authorization mechanism;
- client-only route protection;
- caller-supplied `user_id`;
- QA bypasses.

Historical `ADMIN_EMAILS` behaviour must not be treated as the canonical long-term organisation authorization model.

## 8. Beta access

Beta architecture:
- CAIS Beta is the beta organisation;
- beta testers are associated with that organisation;
- beta codes/onboarding can be mediated by the Orchestrator;
- beta access does not require a card;
- beta testers are not charged.

Seed/test data explicitly identified as intentional must not be “cleaned up” by automated migrations or tests.

Exact beta-code API and membership implementation: VERIFY.

## 9. Voice provisioning

Kira uses ElevenLabs for voice interaction.

The intended model is one persistent agent per owner/business relationship where appropriate.

Provisioning rules:
- agent is provisioned intentionally during onboarding/setup;
- agent record is persisted in Kira;
- page load must not implicitly provision an agent;
- voice UI presence must not implicitly open microphone access;
- user action initiates connection.

Agent identity must come from trusted provisioning/configuration.

A voice webhook must not accept caller-supplied identity as authoritative.

## 10. Voice UI

Known surfaces include:
- `components/KiraShape.tsx`;
- `components/KiraShapeSection.tsx`;
- `/talk`;
- `/chat/[agentId]`;
- embedded Kira voice surfaces on user pages.

Known behaviour:
- no autoConnect;
- visible Kira does not itself request microphone permission;
- setup pages can opt out;
- absent agent should lead to an explicit setup state.

`/talk` is a first-conversation surface where there is no prior relationship. Its page copy and agent opening must not imply “continuing where we left off”.

## 11. Voice connection telemetry

`voice_connect_events` provides telemetry around connection attempts/reachability where implemented.

Telemetry is domain/product instrumentation, not a substitute for general analytics.

PostHog may be considered for Kira V2 analytics, but it is not the replacement for domain telemetry, tester data or organisation data.

## 12. ElevenLabs webhook security

The canonical webhook secret is:

`x-convai-tool-secret`

The legacy `x-kira-tool-secret` must not be reintroduced.

`requireToolSecret()` is fail closed:
- missing configured secret → server error;
- incorrect secret → unauthorized;
- correct secret → continue.

During secret rotation, a previous secret may temporarily be accepted only through an explicitly controlled rotation mechanism. It must then be removed.

Post-call webhook requests require HMAC verification.

## 13. Tool/webhook responsibilities

Known webhook/tool families include:
- `start_conversation`;
- `recall_memory`;
- `save_memory`;
- `save_message`;
- `update_topic`;
- `search_knowledge`;
- `dispatch_task`;
- `approve_task`.

The exact active tool contract must be read from the current route/tool definitions before modifying it.

The key contract is:

> trusted webhook authentication establishes the request; application context establishes the authorised person and organisation.

## 14. Conversation lifecycle

A conversation produces several classes of data:

### Ephemeral
- current conversational context;
- transient prompts;
- connection state.

### Interaction evidence
- messages;
- decisions;
- statements;
- unresolved questions;
- events.

### Durable knowledge
- business facts;
- operating practices;
- relationships;
- preferences;
- supporting documents;
- governed memories.

### Actions
- tasks;
- follow-ups;
- approvals;
- pathway actions.

These classes should not be collapsed into a single “memory” table merely for convenience.

## 15. Memory governance

Supabase is authoritative for persisted business/application state.

Mnemo is retrieval/indexing infrastructure.

The strategic architecture is:

conversation
→ distillation
→ deduplication
→ governance
→ durable memory
→ indexing
→ retrieval.

A retrieval result must not be treated as authoritative merely because it came from the vector/index layer.

Identity and organisation scope must be frozen/validated during processing so a retrieval operation cannot cross business boundaries.

Exact current scope-prefix and table implementation: VERIFY because earlier user-scoped implementations have been superseded by organisation-aware architecture.

## 16. Knowledge

Knowledge should be:
- organisation scoped;
- attributable to appropriate evidence;
- categorised;
- searchable;
- auditable;
- exportable where permitted.

Knowledge categories should not be assumed to be the old fixed list without checking the current schema.

Historical implementations included `kira_knowledge` and `kira_knowledge_chunks`; confirm whether these remain canonical.

## 17. Genome data model

The Genome/Operating Manual is a structured view over accumulated evidence.

The implementation should support:
- business areas;
- checklist items;
- evidence;
- evidence strength;
- status;
- supporting documents where applicable;
- timestamps;
- assessment/version information;
- organisation scope.

The old user-only model must not be copied into new code where the organisation model is now authoritative.

## 18. Checklist and assessment

Historical/current design concepts include:
- 52 checklist items;
- nine business areas;
- required items;
- SubstanceTest;
- factor/null handling;
- area-level assessment;
- bands such as empty/thin/building/covered.

An assessment model may evaluate an area in one LLM call rather than one call per item.

Failure behaviour:
- assessment failure → unassessed/all-open treatment;
- never infer that failure means the business lacks the knowledge;
- weak evidence must not automatically become answered.

The exact checklist remains VERIFY until reconciled with the current repository.

## 19. Readiness

Readiness calculations must be deterministic from stored evidence/input data.

Rules:
- baseline is preserved;
- recomputation does not silently mutate historical baseline;
- model drift is guarded;
- numeric finiteness is checked;
- evidence dates matter;
- plans/intention do not count as evidence.

Where a valuation/readiness snapshot records a model version, that version must remain attached to the snapshot.

## 20. Pathways and milestones

Pathways turn evidence gaps into practical actions.

A pathway gate should rely on:
- evidenced item keys;
- evidence timestamps;
- explicit maturity criteria.

Creating a plan does not itself increase maturity/readiness.

Tasks are execution mechanisms, not evidence by themselves.

## 21. Valuation implementation

The valuation layer should separate:
- reported profit;
- applicable sector multiple;
- baseline valuation;
- owner-dependency discount/risk;
- bounded uplift;
- resulting current/evidenced valuation.

The bounded uplift must not be allowed to create mathematically impossible or misleading outputs.

Historical invariant:
- finiteness must be checked before drift comparison.

Pricing, where commercial pricing is implemented, should be based on business economics such as reported profit rather than the size of a claimed valuation gap.

The sector multiple is a centre/band input, not a guaranteed floor.

## 22. Write-back

Rendering should remain deterministic/pure where possible.

Historical implementation concepts include:
- `lib/genome/render.ts`;
- owner/buyer audience;
- approved audience-specific output;
- Markdown/JSON;
- external storage through the Orchestrator;
- idempotent write-back keys.

Security requirements:
- audience must be explicit;
- approval must be server enforced;
- no default audience that can accidentally expose buyer-facing output.

Exact current endpoint/table names: VERIFY.

## 23. Orchestrator

Host:

`connect.kiraexec.com`

Purpose:
- privileged/stateful operations;
- capabilities deliberately separated from the main Kira application;
- centralised operations requiring elevated credentials.

Known credential scopes:
- `kira-webhook`;
- `kira-public`.

Historical endpoint families include:
- email suppressions;
- email alert throttling;
- owner alert/enrichment;
- beta codes.

The endpoint inventory must be regenerated from the current Orchestrator repository before adding new consumers.

## 24. Supabase API key model

Target model uses:
- `SUPABASE_SECRET_KEY`;
- `SUPABASE_PUBLISHABLE_KEY`.

Legacy JWT-style keys may remain only for components that have not yet migrated.

Do not claim the production migration is complete without deployment verification.

Server-only secret keys must never be exposed through client bundles.

## 25. Email

Resend is the known delivery provider.

Email types include:
- transactional/system messages;
- beta onboarding/outreach;
- partner communications.

Compliance requirements:
- explicit contact/consent data where required;
- suppression enforcement;
- server-side sending;
- no client-side secret exposure.

Suppression state is intended to be authoritative behind the Orchestrator for migrated capabilities.

## 26. Billing

Commercial billing and beta access are separate concerns.

Beta:
- no card;
- no charge.

Commercial:
- Stripe remains the known billing provider where the commercial path is active.

Historical trial/cost-cap behaviour must not be documented as a beta requirement unless it is actually present in current code.

## 27. Admin

Organisation administration is distinct from corporate Kira administration.

Organisation admin should be controlled by:
- authenticated Person;
- valid organisation membership;
- admin role/access;
- server-side authorization.

Corporate administration is a separate privileged context and should not be granted merely because a person is an organisation admin.

Current `/manage/invitations` behaviour and `getSuperadminContext` should be treated as implementation-specific and reconciled with the intended portal-context architecture.

## 28. Database and RLS

All organisation-scoped business data should have a clear organisation ownership boundary.

RLS policies must align with the canonical Person → membership → organisation model.

Do not write policies based on assumptions that `auth.uid()` directly equals a business Person ID.

Where `auth.uid()` is used, the credential bridge must be respected.

Cross-organisation reads/writes must fail.

## 29. Environment variables

Known environment classes include:

### Supabase
- publishable/client key;
- server secret key;
- legacy values only where still required.

### ElevenLabs
- server-side API key;
- webhook/tool secret.

### Orchestrator
- webhook credential;
- public/beta credential.

### Stripe
- server secret;
- publishable key;
- webhook secret where applicable.

### Resend
- API key;
- sender configuration.

Exact variable names should be reconciled against `.env.example`, deployment configuration and code.

Never document secret values.

## 30. Deployment

Known deployment surfaces:
- Vercel production: `kiraexec.com`;
- production subdomain: `globalbuildtech.kiraexec.com`;
- preview: `kira-rho.vercel.app`;
- Orchestrator: `connect.kiraexec.com`.

Current known Vercel constraint:
the Hobby plan permits only daily cron scheduling, while the repository has multiple more frequent schedules. This is a deployment blocker until resolved.

Cron jobs should therefore be:
- consolidated;
- moved to a compatible execution service;
- changed to daily where functionally acceptable;
- or deliberately deferred.

Do not silently remove business-critical scheduled processing merely to make a deployment pass.

## 31. CI and testing

Required checks should include:
- TypeScript/build;
- lint;
- migration validity;
- route/API tests;
- auth boundary tests;
- organisation isolation tests;
- voice webhook authentication tests;
- numerical finiteness tests;
- UI journey tests for critical surfaces;
- production/preview smoke tests where appropriate.

The testing strategy should include seeded Beta data where that data is intentionally part of the test scenario.

## 32. Safe-change protocol

Before changing a shared or security-sensitive component:

1. inspect current implementation;
2. identify all importers/callers;
3. identify schema and migration dependencies;
4. identify environment dependencies;
5. update the owning contract;
6. update tests;
7. run build/type/lint checks;
8. run targeted functional tests;
9. verify the deployed route/endpoint;
10. update HLD/LLD only after verification.

For voice changes:
- inspect agent provisioning;
- inspect tool definitions;
- inspect webhook routes;
- confirm webhook secret contract;
- consider whether existing ElevenLabs agents require reprovisioning.

For identity/org changes:
- test single-org;
- multi-org;
- selected-org invalidation;
- role changes;
- cross-org denial;
- corporate-admin separation.

For valuation changes:
- test NaN/Infinity;
- test baseline immutability;
- test model-version handling;
- test rerun behaviour.

## 33. Current technical debt / migration watchlist

The following must remain visible until verified complete:

1. User-scoped legacy Genome assumptions versus organisation-scoped architecture.
2. PortalSelector/portal-context implementation versus the intended design.
3. Exact Memory Governance implementation.
4. Exact Mnemo scope and persistence model.
5. Supabase API Key Model production migration.
6. Orchestrator endpoint inventory.
7. Corporate-admin implementation.
8. Commercial billing versus Beta separation.
9. Vercel cron incompatibility.
10. Legacy shared packages and importer cleanup.
11. Historical documentation that still refers to the old identity/billing/Genome architecture.

## 34. Non-negotiable invariants

- Auth user ≠ Person.
- Organisation scope must be explicit.
- Selected organisation must be membership-valid.
- Caller-supplied identity is never authoritative.
- Webhook secrets fail closed.
- Mnemo is not the source of truth.
- Weak evidence is not equivalent to answered evidence.
- Assessment failure is not evidence of absence.
- Plans do not create readiness.
- Historical baselines are not silently overwritten.
- Numeric calculations must reject non-finite values.
- Beta is no-card/no-charge.
- Voice presence does not equal microphone connection.
- First-time `/talk` must not imply conversation history.
- Privileged Orchestrator operations remain behind their intended boundary.
