// app/api/convai/webhooks/recall_memory/route.ts
//
// RETIRED 2026-09-30 (build register X). Was the separate discovery agent's tool webhook
// (DISCOVERY_AGENT_ID). Discovery now runs inside the owner's own Kira agent, using her regular
// recall_memory tool (lib/kira/tool-manifest.mjs). Controlled 410, not a silent 404.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST() {
  return new Response('Retired — discovery now runs inside the owner\'s own Kira agent, not a separate one.', {
    status: 410,
  });
}
