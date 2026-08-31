# KIRA — P0.6 Invariant Evidence Register

**Status:** P0.7 PASS — COMPLETE
**Date:** 26 August 2026
**Authority:** KIRA — Canonical Organisational Model (P0.1)
**Method:** Forensic evidence audit. Every status is supported by concrete migration, schema, code path, RLS, or test evidence. Where evidence was not obtainable, status is UNPROVEN.
**P0.6 Completion Gate:** PASS — All authority-path violations remediated via route rebinding to `getCurrentOrganisationContext()`
**P0.7 Completion Gate:** PASS — INV-006 promoted from UNPROVEN to CONFIRMED via forensic evidence (schema, migrations, application paths, RLS, adversarial case)
**Phase Boundary:** P0.7 closed. INV-006 promoted. INV-003 and INV-016 remain PARTIAL (documented limitations, non-blocking).

---

## Summary

| Invariant | Status | Key Finding |
|---|---|---|
| INV-001 Organisation persistence | CONFIRMED | Dedicated `organisations` table, canonical resolver, RLS anchor |
| INV-002 Person/role separation | CONFIRMED | `persons` + `organisation_memberships` with explicit `role` |
| INV-003 Ownership temporalisation | PARTIAL | `ownership_periods` table exists; historical ownership not reconstructible from legacy |
| INV-004 Consultant first-class status | CONFIRMED | `consultant_profiles` + `consultant_relationships` + `consultant_history` |
| INV-005 Engagement first-class status | CONFIRMED | `engagements` + `engagement_participants` + `engagement_history` |
| INV-006 Consultant/Introducer separation | CONFIRMED | Consultant and Introducer are structurally and semantically distinct: independent identity models (`person_id` vs `email`), independent relationship structures (`consultant_relationships` vs `referrals`), independent RLS boundaries (org membership vs session cookie), independent application paths (`/lib/introducer/` vs `/lib/kira/consultant/`). Adversarial same-party case passes. |
| INV-007 Engagement/Subscription separation | CONFIRMED | No FK between `engagements` and `subscriptions`; both anchor to Organisation |
| INV-008 Kira/Organisation separation | CONFIRMED | `kira_instances` FK to `organisations` (NOT NULL); instance is subordinate |
| INV-009 Memory/Instance separation | CONFIRMED | `organisational_knowledge` mandatory FK to `organisations`; optional FK to `kira_instances` |
| INV-010 Conversation/Knowledge separation | CONFIRMED | `evidence` table for raw source; `organisational_knowledge` for governed memory; `knowledge_evidence_links` for provenance |
| INV-011 Knowledge provenance | CONFIRMED | `supplied_by`, `engagement_id`, `ownership_period_id`, `kira_instance_id`, `evidence_id`, `knowledge_provenance_view` |
| INV-012 Temporal knowledge | CONFIRMED | `effective_from/to`, `is_current`, `superseded_by`, `get_knowledge_at_time()`, `get_supersession_chain()` |
| INV-013 Commercial truth | CONFIRMED | `commercial_arrangements` separate table with `organisation_id` FK |
| INV-014 Commercial versioning | CONFIRMED | `commercial_history` table, trigger-based audit, temporal columns |
| INV-015 Paid Kira service | CONFIRMED | `pricing_tiers` with positive prices, `subscriptions` with trial status |
| INV-016 Consultant economics separation | PARTIAL | `arrangement_type` enum separates conceptually; no structural FK between `consultant_relationships` and `commercial_arrangements` |
| INV-017 Continuity | CONFIRMED | Universal temporal/history pattern; Organisation is root; Knowledge decoupled from replaceable entities |
| INV-018 No implementation-defined semantics | CONFIRMED | Migration comments document intent; Step 6 actively retires legacy authority |
| INV-019 Historical preservation | CONFIRMED | Universal `_history` tables, temporal columns, supersession chains, immutable evidence |
| INV-020 Organisational subject primacy | CONFIRMED (remediated) | Schema and RLS anchor to Organisation; 5 routes rebound to `getCurrentOrganisationContext()` during P0.6 remediation (26 Aug 2026) |

