// lib/kira/integration/seams.ts
// The Gareth/Shah integration seams as TypeScript interfaces + working stubs (docs/
// GARETH_SHAH_INTEGRATION_SEAMS.md). Kira builds against the INTERFACES now; each partner later ships
// an adapter implementing the same interface and we swap the stub out — in most cases with no change
// to Kira. Seam 1 (SwarmCoordinator) is the doing-slice and lives in ../swarm; re-exported here so all
// four seams are discoverable from one place.
//
//   Seam 1 — SwarmCoordinator   (Kira → Gareth's coordinator)     → ../swarm  [STUB RUNS ~3 OWNED TASKS]
//   Seam 2 — MemoryGovernance   (Gareth ↔ Shah/Mnemo, with Kira)  → here      [STUB = today's Mnemo wire]
//   Seam 3 — SystemOfRecord     (swarm ↔ CAS backbone)            → here      [STUB = proposed-only, logged]
//   Seam 4 — AgentBuilder       (Gareth's builder ↔ CAS discovery)→ here      [STUB = discovery→spec map]

export type { SwarmCoordinator, DispatchedIntent, DispatchResult, TenantId } from '../swarm/coordinator';

// ===========================================================================
// Seam 2 — MemoryGovernance (working ↔ semantic memory)
// ===========================================================================
// The governance layer over the experiential/semantic lane (§4). ONE writer per path or memories
// double/conflict (§7); PII is distilled OUT before anything leaves our infra (§9, hard compliance
// line); the Mnemo scope, the swarm's working-memory scope and Kira's tenantId are the SAME key (§10).

export interface DistilledMemory {
  content: string;       // a distilled, non-PII conclusion — never a raw transcript/artifact
  kind?: string;         // 'decision' | 'preference' | 'fact-about-business' | …
  source?: string;
}

export interface MemoryGovernance {
  /** Distil raw in-infra context to non-PII conclusions and persist to the semantic lane (§7/§9). */
  distillAndPersist(tenantId: string, raw: { text?: string; facts?: string[] }): Promise<void>;
  /** Deep/cross-session semantic recall (§8). Near-term recall stays on Kira's Supabase. */
  recallDeep(tenantId: string, query: string): Promise<DistilledMemory[]>;
  /** The single scope key shared across tasks, working memory, and records (§10). */
  scopeKey(tenantId: string): string;
}

// ===========================================================================
// Seam 3 — SystemOfRecord (structured facts, the CAS backbone)
// ===========================================================================
// The exact/auditable lane (§4, DATA_STANDARD STRUCTURED). A swarm write that needs sign-off lands
// `proposed` and is promoted to `authoritative` on the owner's approval (§14 — ties Seam 1's HITL to
// the data). We define the generic empty categories once; the backbone writes into our shapes (§13).

export type RecordStatus = 'proposed' | 'authoritative';
export type RecordCategory = 'client' | 'job' | 'quote' | 'invoice' | 'schedule' | 'compliance' | 'hr';

export interface RecordWrite {
  tenantId: string;
  category: RecordCategory;
  payload: Record<string, unknown>;
  status?: RecordStatus;   // default 'proposed' — authoritative needs an approval
  correlationId?: string;  // §Cross-cutting 25 — trace one voice exchange → N writes
}

export interface SystemOfRecord {
  write(w: RecordWrite): Promise<{ recordId: string; status: RecordStatus }>;
  /** Promote a proposed record to authoritative on the owner's approve (§14). */
  promote(recordId: string, tenantId: string): Promise<void>;
  read(tenantId: string, category: RecordCategory, query?: Record<string, unknown>): Promise<unknown[]>;
}

// ===========================================================================
// Seam 4 — AgentBuilder (spec → new agent), converges with CAS discovery
// ===========================================================================
// Gareth's builder spins up agents beyond the roster. Our discovery/office-hours output is plausibly
// the exact spec it consumes (§16) — two halves of one mechanism. A built agent must inherit the
// three-lane memory model and be scoped by tenantId (§20/§21), and dangerous capabilities are bounded
// by a hard approval gate (§19).

export interface AgentSpec {
  tenantId: string;
  role: string;                    // "quoting agent", "scheduler", …
  useCase: string;                 // what discovery established it's for
  tools?: string[];                // capabilities to grant
  guardrails?: string[];           // hard limits (e.g. "invoice send requires owner approval")
  prompts?: Record<string, string>;
}

export interface BuiltAgent {
  agentId: string;
  role: string;
  joinedSwarm: boolean;            // §18 auto-join under the coordinator?
}

export interface AgentBuilder {
  /** Turn a discovery Client Profile into a builder spec — the converge point with CAS discovery. */
  fromDiscovery(tenantId: string, clientProfile: Record<string, unknown>): AgentSpec;
  build(spec: AgentSpec): Promise<BuiltAgent>;
}
