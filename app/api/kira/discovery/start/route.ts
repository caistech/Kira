// app/api/kira/discovery/start/route.ts
// Mint a signed discovery session for the authenticated user. Returns the token + agent id +
// the pushed prompt override (what we already know), which the DiscoveryWidget mounts.

import { NextResponse } from 'next/server';
import { getCurrentAppUser } from '@/lib/auth';
import { getDiscovery } from '@/lib/kira/discovery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const user = await getCurrentAppUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.DISCOVERY_AGENT_ID) {
    return NextResponse.json(
      { error: 'Discovery agent not provisioned yet (DISCOVERY_AGENT_ID unset).' },
      { status: 503 }
    );
  }
  try {
    const session = await getDiscovery().startSession(user.id);
    return NextResponse.json(session);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to start discovery' },
      { status: 500 }
    );
  }
}
