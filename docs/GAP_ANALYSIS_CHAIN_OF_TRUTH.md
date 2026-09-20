# Gap Analysis — Recursive "Chain of Truth" Architecture

**Document type:** Phase 2 Gap Analysis Deliverable
**Date:** 2026-09-20
**Status:** For review before Phase 3 (Scope) and Phase 4 (Design)
**Authority:** Kira_Architecture_Redesign_Design_Directive.md

---

## Overview

This maps the current Kira codebase against the target recursive "Chain of Truth" architecture. At every hierarchy level (Portfolio > Project > Distributor > Client Org), the pattern is:

1. Admin at Level N creates the entity -> auto-provisions portal + generates invitation
2. Owner at Level N+1 enters portal -> first /talk interviews the OWNER
3. System compares admin's belief vs owner's truth
4. Discrepancies flagged upward -> owner's truth wins
5. Owner lands on /dashboard for subsequent logins

---

## 1. Organisation Hierarchy

| Dimension | Current State | Target State | Gap |
|---|---|---|---|
| Parent-child link | None. `organisations` is flat. No `parent_organisation_id` column. | Recursive hierarchy: parent_organisation_id on each org. | MISSING |
| Org type classification | No `org_type` field. All orgs treated identically. | `org_type` field: portfolio / project / distributor / client_org. | MISSING |
| Hierarchy traversal | No recursive query or hierarchy-aware helpers. | `getAncestors()`, `getDescendants()`, `getRootOrganisation()` helpers needed. | MISSING |
| Org provisioning | No automated portal provisioning when creating a child org. | Admin creates child org -> system provisions portal + generates invite. | MISSING |
| RLS for hierarchy | RLS scoped to flat `organisation_id`. No cross-org visibility rules. | RLS must allow parent-org admins read access to child-org data where authorised. | MISSING |

**Files referenced:** `supabase/migrations/20260826100000_p05_canonical_identity.sql` (organisations table), `lib/auth.ts` (OrganisationContext)

---

## 2. Identity and Membership

| Dimension | Current State | Target State | Gap |
|---|---|---|---|
| Canonical chain | Auth > auth_credentials > persons > organisation_memberships > organisations. Solid. | Same chain, hierarchy-aware. | REUSABLE |
| Membership roles | owner, admin, consultant, employee, advisor, member, superadmin. | Same roles work. Need portal-scoped role semantics per level. | MINOR |
| portal_access | Exists: admin / user / both. | Works as-is for portal gating. | REUSABLE |
| selected_org_id | Exists on auth_credentials. Allows org switching. | Works. Must enforce that parent-org admins can scope to child orgs. | MINOR |
| ownership_periods | Exists. Temporal ownership. | Works. | REUSABLE |
| Distributor context | `getDistributorContext()` and `currentUserIsDistributor()` exist in `lib/auth.ts`. `distributor_portfolio` table exists. | Works. Must integrate with hierarchy model. | MINOR |

**Verdict:** The identity model is the strongest existing asset. It is almost entirely reusable.

---

## 3. Portal Surfaces

| Dimension | Current State | Target State | Gap |
|---|---|---|---|
| /talk lifecycle | First-time: KiraBootstrap -> provision agent. Returning: ChatPage. | Same lifecycle, but prompt content changes based on portal level. | MINOR |
| /dashboard | Overview page with valuation, agent cards, discovery progress. | Same, but must show portal-level-appropriate content. | MINOR |
| CAS Admin Portal | `/admin/*` with email-based ADMIN_EMAILS allowlist. | Must become the Portfolio Administration surface. | NEEDS REVIEW |
| Kira Project Portal | Does not exist as distinct surface. | Must exist: project admin manages distributors. | MISSING |
| Distributor Portal | `/distributor` route exists (limited). `distributor_portfolio` table exists. | Must become full consultant portal with client org management. | PARTIAL |
| Client Org Portal | The current `/talk` / `/dashboard` / `/chat/[agentId]` surfaces. | Already functional for the client-org level. | REUSABLE |
| /onboarding gate | `OnboardingGate` component with `nextOnboardingStep()`. | Works for client-org level. Needs portal-level-aware variants. | MINOR |

**Verdict:** The client-org level portal surfaces are solid. Higher-level portals need creation/expansion.

---

## 4. Agent Provisioning and /talk

| Dimension | Current State | Target State | Gap |
|---|---|---|---|
| Agent creation | `/api/kira/create` and `/api/kira/ensure` routes. Idempotent, org-scoped. | Works. Must parameterize by portal level + framework. | MINOR |
| Prompt composition | `lib/kira/prompts.ts` — monolithic. Business journey vs personal journey. | Must compose from: Kira Core + Framework + Operating Agreement + Genome. | MAJOR |
| Tool attachment | 18 tools attached during provisioning via `setAgentTools`. | Must scope tools per Operating Agreement (some tools restricted). | MAJOR |
| Voice agent config | ElevenLabs agent with system prompt, tools, voice. | Same architecture, but prompt is dynamically composed per session. | MAJOR |
| Welcome-back | `lib/kira/welcome-back.ts` — server-side opener from context. | Works as-is. | REUSABLE |
| Journey type | `journey_type` on kira_agents: business / personal. | Must extend to portal-level types: project_admin / distributor / client_owner. | MINOR |
| Agent resolution | `lib/kira/resolve-agent.ts` — canonical agent lookup by person+org. | Works. | REUSABLE |

