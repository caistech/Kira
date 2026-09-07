'use client';

import { useState } from 'react';

type Props = {
  code: string;
};

export default function RevokeInvitation({ code }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    if (!confirm('Revoke this invitation?')) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `/api/admin/invitations?code=${encodeURIComponent(code)}`,
        {
          method: 'DELETE',
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.error || 'Failed to revoke invitation');
        return;
      }

      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRevoke}
      disabled={loading}
      className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      {loading ? 'Revoking…' : 'Revoke'}
    </button>
  );
}