// app/discovery/page.tsx
//
// RETIRED 2026-09-30 (build register X). This used to run its own staged interview on a SEPARATE
// ElevenLabs agent (DISCOVERY_AGENT_ID) — a fully disconnected mechanism from the owner's own Kira.
// The operator's decision: one agent, one memory, one tool set. Discovery is now what her early
// conversations at /talk are FOR (discovery_agenda, folded into the same agent), not a separate
// product on a separate page.
//
// Redirects rather than 404s: a bookmark, an old email, or a stale dashboard link should land
// somewhere real, not a dead end — and /talk is where the actual mandatory interview now runs.
import { redirect } from 'next/navigation';

export default function DiscoveryPageRetired() {
  redirect('/talk');
}
