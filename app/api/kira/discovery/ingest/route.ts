// app/api/kira/discovery/ingest/route.ts
// Ingestion pre-brief (thin slice: URL + pasted text). An OPTIONAL accelerant that seeds the Client
// Profile from a person's digital footprint before/around the discovery call — for owner-operators
// the conversation is still the source, so this is additive. Files / LinkedIn / GitHub are
// deliberately out of this slice (they need consented, scoped, revocable connections).
//
// Flow: authed user submits { url } or { text } → we fetch/clean readable text → run it through the
// SAME OpenAI extraction + ClientProfileSchema the voice loop uses → applyProfileExtraction merges
// it into client_profiles (bumpSession:false — an ingest is not a conversation). Reuses existing
// machinery, no new dependencies.

import { NextResponse } from 'next/server';
import { lookup } from 'node:dns/promises';
import { getCurrentOrganisationContext } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { createOpenAIRunner } from '@/lib/kira/structured-runner';
import { ClientProfileSchema } from '@/lib/kira/discovery-schema';
import { DISCOVERY_EXTRACTION_MODEL } from '@/lib/kira/discovery-config';
import { applyProfileExtraction } from '@/lib/kira/apply-profile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_CHARS = 40_000; // cap the text handed to extraction (cost + latency)
const FETCH_TIMEOUT_MS = 15_000;

/** Block SSRF targets: loopback / private / link-local / CGNAT / IPv6 ULA+link-local. */
function isBlockedIp(ip: string): boolean {
  if (ip.includes(':')) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::') return true;
    if (v.startsWith('fe80') || v.startsWith('fc') || v.startsWith('fd')) return true;
    const mapped = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
    if (mapped) return isBlockedIp(mapped[1]);
    return false;
  }
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true; // unparseable → block
  const [a, b] = parts;
  if (a === 0 || a === 127 || a === 10) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  return false;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(req: Request) {
  // P0.6: Resolve canonical organisation context from session, never from client input.
  const organisationContext = await getCurrentOrganisationContext();
  if (!organisationContext) return NextResponse.json({ error: 'Not signed in or no organisation access' }, { status: 401 });
  const user = { id: organisationContext.personId } as { id: string };
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Ingestion not configured (OPENAI_API_KEY unset).' }, { status: 503 });
  }

  let body: { url?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let source = '';
  let sourceLabel = 'document';

  try {
    if (body.url) {
      const u = new URL(body.url); // throws on invalid
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return NextResponse.json({ error: 'Only http(s) URLs are supported' }, { status: 400 });
      }
      // SSRF guard: resolve the host and refuse private/loopback targets. (Note: a determined DNS
      // rebind between this lookup and the fetch is still possible; a pinned-IP agent would close
      // that — out of scope for this slice, tracked for the full ingestion build.)
      const addrs = await lookup(u.hostname, { all: true });
      if (addrs.length === 0 || addrs.some((r) => isBlockedIp(r.address))) {
        return NextResponse.json({ error: 'That URL is not allowed' }, { status: 400 });
      }
      const res = await fetch(u.toString(), {
        headers: { 'User-Agent': 'KiraDiscovery/1.0', Accept: 'text/html,text/plain' },
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        return NextResponse.json({ error: `Could not fetch that URL (${res.status})` }, { status: 400 });
      }
      const raw = await res.text();
      source = (res.headers.get('content-type') || '').includes('html') ? htmlToText(raw) : raw;
      sourceLabel = u.hostname;
    } else if (body.text && body.text.trim()) {
      source = body.text.trim();
      sourceLabel = 'pasted notes';
    } else {
      return NextResponse.json({ error: 'Provide a url or text to learn from' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not read that source' },
      { status: 400 },
    );
  }

  source = source.slice(0, MAX_CHARS);
  if (source.length < 40) {
    return NextResponse.json({ error: 'Not enough readable content to learn from' }, { status: 400 });
  }

  const runner = createOpenAIRunner(process.env.OPENAI_API_KEY);
  const system =
    'You are building a structured Client Profile from a source document about a person and/or ' +
    'their business (a website, bio, or notes). Fill the profile with ONLY what the text ' +
    'establishes; use null for anything it does not. Never invent. Capture working style, goals, ' +
    'people and constraints where the text reveals them.';

  let extracted;
  try {
    const { result } = await runner.run({
      model: DISCOVERY_EXTRACTION_MODEL,
      system,
      input: `SOURCE (${sourceLabel}):\n\n${source}`,
      schema: ClientProfileSchema,
    });
    extracted = result;
  } catch {
    return NextResponse.json({ error: 'Could not extract a profile from that source' }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { completeness, discovery_complete } = await applyProfileExtraction(
    supabase,
    user.id,
    extracted,
    { source: 'ingest', bumpSession: false },
  );

  return NextResponse.json({ ok: true, source: sourceLabel, completeness, discovery_complete });
}
