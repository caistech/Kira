// app/api/cron/autobootstrap-portals/route.ts
//
// Stage-C cron: walks every organisation row and lands a canonical /talk URL
// into portals.portal_url, so the NEXT lane down has a real invite URL.
//
// Idempotent and self-guarding: skips orgs with existing custom portal URLs.
// Vocab matches the DB org_type enum: portfolio / project / distributor / client_org.
//
// @machine-callable

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { rejectUnauthorisedCron } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TALK_URL =
  (process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiraexec.com').replace(/\/$/, '') + '/talk';

// Which journey lane this org's NEXT mint lands. DB org_type enum:
//   portfolio / project / distributor / client_org
const JOURNEY_LANE_BY_ORG_TYPE: Record<string, string> = {
  distributor: 'consultant',   // distributor → invites consultant lane below
  client_org: 'business',      // client org → invites business lane below
};

function inviteLaneUrl(orgType: string | null): string {
  const lane = JOURNEY_LANE_BY_ORG_TYPE[orgType ?? ''] ?? 'business';
  return lane === 'business' ? TALK_URL : `${TALK_URL}?journey=${lane}`;
}

export async function GET(request: NextRequest) {
  const unauthorised = rejectUnauthorisedCron(request);
  if (unauthorised) return unauthorised;

  const db = createServiceClientV2();

  const { data: orgs, error: orgsErr } = await db
    .from('organisations')
    .select('organisation_id, org_type');

  if (orgsErr) {
    console.error('[cron/autobootstrap-portals] organisations read failed:', orgsErr.message);
    return NextResponse.json({ error: 'Database read failed' }, { status: 500 });
  }

  const lanes = (orgs ?? []).sort((a, b) => (a.org_type ?? '').localeCompare(b.org_type ?? ''));
  const report = { total: lanes.length, landed: 0, kept: 0, failed: 0 };

  for (const org of lanes) {
    const targetUrl = inviteLaneUrl(org.org_type);

    try {
      const { data: portal, error: portalErr } = await db
        .from('portals')
        .select('portal_id, portal_url')
        .eq('organisation_id', org.organisation_id)
        .limit(1);

      if (portalErr) {
        report.failed += 1;
        console.error(`[cron/autobootstrap-portals] portals read failed for ${org.organisation_id.slice(0, 8)}:`, portalErr.message);
        continue;
      }

      const existingUrl = portal?.[0]?.portal_url;

      if (existingUrl && existingUrl !== targetUrl && existingUrl !== TALK_URL) {
        report.kept += 1;
        continue;
      }

      const { error: upsertErr } = await db.from('portals').upsert(
        {
          portal_id: portal?.[0]?.portal_id,
          organisation_id: org.organisation_id,
          portal_url: targetUrl,
        },
        { onConflict: 'organisation_id' },
      );

      if (upsertErr) {
        report.failed += 1;
        console.error(`[cron/autobootstrap-portals] portal_url land failed for ${org.organisation_id.slice(0, 8)}:`, upsertErr.message);
        continue;
      }

      report.landed += 1;
      console.log(`[cron/autobootstrap-portals] ${org.organisation_id.slice(0, 8)} — portal lane URL LANDED → ${targetUrl}`);
    } catch {
      report.failed += 1;
    }
  }

  console.log('[cron/autobootstrap-portals]', report);
  return NextResponse.json(report);
}
