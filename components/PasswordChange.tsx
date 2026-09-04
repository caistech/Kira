'use client';

// components/PasswordChange.tsx
import { useState } from 'react';
import { createClientV2 } from '@/lib/supabase/browser';
import { PasswordInput } from '@/components/auth/PasswordInput';

export function PasswordChange() {
  const supabase = createClientV2();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      if (password.length < 8) throw new Error('Use at least 8 characters.');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg('Password updated.');
      setPassword('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" placeholder="New password" />
      {err && <p className="text-sm text-red-600">{err}</p>}
      {msg && <p className="text-sm text-violet-700">{msg}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {busy ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}
