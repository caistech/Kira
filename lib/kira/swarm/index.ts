// lib/kira/swarm/index.ts
// The one place Kira asks for a SwarmCoordinator. Today it returns the LocalSwarmStub (owned tasks,
// no swarm). When Gareth's swarm lands, wire his adapter here behind an env flag — every call site
// (the voice tool route, the approval route) is unchanged.

import type { SwarmCoordinator } from './coordinator';
import { LocalSwarmStub } from './stub';
import { OrchestratorAdapter } from './orchestrator-adapter';

export * from './coordinator';
export { LocalSwarmStub } from './stub';

let _instance: SwarmCoordinator | null = null;

/**
 * Resolve the active coordinator. Env seam for the swarm handover:
 *   KIRA_SWARM_ADAPTER unset / "local"  → the local stub (the default, and the safe one)
 *   KIRA_SWARM_ADAPTER = "orchestrator" → our orchestrator over HTTP (ORCHESTRATOR_URL + _SECRET)
 *   KIRA_SWARM_ADAPTER = "gareth"       → Gareth's swarm adapter (added when it exists)
 *
 * DEFAULTS TO LOCAL ON PURPOSE. An unset or misspelt value must not silently route an owner's
 * request at a system nobody has pointed us at; the local stub always works, so the accident lands
 * somewhere that still does the job.
 */
export function getSwarmCoordinator(): SwarmCoordinator {
  if (_instance) return _instance;
  const adapter = (process.env.KIRA_SWARM_ADAPTER || 'local').toLowerCase();
  switch (adapter) {
    case 'orchestrator':
      // Our own orchestrator, over HTTP. Same interface, so no call site changes — which is the
      // entire reason the seam is a wire contract rather than shared types.
      _instance = new OrchestratorAdapter();
      break;
    // case 'gareth': _instance = new GarethSwarmAdapter(); break;  // ← plugs in here, same interface
    case 'local':
    default:
      _instance = new LocalSwarmStub();
  }
  return _instance;
}
