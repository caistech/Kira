# Target Technical Design — Chain of Truth Architecture

**Document type:** Phase 4 Technical Design
**Date:** 2026-09-20
**Status:** For review before Stage A implementation
**Authority:** Kira_Architecture_Redesign_Design_Directive.md + Gap Analysis

---

## 1. Design Principles

1. **Owner truth wins.** Every entity's ground truth comes from its owner via /talk. Admin beliefs are preliminary.
2. **Portal-level repetition.** Every level follows the same /talk > compare > dashboard lifecycle.
3. **Composition over hard-coding.** Prompts, tools, and extraction targets are composed from domain objects, not monolithic files.
4. **Incremental migration.** No controlled rewrite. Each stage ships independently and preserves existing functionality.
5. **Provenance is mandatory.** Every fact traces to its source, perspective, and extraction version.

---

## 2. Organisation Hierarchy — Schema Design

### 2.1 Modifications to `organisations`

```sql
ALTER TABLE organisations
  ADD COLUMN parent_organisation_id UUID
    REFERENCES organisations(organisation_id),
  ADD COLUMN org_type TEXT NOT NULL DEFAULT 'client_org'
    CHECK (org_type IN (
      'portfolio',     -- Corporate AI Solutions
      'project',       -- Kira Project
      'distributor',   -- Business Consultant
      'client_org'     -- Client Organisation
    )),
  ADD COLUMN created_by_person_id UUID
    REFERENCES persons(person_id);

CREATE INDEX idx_org_parent ON organisations(parent_organisation_id);
CREATE INDEX idx_org_type ON organisations(org_type);
```

### 2.2 Hierarchy Traversal Helper

A PostgreSQL recursive CTE for walking the tree:

```sql
CREATE OR REPLACE FUNCTION get_org_ancestors(p_org_id UUID)
RETURNS TABLE(organisation_id UUID, org_type TEXT, legal_name TEXT, depth INT)
LANGUAGE SQL STABLE AS $$
  WITH RECURSIVE tree AS (
    SELECT o.organisation_id, o.org_type, o.legal_name, 0 AS depth
    FROM organisations o
    WHERE o.organisation_id = p_org_id
    UNION ALL
    SELECT p.organisation_id, p.org_type, p.legal_name, t.depth + 1
    FROM organisations p
    JOIN tree t ON p.organisation_id = t.parent_organisation_id
  )
  SELECT * FROM tree WHERE organisation_id != p_org_id;
$$;

CREATE OR REPLACE FUNCTION get_org_descendants(p_org_id UUID)
RETURNS TABLE(organisation_id UUID, org_type TEXT, legal_name TEXT, depth INT)
LANGUAGE SQL STABLE AS $$
  WITH RECURSIVE tree AS (
    SELECT o.organisation_id, o.org_type, o.legal_name, 0 AS depth
    FROM organisations o
    WHERE o.organisation_id = p_org_id
    UNION ALL
    SELECT c.organisation_id, c.org_type, c.legal_name, t.depth + 1
    FROM organisations c
    JOIN tree t ON c.parent_organisation_id = t.organisation_id
  )
  SELECT * FROM tree WHERE organisation_id != p_org_id;
$$;
```

### 2.3 Hierarchy-Aware RLS

Parent-org admins get read access to child-org data:

```sql
CREATE POLICY hierarchy_parent_read ON organisations
  FOR SELECT
  USING (
    organisation_id = current_setting('app.current_org_id')::uuid
    OR organisation_id IN (
      SELECT get_org_descendants(current_setting('app.current_org_id')::uuid)
    )
  );
```

---

## 3. New Domain Tables

### 3.1 Consultant Framework