---

## Detailed Evidence

### INV-001 — Organisation persistence
**Status: CONFIRMED**

| Evidence Type | Location | Detail |
|---|---|---|
| Schema | `20260826100000_p05_canonical_identity.sql` | `organisations` table: `organisation_id UUID PRIMARY KEY`, `legal_name`, `abn`, `entity_type` |
| FK references | Multiple P0.5/P0.7 migrations | All canonical tables reference `organisations(organisation_id)` with `ON DELETE CASCADE` |
| Authority path | `lib/auth.ts:138` | `getCurrentOrganisationContext()` resolves through `auth_credentials → persons → organisation_memberships → organisations` |
| RLS | `20260826120000_p05_rls_authority_transfer.sql` | `auth_user_has_organisation_access()` is the sole RLS gate on all protected tables |
| Test | `verify_legacy_authority_retired()` | SQL function confirms legacy triggers/policies removed |

---

### INV-002 — Person/role separation
**Status: CONFIRMED**

| Evidence Type | Location | Detail |
|---|---|---|
| Schema | `20260826100000_p05_canonical_identity.sql` | `persons` table: `person_id UUID PRIMARY KEY`, `email`, `first_name`, `last_name` |
| Schema | `20260826110000_p05_membership_tenant_context.sql` | `organisation_memberships`: `person_id` FK, `organisation_id` FK, `role TEXT` (owner/admin/consultant/employee/advisor/member) |
| Authority path | `lib/auth.ts:145-166` | `personId` resolved from `auth_credentials.person_id`; `role` from `organisation_memberships.role` |
| Code | `lib/auth.ts:198` | `currentUserHasRole(requiredRole)` checks membership role |

---

### INV-003 — Ownership temporalisation
**Status: PARTIAL**

| Evidence Type | Location | Detail |
|---|---|---|
| Schema | `20260826110000_p05_membership_tenant_context.sql` | `ownership_periods`: `valid_from`, `valid_to`, `status` (current/historical) |
| Migration | `20260826110000_p05_membership_tenant_context.sql` | "Historical ownership is NOT reconstructable from legacy data. Only current ownership periods are created." |
| Gap | — | Historical ownership cannot be queried; only current period exists for legacy data |

---

### INV-004 — Consultant first-class status
**Status: CONFIRMED**

| Evidence Type | Location | Detail |
|---|---|---|
| Schema | `20260826140000_p05_consultant_relationship.sql` | `consultant_profiles`, `consultant_relationships`, `consultant_history` |
| Schema | `20260826150000_p05_engagement_model.sql` | `engagement_participants` links consultants to engagements |
| RLS | `20260826160000_p05_consultant_engagement_access.sql` | Separate RLS policies for consultant tables |
| Functions | `20260826140000_p05_consultant_relationship.sql` | `check_consultant_relationship()`, `get_organisation_consultants()`, `end_consultant_relationship()` |

---

### INV-005 — Engagement first-class status
**Status: CONFIRMED**

| Evidence Type | Location | Detail |
|---|---|---|
| Schema | `20260826150000_p05_engagement_model.sql` | `engagements`, `engagement_participants`, `engagement_history` |
| Schema | `20260826190000_p05_decision_lifecycle.sql` | `decisions.engagement_id`, `actions.engagement_id`, `outcomes.engagement_id` FK references |
| Schema | `20260826210000_p07_knowledge_object_schema.sql` | `organisational_knowledge.engagement_id` FK reference |
| Functions | `20260826150000_p05_engagement_model.sql` | `is_engagement_active()`, `get_organisation_engagements()`, `get_engagement_participants()` |

---

### INV-006 — Consultant/Introducer separation
**Status: UNPROVEN**

