// lib/kira/recall.ts
// Kira's recall_memory handler — Mnemo-semantic + kira_memory, merged (#7).
//
// P0.4 REBOUND: Every kira_memory read crosses the canonical memory boundary.
// Organisation context is resolved ONCE at the boundary via resolveOrganisationForPerson(uid),
// then both the Mnemo semantic lane (person-scoped, frozen prefix) and the kira_memory substring
// lane (org-scoped) are gated behind it.

import { createServiceClientV2 } from '@/lib/supabase/server';
import { resolveOrganisationForPerson } from '@/lib/auth';
import { mnemoSearch, mnemoEnabled } from '@/lib/kira/mnemo';

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export async function handleKiraRecall(req: Request): Promise<Response> {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, error: 'Invalid JSON' });
  }

  const query = String(body.query || '').trim();
  if (!query) {
    return json(400, { success: false, error: 'Missing query' });
  }

  // P0.4: Resolve organisational context from personId (uid). Blocked if no membership.
  const url = new URL(req.url);
  const uid = url.searchParams.get('uid') || '';
  let agentId: string | null = null;

  // Resolve org context from person id. P0.4 contract: no org context = no recall.
  const orgContext = uid ? await resolveOrganisationForPerson(uid) : null;

  // Fallback: resolve from conversation binding for legacy callers.
  if (!orgContext && !uid) {
    const supabase = createServiceClientV2();
    const conversationId = String(body.conversation_id || '');
    if (conversationId) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('user_id, agent_id, organisation_id')
        .eq('elevenlabs_conversation_id', conversationId)
        .single();
      const convUserId = (conv?.user_id as string) || '';
      const convOrgId = (conv?.organisation_id as string) || '';
      agentId = (conv?.agent_id as string) || null;
      // INV-020: prefer the conversation's OWN organisation anchor (it is already org-owned) over a
      // membership re-resolve — the conversation is the authoritative provenance of whose record
      // this is. The person id is retained as provenance for the Mnemo semantic lane.
      if (convOrgId && convUserId) {
        return handleRecall({ organisationId: convOrgId, personId: convUserId }, query, agentId, json);
      }
      if (convUserId) {
        const fallbackCtx = await resolveOrganisationForPerson(convUserId);
        if (fallbackCtx) {
          return handleRecall(fallbackCtx, query, agentId, json);
        }
      }
    }
  }

  if (!orgContext) {
    return json(200, { success: false, error: 'No user identity on this request' });
  }

  return handleRecall(orgContext, query, agentId, json);
}

async function handleRecall(
  orgContext: { organisationId: string; personId?: string },
  query: string,
  agentId: string | null,
  json: (status: number, body: unknown) => Response,
): Promise<Response> {
  const supabase = createServiceClientV2();

  // 1. Mnemo semantic (deep) — person-scoped (frozen prefix). Authorised by org membership.
  const semantic = mnemoEnabled()
    ? await mnemoSearch(orgContext.personId ?? '', query, 6)
    : [];

  // 2. kira_memory substring (near-term + fail-soft floor). Org-scoped.
  let q = supabase
    .from('kira_memory')
    .select('content, importance, created_at')
    .eq('organisation_id', orgContext.organisationId)
    .eq('active', true)
    .ilike('content', `%${query}%`)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(6);
  if (agentId) q = q.eq('agent_id', agentId);
  const { data: nearTerm } = await q;

  // Merge: semantic first (usually the better hits), then any near-term rows not already covered.
  const seen = new Set<string>();
  const memories: { content: string }[] = [];
  for (const content of semantic) {
    const k = norm(content);
    if (k && !seen.has(k)) { seen.add(k); memories.push({ content }); }
  }
  for (const row of nearTerm ?? []) {
    const content = String((row as any).content || '');
    const k = norm(content);
    if (k && !seen.has(k)) { seen.add(k); memories.push({ content }); }
  }

  const capped = memories.slice(0, 8);
  if (capped.length === 0) {
    return json(200, { success: true, found: 0, memories: [], summary: `I don't have anything stored about "${query}" yet.` });
  }
  return json(200, {
    success: true,
    found: capped.length,
    memories: capped,
    summary: `Recalled ${capped.length} relevant thing(s) about "${query}".`,
  });
}