**Verdict:** The provisioning pipeline is solid. The prompt composition engine is the critical gap.

---

## 5. Knowledge Ingestion

| Dimension | Current State | Target State | Gap |
|---|---|---|---|
| Document upload | `/api/kira/knowledge/upload` — PDF/DOCX/TXT/MD/CSV/XLS/XLSX. | Works at client-org level. Must work at every portal level. | MINOR |
| URL ingestion | `search_drive` and `read_document` tools exist. | Works. Must support URL ingestion to knowledge base. | MINOR |
| Manual entry | Not a first-class path. | Must exist: simple "Add information" form at every portal level. | MISSING |
| Voice capture | Conversations distil to `kira_memory`. | Works. Must preserve provenance (which level, which perspective). | MINOR |
| Knowledge tables | `kira_knowledge`, `kira_knowledge_chunks`, `genome_entities`, `genome_facts`, `genome_relationships`, `genome_events`. | Schema works. Must add provenance fields. | MINOR |
| Provenance | Minimal. `source_conversation_id` on some tables. | Must track: who supplied it, which portal level, consultant vs client perspective. | MISSING |
| Processing status | No visible pipeline status. | Must distinguish: Uploaded > Processing > Extracted > Knowledge > Available. | MISSING |

---

## 6. Business Genome

| Dimension | Current State | Target State | Gap |
|---|---|---|---|
| Ontology | `business-genome/ontology/v1/` — areas, entity types, relationships. | Works. | REUSABLE |
| Extraction | `business-genome/extract.ts` — LLM-based extraction from conversation. | Works. Must support framework-specific extraction targets. | MINOR |
| genome_entities | Exists with org scoping, area classification, evidence linking. | Works. | REUSABLE |
| genome_facts | Exists with confidence, temporal state, source linkage. | Must add: provenance type (consultant-derived vs client-derived), disposition (known/inferred/disputed). | MINOR |
| genome_relationships | Exists. | Works. | REUSABLE |
| Authority model | All facts treated equally. No authoritative vs observed distinction. | Must distinguish: Authoritative (CEO-uploaded) vs Observed (staff/conversation) vs Disputed (conflict detected). | MAJOR |
| Conflict detection | Does not exist. | Must flag when new evidence contradicts authoritative knowledge. | MISSING |
| Upward propagation | Does not exist. Client truth does not push to distributor dashboard. | Must exist: client /talk discoveries push verified facts upward. | MISSING |

---

## 7. Consultant Framework

| Dimension | Current State | Target State | Gap |
|---|---|---|---|
| Framework storage | Does not exist. No table, no model. | `consultant_frameworks` table with principles, stages, terminology, outputs, measurements. | MISSING |
| Framework capture | No tool or UI for capturing a consultant's methodology. | Must capture during consultant /talk discovery interview. | MISSING |
| Framework usage | N/A. Kira uses hardcoded prompts. | Must compose prompts from framework stages and terminology. | MISSING |
| Framework versioning | N/A. | Must version: v1, v2, etc. with supersession tracking. | MISSING |
| Framework-agnostic core | Current prompts are one-size-fits-all. | Kira Core must remain methodology-agnostic. Framework plugs in via composition. | MAJOR |

---

## 8. Operating Agreement

| Dimension | Current State | Target State | Gap |
|---|---|---|---|
| Agreement storage | Does not exist. | `operating_agreements` table: versioned, machine-readable, auditable. | MISSING |
| Agreement creation | N/A. | Kira proposes after Consultant Genome + Framework analysis. Consultant approves/rejects/amends. | MISSING |
| Agreement approval | N/A. | Consultant must explicitly approve. Agreement has status: draft > proposed > approved. | MISSING |
| Agreement versioning | N/A. | Version history with audit trail. Historical versions remain queryable. | MISSING |
| Agreement scoping | N/A. | Must scope: consultant-level (global for all clients) and client-level (specific overrides). | MISSING |
| Capability authorisation | N/A. | Must define: authorised_capabilities, restricted_capabilities per agreement. | MISSING |
| Kira behaviour binding | N/A. | Agreement must control: which tools, which prompts, which escalation rules apply. | MISSING |

---

## 9. Truth Comparison and Upward Propagation

| Dimension | Current State | Target State | Gap |
|---|---|---|---|
| Admin belief capture | N/A. When admin creates child entity, no structured belief is recorded. | Must capture: what does the admin BELIEVE about the entity they just created? | MISSING |
| Owner ground truth | Captured during /talk conversation. Currently stored as conversation transcript + memory. | Must extract structured ground truth during /talk and store as the entity's canonical record. | MINOR |
| Comparison engine | Does not exist. | Must compare: admin belief vs owner truth. Flag discrepancies. | MISSING |
| Discrepancy surfacing | Does not exist. | Must surface: "You thought X, but the owner says Y." to the admin. | MISSING |
| Truth precedence | N/A. | Owner truth always wins. Record updates to reflect owner's ground truth. | MISSING |
| Upward push | Does not exist. | Client /talk discoveries push verified facts to distributor dashboard. | MISSING |
| Downward verification | Does not exist. | Distributor can verify/approve pushed facts from client. | MISSING |

