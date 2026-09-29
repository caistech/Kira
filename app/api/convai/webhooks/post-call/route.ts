// app/api/convai/webhooks/post-call/route.ts
//
// RETIRED 2026-09-30 (build register X). Was the separate discovery agent's post-call binding
// (DISCOVERY_AGENT_ID). Discovery now runs inside the owner's own Kira agent — see lib/kira/convai.ts
// Stage C (onConversationComplete) and lib/kira/discovery-agenda.ts. Controlled 410 rather than a
// silent 404, in case ElevenLabs still holds a stale webhook binding for the retired agent.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST() {
  return new Response('Retired — discovery now runs inside the owner\'s own Kira agent, not a separate one.', {
    status: 410,
  });
}
