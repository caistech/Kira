// app/api/kira/knowledge/[id]/route.ts
// Delete one knowledge document from the owner's KB. Identity is SESSION-derived (never a body param),
// so a user can only delete their own docs. Removes: the owned-RAG chunks (FK cascade), the parent
// kira_knowledge row, and — best-effort — the legacy ElevenLabs vendor copy. Backs the KB surface (#15).

import { NextResponse } from 'next/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // P0.6: Resolve canonical organisation context from session, never from client input.
  const organisationContext = await getCurrentOrganisationContext();
  if (!organisationContext) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = organisationContext.personId;

  const supabase = createServiceClient();

  // Ownership check + fetch the vendor id before we delete.
  // Knowledge is organisation-scoped; ownership is verified via organisation membership, not user_id.
  const { data: doc } = await supabase
    .from('kira_knowledge')
    .select('id, organisation_id, elevenlabs_document_id')
    .eq('id', id)
    .maybeSingle();

  if (!doc || doc.organisation_id !== organisationContext.organisationId) {
    // Don't leak existence — same response whether missing or not-owned.
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Best-effort remove the legacy ElevenLabs vendor copy (owned RAG is the source of truth now, but
  // don't leave an orphan in the vendor KB). Never block the delete on this.
  const elId = doc.elevenlabs_document_id as string | null;
  if (elId && process.env.ELEVENLABS_API_KEY) {
    try {
      await fetch(`https://api.elevenlabs.io/v1/convai/knowledge-base/${elId}`, {
        method: 'DELETE',
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      });
    } catch (e) {
      console.error('[knowledge/delete] vendor cleanup skipped:', e);
    }
  }

  // Delete the parent row; kira_knowledge_chunks cascade (FK on delete cascade).
  const { error } = await supabase.from('kira_knowledge').delete().eq('id', id);
  if (error) {
    console.error('[knowledge/delete] DB error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
