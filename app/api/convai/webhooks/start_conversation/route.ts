// app/api/convai/webhooks/start_conversation/route.ts
//
// RETIRED 2026-09-30 (build register X). Was the separate discovery agent's get_conversation_context
// binding (DISCOVERY_AGENT_ID), identity resolved from a signed discovery session token that no
// longer gets minted (app/api/kira/discovery/start is itself retired). Discovery now runs inside the
// owner's own Kira agent's normal identity resolution. Controlled 410, not a silent 404.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST() {
  return new Response('Retired — discovery now runs inside the owner\'s own Kira agent, not a separate one.', {
    status: 410,
  });
}
