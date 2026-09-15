// @no-voice-route: operator console — Kira is the OWNER-facing product, and these are the
// screens the operator uses to look at owners. (Same rule as the introducers surface.)
// app/admin/(panel)/distributors/page.tsx
//
// The Tier 2 distributor surface: partners (e.g. consultants who resell Kira under their own
// advisory engagement) who oversee client organisations they do NOT belong to. The portfolio
// mapping lives in distributor_portfolio; RLS access is mediated by auth_user_is_distributor_for.
//
// Distinct from introducers on purpose: an introducer earns a referral fee (attribution layer,
// introducers table); a distributor manages a portfolio of client orgs (visibility/administration
// layer, distributor_portfolio table). One person can be both.

import { createServiceClientV2 } from '@/lib/supabase/server';

import { AddDistributorForm } from './AddDistributorForm';
import { DistributorActions } from './DistributorActions';

export const metadata = { title: 'Distributors · Kira Admin' };
export const dynamic = 'force-dynamic';

type PortfolioRow = {
  id: string;
  distributor_person_id: string;
  client_organisation_id: string;
  status: string;
  removed_at: string | null;
  persons: { email: string; first_name: string | null; last_name: string | null }[] | null;
  organisations: { legal_name: string }[] | null;
};

export default async function AdminDistributorsPage() {
  const svc = createServiceClientV2();

  const { data: portfolioData } = await svc
    .from('distributor_portfolio')
    .select(
      'id, distributor_person_id, client_organisation_id, status, removed_at, persons(email, first_name, last_name), organisations(legal_name)',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  const { data: orgData } = await svc
    .from('organisations')
    .select('organisation_id, legal_name')
    .order('legal_name', { ascending: true })
    .limit(250);

  const portfolio = (portfolioData ?? []) as PortfolioRow[];
  const organisations = (orgData ?? []) as { organisation_id: string; legal_name: string }[];

  const byDistributor = new Map<string, PortfolioRow[]>();
  for (const entry of portfolio) {
    const key = entry.distributor_person_id;
    const list = byDistributor.get(key) ?? [];
    list.push(entry);
    byDistributor.set(key, list);
  }

  const distributors = Array.from(byDistributor.entries()).map(([personId, entries]) => {
    const first = entries[0]!;
    const persona = first.persons?.[0];
    return {
      personId,
      name: persona && [persona.first_name, persona.last_name].some(Boolean)
        ? [persona.first_name, persona.last_name].filter(Boolean).join(' ')
        : persona?.email,
      email: persona?.email ?? '',
      entries,
      activeCount: entries.filter((e) => e.status === 'active' && !e.removed_at).length,
    };
  });

  const activeEntries = portfolio.filter((e) => e.status === 'active' && !e.removed_at).length;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Distributors</h1>
        <p className="mt-1 max-w-prose text-base text-gray-600">
          Partners who oversee a portfolio of client Kira organisations without belonging to them.
          A distributor sees each client&apos;s progress and can be wired into the owner journey —
          never their transcripts or memory. Distinct from introducers: an introducer earns a
          referral fee; a distributor administers client orgs.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Distributors</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{distributors.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Portfolio entries</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{portfolio.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Active client orgs</p>
          <p className="mt-1 text-3xl font-bold text-violet-700">{activeEntries}</p>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Add a distributor</h2>
        <p className="mt-1 text-sm text-gray-500">
          Grant a person a portfolio over one client organisation. If the person hasn&apos;t signed in
          yet a provisional record is created; their access activates when they sign in.
        </p>
        <div className="mt-4">
          <AddDistributorForm organisations={organisations} />
        </div>
      </section>

      {distributors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-base font-medium text-gray-900">No distributors yet</p>
          <p className="mx-auto mt-2 max-w-prose text-sm text-gray-600">
            Add the first partner above. Prove one consultant will send real clients before building
            anything more elaborate around them.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {distributors.map((distributor) => (
            <div key={distributor.personId} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-gray-900">{distributor.name}</p>
                  <p className="text-sm text-gray-500">{distributor.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {distributor.activeCount} active of {distributor.entries.length} client orgs
                  </p>
                </div>
              </div>
              <ul className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                {distributor.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-gray-700">
                      {entry.organisations?.[0]?.legal_name ?? 'Unknown organisation'}
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusPill status={entry.status} removed={Boolean(entry.removed_at)} />
                      <DistributorActions
                        entryId={entry.id}
                        suspended={entry.status === 'suspended'}
                        archived={entry.status === 'archived'}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status, removed }: { status: string; removed: boolean }) {
  const cls = removed
    ? 'bg-gray-100 text-gray-600'
    : status === 'active'
      ? 'bg-violet-100 text-violet-700'
      : status === 'suspended'
        ? 'bg-red-100 text-red-700'
        : 'bg-amber-100 text-amber-700';
  const label = removed ? 'archived' : status;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}