// app/api/kira/discovery/start/route.ts
// Mint a signed discovery session for the authenticated user. Returns the token + agent id +
// the pushed prompt override (what we already know), which the DiscoveryWidget mounts.

import { NextResponse } from 'next/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
import { getDiscovery } from '@/lib/kira/discovery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  // INV-020: the Client Profile and discovery gate are organisation-owned. Resolve the canonical
  // org context (personId is the discovery subject; organisationId scopes every read/write the
  // session performs via primeContext/applyProfileExtraction).
  const organisationContext = await getCurrentOrganisationContext();
  if (!organisationContext) {
    return NextResponse.json({ error: 'Not signed in or no organisation access' }, { status: 401 });
  }
  if (!process.env.DISCOVERY_AGENT_ID) {
    return NextResponse.json(
      { error: 'Discovery agent not provisioned yet (DISCOVERY_AGENT_ID unset).' },
      { status: 503 }
    );
  }
  try {
    const session = await getDiscovery().startSession(organisationContext.personId);
    return NextResponse.json(session);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to start discovery' },
      { status: 500 }
    );
  }
}