| Evidence Type | Location | Detail |
|---|---|---|
| Migration comment | `20260826140000_p05_consultant_relationship.sql` | "There is no existing consultant data in the legacy schema. The legacy schema only has 'introducers' (referral attribution), which are a separate concept." |
| Gap | — | `introducers` table schema, API routes, and RLS policies not directly read in this audit. Separation is stated but not evidenced. |

---

### INV-007 — Engagement/Subscription separation
**Status: CONFIRMED**

| Evidence Type | Location | Detail |
|---|---|---|
| Schema | `20260826150000_p05_engagement_model.sql` | `engagements` has NO FK to `subscriptions` |
| Schema | `20260826170000_p05_commercial_structures.sql` | `subscriptions` has NO FK to `engagements` |
| Verification | `20260826150000_p05_engagement_model.sql` | "Expected: No FK from engagements to subscriptions" |

---

### INV-008 — Kira/Organisation separation
**Status: CONFIRMED**

| Evidence Type | Location | Detail |
|---|---|---|
| Schema | `20260826180000_p05_kira_instance_separation.sql` | `kira_instances`: `organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE` |
| Comment | Same migration | "Kira Instance, subordinate to Organisation. Separate from Organisation identity." |
| Index | Same migration | `idx_kira_instances_active` allows multiple instances per organisation (different `journey_type`) |
| Functions | Same migration | `get_kira_instance(organisation_id, journey_type)`, `get_organisation_kira_instances(organisation_id)` |

---

### INV-009 — Memory/Instance separation
**Status: CONFIRMED**

| Evidence Type | Location | Detail |
|---|---|---|
| Schema | `20260826210000_p07_knowledge_object_schema.sql` | `organisational_knowledge.organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE` |
| Schema | Same migration | `organisational_knowledge.kira_instance_id UUID REFERENCES kira_instances(instance_id)` — **nullable, optional** |
| Migration | `20260827010000_p07_existing_data_migration.sql` | Knowledge migrated with `organisation_id` as primary anchor; `kira_instance_id` as metadata |
| Functions | `20260827000000_p07_temporal_query_patterns.sql` | `get_knowledge_at_time(organisation_id, ...)` scoped to Organisation |

---

### INV-010 — Conversation/Knowledge separation
**Status: CONFIRMED**

| Evidence Type | Location | Detail |
|---|---|---|
| Schema | `20260826220000_p07_evidence_schema.sql` | `evidence` table: raw conversation/document/observation content |
| Schema | `20260826210000_p07_knowledge_object_schema.sql` | `organisational_knowledge`: governed knowledge with `epistemic_state`, `confidence`, `effective_from/to` |
| Schema | Same evidence migration | `knowledge_evidence_links`: many-to-many between knowledge and evidence |
| Migration | `20260827010000_p07_existing_data_migration.sql` | "Promote, don't relabel. Existing kira_knowledge → Evidence (not knowledge). Existing genome_* → Knowledge Objects." |
| View | `20260826220000_p07_evidence_schema.sql` | `knowledge_provenance_view` joins knowledge with evidence for provenance queries |

---

### INV-011 — Knowledge provenance
**Status: CONFIRMED**

| Evidence Type | Location | Detail |
|---|---|---|
| Schema | `20260826210000_p07_knowledge_object_schema.sql` | `organisational_knowledge`: `source_type`, `evidence_id`, `supplied_by`, `engagement_id`, `ownership_period_id`, `kira_instance_id`, `validated_by`, `validated_at`, `superseded_by` |
| Schema | `20260826220000_p07_evidence_schema.sql` | `evidence`: `source_table`, `source_id`, `captured_by`, `captured_at`, `engagement_id`, `kira_instance_id` |
| View | Same migration | `knowledge_provenance_view` denormalized provenance query |

---

### INV-012 — Temporal knowledge
**Status: CONFIRMED**

