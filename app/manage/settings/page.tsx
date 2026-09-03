import { getSuperadminContext } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';

export const metadata = { title: 'Settings · Manage' };
export const dynamic = 'force-dynamic';

export default async function ManageSettingsPage() {
  const ctx = await getSuperadminContext();
  if (!ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Superadmin access required.</p>
      </div>
    );
  }

  const svc = createServiceClientV2();
  const { data: org } = await svc
    .from('organisations')
    .select('organisation_id, legal_name, trading_name, abn, kira_status, kira_config')
    .eq('organisation_id', ctx.organisationId)
    .maybeSingle();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
        <p className="mt-1 text-sm text-stone-500">
          Organisation configuration governed by the superadmin.
        </p>
      </header>

      <div className="max-w-prose space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-stone-500">Legal name</p>
            <p className="mt-2 text-lg font-bold text-stone-900">
              {org?.legal_name || '—'}
            </p>
          </div>
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-stone-500">Trading name</p>
            <p className="mt-2 text-lg font-bold text-stone-900">
              {org?.trading_name || '—'}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-500">ABN</p>
          <p className="mt-2 text-lg font-bold text-stone-900">
            {org?.abn || '—'}
          </p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-500">Kira status</p>
          <p className="mt-2 text-lg font-bold text-stone-900">
            {org?.kira_status || 'provisioned'}
          </p>
        </div>
      </div>
    </div>
  );
}