```sql
CREATE TABLE consultant_frameworks (
  framework_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(organisation_id),
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Structured methodology
  principles JSONB DEFAULT '[]',
  stages JSONB DEFAULT '[]',
  terminology JSONB DEFAULT '{}',
  diagnostic_method TEXT,
  outputs JSONB DEFAULT '[]',
  client_actions JSONB DEFAULT '[]',
  measurements JSONB DEFAULT '[]',
  kira_integration JSONB DEFAULT '{}',
  
  -- Provenance
  source_conversation_id UUID REFERENCES conversations(id),
  extraction_version TEXT,
  
  -- Lifecycle
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'superseded')),
  version INT DEFAULT 1,
  superseded_by UUID REFERENCES consultant_frameworks(framework_id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_framework_org ON consultant_frameworks(organisation_id);
```

### 3.2 Consultant Genome

```sql
CREATE TABLE consultant_genomes (
  genome_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(organisation_id),
  framework_id UUID REFERENCES consultant_frameworks(framework_id),
  
  -- Structured extraction from /talk discovery
  identity JSONB DEFAULT '{}',
  consulting_business JSONB DEFAULT '{}',
  target_client_profile JSONB DEFAULT '{}',
  industries JSONB DEFAULT '[]',
  services JSONB DEFAULT '[]',
  engagement_models JSONB DEFAULT '[]',
  diagnostic_process JSONB DEFAULT '{}',
  delivery_process JSONB DEFAULT '{}',
  commercial_model JSONB DEFAULT '{}',
  existing_methodologies JSONB DEFAULT '[]',
  areas_kira_can_assist JSONB DEFAULT '[]',
  areas_consultant_led JSONB DEFAULT '[]',
  desired_kira_interaction JSONB DEFAULT '{}',
  
  -- Provenance
  source_conversation_id UUID REFERENCES conversations(id),
  extraction_version TEXT,
  completeness NUMERIC(3,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cgenome_org ON consultant_genomes(organisation_id);
```

### 3.3 Operating Agreement

```sql
CREATE TABLE operating_agreements (
  agreement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope: consultant-level or client-level
  consultant_org_id UUID NOT NULL REFERENCES organisations(organisation_id),
  client_org_id UUID REFERENCES organisations(organisation_id),
  framework_id UUID REFERENCES consultant_frameworks(framework_id),
  
  -- Versioning
  version INT DEFAULT 1,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'proposed', 'approved', 'amended', 'superseded')),
  superseded_by UUID REFERENCES operating_agreements(agreement_id),
  
  -- Capability scope
  authorised_capabilities JSONB DEFAULT '[]',
  restricted_capabilities JSONB DEFAULT '[]',
  
  -- Responsibilities
  kira_responsibilities JSONB DEFAULT '[]',
  consultant_responsibilities JSONB DEFAULT '[]',
  client_responsibilities JSONB DEFAULT '[]',
  
  -- Rules
  client_interaction_rules JSONB DEFAULT '[]',
  data_access_rules JSONB DEFAULT '[]',
  escalation_rules JSONB DEFAULT '[]',
  measurement_requirements JSONB DEFAULT '[]',
  
  -- Prompt configuration
  prompt_overrides JSONB DEFAULT '{}',
  extraction_targets JSONB DEFAULT '[]',
  
  -- Approval
  approved_by UUID REFERENCES persons(person_id),
  approved_at TIMESTAMPTZ,
  effective_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agreement_consultant ON operating_agreements(consultant_org_id);
CREATE INDEX idx_agreement_client ON operating_agreements(client_org_id);
```

### 3.4 Truth Comparison (Admin Belief vs Owner Ground Truth)

