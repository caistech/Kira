'use client';

import { useState } from 'react';

export default function InvitationForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [betaType, setBetaType] = useState<'superadmin' | 'user'>('user');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, betaType }),
      });

      const body = await res.json();

      if (!res.ok || !body.ok) {
        setError(body.error || 'Failed to create invitation');
        return;
      }

      const emailLine =
        body.email?.status === 'failed'
          ? 'Email FAILED to send — send the code manually below.'
          : `Invitation email sent to ${email}.`;

      setResult(`Invitation created. Code: ${body.code}. ${emailLine}`);
      setFirstName('');
      setLastName('');
      setEmail('');
      setBetaType('user');
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First name</label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none"
            placeholder="Dennis"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none"
            placeholder="McMahon"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none"
          placeholder="test@example.com"
        />
      </div>

      <div>
        <label htmlFor="betaType" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
        <select
          id="betaType"
          value={betaType}
          onChange={(e) => setBetaType(e.target.value as 'superadmin' | 'user')}
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none bg-white"
        >
          <option value="user">Member</option>
          <option value="superadmin">Owner (CEO)</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {result && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{result}</div>
      )}

      <button
        type="submit"
        disabled={loading || !email.trim()}
        className="inline-flex items-center gap-2 rounded-xl bg-stone-900 text-white px-6 py-2.5 text-sm font-semibold hover:bg-stone-800 disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Send invitation'}
      </button>
    </form>
  );
}
