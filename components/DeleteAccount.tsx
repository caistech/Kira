'use client';

// components/DeleteAccount.tsx
// Confirm-by-typing-email delete flow for the Settings → Account section. Calls the deleteAccount
// server action (hard delete + cascade). Two-step: a "Delete account" button reveals the confirm
// input, so the destructive action is never one careless click.

import { useActionState, useState } from 'react';
import { deleteAccount } from '@/app/settings/actions';

export function DeleteAccount({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        Delete account
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-gray-700">
        This permanently deletes your account and <strong>all of your Kiras, conversations and memory</strong>.
        This cannot be undone. Type <strong>{email}</strong> to confirm.
      </p>
      <input
        name="confirm_email"
        type="email"
        autoComplete="off"
        placeholder={email}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? 'Deleting…' : 'Permanently delete my account'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
