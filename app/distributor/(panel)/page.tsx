import { createServiceClientV2 } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CreateClientOrgForm } from './CreateClientOrgForm';
import { KiraShapeSection } from '@/components/KiraShapeSection';

export const metadata = { title: 'Distributor Portfolio' };
export const dynamic = 'force-dynamic';

export default async function DistributorPortfolioPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect('/login');

  const svc = createServiceClientV2();

  // Resolve person_id
  const { data: credential } = await svc
    .from('auth_credentials')
    .select('person_id')
    .eq('auth_user_id', authUser.id)
    .single();

  if (!credential) return <p>Access denied</p>;

  // Fetch portfolio
  const { data: portfolio } = await svc
    .from('distributor_portfolio')
    .select('*, organisations(legal_name)')
    .eq('distributor_person_id', credential.person_id)
    .eq('status', 'active')
    .is('removed_at', null);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Distributor Portfolio</h1>
        <p className="mt-1 text-base text-gray-600">
          Manage client organisations you oversee.
        </p>
      </header>

      {/* PRODUCT_STANDARDS §6 — a partner in their own portal is exactly the surface this whole
          onboarding chain exists to serve, and it had no way to reach Kira at all (found live
          2026-09-21, once the app-chrome fix let the gate's voice-reachable check run for the
          first time). */}
      <KiraShapeSection surface="distributor" />

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Provision New Client</h2>
        <CreateClientOrgForm />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Client Organisations</h2>
        {!portfolio?.length ? (
          <p className="text-gray-500">No active client organisations.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {portfolio?.map((entry) => {
              // The joined organisations row can come back as an object
              // (to-one inferred) or a single-element array (generic join).
              const org = Array.isArray(entry.organisations)
                ? entry.organisations[0]
                : entry.organisations;
              return (
                <div key={entry.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="font-semibold text-gray-900">
                    {org?.legal_name}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
