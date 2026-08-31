# KIRA — API Contract Architecture

**Status:** Architectural Specification
**Purpose:** P0.3-E — Define how the canonical model is exposed
**Scope:** API interface design, contract invariants, and access control boundaries
**Date:** 26 August 2026

---

## 1. Purpose
This artifact defines the API Contract Architecture for the Kira platform, ensuring the canonical model (Organisation, State, Engagement, Knowledge) is exposed safely and consistently to all consumers (Kira agents, frontends, consultants, and external integrations).

The primary goal is to enforce the **Principle of Least Authority** and ensure that API contracts reflect the domain model, not just the underlying database schema.

---

## 2. API Design Principles

1. **Domain-Centric:** API resources are canonical domain objects (`/organisations`, `/engagements`, `/knowledge-contexts`), not table names.
2. **Context-Aware:** API responses include necessary provenance and temporal context (e.g., `effective_at`, `source`).
3. **Fail-Closed:** All access checks (entitlements, engagement membership) are evaluated server-side.
4. **No Direct Schema Exposure:** API responses do not mirror internal Supabase table structures.
5. **Versioning:** APIs are versioned to protect consumers from canonical model evolution.
6. **Causal Traceability:** API write operations (Decisions, Actions) include causal provenance references.

---

## 3. API Surface Hierarchy

### 3.1 Organisation-Level APIs
Endpoints that act on the `Organisation` as the primary subject.
- `GET /organisations/:id`
- `GET /organisations/:id/state` (historical state reconstruction)
- `GET /organisations/:id/knowledge` (retrieval anchored to org)

### 3.2 Engagement-Level APIs
Endpoints that act within a bounded `Engagement`.
- `POST /engagements` (create engagement)
- `GET /engagements/:id/causal-history`
- `POST /engagements/:id/decisions` (with causality records)
- `POST /engagements/:id/actions`

### 3.3 Intelligence-Level APIs
Expose the causal machine and knowledge.
- `GET /knowledge/:id/provenance`
- `POST /learning/reconcile` (record outcomes/learning)

---

## 4. Contract Boundaries

### 4.1 Consumption Boundaries
- **Kira Agent:** Accesses Organisation → Knowledge → Current Context via read-only tools.
- **Consultant Frontend:** Accesses Engagement context, Decisions, and Action outcomes.
- **External Integration:** Accesses specifically authorised, versioned read-only views of the Organisation state.

### 4.2 Security/Entitlement
Entitlement is checked at the **API Route** level, based on the membership record in `organisation_memberships`. 
- An API for `Engagements` validates `Person` membership in that `Engagement`.
- An API for `OrganisationalState` validates `Person` membership in that `Organisation`.

---

## 5. Implementation Requirements

1. **Mapping:** All API routes must map requested resources to the canonical model before query execution.
2. **Provenance Headers/Payloads:** Write operations must require causal provenance fields (e.g., `decision_id`, `intervention_id`).
3. **No Database Passthrough:** API responses must be transformed from database records to canonical domain objects via a dedicated transformation layer.
4. **Strict Typing:** All API schemas must be defined in TypeScript/Zod within a shared `contracts/` directory, preventing drift.

---

## 6. Audit Requirement
This API Contract Architecture is subject to the following audit test:
> Can any consumer (agent, frontend, external tool) access or modify data without an explicit Organisation or Engagement context? 

If yes, the API contract is semantically defective.