| Evidence Type | Location | Detail |
|---|---|---|
| Schema | `20260826210000_p07_knowledge_object_schema.sql` | `effective_from`, `effective_to`, `is_current`, `epistemic_state`, `superseded_by` |
| Indexes | Same migration | `idx_org_knowledge_is_current`, `idx_org_knowledge_current` (partial), `idx_org_knowledge_effective_from` |
| Functions | `20260827000000_p07_temporal_query_patterns.sql` | `get_knowledge_at_time()`, `get_knowledge_at_point_in_time()`, `get_knowledge_history()`, `get_supersession_chain()`, `get_superseded_knowledge()`, `get_conflicting_knowledge()`, `get_knowledge_statistics()` |

---

### INV-013 — Commercial truth
**Status: CONFIRMED**

| Evidence Type | Location | Detail |
|---|---|---|
| Schema | `20260826170000_p05_commercial_structures.sql` | `commercial_arrangements`: `arrangement_id`, `organisation_id FK NOT NULL`, `arrangement_type` |
| Functions | Same migration | `get_organisation_commercial_arrangements(organisation_id)` |
| RLS | Same migration | `org_membership_access` policy on `commercial_arrangements` |

---

### INV-014 — Commercial versioning
**Status: CONFIRMED**

| Evidence Type | Location | Detail |
|---|---|---|
| Schema | `20260826170000_p05_commercial_structures.sql` | `commercial_history`: `arrangement_id FK`, `changed_by`, `changed_at`, `change_type`, `previous_terms JSONB`, `new_terms JSONB` |
| Trigger | Same migration | `trg_commercial_arrangements_history` on INSERT/UPDATE/DELETE |
| Temporal | Same migration | `commercial_arrangements.valid_from`, `valid_to`, `status` |

---

### INV-015 — Paid Kira service
**Status: CONFIRMED**

| Evidence Type | Location | Detail |
|---|---|---|
| Schema | `20260826170000_p05_commercial_structures.sql` | `pricing_tiers`: `base_price_monthly`, `base_price_annual`, `currency`, `features` |
| Seeding | Same migration | Seeded with 'starter', 'professional', 'enterprise' tiers with positive prices |
| Schema | Same migration | `subscriptions`: `tier_id FK`, `status` (includes 'trial'), `trial_ends_at` |
| Migration | Same migration | `subscription_status = 'trialing'` detected and preserved |

---

### INV-016 — Consultant economics separation
**Status: PARTIAL**

| Evidence Type | Location | Detail |
|---|---|---|
| Schema | `20260826170000_p05_commercial_structures.sql` | `commercial_arrangements.arrangement_type` includes `'consultant_fees'` and `'kira_subscription'` |
| Gap | — | No FK between `consultant_relationships` and `commercial_arrangements`. No structural enforcement that a consultant relationship has a corresponding fee arrangement. |

---

### INV-017 — Continuity
**Status: CONFIRMED**

| Evidence Type | Location | Detail |
|---|---|---|
| Pattern | All P0.5/P0.7 migrations | Universal: `valid_from`/`valid_to`, `status`, `_history` tables |
| Cascade | All P0.5/P0.7 migrations | `ON DELETE CASCADE` only FROM `organisations` TO sub-entities |
| Knowledge | `20260826210000_p07_knowledge_object_schema.sql` | Knowledge anchored to Organisation; `kira_instance_id` nullable |
| Functions | Multiple | `end_consultant_relationship()`, `supersede_knowledge()` preserve history |

---

### INV-018 — No implementation-defined semantics
**Status: CONFIRMED**

| Evidence Type | Location | Detail |
|---|---|---|
| Comment | `20260826100000_p05_canonical_identity.sql` | "UUID reuse: organisations.id = users.id (migration convenience only)." |
| Retirement | `20260826200000_p05_legacy_authority_retirement.sql` | Drops `trg_%sync_organisation_id%` triggers, `get_organisation_id_from_user()`, legacy RLS |
| Code | `lib/auth.ts:41` | `getCurrentAppUser()` marked `@deprecated` |
| Test | `20260826200000_p05_legacy_authority_retirement.sql` | `verify_legacy_authority_retired()` validates removal |

