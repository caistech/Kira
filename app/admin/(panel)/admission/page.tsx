import { createServiceClientV2 } from '@/lib/supabase/server';
import { NominateForm } from './NominateForm';
import { AdmissionRowActions } from './AdmissionRowActions';
import type { LedgerRow } from './actions';

export const metadata = { title: 'Admission Gate · Kira Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminAdmissionPage() {
  const svc = createServiceClientV2();

  const { data: ledgerData, error } = await svc
    .from('genome_admission_ledger')
    .select('*')
    .order('status', { ascending: true })
    .order('area_key', { ascending: true })
    .order('item_key', { ascending: true });

  if (error) {
    console.error('[admin/admission] fetch failed:', error);
  }

  const rows = (ledgerData ?? []) as LedgerRow[];
  const live = rows.filter((r) => r.status === 'admitted' && !r.retracted_at);
  const watch = rows.filter((r) => r.status === 'watchlisted' && !r.retracted_at);
  const journal = rows.filter((r) => r.retracted_at || r.no_longer_discriminative);

  const statusChip = (text: string, cls: string) => (
    <span className={`inline-block rounded-md px-2 py-0.5 text-sm font-medium ${cls}`}>{text}</span>
  );

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admission Gate</h1>
        <p className="mt-1 max-w-prose text-base text-gray-600">
          The monotonic honesty guarantee. Factors are NEVER removed. Admission is gated at entry
          with a high bar: is this a question a buyer asks of ANY business in the cohort, and does
          it discriminate? An admitted question enters every business&apos;s live factor set.
        </p>
      </header>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Nominate a new question</h2>
        <p className="mt-1 text-sm text-gray-500">
          Everything starts on the watchlist. Nothing is live until the operator explicitly admits
          it with a journaled reason — the floor awards nothing silently.
        </p>
        <div className="mt-4">
          <NominateForm />
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Admitted ({live.length})
          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            live on every factor set
          </span>
        </h2>
        <div className="mt-4 space-y-4">
          {live.map((row) => (
            <div key={row.id} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {statusChip(row.area_key, 'bg-emerald-100 text-emerald-700')}
                <code className="text-xs text-gray-500">{row.item_key}</code>
                {row.factor && <span className="text-xs text-gray-500">factor: {row.factor}</span>}
              </div>
              <h3 className="mt-2 font-medium text-gray-900">{row.buyer_item}</h3>
              <p className="mt-1 text-sm text-gray-600 italic">&ldquo;{row.owner_prompt}&rdquo;</p>
              {row.reason && <p className="mt-2 text-xs text-gray-500">Admission reason: {row.reason}</p>}
              {row.admitted_at && (
                <p className="mt-1 text-xs text-gray-400">
                  Admitted {new Date(row.admitted_at).toLocaleDateString()} by {row.admitted_by ?? 'operator'}
                </p>
              )}
              <AdmissionRowActions row={row} />
            </div>
          ))}
          {live.length === 0 && <p className="text-sm text-gray-500">No items admitted yet.</p>}
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Watchlist ({watch.length})
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            surfaced, not live
          </span>
        </h2>
        <div className="mt-4 space-y-4">
          {watch.map((row) => (
            <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                {statusChip(row.area_key, 'bg-gray-100 text-gray-700')}
                <code className="text-xs text-gray-500">{row.item_key}</code>
                {row.factor && <span className="text-xs text-gray-500">factor: {row.factor}</span>}
              </div>
              <h3 className="mt-2 font-medium text-gray-900">{row.buyer_item}</h3>
              <p className="mt-1 text-sm text-gray-600 italic">&ldquo;{row.owner_prompt}&rdquo;</p>
              {row.reason && <p className="mt-2 text-xs text-gray-500">Nomination reason: {row.reason}</p>}
              <AdmissionRowActions row={row} />
            </div>
          ))}
          {watch.length === 0 && <p className="text-sm text-gray-500">The watchlist is empty.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Journal ({journal.length})</h2>
        <p className="mt-1 text-sm text-gray-500">
          Nothing is ever deleted. A retraction-for-cause or a retirement-for-coverage stays here as
          what it was.
        </p>
        <div className="mt-4 space-y-2">
          {journal.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2">
                {statusChip(row.area_key, 'bg-gray-200 text-gray-600')}
                <code className="text-xs text-gray-500">{row.item_key}</code>
              </div>
              <div className="text-xs text-gray-500">
                {row.retracted_at && <span className="mr-3">Retracted for cause: {row.retraction_reason}</span>}
                {row.no_longer_discriminative && (
                  <span>Retired for coverage: {row.evidence_note ?? 'no note'}</span>
                )}
              </div>
            </div>
          ))}
          {journal.length === 0 && <p className="text-sm text-gray-500">No retracted or retired items.</p>}
        </div>
      </section>
    </div>
  );
}