```sql
CREATE TABLE truth_comparisons (
  comparison_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who is being compared
  entity_org_id UUID NOT NULL REFERENCES organisations(organisation_id),
  parent_org_id UUID NOT NULL REFERENCES organisations(organisation_id),
  
  -- The admin's belief (captured at entity creation time)
  admin_belief JSONB NOT NULL,
  admin_belief_source TEXT,          -- 'creation_form', 'talk', 'manual'
  admin_belief_captured_at TIMESTAMPTZ NOT NULL,
  
  -- The owner's ground truth (captured during /talk)
  owner_truth JSONB,
  owner_truth_source UUID REFERENCES conversations(id),
  owner_truth_captured_at TIMESTAMPTZ,
  
  -- Comparison result
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'compared', 'discrepancies_found', 'resolved')),
  discrepancies JSONB DEFAULT '[]',  -- array of { field, admin_value, owner_value, resolution }
  
  -- Resolution
  resolved_by UUID REFERENCES persons(person_id),
  resolved_at TIMESTAMPTZ,
  resolution TEXT,                    -- 'owner_truth_adopted', 'admin_belief_confirmed', 'merged'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_truth_entity ON truth_comparisons(entity_org_id);
CREATE INDEX idx_truth_parent ON truth_comparisons(parent_org_id);
CREATE INDEX idx_truth_status ON truth_comparisons(status);
```

### 3.5 Knowledge Authority (extends existing tables)

```sql
-- Add provenance columns to kira_memory
ALTER TABLE kira_memory
  ADD COLUMN provenance_type TEXT DEFAULT 'conversation'
    CHECK (provenance_type IN (
      'conversation',    -- from a /talk session
      'document',        -- from uploaded document
      'url',             -- from URL ingestion
      'manual',          -- manually entered
      'consultant_input',-- from consultant about client
      'admin_input',     -- from admin about entity
      'system_derived'   -- computed by Kira
    )),
  ADD COLUMN perspective TEXT DEFAULT 'owner'
    CHECK (perspective IN (
      'owner',           -- from the entity owner
      'consultant',      -- from the consultant/admin
      'system'           -- derived by Kira
    )),
  ADD COLUMN authority_status TEXT DEFAULT 'proposed'
    CHECK (authority_status IN (
      'proposed',        -- submitted, not yet reviewed
      'confirmed',       -- reviewed and accepted
      'disputed',        -- conflicts with authoritative knowledge
      'superseded'       -- replaced by newer information
    )),
  ADD COLUMN portal_level TEXT
    CHECK (portal_level IN (
      'portfolio', 'project', 'distributor', 'client_org'
    )),
  ADD COLUMN pushed_upward BOOLEAN DEFAULT false,
  ADD COLUMN pushed_at TIMESTAMPTZ,
  ADD COLUMN pushed_to_org_id UUID REFERENCES organisations(organisation_id);
```

### 3.6 Portal Configuration (which portal level, what prompt composition)

```sql
CREATE TABLE portal_configs (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) UNIQUE,
  
  portal_level TEXT NOT NULL
    CHECK (portal_level IN ('portfolio', 'project', 'distributor', 'client_org')),
  
  -- First /talk prompt composition
  talk_prompt_template TEXT NOT NULL,    -- the base interview prompt for this level
  talk_extraction_schema JSONB NOT NULL, -- what to extract from the interview
  
  -- Dashboard configuration
  dashboard_config JSONB DEFAULT '{}',
  
  -- Available tools for agents at this level
  authorised_tools JSONB DEFAULT '[]',
  
  -- Knowledge cross-reference source (which parent org's KB to compare against)
  cross_reference_org_id UUID REFERENCES organisations(organisation_id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Prompt Composition Engine

### 4.1 Architecture

The monolithic `lib/kira/prompts.ts` is decomposed into a composition pipeline:

```
Kira Core Prompt
    +
Portal-Level Template (from portal_configs)
    +
Consultant Framework (if distributor/client level)
    +
Operating Agreement (tool scope, restrictions)
    +
Current Business Genome (what is already known)
    =
COMPOSED SYSTEM PROMPT (per session)
```

### 4.2 Composition Flow (at session start)

```typescript
// lib/kira/prompt-composer.ts (new)

