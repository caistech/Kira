# KIRA — Architectural Test Suite

**Status:** Architectural Specification
**Purpose:** P0.3-H — Establish executable validation criteria for canonical model adoption and transition
**Scope:** Testing requirements for the canonical model, state machine, and transition phases
**Date:** 26 August 2026

---

## 1. Purpose
The purpose of this artifact is to define the **Architectural Test Suite** for the Kira platform. It translates the canonical model (P0.1), temporal state machine (P0.2), and transition architecture (P0.3) into executable tests.

The guiding principle is:
> **Architectural invariants must be enforced by automated, executable tests, not just documentation.**

---

## 2. Testing Layers

### 2.1 Canonical Model Invariants (P0.1)
These tests verify that the core identity boundaries and relationships are correctly maintained in the persistence layer.

- `INV-001`: Organisation identity persists independently of Person, Consultant, Engagement, Subscription, and Kira Instance.
- `INV-002`: Person identity is distinct from Organisation Membership and Auth Credential.
- `INV-003`: Ownership Period is temporal and only one Period is 'current' per Organisation.
- `INV-004`: Consultant and Introducer relationships remain distinct.
- `INV-005`: Engagement is a first-class entity with start/end boundaries.
- `INV-006`: Knowledge belongs to Organisation, not Person. (FK must be `organisation_id`, not `user_id`).

### 2.2 Temporal State Machine (P0.2-B)
These tests verify the integrity of the causal chain and state transitions.

- `STATE-001`: Every material state transition must have an explicit provenance path (Causal, Observational, Epistemic, Administrative).
- `STATE-002`: No silent state changes. A mutation to the genome or knowledge base must trigger a state transition record.
- `STATE-003`: Causal integrity. Causal transitions must link back to Decision → Action → Outcome.
- `STATE-004`: Temporal reconstruction. The system must be able to reconstruct the organisational state at any historical point in time by replaying transitions from the initial state (`T₀`).
- `STATE-005`: Confidence score validity. Final confidence must be calculated from base, authority, clarity, and consistency modifiers.

### 2.3 Engagement Domain (P0.2-D)
These tests verify that bounded interventions are correctly captured and attributed.

- `ENGAGE-001`: An Engagement must have defined start and end boundaries.
- `ENGAGE-002`: State transitions during an Engagement must be attributed to the Engagement context.
- `ENGAGE-003`: Engagement-owned context must not persist into the canonical Organisational Knowledge tables without being promoted as a state transition.

### 2.4 Compatibility & Transition (P0.3-G)
These tests verify that legacy and canonical implementations coexist without data corruption.

- `TRANS-001`: Canonical-write-through consistency. (Side-car phase only)
- `TRANS-002`: Adapter layer functionality. (Can the adapter correctly translate legacy User identity to Organisation Membership?)
- `TRANS-003`: Feature flag accuracy. (Does disabling the canonical feature flag revert the system to the legacy-only path without error?)

---

## 3. Test Automation & CI/CD Integration

All architectural tests must be integrated into the CI/CD pipeline.
- Tests for `INV-*` should run on every schema migration or database access layer modification.
- Tests for `STATE-*` should run against a synthetic testing database containing known sequences of events (e.g., a simulated consultant workshop and decision).
- Tests for `TRANS-*` should be part of a dedicated integration test environment that mirrors the dual-write (side-car) setup.

---

## 4. Architectural Validation Requirement
The architecture is not complete until all `INV-*`, `STATE-*`, and `ENGAGE-*` tests are passing against the live system. 

If a test fails, it indicates a semantic contradiction between the canonical model and the implementation, which must be resolved before proceeding to the next phase.
