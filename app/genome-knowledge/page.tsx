// app/genome-knowledge/page.tsx
//
// THE GENOME KNOWLEDGE PAGE — the human projection of the Business Genome.
//
// This page shows:
//   - What Kira knows about this business
//   - How reliable that knowledge is
//   - What's missing
//   - Where the contradictions are
//
// It's a projection of the underlying intelligence, not another source of truth.
// The genome works programmatically; this page makes it visible.

import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { GenomeKnowledgeDashboard } from '@/components/genome-knowledge/GenomeKnowledgeDashboard';

export const dynamic = 'force-dynamic';

export default async function GenomeKnowledgePage() {
  const user = await getAuthUser();
  if (!user?.id) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">Please sign in to view your genome knowledge.</p>
      </div>
    );
  }

  // Fetch data from genome API
  const sb = createServiceClient();
  const { data: profile } = await sb
    .from('profiles')
    .select('business_name')
    .eq('id', user.id)
    .single();

  const businessName = profile?.business_name ?? 'Your Business';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            Business Genome — Knowledge View
          </h1>
          <p className="text-[var(--text-secondary)]">
            What Kira knows about {businessName}, how reliable it is, and what&apos;s missing.
          </p>
        </div>

        {/* Dashboard */}
        <GenomeKnowledgeDashboard userId={user.id} />
      </div>
    </div>
  );
}
