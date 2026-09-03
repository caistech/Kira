import { getSuperadminContext } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';

export const metadata = { title: 'Manage · Kira' };
export const dynamic = 'force-dynamic';

export default async function ManageOverviewPage() {
  const ctx = await getSuperadminContext();

  if (!ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">You need superadmin access to manage this organisation.</p>
      </div>
    );
  }

  const svc = createServiceClientV2();

  const { data: org } = await svc
    .from('organisations')
    .select('organisation_id, legal_name, trading_name, abn, kira_status, kira_config')
    .eq('organisation_id', ctx.organisationId)
    .maybeSingle();

  const { count: memberCount } = await svc
    .from('organisation_memberships')
    .select('membership_id', { count: 'exact', head: true })
    .eq('organisation_id', ctx.organisationId)
    .eq('status', 'active');

  const { count: kiraCount } = await svc
    .from('kira_agents')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', ctx.organisationId);

  const kiraActive = org?.kira_status === 'active';
  const agentCount =
    kiraCount ?? Object.keys((org?.kira_config as Record<string, unknown>) ?? {}).length;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">
          {org?.legal_name || 'Your organisation'}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Superadmin governance console. You manage the organisation, its Kira
          agent(s), and its members.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-500">Kira status</p>
          <p className="mt-2 text-lg font-bold text-stone-900">
            {kiraActive ? 'Active' : org?.kira_status || 'Provisioned'}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {kiraActive
              ? 'Kira is live and serving your organisation.'
              : 'Kira is provisioned but not yet active.'}
          </p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-500">Kira agents</p>
          <p className="mt-2 text-lg font-bold text-stone-900">{agentCount}</p>
          <p className="mt-1 text-xs text-stone-500">
            Configured for this organisation
          </p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-500">Active members</p>
          <p className="mt-2 text-lg font-bold text-stone-900">{memberCount ?? 0}</p>
          <p className="mt-1 text-xs text-stone-500">
            Appointed by the superadmin
          </p>
        </div>
      </div>

      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-stone-900">Governance model</h2>
        <p className="mt-2 max-w-prose text-sm text-stone-600 leading-relaxed">
          The superadmin is a <strong>function</strong>, not an owner. The owner
          relationship is recorded separately in ownership records. You control
          who accesses the organisation (Members), how many Kira agents run
          (Kira), and the organisation&apos;s configuration (Settings).
        </p>
        <p className="mt-2 max-w-prose text-sm text-stone-600 leading-relaxed">
          Members you appoint enter through their own portal with permissions you
          set. Only a superadmin reaches this management surface.
        </p>
      </section>
    </div>
  );
}
