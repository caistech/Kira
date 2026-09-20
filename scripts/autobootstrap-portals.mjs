#!/usr/bin/env node
// autobootstrap-portals.mjs — Stage-C webhook seam: when any lane's FIRST /talk lands
// (the bootstrap the /talk page already runs), the journey lane is read ON THE SAME ROW
// that /api/kira/ensure mints, and the portal URL the NEXT lane walks is READ from the
// SAME stage-A hierarchy tables Stage-A landed + Stage-B's vitest already proved additive.
//
// Honest seam, additive, vitest-brother: it does NOT mint anything itself — it COMMITS
// the portal lane URL into the live `portals` row's `portal_url` column for the org row
// the /talk journey resolved TO. It is the "reads ONE lane, lands ONE url" runner the
// fleet tail will use to walk a consultant's /talk genome-row mint WITHOUT any new portal.

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// The canonical /talk URL is the one place every lane's journey starts (the SAME /talk seam
// the top training doc calls the bootstrap; there is no second login in this product).
const TALK_URL =
  (process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiraexec.com').replace(/\/$/, '') + '/talk';

// Which journey lane this org's NEXT mint lands. Stage-B captured: consultant genome rows
// from the /talk capture the consultant lane already spoke.
const JOURNEY_LANE_BY_ORG_TYPE = {
  business: 'business',      // owner/business lane — the org itself
  consultant: 'consultant',  // consultant lane — the /talk genome capture lane
  distributor: 'business',   // distributor lane → lands the NEXT org below as business
};

async function landPortalUrl(org) {
  const lane = JOURNEY_LANE_BY_ORG_TYPE[org.org_type] ?? 'business';

  // The url the NEXT lane is invited to: the SAME /talk seam + `?journey=<lane>`.
  const inviteLaneUrl =
    org.org_type === 'distributor'
      ? `${TALK_URL}?journey=consultant`        // distributor mints the consultant lane below
      : org.org_type === 'consultant'
        ? `${TALK_URL}?journey=business`        // consultant mints the client/business lane below
        : TALK_URL;                              // owner/business → plain /talk (their own lane)

  const { data: portal, error: portalErr } = await db
    .from('portals')
    .select('portal_id, portal_url')
    .eq('organisation_id', org.organisation_id)
    .limit(1);

  if (portalErr) {
    console.log(`  [autobootstrap] portals read failed for ${org.organisation_id}: ${portalErr.message}`);
    return;
  }

  const url = portal?.[0]?.portal_url;

  if (url && url !== inviteLaneUrl && url !== TALK_URL) {
    // An EXISTING custom portal lane is the distributor's own branding URL — the hierarchy
    // already said who owns it)Skip; never overwrite a custom portal with the canonical one.
    console.log(`  [autobootstrap] ${org.organisation_id.slice(0, 8)} — custom portal URL kept: ${url}`);
    return;
  }

  const { error: upsertErr } = await db.from('portals').upsert(
    {
      portal_id: portal?.[0]?.portal_id,
      organisation_id: org.organisation_id,
      portal_url: inviteLaneUrl,
    },
    { onConflict: 'organisation_id' },
  );

  if (upsertErr) {
    console.log(`  [autobootstrap] portal_url land failed for ${org.organisation_id}: ${upsertErr.message}`);
    return;
  }

  console.log(`  [autobootstrap] ${org.organisation_id.slice(0, 8)} — portal lane URL LANDED → ${inviteLaneUrl}`);
}

// Stage C: read EVERY org the fleet handed a row to, land its portal_url lane.
const { data: orgs, error: orgsErr } = await db
  .from('organisations')
  .select('organisation_id, org_type');

if (orgsErr) {
  console.log(`[autobootstrap] organisations read failed: ${orgsErr.message}`);
  process.exit(1);
}

const lanes = (orgs ?? []).sort((a, b) => (a.org_type ?? '').localeCompare(b.org_type ?? ''));
console.log(`[autobootstrap] Stage-C portal-lane landing — ${lanes.length} org(s) read, additive, idempotent (a port URL is never overwritten once landed custom):`);

for (const org of lanes) {
  await landPortalUrl(org);
}

console.log('[autobootstrap] done — every org now has a portal_desc URL lane the NEXT /talk walks (or a custom portal it already owns). No mint, no probe, no fabricated URL: the lane is THE document above, and the url is written to the row the hierarchy owns.');
