// app/genome-knowledge/[area]/page.tsx
//
// AREA DETAIL PAGE — shows detailed knowledge for a specific area.

import { getAuthUser } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { AreaKnowledgeDetail } from '@/components/genome-knowledge/AreaKnowledgeDetail';
import { notFound } from 'next/navigation';

const AREA_NAMES: Record<string, string> = {
  work_sources: 'Work Sources',
  pricing: 'Pricing',
  delivery: 'Delivery',
  money: 'Money',
  customers: 'Customers',
  people: 'People',
  assets: 'Assets',
  compliance_calendar: 'Compliance & Calendar',
  systems_records: 'Systems & Records',
};

export const dynamic = 'force-dynamic';

export default async function AreaDetailPage({
  params,
}: {
  params: { area: string };
}) {
  const user = await getAuthUser();
  if (!user?.id) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">Please sign in.</p>
      </div>
    );
  }

  const areaKey = params.area;
  if (!AREA_NAMES[areaKey]) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <a href="/genome-knowledge" className="text-blue-600 hover:underline text-sm">
            ← Back to Genome
          </a>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mt-2">
            {AREA_NAMES[areaKey]}
          </h1>
        </div>

        {/* Area Detail */}
        <AreaKnowledgeDetail userId={user.id} areaKey={areaKey} />
      </div>
    </div>
  );
}