interface PromptContext {
  portalLevel: 'portfolio' | 'project' | 'distributor' | 'client_org';
  organisationId: string;
  agentId: string;
  frameworkId?: string;
  agreementId?: string;
  genomeCompleteness?: number;
}

async function composePrompt(ctx: PromptContext): Promise<string> {
  // 1. Load Kira Core (base persona + universal rules)
  const core = loadCorePrompt();

  // 2. Load portal-level template
  const template = await loadPortalTemplate(ctx.portalLevel);

  // 3. If distributor/client level, load consultant framework
  const framework = ctx.frameworkId
    ? await loadFramework(ctx.frameworkId)
    : null;

  // 4. Load operating agreement (tool scope, restrictions)
  const agreement = ctx.agreementId
    ? await loadAgreement(ctx.agreementId)
    : null;

  // 5. Load current genome state (what Kira already knows)
  const genome = await loadGenomeSummary(ctx.organisationId);

  // 6. Compose
  return [
    core,
    template,
    framework ? renderFrameworkForPrompt(framework) : '',
    agreement ? renderAgreementScope(agreement) : '',
    genome ? renderKnownContext(genome) : '',
  ].filter(Boolean).join('\n\n');
}
```

### 4.3 Prompt Templates by Portal Level

| Level | Interview Focus | Kira Persona |
|---|---|---|
| portfolio | "What is this project? What are its objectives?" | Strategic advisor |
| project | "Tell me about this distributor/practice." | Project analyst |
| distributor | "Walk me through your consulting practice." | Professional peer / discovery coach |
| client_org | "Tell me about your business." (framework-specific) | Fractional executive / coach |

### 4.4 Tool Scoping by Agreement

```typescript
// At session start, tools are filtered through the Operating Agreement
function scopeTools(allTools: Tool[], agreement: OperatingAgreement): Tool[] {
  const authorised = new Set(agreement.authorised_capabilities.map(c => c.tool));
  const restricted = new Set(agreement.restricted_capabilities.map(c => c.tool));

  return allTools.filter(tool => {
    if (restricted.has(tool.name)) return false;
    if (agreement.authorised_capabilities.length > 0) {
      return authorised.has(tool.name);
    }
    return true; // no agreement = all tools (legacy behaviour)
  });
}
```

---

## 5. Entity Creation and Invitation Flow

### 5.1 Admin Creates Child Entity

When an admin at Level N creates an entity at Level N+1:

```
1. Admin fills creation form (name, type, initial understanding)
2. System creates:
   a. organisation row (parent_organisation_id = admin's org, org_type = level N+1)
   b. organisation_memberships row (admin as 'owner' of the new org, temporarily)
   c. truth_comparisons row (admin_belief = form data, status = 'pending')
   d. portal_configs row (for the new org's portal level)
   e. invitation record (ready to send to the entity owner)
3. System auto-generates:
   a. Kira agent for the new org (with portal-level prompt template)
   b. Invitation email/link for the owner
```

### 5.2 Owner Accepts Invitation

```
1. Owner clicks invitation link
2. Supabase auth: verifyOtp or create account
3. System:
   a. Creates auth_credentials + persons row (if new)
   b. Transfers membership: removes admin from 'owner' role, adds real owner as 'owner'
   c. Redirects to /talk (first-time)
4. /talk session:
   a. Portal-level discovery interview
   b. Kira extracts structured ground truth
   c. System compares admin_belief vs owner_truth
   d. Discrepancies flagged to admin
   e. Record updated to reflect owner's truth
5. Owner lands on /dashboard
```

### 5.3 Sequence Diagram

```
Admin (Level N)          System                 Owner (Level N+1)
     |                      |                          |
     |--- Create Entity --->|                          |
     |                      |-- Create org row         |
     |                      |-- Capture admin belief   |
     |                      |-- Generate invitation    |
     |                      |-- Provision portal       |
     |                      |-- Create Kira agent      |
     |                      |                          |
     |                      |<---- Accept invite -------|
     |                      |-- Auth + membership      |
     |                      |-- Transfer ownership     |
     |                      |                          |
     |                      |== /talk session ========>|
     |                      |  (interview owner)       |
     |                      |<== ground truth =========|
     |                      |                          |
     |                      |-- Compare belief vs truth|
     |                      |-- Flag discrepancies     |
     |                      |-- Update record          |
     |<-- Discrepancy ------|                          |
     |    notification      |== /dashboard ===========>|
     |                      |                          |
```

---

## 6. Truth Comparison Engine

### 6.1 Comparison Logic

```typescript
interface TruthComparison {
  field: string;
  adminValue: unknown;
  ownerValue: unknown;
  confidence: number; // 0-1, how different they are
  category: 'critical' | 'material' | 'minor';
}

async function compareTruths(
  adminBelief: Record<string, unknown>,
  ownerTruth: Record<string, unknown>,
): Promise<TruthComparison[]> {
  const diffs: TruthComparison[] = [];

  for (const [field, ownerValue] of Object.entries(ownerTruth)) {
    const adminValue = adminBelief[field];
    if (deepEqual(adminValue, ownerValue)) continue;

    diffs.push({
      field,
      adminValue,
      ownerValue,
      confidence: computeDifference(adminValue, ownerValue),
      category: classifyDifference(field, adminValue, ownerValue),
    });
  }

  return diffs;
}
```

### 6.2 Discrepancy Surfacing

Discrepancies appear in the admin's portal as a notification/card:

```
You recorded "Global Buildtech" as a plumbing business.
The owner describes it as: "A construction materials supply company
specializing in commercial fit-outs."

This may affect how Kira operates for this client.
[Review] [Dismiss]
```

---

## 7. Upward Knowledge Propagation

### 7.1 Push Mechanism

After a /talk session at Level N+1, verified facts that contradict or extend the Level N admin's understanding are pushed upward:

```typescript
async function pushUpward(
  sourceOrgId: string,    // the entity that was interviewed
  targetOrgId: string,    // the parent org
  verifiedFacts: Fact[],
): Promise<void> {
  for (const fact of verifiedFacts) {
    // Mark as pushed
    await supabase.from('kira_memory').update({
      pushed_upward: true,
      pushed_at: new Date().toISOString(),
      pushed_to_org_id: targetOrgId,
    }).eq('id', fact.id);

    // Create a proposed记忆 in the parent org's scope
    await supabase.from('kira_memory').insert({
      organisation_id: targetOrgId,
      memory_type: 'insight',
      content: `[From ${sourceOrgId}] ${fact.content}`,
      authority_status: 'proposed',
      perspective: 'owner',
      provenance_type: 'conversation',
      portal_level: getPortalLevel(targetOrgId),
    });
  }
}
```

### 7.2 Admin Review

The parent-org admin sees pushed facts as "New evidence from [entity name]" and can:
- **Confirm** (becomes confirmed knowledge in the parent scope)
- **Dismiss** (marks as superseded)
- **Escalate** (flags for further discussion)

---

## 8. Kira Fit Model

### 8.1 Composition

```
Consultant Genome + Framework + Operating Agreement + Business Genome
    =
Kira Fit Configuration:
  - Active prompt sections
  - Active tool scope
  - Extraction targets
  - Escalation rules
  - Terminology overrides
  - Measurement requirements
```

### 8.2 Resolution at Session Start

```typescript
async function resolveKiraFit(clientOrgId: string): Promise<KiraFitConfig> {
  // 1. Find the consultant org that owns this client
  const parentOrg = await getParentOrg(clientOrgId);

  // 2. Load consultant genome
  const genome = await loadConsultantGenome(parentOrg.organisation_id);

  // 3. Load framework
  const framework = genome.framework_id
    ? await loadFramework(genome.framework_id)
    : null;

  // 4. Load operating agreement (client-specific or consultant-level)
  const agreement = await loadActiveAgreement(parentOrg.organisation_id, clientOrgId);

  // 5. Load client's business genome
  const businessGenome = await loadBusinessGenome(clientOrgId);

  // 6. Compose configuration
  return {
    promptSections: composeSections(framework, agreement),
    toolScope: scopeTools(ALL_TOOLS, agreement),
    extractionTargets: mergeTargets(framework, agreement),
    escalationRules: agreement?.escalation_rules ?? [],
    terminology: framework?.terminology ?? {},
    measurements: agreement?.measurement_requirements ?? [],
  };
}
```

---

## 9. Migration Plan

### Stage A: Hierarchy + Domain Tables (Week 1)
- Add `parent_organisation_id` + `org_type` to organisations
- Create `consultant_frameworks`, `consultant_genomes`, `operating_agreements`, `truth_comparisons`, `portal_configs` tables
- Add provenance columns to `kira_memory`
- Backfill existing orgs with org_type
- Create hierarchy traversal functions

### Stage B: Consultant Portal + /talk (Week 2-3)
- Build consultant portal surface
- Build consultant /talk discovery prompt
- Build Consultant Genome extraction from /talk
- Wire comparison engine for distributor-onboarding flow

### Stage C: Framework Capture (Week 3-4)
- Build framework capture tool (extracted during consultant /talk)
- Store framework in consultant_frameworks
- Wire framework into prompt composition

### Stage D: Kira Fit (Week 4-5)
- Build Kira Fit resolution service
- Wire into prompt composer
- Wire tool scoping through agreements

### Stage E: Operating Agreement (Week 5-6)
- Build agreement creation flow (Kira proposes, consultant approves)
- Build agreement versioning
- Wire agreement into tool scoping + prompt composition

### Stage F: Client Org Creation (Week 6-7)
- Build "Create Client Org" in distributor portal
- Auto-provision portal + invitation
- Wire admin belief capture

### Stage G: Client /talk as Discovery (Week 7-8)
- Transform client /talk into framework-specific discovery
- Wire upward knowledge propagation
- Wire discrepancy surfacing to distributor

### Stage H: Knowledge Authority (Week 8-9)
- Add authority_status to knowledge pipeline
- Build conflict detection
- Build admin review of pushed facts

### Stage I: Configured Behaviour (Week 9-10)
- Wire all pieces together
- End-to-end testing of full hierarchy flow

### Stage J: Migration + Regression (Week 10-11)
- Migrate existing portals to new model
- Regression testing
- Production verification

---

## 10. Testing Strategy

### Per-Stage Tests
Each stage ships with:
1. **Unit tests** for new domain logic
2. **Integration tests** for API routes
3. **Schema migration tests** for idempotency
4. **RLS policy tests** for access control

### End-to-End Flow Tests
1. Admin creates distributor -> owner accepts -> /talk -> genome created -> truth compared
2. Distributor creates client -> owner accepts -> /talk -> business genome -> upward push
3. Admin sees discrepancy -> reviews -> adopts owner truth
4. Kira Fit resolves correctly for client org with framework + agreement

### Regression Tests
1. Existing /talk flow unchanged for current users
2. Existing /dashboard unchanged
3. Existing knowledge pipeline unchanged
4. Existing agent provisioning unchanged

---

## 11. Rollback Strategy

Each stage is independently reversible:
- **Schema changes:** Reversible via down-migrations (drop new columns/tables)
- **New tables:** Drop cascade, no impact on existing data
- **Modified tables:** New columns are nullable or have defaults, so existing rows unaffected
- **Prompt composition:** Falls back to monolithic prompt if composition fails
- **Tool scoping:** Falls back to all-tools if agreement is missing

The critical rule: **existing functionality must never break.** Each stage ships behind a feature flag where necessary, and the system degrades gracefully if a new domain object is missing.
