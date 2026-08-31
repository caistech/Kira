// Filing the manual into the owner's own system of record.
//
// The step that makes the migration real. Everything else in this product moves knowledge out of his
// head and into OUR database — which for him is a worse place than his head, because he cannot get
// it out without us. This puts it somewhere he keeps.
//
// KIRA DOES NOT KNOW WHERE IT GOES. It renders and posts; the orchestrator resolves the destination
// from what the tenant has connected. That is the anti-lock-in guarantee, and it is why there is no
// mention of Drive below.
//
// THE ORDER IS LOAD-BEARING: read the stored refs, render, post them WITH the refs, then store what
// came back. Skip the read and every run creates a fresh document; skip the store and the NEXT run
// does. Both produce the same visible failure — a folder that grows a duplicate set per session,
// which an owner does not report as a bug, he just stops opening it.

import 'server-only';

import { createServiceClient } from '@/lib/supabase/server';
import { deriveOwnerGenome } from '@/lib/genome/derive';
import { renderAreas, type Audience } from '@/lib/genome/render';
import { displayName, timeZoneForState } from '@/lib/business-identity';
import { getBusinessIdentity } from '@/lib/business-identity/store';
import { resolveOrganisationForPerson } from '@/lib/auth';

const DESTINATION = 'drive';

export interface FileManualResult {
  ok: boolean;
  /** Written to be SPOKEN — she reads this out. Never a stack trace, never "an error occurred". */
  message: string;
  written: number;
  total: number;
  folderUrl?: string | null;
}

/**
 * The folder the manual lives in.
 *
 * AUDIENCE IS IN THE NAME, not just in the contents. He will see this folder in a list, share it, or
 * send someone a link to it — and by then the banner inside the documents is not on screen. The
 * owner's copy carries his position and his plans; the buyer's must not. A folder whose name does
 * not say which one it is, is a folder that gets shared wrongly once.
 */
function folderName(business: string, audience: Audience): string {
  return audience === 'owner'
    ? `${business} — Operating Manual (your copy)`
    : `${business} — Operating Manual (for a buyer)`;
}

/**
 * Render the manual and file it. Returns something she can say out loud.
 *
 * DEGRADE, DON'T FAKE — the rule this product already lives by, and the reason every failure below
 * returns `ok: false` with the orchestrator's own words rather than a generic apology. "I've filed
 * that" when nothing was written is the failure that costs an owner the whole product, because he
 * will not discover it until he sends someone to a folder that is not there.
 */
export async function fileManual(personId: string, audience: Audience): Promise<FileManualResult> {
  const baseUrl = (process.env.ORCHESTRATOR_URL || '').replace(/\/$/, '');
  const secret = process.env.ORCHESTRATOR_SECRET || '';
  if (!baseUrl || !secret) {
    // Our misconfiguration, said as ours. An owner told "I couldn't file it" because we failed to set
    // an environment variable has been given a false impression of his own Drive.
    console.error('[file-manual] ORCHESTRATOR_URL / ORCHESTRATOR_SECRET missing — cannot file.');
    return { ok: false, message: "I can't file it just now — that's a problem at my end, not yours.", written: 0, total: 0 };
  }

  const supabase = createServiceClient();

  // Business identity is keyed by the legacy users.id (person id). getBusinessIdentity uses a
  // session client with RLS, so the parameter must be the authenticated user's own id.
  let identity = null;
  try {
    identity = await getBusinessIdentity(personId);
  } catch (error) {
    console.error('[file-manual] business identity unavailable:', error);
  }
  const business = identity ? displayName(identity) : 'Your business';
  const timeZone = timeZoneForState(identity?.state);

  const orgContext = await resolveOrganisationForPerson(personId);
  if (!orgContext) {
    return { ok: false, message: "No organisation membership found — cannot file.", written: 0, total: 0 };
  }
  const genome = await deriveOwnerGenome(orgContext);
  const documents = renderAreas(genome, audience, timeZone);
  if (documents.length === 0) {
    return { ok: false, message: "There's nothing in your Genome to file yet.", written: 0, total: 0 };
  }

  // The handles from last time. Without them every document below is a CREATE.
  // INV-020: drive_documents is organisation-owned (organisation_id NOT NULL since 20260828) —
  // scope the read by org; user_id is retained as provenance only.
  const { data: existing } = await supabase
    .from('drive_documents')
    .select('area_key, ref')
    .eq('organisation_id', orgContext.organisationId)
    .eq('audience', audience)
    .eq('destination', DESTINATION);
  const refFor = new Map((existing ?? []).map((r) => [String(r.area_key), String(r.ref)]));

  let payload;
  try {
    const res = await fetch(`${baseUrl}/api/v1/tenants/${encodeURIComponent(orgContext.organisationId)}/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-orchestrator-secret': secret },
      body: JSON.stringify({
        folder: folderName(business, audience),
        documents: documents.map((d) => ({ key: d.key, title: d.title, html: d.html, ref: refFor.get(d.key) ?? null })),
      }),
    });
    if (!res.ok) {
      console.error(`[file-manual] record → ${res.status}`);
      return { ok: false, message: "I couldn't get to your documents just now — nothing's wrong with them, I just couldn't file it.", written: 0, total: documents.length };
    }
    payload = (await res.json()) as {
      ok: boolean;
      reason?: string;
      folder?: { url?: string | null };
      written?: number;
      results?: Array<{ key: string; ok: boolean; ref?: string; url?: string | null }>;
    };
  } catch (error) {
    console.error('[file-manual] record threw:', error);
    return { ok: false, message: "I couldn't reach your documents just now.", written: 0, total: documents.length };
  }

  // STORE WHAT WORKED, EVEN ON A PARTIAL RUN. The refs are not a record of success — they are what
  // stops the next attempt creating a second copy of the areas that DID land. Discarding them
  // because the run as a whole failed is how one bad afternoon becomes a duplicated folder.
  const landed = (payload.results ?? []).filter((r) => r.ok && r.ref);
  if (landed.length > 0) {
    const { error } = await supabase.from('drive_documents').upsert(
      landed.map((r) => ({
        user_id: personId,
        organisation_id: orgContext.organisationId,
        audience,
        area_key: r.key,
        destination: DESTINATION,
        ref: r.ref as string,
        url: r.url ?? null,
        last_written_at: new Date().toISOString(),
      })),
      { onConflict: 'user_id,audience,area_key,destination' },
    );
    // Logged loudly and NOT reported as a failure to him: the documents are in his Drive either way,
    // and the cost of this is a duplicate next time rather than anything he has lost now.
    if (error) console.error('[file-manual] refs not stored — next run may duplicate:', error.message);
  }

  const written = Number(payload.written ?? landed.length);
  return {
    ok: Boolean(payload.ok),
    message: payload.ok
      ? `Filed — ${written} ${written === 1 ? 'section' : 'sections'} in a folder called "${folderName(business, audience)}".`
      : (payload.reason ?? "I couldn't file all of it."),
    written,
    total: documents.length,
    folderUrl: payload.folder?.url ?? null,
  };
}
