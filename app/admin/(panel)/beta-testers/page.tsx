// @no-voice-route: operator console — same rule as the introducers/distributors surfaces.
// app/admin/(panel)/beta-testers/page.tsx
//
// The DIRECT beta-tester invite surface. Unlike the ?code= path (which carries a tester through
// landing → redemption → magic link), this lets an operator create an account in one step: name +
// email in, a generated password out, welcome email sent. The tester signs in at /login and lands
// straight on their Kira.
//
// All invited testers land in the shared beta tenant org (Corporate AI Solutions), the same org the
// distributor beta runs under.

import { createServiceClientV2 } from '@/lib/supabase/server';

import { BetaTesterForm } from './BetaTesterForm';

export const metadata = { title: 'Beta Testers · Kira Admin' };
export const dynamic = 'force-dynamic';

const BETA_TENANT_LEGAL_NAME = 'Corporate AI Solutions';

type MemberRow = {
  membership_id: string;
  role: string;
  status: string;
  valid_from: string | null;
  persons: { email: string; first_name: string | null; last_name: string | null }[] | null;
};

export default async function AdminBetaTestersPage() {
  const svc = createServiceClientV2();

  const { data: betaOrg } = await svc
    .from('organisations')
    .select('organisation_id')
    .eq('legal_name', BETA_TENANT_LEGAL_NAME)
    .eq('status', 'active')
    .maybeSingle();

  let members: MemberRow[] = [];

  if (betaOrg) {
    const { data } = await svc
      .from('organisation_memberships')
      .select(
        'membership_id, role, status, valid_from, persons(email, first_name, last_name)',
      )
      .eq('organisation_id', betaOrg.organisation_id)
      .order('valid_from', { ascending: false });
    members = (data ?? []) as MemberRow[];
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Beta Testers</h1>
        <p className="mt-1 max-w-prose text-sm text-gray-600">
          Create a beta tester in one step: they get a generated password and a welcome email, and
          sign in straight at /login — no beta code, no magic link. Everyone lands in the shared
          beta tenant org.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Invite a tester
        </h2>
        <BetaTesterForm />
      </section>

      {members.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            In the beta tenant ({members.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((member) => {
                  const person = member.persons?.[0] ?? null;
                  const name = [person?.first_name, person?.last_name]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <tr key={member.membership_id}>
                      <td className="py-2 pr-4 text-gray-900">{name || '—'}</td>
                      <td className="py-2 pr-4 text-gray-600">{person?.email ?? '—'}</td>
                      <td className="py-2 pr-4 text-gray-600">{member.role}</td>
                      <td className="py-2 text-gray-500">
                        {member.valid_from ? new Date(member.valid_from).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}