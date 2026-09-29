// app/api/kira/discovery/start/route.ts
//
// RETIRED 2026-09-30 (build register X). Used to mint a session for the separate discovery agent
// (DISCOVERY_AGENT_ID). Discovery now runs inside the owner's own Kira agent at /talk, gated by the
// discovery_agenda tool — there is no separate session to start any more. Controlled 410, same
// pattern as the retired /api/kira/webhook alias, so a stale client calling this gets an explicit
// answer rather than a silent 404.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Retired. Discovery now runs inside your regular Kira conversation at /talk — there is no separate session to start.',
    },
    { status: 410 },
  );
}
