// lib/kira/integration/index.ts
// The one place Kira resolves an integration seam. Today each returns the local stub; when a partner
// ships their adapter, wire it here behind an env flag — every call site is unchanged.
//
//   KIRA_SWARM_ADAPTER    → see ../swarm (Seam 1)
//   KIRA_MEMORY_ADAPTER   unset/"local" → LocalMemoryGovernance ; "mnemo-gov" → partner adapter
//   KIRA_SOR_ADAPTER      unset/"stub"  → StubSystemOfRecord    ; "cas-backbone" → backbone adapter
//   KIRA_BUILDER_ADAPTER  unset/"stub"  → StubAgentBuilder      ; "gareth" → swarm builder adapter

import type { MemoryGovernance, SystemOfRecord, AgentBuilder } from './seams';
import { LocalMemoryGovernance, StubSystemOfRecord, StubAgentBuilder } from './stubs';

export * from './seams';
export { getSwarmCoordinator } from '../swarm';

let _memory: MemoryGovernance | null = null;
let _sor: SystemOfRecord | null = null;
let _builder: AgentBuilder | null = null;

export function getMemoryGovernance(): MemoryGovernance {
  if (!_memory) _memory = new LocalMemoryGovernance();
  return _memory;
}

export function getSystemOfRecord(): SystemOfRecord {
  if (!_sor) _sor = new StubSystemOfRecord();
  return _sor;
}

export function getAgentBuilder(): AgentBuilder {
  if (!_builder) _builder = new StubAgentBuilder();
  return _builder;
}
