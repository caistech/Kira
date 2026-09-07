// app/admin/(panel)/invitations/page.tsx
//
// Organisation Invitations — admin dashboard for minting and managing codes.
//
// Server component: auth is enforced by the (panel) layout.
// InvitationForm and RevokeInvitation are client components.

import { createServiceClientV2 } from '@/lib/supabase/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
import { formatCode } from '@/lib/invitation/invitation-service';
import InvitationForm from './InvitationForm';
import RevokeInvitation from './RevokeInvitation';

export const metadata = { title: 'Invitations — Admin' };

type Invitation = {
  code: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  beta_type: string;
  organisation_id: string;
  expires_at: string;
  redeemed_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export default async function InvitationsPage() {
  const svc = createServiceClientV2();
  const org = await getCurrentOrganisationContext();

  if (!org?.organisationId) {
    throw new Error('No organisation context available');
  }

  /*
   * Determine whether this is the CAIS Beta organisation.
   *
   * Keep this server-side. The client should only receive the boolean
   * it needs to render the appropriate invitation options.
   */
  const { data: organisation, error: organisationError } = await svc
    .from('organisations')
    .select('id, name, slug')
    .eq('id', org.organisationId)
    .single();

  if (organisationError) {
    throw new Error(
      `Failed to load organisation: ${organisationError.message}`
    );
  }

  const isCAISBetaOrg =
    organisation?.slug?.toLowerCase() === 'cais-beta' ||
    organisation?.name?.toLowerCase() === 'cais beta';

  const { data: codes, error: codesError } = await svc
    .from('beta_codes')
    .select(
      [
        'code',
        'email',
        'first_name',
        'last_name',
        'beta_type',
        'organisation_id',
        'expires_at',
        'redeemed_at',
        'revoked_at',
        'created_at',
      ].join(', ')
    )
    .eq('organisation_id', org.organisationId)
    .order('created_at', { ascending: false });

  if (codesError) {
    throw new Error(`Failed to load invitations: ${codesError.message}`);
  }

  const invitations = (codes ?? []) as Invitation[];

  const pending = invitations.filter(
    (i) => !i.redeemed_at && !i.revoked_at
  );

  const redeemed = invitations.filter((i) => i.redeemed_at);

  const revoked = invitations.filter((i) => i.revoked_at);

  function stateLabel(i: Invitation) {
    if (i.revoked_at) {
      return {
        text: 'Revoked',
        cls: 'bg-gray-100 text-gray-600',
      };
    }

    if (i.redeemed_at) {
      return {
        text: 'Redeemed',
        cls: 'bg-green-100 text-green-700',
      };
    }

    if (new Date(i.expires_at) <= new Date()) {
      return {
        text: 'Expired',
        cls: 'bg-amber-100 text-amber-700',
      };
    }

    return {
      text: 'Pending',
      cls: 'bg-blue-100 text-blue-700',
    };
  }

  function roleLabel(betaType: string) {
    switch (betaType) {
      case 'superadmin':
        return 'Superadmin';
      case 'user':
      default:
        return 'Member';
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Invitations
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Mint and manage invitations for your organisation.
        </p>
      </header>

      {/* Create invitation */}
      <section className="mb-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          New invitation
        </h2>

        <InvitationForm
          orgId={org.organisationId}
          isCAISBetaOrg={isCAISBetaOrg}
        />
      </section>

      {/* Pending invitations */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Pending{' '}
          <span className="text-sm font-normal text-gray-500">
            ({pending.length})
          </span>
        </h2>

        {pending.length === 0 ? (
          <p className="text-sm text-gray-500">
            No pending invitations.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {pending.map((i) => {
                  const state = stateLabel(i);

                  return (
                    <tr
                      key={i.code}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-gray-900">
                        {[i.first_name, i.last_name]
                          .filter(Boolean)
                          .join(' ') || '—'}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {i.email}
                      </td>

                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        {formatCode(i.code)}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {roleLabel(i.beta_type)}
                      </td>

                      <td className="px-4 py-3 text-gray-500">
                        {new Date(
                          i.expires_at
                        ).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${state.cls}`}
                        >
                          {state.text}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <RevokeInvitation code={i.code} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Redeemed invitations */}
      {redeemed.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Redeemed{' '}
            <span className="text-sm font-normal text-gray-500">
              ({redeemed.length})
            </span>
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Redeemed</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {redeemed.map((i) => (
                  <tr
                    key={i.code}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-gray-900">
                      {[i.first_name, i.last_name]
                        .filter(Boolean)
                        .join(' ') || '—'}
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      {i.email}
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {formatCode(i.code)}
                    </td>

                    <td className="px-4 py-3 text-gray-500">
                      {i.redeemed_at
                        ? new Date(
                            i.redeemed_at
                          ).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Revoked invitations */}
      {revoked.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Revoked{' '}
            <span className="text-sm font-normal text-gray-500">
              ({revoked.length})
            </span>
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Revoked</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {revoked.map((i) => (
                  <tr
                    key={i.code}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-gray-600">
                      {i.email}
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {formatCode(i.code)}
                    </td>

                    <td className="px-4 py-3 text-gray-500">
                      {i.revoked_at
                        ? new Date(
                            i.revoked_at
                          ).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}