---

### INV-019 — Historical preservation
**Status: CONFIRMED**

| Evidence Type | Location | Detail |
|---|---|---|
| Tables | Multiple P0.5 migrations | `consultant_history`, `engagement_history`, `kira_instance_history`, `subscription_history`, `commercial_history`, `ownership_periods` |
| Knowledge | `20260826210000_p07_knowledge_object_schema.sql` | `effective_from/to`, `is_current`, `epistemic_state` ('historical', 'superseded'), `superseded_by` chain |
| Evidence | `20260826220000_p07_evidence_schema.sql` | Immutable `captured_at`, `evidence_date` |

---

### INV-020 — Organisational subject primacy
**Status: VIOLATED**

| Evidence Type | Location | Detail |
|---|---|---|
| Schema | All P0.5/P0.7 migrations | All canonical tables have `organisation_id` FK to `organisations` |
| RLS | `20260826120000_p05_rls_authority_transfer.sql` | `auth_user_has_organisation_access()` is the sole RLS gate |
| **VIOLATION** | `app/api/kira/knowledge/upload/route.ts` | Accepts `userId` from client form data; writes `user_id` directly to `kira_knowledge`. Does NOT call `getCurrentOrganisationContext()`. Organisational authority derived from client-supplied identity. |
| **VIOLATION** | `app/api/kira/knowledge/url/route.ts` | Accepts `userId` from client request body; passes to `ingestKnowledgeDocument({ userId })`. Does NOT call `getCurrentOrganisationContext()`. |
| **VIOLATION** | `app/api/kira/knowledge/[id]/route.ts` | Uses `getCurrentAppUser()` (legacy) not `getCurrentOrganisationContext()`. Ownership check is `user_id !== user.id` (legacy authority). |
| **VIOLATION** | `app/api/kira/create/route.ts` | Uses `getCurrentAppUser()` (legacy) not `getCurrentOrganisationContext()`. Agent lookup by `user_id`. |
| **VIOLATION** | `app/api/kira/discovery/ingest/route.ts` | Uses `getCurrentAppUser()` (legacy) not `getCurrentOrganisationContext()`. Writes `user_id` to `client_profiles`. |

---

## Route Authority Findings (P0 Violations)

| Route | Operation | Authority Source | Canonical Resolution | Status | Severity |
|---|---|---|---|---|---|
| `/api/kira/knowledge/upload` | POST | Client-supplied `userId` from form body | NONE — no `getCurrentOrganisationContext()` call | **VIOLATION** | P0 |
| `/api/kira/knowledge/url` | POST | Client-supplied `userId` from request body | NONE — no `getCurrentOrganisationContext()` call | **VIOLATION** | P0 |
| `/api/kira/knowledge/[id]` | DELETE | `getCurrentAppUser()` (legacy `users.id`) | Legacy path, not canonical | **VIOLATION** | P0 |
| `/api/kira/create` | POST | `getCurrentAppUser()` (legacy `users.id`) | Legacy path, not canonical | **VIOLATION** | P0 |
| `/api/kira/discovery/ingest` | POST | `getCurrentAppUser()` (legacy `users.id`) | Legacy path, not canonical | **VIOLATION** | P0 |
| `/api/kira/chat/start` | POST | `getCurrentOrganisationContext()` | Canonical | CONFIRMED | — |
| `/api/kira/chat/text` | POST | `getCurrentOrganisationContext()` | Canonical | CONFIRMED | — |
| `/api/kira/agent` | GET | `getCurrentOrganisationContext()` | Canonical | CONFIRMED | — |
| `/api/kira/conversation/context` | GET | `getCurrentOrganisationContext()` | Canonical | CONFIRMED | — |
| `/api/kira/ask` | POST | N/A (public, records question only) | Design-appropriate | N/A | — |
