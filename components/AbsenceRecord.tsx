// components/AbsenceRecord.tsx
//
// The small-win evidence on the dashboard: the periods the owner was away and the
// business kept running through Kira. This is the proof that "you can take two months
// off" is real, not a line on the landing page — an absence recorded here is a concrete
// answer to "did it actually run without you?"
//
// A server component so the page adds it in one line and the lookup cannot drift from
// the dashboard's own org-context pattern (KiraShapeSection is the template).
//
// RLS owns the boundary: any active member reads the org's absences; only owner/admin
// members create or edit them (see absences_org_* policies). So a replacement tenant
// can see the record but not alter it.

import { getCurrentOrganisationContext } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';

interface Absence {
  absence_id: string;
  started_at: string;
  ended_at: string | null;
  status: 'planned' | 'ongoing' | 'ended' | 'voided';
  questions_handled: number;
  required_owner: number;
  notes: string | null;
}

function humanDays(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  return days === 1 ? '1 day' : `${days} days`;
}

function startedLabel(startedAt: string): string {
  const d = new Date(startedAt);
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export async function AbsenceRecord() {
  const org = await getCurrentOrganisationContext();
  const svc = createServiceClientV2();

  const { data: absences } = org?.organisationId
    ? await svc
        .from('absences')
        .select('absence_id, started_at, ended_at, status, questions_handled, required_owner, notes')
        .eq('organisation_id', org.organisationId)
        .order('started_at', { ascending: false })
        .limit(5)
    : { data: [] };

  const ended = (absences ?? []).filter(
    (a) => a.status === 'ended' || (a.status === 'ongoing' && a.ended_at),
  );

  if (ended.length === 0) {
    return null;
  }

  return (
    <section className="mb-10 rounded-2xl border border-kira-soft bg-white p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold text-stone-900">
        You were away — it still ran
      </h2>
      <p className="mt-1 max-w-prose text-sm text-stone-600">
        The times you stepped away and Kira held the business for you. This is the small
        win: the business survived your absence because Kira was there.
      </p>
      <ul className="mt-5 space-y-4">
        {ended.map((a) => (
          <li key={a.absence_id} className="rounded-xl border border-stone-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-stone-900">
                {humanDays(a.started_at, a.ended_at)} away
                <span className="ml-2 text-sm font-normal text-stone-500">
                  · started {startedLabel(a.started_at)}
                </span>
              </p>
              <p className="text-sm text-stone-600">
                Kira handled <span className="font-semibold text-stone-900">{a.questions_handled}</span>{' '}
                questions;{' '}
                <span className="font-semibold text-stone-900">{a.required_owner}</span> needed you.
              </p>
            </div>
            {a.notes ? <p className="mt-2 text-sm text-stone-600">{a.notes}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
