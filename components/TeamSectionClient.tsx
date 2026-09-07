'use client';

import { useState, useEffect } from 'react';
import { BETA_CODE_STORAGE_KEY } from '@/components/BetaCodeCarrier';

interface Member {
  membershipId: string;
  personId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  canSpend: boolean;
  status: string;
  validFrom: string | null;
  validTo: string | null;
}

interface TeamSectionClientProps {
  initialMembers?: Member[];
  organisationId: string;
}

interface BetaPeekResponse {
  ok: boolean;
  first_name?: string | null;
  last_name?: string | null;
  email?: string;
  organisation_id?: string;
}

export function TeamSectionClient({ initialMembers = [], organisationId }: TeamSectionClientProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [loading, setLoading] = useState(!initialMembers.length);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');

  // Pre-fill invite form from beta invitation (if any)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fromUrl = new URLSearchParams(window.location.search).get('code')?.trim() ?? '';
        const parkedCode = window.sessionStorage.getItem(BETA_CODE_STORAGE_KEY)?.trim() ?? '';
        const codeToPeek = fromUrl || parkedCode;
        if (!codeToPeek) return;
        const response = await fetch('/api/beta/peek', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ code: codeToPeek }),
        });
        if (!response.ok) return;
        const data = (await response.json().catch(() => null)) as BetaPeekResponse | null;
        if (cancelled) return;
        if (!data?.ok) return;
        if (data.first_name && !inviteFirstName) {
          setInviteFirstName(data.first_name.trim().slice(0, 100));
        }
        if (data.last_name && !inviteLastName) {
          setInviteLastName(data.last_name.trim().slice(0, 100));
        }
        if (data.email && !inviteEmail) {
          setInviteEmail(data.email.toLowerCase());
        }
      } catch {
        // Non-fatal: the form simply stays empty and the operator types.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const reloadMembers = async () => {
    const updated = await fetch('/api/members').then((res) => res.json());
    setMembers(updated.members || []);
  };

  const inviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/members/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: inviteEmail, 
        firstName: inviteFirstName || 'New', 
        lastName: inviteLastName, 
        role: inviteRole, 
        canSpend: false 
      }),
    });
    if (res.ok) {
      setInviteEmail('');
      setInviteFirstName('');
      await reloadMembers();
    }
  };

  const toggleCanSpend = async (membershipId: string, currentCanSpend: boolean) => {
    await fetch(`/api/members/${membershipId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canSpend: !currentCanSpend }),
    });
    await reloadMembers();
  };

  const updateRole = async (membershipId: string, newRole: string) => {
    await fetch(`/api/members/${membershipId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    await reloadMembers();
  };

  const revokeAccess = async (membershipId: string) => {
    if (!confirm('Revoke this member\'s access? They will no longer be able to access this organisation.')) return;
    await fetch(`/api/members/${membershipId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ validTo: new Date().toISOString() }),
    });
    await reloadMembers();
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading team...</div>;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Team members</h2>
      </div>

      <ul className="space-y-4 mb-8">
        {members.map((m) => (
          <li key={m.membershipId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-gray-50">
            <div className="flex items-center gap-4">
              <div>
                <p className="font-medium text-gray-900">{m.firstName} {m.lastName}</p>
                <p className="text-sm text-gray-500">{m.email}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                m.role === 'owner' ? 'bg-violet-100 text-violet-800' :
                m.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {m.role}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                m.status === 'active' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {m.status}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={m.canSpend}
                  onChange={() => toggleCanSpend(m.membershipId, m.canSpend)}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                Can spend
              </label>
              <select
                value={m.role}
                onChange={(e) => updateRole(m.membershipId, e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                disabled={m.role === 'owner'}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="consultant">Consultant</option>
                <option value="employee">Employee</option>
                <option value="advisor">Advisor</option>
              </select>
              {m.role !== 'owner' && (
                <button
                  onClick={() => revokeAccess(m.membershipId)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Revoke
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={inviteMember} className="border-t border-gray-200 pt-6 space-y-4">
        <h3 className="text-base font-medium text-gray-900">Invite new member</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500">First name</label>
            <input
              type="text"
              value={inviteFirstName}
              onChange={(e) => setInviteFirstName(e.target.value)}
              placeholder="Jane"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Last name</label>
            <input
              type="text"
              value={inviteLastName}
              onChange={(e) => setInviteLastName(e.target.value)}
              placeholder="Doe"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="jane@example.com"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="consultant">Consultant</option>
              <option value="employee">Employee</option>
              <option value="advisor">Advisor</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Send invite
        </button>
      </form>
    </section>
  );
}