// app/knowledge/page.tsx
// The KB surface (#15): the user sees every document/URL they've shared with Kira, whether Kira can
// actually read it (chunk count = owned-RAG coverage), and can remove or add without re-uploading.
// Backed by the owned-RAG store (kira_knowledge + kira_knowledge_chunks). User-level, spans all their
// agents (search_knowledge resolves by user, not agent).

import { getCurrentAppUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { KnowledgeManager, type KnowledgeItem } from './KnowledgeManager';

export const metadata = { title: 'Knowledge · Kira' };
export const dynamic = 'force-dynamic';

export default async function KnowledgePage() {
  const user = await getCurrentAppUser();
  const svc = createServiceClient();

  const { data: docs } = user
    ? await svc
        .from('kira_knowledge')
        .select('id, title, source_type, url, summary, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    : { data: [] as Array<Record<string, unknown>> };

  // Owned-RAG coverage per doc: how many embedded chunks exist = whether Kira can retrieve it.
  const { data: chunkRows } = user
    ? await svc.from('kira_knowledge_chunks').select('knowledge_id').eq('user_id', user.id)
    : { data: [] as Array<{ knowledge_id: string }> };

  const counts = new Map<string, number>();
  for (const r of (chunkRows ?? []) as Array<{ knowledge_id: string }>) {
    counts.set(r.knowledge_id, (counts.get(r.knowledge_id) ?? 0) + 1);
  }

  const items: KnowledgeItem[] = ((docs ?? []) as Array<Record<string, unknown>>).map((d) => ({
    id: String(d.id),
    title: String(d.title ?? 'Untitled'),
    sourceType: String(d.source_type ?? 'user_upload'),
    url: (d.url as string) ?? null,
    summary: (d.summary as string) ?? null,
    status: (d.status as string) ?? null,
    createdAt: (d.created_at as string) ?? null,
    chunks: counts.get(String(d.id)) ?? 0,
  }));

  return <KnowledgeManager userId={user?.id ?? ''} initial={items} />;
}
