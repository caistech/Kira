// lib/kira/swarm/index.ts
// The one place Kira asks for a SwarmCoordinator. Today it returns the LocalSwarmStub (owned tasks,
// no swarm). When Gareth's swarm lands, wire his adapter here behind an env flag — every call site
// (the voice tool route, the approval route) is unchanged.

import type { SwarmCoordinator } from './coordinator';
import { LocalSwarmStub } from './stub';

export * from './coordinator';
export { LocalSwarmStub } from './stub';

let _instance: SwarmCoordinator | null = null;

/**
 * Resolve the active coordinator. Env seam for the swarm handover:
 *   KIRA_SWARM_ADAPTER unset / "local"  → the local stub (default, today)
 *   KIRA_SWARM_ADAPTER = "gareth"        → Gareth's swarm adapter (added when it exists)
 */
export function getSwarmCoordinator(): SwarmCoordinator {
  if (_instance) return _instance;
  const adapter = (process.env.KIRA_SWARM_ADAPTER || 'local').toLowerCase();
  switch (adapter) {
    // case 'gareth': _instance = new GarethSwarmAdapter(); break;  // ← plugs in here, same interface
    case 'local':
    default:
      _instance = new LocalSwarmStub();
  }
  return _instance;
}
