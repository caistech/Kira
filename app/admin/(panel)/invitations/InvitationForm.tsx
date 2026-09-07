'use client';

import { useState } from 'react';

type InvitationFormProps = {
  orgId: string;
  isCAISBetaOrg: boolean;
};

export default function InvitationForm({
  orgId,
  isCAISBetaOrg,
}: InvitationFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [betaType, setBetaType] = useState<'superadmin' | 'user'>(
    'user'
  );

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          betaType: isCAISBetaOrg ? betaType : 'user',
          orgId,
        }),
      });

      const body = await res.json();

      if (!res.ok || !body.ok) {
        setError(
          body.error || 'Failed to create invitation'
        );
        return;
      }

      const emailLine =
        body.email?.status === 'failed'
          ? 'Email failed to send — send the invitation manually below.'
          : `Invitation email sent to ${email}.`;

      setResult(
        `Invitation created. Code: ${body.code}. ${emailLine}`
      );

      setFirstName('');
      setLastName('');
      setEmail('');
      setBetaType('user');

      /*
       * Refresh the Server Component so the new invitation
       * immediately appears in the pending list.
       */
      window.location.reload();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="firstName"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            First name
          </label>

          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) =>
              setFirstName(e.target.value)
            }
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            placeholder="First name"
          />
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Last name
          </label>

          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) =>
              setLastName(e.target.value)
            }
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            placeholder="Last name"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Email *
        </label>

        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
          placeholder="test@example.com"
        />
      </div>

      {isCAISBetaOrg && (
        <div>
          <label
            htmlFor="betaType"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Access level
          </label>

          <select
            id="betaType"
            value={betaType}
            onChange={(e) =>
              setBetaType(
                e.target.value as 'superadmin' | 'user'
              )
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
          >
            <option value="user">Member</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {result}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !email.trim()}
        className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Send invitation'}
      </button>
    </form>
  );
}