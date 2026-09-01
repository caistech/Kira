import { useState, useEffect } from 'react';

interface Member {
  membership_id: string;
  first_name: string;
  email: string;
  role: string;
  can_spend: boolean;
}

export function TeamSection() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  useEffect(() => {
    fetch('/api/members')
      .then((res) => res.json())
      .then(setMembers)
      .finally(() => setLoading(false));
  }, []);

  const inviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/members/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, firstName: 'New', role: inviteRole, canSpend: false }),
    });
    if (res.ok) {
      setInviteEmail('');
      // Reload members list
      const updated = await fetch('/api/members').then((res) => res.json());
      setMembers(updated);
    }
  };

  if (loading) return <div>Loading...</div>;

  const toggleCanSpend = async (membershipId: string, currentCanSpend: boolean) => {
    await fetch(`/api/members/${membershipId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canSpend: !currentCanSpend }),
    });
    // Reload
    const updated = await fetch('/api/members').then((res) => res.json());
    setMembers(updated);
  };

  const updateRole = async (membershipId: string, newRole: string) => {
    await fetch(`/api/members/${membershipId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    const updated = await fetch('/api/members').then((res) => res.json());
    setMembers(updated);
  };

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">Team</h2>
      <ul className="mt-4 space-y-4">
        {members.map((m) => (
          <li key={m.membership_id} className="flex items-center justify-between text-base text-gray-700">
            <div>
              <span className="font-medium">{m.first_name}</span> <span className="text-sm text-gray-500">({m.email})</span>
            </div>
            <div className="flex items-center gap-4">
              <select value={m.role} onChange={(e) => updateRole(m.membership_id, e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 text-sm">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
              </select>
              <button onClick={() => toggleCanSpend(m.membership_id, m.can_spend)} className={`text-sm font-semibold ${m.can_spend ? 'text-violet-600' : 'text-gray-400'}`}>
                {m.can_spend ? 'Can Spend' : 'No Spend'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={inviteMember} className="mt-6 space-y-3">
        <input 
            type="email" 
            value={inviteEmail} 
            onChange={(e) => setInviteEmail(e.target.value)} 
            placeholder="Email" 
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
            required
        />
        <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
        </select>
        <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">Invite</button>
      </form>
    </section>
  );
}
