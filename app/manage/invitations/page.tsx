import { getSuperadminContext } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { formatCode } from '@/lib/invitation/invitation-service';
import InvitationForm from '@/app/admin/(panel)/invitations/InvitationForm';

// This is the team-member invitation surface for a standard org's org-admin.
// For the CAIS Beta org, it will also show beta-tester minting.

export const metadata = { title: 'Invitations · Manage' };

export default async function ManageInvitationsPage() {
  const ctx = await getSuperadminContext();
  if (!ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Superadmin access required.</p>
      </div>
    );
  }

  const svc = createServiceClientV2();
  const orgId = ctx.organisationId;

  // The CAIS Beta org (11f7dfa8-14fd-4994-9738-42927c0555b6) shows beta-tester minting.
  const isCAISBetaOrg = orgId === '11f7dfa8-14fd-4994-9738-42927c0555b6';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">
          {isCAISBetaOrg ? 'Beta tester invitations' : 'Invite team members'}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {isCAISBetaOrg
            ? 'Mint and manage beta-tester invitations for this organisation.'
            : 'Invite new members to your organisation.'}
        </p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {isCAISBetaOrg ? 'New beta invitation' : 'New invitation'}
        </h2>
        <InvitationForm isCAISBetaOrg={isCAISBetaOrg} orgId={orgId} />
      </section>

      {/* Pending/redeemed/revoked tables will be added here */}
    </div>
  );
}
