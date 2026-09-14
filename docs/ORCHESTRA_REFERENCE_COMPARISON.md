# Orchestra vs Orchestrator — Reference Comparison for v2.0

**Created:** 2026-09-09
**Status:** v2.0 consideration — **not blocking v1.0 beta**
**Source:** [Platform-Studio/orchestra](https://github.com/Platform-Studio/orchestra) (Apache-2.0, v0.5.0)

---

## 1. What we compared

| | Orchestra (reference) | Orchestrator (caistech) |
|---|---|---|
| **Stack** | Python 3.12, filesystem YAML | Next.js 16, TypeScript, Supabase |
| **Purpose** | General-purpose agent orchestration | Business-workflow orchestration (140-flow registry) |
| **Agent execution** | Spawns full CLI runtimes (Claude Code / Cline / Copilot) | Dispatch envelope → Supabase-backed agents (ElevenLabs, tools) |
| **Persistence** | YAML on disk (`WORKSTREAM_ROOT`) | Supabase database, RLS, migrations |
| **UI** | Standalone Kanban (HTML static) | Next.js web app (queue, tasks, connections) |
| **Multi-tenancy** | None | `principal_id`, per-tenant isolation |
| **Triggers** | State-based, scheduled, email | Five ingress classes (EVT, STA, CAL, SAY, HUM) |
| **Cost model** | Beans Proxy (per-task token tracking) | `@caistech/usage-meter` |
| **Concurrency** | Per-workstream locks, configurable limits | Database-level, per-tenant cron jitter |
| **License** | Apache-2.0 | Private (@caistech) |

---

## 2. Where they overlap

Both independently arrived at the same patterns:

- State-machine-driven work
- Task ownership + assignment
- Scheduled / state-based triggers
- Audit history
- Human review / revision loops
- Concurrent agents with locking
- Artifacts as separate from code

---

## 3. What to extract for v2.0

These are the architectural patterns worth studying — not cloning, extracting:

### 3.1 Metareview loop

**Orchestra:** One agent evaluates another agent's work and sends it back for revision. The acceptance contract is part of the workflow.

**Current Orchestrator:** Dispatch → do → return. No structured review step.

**v2.0 value:** Maps to the implementation → evidence → reviewer → revision loop you described for Kira's engineering work. The acceptance matrix tests (layers A–E) are the manual version of this.

### 3.2 Accumulated learnings

**Orchestra:** Agents persist learnings across runs. Learnings are compacted when they exceed a threshold.

**Current Orchestrator:** No cross-run learning. Each dispatch is stateless.

**v2.0 value:** A sweeper rule that learned "this supplier never responds to the first email" would be more valuable than re-discovering it each run.

### 3.3 Hierarchical workstreams

**Orchestra:** Parent/child workstreams with independent state machines. Parents observe child progress.

**Current Orchestrator:** Flat task list with workflow classification.

**v2.0 value:** A business onboarding flow that spawns sub-workflows (ABN check, Xero connection, genome capture) — each with its own state, but visible to the parent.

### 3.4 Pause/resume at every level

**Orchestra:** Task, state, trigger, and workstream can each be independently paused.

**Current Orchestrator:** Radar mode is all-or-nothing.

**v2.0 value:** Per-rule pause. "Pause this sweep rule for this tenant while they're on holiday" without affecting other rules.

### 3.5 Artifacts as first-class

**Orchestra:** Separate artifact root from orchestration state and code. Agents read/write artifacts through the framework.

**Current Orchestrator:** Execution layer handles artifacts, but not as a first-class abstraction.

**v2.0 value:** A generated quote PDF, a draft email, a filled form — each is an artifact with provenance, not just output text.

### 3.6 Locking with state-level overrides

**Orchestra:** Default concurrency per workstream, with per-state overrides (e.g., only 1 agent in Production Deploy).

**Current Orchestrator:** Database-level locking, less granular.

**v2.0 value:** "Allow 3 concurrent agents for quoting, but only 1 for lodgement submission."

---

## 4. What NOT to adopt

| Orchestra pattern | Why it doesn't fit |
|---|---|
| Filesystem persistence | We're on Supabase — stay there |
| CLI runtime launching | Our agents are Supabase-registered, not local CLI processes |
| Python stack | We're TypeScript / Next.js |
| General-purpose scope | Our 140-flow registry is business-domain-specific — that's a strength |
| Standalone Kanban UI | We have a Next.js web app already |

---

## 5. Scoping note

The acceptance matrix tests (layers A–E) and the concurrent session protocol are the manual implementation of patterns 3.1–3.2. When v1.0 ships to beta testers, the data from those tests and the beta feedback will inform which of these v2.0 patterns to prioritise.

**The immediate priority is v1.0 readiness: agent provisioning, ensure endpoint, concurrent session handling, and beta tester onboarding.** This document captures the v2.0 direction so it's not lost, but it does not change the v1.0 scope.

---

## 6. References

- Orchestra repo: https://github.com/Platform-Studio/orchestra
- Orchestrator spec: `Orchestrator/ORCHESTRATOR_SPEC.md`
- Orchestrator HLD: `Orchestrator/docs/HLD.md`
- Orchestrator LLD: `Orchestrator/docs/LLD.md`
- Execution layer: `Orchestrator/EXECUTION_LAYER.md`
- Task registry: `Orchestrator/TASK_REGISTRY.md`
