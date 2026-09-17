// @no-voice-route: operator console — Kira is the OWNER-facing product, and these are the
// screens the operator uses to look at owners.
// app/admin/(panel)/organisations/page.tsx
//
// The corporate-operator surface for provisioning organisations directly from
// the corporate admin portal — the first step of the provisioning chain
// (portfolio portal → Kira admin → distributor portal → client portal).
//
// This complements the onboarding-driven identity/plan new-organisation path:
// onboarding provisions an org for a self-signing owner; this surface lets the
// operator mint an org for a programme tenant (e.g. the Baby Boomer Business
// Owner Programme) without needing a code redemption.

import { createServiceClientV2 } from '@/lib/supabase/server';

import { CreateOrganisationForm } from './CreateOrganisationForm';

export const metadata = { title: 'Organisations · Kira Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminOrganisationsPage() {
  const svc = createServiceClientV2();

  const { data: organisations } = await svc
    .from('organisations')
    .select('organisation_id, legal_name, trading_name, abn, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Organisations</h1>
        <p className="mt-1 max-w-prose text-base text-gray-600">
          Every organisation (Kira project / client tenant) on the platform. Create a new one
          here — the next portal in the chain provisions automatically from it.
        </p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Create an organisation</h2>
        <CreateOrganisationForm />
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">All organisations</h2>
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Legal name</th>
                <th className="px-6 py-3 font-semibold">Trading name</th>
                <th className="px-6 py-3 font-semibold">ABN</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {organisations?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No organisations yet.
                  </td>
                </tr>
              )}
              {organisations?.map((org) => (
                <tr key={org.organisation_id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{org.legal_name}</td>
                  <td className="px-6 py-4 text-gray-600">{org.trading_name ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{org.abn ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{org.status}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}