---

## 10. Prompt and Extraction Versioning

| Dimension | Current State | Target State | Gap |
|---|---|---|---|
| Prompt versioning | None. `lib/kira/prompts.ts` is a single file. | Must version prompts independently from extraction schemas. | MISSING |
| Extraction versioning | None. Extraction schema is implicit in the extraction code. | Must version: which extraction schema produced which fact. | MISSING |
| Audit trail | Minimal. `kira_memory` has `created_at` but no extraction version. | Must trace: which prompt version + extraction version produced each structured fact. | MISSING |

---

## 11. Permissions and Governance

| Dimension | Current State | Target State | Gap |
|---|---|---|---|
| RLS | Org-scoped. Organisation membership determines access. | Works for flat model. Must extend for hierarchy (parent reads child). | MINOR |
| Admin vs Owner | ADMIN_EMAILS allowlist for /admin. Owner role for client portals. | Works. Must add portal-level-specific admin roles. | MINOR |
| Service role usage | Used for server-side operations. | Must NOT be used to bypass hierarchy permissions. | OK |
| Cross-level access | Does not exist. A distributor cannot see their client's internal data without membership. | Must allow: distributor read access to their client orgs. | MISSING |

---

## 12. Existing UI Compatibility

| Dimension | Current State | Target State | Gap |
|---|---|---|---|
| /dashboard | Functional. Shows valuation, agents, discovery. | Must work at every portal level with level-appropriate content. | MINOR |
| /my-genome | Functional. Shows genome areas and facts. | Must work at client-org level (Business Genome) and consultant level (Consultant Genome). | MINOR |
| /knowledge | Functional. Shows uploaded documents and searchable knowledge. | Must work at every portal level. | MINOR |
| /requests | Functional. Shows task ledger. | Must work at client-org level. | MINOR |
| /settings | Functional. Profile, billing, notifications. | Must work at every portal level. | MINOR |
| /discovery | Functional. Discovery/coaching sessions. | Must integrate with the new /talk-first lifecycle. | MINOR |

---

## Summary: Classification

### Already Implemented and Reusable
- Canonical identity chain (auth_credentials > persons > organisation_memberships > organisations)
- portal_access model
- ownership_periods
- /talk voice agent provisioning pipeline
- /dashboard overview surface
- Business Genome ontology and extraction
- Document upload pipeline
- Welcome-back continuity
- Agent resolution

### Implemented but Requiring Modification
- `organisations` table (needs parent_organisation_id + org_type)
- `kira_agents` table (needs portal-level awareness)
- `lib/kira/prompts.ts` (needs decomposition into composition engine)
- `kira_memory` (needs provenance fields)
- `genome_facts` (needs authority/provenance fields)
- `lib/auth.ts` (needs hierarchy-aware helpers)
- RLS policies (needs parent-org read access rules)

### Missing
- Organisation hierarchy (parent-child links)
- Org type classification
- Consultant Framework model and storage
- Consultant Genome model and storage
- Operating Agreement model and storage
- Prompt composition engine (Framework + Agreement + Genome)
- Admin belief capture on entity creation
- Truth comparison engine
- Discrepancy surfacing to admin
- Upward knowledge propagation
- Downward verification
- Manual knowledge entry UI at each portal level
- Portal-level-specific admin surfaces
- Processing status visibility on knowledge ingestion
- Prompt/extraction versioning
- Cross-level RLS rules

### Architecturally Incompatible
- Monolithic `lib/kira/prompts.ts` is incompatible with dynamic prompt composition. Must be decomposed.
- Flat `organisations` table is incompatible with recursive hierarchy. Must add parent link.

### Unknown / Requiring Verification
- Whether ElevenLabs workspace-level webhook binding supports per-agent prompt composition at session start (needs verification).
- Whether the `distributor_portal` table structure supports the full consultant portal model.
- Whether `client_profiles` table can be extended or must be replaced.

---

## Next Step

This Gap Analysis feeds directly into Phase 3 (Scope) and Phase 4 (Target Technical Design).

The priority order is:
1. Stage A: Database hierarchy + new domain tables (consultant_frameworks, consultant_genomes, operating_agreements, truth_comparisons)
2. Stage B: Consultant Talk + Genome extraction (the first /talk at distributor level)
3. Stage C: Framework capture (extracted during consultant /talk)
4. Stage D: Kira Fit proposal (Framework + Agreement -> behaviour composition)
5. Stage E: Operating Agreement + approval/versioning
6. Stage F: Client org creation from distributor portal
7. Stage G: Client /talk as full discovery interview
8. Stage H: Business Genome structured extraction with authority model
9. Stage I: Connect everything into configured Kira behaviour
10. Stage J: Migrate existing portal functions
11. Stage K: Regression testing
