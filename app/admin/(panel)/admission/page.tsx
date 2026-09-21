// @no-voice-route: operator console — Kira is the OWNER-facing product, and these are the
// screens the operator uses to look at owners. (Same rule as the introducers/distributors surface.)
import { createServiceClientV2 } from '@/lib/supabase/server';
import { cohortEvidenceForMany, type CohortEvidence } from '@/lib/genome/cohort-evidence';
import { NominateForm } from './NominateForm';
import { AdmissionRowActions } from './AdmissionRowActions';
import { SubstanceTestEditor } from './SubstanceTestEditor';
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

  // Batch fetch cohort evidence for every admitted/retired row in ONE query (avoids N+1).
  // A retired item is one where the "everyone now answers it" claim is supposed to hold — so
  // showing the numbers BESIDE the flag is what makes the claim checkable.
  const evidenceItemKeys = [
    ...live.map((r) => r.item_key),
    ...journal.filter((r) => r.no_longer_discriminative).map((r) => r.item_key),
  ];
  const evidenceMap = await cohortEvidenceForMany(svc, evidenceItemKeys);

  const statusChip = (text: string, cls: string) => (
    <span className={`inline-block rounded-md px-2 py-0.5 text-sm font-medium ${cls}`}>{text}</span>
  );

  // T2 ESCAPE-HATCH OBSERVABILITY. The doing-layer self-nominates tasks that genuinely fit nowhere
  // into the ledger (admitted_by = 'system'). A quick summary here surfaces whether the hatch is
  // firing at all (rows exist → the census has structural gaps it is growing through lived
  // observation), and whether any were later retracted or retired for coverage.
  const systemRows = rows.filter((r) => r.admitted_by === 'system');
  const systemLive = systemRows.filter((r) => r.status === 'admitted' && !r.retracted_at && !r.no_longer_discriminative);
  const systemRetired = systemRows.filter((r) => r.no_longer_discriminative);
  const systemRetracted = systemRows.filter((r) => r.retracted_at);
  const recentSystem = systemRows
    .filter((r) => r.admitted_at)
    .sort((a, b) => new Date(b.admitted_at!).getTime() - new Date(a.admitted_at!).getTime())
    .slice(0, 5);

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

      {/* T2 escape-hatch observability — quiet signal, not a gate. The census grows through lived
          observation; these rows are evidence that the doing layer surfaced structural gaps that the
          static list did not cover. Zero rows = the hatch is dormant (not a problem). */}
      {systemRows.length > 0 && (
        <section className="mb-8 rounded-2xl border border-violet-200 bg-violet-50 p-6">
          <h2 className="text-lg font-semibold text-violet-900">
            T2 self-admissions ({systemRows.length})
          </h2>
          <p className="mt-1 text-sm text-violet-700">
            The doing layer surfaced these because no census question covered them and no handler
            existed. The operator can retract for cause or retire for coverage — the system never
            acts alone.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-violet-800">
            <span>
              <span className="font-semibold">{systemLive.length}</span> live in the factor set
            </span>
            {systemRetired.length > 0 && (
              <span className="text-amber-700">
                <span className="font-semibold">{systemRetired.length}</span> retired for coverage
              </span>
            )}
            {systemRetracted.length > 0 && (
              <span className="text-red-700">
                <span className="font-semibold">{systemRetracted.length}</span> retracted
              </span>
            )}
          </div>
          {recentSystem.length > 0 && (
            <ul className="mt-3 space-y-1">
              {recentSystem.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm text-violet-800">
                  {statusChip(r.area_key, 'bg-violet-100 text-violet-700')}
                  <code className="text-xs text-violet-600">{r.item_key}</code>
                  <span className="text-xs text-violet-500">
                    {new Date(r.admitted_at!).toLocaleDateString()}
                  </span>
                  {r.no_longer_discriminative && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      retired
                    </span>
                  )}
                  {r.retracted_at && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      retracted
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

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
        <p className="mt-1 text-sm text-gray-500">
          Every item below is on EVERY business&apos;s factor set. Factor-bearing items must carry a
          substance test before admission (the bar has no silent members); document-completing items
          (factor null) are judged by presence.
        </p>
        <div className="mt-4 space-y-4">
          {live.map((row) => {
            const ev = evidenceMap.get(row.item_key);
            return (
              <div key={row.id} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {statusChip(row.area_key, 'bg-emerald-100 text-emerald-700')}
                  <code className="text-xs text-gray-500">{row.item_key}</code>
                  {row.factor && <span className="text-xs text-gray-500">factor: {row.factor}</span>}
                  {!row.factor && (
                    <span className="text-xs text-gray-400 italic">document (presence)</span>
                  )}
                  {row.no_longer_discriminative && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      retired for coverage
                    </span>
                  )}
                </div>
                <h3 className="mt-2 font-medium text-gray-900">{row.buyer_item}</h3>
                <p className="mt-1 text-sm text-gray-600 italic">&ldquo;{row.owner_prompt}&rdquo;</p>
                {row.reason && <p className="mt-2 text-xs text-gray-500">Admission reason: {row.reason}</p>}
                {ev && (
                  <p className="mt-2 text-xs text-gray-500">
                    Of the last {ev.totalAssessed} assessments: {ev.answered} substantive
                    {ev.substantivePct !== null ? ` (${ev.substantivePct}%)` : ''}, {ev.weak} weak,{' '}
                    {ev.open} unanswered, {ev.coveragePct}% coverage.
                  </p>
                )}
                {row.admitted_at && (
                  <p className="mt-1 text-xs text-gray-400">
                    Admitted {new Date(row.admitted_at).toLocaleDateString()} by{' '}
                    {row.admitted_by ?? 'operator'}
                  </p>
                )}
                {row.no_longer_discriminative && row.evidence_note && (
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-amber-50 p-2 text-xs text-amber-800 border border-amber-100">
                    {row.evidence_note}
                  </pre>
                )}
                <SubstanceTestEditor row={row} />
                <AdmissionRowActions row={row} />
              </div>
            );
          })}
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
        <p className="mt-1 text-sm text-gray-500">
          Nothing is live until the operator explicitly admits it with a journaled reason. Author
          the substance test here (or clear the factor) before admitting.
        </p>
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
              <SubstanceTestEditor row={row} />
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
          what it was, with the numbers that justify the claim.
        </p>
        <div className="mt-4 space-y-2">
          {journal.map((row) => {
            const ev = evidenceMap.get(row.item_key);
            return (
              <div
                key={row.id}
                className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {statusChip(row.area_key, 'bg-gray-200 text-gray-600')}
                  <code className="text-xs text-gray-500">{row.item_key}</code>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  {row.retracted_at && (
                    <span className="block">Retracted for cause: {row.retraction_reason}</span>
                  )}
                  {row.no_longer_discriminative && (
                    <span className="block text-amber-700 font-medium">
                      Retired for coverage
                      {ev
                        ? ` — of the last ${ev.totalAssessed}: ${ev.answered} substantive (${ev.substantivePct ?? '—'}%), ${ev.weak} weak, ${ev.open} unanswered`
                        : ''}
                    </span>
                  )}
                  {row.evidence_note && (
                    <pre className="whitespace-pre-wrap text-xs text-gray-600 italic">
                      {row.evidence_note}
                    </pre>
                  )}
                </div>
              </div>
            );
          })}
          {journal.length === 0 && <p className="text-sm text-gray-500">No retracted or retired items.</p>}
        </div>
      </section>
    </div>
  );
}